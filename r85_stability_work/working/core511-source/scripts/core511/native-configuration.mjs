import {randomUUID} from 'node:crypto';
import {demand} from './contract.mjs';
import {captureReturnSessions,rehomeWorldActors} from './global-return.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {ADMIN_SETTINGS_R65} from './admin-settings-r65.mjs';
const adminSettingsPermitR65=Symbol('native-admin-settings');

// Private database-bound adapter for original authorized admin callbacks.
// Their native transactions and synchronous error semantics remain intact.
// The actor list can be empty or contain many offline accounts; every actual
// simulation owner is frozen regardless, because configuration is global.
export class NativeConfiguration {
 constructor(core){this.core=core;this.tail=Promise.resolve();}
 saveRuneV2(service,config,revision){
  demand(this.core.database.core511Configuration===this&&typeof service?.save==='function','configuration_rune_binding');
  return this.run([],()=>service.save(config,revision));
 }
 run(ids,operation){
  return this.#queue(ids,operation,null);
 }
 runAdminSettingsR65(action,operation,reauthorize){
  demand(this.core.database.core511Configuration===this&&ADMIN_SETTINGS_R65.includes(action)&&typeof operation==='function'&&typeof reauthorize==='function','configuration_admin_settings_binding');
  const task=this.tail.then(()=>this.pauseAndRun(operation,null,null,reauthorize,adminSettingsPermitR65));this.tail=task.catch(()=>{});return task;
 }
 runGuild(adapter,ids,operation){
  demand(adapter&&adapter===this.core.nativeGuildVillage&&this.core.database.core511GuildVillage===adapter,'configuration_guild_binding');
  return this.#queue(ids,operation,adapter);
 }
 runGm(adapter,operation,prepare){
  demand(adapter&&adapter===this.core.nativeGm&&this.core.database.core511Gm===adapter&&typeof operation==='function'&&typeof prepare==='function','configuration_gm_binding');
  const task=this.tail.then(()=>this.pauseAndRun(operation,null,adapter,prepare));this.tail=task.catch(()=>{});return task;
 }
 #queue(ids,operation,guild){
  demand(Array.isArray(ids)&&ids.every(id=>typeof id==='string'&&id.length>0&&id.length<=160),'configuration_actor_set');
  demand(typeof operation==='function'&&operation.constructor.name!=='AsyncFunction','configuration_operation_must_be_synchronous');
  const task=this.tail.then(()=>this.pauseAndRun(operation,guild));this.tail=task.catch(()=>{});return task;
 }
 async pauseAndRun(operation,guild=null,gm=null,prepare=null,adminSettings=null){
  const c=this.core,w=c.sharedWorld,g=c.globalWorld,channels=c.channelSupervisor,row=w?.row;
  if(guild)demand(guild===c.nativeGuildVillage&&c.database.core511GuildVillage===guild,'configuration_guild_binding');
  if(gm)demand(!guild&&gm===c.nativeGm&&c.database.core511Gm===gm,'configuration_gm_binding');
  demand(!c.closed&&!c.stopping&&w&&g&&channels&&!w.closing&&!channels.closing&&row?.state==='running'&&!row.exited,'configuration_host_unavailable');
  // A world job may itself need all three coordinator queues. Drain it before
  // taking those queues, never wait for it while owning its parent barrier.
  const paused=await w.stopJobs();demand(w.row===row&&!row.exited&&typeof paused?.enabled==='boolean','configuration_world_changed');
  try{const result=await channels.serial(()=>w.serial(()=>c.serial(()=>this.execute(operation,row,guild,gm,prepare,adminSettings))));return result;}
  finally{if(!g.held&&!g.recovery&&!c.recoveringWorld&&!c.stopping&&!channels.closing&&!w.closing&&w.row===row&&!row.exited&&paused.enabled)await w.startJobs();}
 }
 async execute(operation,world,guild=null,gm=null,prepare=null,adminSettings=null){
  const c=this.core,g=c.globalWorld,w=c.sharedWorld,sql=c.database.sqlite;
  // Native authorization may retire a revoked session. Let that exact cold
  // path complete before acquiring the global freeze, in the same queue.
  if(gm){demand(gm===c.nativeGm&&c.database.core511Gm===gm&&typeof prepare==='function','configuration_gm_binding');await prepare();}
  if(adminSettings===adminSettingsPermitR65){demand(!gm&&!guild&&typeof prepare==='function','configuration_admin_settings_scope');await prepare();}
  demand(!g.held&&!g.preparing&&!c.recoveringWorld&&w.row===world&&!world.exited,'configuration_barrier_busy');
  const token=randomUUID(),cycle=c.writer.worldState.current.world.cycle,channels=[1,2,3,4].map(channel=>{const r=c.processes.get(channel);demand(r?.online&&c.channelSupervisor.rows.get(channel)?.state==='running','configuration_channel_unavailable');return {peer:r.peer,control:r.control};}),h={token,cycle,peer:world.peer,mode:'configuration',phase:'freezing',channels};
  g.held=h;let value,rejected=null;
  try{
   await g.freezeChannels(h);await w.combat.idle();
   await Promise.all(channels.map(async r=>{r.ack=await r.control.request('global_snapshot',{token});}));h.phase='draining_world';
   const drained=await world.control.request('configuration_freeze',{token,cycle}),owner=c.writer.system.owner('world');
   demand(drained?.token===token&&drained.cycle===cycle&&drained.frozen&&drained.incarnation===world.peer.incarnation&&drained.epoch===owner.epoch&&drained.sequence===owner.sequence,'configuration_world_drain_ack');
   h.phase='frozen';g.assertFrozen(sql,{token,cycle},{peer:world.peer});demand(!sql.isTransaction,'configuration_native_transaction');
   const sessions=guild?captureReturnSessions(c):null;
   try{value=gm||adminSettings===adminSettingsPermitR65?await operation():operation();}catch(error){rejected={error};}
   demand(!value?.then&&!sql.isTransaction,'configuration_operation_must_be_synchronous');
   await c.writer.durableExternal();c.writer.services.refresh();
   if(guild&&!rejected){
    // Only the database-bound native guild adapter may change owner epochs.
    // Its native movement and ownership already share the durable COMMIT.
    // Every old resident is exported before any target is admitted, and the
    // new frozen snapshots must prove the resulting exact owner set again.
    demand(guild===c.nativeGuildVillage&&c.database.core511GuildVillage===guild&&Array.isArray(value?.moves),'configuration_guild_result');
    await rehomeWorldActors(c,h,value.moves,sessions);
    if(value.moves.length)await Promise.all(channels.map(async r=>{r.ack=await r.control.request('global_snapshot',{token});}));
   }
   const point=c.writer.worldState.current;demand(point.world.cycle===cycle,'configuration_cycle_changed');g.assertFrozen(sql,{token,cycle},{peer:world.peer});
   demand(!sql.prepare(`SELECT 1 FROM kernel511_channel_owners o LEFT JOIN players p ON p.id=o.player_id WHERE (EXISTS(SELECT 1 FROM kernel511_admissions a WHERE a.player_id=o.player_id) OR EXISTS(SELECT 1 FROM kernel511_simulations s WHERE s.player_id=o.player_id)) AND (p.id IS NULL OR p.channel!=o.channel) LIMIT 1`).get(),'configuration_owner_changed');
   h.phase='refreshing';await Promise.all(channels.map(async r=>{const ack=await r.control.request('global_refresh',{token,worldPoint:point,configuration:true});demand(ack?.token===token&&ack.cycle===cycle&&ack.refreshed,'configuration_channel_refresh_ack');}));
   const snapshot=(await c.reader.query('kernel511_world_boot',[world.peer.incarnation,owner.epoch])).rows,refreshed=await world.control.request('configuration_refresh',{token,snapshot});demand(refreshed?.token===token&&refreshed.cycle===cycle&&refreshed.refreshed,'configuration_world_refresh_ack');
   // Every image is now durable/refreshed. A resumed owner may immediately
   // accept new work while the remaining resume acknowledgements arrive.
   g.beginResume(h);const resumed=await world.control.request('configuration_resume',{token});demand(resumed?.token===token&&resumed.cycle===cycle&&resumed.resumed,'configuration_world_resume_ack');
   await Promise.all(channels.map(async r=>{const ack=await r.control.request('global_resume',{token});demand(ack?.token===token&&ack.cycle===cycle&&ack.resumed,'configuration_channel_resume_ack');}));
   g.finishResume(h);await Promise.all([...channels.map(r=>c.process(r.peer).worldDelivery.flush()),world.worldDelivery.flush()]);
  }catch(error){if(actorFaultIsolation&&h.phase==='aborted'&&g.held!==h)throw error;h.phase='unknown';g.held=h;g.lastFailure=error;c.onFault({error,configuration:true});g.recover({error,configuration:true});throw error;}
  if(rejected)throw rejected.error;return value;
 }
}
