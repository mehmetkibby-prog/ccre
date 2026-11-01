// V510 feature configuration. All filesystem work occurs once at startup.
// Importing this module alone is inert. Call createV510Features once per process.
import { createHash } from 'node:crypto';
import { constants, closeSync, fstatSync, lstatSync, openSync, readFileSync } from 'node:fs';

export const V510_FEATURE_FILE = '/etc/coreoflife-v510.json';
export const V510_FEATURE_ID = 'v510-runtime';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const demand = (ok, code) => { if (!ok) fail(code); };
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const digest = body => createHash('sha256').update(body).digest('hex');
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const sameKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function v510FeatureContract(definitions) {
  demand(Array.isArray(definitions) && definitions.length > 0 && definitions.length <= 8, 'v510_feature_contract_size');
  let last = '';
  const features = definitions.map(row => {
    demand(sameKeys(row, ['name', 'environment', 'default']) && /^[a-z][A-Za-z0-9-]{0,47}$/.test(row.name) &&
      /^COL_V510_[A-Z0-9_]{1,48}$/.test(row.environment) && typeof row.default === 'boolean' && row.name > last, 'v510_feature_contract_invalid');
    last = row.name;
    return Object.freeze({ name: row.name, environment: row.environment, default: row.default });
  });
  demand(new Set(features.map(row => row.environment)).size === features.length, 'v510_feature_environment_duplicate');
  const document = { schemaVersion: 1, id: V510_FEATURE_ID, features };
  return Object.freeze({ features: Object.freeze(features), sha256: digest(bytes(document)) });
}

export function v510FeatureValues(contract, input = null) {
  if (input !== null) demand(sameKeys(input, contract.features.map(row => row.name)), 'v510_feature_values_inventory');
  const values = Object.fromEntries(contract.features.map(row => {
    const value = input === null ? row.default : input[row.name];
    demand(typeof value === 'boolean', 'v510_feature_value_invalid');
    return [row.name, value];
  }));
  return Object.freeze(values);
}

export function v510FeatureConfigBytes(contract, descriptorSha256, installationIdentity, values) {
  demand(hex(descriptorSha256) && hex(installationIdentity), 'v510_feature_installation_invalid');
  return bytes({ schemaVersion: 1, id: V510_FEATURE_ID, contractSha256: contract.sha256,
    descriptorSha256, installationIdentity, values: v510FeatureValues(contract, values) });
}

export function parseV510FeatureConfig(body, contract) {
  demand(Buffer.isBuffer(body) && body.length > 0 && body.length <= 16384, 'v510_feature_config_size');
  let config;
  try { config = JSON.parse(body.toString('utf8')); } catch { fail('v510_feature_config_json'); }
  demand(sameKeys(config, ['schemaVersion', 'id', 'contractSha256', 'descriptorSha256', 'installationIdentity', 'values']) &&
    config.schemaVersion === 1 && config.id === V510_FEATURE_ID && config.contractSha256 === contract.sha256,
    'v510_feature_config_identity');
  const canonical = v510FeatureConfigBytes(contract, config.descriptorSha256, config.installationIdentity, config.values);
  demand(body.equals(canonical), 'v510_feature_config_not_canonical');
  return Object.freeze({ ...config, values: v510FeatureValues(contract, config.values) });
}

function readOwnedConfig() {
  const parent = lstatSync('/etc');
  demand(parent.isDirectory() && !parent.isSymbolicLink() && parent.uid === 0 && !(parent.mode & 0o022), 'v510_feature_parent_untrusted');
  let before;
  try { before = lstatSync(V510_FEATURE_FILE); } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  demand(before.isFile() && !before.isSymbolicLink() && before.uid === 0 && before.nlink === 1 &&
    (before.mode & 0o7777) === 0o644 && before.size > 0 && before.size <= 16384, 'v510_feature_config_untrusted');
  const fd = openSync(V510_FEATURE_FILE, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(fd);
    demand(opened.dev === before.dev && opened.ino === before.ino && opened.uid === before.uid &&
      opened.mode === before.mode && opened.nlink === 1 && opened.size === before.size, 'v510_feature_config_raced');
    const body = readFileSync(fd);
    demand(body.length === before.size, 'v510_feature_config_raced');
    return body;
  } finally { closeSync(fd); }
}

export function createV510Features(definitions) {
  const contract = v510FeatureContract(definitions);
  const body = readOwnedConfig();
  const labMarker = process.env.COL_V510_LAB_MODE;
  demand(labMarker === undefined || labMarker === 'isolated', 'v510_lab_marker_invalid');
  const lab = labMarker === 'isolated';
  demand(!lab || body === null, 'v510_lab_cannot_read_installed_config');
  let config = body ? parseV510FeatureConfig(body, contract) : null;
  let values = v510FeatureValues(contract, config?.values ?? null);
  if (lab) {
    const overrides = { ...values };
    for (const feature of contract.features) {
      const value = process.env[feature.environment];
      demand(value === undefined || value === '0' || value === '1', 'v510_lab_environment_invalid');
      if (value !== undefined) overrides[feature.name] = value === '1';
    }
    values = v510FeatureValues(contract, overrides);
  } else {
    demand(contract.features.every(feature => process.env[feature.environment] === undefined), 'v510_environment_override_requires_isolated_lab');
  }
  const snapshot = Object.freeze({ schemaVersion: 1, contractSha256: contract.sha256,
    appliedSha256: digest(bytes(values)), configSha256: body ? digest(body) : null,
    source: config ? 'file' : lab ? 'isolated-lab' : 'defaults', values });
  const enabled = name => { demand(Object.hasOwn(values, name), 'v510_unknown_feature'); return values[name]; };
  return Object.freeze({ enabled, snapshot, contract });
}

export const V510_FEATURE_DEFINITIONS = Object.freeze([
  {name:'channelBalance',environment:'COL_V510_CHANNEL_BALANCE',default:true},
  {name:'dungeonSnapshot',environment:'COL_V510_DUNGEON_SNAPSHOT',default:true},
  {name:'mainSql',environment:'COL_V510_MAIN_SQL',default:true},
  {name:'scopedReads',environment:'COL_V510_SCOPED_READS',default:true},
].map(Object.freeze));
