import {residentCapacityR59,channelAdmissionR59,castleResumeR59} from './castle-capacity-r59.mjs';
import {acceptMountMotion} from './mount-motion.mjs';
import {r44Options} from './r44-options.mjs';
import {MOTION_SCREEN_MULTIPLIER,validMotionMultiplier,motionViewport,nearMotion} from './motion-proximity.mjs';
import {randomUUID} from 'node:crypto';
import {acceptMotion,reconcileMotionCheckpoint,MOTION_PROTOCOL} from '../../../native510-bb3a6cc689c6/realtime-server/src/motion.mjs';
import {createRules} from './generated/rules.mjs';
import {colLabEventAudience,eventForViewer} from './generated/world-projection-rules.mjs';
import {CAPACITY,PROTOCOL} from './contract.mjs';
import {SharedFrameEncoder} from './shared-frame-encoder.mjs';

export {MOTION_PROTOCOL};
const scopeOf=(row,cycle)=>JSON.stringify([cycle,row.channel,row.area,row.arena_match_id||'']);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const token=(entry,now)=>{entry.tokens=Math.min(4,entry.tokens+Math.max(0,now-entry.tokenAt)*24/1000);entry.tokenAt=Math.max(entry.tokenAt,now);if(entry.tokens<1)return false;entry.tokens--;return true;};

