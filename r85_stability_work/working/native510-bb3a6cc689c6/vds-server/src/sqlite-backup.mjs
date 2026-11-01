import {backup, DatabaseSync} from 'node:sqlite';
import {open, access, unlink, link, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

// One sqlite3_backup_step(-1): a concurrent WAL writer cannot restart a
// succession of 100-page steps indefinitely. Always run in the backup process.
export const backupInOneStep = (sqlite, destination) => backup(sqlite, destination, {rate: -1});
export async function syncBackupFile(file) {
 const h=await open(file,'r');try{await h.sync();}finally{await h.close();}
}
const exists=async file=>{try{await access(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const remove=async file=>{try{await unlink(file);}catch(e){if(e.code!=='ENOENT')throw e;}};
export async function verifyBackup(file) {
 // Opening a leftover rollback journal could recover it and hide an interrupted
 // attempt. Reject it BEFORE opening the database, even if SQLite could recover.
 if(await exists(file+'-journal'))throw new Error('Incomplete backup: rollback journal remains');
 const db=new DatabaseSync(file,{readOnly:true});
 try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Backup integrity failed');}finally{db.close();}
}
export async function verifiedBackup(destination, copy) {
 const temporary=destination+'.partial-'+randomUUID();
 const h=await open(temporary,'wx',0o600);await h.close();
 let published=false;
 try {
  await copy(temporary);
  await verifyBackup(temporary);await syncBackupFile(temporary);
  // No replacement of an earlier successful archive, even on a name collision.
  await link(temporary,destination);published=true;
  await syncBackupFile(path.dirname(destination));
 }catch(error){if(published)await remove(destination);throw error;}
 finally{for(const suffix of ['','-journal','-wal','-shm'])await remove(temporary+suffix);}
 return destination;
}
// Caller holds its backup-directory lock. Only this tool's filenames qualify.
export async function removeInterruptedBackups(directory) {
 for(const name of await readdir(directory)){
  if(!/^(game|accounts)-backup-[0-9TZ-]+\.sqlite(?:\.partial-[a-f0-9-]+(?:-journal|-wal|-shm)?|-journal)$/.test(name))continue;
  const file=path.join(directory,name);if(!(await stat(file)).isFile())continue;
  await remove(file);
  if(name.endsWith('.sqlite-journal'))await remove(file.slice(0,-8));
 }
}
