import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {EventEmitter} from 'node:events';
import {fixture} from './native-fixture.mjs';

const turn = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };
const frame = (sql, ...params) => ({sql, params});
const economic = sqlite => ({
  player: {...sqlite.prepare('SELECT xp,essence,gems FROM players WHERE id=?').get('real-1')},
  items: sqlite.prepare('SELECT id FROM player_items WHERE player_id=? ORDER BY id').all('real-1').map(row => row.id),
  claims: sqlite.prepare('SELECT claim_token FROM normal_reward_claims WHERE player_id=? ORDER BY claim_token').all('real-1').map(row => row.claim_token),
});
function award(h, {player = 'real-1', channel = 1, sequence = 1, token = 'award-1', item = token, epoch} = {}) {
  const owner = h.authority.owner(player);
  return {sequence, actor: player, owners: [{playerId: player, epoch: epoch ?? owner.epoch}], deltas: [],
    guard: frame('UPDATE players SET xp=xp+10,essence=essence+3,gems=gems+2 WHERE id=? AND NOT EXISTS(SELECT 1 FROM normal_reward_claims WHERE player_id=? AND claim_token=?) RETURNING id', player, player, token),
    statements: [
      frame('INSERT INTO normal_reward_claims(monster_id,spawn_round,player_id,claim_token,awarded_at) VALUES(?,1,?,?,?)', 'fixture-monster-' + token, player, token, Math.floor(Date.now()/1000)),
      frame("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,created_at) VALUES(?,?,'weapon','Fixture reward','white',1,'avci',?)", item, player, Math.floor(Date.now()/1000)),
    ]};
}
async function normalPlayer(h, id, channel) {
  await h.database.atomic(sqlite => sqlite.prepare("INSERT INTO players(id,name,last_seen,created_at,channel,hp,gems,loadlab_run_id) VALUES(?,?,unixepoch(),unixepoch(),?,100,10,'')").run(id, id, channel));
  await h.channels.get(channel).ensureOwner(id);
}
const responseBody = value => { const {writerTiming, writerBatch, ...body} = value; return body; };

test('controlled-clock queued jobs share one real SQLite commit/fsync; failed job rolls back only its own reward SQL', async () => {
  const h = await fixture();
  try {
    const before = economic(h.database.sqlite), commits = h.database.writeStats.commits, syncs = h.database.walSync.stats.syncs;
    const jobs = [0, 1, 2].map(index => h.database.atomic(sqlite => {
      sqlite.prepare('UPDATE players SET xp=xp+10,essence=essence+3,gems=gems+2 WHERE id=?').run('real-1');
      sqlite.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,created_at) VALUES(?,'real-1','weapon','Fixture reward','white',1,'avci',unixepoch())").run('atomic-' + index);
      if (index === 1) throw Error('fixture_reward_rejected');
      return index;
    }));
    // Hold only the synchronous budget clock for this algorithm unit case. No
    // production cap changes, fake SQL, fake COMMIT or fake fsync are involved.
    // Real-time batching and queue sizes are measured separately by the probe.
    clearImmediate(h.database.writeDrain);h.database.writeDrain=null;
    const descriptor=Object.getOwnPropertyDescriptor(performance,'now'),fixed=performance.now();
    Object.defineProperty(performance,'now',{configurable:true,value:()=>fixed});
    try {h.database.drainWrites();}
    finally {if(descriptor)Object.defineProperty(performance,'now',descriptor);else delete performance.now;}
    const result = await Promise.allSettled(jobs);
    assert.deepEqual(result.map(row => row.status), ['fulfilled','rejected','fulfilled']);
    assert.match(result[1].reason.message, /fixture_reward_rejected/);
    assert.deepEqual(economic(h.database.sqlite), {player: {xp: before.player.xp + 20, essence: before.player.essence + 6, gems: before.player.gems + 4}, items: ['atomic-0','atomic-2'], claims: []});
    assert.equal(h.database.writeStats.commits - commits, 1);
    assert.equal(h.database.walSync.stats.syncs - syncs, 1);
  } finally { await h.close(); }
});

