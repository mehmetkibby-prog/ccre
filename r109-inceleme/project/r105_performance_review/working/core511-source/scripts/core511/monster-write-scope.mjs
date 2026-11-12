import {readResourceMonstersR56} from './resource-reads-r56.mjs';
import {demand} from './contract.mjs';
import {localMonsterMismatch} from './local-write-rejection.mjs';

// Native attack replies list hits, not newly spawned Sinsi children. Carry
// every additional written row in the private durable state result so the
// existing ACK path can hydrate its owner, projection and checkpoint base.
// The original public result, events, spawn SQL and timing are unchanged.
export function includeWrittenMonsters(sql,result,ids){
 const known=new Set((result.monsters??[]).map(m=>m.id)),extra=ids.filter(id=>!known.has(id)).map(id=>sql.prepare('SELECT * FROM monsters WHERE id=?').get(id)).filter(Boolean);
 if(!extra.length)return result;
 const participants=extra.flatMap(m=>sql.prepare('SELECT monster_id,spawn_round,player_id,created_at,stone_damage476,stone_first_hit_at_ms476 FROM monster_participants WHERE monster_id=? AND spawn_round=?').all(m.id,m.spawn_round));
 const bosses=extra.filter(m=>m.is_boss).flatMap(m=>sql.prepare('SELECT boss_round,player_id,hit_count,total_damage,created_at FROM boss_participants WHERE boss_round=?').all(m.spawn_round));
 const bossParticipants=[...new Map([...(result.bossParticipants??[]),...bosses].map(p=>[JSON.stringify([p.boss_round,p.player_id]),p])).values()];
 return {...result,monsters:[...(result.monsters??[]),...extra],participants:[...(result.participants??[]),...participants],bossParticipants};
}

