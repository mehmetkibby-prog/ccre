import {rewardPeerCacheR531,rewardEmptyXpR531} from './r531-options.mjs';
import {withNativeStatementExecutorR531} from './retaliation-writer.mjs';

const states=new WeakMap(),watch=['hp','last_seen','movement_checked_at_ms','last_monster_hit_at','area','channel','arena_match_id','x','y'];
const columns=['id',...watch];
const peerBody=`SELECT source.id AS source_id,ally.id AS ally_id FROM sources source
    JOIN party_members mine ON mine.player_id=source.id
    JOIN party_members team ON team.party_id=mine.party_id AND team.player_id<>source.id
    JOIN players ally ON ally.id=team.player_id
    WHERE 1=1 AND source.hp>0 AND MAX(source.last_seen,CAST(source.movement_checked_at_ms/1000 AS INTEGER),CAST(source.last_monster_hit_at/1000 AS INTEGER))>=(SELECT seen_since FROM reward_input) AND ally.hp>0 AND MAX(ally.last_seen,CAST(ally.movement_checked_at_ms/1000 AS INTEGER),CAST(ally.last_monster_hit_at/1000 AS INTEGER))>=(SELECT seen_since FROM reward_input)
    AND ally.area=source.area AND ally.channel=source.channel AND ally.arena_match_id=source.arena_match_id
    AND (ally.x-source.x)*(ally.x-source.x)+(ally.y-source.y)*(ally.y-source.y)<=5760000`;
