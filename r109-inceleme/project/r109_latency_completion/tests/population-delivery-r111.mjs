// Test-only, bounded client measurement. A 202 is not a confirmed death.
import {performance} from 'node:perf_hooks';
const percent=(rows,p)=>rows.length?[...rows].sort((a,b)=>a-b)[Math.ceil(rows.length*p)-1]:0;
const stats=rows=>({count:rows.length,p50Ms:percent(rows,.5),p95Ms:percent(rows,.95),p99Ms:percent(rows,.99),maxMs:rows.reduce((max,value)=>Math.max(max,value),0),over50:rows.filter(x=>x>50).length,over200:rows.filter(x=>x>200).length,over1000:rows.filter(x=>x>1000).length});
export class PopulationDelivery {
 constructor(){this.pending=new Map();this.replies=new Map();this.deaths=[];this.visibleDeaths=[];this.worldBeforeReply=0;this.slow=[];}
 sent(actor,input,at){
  const key=actor+':'+(input.intentId??input.requestId);
  if(input.action==='attack')this.pending.set(key,{actor,at,target:input.targetId,spawnRound:input.spawnRound});
  if(this.pending.size>25600)throw Error('delivery_observer_overflow');
 }
 world(actor,world,at){
  // Test-only visual confirmation. Count it only after this exact attack's
  // terminal result proves a kill; another actor's kill cannot become ours.
  for(const row of this.pending.values())if(row.actor===actor&&row.visualAt===undefined&&Number.isSafeInteger(row.spawnRound)){
   const monster=world?.monsters?.find(m=>m.id===row.target&&m.spawn_round===row.spawnRound);
   if(monster?.hp<=0)row.visualAt=at;
  }
 }
 reply(actor,input,result,at){
  const action=input.action==='dungeon'?'dungeon:'+input.command?.action:input.action;
  // Attack intents remain awaiting their own terminal event after a 202.
  if(input.action!=='attack')return;
  const key=actor+':'+input.intentId,row=this.pending.get(key);
  if(!row)return; // A final event can precede the 202 acknowledgement.
  const samples=this.replies.get(action)??[];samples.push(at-row.at);this.replies.set(action,samples);
  if(result.status!==202){this.terminal(key,result.body,at);}
 }
 event(actor,event,at){
  if(!['monster_result','monster_reject'].includes(event?.type))return;
  this.terminal(actor+':'+event.intentId,event,at);
 }
 terminal(key,result,at){
  const row=this.pending.get(key);if(!row)return;
  this.pending.delete(key);
  if(result?.hits?.some(h=>h.killed===true)){
   const ms=at-row.at;this.deaths.push(ms);this.visibleDeaths.push(Math.min(at,row.visualAt??at)-row.at);if(row.visualAt!==undefined&&row.visualAt<at)this.worldBeforeReply++;
   if(ms>50&&this.slow.length<500)this.slow.push({actor:row.actor,target:row.target,ms,atMs:performance.timeOrigin+at});
  }
 }
 snapshot(){return {definition:'client send to committed killed=true reply or terminal event; excludes speculative 202',deaths:stats(this.deaths),visibleDeathDefinition:'same confirmed kill: first matching authoritative dead-HP world image or final killed result; never a speculative frame',visibleDeaths:stats(this.visibleDeaths),worldBeforeReply:this.worldBeforeReply,attackReplies:Object.fromEntries([...this.replies].map(([key,rows])=>[key,stats(rows)])),slowDeaths:this.slow,pending:this.pending.size};}
}
