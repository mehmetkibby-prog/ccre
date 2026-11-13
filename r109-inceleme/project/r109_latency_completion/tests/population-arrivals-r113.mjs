// Test-only fixed-cadence offers independent of previous command completion.
// Never bypass the real client, input window, rate/ownership or native cadence.
import {randomUUID} from 'node:crypto';
export function offerPopulationAttackR113(a,{now=Date.now(),measuring=false,isMeasuring=()=>measuring,send,count,onError}){
 if(now<(a.nextOfferR113??0))return;
 const missed=a.nextOfferR113?Math.max(0,Math.floor((now-a.nextOfferR113)/950)):0;
 a.nextOfferR113=now+950;
 const stats=a.arrivalsR113??={slots:0,missedClockSlots:0,unready:0,noTarget:0,moving:0,backpressured:0,offered:0,dispatched:0,completed:0,drained:0};
 if(measuring){stats.slots++;stats.missedClockSlots+=missed;}
 const c=a.client,w=c.world,p=w?.players.find(p=>p.id===a.id);
 if(!c.ready||!p){if(measuring)stats.unready++;return;}
 const solo=a.zone==='solo',run=solo?c.dungeon?.run:null,own=solo?run?.members.find(m=>m.id===a.id):p;
 if(!own||own.hp<=0){if(measuring)stats.unready++;return;}
 const monsters=solo?run?.enemies:w.monsters;
 const enemy=a.targetId?monsters?.find(m=>m.id===a.targetId&&m.hp>0):monsters?.filter(m=>m.hp>0).sort((x,y)=>Math.hypot(x.x-own.x,x.y-own.y)-Math.hypot(y.x-own.x,y.y-own.y))[0];
 if(!enemy){if(measuring)stats.noTarget++;return;}
 if(Math.hypot(enemy.x-own.x,enemy.y-own.y)>(solo?125:150)){if(measuring)stats.moving++;return;}
 if(measuring)stats.offered++;
 // The bounded backlog is observable. It is not silently converted into an
 // artificially slower arrival clock, and cannot grow without limit.
 if(c.pendingInputs().length+c.queue.length>=2){if(measuring)stats.backpressured++;return;}
 const ability=solo?null:(a.equipmentFixture?.abilities??[]).filter(s=>s.ability>0&&s.available&&(a.abilityNext?.[s.ability]??0)<=now).sort((x,y)=>y.ability-x.ability)[0];
 const input=solo?{action:'dungeon',command:{action:'attack',target:enemy.id,skill:0}}:{action:'attack',targetId:enemy.id,spawnRound:enemy.spawn_round,ability:ability?.ability??0,requestId:randomUUID(),intentId:randomUUID()};
 a.lastAttack=now;if(ability)(a.abilityNext??={})[ability.ability]=now+ability.safeCadenceMs;
 if(measuring){stats.dispatched++;a.attacks++;}count(a.zone+'Attacks');if(ability)count('skill'+ability.ability);
 a.openTasksR113??=new Set();let task;
 task=send(a,input).then(body=>{
  if(measuring)stats[isMeasuring()?'completed':'drained']++;
  if(!solo)for(const hit of body?.hits??[])if(hit.killed){a.claims.push({id:hit.id||hit.monsterId||enemy.id,spawnRound:hit.spawnRound??enemy.spawn_round});count(a.zone+'Kills');}
 },onError).finally(()=>a.openTasksR113.delete(task));
 a.openTasksR113.add(task);
}
