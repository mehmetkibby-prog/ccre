import {LOADLAB_CONTEXT_SQL} from './loadlab-writer.mjs';
import {DatabaseSync} from 'node:sqlite';
import {NativeSqlPlan} from './channel-native-plan.mjs';


function guardNativeTrigger507(sql){
 const tokens=[];
 // Skip quoted identifiers/literals and comments. CASE WHEN in the body is
 // never mistaken for the trigger's optional WHEN before its first BEGIN.
 const lexer=/'(?:''|[^'])*'|"(?:""|[^"])*"|\x60(?:\x60\x60|[^\x60])*\x60|\[[^\]]*\]|--[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_][A-Za-z_0-9]*/g;
 for(const m of sql.matchAll(lexer))if(/^[A-Za-z_]/.test(m[0]))tokens.push({word:m[0].toUpperCase(),start:m.index,end:m.index+m[0].length});
 const begin=tokens.find(t=>t.word==='BEGIN');
 if(!begin||tokens[0]?.word!=='CREATE'||!tokens.some(t=>t.word==='TRIGGER'&&t.start<begin.start))throw Error('Unsupported native trigger header');
 const when=tokens.find(t=>t.word==='WHEN'&&t.start<begin.start);
 return when?sql.slice(0,when.start)+'WHEN col_native_refresh507()=0 AND ('+sql.slice(when.end,begin.start)+') '+sql.slice(begin.start):sql.slice(0,begin.start)+'WHEN col_native_refresh507()=0 '+sql.slice(begin.start);
}

const quote=s=>'"'+s.replaceAll('"','""')+'"';

// Explicitly selected rows only. Callers must supply bounded, indexed reads;
// this class never copies the database or historical participation tables.
// A missing table is an error, not an invented empty economy table.
export class NativeWorkspace {
  constructor(source,tables){
    this.source=source;this.sqlite=new DatabaseSync(':memory:');this.tables=new Map();
    this.sqlite.exec(LOADLAB_CONTEXT_SQL);
    for(const table of tables){
      const schema=source.prepare("SELECT sql FROM main.sqlite_schema WHERE type='table' AND name=?").get(table);
      if(!schema)throw Error('Native workspace table missing: '+table);
      this.sqlite.exec(schema.sql);
    }
    for(const table of tables){
      for(const index of source.prepare("SELECT sql FROM main.sqlite_schema WHERE type='index' AND tbl_name=? AND sql IS NOT NULL").all(table))this.sqlite.exec(index.sql);
      const columns=source.prepare(`PRAGMA main.table_info(${quote(table)})`).all().map(c=>c.name);
      this.tables.set(table,{columns,read:this.sqlite.prepare(`SELECT * FROM ${quote(table)}`),clear:this.sqlite.prepare(`DELETE FROM ${quote(table)}`),insert:this.sqlite.prepare(`INSERT INTO ${quote(table)}(${columns.map(quote).join(',')}) VALUES(${columns.map(()=>'?').join(',')})`)});
    }
    this.triggers=source.prepare("SELECT name,tbl_name,sql FROM main.sqlite_schema WHERE type='trigger' AND sql IS NOT NULL").all().filter(r=>this.tables.has(r.tbl_name)&&!["daily_monster_capture477","daily_monster_rollover477","daily_monster_delete477","daily_monster_ban477","daily_monster_account_delete477"].includes(r.name));
    this.refreshing507=false;
    this.sqlite.function('col_native_refresh507',()=>Number(this.refreshing507));
    for(const trigger of this.triggers)this.sqlite.exec(guardNativeTrigger507(trigger.sql));
    // Validate plans against the exact original, partial schema. Some copied
    // triggers refer to intentionally absent guild/arena tables: SQLite resolves
    // those names even when the refresh WHEN is false. Schema-only placeholders
    // permit refreshing, but can never expand the native planner's authority.
    this.validation507=new DatabaseSync(':memory:');
    this.validation507.exec(LOADLAB_CONTEXT_SQL);
    for(const row of this.sqlite.prepare("SELECT type,name,sql FROM sqlite_schema WHERE sql IS NOT NULL AND type IN ('table','index') ORDER BY type DESC").all()){
      if(row.type==='table'&&!this.tables.has(row.name))continue;
      if(row.type==='index'&&!this.sqlite.prepare('SELECT tbl_name FROM sqlite_schema WHERE name=?').get(row.name)?.tbl_name)continue;
      this.validation507.exec(row.sql);
    }
    for(const trigger of this.triggers)this.validation507.exec(trigger.sql);
    for(const [table,spec]of this.tables)for(const sql507 of [`DELETE FROM ${quote(table)}`,`INSERT INTO ${quote(table)}(${spec.columns.map(quote).join(',')}) VALUES(${spec.columns.map(()=>'?').join(',')})`]){
      for(let attempt507=0;;attempt507++){
        try{this.sqlite.prepare('EXPLAIN '+sql507);break;}
        catch(error){
          const name507=/^no such table: (?:main\.)?([A-Za-z_][A-Za-z_0-9]*)$/.exec(error.message)?.[1];
          const schema507=name507&&attempt507<64?source.prepare("SELECT sql FROM main.sqlite_schema WHERE type='table' AND name=?").get(name507):null;
          if(!schema507||this.tables.has(name507))throw error;
          this.sqlite.exec(schema507.sql);
        }
      }
    }
    this.validated507=new Set();
    const actual507=this.sqlite,validation507=this.validation507,validated507=this.validated507;
    this.planDatabase507={get isTransaction(){return actual507.isTransaction;},exec:sql=>actual507.exec(sql),prepare:sql=>{
      if(/^\s*PRAGMA table_info\(/i.test(sql))return validation507.prepare(sql);
      if(!validated507.has(sql)){
        validation507.prepare(sql); // compilation only; no rows or mutations
        if(sql.length<=8192){if(validated507.size>=128)validated507.delete(validated507.values().next().value);validated507.add(sql);}
      }
      return actual507.prepare(sql);
    }};
    // Daily winner capture is authoritative writer bookkeeping. Partial native
    // planning snapshots must not freeze a realm-wide winner or copy its ledger.
  }
  refresh(rows){
    if(rows.size!==this.tables.size||[...rows.keys()].some(t=>!this.tables.has(t)))throw Error('Incomplete native workspace snapshot');
    // Parent/child rows form one bounded snapshot. Defer FK checks until all
    // rows have been installed; the normal helper transaction keeps them on.
    this.sqlite.exec('PRAGMA foreign_keys=OFF; BEGIN');
    try{
      this.refreshing507=true;
      for(const [table,spec]of this.tables){
        const incoming=rows.get(table),current=spec.read.all();
        // Compare actual workspace rows, not the previous input: a native plan
        // may have changed this private database since its last refresh.
        if(current.length===incoming.length&&current.every((row,i)=>spec.columns.every(c=>row[c]===incoming[i][c])))continue;
        spec.clear.run();for(const row of incoming)spec.insert.run(...spec.columns.map(c=>row[c]));
      }
      this.sqlite.exec('COMMIT');
    }catch(error){this.sqlite.exec('ROLLBACK');throw error;}
    finally{this.refreshing507=false;this.sqlite.exec('PRAGMA foreign_keys=ON');}
  }
  plan(){return new NativeSqlPlan(this.planDatabase507);}
  close(){this.sqlite.close();this.validation507.close();this.validated507.clear();}
}
