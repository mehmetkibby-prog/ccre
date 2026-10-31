import {DatabaseSync} from 'node:sqlite';
import {workerData} from 'node:worker_threads';
const sql=new DatabaseSync(workerData.databasePath);
sql.prepare('PRAGMA journal_mode').get();
sql.close();
process.exit(0);
