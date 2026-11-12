import test from 'node:test';
import assert from 'node:assert/strict';
import {fork,execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {AsyncLocalStorage} from 'node:async_hooks';
import {EventEmitter} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {fixture} from './native-fixture.mjs';

const here=dirname(fileURLToPath(import.meta.url)),repo=resolve(here,'../../..');
const OLD_COMMIT='6570088e48b1afb560da9ef3d8ab77c55bd73dda';
const OLD_ADAPTER_SHA='58f51eb67082c5f46932c0473a5d16e2066842a167607f5306e889833402a29a';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const observed=p=>{void p.catch(()=>{});return p;};
async function bounded(p,label,ms=8000){let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Timed out: '+label)),ms);})]);}finally{clearTimeout(timer);}}
const sql=(text,...params)=>({sql:text,params});
const player=(h,id='real-1')=>h.database.sqlite.prepare('SELECT hp,x,position_revision,gems,name FROM players WHERE id=?').get(id);
async function create(pipeline='1',options={}){
 const previous=process.env.CORE_CHANNEL_WRITER_PIPELINE;process.env.CORE_CHANNEL_WRITER_PIPELINE=pipeline;
 try{return await fixture(options);}finally{if(previous===undefined)delete process.env.CORE_CHANNEL_WRITER_PIPELINE;else process.env.CORE_CHANNEL_WRITER_PIPELINE=previous;}
}
async function addHuman(h,id,channel){
 await h.database.atomic(db=>db.prepare("INSERT INTO players(id,name,last_seen,created_at,channel,hp,max_hp,gems,loadlab_run_id) VALUES(?,?,unixepoch(),unixepoch(),?,100,100,10,'')").run(id,id,channel));
 await h.channels.get(channel).ensureOwner(id);
}
const action=(db,id,statement,guard=null)=>db.runPlayer(id,()=>db.remote([statement],guard));
function holdDurability(h){
 const entered=deferred(),release=deferred(),original=h.database.walSync.flush.bind(h.database.walSync);
 h.database.walSync.flush=async()=>{entered.resolve();await release.promise;return original();};
 return {entered:entered.promise,release:release.resolve,restore:()=>{h.database.walSync.flush=original;}};
}
async function move(db,id,x,sequence){
 const now=Date.now();
 return db.runPlayer(id,()=>db.positionCheckpoint(db.prepare('UPDATE players SET x = ?, y = ?, movement_checked_at_ms = ?, movement_debt_ms = ?, motion_stream_id = ?, motion_sequence = ?, last_seen = ? WHERE id = ? RETURNING x, y, position_revision').bind(x,100,now,0,'fixture-stream',sequence,Math.floor(now/1000),id)));
}
async function hp(db,id){return db.runPlayer(id,()=>db.combatBatch([db.prepare('UPDATE players SET hp=hp-1 WHERE id=?').bind(id)],id));}

test('cohort preserves FIFO on one record across actors and isolates a middle guarded rejection',{timeout:10000},async()=>{
 const h=await create();try{
  await addHuman(h,'real-2',1);const db=h.channels.get(1),gate=holdDurability(h);let completed=0;
  const guard=sql('UPDATE players SET xp=xp WHERE id=? AND 0 RETURNING id','real-1');
  const jobs=[action(db,'real-1',sql('UPDATE players SET gems=gems*2+? WHERE id=? RETURNING gems',1,'real-1')),
   action(db,'real-2',sql('UPDATE players SET gems=999 WHERE id=?','real-1'),guard),
   action(db,'real-2',sql('UPDATE players SET gems=gems*2+? WHERE id=? RETURNING gems',3,'real-1')),
   action(db,'real-1',sql('UPDATE players SET gems=gems*2+? WHERE id=? RETURNING gems',4,'real-1'))].map(p=>observed(p.then(value=>{completed++;return value;})));
  try{await gate.entered;await turn();assert.equal(completed,0);assert.equal(h.requests.length,4);gate.release();const result=await Promise.all(jobs);
   assert.deepEqual(h.requests.map(x=>x.request.actor),['real-1','real-2','real-2','real-1']);assert.deepEqual(h.requests.map(x=>x.request.sequence),[1,2,3,4]);
   assert.equal(result[0][0].results[0].gems,21);assert.equal(result[1].guard.results.length,0);assert.equal(result[2][0].results[0].gems,45);assert.equal(result[3][0].results[0].gems,94);assert.equal(player(h).gems,94);assert.equal(h.fatals.length,0);
  }finally{gate.release();gate.restore();}
 }finally{await h.close();}
});

test('one snapshot and final reconciliation preserve newer position/HP generations and static notifications',{timeout:10000},async()=>{
 const h=await create();let gate;try{
  const db=h.channels.get(1);await hp(db,'real-1');await move(db,'real-1',200,1);
  let takes=0,acks=0;const take=db.buffer.take.bind(db.buffer),ack=db.buffer.acknowledged.bind(db.buffer);
  db.buffer.take=(...args)=>{takes++;return take(...args);};db.buffer.acknowledged=(...args)=>{acks++;return ack(...args);};
  gate=holdDurability(h);
  const jobs=[sql('UPDATE players SET name=? WHERE id=?','Human renamed','real-1'),sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1'),sql('UPDATE players SET attack_one_at=attack_one_at WHERE id=?','real-1')].map(statement=>observed(action(db,'real-1',statement)));
  await gate.entered;await turn();assert.equal(h.requests.length,3);assert.equal(takes,1);assert.equal(acks,0);
  await hp(db,'real-1');await move(db,'real-1',300,2);
  gate.release();await Promise.all(jobs);assert.equal(acks,1);assert.equal(player(h).hp,99);assert.equal(player(h).x,200);
  assert.equal(db.combat.tables.get('players').records.get('real-1').current.hp,98);assert.equal(db.positions.entries.get('real-1').current.x,300);
  const changed=h.changeLog.filter(x=>x.local).at(-1).changes.find(x=>x.table==='players');assert.ok(changed.staticChanged,'first static change survives later same-row notification');
  assert.equal(h.requests[0].request.deltas.length,2);assert.equal(h.requests[1].request.deltas.length,0);assert.equal(h.requests[2].request.deltas.length,0);
  await db.flushMemory();assert.equal(player(h).hp,98);assert.equal(player(h).x,300);assert.equal(h.fatals.length,0);
 }finally{gate?.release();gate?.restore();await h.close();}
});

test('later authoritative death and teleport override pending memory without resurrection',{timeout:10000},async()=>{
 const h=await create();let gate;try{
  const db=h.channels.get(1);await hp(db,'real-1');await move(db,'real-1',200,1);gate=holdDurability(h);
  const jobs=[action(db,'real-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1')),action(db,'real-1',sql('UPDATE players SET hp=0,hp_revision=hp_revision+1,x=900,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1 WHERE id=?','real-1'))].map(observed);
  await gate.entered;await hp(db,'real-1');await move(db,'real-1',300,2);gate.release();await Promise.all(jobs);
  assert.equal(db.combat.tables.get('players').records.get('real-1').current.hp,0);assert.equal(db.positions.entries.get('real-1').current.x,900);
  await db.flushMemory();assert.equal(player(h).hp,0);assert.equal(player(h).x,900);assert.equal(h.fatals.length,0);
 }finally{gate?.release();gate?.restore();await h.close();}
});

test('middle LoadLab known rejection keeps its receipt and later human work succeeds',{timeout:10000},async()=>{
 const h=await create();try{
  const db=h.channels.get(1),outcome=await Promise.allSettled([
   action(db,'real-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1')),
   action(db,'bot-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','bot-1')),
   action(db,'real-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1'))]);
  assert.deepEqual(outcome.map(x=>x.status),['fulfilled','rejected','fulfilled']);assert.equal(outcome[1].reason.code,'loadlab_lease_inactive');assert.equal(outcome[1].reason.loadlabRejected,true);
  assert.equal(player(h).gems,12);assert.equal(player(h,'bot-1').gems,10);assert.equal(db.sequence,3);assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS n FROM channel_write_receipts').get().n,3);assert.equal(h.fatals.length,0);assert.equal(db.failure,undefined);
 }finally{await h.close();}
});

