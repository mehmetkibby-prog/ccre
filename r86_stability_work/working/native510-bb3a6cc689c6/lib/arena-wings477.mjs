// V479 converts legacy zero-expiry owners once, before serving gameplay.
// The database remains authoritative; no hot-path timer or cached player state.
export const ARENA_WINGS_DURATION_MS477=5*86400000;
export const arenaWingsOwned477=(p,now=Date.now())=>p?.arena_wings_owned===1&&(!(p.arena_wings_expires_at_ms>0)||p.arena_wings_expires_at_ms>now);
export const arenaWingsActive477=(p,now=Date.now())=>p?.arena_wings_equipped===1&&(!(p.arena_wings_expires_at_ms>0)||p.arena_wings_expires_at_ms>now);
// Call only inside the caller's existing durable purchase/quest/pass transaction.
// Replaying a receipt never reaches this mutation. One award adds five days;
// V479 has no new permanent grants; legacy rights get the one-time migration.
export function grantArenaWings477(db,id,now){
 if(!db.isTransaction)throw Error('Arena kanat ödülü atomik işlem gerektirir.');
 if(!Number.isSafeInteger(now)||now<0||now>Number.MAX_SAFE_INTEGER-ARENA_WINGS_DURATION_MS477)throw Error('Arena kanat süresi geçersiz.');
 const changed=db.prepare(`UPDATE players SET arena_wings_owned=1,
  arena_wings_equipped=CASE WHEN arena_wings_owned=1 AND (arena_wings_expires_at_ms=0 OR arena_wings_expires_at_ms>?) THEN arena_wings_equipped ELSE 0 END,
  arena_wings_expires_at_ms=MAX(?,arena_wings_expires_at_ms)+?
  WHERE id=? AND arena_wings_expires_at_ms<=?`).run(now,now,ARENA_WINGS_DURATION_MS477,id,Number.MAX_SAFE_INTEGER-ARENA_WINGS_DURATION_MS477);
 if(changed.changes!==1)throw Error('Arena kanat süresi güncellenemedi.');
 return changed;
}

// Dungeon appearances are cached with the room. Project only this timed bonus;
// no database read, timer, HP change or mutation of the saved appearance occurs.
export function projectArenaWingAppearance477(appearance,active,expiresAt,now){
 const show=active===true&&(!(expiresAt>0)||expiresAt>now);
 if(!appearance?.rank||Boolean(appearance.rank.arenaWings)===show)return appearance;
 const before=appearance.rank.arenaWings===true;
 return {...appearance,rank:{...appearance.rank,arenaWings:show},...(appearance.premiumBuff?{premiumBuff:{...appearance.premiumBuff,attack:Math.max(0,(Number(appearance.premiumBuff.attack)||0)+(show?10:0)-(before?10:0))}}:{})};
}

const rollbackSchema477=`CREATE TABLE IF NOT EXISTS arena_wing_rollback477(player_id TEXT PRIMARY KEY,expires_at_ms INTEGER NOT NULL)`;
// This compatibility trigger deliberately references only players. V476's
// native planning workspace copies player triggers but not new marker tables.
// Reset/new-permanent-grant clears expiry; a stale marker then cannot match.
const rollbackTrigger477=`CREATE TRIGGER IF NOT EXISTS arena_wing_rollback_write477 AFTER UPDATE OF arena_wings_owned ON players
  WHEN NEW.arena_wings_expires_at_ms>0 BEGIN
   UPDATE players SET arena_wings_expires_at_ms=0 WHERE id=NEW.id;
  END`;
