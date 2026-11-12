// The remote sprite must use the same presentation sample as its position.
// Canonical snapshot velocity and expired attacks belong to other moments;
// mixing them with a buffered position can turn the weapon back and forth.
// This state is cosmetic only: it neither moves an actor nor changes an input.
function finiteDirectionR73(value){
 return value&&Number.isFinite(value.x)&&Number.isFinite(value.y)&&Math.hypot(value.x,value.y)>.000001;
}
function directedPoseR73(value,previousFacing=1){
 const length=Math.hypot(value.x,value.y),x=value.x/length,y=value.y/length;
 // Both body and weapon use the same horizontal side. A vertical segment has
 // no new horizontal direction, so retain the previous side without modifying
 // the actual x/y direction (especially the attack aim).
 const facingR73=x<-.08?-1:x>.08?1:previousFacing;
 return {x,y,facingR73};
}
export function updatePeerPoseR73(holder,before,after,now,fallbackDirection,alive=true){
 let pose=holder.peerPoseR73;
 if(!pose){
  pose={direction:directedPoseR73(finiteDirectionR73(fallbackDirection)?fallbackDirection:{x:1,y:0}),walking:false,at:now};
  holder.peerPoseR73=pose;
 }
 const dx=after.x-before.x,dy=after.y-before.y,distance=Math.hypot(dx,dy);
 const elapsed=Math.max(0,Math.min(.1,(now-pose.at)/1000));
 const resumed=now-pose.at>250,relocated=distance>420;
 pose.at=Math.max(pose.at,now);
 // Retain facing while stationary; floating-point tails must not overwrite it.
 // Real turns update on their first displayed displacement, with no turn timer.
 if(alive&&!resumed&&!relocated&&distance>.01)pose.direction=directedPoseR73({x:dx,y:dy},pose.direction.facingR73);
 pose.walking=!!alive&&!resumed&&!relocated&&distance>Math.max(.01,elapsed*8);
 return pose;
}
export function selectPeerPoseDirectionR73(holder,attackDirection,active,normalizeAttackFacing=false){
 const pose=holder.peerPoseR73;
 if(active&&finiteDirectionR73(attackDirection)){
  // Dungeon drawing normalizes its vector before applying the original side
  // threshold; world drawing uses the vector as received. Preserve both.
  const divisor=normalizeAttackFacing?Math.max(1,Math.hypot(attackDirection.x,attackDirection.y)):1;
  const direction={x:attackDirection.x,y:attackDirection.y,facingR73:attackDirection.x/divisor<-.08?-1:1};
  // An idle actor keeps the last attack orientation, just as the own actor
 // does. The next real displayed movement replaces it; an expired attack
 // record never gets to reapply it on every draw.
  if(pose)pose.direction=direction;
  return direction;
 }
 return pose?.direction??{x:1,y:0,facingR73:1};
}
