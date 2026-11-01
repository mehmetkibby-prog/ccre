import test from 'node:test';
import assert from 'node:assert/strict';
import {gate,turns} from './freeze-fixture.mjs';
import {attachActorIsolation,actorIsolations} from '../../working/core511-source/scripts/core511/actor-isolation-proof.mjs';
import {joinFreezeRequestsR85,settleFreezeRequestsR85,unprovenFreezeR85} from '../../working/core511-source/scripts/core511/freeze-outcomes-r85.mjs';
import {attachFreezeFailuresR85} from '../../working/core511-source/scripts/core511/freeze-failure-r85.mjs';

function timerPort(){
 const scheduled=[],cleared=[];
 return {scheduled,cleared,set(fn,ms){const timer={fn,ms,unref(){}};scheduled.push(timer);return timer;},clear(timer){cleared.push(timer);}};
}

test('silent freeze deadline is unproven and consumes later replies without granting a stopped proof',async()=>{
 const a=gate(),b=gate(),clock=timerPort();let error,settled=false;
 const pending=joinFreezeRequestsR85([a.promise,b.promise],clock).catch(e=>error=e).finally(()=>settled=true);
 await turns();assert.equal(settled,false);assert.equal(clock.scheduled.length,1);assert.equal(clock.scheduled[0].ms,10000);
 clock.scheduled[0].fn();await pending;assert.equal(error.code,'cold_freeze_deadline');assert.equal(unprovenFreezeR85(error),true);assert.deepEqual(actorIsolations(error),[]);
 a.resolve({id:'late-owner'});b.reject(Object.assign(Error('late_disconnect'),{code:'late_disconnect'}));await turns(50);
 assert.equal(error.code,'cold_freeze_deadline');assert.equal(clock.cleared.length,1);
});

test('a known stopped failure also has a deadline when its healthy sibling never answers',async()=>{
 const a=gate(),b=gate(),clock=timerPort(),stopped=attachActorIsolation(Object.assign(Error('checkpoint_snapshot_conflict'),{code:'checkpoint_snapshot_conflict'}),{actor:'actor-a',epoch:1,token:'quarantine-a',stopped:true,finalSequence:0,freezeToken:'freeze-token-a',channel:1,incarnation:'boot-1'});let result,settled=false;
 const pending=joinFreezeRequestsR85([a.promise,b.promise],clock).catch(e=>result=e).finally(()=>settled=true);
 a.reject(stopped);await turns();assert.equal(settled,false);clock.scheduled[0].fn();await pending;
 assert.equal(result.code,'cold_freeze_deadline');assert.equal(unprovenFreezeR85(result),true);assert.equal(actorIsolations(result).length,0);
 b.resolve({id:'late-healthy'});await turns();
});

test('pending proof is checked again before a group can be classified as known',async()=>{
 const a=gate(),b=gate(),clock=timerPort(),error=attachFreezeFailuresR85(Object.assign(Error('actor_command_pending'),{code:'actor_command_pending'}),[{actor:'pending-a',epoch:1,freezeToken:'freeze-token-a',channel:1,incarnation:'boot-1',stage:'pending_command',pending:true}]);let known=true,result,settled=false;
 const pending=joinFreezeRequestsR85([a.promise,b.promise],{...clock,knownPending:()=>known}).catch(e=>result=e).finally(()=>settled=true);
 a.reject(error);await turns();assert.equal(settled,false);known=false;b.resolve('healthy');await pending;
 assert.equal(result,error);assert.equal(unprovenFreezeR85(result),true);assert.equal(clock.cleared.length,1);
});

test('unproven request failure is immediate even if every other request is unresolved',async()=>{
 const a=gate(),b=gate(),clock=timerPort(),error=Object.assign(Error('control_connection_lost'),{code:'control_connection_lost'});let result,settled=false;
 const pending=settleFreezeRequestsR85([a.promise,b.promise],clock).catch(e=>result=e).finally(()=>settled=true);
 a.reject(error);await turns(50);assert.equal(settled,true);assert.equal(result,error);assert.equal(unprovenFreezeR85(result),true);assert.equal(clock.cleared.length,1);await pending;
 b.reject(Error('later rejection must be observed'));await turns();
});

test('ordinary completed freezes retain result order and cancel the cold timer',async()=>{
 const a=gate(),b=gate(),clock=timerPort(),pending=joinFreezeRequestsR85([a.promise,b.promise],clock);
 b.resolve('second');a.resolve('first');assert.deepEqual(await pending,['first','second']);assert.equal(clock.cleared.length,1);
 clock.scheduled[0].fn();await turns();
});
