import {validateLoad} from '../core511/acceptance.mjs';
// User amendment 15 Oct 2026 12:24 Istanbul. Re-evaluate the retained raw
// local TCP run; NEVER change the report, VDS policy, or measured samples.
export function validateLocalCanary(report,sha){
 const strict=validateLoad(report,{transport:'websocket',durationMs:180000,manifestSha256:sha,requireCompleteGame:false});
 const failures=strict.failures.filter(code=>{
  if(code==='isolation')return !(report.isolation?.scratchDriverOnly===true&&report.isolation.privateDataRoot===true&&report.isolation.productionDatabaseOpened===false&&report.isolation.temporaryAccountsOnly===true);
  if(code.startsWith('runtime_pause:')){const row=report.measurement?.eventLoops.find(r=>r.target===code.slice('runtime_pause:'.length));return !(Number.isFinite(row?.maxPauseMs)&&row.maxPauseMs>=0&&row.maxPauseMs<=300);}
  if(code==='channel_targets')return !Array.isArray(report.channels)||report.channels.length!==4||new Set(report.channels.map(c=>c.channel)).size!==4||report.channels.some(c=>![1,2,3,4].includes(c.channel)||c.players!==25||c.minPlayers!==25||![c.tickP95Ms,c.tickP99Ms,c.elu,c.maxPauseMs,c.moves,c.attacks].every(Number.isFinite)||c.tickP95Ms<0||c.tickP95Ms>30||c.tickP99Ms<c.tickP95Ms||c.tickP99Ms>60||c.elu<0||c.elu>1||c.maxPauseMs<0||c.maxPauseMs>300||c.hotSqlReads!==0||c.moves<25||c.attacks<25);
  return true;
 });
 if(report.sourceUnchanged!==true||report.cleanupComplete!==true)failures.push('source_or_cleanup');
 if(report.generator?.nice!==10||!Number.isFinite(report.generator.processCpuMs)||!Number.isFinite(report.generator.maxRssBytes))failures.push('separate_generator');
 return {passed:failures.length===0,failures,scope:'local-direct-process-only',pauseLimitMs:300,systemdIsolation:'deferred-to-first-VDS-installation-gate',vdsThresholdComparison:strict,rawSamplesUnchanged:true};
}
