// Independent lightweight review proof. Uses candidate loader, real SQLite,
// and production planner/rollback/reply paths; no OS crowd or game oracle.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {CommandFailureScope} from '../working/core511-source/scripts/core511/command-failure-scope.mjs';
import {executeDeathBatchR57,deathBatchRollbackEntriesR85} from '../working/core511-source/scripts/core511/death-batch-writer-r57.mjs';
import {deathBatchReplyR57} from '../working/core511-source/scripts/core511/death-batch-channel-r57.mjs';
import {planSingleDeathsR57} from '../working/core511-source/scripts/core511/death-batch-single-r57.mjs';
import {rememberDeferredGroupR57,olderGroupWaitingR57} from '../working/core511-source/scripts/core511/group-fairness-r57.mjs';
assert.equal(process.env.R85_DEATH_BATCH_CANDIDATE,'1');

const sql=new DatabaseSync(':memory:');
sql.exec("CREATE TABLE players(id TEXT PRIMARY KEY,xp INTEGER,area TEXT,channel INTEGER,arena_match_id TEXT); INSERT INTO players VALUES('a',0,'forest',1,''),('b',0,'forest',1,''); CREATE TABLE pve_engagements(player_id TEXT); CREATE TABLE monsters(id TEXT,channel INTEGER,area TEXT,is_boss INTEGER,is_stone INTEGER); INSERT INTO monsters VALUES('m-a',1,'forest',0,0),('m-b',1,'forest',0,0); CREATE TABLE monster_participants(monster_id TEXT,spawn_round INTEGER,player_id TEXT); CREATE TABLE party_members(player_id TEXT,party_id TEXT); CREATE TRIGGER injected_failure BEFORE UPDATE ON players WHEN NEW.id='b' BEGIN SELECT RAISE(ABORT,'secondary-failure'); END;");
const scope=new CommandFailureScope(sql,{diagnostic:()=>{}});
const context={actor:'a',epoch:1,sequence:1,key:'test-rollback',realm:'test',peer:{channel:1,incarnation:'one'}};
const entry={actor:'b',epoch:1,sequence:7,receivedAtMs:1,seed:'1'.repeat(64),input:{action:'attack',targetId:'m-b',ability:0}};
const payload={batchAttacksR57:[entry],nowMs:2,expected:{player:{area:'forest'}},input:{action:'attack',targetId:'m-a',ability:0},localScope:{kind:'kill',targets:[{id:'m-a',spawnRound:1},{id:'m-b',spawnRound:1}]},resources:['player:a','player:b','monster:m-a','monster:m-b']};
let calls=0;
const execute=(_sql,_p,c)=>{calls++;sql.prepare('UPDATE players SET xp=xp+1 WHERE id=?').run(c.actor);return {result:{status:200,body:{hits:[]}},players:[],monsters:[],participants:[]};};
sql.exec('BEGIN');
const result=scope.run('attack',payload,context,()=>executeDeathBatchR57(sql,payload,context,{execute,executeSnapshotR61:execute,assertOwnership:()=>true,guardActor:()=>true,runContext:(_p,work)=>work()}));
assert.equal(calls,2);assert.equal(result.result.status,409);assert.equal(result.r53Rejected,'a');
assert.deepEqual(sql.prepare('SELECT xp FROM players ORDER BY id').all().map(x=>x.xp),[0,0]);
assert.equal(deathBatchReplyR57({result},{type:'action',sequence:7},'b',[entry]).status,409);
assert.equal(deathBatchRollbackEntriesR85(payload,context),null);
sql.exec('COMMIT');

