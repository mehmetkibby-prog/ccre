import {colLabRejectionForGrant} from './loadlab-ack.mjs';
import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {channelError,jsonBytes} from './channel-protocol.mjs';

const keyOf=(name,keys)=>name+'\u001e'+keys.join('\u001f');
const sameSharedRow465=(a,b,columns)=>a===b||!!a&&!!b&&columns.every(k=>a[k]===b[k]);
// Index only the small set of realm-shared monsters and their UNFLUSHED
// participation records. Historical participation is always an indexed SQL read.
export class SharedCombatState {
 constructor(sqlite){
  const raw=sqlite.positionRawPrepare??sqlite.prepare.bind(sqlite);
  this.read=raw('SELECT * FROM main.monsters WHERE channel=0');this.readOne=raw('SELECT * FROM main.monsters WHERE id=? AND channel=0');this.pendingKeys=new Set();this.records=new Map();this.reload();
 }
 reload(){this.records.clear();for(const row of this.read.all())this.records.set(keyOf('monsters',[row.id]),{name:'monsters',keys:[row.id],base:{...row},current:{...row},dirty:false});}
 changed(changes){for(const c of changes??[])if(c.table==='monsters')this.pendingKeys.add(c.id??c.keys[0]);}
 reconcile(){
  for(const id of this.pendingKeys){
   const key=keyOf('monsters',[id]),old=this.records.get(key),row=this.readOne.get(id);
   if(!row){this.records.delete(key);continue;}
   if(old&&row.spawn_round===old.base.spawn_round&&['hp','last_damaged_at_ms','last_regen_at_ms'].every(k=>row[k]===old.base[k])){
    const fields=Object.fromEntries(['hp','last_damaged_at_ms','last_regen_at_ms'].map(k=>[k,old.current[k]]));old.base={...row};old.current={...row,...fields};
   }else{
    this.records.set(key,{name:'monsters',keys:[id],base:{...row},current:{...row},dirty:false});
    if(old&&row.spawn_round!==old.base.spawn_round)for(const [k,r]of this.records)if(r.name==='monster_participants'&&r.keys[0]===id||r.name==='boss_participants'&&old.base.is_boss&&r.keys[0]===old.base.spawn_round)this.records.delete(k);
   }
  }
  this.pendingKeys.clear();
 }
 snapshot(){return structuredClone([...this.records.values()]);}
 publicMonsterRows(){return structuredClone([...this.records.values()].filter(r=>r.name==='monsters').map(r=>r.current));}
 hasDirty(){for(const row of this.records.values())if(row.dirty)return true;return false;}
 publish(records){
  if(!Array.isArray(records)||records.length>4096)throw channelError('shared_snapshot_limit');
  jsonBytes(records);
  const next=new Map(),monsters=new Map();
  for(const r of records)if(r.name==='monsters'){
   if(r.keys?.length!==1||r.current?.id!==r.keys[0]||r.current.channel!==0||r.base?.channel!==0||r.base.id!==r.current.id||r.base.spawn_round!==r.current.spawn_round)throw channelError('shared_monster_scope');
   if(r.dirty&&!(r.current.hp>0))throw channelError('shared_death_not_durable');
   if(r.dirty&&Object.keys(r.current).some(k=>!['hp','last_damaged_at_ms','last_regen_at_ms'].includes(k)&&r.current[k]!==r.base[k]))throw channelError('shared_field_not_allowed');
   monsters.set(r.current.id,r.current);
  }
  let bossRounds503;
  for(const r of records){
   if(!['monsters','monster_participants','boss_participants'].includes(r.name)||!Array.isArray(r.keys)||typeof r.dirty!=='boolean')throw channelError('shared_record_invalid');
   if(r.name==='monster_participants'&&(!r.current||!monsters.has(r.current.monster_id)||monsters.get(r.current.monster_id).spawn_round!==r.current.spawn_round||r.keys.join('\u001f')!==[r.current.monster_id,r.current.spawn_round,r.current.player_id].join('\u001f')))throw channelError('shared_participant_scope');
   if(r.name==='boss_participants'&&(!r.current||!(bossRounds503??=new Set([...monsters.values()].filter(m=>m.is_boss&&m.spawn_round===m.spawn_round).map(m=>m.spawn_round))).has(r.current.boss_round)||r.keys.join('\u001f')!==[r.current.boss_round,r.current.player_id].join('\u001f')))throw channelError('shared_boss_scope');
   const key=keyOf(r.name,r.keys);if(next.has(key))throw channelError('shared_duplicate_key');next.set(key,structuredClone(r));
  }
  if([...this.records.values()].filter(r=>r.name==='monsters').some(r=>!monsters.has(r.keys[0])))throw channelError('shared_monster_missing');
  this.records=new Map([...next].filter(([,r])=>r.name==='monsters'||r.dirty));
 }
}

