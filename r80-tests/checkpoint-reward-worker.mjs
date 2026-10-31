import {DatabaseSync} from 'node:sqlite';
import {parentPort,workerData} from 'node:worker_threads';
import {installRewardCheckpointR79} from '../r80-work/core511-source/scripts/core511/checkpoint-runtime-r79.mjs';
const sqlite=new DatabaseSync(workerData.file);
sqlite.exec('PRAGMA synchronous=FULL; PRAGMA wal_autocheckpoint=4000;');
const database={sqlite,commitWrites(){sqlite.exec('COMMIT');}};
const mode=installRewardCheckpointR79(database,workerData.buffer);
const snapshot=()=>({autocheckpoint:Number(sqlite.prepare('PRAGMA wal_autocheckpoint').get().wal_autocheckpoint),synchronous:Number(sqlite.prepare('PRAGMA synchronous').get().synchronous),mode:mode.snapshot()});
parentPort.on('message',message=>{
 try{
  if(message.kind==='commit'){sqlite.exec('BEGIN');database.commitWrites();}
  if(message.kind==='close'){mode.close();sqlite.close();parentPort.postMessage({id:message.id,ok:true,closed:true});parentPort.close();return;}
  parentPort.postMessage({id:message.id,ok:true,result:snapshot()});
 }catch(error){parentPort.postMessage({id:message.id,ok:false,code:error.code??'reward_fixture_error'});}
});
parentPort.postMessage({ready:true,...snapshot()});
