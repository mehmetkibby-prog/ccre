import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
const hash = value => createHash("sha256").update(value).digest("hex");
const quote = name => `"${name.replace(/"/g, '""')}"`;

export async function importDatabase(directory, job, request) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, "game.sqlite");
  // An interrupted import is kept for inspection; never overwrite it silently.
  await writeFile(file, "", { flag: "wx", mode: 0o600 });
  const manifest = await request({ action: "manifest", job });
  const { sha256, ...data } = manifest;
  if (data.version !== 1 || data.job !== job || hash(JSON.stringify(data)) !== sha256) throw new Error("Invalid transfer manifest");
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest), { mode: 0o600 });
  const db = new DatabaseSync(file);
  let transaction = false;
  try {
    db.exec("PRAGMA foreign_keys=OFF; PRAGMA synchronous=FULL; BEGIN IMMEDIATE");
    transaction = true;
    for (const object of data.objects.filter(o => o.type === "table")) db.exec(object.sql);
    let totalRows = 0;
    for (const table of data.tables) {
      const insert = db.prepare(`INSERT INTO ${quote(table.name)} (${table.columns.map(c => quote(c.name)).join(",")}) VALUES (${table.columns.map(() => "?").join(",")})`);
      for (let offset = 0; offset < table.count;) {
        const page = await request({ action: "page", job, table: table.name, offset });
        if (page.table !== table.name || page.offset !== offset || !Array.isArray(page.rows) || page.rows.length < 1 || page.rows.length > 200 || offset + page.rows.length > table.count || hash(JSON.stringify(page.rows)) !== page.sha256) throw new Error("Invalid transfer page");
        for (const row of page.rows) {
          if (row.length !== table.columns.length) throw new Error("Column count mismatch");
          insert.run(...row.map(value => Array.isArray(value) ? Buffer.from(value) : value));
        }
        offset += page.rows.length;
      }
      const count = db.prepare(`SELECT COUNT(*) AS count FROM ${quote(table.name)}`).get().count;
      if (count !== table.count) throw new Error("Imported row count mismatch");
      totalRows += count;
    }
    for (const sequence of data.sequences) {
      if (!data.tables.some(t => t.name === sequence.name)) continue;
      db.prepare("DELETE FROM sqlite_sequence WHERE name=?").run(sequence.name);
      db.prepare("INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)").run(sequence.name, sequence.seq);
    }
    for (const object of data.objects.filter(o => o.type !== "table")) db.exec(object.sql);
    const integrity = db.prepare("PRAGMA integrity_check").all();
    if (integrity.length !== 1 || Object.values(integrity[0])[0] !== "ok" || db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Imported database integrity check failed");
    db.exec("COMMIT"); transaction = false;
    await writeFile(path.join(directory, "verified.json"), JSON.stringify({ job, manifestHash: sha256, tables: data.tables.length, rows: totalRows, verifiedAt: Date.now() }), { mode: 0o600 });
    return { file, tables: data.tables.length, rows: totalRows, bytes: (await stat(file)).size, manifestHash: sha256 };
  } catch (error) {
    if (transaction) db.exec("ROLLBACK");
    throw error;
  } finally { db.close(); }
}
