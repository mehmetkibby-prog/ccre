import {CHANNELS,REQUIRED_MECHANICS} from '../../core511/contract.mjs';
import {validateRuntimeMeasurements} from './runtime-acceptance.mjs';
import {PERFORMANCE_POLICY as P,pauseLimit} from './performance-policy.mjs';
import {validateInputMeasurements,validatePotionDebits,COMPLETE_INPUT_PROTOCOL} from './input-response-measurements.mjs';
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
// Reports must come from the exact candidate. A transport/component benchmark
// cannot authorize production even when all of its timing numbers are small.
export function validateLoad(report,{transport,durationMs,manifestSha256,requireCompleteGame=true}={}){
 const failures=[];
 if(!report||report.schemaVersion!==1||report.manifestSha256!==manifestSha256||!/^[a-f0-9]{64}$/.test(manifestSha256??''))failures.push('candidate_identity');
 if((requireCompleteGame?report?.workload!=='complete-game':!['native-gameplay-mixed','complete-game'].includes(report?.workload))||report?.transport!==transport)failures.push('workload_or_transport');
 if(requireCompleteGame)for(const name of REQUIRED_MECHANICS)if(report?.verifiedMechanics?.[name]!==true)failures.push('mechanic:'+name);
 if(requireCompleteGame&&report?.inputResponses?.protocol!==COMPLETE_INPUT_PROTOCOL)failures.push('complete_game_potion_scenarios');
 if(!finite(report?.durationMs,durationMs,Infinity)||report?.players!==100||report?.simultaneouslyConnected!==100||report?.completedPlayers!==100)failures.push('population_or_duration');
 if(report?.errors!==0||report?.disconnects!==0||report?.unacknowledged!==0)failures.push('errors_disconnects_or_unacknowledged');
 if(report?.isolation?.productionDatabaseOpened!==false||report?.isolation?.privateDataRoot!==true||report?.isolation?.externalServicesReachable!==false||report?.isolation?.temporaryAccountsOnly!==true)failures.push('isolation');
 // Latest acceptance uses role-specific raw bounds locally and on VDS. Correlation is
 // diagnostic only; even historical policy flags cannot exclude a pause.
 const pause=(_target,raw)=>raw;
 const channels=report?.channels;
 if(!Array.isArray(channels)||channels.length!==4||new Set(channels.map(c=>c.channel)).size!==4||channels.some(c=>!CHANNELS.includes(c.channel)||c.players!==25||c.minPlayers!==25||!finite(c.tickP95Ms,0,P.tickP95Ms)||!finite(c.tickP99Ms,c.tickP95Ms,P.tickP99Ms)||!finite(c.elu,0,1)||!finite(pause('channel-'+c.channel,c.maxPauseMs),0,P.maxPauseMs)||c.hotSqlReads!==0||!finite(c.moves,25,Infinity)||!finite(c.attacks,25,Infinity)))failures.push('channel_targets');
 if(!finite(report?.writer?.elu,0,P.mainElu)||!finite(report?.writer?.ackP95Ms,0,Infinity)||!finite(pause('main',report?.writer?.maxPauseMs),0,pauseLimit('main'))||!finite(report?.writer?.committedEvents,1,Infinity)||report?.writer?.errors!==0||report?.writer?.receiptsVerified!==true||!validatePotionDebits(report))failures.push('writer_targets');
 if(report?.resources?.cpuBudget!==4||!finite(report?.resources?.totalCpuFraction,0,1)||!finite(report?.resources?.maxRssBytes,1,P.maxRssBytes))failures.push('host_targets');
 failures.push(...validateInputMeasurements(report?.inputResponses,{sent:report?.sent,acknowledged:report?.acknowledged}));
 failures.push(...validateRuntimeMeasurements(report,{durationMs,transport}));
 return {passed:failures.length===0,failures};
}
export const validateLocalLoad=(report,manifestSha256)=>validateLoad(report,{transport:'message-channel',durationMs:P.durationMs,manifestSha256});
export const validateInstallLoad=(report,manifestSha256)=>validateLoad(report,{transport:'websocket',durationMs:P.durationMs,manifestSha256});