test('unexpected middle SQL failure fences cohort and queued work, preserving only earlier durable receipts',{timeout:10000},async()=>{
 const h=await create();try{
  const db=h.channels.get(1),jobs=Array.from({length:6},(_,i)=>action(db,'real-1',i===1?sql('UPDATE fixture_missing_table SET n=1'):sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1')));
  const results=await Promise.allSettled(jobs);assert.ok(results.every(x=>x.status==='rejected'));assert.equal(h.requests.length,4);assert.equal(h.fatals.length,1);assert.ok(db.failure);assert.equal(db.sequence,0);
  await h.database.walSync.durable();assert.equal(player(h).gems,11);assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS n FROM channel_write_receipts').get().n,1);assert.equal(h.database.sqlite.prepare('SELECT sequence FROM channel_write_streams WHERE channel=1').get().sequence,1);
  assert.throws(()=>db.remote([sql('UPDATE players SET gems=999 WHERE id=?','real-1')]),error=>error===db.failure);
 }finally{await h.close();}
});

test('request ALS and per-request queue/writer evidence remain separate within a cohort',{timeout:10000},async()=>{
 const h=await create();try{
  h.setRunStatus('active');const db=h.channels.get(1),context=new AsyncLocalStorage(),tags=[],write=db.requestWrite.bind(db);
  const {measureRequest477}=await h.importModule('vds-server/src/request-performance477.mjs');
  db.requestWrite=request=>{tags.push({tag:context.getStore(),actor:request.actor});return write(request);};
  const records=await Promise.all(['bot-1','bot-2','bot-1','bot-2'].map((id,i)=>context.run('job-'+i,()=>measureRequest477('attack',id,()=>action(db,id,sql('UPDATE players SET hp=hp-1 WHERE id=? RETURNING hp',id))))));
  assert.deepEqual(tags.map(x=>x.tag),['job-0','job-1','job-2','job-3']);assert.deepEqual(tags.map(x=>x.actor),['bot-1','bot-2','bot-1','bot-2']);
  assert.equal(new Set(records.map(x=>x.perf.requestId)).size,4);
  for(const record of records){assert.equal(record.perf.writer.totals.writes,1);assert.equal(record.perf.writer.batches.length,1);assert.ok(record.timing.writer_queue_wall>=0);assert.ok(record.timing.writer_rpc_wall>=0);}
  assert.equal(player(h,'bot-1').hp,98);assert.equal(player(h,'bot-2').hp,98);assert.equal(h.fatals.length,0);
 }finally{await h.close();}
});

test('shared proof uses a singleton context boundary and flushes dirty shared HP after ordinary work',{timeout:10000},async()=>{
 const h=await create();let shared;try{
  const db=h.channels.get(1),{ChannelSharedCombat}=await h.importModule('vds-server/src/channel-shared-combat.mjs'),{signSharedLease}=await h.importModule('vds-server/src/channel-shared-authority.mjs');
  await h.database.atomic(sqlite=>sqlite.prepare("INSERT INTO monsters(id,name,x,y,hp,max_hp,spawn_round,area,channel,loadlab_run_id) VALUES('shared-fixture','Shared',100,100,100,100,1,'forest',0,'')").run());
  const secret='fixture-only-shared-lease-secret-000000000000',peer=h.peers.get(1),proof=signSharedLease(secret,{ownerIncarnation:peer.incarnation,channel:1,incarnation:peer.incarnation,id:randomUUID(),nonce:randomUUID(),version:0});h.writer.sharedSecret=secret;
  shared=new ChannelSharedCombat(db,{peer,acquire:async()=>({proof,snapshot:[]}),finish:async()=>({ok:true}),onFatal:error=>{throw error;}});
  db.combat.syncEntity('monsters','shared-fixture');await db.runPlayer('real-1',()=>db.combatBatch([db.prepare('UPDATE monsters SET hp=hp-1 WHERE id=?').bind('shared-fixture')],'real-1'));
  const jobs=[action(db,'real-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1')),
   shared.context.run({proof},()=>action(db,'real-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1'))),
   action(db,'real-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1'))];
  await Promise.all(jobs);assert.equal(h.requests.length,3);assert.equal(h.requests[0].request.sharedProof,undefined);assert.equal(h.requests[0].request.deltas.length,0);
  assert.equal(h.requests[1].request.sharedProof,proof);assert.equal(h.requests[1].request.deltas.filter(d=>d.table==='monsters'&&d.keys[0]==='shared-fixture').length,1);assert.equal(h.requests[2].request.sharedProof,undefined);
  assert.equal(h.database.sqlite.prepare("SELECT hp FROM monsters WHERE id='shared-fixture'").get().hp,99);assert.equal(db.writerCohorts477.snapshot().bins[1],3);assert.equal(h.fatals.length,0);
 }finally{if(shared)h.channels.get(1).sharedCombat=null;await h.close();}
});

