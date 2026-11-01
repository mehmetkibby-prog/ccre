// Test-only observation. Never changes a server rule or acknowledges a second
// protocol sequence. A provisional response and its durable event are timed
// separately; unresolved work remains in the final report.
const quantile=(a,p)=>a.length?[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.ceil(a.length*p)-1)]:null;
const report=a=>({n:a.length,p50:quantile(a,.5),p95:quantile(a,.95),p99:quantile(a,.99),max:a.length?Math.max(...a):null});
export class RewardObservationR54 {
 constructor(){this.clients=new Set();this.final=[];this.visible=[];this.provisional=0;this.rejected=0;this.damage=[];this.eventTypes=new Map();}
 state(c){this.clients.add(c);return c.rewardR54??={inputs:new Map(),finished:[],xp:null,rankXp:null,drops:new Set()};}
 sent(c,payload,at,measured){if(payload.action!=='attack')return;const s=this.state(c);if(s.inputs.size>=128)throw Error('r54_observation_overflow');s.inputs.set(payload.intentId,{payload,at,measured,beforeXp:s.xp,beforeRank:s.rankXp,targets:new Set()});}
 result(c,pending,result){
  if(pending.payload.action!=='attack')return false;const s=this.state(c),r=s.inputs.get(pending.payload.intentId);if(!r)return false;
  const b=result.body;
  if(result.status===202&&b?.combatPending){r.provisional=true;this.provisional++;for(const h of b.provisionalHits??[])if(h.killPending)r.targets.add(h.id);return true;}
  if(b?.hits?.some(h=>h.killed)){for(const h of b.hits){this.damage.push(h.damage);if(h.killed)r.targets.add(h.id);}this.finish(s,r,performance.now());}
  else s.inputs.delete(pending.payload.intentId);return false;
 }
 finish(s,r,now){if(r.done)return;r.done=true;r.finalAt=now;s.inputs.delete(r.payload.intentId);if(r.measured)this.final.push(now-r.at);s.finished.push(r);if(s.finished.length>512)throw Error('r54_visibility_observation_overflow');}
 packet(c,packet,onFinal){
  const s=this.state(c),now=performance.now(),w=packet.world;
  if(w){const p=(w.data?.players??w.entities?.players?.upsert??[]).find(p=>p.id===c.p.id);if(p){if(Number.isFinite(p.xp))s.xp=p.xp;if(Number.isFinite(p.rank_xp))s.rankXp=p.rank_xp;}}
  const newDrops=[];for(const d of w?.data?.drops??w?.entities?.drops?.upsert??[])if(!s.drops.has(d.id)){s.drops.add(d.id);newDrops.push(d);}
  const events=packet.events??(packet.type==='event'?[packet.event??packet.payload??packet.data]:[]);
  for(const event of events){if(!event)continue;this.eventTypes.set(event.type,(this.eventTypes.get(event.type)??0)+1);const r=s.inputs.get(event.intentId);if(!r||event.attackerId!==c.p.id)continue;
   if(event.type==='monster_reject'){this.rejected++;s.inputs.delete(event.intentId);continue;}
   if(event.type!=='monster_result')continue;
   for(const h of event.hits??[]){if(Number.isFinite(h.damage))this.damage.push(h.damage);if(h.killed)r.targets.add(h.id);}
   if(!r.targets.size)continue;this.finish(s,r,now);if(r.provisional)onFinal(r.payload,{status:200,body:{...event,rewardPending:true}});
  }
  for(const r of s.finished)if(!r.visibleAt&&w){
   const xp=Number.isFinite(r.beforeXp)&&Number.isFinite(s.xp)&&s.xp>r.beforeXp,rank=Number.isFinite(r.beforeRank)&&Number.isFinite(s.rankXp)&&s.rankXp>r.beforeRank;
   const drop=newDrops.some(d=>d.owner_id===c.p.id&&r.targets.has(d.monster_id));
   if(xp||rank||drop){r.visibleAt=now;if(r.measured)this.visible.push(now-r.at);}
  }
  s.finished=s.finished.filter(r=>!r.visibleAt&&now-r.at<120000);
 }
 report(){return {provisional:this.provisional,durableDeathFromInputMs:report(this.final),firstOwnXpOrTargetDropObservedMs:report(this.visible),visibilityDefinition:'First world packet after durable death with increased own XP/rank XP or new owned drop for the target; other party awards can contribute to the XP observation. Not an exact per-receipt attribution.',damage:report(this.damage),rejected:this.rejected,pendingFinal:[...this.clients].flatMap(c=>[...(c.rewardR54?.inputs.values()??[])].filter(r=>r.provisional).map(r=>({actor:c.p.id,channel:c.p.channel,intent:r.payload.intentId,open:c.ws.readyState===1,ageMs:performance.now()-r.at}))),pendingVisibility:[...this.clients].reduce((n,c)=>n+(c.rewardR54?.finished.length??0),0),eventTypes:Object.fromEntries(this.eventTypes)};}
}
