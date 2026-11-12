// Test-only tail settlement, after performance collection stops. Never creates
// a new combat/movement input or changes server state except native claims.
import {randomUUID} from 'node:crypto';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export const activePopulationInputs=a=>Number(Boolean(a.client.active))+Number(Boolean(a.client.movementBehind));
const queued=a=>a.client.queue.length;
const inFlight=a=>a.busy||activePopulationInputs(a)>0||queued(a)>0;
const target=t=>({id:t.id,spawnRound:t.spawnRound});
export function populationEndState(actors){return actors.map(a=>({actor:a.n,id:a.id,ready:a.client.ready,busy:a.busy,queued:queued(a),active:activePopulationInputs(a),pendingTargets:[...a.pendingKills.values()].map(target),claimTargets:a.claims.map(target)}));}

export async function settlePopulationEnd(actors,send,{timeoutMs=10000,pollMs=10}={}){
 const start=performance.now(),deadline=start+timeoutMs;
 const proof={passed:false,completed:false,timeoutMs,durationMs:0,before:populationEndState(actors),after:null,reconciledTargets:[],claims:[]};
 const failure=message=>Object.assign(Error(message),{endSettlement:proof});
 const bounded=promise=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(failure('population_end_settlement_timeout')),Math.max(0,deadline-performance.now()));
  Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
 });
 try{
  for(;;){
   if(performance.now()>=deadline)throw failure('population_end_settlement_timeout');
   for(const a of actors){
    // A 202 presentation reply can finish a command before its durable world
    // update arrives. Keep the socket alive and observe fresh images only.
    if(inFlight(a)||!a.client.ready)continue;
    const monsters=a.client.world?.monsters;
    if(Array.isArray(monsters))for(const [key,t]of a.pendingKills){
     const monster=monsters.find(m=>m.id===t.id);
     if(!monster||monster.hp<=0||monster.spawn_round>t.spawnRound){
      a.pendingKills.delete(key);a.claims.push(target(t));
      proof.reconciledTargets.push({actor:a.n,...target(t)});
     }
    }
    if(a.claims.length){
     // Preserve targets until the existing protocol confirms the claim. A
     // failure or timeout must leave them in the evidence, not erase them.
     const targets=a.claims.slice(0,10).map(target),requestId=randomUUID();
     a.busy=true;
     try{
      await bounded(send(a,{action:'claim_rewards',rewardTargets:targets,requestId}));
      a.claims.splice(0,targets.length);
      proof.claims.push({actor:a.n,requestId,targets,acknowledged:true});
     }finally{a.busy=false;}
    }
   }
   if(actors.every(a=>a.client.ready&&!inFlight(a)&&a.pendingKills.size===0&&a.claims.length===0)){
    proof.passed=true;proof.completed=true;return proof;
   }
   await sleep(Math.min(pollMs,Math.max(0,deadline-performance.now())));
  }
 }catch(error){
  proof.failure={message:error.message};throw Object.assign(error,{endSettlement:proof});
 }finally{proof.durationMs=performance.now()-start;proof.after=populationEndState(actors);}
}
