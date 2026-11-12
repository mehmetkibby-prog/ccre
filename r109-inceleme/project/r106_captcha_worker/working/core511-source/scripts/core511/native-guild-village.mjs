import {castleEnabled} from './castle-model-r59.mjs';
import {randomUUID} from 'node:crypto';
import {createGuildVillage} from '../../../native510-bb3a6cc689c6/vds-server/src/guild-village.mjs';
import {serviceTransactionDatabase} from './service-transaction.mjs';
import {nativeGuildEjections} from './generated/guild-ejection-rules.mjs';
import {createNativeGuildMembership} from './generated/native-guild-membership.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {demand} from './contract.mjs';
import {captureReturnOwners,reconcileReturnOwners} from './guild-war.mjs';

// Original authorized revoke, membership removal and admin settings enter here. Native repairAll
// can move unrelated expired/offline guests too, so it requires the existing
// all-owner drain, not a lock on the requesting leader or the named guest alone.
export class NativeGuildVillage {
 constructor(core){
  this.core=core;
  this.service=createGuildVillage(serviceTransactionDatabase(core.database.sqlite),{now:core.clock,dungeonLocked:id=>globalThis.__colDungeon?.locked(id)??false});
  this.membershipRules=createNativeGuildMembership({clock:core.clock});
 }
 assertBound(service){const c=this.core;demand(!c.closed&&c.database.core511GuildVillage===this&&service===c.guild,'native_guild_village_binding');return c;}
 async revoke(service,id,body){
  this.assertBound(service);
  demand(typeof id==='string'&&id.length>0&&id.length<=160&&body&&body.action==='revoke','native_guild_revoke_scope');
  return this.#run(service,[id],()=>this.service.act(id,body));
 }
 async configure(service,enabled,revision){
  this.assertBound(service);
  return this.#run(service,[],()=>this.service.save(enabled,revision));
 }
 async membership(service,id,body){
  const c=this.assertBound(service);
  demand(typeof id==='string'&&id.length>0&&id.length<=160&&body&&['create','invite','accept','decline','leave','disband','kick','permission','transfer','tax','withdraw','challenge','war_decline','war_accept','war_join'].includes(body.action),'native_guild_membership_scope');
  const db=nativeAtomicStatements(c.database.sqlite),rules=this.membershipRules;
  return this.#run(service,[id],()=>rules.guildAction(db,id,body),(result,events)=>rules.guildChanged(db,id,body,result,(cycle,players,event)=>rules.captureGuildEvent(cycle,players,event,(...args)=>events.push(args))),['leave','kick','disband'].includes(body.action),['war_accept','war_join'].includes(body.action));
 }
 async #run(service,ids,operation,afterRepair=null,repair=true,moveOwners=false){
  const c=this.assertBound(service);
  const run=moveOwners?callback=>c.nativeConfiguration.runGuild(this,ids,callback):callback=>c.nativeConfiguration.run(ids,callback);
  const settled=await run(()=>{
   this.assertBound(service);const sql=c.database.sqlite;demand(!sql.isTransaction,'native_guild_revoke_transaction');
   // The service's original BEGIN/COMMIT is a savepoint. Its native mutation,
   // all repairs and original room/private notices share the outer COMMIT.
   sql.exec('BEGIN IMMEDIATE');
   try{
    // Frozen channels already flushed authenticated pongs. Native invitation
    // guards must see that same liveness even when idle actors had no dirty
    // gameplay checkpoint. Reuse the guarded writer mirror in this COMMIT.
    const stamps=c.writer.presence.materialize(sql);
    const owners=moveOwners?captureReturnOwners(sql):null;
    const result=operation(),repairs=repair?this.service.repairAll():[],events=[];if(castleEnabled())c.writer.services.castle.repairGuildless();
    const moves=moveOwners?reconcileReturnOwners(sql,owners,c.clock(),{authority:c.authority}):[];
    nativeGuildEjections(repairs,{db:()=>nativeAtomicStatements(sql),publishRealtimeRoomEvent:(...args)=>events.push(args),now:c.clock});
    afterRepair?.(result,events);
    const key=randomUUID(),actors=new Set();
    // Native repairAll has no online-player limit. Preserve all offline repairs
    // while keeping each outbox append within its existing bounded batch size.
    for(let offset=0;offset<events.length;offset+=512){const out=c.writer.notifications.append(sql,{realm:c.realmId,key:key+':'+offset},{events:events.slice(offset,offset+512)});for(const actor of out.notificationActors)actors.add(actor);}
    sql.exec('COMMIT');return {result,actors:[...actors],stamps,moves};
   }catch(error){if(sql.isTransaction)sql.exec('ROLLBACK');throw error;}
  });
  // Configuration.run returns only after durability and every owner refresh.
  // Unknown outcomes retain the existing all-owner recovery; never rerun here.
  c.writer.presence.acknowledged(settled.stamps);c.notify(settled.actors);return settled.result;
 }
}
