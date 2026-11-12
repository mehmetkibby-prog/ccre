import {createContentLootR102} from './content-loot-r102.mjs';
import {ZUMRUT_BY_ID_R93,validateCostRowsR93} from './zumrut-catalog-r93.mjs';
import {contentErrorR102,intR102} from './content-model-r102.mjs';
export const EMERALD_COST_R102=Object.freeze([
 {itemId:'tower:chain_ore',amount:50},{itemId:'tower:mourning_essence',amount:40},
 {itemId:'tower:azrail_seal',amount:30},{itemId:'tower:azrail_hook',amount:5},
 {itemId:'material:zumrut_wood_r93',amount:200},{itemId:'material:zumrut_stone_r93',amount:200},{itemId:'resource:gems',amount:20000}
]);
export const CONTENT_DEFAULTS_R102=Object.freeze({
 champion:{baseXp:1000000,stepXp:250000,costs:[{itemId:'resource:gems',amount:55000},{itemId:'resource:essence',amount:55000},{itemId:'tower:azrail_hook',amount:15}],rewards:[{itemId:'resource:gems',amount:1000}]},
 newyear:{enabled:false,dropPercent:1,rewards:[{itemId:'resource:gems',amount:100,weight:1}]},
 battlefield:{enabled:false,slots:[{days:[0,1,2,3,4,5,6],start:1200,end:1260}],killsPerChest:5,victimCooldownSeconds:600,maxChestsPerDay:20,rewards:[{itemId:'resource:gems',amount:100,weight:1}]}
});
function rewards(rows,weighted){
 if(!Array.isArray(rows)||!rows.length||rows.length>32)throw contentErrorR102('1–32 ödül seçmelisin.');
 const seen=new Set();return rows.map(r=>{const item=ZUMRUT_BY_ID_R93.get(r?.itemId);if(!item?.rewardAllowed||seen.has(item.id))throw contentErrorR102('Geçersiz veya tekrarlanan ödül.');seen.add(item.id);return {itemId:item.id,amount:intR102(r.amount,1,item.maxAmount,'Ödül miktarı'),...(weighted?{weight:intR102(r.weight,1,1000000,'Ödül ağırlığı')}:{})};});
}
export function validateContentConfigR102(input){
 if(!input||typeof input!=='object')throw contentErrorR102('İçerik ayarı gerekli.');
 const c=input.champion,n=input.newyear,b=input.battlefield;
 if(!c||!n||!b||typeof n.enabled!=='boolean'||typeof b.enabled!=='boolean')throw contentErrorR102('Ayarlar eksik.');
 const dropPercent=Number(n.dropPercent);if(!Number.isFinite(dropPercent)||dropPercent<0||dropPercent>100)throw contentErrorR102('Çorap oranı %0–100 olmalı.');
 if(!Array.isArray(b.slots)||b.slots.length<1||b.slots.length>14)throw contentErrorR102('1–14 savaş saati seçmelisin.');
 const slots=b.slots.map(s=>{if(!Array.isArray(s.days)||!s.days.length||s.days.length>7||new Set(s.days).size!==s.days.length)throw contentErrorR102('Savaş günleri geçersiz.');const days=s.days.map(d=>intR102(d,0,6,'Gün')),start=intR102(s.start,0,1439,'Başlangıç'),end=intR102(s.end,0,1439,'Bitiş');if(start===end)throw contentErrorR102('Başlangıç ve bitiş aynı olamaz.');return {days,start,end};});
 // Ambiguous overlapping slots would reset the kill counter midway through
 // a match. Reject them instead of silently choosing a different event ID.
 const occupied=new Set();for(const s of slots)for(const d of s.days){const duration=(s.end-s.start+1440)%1440;for(let i=0;i<duration;i++){const k=(d*1440+s.start+i)%10080;if(occupied.has(k))throw contentErrorR102('Savaş saatleri birbiriyle çakışıyor.');occupied.add(k);}}
 return {champion:{baseXp:intR102(c.baseXp,1,1000000000,'İlk seviye tecrübesi'),stepXp:intR102(c.stepXp,0,1000000000,'Seviye başına tecrübe artışı'),costs:validateCostRowsR93(c.costs),rewards:rewards(c.rewards,false)},newyear:{enabled:n.enabled,dropPercent:Math.round(dropPercent*1000000)/1000000,rewards:rewards(n.rewards,true)},battlefield:{enabled:b.enabled,slots,killsPerChest:intR102(b.killsPerChest,1,1000,'Sandık için öldürme'),victimCooldownSeconds:intR102(b.victimCooldownSeconds,60,86400,'Aynı rakip bekleme süresi'),maxChestsPerDay:intR102(b.maxChestsPerDay,1,1000,'Günlük sandık sınırı'),rewards:rewards(b.rewards,true)}};
}
export function createContentSchemaR102(sql){
 // Additive, realm-local schema. The four constant-default columns preserve existing player values.
 // SQLite validates their CHECK constraints against the players table only. The installer declares this schema change.
 sql.exec(`CREATE TABLE IF NOT EXISTS content_settings_r102(id INTEGER PRIMARY KEY CHECK(id=1),config TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS content_auto_r102(account_id TEXT PRIMARY KEY,day INTEGER NOT NULL,used_ms INTEGER NOT NULL DEFAULT 0 CHECK(used_ms BETWEEN 0 AND 10800000),paid_ms INTEGER NOT NULL DEFAULT 0 CHECK(paid_ms BETWEEN 0 AND 31536000000),active_player TEXT NOT NULL DEFAULT '',tick_at_ms INTEGER NOT NULL DEFAULT 0,lease_until_ms INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS content_champion_rewards_r102(player_id TEXT NOT NULL,milestone INTEGER NOT NULL,result TEXT NOT NULL,PRIMARY KEY(player_id,milestone));
 CREATE TABLE IF NOT EXISTS content_forge_r102(item_id TEXT PRIMARY KEY,player_id TEXT NOT NULL,before_json TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS content_battlefield_r102(player_id TEXT PRIMARY KEY,day INTEGER NOT NULL,kills INTEGER NOT NULL DEFAULT 0,chests INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS content_battlefield_victims_r102(killer_account TEXT NOT NULL,victim_account TEXT NOT NULL,last_at INTEGER NOT NULL,PRIMARY KEY(killer_account,victim_account));
 CREATE TABLE IF NOT EXISTS content_receipts_r102(player_id TEXT NOT NULL,request_id TEXT NOT NULL,action TEXT NOT NULL,digest TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
 CREATE TABLE IF NOT EXISTS content_admin_audit_r102(id INTEGER PRIMARY KEY,admin_id TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS content_receipts_time_r102 ON content_receipts_r102(created_at);
 CREATE INDEX IF NOT EXISTS content_battlefield_time_r102 ON content_battlefield_victims_r102(last_at);`);
 sql.prepare('INSERT OR IGNORE INTO content_settings_r102(id,config) VALUES(1,?)').run(JSON.stringify(validateContentConfigR102(CONTENT_DEFAULTS_R102)));
 const columns=new Set(sql.prepare('PRAGMA table_info(players)').all().map(r=>r.name));
 for(const [name,check] of [['champion_level_r102','BETWEEN 0 AND 1000000'],['champion_xp_r102','BETWEEN 0 AND 9000000000000'],['champion_entered_r102','>=0'],['auto_attack_until_r102','>=0']])if(!columns.has(name))sql.exec(`ALTER TABLE players ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 0 CHECK(${name} ${check})`);
 // XP arrives via every existing rank-XP award (including group dungeons).
 // Receipts/loot ownership remain in their original transactions. This hook
 // is indexed to the single affected row and has no history scan or timer.
 sql.exec(`CREATE TRIGGER IF NOT EXISTS content_champion_xp_r102 AFTER UPDATE OF rank_xp ON players
 WHEN NEW.champion_level_r102>0 AND NEW.rank_xp>OLD.rank_xp
 BEGIN UPDATE players SET champion_xp_r102=MIN(9000000000000,champion_xp_r102+NEW.rank_xp-OLD.rank_xp) WHERE id=NEW.id; END;
 CREATE TRIGGER IF NOT EXISTS content_champion_advance_r102 AFTER UPDATE OF champion_xp_r102 ON players
 WHEN NEW.champion_level_r102>0 AND NEW.champion_xp_r102>OLD.champion_xp_r102
 BEGIN UPDATE players SET champion_level_r102=MAX(champion_level_r102,1+(WITH RECURSIVE
 cfg(base,step) AS (SELECT json_extract(config,'$.champion.baseXp'),json_extract(config,'$.champion.stepXp') FROM content_settings_r102 WHERE id=1),
 bounds(lo,hi) AS (SELECT 0,1000000 UNION ALL SELECT
 CASE WHEN ((lo+hi)/2)*base+((lo+hi)/2)*(((lo+hi)/2)-1)/2*step<=NEW.champion_xp_r102 THEN (lo+hi)/2 ELSE lo END,
 CASE WHEN ((lo+hi)/2)*base+((lo+hi)/2)*(((lo+hi)/2)-1)/2*step<=NEW.champion_xp_r102 THEN hi ELSE (lo+hi)/2 END
 FROM bounds,cfg WHERE hi-lo>1)
 SELECT lo FROM bounds WHERE hi-lo=1)) WHERE id=NEW.id; END;`);
 createContentLootR102(sql);
}
