import {gameplayR55} from './r55-gameplay-options.mjs';
import {createDungeonRules} from './generated/dungeon-rules.mjs';
import {isBagFull,bagFullBody} from './bag-limit.mjs';
import {towerConfigFromDatabase} from './tower-config.mjs';
import {OperationRandom} from './operation-random.mjs';
import {forkDungeonRoom,dungeonImageChanged} from './dungeon-snapshot.mjs';
import {CHECKPOINT_MS,demand,kernelError,validChannel} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorRejection} from './actor-rejection.mjs';

const wire=value=>JSON.parse(JSON.stringify(value));
const blocked=()=>kernelError('dungeon_requires_writer');
const commandActions=new Set(['sync','move','attack','create','create_solo','create_tower','tower_open_chest','tower_refine','craft_solo_key','craft','wings','collect','potion','leave','ready','portal']);
export const validDungeonCommand=input=>Boolean(input&&typeof input==='object'&&!Array.isArray(input)&&commandActions.has(input.action));
const one=(sqlite,sql,...args)=>sqlite.prepare(sql).get(...args);

function engineView(Rules,{database,now,stats,settings,run,stamp,lastSave,notices=[],lastTick,periodicSave,makeGear}){
 const e=Object.create(Rules.DungeonEngine.prototype);
 Object.assign(e,{db:database,now:()=>now,roll:()=>Rules.random.roll(),stats,rules:Rules.GROUP_RULES,
  onWork:()=>{},settingsSnapshot:table=>settings[table],persistedAt:new Map(),lastSave:new Map(),
  runs:new Map(),notices:new Map(notices),lastTick:lastTick??now,
  returnRevisions:',position_revision=position_revision+1,hp_revision=hp_revision+1',makeGear});
 if(run){e.runs.set(run.id,run);e.persistedAt.set(run.id,stamp);e.lastSave.set(run.id,lastSave??now);}
 e.periodicSave=periodicSave??(r=>e.save(r));
 return e;
}

function ruleSet(globals,progressionSettings){
 const result={random:null};
 Object.assign(result,createDungeonRules({globals,progressionSettings,randomUUID:()=>result.random.uuid(),randomInt:(...args)=>result.random.integer(...args)}));
 return result;
}

export function invokeDungeon(engine,operation){
 if(operation.kind==='command'){
  demand(commandActions.has(operation.input?.action),'unsupported_dungeon_command');
  return engine.command(operation.actor,operation.input);
 }
 if(operation.kind==='tick'){
  demand(Number.isFinite(operation.elapsed)&&operation.elapsed>=0&&operation.elapsed<=.2,'invalid_dungeon_elapsed');
  engine.withStepSettings(()=>engine.tickStep(engine.runs.values(),operation.now,operation.elapsed));return {ok:true};
 }
 if(operation.kind==='checkpoint'){
  const run=engine.runs.get(operation.runId);demand(run,'dungeon_run_missing');engine.save(run);return {ok:true};
 }
 throw kernelError('unsupported_dungeon_operation');
}

// The independent world owns finalization only after no native member remains.
// It executes the original tick/finish under the global cold barrier, including
// original expiry/wipe/complete ordering and the archived native room image.
export function createEmptyDungeonTick({globals,progressionSettings,stats,makeGear}){
 const Rules=ruleSet(globals,progressionSettings);
 return (sqlite,row,{nowMs,seed})=>{
  demand(sqlite.isTransaction,'dungeon_empty_requires_atomic');const run=JSON.parse(row.state);
  demand(run.id===row.id&&Array.isArray(run.members)&&run.members.length>0&&run.members.every(p=>p.left===true)&&!one(sqlite,'SELECT 1 FROM dungeon_members WHERE run_id=?',row.id),'dungeon_empty_scope');
  Rules.random=new OperationRandom(seed);const settings={game_settings:one(sqlite,'SELECT * FROM game_settings WHERE id=1'),combat_settings:one(sqlite,'SELECT * FROM combat_settings WHERE id=1')},engine=engineView(Rules,{database:sqlite,now:nowMs,stats,settings,run,stamp:row.updated_at,lastSave:row.updated_at,lastTick:nowMs,makeGear});
  engine.transaction=fn=>{demand(sqlite.isTransaction,'dungeon_empty_requires_atomic');if(engine.transactionSaves)return fn();engine.transactionSaves=new Map();try{return fn();}finally{engine.transactionSaves=null;}};
  invokeDungeon(engine,{kind:'tick',now:nowMs,elapsed:0});demand(!engine.runs.has(row.id),'dungeon_empty_not_finished');
  return {finished:{...one(sqlite,'SELECT id,status,updated_at FROM dungeon_runs WHERE id=?',row.id)},notices:[...engine.notices]};
 };
}

