import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';

// This connection never changes game rows or weakens commit durability. PASSIVE
// checkpointing does not wait for readers/writers; a later pass resumes its work.
if (!existsSync(workerData.databasePath)) throw new Error('Checkpoint database is missing');
const database = new DatabaseSync(workerData.databasePath);
if (database.prepare('PRAGMA journal_mode').get().journal_mode !== 'wal') throw new Error('Checkpoint worker requires WAL mode');
database.exec('PRAGMA synchronous=FULL; PRAGMA busy_timeout=0; PRAGMA wal_autocheckpoint=0; PRAGMA cache_size=-2048;');
const checkpoint = database.prepare('PRAGMA wal_checkpoint(PASSIVE)');
const pageSize = Number(database.prepare('PRAGMA page_size').get().page_size);
parentPort.on('message', message => {
  if (message?.type !== 'checkpoint') return;
  const started = performance.now(),startedAtMs477=Date.now();
  try {
    const result = checkpoint.get();
    parentPort.postMessage({ id: message.id, busy: Number(result.busy), log: Number(result.log), checkpointed: Number(result.checkpointed), durationMs: performance.now() - started,startedAtMs477,endedAtMs477:Date.now() });
  } catch (error) {
    parentPort.postMessage({ id: message.id, error: error.message });
  }
});
parentPort.postMessage({ ready: true, pageSize, sqliteVersion: process.versions.sqlite });
