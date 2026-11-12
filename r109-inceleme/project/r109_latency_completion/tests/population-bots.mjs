// Real protocol clients in a separate process. Synthetic actions, no live access.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {activePopulationInputs,settlePopulationEnd} from './population-end-settlement.mjs';
import {observePopulationFinalEvent,recordPopulationPending} from './population-final-events.mjs';
import {WebSocket} from '/tmp/core511-build-deps/node_modules/ws/wrapper.mjs';
const {Core511Transport}=await import(process.env.STUTTER_TREE+'/core511-source/scripts/core511/client-transport.mjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let actors=[],timer,measuring=false,counts={},errors=[],cpu,started,endSettlement=null;
const count=k=>{if(measuring)counts[k]=(counts[k]||0)+1;};
const quantile=(a,p)=>a.length?[...a].sort((x,y)=>x-y)[Math.ceil(a.length*p)-1]:0;
const snapshot=()=>({pid:process.pid,counts,errors,endSettlement,provisionalOutcomes:actors.flatMap(a=>(a.provisionalOutcomes??[]).map(row=>({actor:a.n,...row}))),actors:actors.map(a=>({actor:a.n,zone:a.zone,channel:a.channel,ready:a.client.ready,queued:a.client.queue.length,active:activePopulationInputs(a),busy:a.busy,floors:[...a.floors],currentFloor:a.client.world?.adventure511?.run?.floor,attacks:a.attacks,acks:a.acks,latencyP95Ms:quantile(a.latencies,.95),maxLatencyMs:Math.max(0,...a.latencies),soloStage:a.client.dungeon?.run?.stage,soloHistory:a.soloHistory,pendingKills:a.pendingKills.size,pendingClaims:a.claims.length,pendingTargets:[...a.pendingKills.values()],claimTargets:a.claims.map(t=>({...t}))})),resources:{cpuMicros:cpu?process.cpuUsage(cpu):null,durationMs:started?performance.now()-started:null,maxRssBytes:process.resourceUsage().maxRSS*1024}});
async function send(a,input){
 if(input.action==='attack'){a.observedAttackIntents??=new Set();a.observedAttackIntents.add(input.intentId);if(a.observedAttackIntents.size>256){const oldest=a.observedAttackIntents.values().next().value;if([...a.pendingKills.values()].some(t=>t.intentId===oldest))throw Error('population_unresolved_intent_overflow');a.observedAttackIntents.delete(oldest);a.finalAttackEvents?.delete(oldest);}}
 const at=performance.now(),r=await a.client.command(input);
 if(measuring){a.latencies.push(performance.now()-at);a.acks++;count('replies');}
 // With native regen/healing enchants, HP can reach its cap between the
 // received snapshot and potion execution. This exact legal no-op is counted,
 // not confused with a transport/ownership failure. Other rejections fail.
 if(input.action==='use_potion'&&r.status===400&&r.body?.error==='Canın zaten dolu.'){count('potionFullNoop');return r.body;}
 if(r.status===202&&input.action==='attack'&&r.body?.combatPending===true){
  count('pendingKills');recordPopulationPending(a,input,r.body);
 }else if(r.status!==200)throw Error(JSON.stringify({operation:input.action,status:r.status,body:r.body}));
 return r.body;
}
async function act(a){
 const c=a.client,w=c.world,p=w?.players.find(p=>p.id===a.id);if(!c.ready||!p||a.busy)return;
 const now=Date.now();a.busy=true;
 try{
  if(a.zone==='solo'){
   const r=c.dungeon?.run,member=r?.members.find(m=>m.id===a.id),key=JSON.stringify([r?.id,r?.status,r?.stage,member?.hp<=0]);
   if(key!==a.soloKey){a.soloKey=key;a.soloHistory.push({at:now,status:r?.status,stage:r?.stage,hp:member?.hp,maxHp:member?.maxHp,notice:c.dungeon?.notice,message:r?.message});}
  }
  // Fixed scenario cadence is reported; it is not inferred from live usage.
  if(now>=a.nextHttp){
   a.nextHttp=now+11000;const path=['/api/guild','/api/quests','/api/world?marketShop506=own'][a.httpStep++%3];
   const r=await a.fetch(path,{method:'GET'});count('http:'+path);if(!r.ok)throw Error('HTTP '+path+' '+r.status+' '+await r.text());await r.arrayBuffer();
  }
  if(now>=a.nextChat){
   a.nextChat=now+30000;const r=await a.fetch('/api/chat',{method:'POST',body:JSON.stringify({body:'Population fixture '+a.n,scope:'world'})});count('chat');if(!r.ok)throw Error('chat '+r.status+' '+await r.text());await r.arrayBuffer();
  }
  if(now>=a.nextPotion){
   a.nextPotion=now+(a.zone==='solo'?2000:23000);const r=c.dungeon?.run,m=r?.members.find(m=>m.id===a.id);
   if(a.zone!=='solo'?(!a.equipmentFixture||p.hp<p.max_hp):r&&['active','portal'].includes(r.status)&&m?.hp>0&&m.hp<m.maxHp*.65){await send(a,a.zone==='solo'?{action:'dungeon',command:{action:'potion'}}:{action:'use_potion'});count('potions');}
  }
  if(a.zone==='solo'){
   const run=c.dungeon?.run;if(!run)return;
   const member=run.members.find(m=>m.id===a.id);if(!member||member.hp<=0)return;
   const enemy=run.enemies.filter(m=>m.hp>0).sort((x,y)=>Math.hypot(x.x-member.x,x.y-member.y)-Math.hypot(y.x-member.x,y.y-member.y))[0];if(!enemy)return;
   const d=Math.hypot(enemy.x-member.x,enemy.y-member.y);
   if(d>125&&now-a.lastMove>=250){a.lastMove=now;await send(a,{action:'dungeon',command:{action:'move',x:(enemy.x-member.x)/d,y:(enemy.y-member.y)/d,sequence:++a.moveSequence,followTarget:enemy.id}});count('soloMoves');}
   else if(d<=125&&now-a.lastAttack>=950){a.lastAttack=now;await send(a,{action:'dungeon',command:{action:'attack',target:enemy.id,skill:0}});count('soloAttacks');if(measuring)a.attacks++;}
   return;
  }
  const run=w.adventure511?.run;if(run)a.floors.add(run.floor);
  for(const [key,target]of a.pendingKills){const monster=w.monsters.find(m=>m.id===target.id);if(!monster||monster.hp<=0||monster.spawn_round>target.spawnRound){a.pendingKills.delete(key);a.claims.push(target);count('settledKills');}}
  if(a.claims.length){const targets=a.claims.splice(0);await send(a,{action:'claim_rewards',rewardTargets:targets,requestId:randomUUID()});count('claims');return;}
 const enemy=a.targetId?w.monsters.find(m=>m.id===a.targetId&&m.hp>0):w.monsters.filter(m=>m.hp>0).sort((x,y)=>Math.hypot(x.x-p.x,x.y-p.y)-Math.hypot(y.x-p.x,y.y-p.y))[0];if(!enemy)return;
  const distance=Math.hypot(enemy.x-p.x,enemy.y-p.y);
  if(distance>150&&now-a.lastMove>=250){a.lastMove=now;const step=Math.min(30,distance-140);c.move({action:'move',x:p.x+(enemy.x-p.x)/distance*step,y:p.y+(enemy.y-p.y)/distance*step,area:w.area,basePositionRevision:p.position_revision,requestId:randomUUID()});count(a.zone+'Moves');}
  else if(distance<=150&&now-a.lastAttack>=950){
   const ability=(a.equipmentFixture?.abilities??[]).filter(s=>s.ability>0&&s.available&&(a.abilityNext?.[s.ability]??0)<=now).sort((x,y)=>y.ability-x.ability)[0];
   a.lastAttack=now;const r=await send(a,{action:'attack',targetId:enemy.id,spawnRound:enemy.spawn_round,ability:ability?.ability??0,requestId:randomUUID(),intentId:randomUUID()});count(a.zone+'Attacks');if(measuring)a.attacks++;
   if(ability){(a.abilityNext??={})[ability.ability]=Date.now()+ability.safeCadenceMs;count('skill'+ability.ability);}
   for(const hit of r?.hits||[])if(hit.killed){a.claims.push({id:hit.id||hit.monsterId||enemy.id,spawnRound:hit.spawnRound??enemy.spawn_round});count(a.zone+'Kills');}
  }
 }catch(e){if(errors.length<100)errors.push({actor:a.n,zone:a.zone,at:Date.now(),error:e.message});}finally{a.busy=false;}
}
async function command(method,value){
 if(method==='init'){
  const {origin,serverOrigin}=value;actors=value.actors.map(a=>({...a,floors:new Set(),soloHistory:[],busy:false,lastMove:0,lastAttack:0,moveSequence:0,claims:[],pendingKills:new Map(),latencies:[],attacks:0,acks:0,httpStep:0,nextHttp:Infinity,nextChat:Infinity,nextPotion:Infinity}));
  for(const a of actors){
   class Socket extends WebSocket{constructor(url){super(url,{origin:serverOrigin,headers:{'X-Test-Actor':String(a.n)}});this.on('close',()=>count('socketCloses'));this.on('error',()=>count('socketErrors'));}}
   a.fetch=(url,opt={})=>fetch(origin+new URL(url,origin).pathname+new URL(url,origin).search,{...opt,headers:{origin:serverOrigin,cookie:'__Host-yasam-session='+a.token+'; __Host-yasam-csrf='+a.csrf,'X-CSRF-Token':a.csrf,'X-Game-Instance':a.instance,'X-Real-IP':'198.51.100.'+(a.n+1),'content-type':'application/json'}});
   a.client=new Core511Transport({WebSocket:Socket,origin,headers:()=>({}),fetch:a.fetch,notify:(kind,v)=>{if(kind==='event')observePopulationFinalEvent(a,v);if(kind==='error'&&errors.length<100)errors.push({actor:a.n,kind,value:v});}});
   await a.client.replace('character',{channel:a.channel});await a.client.image();assert(a.client.ready,'ready actor '+a.n);
  }
  for(const a of actors){
   if(a.zone==='tower')await send(a,{action:'adventure_tower_enter',requestId:randomUUID()});
   if(a.zone==='mist')await send(a,{action:'adventure_mist_enter',portalId:a.portalId,requestId:randomUUID()});
   if(a.zone==='solo')await send(a,{action:'dungeon',command:{action:'create_solo',requestId:randomUUID()}});
  }
  const until=Date.now()+15000;while(actors.some(a=>a.zone==='solo'?!a.client.dungeon?.run:['tower','mist'].includes(a.zone)&&!a.client.world?.adventure511?.run)&&Date.now()<until)await sleep(25);
  for(const a of actors){if(a.zone==='solo')assert(a.client.dungeon?.run,'solo entered');if(['tower','mist'].includes(a.zone))assert(a.client.world?.adventure511?.run,a.zone+' entered');}
  timer=setInterval(()=>{for(const a of actors)void act(a);},50);return {players:actors.length,pid:process.pid};
 }
 if(method==='begin'){assert.deepEqual(errors,[]);measuring=true;cpu=process.cpuUsage();started=performance.now();for(const a of actors){a.nextHttp=Date.now()+1000+a.n*170;a.nextChat=Date.now()+3000+a.n*250;a.nextPotion=Date.now()+5000+a.n*180;}return {started:true};}
 if(method==='end'){
  measuring=false;clearInterval(timer);timer=null;
  const resources=snapshot().resources;
  try{endSettlement=await settlePopulationEnd(actors,send);}
  catch(error){endSettlement=error.endSettlement??{passed:false,completed:false,failure:{message:error.message}};errors.push({phase:'end-settlement',error:error.message});}
  // Keep the measured counters and bot resource window independent of this
  // post-measurement drain; even failure returns the original measurement.
  return {...snapshot(),resources};
 }
 if(method==='snapshot')return snapshot();
 if(method==='close'){clearInterval(timer);for(const a of actors)a.client?.dispose();return {closed:true};}
 throw Error('unknown test command');
}
process.on('message',m=>{void command(m.method,m.value).then(result=>process.send?.({id:m.id,result}),error=>process.send?.({id:m.id,error:{message:error.message,stack:error.stack}}));});
process.on('disconnect',()=>{clearInterval(timer);for(const a of actors)a.client?.dispose();process.exit(0);});
