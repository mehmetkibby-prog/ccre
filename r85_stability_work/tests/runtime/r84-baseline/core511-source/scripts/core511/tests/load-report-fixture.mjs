import {REQUIRED_MECHANICS} from '../contract.mjs';
import {InputResponses} from '../input-response-measurements.mjs';
export const sha='a'.repeat(64);
export function syntheticInputs({normalP99=70,normalMax=90,burstMax=90}={}){
 const inputs=new InputResponses();inputs.begin(0);
 for(let i=0;i<1000;i++){const potion=i<100,at=potion?500:2000+(i-100)*100,ms=potion?burstMax:i===999?normalMax:normalP99;inputs.record({at,channel:i%4+1,actor:'synthetic-'+i%100,sequence:Math.floor(i/100)+1,action:potion?'use_potion':'move'},at+ms);}
 return inputs.report();
}
// Synthetic validator/controller input only. Never saved as measured load proof.
export function syntheticMixInputs({normalP99=70,normalMax=90,bossP99=80,bossMax=100}={}){
 const input=new InputResponses({completeGame:true});input.begin(0);
 for(let i=0;i<100;i++){
  const actor='synthetic-'+i,channel=i%4+1;
  for(let j=0;j<8;j++){const at=10000+j*20000+i,ms=i===99&&j===7?normalMax:normalP99;input.record({actor,channel,sequence:j+1,action:'use_potion',at},at+ms);}
  const at=90000+i*18,ms=i===99?bossMax:bossP99;input.record({actor,channel,sequence:9,action:'use_potion',at,scenario:'bossPotion'},at+ms);
  input.record({actor,channel,sequence:10,action:'move',at:170000+i},170000+i+normalP99);
 }return input.report();
}
export function synthetic(transport='message-channel',{completeGame=true}={}){
 const durationMs=180000,targets=['main','world','channel-1','channel-2','channel-3','channel-4','reader'],runId='11111111-1111-4111-8111-111111111111';
 const eventLoops=targets.map((target,i)=>({protocol:'core511-load-window-v1',target,runId,incarnation:'synthetic-owner-'+i,pid:target==='reader'?100:100+i,threadId:target==='reader'?1:0,durationMs,delaySamples:durationMs,timerSamples:durationMs,elu:.1,histogramMaxPauseMs:20,timerMaxPauseMs:20,maxPauseMs:20,processCpuMs:target==='reader'?null:durationMs/10,maxRssBytes:target==='reader'?null:1024**2,complete:true}));
 return {schemaVersion:1,manifestSha256:sha,workload:completeGame?'complete-game':'native-gameplay-mixed',transport,verifiedMechanics:Object.fromEntries(REQUIRED_MECHANICS.map(name=>[name,true])),durationMs,players:100,simultaneouslyConnected:100,completedPlayers:100,sent:1000,acknowledged:1000,inputResponses:completeGame?syntheticMixInputs():syntheticInputs(),errors:0,disconnects:0,unacknowledged:0,isolation:{productionDatabaseOpened:false,privateDataRoot:true,externalServicesReachable:false,temporaryAccountsOnly:true},channels:[1,2,3,4].map(channel=>({channel,players:25,minPlayers:25,tickP95Ms:4,tickP99Ms:8,elu:.15,maxPauseMs:20,maxInputMs:49,hotSqlReads:0,moves:3000,attacks:2000})),writer:{elu:.1,ackP95Ms:5,maxPauseMs:15,committedEvents:100,errors:0,receiptsVerified:true,potions:completeGame?{players:100,matched:100,initialEach:64,actors:Array.from({length:100},(_,i)=>({actor:'synthetic-'+i,consumed:9,remaining:55}))}:{players:100,expectedEach:1,matched:100}},resources:{cpuBudget:4,totalCpuFraction:.15,maxRssBytes:6*1024**2},measurement:{runId,eventLoops}};
}

export function syntheticPair(){return [1,2].map(attempt=>{const r=synthetic('message-channel',{completeGame:false});r.attempt=attempt;r.status='measured';r.sourceUnchanged=true;r.sourceIdentity={sha256:sha};r.measurement.runId='11111111-1111-4111-8111-11111111111'+attempt;for(const row of r.measurement.eventLoops)row.runId=r.measurement.runId;return r;});}
