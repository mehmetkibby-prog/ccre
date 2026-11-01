import {rewardClaimCandidateR50,rewardClaimEnabledR50,claimRewardsR50,cancelRewardClaimsR50} from './reward-claim-client-r50.mjs';
import {readR46ClientOptions} from './r46-client.mjs';
import {applyWorldDelta} from '../../../native510-bb3a6cc689c6/lib/world-push.mjs';
import {NATIVE_ACTIONS} from './generated/action-names.mjs';
import {readR40Options} from './r40-client.mjs';
export const CLIENT_PROTOCOL='coreoflife-kernel-v1';
const QUEUED_MOVEMENT='queued-movement-v1',ORDERED_MOVEMENT='ordered-movement-v2',MOTION='validated-motion-v1',BOT_CHALLENGE='bot-challenge-v1';
const mayPipelineMovement=payload=>payload?.action==='attack'&&Number(payload.ability??0)===0||['claim_rewards','collect','use_potion'].includes(payload?.action);
const hot=new Set([...NATIVE_ACTIONS,'move','attack','pvp_attack','cast_support456','heartbeat','afk_answer','afk_recover']);
const response=(body,status=200,headers={})=>Response.json(body,{status,headers:{'cache-control':'no-store',...headers}});
const failure=(code,status=503)=>Object.assign(Error(code),{code,status});
const botFailure=()=>Object.assign(failure('bot_check_required',403),{body:{code:'bot_check_required',error:'Devam etmek için bot doğrulamasını tamamla.',not_executed:true}});

import {OwnPrediction,BufferedInterpolation} from './movement-prediction.mjs';
import {RemoteMovement} from './remote-movement.mjs';
export {BufferedInterpolation as PositionInterpolation};

