// Shared footprint for the Kadim Kök Vadisi Life Core. Keep HTTP and realtime
// movement on the same geometry, including long segments crossing its center.
export const ANCIENT_CORE = Object.freeze({x:1800,y:1800});
// The guardian stands just north of the impassable Life Core, on the central dais.
export const ANCIENT_BOSS_SPAWN = Object.freeze({x:1800,y:1650});
export const ANCIENT_CORE_OBSTACLE = Object.freeze({x:1800,y:1820,radiusX:76,radiusY:48});
export function insideAncientCore(x,y){
 const c=ANCIENT_CORE_OBSTACLE;
 return ((x-c.x)/c.radiusX)**2+((y-c.y)/c.radiusY)**2<1;
}
export function ancientCoreSegment(fromX,fromY,toX,toY){
 const c=ANCIENT_CORE_OBSTACLE,ax=(fromX-c.x)/c.radiusX,ay=(fromY-c.y)/c.radiusY;
 const dx=(toX-fromX)/c.radiusX,dy=(toY-fromY)/c.radiusY,squared=dx*dx+dy*dy;
 if(![ax,ay,dx,dy].every(Number.isFinite))return false;
 const start=ax*ax+ay*ay,dot=ax*dx+ay*dy;
 if(start<1)return dot>=0;
 const t=squared?Math.max(0,Math.min(1,-dot/squared)):0;
 return (ax+t*dx)**2+(ay+t*dy)**2>=1;
}
