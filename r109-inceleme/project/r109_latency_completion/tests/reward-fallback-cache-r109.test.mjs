import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {RewardWorkerR533} from '../working/core511-source/scripts/core511/reward-worker-r533.mjs';
import {installPreparedStatements477,prepareCached477,preparedStatementsStats477} from '../working/native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';

function fixture(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec('CREATE TABLE probe(id INTEGER PRIMARY KEY, n INTEGER NOT NULL);INSERT INTO probe VALUES(1,0),(2,0)');
 installPreparedStatements477(sql);
 const events=[];
 const worker=Object.assign(Object.create(RewardWorkerR533.prototype),{
  writer:{authority:{realmId:'test',operations:{attack:{execute(db,source){
   const result=prepareCached477(db,'UPDATE probe SET n=n+? WHERE id=? RETURNING n').get(source.amount,source.id);
   if(source.fail)throw Error('rollback_probe');return result;
  }}}},presence:{materialize(){return [];}}},
  database:{sqlite:sql,assertAvailable(){},commitWrites(){events.push('commit');sql.exec('COMMIT');},async durableAfterCommit(){assert(!sql.isTransaction);events.push('durable');}},
  lane:{run:async work=>work()},stats:{fallbacks:0,maxPreflightMs:0},safeScope(){return false;},publishCommitted(){assert(!sql.isTransaction);events.push('publish');}
 });
 const invoke=source=>{const descriptor=worker.dispatch({}, {operation:'attack'});return descriptor.atomic(db=>descriptor.execute(db,source));};
 return {sql,events,invoke};
}

test('external fallback reuses statements with fresh bindings, and only publishes after durability',async t=>{
 const s=fixture(t);assert.deepEqual({...await s.invoke({id:1,amount:3})},{n:3});
 const first=preparedStatementsStats477(s.sql);
 assert.deepEqual({...await s.invoke({id:2,amount:7})},{n:7});
 const second=preparedStatementsStats477(s.sql);assert.equal(second.hits,first.hits+1);assert.equal(second.misses,first.misses);
 assert.deepEqual(s.events,['commit','durable','publish','commit','durable','publish']);
 const before=preparedStatementsStats477(s.sql).hits;
 prepareCached477(s.sql,'SELECT n FROM probe WHERE id=?').get(1);
 assert.equal(preparedStatementsStats477(s.sql).hits,before,'scope does not leak outside the synchronous transaction');
});

test('failed fallback rolls back and the next command keeps native ordering',async t=>{
 const s=fixture(t);await assert.rejects(s.invoke({id:1,amount:9,fail:true}),/rollback_probe/);
 assert.equal(s.sql.prepare('SELECT n FROM probe WHERE id=1').get().n,0);
 assert(!s.sql.isTransaction);assert.deepEqual(s.events,['durable']);
 assert.equal((await s.invoke({id:1,amount:2})).n,2);
});

test('fallback cache still observes MAIN/TEMP schema changes and trigger side effects',async t=>{
 const s=fixture(t);await s.invoke({id:1,amount:3});
 s.sql.exec('CREATE TEMP TRIGGER record_probe AFTER UPDATE ON main.probe WHEN NEW.id=1 BEGIN UPDATE probe SET n=n+1 WHERE id=2; END');
 await s.invoke({id:1,amount:4});assert.equal(s.sql.prepare('SELECT n FROM probe WHERE id=2').get().n,1);
 s.sql.exec('DROP TRIGGER record_probe;ALTER TABLE probe ADD COLUMN note TEXT');
 await s.invoke({id:1,amount:5});assert.equal(s.sql.prepare('SELECT n FROM probe WHERE id=1').get().n,12);
 assert.equal(s.sql.prepare('SELECT n FROM probe WHERE id=2').get().n,1);
});
