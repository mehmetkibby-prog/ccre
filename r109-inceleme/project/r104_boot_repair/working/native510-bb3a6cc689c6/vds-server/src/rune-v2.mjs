import {RUNE_V2_BOSS_AI_SCHEMA484} from './rune-v2-combat484.mjs';
import {migrateRuneV2BossLocation484} from './rune-v2-location484.mjs';
import {RUNE_V2_RANKING_SCHEMA483} from '../../lib/rune-v2-ranking.mjs';
import {restoreRuneV2Rollback483} from './rune-v2-rollback.mjs';
import {RUNE_V2_MOBS,RUNE_V2_SPAWNS,RUNE_V2_LOOT_LABELS,defaultRuneV2Config,validateRuneV2Config,runeV2MonsterKey} from '../../lib/rune-v2.mjs';
// Separate singleton, no alteration of original rune bonuses, inventory or rewards.
export function ensureRuneV2Schema(db){db.exec('BEGIN IMMEDIATE');try{
 db.exec(RUNE_V2_RANKING_SCHEMA483);
 db.exec(RUNE_V2_BOSS_AI_SCHEMA484);
 db.exec('CREATE TABLE IF NOT EXISTS rune_v2_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL)');
 db.prepare('INSERT OR IGNORE INTO rune_v2_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultRuneV2Config()));
 restoreRuneV2Rollback483(db);
 const config=validateRuneV2Config(JSON.parse(db.prepare('SELECT config_json FROM rune_v2_settings WHERE id=1').get().config_json));
 const insert=db.prepare("INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round) VALUES(?,?,?,?,?,?,?,'rune_v2',?,0,0,0,0,1)");
 // Named boss follows frozen/ancient boss per-monster reward ledger. is_boss=1
 // is reserved for the global world's shared boss_round ledger.
 for(let ch=1;ch<=3;ch++)for(const s of RUNE_V2_SPAWNS){const m=config.monsters[s.key];insert.run(`rune-v2-${s.key}-c${ch}-${s.slot}`,m.name,s.x,s.y,m.hp,m.hp,s.key==='boss'?'rune_v2_boss':'normal',ch);}
 migrateRuneV2BossLocation484(db);
 db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}}
export function createRuneV2(db){let current,snapshots;const refresh=()=>{
 const row=db.prepare('SELECT revision,config_json FROM rune_v2_settings WHERE id=1').get();if(!row||!Number.isSafeInteger(row.revision)||row.revision<1||row.revision>=Number.MAX_SAFE_INTEGER)throw Error('Karanlık Rün Sahili ayarları bulunamadı veya sürümü geçersiz.');
 const next={revision:row.revision,config:validateRuneV2Config(JSON.parse(row.config_json))};
 const nextSnapshots=Object.fromEntries(RUNE_V2_MOBS.map(m=>[m.key,{lootSourceKey:'rune_v2.'+m.key,lootProfileRevision:row.revision,lootProfileJson:JSON.stringify({version:1,key:'rune_v2.'+m.key,runeLoot:next.config.monsters[m.key].loot,...(m.key==='boss'?{runeBossPersonal502:true,runeV2Boss:{topDamageGems:next.config.monsters.boss.topDamageGems,revision:row.revision}}:{})})}]));
 current=next;snapshots=nextSnapshots;return current;
 };refresh();return {refresh,settings:()=>({...current,lootLabels:RUNE_V2_LOOT_LABELS}),monster:m=>current.config.monsters[runeV2MonsterKey(m)]??null,lootSnapshot:m=>snapshots[runeV2MonsterKey(m)]??null,
 save(input,revision){const next=validateRuneV2Config(input);if(!Number.isSafeInteger(revision)||revision<1||revision>=Number.MAX_SAFE_INTEGER)throw Error('Karanlık Rün Sahili ayar sürümü geçersiz.');const previous=current,previousSnapshots=snapshots;db.exec('BEGIN IMMEDIATE');try{
  if(!db.prepare('UPDATE rune_v2_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(next),revision).changes)throw Error('Karanlık Rün Sahili ayarları değişti. Paneli yenile.');
  // Ordinary monster HP remains next-respawn. Live canonical boss HP keeps
  // its current fraction when the configured maximum changes.
  const rename=db.prepare("UPDATE monsters SET name=? WHERE area='rune_v2' AND id=?");for(let ch=1;ch<=3;ch++)for(const point of RUNE_V2_SPAWNS)rename.run(next.monsters[point.key].name,`rune-v2-${point.key}-c${ch}-${point.slot}`);
  const hp=next.monsters.boss.hp;
  db.prepare("UPDATE monsters SET hp=MIN(?,MAX(1,CAST((hp*?+MAX(1,max_hp)-1)/MAX(1,max_hp) AS INTEGER))),max_hp=? WHERE id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1') AND id='rune-v2-boss-c'||channel||'-1' AND area='rune_v2' AND variant='rune_v2_boss' AND is_boss=0 AND is_stone=0 AND summoned=0 AND loadlab_run_id='' AND hp>0 AND max_hp<>?").run(hp,hp,hp,hp);
  refresh();db.exec('COMMIT');return current;
 }catch(error){if(db.isTransaction)db.exec('ROLLBACK');current=previous;snapshots=previousSnapshots;throw error;}}
 };}
