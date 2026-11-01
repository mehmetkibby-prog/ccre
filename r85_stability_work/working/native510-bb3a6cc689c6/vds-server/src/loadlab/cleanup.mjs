import {randomUUID,createHash} from 'node:crypto';
import {setImmediate as immediate} from 'node:timers/promises';
import {references,rowPolicy,RETAIN_OPERATIONAL} from './policy.mjs';
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const fail=(code,details={})=>Object.assign(Error(code),{code,status:409,...details});
const BATCH=256,MAX_ENTITIES=300,MAX_ACCOUNTS=75;
const active=new WeakMap();
const cleanupPhases=new Set(['schema','ownership','drain','catalog','audit','rate_limits','records','shared','entities','forget','accounts','finalize','complete']);
let phaseEpoch477=-1,phaseCount477=0,phaseDropped477=0;
const phaseLog477=event=>{const minute=Math.floor(Date.now()/60000);if(minute!==phaseEpoch477){phaseEpoch477=minute;phaseCount477=0;}if(phaseCount477>=120){phaseDropped477++;return;}phaseCount477++;try{console.info('native_cleanup_phase',JSON.stringify({...event,droppedEvents:phaseDropped477,droppedScope:'process-lifetime'}));}catch{}};
function phaseTrace(){let previous=performance.now(),phase='schema';return {set(next){const at=performance.now();if(cleanupPhases.has(phase))phaseLog477({version:1,pid:process.pid,phase,atMs:Date.now(),elapsedMs:Math.round((at-previous)*1000)/1000});phase=next;previous=at;if(next==='complete')phaseLog477({version:1,pid:process.pid,phase:'complete',event:'completed',atMs:Date.now(),elapsedMs:0});},fail(){phaseLog477({version:1,pid:process.pid,phase,event:'failed',atMs:Date.now(),elapsedMs:Math.round((performance.now()-previous)*1000)/1000});}};}
export function ensureLoadLabCleanupSchema(db){db.exec('CREATE TABLE IF NOT EXISTS loadlab_cleanup_shared_v1(run_id TEXT PRIMARY KEY NOT NULL,token TEXT NOT NULL,ids_json TEXT NOT NULL,rounds_json TEXT NOT NULL,status TEXT NOT NULL,descriptors_json TEXT NOT NULL)');if(!db.prepare('PRAGMA table_info(loadlab_cleanup_shared_v1)').all().some(c=>c.name==='descriptors_json'))db.exec("ALTER TABLE loadlab_cleanup_shared_v1 ADD COLUMN descriptors_json TEXT NOT NULL DEFAULT '[]'");}
function sharedJournal(db,runId){const row=db.prepare('SELECT * FROM loadlab_cleanup_shared_v1 WHERE run_id=?').get(runId);if(!row)return null;const ids=JSON.parse(row.ids_json),rounds=JSON.parse(row.rounds_json),descriptors=JSON.parse(row.descriptors_json);if(!Array.isArray(ids)||ids.length>225||ids.some(id=>typeof id!=="string")||!Array.isArray(rounds)||rounds.length>230400||rounds.some(n=>!Number.isSafeInteger(n)||n<0)||!['prepared','deleted'].includes(row.status))throw fail('invalid_shared_cleanup_journal');if(!Array.isArray(descriptors)||descriptors.length!==ids.length||descriptors.some(d=>!ids.includes(d.id)||d.channel!==0||d.boss!==true||typeof d.sourceId!=='string'||!/^[A-Za-z0-9_.:-]{1,160}$/.test(d.sourceId)||!Number.isSafeInteger(d.roundStart)||d.roundStart<2**40||d.roundCount!==1024)||new Set(descriptors.map(d=>d.id)).size!==ids.length||rounds.some(n=>!descriptors.some(d=>n>=d.roundStart&&n<d.roundStart+d.roundCount)))throw fail('invalid_shared_cleanup_descriptors');return {...row,ids,rounds,descriptors};}
function catalog(db){
 return db.prepare("SELECT name,sql FROM main.sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(t=>{
  const columns=db.prepare('PRAGMA main.table_info('+quote(t.name)+')').all();
  const refs=references(t.name,columns.map(c=>c.name));
  for(const fk of db.prepare('PRAGMA main.foreign_key_list('+quote(t.name)+')').all()){
   const kind={players:'player',accounts:'account',monsters:'monster',world_drops:'drop'}[fk.table];
   if(kind&&!refs.some(r=>r.column===fk.from))refs.push({column:fk.from,kind});
  }
  const pk=columns.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name);
  const indexed=new Set(columns.filter(c=>c.pk===1).map(c=>c.name));
  for(const idx of db.prepare('PRAGMA main.index_list('+quote(t.name)+')').all())if(!idx.partial){const first=db.prepare('PRAGMA main.index_info('+quote(idx.name)+')').all()[0];if(first?.name)indexed.add(first.name);}
  return {...t,columns:columns.map(c=>c.name),refs,pk,indexed,rowid:!(/WITHOUT\s+ROWID/i.test(t.sql??''))};
 });
}
function ownSets(){return {player:new Set(),monster:new Set(),account:new Set(),round:new Set(),drop:new Set(),target:new Set()};}
function revoked(registry,runId){const status=registry.runStatus(runId);if(registry.active(runId)||status!==null&&status!=='revoked')throw fail('revoke_before_cleanup');}
function proof(db,registry,runId,rows){
 revoked(registry,runId);const own=ownSets(),descriptors=new Map(),tables=new Set(db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(r=>r.name));
 if(rows.length>MAX_ENTITIES)throw fail('ownership_count_invalid');
 for(const m of rows){
  if(m.run_id!==runId||!['player','monster'].includes(m.kind)||typeof m.id!=='string')throw fail('ownership_marker_invalid');
  const row=db.prepare('SELECT * FROM '+(m.kind==='player'?'players':'monsters')+' WHERE id=?').get(m.id);
  if(!row||row.loadlab_run_id!==runId||m.kind==='player'&&row.account_id!==m.account_id)throw fail('ownership_mismatch');
  const d=JSON.parse(m.descriptor_json);if(!(m.kind==='monster'?[0,1,2,3]:[1,2,3]).includes(d.channel)||row.channel!==d.channel)throw fail('ownership_channel_mismatch');
  own[m.kind].add(m.id);own.target.add(m.id);descriptors.set(m.id,d);if(m.kind==='player')own.account.add(m.account_id);
 }
 const journal=sharedJournal(db,runId);if(journal)for(const id of journal.ids){const m=db.prepare('SELECT loadlab_run_id,channel FROM monsters WHERE id=?').get(id);if(m&&(m.loadlab_run_id!==runId||m.channel!==0)||!m&&journal.status!=='deleted')throw fail('shared_journal_ownership_mismatch');own.monster.add(id);own.target.add(id);}if(journal)for(const round of journal.rounds)own.round.add(round);
 const admissions=tables.has('loadlab_admissions_v1')?db.prepare('SELECT * FROM loadlab_admissions_v1 WHERE run_id=?').all(runId):[];
 for(const a of admissions)own.account.add(a.account_id);
 if(own.account.size>MAX_ACCOUNTS)throw fail('ownership_account_count_invalid');
 for(const id of own.account){
  const a=db.prepare('SELECT * FROM accounts WHERE id=?').get(id),mark=admissions.find(r=>r.account_id===id);
  // A ledger inserted before native accept may legitimately have no mirror yet.
  if(!a){if([...rows].some(r=>r.account_id===id))throw fail('owned_account_missing');continue;}
  const username=mark?.username??[...rows].find(r=>r.account_id===id)?.descriptor_json;
  const expected=mark?.username??(username?JSON.parse(username).name:null);
  if(a.password_hash!=='REALM-NO-PASSWORD'||a.email!==id+'@loadlab.invalid'||!expected||a.username!==expected)throw fail('realm_account_ownership_mismatch');
  const p=db.prepare('SELECT id,loadlab_run_id FROM players WHERE account_id=?').all(id);
  if(p.some(r=>r.loadlab_run_id!==runId||!own.player.has(r.id)))throw fail('unmarked_player_on_test_account');
 }
 if(tables.has('loadlab_boss_rounds_v1'))for(const r of db.prepare('SELECT * FROM loadlab_boss_rounds_v1 WHERE run_id=?').all(runId)){
  if(!own.monster.has(r.monster_id)||!Number.isSafeInteger(r.boss_round)||r.boss_round<0)throw fail('boss_round_ownership_mismatch');own.round.add(r.boss_round);
 }
 // Round namespace collisions fail closed; there are <=225 live test monsters.
 // Main monsters table itself is bounded by the normal world population.
 for(const m of db.prepare("SELECT id,spawn_round,loadlab_run_id FROM monsters WHERE is_boss=1").all())if(own.round.has(m.spawn_round)&&m.loadlab_run_id!==runId)throw fail('real_boss_round_collision');
 return {own,descriptors,admissions};
}
function matches(row,refs,own){return refs.some(r=>own[r.kind]?.has(row[r.column]));}
function predicate(meta,own){
 const refs=meta.refs.filter(r=>own[r.kind]?.size);if(!refs.length)return null;
 // Use exact indexed lookups when EVERY OR branch is indexed. Otherwise a
 // bounded rowid keyset walk avoids a large synchronous full-scan query.
 if(!refs.every(r=>meta.indexed.has(r.column)))return null;
 const values=[],clauses=[];for(const r of refs){const ids=[...own[r.kind]];if(ids.length>512)return null;clauses.push(quote(r.column)+' IN ('+ids.map(()=>'?').join(',')+')');values.push(...ids);}return {where:'('+clauses.join(' OR ')+')',values};
}
async function* matching(db,meta,own,{signal}={}){
 if(!meta.refs.some(r=>own[r.kind]?.size))return;
 const pred=predicate(meta,own),where=pred?.where??'1',params=pred?.values??[];
 if(!meta.rowid)throw fail('unreviewed_without_rowid_reference',{table:meta.name});
 let cursor=null;
 while(true){
  signal?.throwIfAborted();
  const sql='SELECT rowid AS __lab_rowid,* FROM '+quote(meta.name)+' WHERE '+where+(cursor===null?'':' AND rowid>?')+' ORDER BY rowid LIMIT '+BATCH;
  const rows=db.prepare(sql).all(...params,...(cursor===null?[]:[cursor]));if(!rows.length)return;
  cursor=rows.at(-1).__lab_rowid;
  const relevant=pred?rows:rows.filter(row=>matches(row,meta.refs,own));if(relevant.length)yield relevant;
  await immediate();
 }
}
function assertOwned(table,row,own){if(!rowPolicy(table,row,own))throw fail('unexpected_owned_reference',{table});}
function relevantTables(meta){return meta.filter(t=>t.refs.length&&!['players','accounts'].includes(t.name)&&!t.name.startsWith('loadlab_')&&!RETAIN_OPERATIONAL.has(t.name));}
async function audit(db,metas,own,options){
 // Drops must be discovered before looking at their exact payload children.
 const ordered=[...metas].sort((a,b)=>(a.name==='world_drops'?-1:b.name==='world_drops'?1:0));
 for(const meta of ordered)for await(const batch of matching(db,meta,own,options))for(const row of batch){assertOwned(meta.name,row,own);if(meta.name==='world_drops')own.drop.add(row.id);}
}
async function drain(supervisor,registry,runId,rows){
 revoked(registry,runId);const states=[...supervisor.children.values()].filter(s=>s.ready);if(states.length!==3)throw fail('channel_unavailable');
 const proofs=await Promise.all(states.map(s=>s.rpc.request('loadlabDrain',{runId,ids:rows.filter(r=>r.kind==='player'&&JSON.parse(r.descriptor_json).channel===s.channel).map(r=>r.id)},{timeoutMs:20000})));
 if(proofs.some(p=>p?.ok!==true||p.runId!==runId||!p.drained))throw fail('drain_proof_invalid');return states;
}
async function removeOwnedRateLimits(database,own,counts){
 if(!database.sqlite.prepare("SELECT 1 FROM sqlite_schema WHERE name='auth_rate_limits'").get())return;
 // Exact native scopes: enforceRateLimit hashes UTF-8 `${scope}:${accountId}`.
 // Do not delete shared IP buckets, unrelated accounts or unknown namespaces.
 const keys=[...own.account].flatMap(id=>['realtime-ticket','claim-rewards'].map(scope=>createHash('sha256').update(scope+':'+id).digest('hex')));
 await database.atomic(sql=>{const remove=sql.prepare('DELETE FROM auth_rate_limits WHERE key=?');for(const key of keys)counts.auth_rate_limits=(counts.auth_rate_limits??0)+Number(remove.run(key).changes);});
}
async function removeRows(database,meta,own,counts,options){
 for await(const batch of matching(database.sqlite,meta,own,options)){
  await database.atomic(db=>{
   for(const r of batch){const current=db.prepare('SELECT rowid AS __lab_rowid,* FROM '+quote(meta.name)+' WHERE rowid=?').get(r.__lab_rowid);if(!current)continue;assertOwned(meta.name,current,own);
    if(!matches(current,meta.refs,own))throw fail('cleanup_row_changed');
    const result=db.prepare('DELETE FROM '+quote(meta.name)+' WHERE rowid=?').run(r.__lab_rowid);counts[meta.name]=(counts[meta.name]??0)+Number(result.changes);
   }
  });
 }
}
export async function cleanupLoadLabRun(args){
 const {database,supervisor,registry,runId}=args;
 if(typeof runId!=='string'||!/^[A-Za-z0-9_.:-]{1,160}$/.test(runId))throw fail('invalid_run');
 let current=active.get(database);if(current){if(current.runId!==runId)throw fail('cleanup_already_running');return current.promise;}
 const promise=cleanup(args);active.set(database,{runId,promise});try{return await promise;}finally{active.delete(database);}
}
async function cleanup({database,supervisor,registry,runId,rows,signal}){
 const trace=phaseTrace();try{
 await database.atomic(ensureLoadLabCleanupSchema);trace.set('ownership');
 const db=database.sqlite;rows??=db.prepare('SELECT * FROM loadlab_entities_v1 WHERE run_id=?').all(runId);
 const {own}=proof(db,registry,runId,rows);trace.set('drain');const states=await drain(supervisor,registry,runId,rows);trace.set('catalog');const metas=relevantTables(catalog(db)),counts={};
 trace.set('audit');await audit(db,metas,own,{signal});revoked(registry,runId);trace.set('rate_limits');await removeOwnedRateLimits(database,own,counts);trace.set('records');
 // Child payload before parent drop; all other listed records have no owned
 // intertable FK in the pinned V475 R3 schema. FK remains ON throughout.
 const ordered=[...metas].sort((a,b)=>a.name==='dragon_drop_payloads'?-1:b.name==='dragon_drop_payloads'?1:a.name==='world_drops'?1:b.name==='world_drops'?-1:0);
 for(const meta of ordered)await removeRows(database,meta,own,counts,{signal});
 // Marker+entity deletion is atomic per entity. A failed later step retains
 // remaining proofs and can be retried without guessing IDs or prefixes.
 trace.set('shared');const sharedRows=rows.filter(r=>r.kind==='monster'&&JSON.parse(r.descriptor_json).channel===0),otherRows=rows.filter(r=>!sharedRows.includes(r)),journal=sharedJournal(db,runId);
 const deleteEntity=(sql,r)=>{
   const table=r.kind==='player'?'players':'monsters';
   const result=sql.prepare('DELETE FROM '+table+' WHERE id=? AND loadlab_run_id=?').run(r.id,runId);if(Number(result.changes)!==1)throw fail('entity_delete_ownership_lost');
   sql.prepare('DELETE FROM loadlab_entities_v1 WHERE id=? AND run_id=?').run(r.id,runId);if(r.kind==='monster'&&JSON.parse(r.descriptor_json).channel!==0&&sql.prepare("SELECT 1 FROM sqlite_schema WHERE name='loadlab_boss_rounds_v1'").get())sql.prepare('DELETE FROM loadlab_boss_rounds_v1 WHERE monster_id=? AND run_id=?').run(r.id,runId);counts[table]=(counts[table]??0)+1;
 };
 const deleteEntities=async selectedRows=>{for(const r of selectedRows){signal?.throwIfAborted();revoked(registry,runId);await database.atomic(sql=>deleteEntity(sql,r));await immediate();}};
 if(sharedRows.length||journal){
  const owner=supervisor.children.get(1),token=randomUUID(),ids=journal?.ids??sharedRows.map(r=>r.id),rounds=journal?.rounds??[...own.round],descriptors=journal?.descriptors??sharedRows.map(r=>({...JSON.parse(r.descriptor_json),id:r.id}));let requested=false,deleted=journal?.status==='deleted';
  await database.atomic(sql=>sql.prepare('INSERT INTO loadlab_cleanup_shared_v1(run_id,token,ids_json,rounds_json,status,descriptors_json) VALUES(?,?,?,?,?,?) ON CONFLICT(run_id) DO UPDATE SET token=excluded.token').run(runId,token,JSON.stringify(ids),JSON.stringify(rounds),deleted?'deleted':'prepared',JSON.stringify(descriptors)));
  try{requested=true;await owner.rpc.request('loadlabSharedFreeze',{runId,ids,rounds,token},{id:'lab-shared-freeze:'+token,timeoutMs:15000});
   signal?.throwIfAborted();revoked(registry,runId);await database.atomic(sql=>{for(const row of sharedRows)deleteEntity(sql,row);sql.prepare("UPDATE loadlab_cleanup_shared_v1 SET status='deleted' WHERE run_id=? AND token=?").run(runId,token);});deleted=true;
   await Promise.all(states.map(s=>s.rpc.request('loadlabSharedReplicaForget',{runId,ids,rounds},{id:'lab-shared-forget:'+token,timeoutMs:5000})));
  }finally{if(requested)await owner.rpc.request('loadlabSharedRelease',{runId,token,deleted},{id:'lab-shared-release:'+token,timeoutMs:15000});}
 }
 trace.set('entities');await deleteEntities(otherRows);trace.set('forget');
 await Promise.all(states.map(s=>s.rpc.request('loadlabForget',{runId,playerIds:[...own.player],monsterIds:[...own.monster]},{timeoutMs:10000})));
 trace.set('accounts');for(const id of own.account){await database.atomic(sql=>{if(sql.prepare('SELECT 1 FROM players WHERE account_id=? LIMIT 1').get(id))throw fail('account_has_players');const a=sql.prepare('SELECT * FROM accounts WHERE id=?').get(id);if(a){if(a.password_hash!=='REALM-NO-PASSWORD'||a.email!==id+'@loadlab.invalid')throw fail('realm_account_ownership_lost');sql.prepare('DELETE FROM accounts WHERE id=? AND password_hash=?').run(id,'REALM-NO-PASSWORD');counts.accounts=(counts.accounts??0)+1;}if(sql.prepare("SELECT 1 FROM sqlite_schema WHERE name='loadlab_admissions_v1'").get())sql.prepare('DELETE FROM loadlab_admissions_v1 WHERE account_id=? AND run_id=?').run(id,runId);});await immediate();}
 trace.set('finalize');await database.atomic(sql=>{for(const table of ['loadlab_sessions_v1','loadlab_boss_rounds_v1','loadlab_cleanup_shared_v1'])if(sql.prepare('SELECT 1 FROM sqlite_schema WHERE name=?').get(table))sql.prepare('DELETE FROM '+table+' WHERE run_id=?').run(runId);if(sql.prepare('SELECT 1 FROM loadlab_entities_v1 WHERE run_id=?').get(runId))throw fail('cleanup_incomplete');});
 trace.set('complete');return {clean:true,runId,removed:Object.values(counts).reduce((a,b)=>a+b,0),counts,retainedOperational:[...RETAIN_OPERATIONAL],foreignKeysDisabled:false};
 }catch(error){trace.fail();throw error;}
}

