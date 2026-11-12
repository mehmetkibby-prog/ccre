import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
const fail=code=>Object.assign(Error(code),{code,status:409});
const running=new WeakMap();
export async function recoverLoadLabBot({database,supervisor,registry,runId,playerId,nativeRespawn,reason,now=Date.now,signal}){
 let busy=running.get(database);if(!busy)running.set(database,busy=new Set());if(busy.has(playerId))throw fail('recovery_busy');busy.add(playerId);
 let held=null;
 try{
  const read=()=>{signal?.throwIfAborted();if(!registry.active(runId)||registry.playerRun(playerId)!==runId)throw fail('inactive_owned_bot');const p=database.compiled('SELECT * FROM players WHERE id=?').get(playerId),m=database.compiled("SELECT * FROM loadlab_entities_v1 WHERE id=? AND run_id=? AND kind='player'").get(playerId,runId);if(!p||!m||p.loadlab_run_id!==runId||p.account_id!==m.account_id)throw fail('recovery_ownership_mismatch');return {p,d:JSON.parse(m.descriptor_json)};};
  let {p,d}=read();const wasDead=p.hp<=0;
  if(wasDead){
   if(typeof nativeRespawn!=='function'||!Number.isSafeInteger(p.respawn_at_ms)||p.respawn_at_ms<=0)throw fail('native_respawn_unavailable');
   const wait=p.respawn_at_ms-now();if(wait>60000)throw fail('native_respawn_delay_invalid');if(wait>0)await delay(wait,undefined,{signal});
   ({p,d}=read());if(p.hp<=0){const reply=await nativeRespawn({runId,playerId,signal});if(reply?.status!==200||reply.data?.error)throw fail('native_respawn_rejected');}
  }
  ({p,d}=read());if(p.channel!==d.channel||p.area!==d.area||p.hp<=0)throw fail('recovery_scope_mismatch');
  const state=supervisor.children.get(p.channel);if(!state?.ready)throw fail('recovery_channel_unavailable');
  const token=randomUUID();held={state,token};await state.rpc.request('loadlabRecoverFreeze',{runId,id:playerId,token},{id:'lab-recover-freeze:'+token,timeoutMs:15000});
  const result=await database.atomic(db=>{
   if(!registry.active(runId))throw fail('test_revoked_during_recovery');
   const current=db.prepare('SELECT * FROM players WHERE id=?').get(playerId);if(!current||current.loadlab_run_id!==runId||current.account_id!==p.account_id||current.channel!==d.channel||current.area!==d.area||current.hp<=0)throw fail('recovery_cas_scope_changed');
   // Native respawn already enforced its timer/rules/receipt/durable path.
   // Only this marked bot is translated to its own initial scenario point.
   // Reconnect/unknown-outcome recovery never heals or replays an attack.
   const x=wasDead?d.x:current.x,y=wasDead?d.y:current.y,hp=wasDead?Math.max(1,Math.round(current.max_hp/2)):current.hp;
   const r=db.prepare(`UPDATE players SET x=?,y=?,hp=?,hp_revision=hp_revision+?,respawn_at_ms=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0 WHERE id=? AND loadlab_run_id=? AND hp_revision=? AND position_revision=? RETURNING *`).get(x,y,hp,wasDead?1:0,now(),playerId,runId,current.hp_revision,current.position_revision);
   if(!r)throw fail('recovery_cas_failed');if(wasDead)db.prepare('DELETE FROM pve_engagements WHERE player_id=?').run(playerId);
   return {id:r.id,channel:r.channel,area:r.area,x:r.x,y:r.y,hp:r.hp,hpRevision:r.hp_revision,positionRevision:r.position_revision,realtimeScopeVersion:r.realtime_scope_version,respawnAtMs:r.respawn_at_ms,reason,respawned:wasDead};
  });
  return result;
 }finally{
  try{if(held)await held.state.rpc.request('loadlabRecoverResume',{runId,id:playerId,token:held.token},{id:'lab-recover-resume:'+held.token,timeoutMs:10000});}finally{busy.delete(playerId);}
 }
}