export class Core511Transport {
 constructor({fetch,WebSocket,origin,headers,now=()=>performance.now(),notify=()=>{}}){Object.assign(this,{fetch,WebSocket,origin,headers,now,notify});this.entrySelected=false;this.listeners=new Set();this.interpolation=new RemoteMovement();this.motionStreamId=null;this.motionLast=null;this.motionStopped=true;this.prediction=new OwnPrediction();this.queue=[];this.active=null;this.ws=null;this.epoch=null;this.lastAccepted=0;this.connection=0;this.world=null;this.dungeon=null;this.cursor=null;this.seen=new Set();this.ackIds=new Set();this.ackPending=null;this.disposed=false;this.halted=false;this.haltFailure=null;this.botRequired=false;this.botChallenges=false;this.botRevision=0;this.retry=0;this.movementBehind=null;this.queuedMovement=false;this.orderedMovement=false;}
 emit(kind,value){if(this.disposed)return;if(kind==='event')this.receiveMovementEvent(value);this.notify(kind,value);for(const f of this.listeners)f(kind,value);}
 // Viewport metadata only; normal movement, ACKs and prediction are untouched.
 motionViewport({area,width,height}){
  if(!this.ready||!this.motionStreamId||this.ws?.readyState!==1||this.world?.area!==area||![width,height].every(n=>Number.isFinite(n)&&n>0&&n<=1000000))return false;
  const old=this.sentViewport,streamId=this.motionStreamId;
  if(old?.streamId===streamId&&old.area===area&&old.width>=width&&old.height>=height)return false;
  const value={type:'motion_viewport',streamId,area,width:Math.max(old?.streamId===streamId?old.width:0,width),height:Math.max(old?.streamId===streamId?old.height:0,height)};
  this.ws.send(JSON.stringify(value));this.sentViewport=value;return true;
 }
 subscribe(listener){this.listeners.add(listener);if(this.world)listener('world',this.view());if(this.dungeon)listener('dungeon',this.dungeon);listener('status',this.ready?'online':'connecting');return()=>this.listeners.delete(listener);}
 view(){return this.world?{...this.world,worldPush:{enabled:false,revision:0}}:null;}
 // Preserve the server's actual session decision. A bot challenge is not an
 // expired game instance and must remain visible until verification succeeds.
 assertAvailable(){
  if(this.disposed)throw failure('transport_disposed',503);
  if(this.halted){const saved=this.haltFailure;if(saved)throw Object.assign(failure(saved.code,saved.status),{body:structuredClone(saved.body)});throw failure('session_unavailable',503);}
 }
 async endpoint(name,body={}){
  if(this.disposed)throw failure('transport_disposed',503);
  if(this.endpointRetryUntil>this.now()&&this.endpointFailure){const saved=this.endpointFailure;throw Object.assign(failure(saved.code,saved.status),{body:structuredClone(saved.body)});}
  const r=await this.fetch(this.origin+'/api/realtime/core511-'+name,{method:'POST',credentials:'same-origin',headers:this.headers(),body:JSON.stringify({...body,protocol:CLIENT_PROTOCOL})}),value=await r.json();
  // A late response from a replaced transport cannot end the new game session.
  if(this.disposed)throw failure('transport_disposed',503);
  if(!r.ok){
   const error=Object.assign(failure(value.code??'core511_unavailable',r.status),{body:value});
   // World refresh, UI polling and reconnect all share this deadline. A
   // temporary failure must not turn one reconnect into dozens of tickets.
   if(r.status===429||r.status===503){
    const seconds=Number(r.headers.get('retry-after')??value.retryAfter??1),delay=Math.min(120,Math.max(1,Number.isFinite(seconds)?seconds:1));
    this.endpointRetryUntil=this.now()+delay*1000;this.endpointFailure={code:error.code,status:error.status,body:structuredClone(value)};
   }
   if(r.status===401||value.code==='game_instance_expired'||value.code==='bot_check_required'){
    this.halted=true;this.blockedReason=value.code;this.haltFailure={code:error.code,status:error.status,body:structuredClone(value)};
    this.rejectActive('command_outcome_unknown');this.rejectQueue('session_unavailable');this.ws?.close(1000,'Session unavailable');
   }
   this.emit('error',{status:r.status,...value});throw error;
  }
  if(value.protocol!==CLIENT_PROTOCOL||![1,2,3,4].includes(value.channel)||!/^\/game\/channel\/[1-4]$/.test(value.url)||value.url!=='/game/channel/'+value.channel)throw failure('core511_protocol_required',428);this.endpointRetryUntil=0;this.endpointFailure=null;return value;
 }
 async ensure(replacementInternal=false){if(!replacementInternal)while(this.replacing)await this.replacing;this.assertAvailable();if(this.ready)return;if(this.connecting)return this.connecting;const task=(async()=>this.open(await this.endpoint('ticket')))();this.connecting=task;try{await task;}finally{if(this.connecting===task)this.connecting=null;}}
 async open(ticket){
  this.assertAvailable();this.resetMovement();this.botRequired=false;this.botChallenges=false;this.botRevision=0;this.motionStreamId=null;this.queuedMovement=false;this.orderedMovement=false;for(const row of this.pendingInputs())clearTimeout(row.retryTimer);clearTimeout(this.reconnectTimer);if(readR40Options().reconnectRecovery)this.reconnectTimer=null;const generation=++this.connection,old=this.ws;this.ready=false;this.cursor=null;this.world=null;this.dungeon=null;this.afkCheck=undefined;this.interpolation.clear();this.ackIds.clear();this.ackPending=null;
  const url=new URL(ticket.url,this.origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';const socket=new this.WebSocket(url.href);this.ws=socket;this.playerId=ticket.playerId??this.playerId;old?.close(1000,'Connection replaced');
  return new Promise((resolve,reject)=>{
   let completed=false;const timer=setTimeout(()=>{reject(failure('connection_timeout'));socket.close();},10000),current=()=>!this.disposed&&this.connection===generation&&this.ws===socket;
   socket.addEventListener('open',()=>{if(current())socket.send(JSON.stringify({type:'auth',ticket:ticket.ticket,capabilities:[QUEUED_MOVEMENT,ORDERED_MOVEMENT,MOTION,BOT_CHALLENGE]}));else socket.close();});
   socket.addEventListener('message',event=>{if(!current())return;try{const p=JSON.parse(typeof event.data==='string'?event.data:event.data.toString());
    if(p.type==='ready'){
     if(p.protocol!==CLIENT_PROTOCOL||p.channel!==ticket.channel||p.epoch!==ticket.epoch||!Number.isSafeInteger(p.lastAccepted)||!Number.isSafeInteger(p.lastApplied))throw failure('ready_protocol');
     if(this.epoch!==null&&this.epoch!==p.epoch){this.rejectActive('command_outcome_unknown');this.rejectQueue('owner_changed');}
     this.epoch=p.epoch;this.lastAccepted=p.lastAccepted;this.botChallenges=Array.isArray(p.capabilities)&&p.capabilities.includes(BOT_CHALLENGE);this.queuedMovement=Array.isArray(p.capabilities)&&p.capabilities.includes(QUEUED_MOVEMENT);this.orderedMovement=this.queuedMovement&&p.capabilities.includes(ORDERED_MOVEMENT);this.motionStreamId=p.capabilities?.includes(MOTION)&&typeof p.motionStreamId==='string'&&/^[A-Za-z0-9-]{16,80}$/.test(p.motionStreamId)?p.motionStreamId:null;this.ready=true;this.retry=0;clearTimeout(timer);completed=true;resolve();
     // Replay can contain either slot in either order. Never schedule new input
     // until both saved receipts and the server's enqueue watermark are known.
     for(const result of p.results??[])this.result(result,false);
     for(const row of this.pendingInputs()){
      if(row.sequence<=p.lastApplied)this.rejectInput(row,'command_outcome_unknown');
      else if(row.sequence>p.lastAccepted&&row.movement)this.rejectInput(row,'movement_cancelled');
      else if(row.sequence>p.lastAccepted&&row.dependsOn>p.lastAccepted)this.requeueUnaccepted(row);
      else {row.queued=row.sequence<=p.lastAccepted;if(!row.queued)delete row.dependsOn;}
     }
     for(const row of this.pendingInputs())if(!row.movement&&row.sequence>p.lastAccepted)this.sendInput(row);
     this.emit('status','online');this.pump();return;
    }
    if(!this.ready)return;
    if(p.type==='bot_check'){this.receiveBotCheck(p);return;}
    if(p.type==='queued'){
     if(!this.queuedMovement||p.protocol!==CLIENT_PROTOCOL||p.epoch!==this.epoch||p.accepted!==true||p.durable!==false||!Number.isSafeInteger(p.sequence))throw failure('queued_protocol');
     const row=this.pendingInput(p.sequence);if(!row)return;
     if(p.kind!==(row.movement?'movement':'combat'))throw failure('queued_kind');
     // This is enqueue acceptance only, not a gameplay/disk ACK. It grants
     // one movement slot; the action promise and prediction remain pending.
     row.queued=true;clearTimeout(row.retryTimer);if(row.dependentNotQueued){row.pipelineUsed=false;delete row.dependentNotQueued;}this.pump();
    }else if(p.type==='not_queued'){
     // One dependent complementary input may follow movement or eligible combat.
     // If its parent was not admitted, the server explicitly discards the
     // dependent input without consuming sequence or settling its promise.
     if(!this.orderedMovement||p.protocol!==CLIENT_PROTOCOL||p.epoch!==this.epoch||p.durable!==false||p.code!=='dependency_not_queued')throw failure('dependency_protocol');
     const row=this.pendingInput(p.sequence);if(!row)return;
     if(row.dependsOn!==p.dependsOn||row.queued)throw failure('dependency_identity');
     // A rejected dependent frees the secondary slot, but wait for the
     // parent's admission receipt before granting a replacement slot.
     const parent=this.pendingInput(p.dependsOn);if(parent)parent.dependentNotQueued=true;
     if(row.movement){this.removeInput(row);this.prediction.notQueued(row.sequence);}else this.requeueUnaccepted(row);this.pump();
    }else if(p.type==='frame'){
     if(p.protocol!==CLIENT_PROTOCOL)throw failure('frame_protocol');for(const r of p.results??[])this.predictionResult(r);if(this.world)this.interpolation.acceptMotions(p.motions,this.now());if(Object.hasOwn(p,'afkCheck'))this.receiveAfkCheck(p.afkCheck,!p.world);if(p.world)this.receiveWorld(p.world);if(p.dungeon){this.dungeon=p.dungeon;this.emit('dungeon',p.dungeon);}if(p.adventure){if(this.world)this.world={...this.world,adventure511:p.adventure};this.emit('adventure',p.adventure);this.emit('world',this.view());}if(p.castle){if(this.world)this.world={...this.world,castleR59:p.castle};this.emit('world',this.view());}for(const e of p.events??[])this.emit('event',e);for(const result of p.results??[])this.result(result,false);this.pump();
    }else if(p.type==='event'){
     if(typeof p.id!=='string'||!/^[a-f0-9]{64}$/.test(p.id))throw failure('event_identity');if(!this.seen.has(p.id)){this.seen.add(p.id);if(this.seen.size>2048)this.seen.delete(this.seen.values().next().value);if(p.payload?.event)this.emit('event',p.payload.event);}if(!this.ackPending?.includes(p.id))this.ackIds.add(p.id);this.acknowledge();
    }else if(p.type==='event_acked'){if(this.ackPending&&JSON.stringify(p.ids)===JSON.stringify(this.ackPending)){this.ackPending=null;this.acknowledge();}}
    else if(p.type==='gm_visibility')this.emit('event',p);
    else if(p.type==='retry'){this.retryInput(p);}
    else if(p.type==='rejected'){
     const row=this.pendingInput(p.sequence);if(!row)return;
     // Rate rejection did not enqueue the sequence. Do not advance the server
     // watermark, and never discard a different accepted primary command.
     this.prediction.acknowledge(row.sequence,429,{},this.now());this.removeInput(row);row.resolve({status:429,body:{code:p.code,error:'İstek sınırı; biraz bekle.',retryAfter:p.retryAfter},headers:{'retry-after':String(p.retryAfter??1)}});this.pump();
    }
   }catch(error){this.emit('error',{code:error.code??'invalid_server_message'});socket.close(4002,'Protocol mismatch');}});
   socket.addEventListener('error',()=>socket.close());socket.addEventListener('close',()=>{clearTimeout(timer);if(!completed)reject(failure('connection_closed'));if(!current())return;this.ready=false;this.resetMovement();this.ackPending=null;this.emit('status','connecting');this.scheduleReconnect();});
  });
 }
 receiveBotCheck(packet){
  if(!this.botChallenges||packet.protocol!==CLIENT_PROTOCOL||packet.epoch!==this.epoch||typeof packet.required!=='boolean'||!Number.isSafeInteger(packet.revision)||packet.revision<1)throw failure('bot_challenge_protocol');
  if(packet.revision<this.botRevision)return;
  this.botRevision=packet.revision;const changed=this.botRequired!==packet.required;this.botRequired=packet.required;
  if(packet.rejectedSequence!==undefined){
   if(!packet.required||packet.notExecuted!==true||!Number.isSafeInteger(packet.rejectedSequence))throw failure('bot_challenge_rejection');
   const row=this.pendingInput(packet.rejectedSequence);
   if(row){if(row.queued)throw failure('bot_challenge_accepted_input');this.removeInput(row);row.resolve({status:403,body:{code:'bot_check_required',error:'Devam etmek için bot doğrulamasını tamamla.',not_executed:true}});}
  }
  if(packet.required){
   this.resetMovement();for(const row of this.pendingInputs())clearTimeout(row.retryTimer);
   for(const row of this.queue.splice(0))row.reject(botFailure());
   if(changed)this.emit('error',{status:403,code:'bot_check_required',error:'Devam etmek için bot doğrulamasını tamamla.'});
  }else{for(const row of this.pendingInputs())if(!row.queued)this.sendInput(row);this.pump();}
 }
 // Verification is independent of world deltas and never changes input ordering.
 receiveAfkCheck(value,publish=true){this.afkCheck=value;if(this.world){this.world={...this.world,afkCheck:value};if(publish)this.emit('world',this.view());}}
 scheduleReconnect(){if(this.disposed||this.halted||this.reconnectTimer)return;this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null;this.ensure().catch(()=>this.scheduleReconnect());},Math.max(Math.min(4000,250*2**this.retry++),(this.endpointRetryUntil??0)-this.now()));}
 receiveWorld(packet){
  const oldCastle=this.world?.castleR59,oldAdventure=this.world?.adventure511,before=this.world&&JSON.stringify([this.world.world?.cycle,this.world.channel,this.world.area,this.world.arenaMatch?.id]);
  if(packet.type==='world_snapshot'){const c=packet.data?.worldPush;if(c?.protocol!=='world-delta-v1'||!Number.isSafeInteger(c.seq))throw failure('snapshot_protocol');this.cursor={epoch:c.epoch,room:c.room,seq:c.seq};this.world=packet.data;}
  else if(packet.type==='world_delta'){const c=this.cursor;if(c&&packet.epoch===c.epoch&&packet.room===c.room&&packet.seq<=c.seq)return;if(!c||packet.protocol!=='world-delta-v1'||packet.epoch!==c.epoch||packet.room!==c.room||packet.seq!==c.seq+1)throw failure('world_sequence_gap');this.world=applyWorldDelta(this.world,packet);c.seq=packet.seq;}
  else if(packet.type==='world_reset'){this.resetMovement();this.ws?.close(4012,'World changed');return;}else throw failure('world_packet');
  const after=JSON.stringify([this.world.world?.cycle,this.world.channel,this.world.area,this.world.arenaMatch?.id]);if(before!==after)this.resetMovement();else if(oldAdventure)this.world={...this.world,adventure511:oldAdventure};if(oldCastle&&before===after)this.world={...this.world,castleR59:oldCastle};this.interpolation.ownId=this.playerId;this.interpolation.accept(this.world,this.now());const own=this.world.players?.find(p=>p.id===this.playerId);if(own)this.prediction.bind(own,this.movementScope(own),this.now());if(this.afkCheck!==undefined)this.world={...this.world,afkCheck:this.afkCheck};this.emit('world',this.view());
 }
 acknowledge(){if(!this.ready||this.ws?.readyState!==1||this.ackPending||!this.ackIds.size)return;this.ackPending=[...this.ackIds].slice(0,64);for(const id of this.ackPending)this.ackIds.delete(id);this.ws.send(JSON.stringify({type:'event_ack',ids:this.ackPending}));}
 // movementBehind is the single secondary slot; v2 also permits eligible
 // combat behind movement. It never permits a third outstanding input.
 pendingInputs(){return [this.active,this.movementBehind].filter(Boolean);}
 pendingInput(sequence){return this.active?.sequence===sequence?this.active:this.movementBehind?.sequence===sequence?this.movementBehind:null;}
 removeInput(row){
  clearTimeout(row.retryTimer);
  if(row===this.active){this.active=this.movementBehind;this.movementBehind=null;}
  else if(row===this.movementBehind)this.movementBehind=null;
 }
 result(result,scheduleNext=true){
  this.predictionResult(result);const row=this.pendingInput(result.sequence);if(!row)return;
  this.lastAccepted=Math.max(this.lastAccepted,result.sequence);this.removeInput(row);
  const {type,sequence,status,body,headers,...value}=result;const payload=body??value;if(payload?.afkCheck)this.receiveAfkCheck(payload.afkCheck);row.resolve({status:status??(payload.ok===false?409:200),body:payload,headers});if(scheduleNext)this.pump();
 }
 requeueUnaccepted(row){this.removeInput(row);delete row.sequence;delete row.dependsOn;delete row.queued;delete row.pipelineUsed;this.queue.unshift(row);}
 rejectInput(row,code){this.removeInput(row);row.reject(failure(code,409));}
 rejectActive(code){this.prediction.cancel(this.now());for(const row of this.pendingInputs())this.rejectInput(row,code);clearTimeout(this.inputTimer);}
 rejectQueue(code){for(const row of this.queue.splice(0))row.reject(failure(code,409));}
 sendInput(row){if(!row||row.queued||this.botRequired||!this.ready||this.ws?.readyState!==1)return;if(this.ws.bufferedAmount<262144){row.lastAttemptAt=this.now();this.ws.send(JSON.stringify({type:'input',sequence:row.sequence,payload:row.payload,...row.dependsOn!==undefined?{dependsOn:row.dependsOn}:{}}));}else this.ws.close(4013,'Connection backlog');}
 sendActive(){this.sendInput(this.active);}
 retryInput(packet){
  const row=this.pendingInput(packet.sequence);if(!row)return;clearTimeout(row.retryTimer);
  // Retry means this exact sequence was not accepted. A receipt/result for a
  // different slot cannot cancel its timer or resend the primary command.
  if(row.queued)return;
  // A dependency was validated on its first wire admission attempt; retries
  // use the normal exact sequence check, never an old socket predecessor.
  delete row.dependsOn;
  if(row.movement){
   const at=this.now(),busy=packet.code==='actor_draining'||packet.code==='input_backpressure';row.retrySince??=at;row.retryCount=(row.retryCount??0)+1;
   // These explicit replies mean this sequence was not enqueued. Poll the
   // same immutable input like combat instead of spending another movement
   // interval waiting after a brief drain. New commands remain 200 ms apart;
   // prediction, accepted-input replay rules and the 2 s deadline stay bounded.
   if(this.movementSuspended||!this.prediction.flight||row.retryCount>=(busy?40:10)||at-row.retrySince>=2000){this.rejectInput(row,'movement_cancelled');this.pump();}
   else row.retryTimer=setTimeout(()=>{
    if(this.pendingInput(row.sequence)!==row)return;
    if(this.movementSuspended||!this.prediction.flight||this.now()-row.retrySince>=2000){this.rejectInput(row,'movement_cancelled');this.pump();return;}
    if(this.ready&&this.ws?.readyState===1)this.sendInput(row);
   },busy?50:Math.max(0,200-(at-(row.lastAttemptAt??this.lastMove??at))));
  }else row.retryTimer=setTimeout(()=>{if(this.pendingInput(row.sequence)===row)this.sendInput(row);},50);
 }
 pump(){
  if(!this.ready||this.botRequired)return;
  // Negotiated ordered admission (or a legacy enqueue receipt) permits only
  // one movement beside an eligible command. No second combat/economy command can pass either occupied slot.
  if(this.active){
   // v2 can alternate one movement and one eligible command. Only wire
   // admission overlaps; FixedLoop still applies them in sequence and retains
   // every durable barrier. Terminal/economy/skill transitions never pipeline.
   if(this.orderedMovement&&this.active.movement&&(this.active.dependsOn===undefined||this.active.queued)&&!this.active.pipelineUsed&&!this.movementBehind&&mayPipelineMovement(this.queue[0]?.payload)){
    const primary=this.active,row=this.queue.shift();row.sequence=primary.sequence+1;if(!primary.queued)row.dependsOn=primary.sequence;
    primary.pipelineUsed=true;this.movementBehind=row;this.lastScheduledKind='command';this.sendInput(row);return;
   }
   const batch=this.prediction.batch();if(batch)this.sendMovement(batch.payload,this.now(),batch);return;
  }
  if(this.movementBehind)return;
  // An ACK may free already-predicted movement between animation frames.
  // Reuse that batch immediately when its original 200 ms slot is due;
  // this neither advances prediction nor bypasses admission or queue fairness.
  if(!this.queue.length){const batch=this.prediction.batch();if(batch)this.sendMovement(batch.payload,this.now(),batch);return;}
  // Legacy servers retain the one-input, fair movement/command scheduler.
  const at=this.now(),pair=this.orderedMovement&&mayPipelineMovement(this.queue[0]?.payload),batch=this.lastScheduledKind==='movement'&&!pair?null:this.prediction.batch();
  if(batch&&this.sendMovement(batch.payload,at,batch,true))return;
  this.active=this.queue.shift();this.active.sequence=this.lastAccepted+1;this.lastScheduledKind='command';this.sendActive();
 }
 assertCommandScope(){if(this.replacing)throw Object.assign(failure('channel_transition_pending',409),{body:{code:'channel_transition_pending',error:'Kanal değişimi sürüyor. Tamamlanınca tekrar dene.'}});}
 async command(payload){this.assertCommandScope();await this.ensure();this.assertCommandScope();return this.enqueue(payload);}
 enqueue(payload){this.assertAvailable();if(this.botRequired)throw botFailure();if(this.queue.length>=32)throw failure('input_backpressure',429);return new Promise((resolve,reject)=>{this.queue.push({payload:structuredClone(payload),resolve,reject});this.pump();});}
 async image(replacementInternal=false){await this.ensure(replacementInternal);if(this.world)return this.view();return new Promise((resolve,reject)=>{const off=this.subscribe((type,value)=>{if(type==='world'){clearTimeout(timer);off();resolve(value);}}),timer=setTimeout(()=>{off();reject(failure('snapshot_timeout'));},5000);});}
 movementScope(own){return JSON.stringify([own.id,this.epoch,this.world?.world?.cycle,this.world?.channel,own.area,own.respawn_at_ms,this.world?.arenaMatch?.id]);}
 predictionResult(result){const row=this.pendingInput(result.sequence);if(!row?.movement)return;const payload=result.body??result.data??result;this.prediction.acknowledge(result.sequence,result.status??200,payload.data??payload,this.now());}
 receiveMovementEvent(event){
  const at=this.now();this.interpolation.control(event,at);
  if(event?.type!=='guardian_control'||event.area!==this.world?.area||event.channel!==this.world?.channel)return;
  const row=event.actorId===this.playerId?event.moved:event.targetKind==='player'&&event.targetId===this.playerId?event.controlled:null;
  if(row&&Number.isFinite(row.x)&&Number.isFinite(row.y)&&Number.isSafeInteger(row.position_revision)&&row.position_revision>(this.prediction.authority?.revision??-1)){
   this.prediction.snap({...row,area:event.area},at);this.motionLast=null;this.motionStopped=true;
  }
 }
 previewMotion(own,at,stopped=false,frameAt=at){
  if(!this.motionStreamId||!this.ready||this.ws?.readyState!==1||this.disposed||this.halted||this.botRequired||this.movementSuspended||own.hp<=0||!this.prediction.predicted)return false;
  const point=this.prediction.predicted,last=this.motionLast,due=last?.nextAt??at;
  const changed=!last||Math.hypot(point.x-last.x,point.y-last.y)>1e-7,final=stopped&&!this.motionStopped;
  if(!changed&&!final||!final&&last&&at<due||stopped&&!last)return false;
  const sentAt=(last?.sentAt??[]).filter(time=>at-time<1000);
  // Reserve one slot for the final stop, including irregular render timing.
  if(sentAt.length>=(final?21:20))return false;
  const endpoint=this.prediction.pending.at(-1);
  let sequence=endpoint?.motionSequence;
  if(final||!Number.isSafeInteger(sequence)||sequence<=(last?.sequence??0)){sequence=++this.prediction.motionSerial;if(endpoint)endpoint.motionSequence=sequence;}
  // This packet carries presentation only. The canonical command queue,
  // sequence, movement rate, collision, receipts and acknowledgements are intact.
  if(this.ws.bufferedAmount>=262144)return false;
  const world=this.world;
  const clientAt=readR46ClientOptions().frameMotionClock&&Number.isFinite(frameAt)&&frameAt>=0&&frameAt<=at&&at-frameAt<=250?frameAt:at;
  this.ws.send(JSON.stringify({type:'motion',protocol:MOTION,streamId:this.motionStreamId,sequence,x:point.x,y:point.y,hpRevision:Number(own.hp_revision??own.hpRevision??0),basePositionRevision:this.prediction.authority.revision,clientAt,stopped:!!stopped,cycle:world?.world?.cycle,channel:world?.channel,area:own.area,arenaMatchId:world?.arenaMatch?.id??''}));
  // Keep the50ms deadline independent of render rounding. After a missed
  // interval send only once and start a fresh deadline; never drain a backlog.
  // An immediate final stop consumes the following slot as well.
  const nextAt=final?Math.max(at+50,due+50):at-due>=50?at+50:due+50;
  this.motionLast={x:point.x,y:point.y,at,sequence,nextAt,sentAt:[...sentAt,at]};this.motionStopped=!!stopped;return true;
 }
 position(type,row,at=this.now()){if(type==='players'&&row.id===this.playerId){this.prediction.bind(row,this.movementScope(row),at);return this.prediction.position(at)??{x:row.x,y:row.y};}return this.interpolation.position(type,row,at);}
 predictFrame({own,seconds,frameAt},integrate){
  const at=this.now();if(!own||!this.ready||this.disposed||this.halted||this.botRequired||this.movementSuspended||at<(this.movementCooldownUntil??0)){this.prediction.cancel(at);return {x:own?.x??0,y:own?.y??0};}
  this.prediction.bind(own,this.movementScope(own),at);
  const before=this.prediction.predicted&&{...this.prediction.predicted},shown=this.prediction.advance(seconds,integrate,at);
  this.previewMotion(own,at,before&&Math.hypot(this.prediction.predicted.x-before.x,this.prediction.predicted.y-before.y)<1e-7,frameAt);
  const batch=this.prediction.batch();
  if(batch&&this.movementEligible(at))this.sendMovement(batch.payload,at,batch);
  return shown;
 }
 suspendPrediction(){const at=this.now(),own=this.world?.players.find(p=>p.id===this.playerId);this.prediction.cancel(at);if(own)this.previewMotion(own,at,true);}
 resetMovement(){this.movementIntent=null;this.prediction?.clear();this.motionLast=null;this.motionStopped=true;}
 movementEligible(at,queuedTurn=false){
  if(this.disposed||this.halted||this.botRequired||this.movementSuspended||!this.ready||this.ws?.readyState!==1||this.movementBehind||at<(this.movementCooldownUntil??0)||at-(this.lastMove??-Infinity)<200)return false;
  if(this.active)return this.queuedMovement&&!this.active.movement&&(this.active.queued===true||this.orderedMovement&&this.active.dependsOn===undefined)&&!this.active.pipelineUsed&&mayPipelineMovement(this.active.payload);
  return !this.queue.length||queuedTurn&&(this.lastScheduledKind!=='movement'||this.orderedMovement&&mayPipelineMovement(this.queue[0]?.payload));
 }
 sendMovement(payload,at,batch=null,queuedTurn=false){
  if(!this.movementEligible(at,queuedTurn)||payload?.action!=='move')return false;
  const input=structuredClone(payload),primary=this.active;
  if(this.motionStreamId&&batch&&Number.isSafeInteger(batch.motionSequence)&&batch.motionSequence>0){input.motionStreamId=this.motionStreamId;input.motionSequence=batch.motionSequence;}
  this.lastMove=at;this.lastScheduledKind='movement';
  const row={movement:true,sequence:primary?primary.sequence+1:this.lastAccepted+1,payload:input,resolve:result=>{
   const body=result.body??{},detail=body.data??body;if(batch)this.prediction.acknowledge(row.sequence,result.status??200,detail,this.now());if(result.status===429||detail.code==='rate_limited'){
    const retry=Number(result.headers?.['retry-after']??detail.retryAfter??body.retryAfter??1);this.movementCooldownUntil=this.now()+Math.max(1000,Number.isFinite(retry)?retry*1000:1000);this.resetMovement();
   }
  },reject:error=>{this.resetMovement();if(error.code!=='movement_cancelled')this.emit('error',{code:error.code});}};
  if(primary){if(this.orderedMovement&&!primary.queued)row.dependsOn=primary.sequence;primary.pipelineUsed=true;this.movementBehind=row;}else this.active=row;
  if(batch)this.prediction.sent(row.sequence,batch);if(primary)this.sendInput(row);else this.sendActive();this.pump();return true;
 }
 // Accumulate held-input time, never predicted coordinates. The builder sees
 // the latest server position only when the single command slot is available.
 moveFrame({x=0,y=0,scope=null}={},buildPayload){
  const at=this.now(),length=Math.hypot(x,y);if(!Number.isFinite(length)||length<=0||this.disposed||this.halted||this.botRequired||this.movementSuspended||!this.ready||this.ws?.readyState!==1||at<(this.movementCooldownUntil??0)){this.resetMovement();return false;}
  const key=JSON.stringify(scope),old=this.movementIntent,direction={x:x/length,y:y/length},gap=old?at-old.at:0;
  const reset=!old||old.scope!==key||gap<0||gap>250,delta=reset?16:Math.max(0,gap),turn=old&&(old.x*direction.x+old.y*direction.y<.85||Math.abs(old.length-length)>.35);
  const pending=Math.min(350,(reset||turn?0:old.pending)+delta);this.movementIntent={...direction,length,scope:key,at,pending};
  if(!this.movementEligible(at))return false;if(typeof buildPayload!=='function')throw TypeError('movement_payload_builder_required');
  const payload=buildPayload(pending/1000);this.movementIntent.pending=0;if(!payload)return false;return this.sendMovement(payload,at);
 }
 move(payload){return this.sendMovement(payload,this.now());}
 async castleAreaR59(area){
  if(this.world?.area===area)return;
  return new Promise((resolve,reject)=>{const off=this.subscribe((type,value)=>{if(type==='world'&&value?.area===area){clearTimeout(timer);off();resolve();}}),timer=setTimeout(()=>{off();reject(failure('castle_snapshot_timeout'));},5000);});
 }
 async replace(name,payload){
  if(name==='castle'&&payload?.action==='enter'&&this.ready&&this.world?.channel===4){this.resetMovement();const result=await this.command({action:'castle_enter_r59'});if(result.status!==200)throw Object.assign(failure(result.body?.code??'castle_enter_failed',result.status),{body:result.body});await this.castleAreaR59('guild_castle');return {...result.body,channel:4,playerId:this.playerId,epoch:this.epoch};}
  if(name==='character'||name==='transfer'){
   if(!Number.isInteger(payload?.channel)||payload.channel<1||payload.channel>4)throw Object.assign(failure('channel_selection_required',400),{body:{code:'channel_selection_required',error:'Girmek istediğin kanalı seç.'}});
   // A stale legacy auto flag must never override the clicked numeric channel.
   const {channelChoice504,...selected}=payload;payload=selected;
  }
  // Reserve the ownership transition before yielding. Fresh user commands
  // get an explicit not-submitted response, never an ambiguous old-epoch ACK.
  // Existing accepted work drains; background reconnects wait for this ticket.
  cancelRewardClaimsR50(this,'claim_owner_changed');
  const prior=this.replacing;let release;const gate=new Promise(resolve=>{release=resolve;});this.replacing=gate;this.movementSuspended=true;
  try{if(prior)await prior;this.resetMovement();if(name!=='character'||this.ready||this.connecting||this.active||this.movementBehind||this.queue.length)await this.ensureIdle(true);const ticket=await this.endpoint(name,payload);if((name==='character'||name==='transfer')&&ticket.channel!==payload.channel)throw Object.assign(failure('channel_selection_mismatch',409),{body:{code:'channel_selection_mismatch',error:'Seçtiğin kanal doğrulanamadı. Lütfen kanalını yeniden seç.'}});await this.open(ticket);await this.image(true);return ticket;}
  finally{this.resetMovement();if(this.replacing===gate){this.replacing=null;this.movementSuspended=false;}release();}
 }
 async ensureIdle(replacementInternal=false){await this.ensure(replacementInternal);if(!this.active&&!this.movementBehind&&!this.queue.length)return;await this.enqueue({action:'heartbeat'});} 
 async request(url,options,next){
  const u=new URL(url instanceof Request?url.url:url,this.origin),method=options?.method??'GET';let input;if(method==='POST')try{input=JSON.parse(options.body);}catch{}
  try{
   if(u.pathname==='/api/world'&&!u.searchParams.has('marketShop506'))return response(await this.image());
   if(u.pathname==='/api/action'&&input?.action==='join'){
    const ticket=await this.replace('character',input);this.entrySelected=true;return response({...ticket,playerId:this.playerId});
   }
   if(u.pathname==='/api/castle-r59'&&input?.action==='enter')return response(await this.replace('castle',input));
   if(u.pathname==='/api/castle-r59'&&input?.action==='leave'&&this.ready&&this.world?.channel===4){const result=await this.command({action:'castle_leave_r59'});if(result.status===200)await this.castleAreaR59('bazaar');return response(result.body,result.status);}
   if(u.pathname==='/api/action'&&input?.action==='select_channel')return response(await this.replace('transfer',{channel:input.channel}));
   if(u.pathname==='/api/action'&&input?.action==='hurt'){await this.image();const p=this.world.players.find(p=>p.id===this.playerId);return response({ignored:true,hp:p?.hp,hpRevision:p?.hp_revision,respawnAtMs:p?.respawn_at_ms,nextHitInMs:1000});}
   if(u.pathname==='/api/action'&&rewardClaimCandidateR50(input)&&await rewardClaimEnabledR50()){const r=await claimRewardsR50(this,input,{signal:options?.signal});return response(r.body,r.status,r.headers);}
   if(u.pathname==='/api/action'&&hot.has(input?.action)){const r=await this.command(input);return response(r.body,r.status,r.headers);}
   if(u.pathname==='/api/dungeon'){
    if(method==='GET'&&this.dungeon?.run)return response(this.dungeon);const command=method==='GET'?{action:'sync'}:input;if(command?.action==='stream')return response({code:'core511_protocol_required'},428);
    const r=await this.command({action:'dungeon',command});if(r.body&&Object.hasOwn(r.body,'run')){this.dungeon=r.body;this.emit('dungeon',r.body);}return response(r.body,r.status,r.headers);
   }
   const r=await next(url,options);if(u.pathname==='/api/auth/logout'&&r.ok)this.dispose();return r;
  }catch(error){return response(error.body??{code:error.code??'core511_unavailable',error:error.status===409?'İşlemin sonucu doğrulanamadı. Güncel durumu yenile.':'Bağlantı yenileniyor.'},error.status??503);}
 }
 dispose(){cancelRewardClaimsR50(this,'claim_transport_disposed');this.disposed=true;this.ready=false;this.resetMovement();clearTimeout(this.reconnectTimer);clearTimeout(this.inputTimer);this.ws?.close(1000,'Session ended');this.rejectActive('game_instance_expired');this.rejectQueue('game_instance_expired');this.listeners.clear();this.world=null;this.dungeon=null;this.interpolation.clear();}
}

