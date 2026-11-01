import {nativeNotification} from './notification-outbox.mjs';
import {notificationViews} from './notification-audience.mjs';
import {demand} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
import {skipInvalidNotification} from './cosmetic-notification.mjs';
const reportEventFault=createFaultReporter(text=>process.stderr.write(text));

// Preserve the native GM concealment and immutable loadlab audience rules.
// The hot route accumulates effects into the tick's one player frame.
export class EventFanout {
 constructor({channel,cycle,players,peerPlayer=()=>null,connected}){Object.assign(this,{channel,cycle,players,peerPlayer,connected});this.queues=new Map();}
 // notificationViews reads only routing/concealment fields. Snapshot all of
 // those live fields for every send; do not clone inventory/combat/account data
 // 25 times per hit. No audience or visibility result is cached.
 recipient(p,cycle){return {id:p.id,world_cycle:cycle,channel:p.channel,area:p.area,arena_match_id:p.arena_match_id,arenaMatchId:p.arenaMatchId,instance_id:p.instance_id,instanceId:p.instanceId,is_gm:p.is_gm,gm_invisible:p.gm_invisible};}
 hidden(id){const p=this.players.get(id)??this.peerPlayer(id);return p?.is_gm===1&&p.gm_invisible===1;}
 visible(route,id){
  const p=this.players.get(id);if(!p||route.cycle!==this.cycle())return null;
  try{return notificationViews(route,[this.recipient(p,this.cycle())],{hidden:actor=>this.hidden(actor)}).get(id)??null;}catch(error){if(skipInvalidNotification(error,{actor:id,channel:this.channel}))return null;throw error;}
 }
 receive(route){
  if(route.cycle!==this.cycle())return;
  const players=[];for(const p of this.players.values())if(this.connected(p.id))players.push(this.recipient(p,this.cycle()));
  let views;try{views=notificationViews(route,players,{hidden:actor=>this.hidden(actor),immutableEvents:true});}catch(error){if(skipInvalidNotification(error,{channel:this.channel}))return;throw error;}
  for(const [id,event]of views){
   let list=this.queues.get(id);if(!list)this.queues.set(id,list=[]);if(list.length>=256)list=this.compact(id,list);
   if(actorFaultIsolation&&list.length>=512){reportEventFault({actor:id,channel:this.channel,error:{code:'event_fanout_backpressure'}});continue;}
   demand(list.length<512,'event_fanout_backpressure');list.push(event);
  }
 }
 // player_hit carries the absolute hp/hpRevision, so a recipient whose frames
 // were held (global freeze, catch-up burst) needs only the newest per target.
 compact(id,list){const seen=new Set(),kept=[];for(let i=list.length-1;i>=0;i--){const e=list[i];if(e?.type==='player_hit'){if(seen.has(e.targetId))continue;seen.add(e.targetId);}kept.push(e);}kept.reverse();this.queues.set(id,kept);return kept;}
 publish(args){let route;try{route=nativeNotification(args);}catch(error){if(skipInvalidNotification(error,{channel:this.channel}))return null;throw error;}this.receive(route);return route;}
 take(id){const result=this.queues.get(id)??[];this.queues.delete(id);return result;}
 forget(id){this.queues.delete(id);}
}
