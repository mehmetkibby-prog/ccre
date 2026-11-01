import {createHash} from 'node:crypto';
const helper=new URL('./worker-finalprofile-r85.mjs',import.meta.url).href;
function once(source,before,after){if(source.split(before).length!==2)throw Error('writer_finalprofile_anchor_drift:'+before);return source.replace(before,after);}
function verify(source,sha){if(createHash('sha256').update(source).digest('hex')!==sha)throw Error('writer_finalprofile_source_drift');}
export async function load(url,context,next){
 const result=await next(url,context);let source=String(result.source??'');
 if(url.endsWith('/core511/reward-worker-runtime-r533.mjs')){
  verify(source,'ee98ff55cdc7473815fc79350a8b85bc16786bb1447a200831b3b55bc693f80b');
  source=`import {installWorkerFinalProfileR85} from ${JSON.stringify(helper)};\nimport {stageSnapshotR51} from './stage-timing-r51.mjs';\n`+source;
  source=once(source,'const checkpoint=installRewardCheckpointR79(database,config.checkpointR79);','const profileR85=installWorkerFinalProfileR85(database,{stageSnapshotR51});\n const checkpoint=installRewardCheckpointR79(database,config.checkpointR79);');
  source=once(source,'await writer.initialize();','await writer.initialize();profileR85.bind(writer);');
  source=once(source,'const started=performance.now();','await profileR85.begin(current);const started=performance.now();');
  source=once(source,'finally{current=null;}','finally{await profileR85.end(current);current=null;}');
 }else if(url.endsWith('/core511/attack-writer.mjs')){
  verify(source,'15719dcd652a0d5f1d930303cb69cd577a84a8bd4217a89aa13271f1916948b6');
  source=`import {profileSyncR85} from ${JSON.stringify(helper)};\n`+source;
  source=once(source,'const result=compactCombatResult(sync(rules.nativeAttack(db,ctx)));',"const result=profileSyncR85('nativeAttack',()=>compactCombatResult(sync(rules.nativeAttack(db,ctx))));");
  source=once(source,'const awarded=sync(rules.awardPendingNormalRewards(db,settings,Math.floor(nowMs/1000),{id:hit.id,spawn_round:hit.spawnRound}));',"const awarded=profileSyncR85('awardPendingNormalRewards',()=>sync(rules.awardPendingNormalRewards(db,settings,Math.floor(nowMs/1000),{id:hit.id,spawn_round:hit.spawnRound})));");
  source=once(source,"if(killedIds.length&&process.env.CORE511_DROP_FINALIZE!=='0')sync(rules.tryFinalizePendingDropEnchantments(db,settings,{ownerId:context.actor,monsterIds:killedIds}));","if(killedIds.length&&process.env.CORE511_DROP_FINALIZE!=='0')profileSyncR85('dropFinalize',()=>sync(rules.tryFinalizePendingDropEnchantments(db,settings,{ownerId:context.actor,monsterIds:killedIds})));");
 }else if(url.endsWith('/tests/runtime/native-mixed-load.mjs')){
  verify(source,'2a75398136e2434e7f000f2306f12c9245af0742888df162d3e3d2bea8a26d84');
  const before='const writerAcks=[],readerQueries=[],command=s.writer.command.bind(s.writer),query=s.reader.query.bind(s.reader);';
  source=once(source,before,before+`\n const workerPhasesR85=[],rewardWorkerR85=s.writer.rewardWorkerR533,workerSendR85=rewardWorkerR85.send.bind(rewardWorkerR85);rewardWorkerR85.send=async envelope=>{const at=performance.now();let result;try{return result=await workerSendR85(envelope);}finally{workerPhasesR85.push({operationId:envelope.request.operationId,operation:envelope.request.operation,sendOffset:at-started,receiveOffset:performance.now()-started,wallMs:performance.now()-at,workMs:result?.workMs,status:result?.ack?.result?.result?.status,ok:result?.ok});}};`);
  source=once(source,'operation:args[1]?.operation,action:args[1]?.payload?.input?.action','operationId:args[1]?.operationId,operation:args[1]?.operation,action:args[1]?.payload?.input?.action');
  source=once(source,'report.queueObservation={','report.workerPhasesR85=workerPhasesR85;report.queueObservation={');
 }else return result;
 return {...result,source};
}
