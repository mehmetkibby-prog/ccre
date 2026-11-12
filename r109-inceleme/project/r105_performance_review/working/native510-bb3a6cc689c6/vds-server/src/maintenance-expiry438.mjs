// A maintenance deadline expires only game-presence leases. Account cookies,
// characters, bags, market escrow, rewards and pending durable writes survive.
export function attachMaintenanceExpiry438(runtime,database,{now=Date.now,onError=e=>console.error('maintenance_expiry',e.message)}={}){
 const maintenance=runtime?.maintenance;if(!maintenance)return()=>{};
 let done=0,running=null,closed=false;
 const expire=frame=>{
  if(closed||frame?.phase!=='maintenance'||frame.deadlineMs>now()||done>=frame.revision)return;
  if(running)return running;
  running=Promise.resolve().then(async()=>{
   const applied=await database.atomic(sqlite=>{
    const current=maintenance.policy;
    if(closed||current?.revision!==frame.revision||current.phase!=='maintenance'||current.deadlineMs>now())return false;
    sqlite.prepare('UPDATE game_presence SET expires_at_ms=0 WHERE expires_at_ms>? AND NOT EXISTS (SELECT 1 FROM players p WHERE p.account_id=game_presence.account_id AND p.is_gm=1)').run(now());
    return true;
   });
   if(applied)done=frame.revision;
  }).catch(onError).finally(()=>{running=null;if(!closed&&maintenance.policy?.revision>frame.revision)void expire(maintenance.policy);});
  return running;
 };
 const stop=maintenance.subscribe(expire);void expire(maintenance.policy);
 return()=>{closed=true;stop();};
}
