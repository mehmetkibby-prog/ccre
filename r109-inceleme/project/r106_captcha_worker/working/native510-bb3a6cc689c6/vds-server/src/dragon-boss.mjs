import {materialLevelPolicy498} from '../../lib/material-level498.mjs';
import {DRAGON_AWARD_PARTICIPANTS_SQL498,dragonWinner498} from '../../lib/dragon-ranking498.mjs';
import {balanceFromSnapshot487,balanceFactor487} from '../../lib/level-balance487.mjs';
import {COSMETIC_DURATION_MS,EXTRA_PRODUCTS} from '../../lib/extra-products.mjs';
import {randomUUID} from 'node:crypto';
import {DRAGON_ID,DRAGON_NAME,DRAGON_SPAWN,DRAGON_CATALOG,DRAGON_CATALOG_BY_ID,defaultDragonConfig,validateDragonConfig,requireDragonLoot,rollDragonLoot,dragonDropPosition} from '../../lib/dragon-boss.mjs';
import {infiniteEquipmentPower} from '../../lib/infinite-power.mjs';
import {COSTUMES} from '../../lib/premium-catalog.mjs';
export function ensureDragonSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS dragon_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS dragon_drop_payloads(drop_id TEXT PRIMARY KEY,payload_json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS dragon_defeat_receipts(spawn_round INTEGER PRIMARY KEY,created_at INTEGER NOT NULL);`);
 const cfg=defaultDragonConfig(db.prepare('SELECT boss_hp FROM game_settings WHERE id=1').get()?.boss_hp??18000);
 db.prepare('INSERT OR IGNORE INTO dragon_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(cfg));
 db.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round,despawn_at)
 VALUES(?,?,?,?,0,?,'dragon','dragon',0,0,0,0,unixepoch()+10800,0,0)`).run(DRAGON_ID,DRAGON_NAME,DRAGON_SPAWN.x,DRAGON_SPAWN.y,cfg.hp);
 // Retire the old five-minute expiry without healing or killing an active life.
 db.prepare('UPDATE monsters SET despawn_at=0 WHERE id=? AND despawn_at!=0').run(DRAGON_ID);
}
export function createDragonBoss(db,{now=Date.now,random=Math.random}={}){
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 const settings=()=>{const r=db.prepare('SELECT * FROM dragon_settings WHERE id=1').get();return {revision:r.revision,config:JSON.parse(r.config_json)};};
 const spawn=()=>{const cfg=requireDragonLoot(settings().config);return db.prepare(`UPDATE monsters SET hp=?,max_hp=?,x=?,y=?,respawn_at=0,despawn_at=0,spawn_round=spawn_round+1 WHERE id=? AND hp<=0`).run(cfg.hp,cfg.hp,DRAGON_SPAWN.x,DRAGON_SPAWN.y,DRAGON_ID);};
 function grant(p,item,amount,drop){
  const id=p.id,t=Math.floor(now()/1000);
  if(item.type==='gear'){
   for(let i=0;i<amount;i++)db.prepare('INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at) VALUES(?,?,?,?,?,?,?,?,0,?)').run(randomUUID(),id,item.kind,drop.item_name,item.rarity,drop.power,item.role,drop.enchantments,t);
  }else if(item.type==='resource')db.prepare(`UPDATE players SET ${item.column}=${item.column}+? WHERE id=?`).run(amount,id);
  else if(item.type==='stone'||item.type==='material'){const table=item.type==='stone'?'player_stones':'dungeon_materials';db.prepare(`INSERT INTO ${table}(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount`).run(id,item.kind,amount);}
  else if(item.type==='pet'){const duration=item.kind==='starter'?259200:604800;db.prepare(`INSERT INTO player_pets(player_id,kind,equipped,acquired_at) VALUES(?,?,0,?) ON CONFLICT(player_id,kind) DO UPDATE SET acquired_at=MAX(excluded.acquired_at,player_pets.acquired_at+?)`).run(id,item.kind,t+duration*(amount-1),duration*amount);}
  else if(item.type==='rank')db.prepare(`UPDATE players SET rank_unlocked=json_insert(rank_unlocked,'$[#]',?) WHERE id=? AND NOT EXISTS(SELECT 1 FROM json_each(rank_unlocked) WHERE value=?)`).run(item.kind,id,item.kind);
  else if(item.type==='special'){if(item.kind==='starter_chest'){for(let i=0;i<amount;i++)db.prepare('INSERT INTO starter_admin_grants(request_id,account_id,player_id,admin_id,granted_at_ms) VALUES(?,?,?,?,?)').run(randomUUID(),p.account_id??'',id,'dragon-loot',now());}else if(item.kind==='rod')db.prepare('UPDATE players SET has_rod=1 WHERE id=?').run(id);else db.prepare('INSERT OR IGNORE INTO dungeon_wings(player_id,equipped) VALUES(?,0)').run(id);}
  else if(item.type==='premium'){
   const k=item.kind,cols={afk_ticket:'afk_tickets',enchant_add:'enchant_add_scrolls',enchant_scroll:'enchant_scrolls',item_link:'item_link_orbs',rename_scroll:'rename_scrolls'};
   if(EXTRA_PRODUCTS[k])db.prepare(`UPDATE players SET ${EXTRA_PRODUCTS[k].stock}=${EXTRA_PRODUCTS[k].stock}+? WHERE id=?`).run(amount,id);
   else if(cols[k])db.prepare(`UPDATE players SET ${cols[k]}=${cols[k]}+? WHERE id=?`).run(amount,id);
   else if(k==='xp_ring'||k==='drop_charm')db.prepare(`UPDATE players SET ${k}_until=MAX(${k}_until,?)+? WHERE id=?`).run(t,5*86400*amount,id);
   else if(k==='wings')db.prepare('UPDATE players SET has_wings=1,wings_expires_at_ms=MAX(wings_expires_at_ms,?)+? WHERE id=?').run(now(),7*86400000*amount,id);
   else if(k==='auto_potion')db.prepare('UPDATE players SET auto_potion_owned=1,auto_potion_remaining=MAX(0,auto_potion_remaining)+?,auto_potion_total=MAX(0,auto_potion_remaining)+? WHERE id=?').run(1000000*amount,1000000*amount,id);
   else if(k==='storage_page')db.prepare('UPDATE players SET storage_pages=MIN(4,storage_pages+?) WHERE id=?').run(amount,id);
   else if(k==='costume'){
    const existing=db.prepare("SELECT id FROM player_items WHERE player_id=? AND kind='costume' AND role=? LIMIT 1").get(id,p.role);
    if(existing)db.prepare('UPDATE player_items SET expires_at_ms=MAX(expires_at_ms,?)+?,premium_origin=1 WHERE id=?').run(now(),COSMETIC_DURATION_MS*amount,existing.id);
    else db.prepare(`INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at,expires_at_ms,premium_origin) VALUES(?,?,'costume',?,'unique',50,?,'[{"kind":"hp","value":500}]',0,?,?,1)`).run(randomUUID(),id,COSTUMES[p.role].name,p.role,t,now()+COSMETIC_DURATION_MS*amount);
   }
   else if(['stall_skin','teleport_skin','weapon_skin'].includes(k)){db.prepare(`UPDATE players SET ${k}_owned=1 WHERE id=?`).run(id);if(k!=='stall_skin')db.prepare(`UPDATE players SET ${k}_expires_at_ms=MAX(${k}_expires_at_ms,?)+? WHERE id=?`).run(now(),COSMETIC_DURATION_MS*amount,id);}
   else throw new Error('Ürün teslim edilemedi.');
  }else throw new Error('Eşya türü geçersiz.');
 }
 return {
 settings, catalog:()=>DRAGON_CATALOG,
 grantCatalog(playerId,item,amount,drop){if(!db.isTransaction)throw Error("Catalog rewards require an atomic transaction");const p=db.prepare("SELECT * FROM players WHERE id=?").get(playerId);if(!p)throw Error("Oyuncu bulunamadı.");grant(p,item,amount,drop);},
 describeDrops(rows){return rows.map(drop=>{
  if(drop.monster_id!==DRAGON_ID)return drop;
  const payload=db.prepare('SELECT payload_json FROM dragon_drop_payloads WHERE drop_id=?').get(drop.id);
  const itemId=payload?JSON.parse(payload.payload_json).itemId:null;
  return itemId?{...drop,catalog_id:itemId}:drop;
 });},
 infinitePower:(item)=>infiniteEquipmentPower(item,{infinite_power_percent:30,infinite_weapon_power:230,...JSON.parse(db.prepare('SELECT value FROM dungeon_settings WHERE id=1').get()?.value??'{}')}),
 save(value,revision){const cfg=requireDragonLoot(validateDragonConfig(value));return transaction(()=>{if(!db.prepare('UPDATE dragon_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(cfg),revision).changes)throw new Error('Ayarlar değişti; paneli yenile.');if(!cfg.enabled)db.prepare('UPDATE monsters SET hp=0,respawn_at=0,despawn_at=0 WHERE id=?').run(DRAGON_ID);else db.prepare('UPDATE monsters SET respawn_at=? WHERE id=? AND hp<=0 AND respawn_at=0').run(Math.floor(now()/1000)+cfg.interval,DRAGON_ID);return settings();});},
 command(action){return transaction(()=>{if(action==='spawn'){if(!settings().config.enabled)throw new Error('Önce ejderhayı etkinleştir.');spawn();}else if(action==='remove')db.prepare('UPDATE monsters SET hp=0,despawn_at=0,respawn_at=? WHERE id=?').run(Math.floor(now()/1000)+settings().config.interval,DRAGON_ID);else throw new Error('Geçersiz boss işlemi.');});},
 tick({cleanup=true}={}){
 const cfg=settings().config,t=Math.floor(now()/1000),m=db.prepare('SELECT hp,despawn_at,respawn_at FROM monsters WHERE id=?').get(DRAGON_ID);
 if(!cfg.enabled||!m)return;
 // Most heartbeats have nothing to change. Re-read under the transaction when
 // work is due so a concurrent admin edit cannot spawn or reset a stale life.
 const due=m.hp>0&&m.despawn_at!==0||m.hp<=0&&(m.respawn_at<=0||m.respawn_at<=t&&cfg.loot.some(rule=>rule.chance>0));
 if(!due&&(!cleanup||!db.prepare('SELECT 1 FROM dragon_drop_payloads WHERE NOT EXISTS(SELECT 1 FROM world_drops d WHERE d.id=dragon_drop_payloads.drop_id) LIMIT 1').get()))return;
 return transaction(()=>{const cfg=settings().config,t=Math.floor(now()/1000),m=db.prepare('SELECT * FROM monsters WHERE id=?').get(DRAGON_ID);if(!cfg.enabled||!m)return;
 if(m.hp>0&&m.despawn_at!==0)db.prepare('UPDATE monsters SET despawn_at=0 WHERE id=?').run(DRAGON_ID);
 // A legacy empty table must not throw from the global world tick. Admin can
 // repair it; new saves/spawns reject it before creating an unrewarded life.
 else if(m.hp<=0&&m.respawn_at>0&&m.respawn_at<=t&&cfg.loot.some(rule=>rule.chance>0))spawn();else if(m.hp<=0&&m.respawn_at<=0)db.prepare('UPDATE monsters SET respawn_at=? WHERE id=?').run(t+cfg.interval,DRAGON_ID);
 if(cleanup)db.prepare('DELETE FROM dragon_drop_payloads WHERE NOT EXISTS(SELECT 1 FROM world_drops d WHERE d.id=dragon_drop_payloads.drop_id)').run();});},
 award(pending,makeGear){return transaction(()=>{
  const t=Math.floor(now()/1000),receipt=db.prepare('INSERT OR IGNORE INTO dragon_defeat_receipts(spawn_round,created_at) VALUES(?,?)').run(pending.spawn_round,t);
  if(!receipt.changes)return {awarded:false,groundDrops:0};
  const participants=db.prepare(DRAGON_AWARD_PARTICIPANTS_SQL498).all(DRAGON_ID,pending.spawn_round);
  const winner498=dragonWinner498(participants),winnerBonus498=winner498?Math.max(0,Math.min(150,9000000000000-winner498.gems)):0;if(winnerBonus498>0)db.prepare('UPDATE players SET gems=gems+? WHERE id=?').run(winnerBonus498,winner498.id);
  const config=validateDragonConfig(JSON.parse(pending.loot_profile_json)),halloweenRate456=Math.max(0,Math.min(100,Number(JSON.parse(pending.events_snapshot||'{}').halloween)||0));let count=0;
  const materialLevel498=materialLevelPolicy498(JSON.parse(pending.events_snapshot||'{}'));
  for(const owner of participants){const balance487=balanceFactor487(balanceFromSnapshot487(JSON.parse(pending.events_snapshot||'{}')),"dragon",owner.level);const rewards=rollDragonLoot(config,random,balance487,materialLevel498);if(halloweenRate456>0&&random()*100<halloweenRate456*balance487)rewards.push({itemId:'material:halloween_pumpkin',amount:1});for(const [index,rule] of rewards.entries()){if(pending.pearls_retired===1&&rule.itemId==='resource:pearls')continue;const position=dragonDropPosition(pending.x,pending.y,index,rewards.length);const item=DRAGON_CATALOG_BY_ID.get(rule.itemId),amount=rule.amount,id=randomUUID();const gear=item.type==='gear'?makeGear(item):{power:0,enchantments:'[]'};
   db.prepare(`INSERT INTO world_drops(id,owner_id,monster_id,kind,item_name,rarity,power,amount,role,enchantments,x,y,expires_at,collectible_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,owner.id,DRAGON_ID,item.type==='gear'?item.kind:'dragon_reward',gear.name??item.name,item.rarity??'orange',gear.power,amount,item.role??owner.role,gear.enchantments,position.x,position.y,t+120,t+5);
   db.prepare('INSERT INTO dragon_drop_payloads(drop_id,payload_json) VALUES(?,?)').run(id,JSON.stringify({itemId:item.id}));count++;
  }}
  db.prepare(`INSERT OR IGNORE INTO normal_reward_claims(monster_id,spawn_round,player_id,claim_token,awarded_at) SELECT monster_id,spawn_round,player_id,?,? FROM monster_participants WHERE monster_id=? AND spawn_round=?`).run(randomUUID(),t,DRAGON_ID,pending.spawn_round);
  db.prepare('UPDATE normal_defeats SET rewards_completed_at=? WHERE monster_id=? AND spawn_round=?').run(Math.max(1,t),DRAGON_ID,pending.spawn_round);
  return {awarded:true,groundDrops:count,winnerId:winner498?.id??null,winnerBonusGems:winnerBonus498};
 });},
 collect(playerId,dropId){return transaction(()=>{const p=db.prepare('SELECT * FROM players WHERE id=?').get(playerId),drop=db.prepare('SELECT d.*,v.payload_json FROM world_drops d JOIN dragon_drop_payloads v ON v.drop_id=d.id WHERE d.id=? AND d.owner_id=? AND d.monster_id=?').get(dropId,playerId,DRAGON_ID),t=Math.floor(now()/1000);if(!p||p.hp<=0||p.area!=='dragon'||!drop||drop.expires_at<t||drop.collectible_at>t&&Math.hypot(p.x-drop.x,p.y-drop.y)>280)throw new Error('Ganimet alınamıyor.');const item=DRAGON_CATALOG_BY_ID.get(JSON.parse(drop.payload_json).itemId);if(!item)throw new Error('Eşya bulunamadı.');grant(p,item,drop.amount,drop);db.prepare('DELETE FROM world_drops WHERE id=?').run(dropId);db.prepare('DELETE FROM dragon_drop_payloads WHERE drop_id=?').run(dropId);return {ok:true,message:`${drop.item_name} çantana eklendi.`};});}
 };
}
