import {workerData} from 'node:worker_threads';
import {runRewardWorkerR533} from '../working/core511-source/scripts/core511/reward-worker-runtime-r533.mjs';

await runRewardWorkerR533({hook(phase,{current}){
 if(phase===workerData.crashAt&&current?.request.operation==='attack')process.exit(98);
}});
