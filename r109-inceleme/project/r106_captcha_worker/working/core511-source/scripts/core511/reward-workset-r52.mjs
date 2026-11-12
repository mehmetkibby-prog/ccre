// A statement-local XP eligibility workset. No player/party/claim row survives
// the SQL statement: the next kill sees every write and trigger from this one.
// All native amounts, guards, claims, UPDATE/RETURNING and bind positions stay
// byte-identical. Unknown query shapes use the original SQL.
const PREFIX='WITH RECURSIVE reward_input(seen_since,xp_amount) AS (SELECT ?,?), sources AS (';
const SOURCE='SELECT p.* FROM monster_participants mp JOIN players p ON p.id=mp.player_id';
const ALLY='JOIN players ally ON ally.id=team.player_id';
const COLUMNS=['id','hp','last_seen','movement_checked_at_ms','last_monster_hit_at','area','channel','arena_match_id','x','y'];
const ALLOWED=new Set(COLUMNS),wrappers=new WeakMap();
export function rewardWorksetSqlR52(sql){
 if(typeof sql!=='string'||sql.length>65536||!sql.startsWith(PREFIX))return sql;
 const boosted=sql.indexOf('boosted AS MATERIALIZED('),sourceAt=sql.indexOf(SOURCE),allyAt=sql.indexOf(ALLY);
 if(boosted<0||sourceAt<0||allyAt<0||sql.indexOf(SOURCE,sourceAt+1)!==-1||sql.indexOf(ALLY,allyAt+1)!==-1||!sql.includes('FROM sources s LEFT JOIN party_members pm ON pm.player_id=s.id'))return sql;
 // Fail closed if a future native query consumes another source column.
 const eligibility=sql.slice(0,boosted);
 if(/\b(?:source|s|sources)\.\*/.test(eligibility))return sql;
 for(const match of eligibility.matchAll(/\b(?:source|s|sources)\.([A-Za-z_][A-Za-z_0-9]*)/g))if(!ALLOWED.has(match[1]))return sql;
 return sql.replace(PREFIX,PREFIX.replace('sources AS (','sources AS MATERIALIZED ('))
  .replace(SOURCE,'SELECT '+COLUMNS.map(name=>'p.'+name).join(',')+' FROM monster_participants mp JOIN players p ON p.id=mp.player_id')
  // SQLite CROSS JOIN keeps the small party roster before its PK player read;
  // the identical ON predicate retains the original inner-join semantics.
  .replace(ALLY,'CROSS '+ALLY);
}
export function rewardWorksetDatabaseR52(database){
 let wrapped=wrappers.get(database);if(wrapped)return wrapped;
 const shapes=new Map();
 wrapped={...database,prepare(sql){
  if(typeof sql!=='string'||!sql.startsWith(PREFIX)||sql.length>65536)return database.prepare(sql);
  let optimized=shapes.get(sql);
  if(optimized===undefined){optimized=rewardWorksetSqlR52(sql);if(shapes.size===16)shapes.delete(shapes.keys().next().value);shapes.set(sql,optimized);}
  // Return the original native statement object: its private batch handle,
  // savepoint/error behavior and parameter objects are preserved.
  return database.prepare(optimized);
 }};
 wrappers.set(database,wrapped);return wrapped;
}
