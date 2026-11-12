// Ground footprint, including the player's feet. Shared by client, HTTP and socket.
export const FOREST_CORE_OBSTACLE = Object.freeze({x:2700,y:1707.5,radiusX:76,radiusY:48});
export function insideForestCore(x,y){const c=FOREST_CORE_OBSTACLE;return ((x-c.x)/c.radiusX)**2+((y-c.y)/c.radiusY)**2<1;}
export function forestCoreSegment(fromX,fromY,toX,toY){
 const c=FOREST_CORE_OBSTACLE,ax=(fromX-c.x)/c.radiusX,ay=(fromY-c.y)/c.radiusY;
 const dx=(toX-fromX)/c.radiusX,dy=(toY-fromY)/c.radiusY,squared=dx*dx+dy*dy;
 if(![ax,ay,dx,dy].every(Number.isFinite))return false;
 const start=ax*ax+ay*ay,dot=ax*dx+ay*dy;
 // Someone standing here before the update may walk out, never deeper in.
 if(start<1)return dot>=0;
 const t=squared?Math.max(0,Math.min(1,-dot/squared)):0;
 return (ax+t*dx)**2+(ay+t*dy)**2>=1;
}