const normalize=s=>s.replace(/\s+/g,' ').trim();
const expectedPeer=normalize(peerBody),expectedCrossPeer=normalize(peerBody.replace('JOIN players ally','CROSS JOIN players ally'));
const rewritten=new Map();
function shape(query){
 if(typeof query!=='string'||query.length>65536||!/^WITH (?:RECURSIVE )?reward_input\(seen_since,xp_amount\) AS \(SELECT \?,\?\), sources AS (?:MATERIALIZED )?\(/.test(query))return null;
 if(rewritten.has(query))return rewritten.get(query);
 const insert=query.includes('INSERT OR IGNORE INTO monster_xp_claims(monster_id,spawn_round,player_id,claim_token,awarded_at)'),update=query.includes('UPDATE players SET ')&&/WHERE id IN\(SELECT player_id FROM monster_xp_claims WHERE claim_token=\?\) AND id IN\(SELECT id FROM boosted\) RETURNING id,xp,level(?:,rank_xp)?$/.test(query);
 const start=query.indexOf('peers AS ('),end=start<0?-1:query.indexOf('<=5760000)',start);
 let value=null;
 if((insert||update)&&start>=0&&end>=0){const body=query.slice(start+'peers AS ('.length,end+'<=5760000'.length),n=normalize(body);
  if(n===expectedPeer||n===expectedCrossPeer){const cached=`SELECT source.id AS source_id,cached.ally_id AS ally_id FROM sources source JOIN temp.kernel511_reward_peers_r531 cached ON cached.source_id=source.id UNION ALL ${body} AND NOT EXISTS(SELECT 1 FROM temp.kernel511_reward_sources_r531 covered WHERE covered.id=source.id)`;
   value={kind:insert?'insert':'update',sql:query.slice(0,start)+'peers AS ('+cached+query.slice(end+'<=5760000'.length)};
   if(update){const amounts=query.indexOf('amounts AS('),prefix=query.slice(0,amounts).trimEnd();
    if(amounts>0&&prefix.endsWith(',')&&!/\b(?:sources|peers|buckets)\b/.test(query.slice(amounts))){
     value.sourceSql=query.slice(0,start).trimEnd().slice(0,-1)+' SELECT id FROM sources ORDER BY id LIMIT 129';
     value.recipeSql=prefix.slice(0,-1)+' SELECT bucket,player_id,member_count,member_rank FROM ranked LIMIT 8193';
     value.fastSql='WITH RECURSIVE reward_input(seen_since,xp_amount) AS (SELECT ?,?), unused_token_r531 AS (SELECT ?), ranked AS(SELECT bucket,player_id,member_count,member_rank FROM temp.kernel511_reward_ranked_r531 WHERE recipe_id=(SELECT recipe FROM temp.kernel511_reward_state_r531)), '+query.slice(amounts);
    }
   }
  }
 }
 if(rewritten.size>=32)rewritten.delete(rewritten.keys().next().value);rewritten.set(query,value);return value;
}
// Compile-only boot caller: the existing pure recognizer returns exact SQL
// strings, never rows/bindings, a reward scope, a transaction or an executor.
export function rewardSqlCompilationShapesR108(query){
 if(!rewardPeerCacheR531)return [];
 const value=shape(query);if(!value)return [];
 return [...new Set([value.sql,value.sourceSql,value.recipeSql,value.fastSql].filter(Boolean))];
}
export function initializeRewardSqlR531(sql){
 if((!rewardPeerCacheR531&&!rewardEmptyXpR531)||states.has(sql))return;
 if(rewardPeerCacheR531){
  sql.exec(`CREATE TEMP TABLE kernel511_reward_state_r531(active INTEGER NOT NULL,dirty INTEGER NOT NULL,recipe INTEGER);INSERT INTO kernel511_reward_state_r531 VALUES(0,1,NULL);
   CREATE TEMP TABLE kernel511_reward_sources_r531(id TEXT PRIMARY KEY) WITHOUT ROWID;
   CREATE TEMP TABLE kernel511_reward_peers_r531(source_id TEXT NOT NULL,ally_id TEXT NOT NULL,PRIMARY KEY(source_id,ally_id)) WITHOUT ROWID;
   CREATE TEMP TABLE kernel511_reward_recipes_r531(id INTEGER PRIMARY KEY,source_key TEXT NOT NULL UNIQUE);
   CREATE TEMP TABLE kernel511_reward_ranked_r531(recipe_id INTEGER NOT NULL,bucket TEXT NOT NULL,player_id TEXT NOT NULL,member_count INTEGER NOT NULL,member_rank INTEGER NOT NULL,PRIMARY KEY(recipe_id,bucket,player_id)) WITHOUT ROWID;`);
  const mark='UPDATE kernel511_reward_state_r531 SET dirty=1 WHERE active=1 AND dirty=0;';
  sql.exec(`CREATE TEMP TRIGGER kernel511_reward_player_change_r531 AFTER UPDATE OF ${columns.join(',')} ON main.players WHEN ${columns.map(k=>'OLD.'+k+' IS NOT NEW.'+k).join(' OR ')} BEGIN ${mark} END;`);
  for(const table of ['players','party_members'])for(const event of ['INSERT','DELETE',...(table==='party_members'?['UPDATE']:[])])sql.exec(`CREATE TEMP TRIGGER kernel511_reward_${table}_${event}_r531 AFTER ${event} ON main.${table} BEGIN ${mark} END;`);
 }
 states.set(sql,{active:false,statements:new Map(),statementBytes:0,stats:{scopes:0,builds:0,rewrites:0,recipeBuilds:0,recipeHits:0,emptyXp:0,fallbacks:0,maxSources:0,maxPeers:0}});
}
export function rewardSqlStatsR531(sql){return {...states.get(sql)?.stats};}
export function withRewardSqlR531(sql,payload,actor,work){
 const state=states.get(sql);if(!state||state.active||!sql.isTransaction||!Number.isSafeInteger(payload.nowMs))return work();
 const monsterIds=(payload.resources??[]).filter(x=>typeof x==='string'&&x.startsWith('monster:')).map(x=>x.slice(8));
 if(monsterIds.length>1024)return work();
 const seen=Math.floor(payload.nowMs/1000)-30,stats=state.stats;state.active=true;stats.scopes++;
 let emptyToken=null,peersUsable=true;
 // These private, synchronous internal statements never escape this scope.
 // Keep only handles, never bindings or result rows; SQLite recompiles a handle
 // on schema change. A prepared-cache facade can be uncached outside its own
 // module's write scope, so using it here would recompile the large XP SQL.
 const prepare=query=>{let statement=state.statements.get(query);if(statement)return statement;statement=sql.prepare(query);const bytes=query.length*2;if(bytes<=1048576){while(state.statements.size>=128||state.statementBytes+bytes>1048576){const key=state.statements.keys().next().value;state.statements.delete(key);state.statementBytes-=key.length*2;}state.statements.set(query,statement);state.statementBytes+=bytes;}return statement;};
 const build=()=>{
  if(!peersUsable)return false;
  if(!prepare('SELECT dirty FROM temp.kernel511_reward_state_r531').get().dirty)return true;
  const sources=prepare(`SELECT DISTINCT id FROM (SELECT ? AS id UNION SELECT mp.player_id FROM json_each(?) target JOIN monsters m ON m.id=target.value JOIN monster_participants mp ON mp.monster_id=m.id AND mp.spawn_round=m.spawn_round) LIMIT 129`).all(actor,JSON.stringify(monsterIds));
  if(sources.length>128){peersUsable=false;stats.fallbacks++;return false;}
  sql.exec('DELETE FROM temp.kernel511_reward_sources_r531;DELETE FROM temp.kernel511_reward_peers_r531;DELETE FROM temp.kernel511_reward_recipes_r531;DELETE FROM temp.kernel511_reward_ranked_r531');
  prepare('INSERT INTO temp.kernel511_reward_sources_r531 SELECT value FROM json_each(?)').run(JSON.stringify(sources.map(x=>x.id)));
  const peers=prepare(`SELECT source.id AS source_id,ally.id AS ally_id FROM temp.kernel511_reward_sources_r531 ids JOIN players source ON source.id=ids.id JOIN party_members mine ON mine.player_id=source.id JOIN party_members team ON team.party_id=mine.party_id AND team.player_id<>source.id CROSS JOIN players ally ON ally.id=team.player_id
   WHERE source.hp>0 AND MAX(source.last_seen,CAST(source.movement_checked_at_ms/1000 AS INTEGER),CAST(source.last_monster_hit_at/1000 AS INTEGER))>=? AND ally.hp>0 AND MAX(ally.last_seen,CAST(ally.movement_checked_at_ms/1000 AS INTEGER),CAST(ally.last_monster_hit_at/1000 AS INTEGER))>=?
    AND ally.area=source.area AND ally.channel=source.channel AND ally.arena_match_id=source.arena_match_id AND (ally.x-source.x)*(ally.x-source.x)+(ally.y-source.y)*(ally.y-source.y)<=5760000 LIMIT 8193`).all(seen,seen);
  if(peers.length>8192){peersUsable=false;stats.fallbacks++;return false;}
  prepare("INSERT INTO temp.kernel511_reward_peers_r531 SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]') FROM json_each(?)").run(JSON.stringify(peers.map(x=>[x.source_id,x.ally_id])));
  prepare('UPDATE temp.kernel511_reward_state_r531 SET dirty=0').run();stats.builds++;stats.maxSources=Math.max(stats.maxSources,sources.length);stats.maxPeers=Math.max(stats.maxPeers,peers.length);return true;
 };
 const execute=(statement,original)=>{
  const priorEmpty=emptyToken;emptyToken=null;
  const query=shape(statement.sql),params=statement.params;
  if(!query||params?.[0]!==seen)return original();
  if(query.kind==='update'&&params.length===5&&params[2]===params[4]&&rewardEmptyXpR531&&priorEmpty===params[2]){stats.emptyXp++;return {results:[]};}
  let result;
  if(rewardPeerCacheR531&&build()){
   stats.rewrites++;
   if(query.kind==='update'&&query.fastSql){
    const sources=prepare(query.sourceSql).all(...params.slice(0,3)),sourceKey=JSON.stringify(sources.map(x=>x.id));
    let recipe=sources.length>128?null:prepare('SELECT id FROM temp.kernel511_reward_recipes_r531 WHERE source_key=?').get(sourceKey);
    if(recipe)stats.recipeHits++;
    else if(sources.length<=128&&prepare('SELECT COUNT(*) n FROM temp.kernel511_reward_recipes_r531').get().n<32){
     const rows=prepare(query.recipeSql).all(...params.slice(0,3));
     if(rows.length<=8192&&rows.length+prepare('SELECT COUNT(*) n FROM temp.kernel511_reward_ranked_r531').get().n<=8192){
      recipe=prepare('INSERT INTO temp.kernel511_reward_recipes_r531(source_key) VALUES(?) RETURNING id').get(sourceKey);
      prepare("INSERT INTO temp.kernel511_reward_ranked_r531 SELECT ?,json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]'),json_extract(value,'$[3]') FROM json_each(?)").run(recipe.id,JSON.stringify(rows.map(x=>[x.bucket,x.player_id,x.member_count,x.member_rank])));stats.recipeBuilds++;
     }
    }
    if(recipe){prepare('UPDATE temp.kernel511_reward_state_r531 SET recipe=?').run(recipe.id);result={results:prepare(query.fastSql).all(...params)};}
   }
   result??=query.kind==='update'?{results:prepare(query.sql).all(...params)}:{results:[],meta:prepare(query.sql).run(...params)};
  }else result=original();
  if(rewardEmptyXpR531&&query.kind==='insert'&&params.length===10&&result.meta?.changes===0&&!prepare('SELECT 1 FROM monster_xp_claims WHERE claim_token=? LIMIT 1').get(params[8]))emptyToken=params[8];
  return result;
 };
 if(rewardPeerCacheR531)prepare('UPDATE temp.kernel511_reward_state_r531 SET active=1,dirty=1').run();
 try{return withNativeStatementExecutorR531(sql,execute,work);}
  finally{state.active=false;if(rewardPeerCacheR531)sql.exec('UPDATE temp.kernel511_reward_state_r531 SET active=0,dirty=1,recipe=NULL;DELETE FROM temp.kernel511_reward_sources_r531;DELETE FROM temp.kernel511_reward_peers_r531;DELETE FROM temp.kernel511_reward_recipes_r531;DELETE FROM temp.kernel511_reward_ranked_r531');}
}
