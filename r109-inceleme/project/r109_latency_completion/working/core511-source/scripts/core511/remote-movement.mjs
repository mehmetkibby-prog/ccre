import {firstMotionTargetR72} from './remote-playback-r72.mjs';
import {readR45ClientOptions} from './r45-client.mjs';
import {continuousMotionPosition} from './remote-playback-r45.mjs';
import {readR44ClientOptions} from './r44-client.mjs';
import {lowLatencyMotionPosition,advanceLowLatencyMotion} from './remote-playback-r44.mjs';
import {readMotionPreview,advanceMotionCheckpoint,bufferedMotionPosition,reconcileMotionBuffer,updateRemoteMotionTarget,advanceRemoteMotion} from './generated/movement-presentation-rules.mjs';
import {readR43Options} from './r43-client.mjs';
import {tuneMotionBufferR43,bufferedMotionPositionR43} from './remote-playback-r43.mjs';
const playbackR43=(buffer,now)=>readR43Options().remoteMotionLatency?bufferedMotionPositionR43(buffer,now):bufferedMotionPosition(buffer,now);
const point=row=>({x:row.x,y:row.y}),finite=row=>row&&Number.isFinite(row.x)&&Number.isFinite(row.y);
const revision=row=>Number(row?.positionRevision??row?.position_revision??-1);
const checkpoint=row=>({x:row.x,y:row.y,motionStreamId:row.motion_stream_id??row.motionStreamId,motionSequence:row.motion_sequence??row.motionSequence});
const scope=world=>JSON.stringify([world?.world?.cycle,world?.channel,world?.area,world?.arenaMatch?.id??'']);
const epoch=row=>JSON.stringify([row.area,row.respawn_at_ms??0,row.hp<=0]);

// The transport can coalesce several 50ms previews into one packet. A 200ms
// delivery gap is not a relocation: resetting to one sample makes the bounded
// follower sprint to that point, then stand still until the next packet.
// Keep the native playback/follower and real timestamps, but retain the short
// path across ordinary sparse deliveries. A genuine long silence still resets.
function appendMotionSample(buffer,sample){
 const fresh=()=>({samples:[sample],offset:sample.receivedAt-sample.serverAt,streamId:sample.streamId,sourceClock:!!sample.sourceClock});
 if(!buffer||buffer.streamId!==sample.streamId||!!buffer.sourceClock!==!!sample.sourceClock||buffer.pendingCanonical&&sample.receivedAt>=buffer.pendingCanonical.expiresAt)return fresh();
 const last=buffer.samples.at(-1);if(sample.serverAt<last.serverAt)return buffer;
 const gap=sample.receivedAt-last.receivedAt,sourceGap=sample.serverAt-last.serverAt;
 if(gap>500||sourceGap>500)return fresh();
 if(buffer.pendingCanonical&&(sample.sequence??0)>buffer.pendingCanonical.sequence)delete buffer.pendingCanonical;
 buffer.offset=Math.min(buffer.offset,sample.receivedAt-sample.serverAt);
 if(sourceGap===0)buffer.samples[buffer.samples.length-1]=sample;else buffer.samples.push(sample);
 if(buffer.samples.length>24)buffer.samples.splice(0,buffer.samples.length-24);
 // A bounded recent window learns actual delivered cadence instead of
 // repeatedly emptying an 80ms buffer when packets arrive around 200ms apart.
 const gaps=buffer.gaps??=[];if(gap>0)gaps.push(Math.max(gap,sourceGap));if(gaps.length>8)gaps.shift();
 const jitter=buffer.samples.reduce((max,s)=>Math.max(max,s.receivedAt-s.serverAt-buffer.offset),0);
 buffer.playbackDelay=Math.max(80,Math.min(350,Math.max(jitter+60,Math.max(0,...gaps)+10)));
 if(readR43Options().remoteMotionLatency)tuneMotionBufferR43(buffer);
 return buffer;
}

