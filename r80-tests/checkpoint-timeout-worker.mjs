import {DatabaseSync} from 'node:sqlite';
import {parentPort,workerData} from 'node:worker_threads';
const sql=new DatabaseSync(workerData.databasePath);
sql.prepare('PRAGMA journal_mode').get();
parentPort.on('message',()=>{});
parentPort.postMessage({ready:true,pageSize:4096,sqliteVersion:process.versions.sqlite});
