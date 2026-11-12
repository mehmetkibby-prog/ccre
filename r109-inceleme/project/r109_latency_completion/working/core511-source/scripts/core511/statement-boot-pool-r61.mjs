import {combatStatementManifestR61} from './combat-statement-manifest-r61.mjs';
import {initializeRewardCodeR54} from './reward-code-r54.mjs';
import {rewardSqlCompilationShapesR108} from './reward-sql-r531.mjs';
export const statementBootPoolR61=process.env.CORE511_R61_STATEMENT_BOOT==='1';

// One-shot boot preparation. Statements, rows,
// bindings, native statement options and iterators are never reused by this pool.
const installed = new WeakMap();
const MAX_QUERIES = 128, MAX_SQL_BYTES = 1024 * 1024, MAX_COPIES = 2, MAX_RETAINED_QUERIES = 8;
const allowed = /^\s*(?:SELECT|INSERT|UPDATE|DELETE|REPLACE|WITH)\b/i;
const schemaWords = /\b(?:CREATE|ALTER|DROP|ATTACH|DETACH|VACUUM|REINDEX)\b/i;
const readonlyPragmas = new Set(['schema_version','data_version','table_info','table_xinfo','foreign_key_list','index_list','index_info','index_xinfo','function_list','module_list','database_list','pragma_list','compile_options','collation_list','table_list']);
const unsafePragma = sql => {
  if (!/\bPRAGMA\b/i.test(sql)) return false;
  const match = /^\s*PRAGMA\s+(?:(?:main|temp)\.)?([a-z_]+)\b([^;]*);?\s*$/i.exec(sql);
  return !match || !readonlyPragmas.has(match[1].toLowerCase()) || match[2].includes('=') || ['schema_version','data_version'].includes(match[1].toLowerCase()) && match[2].includes('(');
};
const sqlBytes = sql => Math.max(sql.length * 2, Buffer.byteLength(sql));
const compileOnly = sql => allowed.test(sql) && !schemaWords.test(sql) && !/\bPRAGMA\b/i.test(sql) && !sql.trimEnd().replace(/;$/, '').includes(';');

export function installStatementBootPool(sqlite, manifest, {enabled = false, copies = 2} = {}) {
  if (!enabled) return null;
  if (installed.has(sqlite)) return installed.get(sqlite);
  if (!sqlite || typeof sqlite.prepare !== 'function' || !Array.isArray(manifest) || manifest.length > MAX_QUERIES || !Number.isInteger(copies) || copies < 1 || copies > MAX_COPIES) throw new TypeError('Invalid statement boot pool');
  const queries = new Map(), retained = new Set(), releaseAfterUse = new Set(); let retainedBytes = 0;
  for (const entry of manifest) {
    const sql = typeof entry === 'string' ? entry : entry?.sql;
    const count = typeof entry === 'string' ? copies : entry?.copies ?? copies;
    if(typeof entry==='object'&&entry?.retain!==undefined&&typeof entry.retain!=='boolean')throw new TypeError('Invalid retained boot SQL entry');
    if(typeof entry==='object'&&entry?.releasePoolOnHit!==undefined&&(typeof entry.releasePoolOnHit!=='boolean'||entry.releasePoolOnHit&&!entry.retain))throw new TypeError('Invalid boot SQL completion entry');
    if (typeof sql !== 'string' || !Number.isInteger(count) || count < 1 || count > MAX_COPIES) throw new TypeError('Invalid boot SQL entry');
    if (queries.has(sql)) throw new TypeError('Duplicate boot SQL entry');
    retainedBytes += sqlBytes(sql) * count;
    if (retainedBytes > MAX_SQL_BYTES) throw new TypeError('Statement boot pool SQL limit');
    queries.set(sql, count);
    if(typeof entry==='object'&&entry.retain===true)retained.add(sql);
    if(typeof entry==='object'&&entry.releasePoolOnHit===true)releaseAfterUse.add(sql);
  }
  if(retained.size>MAX_RETAINED_QUERIES)throw new TypeError('Retained boot SQL limit');
  const originalPrepare = sqlite.prepare, slots = new Map(), replacements = [];
  const metrics = {compiled:0, compileFailures:0, unsupported:0, hits:0, misses:0, lookups:0, remaining:0, retainedRemaining:0, lookupExpired:false, sqlBytes:0, compileMs:0, invalidated:null};
  let main, temp, initial, active = true;
  const original = (sql, ...args) => Reflect.apply(originalPrepare, sqlite, [sql, ...args]);
  // Metadata reads only. No manifest query is executed at installation time.
  const versions = () => [main.get().schema_version, temp.get().schema_version];
  const restore = () => {
    for (const {name, wrapper, descriptor} of replacements) if (sqlite[name] === wrapper) {
      if (descriptor) Object.defineProperty(sqlite, name, descriptor); else delete sqlite[name];
    }
  };
  const discard = reason => {
    if (!active) return;
    active = false; slots.clear(); metrics.remaining = 0; metrics.retainedRemaining = 0; metrics.sqlBytes = 0; metrics.invalidated = reason;
    restore();
  };
  const expireGeneral = () => {
    metrics.lookupExpired=true;
    for(const [sql,entries]of slots)if(!retained.has(sql)){
      metrics.remaining-=entries.length;metrics.sqlBytes-=sqlBytes(sql)*entries.length;slots.delete(sql);
    }
    if(!metrics.remaining)discard('lookup_limit');
  };
  const handle = Object.freeze({stats:() => ({...metrics}), discard:() => discard('explicit')});
  installed.set(sqlite, handle);
  try {
    main = original('PRAGMA main.schema_version'); temp = original('PRAGMA temp.schema_version'); initial = versions();
    for (const [sql, count] of queries) {
      if (!compileOnly(sql)) { metrics.unsupported++; continue; }
      const entries = [];
      for (let i = 0; i < count; i++) {
        const start = performance.now();
        try { entries.push(original(sql)); metrics.compiled++; }
        catch { metrics.compileFailures++; break; }
        finally { metrics.compileMs += performance.now() - start; }
      }
      if (entries.length) { slots.set(sql, entries); metrics.remaining += entries.length; if(retained.has(sql))metrics.retainedRemaining+=entries.length; metrics.sqlBytes += sqlBytes(sql) * entries.length; }
    }
    if (versions().some((version, i) => version !== initial[i])) { discard('schema_during_boot'); return handle; }
  } catch {
    discard('metadata_unavailable'); return handle;
  }
  if (!metrics.remaining) { discard('empty'); return handle; }
  const replace = (name, build) => {
    if (typeof sqlite[name] !== 'function') return;
    const originalMethod = sqlite[name], descriptor = Object.getOwnPropertyDescriptor(sqlite, name), wrapper = build(originalMethod);
    Object.defineProperty(sqlite, name, {configurable:true, enumerable:descriptor?.enumerable ?? false, writable:true, value:wrapper});
    replacements.push({name, wrapper, descriptor});
  };
  try {
    replace('prepare', method => function(sql, ...args) {
      if (active && this === sqlite && ++metrics.lookups >= 1024 && !metrics.lookupExpired) expireGeneral();
      // Unknown native signatures/options and foreign receivers retain their
      // original behavior. They never consume a precompiled native object.
      if (!active || this !== sqlite || args.length || typeof sql !== 'string') return Reflect.apply(method, this, [sql, ...args]);
      if (schemaWords.test(sql) || unsafePragma(sql)) discard('schema_prepare');
      const entries = active && slots.get(sql);
      if (entries?.length) {
        let current;
        try { current = versions(); } catch { discard('metadata_unavailable'); }
        if (active && current.some((version, i) => version !== initial[i])) discard('schema_version');
        if (active) {
          const statement = entries.shift(); metrics.hits++; metrics.remaining--; metrics.sqlBytes -= sqlBytes(sql);
          if(retained.has(sql))metrics.retainedRemaining--;
          if (!entries.length) slots.delete(sql);
          if(releaseAfterUse.has(sql))discard('retained_complete');
          else if (!metrics.remaining) discard('consumed');
          return statement;
        }
      }
      metrics.misses++; return Reflect.apply(method, this, [sql, ...args]);
    });
    replace('exec', method => function(sql, ...args) {
      if (this === sqlite && (typeof sql !== 'string' || schemaWords.test(sql) || unsafePragma(sql))) discard('schema_exec');
      return Reflect.apply(method, this, [sql, ...args]);
    });
    for (const name of ['function','aggregate','loadExtension','close','defaultSafeIntegers','unsafeMode','setAuthorizer']) replace(name, method => function(...args) {
      if (this === sqlite) discard(name);
      return Reflect.apply(method, this, args);
    });
  } catch { discard('unsupported_wrapper'); }
  return handle;
}