test('native inventory business rejection is a durable singleton receipt and later work continues',{timeout:10000},async()=>{
 const h=await create();try{
  const db=h.channels.get(1),{ChannelNativeOperations}=await h.importModule('vds-server/src/channel-native-operations.mjs');h.writer.nativeOperations=new ChannelNativeOperations(h.database);
  const results=await Promise.allSettled([action(db,'real-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1')),
   db.runPlayer('real-1',()=>db.nativeOperation({name:'storage.act',playerId:'real-1',input:{action:'invalid'}})),
   action(db,'real-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1'))]);
  assert.deepEqual(results.map(x=>x.status),['fulfilled','rejected','fulfilled']);assert.match(results[1].reason.message,/Depo işlemi geçersiz/);
  assert.equal(h.requests[1].request.nativeOperation.name,'storage.act');assert.equal(db.writerCohorts477.snapshot().bins[1],3);assert.equal(db.sequence,3);assert.equal(player(h).gems,12);assert.equal(h.fatals.length,0);
  const receipt=JSON.parse(h.database.sqlite.prepare('SELECT response FROM channel_write_receipts WHERE sequence=2').get().response);assert.equal(receipt.result.native.ok,false);
 }finally{await h.close();}
});

test('fenced middle owner rejects the cohort; receipt replay and digest protection remain exact',{timeout:10000},async()=>{
 const h=await create();try{
  const db=h.channels.get(1),write=db.requestWrite.bind(db);db.requestWrite=request=>{if(request.sequence===2)request={...request,owners:request.owners.map(o=>({...o,epoch:o.epoch+1}))};return write(request);};
  const result=await Promise.allSettled([1,2,3].map(()=>action(db,'real-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1'))));
  assert.ok(result.every(x=>x.status==='rejected'));assert.equal(result[0].reason.code,'owner_epoch_fenced');await h.database.walSync.durable();assert.equal(player(h).gems,11);assert.equal(h.fatals.length,1);
  const first=h.requests[0].request,replay=await h.writer.write(h.peers.get(1),first);assert.equal(replay.writerBatch.replayed,true);assert.equal(player(h).gems,11);
  await assert.rejects(h.writer.write(h.peers.get(1),{...first,statements:[sql('UPDATE players SET gems=999 WHERE id=?','real-1')]}),{code:'writer_sequence_reused'});assert.equal(player(h).gems,11);
 }finally{await h.close();}
});