// Stage the private proof through its real validation entry; the test cannot
// manufacture a proof by calling an exported setter. No native work follows.
const sentinel=new Error('review-proof-stop');
const dependencies={execute:()=>{throw sentinel;},executeSnapshotR61:()=>{throw sentinel;},assertOwnership:()=>true,guardActor:()=>true,runContext:(_p,work)=>work()};
const stageProof=()=>assert.throws(()=>executeDeathBatchR57(sql,payload,context,dependencies),error=>error===sentinel);
sql.exec('BEGIN');
stageProof();assert.equal(deathBatchRollbackEntriesR85(payload,{...context}),null);assert.equal(deathBatchRollbackEntriesR85(payload,context),null);
stageProof();entry.extra='changed';assert.equal(deathBatchRollbackEntriesR85(payload,context),null);delete entry.extra;
stageProof();entry.epoch=0;assert.throws(()=>executeDeathBatchR57(sql,payload,context,dependencies),/death_batch_input/);assert.equal(deathBatchRollbackEntriesR85(payload,context),null);entry.epoch=1;
assert.throws(()=>scope.run('attack',payload,context,()=>executeDeathBatchR57(sql,payload,context,dependencies)),error=>error===sentinel);
assert.equal(deathBatchRollbackEntriesR85(payload,context),null);
sql.exec('ROLLBACK');
sql.exec('BEGIN');
const rejected=()=>({result:{status:409,body:{not_executed:true}},r53Rejected:'a'});
scope.run('attack',payload,context,()=>executeDeathBatchR57(sql,payload,context,{...dependencies,execute:rejected,executeSnapshotR61:rejected}));
assert.equal(deathBatchRollbackEntriesR85(payload,context),null);
sql.exec('COMMIT');sql.close();

const rows=new Map(['a','waiting','b'].map(id=>[id,{id,role:'muhafiz',area:'forest',channel:1,hp:100}]));
const input={action:'attack',ability:0,targetId:'m-b'},waitingInput={action:'attack',ability:0,targetId:'m-b'};
const actors=new Map([['a',{epoch:1,queue:[],deferred:[]}],['waiting',{epoch:1,queue:[{kind:'combat',order:2,at:2,receivedAtMs:100,payload:waitingInput}],deferred:[]}],['b',{epoch:1,queue:[{kind:'combat',order:3,at:3,receivedAtMs:100,sequence:1,payload:input}],deferred:[]}]]);
const owners=new Map([...actors].map(([id])=>[id,{epoch:1,state:'active'}]));
const state={owners,channel:1,read:(_table,id)=>rows.get(id),assertOwner:id=>owners.get(id)};
const kernel={players:actors,state,running:true,metrics:{}};
rememberDeferredGroupR57({kernel,id:'waiting',input:waitingInput,inputOrder:2,ids:['waiting'],resources:['monster:m-b']});
actors.get('waiting').barrier=Promise.resolve();
const c={kernel,state,view:{player:id=>rows.get(id),monster:()=>({channel:1})},identities:new Map([...actors].map(([id])=>[id,{id}])),ports:{guard:()=>true},mounts:{enabled:false},lanes:{busy:()=>false},checkpoints:{overdueR53:()=>false},retaliationMemory:{due:()=>[]},frames:{attack:(id,input)=>({id,input})},attackMemory:{plan:frame=>({durable:true,boundary:{reason:'defeat'},frame})}};
const runtime={channel:c,forceSharedActors:new Map(),localResident:id=>rows.has(id),localGroup:id=>[id],localKill:(id,p)=>({ids:[id],targets:[{id:p.frame.input.targetId,spawnRound:1}]})};
assert(olderGroupWaitingR57({kernel,id:'b',input,inputOrder:3,ids:['b'],resources:['monster:m-b']}));
assert.equal(planSingleDeathsR57(runtime,{id:'a',input:{action:'attack'},inputOrder:1,now:100,kernel},{ids:['a'],targets:[{id:'m-a',spawnRound:1}]}),null);
assert.equal(actors.get('b').queue.length,1);

const files=Object.fromEntries(['death-batch-single-r57.mjs','attack-loop.mjs','death-batch-writer-r57.mjs','command-failure-scope.mjs'].map(name=>{const bytes=fs.readFileSync(new URL('../candidates/independent-deaths-r85/'+name,import.meta.url));return [name,{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}];}));
const report={passed:true,files,rollback:{calls,actorXp:[0,0],secondaryStatus:409,proofCleared:true},privateProof:{differentContextRejected:true,extraEntryKeyRejected:true,prevalidationFailureClearsPriorProof:true,unprovenFailureClearsProof:true,successfulCompletionClearsProof:true},fairness:{ownOrderBlocked:true,candidateRejected:true,inputUnconsumed:true},scope:'Independent lightweight production-path proof: synthetic SQLite schema and synthetic scheduler state; no full native economy, crash durability, or crowd capacity claim.'};
fs.writeFileSync(new URL('../evidence/independent-death-review-adversarial-r85.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
