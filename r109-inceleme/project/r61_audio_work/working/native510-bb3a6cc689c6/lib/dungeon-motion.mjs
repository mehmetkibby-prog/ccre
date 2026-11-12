import {DUNGEON_WORLD} from './dungeon-maps.mjs';
import {advanceRemoteMotion} from './remote-motion.ts';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// The displayed local position advances on every game frame. A response only
// supplies a correction; it never restarts movement from an old snapshot.
export class DungeonMotion {
 travel=0;epoch=0;error={x:0,y:0};
 constructor(x,y){this.x=x;this.y=y;this.remote={x,y,targetX:x,targetY:y,vx:0,vy:0,sampleAt:0,area:'dungeon',travel:0};}
 accept(x,y,velocity,leadMs,local){
  const tx=clamp(x+velocity.x*leadMs/1000,DUNGEON_WORLD.minX,DUNGEON_WORLD.maxX),ty=clamp(y+velocity.y*leadMs/1000,DUNGEON_WORLD.minY,DUNGEON_WORLD.maxY);
  if(local)this.error={x:tx-this.x,y:ty-this.y};
  else{this.remote.targetX=tx;this.remote.targetY=ty;}
 }
 advance(dt,input,local,speed=Number(DUNGEON_WORLD.speed)){
  const seconds=Math.min(.1,Math.max(0,dt)),oldX=this.x,oldY=this.y;
  if(local){
   const moving=Math.hypot(input.x,input.y)>.01;
   const distance=Math.hypot(this.error.x,this.error.y);
   const step=Math.min(distance*(1-Math.exp(-seconds*10)),(moving?45:320)*seconds);
   const cx=distance?this.error.x/distance*step:0,cy=distance?this.error.y/distance*step:0;
   this.x=clamp(this.x+input.x*speed*seconds+cx,DUNGEON_WORLD.minX,DUNGEON_WORLD.maxX);
   this.y=clamp(this.y+input.y*speed*seconds+cy,DUNGEON_WORLD.minY,DUNGEON_WORLD.maxY);
   this.error.x-=cx;this.error.y-=cy;
  }else{advanceRemoteMotion(this.remote,seconds,true);this.x=this.remote.x;this.y=this.remote.y;}
  const distance=Math.hypot(this.x-oldX,this.y-oldY);this.travel+=distance;return distance;
 }
}

export function dungeonPollDelay(active,ready,open,elapsed){
 return active&&!ready?Math.max(20,100-elapsed):ready?750:open?1500:5000;
}
