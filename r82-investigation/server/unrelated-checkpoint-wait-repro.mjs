// Actual shipped journal/death/barrier modules, with controlled actor/writer
// ports. This proves an awaited dependency, not live VDS latency or safety of
// removing that dependency without complete integration tests.
import assert from 'node:assert/strict';
import {CombatCheckpoints} from '../../r81-work/core511-source/scripts/core511/combat-checkpoint.mjs';
import {joinedDeathR53} from '../../r81-work/core511-source/scripts/core511/attack-commit-r53.mjs';
import {FixedLoop} from '../../r81-work/core511-source/scripts/core511/fixed-loop.mjs';

const immediate=()=>new Promise(resolve=>setImmediate(resolve));
for(const checkpointTarget of [null,'unrelated-monster','dying-monster']){
  const owner={epoch:1,pending:0,state:'active'},actor='actor-1';
  const state={channel:1,owners:new Map([[actor,owner]]),assertOwner:()=>owner};
  const noop=()=>null;
  const kernel=new FixedLoop({state,rules:{movement:noop,combat:noop,ai:noop,respawn:noop,project:noop},send:noop});
  const player={epoch:1,barrier:null,results:[],deferred:[],queue:[],passive:false,suspended:false,accepting:true};
  kernel.players.set(actor,player);
  const journal=new CombatCheckpoints({submit:async()=>{throw Error('unexpected checkpoint submission');}});
  let releaseCheckpoint;
  if(checkpointTarget){
    journal.pendingTargetsR54=new Set([checkpointTarget]);
    const task=new Promise(resolve=>{releaseCheckpoint=()=>{journal.pending=null;journal.pendingTargetsR54=null;resolve();};});
    journal.pending=task;
  }
  const entry={epoch:1,pending:null,joinedR53:null};
  const checkpoints={entries:new Map([[actor,entry]]),
    captureR53(id){const token={id,entry,payload:{base:{id},current:{id}}};entry.joinedR53=token;return token;},
    finishR53(token){assert.equal(entry.joinedR53,token);entry.joinedR53=null;},
    hydrateCommitted:noop};
  const lease={state:'held',keys:['player:'+actor,'monster:dying-monster']};
  let writes=0;
  const loop={checkpoints,combatCheckpoints:journal,
    lanes:{assert:l=>assert.equal(l.state,'held'),release:l=>{l.state='released';},reject:(l,error)=>{l.state='rejected';throw error;}},
    frameFor:()=>({player:{id:actor},settings:{}}),
    submit:async()=>{writes++;return {key:'death-test',result:{players:[{id:actor}],monsters:[],participants:[],bossParticipants:[],events:[],checkpointR53:[{id:actor}],result:{status:200,body:{ok:true}}}};},
    memory:{committed:noop,view:{setMonster:noop}},committed:async()=>{},publish:noop};
  joinedDeathR53(loop,{id:actor,input:{targetId:'dying-monster'},now:1000,receivedAtMs:1000,kernel,
    local:{targets:[{id:'dying-monster'}]},ids:[actor],lease,seed:1,key:'death-test'});
  const barrier=player.barrier;
  assert(barrier instanceof Promise);
  await immediate();
  const writesBeforeRelease=writes,heldBeforeRelease=player.barrier!==null;
  if(checkpointTarget){
    assert.equal(writes,0);assert.equal(owner.pending,1);assert.equal(heldBeforeRelease,true);
    releaseCheckpoint();
  }else assert.equal(writes,1);
  await barrier;await immediate();
  assert.equal(writes,1);assert.equal(player.barrier,null);assert.equal(owner.pending,0);assert.equal(lease.state,'released');
  console.log(JSON.stringify({checkpointTarget,writesBeforeRelease,heldBeforeRelease,writesAfterRelease:writes,
    note:checkpointTarget==='unrelated-monster'?'Unrelated existing checkpoint ACK delays death submission.':'Control case.'}));
}
