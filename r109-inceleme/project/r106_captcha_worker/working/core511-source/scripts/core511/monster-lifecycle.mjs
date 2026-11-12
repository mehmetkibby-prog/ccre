import {prepareServerStatement} from './server-statements.mjs';
import {randomUUID} from 'node:crypto';
import {createRespawnRules} from './generated/respawn-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {OperationRandom} from './operation-random.mjs';
import {demand} from './contract.mjs';

export const RESPAWN_FIELDS=Object.freeze(['id','area','channel','hp','max_hp','is_boss','is_stone','summoned','spawn_round','respawn_at','variant']);
export const respawnBase=row=>Object.fromEntries(RESPAWN_FIELDS.map(key=>[key,row[key]]));
export const REPAIR_FIELDS=Object.freeze([...RESPAWN_FIELDS,'despawn_at','parent_stone_id']);
export const repairBase=row=>Object.fromEntries(REPAIR_FIELDS.map(key=>[key,row[key]]));
export function createDragonTickHandler({services,clock=Date.now}){
 return (sql,payload,context)=>{
  demand(sql.isTransaction&&context.peer.channel===0&&context.peer.role==='world','dragon_tick_owner');
  demand(Array.isArray(payload?.monsters)&&payload.monsters.length===1&&Number.isSafeInteger(payload.nowMs)&&payload.nowMs>=0&&payload.nowMs<=clock()+5000,'dragon_tick_payload');
  const expected=payload.monsters[0],row=prepareServerStatement(sql,"SELECT * FROM monsters WHERE id='dragon-world-1'").get();
  demand(expected&&Object.keys(expected).length===REPAIR_FIELDS.length&&REPAIR_FIELDS.every(key=>Object.hasOwn(expected,key)),'dragon_tick_fields');
  demand(row?.channel===0&&REPAIR_FIELDS.every(key=>Object.is(row[key],expected[key])),'dragon_tick_snapshot_conflict');
  return services.run(payload,()=>{
   // The original factory rechecks configuration and life under its nested
   // transaction. The system receipt and native mutation share the outer COMMIT.
   services.globals.__colDragonBoss.tick({cleanup:false});
   const monster=prepareServerStatement(sql,"SELECT * FROM monsters WHERE id='dragon-world-1'").get();
   return {monsters:[monster],participants:prepareServerStatement(sql,'SELECT * FROM monster_participants WHERE monster_id=? AND spawn_round=?').all(monster.id,monster.spawn_round),bossParticipants:[],config:{dragon_settings:prepareServerStatement(sql,'SELECT * FROM dragon_settings WHERE id=1').get()}};
  });
 };
}
export function createRepairHandler({services,clock=Date.now}){
 const rules=createRespawnRules({globals:services.globals});
 return (sql,payload,context)=>{
  demand(sql.isTransaction&&['repair','despawn'].includes(payload?.mode)&&Array.isArray(payload.monsters)&&payload.monsters.length>0&&payload.monsters.length<=128&&Number.isSafeInteger(payload.nowMs)&&payload.nowMs>=0&&payload.nowMs<=clock()+5000,'monster_repair_payload');
  const ids=[];for(const expected of payload.monsters){
   demand(expected&&Object.keys(expected).length===REPAIR_FIELDS.length&&REPAIR_FIELDS.every(key=>Object.hasOwn(expected,key))&&!ids.includes(expected.id),'monster_repair_fields');
   const row=prepareServerStatement(sql,'SELECT * FROM monsters WHERE id=?').get(expected.id);demand(row&&row.channel===context.peer.channel&&row.id!=='dragon-world-1','monster_repair_scope');
   demand(REPAIR_FIELDS.every(key=>Object.is(row[key],expected[key])),'monster_repair_snapshot_conflict');ids.push(row.id);
  }
  const settings={...rules.defaults,...prepareServerStatement(sql,'SELECT * FROM game_settings WHERE id=1').get(),...prepareServerStatement(sql,'SELECT * FROM combat_settings WHERE id=1').get()},db=nativeAtomicStatements(sql),now=Math.floor(payload.nowMs/1000);
  db.batch(rules.scoped(db,payload.mode==='repair'?rules.repairPlan(db,now):rules.despawnPlan(db,settings,now),context.peer.channel,ids));
  const monsters=ids.map(id=>prepareServerStatement(sql,'SELECT * FROM monsters WHERE id=?').get(id)).filter(Boolean),participants=[],bossParticipants=[];
  for(const m of monsters){participants.push(...prepareServerStatement(sql,'SELECT * FROM monster_participants WHERE monster_id=? AND spawn_round=?').all(m.id,m.spawn_round));if(m.is_boss)bossParticipants.push(...prepareServerStatement(sql,'SELECT * FROM boss_participants WHERE boss_round=?').all(m.spawn_round));}
  return {monsters,removed:ids.filter(id=>!monsters.some(m=>m.id===id)),participants,bossParticipants};
 };
}
export function createRespawnHandler({services,clock=Date.now}){
 const rules=createRespawnRules({globals:services.globals,random:()=>{demand(services.active,'respawn_random_context');return services.active.random();}});
 return (sql,payload,context)=>{
  demand(sql.isTransaction&&Array.isArray(payload?.monsters)&&payload.monsters.length>0&&payload.monsters.length<=128&&Number.isSafeInteger(payload.nowMs)&&payload.nowMs>=0&&payload.nowMs<=clock()+5000,'respawn_payload');
  const now=Math.floor(payload.nowMs/1000),seen=new Set(),monsters=[];
  for(const expected of payload.monsters){
   demand(expected&&Object.keys(expected).length===RESPAWN_FIELDS.length&&RESPAWN_FIELDS.every(key=>Object.hasOwn(expected,key))&&!seen.has(expected.id),'respawn_fields');seen.add(expected.id);
   const row=prepareServerStatement(sql,'SELECT * FROM monsters WHERE id=?').get(expected.id);
   demand(row&&row.channel===context.peer.channel&&row.id!=='dragon-world-1'&&row.hp<=0&&row.respawn_at>0&&row.respawn_at<=now,'respawn_scope');
   demand(RESPAWN_FIELDS.every(key=>Object.is(row[key],expected[key])),'respawn_snapshot_conflict');monsters.push(row);
  }
  return services.run(payload,()=>{
   const settings={...rules.defaults,...prepareServerStatement(sql,'SELECT * FROM game_settings WHERE id=1').get(),...prepareServerStatement(sql,'SELECT * FROM economy_settings WHERE id=1').get(),...prepareServerStatement(sql,'SELECT * FROM combat_settings WHERE id=1').get()},db=nativeAtomicStatements(sql);
   db.batch(rules.plan(db,settings,monsters,now));
   const current=monsters.map(row=>prepareServerStatement(sql,'SELECT * FROM monsters WHERE id=?').get(row.id)),participants=[],bossParticipants=[];
   for(const m of current){participants.push(...prepareServerStatement(sql,'SELECT * FROM monster_participants WHERE monster_id=? AND spawn_round=?').all(m.id,m.spawn_round));if(m.is_boss)bossParticipants.push(...prepareServerStatement(sql,'SELECT * FROM boss_participants WHERE boss_round=?').all(m.spawn_round));}
   return {monsters:current,participants,bossParticipants};
  });
 };
}