test('actual IPC codec disconnect rejects every unacknowledged cohort job without retry',{timeout:10000},async()=>{
 const h=await create();let client,server,gate;try{
  const db=h.channels.get(1),{ChannelRpc}=await h.importModule('vds-server/src/channel-rpc.mjs'),left=new EventEmitter(),right=new EventEmitter();
  for(const [from,to]of [[left,right],[right,left]]){from.connected=true;from.send=(message,done)=>setImmediate(()=>{to.emit('message',message);done?.();});}
  const arrived=deferred();let sent=0;client=new ChannelRpc(left,{identity:'cohort-fixture'});server=new ChannelRpc(right,{identity:'cohort-fixture',handlers:{write:request=>{if(++sent===4)arrived.resolve();return h.writer.write(h.peers.get(1),request);}}});
  db.requestWrite=request=>client.request('write',request);gate=holdDurability(h);let successes=0;
  const jobs=Array.from({length:4},()=>observed(action(db,'real-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1')).then(value=>{successes++;return value;})));
  await bounded(arrived.promise,'four encoded requests');await gate.entered;assert.equal(successes,0);client.close();const result=await Promise.allSettled(jobs);
  assert.ok(result.every(x=>x.status==='rejected'&&x.reason.code==='ipc_outcome_unknown'));assert.equal(h.fatals.length,1);assert.equal(db.sequence,0);assert.equal(sent,4);
  gate.release();await h.database.walSync.durable();assert.equal(player(h).gems,14);assert.equal(successes,0);
 }finally{gate?.release();gate?.restore();client?.close();server?.close();await h.close();}
});

