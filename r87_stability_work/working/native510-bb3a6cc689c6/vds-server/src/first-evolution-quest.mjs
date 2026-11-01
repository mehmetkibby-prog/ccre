import {battlePassXpSql} from '../../lib/battle-pass.mjs';
import {playerLevelCap} from '../../lib/expansion65.mjs';
import {levelCosts} from '../../lib/level-progression.mjs';
export function ensureEvolutionQuestSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS player_evolution_quest(player_id TEXT PRIMARY KEY,completed_at INTEGER NOT NULL,claimed_at INTEGER);
 CREATE TRIGGER IF NOT EXISTS first_weapon_evolution_quest AFTER UPDATE OF enchantments ON player_items
 WHEN NEW.kind='weapon' AND OLD.player_id=NEW.player_id AND json_valid(NEW.enchantments) AND json_valid(OLD.enchantments)
 AND COALESCE((SELECT json_extract(value,'$.value') FROM json_each(OLD.enchantments) WHERE json_extract(value,'$.kind')='evolution_level'),0)<1
 AND COALESCE((SELECT json_extract(value,'$.value') FROM json_each(NEW.enchantments) WHERE json_extract(value,'$.kind')='evolution_level'),0)=1
 BEGIN INSERT OR IGNORE INTO player_evolution_quest(player_id,completed_at) VALUES(NEW.player_id,unixepoch()); END;`);
 // Only recorded personal evolutions qualify retroactively, never traded gear.
 db.exec(`INSERT OR IGNORE INTO player_evolution_quest(player_id,completed_at)
 SELECT player_id,MIN(created_at) FROM messages WHERE player_name='EVRİM' AND announcement_request_id LIKE 'evolution-%-1' AND player_id IS NOT NULL GROUP BY player_id;`);
}
export function createEvolutionQuest(db){
 const player=id=>{const p=db.prepare('SELECT * FROM players WHERE id=?').get(id);if(!p)throw new Error('Karakter gerekli.');return p;};
 const read=id=>{player(id);const row=db.prepare('SELECT completed_at,claimed_at FROM player_evolution_quest WHERE player_id=?').get(id);const economy=db.prepare('SELECT evolution_1_kills,evolution_1_gems FROM economy_settings WHERE id=1').get();return{completed:!!row,claimed:row?.claimed_at!=null,requirements:{kills:Math.max(0,Math.floor(economy?.evolution_1_kills??100)),gems:Math.max(0,Math.floor(economy?.evolution_1_gems??100)),pearls:5},reward:{essence:100,xp:300}};};
 return {read,claim(id){if(globalThis.__colQuests438)throw new Error('İlk evrim ödülünü yeni Görevler menüsünden alabilirsin. Oyunu yenile.');db.exec('BEGIN IMMEDIATE');try{const p=player(id),state=read(id);if(!state.completed)throw new Error('Önce bir silahını ilk kez evrimleştir.');if(!state.claimed){const settings=db.prepare('SELECT * FROM game_settings WHERE id=1').get()??{};const costs=levelCosts(settings),cap=playerLevelCap(settings,p);const xp=p.level>=cap?p.xp:Math.min(p.xp+300,costs.slice(0,cap-1).reduce((a,b)=>a+b,0));let threshold=0,level=1;for(const cost of costs.slice(0,cap-1)){threshold+=cost;if(xp<threshold)break;level++;}db.prepare(`UPDATE players SET ${battlePassXpSql('300')},${globalThis.__colRanks?'rank_xp=CASE WHEN level>=65 AND rank_tier>0 THEN MIN(9000000000000,rank_xp+300) ELSE rank_xp END,':''}essence=essence+100,xp=?,level=? WHERE id=?`).run(xp,Math.max(p.level,level),id);db.prepare('UPDATE player_evolution_quest SET claimed_at=unixepoch() WHERE player_id=? AND claimed_at IS NULL').run(id);}const result=read(id);db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
