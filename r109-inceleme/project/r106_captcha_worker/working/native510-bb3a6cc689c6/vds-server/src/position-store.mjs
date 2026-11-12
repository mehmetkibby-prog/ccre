import {PositionRecentSet,createResidentPresenceRefresh} from './resident-position-changes.mjs';
import {dirtyWriter} from './dirty-writer.mjs';
import {FlushMetrics} from './flush-metrics.mjs';
import {openSync,fsyncSync,closeSync,existsSync} from 'node:fs';
import {reportRuntimeWork} from './runtime-performance.mjs';

// Only the main process owns these records. HP, inventory, money, sessions and
// scope permissions remain in SQLite. The extra fields are the position's CAS,
// speed-budget and motion sequence, never a second copy of game/economy state.
export const POSITION_FIELDS=['x','y','movement_checked_at_ms','movement_debt_ms','position_revision','motion_stream_id','motion_sequence'];
const SCOPE=['area','channel','arena_match_id','realtime_scope_version'];
const COLUMNS=['id',...POSITION_FIELDS,...SCOPE];
const selectColumns=COLUMNS.map(name=>`"${name}"`).join(',');
const same=(a,b)=>POSITION_FIELDS.every(key=>a[key]===b[key])&&SCOPE.every(key=>a[key]===b[key]);
const tokenPattern=/'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[(?:[^\]])*\]|--[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_][A-Za-z_0-9]*|[().,;]/g;
const keywords=new Set('WHERE JOIN LEFT RIGHT INNER OUTER FULL CROSS NATURAL ON USING GROUP ORDER LIMIT OFFSET UNION INTERSECT EXCEPT HAVING WINDOW RETURNING SET INDEXED NOT'.split(' '));

// Number anonymous bindings once at prepare time so index prefilters can reuse
// a cutoff without changing the caller's binding order. Literals/comments stay intact.
export function indexedPresenceSql(sql){
  if(!/\blast_seen\s*>=\s*\?/i.test(sql))return sql;
  let n=0;
  sql=sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|\?(\d+)?/g,(v,number)=>{if(v[0]!=='?')return v;if(number){n=Math.max(n,Number(number));return v;}return '?'+(++n);});
  return sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|\b((?:[A-Za-z_][A-Za-z_0-9]*\.)?)last_seen\s*>=\s*(\?\d+)/gi,(match,alias,cutoff)=>
    cutoff===undefined?match:`(${alias}id IN (SELECT id FROM main.players WHERE last_seen>=${cutoff} UNION ALL SELECT id FROM temp.col_memory_presence WHERE last_seen>=${cutoff}) AND ${match})`);
}

