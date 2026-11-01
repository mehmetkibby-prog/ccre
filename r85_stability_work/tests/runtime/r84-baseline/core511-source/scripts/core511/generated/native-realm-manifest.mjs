import path from 'node:path';

const idPattern = /^[a-z][a-z0-9-]{0,31}$/;
const statuses = new Set(['open', 'closed', 'maintenance']);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
function requireValue(ok, message) { if (!ok) throw new Error(`Realm manifest: ${message}`); }
function dataPath(value, label) {
  requireValue(typeof value === 'string' && path.isAbsolute(value) && !value.includes('\0'), `${label} must be an absolute path`);
  requireValue(path.normalize(value) === value && value !== '/', `${label} must be canonical`);
  return value;
}
function httpsOrigin(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`Realm manifest: invalid ${label}`); }
  requireValue(url.protocol === 'https:' && url.origin === value && !url.username && !url.password, `${label} must be a canonical HTTPS origin`);
  return value;
}

// Configuration only: loading a manifest never creates a database, starts a
// service, changes the admission limit, or opens a closed realm.
export function validateRealmManifest(input) {
  requireValue(input && input.version === 1, 'unsupported version');
  requireValue(input.phase === '416a' || input.phase === '416b' || input.phase === '417', 'unknown rollout phase');
  requireValue(typeof input.primaryRealmId === 'string' && idPattern.test(input.primaryRealmId), 'primaryRealmId required');
  const accountsDatabase = dataPath(input.accountsDatabase, 'accountsDatabase');
  const authOrigin = httpsOrigin(input.authOrigin, 'authOrigin');
  requireValue(integer(input.authPort, 1024, 65535), 'invalid auth port');
  requireValue(Array.isArray(input.realms) && input.realms.length >= 1 && input.realms.length <= 32, 'expected 1–32 realms');
  const ids = new Set(), origins = new Set([authOrigin]), ports = new Set([input.authPort]);
  const roots = [], databases = new Set([accountsDatabase]);
  const realms = input.realms.map(row => {
    requireValue(row && idPattern.test(row.id), 'invalid realm id');
    requireValue(!ids.has(row.id), 'duplicate realm id'); ids.add(row.id);
    requireValue(typeof row.name === 'string' && row.name.trim().length >= 1 && row.name.length <= 80, 'invalid realm name');
    requireValue(statuses.has(row.status), 'invalid realm status');
    requireValue(typeof row.registrationOpen === 'boolean', 'registrationOpen must be explicit');
    requireValue(row.coreProtocol === undefined || row.coreProtocol === "coreoflife-kernel-v1", 'unknown core protocol');
    const core511 = row.coreProtocol === "coreoflife-kernel-v1";
    requireValue(row.channels === (core511 ? 4 : 3), 'channel count must match the explicit core protocol');
    requireValue(!core511 || input.phase !== '416a' && row.initialChannelCapacity === 25, 'CORE511 requires four channels of 25');
    requireValue(integer(row.initialChannelCapacity, 1, 30), 'invalid initial channel capacity');
    requireValue(input.phase !== '416a' || row.initialChannelCapacity === 15, '416a initial capacity is 15');
    requireValue(!['416a','417'].includes(input.phase) || row.id === input.primaryRealmId || row.status === 'closed', 'additional realms remain closed in 416a');
    const origin = httpsOrigin(row.origin, 'realm origin');
    const realtimeOrigin = httpsOrigin(row.realtimeOrigin, 'realtime origin');
    for (const value of [origin, realtimeOrigin]) {
      requireValue(!origins.has(value), 'origins cannot be shared'); origins.add(value);
    }
    const dataRoot = dataPath(row.dataRoot, 'realm dataRoot');
    requireValue(!roots.some(root => dataRoot === root || dataRoot.startsWith(root + '/') || root.startsWith(dataRoot + '/')), 'realm data roots overlap');
    roots.push(dataRoot);
    const database = dataPath(row.database, 'realm database');
    requireValue(database.startsWith(dataRoot + '/'), 'realm database is outside its data root');
    requireValue(!databases.has(database), 'database path reused'); databases.add(database);
    const boundPorts = {};
    for (const key of ['proxy', 'app', 'realtime', 'dungeon', 'voice']) {
      const value = row.ports?.[key] ?? (key==='voice' ? row.ports?.dungeon+1 : undefined);
      requireValue(integer(value, 1024, 65535) && !ports.has(value), `invalid or reused ${key} port`);
      ports.add(value); boundPorts[key] = value;
    }
    if (core511) {
      requireValue(Array.isArray(row.ports.channels) && row.ports.channels.length === 4, 'CORE511 requires four channel ports');
      boundPorts.channels = Object.freeze(row.ports.channels.map(value => {
        requireValue(integer(value, 1024, 65535) && !ports.has(value), 'invalid or reused channel port');
        ports.add(value); return value;
      }));
    } else requireValue(row.ports?.channels === undefined, 'legacy realm cannot specify channel ports');
    requireValue(typeof row.dbIdentity === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(row.dbIdentity), 'invalid database identity');
    return Object.freeze({ id: row.id, name: row.name.trim(), status: row.status,
      registrationOpen: row.registrationOpen, channels: row.channels, ...(core511 ? {coreProtocol: row.coreProtocol} : {}), initialChannelCapacity: row.initialChannelCapacity,
      origin, realtimeOrigin, dataRoot, database, dbIdentity: row.dbIdentity, ports: Object.freeze(boundPorts) });
  });
  requireValue(!roots.some(root => accountsDatabase.startsWith(root + '/')), 'account database cannot be inside a realm data root');
  requireValue(ids.has(input.primaryRealmId), 'primary realm missing');
  requireValue(new Set(realms.map(row => row.dbIdentity)).size === realms.length, 'database identity reused');
  return Object.freeze({ version: 1, phase: input.phase, primaryRealmId: input.primaryRealmId, accountsDatabase, authOrigin,
    authPort: input.authPort, realms: Object.freeze(realms) });
}

export function publicRealmCatalog(manifest, healthByRealm, nowMs = Date.now()) {
  return manifest.realms.map(realm => {
    const health = healthByRealm.get(realm.id);
    const current = health?.realmId === realm.id && health.dbIdentity === realm.dbIdentity &&
      Number.isFinite(health.sampledAtMs) && health.sampledAtMs <= nowMs && nowMs - health.sampledAtMs <= 15000 &&
      health.ready === true && integer(health.channelCapacity, 1, 30) &&
      (!realm.coreProtocol || health.protocol === realm.coreProtocol && health.channelCapacity === 25) &&
      Array.isArray(health.channels) && health.channels.length === realm.channels && health.channels.every(n => integer(n, 0, 100000));
    const capacity = current ? health.channelCapacity : realm.initialChannelCapacity;
    const online = current ? health.channels.reduce((sum, count) => sum + count, 0) : null;
    const status = realm.status !== 'open' ? realm.status : !current ? 'unavailable' :
      health.channels.every(count => count >= capacity) ? 'full' : 'open';
    // Explicit projection: no paths, ports, credentials, DB identity or private
    // health/account fields become part of the selection-screen response.
    return { id: realm.id, name: realm.id===manifest.primaryRealmId?"Çekirdek":realm.name, origin: realm.origin, status,
      registrationOpen: realm.registrationOpen, capacity: capacity * realm.channels, channelCapacity: capacity,
      online, channels: current ? [...health.channels] : null };
  });
}
