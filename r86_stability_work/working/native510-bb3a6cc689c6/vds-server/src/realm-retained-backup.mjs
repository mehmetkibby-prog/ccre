import {DatabaseSync} from 'node:sqlite';
import {backupInOneStep, verifiedBackup} from './sqlite-backup.mjs';
import {mkdtemp, realpath, chmod, open, writeFile, readdir, unlink, rmdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

async function syncFile(file) {
  const handle=await open(file,'r');try{await handle.sync();}finally{await handle.close();}
}

// Called under the installer's cutover lock. A killed attempt has no verified
// receipt and is never a retained successful archive. Never remove a verified
// archive here; that requires the owner's separate cleanup confirmation.
async function cleanInterruptedAttempts(root){
 for(const entry of await readdir(root,{withFileTypes:true})){
  if(!entry.isDirectory()||!/^pre-416a-retained-[A-Za-z0-9]+$/.test(entry.name))continue;
  const directory=path.join(root,entry.name),files=await readdir(directory,{withFileTypes:true});
  if(files.some(f=>f.name==='verified.json'))continue;
  if(files.some(f=>!f.isFile()||!/^legacy-game\.sqlite(?:(?:\.partial-[a-f0-9-]+)?(?:-journal|-wal|-shm)?)$/.test(f.name)))continue;
  for(const file of files)await unlink(path.join(directory,file.name));await rmdir(directory);
 }
}

// Backup preparation ONLY: no service stop, config switch, reset or cleanup.
// The installer must quiesce all legacy writers before the FINAL backup and
// keep them stopped until cutover. SQLite backup includes committed WAL data;
// copying only the main file is insufficient. Retained archives are outside
// the ordinary rolling-backup/release cleanup directories.
export async function retainPreRealmBackup({sourceCopy, archiveRoot, now=Date.now}) {
  for(const file of [sourceCopy,archiveRoot])
    if(typeof file!=='string'||!path.isAbsolute(file)||path.normalize(file)!==file)
      throw new Error('Explicit canonical backup paths required');
  if(await realpath(sourceCopy)!==sourceCopy||await realpath(archiveRoot)!==archiveRoot)
    throw new Error('Backup paths cannot be symlinks');
  await cleanInterruptedAttempts(archiveRoot);
  const directory=await mkdtemp(path.join(archiveRoot,'pre-416a-retained-'));
  await chmod(directory,0o700);
  const destination=path.join(directory,'legacy-game.sqlite');
  const source=new DatabaseSync(sourceCopy,{readOnly:true});
  try {await verifiedBackup(destination, file=>backupInOneStep(source,file));}finally{source.close();}
  await chmod(destination,0o600);
  const verify=new DatabaseSync(destination,{readOnly:true});
  let tables;
  try {
    if(verify.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Retained backup integrity failed');
    tables=verify.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table'").get().n;
  }finally{verify.close();}
  await syncFile(destination);
  const digest=createHash('sha256');
  for await(const chunk of createReadStream(destination))digest.update(chunk);
  const report={version:1,kind:'pre-416a-retained',createdAtMs:now(),
    file:'legacy-game.sqlite',sha256:digest.digest('hex'),tables,integrity:'ok',
    sourceDeleted:false,sourceDeactivated:false};
  const receipt=path.join(directory,'verified.json');
  await writeFile(receipt,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  await syncFile(receipt);await syncFile(directory);await syncFile(archiveRoot);
  return {directory,...report};
}
