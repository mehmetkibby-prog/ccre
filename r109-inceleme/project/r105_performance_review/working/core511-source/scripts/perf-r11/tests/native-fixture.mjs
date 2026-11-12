import {mkdtemp, cp, readFile, rm, access, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path, {join, resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const toolsRoot = resolve(here, '../..');
const r5 = resolve(here, '..');
const baseline = process.env.COL_NATIVE_TEST_ROOT;
const baselineSha256 = process.env.COL_NATIVE_TEST_MANIFEST_SHA256;
if (!baseline || !/^[a-f0-9]{64}$/.test(baselineSha256 ?? '')) throw Error('Explicit native root and manifest SHA256 required');
const schemaFile = join(baseline, 'vds-server/src/app.mjs');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function verifyBaseline() {
  const manifestBytes = await readFile(join(baseline, 'realm-package-manifest.json'));
  if (sha256(manifestBytes) !== baselineSha256) throw Error('Native fixture manifest hash mismatch');
  const entries = new Map(JSON.parse(manifestBytes).files.map(row => [row.path, row]));
  const checked = [];
  async function visit(relative) {
    for (const item of await readdir(join(baseline, relative), {withFileTypes: true})) {
      const name = relative + '/' + item.name;
      if (item.isDirectory()) await visit(name);
      else {
        if (!item.isFile()) throw Error('Non-regular fixture baseline member: ' + name);
        const row = entries.get(name), bytes = await readFile(join(baseline, name));
        if (!row || bytes.length !== row.bytes || sha256(bytes) !== row.sha256) throw Error('Fixture baseline member differs: ' + name);
        checked.push(name);
      }
    }
  }
  await visit('vds-server/src');await visit('lib');
  const absent = [...entries.keys()].filter(name => (name.startsWith('vds-server/src/') || name.startsWith('lib/')) && !checked.includes(name));
  if (absent.some(name => name !== 'vds-server/src/loadtest-entry.mjs')) throw Error('Missing fixture runtime member: ' + absent.join(','));
  return {manifestSha256: baselineSha256, verifiedMembers: checked.length, unchangedMissing: absent};
}
const quote = text => '"' + text.replaceAll('"', '""') + '"';
const insert = (sqlite, table, row) => {
  const columns = Object.keys(row);
  return sqlite.prepare('INSERT INTO ' + quote(table) + '(' + columns.map(quote).join(',') + ') VALUES(' + columns.map(() => '?').join(',') + ')').run(...Object.values(row));
};

// Only disposable local SQLite files and in-process, authenticated-pipe stand-ins
// are used. The production database, owner authority, writer, channel database,
// child cleanup handlers and cleanup orchestrator are imported without rewriting.
export async function fixture({variant = 'r6', groupWrites = true, asyncDurable = true, channels: channelNumbers = [1], channelDatabaseFile = null, keepStartupTriggers = false} = {}) {
  if (variant !== 'r6') throw Error('Unknown fixture variant: ' + variant);
  if (!channelNumbers.length || new Set(channelNumbers).size !== channelNumbers.length || channelNumbers.some(channel => ![1, 2, 3].includes(channel))) throw Error('Invalid fixture channels');
  const directory = await mkdtemp(join(tmpdir(), 'col-r11-native-fixture-'));
  const runtime = join(directory, 'runtime');
  const src = join(runtime, 'vds-server/src');
  const file = join(directory, 'realm.sqlite');
  const channels = new Map(), peers = new Map(), controls = new Map(), projections = new Map();
  const fatals = [], changeLog = [], requests = [], rpcLog = [], stops = [];
  const previousRegistry = globalThis.__colLoadLab;
  let database, registry, closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    for (const projection of projections.values()) await projection.close();
    for (const db of channels.values()) {
      await db.writeTail.catch(() => {});
      if (db.memoryFlush) await db.memoryFlush.catch(() => {});
      db.close();
    }
    if (database) {
      while (database.writeQueue.length) database.drainWrites();
      await database.walSync?.durable().catch(() => {});
      database.close();
    }
    if (globalThis.__colLoadLab === registry) {
      if (previousRegistry === undefined) delete globalThis.__colLoadLab;
      else globalThis.__colLoadLab = previousRegistry;
    }
    await rm(directory, {recursive: true, force: true});
  };
  try {
    const baselineProof = await verifyBaseline();
    await cp(join(baseline, 'vds-server/src'), src, {recursive: true});
    await cp(join(baseline, 'lib'), join(runtime, 'lib'), {recursive: true});
    await cp(join(baseline, 'realtime-server/src'), join(runtime, 'realtime-server/src'), {recursive: true});
    // Test-only pinned historical adapter comparison; never changes a package.
    if (channelDatabaseFile) await cp(channelDatabaseFile, join(src, 'channel-database.mjs'));
    const importModule = relative => import(pathToFileURL(join(runtime, relative)).href);
    const [{LocalDatabase}, {ChannelAuthority}, {ChannelWriter}, {ChannelDatabase}, {installLoadLabChildControl}, {cleanupLoadLabRun}, {ensureRealmLabSchema}, {WorldLoop}] = await Promise.all([
      importModule('vds-server/src/database.mjs'),
      importModule('vds-server/src/channel-authority.mjs'),
      importModule('vds-server/src/channel-writer.mjs'),
      importModule('vds-server/src/channel-database.mjs'),
      importModule('vds-server/src/loadlab/child-control.mjs'),
      importModule('vds-server/src/loadlab/cleanup.mjs'),
      importModule('vds-server/src/loadlab/realm-control.mjs'),
      importModule('vds-server/src/world-loop.mjs'),
    ]);
    database = new LocalDatabase(file, {create: true, groupWrites, asyncDurable});
    const schemaBytes = await readFile(schemaFile);
    const sqlite=database.sqlite;sqlite.exec('PRAGMA foreign_keys=OFF');
    for(const migration of(await readdir(join(baseline,'drizzle'))).filter(f=>/^\d+_[a-z0-9_]+\.sql$/.test(f)).sort())sqlite.exec(await readFile(join(baseline,'drizzle',migration),'utf8'));
    sqlite.exec("INSERT OR IGNORE INTO world_state(id,health,updated_at) VALUES(1,100,1)");
    const app=schemaBytes.toString(),end=app.indexOf('} finally { migrationDb.close(); }'),start=app.lastIndexOf('try {',app.indexOf('const betaColumns'));
    if(!(start>=0&&end>start))throw Error('R6 schema initialization anchor missing');
    const body=app.slice(start+5,end),deps={migrationDb:sqlite,path,config:{database:file},process:{env:{...process.env,CORE_DATA_ROOT:directory}}};
    for(const match of app.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)){
      if(!match[2].startsWith('.'))continue;
      const pairs=match[1].split(',').map(x=>x.trim().split(/\s+as\s+/)).filter(([n,a])=>new RegExp('\\b'+(a??n)+'\\b').test(body));
      if(!pairs.length)continue;const loaded=await import(pathToFileURL(path.resolve(src,match[2])));for(const[n,a]of pairs)deps[a??n]=loaded[n];
    }
    const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;await new AsyncFunction(...Object.keys(deps),body)(...Object.values(deps));
    (await importModule('vds-server/src/starter-reward.mjs')).createStarterReward(sqlite);
    // Retain exact R6 table/index schema, while these inherited writer-isolation
    // tests intentionally use representative economic SQL without world triggers.
    // Actual startup reward trigger coverage belongs to the separate reward suite.
    if(!keepStartupTriggers)for(const trigger of sqlite.prepare("SELECT name FROM sqlite_schema WHERE type='trigger'").all())sqlite.exec('DROP TRIGGER '+quote(trigger.name));
    sqlite.exec('DELETE FROM world_state');
    ensureRealmLabSchema(sqlite);sqlite.exec('PRAGMA foreign_keys=ON');
    const schema=sqlite.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND sql IS NOT NULL").all().map(x=>x.sql);
    // Production migration uses a separate connection; reopen the runtime so
    // LocalDatabase establishes its own FULL or explicit WAL-fsync mode.
    database.close();database=new LocalDatabase(file,{create:false,groupWrites,asyncDurable});
    const runId = 'run-cleanup', firstChannel = channelNumbers[0];
    const botIds = ['bot-1', 'bot-2'], realIds = ['real-1'];
    const playerIds = [...botIds, ...realIds];
    const accountIds = new Map(playerIds.map(id => [id, 'account-' + id]));
    let runStatus = 'revoked';
    registry = {
      enabled: () => true,
      hasKnownEntities: () => true,
      playerRun: id => botIds.includes(id) ? runId : '',
      monsterRun: () => '',
      accountRun: id => botIds.some(bot => accountIds.get(bot) === id) ? runId : '',
      bossMonster: () => null,
      active: id => id === runId && runStatus === 'active',
      runStatus: id => id === runId ? runStatus : null,
      snapshot: () => ({runs: [{id: runId, status: runStatus}]}),
      setRunStatus: status => {
        if (!['active', 'revoked'].includes(status)) throw Error('Invalid fixture run status');
        runStatus = status;
      },
      stop: (id, reason) => { stops.push({runId: id, reason}); if (id === runId) runStatus = 'revoked'; },
      apply: frame => { const run = frame?.runs?.find(run => run.id === runId); if (run) registry.setRunStatus(run.status); return {ok: true}; },
    };
    globalThis.__colLoadLab = registry;
    const now = Math.floor(Date.now() / 1000);
    await database.atomic(sqlite => {
      insert(sqlite, 'world_state', {id: 1, health: 100, updated_at: now, cycle: 1});
      for (const id of playerIds) {
        const bot = botIds.includes(id), accountId = accountIds.get(id), name = bot ? 'BOT_0' + (botIds.indexOf(id) + 1) : 'Human Fixture';
        const username = bot ? name : 'human-fixture';
        const email = bot ? accountId + '@loadlab.invalid' : 'human@fixture.invalid';
        insert(sqlite, 'accounts', {id: accountId, username, username_normalized: username.toLowerCase(), email, email_normalized: email, password_hash: bot ? 'REALM-NO-PASSWORD' : 'fixture-only-password', password_salt: 'fixture', created_at: now, updated_at: now});
        insert(sqlite, 'players', {id, account_id: accountId, name, role: 'avci', last_seen: now, created_at: now, channel: firstChannel, area: 'forest', x: 100 + playerIds.indexOf(id) * 20, y: 100, hp: 100, max_hp: 100, gems: 10, loadlab_run_id: bot ? runId : ''});
        insert(sqlite, 'auth_sessions', {token_hash: 'token-' + id, csrf_hash: 'csrf-' + id, account_id: accountId, created_at: now - 600, last_seen_at: now - 600, expires_at: now + 3600, security_version: 1});
        if (bot) {
          insert(sqlite, 'loadlab_entities_v1', {kind: 'player', id, run_id: runId, account_id: accountId, descriptor_json: JSON.stringify({id, name, accountId, channel: firstChannel})});
          insert(sqlite, 'loadlab_admissions_v1', {account_id: accountId, run_id: runId, username, created_ms: now * 1000});
        }
      }
    });
    const authority = new ChannelAuthority(database, {realmId: 'r6-local-fixture'});
    await authority.initialize();
    const writer = await new ChannelWriter(database, authority).initialize();
    const supervisor = {children: new Map()};
    for (const channel of channelNumbers) {
      const peer = {channel, incarnation: 'fixture-incarnation-' + channel};
      peers.set(channel, peer);
      await authority.registerProcess(channel, peer.incarnation);
      const eventRange = await writer.reserveEvents(peer);
      const db = new ChannelDatabase(file, {
        channel, eventRange,
        claim: id => authority.claim(id, channel, peer.incarnation),
        request: async request => {
          requests.push({channel, request: structuredClone(request)});
          const response = await writer.write(peer, request);
          changeLog.push({channel, changes: structuredClone(response.changed ?? [])});
          return response;
        },
      });
      db.onFatal = error => { fatals.push({channel, code: error.code ?? error.message, error}); };
      db.onCommitted = changes => changeLog.push({channel, local: true, changes: structuredClone(changes ?? [])});
      channels.set(channel, db);
      const world = new WorldLoop(db.sqlite, {positions: db.positions, combat: db.combat, channel});
      db.worldLoop = world;
      projections.set(channel, {world, close: async () => world.stop()});
      const rpc = {handlers: {}};
      const installed = installLoadLabChildControl({rpc, db, registry});
      controls.set(channel, {...rpc.handlers, handlers: rpc.handlers, ...installed});
      supervisor.children.set(channel, {
        ...peer, ready: true,
        rpc: {request: async (method, payload) => {
          rpcLog.push({channel, method, payload: structuredClone(payload)});
          if (typeof rpc.handlers[method] !== 'function') throw Error('Unknown fixture RPC: ' + method);
          return rpc.handlers[method](payload);
        }},
      });
      for (const id of playerIds) if (channel === firstChannel) {
        await db.ensureOwner(id);
        db.combat.syncEntity('players', id);
      }
    }
    return {
      database, writer, authority, peers, channels, controls, registry, supervisor, projections,
      runId, botIds, realIds, playerIds, accountIds, file, directory, runtime, src,
      fatals, changeLog, requests, rpcLog, stops, cleanupLoadLabRun, importModule, close,
      setRunStatus: registry.setRunStatus,
      cleanup: options => cleanupLoadLabRun({database, supervisor, registry, runId, ...options}),
      provenance: {variant, keepStartupTriggers, baseline: baselineProof, schemaFile, schemaSha256: sha256(schemaBytes), schemaStatements: schema.length, schemaTables: schema.filter(sql => /^CREATE TABLE\b/i.test(sql)).length, node: process.version, sqlite: database.sqlite.prepare('SELECT sqlite_version() AS version').get().version},
    };
  } catch (error) {
    await close();
    throw error;
  }
}
