import {parentPort} from 'node:worker_threads';
import {runRewardWorkerR533} from '../../working/core511-source/scripts/core511/reward-worker-runtime-r533.mjs';
await runRewardWorkerR533({hook(phase,{current}){
 if(phase==='after_command'&&current?.request?.operation==='attack')parentPort.postMessage({testHook:true,operationId:current.request.operationId,loot:globalThis.__r85LootPureStats??null});
}});
