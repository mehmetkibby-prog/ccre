// One-time balance update, limited to the old standard weapon values/names.
// Explicit custom powers, defensive gear and completed trade history stay intact.
export function ensureWeaponPowerUpgrade(db){
 db.exec('BEGIN IMMEDIATE');
 try{
  db.exec('CREATE TABLE IF NOT EXISTS app_release_migrations(id TEXT PRIMARY KEY NOT NULL,applied_at_ms INTEGER NOT NULL)');
  const inserted=db.prepare("INSERT OR IGNORE INTO app_release_migrations VALUES('v315-standard-weapon-power',?) RETURNING id").get(Date.now());
  if(inserted){
   db.exec('UPDATE economy_settings SET unique_weapon_power=180 WHERE id=1');
   for(const table of ['player_items','player_storage_items','market_listings','market_settlements']){
    const pending=table==='market_settlements'?' AND applied_at_ms<=0':'';
    db.exec(`UPDATE ${table} SET power=180 WHERE kind='weapon' AND rarity='unique' AND power=150 AND item_name IN ('Eşsiz Platin Kılıç','Eşsiz Platin Yay','Eşsiz Platin Asa')${pending};
     UPDATE ${table} SET power=230 WHERE kind='weapon' AND rarity='infinite' AND power=195 AND item_name IN ('Sonsuz Platin Kılıç','Sonsuz Platin Yay','Sonsuz Platin Asa')${pending}`);
   }
  }
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
