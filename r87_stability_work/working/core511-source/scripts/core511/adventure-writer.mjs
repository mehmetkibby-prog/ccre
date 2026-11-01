import {demand,validChannel} from './contract.mjs';
export function createAdventureHandler({services,authority,clock=Date.now}){
 return (sql,payload,context)=>{
  demand(sql.isTransaction&&validChannel(context.peer.channel)&&Number.isSafeInteger(payload?.nowMs)&&payload.nowMs<=clock()+5000&&Array.isArray(payload.actors)&&payload.actors.length<=25,'adventure_writer_scope');
  const ids=new Set();for(const actor of payload.actors){demand(!ids.has(actor.id),'adventure_actor_duplicate');ids.add(actor.id);const owner=authority.assertSimulated(sql,context.peer,actor.id,actor.epoch,{allowDraining:true});demand(owner.sequence===actor.sequence,'adventure_actor_sequence');}
  return services.run(payload,()=>{
   const service=services.globals.__colAdventure;
   if(payload.scheduleId){const row=sql.prepare('SELECT * FROM adventure_schedule WHERE id=?').get(payload.scheduleId);demand(!ids.size&&(!row||row.channel===context.peer.channel),'adventure_schedule_scope');const portal=row?service.scheduleStep(row.id):null;return {run:portal?service.run(portal.run_id):null,players:[],monsters:[],portals:portal?[portal]:[],schedulePending:!!row&&!portal&&!row.done_ms};}
   let run=service.run(payload.runId);demand(run?.channel===context.peer.channel,'adventure_run_scope');
   // A durable leave can retire membership before a queued objective check.
   // Epoch/sequence authority above remains mandatory; a stale map task is benign.
   if([...ids].some(id=>service.membership(id)?.run_id!==run.id))return {run,players:[...ids].map(id=>service.player(id)),monsters:[],portals:[],stale:true};
   // Offline members are not mutated by another process. Their own admission
   // will immediately apply expiry/death when they reconnect.
   if(run.revision===payload.revision){if(payload.cancel){run.state.hazard=null;service.save(run);}else service.step(run.id,ids);}
   run=service.run(run.id);const monsters=sql.prepare('SELECT m.* FROM monsters m JOIN adventure_monsters a ON a.id=m.id WHERE a.run_id=? AND m.area=?').all(run.id,run.area);
   return {run,mistLoot:service.loot.snapshot(run.id),players:[...ids].map(id=>service.player(id)),monsters,profiles:monsters.map(m=>[m.id,service.profile(m)]),portals:sql.prepare('SELECT * FROM adventure_portals WHERE run_id=?').all(run.id)};
  });
 };
}
