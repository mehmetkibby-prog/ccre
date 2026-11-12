// Two additive player counters: no new periodic reads, timers or room snapshots.
export const GROUP_DAILY_LIMIT494=15;
export const groupDay494=(now=Date.now())=>Math.floor((now+10800000)/86400000);
const exhausted=()=>new Error('Çekirdeğin Kalbi: bir üye günlük 15 giriş hakkını kullandı. Haklar Türkiye saatiyle 00.00’da yenilenir.');
export function assertGroupLimit494(player,now){
 if(Number(player.group_dungeon_day494)===groupDay494(now)&&Number(player.group_dungeon_entries494)>=GROUP_DAILY_LIMIT494)throw exhausted();
}
export function ensureGroupLimit494(db,now=Date.now()){
 if(!db.isTransaction)throw new Error('group_limit494_migration_transaction_required');
 const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
 const fresh=!columns.has('group_dungeon_day494')&&!columns.has('group_dungeon_entries494');
 for(const key of ['group_dungeon_day494','group_dungeon_entries494'])if(!columns.has(key))db.exec(`ALTER TABLE players ADD COLUMN ${key} INTEGER NOT NULL DEFAULT 0 CHECK(${key}>=0)`);
 // Backfill today's already-started group rooms once. A reconnect, wipe or
 // pending readiness never becomes another entry. Old code keeps these columns.
 if(fresh){
  const day=groupDay494(now),start=day*86400000-10800000;
  const counts=new Map();
  for(const row of db.prepare('SELECT state FROM dungeon_runs WHERE updated_at>=?').all(start)){
   const run=JSON.parse(row.state);
   if(run.mode==='solo'||!(Number(run.started)>=start&&Number(run.started)<start+86400000))continue;
   for(const id of new Set((run.members??[]).map(m=>m.id)))counts.set(id,(counts.get(id)??0)+1);
  }
  const update=db.prepare('UPDATE players SET group_dungeon_day494=?,group_dungeon_entries494=? WHERE id=?');
  for(const[id,count]of counts)update.run(day,Math.min(count,GROUP_DAILY_LIMIT494),id);
 }
}
export function consumeGroupLimit494(db,ids,now){
 if(!db.isTransaction)throw new Error('group_limit494_start_transaction_required');
 if(ids.length<1||ids.length>5||new Set(ids).size!==ids.length)throw new Error('group_limit494_roster_invalid');
 const day=groupDay494(now);
 const update=db.prepare(`UPDATE players SET group_dungeon_entries494=CASE WHEN group_dungeon_day494=? THEN group_dungeon_entries494+1 ELSE 1 END,group_dungeon_day494=? WHERE id=? AND (group_dungeon_day494<>? OR group_dungeon_entries494<15)`);
 for(const id of ids)if(update.run(day,day,id,day).changes!==1)throw exhausted();
}
