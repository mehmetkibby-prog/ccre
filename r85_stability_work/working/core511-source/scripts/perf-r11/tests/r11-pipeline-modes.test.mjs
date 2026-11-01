import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {fixture} from './native-fixture.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const turn=()=>new Promise(setImmediate);
async function make(mode){const previous=process.env.CORE_CHANNEL_WRITER_PIPELINE;process.env.CORE_CHANNEL_WRITER_PIPELINE=mode;try{return await fixture();}finally{if(previous===undefined)delete process.env.CORE_CHANNEL_WRITER_PIPELINE;else process.env.CORE_CHANNEL_WRITER_PIPELINE=previous;}}
for(const mode of ['0','1']){
 test(`pipeline ${mode}: actual durable XP/currencies/item rewards, duplicate guard and receipt digest`,{timeout:12000},async()=>{
  const h=await make(mode),db=h.channels.get(1),entered=deferred(),release=deferred(),flush=h.database.walSync.flush.bind(h.database.walSync);let reopened;
  try{
   let acknowledgements=0;h.database.walSync.flush=async()=>{entered.resolve();await release.promise;return flush();};
   const award=token=>db.runPlayer('real-1',()=>db.guardedBatch(
    db.prepare('UPDATE players SET xp=xp+10,essence=essence+3,gems=gems+2 WHERE id=? AND NOT EXISTS(SELECT 1 FROM normal_reward_claims WHERE player_id=? AND claim_token=?) RETURNING id').bind('real-1','real-1',token),
    [db.prepare('INSERT INTO normal_reward_claims(monster_id,spawn_round,player_id,claim_token,awarded_at) VALUES(?,1,?,?,unixepoch())').bind('fixture-'+token,'real-1',token),
     db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,created_at) VALUES(?,?,'weapon','Durable reward','white',1,'avci',unixepoch())").bind(token,'real-1')]
   ));
   const pending=['a','a','b','b'].map(token=>award(token).then(value=>{acknowledgements++;return value;}));
   await entered.promise;await turn();assert.equal(acknowledgements,0);assert.equal(db.sequence,0);
   assert.equal(h.requests.length,mode==='1'?4:1,'ON pipelines four requests; OFF waits for first durable ACK');
   release.resolve();const results=await Promise.all(pending);h.database.walSync.flush=flush;
   assert.deepEqual(results.map(r=>r.guard.results.length),[1,0,1,0]);assert.equal(db.sequence,4);
   const request=h.requests[0].request,first=await h.writer.write(h.peers.get(1),request);assert.equal(first.writerBatch.replayed,true);
   await assert.rejects(h.writer.write(h.peers.get(1),{...request,actor:'bot-1'}),{code:'writer_sequence_reused'});
   reopened=new DatabaseSync(h.file,{readOnly:true});assert.deepEqual({...reopened.prepare("SELECT xp,essence,gems FROM players WHERE id='real-1'").get()},{xp:20,essence:6,gems:14});
   assert.deepEqual(reopened.prepare("SELECT id FROM player_items WHERE player_id='real-1' ORDER BY id").all().map(r=>r.id),['a','b']);
   assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM normal_reward_claims').get().n,2);assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM channel_write_receipts').get().n,4);assert.equal(h.fatals.length,0);
  }finally{release.resolve();h.database.walSync.flush=flush;reopened?.close();await h.close();}
 });
 test(`pipeline ${mode}: same-record FIFO and stale ownership cannot alter balances`,{timeout:12000},async()=>{
  const h=await make(mode),db=h.channels.get(1);try{
   const jobs=[1,2,3].map(n=>db.runPlayer('real-1',()=>db.batch([db.prepare('UPDATE players SET gems=gems*2+? WHERE id=? RETURNING gems').bind(n,'real-1')])));
   const out=await Promise.all(jobs);assert.deepEqual(out.map(r=>r[0].results[0].gems),[21,44,91]);
   const request={sequence:4,actor:'real-1',owners:[{playerId:'real-1',epoch:999}],statements:[{sql:'UPDATE players SET gems=0 WHERE id=?',params:['real-1']}]};
   await assert.rejects(h.writer.write(h.peers.get(1),request),{code:'owner_epoch_fenced'});assert.equal(h.database.sqlite.prepare("SELECT gems FROM players WHERE id='real-1'").get().gems,91);
   assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS n FROM channel_write_receipts').get().n,3);assert.deepEqual(h.requests.map(r=>r.request.sequence),[1,2,3]);assert.equal(h.fatals.length,0);
  }finally{await h.close();}
 });
}
