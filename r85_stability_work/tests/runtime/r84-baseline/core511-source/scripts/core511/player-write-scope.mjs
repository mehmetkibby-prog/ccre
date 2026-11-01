import {writerAuditR533} from './r533-options.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {demand} from './contract.mjs';
import {assertResourceActorFenceR57} from './authority-read-r57.mjs';

// Observe the native statements AND their triggers without changing them.
// TEMP tables never enter CURRENT DB. SQLite rolls these rows back with the
// native savepoint/transaction and restores changes() after each trigger.
// This checks resident player rows; it does not claim to cover all economy,
// monster or account resources, whose existing guards remain required.
export class PlayerWriteScope {
 constructor(authority){this.authority=authority;this.active=false;}
 initialize(sql){
  // Avoid duplicate attempts rather than OR IGNORE: SQLite's outer native
  // UPSERT conflict policy can override a trigger's OR IGNORE clause.
  const mark=ref=>`INSERT INTO kernel511_player_write_set SELECT ${ref}.id WHERE NOT EXISTS(SELECT 1 FROM kernel511_player_write_set WHERE id=${ref}.id);`;
  sql.exec(`CREATE TEMP TABLE kernel511_player_write_enabled(enabled INTEGER NOT NULL);
   INSERT INTO kernel511_player_write_enabled VALUES(0);
   CREATE TEMP TABLE kernel511_player_write_set(id TEXT PRIMARY KEY) WITHOUT ROWID;
   CREATE TEMP TRIGGER kernel511_player_write_insert AFTER INSERT ON main.players
    WHEN (SELECT enabled FROM kernel511_player_write_enabled)=1 ${writerAuditR533?'AND NOT EXISTS(SELECT 1 FROM kernel511_player_write_set WHERE id=NEW.id)':''}
    BEGIN ${mark('NEW')} END;
   CREATE TEMP TRIGGER kernel511_player_write_update AFTER UPDATE ON main.players
    WHEN (SELECT enabled FROM kernel511_player_write_enabled)=1 ${writerAuditR533?'AND (NOT EXISTS(SELECT 1 FROM kernel511_player_write_set WHERE id=OLD.id) OR NOT EXISTS(SELECT 1 FROM kernel511_player_write_set WHERE id=NEW.id))':''}
    BEGIN ${mark('OLD')} ${mark('NEW')} END;
   CREATE TEMP TRIGGER kernel511_player_write_delete AFTER DELETE ON main.players
    WHEN (SELECT enabled FROM kernel511_player_write_enabled)=1 ${writerAuditR533?'AND NOT EXISTS(SELECT 1 FROM kernel511_player_write_set WHERE id=OLD.id)':''}
    BEGIN ${mark('OLD')} END;`);
  this.sql=sql;this.read=prepareCached477(sql,'SELECT id FROM temp.kernel511_player_write_set ORDER BY id');
 }
 ids(){demand(this.active,'player_write_scope_inactive');return this.read.all().map(r=>r.id);}
 run(sql,payload,context,kind,work,{shared=null,afterWriteGuard=null}={}){
  demand(sql===this.sql&&sql.isTransaction&&!this.active,'player_write_scope_transaction');
  const resources=payload.resources??[];demand(Array.isArray(resources)&&resources.every(k=>typeof k==='string'),'player_write_scope_resources');
  const permitted=new Set([context.actor,...resources.filter(k=>k.startsWith('player:')).map(k=>k.slice(7))]);
  if(kind==='dungeon')for(const id of payload.actors??[])permitted.add(id);
  // Validate before native guild return can legitimately advance ownership.
  if(payload.sharedLease){demand(shared,'player_write_shared_authority');shared.assertWrite(sql,payload,context);}
  const fencesR57=!payload.sharedLease?this.authority.resourceFencesR57?.(sql,[...permitted]):null;
  let processCheckedR57=false;
  for(const id of permitted){
   const fence=fencesR57?.get(id),owner=fence?fence.owner:this.authority.owner(id,sql),live=fence?(fence.admission??fence.simulation):this.authority.admission(id,sql)||this.authority.simulation(id,sql);
   if(live){
    demand(owner,'player_write_owner_missing');
    const local=owner.channel===context.peer.channel&&owner.incarnation===context.peer.incarnation;
    demand(local||payload.sharedLease&&shared.allows(id,context.peer,{playerId:context.actor,payload}),'player_write_foreign_owner');
    if(local){if(fence){assertResourceActorFenceR57(this.authority,sql,context.peer,fence,{checkProcess:!processCheckedR57});processCheckedR57=true;}else this.authority.assertSimulated(sql,context.peer,id,owner.epoch,{allowDraining:true});}
   }
  }
  sql.exec('DELETE FROM temp.kernel511_player_write_set;UPDATE temp.kernel511_player_write_enabled SET enabled=1');this.active=true;
  try{
   const result=work();demand(!result?.then,'player_write_scope_synchronous');const ids=this.ids();
   if(kind==='dungeon_entry')for(const entry of result.passiveAdmissions??[]){const owner=this.authority.owner(entry.id,sql),simulation=this.authority.simulation(entry.id,sql);demand(!this.authority.admission(entry.id,sql)&&simulation?.run_id===entry.runId&&simulation.epoch===entry.epoch&&owner?.incarnation===context.peer.incarnation&&owner.channel===context.peer.channel&&owner.epoch===entry.epoch,'player_write_passive_claim');permitted.add(entry.id);}
   for(const id of ids)if(this.authority.admission(id,sql)||this.authority.simulation(id,sql))demand(permitted.has(id),'player_write_unlocked_actor');
   // Offline native rewards are legitimate, but may not race a permanent
   // operation/transfer. Recheck the actual write set, not just caller keys.
   if(afterWriteGuard)demand(afterWriteGuard(sql,ids)===true,'player_write_frozen_scope');else this.authority.commandGuard?.(sql,context.peer,{playerId:context.actor,epoch:context.epoch,operation:kind,payload:{...payload,resources:[...new Set([...resources,...ids.map(id=>'player:'+id)])]}});
   return result;
  }finally{this.active=false;sql.exec('UPDATE temp.kernel511_player_write_enabled SET enabled=0;DELETE FROM temp.kernel511_player_write_set');}
 }
}
