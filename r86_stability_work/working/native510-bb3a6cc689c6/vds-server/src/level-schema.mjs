import {temporaryLevelCosts,REBASE_XP_SQL} from '../../lib/level-progression.mjs';
export function ensureLevelCurve(database) {
 database.exec('BEGIN IMMEDIATE');
 try {
  const columns=new Set(database.prepare('PRAGMA table_info(game_settings)').all().map(r=>r.name));
  if(!columns.has('xp_curve_json')) database.exec("ALTER TABLE game_settings ADD COLUMN xp_curve_json TEXT NOT NULL DEFAULT ''");
  const current=database.prepare('SELECT xp_base_cost,xp_growth_per_level,xp_curve_json FROM game_settings WHERE id=1').get();
  if(!current) throw new Error('Existing game settings missing; level upgrade aborted.');
  if(!current.xp_curve_json) {
   const old=Array.from({length:49},(_,i)=>Math.max(1,Math.round(current.xp_base_cost+i*current.xp_growth_per_level)));
   const next=JSON.stringify(temporaryLevelCosts());
   database.prepare(REBASE_XP_SQL).run(JSON.stringify(old),next,'');
   database.prepare('UPDATE game_settings SET xp_curve_json=? WHERE id=1').run(next);
  }
  database.exec('CREATE TABLE IF NOT EXISTS level_balance_updates(id TEXT PRIMARY KEY)');
  if(!database.prepare("SELECT id FROM level_balance_updates WHERE id='v214-temporary'").get()){
   const old=database.prepare('SELECT xp_curve_json FROM game_settings WHERE id=1').get().xp_curve_json;
   const next=JSON.stringify(temporaryLevelCosts());
   if(old!==next){database.prepare(REBASE_XP_SQL).run(old,next,old);database.prepare('UPDATE game_settings SET xp_curve_json=? WHERE id=1').run(next);}
   database.prepare("INSERT INTO level_balance_updates(id) VALUES('v214-temporary')").run();
  }
  database.exec('COMMIT');
 }catch(error){database.exec('ROLLBACK');throw error;}
}
