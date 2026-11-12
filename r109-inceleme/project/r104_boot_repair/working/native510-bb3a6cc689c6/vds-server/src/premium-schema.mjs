import {ensureTradeGlassIndexes499} from '../../lib/trade-glass499.mjs';
import {ensureItemLock499} from './item-lock499.mjs';
import {ensureShopPrices485} from './shop-prices485.mjs';
import {ensureWheelSettings483} from '../../lib/wheel-config483.mjs';
import {restoreCouponHolds483} from './cp-coupons483.mjs';
import {ensureMarketContent481} from './market-content481.mjs';
import {upgradePetDurations} from './pet-duration.mjs';
import {upgradeCostumeDurations} from './costume-duration.mjs';
import {ensureExtraProducts} from './extra-products.mjs';
export function ensurePremiumSchema(db){
 ensureExtraProducts(db);
 ensureItemLock499(db);
 const cols=new Set(db.prepare('PRAGMA table_info(players)').all().map(r=>r.name));
 // Keep only the unspent, paid-wheel portion through a world reset. Spending
 // consumes earned stock first; all existing spend paths are covered by SQLite.
 for(const resource of ['pearls','potions','essence','gems']){
  const paid='wheel_paid_'+resource;
  if(!cols.has(paid))db.exec(`ALTER TABLE players ADD COLUMN ${paid} INTEGER NOT NULL DEFAULT 0`);
  if(cols.has(resource))db.exec(`CREATE TRIGGER IF NOT EXISTS clamp_${paid} AFTER UPDATE OF ${resource} ON players WHEN NEW.${paid}>MAX(0,NEW.${resource}) BEGIN UPDATE players SET ${paid}=MAX(0,NEW.${resource}) WHERE id=NEW.id; END`);
 }
 for(const key of ['has_wings','wings_equipped','wings_expires_at_ms','item_link_orbs','teleport_skin_expires_at_ms','weapon_skin_expires_at_ms','auto_potion_remaining','auto_potion_total','enchant_scrolls','enchant_add_scrolls','fifth_enchant_scrolls','auto_potion_owned','auto_potion_enabled','auto_potion_at_ms','stall_skin_owned','stall_skin_enabled','teleport_skin_owned','teleport_skin_enabled','weapon_skin_owned','weapon_skin_enabled','storage_pages','rename_scrolls'])if(!cols.has(key))db.exec(`ALTER TABLE players ADD COLUMN ${key} INTEGER NOT NULL DEFAULT 0`);
 if(!cols.has('afk_tickets'))db.exec('ALTER TABLE players ADD COLUMN afk_tickets INTEGER NOT NULL DEFAULT 0 CHECK(afk_tickets>=0)');
 // Existing market wings receive seven days once; restarting never renews them.
 db.prepare('UPDATE players SET wings_expires_at_ms=? WHERE has_wings=1 AND wings_expires_at_ms=0').run(Date.now()+7*86400000);
 db.exec('CREATE INDEX IF NOT EXISTS premium_wings_expiry ON players(wings_expires_at_ms) WHERE has_wings=1');
 db.exec('DROP TRIGGER IF EXISTS grant_market_wings_duration');
 db.exec(`CREATE TRIGGER IF NOT EXISTS grant_market_wings_duration AFTER UPDATE OF has_wings ON players WHEN NEW.has_wings=1 AND OLD.has_wings=0 AND NEW.wings_expires_at_ms=OLD.wings_expires_at_ms BEGIN UPDATE players SET wings_expires_at_ms=(unixepoch()+604800)*1000 WHERE id=NEW.id; END`);
 const itemCols=new Set(db.prepare('PRAGMA table_info(player_items)').all().map(r=>r.name));
 if(!itemCols.has('expires_at_ms'))db.exec('ALTER TABLE player_items ADD COLUMN expires_at_ms INTEGER NOT NULL DEFAULT 0');
 db.exec('CREATE TABLE IF NOT EXISTS premium_listings(id TEXT PRIMARY KEY,seller_id TEXT NOT NULL,product TEXT NOT NULL,payload TEXT NOT NULL,price INTEGER NOT NULL,created_at INTEGER NOT NULL)');
 ensureTradeGlassIndexes499(db);
 upgradeAutoPotionCapacity498(db);
 // Former permanent copies receive one full week at the first upgrade only.
 const teleportExpiry=Date.now()+7*86400000;
 db.prepare('UPDATE players SET teleport_skin_expires_at_ms=? WHERE teleport_skin_owned=1 AND teleport_skin_expires_at_ms=0').run(teleportExpiry);
 db.prepare("UPDATE premium_listings SET payload=json_set(payload,'$.expires_at_ms',?) WHERE product='teleport_skin' AND COALESCE(json_extract(payload,'$.expires_at_ms'),0)=0").run(teleportExpiry);
 db.exec('CREATE INDEX IF NOT EXISTS premium_teleport_expiry ON players(teleport_skin_expires_at_ms) WHERE teleport_skin_owned=1');
 db.exec("CREATE INDEX IF NOT EXISTS premium_listing_seller ON premium_listings(seller_id);CREATE INDEX IF NOT EXISTS premium_listing_product ON premium_listings(product);CREATE INDEX IF NOT EXISTS premium_costume_expiry ON player_items(expires_at_ms) WHERE kind='costume';CREATE INDEX IF NOT EXISTS premium_weapon_expiry ON players(weapon_skin_expires_at_ms) WHERE weapon_skin_owned=1;");
 db.exec("CREATE TABLE IF NOT EXISTS premium_shop_settings(id INTEGER PRIMARY KEY,prices_json TEXT NOT NULL DEFAULT '{}'); INSERT OR IGNORE INTO premium_shop_settings(id) VALUES(1)");
 const shopCols=new Set(db.prepare('PRAGMA table_info(premium_shop_settings)').all().map(r=>r.name));
 ensureMarketContent481(db);
 ensureShopPrices485(db);
 ensureWheelSettings483(db);
 // One-time price upgrade, including databases with a previously saved price.
 // Subsequent admin changes must survive service restarts.
 if(!shopCols.has('support_price_v256'))db.exec('ALTER TABLE premium_shop_settings ADD COLUMN support_price_v256 INTEGER NOT NULL DEFAULT 0');
 db.exec(`UPDATE premium_shop_settings SET prices_json=json_set(CASE WHEN json_valid(prices_json) THEN prices_json ELSE '{}' END,'$.support',json('{"base":400,"discount":0}')),support_price_v256=1 WHERE id=1 AND support_price_v256=0`);
 for(const key of ['forest_after_level','forest_reduction_percent'])if(!shopCols.has(key))db.exec(`ALTER TABLE premium_shop_settings ADD COLUMN ${key} INTEGER NOT NULL DEFAULT 30`);
 db.exec(`CREATE TABLE IF NOT EXISTS premium_receipts(id TEXT PRIMARY KEY,player_id TEXT NOT NULL,action TEXT NOT NULL,product TEXT NOT NULL,result TEXT NOT NULL,created_at_ms INTEGER NOT NULL)`);
 db.exec('CREATE INDEX IF NOT EXISTS premium_receipt_player_action_time ON premium_receipts(player_id,action,created_at_ms DESC)');
 // Provenance travels with the item; enchanting ordinary gear never marks it paid.
 for(const table of ['player_items','player_storage_items']){
  const columns=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(r=>r.name));
  if(!columns.size)continue;
  if(!columns.has('premium_origin'))db.exec(`ALTER TABLE ${table} ADD COLUMN premium_origin INTEGER NOT NULL DEFAULT 0`);
  if(!columns.has('expires_at_ms'))db.exec(`ALTER TABLE ${table} ADD COLUMN expires_at_ms INTEGER NOT NULL DEFAULT 0`);
  if(table==='player_storage_items')db.exec("CREATE INDEX IF NOT EXISTS premium_storage_costume_expiry ON player_storage_items(expires_at_ms) WHERE kind='costume'");
  // Costumes are exclusively issued by the premium shop, including secondary sales.
  db.exec(`UPDATE ${table} SET premium_origin=1 WHERE kind='costume' AND premium_origin=0`);
 }
 // Match the every-second expiry sweep without scanning unrelated pets.
 // Partial schemas may not contain the optional pet table yet.
 const petCols=new Set(db.prepare('PRAGMA table_info(player_pets)').all().map(row=>row.name));
 if(['kind','equipped','acquired_at'].every(column=>petCols.has(column)))db.exec("CREATE INDEX IF NOT EXISTS premium_starter_pet_expiry_3d ON player_pets(acquired_at+259200) WHERE kind='starter' AND equipped=1");
 const messageCols=new Set(db.prepare('PRAGMA table_info(messages)').all().map(r=>r.name));
 if(['scope','id','recipient_id','announcement_expires_at_ms'].every(k=>messageCols.has(k)))db.exec("CREATE INDEX IF NOT EXISTS messages_public_scope479 ON messages(scope,id DESC) WHERE recipient_id IS NULL AND announcement_expires_at_ms=0");
 if(messageCols.size&&!messageCols.has('item_snapshot'))db.exec("ALTER TABLE messages ADD COLUMN item_snapshot TEXT NOT NULL DEFAULT ''");
 db.exec("CREATE TABLE IF NOT EXISTS item_link_receipts(request_id TEXT PRIMARY KEY,player_id TEXT NOT NULL,item_id TEXT NOT NULL,target TEXT NOT NULL,message_id INTEGER NOT NULL)");
 upgradeCostumeDurations(db);
 db.prepare("UPDATE player_items SET expires_at_ms=? WHERE kind='costume' AND expires_at_ms=0").run(Date.now()+7*86400000);
 db.prepare('UPDATE players SET weapon_skin_expires_at_ms=? WHERE weapon_skin_owned=1 AND weapon_skin_expires_at_ms=0').run(Date.now()+7*86400000);
  if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='player_storage_items'").get())db.exec("UPDATE player_storage_items SET expires_at_ms=(created_at+604800)*1000 WHERE kind='costume' AND expires_at_ms=0");
 upgradePetDurations(db);
 if(restoreCouponHolds483(db).restored>0)ensureItemLock499(db);
}

