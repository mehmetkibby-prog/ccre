import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const base=process.env.STUTTER_TREE+'/core511-source/scripts/core511/';
const {foregroundClaimScopeR85,foregroundAttackScopeR112,assertClaimWorkerScopeR112,assertClaimRefreshR112}=await import(base+'reward-actor-scope-r85.mjs');
const {SharedRefreshScope}=await import(base+'shared-refresh-scope.mjs');
function fixture(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec(`CREATE TABLE players(id TEXT PRIMARY KEY,area TEXT,channel INTEGER,arena_match_id TEXT);CREATE TABLE world_state(id INTEGER,cycle INTEGER);INSERT INTO world_state VALUES(1,5);
 CREATE TABLE monsters(id TEXT PRIMARY KEY,channel INTEGER,is_boss INTEGER,is_stone INTEGER,area TEXT,spawn_round INTEGER);
 CREATE TABLE normal_defeats(monster_id TEXT,spawn_round INTEGER,loot_source_key TEXT);
 CREATE TABLE monster_participants(monster_id TEXT,spawn_round INTEGER,player_id TEXT);
 CREATE TABLE party_members(party_id TEXT,player_id TEXT);CREATE TABLE guild_members(guild_id TEXT,player_id TEXT);CREATE TABLE dungeon_members(run_id TEXT,player_id TEXT);
 CREATE TABLE loadlab_boss_rounds_v1(monster_id TEXT,boss_round INTEGER);
 CREATE TABLE player_items(id TEXT PRIMARY KEY,player_id TEXT,item_type TEXT);
 INSERT INTO players VALUES('source','forest',1,NULL),('mate','forest',2,NULL),('guild','forest',3,NULL),('room','forest',4,NULL),('unrelated','forest',4,NULL);
 INSERT INTO monsters VALUES('normal-1',1,0,0,'forest',7);INSERT INTO normal_defeats VALUES('normal-1',7,'forest.catalog');
 INSERT INTO monster_participants VALUES('normal-1',7,'source');INSERT INTO party_members VALUES('party','source'),('party','mate');
 INSERT INTO guild_members VALUES('guild','mate'),('guild','guild');INSERT INTO dungeon_members VALUES('room','guild'),('room','room');`);
 const input={action:'claim_rewards',rewardTargets:[{id:'normal-1',spawnRound:7}]},scope=()=>foregroundClaimScopeR85(sql,input,'source',1),claim={input:JSON.stringify(input),scope:scope()},context={actor:'source',epoch:1,key:'op',peer:{channel:1,incarnation:'boot'}};
 const payload={input,sharedLease:'exact-proof',resources:claim.scope.actors.map(id=>'player:'+id)};
 return {sql,input,scope,claim,context,payload};
}
test('ordinary reward scope includes current party, guild and room recipients but excludes unrelated combat',t=>{
 const s=fixture(t);assert.deepEqual(s.claim.scope.actors,['guild','mate','room','source']);assertClaimWorkerScopeR112(s.sql,s.claim,s.payload,s.context);
 for(const mutation of ["DELETE FROM normal_defeats","UPDATE monsters SET channel=2","UPDATE monsters SET is_boss=1","UPDATE monsters SET area='event'","UPDATE normal_defeats SET loot_source_key='adventure.catalog'"]){s.sql.exec('SAVEPOINT probe');s.sql.exec(mutation);assert.equal(s.scope(),null);s.sql.exec('ROLLBACK TO probe;RELEASE probe');}
});
test('membership, epoch-channel scope and undeclared recipients cannot cross the worker transaction',t=>{
 const s=fixture(t);s.sql.exec("INSERT INTO party_members VALUES('party','unrelated')");assert.throws(()=>assertClaimWorkerScopeR112(s.sql,s.claim,s.payload,s.context),/shared_terminal_actor_fenced/);
 s.sql.exec("DELETE FROM party_members WHERE player_id='unrelated'");assert.throws(()=>assertClaimWorkerScopeR112(s.sql,s.claim,{...s.payload,resources:['player:source']},s.context),/shared_terminal_actor_fenced/);
 assert.throws(()=>assertClaimWorkerScopeR112(s.sql,s.claim,s.payload,{...s.context,peer:{channel:2}}),/shared_terminal_actor_fenced/);
});
test('an unexpected cold inventory effect is rejected inside the transaction and rolls back; selected effects commit',t=>{
 const s=fixture(t),audit=new SharedRefreshScope();audit.initialize(s.sql);
 for(const id of ['unrelated','mate']){
  s.sql.exec('BEGIN');try{
   const result=audit.run(s.sql,s.payload,s.context,()=>{s.sql.prepare('INSERT INTO player_items VALUES(?,?,?)').run('gift-'+id,id,'pearl');return {};});
   if(id==='unrelated')assert.throws(()=>assertClaimRefreshR112(s.claim,'exact-proof',s.payload,result,s.context),/shared_terminal_actor_fenced/);
   else assertClaimRefreshR112(s.claim,'exact-proof',s.payload,result,s.context);
   s.sql.exec(id==='unrelated'?'ROLLBACK':'COMMIT');
  }catch(e){if(s.sql.isTransaction)s.sql.exec('ROLLBACK');throw e;}
 }
 assert.deepEqual(s.sql.prepare('SELECT player_id FROM player_items').all().map(r=>r.player_id),['mate']);
 assert.throws(()=>assertClaimRefreshR112(s.claim,'exact-proof',s.payload,{sharedRefresh:{version:1,all:true,actors:['source']}},s.context),/shared_terminal_actor_fenced/);
});

