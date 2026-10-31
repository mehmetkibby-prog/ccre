import {performance} from 'node:perf_hooks';
import {abandonedActors as baseline} from '../r79-audit/core511-source/scripts/core511/abandoned-normal.mjs';
import {abandonedActors as changed} from '../r81-work/core511-source/scripts/core511/abandoned-normal.mjs';
import {withPreparedStatements477 as originalScope} from '../r79-audit/native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {withPreparedStatements477 as changedScope} from '../r81-work/native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {pair,heavyFixture,NOW_MS,TARGET} from './abandoned-r81-fixture.mjs';

const iterations=200,rounds=5;
function explain(db,sql){
 const args=[TARGET.id,TARGET.spawnRound,Math.floor(NOW_MS/1000)-30];
 const plan=db.prepare('EXPLAIN QUERY PLAN '+sql).all(...args).map(r=>r.detail);
 const bytecode=db.prepare('EXPLAIN '+sql).all(...args);
 const rootpage=db.prepare("SELECT rootpage FROM sqlite_schema WHERE type='table' AND name='players'").get().rootpage;
 const cursors=new Set(bytecode.filter(r=>r.opcode==='OpenRead'&&r.p2===rootpage&&r.p3===0).map(r=>r.p1));
 const columns=[...new Set(bytecode.filter(r=>r.opcode==='Column'&&cursors.has(r.p1)).map(r=>r.p2))].sort((a,b)=>a-b);
 return {scope:'synthetic fixture query plan; live schema/index statistics were not retrieved',queryPlan:plan,playersTableColumnOrdinalsRead:columns,unusedPlayerColumnReads:columns.filter(i=>i>=10)};
}
function measure(fn,scope,options){
 const f=options.heavy?heavyFixture(options):pair(options);
 const sampleIterations=options.heavy?10:iterations,sampleRounds=options.heavy?3:rounds,warmupCalls=options.heavy?2:10;
 let compiled=0,hotSql=null;const prepare=f.db.prepare;
 f.db.prepare=function(sql,...rest){if(String(sql).startsWith('WITH life(')){compiled++;hotSql=sql;}return Reflect.apply(prepare,this,[sql,...rest]);};
 try {
  const repeat=n=>{for(let i=0;i<n;i++)fn(f.db,TARGET,NOW_MS);};
  const run=n=>scope?scope(f.db,()=>repeat(n)):repeat(n);
  run(warmupCalls);
  const trials=[];compiled=0;
  for(let r=0;r<sampleRounds;r++){
   const t=performance.now();
   run(sampleIterations);
   trials.push((performance.now()-t)/sampleIterations);
  }
  const sorted=[...trials].sort((a,b)=>a-b);
  const result={iterationsPerRound:sampleIterations,rounds:sampleRounds,warmupCalls,medianMsPerCall:sorted[Math.floor(sorted.length/2)],trialsMsPerCall:trials,compiledInMeasuredCalls:compiled};
  if(options.heavy)result.explain=explain(f.db,hotSql);
  return result;
 }finally{f.db.close();}
}
const rows=[];
for(const mode of ['preflight','already-inside-prepared-writer-scope'])for(const extraColumns of [0,100,300]){
 const options={extraColumns,payloadBytes:256},before=measure(baseline,mode==='preflight'?null:originalScope,options),after=measure(changed,mode==='preflight'?null:changedScope,options);
 rows.push({mode,fixture:{players:2,participants:1,partyMembers:2,eligibilityColumns:10,extraColumns,payloadBytesPerExtraColumn:256},baseline:before,changed:after,ratio:before.medianMsPerCall/after.medianMsPerCall});
}
{
 const options={extraColumns:100,payloadBytes:256,heavy:true};
 const before=measure(baseline,originalScope,options),after=measure(changed,changedScope,options);
 rows.push({mode:'already-inside-prepared-writer-scope-heavy-history',fixture:{players:600,currentParticipants:16,partyMembers:20,historicalParticipants:30000,historicalNormalClaims:15000,historicalXpClaims:10000,historicalSinsiClaims:6000,extraColumns:100,payloadBytesPerExtraColumn:256,largeJsonColumnsPerPlayer:3,largeJsonItemsPerColumn:100},baseline:before,changed:after,ratio:before.medianMsPerCall/after.medianMsPerCall});
}
console.log(JSON.stringify({scope:'isolated synthetic in-memory SQLite benchmark; not a live-server forecast',runtime:process.version,sqlite:process.versions.sqlite,iterationsPerRound:iterations,rounds,rows},null,2));
