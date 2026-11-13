import {workerData,parentPort} from 'node:worker_threads';
import {runRewardWorkerR533} from '../working/core511-source/scripts/core511/reward-worker-runtime-r533.mjs';

await runRewardWorkerR533({hook(phase,{current}){
 if(phase===workerData.crashAt&&(current?.request.operation==='attack'||current?.systemR113)){
  parentPort.postMessage({testHook:true,phase,systemR113:current.systemR113===true});process.exit(98);
 }
}});