test('strict startup toggle rejects invalid values and a single low-load job dispatches in one microtask',{timeout:10000},async()=>{
 const h=await create();try{
  const {channelWriterPipelineEnabled477}=await h.importModule('vds-server/src/channel-write-pipeline477.mjs');
  assert.equal(channelWriterPipelineEnabled477('0'),false);assert.equal(channelWriterPipelineEnabled477('1'),true);
  for(const value of ['true','2','',true,null])assert.throws(()=>channelWriterPipelineEnabled477(value),/must be 0 or 1/);
  const db=h.channels.get(1),request=db.requestWrite.bind(db);let dispatched=false;db.requestWrite=frame=>{dispatched=true;return request(frame);};
  const pending=observed(db.remote([sql('SELECT 1 AS n')]));assert.equal(dispatched,false);await Promise.resolve();assert.equal(dispatched,true,'no timeout/window sleep before isolated dispatch');
  assert.equal((await pending)[0].results[0].n,1);assert.equal(db.writerCohorts477.snapshot().bins[1],1);assert.equal(h.fatals.length,0);
 }finally{await h.close();}
});

test('a public writeTail barrier inserted between queued jobs cannot be swallowed by a cohort',{timeout:10000},async()=>{
 const h=await create(),release=deferred();try{
  const db=h.channels.get(1),first=observed(db.remote([sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1')]));
  db.writeTail=db.writeTail.then(()=>release.promise);
  let secondDone=false;const second=observed(db.remote([sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1')]).then(value=>{secondDone=true;return value;}));
  await first;await turn();assert.equal(h.requests.length,1);assert.equal(secondDone,false);assert.equal(player(h).gems,11);
  release.resolve();await second;assert.equal(h.requests.length,2);assert.deepEqual(h.requests.map(row=>row.request.sequence),[1,2]);assert.equal(player(h).gems,12);assert.equal(db.writerCohorts477.snapshot().bins[1],2);assert.equal(h.fatals.length,0);
 }finally{release.resolve();await h.close();}
});

test('writeTail, committed notifications and cleanup wait for every cohort reply before lease deletion',{timeout:10000},async()=>{
 const h=await create('1',{channels:[1,2,3]}),held=deferred(),release=deferred();try{
  const db=h.channels.get(1),request=db.requestWrite.bind(db);let acks=0,tailDone=false,notifyDone=false,cleanupDone=false;const ack=db.buffer.acknowledged.bind(db.buffer);
  db.buffer.acknowledged=(...args)=>{acks++;return ack(...args);};db.requestWrite=async frame=>{const response=await request(frame);if(frame.sequence===4){held.resolve();await release.promise;}return response;};
  const jobs=Array.from({length:4},()=>observed(action(db,'real-1',sql('UPDATE players SET gems=gems+1 WHERE id=?','real-1'))));
  await bounded(held.promise,'last cohort reply');const barrier=db.writeTail.then(()=>{tailDone=true;});
  const notified=observed(db.applyCommitted([{table:'players',id:'real-1',keys:['real-1'],owner:'real-1'}]).then(()=>{notifyDone=true;}));
  const cleaned=observed(h.cleanup().then(result=>{cleanupDone=true;return result;}));
  await turn();assert.equal(acks,0);assert.equal(db.sequence,0);assert.equal(tailDone,false);assert.equal(notifyDone,false);assert.equal(cleanupDone,false);
  assert.ok(h.database.sqlite.prepare("SELECT 1 FROM channel_owners WHERE player_id='bot-1'").get());
  release.resolve();await Promise.all([...jobs,barrier,notified]);assert.equal((await cleaned).clean,true);
  assert.equal(player(h).gems,14);assert.equal(db.owners.has('real-1'),true);assert.equal(db.owners.has('bot-1'),false);assert.equal(h.fatals.length,0);assert.equal(db.sequence,4);
 }finally{release.resolve();await h.close();}
});

test('full reward cohort ACKs only after fsync; duplicate guards and receipt replay never repeat reopened rewards',{timeout:10000},async()=>{
 const h=await create();let gate,reopened;try{
  const db=h.channels.get(1);gate=holdDurability(h);let acknowledgements=0;
  const award=token=>db.runPlayer('real-1',()=>db.guardedBatch(
   db.prepare('UPDATE players SET xp=xp+10,essence=essence+3,gems=gems+2 WHERE id=? AND NOT EXISTS(SELECT 1 FROM normal_reward_claims WHERE player_id=? AND claim_token=?) RETURNING id').bind('real-1','real-1',token),
   [db.prepare('INSERT INTO normal_reward_claims(monster_id,spawn_round,player_id,claim_token,awarded_at) VALUES(?,1,?,?,?)').bind('fixture-'+token,'real-1',token,Math.floor(Date.now()/1000)),
    db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,created_at) VALUES(?,?,'weapon','Cohort reward','white',1,'avci',?)").bind(token,'real-1',Math.floor(Date.now()/1000))]
  ));
  const jobs=['reward-a','reward-a','reward-b','reward-b'].map(token=>observed(award(token).then(result=>{acknowledgements++;return result;})));
  await gate.entered;await turn();assert.equal(h.requests.length,4);assert.equal(acknowledgements,0);assert.equal(db.sequence,0);
  gate.release();const result=await Promise.all(jobs);assert.deepEqual(result.map(row=>row.guard.results.length),[1,0,1,0]);assert.equal(db.sequence,4);
  const replay=await h.writer.write(h.peers.get(1),h.requests[0].request);assert.equal(replay.writerBatch.replayed,true);
  reopened=new DatabaseSync(h.file,{readOnly:true});
  assert.deepEqual({...reopened.prepare('SELECT xp,essence,gems FROM players WHERE id=?').get('real-1')},{xp:20,essence:6,gems:14});
  assert.deepEqual(reopened.prepare('SELECT id FROM player_items WHERE player_id=? ORDER BY id').all('real-1').map(row=>row.id),['reward-a','reward-b']);
  assert.deepEqual(reopened.prepare('SELECT claim_token FROM normal_reward_claims WHERE player_id=? ORDER BY claim_token').all('real-1').map(row=>row.claim_token),['reward-a','reward-b']);
  assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM channel_write_receipts').get().n,4);assert.equal(h.fatals.length,0);
 }finally{reopened?.close();gate?.release();gate?.restore();await h.close();}
});

