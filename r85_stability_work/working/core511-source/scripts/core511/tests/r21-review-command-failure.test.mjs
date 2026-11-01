import test from 'node:test';
import assert from 'node:assert/strict';
import {native,temporary} from './helpers.mjs';
import {CommandFailureScope} from '../command-failure-scope.mjs';
import {ChannelOwnership,OrderedWriterClient,registerOwnedRule} from '../ownership.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
async function fixture(t){
 const database=new LocalDatabase(temporary(t)+'/scope.sqlite',{create:true,groupWrites:true,asyncDurable:true});t.after(()=>database.close());
 database.sqlite.exec("CREATE TABLE players(id TEXT PRIMARY KEY,value INTEGER); INSERT INTO players VALUES('p',0),('q',0); CREATE TABLE pve_engagements(player_id TEXT); CREATE TABLE fishing_sessions(player_id TEXT)");
 const peer={channel:1,incarnation:'review-scope'},authority=new ChannelOwnership(database,{realmId:'review'});await authority.initialize();await authority.registerProcess(1,peer.incarnation);
 const owners=new Map();for(const id of ['p','q'])owners.set(id,await authority.admit(id,peer,{sessionId:'session-'+id,guard:()=>true}));
 const logs=[],scope=new CommandFailureScope(database.sqlite,{diagnostic:r=>logs.push(r)}),unknown=[],client=new OrderedWriterClient({peer,owner:id=>owners.get(id),request:(p,r)=>authority.command(p,r),onUnknown:(id,error)=>unknown.push({id,error})});for(const id of ['p','q'])client.seed(id,owners.get(id).epoch,0);
 let executions=0;const register=(kind,work)=>registerOwnedRule(authority,kind,(sql,payload,context)=>scope.run(kind,payload,context,()=>{executions++;sql.prepare('UPDATE players SET value=value+1 WHERE id=?').run(context.actor);return work(sql,payload,context);}));
 const request=(kind='attack',key='review-operation')=>({actor:'p',key,kind,payload:{}});
 return {database,peer,authority,scope,logs,client,unknown,register,request,executions:()=>executions};
}
for(const mode of ['prepare-error','constraint'])test('SQLite '+mode+' becomes persisted negative receipt and advances once',async t=>{
 const f=await fixture(t);f.register('attack',sql=>mode==='prepare-error'?sql.prepare('SELECT * FROM review_missing_table').all():sql.prepare("INSERT INTO players VALUES('p',99)").run());
 const reply=await f.client.submit(f.request());assert.equal(reply.result.result.status,409);assert.equal(reply.result.result.body.code,'command_sql_rolled_back');assert.equal(f.database.sqlite.prepare("SELECT value FROM players WHERE id='p'").get().value,0);assert.equal(f.authority.owner('p').sequence,1);assert.equal(f.unknown.length,0);assert.equal(f.logs.length,1);assert(!JSON.stringify(f.logs).includes('review_missing_table'));
 const raw={playerId:'p',epoch:1,sequence:1,operationId:'review-operation',operation:'attack',payload:{}};const replay=await f.authority.command(f.peer,raw);assert.equal(JSON.stringify(replay),JSON.stringify(reply));assert.equal(f.executions(),1);assert.equal(f.database.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,1);
});
for(const mode of ['forged-code','unsupported-kind','rollback-failure'])test(mode+' remains failclosed without a receipt',async t=>{
 const f=await fixture(t),kind=mode==='unsupported-kind'?'unreviewed':'attack';
 f.register(kind,sql=>{if(mode==='forged-code')throw Object.assign(Error('application exception'),{code:'ERR_SQLITE_ERROR',errcode:1});if(mode==='rollback-failure'){const exec=sql.exec;sql.exec=function(text,...args){if(text.startsWith('ROLLBACK TO core511_owned_command'))throw Object.assign(Error('rollback failed'),{code:'SQLITE_IOERR'});return Reflect.apply(exec,this,[text,...args]);};}sql.prepare('SELECT * FROM review_missing_table').all();});
 await assert.rejects(f.client.submit(f.request(kind)));assert.equal(f.unknown.length,1);assert.equal(f.authority.owner('p').sequence,0);assert.equal(f.database.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,0);assert.equal(f.logs.length,0);
});
test('negative receipt is not delivered before native durable flush completes',async t=>{
 const f=await fixture(t);f.register('attack',sql=>sql.prepare('SELECT * FROM review_missing_table').all());
 let release;const held=new Promise(r=>release=r),durable=f.database.durableAfterCommit.bind(f.database);f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>held);
 let done=false;const response=f.client.submit(f.request()).then(r=>{done=true;return r;});await new Promise(r=>setTimeout(r,30));assert.equal(done,false);assert.equal(f.database.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,1);release();assert.equal((await response).result.result.status,409);
});
test('postcommit flush failure remains unknown even after confirmed inner rollback and negative receipt',async t=>{
 const f=await fixture(t);f.register('attack',sql=>sql.prepare('SELECT * FROM review_missing_table').all());const durable=f.database.durableAfterCommit.bind(f.database);f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>{throw Object.assign(Error('ambiguous flush'),{code:'REVIEW_IOERR'});});
 await assert.rejects(f.client.submit(f.request()),{code:'REVIEW_IOERR'});assert.equal(f.unknown.length,1);assert.equal(f.authority.owner('p').sequence,1);assert.equal(f.database.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,1);assert.throws(()=>f.client.finalSequence('p'),/channel_not_drained/);
});
test('confirmed outer rollback restores abandoned native-service JS savepoint stack',async t=>{
 const {serviceTransactionDatabase,captureServiceTransactions}=await import('../service-transaction.mjs');
 const f=await fixture(t),service=serviceTransactionDatabase(f.database.sqlite),scope=new CommandFailureScope(f.database.sqlite,{checkpoint:()=>captureServiceTransactions(service),onRollback:restore=>restore(),diagnostic:()=>{}});
 registerOwnedRule(f.authority,'attack',(sql,payload,context)=>scope.run('attack',payload,context,()=>{service.exec('BEGIN IMMEDIATE');service.prepare("UPDATE players SET value=7 WHERE id='p'").run();service.prepare('SELECT * FROM review_missing_table').get();}));
 assert.equal((await f.client.submit(f.request())).result.result.status,409);assert.equal(f.database.sqlite.prepare("SELECT value FROM players WHERE id='p'").get().value,0);
 await f.database.atomic(()=>{service.exec('BEGIN IMMEDIATE');service.prepare("UPDATE players SET value=8 WHERE id='q'").run();service.exec('COMMIT');assert.throws(()=>service.exec('ROLLBACK'),/service_transaction_unbalanced/);});assert.equal(f.database.sqlite.prepare("SELECT value FROM players WHERE id='q'").get().value,8);
});
test('recoverable SQL failure preserves native rate accounting without double charge on receipt replay',async t=>{
 const {createNativeGameplayRates,gameplayRateResponse}=await import('../gameplay-rate.mjs'),{createHash}=await import('node:crypto');
 const f=await fixture(t);f.database.sqlite.exec('CREATE TABLE auth_rate_limits(key TEXT PRIMARY KEY,attempts INTEGER,window_started_at INTEGER,blocked_until INTEGER)');
 const rates=createNativeGameplayRates(f.database.sqlite,{clock:()=>1000000,onApplied:restore=>f.scope.preserve(restore)});
 f.register('native_action',sql=>{try{rates.enforce(sql,'claim-rewards','p',{limit:2,windowSeconds:60,blockSeconds:10});}catch(error){const result=gameplayRateResponse(error);if(!result)throw error;return {result};}sql.prepare('SELECT * FROM review_missing_table').all();});
 const inspect=()=>f.database.sqlite.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(createHash('sha256').update('claim-rewards:p').digest('base64url'));
 const first=await f.client.submit(f.request('native_action','rate-attempt-1'));assert.equal(first.result.result.status,409);assert.equal(inspect().attempts,1);
 await f.authority.command(f.peer,{playerId:'p',epoch:1,sequence:1,operationId:'rate-attempt-1',operation:'native_action',payload:{}});assert.equal(inspect().attempts,1);
 assert.equal((await f.client.submit(f.request('native_action','rate-attempt-2'))).result.result.status,409);assert.equal(inspect().attempts,2);
 const blocked=await f.client.submit(f.request('native_action','rate-attempt-3'));assert.equal(blocked.result.result.status,429);assert.equal(blocked.result.result.body.code,'rate_limited');assert.equal(inspect().attempts,3);assert.equal(inspect().blocked_until,1010);
});