// Called once when a statement is prepared, not once per execution. Strings and
// comments are tokens, so an SQL literal containing "FROM players" stays literal.
// Keep the implicit table alias: correlated players.id references still work.
export function positionReadSql(sql){
  const originalSql=sql;
  // Writes already stage positions in their own transaction. Keeping their
  // SQL unchanged also avoids expanding a wide view inside reward/HP CTEs.
  if(!/^\s*(?:SELECT|WITH)\b/i.test(sql)||!/\b(?:FROM|JOIN)\s+players\b/i.test(sql))return sql;
  if(!/\b(?:x|y|position_revision|movement_checked_at_ms|movement_debt_ms|motion_stream_id|motion_sequence|last_seen)\b|\*/i.test(sql))return sql;
  sql=indexedPresenceSql(sql);
  const tokens=[...sql.matchAll(tokenPattern)].filter(t=>!t[0].startsWith('--')&&!t[0].startsWith('/*'));
  let depth=0;
  for(const token of tokens){
    const word=token[0].toUpperCase();
    if(!depth&&['UPDATE','INSERT','DELETE','REPLACE'].includes(word))return originalSql;
    if(!depth&&word==='SELECT')break;
    if(word==='(')depth++;else if(word===')')depth--;
  }
  const edits=[];
  for(let i=1;i<tokens.length;i++){
    if(tokens[i][0].toLowerCase()!=='players'||!['FROM','JOIN'].includes(tokens[i-1][0].toUpperCase()))continue;
    // DELETE FROM players is a write target, not a read source.
    if(tokens[i-1][0].toUpperCase()==='FROM'&&tokens[i-2]?.[0].toUpperCase()==='DELETE')continue;
    const next=tokens[i+1]?.[0],alias=next&&((/^[A-Za-z_][A-Za-z_0-9]*$/.test(next)&&!keywords.has(next.toUpperCase()))||/^["`\[]/.test(next));
    edits.push([tokens[i].index,tokens[i][0].length,alias?'temp.col_live_players':'temp.col_live_players AS players']);
  }
  for(const [at,length,replacement] of edits.reverse())sql=sql.slice(0,at)+replacement+sql.slice(at+length);
  return sql;
}

export class PositionStore{
  constructor(database,{bootstrapChannel=0,enabled=process.env.CORE_MEMORY_POSITIONS!=='0',doubleBuffer=process.env.CORE_MOVEMENT_DOUBLE_BUFFER!=='0',now=Date.now,onStale=()=>console.warn('position_stale: unstarted position buffer exceeds 1000ms')}={}){
    if(![0,1,2,3].includes(bootstrapChannel))throw Error('Invalid position bootstrap channel');
    this.enabled=enabled;this.now=now;this.entries=new Map();this.dirty=new Set();this.recent=new PositionRecentSet(this);this.version=0;this.accepting=true;
    this.flushMetrics=new FlushMetrics(['players']);
    this.doubleBuffer=doubleBuffer;this.pendingWrites=new Map();this.inFlight=new Set();this.onStale=onStale;this.lastStaleLog=-Infinity;
    this.stats={flushes:0,lastFlushMs:0,maxFlushMs:0,errors:0,staleWarnings:0};
    this.read=database.prepare(`SELECT ${selectColumns} FROM main.players WHERE id=?`);
    if(enabled)for(const row of database.prepare(`SELECT ${selectColumns} FROM main.players${bootstrapChannel?' WHERE channel=?':''}`).all(...(bootstrapChannel?[bootstrapChannel]:[])))this.entries.set(row.id,{base:{...row},current:{...row},generation:0,writtenGeneration:0});
    this.guards=new Map();
  }
  value(field,id,x,y,revision,scope,area,channel,arena,fallback){
    const e=this.entries.get(id);
    if(!e)return fallback;
    const compatible=p=>p.x===x&&p.y===y&&p.position_revision===revision&&p.realtime_scope_version===scope&&p.area===area&&p.channel===channel&&p.arena_match_id===arena;
    // A transaction may already have staged this exact position. Reads inside
    // it see that staged value; a teleport/rollback can never inherit old motion.
    const olderSnapshot=revision<e.current.position_revision&&scope===e.current.realtime_scope_version&&area===e.current.area&&channel===e.current.channel&&arena===e.current.arena_match_id;
    return compatible(e.base)||compatible(e.current)||olderSnapshot?e.current[field]:fallback;
  }
  checkpoint(connection,statement){
    if(!this.enabled)throw Error('Memory positions disabled');
    if(!this.accepting)throw Error('Server is closing');
    let guard=this.guards.get(statement.sql);
    if(!guard){
      if(!/^\s*UPDATE players SET x = \?, y = \?, movement_checked_at_ms = \?/i.test(statement.sql))throw Error('Invalid position checkpoint statement');
      const at=statement.sql.indexOf('WHERE id = ?'),end=statement.sql.lastIndexOf('RETURNING x, y, position_revision');
      if(at<0||end<at)throw Error('Invalid position checkpoint guard');
      guard=connection.prepare('SELECT id,x,y,position_revision FROM players '+statement.sql.slice(at,end));
      if(this.guards.size>=8)this.guards.clear();this.guards.set(statement.sql,guard);
    }
    const args=statement.params,row=guard.get(...args.slice(7));
    if(!row)return null;
    const base=this.read.get(row.id);
    if(!base)return null;
    let e=this.entries.get(row.id);
    if(!e||!this.resident&&!same(e.base,base)){
      e={base:{...base},current:{...base},generation:0,writtenGeneration:0};this.entries.set(row.id,e);
    }
    // Legacy mode stops acknowledgements after one second. Double buffering
    // instead counts/logs only never-started data; motion never waits for fsync.
    if(!this.doubleBuffer&&this.dirty.has(row.id)&&this.now()-e.dirtyAt>=1000)return null;
    if(this.doubleBuffer)this.warnStale(row.id);
    e.current={...e.current,x:args[0],y:args[1],movement_checked_at_ms:args[2],movement_debt_ms:args[3],position_revision:row.position_revision+1,motion_stream_id:args[4],motion_sequence:args[5]};
    e.generation++;(e.pending??=[]).push([e.generation,this.now()]);e.dirtyAt??=this.now();this.dirty.add(row.id);this.recent.add(row.id);this.version++;
    const waiting=this.pendingWrites.get(row.id);
    this.pendingWrites.set(row.id,{entry:e,generation:e.generation,at:waiting?.entry===e?waiting.at:this.now(),warnedAt:waiting?.entry===e?waiting.warnedAt:undefined});
    this.onChanged?.(row.id);
    return {x:e.current.x,y:e.current.y,position_revision:e.current.position_revision};
  }
  stage(connection){
    const staged=new Map();staged.metrics=this.flushMetrics.begin();
    for(const id of this.doubleBuffer?this.pendingWrites.keys():this.dirty){
      const e=this.entries.get(id);if(!e||e.writtenGeneration===e.generation)continue;
      const p=e.current,b=e.base;
      const at=performance.now(),write=connection.writer.write(p,b,[id],[b.x,b.y,b.position_revision,b.realtime_scope_version,b.area,b.channel,b.arena_match_id]);
      this.flushMetrics.wrote(staged.metrics,'players',write.result.changes,write.columns,performance.now()-at);
      const changed=write.result.changes;
      staged.set(id,{entry:e,generation:e.generation,value:{...p},changed});
    }
    return staged;
  }
  committed(connection,context){
    if(!context)return;
    const saved=[];
    for(const id of new Set([...context.staged.keys(),...context.touched])){
      const row=connection.read.get(id),staged=context.staged.get(id),e=this.entries.get(id);
      if(!row){this.entries.delete(id);this.dirty.delete(id);this.pendingWrites.delete(id);this.recent.delete(id);this.version++;continue;}
      if(staged?.changed&&e===staged.entry&&same(row,staged.value)){
        e.base={...row};e.writtenGeneration=staged.generation;saved.push([id,e,staged.generation]);
        if(this.pendingWrites.get(id)?.generation===staged.generation)this.pendingWrites.delete(id);
      }else if(!e||!same(e.base,row)){
        // This includes immediate teleports, respawns and scope changes. The
        // durable transaction, not a stale timer/worker result, wins.
        const next={base:{...row},current:{...row},generation:0,writtenGeneration:0,scopeChangedAt:e&&SCOPE.some(key=>e.current[key]!==row[key])?this.now():0};
        this.entries.set(id,next);this.dirty.delete(id);this.pendingWrites.delete(id);this.version++;
      }
    }
    return saved.length?{saved,started:context.started}:null;
  }
  durable(batch,promise){
    if(!batch)return;
    this.inFlight.add(batch);
    const finish=()=>{
      this.inFlight.delete(batch);
      for(const [id,e,generation] of batch.saved){
        if(this.entries.get(id)!==e)continue;
        e.pending=(e.pending??[]).filter(([g])=>g>generation);
        if(e.generation===generation){this.dirty.delete(id);delete e.dirtyAt;}
        else if(e.pending.length)e.dirtyAt=e.pending[0][1];
      }
      const elapsed=performance.now()-batch.started;
      this.stats.flushes++;this.stats.lastFlushMs=elapsed;this.stats.maxFlushMs=Math.max(this.stats.maxFlushMs,elapsed);
      reportRuntimeWork('position_flush',elapsed,performance.timeOrigin+batch.started);
    };
    const fail=()=>{this.inFlight.delete(batch);this.stats.errors++;for(const [id,e,generation] of batch.saved)if(this.entries.get(id)===e&&e.writtenGeneration===generation){e.writtenGeneration=-1;this.pendingWrites.set(id,{entry:e,generation:e.generation,at:e.pending?.[0]?.[1]??this.now()});}};
    if(promise)promise.then(finish,fail);else finish();
  }
  projection(){
    // Retain recent durable checkpoints too: a reader may have opened its WAL
    // snapshot immediately before their commit. Idle records are not copied.
    // This is only an internal position projection, never inventory/auth data.
    const cutoff=this.now()-30_000;
    const entries=[];
    for(const id of this.recent){
      const e=this.entries.get(id);
      if(!e||!this.dirty.has(id)&&e.current.movement_checked_at_ms<cutoff){this.recent.delete(id);continue;}
      entries.push([id,{base:e.base,current:e.current}]);
    }
    return {version:this.version,entries};
  }
  mergeRows(rows,{enteredAtMs=Infinity}={}){
    return rows.flatMap(row=>{
      if(!Object.hasOwn(row,'x')||!Object.hasOwn(row,'y'))return [row];
      const e=this.entries.get(row.id),p=e?.current;if(!p)return [row];
      if(!this.dirty.has(row.id)&&!(row.position_revision<p.position_revision)&&!(e.scopeChangedAt>=enteredAtMs))return [row];
      if(SCOPE.some(key=>Object.hasOwn(row,key)&&row[key]!==p[key]))return [];
      if(Object.hasOwn(row,'position_revision')&&row.position_revision>p.position_revision)return [row];
      const next=row;for(const key of POSITION_FIELDS)if(Object.hasOwn(next,key))next[key]=p[key];return [next];
    });
  }
  start(flush){
    if(!this.enabled)return;
    this.timer=setInterval(()=>{
      this.flushDue(flush);
    },1000);this.timer.unref();
  }
  warnStale(id){
    const p=this.pendingWrites.get(id);if(!p||this.now()-p.at<1000)return;
    if(this.now()-(p.warnedAt??-Infinity)<1000)return;p.warnedAt=this.now();this.stats.staleWarnings++;
    if(this.now()-this.lastStaleLog>=1000){this.lastStaleLog=this.now();this.onStale();}
  }
  flushDue(flush){
    if(this.doubleBuffer){if(!this.pendingWrites.size)return;for(const id of this.pendingWrites.keys())this.warnStale(id);}
    else if(!this.dirty.size||this.flushing)return;
    const job=Promise.resolve().then(flush).catch(error=>{this.stats.errors++;console.error('Position flush retry',error.message);}).finally(()=>{if(this.flushing===job)this.flushing=null;});
    this.flushing=job;return job;
  }
  stop(){this.accepting=false;clearInterval(this.timer);}
  flushSync(connection,walPath){
    if(!this.enabled)return;
    connection.exec('BEGIN IMMEDIATE');
    try{connection.exec('COMMIT');}catch(error){if(connection.isTransaction)connection.exec('ROLLBACK');this.stats.errors++;throw error;}
    // The primary writer keeps its existing NORMAL + async WAL scheme. At
    // shutdown only, synchronously finish all earlier WAL writes as well.
    if(walPath&&existsSync(walPath)){const fd=openSync(walPath,'r+');try{fsyncSync(fd);}finally{closeSync(fd);}}
    connection.positionLayer?.confirmDurable(null);
  }
  snapshot(){return {enabled:this.enabled,dirty:this.dirty.size,...this.flushMetrics.snapshot(),...Object.fromEntries(Object.entries(this.stats).map(([k,v])=>[k,k.endsWith('Ms')?Math.round(v*100)/100:v]))};}
}

// Install only on native runtime connections, after all existing startup schema
// work. The view is TEMP: no persistent schema or D1 migration is introduced.
export function attachPositionStore(database,store,{externalDurability=false,readOnly=false}={}){
  if(!store?.enabled)return null;
  const prepare=database.prepare.bind(database),exec=database.exec.bind(database);
  database.positionRawPrepare=prepare;database.positionRawExec=exec;
  const columns=prepare('PRAGMA main.table_info(players)').all();
  database.function('col_position',{varargs:true},(...args)=>store.value(...args));
  exec('CREATE TEMP TABLE col_memory_presence(id TEXT NOT NULL,source TEXT NOT NULL,last_seen INTEGER,PRIMARY KEY(id,source));CREATE INDEX col_memory_presence_seen ON col_memory_presence(last_seen)');
  // Persisted movement/retaliation timestamps can be newer than last_seen
  // after a restart. Seed their indexed candidates once, without losing them
  // when the first reader has no in-memory projection yet.
  const hitTimestamp=columns.some(c=>c.name==='last_monster_hit_at')?'MAX(movement_checked_at_ms,last_monster_hit_at)':'movement_checked_at_ms';
  exec(`INSERT INTO temp.col_memory_presence SELECT id,'durable',CAST(${hitTimestamp}/1000 AS INTEGER) FROM main.players WHERE ${hitTimestamp}>last_seen*1000`);
  const presencePut=prepare("INSERT OR REPLACE INTO temp.col_memory_presence VALUES(?,'position',?)"),presenceRemove=prepare("DELETE FROM temp.col_memory_presence WHERE id=? AND source='position'");
  let presenceVersion=-1;const presenceKnown=new Set(),presenceValues=new Map();
  const residentPresence=readOnly&&store.resident?createResidentPresenceRefresh(database,store,{prepare,exec,put:presencePut,remove:presenceRemove}):null;
  const refreshPresence=residentPresence??(()=>{
    if(presenceVersion===store.version)return;const active=new Set();
    for(const id of store.recent??store.entries.keys()){const e=store.entries.get(id);if(!e)continue;active.add(id);const seen=Math.floor(e.current.movement_checked_at_ms/1000);if(presenceValues.get(id)!==seen){presencePut.run(id,seen);presenceValues.set(id,seen);}}
    for(const id of presenceKnown)if(!active.has(id)){presenceRemove.run(id);presenceValues.delete(id);if(!database.isTransaction)presenceKnown.delete(id);}
    for(const id of active)presenceKnown.add(id);presenceVersion=store.version;
  });
  database.positionPresenceRefresh=refreshPresence;
  const readPrepare=sql=>{const statement=prepare(positionReadSql(sql));for(const method of ['all','get','run']){const original=statement[method].bind(statement);statement[method]=(...args)=>{if(!readOnly)refreshPresence();return original(...args);};}return statement;};

  const fields=columns.map(({name})=>POSITION_FIELDS.includes(name)?`col_position('${name}',p.id,p.x,p.y,p.position_revision,p.realtime_scope_version,p.area,p.channel,p.arena_match_id,p."${name}") AS "${name}"`:name==='last_seen'?`MAX(p.last_seen,CAST(col_position('movement_checked_at_ms',p.id,p.x,p.y,p.position_revision,p.realtime_scope_version,p.area,p.channel,p.arena_match_id,p.movement_checked_at_ms)/1000 AS INTEGER)) AS last_seen`:`p."${name}"`);
  exec(`CREATE TEMP VIEW col_live_players AS SELECT ${fields.join(',')} FROM main.players p`);
  if(readOnly){database.prepare=readPrepare;return null;}
  let context=null;
  const pending=[];
  const connection={read:prepare(`SELECT ${selectColumns} FROM main.players WHERE id=?`),
    writer:dirtyWriter(prepare,{table:'main.players',keys:['id'],fields:POSITION_FIELDS,guard:' AND x=? AND y=? AND position_revision=? AND realtime_scope_version=? AND area=? AND channel=? AND arena_match_id=?'})};
  database.function('col_position_changed',id=>{context?.touched.add(id);return 0;});
  exec(`CREATE TEMP TRIGGER col_position_update AFTER UPDATE OF ${[...POSITION_FIELDS,...SCOPE].join(',')} ON main.players BEGIN SELECT col_position_changed(NEW.id); END;
    CREATE TEMP TRIGGER col_position_insert AFTER INSERT ON main.players BEGIN SELECT col_position_changed(NEW.id); END;
    CREATE TEMP TRIGGER col_position_delete AFTER DELETE ON main.players BEGIN SELECT col_position_changed(OLD.id); END;`);
  const begin=()=>{context={staged:new Map(),touched:new Set(),started:performance.now()};context.staged=store.stage(connection);};
  const commit=commitMs=>{const ctx=context,at=performance.now();const batch=store.committed(connection,context);context=null;if(ctx)store.flushMetrics.finish(ctx.staged.metrics??store.flushMetrics.begin(),{commitMs,refreshMs:performance.now()-at,touched:{players:ctx.touched.size}});if(batch){if(externalDurability)pending.push(batch);else store.durable(batch,null);}};
  database.exec=sql=>{
    // TEMP presence writes can be rolled back too. Invalidate values at every
    // transaction/savepoint boundary, retaining IDs for cleanup after rollback.
    if(/^\s*(?:BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE)\b/i.test(sql)){presenceVersion=-1;presenceValues.clear();}
    if(/^\s*BEGIN\s+(?:IMMEDIATE|EXCLUSIVE)\b/i.test(sql)){
      const result=exec(sql);try{begin();return result;}catch(error){exec('ROLLBACK');context=null;throw error;}
    }
    if(/^\s*(?:COMMIT|END)\b/i.test(sql)){const at=performance.now(),result=exec(sql);commit(performance.now()-at);return result;}
    if(/^\s*ROLLBACK\b(?!\s+TO)/i.test(sql)){const result=exec(sql);context=null;return result;}
    if(!database.isTransaction&&/^\s*(?:UPDATE|INSERT|DELETE|REPLACE)\b/i.test(sql)){
      database.exec('BEGIN IMMEDIATE');try{const result=exec(sql);database.exec('COMMIT');return result;}catch(error){if(database.isTransaction)database.exec('ROLLBACK');throw error;}
    }
    return exec(sql);
  };
  database.prepare=sql=>{
    const statement=readPrepare(sql);
    // The existing runtime writes use these leading keywords (including CTE
    // writes). Plain SELECTs never open a transaction or touch disk.
    const write=/^\s*(?:UPDATE|INSERT|DELETE|REPLACE)\b/i.test(sql)||/^\s*WITH\b/i.test(sql)&&/\b(?:UPDATE|INSERT|DELETE|REPLACE)\b/i.test(sql);
    if(!write)return statement;
    for(const method of ['run','get','all']){
      const execute=statement[method].bind(statement);
      statement[method]=(...params)=>{
        if(database.isTransaction)return execute(...params);
        database.exec('BEGIN IMMEDIATE');
        try{const result=execute(...params);database.exec('COMMIT');return result;}
        catch(error){if(database.isTransaction)database.exec('ROLLBACK');throw error;}
      };
    }
    return statement;
  };
  const layer={confirmDurable(promise){for(const batch of pending.splice(0))store.durable(batch,promise);},store};
  database.positionLayer=layer;
  return layer;
}

export function positionReplica(){
  return {enabled:true,entries:new Map(),version:-1,value:PositionStore.prototype.value,
    set(projection){this.entries=new Map(projection?.entries??[]);this.version=projection?.version??-1;}};
}
