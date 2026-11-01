type Point = {x:number;y:number};
export type GuardianVisual = {ability:number;attackerId:string;actorId?:string;targetId?:string;eventId?:string;casterPoint?:Point;from:Point;to:Point;targetPoint:Point;started:number};
export type GuardianPullVisual = {targetId:string;from:Point;to:Point;started:number;spawnRound?:number};
export const GUARDIAN_LEAP_MS=480;
export const GUARDIAN_PULL_VISUAL_MS=240;
export function guardianLeapLift(effects:GuardianVisual[],id:string,now:number) {
  const e=effects.findLast(e=>e.ability===2&&e.attackerId===id&&now>=e.started&&now-e.started<GUARDIAN_LEAP_MS);
  return e ? Math.sin((now-e.started)/GUARDIAN_LEAP_MS*Math.PI)*72 : 0;
}
export function drawGuardianEffects(ctx:CanvasRenderingContext2D,effects:GuardianVisual[],now:number) {
  for(const e of effects) {
    const t=Math.max(0,Math.min(1,(now-e.started)/800));ctx.save();ctx.globalAlpha=1-t;
    ctx.strokeStyle="#ffe4a2";ctx.fillStyle="#556f80";ctx.lineWidth=3;
    if(e.ability===1) {
      const u=t<.35?t/.35:Math.max(0,1-(t-.35)/.65);
      const start=e.casterPoint??e.to,end=e.targetPoint;
      const x=start.x+(end.x-start.x)*u,y=start.y+(end.y-start.y)*u-34;
      const dx=x-start.x,dy=y-(start.y-34),length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
      // Bounded interlocking links remain visible without shadow blur on mobile.
      const links=Math.min(40,Math.ceil(length/14));
      ctx.save();ctx.translate(start.x,start.y-34);ctx.rotate(angle);
      for(let i=0;i<links;i++){ctx.beginPath();ctx.ellipse((i+.5)*length/Math.max(1,links),0,7,i%2?2:4,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
      ctx.translate(x,y);ctx.rotate(Math.sin(t*Math.PI)*.6);ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(-17,-21);ctx.lineTo(17,-21);ctx.lineTo(14,6);ctx.lineTo(0,24);ctx.lineTo(-14,6);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle="#efc568";ctx.fillRect(-2,-13,4,23);ctx.fillRect(-10,-5,20,4);
    } else {
      ctx.lineWidth=7*(1-t)+1;ctx.beginPath();ctx.moveTo(e.from.x,e.from.y-12);ctx.quadraticCurveTo((e.from.x+e.to.x)/2,(e.from.y+e.to.y)/2-105,e.to.x,e.to.y-12);ctx.stroke();
      if(now-e.started>=GUARDIAN_LEAP_MS){const land=(now-e.started-GUARDIAN_LEAP_MS)/(800-GUARDIAN_LEAP_MS);ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(e.to.x,e.to.y+12,18+land*72,7+land*28,0,0,Math.PI*2);ctx.stroke();}
    }
    ctx.restore();
  }
}
export function guardianRenderPoint(effects:GuardianVisual[],id:string,fallback:Point,now:number) {
  const e=effects.findLast(e=>e.ability===2&&e.attackerId===id&&now>=e.started&&now-e.started<GUARDIAN_LEAP_MS);
  if(!e)return fallback;
  const t=(now-e.started)/GUARDIAN_LEAP_MS,eased=t*t*(3-2*t);
  return {x:e.from.x+(e.to.x-e.from.x)*eased,y:e.from.y+(e.to.y-e.from.y)*eased-Math.sin(t*Math.PI)*72};
}

// The server position is already authoritative; only the sprite travels from
// the last displayed point to that position after a confirmed player pull.
export function guardianPullRenderPoint(effects:GuardianPullVisual[],id:string,fallback:Point,now:number,spawnRound?:number) {
  const e=effects.findLast(effect=>effect.targetId===id&&(spawnRound===undefined||effect.spawnRound===spawnRound)
    &&now>=effect.started&&now-effect.started<GUARDIAN_PULL_VISUAL_MS);
  if(!e)return fallback;
  const t=(now-e.started)/GUARDIAN_PULL_VISUAL_MS,eased=t*t*(3-2*t);
  return {x:e.from.x+(e.to.x-e.from.x)*eased,y:e.from.y+(e.to.y-e.from.y)*eased};
}

// Preview only the monster's presentation. Authoritative displacement remains
// the server's guardian_control event and never enters targeting coordinates.
export function guardianMonsterRenderPoint(effects:GuardianVisual[],id:string,fallback:Point,now:number){
 const e=effects.findLast(effect=>effect.ability===1&&effect.targetId===id&&now>=effect.started&&now-effect.started<850);
 if(!e)return fallback;
 const from=e.from,to=e.casterPoint??e.to,length=Math.hypot(to.x-from.x,to.y-from.y);
 if(!Number.isFinite(length)||length<1)return fallback;
 const distance=Math.min(720,Math.max(0,length-65));
 const age=now-e.started,t=Math.min(1,age/220),eased=t*t*(3-2*t);
 const preview={x:from.x+(to.x-from.x)/length*distance*eased,y:from.y+(to.y-from.y)/length*distance*eased};
 // Hold the travel while its hit is in flight. On rejection or a lost result,
 // blend back before the bounded preview expires instead of snapping backward.
 if(age<=620)return preview;
 const settle=Math.min(1,(age-620)/230),smooth=settle*settle*(3-2*settle);
 return {x:preview.x+(fallback.x-preview.x)*smooth,y:preview.y+(fallback.y-preview.y)*smooth};
}
