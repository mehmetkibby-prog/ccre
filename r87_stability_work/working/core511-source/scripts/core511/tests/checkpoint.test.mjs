import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {native,temporary,until} from './helpers.mjs';
import {ResidentState} from '../resident-state.mjs';
import {ChannelOwnership,OrderedWriterClient,registerOwnedRule} from '../ownership.mjs';
import {ActorCheckpoints,CHECKPOINT_FIELDS,createActorCheckpointHandler} from '../actor-checkpoint.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
async function fixture(t){
 const db=new LocalDatabase(path.join(temporary(t),'checkpoint.sqlite'),{create:true,groupWrites:true,asyncDurable:true});t.after(()=>db.close());
 const row={id:'p',account_id:'a',area:'forest',channel:1,arena_match_id:'',realtime_scope_version:1,max_hp:100,...Object.fromEntries(CHECKPOINT_FIELDS.map(name=>[name,0])),motion_stream_id:'',hp:100,hp_revision:1,position_revision:1,movement_checked_at_ms:100000,last_seen:100,gems:456,respawn_at_ms:0};
 db.sqlite.exec('CREATE TABLE players('+Object.entries(row).map(([name,value])=>'"'+name+'" '+(typeof value==='string'?'TEXT':'REAL')+(name==='id'?' PRIMARY KEY':'')).join(',')+');');
 db.sqlite.prepare('INSERT INTO players VALUES('+Object.keys(row).map(()=>'?').join(',')+')').run(...Object.values(row));
 const authority=new ChannelOwnership(db,{realmId:'checkpoint-test'});await authority.initialize();const peer={channel:1,incarnation:'checkpoint-boot'};await authority.registerProcess(1,peer.incarnation);
 let owner=await authority.admit('p',peer,{sessionId:'s',guard:()=>true});
 const state=new ResidentState(1);state.put('players',{...row,cycle:1});state.claim('p',owner.epoch);
 registerOwnedRule(authority,'actor_checkpoint',createActorCheckpointHandler(),{duringDrain:true});
 registerOwnedRule(authority,'fixture_economy',(sql,payload)=>{sql.prepare('UPDATE players SET gems=gems+? WHERE id=?').run(payload.amount,'p');return {saved:true};});
 const client=new OrderedWriterClient({peer,owner:()=>owner,request:(p,r)=>authority.command(p,r)});client.seed('p',owner.epoch,0);
 let time=0;const checkpoints=new ActorCheckpoints({state,submit:e=>client.submit(e),clock:()=>time});checkpoints.hydrate(row);
 return {db,authority,peer,state,client,checkpoints,row,clock:n=>time=n,owner:()=>owner};
}
test('five-second checkpoint stores native position/HP fields without rewriting newer moves during fsync',async t=>{
 const s=await fixture(t),{db,state,checkpoints,client}=s;state.patch('players','p',{x:5,position_revision:2,movement_checked_at_ms:105000,hp:90,hp_revision:2});
 s.clock(4999);checkpoints.poll();assert.equal(client.finalSequence('p'),0);assert.equal(db.sqlite.prepare('SELECT x FROM players').get().x,0);
 const durable=db.durableAfterCommit.bind(db);let release;const hold=new Promise(r=>release=r);db.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>hold);
 s.clock(5000);checkpoints.poll();const pending=checkpoints.entries.get('p').pending;assert(pending);await until(()=>db.sqlite.prepare('SELECT x FROM players').get().x===5);
 state.patch('players','p',{x:8,position_revision:3,movement_checked_at_ms:105050,hp:80,hp_revision:3});
 assert.equal(state.owners.get('p').pending,1);assert.equal(checkpoints.entries.get('p').base.x,0);
 release();await pending;db.durableAfterCommit=durable;
 assert.equal(state.read('players','p').x,8);assert.equal(state.read('players','p').hp,80);assert.equal(checkpoints.entries.get('p').base.x,5);
 await checkpoints.drain('p');assert.equal(db.sqlite.prepare('SELECT x FROM players').get().x,8);assert.equal(db.sqlite.prepare('SELECT hp FROM players').get().hp,80);
 assert.equal(client.finalSequence('p'),2);assert.equal(db.sqlite.prepare('SELECT gems FROM players').get().gems,456);
});
test('economy event queues after pending checkpoint with consecutive receipt sequence',async t=>{
 const s=await fixture(t),{db,state,checkpoints,client}=s;state.patch('players','p',{x:3,position_revision:2});
 const durable=db.durableAfterCommit.bind(db);let release;const hold=new Promise(r=>release=r);db.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>hold);
 const checkpoint=checkpoints.flush('p');await until(()=>db.sqlite.prepare('SELECT x FROM players').get().x===3);
 const economy=client.submit({actor:'p',key:'after-checkpoint',kind:'fixture_economy',payload:{amount:7}});
 await new Promise(r=>setTimeout(r,5));assert.equal(db.sqlite.prepare('SELECT gems FROM players').get().gems,456);
 release();await checkpoint;await economy;db.durableAfterCommit=durable;
 assert.equal(client.finalSequence('p'),2);assert.equal(db.sqlite.prepare('SELECT gems FROM players').get().gems,463);
 const receipts=db.sqlite.prepare('SELECT sequence FROM kernel511_channel_receipts ORDER BY sequence').all();assert.deepEqual(receipts.map(r=>r.sequence),[1,2]);
});
test('stale checkpoint cannot undo durable damage and an unknown outcome keeps release fenced',async t=>{
 const s=await fixture(t),{db,state,checkpoints}=s;state.patch('players','p',{x:9,position_revision:2});
 db.sqlite.prepare('UPDATE players SET hp=70,hp_revision=2 WHERE id=?').run('p');
 await assert.rejects(checkpoints.flush('p'),/checkpoint_snapshot_conflict/);assert.equal(db.sqlite.prepare('SELECT hp FROM players').get().hp,70);
 assert.throws(()=>state.assertOwner('p',s.owner().epoch),/owner_epoch_fenced/);
 assert.equal(db.sqlite.prepare('SELECT x FROM players').get().x,0);assert.equal(state.owners.get('p').pending,1);
 state.freeze('p',s.owner().epoch);assert.throws(()=>state.release('p',s.owner().epoch),/owner_not_drained/);
 assert.throws(()=>s.client.finalSequence('p'),/channel_not_drained/);
});
test('checkpoint cannot modify economy, scope, terminal HP or regress movement revision',async t=>{
 const s=await fixture(t),{db,state,checkpoints,authority,peer}=s,base=checkpoints.entries.get('p').base;
 for(const [i,patch]of [{gems:999},{channel:2},{hp:0},{position_revision:0}].entries()){
  const request={playerId:'p',epoch:s.owner().epoch,sequence:1,operationId:'bad-checkpoint-'+i,operation:'actor_checkpoint',payload:{base,current:{...base,...patch}}};
  await assert.rejects(authority.command(peer,request),/checkpoint_/);
 }
 assert.equal(db.sqlite.prepare('SELECT gems FROM players').get().gems,456);assert.equal(db.sqlite.prepare('SELECT hp FROM players').get().hp,100);assert.equal(authority.owner('p').sequence,0);
 state.patch('players','p',{hp:0});await assert.rejects(checkpoints.flush('p'),/checkpoint_terminal_health/);
});
test('a dead heartbeat can persist only its native rest clock and cannot revive or rewrite death state',async t=>{
 const s=await fixture(t),{db,state,checkpoints,authority,peer}=s;db.sqlite.prepare('UPDATE players SET hp=0,respawn_at_ms=106000 WHERE id=?').run('p');const dead={...s.row,hp:0,respawn_at_ms:106000};state.put('players',{...dead,cycle:1});checkpoints.hydrate(dead);const base=checkpoints.entries.get('p').base;
 for(const [index,patch]of [{hp:1},{hp_revision:2},{respawn_at_ms:0},{x:10}].entries())await assert.rejects(authority.command(peer,{playerId:'p',epoch:s.owner().epoch,sequence:1,operationId:'dead-heartbeat-forbidden-'+index,operation:'actor_checkpoint',payload:{base,current:{...base,last_regen_at:105000,...patch}}}),/checkpoint_(terminal_health|columns)/);
 state.patch('players','p',{last_regen_at:105000});await checkpoints.drain('p');const after=db.sqlite.prepare('SELECT hp,respawn_at_ms,last_regen_at,gems FROM players').get();assert.deepEqual({...after},{hp:0,respawn_at_ms:106000,last_regen_at:105000,gems:456});
});
