import {isMainThread,parentPort,workerData,Worker} from 'node:worker_threads';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';

// Trusted, fixed query families. Neither SQL nor bindings appear in diagnostics.
export const GUILD_READ_SQL=Object.freeze({
 guild:`SELECT g.*,m.can_invite FROM guild_members m JOIN guilds g ON g.id=m.guild_id WHERE m.player_id=?`,
 invites:`SELECT i.id,i.expires_at,g.name,g.tax_rate,p.name AS sender FROM guild_invites i JOIN guilds g ON g.id=i.guild_id JOIN players p ON p.id=i.sender_id WHERE i.recipient_id=? AND i.expires_at>? ORDER BY i.expires_at DESC LIMIT 10`,
 challenges:`SELECT w.id,g.name FROM guild_wars w JOIN guilds g ON g.id=w.challenger JOIN guilds mine ON mine.id=w.defender WHERE mine.leader_id=? AND w.status='pending' AND w.expires_at>? ORDER BY w.created_at DESC LIMIT 10`,
 war:`SELECT a.*,w.challenger,w.defender,EXISTS(SELECT 1 FROM arena_match_players ap JOIN players p ON p.id=ap.player_id WHERE ap.match_id=a.id AND p.id=? AND (a.status='waiting' OR p.arena_match_id=a.id)) AS joined,(SELECT COUNT(*) FROM arena_match_players ap WHERE ap.match_id=a.id AND ap.team=1) AS approved_a,(SELECT COUNT(*) FROM arena_match_players ap WHERE ap.match_id=a.id AND ap.team=2) AS approved_b FROM guild_war_locks l JOIN guild_wars w ON w.id=l.war_id JOIN arena_matches a ON a.id=w.id WHERE l.guild_id=? AND w.status='active' AND a.status IN ('waiting','countdown','active') AND a.starts_at_ms+CASE WHEN a.status='waiting' THEN 0 ELSE 600000 END>?`,
 members:`SELECT p.id,p.name,p.level,p.role,p.last_seen,m.can_invite FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=? ORDER BY m.joined_at,p.id`,
 contributions:`WITH totals AS (SELECT player_id,SUM(amount) AS total FROM guild_ledger WHERE guild_id=? AND kind='tax' GROUP BY player_id),current_members AS (SELECT player_id FROM guild_members WHERE guild_id=?),participants AS (SELECT player_id FROM totals UNION SELECT player_id FROM current_members) SELECT u.player_id,COALESCE(p.name,'Eski oyuncu') AS name,COALESCE(t.total,0) AS total,CASE WHEN m.player_id IS NULL THEN 0 ELSE 1 END AS is_member FROM participants u LEFT JOIN players p ON p.id=u.player_id LEFT JOIN totals t ON t.player_id=u.player_id LEFT JOIN current_members m ON m.player_id=u.player_id ORDER BY total DESC,name,u.player_id`,
 monsters:`SELECT g.id,g.name,g.monster_kills,g.wars_won,(SELECT COUNT(*) FROM guild_members WHERE guild_id=g.id) AS members FROM guilds g ORDER BY monster_kills DESC,g.created_at,g.id LIMIT 50`,
 wins:`SELECT g.id,g.name,g.monster_kills,g.wars_won,(SELECT COUNT(*) FROM guild_members WHERE guild_id=g.id) AS members FROM guilds g ORDER BY wars_won DESC,g.created_at,g.id LIMIT 50`,
 settings:`SELECT guild_create_level,guild_create_gems FROM economy_settings WHERE id=1`
});
export function safeSqlDiagnostic(error,family){
 const stack=String(error?.stack??'').split('\n').slice(1,7).map(line=>{const m=line.match(/(?:file:\/\/)?([^\s()]+\.(?:m?js)):(\d+):(\d+)/);return m?path.basename(m[1])+':'+m[2]+':'+m[3]:null;}).filter(Boolean);
 return {event:'core511_sql_failure',operation:'guild_snapshot',family:Object.hasOwn(GUILD_READ_SQL,family)?family:'read_transaction',code:/^[A-Z0-9_]{1,40}$/.test(error?.code??'')?error.code:'SQL_ERROR',sqliteCode:Number.isInteger(error?.errcode)?error.errcode:null,stack,retried:false};
}
export class GuildSnapshotQueries {
 constructor(sql,{diagnostic=()=>{}}={}){this.sql=sql;this.statements=new Map();this.failed=new Set();this.diagnostic=diagnostic;}
 run(family,...params){
  if(this.failed.has(family))throw Object.assign(Error('guild_read_unavailable'),{code:'guild_read_unavailable'});
  try{let stmt=this.statements.get(family);if(!stmt){stmt=this.sql.prepare(GUILD_READ_SQL[family]);this.statements.set(family,stmt);}return stmt.all(...params);}
  catch(error){this.failed.add(family);this.diagnostic(safeSqlDiagnostic(error,family));throw Object.assign(Error('guild_read_unavailable'),{code:'guild_read_unavailable'});}
 }
 snapshot(playerId,details=true,includeContributions=true,nowMs=Date.now()){
  const now=Math.floor(nowMs/1000);this.sql.exec('BEGIN');try{
   const guild=this.run('guild',playerId)[0]??null,gid=String(guild?.id??'');
   const result={guild,invites:this.run('invites',playerId,now),challenges:this.run('challenges',playerId,now),war:this.run('war',playerId,gid,nowMs)[0]??null,members:[],ledger:[],contributions:[],rankings:{monsters:[],wins:[]},settings:null,serverTime:now};
   if(details){result.members=this.run('members',gid);if(includeContributions&&gid)result.contributions=this.run('contributions',gid,gid);result.rankings={monsters:this.run('monsters'),wins:this.run('wins')};result.settings=this.run('settings')[0]??null;}
   this.sql.exec('COMMIT');return result;
  }catch(error){if(this.sql.isTransaction)this.sql.exec('ROLLBACK');throw error;}
 }
}
if(!isMainThread&&workerData?.guildSnapshotR19){
 const sql=new DatabaseSync(workerData.file,{readOnly:true});sql.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=1000');
 const reader=new GuildSnapshotQueries(sql,{diagnostic:data=>parentPort.postMessage({diagnostic:data})});parentPort.postMessage({ready:true});
 parentPort.on('message',m=>{try{const rows=reader.snapshot(m.playerId,m.details,m.includeContributions);if(Buffer.byteLength(JSON.stringify(rows))>2*1024*1024)throw Error('guild_read_too_large');parentPort.postMessage({id:m.id,rows});}catch{parentPort.postMessage({id:m.id,error:'guild_read_unavailable'});}});
}
// A distinct read-only thread: guild polling never enters either the durable
// writer queue or the ownership/ACK reader queue. Failed jobs are not replayed.
export class GuildSnapshotReader {
 constructor(file,{timeoutMs=5000,diagnostic=data=>console.error(JSON.stringify(data))}={}){this.worker=new Worker(new URL(import.meta.url),{workerData:{guildSnapshotR19:true,file},resourceLimits:{maxOldGenerationSizeMb:64}});this.pending=new Map();this.shared=new Map();this.sequence=0;this.closed=false;this.ready=false;this.timeoutMs=timeoutMs;this.worker.on('message',m=>{if(m.ready){this.ready=true;return;}if(m.diagnostic){diagnostic(m.diagnostic);return;}const p=this.pending.get(m.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(Error(m.error)):p.resolve(m.rows);});this.worker.on('error',error=>{diagnostic(safeSqlDiagnostic(error,'read_transaction'));this.fail();});this.worker.on('exit',()=>this.fail());}
 fail(){this.closed=true;this.ready=false;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('guild_read_unavailable'));}this.pending.clear();}
 read(playerId,details=true,includeContributions=true){if(this.closed)return Promise.reject(Error('guild_read_unavailable'));const key=JSON.stringify([playerId,!!details,!!includeContributions]);if(this.shared.has(key))return this.shared.get(key);if(this.pending.size>=16)return Promise.reject(Error('guild_read_busy'));const id=++this.sequence;
  const task=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.fail();void this.worker.terminate();},this.timeoutMs);this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({id,playerId,details:!!details,includeContributions:!!includeContributions});}).finally(()=>this.shared.delete(key));this.shared.set(key,task);return task;
 }
 async close(){this.fail();await this.worker.terminate();}
}