test('real XP, currencies, item and receipt resolve only after WAL fsync; replay and rejected guard never award twice', async () => {
  const h = await fixture();
  const entered = deferred(), release = deferred();
  const originalFlush = h.database.walSync.flush.bind(h.database.walSync);
  let settled = false;
  try {
    h.database.walSync.flush = async () => { entered.resolve(); await release.promise; return originalFlush(); };
    const request = award(h);
    const pending = h.writer.write(h.peers.get(1), request).finally(() => { settled = true; });
    await entered.promise; await turn();
    assert.equal(settled, false, 'no ACK may precede the real WAL flush');
    assert.deepEqual(economic(h.database.sqlite), {player: {xp:10,essence:3,gems:12},items:['award-1'],claims:['award-1']});
    release.resolve();
    const response = await pending;
    h.database.walSync.flush = originalFlush;
    assert.equal(response.result.guard.results.length, 1);
    assert.equal(response.writerBatch.durabilityMode, 'async-wal-fsync');
    assert.ok(response.writerTiming.writer_sql_wall >= 0);
    assert.ok(response.writerTiming.writer_fsync_wait_wall >= 0);
    assert.ok(response.writerBatch.sqlCalls >= 8);
    assert.equal(response.writerBatch.replayed, false);
    const reopened = new DatabaseSync(h.file, {readOnly: true});
    try {
      assert.deepEqual(economic(reopened), {player: {xp:10,essence:3,gems:12},items:['award-1'],claims:['award-1']});
      const receipt = JSON.parse(reopened.prepare('SELECT response FROM channel_write_receipts WHERE channel=1 AND sequence=1').get().response);
      assert.deepEqual(receipt, responseBody(response));
      assert.equal(Object.hasOwn(receipt, 'writerTiming'), false, 'timing must not change the durable economic receipt');
    } finally { reopened.close(); }
    const replay = await h.writer.write(h.peers.get(1), request);
    assert.deepEqual(responseBody(replay), responseBody(response));
    assert.equal(replay.writerBatch.replayed, true);
    const duplicate = await h.writer.write(h.peers.get(1), award(h, {sequence:2}));
    assert.equal(duplicate.result.guard.results.length, 0);
    assert.deepEqual(economic(h.database.sqlite), {player: {xp:10,essence:3,gems:12},items:['award-1'],claims:['award-1']});
    await assert.rejects(h.writer.write(h.peers.get(1), award(h, {sequence:3,token:'forged',epoch:999})), {code:'owner_epoch_fenced'});
    assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS n FROM channel_write_receipts WHERE sequence=3').get().n, 0);
    assert.deepEqual(economic(h.database.sqlite), {player: {xp:10,essence:3,gems:12},items:['award-1'],claims:['award-1']});
    await assert.rejects(h.writer.write(h.peers.get(1), {...request, actor:'bot-1'}), {code:'writer_sequence_reused'});
  } finally { release.resolve(); h.database.walSync.flush = originalFlush; await h.close(); }
});

test('one channel reward constraint failure leaves another channel reward and its receipt intact', async () => {
  const h = await fixture({channels:[1,2]});
  try {
    await normalPlayer(h, 'real-2', 2);
    await h.database.atomic(sqlite => sqlite.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,created_at) VALUES('duplicate-item','real-1','weapon','Existing','white',1,'avci',unixepoch())").run());
    const result = await Promise.allSettled([
      h.writer.write(h.peers.get(1), award(h, {token:'rolled-back',item:'duplicate-item'})),
      h.writer.write(h.peers.get(2), award(h, {player:'real-2',channel:2,token:'sibling-success'})),
    ]);
    assert.equal(result[0].status, 'rejected');
    assert.equal(result[1].status, 'fulfilled');
    assert.deepEqual(economic(h.database.sqlite), {player:{xp:0,essence:0,gems:10},items:['duplicate-item'],claims:[]});
    assert.deepEqual({...h.database.sqlite.prepare('SELECT xp,essence,gems FROM players WHERE id=?').get('real-2')}, {xp:10,essence:3,gems:12});
    assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS n FROM channel_write_receipts WHERE channel=1').get().n, 0);
    assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS n FROM channel_write_receipts WHERE channel=2').get().n, 1);
  } finally { await h.close(); }
});

