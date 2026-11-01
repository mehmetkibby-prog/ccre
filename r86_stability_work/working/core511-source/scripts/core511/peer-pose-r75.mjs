// Cosmetic remote pose only. Positions, interpolation, input and network timing
// are owned by R72/R73 and are deliberately not changed here.
function finiteDirectionR73(value){
 return value&&Number.isFinite(value.x)&&Number.isFinite(value.y)&&Math.hypot(value.x,value.y)>.000001;
}
function directedPoseR73(value,previousFacing=1){
 const length=Math.hypot(value.x,value.y),x=value.x/length,y=value.y/length;
 const facingR73=x<-.08?-1:x>.08?1:previousFacing;
 return {x,y,facingR73};
}
// Follow the confirmed segment on the SAME presentation clock as position.
// A follower may move backwards to correct an extrapolation overshoot even
// though the source player never turned. That correction is not facing input.
function sourceSideR75(buffer,now){
 if(!buffer)return null;
 const samples=buffer.samples,playhead=buffer.playheadR72;
 if(!samples?.length)return 0;
 // Moving one-point startup has no segment yet: preserve its normal rule,
 // except while an authority reconciliation or stopped endpoint owns it.
 if(samples.length===1)return buffer.pendingCanonical||samples[0].stopped?0:null;
 let a=samples.at(-2),b=samples.at(-1);
 // Legacy disabled prediction/playback modes never create either R72 clock.
 // Preserve their displacement rule only for a valid recent sample pair.
 // Partial, invalid or stale existing clocks still cannot bless corrections.
 if(playhead===undefined&&buffer.playheadAtR72===undefined){
  const gap=b.serverAt-a.serverAt,finite=[a.x,a.y,b.x,b.y,a.serverAt,b.serverAt].every(Number.isFinite);
  return !buffer.pendingCanonical&&finite&&gap>=10&&gap<=250?null:0;
 }
 // Never reuse a clock from a prior render frame to bless a correction.
 if(!Number.isFinite(playhead)||buffer.playheadAtR72!==now)return 0;
 // A newer authority checkpoint does not invalidate an already confirmed
 // segment still being played. It only forbids treating speculation beyond
 // that path as a new turn while the correction is pending.
 if(playhead>b.serverAt&&(buffer.pendingCanonical||b.stopped))return 0;
 for(let i=1;i<samples.length;i++){
  if(samples[i].serverAt<playhead)continue;
  a=samples[i-1];b=samples[i];break;
 }
 const gap=b.serverAt-a.serverAt,dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
 // Do not turn on a broken/discontinuous path or a stationary endpoint.
 if(gap<=0||gap>250||!Number.isFinite(length)||length<=.000001)return 0;
 const x=dx/length;
 return x<-.08?-1:x>.08?1:0;
}
function movementFacingR75(pose,direction,dx,sourceSide){
 const current=pose.direction.facingR73;
 const candidate=direction.x<-.08?-1:direction.x>.08?1:0;
 if(!candidate||candidate===current||sourceSide!==null&&candidate!==sourceSide){pose.turnDistanceR75=0;return current;}
 // A normalized 0.02px correction used to look like a full -1/+1 direction.
 // Confirm a side change with half a world pixel of continuous opposite movement.
 // Ordinary turns cover that in their first frame; there is no turn timer.
 pose.turnDistanceR75=(pose.turnDistanceR75||0)+Math.abs(dx);
 if(pose.turnDistanceR75<.5)return current;
 pose.turnDistanceR75=0;return candidate;
}
export function updatePeerPoseR73(holder,before,after,now,fallbackDirection,alive=true,sourceBuffer){
 let pose=holder.peerPoseR73;
 if(!pose){
  pose={direction:directedPoseR73(finiteDirectionR73(fallbackDirection)?fallbackDirection:{x:1,y:0}),walking:false,at:now};
  holder.peerPoseR73=pose;
 }
 // Never carry a partial cosmetic turn across a stream/scope reset.
 if(pose.sourceBufferR75!==sourceBuffer){pose.turnDistanceR75=0;pose.sourceBufferR75=sourceBuffer;}
 const dx=after.x-before.x,dy=after.y-before.y,distance=Math.hypot(dx,dy);
 const elapsed=Math.max(0,Math.min(.1,(now-pose.at)/1000));
 const resumed=now-pose.at>250,relocated=distance>420;
 pose.at=Math.max(pose.at,now);
 // Exactly the R73 walking rule and raw displayed movement vector. Only the
 // cosmetic side is filtered; other direction consumers retain their input.
 pose.walking=!!alive&&!resumed&&!relocated&&distance>Math.max(.01,elapsed*8);
 if(alive&&!resumed&&!relocated&&distance>.01){
  const direction=directedPoseR73({x:dx,y:dy},pose.direction.facingR73);
  direction.facingR73=pose.walking?movementFacingR75(pose,direction,dx,sourceSideR75(sourceBuffer,now)):pose.direction.facingR73;
  pose.direction=direction;
 }
 if(!pose.walking)pose.turnDistanceR75=0;
 return pose;
}
export function selectPeerPoseDirectionR73(holder,attackDirection,active,normalizeAttackFacing=false){
 const pose=holder.peerPoseR73;
 if(active&&finiteDirectionR73(attackDirection)){
  // Keep active aim and the original world/dungeon normalization exactly.
  const divisor=normalizeAttackFacing?Math.max(1,Math.hypot(attackDirection.x,attackDirection.y)):1;
  const direction={x:attackDirection.x,y:attackDirection.y,facingR73:attackDirection.x/divisor<-.08?-1:1};
  if(pose){pose.direction=direction;pose.turnDistanceR75=0;}
  return direction;
 }
 return pose?.direction??{x:1,y:0,facingR73:1};
}
