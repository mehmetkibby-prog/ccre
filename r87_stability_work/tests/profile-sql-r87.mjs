import {DatabaseSync} from 'node:sqlite';
import {AsyncLocalStorage} from 'node:async_hooks';
import fs from 'node:fs';
import {threadId} from 'node:worker_threads';
import {GameWriter} from '../working/core511-source/scripts/core511/writer-runtime.mjs';

const active = new AsyncLocalStorage(), records = [], seen = new WeakMap();
function measure(record, method, sql, call) {
 if (!record || record.sqlDepth) return call();
 const key = method + '\n' + String(sql), start = performance.now(); record.sqlDepth = 1;
 try { return call(); }
 finally {
  record.sqlDepth = 0;
  const durationMs = performance.now() - start;
  const row = record.sql.get(key) ?? {method, sql: String(sql), calls: 0, totalMs: 0, maxMs: 0};
  row.calls++; row.totalMs += durationMs; row.maxMs = Math.max(row.maxMs, durationMs); record.sql.set(key, row);
 }
}
const originalPrepare = DatabaseSync.prototype.prepare;
DatabaseSync.prototype.prepare = function (sql, ...args) {
 const statement = measure(active.getStore(), 'prepare', sql, () => Reflect.apply(originalPrepare, this, [sql, ...args]));
 return new Proxy(statement, {
  get(target, name) {
   const value = Reflect.get(target, name, target);
   if (typeof value !== 'function') return value;
   if (!['run', 'all', 'get'].includes(name)) return value.bind(target);
   return function (...bindings) {
    const record = active.getStore();
    if (!record || record.sqlDepth) return Reflect.apply(value, target, bindings);
    const key = name + '\n' + String(sql), start = performance.now();
    record.sqlDepth = 1;
    try { return Reflect.apply(value, target, bindings); }
    finally {
     record.sqlDepth = 0;
     const durationMs = performance.now() - start;
     const row = record.sql.get(key) ?? {method: name, sql: String(sql), calls: 0, totalMs: 0, maxMs: 0};
     row.calls++; row.totalMs += durationMs; row.maxMs = Math.max(row.maxMs, durationMs); record.sql.set(key, row);
    }
   };
  },
 });
};
const originalExec = DatabaseSync.prototype.exec;
DatabaseSync.prototype.exec = function(sql, ...args) {
 return measure(active.getStore(), 'exec', sql, () => Reflect.apply(originalExec, this, [sql, ...args]));
};
const originalCommand = GameWriter.prototype.command;
GameWriter.prototype.command = function (peer, request, ...rest) {
 const ids = seen.get(this) ?? new Set(); seen.set(this, ids);
 const id = request.operationId, replay = ids.has(id); ids.add(id);
 const record = {operation: request.operation, replay, batchSize: 1 + (request.payload?.batchAttacksR57?.length ?? 0), start: performance.now(), sql: new Map()};
 records.push(record);
 return active.run(record, () => {
  const result = Reflect.apply(originalCommand, this, [peer, request, ...rest]);
  return Promise.resolve(result).finally(() => { record.totalMs = performance.now() - record.start; });
 });
};
function flushProfile(){
 if (!records.length) return;
 const serializable = records.map(({start, sql, ...record}) => ({...record, sql: [...sql.values()].sort((a, b) => b.totalMs - a.totalMs)}));
 fs.writeFileSync(new URL('../evidence/sql-thread-'+threadId+'.json', import.meta.url), JSON.stringify({scope: 'Diagnostic only: existing ten serial versus ten native batched attacks; per-statement timings inside GameWriter.command, no SQL parameters', records: serializable}, null, 2) + '\n');
}
setTimeout(flushProfile,25000).unref();
process.on('beforeExit',flushProfile);
