import {pumpkinSql499} from '../../lib/pumpkin499.mjs';
import {arenaWingsOwned477,arenaWingsActive477,grantArenaWings477,resumeArenaWings477,projectArenaWingAppearance477} from '../../lib/arena-wings477.mjs';
import {defaultRankConfig,validateRankConfig,totalRankBonuses,rankRewardHpSql,rankProgress,rankThreshold,RANK_AREAS,RANK_REWARDS} from '../../lib/ranks.mjs';

const configSql="(SELECT config_json FROM rank_settings WHERE id=1)";
const rankBaseHpSql=`MAX(1,COALESCE((SELECT player_max_hp FROM combat_settings WHERE id=1),100)
 + COALESCE((SELECT SUM(CAST(json_extract(value,'$.hp') AS INTEGER)) FROM json_each(${configSql},'$.tiers') WHERE CAST(key AS INTEGER)<players.rank_tier AND players.level>=65),0)
 + ${rankRewardHpSql()}
 + MIN(3000000,MAX(0,COALESCE((SELECT SUM(MIN(1000000,MAX(0,CAST(json_extract(e.value,'$.value') AS INTEGER)))) FROM player_items i,json_each(CASE WHEN json_valid(i.enchantments) THEN i.enchantments ELSE '[]' END) e WHERE i.player_id=players.id AND i.equipped=1 AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') AND json_extract(e.value,'$.kind')='hp'),0)))
 + CASE WHEN EXISTS(SELECT 1 FROM player_pets WHERE player_id=players.id AND kind='starter' AND equipped=1 AND acquired_at+259200>unixepoch()) THEN 350 ELSE 0 END)`;
