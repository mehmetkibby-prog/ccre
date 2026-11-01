import {readFile, mkdir, readdir, unlink} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {LocalDatabase} from './database.mjs';
import {verifiedBackup, removeInterruptedBackups} from './sqlite-backup.mjs';
const root=process.env.CORE_DATA_ROOT || '/var/lib/coreoflife-game';
let config;
if(process.env.CORE_CONFIG_FILE)config=JSON.parse(await readFile(process.env.CORE_CONFIG_FILE,'utf8'));
else {
 const state=JSON.parse(await readFile(path.join(root,'state.json'),'utf8'));
 if(!['prepared','active'].includes(state.status))process.exit(0);
 if(!/^[a-zA-Z0-9-]+$/.test(state.job))throw new Error('Invalid backup job');
 config=JSON.parse(await readFile(path.join(root,'jobs',state.job,'config.json'),'utf8'));
}
const directory=path.join(root,'backups');await mkdir(directory,{recursive:true,mode:0o700});
// The OS releases flock even after SIGKILL; a stale PID file cannot disable backups.
if(process.env.CORE_BACKUP_LOCK_HELD!=='1'){
 const child=spawn('/usr/bin/flock',['--nonblock',path.join(directory,'.backup.lock'),process.execPath,fileURLToPath(import.meta.url)],{stdio:'inherit',env:{...process.env,CORE_BACKUP_LOCK_HELD:'1'}});
 child.on('error',error=>{console.error(error.message);process.exit(1);});
 child.on('exit',(code)=>process.exit(code??1));
 await new Promise(()=>{});
}
await removeInterruptedBackups(directory);
const name=`game-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`;
const db=new LocalDatabase(config.database);
try {await verifiedBackup(path.join(directory,name),file=>db.backup(file));}finally{db.close();}
const files=(await readdir(directory)).filter(file=>/^game-backup-[0-9TZ-]+\.sqlite$/.test(file)).sort();
for(const file of files.slice(0,-28))await unlink(path.join(directory,file));
console.log(JSON.stringify({backup:name,integrity:'ok',rate:-1,retention:28}));
