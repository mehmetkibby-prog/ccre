// Proposed native helper: called only by the stopped-service recovery gate.
// The boss helper exports below must be supplied by the reviewed server delta.
import {readFile,lstat,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {verifyRealmPackage} from './realm-package-integrity.mjs';
import {verifyNativeBuild} from './native-build-integrity.mjs';
import {assertStoneBossRollbackReady476,quarantineStoneBoss476} from './stone-boss476.mjs';

export const STONE_BOSS_ROLLBACK_SHA476='4ec9514e853f217795eb5ea5df94cc98d06f9d83af06233d8c23325c54de2020';

export async function reconcileStoneBossRollback476(release,realms){
 const bytes=await readFile(release+'/realm-package-manifest.json');
 if(createHash('sha256').update(bytes).digest('hex')!==STONE_BOSS_ROLLBACK_SHA476)return {matched:false};
 await verifyRealmPackage(release);await verifyNativeBuild(release+'/dist-vds');
 const databases=[];
 try{
  // Check every realm before any quarantine mutation. Database paths come
  // from validateRealmManifest; don't create an absent database on rollback.
  for(const realm of realms){
   const state=await lstat(realm.database);
   if(!state.isFile()||state.isSymbolicLink()||await realpath(realm.database)!==realm.database)throw Error('Stone boss rollback database must be an existing regular file');
   databases.push({realm:realm.id,db:new DatabaseSync(realm.database)});
  }
  for(const {db}of databases)assertStoneBossRollbackReady476(db);
  const results=[];
  for(const {realm,db}of databases)results.push({realm,...quarantineStoneBoss476(db)});
  return {matched:true,results};
 }finally{for(const {db}of databases)db.close();}
}
