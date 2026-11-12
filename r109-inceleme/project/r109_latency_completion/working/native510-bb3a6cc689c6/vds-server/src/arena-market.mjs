import {arenaWingsOwned477,arenaWingsActive477,grantArenaWings477,resumeArenaWings477,migrateArenaWings479,projectArenaWingAppearance477} from '../../lib/arena-wings477.mjs';
import {randomUUID} from 'node:crypto';
import {ARENA_LIMITS,ARENA_REWARDS,ARENA_CATALOG,ARENA_BY_ID,DEFAULT_ARENA_SHOP,validateArenaShop,arenaDayStart} from '../../lib/arena-market.mjs';
import {createDragonBoss} from './dragon-boss.mjs';
export function ensureArenaMarketSchema(db){
 db.exec('BEGIN IMMEDIATE');try{
 const cols=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
 for(const c of ['arena_coins','arena_wings_owned','arena_wings_equipped','arena_wings_expires_at_ms','arena_exp_rings','arena_exp_until'])if(!cols.has(c))db.exec(`ALTER TABLE players ADD COLUMN ${c} INTEGER NOT NULL DEFAULT 0`);
 if(!db.prepare('PRAGMA table_info(arena_reward_claims)').all().some(c=>c.name==='arena_coins'))db.exec('ALTER TABLE arena_reward_claims ADD COLUMN arena_coins INTEGER NOT NULL DEFAULT 0');
 db.exec(`CREATE TABLE IF NOT EXISTS arena_market_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS arena_market_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
 CREATE INDEX IF NOT EXISTS arena_market_receipts_age ON arena_market_receipts(created_at);
 CREATE INDEX IF NOT EXISTS arena_wing_expiry477 ON players(arena_wings_expires_at_ms,id) WHERE arena_wings_owned=1 AND arena_wings_expires_at_ms>0;
 CREATE INDEX IF NOT EXISTS arena_daily_player_time ON arena_match_players(player_id,joined_at_ms,match_id);`);
 db.prepare('INSERT OR IGNORE INTO arena_market_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(DEFAULT_ARENA_SHOP));
 const reward="CASE m.mode WHEN '1v1' THEN 5 WHEN '2v2' THEN 6 WHEN '3v3' THEN 7 WHEN '5v5' THEN 10 ELSE 0 END";
 db.exec(`CREATE TRIGGER IF NOT EXISTS arena_coin_reward_424 AFTER INSERT ON arena_reward_claims BEGIN
 UPDATE arena_reward_claims SET arena_coins=COALESCE((SELECT ${reward} FROM arena_matches m JOIN arena_match_players mp ON mp.match_id=m.id AND mp.player_id=NEW.player_id AND mp.team=m.winner_team WHERE m.id=NEW.match_id AND m.id NOT LIKE 'guild-%' AND m.status='finished' AND m.settlement_token=NEW.settlement_token),0) WHERE id=NEW.id;
 UPDATE players SET arena_coins=arena_coins+(SELECT arena_coins FROM arena_reward_claims WHERE id=NEW.id) WHERE id=NEW.player_id;
 END;
 CREATE TRIGGER IF NOT EXISTS arena_daily_limit_424 BEFORE INSERT ON arena_match_players
 WHEN NEW.match_id NOT LIKE 'guild-%' AND NOT EXISTS(SELECT 1 FROM arena_match_players WHERE match_id=NEW.match_id AND player_id=NEW.player_id)
 BEGIN SELECT CASE WHEN (SELECT COUNT(*) FROM arena_match_players old JOIN arena_matches m ON m.id=old.match_id WHERE old.player_id=NEW.player_id AND old.joined_at_ms>=CAST((NEW.joined_at_ms+10800000)/86400000 AS INTEGER)*86400000-10800000 AND old.joined_at_ms<CAST((NEW.joined_at_ms+10800000)/86400000 AS INTEGER)*86400000+75600000 AND m.mode=(SELECT mode FROM arena_matches WHERE id=NEW.match_id) AND m.id NOT LIKE 'guild-%') >= (SELECT CASE mode WHEN '1v1' THEN 5 WHEN '2v2' THEN 3 WHEN '3v3' THEN 2 WHEN '5v5' THEN 1 ELSE 999999 END FROM arena_matches WHERE id=NEW.match_id) THEN RAISE(ABORT,'Günlük Arena giriş hakkın doldu.') END; END;
 CREATE TRIGGER IF NOT EXISTS arena_wing_exclusive_424 AFTER UPDATE OF arena_wings_equipped ON players WHEN NEW.arena_wings_equipped=1 BEGIN UPDATE players SET wings_equipped=0 WHERE id=NEW.id;UPDATE dungeon_wings SET equipped=0 WHERE player_id=NEW.id; END;
 CREATE TRIGGER IF NOT EXISTS arena_wing_old_424 AFTER UPDATE OF wings_equipped ON players WHEN NEW.wings_equipped=1 BEGIN UPDATE players SET arena_wings_equipped=0 WHERE id=NEW.id;END;
 CREATE TRIGGER IF NOT EXISTS arena_wing_core_424 AFTER UPDATE OF equipped ON dungeon_wings WHEN NEW.equipped=1 BEGIN UPDATE players SET arena_wings_equipped=0 WHERE id=NEW.player_id;END;`);
 resumeArenaWings477(db,Date.now());
 migrateArenaWings479(db,Date.now());
 db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
export function createArenaMarket(db,{now=Date.now}={}){
 const dragon=createDragonBoss(db,{now});let current;
 const refresh=()=>{const r=db.prepare('SELECT * FROM arena_market_settings WHERE id=1').get();return current={revision:r.revision,config:validateArenaShop(JSON.parse(r.config_json))};};refresh();
 const limits=id=>{const start=arenaDayStart(now()),rows=db.prepare("SELECT m.mode,COUNT(*) AS used FROM arena_match_players p JOIN arena_matches m ON m.id=p.match_id WHERE p.player_id=? AND p.joined_at_ms>=? AND p.joined_at_ms<? AND m.id NOT LIKE 'guild-%' GROUP BY m.mode").all(id,start,start+86400000);return Object.fromEntries(Object.entries(ARENA_LIMITS).map(([m,n])=>[m,{limit:n,used:rows.find(r=>r.mode===m)?.used??0}]));};
 const get=id=>{const p=db.prepare('SELECT * FROM players WHERE id=?').get(id);if(!p)throw Error('Karakter bulunamadı.');return p;};
 const read=id=>{const p=get(id),at=now();return {...current,coins:p.arena_coins,wingsOwned:Number(arenaWingsOwned477(p,at)),wingsEquipped:Number(arenaWingsActive477(p,at)),wingsExpiresAt:p.arena_wings_expires_at_ms,wingsPermanent:p.arena_wings_owned===1&&p.arena_wings_expires_at_ms===0,rings:p.arena_exp_rings,expUntil:p.arena_exp_until,limits:limits(id),resetAt:arenaDayStart(now())+86400000,serverTime:now(),items:current.config.map(r=>({...ARENA_BY_ID.get(r.itemId),...r})),rewards:ARENA_REWARDS};};
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
 return {refresh,read,limits,settings:()=>({...current,catalog:ARENA_CATALOG}),
 save(config,revision){const next=validateArenaShop(config);transaction(()=>{if(!db.prepare('UPDATE arena_market_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(next),revision).changes)throw Error('Ayarlar değişti. Paneli yenile.');});return refresh();},
 command(id,input){return transaction(()=>{
 const requestId=input.requestId;if(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId))throw Error('İşlem kimliği geçersiz.');
 const fingerprint=JSON.stringify([input.action,input.itemId??null,input.revision??null,input.enabled??null]);
 const prior=db.prepare('SELECT fingerprint,result_json FROM arena_market_receipts WHERE player_id=? AND request_id=?').get(id,requestId);
 if(prior){if(prior.fingerprint!==fingerprint)throw Error('İşlem kimliği kullanılmış.');return {...JSON.parse(prior.result_json),state:read(id),replayed:true};}
 const p=get(id);let message;
 if(input.action==='arena_market_buy'){
 const row=current.config.find(r=>r.itemId===input.itemId),item=ARENA_BY_ID.get(input.itemId);if(!row||input.revision!==current.revision)throw Error('Market değişti. Yenileyip tekrar dene.');
 if(item.id==='premium:storage_page'&&p.storage_pages>=4)throw Error('Depo sayfaların zaten tam.');
 if(!db.prepare('UPDATE players SET arena_coins=arena_coins-? WHERE id=? AND arena_coins>=?').run(row.price,id,row.price).changes)throw Error('Yeterli Arena Coin yok.');
 if(item.id==='arena:wings'){if(grantArenaWings477(db,id,now()).changes!==1)throw Error('Arena kanat süresi güncellenemedi.');}
 else if(item.id==='arena:exp_ring')db.prepare('UPDATE players SET arena_exp_rings=arena_exp_rings+1 WHERE id=?').run(id);
 else if(item.type==='rune')db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,?,?,'unique',?,?,0,'[]',?)").run(randomUUID(),id,item.kind,item.name,row.power,p.role,Math.floor(now()/1000));
 else dragon.grantCatalog(id,item,row.amount,{item_name:item.name,power:row.power??0,enchantments:'[]'});
 message=item.name+' alındı.';
 }else if(input.action==='arena_market_wings'){
 if(!arenaWingsOwned477(p,now()))throw Error('Arena Kanatlarının süresi dolmuş veya henüz alınmamış.');
 if(p.hp<=0||p.arena_match_id||p.combat_lock_until_ms>now()||db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=? LIMIT 1').get(id))throw Error('Kanat değiştirmek için savaştan çık.');
 if(typeof input.enabled!=='boolean')throw Error('Geçersiz seçim.');db.prepare('UPDATE players SET arena_wings_equipped=? WHERE id=?').run(input.enabled?1:0,id);message=input.enabled?'Arena Kanatları kuşanıldı.':'Arena Kanatları çıkarıldı.';
 }else if(input.action==='arena_market_exp'){
 if(!db.prepare('UPDATE players SET arena_exp_rings=arena_exp_rings-1,arena_exp_until=MAX(arena_exp_until,?)+3600000 WHERE id=? AND arena_exp_rings>0').run(now(),id).changes)throw Error('Tecrübe yüzüğün yok.');message='1 saat +%20 tecrübe etkin.';
 }else throw Error('Geçersiz market işlemi.');
 const result={ok:true,message};db.prepare('INSERT INTO arena_market_receipts VALUES(?,?,?,?,?)').run(id,requestId,fingerprint,JSON.stringify(result),Math.floor(now()/1000));
 db.prepare('DELETE FROM arena_market_receipts WHERE rowid IN(SELECT rowid FROM arena_market_receipts WHERE created_at<? ORDER BY created_at LIMIT 32)').run(Math.floor(now()/1000)-604800);
 return {...result,state:read(id)};
 });}
 };
}