test('failed COMMIT rolls back all unacknowledged reward jobs and their receipts', async () => {
  const h = await fixture({channels:[1,2]});
  const originalCommit = h.database.commitWrites;
  try {
    await normalPlayer(h, 'real-2', 2);
    h.database.commitWrites = () => { throw Error('fixture_commit_failure'); };
    const result = await Promise.allSettled([
      h.writer.write(h.peers.get(1), award(h)),
      h.writer.write(h.peers.get(2), award(h, {player:'real-2',channel:2,token:'second'})),
    ]);
    assert.ok(result.every(row => row.status === 'rejected' && row.reason.message === 'fixture_commit_failure'));
    assert.deepEqual(economic(h.database.sqlite), {player:{xp:0,essence:0,gems:10},items:[],claims:[]});
    assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS n FROM channel_write_receipts').get().n, 0);
  } finally { h.database.commitWrites = originalCommit; await h.close(); }
});

test('failed WAL durability rejects every unacknowledged job; FULL fallback and receipt replay preserve once-only rewards', async () => {
  const h = await fixture({channels:[1,2]});
  const originalFlush = h.database.walSync.flush;
  const entered = deferred(), release = deferred();
  const recoveryEntered=deferred(),recoveryRelease=deferred();
  const originalRecover=h.database.walSync.recoverDurable.bind(h.database.walSync);
  try {
    await normalPlayer(h, 'real-2', 2);
    const request = award(h);
    h.database.walSync.flush = async () => { entered.resolve(); await release.promise; throw Error('fixture_fsync_failure'); };
    const pending = Promise.allSettled([
      h.writer.write(h.peers.get(1), request),
      h.writer.write(h.peers.get(2), award(h, {player:'real-2',channel:2,token:'second'})),
    ]);
    await entered.promise;
    for(let n=0;n<100&&h.database.sqlite.prepare('SELECT COUNT(*) AS n FROM channel_write_receipts').get().n!==2;n++)await turn();
    assert.equal(h.database.sqlite.prepare('SELECT COUNT(*) AS n FROM channel_write_receipts').get().n, 2, 'both jobs must have committed and be waiting for durability before injecting failure');
    release.resolve();
    const result = await pending;
    assert.ok(result.every(row => row.status === 'rejected' && row.reason.message === 'fixture_fsync_failure'));
    assert.equal(h.database.sqlite.prepare('PRAGMA synchronous').get().synchronous, 2);
    h.database.walSync.flush=originalFlush;
    h.database.walSync.recoverDurable=async()=>{recoveryEntered.resolve();await recoveryRelease.promise;return originalRecover();};
    let acknowledged=false;
    const replayPending=h.writer.write(h.peers.get(1),request).then(response=>{acknowledged=true;return response;});
    await recoveryEntered.promise;await turn();
    assert.equal(acknowledged,false,'FULL pragma and empty COMMIT alone must not ACK an earlier unflushed receipt');
    recoveryRelease.resolve();
    const replay = await replayPending;
    assert.equal(replay.writerBatch.replayed, true);
    assert.equal(replay.writerBatch.durabilityMode, 'recovery-wal-fsync');
    assert.ok(replay.writerTiming.writer_fsync_wait_wall>=0);
    const alreadyDurable=await h.writer.write(h.peers.get(1),request);
    assert.equal(alreadyDurable.writerBatch.durabilityMode,'sqlite-full');
    assert.equal(Object.hasOwn(alreadyDurable.writerTiming, 'writer_fsync_wait_wall'), false, 'FULL COMMIT must not invent isolated fsync timing');
    assert.deepEqual(economic(h.database.sqlite), {player:{xp:10,essence:3,gems:12},items:['award-1'],claims:['award-1']});
  } finally { release.resolve();recoveryRelease.resolve(); h.database.walSync.flush = originalFlush;h.database.walSync.recoverDurable=originalRecover;await h.close(); }
});

