import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './native-fixture.mjs';

// Runs against the explicit, manifest-verified candidate. No rewritten native
// functions, fake feature switch, live database, or detached SQL model is used.
const id='real-1', key='players\u001e'+id;
const changed=[{table:'players',id,keys:[id],owner:id}];
const sql=(text,...params)=>({sql:text,params});
const observed=p=>{void p.catch(()=>{});return p;};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const turn=()=>new Promise(r=>setImmediate(r));
const empty=()=>({positions:[],combat:[],started:performance.now()});
const plain=row=>row?{...row}:null;
const full=h=>h.database.sqlite.prepare('SELECT * FROM players WHERE id=?').get(id);
function gateDurability(h){
 const entered=deferred(),released=deferred(),old=h.database.walSync.flush.bind(h.database.walSync);
 h.database.walSync.flush=async()=>{entered.resolve();await released.promise;return old();};
 return {entered:entered.promise,release:released.resolve,restore:()=>{h.database.walSync.flush=old;}};
}
function countMethod(object,name,counter,label){
 const old=object[name].bind(object);object[name]=(...args)=>{counter[label]=(counter[label]??0)+1;return old(...args);};
 return ()=>{object[name]=old;};
}
async function setup(rowReuse,memoryNoop,pipeline='1'){
 const values={COL_PERF_R11_LAB_MODE:'isolated',COL_PERF_R11_ACK_ROW_REUSE:String(+rowReuse),COL_PERF_R11_ACK_MEMORY_NOOP:String(+memoryNoop),CORE_CHANNEL_WRITER_PIPELINE:pipeline};
 const old=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);
 let h;try{h=await fixture();}finally{for(const [k,v]of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v;}
 try{
  const {perfR11Features}=await h.importModule('vds-server/src/perf-r11-features.mjs');
  assert.equal(perfR11Features.snapshot.source,'isolated-lab');
  assert.equal(perfR11Features.enabled('ackRowReuse'),rowReuse,'the native switch must actually be enabled for this arm');
  assert.equal(perfR11Features.enabled('ackMemoryNoop'),memoryNoop,'the native switch must actually be enabled for this arm');
  const db=h.channels.get(1),counter={},notices=[],raw=db.sqlite.positionRawPrepare;
  db.sqlite.positionRawPrepare=text=>{
   const statement=raw(text);
   if(text==='SELECT * FROM main."players" WHERE "id"=?')countMethod(statement,'get',counter,'projectionReads');
   return statement;
  };
  const {attachChannelProjection}=await h.importModule('vds-server/src/channel-projection.mjs');
  const projection=attachChannelProjection(db,{send:async()=>{}});db.sqlite.positionRawPrepare=raw;
  const before=db.onCommitted;db.onCommitted=(changes,rows)=>{notices.push({changes,rows});return before(changes,rows);};
  const table=db.combat.tables.get('players');
  countMethod(db.positions.read,'get',counter,'positionReads');countMethod(table.read,'get',counter,'combatReads');
  countMethod(table.put,'run',counter,'puts');countMethod(table.remove,'run',counter,'removes');
  const reset=()=>{for(const k of Object.keys(counter))delete counter[k];notices.length=0;};
  const close=async()=>{await projection.close();await h.close();};
  return {h,db,table,projection,counter,notices,reset,close};
 }catch(error){await h.close();throw error;}
}
async function move(db,x,sequence){
 const now=Date.now();return db.runPlayer(id,()=>db.positionCheckpoint(db.prepare('UPDATE players SET x = ?, y = ?, movement_checked_at_ms = ?, movement_debt_ms = ?, motion_stream_id = ?, motion_sequence = ?, last_seen = ? WHERE id = ? RETURNING x, y, position_revision').bind(x,100,now,0,'r11-fixture-stream',sequence,Math.floor(now/1000),id)));
}
const hit=db=>db.runPlayer(id,()=>db.combatBatch([db.prepare('UPDATE players SET hp=hp-1 WHERE id=?').bind(id)],id));
const write=(db,text,...params)=>db.runPlayer(id,()=>db.remote([sql(text,...params)]));