let current=null;
export function browserCore(instance){
 if(!current||current.instance!==instance||current.disposed){current?.dispose();
  const headers=()=>{const cookies=document.cookie.split(';').map(x=>x.trim()),entry=cookies.find(x=>x.startsWith('__Host-yasam-csrf='))??cookies.find(x=>x.startsWith('yasam-csrf-local='));return {'content-type':'application/json','x-game-instance':instance,'x-csrf-token':entry?decodeURIComponent(entry.slice(entry.indexOf('=')+1)):''};};
  current=new Core511Transport({fetch:globalThis.fetch.bind(globalThis),WebSocket:globalThis.WebSocket,origin:location.origin,headers,notify:(kind,value)=>{if(kind!=='error')return;if(value.status===401)window.dispatchEvent(new Event('coreoflife:game-session-ended'));if(value.code==='bot_check_required')window.dispatchEvent(new Event('coreoflife:bot-check'));if(value.code==='game_instance_expired')window.dispatchEvent(new CustomEvent('coreoflife:instance-ended',{detail:value.error}));}});current.instance=instance;
 }return current;
}
export function browserRequest(url,options){
 const headers=new Headers(options?.headers),pending=browserCore(headers.get('x-game-instance')??'').request(url,options,globalThis.fetch.bind(globalThis)),signal=options?.signal;if(!signal)return pending;
 return new Promise((resolve,reject)=>{const abort=()=>reject(new DOMException('Request aborted','AbortError'));if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});pending.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});
}
// A successful presence claim may replace a previously ended transport for
// the same tab. It grants no access: the next connection still needs a fresh
// authenticated server ticket. Bot challenges keep their separate recovery.
if(typeof window!=='undefined')window.addEventListener('coreoflife:presence-claimed',event=>{
 const instance=event.detail?.instance;
 if(typeof instance!=='string'||!instance||!current||current.disposed||!current.halted||current.instance!==instance||current.blockedReason==='bot_check_required')return;
 if(current.haltFailure?.status!==401&&current.blockedReason!=='game_instance_expired')return;
 current.dispose();current=null;
});
if(typeof window!=='undefined')window.addEventListener('coreoflife:bot-verified',()=>{if(current&&!current.disposed&&current.blockedReason==='bot_check_required'){current.halted=false;current.blockedReason=null;current.haltFailure=null;void current.ensure().catch(()=>current.scheduleReconnect());}});
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)current?.resetMovement();});
