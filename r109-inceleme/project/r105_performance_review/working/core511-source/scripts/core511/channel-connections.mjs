import {isZumrutActionR93} from './zumrut-actions-r93.mjs';
import {egressPacingR531} from './r531-options.mjs';
import {r37Options} from './r37-options.mjs';
import {demand,PROTOCOL} from './contract.mjs';
import {EgressSlices} from './egress-slices.mjs';
import {randomUUID} from 'node:crypto';
import {actorFaultIsolation} from './r48-options.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
import {mailboxAckTransportFailure} from './channel-mailbox.mjs';
const reportConnectionFault=createFaultReporter(text=>process.stderr.write(text));
const senderAckErrors=new Set(['mailbox_session_changed','mailbox_unsent_ack','notification_ack_owner','owner_epoch_fenced','simulation_epoch_fenced']);
const presenceErrors=new Set(['presence_owner_fenced','session_epoch_fenced','owner_epoch_fenced','dungeon_presence_actor','bot_check_required','security_verification_required']);
const leaseErrors=new Set(['connection_lease_owner','connection_lease_expired']);
const MOVEMENT_PIPELINE='queued-movement-v1',ORDERED_MOVEMENT='ordered-movement-v2';
const MOTION='validated-motion-v1',BOT_CHALLENGE='bot-challenge-v1';
const allowsFollowingMovement=(payload,background=false)=>{
 if(payload.action==='attack'&&Number(payload.ability??0)===0||payload.action==='claim_rewards'||payload.action==='collect'||payload.action==='use_potion')return true;
 // Admission overlap only: heartbeat and a status-only dungeon sync retain
 // every original execution, ownership and durability fence in FixedLoop.
 // A new explicit capability keeps old ordered-v2 clients/servers compatible.
 if(!background||!payload||typeof payload!=='object'||Array.isArray(payload))return false;
 const keys=Object.keys(payload);
 if(payload.action==='heartbeat')return keys.length===1&&Object.hasOwn(payload,'action');
 const command=payload.command;
 return Boolean(payload.action==='dungeon'&&keys.length===2&&Object.hasOwn(payload,'action')&&Object.hasOwn(payload,'command')&&command&&typeof command==='object'&&!Array.isArray(command)&&Object.keys(command).length===1&&Object.hasOwn(command,'action')&&command.action==='sync');
};
// Trusted ingress identities live beside socket records, never in a client's
// JSON payload. A queued input retains the exact connection that accepted it.
export class MistLootConnections {
 constructor(){this.actors=new Map();this.records=new WeakMap();this.inputs=new WeakMap();}
 ready(identity,record){const token=randomUUID(),scope={actor:identity.actor,epoch:identity.epoch,token};this.records.set(record,scope);this.actors.set(identity.actor,scope);}
 capture(identity,input,record){const scope=this.records.get(record);this.inputs.set(input,scope?.actor===identity.actor&&scope.epoch===identity.epoch?scope:null);}
 connectionFor(actor,input){const scope=this.inputs.get(input);return scope&&scope.actor===actor&&this.actors.get(actor)===scope?scope.token:null;}
 delete(actor){this.actors.delete(actor);}
}
// Transport-independent session controller. The production WS adapter must
// reserve its lease through the SINGLE coordinator budget before attachment.
export class ChannelConnections {
 constructor({tickets,budget,kernel,admit,guard,rate,disconnected,presence=()=>{},ready=()=>{},captureInput=()=>{},acceptedInput=null,acknowledge=null,motion=null,challenge=()=>null,encode=JSON.stringify,clock=Date.now,onFault=()=>{}}){
  for(const [name,fn]of Object.entries({admit,guard,rate,disconnected}))demand(typeof fn==='function','connection_callback_'+name);
  demand(typeof encode==='function','connection_encoder');Object.assign(this,{tickets,budget,kernel,admit,guard,rate,disconnected,presence,ready,captureInput,acceptedInput,acknowledge,motion,challenge,encode,clock,onFault});this.sockets=new Map();this.actors=new Map();this.egress=new EgressSlices();this.pressureR531=new WeakMap();this.inputPipelines=new Map();
 }
 attach(socket,{lease,boot,origin}){
  demand(!this.sockets.has(socket),'socket_already_attached');
  const record={lease,boot,origin,identity:null,authIdentity:null,admitted:false,disconnectNotified:false,authPending:false,acks:0,alive:true,lastPong:this.clock(),closed:false};this.sockets.set(socket,record);
  const close=(code=4003,reason='Session unavailable')=>socket.close(code,reason);
  const disconnected=()=>{
   const identity=record.authIdentity;
   if(!record.admitted||!identity||record.disconnectNotified||this.actors.has(identity.actor))return;
   record.disconnectNotified=true;
   // A replacement may finish activation before this deferred notification.
   // Never retire its same-epoch presence or clear its mailbox for an old socket.
   Promise.resolve().then(()=>{if(!this.actors.has(identity.actor))return this.disconnected(identity);}).catch(error=>{if(actorFaultIsolation&&presenceErrors.has(error?.code)){reportConnectionFault({actor:identity.actor,error});return;}this.onFault(error);});
  };
  record.timer=setTimeout(()=>close(4001,'Authentication timeout'),4000);record.timer.unref?.();
  socket.on('pong',()=>{if(record.closed||record.revoked)return;record.alive=true;record.lastPong=this.clock();if(record.identity)try{if(!this.transportAllowed(record.identity)){close();return;}this.presence(record.identity);}catch(error){close();if(actorFaultIsolation&&presenceErrors.has(error?.code)){reportConnectionFault({actor:record.identity.actor,error});return;}this.onFault(error);}});
  socket.on('close',()=>{
   if(record.closed)return;record.closed=true;clearTimeout(record.timer);this.sockets.delete(socket);
   if(record.identity)this.motion?.forget(record.identity,record);
   if(record.identity&&this.actors.get(record.identity.actor)===socket)this.actors.delete(record.identity.actor);
   disconnected();
   Promise.resolve().then(()=>this.budget.release(lease,boot)).catch(error=>{if(actorFaultIsolation&&leaseErrors.has(error?.code)){reportConnectionFault({actor:record.authIdentity?.actor,error});return;}this.onFault(error);});
  });
  socket.on('error',()=>{});
  socket.on('message',(bytes,isBinary)=>{
   if(record.closed||record.revoked)return;
   try{
    demand(!isBinary&&bytes.length<=(record.identity?r37Options.ingressBytes:8192),'invalid_payload');const message=JSON.parse(bytes.toString('utf8'));
    if(!record.identity){
     demand(message?.type==='auth'&&!record.authPending,'authentication_required');record.authPending=true;
     record.botChallengeEnabled=Array.isArray(message.capabilities)&&message.capabilities.includes(BOT_CHALLENGE);
     record.orderedMovement=Array.isArray(message.capabilities)&&message.capabilities.includes(ORDERED_MOVEMENT);
     record.backgroundMovement=record.orderedMovement&&message.capabilities.includes('background-movement-v1');
     record.movementPipeline=record.orderedMovement||Array.isArray(message.capabilities)&&message.capabilities.includes(MOVEMENT_PIPELINE);
     record.motionEnabled=Boolean(this.motion&&Array.isArray(message.capabilities)&&message.capabilities.includes(MOTION));
     const identity=this.tickets.consume(message.ticket,origin);
     record.authIdentity=identity;
     Promise.resolve().then(()=>this.admit(identity)).then(async()=>{
      record.admitted=true;
      if(record.closed){disconnected();return;}await this.budget.activate(lease,boot);if(record.closed){disconnected();return;}
      demand(this.guard(identity,null)===true,'session_revoked');
      const prior=this.actors.get(identity.actor);
      record.identity=identity;this.actors.set(identity.actor,socket);clearTimeout(record.timer);
      if(prior&&prior!==socket){this.sockets.get(prior).revoked=true;prior.close(4009,'Reconnected');}
      const actor=this.kernel.players.get(identity.actor);demand(actor&&!actor.passive&&actor.epoch===identity.epoch,'actor_not_admitted');
      this.presence(identity);
      const motionStreamId=record.motionEnabled?this.motion.ready(identity,record):null,capabilities=[...(record.movementPipeline?[MOVEMENT_PIPELINE,...record.orderedMovement?[ORDERED_MOVEMENT]:[]]:[]),...(motionStreamId?[MOTION]:[]),...(record.botChallengeEnabled?[BOT_CHALLENGE]:[]),...(record.backgroundMovement?['background-movement-v1']:[])];
      socket.send(JSON.stringify({type:'ready',protocol:PROTOCOL,channel:this.kernel.state.channel,epoch:identity.epoch,lastAccepted:actor.lastAccepted,lastApplied:actor.lastApplied,results:this.kernel.replayResults?.(identity.actor)??[],...(capabilities.length?{capabilities}:{}),...(motionStreamId?{motionStreamId}:{})}));
      await this.ready(identity,record);
     }).catch(()=>close());return;
    }
    if(message?.type==='motion_viewport'){
     if(record.motionEnabled&&this.actors.get(record.identity.actor)===socket&&this.guard(record.identity,null)===true)this.motion.viewport(record.identity,message,record);return;
    }
    if(message?.type==='motion'){
     if(!record.motionEnabled||this.actors.get(record.identity.actor)!==socket)return;
     if(this.guard(record.identity,null)!==true){if(!this.transportAllowed(record.identity))close();return;}
     this.motion.receive(record.identity,message,record);return;
    }
    if(message?.type==='event_ack'){
     demand(typeof this.acknowledge==='function'&&Array.isArray(message.ids)&&message.ids.length>0&&message.ids.length<=64&&message.ids.every(id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id))&&record.acks<4,'invalid_event_ack');
     const identity=record.identity;demand(this.transportAllowed(identity),'session_revoked');record.acks++;
     Promise.resolve().then(()=>this.acknowledge(identity,message.ids)).then(()=>{if(!record.closed&&!record.revoked){const text=JSON.stringify({type:'event_acked',ids:message.ids});if(actorFaultIsolation)return this.write(socket,text,{tracked:true});socket.send(text);}}).catch(error=>{close();if(actorFaultIsolation&&(senderAckErrors.has(error?.code)||mailboxAckTransportFailure(error))){reportConnectionFault({actor:identity.actor,error});return;}this.onFault(error);}).finally(()=>record.acks--);return;
    }
    demand(message?.type==='input'&&message.payload&&typeof message.payload==='object'&&!Array.isArray(message.payload),'unknown_message');
    const identity=record.identity,kind=message.payload.action==='move'?'movement':'combat';
    if(Object.hasOwn(message,'dependsOn')){
     const parent=record.lastInput;
     demand(record.orderedMovement&&Number.isSafeInteger(message.dependsOn)&&message.sequence===message.dependsOn+1&&parent?.sequence===message.dependsOn&&(kind==='movement'&&parent.followMovement||kind==='combat'&&parent.kind==='movement'&&allowsFollowingMovement(message.payload,record.backgroundMovement)),'invalid_input_dependency');
     if(!parent.accepted){socket.send(JSON.stringify({type:'not_queued',protocol:PROTOCOL,epoch:identity.epoch,sequence:message.sequence,dependsOn:message.dependsOn,code:'dependency_not_queued',durable:false}));return;}
    }
    // Store only one prior wire input. It is a dependency admission decision,
    // never an execution/durability result, and cannot cross a reconnect.
    const input={sequence:message.sequence,kind,followMovement:kind==='combat'&&allowsFollowingMovement(message.payload,record.backgroundMovement),accepted:false};record.lastInput=input;
    if(this.guard(identity,message.payload)!==true){
     const challenged=this.challenge(identity),actor=this.kernel.players.get(identity.actor);
     if(challenged&&record.botChallengeEnabled&&actor?.epoch===identity.epoch){
      demand(Number.isSafeInteger(message.sequence)&&message.sequence>0&&message.sequence<=actor.lastAccepted+1,'input_sequence_gap');
      this.botChallenge({actor:identity.actor,epoch:identity.epoch,revision:challenged.revision,required:true,...(message.sequence>actor.lastAccepted?{rejectedSequence:message.sequence}:{})});return;
     }
     demand(false,'gameplay_guard_rejected');
    }
    // A cold purchase or durable refresh can temporarily drain this actor.
    // The client's retry is not another gameplay action. Charge the existing
    // limiter only once a slot is available, immediately before enqueue.
    const resident=this.kernel.players.get(identity.actor);
    if(resident?.accepting===false||resident?.queue?.length>=64){socket.send(JSON.stringify({type:'retry',sequence:message.sequence,code:resident?.accepting===false?'actor_draining':'input_backpressure'}));return;}
    let pipeline;
    if(record.movementPipeline){
     const actor=this.kernel.players.get(identity.actor);demand(actor&&actor.epoch===identity.epoch,'owner_epoch_fenced');
     demand(Number.isSafeInteger(message.sequence)&&message.sequence===actor.lastAccepted+1,'input_sequence_gap');
     pipeline=this.pipeline(identity,actor);
     const outstanding=actor.lastAccepted-actor.lastApplied,prior=pipeline.inputs.get(actor.lastAccepted);
     // A reconnect inherits the actor's accepted queue, not a new socket's
     // allowance. Unknown legacy work cannot grant an extra movement slot.
     if(outstanding>=2||outstanding===1&&!(kind==='movement'&&prior?.kind==='combat'&&prior.followMovement&&(!prior.backgroundOnly||record.backgroundMovement)||record.orderedMovement&&kind==='combat'&&allowsFollowingMovement(message.payload,record.backgroundMovement)&&prior?.kind==='movement')){
      socket.send(JSON.stringify({type:'retry',sequence:message.sequence,code:'input_backpressure'}));return;
     }
    }
    const retryAfter=this.rate(identity.account,message.payload.action,message.payload,identity);
    if(retryAfter){socket.send(JSON.stringify({type:'rejected',sequence:message.sequence,code:'rate_limited',retryAfter}));return;}
    this.presence(identity);
    if(typeof message.payload.action==='string'&&(message.payload.action.startsWith('adventure_loot_')||isZumrutActionR93(message.payload.action)||['auto_start_r102','auto_tick_r102','auto_stop_r102'].includes(message.payload.action)))this.captureInput(identity,message.payload,record);
    try{this.kernel.enqueue(identity.actor,{sequence:message.sequence,epoch:identity.epoch,kind,payload:message.payload});}
    catch(error){if(['actor_draining','input_backpressure'].includes(error.code)){socket.send(JSON.stringify({type:'retry',sequence:message.sequence,code:error.code}));return;}throw error;}
    input.accepted=true;this.acceptedInput?.(identity,message.payload);
    if(record.movementPipeline){
     pipeline.inputs.set(message.sequence,{kind,followMovement:kind==='combat'&&allowsFollowingMovement(message.payload,record.backgroundMovement),backgroundOnly:record.backgroundMovement&&!allowsFollowingMovement(message.payload)});
     // Queue admission is deliberately NOT a result or a durable ACK. Only
     // the unchanged writer/FixedLoop result path can confirm execution.
     socket.send(JSON.stringify({type:'queued',protocol:PROTOCOL,epoch:identity.epoch,sequence:message.sequence,kind,accepted:true,durable:false}));
    }
   }catch(error){close(error.code==='invalid_payload'?1009:1008,'Invalid game message');}
  });
 }
 transportAllowed(identity){
  if(this.guard(identity,null)===true)return true;
  const challenged=this.challenge(identity);
  return Boolean(challenged&&this.botChallenge({actor:identity.actor,epoch:identity.epoch,revision:challenged.revision,required:true}));
 }
 botChallenge({actor,epoch,revision,required,rejectedSequence}){
  const socket=this.actors.get(actor),record=socket&&this.sockets.get(socket);
  if(!record||record.closed||record.revoked||record.identity.epoch!==epoch)return false;
  demand(typeof required==='boolean'&&Number.isSafeInteger(revision)&&revision>0,'bot_challenge_state');
  if(!record.botChallengeEnabled){if(required)this.revoke({actor});return !required;}
  if(record.botRequired===required&&rejectedSequence===undefined)return true;
  if(!required&&record.botRequired!==true)return true;
  const sent=this.send(actor,{type:'bot_check',protocol:PROTOCOL,epoch,revision,required,...(rejectedSequence!==undefined?{rejectedSequence,notExecuted:true}:{})});
  // An undelivered state must remain retryable by the bounded mirror sweep.
  if(sent)record.botRequired=required;return sent;
 }
 pipeline(identity,actor){
  let state=this.inputPipelines.get(identity.actor);
  if(!state||state.epoch!==identity.epoch){state={epoch:identity.epoch,inputs:new Map()};this.inputPipelines.set(identity.actor,state);}
  for(const sequence of state.inputs.keys())if(sequence<=actor.lastApplied)state.inputs.delete(sequence);
  return state;
 }
 sweepPipelines(){for(const [id,state]of this.inputPipelines){const actor=this.kernel.players.get(id);if(!actor||actor.epoch!==state.epoch||actor.lastAccepted===actor.lastApplied){this.inputPipelines.delete(id);continue;}for(const sequence of state.inputs.keys())if(sequence<=actor.lastApplied)state.inputs.delete(sequence);}}
 write(socket,text,{tracked=false,perform}={}){
  const queued=this.egress.push(socket,text,perform);if(!queued)return false;
  // A failed socket write says nothing about a committed game operation. Keep
  // its receipt/outbox for reconnect; only this recipient loses the socket.
  const done=actorFaultIsolation?queued.catch(error=>this.socketFailure(socket,error)):queued;
  if(tracked)return done;void done.catch(this.onFault);return true;
 }
 socketFailure(socket,error){reportConnectionFault({actor:this.sockets.get(socket)?.identity?.actor,error:Object.assign(Error('socket_write_failed'),{code:'socket_write_failed',cause:error})});try{socket.close(1011,'Connection write failed');}catch{try{socket.terminate?.();}catch{}}return false;}
 canProjectR531(actor){const socket=this.actors.get(actor);if(egressPacingR531&&socket&&this.pressureExpiredR531(socket)){socket.close(1013,'Slow connection');return false;}return !egressPacingR531||!!socket&&socket.readyState===1&&!(this.egress.bytes.get(socket)??0)&&socket.bufferedAmount<=65536;}
 canNotifyR531(actor){const socket=this.actors.get(actor);return !egressPacingR531||!!socket&&socket.readyState===1&&socket.bufferedAmount+(this.egress.bytes.get(socket)??0)<65536;}
 pressureExpiredR531(socket){if(socket.bufferedAmount<=1048576){this.pressureR531.delete(socket);return false;}const at=this.clock();if(!this.pressureR531.has(socket))this.pressureR531.set(socket,at);return at-this.pressureR531.get(socket)>=10000;}
 send(actor,packet,options){
  const socket=this.actors.get(actor);if(!socket||socket.readyState!==1)return false;if(egressPacingR531?this.pressureExpiredR531(socket):socket.bufferedAmount>1048576){socket.close(1013,'Slow connection');return false;}
  if(egressPacingR531&&packet.type==='event'&&!this.canNotifyR531(actor))return false;
  // Match native cosmetic backpressure. Never queue stale previews in front
  // of gameplay results, world changes or durable notifications.
  if(packet.motions?.length&&socket.bufferedAmount+(this.egress.bytes.get(socket)??0)>8192){
   const {motions,...essential}=packet;
   if(!essential.world&&!essential.dungeon&&!essential.adventure&&!essential.afkCheck&&!essential.events?.length&&!essential.results?.length)return false;
   packet=essential;
  }
  return this.write(socket,this.encode(packet),options);
 }
 sendMotion(actor,text,valid,onSent){
  const socket=this.actors.get(actor),ready=()=>this.actors.get(actor)===socket&&socket?.readyState===1&&!this.sockets.get(socket)?.revoked&&socket.bufferedAmount+(this.egress.bytes.get(socket)??0)<=8192;
  if(!ready()||!valid())return false;
  return this.write(socket,text,{tracked:true,perform:()=>{if(ready()&&valid()){socket.send(text);onSent?.();}}});
 }
 identity(actor){const socket=this.actors.get(actor);return socket?this.sockets.get(socket)?.identity??null:null;}
 async retire(actor,packets){
  const socket=this.actors.get(actor),record=socket&&this.sockets.get(socket);if(!record)return false;
  // Fence ingress immediately, but keep this exact old socket open until its
  // final committed results have passed the FIFO egress queue. Revoking it
  // first makes scheduled sends silently resolve false and loses their ACKs.
  record.revoked=true;
  try{return (await Promise.all(packets.map(packet=>this.write(socket,this.encode(packet),{tracked:true})))).every(Boolean);}
  finally{socket.close(4003,'Session revoked');}
 }
 heartbeat(){this.sweepPipelines();for(const [socket,record]of this.sockets){const ping=()=>{if(!record.alive&&this.clock()-record.lastPong>=40000){socket.terminate();return;}record.alive=false;socket.ping();};if(!actorFaultIsolation){ping();continue;}try{ping();}catch(error){this.socketFailure(socket,error);}}}
 revoke({actor,account,session}){demand(Boolean(actor||account||session),'revocation_scope_required');for(const [socket,record]of this.sockets){const id=record.identity??record.authIdentity;if(id&&(actor===id.actor||account===id.account||session===id.session)){record.revoked=true;socket.close(4003,'Session revoked');}}}
 close(){this.egress.close();this.inputPipelines.clear();for(const socket of this.sockets.keys())socket.close(1001,'Maintenance');this.motion?.close();}
}
