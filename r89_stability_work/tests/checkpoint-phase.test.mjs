import test from 'node:test';
import assert from 'node:assert/strict';
import {ActorCheckpoints,CHECKPOINT_FIELDS} from '../working/core511-source/scripts/core511/actor-checkpoint.mjs';
import {ResidentState} from '../working/core511-source/scripts/core511/resident-state.mjs';
test('simultaneously hydrated actors spread their first checkpoint, retain 1500ms cadence and the 2s hard fence',async()=>{
 let now=0;const state=new ResidentState(1),sent=[];
 const checkpoints=new ActorCheckpoints({state,clock:()=>now,submit:async event=>{sent.push({actor:event.actor,at:now});return {key:event.key,result:{saved:event.payload.current}};}});
 for(let i=0;i<25;i++){
  const row={id:'phase-'+i,account_id:'account-'+i,area:'forest',channel:1,cycle:1,arena_match_id:'',realtime_scope_version:1,max_hp:100,...Object.fromEntries(CHECKPOINT_FIELDS.map(k=>[k,0])),motion_stream_id:'',hp:100};
  state.put('players',row);state.claim(row.id,1);checkpoints.hydrate(row);state.patch('players',row.id,{x:1,position_revision:1});
 }
 for(now=0;now<=1800;now+=50){checkpoints.poll();await Promise.all([...checkpoints.entries.values()].map(e=>e.pending));}
 assert.equal(sent.length,25);assert(new Set(sent.map(r=>r.at)).size>=5);assert(sent.every(r=>r.at>=1000&&r.at<=1700));
 const first=new Map(sent.map(r=>[r.actor,r.at]));for(const actor of first.keys())state.patch('players',actor,{x:2,position_revision:2});
 for(now=1850;now<=3400;now+=50){checkpoints.poll();await Promise.all([...checkpoints.entries.values()].map(e=>e.pending));}
 assert.equal(sent.length,50);for(const row of sent.slice(25))assert.equal(row.at-first.get(row.actor),1500);
 const id='phase-0',entry=checkpoints.entries.get(id);state.patch('players',id,{x:3,position_revision:3});now=entry.at+1999;assert(!checkpoints.overdueR53(id));now++;assert(checkpoints.overdueR53(id));
});