// This is the writer-side adapter for the unchanged V510 dungeon engine. It is
// called only INSIDE DurableLedger/LocalDatabase.atomic, never from a hot tick.
// Native reward/event/entry receipt PKs and every native SQL predicate remain.
export function createDungeonWriterHandler({assertOwnership,stats,globals=globalThis,progressionSettings,makeGear,randomFor=p=>new OperationRandom(p.seed),clock=Date.now,allowForeignEntry=false,onFinish=()=>{}}={}){
 demand(typeof assertOwnership==='function'&&typeof stats==='function','dungeon_writer_dependencies_missing');
 const Rules=ruleSet(globals,progressionSettings);
 return (sqlite,payload,context)=>{
  demand(sqlite.isTransaction,'dungeon_writer_requires_atomic');
  const {operation,run:provided,stamp,seed,actors,lastSave,lastTick}=payload;
  demand(operation&&Number.isSafeInteger(operation.now)&&operation.now>=0&&operation.now<=clock()+5000,'invalid_dungeon_time');
  demand(validChannel(context.peer.channel)&&Array.isArray(actors)&&actors.length>0&&actors.length<=25&&new Set(actors).size===actors.length,'invalid_dungeon_scope');
  demand(actors.includes(context.actor),'dungeon_actor_scope');
  if(operation.kind==='command')demand(operation.actor===context.actor,'dungeon_command_actor');
  for(const id of actors)demand(assertOwnership(sqlite,context.peer,id,payload.epochs?.[id])===true,'dungeon_owner_fenced');
  let run=null,partyIds=null;
  if(provided){
   demand(typeof provided.id==='string'&&provided.members.length>0&&provided.members.length<=25,'invalid_dungeon_room');
   const row=one(sqlite,'SELECT leader_id,party_id,updated_at,status FROM dungeon_runs WHERE id=?',provided.id);
   demand(row&&row.updated_at===stamp&&row.leader_id===provided.leaderId&&row.party_id===provided.partyId,'dungeon_snapshot_conflict');
   demand(!['cancelled','expired','failed','abandoned'].includes(row.status),'dungeon_finished');
   const members=sqlite.prepare('SELECT player_id FROM dungeon_members WHERE run_id=? ORDER BY player_id').all(provided.id).map(p=>p.player_id);
   const active=provided.members.filter(p=>!p.left).map(p=>p.id).sort();
   demand(JSON.stringify(members)===JSON.stringify(active)&&active.every(id=>actors.includes(id)),'dungeon_membership_conflict');
   demand(operation.runId===provided.id,'dungeon_run_scope');
   run=structuredClone(provided);
  }else{
   demand(operation.kind==='command','dungeon_room_required');
   const ids=sqlite.prepare('SELECT p.id FROM party_members m JOIN players p ON p.id=m.player_id WHERE m.party_id=(SELECT party_id FROM party_members WHERE player_id=?)').all(context.actor).map(r=>r.id);
   if(operation.input.action==='create'){partyIds=ids;if(!allowForeignEntry)demand(ids.every(id=>actors.includes(id)),'dungeon_party_scope');}
   for(const id of actors)demand(!one(sqlite,'SELECT run_id FROM dungeon_members WHERE player_id=?',id),'dungeon_membership_conflict');
  }
  const settings={game_settings:one(sqlite,'SELECT * FROM game_settings WHERE id=1'),combat_settings:one(sqlite,'SELECT * FROM combat_settings WHERE id=1'),...(['create_tower','tower_open_chest'].includes(operation.input?.action)?{kadim_tower_settings:towerConfigFromDatabase(sqlite)}:{})};
  Rules.random=randomFor(payload);
  const engine=engineView(Rules,{database:sqlite,now:operation.now,stats,settings,run,stamp,lastSave,lastTick,makeGear});
  // Only this synchronous native command joins this already-open writer job.
  // No other actor/task can join it and no inner COMMIT can acknowledge early.
  engine.transaction=fn=>{demand(sqlite.isTransaction,'dungeon_writer_requires_atomic');if(engine.transactionSaves)return fn();engine.transactionSaves=new Map();try{return fn();}finally{engine.transactionSaves=null;}};
  let result,resultRun,knownRejection=false;
  sqlite.exec('SAVEPOINT kernel_dungeon_rule');
  try{
   if(operation.input?.action==='create_tower')throw Error('Kadim Kulesi güncellendi. Sayfayı yenileyip kule girişini kullan.');
   result=invokeDungeon(engine,operation);resultRun=[...engine.runs.values()][0]??null;
   // The shared entry barrier permits original native eligibility reads of
   // foreign/offline party rows. A successful room still requires every member
   // to belong to this exact local ownership group before any write commits.
   if(partyIds)demand(partyIds.every(id=>actors.includes(id)),'dungeon_party_scope');
   if(run&&!resultRun)onFinish(sqlite,run.id);
   sqlite.exec('RELEASE kernel_dungeon_rule');
  }catch(error){
   sqlite.exec('ROLLBACK TO kernel_dungeon_rule; RELEASE kernel_dungeon_rule');
   // Native user-rule rejections are plain Errors. Database errors, ownership
   // failures and programming errors must still fence the actor/room.
   if(!isBagFull(error)&&(error?.constructor!==Error||error.code))throw error;
   knownRejection=true;result=isBagFull(error)?bagFullBody():{ok:false,code:'dungeon_rule_rejected',error:error.message};
   resultRun=provided?structuredClone(provided):null;
  }
  // Commands such as wing toggles used to rely on the request transaction.
  // This adapter's entire callback always remains in the durable group.
  const players=actors.map(id=>one(sqlite,'SELECT * FROM players WHERE id=?',id)).filter(Boolean);
  const memberships=actors.map(id=>[id,one(sqlite,'SELECT run_id FROM dungeon_members WHERE player_id=?',id)?.run_id??null]);
  const materials=actors.map(id=>[id,Object.fromEntries(sqlite.prepare('SELECT kind,amount FROM dungeon_materials WHERE player_id=?').all(id).map(r=>[r.kind,r.amount]))]);
  return wire({result,run:resultRun,stamp:resultRun?(knownRejection?stamp:engine.persistedAt.get(resultRun.id)):null,
   lastSave:resultRun?(knownRejection?lastSave:engine.lastSave.get(resultRun.id)):null,lastTick:knownRejection?lastTick:engine.lastTick,
   notices:knownRejection?[]:[...engine.notices],players,memberships,materials});
 };
}

