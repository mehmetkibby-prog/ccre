// A bounded 50–150ms presentation interval absorbs arrival jitter without adding
// a second authority clock. Coordinates here are cosmetic; all native movement,
// collision, epoch, checkpoint and reward validation stays in the transport.
export function smoothMotionPositionR72(buffer,now,speedMultiplier=1,shown){
 const samples=buffer?.samples,last=samples?.at(-1);
 if(!last)return null;
 const extrapolated=buffer.extrapolatedR72,priorPlayhead=buffer.playheadR72;
 delete buffer.extrapolatedR72;
 const point={x:last.x,y:last.y};
 if(samples.length<2)return point;
 const previous=samples.at(-2),gap=last.serverAt-previous.serverAt;
 if(gap<10||gap>250)return point;
 const recent=samples.slice(-8);let cadence=0,jitter=0;
 for(let i=0;i<recent.length;i++){
  const s=recent[i];jitter=Math.max(jitter,(s.receivedAt??s.serverAt+buffer.offset)-s.serverAt-buffer.offset);
  if(i){const previous=recent[i-1],sourceGap=s.serverAt-previous.serverAt,arrivalGap=(s.receivedAt??s.serverAt+buffer.offset)-(previous.receivedAt??previous.serverAt+buffer.offset);if(sourceGap<=250&&arrivalGap<=500)cadence=Math.max(cadence,sourceGap,arrivalGap);}
 }
 const delay=Math.max(50,Math.min(150,Math.max(cadence,jitter+50)));
 const desired=now-buffer.offset-delay;
 // Increasing the jitter buffer must not move a rendered player backwards.
 // Change the source playhead rate gently; retain the same speculative bound.
 const resumed=now-(buffer.playheadAtR72??now)>250&&now-last.receivedAt>=-50&&now-last.receivedAt<=150;
 // A paused canvas must not replay invisible time. Match the existing fresh
 // sample condition used by the world renderer before it reanchors display.
 if(!Number.isFinite(buffer.playheadR72)||resumed)buffer.playheadR72=desired;
 else if(now>(buffer.playheadAtR72??now)){
  const elapsed=Math.min(250,now-buffer.playheadAtR72),normal=buffer.playheadR72+elapsed;
  // Drain excess delay only while actual samples cover the playhead. Do
  // not spend the finite prediction horizon faster than real time during
  // a missing packet; that used to produce a stop just before late delivery.
  const catchup=normal<=last.serverAt?elapsed*.1:0;
  const correction=Math.max(-elapsed*.25,Math.min(catchup,desired-normal));
  buffer.playheadR72=Math.max(buffer.playheadR72,normal+correction);
 }
 // With two confirmed points, playback has no path before the first one.
 // Position already clamps there; let its clock start there too, otherwise
 // a quick second packet makes the follower reach that point and pause while
 // the clock catches up through nonexistent prehistory.
 buffer.playheadR72=Math.max(samples[0].serverAt,buffer.playheadR72);
 // A late confirmed segment can cover ground already drawn by the bounded
 // extrapolator, but assign that ground a later source time. Replaying the
 // segment from the old time then briefly turns the actor backwards. Rebase
 // only onto the same straight confirmed segment containing the drawn point,
 // or its already allowed final100ms continuation when it has overshot;
 // real corners, reversals, relocations and off-path corrections still win.
 if(extrapolated&&!buffer.pendingCanonical&&!resumed&&last.serverAt>extrapolated.sourceAt&&Number.isFinite(priorPlayhead)&&Number.isFinite(shown?.x)&&Number.isFinite(shown?.y)){
  const advance=Math.max(0,buffer.playheadR72-priorPlayhead),velocity=Math.hypot(extrapolated.vx,extrapolated.vy);
  const anchor=samples.findIndex(s=>s.serverAt===extrapolated.sourceAt&&s.x===extrapolated.x&&s.y===extrapolated.y);
  for(let i=anchor+1;anchor>=0&&i<samples.length;i++){
   const a=samples[i-1],b=samples[i],duration=b.serverAt-a.serverAt,dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
   if(a.stopped||b.stopped||duration<=0||duration>250||length<.001||velocity<=0)break;
   const dot=(dx*extrapolated.vx+dy*extrapolated.vy)/(length*velocity);
   if(dot<1-1e-6)break;
   const t=((shown.x-a.x)*dx+(shown.y-a.y)*dy)/(length*length);
   if(t<0||Math.hypot(shown.x-a.x-dx*t,shown.y-a.y-dy*t)>.0001)break;
   let coveredAt=a.serverAt+t*duration,ceiling=last.serverAt;
   if(t>1){
    // Only the final moving segment may transfer an already drawn forecast.
    // Use its capped velocity and spend, rather than renew, its finite budget.
    // A real earlier turning point or a point outside this envelope still
    // requires ordinary reconciliation to the new authoritative path.
    if(i!==samples.length-1)continue;
    const speed=Math.min(length/duration,.285*(speedMultiplier===1.25?1.25:1)),ahead=(t-1)*length/speed;
    if(!Number.isFinite(ahead)||ahead>100)break;
    coveredAt=b.serverAt+ahead;ceiling=b.serverAt+100;
   }
   if(coveredAt>priorPlayhead)buffer.playheadR72=Math.max(buffer.playheadR72,Math.min(ceiling,coveredAt+advance));
   break;
  }
 }
 buffer.playheadAtR72=Math.max(buffer.playheadAtR72??now,now);
 const playback=buffer.playheadR72;
 // The old predictor jumped straight to every newly arrived endpoint, then
 // raced at 300px/s and stopped. Sample source time, not arrival order, so
 // 20Hz network points form one continuous path on a 60/120Hz canvas.
 for(let i=1;i<samples.length;i++){
  const b=samples[i],a=samples[i-1];
  if(b.serverAt<playback)continue;
  const duration=b.serverAt-a.serverAt;
  if(duration<=0||duration>250)return {x:b.x,y:b.y};
  const t=Math.max(0,Math.min(1,(playback-a.serverAt)/duration));
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
 }
 if(last.stopped)return point;
 let vx=(last.x-previous.x)/gap,vy=(last.y-previous.y)/gap;
 const speed=Math.hypot(vx,vy),limit=.285*(speedMultiplier===1.25?1.25:1);
 if(!Number.isFinite(speed))return point;
 // A tiny acknowledged-position correction can put a 50ms pair just above
 // the visual velocity cap. Clamp that cosmetic estimate instead of disabling
 // prediction for an entire packet, which made walking freeze periodically.
 if(speed>limit){vx*=limit/speed;vy*=limit/speed;}
 // Preserve the existing maximum speculative distance (100ms), including
 // under silence. Stop samples and authoritative relocations still win.
 const ahead=Math.max(0,Math.min(100,playback-last.serverAt));
 if(ahead>0&&!buffer.pendingCanonical)buffer.extrapolatedR72={sourceAt:last.serverAt,x:last.x,y:last.y,vx,vy};
 return {x:last.x+vx*ahead,y:last.y+vy*ahead};
}

