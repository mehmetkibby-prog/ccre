// One-time native boot migration, before channel processes/read caches start.
export function ensureEmeraldStats449(db,now=Date.now()){
 db.exec('BEGIN IMMEDIATE');
 try{
  db.exec('CREATE TABLE IF NOT EXISTS app_release_migrations(id TEXT PRIMARY KEY NOT NULL,applied_at_ms INTEGER NOT NULL)');
  const first=db.prepare("INSERT OR IGNORE INTO app_release_migrations(id,applied_at_ms) VALUES('v449-emerald-base-stats',?) RETURNING id").get(now);
  const changed={};
  if(first){
   // Base power is separate from evolution/stone/talisman enchantments. Do not
   // parse or rewrite those, custom names/powers, trade history, or player HP.
   const standard=`rarity='emerald' AND (
    (kind='weapon' AND power=265 AND (
     (role='muhafiz' AND item_name='Kadim Zümrüt Hükümkılıcı') OR
     (role='avci' AND item_name='Kadim Zümrüt Ufuk Yayı') OR
     (role='arkanist' AND item_name='Kadim Zümrüt Öz Asası'))) OR
    (kind='armor' AND power=225 AND item_name='Kadim Zümrüt Zırhı' AND role IN ('muhafiz','avci','arkanist')))`;
   for(const table of ['player_items','player_storage_items','market_listings','market_settlements','world_drops']){
    const pending=table==='market_settlements'?' AND applied_at_ms<=0':table==='world_drops'?' AND expires_at>=?':'';
    const statement=db.prepare(`UPDATE ${table} SET power=CASE kind WHEN 'weapon' THEN 350 ELSE 300 END WHERE ${standard}${pending}`);
    changed[table]=Number(table==='world_drops'?statement.run(Math.floor(now/1000)).changes:statement.run().changes);
   }
  }
  db.exec('COMMIT');return {applied:!!first,changed};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