test('ordinary shared attack selects current map and reward relations; instance/world attacks stay broad',t=>{
 const s=fixture(t),input={action:'attack',targetId:'normal-1',spawnRound:7,ability:2};
 assert.deepEqual(foregroundAttackScopeR112(s.sql,input,'source',1).actors,['guild','mate','room','source']);
 s.sql.exec("UPDATE players SET area='tower' WHERE id='source'");assert.equal(foregroundAttackScopeR112(s.sql,input,'source',1),null);
 s.sql.exec("UPDATE players SET area='forest' WHERE id='source';UPDATE monsters SET id='dunya-bosu-1'");assert.equal(foregroundAttackScopeR112(s.sql,{...input,targetId:'dunya-bosu-1'},'source',1),null);
});
test('out-of-scope attack effects acquire a rejection proof only after SQL and native service rollback',async t=>{
 const {CommandFailureScope}=await import(base+'command-failure-scope.mjs'),{sharedClaimRollbackProofR85}=await import(base+'shared-claim-rejection-r85.mjs');
 const s=fixture(t),input={action:'attack',targetId:'normal-1',spawnRound:7},claim={scope:foregroundAttackScopeR112(s.sql,input,'source',1)},payload={...s.payload,input},context={...s.context,sequence:1},peer=context.peer;
 let restored=0;const failure=new CommandFailureScope(s.sql,{checkpoint:()=>17,onRollback:checkpoint=>{assert.equal(checkpoint,17);restored++;}}),audit=new SharedRefreshScope();audit.initialize(s.sql);
 const request={playerId:'source',epoch:1,sequence:1,operationId:'op',operation:'attack',payload};
 s.sql.exec('BEGIN');let error;try{failure.run('attack',payload,context,()=>{
  const result=audit.run(s.sql,payload,context,()=>{s.sql.prepare('INSERT INTO player_items VALUES(?,?,?)').run('wrong','unrelated','pearl');return {};});
  try{assertClaimRefreshR112(claim,'exact-proof',payload,result,context);}catch(e){assert.equal(sharedClaimRollbackProofR85(e,peer,request),null);throw e;}
 });}catch(e){error=e;}
 assert(error);assert.equal(restored,1);assert.equal(s.sql.prepare('SELECT count(*) n FROM player_items').get().n,0);assert(sharedClaimRollbackProofR85(error,peer,request));assert.equal(sharedClaimRollbackProofR85(error,peer,{...request,sequence:2}),null);assert.equal(sharedClaimRollbackProofR85(Object.assign(Error('forged'),{code:'shared_terminal_actor_fenced'}),peer,request),null);s.sql.exec('ROLLBACK');
});

test('a scoped shared commit joins an unrelated in-flight journal without losing its ACK or masking failure',async()=>{
 const {commitSharedCombatR112}=await import(base+'shared-combat-channel.mjs');
 let resolve;const events=[],local={monsters:[],participants:[],bossParticipants:[]},c={attackMemory:{committed:value=>{assert.equal(value,local);events.push('memory');}},combatCheckpoints:{committed:value=>{assert.equal(value,local);assert.equal(c.combatCheckpoints.pending,null);events.push('baseline');}}};
 c.combatCheckpoints.pending=new Promise(r=>resolve=r).then(()=>{events.push('durable');c.combatCheckpoints.pending=null;});
 const done=commitSharedCombatR112(c,local);await new Promise(r=>setImmediate(r));assert.deepEqual(events,[]);resolve();await done;assert.deepEqual(events,['durable','memory','baseline']);
 events.length=0;c.combatCheckpoints.pending=Promise.reject(Error('journal durability failed'));await assert.rejects(commitSharedCombatR112(c,local),/journal durability failed/);assert.deepEqual(events,[]);
});

test('tower and mist scope follows the exact active run and includes a member on another floor',t=>{
 const s=fixture(t),run='abcdef00-0000-0000-0000-000000000000',area='kadim_abcdef00000000000000000000000000_01';
 s.sql.exec('CREATE TABLE adventure_runs(id TEXT,kind TEXT,area TEXT,channel INTEGER,cycle INTEGER,status TEXT);CREATE TABLE adventure_members(run_id TEXT,player_id TEXT,departed INTEGER);CREATE TABLE adventure_monsters(id TEXT,run_id TEXT,area TEXT,profile TEXT)');
 s.sql.prepare('INSERT INTO adventure_runs VALUES(?,?,?,?,?,?)').run(run,'tower',area,1,5,'active');s.sql.prepare('INSERT INTO adventure_members VALUES(?,?,0)').run(run,'source');s.sql.prepare('INSERT INTO adventure_members VALUES(?,?,0)').run(run,'unrelated');s.sql.prepare('INSERT INTO adventure_monsters VALUES(?,?,?,?)').run('normal-1',run,area,JSON.stringify({runId:run,feature:'tower'}));
 s.sql.prepare('UPDATE players SET area=? WHERE id=?').run(area,'source');s.sql.prepare('UPDATE monsters SET area=?').run(area);
 const input={action:'attack',targetId:'normal-1',spawnRound:7};assert(foregroundAttackScopeR112(s.sql,input,'source',1).actors.includes('unrelated'));
 s.sql.exec('UPDATE adventure_runs SET cycle=6');assert.equal(foregroundAttackScopeR112(s.sql,input,'source',1),null);
});
