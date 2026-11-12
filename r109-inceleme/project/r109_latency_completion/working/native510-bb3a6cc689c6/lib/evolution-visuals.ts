const haloCache=new Map<number,HTMLCanvasElement>();
export const EVOLUTION_COLORS=["", "#f5f7ff", "#6bbaff", "#cf87ff"];
const COLORS=EVOLUTION_COLORS;
function halo(tier:number){
  const cached=haloCache.get(tier);if(cached)return cached;
  if(typeof document==="undefined")return null;
  const c=document.createElement("canvas");c.width=c.height=96;const g=c.getContext("2d");if(!g)return null;
  const gradient=g.createRadialGradient(48,48,1,48,48,48);gradient.addColorStop(0,"#ffffff");gradient.addColorStop(.12,COLORS[tier]);gradient.addColorStop(.4,COLORS[tier]+"70");gradient.addColorStop(1,COLORS[tier]+"00");g.fillStyle=gradient;g.fillRect(0,0,96,96);haloCache.set(tier,c);return c;
}
export function evolutionParticleBudget(level:number,scale:number){const tier=Math.max(1,Math.min(3,level));return scale<.3?2+tier:scale<1?4+tier*2:6+tier*5;}
export function drawEvolutionGlow(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,level:number,scale:number,now:number){
  const tier=Math.max(1,Math.min(3,level)),count=evolutionParticleBudget(tier,scale),image=halo(tier);
  ctx.save();ctx.shadowBlur=0;ctx.globalCompositeOperation="screen";
  const pulse=.8+Math.sin(now/440)*.12;
  // Atlas weapons run from lower-left grip to upper-right tip. The caller's
  // hand rotation/mirroring applies to this axis as well as the weapon image.
  const ax=x+size*.28,ay=y+size*.72,bx=x+size*.88,by=y+size*.10;
  const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
  if(image){
    ctx.save();ctx.translate((ax+bx)/2,(ay+by)/2);ctx.rotate(Math.atan2(dy,dx));
    // Broad, blade-aligned coloured aura plus a sharp luminous core. Reuse the
    // cached bitmap: no per-frame gradients, blur filters or particle timers.
    const width=size*(tier===3?.62:tier===2?.44:.32);
    ctx.globalAlpha=(.58+tier*.08)*pulse*(scale<.3?.72:1);
    ctx.drawImage(image,-length*.66,-width/2,length*1.32,width);
    ctx.globalAlpha=(.65+tier*.08)*pulse;
    ctx.drawImage(image,-length*.57,-size*.085,length*1.14,size*.17);
    ctx.restore();
  }
  ctx.strokeStyle=COLORS[tier];ctx.fillStyle="#fff9e4";
  for(let i=0;i<count;i++){
    const t=(i+.5)/count,phase=now/650+i*2.399,offset=Math.sin(phase)*(1+tier);
    const gx=ax+dx*t+nx*offset,gy=ay+dy*t+ny*offset;
    ctx.globalAlpha=.55+.4*Math.sin(phase)**2;const sparkle=1.3+tier*.65+(tier===3&&i%4===0?1.6:0);
    ctx.fillRect(gx-sparkle,gy-.7,sparkle*2,1.4);ctx.fillRect(gx-.7,gy-sparkle,1.4,sparkle*2);
  }
  ctx.globalAlpha=.4;ctx.lineWidth=.7+tier*.25;
  for(let strand=0;strand<tier;strand++){ctx.beginPath();for(let i=0;i<=12;i++){const t=i/12,o=Math.sin(t*Math.PI*3-now/500+strand*2)*(1+tier);const px=ax+dx*t+nx*o,py=ay+dy*t+ny*o;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.stroke();}
  ctx.restore();
}
