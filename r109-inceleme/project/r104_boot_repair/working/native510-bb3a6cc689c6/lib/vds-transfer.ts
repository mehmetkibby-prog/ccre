// Full-database transfer. Freeze triggers fence old in-flight writers, not just
// requests that have already observed a maintenance page.
const CONTROL = "col_vds_transfer";
const PREFIX = "col_vds_freeze_";
type Database = { prepare(sql: string): any; batch(statements: any[]): Promise<any[]> };
export const quoteIdentifier = (name: string) => `"${name.replace(/"/g, '""')}"`;
export async function transferHash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
async function control(database: Database) {
  await database.prepare(`CREATE TABLE IF NOT EXISTS ${CONTROL} (id INTEGER PRIMARY KEY CHECK(id=1), job TEXT NOT NULL, token_hash TEXT NOT NULL, state TEXT NOT NULL, frozen_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`).run();
}
export async function transferState(database: Database) {
  await control(database);
  return database.prepare(`SELECT job,state,frozen_at FROM ${CONTROL} WHERE id=1`).first();
}
async function schema(database: Database) {
  const result = await database.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE sql IS NOT NULL ORDER BY type,name").all();
  return result.results.filter((row: any) => !row.name.startsWith("sqlite_") && !row.name.startsWith("_cf_") && row.name !== CONTROL && !row.name.startsWith(PREFIX));
}
export async function freezeTransfer(database: Database, job: string, token: string) {
  await control(database);
  const existing = await database.prepare(`SELECT state FROM ${CONTROL} WHERE id=1`).first();
  if (existing && existing.state !== "aborted") throw new Error("An existing transfer must be resumed or explicitly aborted.");
  const now = Date.now();
  await database.prepare(`INSERT INTO ${CONTROL} (id,job,token_hash,state,frozen_at,expires_at) VALUES(1,?,?,'preparing',0,?) ON CONFLICT(id) DO UPDATE SET job=excluded.job,token_hash=excluded.token_hash,state='preparing',frozen_at=0,expires_at=excluded.expires_at WHERE ${CONTROL}.state='aborted'`)
    .bind(job, await transferHash(token), now + 24 * 3600_000).run();
  const tables = (await schema(database)).filter((row: any) => row.type === "table");
  const statements = tables.flatMap((table: any, index: number) => ["INSERT", "UPDATE", "DELETE"].map(operation => database.prepare(
    `CREATE TRIGGER IF NOT EXISTS ${quoteIdentifier(`${PREFIX}${index}_${operation}`)} BEFORE ${operation} ON ${quoteIdentifier(table.name)} WHEN (SELECT state FROM ${CONTROL} WHERE id=1) IN ('copying','copied','active') BEGIN SELECT RAISE(ABORT,'Game migration maintenance'); END`,
  )));
  for (let offset = 0; offset < statements.length; offset += 30) await database.batch(statements.slice(offset, offset + 30));
  const frozen = await database.prepare(`UPDATE ${CONTROL} SET state='copying',frozen_at=? WHERE id=1 AND job=? AND state='preparing' RETURNING job`).bind(Date.now(), job).first();
  if (!frozen) throw new Error("Transfer ownership changed.");
}
export async function authorizeTransfer(database: Database, token: string, job: string) {
  if (!/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9-]{36}$/.test(job)) return false;
  const row = await database.prepare(`SELECT token_hash,state,expires_at FROM ${CONTROL} WHERE id=1 AND job=?`).bind(job).first();
  return Boolean(row && ["copying", "copied"].includes(row.state) && row.expires_at > Date.now() && row.token_hash === await transferHash(token));
}
export async function transferManifest(database: Database) {
  const state = await transferState(database);
  if (!state || !["copying", "copied"].includes(state.state)) throw new Error("Source is not frozen.");
  const objects = await schema(database);
  const tables = [];
  for (const object of objects.filter((row: any) => row.type === "table")) {
    const columns = (await database.prepare(`PRAGMA table_xinfo(${quoteIdentifier(object.name)})`).all()).results;
    const count = await database.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(object.name)}`).first("count");
    tables.push({ name: object.name, columns: columns.filter((c: any) => !c.hidden).map((c: any) => ({ name: c.name, type: c.type })), count });
  }
  const sequenceExists = await database.prepare("SELECT name FROM sqlite_schema WHERE name='sqlite_sequence'").first();
  const sequences = sequenceExists ? (await database.prepare("SELECT name,seq FROM sqlite_sequence ORDER BY name").all()).results : [];
  const manifest = { version: 1, job: state.job, frozenAt: state.frozen_at, objects, tables, sequences };
  return { ...manifest, sha256: await transferHash(JSON.stringify(manifest)) };
}
export async function transferPage(database: Database, table: string, offset: number) {
  const objects = await schema(database);
  const object = objects.find((row: any) => row.type === "table" && row.name === table);
  if (!object || !Number.isSafeInteger(offset) || offset < 0) throw new Error("Invalid transfer page.");
  const info = (await database.prepare(`PRAGMA table_xinfo(${quoteIdentifier(table)})`).all()).results;
  const columns = info.filter((c: any) => !c.hidden).map((c: any) => c.name);
  const primary = info.filter((c: any) => c.pk).sort((a: any,b: any) => a.pk-b.pk).map((c: any) => quoteIdentifier(c.name));
  const order = /WITHOUT\s+ROWID/i.test(object.sql) ? primary.join(",") : "rowid";
  const result = await database.prepare(`SELECT ${columns.map(quoteIdentifier).join(",")} FROM ${quoteIdentifier(table)} ORDER BY ${order} LIMIT 200 OFFSET ?`).bind(offset).all();
  const rows = result.results.map((row: any) => columns.map((column: string) => row[column]));
  return { table, offset, rows, sha256: await transferHash(JSON.stringify(rows)) };
}
export async function completeCopy(database: Database, job: string) {
  const row = await database.prepare(`UPDATE ${CONTROL} SET state='copied' WHERE id=1 AND job=? AND state IN ('copying','copied') RETURNING job`).bind(job).first();
  if (!row) throw new Error("Invalid copy state.");
}
export async function activateTransfer(database: Database, job: string) {
  const row = await database.prepare(`UPDATE ${CONTROL} SET state='active' WHERE id=1 AND job=? AND state IN ('copied','active') RETURNING job`).bind(job).first();
  if (!row) throw new Error("A verified copy is required.");
}
export async function abortTransfer(database: Database) {
  const row = await database.prepare(`UPDATE ${CONTROL} SET state='aborted',token_hash='' WHERE id=1 AND state IN ('preparing','copying','copied') RETURNING job`).first();
  if (!row) throw new Error("An activated transfer cannot fall back to stale data.");
}