// On restart only one confirmed point may be available. Spread that known
// displacement over a finite 150ms arrival budget, matching the largest normal
// presentation interval. This briefly softens startup; a second point switches
// to the normal timeline. Never extrapolate a one-point stream.
export function firstMotionTargetR72(state,buffer,now){
 const sample=buffer?.samples.at(-1);
 if(buffer?.samples.length!==1||sample.stopped||now-state.lastAt>250){delete state.firstPointR72;return null;}
 let first=state.firstPointR72;
 if(!first||first.buffer!==buffer){
  const seed=Math.min(16.667,Math.max(0,now-state.lastAt)),started=Math.max(now,Number.isFinite(sample.receivedAt)?sample.receivedAt:now);
  // RAF's timestamp can precede delivery even though its callback already has
  // the packet. Do not consume the arrival budget during that invisible gap.
  // An immediate fractional step uses a bounded seed, without shortening the
  // finite deadline: absent another point, hold exactly at started + 150ms.
  first={buffer,x:state.motion.x,y:state.motion.y,at:started-seed,duration:150+seed};state.firstPointR72=first;
 }
 const t=Math.max(0,Math.min(1,(now-first.at)/first.duration));
 // Carry the confirmed approach's clock into the two-point timeline. Starting
 // that clock afresh behind the first sample would hold the endpoint again
 // when the next packet arrives after 100ms, despite known forward movement.
 buffer.playheadR72=Math.max(buffer.playheadR72??-Infinity,sample.serverAt-(1-t)*50);
 buffer.playheadAtR72=now;
 return {x:first.x+(sample.x-first.x)*t,y:first.y+(sample.y-first.y)*t};
}
