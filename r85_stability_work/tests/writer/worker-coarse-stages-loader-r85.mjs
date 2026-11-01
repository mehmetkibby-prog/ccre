import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const pins=JSON.parse(readFileSync(new URL('./worker-coarse-stages-pins-r85.json',import.meta.url))),helper=new URL('./worker-coarse-stages-r85.mjs',import.meta.url).href;
function once(source,before,after){if(source.split(before).length!==2)throw Error('coarse_stage_anchor_drift:'+before);return source.replace(before,after);}
function functionSpan(source,name,label,{factory=false}={}){
 source=once(source,'export function '+name+'(','function original_'+name+'(');
 return source+'\nexport function '+name+'(...args){'+(factory?'const callback=original_'+name+'(...args);return (...inner)=>coarseStageR85('+JSON.stringify(label)+',()=>callback(...inner));':'return coarseStageR85('+JSON.stringify(label)+',()=>original_'+name+'(...args));')+'}\n';
}
export async function load(url,context,next){
 const result=await next(url,context),name=url.split('/').at(-1);if(!url.includes('/core511/')||!Object.hasOwn(pins,name))return result;
 let source=String(result.source??'');if(createHash('sha256').update(source).digest('hex')!==pins[name])throw Error('coarse_stage_source_drift:'+name);
 source='import {coarseStageR85,installCoarseStagesR85} from '+JSON.stringify(helper)+';\n'+source;
 if(name==='reward-worker-runtime-r533.mjs'){
  source=once(source,'const checkpoint=installRewardCheckpointR79(database,config.checkpointR79);','const coarseR85=installCoarseStagesR85(database);const checkpoint=installRewardCheckpointR79(database,config.checkpointR79);');
  source=once(source,'await writer.initialize();','await writer.initialize();coarseR85.bind(writer);');
  source=once(source,'const started=performance.now();','coarseR85.begin(current);const started=performance.now();');
  if(source.split('workMs:performance.now()-started').length!==3)throw Error('coarse_stage_result_anchors');
  source=source.replaceAll('workMs:performance.now()-started','coarseTimingR85:coarseR85.end(),workMs:performance.now()-started');
 }else if(name==='attack-writer.mjs'){
  source=functionSpan(source,'readAttackFrame','readAttackFrame');source=functionSpan(source,'sameAttackFrame','sameAttackFrame');
  source=once(source,'const rules=createAttackWriterRules({globals}),frame=','const rules=coarseStageR85(\'attackRules.factory\',()=>createAttackWriterRules({globals})),frame=');
  source=once(source,'const rules=createAttackWriterRules({...rng,','const rules=coarseStageR85(\'attackRules.factory\',()=>createAttackWriterRules({...rng,');
  source=once(source,'  }});\n  const ctx=','  }}));\n  const ctx=');
  source=once(source,'const result=compactCombatResult(sync(rules.nativeAttack(db,ctx)));',"const result=coarseStageR85('nativeAttack',()=>compactCombatResult(sync(rules.nativeAttack(db,ctx))));");
  source=once(source,'const awarded=sync(rules.awardPendingNormalRewards(db,settings,Math.floor(nowMs/1000),{id:hit.id,spawn_round:hit.spawnRound}));',"const awarded=coarseStageR85('awardPendingNormalRewards',()=>sync(rules.awardPendingNormalRewards(db,settings,Math.floor(nowMs/1000),{id:hit.id,spawn_round:hit.spawnRound})));");
  source=once(source,"if(killedIds.length&&process.env.CORE511_DROP_FINALIZE!=='0')sync(rules.tryFinalizePendingDropEnchantments(db,settings,{ownerId:context.actor,monsterIds:killedIds}));","if(killedIds.length&&process.env.CORE511_DROP_FINALIZE!=='0')coarseStageR85('dropFinalize',()=>sync(rules.tryFinalizePendingDropEnchantments(db,settings,{ownerId:context.actor,monsterIds:killedIds})));");
 }else{
  const specs={
   'joined-checkpoint-r53.mjs':['createJoinedCheckpointR53','checkpoint.join',{factory:true}],
   'actor-commit-sections-r57.mjs':['captureCommitSectionsR57','snapshot.commitSections'],
   'item-refresh-r57.mjs':['captureItemRefreshR57','snapshot.itemRefresh'],
   'actor-section-reuse-r52.mjs':['certifyActorSectionsR52','snapshot.certifyActor'],
   'native-write-resources.mjs':['assertNativeWriteResources','guard.nativeResources'],
   'local-reward-scope.mjs':['assertLocalRewardScope','guard.localReward'],
   'settlement-resources.mjs':['assertSettlementResources','guard.settlement'],
   'compact-receipt.mjs':['writeReceipt','receipt.pack']
  };const spec=specs[name];if(!spec)throw Error('coarse_stage_unimplemented:'+name);source=functionSpan(source,...spec);
 }
 return {...result,source};
}
