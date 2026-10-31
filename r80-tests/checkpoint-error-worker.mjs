import {DatabaseSync} from 'node:sqlite';
import {workerData} from 'node:worker_threads';
const sql=new DatabaseSync(workerData.databasePath);
// A genuine SQLite exception whose cause is not classified as transient.
sql.prepare('SELECT * FROM checkpoint_test_missing_table').all();
