import test from 'node:test';
import assert from 'node:assert/strict';
import {sharedClaimMismatchR85,isSharedClaimMismatchR85,markSharedClaimRollbackR85,sharedClaimRollbackProofR85} from '../../working/core511-source/scripts/core511/shared-claim-rejection-r85.mjs';
const peer={channel:1,incarnation:'ch1'},payload={input:{action:'claim_rewards'},sharedLease:'signed-lease'},context={actor:'p1',epoch:7,sequence:8,key:'claim-key',peer},request={playerId:'p1',epoch:7,sequence:8,operationId:'claim-key',operation:'native_action',payload};
test('selected-claim proof requires private mismatch provenance and completed savepoint rollback',()=>{
 const forged=Object.assign(Error('shared_terminal_actor_fenced'),{code:'shared_terminal_actor_fenced'});markSharedClaimRollbackR85(forged);assert.equal(sharedClaimRollbackProofR85(forged,peer,request),null);
 const error=sharedClaimMismatchR85(payload,context);assert(isSharedClaimMismatchR85(error));assert.equal(sharedClaimRollbackProofR85(error,peer,request),null);markSharedClaimRollbackR85(error);assert(sharedClaimRollbackProofR85(error,peer,request));
});
test('rolled-back selected claim proof binds exact operation, actor, owner, sequence, key and signed lease',()=>{
 const error=sharedClaimMismatchR85(payload,context);markSharedClaimRollbackR85(error);
 for(const patch of [{playerId:'p2'},{epoch:8},{sequence:9},{operationId:'other'},{operation:'attack'},{payload:{...payload,sharedLease:'other'}},{payload:{...payload,input:{action:'collect'}}}])assert.equal(sharedClaimRollbackProofR85(error,peer,{...request,...patch}),null);
 for(const patch of [{channel:2},{incarnation:'next'}])assert.equal(sharedClaimRollbackProofR85(error,{...peer,...patch},request),null);
});

const {DatabaseSync}=await import('node:sqlite');
const {CommandFailureScope}=await import('../../working/core511-source/scripts/core511/command-failure-scope.mjs');
const {actorRejection}=await import('../../working/core511-source/scripts/core511/actor-rejection.mjs');
for(const phase of ['success','savepoint_failure','service_restore_failure'])test('selected claim '+phase+' certifies only completed SQLite and service rollback',()=>{
 const sql=new DatabaseSync(':memory:');sql.exec("CREATE TABLE players(id TEXT PRIMARY KEY,xp INTEGER);INSERT INTO players VALUES('p1',0)");let restored=false;
 const scope=new CommandFailureScope(sql,{onRollback:()=>{if(phase==='service_restore_failure')throw Error('service rollback failed');restored=true;}}),error=sharedClaimMismatchR85(payload,context),exec=sql.exec.bind(sql);
 if(phase==='savepoint_failure')sql.exec=text=>{if(text.startsWith('ROLLBACK TO core511_owned_command'))throw Error('savepoint rollback failed');return exec(text);};
 try{
  sql.exec('BEGIN');assert.throws(()=>scope.run('native_action',payload,context,()=>{sql.prepare("UPDATE players SET xp=100 WHERE id='p1'").run();throw error;}));
  assert.equal(Boolean(sharedClaimRollbackProofR85(error,peer,request)),phase==='success');assert.equal(actorRejection(error),null,'outer request rollback/durability has not certified the error');
  assert.equal(restored,phase==='success');if(phase!=='savepoint_failure')assert.equal(sql.prepare("SELECT xp FROM players WHERE id='p1'").get().xp,0);
 }finally{exec('ROLLBACK');sql.close();}
});
