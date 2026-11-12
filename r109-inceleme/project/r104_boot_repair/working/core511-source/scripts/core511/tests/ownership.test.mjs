import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {BASE,hash,native,temporary,until} from './helpers.mjs';
import {ChannelOwnership,OrderedWriterClient,registerOwnedRule} from '../ownership.mjs';
import {ChannelAuthority as Original} from '../../../../native510-bb3a6cc689c6/vds-server/src/channel-authority.mjs';
import {ChannelAuthority as Generated} from '../generated/owner-authority.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
const peers=[null,...[1,2,3,4].map(channel=>({channel,incarnation:'boot-'+channel}))];
async function fixture(t){
 const db=new LocalDatabase(path.join(temporary(t),'ownership.sqlite'),{create:true,groupWrites:true,asyncDurable:true});
 t.after(()=>db.close());db.sqlite.exec('CREATE TABLE money(id TEXT PRIMARY KEY,amount INTEGER NOT NULL,channel INTEGER NOT NULL); CREATE TABLE dungeon_members(player_id TEXT PRIMARY KEY,run_id TEXT NOT NULL);');
 const authority=new ChannelOwnership(db,{realmId:'isolated'});await authority.initialize();
 for(const peer of peers.slice(1))await authority.registerProcess(peer.channel,peer.incarnation);
 const guard=(sql,owner)=>{sql.prepare('INSERT INTO money VALUES(?,0,?) ON CONFLICT(id) DO UPDATE SET channel=excluded.channel').run(owner.player_id,owner.channel);return true;};
 const admit=(id,channel,sessionId='session-'+id)=>authority.admit(id,peers[channel],{sessionId,guard});
 return {db,authority,admit,guard};
}
test('four-channel authority is mechanically identical except namespace, capacity and import edits',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/owner-proof.json',import.meta.url)));
 for(const row of proof.modules){
  let source=fs.readFileSync(path.join(BASE,row.source),'utf8');assert.equal(hash(source),row.sourceSha256);
  for(const edit of row.edits){assert.equal(source.split(edit.from).length-1,edit.count);source=source.split(edit.from).join(edit.to);}
  const generated=fs.readFileSync(new URL('../generated/'+row.generated,import.meta.url),'utf8');assert.equal(source,generated);assert.equal(hash(generated),row.generatedSha256);
 }
 for(const method of Object.getOwnPropertyNames(Original.prototype))if(!['constructor','initialize'].includes(method)){
  const normalize=s=>s.replaceAll('kernel511_','');assert.equal(normalize(Generated.prototype[method].toString()),Original.prototype[method].toString(),method);
 }
});
test('100 admissions balance 4x25, CH1 loses ties, concurrent 26th claims cannot exceed capacity',async t=>{
 const {db,authority,admit}=await fixture(t);
 const nativeAuthority=new Original(db,{realmId:'isolated'});await nativeAuthority.initialize();await nativeAuthority.registerProcess(1,'old-boot');await nativeAuthority.claim('legacy-only',1,'old-boot');
 const before=JSON.stringify(db.sqlite.prepare('SELECT * FROM channel_owners').all());
 assert.equal(authority.emptiest(),2);
 for(let i=0;i<100;i++){const channel=authority.emptiest();assert(channel);await admit('p'+i,channel);}
 assert.equal(authority.emptiest(),null);assert.deepEqual([...authority.counts()].sort(),[[1,25],[2,25],[3,25],[4,25]]);
 const replies=await Promise.allSettled(Array.from({length:12},(_,i)=>admit('overflow'+i,4)));assert(replies.every(r=>r.status==='rejected'&&r.reason.code==='channel_full'));
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM kernel511_admissions').get().n,100);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM kernel511_channel_owners').get().n,100,'failed admission also rolls back owner insertion');
 assert.equal(JSON.stringify(db.sqlite.prepare('SELECT * FROM channel_owners').all()),before,'legacy ownership untouched');
});
test('ordered writer resolves only after durability and rejects old owner after channel4 handoff',async t=>{
 const {db,authority,admit}=await fixture(t);let owner=await admit('p',1);
 registerOwnedRule(authority,'reward',(sql,payload,{actor})=>{sql.prepare('UPDATE money SET amount=amount+? WHERE id=?').run(payload.amount,actor);return {amount:sql.prepare('SELECT amount FROM money WHERE id=?').get(actor).amount};});
 registerOwnedRule(authority,'checkpoint',()=>({saved:true}),{duringDrain:true});
 const client=new OrderedWriterClient({peer:peers[1],owner:()=>owner,request:(p,r)=>authority.command(p,r)});client.seed('p',owner.epoch,0);
 const durable=db.durableAfterCommit.bind(db);let unblock;const barrier=new Promise(r=>unblock=r);db.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>barrier);
 let done=false;const reward=client.submit({actor:'p',key:'reward-1',kind:'reward',payload:{amount:7}}).then(r=>{done=true;return r;});
 await until(()=>db.sqlite.prepare('SELECT amount FROM money WHERE id=?').get('p').amount===7);assert.equal(done,false);assert.throws(()=>client.finalSequence('p'),/channel_not_drained/);
 unblock();await reward;db.durableAfterCommit=durable;
 const transfer={epoch:owner.epoch,targetChannel:4,transferId:'transfer-1'};await authority.beginOwnedTransfer('p',peers[1],transfer);
 await assert.rejects(authority.command(peers[1],{playerId:'p',epoch:owner.epoch,sequence:2,operationId:'late-reward',operation:'reward',payload:{amount:99}}),/owner_epoch_fenced/);
 await client.submit({actor:'p',key:'checkpoint-1',kind:'checkpoint',payload:{}});
 await assert.rejects(authority.release('p',peers[1],{...transfer,finalSequence:1}),/channel_not_drained/);
 await assert.rejects(authority.acceptOwnedTransfer('p',peers[4],transfer,()=>true),/channel_not_released/);
 await authority.release('p',peers[1],{...transfer,finalSequence:client.finalSequence('p')});
 let transitions=0;
 const transition=(sql)=>{transitions++;sql.prepare('UPDATE money SET channel=4 WHERE id=?').run('p');return true;};
 const values=await Promise.all([authority.acceptOwnedTransfer('p',peers[4],transfer,transition),authority.acceptOwnedTransfer('p',peers[4],transfer,transition)]);
 assert.equal(transitions,1);assert.equal(values[0].channel,4);assert.equal(values[0].epoch,owner.epoch+1);assert.deepEqual(values[0],values[1]);
 await assert.rejects(authority.command(peers[1],{playerId:'p',epoch:owner.epoch,sequence:1,operationId:'reward-1',operation:'reward',payload:{amount:7}}),/owner_epoch_fenced/);
 await assert.rejects(authority.resume('p',peers[1],{epoch:owner.epoch,sessionId:'session-p'}),/owner_epoch_fenced/);
 owner=values[0];assert.equal((await authority.resume('p',peers[4],{epoch:owner.epoch,sessionId:'session-p'})).channel,4);
 assert.equal(db.sqlite.prepare('SELECT amount FROM money WHERE id=?').get('p').amount,7);
});
test('full target or rejected native transition rolls back admission, cleanup and owner together',async t=>{
 const {db,authority,admit}=await fixture(t),owner=await admit('p',1);
 for(let i=0;i<25;i++)await admit('busy'+i,4);
 const request={epoch:owner.epoch,targetChannel:4,transferId:'transfer-full'};
 await authority.beginOwnedTransfer('p',peers[1],request);await authority.release('p',peers[1],{...request,finalSequence:0});
 let called=false;await assert.rejects(authority.acceptOwnedTransfer('p',peers[4],request,()=>{called=true;return true;}),/channel_full/);assert.equal(called,false);
 assert.equal(authority.owner('p').state,'released');assert.equal(authority.admission('p').channel,1);
 await authority.cancelTransfer('p',peers[1],request);
 const other={epoch:owner.epoch,targetChannel:3,transferId:'transfer-reject'};
 await authority.beginOwnedTransfer('p',peers[1],other);await authority.release('p',peers[1],{...other,finalSequence:0});
 await assert.rejects(authority.acceptOwnedTransfer('p',peers[3],other,sql=>{sql.prepare('UPDATE money SET amount=500 WHERE id=?').run('p');return false;}),/transition_rejected/);
 assert.equal(db.sqlite.prepare('SELECT amount FROM money WHERE id=?').get('p').amount,0);assert.equal(authority.admission('p').channel,1);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM kernel511_transfers').get().n,0);
});
test('source restart cancels half-transfer into old channel with new epoch; short reconnect does not rebalance',async t=>{
 const {authority,admit}=await fixture(t),owner=await admit('p',1);
 const request={epoch:owner.epoch,targetChannel:4,transferId:'half-transfer'};
 await authority.beginOwnedTransfer('p',peers[1],request);await authority.release('p',peers[1],{...request,finalSequence:0});
 await authority.registerProcess(1,'restarted-1');const recovered=authority.owner('p'),peer={channel:1,incarnation:'restarted-1'};
 assert.equal(recovered.channel,1);assert.equal(recovered.state,'active');assert.equal(recovered.epoch,owner.epoch+1);assert.equal(authority.admission('p').epoch,recovered.epoch);
 await assert.rejects(authority.acceptOwnedTransfer('p',peers[4],request,()=>true),/channel_not_released/);
 await assert.rejects(authority.resume('p',peers[1],{epoch:owner.epoch,sessionId:'session-p'}),/channel_process_fenced/);
 assert.equal((await authority.resume('p',peer,{epoch:recovered.epoch,sessionId:'session-p'})).channel,1);assert.equal(authority.emptiest(),2);
});
test('completed logout retires epoch and fresh login can select emptiest channel',async t=>{
 const {authority,admit}=await fixture(t),owner=await admit('p',1);
 await authority.logout('p',peers[1],{epoch:owner.epoch,sessionId:'session-p',finalSequence:0});assert.equal(authority.admission('p'),null);
 const next=await admit('p',authority.emptiest(),'new-session');assert.equal(next.channel,2);assert(next.epoch>owner.epoch);
 await assert.rejects(authority.resume('p',peers[2],{epoch:next.epoch,sessionId:'session-p'}),/session_epoch_fenced/);
 await assert.rejects(admit('p',2,'another-session'),/session_already_admitted/);
});
test('replayed handoff waits for the same fsync boundary as the first accept',async t=>{
 const {db,authority,admit}=await fixture(t),owner=await admit('p',1),request={epoch:owner.epoch,targetChannel:4,transferId:'ack-gap'};
 await authority.beginOwnedTransfer('p',peers[1],request);await authority.release('p',peers[1],{...request,finalSequence:0});
 const durable=db.durableAfterCommit.bind(db);let unblock,held=false;
 const gate=new Promise(r=>unblock=r);db.durableAfterCommit=()=>{const result=durable();if(authority.owner('p').channel===4){held=true;return Promise.resolve(result).then(()=>gate);}return result;};
 let replies=0;const one=authority.acceptOwnedTransfer('p',peers[4],request,()=>true).then(r=>{replies++;return r;});await until(()=>held);
 const two=authority.acceptOwnedTransfer('p',peers[4],request,()=>{throw Error('must replay');}).then(r=>{replies++;return r;});
 await new Promise(r=>setTimeout(r,15));assert.equal(replies,0);unblock();const result=await Promise.all([one,two]);assert.deepEqual(result[0],result[1]);db.durableAfterCommit=durable;
});
