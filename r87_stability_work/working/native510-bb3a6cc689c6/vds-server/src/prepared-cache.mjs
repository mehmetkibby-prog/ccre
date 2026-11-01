// Many native services call database.prepare(sql).get(...) on every request
// (dungeon lock, rank/guild/premium bonuses, bot checks...). node:sqlite
// compiles the SQL again on each prepare(). Reuse compiled statements for the
// same SQL text on this one shared connection.
//
// Safe for this code base: statements are used synchronously (no iterate()
// held across calls) and no caller changes per-statement options. SQLite
// recompiles a cached statement itself after a schema change. The cache is
// bounded, and very long / dynamic SQL is never retained.
export function cachePreparedStatements(database, { maxEntries = 256, maxSqlLength = 16_384 } = {}) {
  const prepare = database.prepare.bind(database);
  const cache = new Map();
  database.prepare = sql => {
    if (typeof sql !== 'string' || sql.length > maxSqlLength) return prepare(sql);
    const cached = cache.get(sql);
    if (cached) { cache.delete(sql); cache.set(sql, cached); return cached; }
    const statement = prepare(sql);
    cache.set(sql, statement);
    if (cache.size > maxEntries) cache.delete(cache.keys().next().value);
    return statement;
  };
  return () => cache.clear();
}