// Cosmetic samples are deliberately separate from input sequences and resident
// state. The pinned native validator checks speed/debt/collision against an
// authenticated live anchor. Only the normal move command can move that anchor.
export class ChannelMotion {
 constructor({enabled=process.env.CORE511_MOTION_STREAM!=='0',screenMultiplier=MOTION_SCREEN_MULTIPLIER,channel,connected,secure,blocked=()=>false,visible=()=>true,held=()=>false,heldEnabled=true,directEnabled=r44Options.motionDirect,sendHeld=null,schedule=setTimeout,cancel=clearTimeout,clock=Date.now,audience=colLabEventAudience}){
  Object.assign(this,{enabled:enabled===true,screenMultiplier:validMotionMultiplier(screenMultiplier)?screenMultiplier:MOTION_SCREEN_MULTIPLIER,channel,connected,secure,blocked,visible,held,heldEnabled,directEnabled,sendHeld,schedule,cancel,clock,audience});this.rules=createRules();this.entries=new Map();this.pending=new Map();this.frames=new Map();this.tick=null;
  this.heldPending=new Map();this.heldTimer=null;this.heldSending=false;this.heldLastAt=-Infinity;this.closed=false;
  this.metrics={received:0,accepted:0,rejected:0,limited:0,coalesced:0,delivered:0,heldFrames:0,heldSamples:0,proximitySkipped:0,rejectReasons:Object.fromEntries(['disabled','connection','closed','missing_player','security','owner_epoch','resident_epoch','actor_epoch','actor_inactive','held_disabled','blocked','entry_scope','rate_limit','payload','stream','position_revision','cycle','channel','area','arena','anchor_distance','segment_collision','dead','rooted','hp_revision','sequence','debt','step_speed','native_anchor_distance','native_collision'].map(key=>[key,0]))};
 }
 current(entry,deny=()=>null){
  const {identity}=entry,id=identity.actor,row=this.channel.view.player(id),owner=this.channel.owners.get(id),actor=this.channel.kernel.players.get(id),resident=this.channel.state.owners.get(id);
  if(this.closed)return deny('closed');if(!row)return deny('missing_player');
  if(this.connected(id)!==identity)return deny('connection');if(this.secure(identity)!==true)return deny('security');
  if(!owner||owner.epoch!==identity.epoch||owner.channel!==row.channel)return deny('owner_epoch');
  if(resident?.epoch!==identity.epoch||resident.state!=='active')return deny('resident_epoch');
  if(actor?.epoch!==identity.epoch)return deny('actor_epoch');if(!actor.accepting||actor.quiescer)return deny('actor_inactive');
  if((actor.suspended||actor.externalHold)&&!(this.heldEnabled&&this.held(id)))return deny('held_disabled');
  if(this.blocked(id))return deny('blocked');
  if(scopeOf(row,this.channel.world.cycle)!==entry.scope)this.rebaseScope(entry,row,this.clock());
  return row;
 }
 // A committed in-channel teleport (tower floor, mist, dungeon return) keeps
 // the socket but changes its world scope. Rebase from the AUTHENTICATED
 // resident row, never from a cosmetic payload. Retire every old-scope sample
 // and sequence cache; old packets still fail scope/revision validation below.
 rebaseScope(entry,row,now){
  const id=row.id;entry.scope=scopeOf(row,this.channel.world.cycle);
  entry.floor=row.position_revision;entry.authority=null;
  entry.player={connectionId:entry.streamId,motionSequence:0,motionHpFloor:row.hp_revision};
  entry.viewport=null;entry.cameraSettlesAt=now+1500;entry.sentMotions.clear();
  this.pending.delete(id);this.heldPending.delete(id);this.frames.clear();
  for(const peer of this.entries.values())peer.sentMotions.delete(id);
  this.sync(entry,row,now);
 }
 // Diagnostic classification runs only after the pinned native validator has
 // refused a sample. It grants no budget and never changes validation/state.
 nativeRejectReason(p,payload,now,multiplier=1){
  if(p.hp<=0)return 'dead';if(now<(p.rootUntilMs??0))return 'rooted';
  if(payload.hpRevision<(p.motionHpFloor??0))return 'hp_revision';
  if(payload.sequence<=(p.motionSequence??0)||p.motion&&payload.sequence<=p.motion.sequence)return 'sequence';
  const previous=p.motion,speed=(p.role==='avci'?265:239)*1.07*multiplier,distance=Math.hypot(payload.x-(previous?.x??p.x),payload.y-(previous?.y??p.y));
  const elapsed=previous?Math.max(0,Math.min(1000,now-previous.at)):520;
  if(Math.max(0,(previous?.debt??0)+distance/speed*1000-elapsed)>180)return 'debt';
  if(distance>speed*1.2)return 'step_speed';if(Math.hypot(payload.x-p.x,payload.y-p.y)>speed*1.84)return 'native_anchor_distance';
  return 'native_collision';
 }
 viewport(identity,payload,record){const entry=this.entries.get(identity.actor);return Boolean(this.enabled&&entry?.record===record&&motionViewport(entry,payload,this.current(entry)));}
 configure(settings){if(validMotionMultiplier(settings?.screenMultiplier)&&Number.isSafeInteger(settings.revision)&&settings.revision>=(this.settingsRevision??-1)){this.screenMultiplier=settings.screenMultiplier;this.settingsRevision=settings.revision;return true;}return false;}
 ready(identity,record){
  if(!this.enabled)return null;
  const row=this.channel.view.player(identity.actor);if(!row||!this.entries.has(identity.actor)&&this.entries.size>=residentCapacityR59(this.channel.peer.channel))return null;
  const streamId=randomUUID(),now=this.clock(),entry={identity,record,streamId,scope:scopeOf(row,this.channel.world.cycle),floor:row.position_revision,sentMotions:new Map(),authority:null,tokens:4,tokenAt:now,player:{connectionId:streamId,motionSequence:0,motionHpFloor:row.hp_revision}};
  this.entries.set(identity.actor,entry);this.pending.delete(identity.actor);this.heldPending.delete(identity.actor);this.sync(entry,row,now);return streamId;
 }
 forget(identity,record){const entry=this.entries.get(identity.actor);if(entry&&(!record||entry.record===record)){this.entries.delete(identity.actor);for(const peer of this.entries.values())peer.sentMotions.delete(identity.actor);this.pending.delete(identity.actor);this.heldPending.delete(identity.actor);if(!this.heldPending.size)this.stopHeldTimer();}}
 sync(entry,row,now){
  const old=entry.authority,p=entry.player,newRevision=old&&row.position_revision!==old.revision,mountSpeed=this.channel.mounts?.multiplier(row.id,row,now)??1;
  const canonical=newRevision&&row.motion_stream_id===entry.streamId&&Number.isSafeInteger(row.motion_sequence)&&row.motion_sequence>old.motionSequence;
  const relocated=newRevision&&!canonical,lifeChanged=old&&(row.respawn_at_ms!==old.respawnAt||row.hp<=0&&old.hp>0),controlled=old&&row.root_until_ms!==old.rootUntil;
  if(relocated)entry.cameraSettlesAt=now+1500;
  if(relocated||lifeChanged||controlled||old&&old.mountSpeed!==mountSpeed){p.motion=undefined;p.motionHpFloor=Math.max(p.motionHpFloor??0,row.hp_revision);entry.floor=Math.max(entry.floor,row.position_revision);this.pending.delete(row.id);this.heldPending.delete(row.id);}
  Object.assign(p,{playerId:row.id,role:row.role,x:row.x,y:row.y,hp:row.hp,hpRevision:row.hp_revision,rootUntilMs:row.root_until_ms||0,cycle:this.channel.world.cycle,channel:row.channel,area:row.area,arenaMatchId:row.arena_match_id||''});
  if(canonical)reconcileMotionCheckpoint(p,{motionStreamId:row.motion_stream_id,motionSequence:row.motion_sequence},now);
  entry.authority={mountSpeed,revision:row.position_revision,motionSequence:row.motion_sequence||0,respawnAt:row.respawn_at_ms||0,rootUntil:row.root_until_ms||0,hp:row.hp};
  return p;
 }
 receive(identity,payload,record){
  this.metrics.received++;
  const reject=reason=>{this.metrics.rejected++;this.metrics.rejectReasons[reason]++;return false;};
  if(!this.enabled)return reject('disabled');
  const entry=this.entries.get(identity.actor),now=this.clock();if(!entry||entry.record!==record)return reject('connection');
  if(!token(entry,now)){this.metrics.limited++;this.metrics.rejectReasons.rate_limit++;return false;}
  const row=this.current(entry,reason=>{reject(reason);return null;});if(!row)return false;
  const p=this.sync(entry,row,now);
  if(payload?.protocol!==MOTION_PROTOCOL||!Number.isSafeInteger(payload.sequence)||payload.sequence<1||!finite(payload.x)||!finite(payload.y)||!Number.isSafeInteger(payload.hpRevision)||payload.hpRevision<0||!finite(payload.clientAt)||!Number.isSafeInteger(payload.basePositionRevision)||typeof payload.stopped!=='boolean')return reject('payload');
  if(payload.streamId!==entry.streamId)return reject('stream');
  if(payload.basePositionRevision<entry.floor||payload.basePositionRevision>row.position_revision)return reject('position_revision');
  if(payload.cycle!==p.cycle)return reject('cycle');if(payload.channel!==p.channel)return reject('channel');if(payload.area!==p.area)return reject('area');if((payload.arenaMatchId||'')!==p.arenaMatchId)return reject('arena');
  const multiplier=this.channel.mounts?.multiplier(identity.actor,row,now)??1;
  const previous=p.motion??p,speed=(p.role==='avci'?265:239)*1.07*multiplier;
  // Own prediction is already bounded to 600ms. Keep the exact existing
  // anchor, debt, collision and speed limits; latency grants no extra movement.
  if(Math.hypot(payload.x-p.x,payload.y-p.y)>speed*.65+2)return reject('anchor_distance');
  if(!this.rules.isAreaWalkableSegment(p.area,previous.x,previous.y,payload.x,payload.y))return reject('segment_collision');
  const validate=multiplier===1.25?acceptMountMotion:acceptMotion,event=validate(p,payload,now,(area,x,y)=>this.rules.isAreaWalkableSegment(area,x,y,x,y),multiplier);if(!event)return reject(this.nativeRejectReason(p,payload,now,multiplier));
  if((this.directEnabled&&this.sendHeld?this.heldPending:this.pending).has(identity.actor))this.metrics.coalesced++;
  const sample={entry,event:Object.freeze({...event,positionRevision:row.position_revision,stopped:payload.stopped})};this.pending.set(identity.actor,sample);
  // R44 reuses the bounded cosmetic timer for active observers too, so a
  // validated point does not wait for a simulation/projection tick.
  // Separate latest-value mailboxes: normal projection must never consume a
  // suspended observer's only sample, and cosmetic timers never consume ACKs.
  if(this.sendHeld&&(this.directEnabled||this.heldEnabled&&[...this.entries.keys()].some(id=>this.held(id)))){this.heldPending.set(identity.actor,sample);this.scheduleHeld();}
  this.metrics.accepted++;return true;
 }
 flush(tick,now){
  if(this.tick===tick)return;this.tick=tick;this.frames.clear();if(!this.pending.size)return;
  const pending=[...this.pending.values()];this.pending.clear();const viewers=[];
  for(const entry of this.entries.values()){const row=this.current(entry);if(row&&!this.held(entry.identity.actor))viewers.push({entry,row});}
  this.route(pending,viewers,now,this.frames);
 }
 route(pending,viewers,now,frames){
  for(const {entry,event}of pending){
   const row=this.current(entry);if(!row)continue;const p=this.sync(entry,row,now);
   const latest=p.motion,exact=latest?.sequence===event.sequence&&latest.x===event.x&&latest.y===event.y;
   // A normal checkpoint can cover an accepted preview between receive and
   // projection. Its older validated point is still a safe interpolation
   // endpoint. Dropping it punches a 100ms hole in a healthy 20Hz stream.
   // Only an exact newer canonical point qualifies; relocations raise floor,
   // clear motion and pending samples in sync, and remain ineligible.
   const covered=latest&&event.positionRevision>=entry.floor&&row.motion_stream_id===event.streamId&&row.motion_sequence>=event.sequence&&latest.sequence===row.motion_sequence&&latest.x===row.x&&latest.y===row.y;
   if(row.hp<=0||now<(row.root_until_ms||0)||!exact&&!covered||event.hpRevision<(p.motionHpFloor??0))continue;
   const audience=this.audience(event,row.channel,row.area),allowed=audience?new Set(audience):null,hidden=id=>id===row.id&&row.is_gm===1&&row.gm_invisible===1;
   for(const viewer of viewers){const id=viewer.row.id,delivered=this.directEnabled?viewer.entry.sentMotions.get(row.id):null;if(delivered?.streamId===event.streamId&&delivered.sequence>=event.sequence)continue;if(id===row.id||viewer.entry.scope!==entry.scope||allowed&&!allowed.has(id)||!eventForViewer(event,hidden,id))continue;
    if(!nearMotion(viewer,event,this.screenMultiplier,now)){this.metrics.proximitySkipped++;continue;}
    let list=frames.get(id);if(!list)frames.set(id,list=[]);list.push(event);this.metrics.delivered++;
   }
  }
 }
 take(id,tick,now){this.flush(tick,now);const rows=this.frames.get(id);return rows?.filter(row=>this.visible(id,row.playerId))??null;}
 stopHeldTimer(){if(this.heldTimer!==null){this.cancel(this.heldTimer);this.heldTimer=null;}}
 setHeldEnabled(enabled){this.heldEnabled=enabled===true;if(!this.heldEnabled&&!this.directEnabled){this.stopHeldTimer();this.heldPending.clear();}}
 scheduleHeld(){
  if(this.closed||!this.heldEnabled&&!this.directEnabled||!this.sendHeld||this.heldTimer!==null||this.heldSending||!this.heldPending.size)return;
  this.heldTimer=this.schedule(()=>{this.heldTimer=null;this.flushHeld();},Math.max(0,50-(this.clock()-this.heldLastAt)));this.heldTimer?.unref?.();
 }
 validHeldBatch(id,rows){
  const entry=this.entries.get(id);
  if(this.closed||!entry||!this.directEnabled&&(!this.heldEnabled||!this.held(id))||!this.current(entry))return false;
  return rows.every(event=>{
   const sender=this.entries.get(event.playerId),row=sender&&this.current(sender),now=this.clock();
   if(!row||sender.streamId!==event.streamId||sender.scope!==entry.scope||row.hp<=0||now<(row.root_until_ms||0)||row.is_gm===1&&row.gm_invisible===1||!this.visible(id,row.id)||!nearMotion({entry,row:this.channel.view.player(id)},event,this.screenMultiplier,now))return false;
   if(!this.directEnabled)return row.position_revision===sender.authority?.revision&&sender.player.motion?.sequence===event.sequence;
   // A checkpoint can arrive during the egress yield. Keep a covered legal
   // endpoint, but never one from a relocation, newer HP floor or old owner.
   const p=this.sync(sender,row,now),last=p.motion;
   // A later legal preview does not revoke an earlier validated point. Requiring
   // exact equality here discarded the ENTIRE multi-player batch whenever just
   // one sender moved during the egress yield. Relocation floors and all privacy,
   // owner, control and HP checks still apply immediately before transmission.
   return Boolean(last&&last.sequence>=event.sequence&&event.positionRevision>=sender.floor&&event.hpRevision>=(p.motionHpFloor??0));
  });
 }
 flushHeld(){
  if(this.closed||!this.heldEnabled&&!this.directEnabled||!this.sendHeld){this.heldPending.clear();return;}
  if(this.heldSending)return;
  const now=this.clock(),viewers=[];for(const entry of this.entries.values()){if(!this.directEnabled&&!this.held(entry.identity.actor)||this.held(entry.identity.actor)&&!this.heldEnabled)continue;const row=this.current(entry);if(row)viewers.push({entry,row});}
  const pending=[...this.heldPending.values()];this.heldPending.clear();if(!viewers.length||!pending.length)return;
  const frames=new Map();this.route(pending,viewers,now,frames);const wire=this.heldWire??=new SharedFrameEncoder();wire.begin(frames);const sends=[];this.heldLastAt=now;
  for(const [id,all]of frames){const rows=all.filter(row=>this.visible(id,row.playerId));if(!rows.length||!this.validHeldBatch(id,rows))continue;
   wire.prepareMotions(rows);const text=wire.encode({type:'frame',protocol:PROTOCOL,motions:rows});
   // Only immutable serialized cosmetic data crosses the async egress. The
   // final callback checks the exact held viewer again before socket.send.
   try{const sent=this.sendHeld(id,text,()=>this.validHeldBatch(id,rows),()=>{if(this.directEnabled){const peer=this.entries.get(id);if(peer)for(const event of rows)peer.sentMotions.set(event.playerId,{streamId:event.streamId,sequence:event.sequence});}});if(sent?.then)sends.push(sent);if(sent!==false){this.metrics.heldFrames++;this.metrics.heldSamples+=rows.length;}}catch{}
  }
  if(sends.length){this.heldSending=true;void Promise.allSettled(sends).then(()=>{this.heldSending=false;this.scheduleHeld();});}
  else this.scheduleHeld();
 }
 close(){this.closed=true;this.stopHeldTimer();this.entries.clear();this.pending.clear();this.heldPending.clear();this.frames.clear();}
}
