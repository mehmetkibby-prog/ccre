// Fixed, channel-owned bosses. No timer, request hook, or shared-combat grant.
export const STONE_BOSS_IDS476=Object.freeze(['stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3']);
export const STONE_BOSS_SPAWN476=Object.freeze({x:2700,y:1688});
export function assertStoneBossRollbackReady476(db){
 const pending=db.prepare(`SELECT d.monster_id,d.spawn_round FROM normal_defeats d
  WHERE d.monster_id IN (?,?,?) AND d.rewards_completed_at=0
   AND EXISTS(SELECT 1 FROM monster_participants p JOIN players actor ON actor.id=p.player_id
    WHERE p.monster_id=d.monster_id AND p.spawn_round=d.spawn_round
     AND NOT EXISTS(SELECT 1 FROM normal_reward_claims c WHERE c.monster_id=p.monster_id AND c.spawn_round=p.spawn_round AND c.player_id=p.player_id)) LIMIT 1`).get(...STONE_BOSS_IDS476);
 if(pending){const error=new Error('Stone boss rewards are pending; keep V476 running until delivery completes before rollback');error.code='STONE_BOSS_REWARD_PENDING476';throw error;}
 return true;
}
// Only call while all realm services are stopped. Pending rewards must finish
// on V476 before old code can safely resume; no receipt or loot row is removed.
export function quarantineStoneBoss476(db){
 db.exec('PRAGMA synchronous=FULL');
 db.exec('BEGIN IMMEDIATE');
 try{
  assertStoneBossRollbackReady476(db);
  const cycle=db.prepare('SELECT cycle FROM world_state WHERE id=1').get()?.cycle;
  if(!Number.isSafeInteger(cycle))throw Error('Stone boss requires existing world');
  const rows=STONE_BOSS_IDS476.map(id=>db.prepare('SELECT * FROM monsters WHERE id=?').get(id)).filter(Boolean);
  for(const row of rows)if(row.area!=='black'||row.channel!==STONE_BOSS_IDS476.indexOf(row.id)+1||row.variant!=='stone_boss'||row.is_boss!==0||row.is_stone!==0||row.summoned!==0)throw Error('Stone boss rollback identity mismatch');
  // No mutation has occurred before every pending/identity check passes.
  db.exec('CREATE TABLE IF NOT EXISTS stone_boss_quarantine476(id TEXT PRIMARY KEY,row_json TEXT NOT NULL,world_cycle INTEGER NOT NULL)');
  const save=db.prepare('INSERT INTO stone_boss_quarantine476(id,row_json,world_cycle) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET row_json=excluded.row_json,world_cycle=excluded.world_cycle');
  for(const row of rows){save.run(row.id,JSON.stringify(row),cycle);db.prepare('DELETE FROM pve_engagements WHERE monster_id=?').run(row.id);db.prepare('DELETE FROM monsters WHERE id=?').run(row.id);}
  db.exec('COMMIT');
  return {quarantined:rows.length};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
export function ensureStoneBoss476(db){
 db.exec('BEGIN IMMEDIATE');
 try{
  const columns=new Set(db.prepare('PRAGMA table_info(combat_settings)').all().map(r=>r.name));
  for(const [key,type] of [
   ['black_stone_boss_enabled','INTEGER NOT NULL DEFAULT 1'],
   ['black_stone_boss_hp','INTEGER NOT NULL DEFAULT 26000'],
   ['black_stone_boss_damage_scale','REAL NOT NULL DEFAULT 0.42'],
   ['black_stone_boss_respawn_seconds','INTEGER NOT NULL DEFAULT 600'],
   ['black_stone_boss_xp_reward','INTEGER NOT NULL DEFAULT 500'],
   ['black_stone_boss_reward_gems','INTEGER NOT NULL DEFAULT 12'],
  ])if(!columns.has(key))db.exec(`ALTER TABLE combat_settings ADD COLUMN ${key} ${type}`);
  const participantColumns=new Set(db.prepare('PRAGMA table_info(monster_participants)').all().map(r=>r.name));
  for(const key of ['stone_damage476','stone_first_hit_at_ms476'])if(!participantColumns.has(key))db.exec(`ALTER TABLE monster_participants ADD COLUMN ${key} INTEGER NOT NULL DEFAULT 0`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_stone_rank476 ON monster_participants(monster_id,spawn_round,stone_damage476 DESC,stone_first_hit_at_ms476,player_id) WHERE stone_damage476>0');
  db.exec('CREATE TABLE IF NOT EXISTS stone_boss_quarantine476(id TEXT PRIMARY KEY,row_json TEXT NOT NULL,world_cycle INTEGER NOT NULL)');
  const settings=db.prepare('SELECT black_stone_boss_enabled AS enabled,black_stone_boss_hp AS hp FROM combat_settings WHERE id=1').get();
  if(!settings)throw Error('Stone boss requires existing combat settings');
  const cycle=db.prepare('SELECT cycle FROM world_state WHERE id=1').get()?.cycle;
  if(!Number.isSafeInteger(cycle))throw Error('Stone boss requires existing world');
  const insert=db.prepare("INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round) VALUES(?,'Kara Taş Muhafızı',2700,1688,?,?,'stone_boss','black',?,0,0,0,0,?)");
  for(let i=0;i<3;i++){
   const id=STONE_BOSS_IDS476[i],existing=db.prepare('SELECT id FROM monsters WHERE id=?').get(id);
   if(existing)continue;
   const quarantined=db.prepare('SELECT row_json,world_cycle FROM stone_boss_quarantine476 WHERE id=?').get(id);
   let previousRound=0;
   if(quarantined){
    const row=JSON.parse(quarantined.row_json);
    if(row.id!==id||row.channel!==i+1||row.area!=='black'||row.variant!=='stone_boss'||row.is_boss!==0||row.is_stone!==0||row.summoned!==0||!Number.isSafeInteger(row.spawn_round)||row.spawn_round<1)throw Error('Invalid stone boss quarantine');
    previousRound=row.spawn_round;
    // V475 can expire old participation while the boss is quarantined. Never
    // restore partial HP with incomplete damage standings after a downgrade;
    // a new V476 life always starts a fresh round. Receipts/drops stay intact.
   }
   // Never reuse an old receipt identity, even after an earlier rollback.
   const seen=db.prepare('SELECT MAX(spawn_round) AS n FROM (SELECT spawn_round FROM normal_defeats WHERE monster_id=? UNION ALL SELECT spawn_round FROM normal_reward_claims WHERE monster_id=? UNION ALL SELECT spawn_round FROM monster_participants WHERE monster_id=?)').get(id,id,id)?.n??0;
   const round=Math.max(previousRound,Number(seen)||0)+1;
   if(!Number.isSafeInteger(round))throw Error('Invalid stone boss spawn round');
   insert.run(id,settings.enabled?settings.hp:0,settings.hp,i+1,round);
   if(quarantined)db.prepare('DELETE FROM stone_boss_quarantine476 WHERE id=?').run(id);
  }
  // Existing normal-kill rank quest excludes bosses. Preserve its exact body.
  const trigger=db.prepare("SELECT sql FROM sqlite_schema WHERE type='trigger' AND name='rank_normal_kill'").get();
  if(trigger?.sql&&!trigger.sql.includes("'stone_boss'")){
   const needle="m.variant NOT IN ('frost_boss','frost_water','ancient_boss')";
   if(trigger.sql.split(needle).length!==2)throw Error('Unknown rank trigger; stone boss migration stopped');
   db.exec('DROP TRIGGER rank_normal_kill');
   db.exec(trigger.sql.replace(needle,"m.variant NOT IN ('frost_boss','frost_water','ancient_boss','stone_boss')"));
  }
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
 db.exec('PRAGMA optimize');
}
