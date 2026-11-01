import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {setup} from './setup.mjs';
import {builders} from './builders.mjs';
if (process.env.COL_REWARD_OVERLAY) throw Error('Unsigned reward overlays are forbidden');

test('AoE event target membership keeps scope and exact SQL gates',async t=>{
 const {h,db,targets,now}=await setup({count:14,bot:true,reorderPlayerColumns:true});
 try {
  const {prepareRewardBatchR7}=await h.importModule('vds-server/src/reward-batch-r7.mjs');
  const {withPreparedStatements477}=await h.importModule('vds-server/src/prepared-statements477.mjs');
  const build=await builders(h,{targets,now,bot:true,selectedIndex:13});
  const frames=JSON.parse(JSON.stringify(build.plans.flatMap(p=>p.hitStatements)));
  const prepare=rows=>withPreparedStatements477(db,()=>prepareRewardBatchR7(db,rows??frames,h.writer.loadlab.generatedObserverSqlR8));
  db.exec('BEGIN IMMEDIATE');h.writer.loadlab.refreshSchema();
  await t.test('last selected target activates without moving the event or groups',()=>{
   const result=prepare();assert.ok(result);assert.equal(result.frames[0],frames[0]);
   assert.deepEqual(JSON.parse(result.frames[1].params[0]).map(p=>p[2]),targets.map(x=>x.id));
  });
  await t.test('foreign selected target still falls back',()=>{
   const copy=structuredClone(frames);copy[0].params[1]='outside-this-cast';assert.equal(prepare(copy),null);
  });
  await t.test('foreign event actor still falls back',()=>{
   const copy=structuredClone(frames);copy[0].params[0]='real-1';assert.equal(prepare(copy),null);
  });
  await t.test('duplicate target groups still fall back',()=>{
   const copy=[...frames,...frames.slice(1,10)];assert.equal(prepare(copy),null);
  });
  await t.test('foreign group actor still falls back',()=>{
   const copy=structuredClone(frames);copy[10].params[0]='real-1';assert.equal(prepare(copy),null);
  });
  await t.test('changed reward SQL still falls back',()=>{
   const copy=structuredClone(frames);copy[4].sql=copy[4].sql.replace('<=640000','<=0');assert.equal(prepare(copy),null);
  });
  await t.test('unknown schema still falls back and schema rollback recovers',()=>{
   db.exec('SAVEPOINT schema_gate;CREATE TRIGGER r9_unknown AFTER UPDATE ON accounts BEGIN SELECT random();END;');assert.equal(prepare(),null);
   db.exec('ROLLBACK TO schema_gate;RELEASE schema_gate');assert.ok(prepare());
  });
  db.exec('ROLLBACK');
 }finally{if(db.isTransaction)db.exec('ROLLBACK');await h.close();}
});
