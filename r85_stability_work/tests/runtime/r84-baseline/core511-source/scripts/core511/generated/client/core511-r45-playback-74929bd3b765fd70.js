// One source-time timeline, including checkpoint/preview reordering and a
// missed 20Hz slot. A pending checkpoint must never switch a moving preview
// backwards to the delayed R43 clock. RemoteMovement still owns checkpoint
// expiry, sequence floors, control, death, scope and authoritative correction.
export function continuousMotionPosition(buffer,now){
 const samples=buffer?.samples,last=samples?.at(-1);
 if(!last)return null;
 const point={x:last.x,y:last.y};
 if(last.stopped||samples.length<2)return point;
 const previous=samples.at(-2),dt=last.serverAt-previous.serverAt;
 if(dt<10||dt>250)return point;
 const vx=(last.x-previous.x)/dt,vy=(last.y-previous.y)/dt,speed=Math.hypot(vx,vy);
 if(!Number.isFinite(speed)||speed>.285001)return point;
 // A visual-only, bounded bridge across one skipped source packet (100ms).
 // It never grants a move, changes a hit position, or continues through a
 // sustained silence. An explicit stop disables extrapolation immediately.
 const ahead=Math.max(0,Math.min(100,now-buffer.offset-last.serverAt));
 return {x:last.x+vx*ahead,y:last.y+vy*ahead};
}
