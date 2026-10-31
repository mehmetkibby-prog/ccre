// Synthetic ACK-delay comparison only. This is not a live game benchmark,
// capacity estimate, network measurement, or proof of end-user pause removal.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {CombatCheckpoints as R81CombatCheckpoints} from '../r81-work/core511-source/scripts/core511/combat-checkpoint.mjs';
import {CombatCheckpoints,joinedFixture,monster,ack,turn,assertReleased} from './checkpoint-fixture.mjs';
const checkpointDelayMs=500,deathAckDelayMs=15,repetitions=3;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const rows=[];
for(const [version,Journal]of [['R81',R81CombatCheckpoints],['R82',CombatCheckpoints]])for(const target of ['other','dying']){
 const samples=[];
 for(let i=0;i<repetitions;i++){
  let checkpointAcked=false,submittedBeforeCheckpointAck=null;
  const f=joinedFixture({Journal,deathSubmit:async(e,result)=>{submittedBeforeCheckpointAck=!checkpointAcked;await delay(deathAckDelayMs);return result(e);}});
  f.journal.submit=async e=>{await delay(checkpointDelayMs);checkpointAcked=true;return ack(e);};
  f.journal.changed({monsters:[monster(target,80)]});const pending=f.journal.flush(),start=performance.now(),{barrier}=f.start();
  await barrier;const barrierMs=performance.now()-start;await turn();assertReleased(f);assert.equal(f.writes.length,1);assert.equal(f.published.length,1);
  await pending;
  assert.equal(submittedBeforeCheckpointAck,version==='R82'&&target==='other');
  samples.push({barrierMs:Math.round(barrierMs*1000)/1000,submittedBeforeCheckpointAck});
 }
 const sorted=samples.map(r=>r.barrierMs).sort((a,b)=>a-b);
 rows.push({version,pendingTarget:target,medianBarrierMs:sorted[1],samples});
}
const evidence={scope:'controlled ACK-delay fixture, not live VDS',modules:'actual CombatCheckpoints, ActorCheckpoints, ResidentState, joinedDeathR53, FixedLoop and ResourceLanes; controlled writer/refresh ports',checkpointDelayMs,deathAckDelayMs,repetitions,node:process.version,rows};
writeFileSync(new URL('./checkpoint-wait-benchmark.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
