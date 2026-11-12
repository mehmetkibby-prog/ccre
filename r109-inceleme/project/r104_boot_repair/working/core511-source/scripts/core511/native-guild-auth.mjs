import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {createGuildVillage} from '../../../native510-bb3a6cc689c6/vds-server/src/guild-village.mjs';
import {nativeGuildEjections} from './generated/guild-ejection-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {demand} from './contract.mjs';

// Run the original decision against read-only statements. A repair is needed
// only if that same native code reaches its UPDATE. No duplicate guild policy,
// destination, expiry or HP formula, and no freeze for an unchanged valid hall.
export function nativeGuildRepairNeeded(sql,id,clock=Date.now){
 const needsRepair=Symbol('native guild repair');
 const probe=createGuildVillage({prepare(query){
  if(!/^SELECT\b/i.test(query.trimStart()))throw needsRepair;
  const statement=sql.prepare(query);return {get:(...args)=>statement.get(...args),all:(...args)=>statement.all(...args)};
 }},{now:clock});
 try{const value=probe.repair(id);demand(value===null,'native_guild_probe_changed');return false;}catch(error){if(error===needsRepair)return true;throw error;}
}

// Native validateGameSession calls this after its original account, realm,
// presence and bot guards. Only this cold side effect joins the owner's gate;
// ordinary coordinator serialization never becomes generally reentrant.
export class NativeGuildAuth {
 #context=new AsyncLocalStorage();
 #cold=new AsyncLocalStorage();
 #pending=new WeakMap();
 constructor(core){this.core=core;}
 inCoordinator(operation){
  const scope={active:true};return this.#context.run(scope,async()=>{try{return await operation();}finally{scope.active=false;}});
 }
 assertBound(){const c=this.core;demand(c.database.core511GuildAuth===this&&!c.closed,'native_guild_auth_binding');return c;}
 assertCold(scope){
  const c=this.assertBound(),{owner,row}=scope,current=c.authority.owner(owner.player_id);
  demand(scope.active&&this.#context.getStore()?.active&&row===c.channelSupervisor.rows.get(owner.channel)&&row.ready&&row.state==='booting'&&!row.exited&&row.recovered===undefined&&row.peer.incarnation===owner.incarnation&&current?.incarnation===owner.incarnation&&current.epoch===owner.epoch&&current.sequence===0&&current.state==='active'&&!c.sessions.has(owner.player_id)&&!c.transitions.has(owner.player_id)&&!c.permanent.entries.has(owner.player_id),'native_guild_auth_cold_scope');
 }
 beforeAdmission(owner,operation){
  const scope={owner:{...owner},recoveryOwner:owner,row:this.core.channelSupervisor.rows.get(owner.channel),active:true};this.assertCold(scope);
  return this.#cold.run(scope,async()=>{try{return await operation();}finally{scope.active=false;}});
 }
 coldOwner(id){const scope=this.#cold.getStore();if(!scope?.active||scope.owner.player_id!==id)return null;this.assertCold(scope);return scope;}
 repair(service,id){
  const c=this.assertBound();if(!service)return undefined;
  demand(service===c.guild&&typeof service.repair==='function'&&typeof id==='string'&&id.length>0&&id.length<=160,'native_guild_auth_scope');
  const operation=async()=>{
   this.assertBound();demand(!c.transitions.has(id),'transition_actor_fenced');
   if(!nativeGuildRepairNeeded(c.database.sqlite,id,c.clock))return null;
   const commit=()=>c.database.atomic(sql=>{
    // Accepted input has drained. Re-run the original decision against the
    // latest durable player, then commit its native event in the same WAL tx.
    const repair=service.repair(id);if(!repair)return {repair:null};
    demand(repair.playerId===id,'native_guild_auth_result');
    const events=[];nativeGuildEjections([repair],{db:()=>nativeAtomicStatements(sql),publishRealtimeRoomEvent:(...args)=>events.push(args),now:c.clock});
    return c.writer.notifications.append(sql,{realm:c.realmId,key:randomUUID()},{repair,events});
   });
   const cold=this.#cold.getStore();let result;
   if(cold?.active&&cold.owner.player_id===id){
    // A new child has no actor yet. Its old incarnation has already exited and
    // ownership was durably registered under a fresh epoch. Freezing this
    // absent actor would fail and cause an endless recovery/restart loop.
    // Auth repair must finish durably BEFORE the first current-DB admission.
    try{this.assertCold(cold);result=await commit();await c.writer.durableExternal();this.assertCold(cold);}
    catch(cause){throw Object.assign(new Error('native_guild_auth_cold_uncertain',{cause}),{code:'native_guild_auth_cold_uncertain'});}
   }else result=await c.permanent.durablePlayers([id],commit);
   if(result.repair)this.#pending.set(result.repair,result.notificationActors);
   return result.repair;
  };
  return this.#context.getStore()?.active?operation():c.serial(operation);
 }
 publish(events){
  const c=this.assertBound();demand(Array.isArray(events)&&events.length===1&&this.#pending.has(events[0]),'native_guild_auth_publish');
  const ids=this.#pending.get(events[0]);this.#pending.delete(events[0]);c.notify(ids);
 }
}