// Audit actual native combat monster-row writes, including trigger writes.
// TEMP state follows SQLite savepoint rollback and never changes CURRENT DB.
// Other game tables/modes keep their separate required resource authorities.
export class MonsterWriteScope {
 constructor(){this.active=false;}
 initialize(sql){
  sql.exec(`CREATE TEMP TABLE kernel511_monster_write_enabled(enabled INTEGER NOT NULL);
   INSERT INTO kernel511_monster_write_enabled VALUES(0);
   CREATE TEMP TABLE kernel511_monster_write_set(id TEXT,channel INTEGER,area TEXT,spawn_round INTEGER,is_boss INTEGER,is_stone INTEGER,summoned INTEGER,parent_stone_id TEXT,kind TEXT);
   CREATE TEMP TRIGGER kernel511_monster_write_existing BEFORE INSERT ON main.monsters
    WHEN (SELECT enabled FROM kernel511_monster_write_enabled)=1
    BEGIN INSERT INTO kernel511_monster_write_set SELECT id,channel,area,spawn_round,is_boss,is_stone,summoned,parent_stone_id,'existing' FROM monsters WHERE id=NEW.id; END;
   CREATE TEMP TRIGGER kernel511_monster_write_insert AFTER INSERT ON main.monsters
    WHEN (SELECT enabled FROM kernel511_monster_write_enabled)=1
    BEGIN INSERT INTO kernel511_monster_write_set VALUES(NEW.id,NEW.channel,NEW.area,NEW.spawn_round,NEW.is_boss,NEW.is_stone,NEW.summoned,NEW.parent_stone_id,'insert'); END;
   CREATE TEMP TRIGGER kernel511_monster_write_update AFTER UPDATE ON main.monsters
    WHEN (SELECT enabled FROM kernel511_monster_write_enabled)=1
    BEGIN
     INSERT INTO kernel511_monster_write_set VALUES(OLD.id,OLD.channel,OLD.area,OLD.spawn_round,OLD.is_boss,OLD.is_stone,OLD.summoned,OLD.parent_stone_id,'old');
     INSERT INTO kernel511_monster_write_set VALUES(NEW.id,NEW.channel,NEW.area,NEW.spawn_round,NEW.is_boss,NEW.is_stone,NEW.summoned,NEW.parent_stone_id,'new');
    END;
   CREATE TEMP TRIGGER kernel511_monster_write_delete AFTER DELETE ON main.monsters
    WHEN (SELECT enabled FROM kernel511_monster_write_enabled)=1
    BEGIN INSERT INTO kernel511_monster_write_set VALUES(OLD.id,OLD.channel,OLD.area,OLD.spawn_round,OLD.is_boss,OLD.is_stone,OLD.summoned,OLD.parent_stone_id,'old'); END;`);
  this.sql=sql;this.read=sql.prepare('SELECT * FROM temp.kernel511_monster_write_set ORDER BY rowid');
  this.monster=sql.prepare('SELECT id,channel,area,spawn_round,is_boss,is_stone,summoned,parent_stone_id FROM monsters WHERE id=?');
 }
 ids(){demand(this.active,'monster_write_scope_inactive');return [...new Set(this.read.all().filter(r=>r.kind!=='existing').map(r=>r.id))].sort();}
 run(sql,payload,context,work,{shared=null,readOnly=false}={}){
  demand(sql===this.sql&&sql.isTransaction&&!this.active,'monster_write_scope_transaction');
  const resources=payload.resources??[];demand(Array.isArray(resources)&&resources.every(k=>typeof k==='string'),'monster_write_scope_resources');
  const held=new Set(resources),before=new Map(),monstersR56=readOnly?null:readResourceMonstersR56(sql,[...held].filter(k=>k.startsWith('monster:')).map(k=>k.slice(8)),'scope');if(!readOnly)for(const key of held)if(key.startsWith('monster:')){const row=monstersR56?monstersR56.get(key.slice(8)):this.monster.get(key.slice(8));if(row)before.set(row.id,row);}
  if(payload.sharedLease){demand(shared,'monster_write_shared_authority');shared.assertWrite(sql,payload,context);}
  sql.exec('DELETE FROM temp.kernel511_monster_write_set;UPDATE temp.kernel511_monster_write_enabled SET enabled=1');this.active=true;
  try{
   const result=work();demand(!result?.then,'monster_write_scope_synchronous');const rows=this.read.all();demand(!readOnly||rows.length===0,'potion_monster_write_forbidden');const inserted=new Set(rows.filter(r=>r.kind==='insert').map(r=>r.id)),created=new Map();
   for(const row of rows){
    if(row.kind==='existing'&&(!inserted.has(row.id)||created.has(row.id)))continue;
    const original=before.get(row.id),fresh=created.get(row.id)??(row.kind==='insert'?row:null),parent=before.get(fresh?.parent_stone_id);
    // Native Sinsi wave IDs are created while their existing stone is held.
    // A new child has no prior resident/lease. It must remain in that exact
    // stone life and scope; an existing-ID collision cannot use this rule.
    const child=row.kind!=='existing'&&fresh&&parent?.is_stone===1&&parent.area==='sinsi'&&row.parent_stone_id===parent.id&&row.area===parent.area&&row.channel===parent.channel&&row.spawn_round===parent.spawn_round&&row.summoned===1&&row.is_boss===0&&row.is_stone===0;
    if(!(held.has('monster:'+row.id)&&original||child)){
     const retry=localMonsterMismatch(payload);if(retry)throw retry;
     demand(false,'monster_write_unlocked');
    }
    demand(row.channel===context.peer.channel||row.channel===0&&payload.sharedLease&&shared,'monster_write_foreign_owner');
    if(original)demand(row.channel===original.channel&&row.area===original.area&&row.spawn_round===original.spawn_round,'monster_write_scope_changed');
    if(row.kind==='insert'&&!original)created.set(row.id,fresh);
   }
   return result;
  }finally{this.active=false;sql.exec('UPDATE temp.kernel511_monster_write_enabled SET enabled=0;DELETE FROM temp.kernel511_monster_write_set');}
 }
}
