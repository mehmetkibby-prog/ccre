import {fork} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {ChannelRpc} from './channel-rpc.mjs';
import {ChannelAuthority} from './channel-authority.mjs';
import {statementFrame,captureCombatFrame,combatFrameStillCurrent,applyCombatChanges,applyPositionChange} from './channel-memory-frame.mjs';

// Simulation runs in channel children. The main process retains private write
// buffers/read projections for its sole durable writer and synchronous services.
export class ChannelCompute {
 constructor(database,path,{realmId='local',execPath=process.execPath}={}){
  this.db=database;this.path=path;this.realmId=realmId;this.execPath=execPath;this.children=new Map();this.stopping=false;
  this.authority=new ChannelAuthority(database,{realmId});this.stats={restarts:0,errors:0,conflicts:0,moves:0,hits:0};this.lanes=new Map();
 }
 async start(){await this.authority.initialize();for(const channel of [1,2,3])await this.spawn(channel);return this;}
 async spawn(channel){
  if(this.stopping)return;const incarnation=randomUUID(),identity=`${this.realmId}:${channel}:${incarnation}`;
  await this.authority.registerProcess(channel,incarnation);if(this.stopping)return;
  const range=await this.reserveEvents();
  const child=fork(new URL('./channel-compute-worker.mjs',import.meta.url),[this.path,String(channel),identity,String(range.top),String(range.bottom)],{execPath:this.execPath,execArgv:[],stdio:['ignore','ignore','pipe','ipc'],serialization:'json'});
  const state={channel,incarnation,child,ready:false,rpc:new ChannelRpc(child,{identity,handlers:{pushRead:payload=>this.pushRead?.(state,payload)}}),health:null,eventsRemaining:1000000,exited:null};this.children.set(channel,state);
  child.stderr.on('data',data=>{if(!data.toString().includes('ExperimentalWarning')&&!data.toString().includes('trace-warnings'))console.error('channel_worker',channel,data.toString().slice(0,512));});
  state.exited=new Promise(resolve=>child.once('exit',async()=>{
   state.ready=false;state.rpc.close();if(this.children.get(channel)!==state){resolve();return;}
   try{await this.authority.disconnectProcess(channel,incarnation);}catch(error){this.stats.errors++;console.error('channel_fence_failed',error.message);}
   resolve();if(!this.stopping){this.stats.restarts++;state.restart=setTimeout(()=>{void this.spawn(channel).catch(error=>{this.stats.errors++;console.error('channel_restart_failed',error.message);});},250);}
  }));
  child.once('error',()=>{this.stats.errors++;state.ready=false;state.rpc.close();});
  try{state.health=await state.rpc.request('ready',{});state.ready=true;}
  catch(error){child.kill('SIGTERM');throw error;}
 }
 async reserveEvents(){return this.db.atomic(db=>{
  db.exec('CREATE TABLE IF NOT EXISTS channel_event_allocator(id INTEGER PRIMARY KEY CHECK(id=1),low INTEGER NOT NULL)');
  const minimum=db.prepare('SELECT MIN(id) AS n FROM main.combat_events').get()?.n??0;
  const previous=db.prepare('SELECT low FROM channel_event_allocator WHERE id=1').get()?.low??0;
  const top=Math.min(-Date.now()*1024,minimum,previous)-1,bottom=top-1000000;
  if(!Number.isSafeInteger(bottom))throw Error('channel_event_range_exhausted');
  db.prepare('INSERT INTO channel_event_allocator VALUES(1,?) ON CONFLICT(id) DO UPDATE SET low=excluded.low').run(bottom);return {top,bottom};
 });}
 async owner(playerId,channel){
  const state=this.children.get(channel);if(!state?.ready)throw Error('channel_unavailable');
  let owner=this.authority.owner(playerId);
  if(owner&&owner.channel!==channel){
   // Existing game transition must already have durably changed channel. Its
   // original transaction stages the last acknowledged movement/HP buffers.
   const row=this.db.sqlite.prepare('SELECT channel FROM main.players WHERE id=?').get(playerId);
   if(row?.channel!==channel)throw Error('channel_scope_changed');
   const old=this.children.get(owner.channel);if(!old?.ready)throw Error('channel_transfer_pending');
   const transferId=randomUUID();owner=await this.authority.beginTransfer(playerId,{epoch:owner.epoch,targetChannel:channel,transferId});
   await this.authority.release(playerId,old,{epoch:owner.epoch,transferId,finalSequence:owner.sequence});
   owner=await this.authority.acceptTransfer(playerId,state,{epoch:owner.epoch,transferId},db=>db.prepare('SELECT channel FROM main.players WHERE id=?').get(playerId)?.channel===channel);
  }else if(!owner||owner.incarnation!==state.incarnation||owner.state!=='active')owner=await this.authority.claim(playerId,channel,state.incarnation);
  return {state,owner};
 }
 lane(id,task){const prior=this.lanes.get(id)??Promise.resolve();const work=prior.catch(()=>{}).then(task);this.lanes.set(id,work);return work.finally(()=>{if(this.lanes.get(id)===work)this.lanes.delete(id);});}
 refreshPosition(id){const store=this.db.positions;store.committed({read:store.read},{staged:new Map(),touched:new Set([id]),started:performance.now()});return store.entries.get(id);}
 async position(statement){return this.lane('player:'+statement.params[7],async()=>{
  const store=this.db.positions,id=statement.params[7];let e=this.refreshPosition(id);if(!e)return null;
  const {state,owner}=await this.owner(id,e.current.channel);e=this.refreshPosition(id);if(e.current.channel!==owner.channel)return null;const generation=e.generation,current=e.current;
  const reply=await state.rpc.request('position',{owner,position:{id,entry:e},statement:statementFrame(statement)});
  const live=store.entries.get(id);
  if(!state.ready||state!==this.children.get(owner.channel)||live!==e||live.generation!==generation||Object.keys(current).some(k=>live.current[k]!==current[k])){this.stats.conflicts++;return null;}
  if(reply.result){applyPositionChange(store,id,reply.current);this.stats.moves++;}return reply.result;
 });}
 async combat(guard,plans){
  const id=guard.params[3];return this.lane('player:'+id,async()=>{
   const store=this.db.combat,pos=this.refreshPosition(id);if(!pos||!store?.enabled||!store.accepting||plans.some(p=>store.locks.has(p.target.id)))return null;
   if(plans.some(p=>this.db.sqlite.prepare('SELECT channel FROM main.monsters WHERE id=?').get(p.target.id)?.channel!==pos.current.channel))return null;
   const {state,owner}=await this.owner(id,pos.current.channel),frame=captureCombatFrame(store,guard,plans),position=this.db.positions.entries.get(id),positionCurrent=position.current;
   if(state.eventsRemaining<1000){const range=await this.reserveEvents();await state.rpc.request('eventRange',range);state.eventsRemaining=1000000;}
   const reply=await state.rpc.request('combat',{owner,position:{id,entry:position},rows:frame.rows,guard:statementFrame(guard),plans:plans.map(p=>({target:p.target,rolled:p.rolled})),statements:plans.flatMap(p=>p.hitStatements.map(statementFrame))});
   if(!state.ready||state!==this.children.get(owner.channel)||!combatFrameStillCurrent(store,frame.refs)||this.db.positions.entries.get(id)?.current!==positionCurrent){this.stats.conflicts++;return null;}
   state.eventsRemaining=reply.eventsRemaining;
   if(reply.result){applyCombatChanges(store,reply.changes);if(reply.result.guard.results.length){store.stats.hits+=plans.length;this.stats.hits+=plans.length;}else store.stats.rejected++;}
   return reply.result;
  });
 }
 async combatBatch(statements,playerId){return this.lane('player:'+playerId,async()=>{
  const store=this.db.combat,pos=this.refreshPosition(playerId);if(!pos||!store?.enabled||!store.accepting)return null;
  const {state,owner}=await this.owner(playerId,pos.current.channel),frame=captureCombatFrame(store,null,[],playerId),position=this.db.positions.entries.get(playerId),positionCurrent=position.current;
  const reply=await state.rpc.request('combat',{owner,position:{id:playerId,entry:position},rows:frame.rows,statements:statements.map(statementFrame)});
  if(!state.ready||state!==this.children.get(owner.channel)||!combatFrameStillCurrent(store,frame.refs)||this.db.positions.entries.get(playerId)?.current!==positionCurrent){this.stats.conflicts++;return null;}
  if(reply.result)applyCombatChanges(store,reply.changes);return reply.result;
 });}
 worldFrame(channel){
  const loop=this.db.worldLoop,state=this.children.get(channel);
  const cache=state.worldCache??={monsters:new Map(),players:new Map(),engagements:new Map()},frame={nowMs:Date.now()};
  const monsters=[];for(const [id,base]of loop.monsters){if(base.channel!==channel&&base.channel!==0)continue;const current=this.db.combat.entry('monsters',id)?.current,old=cache.monsters.get(id);const row=old?.base===base&&old?.current===current?old.row:loop.monster(id);monsters.push([id,{base,current,row}]);}
  const players=[...loop.activePlayers].map(id=>[id,loop.player(id)]).filter(([,p])=>p&&p.channel===channel);
  const engagements=[...loop.engagements].filter(([,e])=>e.expires_at_ms>=frame.nowMs);
  for(const [name,rows]of [['monsters',monsters],['players',players],['engagements',engagements]]){
   const previous=cache[name],next=new Map(rows),changed=[];
   for(const [id,value]of next){const old=previous.get(id),row=name==='monsters'?value.row:value,oldRow=name==='monsters'?old?.row:old;
    if(oldRow!==row&&(!oldRow||Object.keys(row).some(k=>row[k]!==oldRow[k])))changed.push([id,row]);}
   frame[name]={changed,removed:[...previous.keys()].filter(id=>!next.has(id))};cache[name]=next;
  }return frame;
 }
 async worldQuery(method,arg){
  const rows=await Promise.all([...this.children.values()].filter(s=>s.ready).map(s=>s.rpc.request('world',{...this.worldFrame(s.channel),kind:'query',method,arg,config:[...this.db.worldLoop.config]})));
  return method==='due'?rows.flat():rows.some(Boolean);
 }
 async nearby(playerId,nowMs,multiple489=false){
  const player=this.db.worldLoop.player(playerId);if(!player)return null;
  const state=this.children.get(player.channel);if(!state?.ready)return null;
  return state.rpc.request('world',{...this.worldFrame(player.channel),kind:'nearby',playerId,nowMs,multiple489});
 }
 async regenerate(settings){
  const store=this.db.combat;
  await Promise.all([...this.children.values()].filter(s=>s.ready).map(async state=>{
   const frame=this.worldFrame(state.channel),monsters=[...this.db.worldLoop.monsters.values()].filter(m=>m.channel===state.channel||state.channel===1&&m.channel===0);
   const refs=monsters.map(m=>{const e=store.entry('monsters',m.id);return {name:'monsters',id:m.id,keys:[m.id],e,current:e?.current,generation:e?.generation};});
   const rows=refs.map(({name,id,keys,e})=>({name,id,keys,entry:e?{...e}:null}));
   const changes=await state.rpc.request('world',{...frame,kind:'regenerate',settings,rows});
   if(!state.ready||this.children.get(state.channel)!==state)return;
   const known=new Map(refs.map(r=>[r.id,r]));
   for(const change of changes)if(combatFrameStillCurrent(store,[known.get(change.id)]))applyCombatChanges(store,[change]);else this.stats.conflicts++;
  }));return true;
 }
 async loot(args){
  const monster=this.db.sqlite.prepare('SELECT channel FROM main.monsters WHERE id=?').get(args[2]);
  const channel=monster?.channel>=1&&monster.channel<=3?monster.channel:1,state=this.children.get(channel);
  if(!state?.ready)throw Error('channel_unavailable');
  // This returns only a proposed drop list. Existing main-process receipts and
  // atomic reward batches still decide whether it may be durably granted.
  return state.rpc.request('loot',{args});
 }
 async sample(){await Promise.all([...this.children.values()].filter(c=>c.ready).map(async c=>{try{c.health=await c.rpc.request('health',{});}catch{this.stats.errors++;}}));return this.snapshot();}
 snapshot(){return {enabled:true,protocol:'channel-compute-v1',integration:'movement-combat-monsters-loot-world-push',...this.stats,channels:[...this.children.values()].map(c=>({channel:c.channel,ready:c.ready,...c.health}))};}
 async close(){this.stopping=true;this.pushController?.close();for(const c of this.children.values())clearTimeout(c.restart);await Promise.allSettled([...this.lanes.values()]);for(const c of this.children.values()){c.rpc.close();c.child.kill('SIGTERM');}await Promise.all([...this.children.values()].map(c=>c.exited));}
}