export function createDungeonEntryWriterHandler({authority,assertShared,assertHeld,...options}){
 demand(authority&&typeof assertShared==='function'&&typeof assertHeld==='function','dungeon_entry_dependencies');let offline=null;
 const command=createDungeonWriterHandler({...options,allowForeignEntry:true,assertOwnership:(sql,peer,id,epoch)=>offline?.has(id)?!authority.admission(id,sql)&&!authority.simulation(id,sql)&&sql.prepare('SELECT channel FROM players WHERE id=?').get(id)?.channel===peer.channel:options.assertOwnership(sql,peer,id,epoch)});
 return (sql,payload,context)=>{
  demand(sql.isTransaction&&payload.command?.action==='create','dungeon_entry_command');assertShared(sql,payload,context);
  // Derive the group after all accepted party edits have drained, inside the
  // native COMMIT. Client/cached membership cannot broaden this ownership.
  const party=sql.prepare('SELECT player_id FROM party_members WHERE party_id=(SELECT party_id FROM party_members WHERE player_id=?)').all(context.actor).map(p=>p.player_id),actors=[],epochs={},candidates=new Set();
  for(const id of new Set([context.actor,...party])){const owner=authority.owner(id,sql),live=authority.admission(id,sql)||authority.simulation(id,sql);
   if(live){demand(assertHeld(id,payload,context),'dungeon_entry_member_not_frozen');if(owner?.channel!==context.peer.channel||owner.incarnation!==context.peer.incarnation)continue;epochs[id]=owner.epoch;}
   else{if(sql.prepare('SELECT channel FROM players WHERE id=?').get(id)?.channel!==context.peer.channel)continue;demand(!owner||owner.state==='active','dungeon_entry_offline_owner');candidates.add(id);epochs[id]=(owner?.epoch??0)+1;}
   actors.push(id);
  }
  demand(actors.includes(context.actor)&&!candidates.has(context.actor),'dungeon_entry_owner');
  authority.commandGuard?.(sql,context.peer,{playerId:context.actor,epoch:context.epoch,operation:'dungeon_entry',payload:{...payload,resources:[...new Set([...payload.resources,...actors.map(id=>'player:'+id)])]}});
  demand(offline===null,'dungeon_entry_overlap');offline=candidates;let result;
  try{result=command(sql,{operation:{kind:'command',actor:context.actor,input:payload.command,now:payload.nowMs,runId:null},run:null,stamp:null,seed:payload.seed,actors,epochs,lastSave:payload.nowMs,lastTick:payload.lastTick,resources:payload.resources},context);}finally{offline=null;}
  const passiveAdmissions=[];if(result.result.ok&&result.run)for(const id of candidates)passiveAdmissions.push(authority.claimDungeonSimulationIn(sql,id,context.peer,result.run.id));
  if(!passiveAdmissions.length&&candidates.size)result={...result,players:result.players.filter(p=>!candidates.has(p.id)),memberships:result.memberships.filter(([id])=>!candidates.has(id)),materials:result.materials.filter(([id])=>!candidates.has(id))};
  return {...result,passiveAdmissions};
 };
}

