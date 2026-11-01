import {demand} from './contract.mjs';

export function ensureDungeonFinalizations(sql){
 sql.exec('CREATE TABLE IF NOT EXISTS kernel511_dungeon_finalizations(run_id TEXT PRIMARY KEY REFERENCES dungeon_runs(id) ON DELETE CASCADE,updated_at INTEGER NOT NULL)');
}
// Native complete rooms retain status=complete in their archived SQL image.
// Record the exact finish stamp without changing that image or its deadline.
export function recordDungeonFinalization(sql,id){
 demand(sql.isTransaction,'dungeon_finish_requires_atomic');
 const row=sql.prepare('SELECT updated_at FROM dungeon_runs WHERE id=?').get(id);demand(row&&!sql.prepare('SELECT 1 FROM dungeon_members WHERE run_id=?').get(id),'dungeon_finish_scope');
 sql.prepare('INSERT INTO kernel511_dungeon_finalizations(run_id,updated_at) VALUES(?,?) ON CONFLICT(run_id) DO UPDATE SET updated_at=excluded.updated_at').run(id,row.updated_at);
}