export async function cleanupCentralLoadLabAccounts({database,registry,runId,signal}){
 if(!/^[A-Za-z0-9_.:-]{1,160}$/.test(runId))throw fail('invalid_run');revoked(registry,runId);
 const db=database.sqlite,rows=db.prepare('SELECT * FROM loadlab_accounts_v1 WHERE run_id=?').all(runId),own=ownSets(),counts={};
 if(rows.length>75)throw fail('ownership_account_count_invalid');
 for(const r of rows){const a=db.prepare('SELECT * FROM accounts WHERE id=?').get(r.account_id);if(!a||a.username!==r.username||a.password_hash!=='COL-LOADLAB-V1-NO-PASSWORD'||a.email!==r.account_id+'@loadlab.invalid'||!a.permanently_banned)throw fail('central_account_ownership_mismatch');own.account.add(r.account_id);}
 const metas=relevantTables(catalog(db));await audit(db,metas,own,{signal});await removeOwnedRateLimits(database,own,counts);
 for(const meta of metas)await removeRows(database,meta,own,counts,{signal});
 for(const r of rows){signal?.throwIfAborted();revoked(registry,runId);await database.atomic(sql=>{const a=sql.prepare('SELECT * FROM accounts WHERE id=?').get(r.account_id);if(!a||a.username!==r.username||a.password_hash!=='COL-LOADLAB-V1-NO-PASSWORD'||a.email!==r.account_id+'@loadlab.invalid'||!a.permanently_banned)throw fail('central_account_ownership_lost');sql.prepare('DELETE FROM accounts WHERE id=?').run(r.account_id);sql.prepare('DELETE FROM loadlab_accounts_v1 WHERE account_id=? AND run_id=?').run(r.account_id,runId);counts.accounts=(counts.accounts??0)+1;});await immediate();}
 return {clean:true,removedAccounts:rows.length,counts,retainedOperational:[...RETAIN_OPERATIONAL],foreignKeysDisabled:false};
}
