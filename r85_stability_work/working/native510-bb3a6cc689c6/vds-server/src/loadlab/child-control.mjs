import {installPendingAdmissionChildR14} from './pending-admission-r14.mjs';
import {installSharedLoadLabControl} from './shared-control.mjs';
const fail=code=>Object.assign(Error(code),{code});
const raw=db=>db.sqlite.positionRawPrepare??db.sqlite.prepare.bind(db.sqlite);
export function installLoadLabChildControl({rpc,db,registry}){
 installSharedLoadLabControl({rpc,db,registry});
 installPendingAdmissionChildR14({rpc,db,registry});
 if(!rpc.handlers.loadlabState)rpc.handlers.loadlabState=frame=>registry.apply(frame);
 const drains=new Map(),recoveries=new Map(),blockedPlayers=new Set(),blockedMonsters=new Set();let hookedWorld=null;
 const isRevoked=runId=>{const status=registry.runStatus(runId);if(registry.active(runId)||status!==null&&status!=='revoked')throw fail('revoke_before_drain');};
 const ownedPlayer=(id,runId)=>{const r=raw(db)('SELECT * FROM main.players WHERE id=?').get(id);if(!r||r.loadlab_run_id!==runId||r.channel!==db.channel||registry.playerRun(id)!==runId)throw fail('unowned_drain_player');return r;};
 function hook(){const world=db.combat?.worldLoop;if(!world||world===hookedWorld)return;hookedWorld=world;const changed=world.changed.bind(world);world.changed=(table,id,row)=>changed(table,id,((table==='players'||table==='pve_engagements')&&blockedPlayers.has(id)||table==='monsters'&&blockedMonsters.has(id))?null:row);}
 rpc.handlers.loadlabDrain=async({runId,ids=[]})=>{
  isRevoked(runId);if(!Array.isArray(ids)||ids.length>25||new Set(ids).size!==ids.length)throw fail('invalid_drain_cohort');hook();
  let frame=drains.get(runId);if(!frame){frame={players:new Set(),monsters:new Set(),rounds:new Set(),locked:new Set(),drained:false};drains.set(runId,frame);}
  // Prove the entire supplied cohort before changing any local ownership.
  for(const id of ids)ownedPlayer(id,runId);
  if(new Set([...frame.players,...ids]).size>25)throw fail('invalid_drain_cohort');
  for(const id of ids){frame.players.add(id);blockedPlayers.add(id);db.drainingPlayers.add(id);}
  const cancelling=[...recoveries].filter(([,h])=>h.runId===runId);
  for(const [,h]of cancelling)h.cancelled=true;
  await Promise.all(cancelling.map(([,h])=>Promise.resolve(h.work).catch(()=>{})));
  for(const [id,h]of cancelling){if(h.installed){const wait=db.permanentWait?.get(id);db.permanentWait?.delete(id);wait?.release();}recoveries.delete(id);}
  const monsters=raw(db)('SELECT id FROM main.monsters WHERE loadlab_run_id=? AND (channel=? OR channel=0)').all(runId,db.channel);
  for(const m of monsters){if(registry.monsterRun(m.id)!==runId)throw fail('unowned_drain_monster');frame.monsters.add(m.id);blockedMonsters.add(m.id);if(!frame.locked.has(m.id)){db.combat.locks.set(m.id,(db.combat.locks.get(m.id)??0)+1);frame.locked.add(m.id);}}
  if(raw(db)("SELECT 1 FROM main.sqlite_schema WHERE name='loadlab_cleanup_shared_v1'").get()){const j=raw(db)("SELECT * FROM main.loadlab_cleanup_shared_v1 WHERE run_id=? AND status='deleted'").get(runId);if(j){for(const id of JSON.parse(j.ids_json)){if(registry.monsterRun(id)!==runId)throw fail('unowned_journal_monster');frame.monsters.add(id);blockedMonsters.add(id);if(!frame.locked.has(id)){db.combat.locks.set(id,(db.combat.locks.get(id)??0)+1);frame.locked.add(id);}}for(const n of JSON.parse(j.rounds_json))frame.rounds.add(n);}}
  if(raw(db)("SELECT 1 FROM main.sqlite_schema WHERE name='loadlab_boss_rounds_v1'").get())for(const r of raw(db)('SELECT boss_round,monster_id FROM main.loadlab_boss_rounds_v1 WHERE run_id=?').all(runId))if(frame.monsters.has(r.monster_id))frame.rounds.add(r.boss_round);
  // Mark the whole cohort before awaiting; no second bot starts during the
  // first bot's flush. Native actor/barrier waits keep prior ACK order intact.
  await Promise.all([...frame.players].map(id=>db.freezePlayer(id)));
  // A native scope may have started an admission before revocation outside a
  // player actor. It must settle before the final flush and local retirement.
  await Promise.allSettled([...frame.players].map(id=>db.claims?.get(id)).filter(Boolean));
  await Promise.all([...frame.monsters].map(id=>db.combat.waitForTarget(id)));
  await db.sharedCombat?.tail;
  if(db.sharedCombat)await db.sharedCombat.flush();
  await db.flushMemory();await db.writeTail;
  db.assertAvailable();isRevoked(runId);
  // Retire only proven, fully drained test leases before the main cleanup can
  // delete channel_owners. Otherwise unrelated maintenance carries stale bot
  // leases in its conservative owner list and correctly trips the writer fence.
  // Do not filter generic draining owners: real transfers/economic work use it.
  for(const id of frame.players)if(!db.drainingPlayers.has(id)||db.playerWork.get(id)?.size||db.claims?.has(id)||db.positions.dirty.has(id)||db.positions.pendingWrites.has(id))throw fail('player_not_drained');
  for(const {name,id,e}of db.combat.dirty.values()){
   const row=e.current??e.base;
   if(name==='players'&&frame.players.has(id)||row&&(frame.players.has(row.player_id)||frame.players.has(row.target_id)))throw fail('dirty_record_after_drain');
  }
  const world=db.combat.worldLoop;for(const id of frame.players){world?.changed('players',id,null);world?.changed('pve_engagements',id,null);}for(const id of frame.monsters)world?.changed('monsters',id,null);
  for(const id of frame.players)db.forgetPlayer(id);
  // Keep the private frame, world blocks and draining tombstones until normal
  // post-deletion forget. A retry can safely retire these same leases again.
  frame.drained=true;return {ok:true,runId,drained:true,channel:db.channel,players:frame.players.size,monsters:frame.monsters.size,writerSequence:db.sequence};
 };
 rpc.handlers.loadlabForget=async({runId,playerIds=[],monsterIds=[]})=>{
  isRevoked(runId);const frame=drains.get(runId);if(!frame?.drained)throw fail('drain_required');
  for(const id of playerIds)if(registry.playerRun(id)!==runId)throw fail('unowned_forget_player');for(const id of monsterIds)if(registry.monsterRun(id)!==runId)throw fail('unowned_forget_monster');
  for(const id of frame.players)if(raw(db)('SELECT 1 FROM main.players WHERE id=?').get(id))throw fail('player_still_exists');
  for(const id of frame.monsters)if(raw(db)('SELECT 1 FROM main.monsters WHERE id=?').get(id))throw fail('monster_still_exists');
  for(const id of frame.players){db.forgetPlayer(id);db.combat.tables.get('players').recent.delete(id);blockedPlayers.delete(id);}
  const changes=[];
  for(const [name,table]of db.combat.tables){
   for(const [id,entry]of table.records){const r=entry.current??entry.base;if(!r)continue;
    const touches=name==='players'?frame.players.has(r.id):name==='monsters'?frame.monsters.has(r.id):frame.players.has(r.player_id)||frame.monsters.has(r.monster_id)||frame.players.has(r.target_id)||frame.monsters.has(r.target_id)||frame.rounds.has(r.boss_round);
    if(!touches)continue;if(db.combat.dirty.has(name+'\u001e'+id))throw fail('dirty_record_after_drain');
    table.remove.run(...entry.keys);table.records.delete(id);table.recent.add(id);changes.push({name,id});
    if(name==='monster_participants')db.combat.indexPending(id,{keys:entry.keys,dirtyAt:0});
   }
  }
  if(changes.length)db.combat.publish(changes);
  for(const {name,id}of changes)db.combat.tables.get(name).recent.delete(id);
  for(const id of frame.monsters){const remaining=(db.combat.locks.get(id)??1)-1;if(remaining)throw fail('monster_work_after_drain');db.combat.locks.delete(id);db.combat.pendingByMonster.delete(id);blockedMonsters.delete(id);}
  // Every pending actor drained and the durable entity is gone; clear only
  // this local tombstone after forget. A late normal admission still reads
  // the missing row and rejects. Never call permanentResume on deleted IDs.
  for(const id of frame.players)db.drainingPlayers.delete(id);
  drains.delete(runId);return {ok:true,runId,forgotten:true};
 };
 rpc.handlers.loadlabRecoverFreeze=async({runId,id,token})=>{
  if(!registry.active(runId)||!token||recoveries.has(id)||db.drainingPlayers.has(id))throw fail('recovery_not_available');ownedPlayer(id,runId);
  const held={runId,token,cancelled:false,installed:false};recoveries.set(id,held);
  held.work=(async()=>{
   await db.ensureOwner(id);if(held.cancelled)throw fail('recovery_cancelled');
   let release;const promise=new Promise(resolve=>release=resolve);db.permanentWait??=new Map();if(db.permanentWait.has(id))throw fail('recovery_player_busy');
   db.permanentWait.set(id,{promise,release});held.installed=true;await db.freezePlayer(id);return {ok:true,runId,id};
  })();return held.work;
 };
 rpc.handlers.loadlabRecoverResume=async({runId,id,token})=>{
  const held=recoveries.get(id);if(!held||held.token!==token||held.runId!==runId)throw fail('recovery_fence_mismatch');
  held.cancelled=true;await held.work.catch(()=>{});
  const alive=raw(db)('SELECT loadlab_run_id FROM main.players WHERE id=?').get(id)?.loadlab_run_id===runId;
  const enabled=alive&&registry.active(runId);
  if(held.installed&&enabled)await db.applyCommitted([{table:'players',id,keys:[id],owner:id,staticChanged:'loadlab_recovery'},{table:'pve_engagements',id,keys:[id],owner:id}]);
  recoveries.delete(id);if(held.installed){if(enabled)db.drainingPlayers.delete(id);const wait=db.permanentWait.get(id);db.permanentWait.delete(id);wait?.release();}return {ok:true,resumed:enabled};
 };
 return {drains,recoveries};
}