const normalizedTrigger477=sql=>String(sql).replace(/\s+/g,' ').trim().replace(/;$/,'').replace(/^CREATE TRIGGER IF NOT EXISTS /,'CREATE TRIGGER ');
function timedDungeonRollback477(db,markerExists){
 // Include expired/unequipped timed owners: a checkpoint can predate cleanup.
 const ids=new Set(db.prepare('SELECT id FROM players WHERE arena_wings_expires_at_ms>0').all().map(row=>row.id));
 if(!ids.size)return [];
 const changes=[];
 for(const row of db.prepare("SELECT id,state,updated_at FROM dungeon_runs WHERE status IN ('ready','active','portal','wipe','complete')").all()){
  const run=JSON.parse(row.state);if(!Array.isArray(run?.members))throw Error('Zindan kanat geri dönüş durumu geçersiz.');let changed=false;
  for(const member of run.members){if(!member||typeof member.id!=='string')throw Error('Zindan kanat üyesi geçersiz.');if(!ids.has(member.id))continue;if(member.stats!=null&&(typeof member.stats!=='object'||Array.isArray(member.stats)))throw Error('Zindan kanat savaş kaydı geçersiz.');if(member.stats)member.stats={...member.stats,combatRevision:0,arenaWingsActive477:false};member.appearance=projectArenaWingAppearance477(member.appearance,false,0,0);changed=true;}
  if(changed)changes.push({id:row.id,before:row.state,state:JSON.stringify(run)});
 }
 return changes;
}
export function preflightArenaWingsRollback477(db){
 const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(row=>row.name));
 for(const column of ['arena_wings_owned','arena_wings_equipped'])if(!columns.has(column))throw Error('Arena kanat geri dönüş şeması eksik: '+column);
 const markerExists=!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='arena_wing_rollback477'").get();
 const trigger=db.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND name='arena_wing_rollback_write477'").get();
 if(trigger&&normalizedTrigger477(trigger.sql)!==normalizedTrigger477(rollbackTrigger477))throw Error('Arena kanat geri dönüş tetikleyicisi beklenen şemayla uyuşmuyor.');
 if(!columns.has('arena_wings_expires_at_ms')){if(markerExists||trigger)throw Error('Arena kanat geri dönüş işareti süre şemasıyla uyuşmuyor.');return false;}
 if(db.prepare('SELECT 1 FROM players WHERE arena_wings_expires_at_ms<0 OR arena_wings_expires_at_ms>9007199254740991 OR typeof(arena_wings_expires_at_ms)!=\'integer\' LIMIT 1').get())throw Error('Arena kanat süre kaydı geçersiz.');
 if(markerExists){const markers=db.prepare('PRAGMA table_info(arena_wing_rollback477)').all(),owner=markers.find(row=>row.name==='player_id'),expiry=markers.find(row=>row.name==='expires_at_ms');if(markers.length!==2||owner?.type.toUpperCase()!=='TEXT'||owner.pk!==1||expiry?.type.toUpperCase()!=='INTEGER'||expiry.pk!==0||expiry.notnull!==1)throw Error('Arena kanat geri dönüş işareti şeması geçersiz.');if(db.prepare("SELECT 1 FROM arena_wing_rollback477 WHERE typeof(player_id)!='text' OR length(player_id)=0 OR expires_at_ms<=0 OR expires_at_ms>9007199254740991 OR typeof(expires_at_ms)!='integer' LIMIT 1").get())throw Error('Arena kanat geri dönüş işareti süresi geçersiz.');}
 timedDungeonRollback477(db,markerExists);
 return true;
}
export const assertArenaWingsRollbackReady477=preflightArenaWingsRollback477;
// Called by the manager only with all services stopped and inside its FULL
// transaction. V476 cannot enforce the new deadline, so hide timed rights there.
export function hideArenaWingsForRollback477(db,now=Date.now()){
 if(!db.isTransaction)throw Error('Arena kanat geri dönüşü atomik işlem gerektirir.');
 if(!preflightArenaWingsRollback477(db))return false;db.exec(rollbackSchema477);
 if(!Number.isSafeInteger(now)||now<0)throw Error('Arena kanat geri dönüş saati geçersiz.');
 const dungeonChanges=timedDungeonRollback477(db,true);
 for(const room of dungeonChanges)if(db.prepare('UPDATE dungeon_runs SET state=?,updated_at=? WHERE id=? AND state=?').run(room.state,now,room.id,room.before).changes!==1)throw Error('Zindan kanat geri dönüş kaydı değişti.');
 db.exec(`INSERT INTO arena_wing_rollback477(player_id,expires_at_ms)
  SELECT id,arena_wings_expires_at_ms FROM players WHERE arena_wings_owned=1 AND arena_wings_expires_at_ms>0
  ON CONFLICT(player_id) DO UPDATE SET expires_at_ms=excluded.expires_at_ms;
  UPDATE players SET arena_wings_owned=0,arena_wings_equipped=0 WHERE arena_wings_expires_at_ms>0 AND (arena_wings_owned!=0 OR arena_wings_equipped!=0);`);
 db.exec(rollbackTrigger477);
 return true;
}
// An intentional reset under V476 writes owned=0 even if already zero; the
// compatibility trigger zeros its deadline, invalidating the marker. V476 grants were
// sold as permanent, so the same trigger makes their expiry zero. Nothing else
// revives a right. On re-upgrade resume marked, unchanged, unexpired rights only.
export function resumeArenaWings477(db,now){
 if(!db.isTransaction)throw Error('Arena kanat yükseltmesi atomik işlem gerektirir.');
 if(!Number.isSafeInteger(now)||now<0)throw Error('Arena kanat saati geçersiz.');
 preflightArenaWingsRollback477(db);
 db.exec(rollbackSchema477);
 db.exec('DROP TRIGGER IF EXISTS arena_wing_rollback_write477');
 db.prepare(`UPDATE players SET arena_wings_owned=1,arena_wings_equipped=0
  WHERE arena_wings_owned=0 AND arena_wings_expires_at_ms>?
   AND EXISTS(SELECT 1 FROM arena_wing_rollback477 marker WHERE marker.player_id=players.id AND marker.expires_at_ms=players.arena_wings_expires_at_ms)`).run(now);
 db.exec('DELETE FROM arena_wing_rollback477');
}

// Called by ensureArenaMarketSchema, after V477 rollback resumption, before
// gameplay workers start, inside the caller's existing durable transaction.
export function migrateArenaWings479(db,now){
 if(!db.isTransaction)throw Error('Arena kanat geçişi atomik işlem gerektirir.');
 if(!Number.isSafeInteger(now)||now<0||now>Number.MAX_SAFE_INTEGER-5*86400000)throw Error('Arena kanat saati geçersiz.');
 db.exec('CREATE TABLE IF NOT EXISTS arena_wing_duration479(id INTEGER PRIMARY KEY CHECK(id=1),applied_at_ms INTEGER NOT NULL)');
 if(db.prepare('SELECT 1 FROM arena_wing_duration479 WHERE id=1').get())return false;
 db.prepare('UPDATE players SET arena_wings_expires_at_ms=? WHERE arena_wings_owned=1 AND arena_wings_expires_at_ms=0').run(now+5*86400000);
 db.prepare('INSERT INTO arena_wing_duration479(id,applied_at_ms) VALUES(1,?)').run(now);
 return true;
}
