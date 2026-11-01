import {sources} from './fixture.mjs';
// R11 frozen candidate: actual published updater functions, no updater top-level.
// Service and filesystem boundaries are isolated in-memory fixtures.
import { describe } from 'node:test';
// Actual updater helpers, isolated service/filesystem responses. No installer,
// systemd operation, game process, production database, or network is executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

for (const branch of ['live-r10','live-r10-video']) {
const source = sources[branch].source;
const scenario=(name,fn)=>test('R11 '+branch+' pipeline: '+name,fn);
const extract = (start, end) => {
  const offset = source.indexOf(start), stop = source.indexOf(end, offset + start.length);
  assert.ok(offset >= 0 && stop > offset); return source.slice(offset, stop);
};
const constValue = name => source.match(new RegExp("const " + name + " = '([^']+)';"))[1];
const settingCode = extract('function writerSettingBytes(', 'function system(');
const toggleCode = extract('function writerInstallationIdentity(', 'async function authenticateHistory(');
const recoveryCode = extract('async function recover(', 'function writerInstallationIdentity(')+'\n'+sources[branch].functions.get('restoreFeatureFile');
const stateCode = extract('function serviceState(', 'async function emptyCgroup(');
const hash = value => createHash('sha256').update(value).digest('hex');
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const check = (ok, code) => { if (!ok) throw Object.assign(Error(code), { code }); };
const err = code => Object.assign(Error(code), { code });
const base = { Buffer, Date, path, hash, jsonBytes, check, err, now: () => '2026-10-06T12:00:00.000Z',
  ID: constValue('ID'), DESCRIPTOR_SHA: constValue('DESCRIPTOR_SHA'), WRITER_UNIT: constValue('WRITER_UNIT'),
  WRITER_ENV: constValue('WRITER_ENV'), WRITER_DROPIN: constValue('WRITER_DROPIN'),
  parseJSON: (bytes) => JSON.parse(bytes.toString()), console: { log() {}, error() {} } };
function helpers(code, names, additions = {}) {
  return new vm.Script(code + '\n({' + names.join(',') + '})').runInContext(vm.createContext({ ...base, ...additions }), { timeout: 1000 });
}
const expectCode = (fn, code) => assert.rejects(fn, error => error.code === code);

scenario('setting contents are exact one-variable 0/1 and reject arbitrary values', () => {
  const h = helpers(settingCode, ['writerSettingBytes']);
  for (const value of ['0', '1']) assert.equal(h.writerSettingBytes(value).toString(), '# Managed by V477 PERF R4 writer toggle\n[Service]\nEnvironment=CORE_CHANNEL_WRITER_PIPELINE=' + value + '\n');
  for (const value of [null, '', 'true', '0\nExecStart=/bin/sh']) assert.throws(() => h.writerSettingBytes(value), { code: 'writer_setting_invalid' });
});
scenario('systemd environment parser ignores quoted unrelated values and returns only flag', () => {
  const h = helpers(settingCode, ['configuredWriterValue']);
  assert.equal(h.configuredWriterValue('SECRET="value CORE_CHANNEL_WRITER_PIPELINE=0 hidden" CORE_CHANNEL_WRITER_PIPELINE=1'), '1');
  assert.equal(h.configuredWriterValue('"SECRET=value CORE_CHANNEL_WRITER_PIPELINE=0 hidden"'), null);
  assert.equal(h.configuredWriterValue('"CORE_CHANNEL_WRITER_PIPELINE=0" "OTHER=hello world"'), '0');
});
scenario('systemd environment parser rejects duplicate, malformed and unknown mode', () => {
  const h = helpers(settingCode, ['configuredWriterValue']);
  for (const raw of ['CORE_CHANNEL_WRITER_PIPELINE=2', 'CORE_CHANNEL_WRITER_PIPELINE=0 CORE_CHANNEL_WRITER_PIPELINE=1']) assert.throws(() => h.configuredWriterValue(raw), { code: 'writer_environment_invalid' });
  assert.throws(() => h.configuredWriterValue('"CORE_CHANNEL_WRITER_PIPELINE=0'), { code: 'writer_environment_unreadable' });
});
scenario('read setting requires owned 0644 bounded no-follow reader and exact bytes', async () => {
  let bytes = Buffer.from('# Managed by V477 PERF R4 writer toggle\n[Service]\nEnvironment=CORE_CHANNEL_WRITER_PIPELINE=0\n');
  const h = helpers(settingCode, ['readWriterSetting'], { has: async file => { assert.equal(file, base.WRITER_DROPIN); return true; },
    fileBytes: async (file, options) => { assert.equal(file, base.WRITER_DROPIN); assert.equal(options.mode, 0o644); assert.equal(options.max, 512); return bytes; } });
  assert.equal(await h.readWriterSetting(), '0');
  bytes = Buffer.concat([bytes, Buffer.from('Environment=EXTRA=1\n')]);
  await expectCode(() => h.readWriterSetting(), 'foreign_writer_override');
});
scenario('missing writer setting means default ON without reading a secret/config file', async () => {
  const h = helpers(settingCode, ['readWriterSetting'], { has: async () => false, fileBytes: async () => assert.fail('read forbidden') });
  assert.equal(await h.readWriterSetting(), null);
});

function runtimeFixture({ requested = '0', configured = '0', running = '0' } = {}) {
  const context = { writerSetting: requested, nativeTarget: '/owned/native', nativeNode: '/owned/node' };
  const h = helpers(settingCode, ['writerRuntimeStatus'], { context, has: async () => requested !== null,
    fileBytes: async () => Buffer.from('# Managed by V477 PERF R4 writer toggle\n[Service]\nEnvironment=CORE_CHANNEL_WRITER_PIPELINE=' + requested + '\n'),
    serviceState: () => ({ ActiveState: 'active', MainPID: '42' }),
    system: () => 'SECRET=not-for-output' + (configured === null ? '' : ' CORE_CHANNEL_WRITER_PIPELINE=' + configured),
    fs: { realpath: async file => file.endsWith('/cwd') ? context.nativeTarget : context.nativeNode,
      readFile: async () => Buffer.from('SECRET=never-print\0' + (running === null ? '' : 'CORE_CHANNEL_WRITER_PIPELINE=' + running + '\0')) } });
  return h;
}
scenario('status shows only requested/configured/running mode and no unrelated env', async () => {
  const result = await runtimeFixture().writerRuntimeStatus();
  assert.equal(result.running, 'off'); assert.equal(result.restartRequired, false);
  assert.ok(!JSON.stringify(result).includes('SECRET')); assert.ok(!JSON.stringify(result).includes('never-print'));
});
scenario('status truthfully reports stale systemd configuration and restart pending', async () => {
  const h = runtimeFixture({ requested: '0', configured: null, running: null });
  const result = await h.writerRuntimeStatus({ strict: false });
  assert.equal(result.requested, '0'); assert.equal(result.setting, 'default-on'); assert.equal(result.running, 'on'); assert.equal(result.restartRequired, true);
  await expectCode(() => h.writerRuntimeStatus(), 'writer_systemd_setting_differs');
});
scenario('strict readiness rejects a process that did not inherit OFF', async () => {
  const h = runtimeFixture({ requested: '0', configured: '0', running: null });
  await expectCode(() => h.writerRuntimeStatus(), 'writer_restart_required');
});
scenario('status allowance never accepts unrelated systemd overrides', () => {
  const unit = base.WRITER_UNIT, prefix = '/etc/systemd/system/' + unit + '.d/90-col-loadlab.conf';
  let dropins = prefix;
  const context = { writerSetting: '0' };
  const h = helpers(stateCode, ['serviceState'], { context, UNITS: [unit], ACTIVE: [unit], CODE: '/owned', ROLES: ['server.mjs'], LEGACY_BACKUP_UNIT: 'other.timer', LEGACY_BACKUP_DROPIN: '/unused',
    system: () => 'LoadState=loaded\nFragmentPath=/etc/systemd/system/' + unit + '\nUnitFileState=enabled\nDropInPaths=' + dropins + '\nWorkingDirectory=/owned/current\nExecStart=/usr/bin/node server.mjs' });
  assert.throws(() => h.serviceState(unit), { code: 'unexpected_native_override' });
  h.serviceState(unit, { allowWriterReloadPending: true });
  dropins += ' /etc/systemd/system/' + unit + '.d/evil.conf';
  assert.throws(() => h.serviceState(unit, { allowWriterReloadPending: true }), { code: 'unexpected_native_override' });
});

function toggleFixture({ active = true, setting = null, failCleanup = false, failStart = false, interruptAfterStop = false } = {}) {
  const trace = [], disk = new Map();
  const context = { featureBytes:null, writerSetting: setting, etc: '/etc/col-loadlab-live', transactionFile: '/etc/col-loadlab-live/main.json', unit: 'gateway.service', target: '/r4/gateway', nativeTarget: '/r4/native', previous: '/r3/gateway', nativePrevious: '/r3/native', receipt: '/etc/receipt', nativeReceipt: '/etc/native-receipt' };
  const tx = { originalFeatureConfiguration:null, originalWriterSetting: null, id: base.ID, descriptorSha256: base.DESCRIPTOR_SHA, createdAtMs: 42, nextReceiptSha256: 'outer', nextNativeReceiptSha256: 'native', phase: 'committed', gatewayStartAttempted: true, states: { saved: true }, quiescenceAt: 'initial-install-clean' };
  let gatewayActive = active;
  const call = name => async (...args) => { trace.push([name, ...args]); };
  const additions = { context,
    has: async file => disk.has(file), fileBytes: async file => { if (!disk.has(file)) throw err('ENOENT'); return disk.get(file); },
    selection: async () => context.target, nativeSelection: async () => context.nativeTarget,
    receiptState: async () => ({ outer: tx.nextReceiptSha256, native: tx.nextNativeReceiptSha256 }),
    preserved: call('preserved'), unitState: () => ({ ActiveState: gatewayActive ? 'active' : 'inactive', MainPID: gatewayActive ? '52' : '0' }),
    controllerIdentity: call('controllerIdentity'),
    quiesce: async journal => { trace.push(['quiesce']); if (failCleanup) throw err('cleanup_not_acknowledged'); journal.quiescenceAt = 'fresh-clean'; journal.phase = 'global_quiesced'; },
    cleanDiskState: call('cleanDiskState'), nativeClean: async () => { trace.push(['nativeClean']); if (failCleanup) throw err('native_test_records_remain'); },
    stopTuple: async journal => { trace.push(['stopTuple']); gatewayActive = false; if (interruptAfterStop) { interruptAfterStop = false; journal.phase = 'native_stopped'; throw err('fixture_interruption_after_stop'); } },
    setWriterSetting: async value => { trace.push(['setWriterSetting', value]); context.writerSetting = value; },
    startNative: async () => { trace.push(['startNative']); if (failStart) throw err('fixture_start_failed'); },
    nativeReady: call('nativeReady'), gatewayReady: call('gatewayReady'), serviceStatesPreserved: call('serviceStatesPreserved'),
    writerRuntimeStatus: async () => ({ running: context.writerSetting === '0' ? 'off' : 'on', restartRequired: false }),
    checkpoint: async (journal, phase) => { journal.phase = phase; trace.push(['checkpoint', phase, context.transactionFile]); disk.set(context.transactionFile, jsonBytes(journal)); },
    durable: async (file, bytes) => { trace.push(['durable', file]); disk.set(file, bytes); },
    system: (...args) => { trace.push(['system', ...args]); if (args[0] === 'start') gatewayActive = true; },
    note() {}, validateMetadata: call('validateMetadata'), prepareNativeSelection: call('prepareNativeSelection'), selectNative: call('selectNative'), select: call('select'), restoreMetadata: call('restoreMetadata') };
  const h = helpers(toggleCode + recoveryCode, ['writerInstallationIdentity', 'writerJournal', 'retireWriterJournal', 'changeWriterSetting', 'recover'], additions);
  const pending = phase => ({ schemaVersion: 1, id: base.ID + '-writer-toggle', descriptorSha256: base.DESCRIPTOR_SHA, installationIdentity: h.writerInstallationIdentity(tx), from: null, to: '1', createdAtMs: 50, createdAt: 'created', gatewayStartAttempted: phase === 'gateway_starting', phase, ...(phase !== 'prepared' ? { quiescenceAt: 'fresh-clean' } : {}) });
  return { h, context, tx, trace, disk, pending, journalPath: context.etc + '/' + base.ID + '.writer-toggle.json' };
}
for (const desired of ['0', '1']) scenario('mode ' + desired + ' cleans then stops then changes then verifies, installation journal untouched', async () => {
  const f = toggleFixture(), before = jsonBytes(f.tx);
  await f.h.changeWriterSetting(f.tx, desired);
  const at = name => f.trace.findIndex(row => row[0] === name);
  assert.ok(at('quiesce') < at('stopTuple') && at('stopTuple') < at('setWriterSetting') && at('setWriterSetting') < at('startNative') && at('startNative') < at('nativeReady'));
  assert.equal(f.context.transactionFile, '/etc/col-loadlab-live/main.json'); assert.deepEqual(jsonBytes(f.tx), before);
  assert.equal(JSON.parse(f.disk.get(f.journalPath)).phase, 'completed'); assert.ok(!f.disk.has('/etc/col-loadlab-live/main.json'));
});
scenario('failed cleanup cannot stop any service or change flag', async () => {
  const f = toggleFixture({ failCleanup: true });
  await expectCode(() => f.h.changeWriterSetting(f.tx, '0'), 'cleanup_not_acknowledged');
  assert.ok(!f.trace.some(row => ['stopTuple', 'setWriterSetting', 'startNative'].includes(row[0])));
  assert.equal(f.context.transactionFile, '/etc/col-loadlab-live/main.json');
});
scenario('interrupted config rename resumes with daemon-reload before service operations', async () => {
  const f = toggleFixture({ active: false, setting: '1' });
  await f.h.changeWriterSetting(f.tx, '1', f.pending('configured'));
  assert.ok(f.trace.findIndex(row => row[0] === 'system' && row[1] === 'daemon-reload') < f.trace.findIndex(row => row[0] === 'stopTuple'));
  assert.equal(JSON.parse(f.disk.get(f.journalPath)).phase, 'completed');
});
scenario('explicit OFF can complete interrupted ON without replacing install journal', async () => {
  const f = toggleFixture({ active: false, setting: '1' });
  await f.h.changeWriterSetting(f.tx, '0', f.pending('configured'));
  assert.equal(f.context.writerSetting, '0'); assert.equal(JSON.parse(f.disk.get(f.journalPath)).to, '0'); assert.equal(f.tx.phase, 'committed');
});
scenario('failed native start preserves resumable toggle and original install tx', async () => {
  const f = toggleFixture({ failStart: true });
  await expectCode(() => f.h.changeWriterSetting(f.tx, '0'), 'fixture_start_failed');
  assert.equal(JSON.parse(f.disk.get(f.journalPath)).phase, 'configured'); assert.equal(f.tx.phase, 'committed'); assert.equal(f.context.transactionFile, '/etc/col-loadlab-live/main.json');
});
scenario('fresh toggle cleanup resets gateway attempt before stop and supports second interruption', async () => {
  const f = toggleFixture({ active: true, setting: '1', interruptAfterStop: true }), pending = f.pending('gateway_starting');
  await expectCode(() => f.h.changeWriterSetting(f.tx, '0', pending), 'fixture_interruption_after_stop');
  assert.equal(pending.gatewayStartAttempted, false);
  assert.equal(JSON.parse(f.disk.get(f.journalPath)).gatewayStartAttempted, false);
  const callsBefore = f.trace.filter(row => row[0] === 'nativeClean').length;
  await f.h.changeWriterSetting(f.tx, '0', pending);
  assert.equal(f.trace.filter(row => row[0] === 'nativeClean').length, callsBefore);
  assert.equal(JSON.parse(f.disk.get(f.journalPath)).phase, 'completed'); assert.equal(f.context.writerSetting, '0');
});
scenario('rollback directly consumes pre-gateway toggle cleanup proof despite failed R11 startup', async () => {
  const f = toggleFixture({ active: false, setting: '1', failCleanup: true });
  await f.h.recover(f.tx, Buffer.from('r3-outer'), Buffer.from('r3-native'), f.pending('configured'));
  assert.ok(!f.trace.some(row => row[0] === 'nativeClean')); assert.equal(f.tx.phase, 'rolled_back');
  const at = name => f.trace.findIndex(row => row[0] === name);
  assert.ok(at('stopTuple') < at('setWriterSetting') && at('setWriterSetting') < at('selectNative'));
  assert.equal(f.context.writerSetting, null);
});
scenario('rollback cannot reuse cleanup proof after gateway start may have occurred', async () => {
  const f = toggleFixture({ active: false, setting: '1', failCleanup: true });
  await expectCode(() => f.h.recover(f.tx, Buffer.from('old'), Buffer.from('old'), f.pending('gateway_starting')), 'native_test_records_remain');
  assert.ok(!f.trace.some(row => row[0] === 'selectNative'));
});
scenario('rollback cannot reuse toggle proof after a recovery gateway may have started', async () => {
  const f = toggleFixture({ active: false, setting: null, failCleanup: true });
  f.tx.phase = 'recovery_gateway_starting'; f.tx.recoveryGatewayStartAttempted = true;
  await expectCode(() => f.h.recover(f.tx, Buffer.from('old'), Buffer.from('old'), f.pending('configured')), 'native_test_records_remain');
  assert.ok(!f.trace.some(row => row[0] === 'selectNative'));
});
scenario('recovery gateway attempt is journaled before R4 gateway can start', async () => {
  const f = toggleFixture({ active: false, setting: null });
  await f.h.recover(f.tx, Buffer.from('old'), Buffer.from('old'), f.pending('configured'));
  const marker = f.trace.findIndex(row => row[0] === 'checkpoint' && row[1] === 'recovery_gateway_starting');
  const start = f.trace.findIndex(row => row[0] === 'system' && row[1] === 'start');
  assert.ok(marker >= 0 && marker < start);
});
scenario('fresh recovery cleanup resets gateway attempt markers before stop and supports second interruption', async () => {
  const f = toggleFixture({ active: true, setting: null, interruptAfterStop: true });
  f.tx.phase = 'recovery_gateway_starting'; f.tx.recoveryGatewayStartAttempted = true;
  const late = f.pending('gateway_starting');
  await expectCode(() => f.h.recover(f.tx, Buffer.from('old'), Buffer.from('old'), late), 'fixture_interruption_after_stop');
  assert.equal(f.tx.gatewayStartAttempted, false); assert.equal(f.tx.recoveryGatewayStartAttempted, false); assert.equal(f.tx.phase, 'native_stopped');
  const callsBefore = f.trace.filter(row => row[0] === 'nativeClean').length;
  await f.h.recover(f.tx, Buffer.from('old'), Buffer.from('old'), late);
  assert.equal(f.trace.filter(row => row[0] === 'nativeClean').length, callsBefore, 'stopped services cannot be required to answer after the journaled clean barrier');
  assert.equal(f.tx.phase, 'rolled_back');
});
scenario('rollback reloads after interrupted drop-in unlink before strict native state reads', async () => {
  const f = toggleFixture({ active: false, setting: null });
  await f.h.recover(f.tx, Buffer.from('old'), Buffer.from('old'), f.pending('configured'));
  assert.ok(f.trace.findIndex(row => row[0] === 'system' && row[1] === 'daemon-reload') < f.trace.findIndex(row => row[0] === 'stopTuple'));
  assert.equal(f.tx.phase, 'rolled_back');
});
scenario('prepared journal retired by successful rollback stays parseable without fabricated cleanup time', async () => {
  const f = toggleFixture(); const journal = f.pending('prepared');
  await f.h.retireWriterJournal(journal);
  assert.equal((await f.h.writerJournal(f.tx)).phase, 'rolled_back'); assert.equal(journal.quiescenceAt, undefined);
});
scenario('toggle journal cannot be replayed against another installation', async () => {
  const f = toggleFixture(), journal = f.pending('configured'); journal.installationIdentity = 'foreign';
  f.disk.set(f.journalPath, jsonBytes(journal));
  await expectCode(() => f.h.writerJournal(f.tx), 'writer_journal_differs');
});
scenario('rollback dispatch bypasses pending R11 resume and retirement follows previous recovery', async () => {
  assert.ok(source.includes("if (operation !== 'rollback' && tx.phase === 'committed' && pendingWriter"));
  const dispatch=extract("  if (operation === 'rollback') {\n    if (tx.phase === 'rolled_back')", "  if (!['authenticated', 'staging', 'staged', 'rolled_back'].includes(tx.phase))");
  for(const featurePending of [false,true]){
    const events=[],tx={phase:'committed'},pendingWriter={kind:'writer'},pendingFeature={kind:'feature'},originalBytes=Buffer.from('outer'),nativeBytes=Buffer.from('native');
    const bindings={operation:'rollback',tx,pendingWriter,pendingFeature,featurePending,originalBytes,nativeBytes,
      recover:async(...args)=>{assert.deepEqual(args,[tx,originalBytes,nativeBytes,featurePending?pendingFeature:pendingWriter]);events.push('recover-start');await new Promise(resolve=>setImmediate(resolve));events.push('recover-complete');},
      retireWriterJournal:async value=>{assert.equal(value,pendingWriter);assert.equal(events.at(-1),'recover-complete');events.push('retire-writer');},
      retireFeatureJournal:async value=>{assert.equal(value,pendingFeature);assert.equal(events.at(-1),'retire-writer');events.push('retire-feature');}};
    const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
    assert.equal(await new AsyncFunction(...Object.keys(bindings),dispatch)(...Object.values(bindings)),0);
    assert.deepEqual(events,['recover-start','recover-complete','retire-writer','retire-feature']);
  }
});

}