export const validateLocalPerformance=(report,manifestSha256)=>validateLoad(report,{transport:'message-channel',durationMs:P.durationMs,manifestSha256,requireCompleteGame:false});
export function validatePerformancePair(reports,manifestSha256){
 const valid=Array.isArray(reports)&&reports.length===2&&reports.every(r=>r?.status==='measured'&&r.sourceUnchanged===true&&r.acceptanceEligible!==false&&r.sourceIdentity?.sha256===manifestSha256&&validateLocalPerformance(r,manifestSha256).passed);
 return Boolean(valid&&Number.isSafeInteger(reports[0].attempt)&&reports[1].attempt===reports[0].attempt+1&&reports[0].measurement.runId!==reports[1].measurement.runId&&reports[0].profilingMode===reports[1].profilingMode);
}

// Adapter callbacks are privileged installer operations, not request payloads.
// Production bindings must reuse the existing authenticated maintenance/drain/
// tuple rollback implementation. This controller itself never restores a DB.
export async function verifyInstallBeforeOpening({operations:o,manifestSha256,localReport,localPerformanceReports}){
 const local=validateLocalLoad(localReport,manifestSha256);
 if(!validatePerformancePair(localPerformanceReports,manifestSha256))local.failures.push('consecutive_same_candidate_pair');local.passed=local.failures.length===0;
 if(!local.passed)return {installed:false,stage:'local_acceptance',failures:local.failures};
 for(const name of ['lock','preflight','maintenance','assertEmpty','stage','startIsolated','runWebSocketTest','stopIsolated','removeIsolated','verifyNoTestResidue','activate','health','rollbackCurrentDatabase','journal','release'])if(typeof o?.[name]!=='function')throw Error('Missing installer operation '+name);
 let lock,prior,isolated,activated=false,stage='lock',vds=null;
 try{
  lock=await o.lock();stage='preflight';prior=await o.preflight({manifestSha256});
  // The actual installer must include GM, current admissions, pending durable
  // writes and both old/new channel ownership, not just a panel player count.
  await o.maintenance(prior);await o.assertEmpty(prior);await o.journal({stage:'maintenance_zero',manifestSha256});
  stage='stage';await o.stage({manifestSha256,prior});
  stage='isolated_network_test';isolated=await o.startIsolated({manifestSha256,players:100,channels:4,capacity:25,durationMs:P.durationMs});
  const report=await o.runWebSocketTest(isolated),acceptance=validateInstallLoad(report,manifestSha256);
  vds={maxPauseMs:Math.max(...(report.measurement?.eventLoops??[]).map(r=>r.maxPauseMs)),tickP95Ms:Math.max(...(report.channels??[]).map(c=>c.tickP95Ms)),tickP99Ms:Math.max(...(report.channels??[]).map(c=>c.tickP99Ms)),inputP99Ms:report.inputResponses?.segments?.normal?.p99Ms??null,inputMaxMs:report.inputResponses?.segments?.normal?.maxMs??null,potionBurst:report.inputResponses?.segments?.potionBurst??null,normalPotion:report.inputResponses?.segments?.normalPotion??null,bossPotion:report.inputResponses?.segments?.bossPotion??null,runtimePeakRssBytes:report.resources?.maxRssBytes??null,exclusionsApplied:0};
  await o.journal({stage:'network_result',manifestSha256,acceptance,report,vds});
  await o.stopIsolated(isolated);await o.removeIsolated(isolated);await o.verifyNoTestResidue(isolated);isolated=null;
  if(!acceptance.passed)throw Object.assign(Error('installation_network_test_failed'),{failures:acceptance.failures});
  stage='activate';await o.assertEmpty(prior);await o.activate({manifestSha256,prior});activated=true;
  stage='health';await o.health({manifestSha256,channels:4,capacity:25});
  // Installation leaves maintenance in place. A separate explicit command
  // must recheck maintenance ownership/revision before opening the game.
  stage='ready_to_open';await o.journal({stage:'verified_ready_to_open',manifestSha256});
  return {installed:true,stage:'verified_ready_to_open',maintenanceOpen:false,report,vds};
 }catch(error){
  let cleanupError=null,rollbackError=null;
  if(isolated){try{await o.stopIsolated(isolated);await o.removeIsolated(isolated);await o.verifyNoTestResidue(isolated);}catch(e){cleanupError=e.message;}}
  if(prior){try{await o.rollbackCurrentDatabase(prior,{activated,keepMaintenance:true});}catch(e){rollbackError=e.message;}}
  const result={installed:false,stage,failures:error.failures??[error.code??error.message],cleanupError,rollbackError,rolledBack:Boolean(prior&&!rollbackError),maintenanceOpen:false,vds};
  await o.journal({stage:'failed',manifestSha256,result});return result;
 }finally{if(lock)await o.release(lock);}
}