// Admission/checkpoint hydration is a writer/read-worker operation. The
// resident adapter below has no SQLite object, SQL parser or prepare wrapper.
export function readDungeonAdmission(sqlite,actorIds){
 // An empty channel still needs the original dungeon settings at boot. This
 // is a read-only snapshot limit; command membership checks remain nonempty.
 demand(Array.isArray(actorIds)&&actorIds.length<=25&&actorIds.every(id=>typeof id==='string'&&id.length>0),'invalid_dungeon_admission');
 const actors=[...new Set(actorIds)],players=[],memberships=[],materials=[],runs=new Map();
 for(const id of actors){
  const player=one(sqlite,'SELECT * FROM players WHERE id=?',id);demand(player,'dungeon_player_missing');players.push(player);
  const rid=one(sqlite,'SELECT run_id FROM dungeon_members WHERE player_id=?',id)?.run_id??null;memberships.push([id,rid]);
  materials.push([id,Object.fromEntries(sqlite.prepare('SELECT kind,amount FROM dungeon_materials WHERE player_id=?').all(id).map(r=>[r.kind,r.amount]))]);
  if(rid&&!runs.has(rid)){const row=one(sqlite,'SELECT state,updated_at FROM dungeon_runs WHERE id=?',rid);demand(row,'dungeon_run_missing');runs.set(rid,{run:JSON.parse(row.state),stamp:row.updated_at,lastSave:row.updated_at});}
 }
 return wire({players,memberships,materials,runs:[...runs.values()],settings:{
  game_settings:one(sqlite,'SELECT * FROM game_settings WHERE id=1'),combat_settings:one(sqlite,'SELECT * FROM combat_settings WHERE id=1'),
  dungeon_settings:JSON.parse(one(sqlite,'SELECT value FROM dungeon_settings WHERE id=1').value),kadim_tower_settings:towerConfigFromDatabase(sqlite)}});
}

