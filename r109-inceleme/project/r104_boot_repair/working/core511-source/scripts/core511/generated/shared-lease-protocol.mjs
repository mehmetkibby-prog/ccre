import {createHash} from 'node:crypto';

export const CHANNEL_PROTOCOL = 'col-channel-ipc-v1';
export const MAX_CHANNEL_BYTES = 1024 * 1024;
export const CHANNEL_COUNT = 4;
export function channelProcessesEnabled(value = process.env.CORE_CHANNEL_PROCESSES) {
  if (value === undefined || value === '' || value === '0') return false;
  if (value === '1') return true;
  throw new Error('CORE_CHANNEL_PROCESSES must be 0 or 1');
}
export function channelNumber(value) {
  if (!Number.isInteger(value) || value < 1 || value > CHANNEL_COUNT) throw new Error('invalid_channel');
  return value;
}
export function opaqueId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.:-]{1,160}$/.test(value)) throw new Error('invalid_identifier');
  return value;
}
export function jsonBytes(value, limit = MAX_CHANNEL_BYTES) {
  const json = JSON.stringify(value);
  if (json === undefined || Buffer.byteLength(json) > limit) throw new Error('ipc_payload_limit');
  return json;
}
export const requestDigest = value => createHash('sha256').update(jsonBytes(value)).digest('hex');
export function channelError(code) { return Object.assign(new Error(code), {code}); }