// The native due check stays on the process's maps. Only a due batch crosses
// IPC. Leases span checkpoint, COMMIT/fsync and resident refresh; an unknown
// outcome keeps every target locked until the process is actually replaced.
export class MonsterLifecycle {
 constructor({clock,settings,view,lanes,journal,submit,committed,onFatal=()=>{}}){for(const fn of [settings,submit,committed,onFatal])demand(typeof fn==='function','respawn_dependencies');Object.assign(this,{clock,settings,view,lanes,journal,submit,committed,onFatal});this.pending=null;this.failure=null;this.nextAt=0;this.incarnation=randomUUID();this.serial=0;this.stopping=false;}
 tick(nowMs){
  if(this.stopping||this.failure||this.pending||nowMs<this.nextAt)return;this.nextAt=nowMs+1000;
  let mode='dragon',candidates=this.clock.dragonDue()?[this.view.monster('dragon-world-1')]:[];
  if(!candidates.length){mode='repair';candidates=this.clock.repairCandidates(this.settings());}
  if(!candidates.length){mode='respawn';candidates=this.clock.due(Math.floor(nowMs/1000));}
  if(!candidates.length){mode='despawn';candidates=this.clock.despawnCandidates(Math.floor(nowMs/1000));}
  const monsters=candidates.filter(m=>!this.lanes.busy(['monster:'+m.id])).slice(0,128);if(!monsters.length)return;
  const lease=this.lanes.acquire(monsters.map(m=>'monster:'+m.id),this.incarnation);if(!lease)return;
  const kind=mode==='dragon'?'dragon_tick':mode==='respawn'?'monster_respawn':'monster_repair',key=mode+':'+this.incarnation+':'+(++this.serial),payload={monsters:monsters.map(mode==='respawn'?respawnBase:repairBase),nowMs,...(['respawn','dragon'].includes(mode)?{seed:OperationRandom.seed()}:{mode})};
  this.pending=Promise.resolve().then(async()=>{
   await this.journal.drain();this.lanes.assert(lease);
   const ack=await this.submit({key,kind,payload}),ids=[...(ack?.result?.monsters??[]).map(m=>m.id),...ack?.result?.removed??[]];demand(ack?.key===key&&ids.length===monsters.length&&new Set(ids).size===ids.length&&ids.every(id=>lease.keys.includes('monster:'+id)),'respawn_ack');
   // Other monsters may have checkpointed while this response was in flight.
   // Await that receipt before replacing only these leased journal entries.
   while(this.journal.pending)await this.journal.pending;
   this.lanes.assert(lease);this.journal.committed(ack.result);this.committed(ack.result);for(const [key,row]of Object.entries(ack.result.config??{}))this.clock.config.set(key,row);this.lanes.release(lease);this.nextAt=0;
  }).catch(error=>{this.failure=error;if(lease.state==='held')this.lanes.fence(lease);this.onFatal(error);throw error;}).finally(()=>{this.pending=null;});void this.pending.catch(()=>{});
 }
 async drain(){this.stopping=true;if(this.pending)await this.pending;demand(!this.failure,'respawn_outcome_unknown');}
}