// One presentation owner for both the shipped renderer and transport tests.
// Native monotonic playback and the 600px/s bounded follower remain unchanged.
// R43 playback interpolates known points. The separately gated R44 path may
// briefly predict a visual target; authoritative movement remains unchanged.
export class RemoteMovement {
 constructor(){this.rows=new Map();this.scope=null;this.world=null;this.ownId=null;}
 clear(){this.rows.clear();this.scope=null;this.world=null;}
 fresh(row,at){return {row,revision:revision(row),epoch:epoch(row),relocationFloor:-1,lastAt:at,resumeAfterGap:false,
  authorityBuffer:appendMotionSample(undefined,{...point(row),serverAt:at,receivedAt:at,streamId:'authority',sequence:revision(row)}),
  motion:{...point(row),targetX:row.x,targetY:row.y,vx:0,vy:0,sampleAt:at,area:row.area,travel:0}};}
 reset(state,row,at){const fresh=this.fresh(row,at);fresh.relocationFloor=revision(row);Object.assign(state,fresh,{preview:null,buffer:undefined,watermark:undefined});}
 canonical(state,row,at,{relocated=false}={}){
  const rev=revision(row);if(rev<state.revision)return;
  const nextEpoch=epoch(row),c=checkpoint(row),previous=checkpoint(state.row),hasStamp=typeof c.motionStreamId==='string'&&c.motionStreamId.length>=16&&Number.isSafeInteger(c.motionSequence)&&c.motionSequence>0;
  const stampedMove=hasStamp&&(c.motionStreamId!==previous.motionStreamId||c.motionSequence>Number(previous.motionSequence??0));
  // A control/teleport may retain an earlier stream stamp while increasing
  // position revision. Compare to the previous canonical point, never to an
  // ahead-of-checkpoint preview sequence, so ordinary movement is preserved.
  const retainedStamp=hasStamp&&c.motionStreamId===previous.motionStreamId&&c.motionSequence<=Number(previous.motionSequence??0);
  if(relocated||nextEpoch!==state.epoch||Math.hypot(row.x-state.row.x,row.y-state.row.y)>420||rev>state.revision&&(retainedStamp||state.preview&&!stampedMove)){this.reset(state,row,at);return;}
  if(rev>state.revision){
   state.authorityBuffer=appendMotionSample(state.authorityBuffer,{...point(row),serverAt:at,receivedAt:at,streamId:'authority',sequence:rev});
   state.watermark=advanceMotionCheckpoint(state.watermark,c);
   state.buffer=reconcileMotionBuffer(state.buffer,c,state.watermark?.retiredStreams,at);
   if(!state.buffer)state.preview=null;
   state.revision=rev;
  }
  state.row=row;state.epoch=nextEpoch;
 }
 accept(world,at){
  const next=scope(world);if(next!==this.scope){this.clear();this.scope=next;}this.world=world;
  const keep=new Set();
  for(const row of world.players??[]){if(row.id===this.ownId||!finite(row))continue;keep.add(row.id);const state=this.rows.get(row.id);if(state){
   this.canonical(state,row,at);
   // Expiry alone is not a new authority sample. During a network stall, hold
   // the last validated point instead of returning to a stale checkpoint.
   // A fresh server snapshot still retires a preview that was never confirmed.
   const preview=state.preview,c=checkpoint(state.row);
   if(preview&&revision(row)>=state.revision&&Number(world.snapshotAtMs)>=preview.serverAt+650&&(c.motionStreamId!==preview.streamId||Number(c.motionSequence)<preview.sequence))state.preview=null,state.buffer=undefined;
  }else this.rows.set(row.id,this.fresh(row,at));}
  for(const id of this.rows.keys())if(!keep.has(id))this.rows.delete(id);
 }
 inScope(event){const w=this.world;return w&&event.cycle===w.world?.cycle&&event.channel===w.channel&&event.area===w.area&&(event.arenaMatchId??'')===(w.arenaMatch?.id??'');}
 acceptMotions(events,at){
  if(!Array.isArray(events)||events.length>128)return;
  for(const event of events){
   if(event?.type!=='motion_preview'||!this.inScope(event)||event.playerId===this.ownId)continue;
   const state=this.rows.get(event.playerId);if(!state||state.row.hp<=0||!Number.isSafeInteger(event.positionRevision)||event.positionRevision<state.relocationFloor)continue;
   const preview=readMotionPreview(event,state.watermark,at);
   if(!preview||preview.hpRevision<Number(state.row.hp_revision??0))continue;
   state.preview=preview;state.watermark=preview;
   const sample={x:preview.x,y:preview.y,serverAt:preview.presentationAt??preview.serverAt,sourceClock:preview.presentationAt!==undefined,receivedAt:at,streamId:preview.streamId,sequence:preview.sequence,...(readR44ClientOptions().remoteMotionPrediction?{stopped:event.stopped===true}:{})},last=state.buffer?.samples.at(-1);
   // Only a genuine long silence retires the playback interval. Ordinary
   // sparse delivery must preserve two endpoints for continuous interpolation.
   // Also handle a late first packet followed by a long source gap in one
   // delivery burst. Only the buffer clock restarts; the displayed position
   // still approaches validated coordinates at the native600px/s cap.
   if(last&&sample.streamId===last.streamId&&(at-last.receivedAt>500||sample.sourceClock&&last.sourceClock&&sample.serverAt-last.serverAt>500&&at-last.receivedAt>=0))state.buffer=undefined,state.resumeAfterGap=true;
   // A stopped stream may resume after 250–500ms without being a network
   // outage. That idle interval is outside the interpolator's valid range;
   // retaining it races to the first tiny step and then holds. Start the
   // existing bounded first-point approach instead of inventing idle velocity.
   if(readR45ClientOptions().continuousRemoteMotion&&last?.stopped&&!sample.stopped&&sample.streamId===last.streamId&&sample.serverAt-last.serverAt>250)state.buffer=undefined;
   state.buffer=appendMotionSample(state.buffer,sample);
  }
 }
 control(event,at){
  if(event?.type!=='guardian_control'||!this.world||event.area!==this.world.area||event.channel!==this.world.channel)return;
  for(const [id,row]of [[event.actorId,event.moved],...(event.targetKind==='player'?[[event.targetId,event.controlled]]:[])]){
   const state=this.rows.get(id);if(!state||!finite(row)||!Number.isSafeInteger(revision(row))||revision(row)<state.revision||Number(row.hp_revision)<Number(state.row.hp_revision??0))continue;
   this.canonical(state,{...state.row,...row},at,{relocated:true});
  }
 }
 position(type,row,at){
  if(type!=='players'||!finite(row))return point(row);
  const state=this.rows.get(row.id);if(!state)return point(row);
  if(revision(row)>state.revision||row.hp<=0&&state.row.hp>0)this.canonical(state,row,at);
  if(state.resumeAfterGap){
   // TCP can drain many old points before the next draw. Resume from its
   // latest validated point, retaining any pending canonical correction.
   const last=state.buffer?.samples.at(-1),pending=state.buffer?.pendingCanonical;
   state.buffer=last?appendMotionSample(undefined,last):undefined;
   if(state.buffer&&pending)state.buffer.pendingCanonical=pending;
   state.resumeAfterGap=false;
  }
  if(state.buffer?.pendingCanonical&&at>=state.buffer.pendingCanonical.expiresAt){
   // Once the newer authoritative endpoint wins, retire its older preview.
   // Otherwise the native buffer returns that endpoint for 150..600ms, then
   // expires and the stale preview becomes live again, pulling a stopped peer
   // backwards. This affects presentation only; checkpoint floors stay intact.
   state.buffer=undefined;state.preview=null;
   state.authorityBuffer=appendMotionSample(undefined,{...point(state.row),serverAt:at,receivedAt:at,streamId:'authority',sequence:state.revision});
  }
  const predicted=readR44ClientOptions().remoteMotionPrediction;
  // Server-projected mount state supplies the existing 25% movement speed.
  // A 300px/s walking follower cannot keep up with a 331px/s mounted archer.
  // This scales presentation only; no input or authoritative speed is changed.
  const speedMultiplier=state.row.mount?.mounted===true&&['wolf','boar','stag'].includes(state.row.mount.kind)?1.25:1;
  let buffered=state.row.hp>0?(predicted?(readR45ClientOptions().continuousRemoteMotion?continuousMotionPosition(state.buffer,at,speedMultiplier,state.motion):lowLatencyMotionPosition(state.buffer,at,speedMultiplier)):playbackR43(state.buffer,at)):null;
  if(buffered&&predicted&&readR45ClientOptions().continuousRemoteMotion)buffered=firstMotionTargetR72(state,state.buffer,at)??buffered;
  const live=buffered??state.preview;
  const fallback=!live&&state.authorityBuffer?.samples.length>1?playbackR43(state.authorityBuffer,at):null;
  const target=live??fallback??state.row,m=state.motion;
  // A hidden/occluded canvas can stop drawing while WebSocket samples keep
  // arriving. Do not replay that invisible interval at only 300px/s: the peer
  // may take tens of seconds to catch up. Resume at the current presentation
  // point only when a recent validated sample proves the stream is live.
  // Continuous drawing during a network stall retains the normal follower.
  const sample=state.buffer?.samples.at(-1);
  if(at-state.lastAt>250&&buffered&&sample&&at-sample.receivedAt>=-50&&at-sample.receivedAt<=150){
   m.x=target.x;m.y=target.y;m.targetX=target.x;m.targetY=target.y;m.vx=0;m.vy=0;m.sampleAt=at;
  }
  if(m.targetX!==target.x||m.targetY!==target.y)updateRemoteMotionTarget(m,target.x,target.y,at);
  // A resumed render integrates at most100ms, avoiding an accumulated catch-up
  // burst. Ordinary delivery stalls use the same native speed cap.
  const elapsed=Math.max(0,Math.min(.1,(at-state.lastAt)/1000));state.lastAt=Math.max(state.lastAt,at);
  if(predicted&&buffered)advanceLowLatencyMotion(m,elapsed,speedMultiplier);
  else advanceRemoteMotion(m,elapsed,!!live,!!buffered||!!fallback);
  return point(m);
 }
}