for(const [rowReuse,memoryNoop]of [[false,false],[true,false],[false,true],[true,true]]){
 test(`ACK switches rowReuse=${rowReuse} memoryNoop=${memoryNoop}: durable raw row, generations, projection and SQL counts`,{timeout:15000},async()=>{
  const f=await setup(rowReuse,memoryNoop);const {h,db,table,projection,counter,notices,reset}=f;let gate;
  try{
   await hit(db);await move(db,200,1);gate=gateDurability(h);
   const job=observed(write(db,'UPDATE players SET name=?,gems=gems+7 WHERE id=?','R11 durable name',id));
   await gate.entered;await turn();assert.equal(notices.length,0,'no projection notification before fsync');
   await hit(db);await move(db,300,2);reset();gate.release();await job;
   assert.equal(notices.length,1);assert.equal(full(h).hp,99);assert.equal(full(h).x,200);
   assert.equal(table.records.get(id).current.hp,98);assert.equal(db.positions.entries.get(id).current.x,300);
   assert.equal(projection.world.players.get(id).hp,99,'projection base is durable, not next-generation memory');
   assert.equal(projection.world.player(id).hp,98);assert.equal(projection.world.player(id).x,300);
   assert.equal(projection.push.players.get(id).hp,99);
   const positionKeys=['id','x','y','movement_checked_at_ms','movement_debt_ms','position_revision','motion_stream_id','motion_sequence','area','channel','arena_match_id','realtime_scope_version'].sort();
   assert.deepEqual(Object.keys(db.positions.entries.get(id).base).sort(),positionKeys,'the narrow position cache must not absorb economy columns');
   if(rowReuse){assert.ok(notices[0].rows instanceof Map);assert.deepEqual(plain(notices[0].rows.get(key)),plain(full(h)));assert.equal(notices[0].rows.get(key).hp,99);}
   else assert.equal(notices[0].rows,undefined);
   assert.equal(counter.combatReads,1);assert.equal(counter.positionReads??0,rowReuse?0:1);assert.equal(counter.projectionReads??0,rowReuse?0:1);
   assert.equal(counter.puts,1,'changed static columns must reach the memory SQLite mirror');
   assert.deepEqual(plain(table.find.get(id)),plain(table.records.get(id).current));
   await db.flushMemory();assert.equal(full(h).hp,98);assert.equal(full(h).x,300);
   reset();const version=db.combat.version;await db.applyCommitted(changed);
   assert.equal(counter.puts??0,memoryNoop?0:1,'only unchanged full mirror rows can skip INSERT OR REPLACE');
   assert.equal(db.combat.version,version+1,'publish/version semantics survive an elided mirror write');
   assert.deepEqual(plain(table.find.get(id)),plain(table.records.get(id).current));assert.equal(h.fatals.length,0);
  }finally{gate?.release();gate?.restore();await f.close();}
 });
}

test('ACK tombstone is cached as null and removes every channel view without a fallback read',{timeout:15000},async()=>{
 const f=await setup(true,true);const {h,db,table,projection,counter,notices,reset}=f;
 try{
  await hit(db);await db.flushMemory();reset();
  await h.database.atomic(s=>s.prepare('DELETE FROM players WHERE id=?').run(id));await h.database.walSync.durable();await db.applyCommitted(changed);
  assert.equal(notices.length,1);assert.equal(notices[0].rows.has(key),true);assert.equal(notices[0].rows.get(key),null);
  assert.equal(counter.projectionReads??0,0);assert.equal(counter.positionReads??0,0);assert.equal(counter.combatReads,1);assert.equal(counter.removes,1);
  assert.equal(table.find.get(id),undefined);assert.equal(table.records.get(id).current,null);assert.equal(db.positions.entries.has(id),false);
  assert.equal(projection.world.players.has(id),false);assert.equal(projection.push.players.has(id),false);
  assert.equal(db.combat.dirty.has(key),false);assert.equal(db.positions.pendingWrites.has(id),false);
 }finally{await f.close();}
});