// Upgrade only extant stock once at cold schema initialization. Preserve HP
// already consumed; exhausted reservoirs and capacities >=1M remain untouched.
// The release marker survives rollback/reinstall and world/player resets.
export function upgradeAutoPotionCapacity498(db){
 db.exec('CREATE TABLE IF NOT EXISTS app_release_migrations(id TEXT PRIMARY KEY NOT NULL,applied_at_ms INTEGER NOT NULL)');
 if(db.prepare("SELECT 1 FROM app_release_migrations WHERE id='v498-auto-potion-capacity'").get())return false;
 db.exec('SAVEPOINT auto_potion_capacity498');
 try{
  const first=db.prepare("INSERT OR IGNORE INTO app_release_migrations(id,applied_at_ms) VALUES('v498-auto-potion-capacity',?)").run(Date.now()).changes;
  if(first){
   db.exec('UPDATE players SET auto_potion_remaining=auto_potion_remaining+(1000000-auto_potion_total),auto_potion_total=1000000 WHERE auto_potion_owned=1 AND typeof(auto_potion_total)=\'integer\' AND auto_potion_total>0 AND auto_potion_total<1000000 AND typeof(auto_potion_remaining)=\'integer\' AND auto_potion_remaining>0 AND auto_potion_remaining<=auto_potion_total');
   // Pre-reservoir ownership has no consumption history. Initialize once only.
   db.exec('UPDATE players SET auto_potion_remaining=1000000,auto_potion_total=1000000 WHERE auto_potion_owned=1 AND auto_potion_total=0 AND auto_potion_remaining=0');
   const upgradePayload=(table,where,remainingKey,totalKey)=>{
    const columns=new Set(db.prepare('PRAGMA table_info('+table+')').all().map(row=>row.name));
    if(!['id','payload',...where.columns].every(column=>columns.has(column)))return;
    const update=db.prepare('UPDATE '+table+' SET payload=? WHERE id=? AND payload=?');
    for(const row of db.prepare('SELECT id,payload FROM '+table+' WHERE '+where.sql).all()){
     let value;try{value=JSON.parse(row.payload);}catch{continue;}
     if(!value||typeof value!=='object'||Array.isArray(value))continue;
     const remaining=value[remainingKey],total=value[totalKey];
     if(!Number.isSafeInteger(remaining)||!Number.isSafeInteger(total)||remaining<=0||total<=0||total>=1000000||remaining>total)continue;
     const next={...value,[remainingKey]:remaining+1000000-total,[totalKey]:1000000};
     update.run(JSON.stringify(next),row.id,row.payload);
    }
   };
   upgradePayload('premium_listings',{columns:['product'],sql:"product='auto_potion'"},'remaining','total');
   upgradePayload('player_storage_items',{columns:['storage_type','kind'],sql:"storage_type='flag' AND kind='auto_potion_owned'"},'auto_potion_remaining','auto_potion_total');
  }
  db.exec('RELEASE auto_potion_capacity498');
  return !!first;
 }catch(error){db.exec('ROLLBACK TO auto_potion_capacity498');db.exec('RELEASE auto_potion_capacity498');throw error;}
}
