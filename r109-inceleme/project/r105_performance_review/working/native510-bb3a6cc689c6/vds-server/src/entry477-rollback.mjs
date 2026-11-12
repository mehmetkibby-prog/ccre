// Cold code downgrade compatibility, called only inside the existing verified
// stopped-service selection gate. No player-data backup is restored.
import assert from 'node:assert/strict';
import {readFile,lstat,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {verifyRealmPackage} from './realm-package-integrity.mjs';
import {verifyNativeBuild} from './native-build-integrity.mjs';
import {assertDailyMonsterRewardRollbackReady477,disableDailyMonsterReward477} from './daily-monster-reward477.mjs';
import {assertArenaWingsRollbackReady477,hideArenaWingsForRollback477} from '../../lib/arena-wings477.mjs';

export const ENTRY477_ROLLBACK_SHA='9bec7157520d0aebb6c6cdc36738ff919c62da9e90f0dfd7c63da4264d4e0aa2';
export async function reconcileEntry477Rollback(release,realms){
 const bytes=await readFile(release+'/realm-package-manifest.json');
 if(createHash('sha256').update(bytes).digest('hex')!==ENTRY477_ROLLBACK_SHA)return {matched:false};
 await verifyRealmPackage(release);await verifyNativeBuild(release+'/dist-vds');
 assert(Array.isArray(realms)&&realms.length>0,'Validated existing realm list required');
 const databases=[],seen=new Set();
 try{
  // Check every realm file and feature schema before modifying any realm.
  // DatabaseSync must never create a missing database on downgrade.
  for(const realm of realms){
   assert(typeof realm.database==='string'&&!seen.has(realm.database),'Unique realm database');seen.add(realm.database);
   const state=await lstat(realm.database);
   assert(state.isFile()&&!state.isSymbolicLink()&&await realpath(realm.database)===realm.database,'Existing canonical regular realm database required');
   const db=new DatabaseSync(realm.database);databases.push({realm:realm.id,db});
   db.exec('PRAGMA synchronous=FULL');
   const synchronous=db.prepare('PRAGMA synchronous').get();
   assert.equal(Number(synchronous?.synchronous),2,'FULL durability required for cold downgrade');
   assertDailyMonsterRewardRollbackReady477(db);
   assertArenaWingsRollbackReady477(db);
  }
  const now=Date.now();assert(Number.isSafeInteger(now)&&now>0,'Valid rollback wall time');
  const results=[];
  for(const {realm,db}of databases){
   db.exec('BEGIN IMMEDIATE');
   try{
    // Both helpers must preserve this caller transaction. They may use their
    // own savepoint; they must not COMMIT or ROLLBACK the outer transaction.
    const daily=disableDailyMonsterReward477(db,{now:()=>now});
    assert(db.isTransaction,'Daily helper must preserve the outer cold transaction');
    const arena=hideArenaWingsForRollback477(db,now);
    assert(db.isTransaction,'Arena helper must preserve the outer cold transaction');
    db.exec('COMMIT');results.push({realm,daily,arena});
   }catch(error){try{db.exec('ROLLBACK');}catch(rollbackError){throw new AggregateError([error,rollbackError],'V477 cold compatibility transaction rollback failed',{cause:error});}throw error;}
  }
  return {matched:true,results};
 }finally{for(const {db}of databases)db.close();}
}
