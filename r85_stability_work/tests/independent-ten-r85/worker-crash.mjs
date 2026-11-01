import {parentPort} from 'node:worker_threads';
import {runRewardWorkerR533} from '../../working/core511-source/scripts/core511/reward-worker-runtime-r533.mjs';
await runRewardWorkerR533({hook(phase,{database,current}){
 if(phase!=='after_command'||current?.request?.payload?.batchAttacksR57?.length!==9)return;
 const sql=database.sqlite,request=current.request;
 parentPort.postMessage({testHook:true,phase,operationId:request.operationId,synchronous:sql.prepare('PRAGMA synchronous').get().synchronous,receiptCount:sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId).n,defeats:sql.prepare("SELECT COUNT(*) n FROM normal_defeats WHERE monster_id LIKE 'golge-independent-r85-%'").get().n});
 process.exit(87);
}});
