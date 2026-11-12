// Presentation only. Use known, validated endpoints, never extrapolation.
// Eight recent arrivals bound both work and the lifetime of a jitter spike.
export function tuneMotionBufferR43(buffer){
 const samples=buffer.samples.slice(-8);let cadence=0,jitter=0;
 for(let i=0;i<samples.length;i++){
  const sample=samples[i];jitter=Math.max(jitter,sample.receivedAt-sample.serverAt-buffer.offset);
  if(i)cadence=Math.max(cadence,sample.receivedAt-samples[i-1].receivedAt,sample.serverAt-samples[i-1].serverAt);
 }
 buffer.playbackDelay=Math.max(35,Math.min(350,Math.max(cadence+5,jitter+35)));
}
export function bufferedMotionPositionR43(buffer,now){
 if(!buffer?.samples.length)return null;
 const samples=buffer.samples,last=samples.at(-1);if(now-last.receivedAt>600)return null;
 if(buffer.pendingCanonical&&now>=buffer.pendingCanonical.expiresAt)return {x:buffer.pendingCanonical.x,y:buffer.pendingCanonical.y};
 const desired=now-buffer.offset-(buffer.playbackDelay??35);
 if(buffer.playback===undefined)buffer.playback=Math.min(last.serverAt,desired);
 else if(now>(buffer.playbackAt??now)){
  const elapsed=Math.min(250,now-buffer.playbackAt),normal=buffer.playback+elapsed;
  // Drain excess delay gradually after delivery recovers. Never rewind the
  // presentation clock; the unchanged follower still caps travel at 600px/s.
  const correction=Math.max(-elapsed*.1,Math.min(elapsed*.2,desired-normal));
  buffer.playback=Math.min(last.serverAt,Math.max(buffer.playback,normal+correction));
 }
 buffer.playbackAt=Math.max(buffer.playbackAt??now,now);
 for(let i=1;i<samples.length;i++){
  const b=samples[i],a=samples[i-1];if(b.serverAt<buffer.playback)continue;
  const t=Math.max(0,Math.min(1,(buffer.playback-a.serverAt)/Math.max(1,b.serverAt-a.serverAt)));
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
 }
 return {x:last.x,y:last.y};
}
