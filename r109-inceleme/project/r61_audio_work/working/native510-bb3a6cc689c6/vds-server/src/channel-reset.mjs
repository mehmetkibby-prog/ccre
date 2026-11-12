import {open,readFile,writeFile,rename,unlink,realpath,mkdir,stat,statfs} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {retainPreRealmBackup} from './realm-retained-backup.mjs';
import {requireBackupSpace} from './realm-install-preflight.mjs';
export const CHANNEL_RESET_CONFIRMATION='RESET-ALL-417';
export async function writeDurableJson(file,value,{exclusive=false}={}){
 const tmp=file+'.tmp-'+randomUUID(),h=await open(tmp,'wx',0o600);
 try{await h.writeFile(JSON.stringify(value,null,2)+'\n');await h.sync();}finally{await h.close();}
 if(exclusive){const {link}=await import('node:fs/promises');try{await link(tmp,file);}finally{await unlink(tmp);}}else await rename(tmp,file);
 const d=await open(path.dirname(file),'r');try{await d.sync();}finally{await d.close();}
}
// Host operations are injected. All three old databases stay untouched; new
// worlds are created under a distinct root. No ordinary rollback restores data.
export async function activateChannelReset({confirmation,sources,archiveRoot,receiptFile,operations}){
 if(confirmation!==CHANNEL_RESET_CONFIRMATION)throw Error('RESET-ALL-417 required');
 if(sources.length!==3||new Set(sources.map(s=>s.id)).size!==3||!['accounts','r1','r2'].every(id=>sources.some(s=>s.id===id)))throw Error('All realm databases must be backed up');
 for(const s of sources)if(!path.isAbsolute(s.database)||await realpath(s.database)!==s.database)throw Error('Canonical source database required');
 await mkdir(archiveRoot,{recursive:true,mode:0o700});
 const bytes=(await Promise.all(sources.map(s=>stat(s.database,{bigint:true})))).reduce((sum,s)=>sum+s.size,0n),disk=await statfs(archiveRoot,{bigint:true});requireBackupSpace(bytes,disk.bavail*disk.bsize);
 const lock=await open(receiptFile+'.lock','wx',0o600);await lock.close();let stopped=false,starting=false,committed=false;
 try{
  try{await readFile(receiptFile);throw Error('Reset already completed');}catch(e){if(e.code!=='ENOENT')throw e;}
  await operations.preflight();stopped=true;await operations.stopOld();
  const backups=[];
  for(const s of sources){const backup=await retainPreRealmBackup({sourceCopy:s.database,archiveRoot});backups.push({id:s.id,...backup});}
  await writeDurableJson(receiptFile+'.backups.json',{version:'417',backups},{exclusive:true});
  starting=true;await operations.startNew(backups);
  const h=await operations.health();if(!h?.accounts||!h?.r1||!h?.r2Closed||!h?.empty)throw Error('New empty realms health failed');
  await operations.activateIngress();
  const receipt={version:'417',healthyAtMs:Date.now(),backups,oldDatabasesDeleted:false};await writeDurableJson(receiptFile,receipt,{exclusive:true});committed=true;return receipt;
 }catch(error){
  if(!committed){const failures=[];if(starting)try{await operations.stopNew();}catch(e){failures.push(e);}if(stopped)try{await operations.restoreOld();}catch(e){failures.push(e);}if(failures.length)throw new AggregateError([error,...failures],'Activation and recovery failed; retained databases must be inspected');}
  throw error;
 }finally{await unlink(receiptFile+'.lock');}
}