export function prepareCombatStatementBootR61(sqlite){
 if(!statementBootPoolR61)return null;
 initializeRewardCodeR54(sqlite);
 return installStatementBootPool(sqlite,bossStatementBootManifestR108(),{enabled:true});
}
export function statementBootPoolStatsR61(sqlite){return installed.get(sqlite)?.stats()??null;}

// The native world boss is never eligible for the ordinary monster quest.
// Use the pinned native XP template with ONLY that exact assignment removed.
// If the known template changes, retain the original general manifest instead.
// The experimental regression must prove equality with actual native boss SQL.
export function bossStatementBootManifestR108(){
 const prefix='WITH RECURSIVE reward_input(seen_since,xp_amount) AS (SELECT ?,?), sources AS MATERIALIZED (';
 const quest='UPDATE players SET quest_kills438=MIN(1000000000,quest_kills438+1),';
 const normal=combatStatementManifestR61.find(sql=>sql.startsWith(prefix)&&sql.includes(quest));
 const claim=combatStatementManifestR61.find(sql=>sql.startsWith('WITH reward_input(seen_since,xp_amount) AS (SELECT ?,?), sources AS (')&&sql.includes('INSERT OR IGNORE INTO monster_xp_claims('));
 if(!normal||!claim||normal.split(quest).length!==2)return combatStatementManifestR61;
 const boss=normal.replace(quest,'UPDATE players SET ');
 const bossShapes=rewardSqlCompilationShapesR108(boss);
 if(!bossShapes.length)return combatStatementManifestR61;
 const selected=new Set([claim,boss,...rewardSqlCompilationShapesR108(claim),...bossShapes]);
 const completed=new Set(bossShapes.filter(sql=>sql.includes('UPDATE players SET ')));
 if(selected.size>MAX_RETAINED_QUERIES)return combatStatementManifestR61;
 const known=new Set(combatStatementManifestR61),manifest=combatStatementManifestR61.map(sql=>({sql,retain:selected.has(sql)}));
 // The native consumer now owns this last UPDATE handle. Release unused
 // fallback shapes/copies too, so a boss completion cannot retain the wrapper.
 for(const sql of selected)if(!known.has(sql))manifest.push({sql,copies:1,retain:true,releasePoolOnHit:completed.has(sql)});
 return manifest;
}
