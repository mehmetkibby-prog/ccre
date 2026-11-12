// PERF R11 feature configuration. All filesystem work occurs once at startup.
// Importing this module alone is inert. Call createPerfR11Features once per process.
import { createHash } from 'node:crypto';
import { constants, closeSync, fstatSync, lstatSync, openSync, readFileSync } from 'node:fs';

export const PERF_R11_FEATURE_FILE = '/etc/coreoflife-perf-r11.json';
export const PERF_R11_FEATURE_ID = 'v477-perf-r11';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const demand = (ok, code) => { if (!ok) fail(code); };
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const digest = body => createHash('sha256').update(body).digest('hex');
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const sameKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function perfR11FeatureContract(definitions) {
  demand(Array.isArray(definitions) && definitions.length > 0 && definitions.length <= 8, 'perf_r11_feature_contract_size');
  let last = '';
  const features = definitions.map(row => {
    demand(sameKeys(row, ['name', 'environment', 'default']) && /^[a-z][A-Za-z0-9-]{0,47}$/.test(row.name) &&
      /^COL_PERF_R11_[A-Z0-9_]{1,48}$/.test(row.environment) && typeof row.default === 'boolean' && row.name > last, 'perf_r11_feature_contract_invalid');
    last = row.name;
    return Object.freeze({ name: row.name, environment: row.environment, default: row.default });
  });
  demand(new Set(features.map(row => row.environment)).size === features.length, 'perf_r11_feature_environment_duplicate');
  const document = { schemaVersion: 1, id: PERF_R11_FEATURE_ID, features };
  return Object.freeze({ features: Object.freeze(features), sha256: digest(bytes(document)) });
}

export function perfR11FeatureValues(contract, input = null) {
  if (input !== null) demand(sameKeys(input, contract.features.map(row => row.name)), 'perf_r11_feature_values_inventory');
  const values = Object.fromEntries(contract.features.map(row => {
    const value = input === null ? row.default : input[row.name];
    demand(typeof value === 'boolean', 'perf_r11_feature_value_invalid');
    return [row.name, value];
  }));
  return Object.freeze(values);
}

export function perfR11FeatureConfigBytes(contract, descriptorSha256, installationIdentity, values) {
  demand(hex(descriptorSha256) && hex(installationIdentity), 'perf_r11_feature_installation_invalid');
  return bytes({ schemaVersion: 1, id: PERF_R11_FEATURE_ID, contractSha256: contract.sha256,
    descriptorSha256, installationIdentity, values: perfR11FeatureValues(contract, values) });
}

export function parsePerfR11FeatureConfig(body, contract) {
  demand(Buffer.isBuffer(body) && body.length > 0 && body.length <= 16384, 'perf_r11_feature_config_size');
  let config;
  try { config = JSON.parse(body.toString('utf8')); } catch { fail('perf_r11_feature_config_json'); }
  demand(sameKeys(config, ['schemaVersion', 'id', 'contractSha256', 'descriptorSha256', 'installationIdentity', 'values']) &&
    config.schemaVersion === 1 && config.id === PERF_R11_FEATURE_ID && config.contractSha256 === contract.sha256,
    'perf_r11_feature_config_identity');
  const canonical = perfR11FeatureConfigBytes(contract, config.descriptorSha256, config.installationIdentity, config.values);
  demand(body.equals(canonical), 'perf_r11_feature_config_not_canonical');
  return Object.freeze({ ...config, values: perfR11FeatureValues(contract, config.values) });
}

function readOwnedConfig() {
  const parent = lstatSync('/etc');
  demand(parent.isDirectory() && !parent.isSymbolicLink() && parent.uid === 0 && !(parent.mode & 0o022), 'perf_r11_feature_parent_untrusted');
  let before;
  try { before = lstatSync(PERF_R11_FEATURE_FILE); } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  demand(before.isFile() && !before.isSymbolicLink() && before.uid === 0 && before.nlink === 1 &&
    (before.mode & 0o7777) === 0o644 && before.size > 0 && before.size <= 16384, 'perf_r11_feature_config_untrusted');
  const fd = openSync(PERF_R11_FEATURE_FILE, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(fd);
    demand(opened.dev === before.dev && opened.ino === before.ino && opened.uid === before.uid &&
      opened.mode === before.mode && opened.nlink === 1 && opened.size === before.size, 'perf_r11_feature_config_raced');
    const body = readFileSync(fd);
    demand(body.length === before.size, 'perf_r11_feature_config_raced');
    return body;
  } finally { closeSync(fd); }
}

export function createPerfR11Features(definitions) {
  const contract = perfR11FeatureContract(definitions);
  const body = readOwnedConfig();
  const labMarker = process.env.COL_PERF_R11_LAB_MODE;
  demand(labMarker === undefined || labMarker === 'isolated', 'perf_r11_lab_marker_invalid');
  const lab = labMarker === 'isolated';
  demand(!lab || body === null, 'perf_r11_lab_cannot_read_installed_config');
  let config = body ? parsePerfR11FeatureConfig(body, contract) : null;
  let values = perfR11FeatureValues(contract, config?.values ?? null);
  if (lab) {
    const overrides = { ...values };
    for (const feature of contract.features) {
      const value = process.env[feature.environment];
      demand(value === undefined || value === '0' || value === '1', 'perf_r11_lab_environment_invalid');
      if (value !== undefined) overrides[feature.name] = value === '1';
    }
    values = perfR11FeatureValues(contract, overrides);
  } else {
    demand(contract.features.every(feature => process.env[feature.environment] === undefined), 'perf_r11_environment_override_requires_isolated_lab');
  }
  const snapshot = Object.freeze({ schemaVersion: 1, contractSha256: contract.sha256,
    appliedSha256: digest(bytes(values)), configSha256: body ? digest(body) : null,
    source: config ? 'file' : lab ? 'isolated-lab' : 'defaults', values });
  const enabled = name => { demand(Object.hasOwn(values, name), 'perf_r11_unknown_feature'); return values[name]; };
  return Object.freeze({ enabled, snapshot, contract });
}