test('ACK authoritative death, teleport and scope epoch replace newer local generations',{timeout:15000},async()=>{
 const f=await setup(true,true);const {h,db,table,projection,notices,reset}=f;let gate;
 try{
  await hit(db);await move(db,200,1);gate=gateDurability(h);
  const job=observed(write(db,'UPDATE players SET hp=0,hp_revision=hp_revision+1,x=900,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1 WHERE id=?',id));
  await gate.entered;await hit(db);await move(db,300,2);reset();gate.release();await job;
  assert.equal(notices[0].rows.get(key).hp,0);assert.equal(notices[0].rows.get(key).x,900);
  assert.equal(table.records.get(id).current.hp,0);assert.equal(db.positions.entries.get(id).current.x,900);
  assert.equal(table.records.get(id).generation,0);assert.equal(db.positions.entries.get(id).generation,0);
  assert.equal(db.combat.dirty.has(key),false);assert.equal(db.positions.pendingWrites.has(id),false);
  assert.equal(projection.world.player(id).hp,0);assert.equal(projection.world.player(id).x,900);
  assert.deepEqual(plain(table.find.get(id)),plain(table.records.get(id).current));
  await db.flushMemory();assert.equal(full(h).hp,0);assert.equal(full(h).x,900);assert.equal(h.fatals.length,0);
 }finally{gate?.release();gate?.restore();await f.close();}
});

test('ACK cache ends with callback; direct notifications, absent readers and unknown tables retain prior rules',{timeout:15000},async()=>{
 const f=await setup(true,true,'0');const {h,db,projection,counter,notices,reset}=f;
 try{
  await write(db,'UPDATE players SET gems=gems+1 WHERE id=?',id);const first=notices.at(-1).rows;assert.equal(first.get(key).gems,11);
  await h.database.atomic(s=>s.prepare('UPDATE players SET gems=12 WHERE id=?').run(id));await h.database.walSync.durable();await db.applyCommitted(changed);
  const second=notices.at(-1).rows;assert.notEqual(first,second);assert.equal(first.get(key).gems,11);assert.equal(second.get(key).gems,12);
  const seen=[],old=projection.push.committed.bind(projection.push);projection.push.committed=c=>{seen.push(c);return old(c);};
  await h.database.atomic(s=>s.prepare('UPDATE players SET name=? WHERE id=?').run('Fresh direct notification',id));await h.database.walSync.durable();reset();db.onCommitted(changed);
  assert.equal(counter.projectionReads,1);assert.equal(seen.at(-1).row.name,'Fresh direct notification','the exact full committed row is freshly read before the push public-field projection');
  db.onCommitted([{table:'boss_participants',keys:[1,id]}],new Map([['boss_participants\u001e1\u001f'+id,{gems:999}]]));
  assert.equal(seen.at(-1).row,null,'cached rows cannot expand the projection reader allowlist');
  assert.throws(()=>db.onCommitted([{table:'not_a_schema_table',keys:[id]}],new Map()),/unknown_committed_table/);
  assert.equal(h.fatals.length,0);
 }finally{await f.close();}
});

test('ACK unchanged mirror write stays enabled inside a transaction and for touch observers',{timeout:15000},async()=>{
 const f=await setup(true,true);const {h,db,table,counter,reset}=f;
 try{
  await hit(db);await db.flushMemory();reset();
  db.combat.touched=new Map();db.buffer.acknowledged(empty(),changed);
  assert.equal(counter.puts,1);assert.equal(db.combat.touched.has(key),true,'native INSERT touch trigger still executes');db.combat.touched=null;
  reset();db.combat.memory.exec('BEGIN');
  try{db.buffer.acknowledged(empty(),changed);assert.equal(counter.puts,1);db.combat.memory.exec('COMMIT');}finally{if(db.combat.memory.isTransaction)db.combat.memory.exec('ROLLBACK');}
  assert.deepEqual(plain(table.find.get(id)),plain(table.records.get(id).current));
  reset();db.buffer.acknowledged(empty(),changed);assert.equal(counter.puts??0,0);assert.equal(h.fatals.length,0);
 }finally{db.combat.touched=null;await f.close();}
});

test('ACK owner epoch rejection publishes no row cache or committed projection',{timeout:15000},async()=>{
 const f=await setup(true,true);const {h,db,notices,reset}=f;
 try{
  const request=db.requestWrite.bind(db);db.requestWrite=frame=>request({...frame,owners:frame.owners.map(o=>({...o,epoch:o.epoch+1}))});reset();
  await assert.rejects(write(db,'UPDATE players SET gems=999 WHERE id=?',id),{code:'owner_epoch_fenced'});
  assert.equal(notices.length,0);assert.equal(full(h).gems,10);assert.equal(db.sequence,0);assert.equal(h.fatals.length,1);assert.ok(db.failure);
 }finally{await f.close();}
});
