import test from 'node:test';
import assert from 'node:assert/strict';
import {REQUIRED_MECHANICS,releaseGate} from '../contract.mjs';
import {validateLocalLoad,validateInstallLoad,verifyInstallBeforeOpening} from '../acceptance.mjs';
import {synthetic,sha,syntheticPair} from './load-report-fixture.mjs';
test('acceptance refuses incomplete mechanics, short runs, weak isolation and non-finite values',()=>{
 assert(validateLocalLoad(synthetic(),sha).passed);assert(validateInstallLoad(synthetic('websocket'),sha).passed);
 for(const patch of [{workload:'kernel-components'},{verifiedMechanics:{}},{durationMs:179999},{errors:1},{disconnects:1},{unacknowledged:1},{completedPlayers:99},{isolation:{productionDatabaseOpened:true}},{resources:{cpuBudget:8,totalCpuFraction:.1,maxRssBytes:1000}}])assert(!validateLocalLoad({...synthetic(),...patch},sha).passed);
 for(const value of [undefined,NaN,Infinity,-1,25.01]){const report=synthetic();report.channels[0].tickP95Ms=value;assert(!validateLocalLoad(report,sha).passed);}
 const repeated=synthetic();repeated.channels[3].channel=1;assert(!validateLocalLoad(repeated,sha).passed);
 assert(!validateInstallLoad(synthetic(),sha).passed);assert(!validateLocalLoad(synthetic(),undefined).passed);
});
test('release permits the authorized local transport only with every gameplay, fault and installer binding gate',()=>{
 const proof={manifestSha256:sha,load:synthetic(),performanceRuns:syntheticPair(),parity:Object.fromEntries(REQUIRED_MECHANICS.map(name=>[name,true])),faults:Object.fromEntries(['killBeforeCommit','killAfterCommitBeforeAck','writerRestart','channelTransfer','reconnect','duplicateIntent','rollbackCurrentDatabase','productionIsolation'].map(name=>[name,true])),clientParity:true,nginxIsolation:true,signedInstaller:true,rollbackVerified:true,installerCanaryBound:true,installerCanaryFailureRecoveryTested:true};
 assert(releaseGate(proof).ready);assert.equal(releaseGate(proof).networkGate,'installer-maintenance-100-clients-180-seconds');
 for(const key of ['installerCanaryBound','installerCanaryFailureRecoveryTested','rollbackVerified'])assert(!releaseGate({...proof,[key]:false}).ready);
 assert(!releaseGate({...proof,load:{...proof.load,workload:'kernel-components'}}).ready);assert(!releaseGate({...proof,load:synthetic('websocket')}).ready);
});
function operations({network=synthetic('websocket'),failAt}={}){
 const calls=[],context={database:'current-live-database',oldCore:'v510',core:'v510',maintenance:true,isolated:false};
 const fn=(name,body=()=>{})=>async(...args)=>{calls.push(name);if(name===failAt)throw Error('injected_'+name);return body(...args);};
 const ops={lock:fn('lock',()=>({id:1})),preflight:fn('preflight',()=>({...context})),maintenance:fn('maintenance'),assertEmpty:fn('assertEmpty'),stage:fn('stage'),startIsolated:fn('startIsolated',()=>{context.isolated=true;return {id:'test'};}),runWebSocketTest:fn('runWebSocketTest',()=>network),stopIsolated:fn('stopIsolated'),removeIsolated:fn('removeIsolated',()=>context.isolated=false),verifyNoTestResidue:fn('verifyNoTestResidue',()=>{assert(!context.isolated);}),activate:fn('activate',()=>context.core='v511'),health:fn('health'),open:fn('open',()=>context.maintenance=false),rollbackCurrentDatabase:fn('rollbackCurrentDatabase',()=>{context.core='v510';context.maintenance=true;}),journal:fn('journal'),release:fn('release')};return {ops,calls,context};
}
test('installer controller verifies real-network report, cleanup and health, then stays in maintenance',async()=>{
 const {ops,calls,context}=operations();const result=await verifyInstallBeforeOpening({operations:ops,manifestSha256:sha,localPerformanceReports:syntheticPair(),localReport:synthetic()});assert(result.installed);assert.equal(context.maintenance,true);assert.equal(result.maintenanceOpen,false);assert.equal(context.database,'current-live-database');
 assert(calls.indexOf('verifyNoTestResidue')<calls.indexOf('activate'));assert(calls.includes('health'));assert(!calls.includes('open'));assert(!calls.includes('rollbackCurrentDatabase'));assert.deepEqual(result.vds,{maxPauseMs:20,tickP95Ms:4,tickP99Ms:8,inputP99Ms:70,inputMaxMs:90,potionBurst:null,normalPotion:{samples:800,p99Ms:70,maxMs:90},bossPotion:{samples:100,p99Ms:80,maxMs:100},runtimePeakRssBytes:6*1024**2,exclusionsApplied:0});
});
test('local failure prevents any installer mutation',async()=>{
 const {ops,calls}=operations();const result=await verifyInstallBeforeOpening({operations:ops,manifestSha256:sha,localPerformanceReports:syntheticPair(),localReport:{}});assert(!result.installed);assert.deepEqual(calls,[]);
});
for(const point of ['network','activate','health','removeIsolated'])test('installer failure at '+point+' returns to old code with CURRENT database and stays closed',async()=>{
 const report=synthetic('websocket');if(point==='network')report.disconnects=1;
 const {ops,calls,context}=operations({network:report,failAt:point==='network'?undefined:point});
 const result=await verifyInstallBeforeOpening({operations:ops,manifestSha256:sha,localPerformanceReports:syntheticPair(),localReport:synthetic()});assert(!result.installed);assert(result.rolledBack);assert.equal(context.database,'current-live-database');assert.equal(context.core,'v510');assert.equal(context.maintenance,true);assert.equal(calls.at(-1),'release');
 if(point!=='open')assert(!calls.includes('open'));
});
test('VDS controller never excludes a correlated pause and rolls back code with CURRENT DB',async()=>{
 const network=synthetic('websocket'),row=network.measurement.eventLoops.find(r=>r.target==='channel-4');row.maxPauseMs=row.timerMaxPauseMs=151;network.channels[3].maxPauseMs=151;network.localPausePolicy='control-both-endpoints-20ms-v1';network.localPauseAttribution={excludedCount:1,targets:[{target:'channel-4',acceptanceMaxPauseMs:1}]};
 const {ops,calls,context}=operations({network}),result=await verifyInstallBeforeOpening({operations:ops,manifestSha256:sha,localPerformanceReports:syntheticPair(),localReport:synthetic()});assert(!result.installed);assert(result.rolledBack);assert.equal(context.database,'current-live-database');assert.equal(context.core,'v510');assert(context.maintenance);assert(!calls.includes('activate'));assert(!calls.includes('open'));assert.equal(result.vds.maxPauseMs,151);assert.equal(result.vds.exclusionsApplied,0);
});
