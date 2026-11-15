import {TOWER_HOOK_CHANCE} from './tower-config.mjs';
import {committedSchemaReadyR113} from './committed-result-r113.mjs';

// Startup capability proof; no database scan or process creation on HTTP health.
// A crashed/unready persistence worker may not certify a completed upgrade.
export function engineHealthR113(core){
 const worker=core.writer?.rewardWorkerR533,slot=worker?.slot;
 const engineReadyR113=Boolean(committedSchemaReadyR113(core.database.sqlite)&&worker&&!worker.closed&&slot?.readyAckR113&&!slot.ended&&!slot.error);
 return {engineRework:'R113_ENGINE1',engineReadyR113,runeForum:'R114_RUNE_FORUM1',sharedScope:'R115_SHARED_SCOPE1',admissionTransfer:'R116_ADMISSION_TRANSFER1',royalChampions:'R118_ROYAL1',royalReadyR118:Boolean(core.writer?.services?.globals?.__colRoyalR118&&core.writer?.services?.globals?.__colChampionsR118),hookRate:'R117_HOOK10',azrailHookChance:TOWER_HOOK_CHANCE};
}
