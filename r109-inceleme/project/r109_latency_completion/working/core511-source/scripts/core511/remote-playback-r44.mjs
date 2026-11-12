import {bufferedMotionPositionR43} from './remote-playback-r43.mjs';
// Visual dead reckoning only. No world/player row, movement budget, command,
// checkpoint or hit test is written here. At most 60ms / 17.1px beyond the last
// validated endpoint; silence never extends that bound.
export function lowLatencyMotionPosition(buffer,now,speedMultiplier=1){
 const samples=buffer?.samples,last=samples?.at(-1);
 if(!last)return null;
 // Silence holds this bounded endpoint; timer expiry alone must not rewind it.
 // A fresh canonical update, death or scope change still wins in RemoteMovement.
 if(buffer.pendingCanonical)return bufferedMotionPositionR43(buffer,now);
 const point={x:last.x,y:last.y};
 if(last.stopped||samples.length<2)return point;
 const previous=samples.at(-2),dt=last.serverAt-previous.serverAt;
 // Sparse checkpoints are not a velocity stream. Retain their old playback.
 if(dt<10||dt>90)return bufferedMotionPositionR43(buffer,now);
 const vx=(last.x-previous.x)/dt,vy=(last.y-previous.y)/dt,speed=Math.hypot(vx,vy);
 if(!Number.isFinite(speed)||speed>.285001*(speedMultiplier===1.25?1.25:1))return point;
 const ahead=Math.max(0,Math.min(60,now-buffer.offset-last.serverAt));
 return {x:last.x+vx*ahead,y:last.y+vy*ahead};
}
// A shorter buffer must not turn corrections into a 600px/s catch-up sprint.
// This cap affects display coordinates only and is independent of frame rate.
export function advanceLowLatencyMotion(motion,seconds,speedMultiplier=1){
 const dx=motion.targetX-motion.x,dy=motion.targetY-motion.y,distance=Math.hypot(dx,dy);
 const travel=Math.min(distance,300*(speedMultiplier===1.25?1.25:1)*Math.max(0,seconds));
 if(distance>0){motion.x+=dx*travel/distance;motion.y+=dy*travel/distance;}
 motion.travel+=travel;return travel;
}