const eligibleSql=RANK_AREAS.map(([area])=>`rank_${area}>=CAST(json_extract(${configSql},'$.requirements.${area}') AS INTEGER)`).join(' AND ');
const unlockSql=`UPDATE players SET rank_unlocked=COALESCE((SELECT json_group_array(reward) FROM (SELECT value AS reward FROM json_each(players.rank_unlocked) UNION SELECT json_extract(value,'$.reward') AS reward FROM json_each(${configSql},'$.tiers') WHERE CAST(key AS INTEGER)<players.rank_tier AND json_extract(value,'$.reward')!='')),'[]') WHERE id=NEW.id;`;
function rankMaxHpSql(db){return db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='guild_skills'").get()?`(${rankBaseHpSql}+COALESCE((SELECT CASE s.active_level WHEN 1 THEN 250 WHEN 2 THEN 350 WHEN 3 THEN 500 ELSE 0 END FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=players.id AND s.active_until>unixepoch()*1000),0))`:rankBaseHpSql;}
export function ensureRankSchema(db){
 const hpBase='('+rankMaxHpSql(db)+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='ration_until')?'+CASE WHEN players.ration_until>unixepoch()*1000 THEN 200 ELSE 0 END':'')+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='set_hp')?'+players.set_hp':'')+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='pumpkin_enabled499')?'+CASE WHEN '+pumpkinSql499()+' THEN 1000 ELSE 0 END':'')+')';const hpSql='MAX(1,CAST(ROUND('+hpBase+'*'+"(1+CASE WHEN players.level>=65 AND players.rank_tier>0 THEN players.rune_hp_level*COALESCE((SELECT json_extract(config_json,'$.bonusPerLevel') FROM rune_settings WHERE id=1),0.2)/100.0 ELSE 0 END)"+') AS INTEGER))';
 db.exec('BEGIN IMMEDIATE');try{
  db.exec(`CREATE TABLE IF NOT EXISTS rank_settings(id INTEGER PRIMARY KEY CHECK(id=1),config_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1)`);
  db.prepare('INSERT OR IGNORE INTO rank_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultRankConfig()));
  const cols=new Set(db.prepare('PRAGMA table_info(players)').all().map(r=>r.name));
  for(const key of ['rank_tier','rank_xp','rank_started_at',...RANK_AREAS.map(([a])=>`rank_${a}`)])if(!cols.has(key))db.exec(`ALTER TABLE players ADD COLUMN ${key} INTEGER NOT NULL DEFAULT 0`);
  for(const [key,def] of [['rank_cosmetics','{}'],['rank_unlocked','[]']])if(!cols.has(key))db.exec(`ALTER TABLE players ADD COLUMN ${key} TEXT NOT NULL DEFAULT '${def}'`);
  db.exec(`UPDATE players SET rank_started_at=unixepoch() WHERE level>=65 AND rank_started_at=0;
   CREATE INDEX IF NOT EXISTS idx_players_rank ON players(rank_tier DESC,rank_xp DESC,id) WHERE rank_tier>0;
   CREATE TRIGGER IF NOT EXISTS rank_level_entry AFTER UPDATE OF level ON players WHEN NEW.level>=65 AND NEW.rank_started_at=0 BEGIN UPDATE players SET rank_started_at=unixepoch() WHERE id=NEW.id; END;
   CREATE TRIGGER IF NOT EXISTS rank_level_reset AFTER UPDATE OF level ON players WHEN NEW.level<65 AND OLD.level>=65 BEGIN UPDATE players SET rank_tier=0,rank_xp=0,rank_started_at=0,rank_forest=0,rank_frozen=0,rank_black=0,rank_ancient=0,rank_cosmetics='{}' WHERE id=NEW.id; END;
   CREATE TRIGGER IF NOT EXISTS rank_normal_kill AFTER INSERT ON normal_reward_claims
   WHEN EXISTS(SELECT 1 FROM players p JOIN monsters m ON m.id=NEW.monster_id JOIN normal_defeats d ON d.monster_id=NEW.monster_id AND d.spawn_round=NEW.spawn_round WHERE p.id=NEW.player_id AND p.level>=65 AND p.rank_tier=0 AND d.defeated_at>=p.rank_started_at AND m.is_boss=0 AND m.is_stone=0 AND m.summoned=0 AND m.variant NOT IN ('frost_boss','frost_water','ancient_boss') AND m.area IN ('forest','frozen','black','ancient'))
   BEGIN UPDATE players SET ${RANK_AREAS.map(([a])=>`rank_${a}=MIN(100000,rank_${a}+CASE WHEN (SELECT area FROM monsters WHERE id=NEW.monster_id)='${a}' THEN 1 ELSE 0 END)`).join(',')} WHERE id=NEW.player_id; END;
   CREATE TRIGGER IF NOT EXISTS rank_quest_complete AFTER UPDATE OF rank_forest,rank_frozen,rank_black,rank_ancient ON players WHEN NEW.level>=65 AND NEW.rank_tier=0 AND ${eligibleSql.replace(/\brank_(forest|frozen|black|ancient)\b/g,'NEW.rank_$1')}
   BEGIN UPDATE players SET rank_tier=1,rank_xp=0 WHERE id=NEW.id; END;
   DROP TRIGGER IF EXISTS rank_xp_advance;
   CREATE TRIGGER rank_xp_advance AFTER UPDATE OF rank_xp ON players WHEN NEW.level>=65 AND NEW.rank_tier>0 AND NEW.rank_xp>OLD.rank_xp
   BEGIN UPDATE players SET rank_tier=MAX(rank_tier,COALESCE((SELECT MAX(tier) FROM (SELECT CAST(key AS INTEGER)+1 AS tier,SUM(CAST(json_extract(value,'$.xp') AS INTEGER)) OVER(ORDER BY CAST(key AS INTEGER)) AS threshold FROM json_each(${configSql},'$.tiers')) WHERE threshold<=NEW.rank_xp),1)) WHERE id=NEW.id; END;
   DROP TRIGGER IF EXISTS rank_tier_changed;
   CREATE TRIGGER rank_tier_changed AFTER UPDATE OF rank_tier ON players WHEN NEW.rank_tier!=OLD.rank_tier
   BEGIN ${unlockSql} UPDATE players SET max_hp=${hpSql},hp=MIN(hp,${hpSql}),hp_revision=hp_revision+1 WHERE id=NEW.id; END;`);
  db.exec(`DROP TRIGGER IF EXISTS rank_reward_equipment_changed;
   CREATE TRIGGER rank_reward_equipment_changed AFTER UPDATE OF rank_cosmetics,rank_unlocked ON players
   WHEN NEW.rank_cosmetics!=OLD.rank_cosmetics OR NEW.rank_unlocked!=OLD.rank_unlocked
   BEGIN UPDATE players SET max_hp=${hpSql},hp=MIN(hp,${hpSql}),hp_revision=hp_revision+1 WHERE id=NEW.id; END;
   UPDATE players SET max_hp=${hpSql},hp=MIN(hp,${hpSql}),hp_revision=hp_revision+1
   WHERE rank_tier>0 AND max_hp!=${hpSql};`);
  db.exec(`WITH thresholds505 AS MATERIALIZED (
    SELECT CAST(key AS INTEGER)+1 AS tier,
      SUM(CAST(json_extract(value,'$.xp') AS INTEGER)) OVER(ORDER BY CAST(key AS INTEGER)) AS threshold
    FROM json_each(${configSql},'$.tiers'))
   UPDATE players SET rank_tier=(SELECT MAX(tier) FROM thresholds505 WHERE threshold<=players.rank_xp)
   WHERE level>=65 AND rank_tier BETWEEN 1 AND 17
     AND EXISTS(SELECT 1 FROM thresholds505 WHERE tier>players.rank_tier AND threshold<=players.rank_xp);`);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}

export function createRanks(db){
 const hpBase='('+rankMaxHpSql(db)+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='ration_until')?'+CASE WHEN players.ration_until>unixepoch()*1000 THEN 200 ELSE 0 END':'')+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='set_hp')?'+players.set_hp':'')+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='pumpkin_enabled499')?'+CASE WHEN '+pumpkinSql499()+' THEN 1000 ELSE 0 END':'')+')';const hpSql='MAX(1,CAST(ROUND('+hpBase+'*'+"(1+CASE WHEN players.level>=65 AND players.rank_tier>0 THEN players.rune_hp_level*COALESCE((SELECT json_extract(config_json,'$.bonusPerLevel') FROM rune_settings WHERE id=1),0.2)/100.0 ELSE 0 END)"+') AS INTEGER))';
 let cached;
 const settings=()=>{if(!cached){const row=db.prepare('SELECT * FROM rank_settings WHERE id=1').get();cached={config:validateRankConfig(JSON.parse(row.config_json)),revision:row.revision};}return cached;};
 const fields='id,loadlab_run_id,level,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,rank_xp,rank_forest,rank_frozen,rank_black,rank_ancient,rank_cosmetics,rank_unlocked';
 const get=id=>{const p=db.prepare(`SELECT ${fields} FROM players WHERE id=?`).get(id);if(!p)throw new Error('Karakter bulunamadı.');return p;};
 const info=(p,privateState=true)=>{const tier=p.level>=65?p.rank_tier:0;return {tier,arenaWings:arenaWingsActive477(p),bonuses:totalRankBonuses(p,settings().config),cosmetics:tier?JSON.parse(p.rank_cosmetics):{},...(privateState?{xp:p.rank_xp,kills:Object.fromEntries(RANK_AREAS.map(([a])=>[a,p[`rank_${a}`]])),unlocked:JSON.parse(p.rank_unlocked)}:{})};};
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 return {
  settings,
  read(id){return {...info(get(id)),...settings()};},
  appearance(id){return info(get(id),false);},
  grant(id,tier,expectedTier,actor){return transaction(()=>{
   if(!Number.isSafeInteger(tier)||tier<1||tier>18)throw new Error('1–18 arasında bir rütbe kademesi seç.');
   if(typeof actor!=='string'||!actor.trim())throw new Error('Yönetici kimliği gerekli.');
   const p=get(id);
   if(p.level<65)throw new Error('Rütbe vermek için oyuncu 65. seviyede olmalı.');
   if(!Number.isSafeInteger(expectedTier)||expectedTier!==p.rank_tier)throw new Error('Oyuncunun rütbesi değişti. Paneli yenileyip tekrar dene.');
   if(tier===p.rank_tier)return info(p);
   const xp=rankThreshold(tier,settings().config);
   db.prepare('UPDATE players SET rank_tier=?,rank_xp=? WHERE id=?').run(tier,xp,id);
   db.prepare("INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms) SELECT ?,?,'grant_rank',COALESCE(account_id,''),?,? FROM players WHERE id=?").run(crypto.randomUUID(),actor.slice(0,160),JSON.stringify({playerId:id,previousTier:p.rank_tier,tier,previousXp:p.rank_xp,xp}),Date.now(),id);
   return info(get(id));
  });},
  bonuses(id){const p=db.prepare('SELECT level,rank_tier,rank_unlocked,rank_cosmetics FROM players WHERE id=?').get(id);return totalRankBonuses(p,settings().config);},
  project(rows,ownerId){if(!rows.length)return rows;const states=new Map(db.prepare(`SELECT ${fields} FROM players WHERE id IN (${rows.map(()=>'?').join(',')})`).all(...rows.map(p=>p.id)).map(p=>[p.id,p]));return rows.map(p=>{const rank=states.has(p.id)?info(states.get(p.id),p.id===ownerId):null;return {...p,...(p.id===ownerId&&states.has(p.id)?Object.fromEntries(['rune_attack_level','rune_defense_level','rune_hp_level'].map(k=>[k,states.get(p.id)[k]])):{}),...(p.equipped_armor_power!==undefined?{equipped_armor_power:p.equipped_armor_power+(rank?.bonuses.defense??0)}:{}),...(p.strong_players!==undefined?{strong_players:p.strong_players+(rank?.bonuses.pvp??0)}:{}),rank};});},
  equip(id,slot,reward){return transaction(()=>{const p=get(id),unlocked=JSON.parse(p.rank_unlocked);if(p.level<65||p.rank_tier<1)throw new Error('Önce Savaşçının Yolu görevini tamamla.');if(!['weapon','cape','companion','wings','costume'].includes(slot)||typeof reward!=='string'||reward&&(!unlocked.includes(reward)||!RANK_REWARDS.some(r=>r.id===reward&&r.slot===slot)))throw new Error('Bu görünüm henüz açılmadı.');const selected={...JSON.parse(p.rank_cosmetics),[slot]:reward};db.prepare('UPDATE players SET rank_cosmetics=? WHERE id=?').run(JSON.stringify(selected),id);return info(get(id));});},
  ranking(id){const rows=db.prepare('SELECT id,name,rank_tier AS tier,rank_xp AS xp FROM players WHERE rank_tier>0 AND level>=65 AND is_gm=0 AND loadlab_run_id=\'\' ORDER BY rank_tier DESC,rank_xp DESC,id LIMIT 20').all();const p=get(id);const position=p.loadlab_run_id===''&&p.rank_tier>0?db.prepare('SELECT COUNT(*)+1 AS position FROM players WHERE rank_tier>0 AND level>=65 AND is_gm=0 AND loadlab_run_id=\'\' AND (rank_tier>? OR(rank_tier=? AND (rank_xp>? OR(rank_xp=? AND id<?))))').get(p.rank_tier,p.rank_tier,p.rank_xp,p.rank_xp,id).position:null;return {rows,position};},
  save(input,revision){const next=validateRankConfig(input),old=settings();if(revision!==old.revision)throw new Error('Ayarlar başka bir oturumda değişti. Güncel tabloyu yükle.');try{return transaction(()=>{
   const changed=db.prepare('UPDATE rank_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(next),revision);if(!changed.changes)throw new Error('Ayarlar değişti; yeniden yükle.');
   for(const p of db.prepare('SELECT id,rank_tier,rank_xp FROM players WHERE rank_tier>0').all()){
    const progress=rankProgress(p.rank_tier,p.rank_xp,old.config),cost=next.tiers[p.rank_tier]?.xp??0;
    const xp=rankThreshold(p.rank_tier,next)+(p.rank_tier>=18?Math.max(0,p.rank_xp-rankThreshold(18,old.config)):Math.min(cost-1,Math.floor(progress.earned/Math.max(1,progress.cost)*cost)));
    db.prepare('UPDATE players SET rank_xp=? WHERE id=?').run(xp,p.id);
   }
   db.exec(`UPDATE players SET rank_forest=rank_forest WHERE level>=65 AND rank_tier=0;
    UPDATE players SET max_hp=${hpSql},hp=MIN(hp,${hpSql}),hp_revision=hp_revision+1 WHERE rank_tier>0;
    UPDATE players SET rank_unlocked=COALESCE((SELECT json_group_array(reward) FROM (SELECT value AS reward FROM json_each(players.rank_unlocked) UNION SELECT json_extract(value,'$.reward') FROM json_each(${configSql},'$.tiers') WHERE CAST(key AS INTEGER)<players.rank_tier AND json_extract(value,'$.reward')!='')),'[]') WHERE rank_tier>0;`);
   cached={config:next,revision:revision+1};return cached;
  });}catch(e){cached=undefined;throw e;}}
 };
}
