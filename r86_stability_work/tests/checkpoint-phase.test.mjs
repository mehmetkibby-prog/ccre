import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {ActorCheckpoints,CHECKPOINT_FIELDS,createActorCheckpointHandler} from '../working/core511-source/scripts/core511/actor-checkpoint.mjs';
import {ResidentState} from '../working/core511-source/scripts/core511/resident-state.mjs';
import {R53_CHECKPOINT_START_MS,R53_MEMORY_WINDOW_MS} from '../working/core511-source/scripts/core511/r53-options.mjs';

function fixture(t,count=50){
 let time=10000;const state=new ResidentState(1),db=new DatabaseSync(':memory:'),handler=createActorCheckpointHandler(),jobs=[];t.after(()=>db.close());
 const row=id=>({...Object.fromEntries(CHECKPOINT_FIELDS.map(k=>[k,0])),id,account_id:'account-'+id,area:'forest',channel:1,arena_match_id:'',realtime_scope_version:1,max_hp:1000,hp:1000,motion_stream_id:'',last_seen:10});
 const names=Object.keys(row('a'));db.exec('CREATE TABLE players ('+names.map(k=>'"'+k+'" '+(typeof row('a')[k]==='string'?'TEXT':'REAL')+(k==='id'?' PRIMARY KEY':'')).join(',')+')');
 const insert=db.prepare('INSERT INTO players ('+names.map(k=>'"'+k+'"').join(',')+') VALUES('+names.map(()=>'?').join(',')+')');
 for(let i=0;i<count;i++){const id='a2b7834e-7f53-4d96-86f1-phase-'+i,p=row(id);insert.run(...names.map(k=>p[k]));state.put('players',p);state.claim(id,1);}
 const persist=event=>{db.exec('BEGIN');try{const result=handler(db,event.payload,{actor:event.actor,epoch:1});db.exec('COMMIT');return {key:event.key,result};}catch(error){db.exec('ROLLBACK');throw error;}};
 const checkpoints=new ActorCheckpoints({state,clock:()=>time,submit:async event=>{jobs.push({event,time});return persist(event);}});for(const p of state.table('players').values())checkpoints.hydrate(p);
 const dirty=(id,x)=>state.patch('players',id,{x,position_revision:state.read('players',id).position_revision+1,movement_checked_at_ms:time,last_movement_at_ms:time});
 return {state,db,checkpoints,jobs,persist,dirty,get time(){return time;},set time(value){time=value;},ids:[...state.owners.keys()]};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('50 simultaneous hydrated actors get stable earlier eligibility and retain five-per-50ms native SQL checkpoint budget',async t=>{
 const f=fixture(t),phases=new Map([...f.checkpoints.entries].map(([id,e])=>[id,e.startMsR86]));
 assert.equal(R53_CHECKPOINT_START_MS,1500);assert.equal(R53_MEMORY_WINDOW_MS,2000);assert([...phases.values()].every(v=>v>=1000&&v<=1500));assert(new Set(phases.values()).size>35);
 for(const id of f.ids){f.checkpoints.hydrate(f.state.read('players',id));assert.equal(f.checkpoints.entries.get(id).startMsR86,phases.get(id));f.dirty(id,1);}
 f.time=10999;f.checkpoints.poll();await settle();assert.equal(f.jobs.length,0);
 for(let at=11000;at<=12000;at+=50){f.time=at;const before=f.jobs.length;f.checkpoints.poll();f.checkpoints.poll();await settle();assert(f.jobs.length-before<=5,'original per-window budget');}
 assert.equal(f.jobs.length,50);assert(f.jobs.some(j=>j.time<11500));assert(new Set(f.jobs.map(j=>j.time)).size>=8);
 for(const {event,time}of f.jobs){assert(time>=10000+phases.get(event.actor));assert.equal(f.db.prepare('SELECT x FROM players WHERE id=?').get(event.actor).x,1);assert.equal(Boolean(f.checkpoints.changed(event.actor)),false);assert.equal(f.state.owners.get(event.actor).pending,0);}
});

test('pending checkpoint preserves captured CAS image, strict two-second fence and newer motion suffix',async t=>{
 const f=fixture(t,1),id=f.ids[0];let release,submitted;f.checkpoints.submit=event=>{submitted=event;return new Promise(resolve=>{release=()=>resolve(f.persist(event));});};
 f.dirty(id,10);f.time=10000+f.checkpoints.entries.get(id).startMsR86;f.checkpoints.poll();await settle();const pending=f.checkpoints.entries.get(id).pending;assert(pending);assert.equal(submitted.payload.current.x,10);
 f.dirty(id,20);f.time=11999;assert.equal(f.checkpoints.overdueR53(id),false);f.time=12000;assert.equal(f.checkpoints.overdueR53(id),true);f.checkpoints.poll();assert.equal(f.checkpoints.entries.get(id).pending,pending);assert.equal(submitted.payload.current.x,10);
 release();await pending;assert.equal(f.db.prepare('SELECT x FROM players WHERE id=?').get(id).x,10);assert.equal(f.state.read('players',id).x,20);assert(f.checkpoints.changed(id));assert.equal(f.checkpoints.entries.get(id).base.x,10);
 f.checkpoints.submit=async e=>f.persist(e);await f.checkpoints.drain(id);assert.equal(f.db.prepare('SELECT x FROM players WHERE id=?').get(id).x,20);assert.equal(Boolean(f.checkpoints.changed(id)),false);assert.equal(f.state.owners.get(id).pending,0);
});

test('explicit drain ignores phase delay and existing checkpoint CAS still rejects foreign persistent changes',async t=>{
 const f=fixture(t,2),[a,b]=f.ids;f.dirty(a,7);await f.checkpoints.drain(a);assert.equal(f.time,10000);assert.equal(f.db.prepare('SELECT x FROM players WHERE id=?').get(a).x,7);
 f.dirty(b,9);const token=f.checkpoints.captureR53(b),before=f.db.prepare('SELECT * FROM players WHERE id=?').get(b);f.db.prepare('UPDATE players SET position_revision=50 WHERE id=?').run(b);
 assert.throws(()=>f.persist({actor:b,key:'conflict-proof',payload:token.payload}),/checkpoint_snapshot_conflict/);assert.equal(f.db.prepare('SELECT x FROM players WHERE id=?').get(b).x,before.x);f.checkpoints.finishR53(token);
});
