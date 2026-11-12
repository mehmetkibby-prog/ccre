import {randomInt} from 'node:crypto';
import {verificationRoomR90} from './verification-room-r90.mjs';
import {AfkMetrics,AFK_DEFAULT_SETTINGS} from './afk-metrics.mjs';
import {AFK_ACTIONS,afkExempt,afkQuestionEligible,afkNormalAttack,afkVerificationRequired} from './afk-policy.mjs';

const unavailable=()=>({status:503,body:{ok:false,code:'afk_check_unavailable',error:'Doğrulama şu anda yanıt vermiyor. Biraz sonra tekrar dene.'}});
// Created only when CORE511_AFK_CHECK != 0. Ticks touch channel memory only;
// the private main-process endpoint writes just summaries and AFK events.
export class AfkChannel {
 constructor(runtime,{settings=AFK_DEFAULT_SETTINGS,jitter=()=>randomInt(-900000,900001)}={}){
  this.runtime=runtime;this.settings={...AFK_DEFAULT_SETTINGS,...settings};this.entries=new Map();this.nextTick=0;this.jitter=jitter;
 }
 identity(id){return this.runtime.channel.identities.get(id);}
 player(id){return this.runtime.channel.view.player(id);}
 entry(id){return this.entries.get(id);}
 enabled(entry){return this.settings.enabled!==false&&this.settings.enabled!==0&&entry?.state.enabled!==false;}
 exempt(id,entry=this.entry(id)){return afkExempt(this.player(id),this.runtime.channel.frames.entries.get(id)?.afk,entry?.state,this.runtime.clock());}
 roomR97(id){return verificationRoomR90(this.player(id),this.runtime.dungeon?.locked(id));}
 blocked(id,entry=this.entry(id)){return Boolean(entry&&this.enabled(entry)&&!this.exempt(id,entry)&&(entry.state.challenge&&!this.roomR97(id)||entry.state.blockedUntil));}
 eligible(id,entry=this.entry(id),now=this.runtime.clock()){
  const c=this.runtime.channel;return afkQuestionEligible({player:this.player(id),dungeon:this.runtime.dungeon?.locked(id),engagement:c.view.engagements.get(id),monster:mid=>c.view.monster(mid),recentCombatUntil:entry?.recentCombatUntil??0,now});
 }
 makeEntry(id){const identity=this.identity(id);if(!identity)return null;const row={identity,state:{enabled:this.settings.enabled!==false,exempt:false,locked:false,challenge:null,pending:false,force:false,revision:0,resetRevision:0},metrics:null,version:0,sent:-1,pending:null,lastRequestAt:0,recentCombatUntil:0,seenResults:new Set(),needsState:true,contextKey:null,summary:null,triggerReason:null};this.entries.set(id,row);return row;}
 settingsUpdate(settings){
  if(!settings||typeof settings!=='object'||Number.isSafeInteger(settings.revision)&&Number.isSafeInteger(this.settings.revision)&&settings.revision<this.settings.revision||Object.keys(settings).every(key=>settings[key]===this.settings[key]))return;
  const wasEnabled=this.settings.enabled!==false&&this.settings.enabled!==0;this.settings={...this.settings,...settings};
  if(wasEnabled&&(this.settings.enabled===false||this.settings.enabled===0))for(const row of this.entries.values()){row.metrics=null;row.state={...row.state,enabled:false};row.version++;}
  else for(const row of this.entries.values()){row.state={...row.state,enabled:this.settings.enabled!==false};if(!wasEnabled&&this.settings.enabled!==false&&this.settings.enabled!==0)row.needsState=true;row.version++;}
 }
 hydrate(bundle){
  const id=bundle?.player?.id;if(!id)return;
  let row=this.entry(id);const identity=this.identity(id);
  if(!row||row.identity.epoch!==identity?.epoch||row.identity.session!==identity?.session){row=this.makeEntry(id);}
  if(!row)return;
  if(bundle.afkCheck)this.apply(id,bundle.afkCheck);
  if(this.exempt(id,row))row.metrics=null;
 }
 apply(id,state){
  if(!state||typeof state!=='object')return false;
  if(Number.isSafeInteger(state.settings?.revision)&&Number.isSafeInteger(this.settings.revision)&&state.settings.revision<this.settings.revision)return false;
  const row=this.entry(id)??this.makeEntry(id);if(!row)return false;
  if(Number.isSafeInteger(state.revision)&&state.revision<Number(row.state.revision??0))return false;
  if(state.settings)this.settingsUpdate(state.settings);
  const reset=Number(state.resetRevision??0)>Number(row.state.resetRevision??0);
  const same=['enabled','exempt','locked','blocked','blockedUntil','pending','force','revision','resetRevision'].every(key=>(state[key]??row.state[key])===row.state[key])&&state.challenge?.nonce===row.state.challenge?.nonce&&state.challenge?.deadline===row.state.challenge?.deadline;
  row.state={...row.state,...state};row.needsState=Boolean(state.challenge&&this.roomR97(id));if(!same)row.version++;
  if(reset||!this.enabled(row)||this.exempt(id,row)){row.metrics=null;row.summary=null;row.triggerReason=null;}
  return true;
 }
 control(payload){
  if(payload?.settings)this.settingsUpdate(payload.settings);
  if(payload?.actor&&payload.state)this.apply(payload.actor,payload.state);
  if(Array.isArray(payload?.states))for(const row of payload.states)this.apply(row.actor,row.state);
  return {updated:true};
 }
 ready(identity){const row=this.entry(identity.actor);if(row)row.sent=-1;}
 drop(id){this.entries.delete(id);}
 guard(identity,input,now=this.runtime.clock()){
  const row=this.entry(identity.actor);if(input?.action==='auto_start_r102'&&row&&(row.state.challenge||row.state.locked||Number(row.state.blockedUntil)>now))return afkVerificationRequired();if(!row||!this.enabled(row)||this.exempt(identity.actor,row))return true;
  if(this.blocked(identity.actor,row)&&['move','attack','pvp_attack','guardian_dash'].includes(input?.action))return afkVerificationRequired();
  // Room context may reach the writer after this input. A still-pending
  // question cannot block combat while its authoritative deferral is in flight.
  // Existing failed-answer/timeout locks are deliberately preserved.
  if(this.roomR97(identity.actor)&&!row.state.locked&&!row.state.blockedUntil)return true;
  const expired=row.state.challenge&&Number(row.state.challenge.deadline)<=now;
  if(!(row.state.locked||expired||row.needsState))return true;
  const c=this.runtime.channel;if(afkNormalAttack({player:c.view.player(identity.actor),input,monster:id=>c.view.monster(id),monsters:()=>c.view.monsters.values()}))return afkVerificationRequired();
  return true;
 }
 accepted(identity,input,now=this.runtime.clock()){
  const id=identity.actor,row=this.entry(id);if(!row||!this.enabled(row)||this.exempt(id,row)||row.state.locked||this.blocked(id,row))return;
  const p=this.player(id),c=this.runtime.channel,m=input?.action==='attack'?c.view.monster(input.targetId):null;
  const pve=Boolean(m?.hp>0&&p?.hp>0&&m.area===p.area&&(m.channel===0||m.channel===p.channel));
  if(!row.metrics){if(!pve)return;row.metrics=new AfkMetrics(now,{jitterMs:this.jitter()});}
  if(['move','attack','pvp_attack'].includes(input?.action))row.metrics.input(input.action,now,p,{pve,jitterMs:row.metrics.active(now)?row.metrics.jitterMs:this.jitter()});
 }
 committed(actor,result,command){
  if(!result||!this.settings.enabled)return;
  const now=this.runtime.clock(),body=result.result?.body??result.body??{},c=this.runtime.channel,source=this.entry(actor),key=command?.operationId??command?.key,kind=command?.operation??command?.kind;
  if(source&&key){if(source.seenResults.has(key))return;source.seenResults.add(key);if(source.seenResults.size>256)source.seenResults.delete(source.seenResults.values().next().value);}
  // The observer runs after the existing durable ACK and before memory reload.
  // Cumulative XP/rank XP deltas measure awarded XP, including party members,
  // without recalculating rewards or looking at speculative damage previews.
  for(const p of result.players??[]){const row=this.entry(p.id);if(!row?.metrics||!this.enabled(row)||this.exempt(p.id,row))continue;const old=c.view.player(p.id);if(!old)continue;const xp=Math.max(0,Number(p.xp??0)-Number(old.xp??0))+Math.max(0,Number(p.rank_xp??0)-Number(old.rank_xp??0));row.metrics.committed({xp},now);}
  for(const entry of result.batchResultsR57??[])this.committed(entry.actor,{result:entry.result},{...command,operation:'attack',operationId:String(key)+':batch:'+entry.actor+':'+entry.sequence});
  const row=this.entry(actor);if(!row?.metrics||!this.enabled(row)||this.exempt(actor,row)||!(kind==='attack'||kind==='pvp_attack'))return;
  const hits=kind==='pvp_attack'?(body.monsterHits??[]):(body.hits??[]);let kills=0;
  for(const hit of hits){const m=c.view.monster(hit.id);if(hit.killed&&m&&!m.is_boss&&!m.is_stone)kills++;}
  if(kills)row.metrics.committed({kills},now);
  if(body.pvpHits?.length||body.monsterHits?.length)row.recentCombatUntil=Math.max(row.recentCombatUntil,now+30000);
 }
 async request(id,op,extra={}){
  const row=this.entry(id),identity=this.identity(id);if(!row||!identity)return unavailable();
  const response=await this.runtime.request('afk_check',{op,actor:id,account:identity.account,epoch:identity.epoch,session:identity.session,...extra});
  if(this.entry(id)===row&&this.identity(id)?.epoch===identity.epoch){const state=response?.body?.afkCheck??response?.afkCheck??response?.state;if(state)this.apply(id,state);}
  return response??unavailable();
 }
 background(id,op,extra){
  const row=this.entry(id);if(!row||row.pending)return;
  row.lastRequestAt=this.runtime.clock();const task=this.request(id,op,extra).catch(()=>unavailable());row.pending=task;
  void task.then(response=>{if(op==='summary'&&response.status<400)row.summary=null;if(op==='context'&&response.status>=400)row.contextKey=null;}).finally(()=>{if(row.pending===task)row.pending=null;});
 }
 action(context){
  const {id,input,kernel}=context;if(!AFK_ACTIONS.includes(input?.action))return null;
  const row=this.entry(id);if(!row||!this.enabled(row)||this.exempt(id,row))return {type:'action',status:200,body:{ok:true,afkCheck:{enabled:false,exempt:this.exempt(id,row),locked:false,challenge:null}}};
  // Only this actor's accepted-input barrier is used. There is no shared
  // terminal, player/monster lease, checkpoint, or game-state writer here.
  kernel.durableGroup([id],async()=>{
   try{return await this.request(id,input.action==='afk_answer'?'answer':'recover',{...(input.action==='afk_answer'?{nonce:input.nonce,choice:input.choice}:{}),eligible:this.eligible(id),exempt:this.exempt(id)});}catch{return unavailable();}
  },{replyTo:id,emitReceipt:false,ackResult:value=>({type:'action',...value})});
  return {type:'action'};
 }
 tick(now=this.runtime.clock()){
  if(now<this.nextTick)return;this.nextTick=now+1000;
  for(const [id,row]of this.entries){
   if(!this.enabled(row)){row.metrics=null;continue;}
   const actor=this.runtime.channel.kernel.players.get(id);if(!actor||actor.passive||actor.suspended||actor.quiescer||actor.externalHold)continue;
   const exempt=this.exempt(id,row),eligible=!exempt&&this.eligible(id,row,now),contextKey=Number(eligible)+':'+Number(exempt)+':'+Number(this.roomR97(id));
   if(row.contextKey!==contextKey&&!row.pending){row.contextKey=contextKey;this.background(id,'context',{eligible,exempt});continue;}
   if(exempt){row.metrics=null;continue;}
   if(row.needsState){if(!row.pending&&now-row.lastRequestAt>=1000)this.background(id,'state');continue;}
   if(row.state.blockedUntil){if(Number(row.state.blockedUntil)<=now&&!row.pending&&now-row.lastRequestAt>=1000)this.background(id,'state');continue;}
   if(row.state.challenge&&Number(row.state.challenge.deadline)<=now){if(!row.pending&&now-row.lastRequestAt>=1000)this.background(id,'state');continue;}
   const metrics=row.metrics;
   if(!row.summary&&metrics?.due(now)){const summary=metrics.summary(now,this.settings),p=this.player(id);row.summary={...summary,channel:p.channel,map:p.area,resetRevision:row.state.resetRevision??0};}
   if(row.summary&&!row.pending&&now-row.lastRequestAt>=1000){this.background(id,'summary',{summary:row.summary});continue;}
   if(row.state.locked&&!row.state.pending&&!row.state.force||row.state.challenge||row.pending)continue;
   let reason=row.state.force||row.state.pending?'admin':row.triggerReason;
   if(!reason&&metrics?.active(now)){
    const continuousMs=metrics.continuous(now),threshold=Math.max(60000,Number(this.settings.continuousMinutes)*60000+metrics.jitterMs);
    if(continuousMs>=threshold)reason='continuous';
    else if(continuousMs>=Number(this.settings.minFarmMinutes)*60000&&metrics.snapshot(now,this.settings).score>=Number(this.settings.scoreThreshold))reason='score';
   }
   if(reason)row.triggerReason=reason;
   if(reason&&eligible&&now-row.lastRequestAt>=1000)this.background(id,'issue',{reason,eligible:true,exempt:false});
  }
 }
 inspect(actors=null){
  const now=this.runtime.clock(),selected=Array.isArray(actors)?new Set(actors.slice(0,200)):null,rows=[];
  for(const [actor,row]of this.entries){if(selected&&!selected.has(actor))continue;const p=this.player(actor),identity=this.identity(actor);if(!p||!identity)continue;const snapshot=row.metrics?.snapshot(now,this.settings);rows.push({actor,epoch:identity.epoch,resetRevision:row.state.resetRevision??0,score:snapshot?.score??0,reasons:snapshot?.reasons??[],continuousMs:snapshot?.continuousMs??0,channel:p.channel,map:p.area,enabled:this.enabled(row),exempt:this.exempt(actor,row),locked:Boolean(row.state.locked||row.state.challenge&&row.state.challenge.deadline<=now),online:this.runtime.connections?Boolean(this.runtime.connections.identity(actor)):!this.runtime.channel.kernel.players.get(actor)?.passive,cv:snapshot?.cv??null,radius:snapshot?.radius??0,killsPerHour:snapshot?.killsPerHour??0,inputsPerMinute:snapshot?.inputsPerMinute??0});}
  return rows;
 }
 event(args){
  const event=args.find(value=>value&&typeof value==='object'&&(value.type==='pvp_result'||value.type==='monster_result'));if(!event)return;
  const now=this.runtime.clock();
  // Only successful native combat events defer a check. Invalid/distant PvP
  // or boss input spam must not grant an unlimited exemption to a farmer.
  if(event.type==='pvp_result'){for(const id of [event.attackerId,event.targetId]){const row=this.entry(id);if(row)row.recentCombatUntil=Math.max(row.recentCombatUntil,now+30000);}}
  else if(event.hits?.some(hit=>{const m=this.runtime.channel.view.monster(hit.id);return (hit.damage>0||hit.killed)&&m&&(m.is_boss||m.is_stone);})){const row=this.entry(event.attackerId);if(row)row.recentCombatUntil=Math.max(row.recentCombatUntil,now+5000);}
 }
 project(id){
  const row=this.entry(id);if(!row)return null;const inRoom=this.roomR97(id);if(row.projectedRoomR97!==inRoom){row.projectedRoomR97=inRoom;row.version++;}if(row.sent===row.version)return null;row.sent=row.version;
  const state=row.state,now=this.runtime.clock(),blockedUntil=this.blocked(id,row)?Number(state.blockedUntil)||0:0;return {revision:state.revision??0,resetRevision:state.resetRevision??0,settingsRevision:this.settings.revision??0,enabled:this.enabled(row)&&!this.exempt(id,row),locked:Boolean(state.locked),blocked:this.blocked(id,row),blockedUntil,blockedRemainingSeconds:Math.max(0,Math.ceil((blockedUntil-now)/1000)),challenge:inRoom?null:state.challenge??null,pending:Boolean(state.pending),serverTime:now};
 }
}
