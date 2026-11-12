import {readFile,writeFile,open,realpath,unlink,rmdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';import {createHash,randomUUID} from 'node:crypto';import path from 'node:path';
import {retainPreRealmBackup} from './realm-retained-backup.mjs';
export const RESET_CONFIRMATION='RESET-ALL-416A';
export const DELETE_CONFIRMATION='DELETE-VERIFIED-LEGACY-BACKUP-416A';
const durableJson=async(file,value)=>{const h=await open(file,'wx',0o600);try{await h.writeFile(JSON.stringify(value,null,2)+'\n');await h.sync();}finally{await h.close();}const d=await open(path.dirname(file),'r');try{await d.sync();}finally{await d.close();}};

// Operations are injected by the host installer. This state machine is also
// rehearsed with isolated local fixtures and simulated service failures.
export async function activateFreshRealms({confirmation,legacyDatabase,archiveRoot,receiptFile,operations}) {
 if(confirmation!==RESET_CONFIRMATION)throw new Error('Explicit reset approval required');
 const lock=await open(receiptFile+'.lock','wx',0o600);await lock.close();
 let stopped=false,started=false,committed=false;
 try {
  try{await readFile(receiptFile);throw new Error('Cutover already completed');}catch(error){if(error.code!=='ENOENT')throw error;}
  await operations.preflight();
  await operations.stopLegacy();stopped=true;
  const backup=await retainPreRealmBackup({sourceCopy:legacyDatabase,archiveRoot});
  await durableJson(receiptFile+'.backup-'+randomUUID()+'.json',backup);
  started=true;await operations.startFresh(backup);
  const health=await operations.verifyFresh();
  if(health?.accounts!==true||health?.realm1!==true||health?.realm2Closed!==true)throw new Error('Fresh world health verification failed');
  await operations.switchIngress();
  await durableJson(receiptFile,{version:'416a',backupDirectory:backup.directory,legacyDatabase,healthyAtMs:Date.now(),backupDeletionApproved:false});committed=true;
  return {ok:true,backupDirectory:backup.directory};
 }catch(error){
  // First installation can restore its original routing/services on FAILURE
  // before successful cutover. This is not a legacy-code rollback after players
  // have started using the new world; normal recovery stays within v416a.
  if(!committed){
   const failures=[];
   if(started)try{await operations.stopFresh();}catch(e){failures.push(e);}
   if(stopped)try{await operations.restoreLegacy();}catch(e){failures.push(e);}
   if(failures.length)throw new AggregateError([error,...failures],'Activation failed; recovery also needs attention');
  }
  throw error;
 }finally{await unlink(receiptFile+'.lock');}
}

// Separately invoked AFTER healthy startup and explicit owner deletion approval.
// Only the verified archive files are deleted. The inactive source DB is NOT
// removed by this command; deleting it needs its own separately scoped action.
export async function deleteRetainedArchive({confirmation,receiptFile,directory}) {
 if(confirmation!==DELETE_CONFIRMATION)throw new Error('Explicit backup deletion approval required');
 const receipt=JSON.parse(await readFile(receiptFile,'utf8'));
 if(receipt.version!=='416a'||!receipt.healthyAtMs||receipt.backupDirectory!==directory||await realpath(directory)!==directory)throw new Error('Verified healthy cutover and matching archive required');
 const metadata=JSON.parse(await readFile(path.join(directory,'verified.json'),'utf8'));
 if(metadata.kind!=='pre-416a-retained'||metadata.file!=='legacy-game.sqlite'||!/^[a-f0-9]{64}$/.test(metadata.sha256))throw new Error('Invalid backup identity');
 const file=path.join(directory,metadata.file);
 if(await realpath(file)!==file)throw new Error('Backup cannot be a symlink');
 const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);
 if(hash.digest('hex')!==metadata.sha256)throw new Error('Backup changed; explicit inspection required');
 await durableJson(receiptFile+'.deletion-approved.json',{directory,approvedAtMs:Date.now(),confirmation});
 await unlink(file);await unlink(path.join(directory,'verified.json'));await rmdir(directory);
 return {deletedArchive:true,deletedLegacySource:false};
}