export class ResidentDungeon {
 constructor({channel,submit,assertOwned,actorsFor,globals=globalThis,progressionSettings,clock=Date.now,onFatal=()=>{},onCommitted=()=>{},progressFix=gameplayR55.dungeonProgress}){
  demand(validChannel(channel)&&typeof submit==='function'&&typeof assertOwned==='function'&&typeof actorsFor==='function','dungeon_resident_dependencies_missing');
  this.progressFix=progressFix;this.channel=channel;this.submit=submit;this.assertOwned=assertOwned;this.actorsFor=actorsFor;this.onFatal=onFatal;this.onCommitted=onCommitted;
  this.rules=ruleSet(globals,progressionSettings);this.players=new Map();this.memberships=new Map();this.materials=new Map();this.runs=new Map();this.settings=null;
  this.pending=new Map();this.failure=null;this.serial=0;this.incarnation=OperationRandom.seed().slice(0,24);this.versions=new Map();this.notices=new Map();this.presence=new Map();
  this.lastTick=clock();this.metrics={steps:0,hotReads:0,writerSteps:0,checkpoints:0};
 }
 hydrate(snapshot){
  demand(this.pending.size===0,'dungeon_hydration_pending');
  for(const p of snapshot.players){demand(p.channel===this.channel,'dungeon_admission_channel');this.players.set(p.id,structuredClone(p));}
  for(const [id,rid]of snapshot.memberships)this.memberships.set(id,rid);
  for(const [id,materials]of snapshot.materials)this.materials.set(id,structuredClone(materials));
  for(const row of snapshot.runs){demand(row.run.members.filter(m=>!m.left).every(m=>this.players.has(m.id)),'dungeon_partial_room_admission');this.runs.set(row.run.id,structuredClone(row));this.versions.set(row.run.id,(this.versions.get(row.run.id)??0)+1);}
  this.settings=structuredClone(snapshot.settings);
 }
 runFor(id){return this.runs.get(this.memberships.get(id))?.run??null;}
 seen(id,at){demand(Number.isSafeInteger(at)&&this.players.has(id),'dungeon_presence_actor');this.presence.set(id,Math.max(this.presence.get(id)??0,at));const p=this.players.get(id);if(p.last_seen<Math.floor(at/1000))this.players.set(id,{...p,last_seen:Math.floor(at/1000)});}
 applyResult(value,{original=null}={}){
  this.lastTick=value.lastTick;if(original)this.runs.delete(original.id);
  if(value.run){this.runs.set(value.run.id,{run:value.run,stamp:value.stamp,lastSave:value.lastSave,lastTick:value.lastTick});this.versions.set(value.run.id,(this.versions.get(value.run.id)??0)+1);}
  for(const p of value.players)this.players.set(p.id,p);
  for(const [id,rid]of value.memberships)this.memberships.set(id,rid);
  for(const [id,materials]of value.materials)this.materials.set(id,materials);
  for(const [id,notice]of value.notices)this.notices.set(id,notice);
 }
 step(actor,operation,{now=Date.now(),seed=OperationRandom.seed(),resources=[]}={}){
  demand(!this.failure,'dungeon_fenced');demand(this.settings,'dungeon_not_hydrated');
  const original=operation.kind!=='command'&&operation.runId?this.runs.get(operation.runId)?.run:this.runFor(actor),entry=original?this.runs.get(original.id):null;
  let actors=original?original.members.filter(m=>!m.left).map(m=>m.id):this.actorsFor(actor,operation.input);
  if(original&&actors.length===0){demand(original.members.some(m=>m.id===actor),'dungeon_actor_scope');actors=[actor];}
  demand(Array.isArray(actors)&&actors.includes(actor)&&actors.length<=25,'invalid_dungeon_actor_scope');
  const epochs={};for(const id of actors){demand(!this.pending.has(id),'dungeon_room_pending');epochs[id]=this.assertOwned(id);demand(Number.isSafeInteger(epochs[id])&&epochs[id]>0,'dungeon_owner_fenced');}
  const command={...operation,actor,now,runId:original?.id??null};
  demand(command.kind!=='checkpoint'||original,'dungeon_run_missing');
  // Pongs cannot mutate a room while its COMMIT is pending. Merge them into
  // this step's private input, including the exact replay sent to the writer.
  const run=original?forkDungeonRoom(original,{attack:operation.kind==='command'&&operation.input?.action==='attack',presence:this.presence}):null;let needsWriter=false;
  const requireWriter=()=>{needsWriter=true;throw blocked();};
  this.rules.random=new OperationRandom(seed);
  // The native statement cache reads exec before trying to install wrappers.
  // Treat that read as a request for the writer, before it mutates this frozen
  // read-denying facade (equipment collection used to throw TypeError here).
  const database=Object.freeze(this.progressFix?{prepare:requireWriter,get exec(){return requireWriter();},get isTransaction(){return false;}}:{prepare:requireWriter,exec:requireWriter,get isTransaction(){return false;}});
  const engine=engineView(this.rules,{database,now,settings:this.settings,run,stamp:entry?.stamp,lastSave:entry?.lastSave,lastTick:entry?.lastTick??this.lastTick,notices:[...this.notices]});
  engine.player=id=>{this.metrics.hotReads++;const p=this.players.get(id);demand(p,'dungeon_player_not_resident');return p;};
  engine.membership=id=>{this.metrics.hotReads++;return this.memberships.get(id)??undefined;};
  engine.materials=id=>{this.metrics.hotReads++;return {...this.materials.get(id)};};
  engine.settings=()=>({...this.rules.DUNGEON_DEFAULTS,...this.settings.dungeon_settings});
  engine.statsFor=requireWriter;engine.transaction=requireWriter;engine.save=requireWriter;
  // Only recoverable HP/position checkpoints move from 1 s to the requested
  // 5 s cadence. Entry, death, loot, reward and transitions still require ACK.
  engine.periodicSave=r=>{if(now-(entry?.lastSave??0)>=CHECKPOINT_MS)requireWriter();};
  let result,error;
  try{result=invokeDungeon(engine,command);}catch(e){error=e;}
  this.metrics.steps++;
  if(!needsWriter){
   if(error){if(error.constructor===Error&&!error.code)return {durable:false,result:{ok:false,code:'dungeon_rule_rejected',error:error.message}};throw error;}
   this.lastTick=engine.lastTick;
   if(run){this.runs.set(run.id,{...entry,run,lastTick:engine.lastTick});if(dungeonImageChanged(original,run))this.versions.set(run.id,(this.versions.get(run.id)??0)+1);}
   return {durable:false,result};
  }
  const supplied=original?{...original,members:original.members.map(m=>({...m,seen:Math.max(m.seen??0,this.presence.get(m.id)??0)}))}:null;
  const payload=wire({operation:command,run:supplied,stamp:entry?.stamp??null,lastSave:entry?.lastSave??now,lastTick:entry?.lastTick??this.lastTick,actors,epochs,seed,resources});
  const event={key:'dungeon:'+this.incarnation+':'+(++this.serial),actor,kind:'dungeon',payload};
  const token={event};for(const id of actors)this.pending.set(id,token);this.metrics.writerSteps++;
  let acknowledged=false;
  const completion=Promise.resolve().then(()=>this.submit(event)).then(async ack=>{
   demand(ack.key===event.key&&ack.result,'dungeon_ack_mismatch');
   acknowledged=true;
   for(const id of actors)demand(this.pending.get(id)===token&&this.assertOwned(id)===epochs[id],'dungeon_owner_fenced');
   const value=ack.result;this.applyResult(value,{original});
   // Publish to the rest of the resident game state before releasing actors.
   await this.onCommitted(value);for(const id of actors)this.pending.delete(id);
   if(command.kind==='checkpoint')this.metrics.checkpoints++;
   return value.result;
  }).catch(error=>{
   if(actorFaultIsolation&&acknowledged&&actorRejection(error))error=Object.assign(Error('dungeon_refresh_outcome_unknown'),{code:'dungeon_refresh_outcome_unknown',cause:error});
   const rejected=actorFaultIsolation&&!acknowledged?actorRejection(error):null;
   // A trusted rejection from the actor checkpoint/command has no committed
   // room result. Drop only this attempt's tokens; the original room was never
   // replaced by its speculative fork. The caller unwinds its resource lease.
   if(rejected&&actors.includes(rejected.actor)&&epochs[rejected.actor]===rejected.epoch&&actors.every(id=>this.pending.get(id)===token)){
    for(const id of actors)this.pending.delete(id);throw error;
   }
   this.failure=error;this.onFatal(error);throw error;
  });
  token.completion=completion;return {durable:true,completion,event};
 }
 async drain(){await Promise.all([...new Set(this.pending.values())].map(p=>p.completion));if(this.failure)throw this.failure;}
}