export class ChannelSharedCombat {
 constructor(database,{peer,acquire,finish,onFatal=()=>{}}){
  this.database=database;this.peer=peer;this.acquire=acquire;this.finish=finish;this.onFatal=onFatal;
  this.context=new AsyncLocalStorage();this.tail=Promise.resolve();this.failed=null;this.imported=new Set();
  const raw=database.sqlite.positionRawPrepare??database.sqlite.prepare.bind(database.sqlite);
  this.monsters=new Map(raw('SELECT * FROM main.monsters WHERE channel=0').all().map(r=>[r.id,r]));
  this.rounds=new Set([...this.monsters.values()].filter(r=>r.is_boss).map(r=>r.spawn_round));
  database.sharedCombat=this;
 }
 isShared(name,keys,row){return name==='monsters'?this.monsters.has(keys[0]):name==='monster_participants'?this.monsters.has(keys[0]):name==='boss_participants'?this.rounds.has(row?.boss_round??keys[0]):false;}
 proof(){return this.context.getStore()?.proof;}
 include(name,keys,row){return !this.isShared(name,keys,row)||!!this.proof();}
 needs(payload,actor){
  if(payload?.action==='pvp_attack'){
   const ability=Math.min(3,Math.max(0,Math.floor(Number(payload.ability)||0)));
   // PvP-primary mixed hits can include a shared monster only in black.
   // Actor area is not used to authorize damage; the route checks it again.
   return ability===2&&actor?.role!=='muhafiz'&&[...this.monsters.values()].some(row=>row.area==='black');
  }
  if(payload?.action!=='attack')return false;
  if(this.monsters.has(payload.targetId))return true;
  // This is the native target selector's exact ability normalization. Only the
  // third Hunter/Arcanist skill expands to nearby targets; the others never do.
  const ability=Math.min(3,Math.max(0,Math.floor(Number(payload.ability)||0)));
  if(ability!==2||actor?.role==='muhafiz')return false;
  const table=this.database.combat.tables.get('monsters');
  const target=table.records.get(payload.targetId)?.current??table.read?.get(payload.targetId);
  // Do not infer geometry from client hints or stale positions. Any shared row
  // in this target's map (even presently dead) keeps the conservative lease.
  // Unknown target scope also keeps the lease. Actor area is not trusted here.
  return !target||[...this.monsters.values()].some(row=>row.area===target.area);
 }
 run(task){
  const work=this.tail.then(async()=>{
   if(this.failed)throw this.failed;
   let acquired=false,release,grant;
   try{
    grant=await this.acquire(this.peer,randomUUID());acquired=true;
    release=this.database.combat.projections?.retain(grant.snapshot.filter(r=>r.name==='monsters').map(r=>({name:r.name,id:r.keys.join('\u001f')})));
    this.install(grant.snapshot);
    const result=await this.context.run({proof:grant.proof},task);
    const records=this.export();
    await this.finish(this.peer,{proof:grant.proof,value:records});
    this.makeReplica(records);
    return result;
   }catch(error){
    if(acquired&&colLabRejectionForGrant(error,grant.proof,this.database.channel,this.database.sequence)){
     // The writer ACK already reconciled every staged row from durable state.
     // Finish the same grant normally; never reconstruct from a stale snapshot.
     // A failed/lost finish remains an unknown peer outcome and is still fatal.
     try{const records=this.export();await this.finish(this.peer,{proof:grant.proof,value:records});this.makeReplica(records);}
     catch(finishError){this.failed=finishError;this.onFatal(finishError);throw finishError;}
     throw error;
    }
    // Once acquisition might have succeeded, a lost response is not permission
    // to continue. Only supervisor fencing may unblock the shared owner.
    if(acquired||error.code==='peer_outcome_unknown'){this.failed=error;this.onFatal(error);}
    throw error;
   }finally{release?.();}
  });this.tail=work.catch(()=>{});return work;
 }
 install(records){
  const c=this.database.combat,next=new Set(records.map(r=>keyOf(r.name,r.keys))),changes=[];
  for(const key of this.imported)if(!next.has(key)){
   const [name,id]=key.split('\u001e'),t=c.tables.get(name),e=t.records.get(id);
   if(e){t.remove.run(...e.keys);t.records.delete(id);c.dirty.delete(key);t.recent.add(id);changes.push({name,id});if(name==='monster_participants')c.indexPending(id,{keys:e.keys,dirtyAt:0});}
  }
  for(const r of records)if(r.name==='monsters'){
   const columns=c.tables.get('monsters').spec.columns,old=this.monsters.get(r.keys[0]);
   if(!sameSharedRow465(old,r.current,columns))this.monsters.set(r.keys[0],r.current);
  }
  this.rounds=new Set([...this.monsters.values()].filter(r=>r.is_boss).map(r=>r.spawn_round));
  for(const r of records){
   const t=c.tables.get(r.name);if(!t||!this.isShared(r.name,r.keys,r.current))throw channelError('shared_import_scope');
   const id=r.keys.join('\u001f'),key=keyOf(r.name,r.keys),old=t.records.get(id);
   if(old&&sameSharedRow465(old.base,r.base,t.spec.columns)&&sameSharedRow465(old.current,r.current,t.spec.columns)&&
    (old.generation!==old.written)===r.dirty&&c.dirty.has(key)===r.dirty&&(!r.dirty||old.dirtyAt===r.dirtyAt))continue;
   const e={base:r.base,current:r.current,keys:r.keys,generation:r.dirty?1:0,written:0,changedAt:Date.now(),version:++c.serial,...(r.dirty?{dirtyAt:r.dirtyAt??Date.now(),pending:[[1,r.dirtyAt??Date.now()]]}:{})};
   t.records.set(id,e);if(e.current)t.put.run(...t.spec.columns.map(f=>e.current[f]));else t.remove.run(...r.keys);
   if(r.dirty)c.dirty.set(key,{name:r.name,id,e});else c.dirty.delete(key);
   if(r.name==='monster_participants')c.indexPending(id,e);
   t.recent.add(id);changes.push({name:r.name,id});
  }
  this.imported=next;
  if(changes.length)c.publish(changes);
 }
 export(){
  const c=this.database.combat,keys=new Set(this.imported);
  for(const {name,id,e}of c.dirty.values())if(this.isShared(name,e.keys,e.current))keys.add(name+'\u001e'+id);
  return [...keys].flatMap(key=>{const [name,id]=key.split('\u001e'),e=c.tables.get(name).records.get(id);return e?[{name,keys:e.keys,base:e.base,current:e.current,dirty:e.generation!==e.written,dirtyAt:e.dirtyAt}]:[];});
 }
 makeReplica(records){
  // The shared owner now owns pending HP/participants. A source must not also
  // flush them later when its next ordinary inventory operation commits.
  this.install(records.map(r=>({...r,base:r.current,dirty:false,dirtyAt:undefined})));
 }
 applyReplica({incarnation,version,rows}){
  if(this.replicaIncarnation===incarnation&&version<=this.replicaVersion)return {ok:true};
  if(!Array.isArray(rows)||rows.some(r=>r?.channel!==0))throw channelError('shared_replica_scope');
  const c=this.database.combat,t=c.tables.get('monsters'),changes=[];
  for(const row of rows){
   const old=t.records.get(row.id);
   if(old&&old.generation===old.written&&!c.dirty.has(keyOf('monsters',[row.id]))&&sameSharedRow465(old.base,row,t.spec.columns)&&sameSharedRow465(old.current,row,t.spec.columns)){this.monsters.set(row.id,old.current);continue;}
   const e={base:{...row},current:{...row},keys:[row.id],generation:0,written:0,changedAt:Date.now(),version:++c.serial};
   t.records.set(row.id,e);t.put.run(...t.spec.columns.map(f=>row[f]));t.recent.add(row.id);c.dirty.delete(keyOf('monsters',[row.id]));
   this.monsters.set(row.id,row);changes.push({name:'monsters',id:row.id});
   // Public world rows only; participant details remain in the private owner.
   this.database.worldPush?.committed({table:'monsters',id:row.id,keys:[row.id],row,staticChanged:1});
  }
  this.rounds=new Set([...this.monsters.values()].filter(r=>r.is_boss).map(r=>r.spawn_round));
  if(changes.length)c.publish(changes);this.replicaIncarnation=incarnation;this.replicaVersion=version;return {ok:true};
 }
 async flush(){return this.run(()=>this.database.remote([]));}
}
