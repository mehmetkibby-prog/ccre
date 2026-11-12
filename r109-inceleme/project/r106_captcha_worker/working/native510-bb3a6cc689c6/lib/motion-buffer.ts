// Interpolate validated samples on their sender timeline. Arrival jitter must
// not alternate a peer between running and standing on every network callback.
export type MotionSample={x:number;y:number;serverAt:number;receivedAt:number;streamId:string;sequence?:number;sourceClock?:boolean};
export type MotionBuffer={
 samples:MotionSample[];offset:number;streamId:string;
 arrivalGap?:number;playbackDelay?:number;playback?:number;playbackAt?:number;sourceClock?:boolean;
 pendingCanonical?:{sequence:number;x:number;y:number;expiresAt:number};
};
function freshMotionBuffer(sample:MotionSample):MotionBuffer {
 return {samples:[sample],offset:sample.receivedAt-sample.serverAt,streamId:sample.streamId,sourceClock:!!sample.sourceClock};
}
export function appendMotionSample(buffer:MotionBuffer|undefined,sample:MotionSample):MotionBuffer{
 if(!buffer||buffer.streamId!==sample.streamId||!!buffer.sourceClock!==!!sample.sourceClock
   ||(buffer.pendingCanonical&&sample.receivedAt>=buffer.pendingCanonical.expiresAt))return freshMotionBuffer(sample);
 const last=buffer.samples.at(-1)!;if(sample.serverAt<last.serverAt)return buffer;
 // Do not replay history from before a disconnect or a long idle interval.
 const gap=sample.receivedAt-last.receivedAt;
 // A stopped sender emits no idle frames. Resume from a fresh segment instead
 // of replaying that silent interval. Receive-only batching still has adjacent
 // source timestamps, so it retains the adaptive clock through network stalls.
 if(gap>600||(gap>200&&sample.serverAt-last.serverAt>200))return freshMotionBuffer(sample);
 if(buffer.pendingCanonical&&(sample.sequence??0)>buffer.pendingCanonical.sequence)delete buffer.pendingCanonical;
 // A lower delay updates the clock origin; late bursts cannot push playback back.
 buffer.offset=Math.min(buffer.offset,sample.receivedAt-sample.serverAt);
 if(sample.serverAt===last.serverAt)buffer.samples[buffer.samples.length-1]=sample;else buffer.samples.push(sample);
 if(buffer.samples.length>24)buffer.samples.splice(0,buffer.samples.length-24);
 if(gap>0)buffer.arrivalGap=Math.max(gap,(buffer.arrivalGap??1000/30)-gap*.01);
 // Healthy links retain 80 ms. Batched delivery learns a bounded deeper buffer;
 // compute this at packet arrival, never allocate/scan twice per rendered frame.
 const jitter=buffer.samples.reduce((max,s)=>Math.max(max,s.receivedAt-s.serverAt-buffer.offset),0);
 buffer.playbackDelay=Math.max(80,Math.min(180,Math.max(jitter+1000/30+10,(buffer.arrivalGap??1000/30)+10)));
 return buffer;
}
export function bufferedMotionPosition(buffer:MotionBuffer|undefined,now:number){
 if(!buffer?.samples.length)return null;const samples=buffer.samples,last=samples.at(-1)!;
 // A disconnected preview stream must yield to continuing HTTP authority.
 if(now-last.receivedAt>600)return null;
 // Canonical state is already applied to gameplay. Wait briefly only for an
 // overtaken presentation frame; a lost final stop still settles promptly.
 if(buffer.pendingCanonical&&now>=buffer.pendingCanonical.expiresAt)
  return {x:buffer.pendingCanonical.x,y:buffer.pendingCanonical.y};
 const desired=now-buffer.offset-(buffer.playbackDelay??80);
 if(buffer.playback===undefined)buffer.playback=Math.min(last.serverAt,desired);
 else if(now>(buffer.playbackAt??now)){
  const elapsed=Math.min(250,now-buffer.playbackAt!),normal=buffer.playback+elapsed;
  // Adapt without rewinding or sprinting to catch a newly arrived packet batch.
  // Underflow stops at the last validated sample, never a predicted position.
  const correction=Math.max(-elapsed*.10,Math.min(elapsed*.05,desired-normal));
  buffer.playback=Math.min(last.serverAt,Math.max(buffer.playback,normal+correction));
 }
 buffer.playbackAt=Math.max(buffer.playbackAt??now,now);
 const playback=buffer.playback;
 for(let i=1;i<samples.length;i++){const b=samples[i],a=samples[i-1];if(b.serverAt>=playback){const t=Math.max(0,Math.min(1,(playback-a.serverAt)/Math.max(1,b.serverAt-a.serverAt)));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}}
 return {x:last.x,y:last.y};
}

// Call only for an accepted, newer authoritative position revision. A covered
// sample still belongs to the bounded playback history when its exact position
// was confirmed. A checkpoint beyond the received stream (or a correction)
// must not wait behind an obsolete buffer for its 600 ms expiry.
export function reconcileMotionBuffer(buffer:MotionBuffer|undefined,
 checkpoint:{x:number;y:number;motionStreamId?:unknown;motionSequence?:unknown},
 retiredStreams:readonly string[]=[],now?:number):MotionBuffer|undefined {
 if(!buffer?.samples.length)return undefined;
 const last=buffer.samples.at(-1)!;
 const stream=checkpoint.motionStreamId,sequence=checkpoint.motionSequence;
 // Intermediate HTTP checkpoints intentionally omit the preview acknowledgement.
 // Their arrival alone cannot retire a newer stream or its playback history.
 if(typeof stream!=='string'||!/^[A-Za-z0-9-]{16,80}$/.test(stream)
   ||!Number.isSafeInteger(sequence)||Number(sequence)<1)return buffer;
 if(stream!==buffer.streamId&&retiredStreams.includes(stream))return buffer;
 if(stream!==buffer.streamId||!Number.isSafeInteger(last.sequence))return undefined;
 if(Number(sequence)<last.sequence!)return buffer;
 if(sequence===last.sequence&&Math.hypot(checkpoint.x-last.x,checkpoint.y-last.y)<.01)return buffer;
 if(Number(sequence)>last.sequence!&&Number.isFinite(now)&&now!-last.receivedAt<=600) {
  // A faster HTTP/backup acknowledgement is not a teleport. Do not discard
  // smooth history while the next validated preview is in flight. A real
  // same-sequence correction, new stream, death or map reset still wins now.
  buffer.pendingCanonical={sequence:Number(sequence),x:checkpoint.x,y:checkpoint.y,
   expiresAt:Math.min(buffer.pendingCanonical?.expiresAt??Infinity,now!+150)};
  return buffer;
 }
 return undefined;
}
