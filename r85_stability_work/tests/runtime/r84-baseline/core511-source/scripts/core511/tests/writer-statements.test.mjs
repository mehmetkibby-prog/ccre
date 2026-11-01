import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {withPreparedStatements477} from '../../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {prepareCached477,writerStatementFacadeStats} from '../writer-statements.mjs';
test('reused immutable facade rereads current values, rollback and recreated schema; outside scope remains native',()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec('CREATE TABLE sample(n INTEGER);INSERT INTO sample VALUES(1)');let a,b;
  withPreparedStatements477(db,()=>{a=prepareCached477(db,'SELECT * FROM sample');b=prepareCached477(db,'SELECT * FROM sample');assert.equal(a,b);assert.equal(a.get().n,1);db.exec('UPDATE sample SET n=2');assert.equal(a.get().n,2);});
  assert.equal(a.get().n,2);db.exec('BEGIN;UPDATE sample SET n=3');withPreparedStatements477(db,()=>assert.equal(a.get().n,3));db.exec('ROLLBACK');withPreparedStatements477(db,()=>assert.equal(a.get().n,2));
  db.exec("DROP TABLE sample;CREATE TABLE sample(n INTEGER,extra TEXT);INSERT INTO sample VALUES(4,'fresh')");withPreparedStatements477(db,()=>assert.deepEqual({...a.get()},{n:4,extra:'fresh'}));
  const outside=prepareCached477(db,'SELECT 123'),other=prepareCached477(db,'SELECT 123');assert.notEqual(outside,other);
  withPreparedStatements477(db,()=>{for(let i=0;i<600;i++)assert.equal(prepareCached477(db,`SELECT ${i} n`).get().n,i);});const s=writerStatementFacadeStats(db);assert(s.entries<=256&&s.sqlBytes<=524288);
 }finally{db.close();}
});
test('recursive use of the same facade retains native reentrant statement fencing and large-binding fallback',()=>{
 const db=new DatabaseSync(':memory:');try{let depth=0,facade;db.function('reenter',()=>depth?7:(depth++,facade.get().n+1));withPreparedStatements477(db,()=>{facade=prepareCached477(db,'SELECT reenter() n');assert.equal(facade.get().n,8);const s=prepareCached477(db,'SELECT length(?) n'),big='x'.repeat(300000);assert.equal(s.get(big).n,big.length);assert.equal(s.get('abc').n,3);});}finally{db.close();}
});
