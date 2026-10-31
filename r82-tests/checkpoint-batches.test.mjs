import test from 'node:test';
import assert from 'node:assert/strict';
import {combatCheckpointBatches} from '../r82-work/core511-source/scripts/core511/combat-checkpoint-batches.mjs';
import {CombatCheckpoints,deferred,turn,until,monster,ack} from './checkpoint-fixture.mjs';
function large(count,ports){const journal=new CombatCheckpoints(ports),rows=Array.from({length:count},(_,i)=>monster('m'+i));journal.hydrate('monsters',rows);journal.changed({monsters:rows.map(row=>({...row,hp:80}))});return journal;}

test('sequential checkpoint batches retain full pending scope until the final durable ACK',async()=>{
 const requests=[],gates=[],journal=large(1200,{submit:async e=>{requests.push(e);const gate=deferred();gates.push(gate);await gate.promise;return ack(e);}});
 const expected=combatCheckpointBatches(journal.snapshot(),id=>monster(id)).length;assert(expected>2);
 const pending=journal.flush(),same=journal.reserveR54(['m0']),disjoint=journal.reserveR54(['absent']);assert.equal(same.pending,pending);assert.equal(disjoint.pending,null);
 const capture=journal.captureR53(['absent'],{reservationR54:disjoint});journal.finishR53(capture);
 for(let i=0;i<expected;i++){
  await until(()=>requests.length===i+1);assert.equal(journal.pending,pending);assert.equal(journal.pendingTargetsR54.size,1200);
  assert.throws(()=>journal.captureR53(['m0'],{reservationR54:same}),/combat_join_pending/);
  gates[i].resolve();await turn();
 }
 await pending;assert.equal(journal.pending,null);assert.equal(journal.snapshot().monsters.length,0);journal.cancelReservationR54(same);
});

test('batched submit spans more than eight chunks without allowing an overlapping death between groups',async()=>{
 const groups=[],gates=[],journal=large(5000,{submit:async()=>{throw Error('unexpected single submission');},submitBatch:async commands=>{groups.push(commands);const gate=deferred();gates.push(gate);await gate.promise;return commands.map(ack);}});
 const expected=combatCheckpointBatches(journal.snapshot(),id=>monster(id)).length;assert(expected>8);
 const pending=journal.flush(),token=journal.reserveR54(['m0']);await until(()=>groups.length===1);assert.equal(groups[0].length,8);
 gates[0].resolve();await until(()=>groups.length===2);assert.equal(journal.pending,pending);assert.equal(token.pending,pending);
 // m0's chunk already ACKed. The captured global snapshot remains pending
 // until every part ACKs; this patch does not retire partial scopes early.
 assert.equal(journal.base.get('monsters').get('["m0"]').hp,80);
 assert.throws(()=>journal.captureR53(['m0'],{reservationR54:token}),/combat_join_pending/);
 gates[1].resolve();await pending;assert.equal(groups.flat().length,expected);assert.equal(new Set(groups.flat().map(r=>r.key)).size,expected);
 assert.equal(journal.snapshot().monsters.length,0);journal.cancelReservationR54(token);
});

for(const mode of ['reversed-ACK-order','wrong-payload','last-chunk-rejection'])test('batch failure '+mode+' keeps the global failure fence and reservation',async()=>{
 const fatals=[],failure=Error('last-chunk-failure');
 const journal=large(1200,{submit:async()=>{throw Error('unexpected single submission');},submitBatch:async commands=>{
  if(mode==='last-chunk-rejection')throw failure;
  const acks=commands.map(ack);if(mode==='reversed-ACK-order')return acks.reverse();
  acks.at(-1).result={saved:{...commands.at(-1).payload,monsters:[]}};return acks;
 },onFatal:e=>fatals.push(e)});
 const pending=journal.flush(),token=journal.reserveR54(['m0']);await assert.rejects(pending,mode==='last-chunk-rejection'?/last-chunk-failure/:/combat_checkpoint_ack_mismatch/);
 assert.equal(journal.pending,pending);assert.equal(fatals.length,1);assert.equal(journal.failure,fatals[0]);assert(journal.reservedR53.has('m0'));assert.equal(token.pending,pending);
 assert.throws(()=>journal.captureR53(['m0'],{reservationR54:token}),/combat_checkpoint_fenced/);
 assert.throws(()=>journal.reserveR54(['absent']),/combat_checkpoint_fenced/);
});