test('failed recovery fsync keeps existing receipts unacknowledged for the failed writer epoch',async()=>{
  const h=await fixture();
  const originalFlush=h.database.walSync.flush,originalPath=h.database.walSync.walPath;
  try{
    const request=award(h);
    h.database.walSync.flush=async()=>{throw Error('fixture_initial_fsync_failure');};
    await assert.rejects(h.writer.write(h.peers.get(1),request),/fixture_initial_fsync_failure/);
    h.database.walSync.flush=originalFlush;
    h.database.walSync.walPath=originalPath+'.not-present';
    await assert.rejects(h.writer.write(h.peers.get(1),request),{code:'ENOENT'});
    assert.equal(h.database.fallbackDurabilityRecovered477,false);
    h.database.walSync.walPath=originalPath;
    await assert.rejects(h.writer.write(h.peers.get(1),request),{code:'ENOENT'},'failed recovery stays fail-closed until a new writer epoch');
    assert.deepEqual(economic(h.database.sqlite),{player:{xp:10,essence:3,gems:12},items:['award-1'],claims:['award-1']});
  }finally{h.database.walSync.flush=originalFlush;h.database.walSync.walPath=originalPath;await h.close();}
});

test('an unsuccessful FULL restore forbids receipt ACK instead of assuming durability',async()=>{
  const h=await fixture();
  const originalFlush=h.database.walSync.flush,originalExec=h.database.sqlite.exec;
  try{
    const request=award(h);
    h.database.sqlite.exec=function(sql,...args){if(/^PRAGMA synchronous=FULL$/i.test(sql))throw Error('fixture_full_restore_failure');return Reflect.apply(originalExec,this,[sql,...args]);};
    h.database.walSync.flush=async()=>{throw Error('fixture_initial_fsync_failure');};
    await assert.rejects(h.writer.write(h.peers.get(1),request),/fixture_initial_fsync_failure/);
    assert.equal(h.database.sqlite.prepare('PRAGMA synchronous').get().synchronous,1);
    assert.equal(h.database.fullDurabilityConfirmed477,false);
    await assert.rejects(h.writer.write(h.peers.get(1),request),/full_durability_restore_unconfirmed/);
    assert.equal(h.database.fallbackDurabilityRecovered477,false);
    assert.deepEqual(economic(h.database.sqlite),{player:{xp:10,essence:3,gems:12},items:['award-1'],claims:['award-1']});
  }finally{h.database.sqlite.exec=originalExec;h.database.walSync.flush=originalFlush;await h.close();}
});

test('near-budget writer ACK drops optional timing and remains deliverable through the real IPC encoder', async () => {
  const h = await fixture();
  let client, server;
  try {
    const {ChannelRpc} = await h.importModule('vds-server/src/channel-rpc.mjs');
    const {MAX_CHANNEL_BYTES} = await h.importModule('vds-server/src/channel-protocol.mjs');
    const left = new EventEmitter(), right = new EventEmitter();
    for(const [from,to] of [[left,right],[right,left]]) {from.connected=true;from.send=(message,done)=>setImmediate(()=>{to.emit('message',message);done?.();});}
    client = new ChannelRpc(left, {identity:'writer-budget-fixture',timeoutMs:2000});
    server = new ChannelRpc(right, {identity:'writer-budget-fixture',handlers:{write:request=>h.writer.write(h.peers.get(1),request)}});
    const request={sequence:1,actor:'real-1',owners:[{playerId:'real-1',epoch:h.authority.owner('real-1').epoch}],deltas:[],statements:[frame("SELECT printf('%0*d', ?, 0) AS padding",MAX_CHANNEL_BYTES-2048)]};
    const response=await client.request('write',request);
    assert.equal(response.result[0].results[0].padding.length,MAX_CHANNEL_BYTES-2048);
    assert.equal(Object.hasOwn(response,'writerTiming'),false);
    assert.equal(Object.hasOwn(response,'writerBatch'),false);
    assert.equal(client.stats.timeouts,0);assert.equal(server.stats.errors,0);
    const replay=await client.request('write',request);
    assert.deepEqual(replay,response);
  } finally {client?.close();server?.close();await h.close();}
});
