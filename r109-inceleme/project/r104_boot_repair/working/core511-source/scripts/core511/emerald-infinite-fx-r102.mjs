// One small texture atlas and a shared per-canvas frame budget. No growing
// particle lists, timers, canvas filters or per-player texture allocation.
let texture;
const frames=new WeakMap();
function atlas(){
 if(texture)return texture;
 const canvas=document.createElement('canvas');canvas.width=192;canvas.height=128;
 const g=canvas.getContext('2d');if(!g)return null;
 const glow=g.createRadialGradient(64,64,2,64,64,62);
 glow.addColorStop(0,'rgba(202,255,183,.78)');glow.addColorStop(.18,'rgba(76,255,141,.58)');glow.addColorStop(.48,'rgba(14,219,113,.27)');glow.addColorStop(1,'rgba(0,114,71,0)');
 g.fillStyle=glow;g.fillRect(0,0,128,128);
 g.strokeStyle='rgba(147,255,190,.8)';g.lineWidth=1.6;g.beginPath();g.moveTo(158,42);g.lineTo(161,55);g.lineTo(170,58);g.lineTo(161,61);g.lineTo(158,74);g.lineTo(155,61);g.lineTo(146,58);g.lineTo(155,55);g.closePath();g.stroke();
 texture=canvas;return texture;
}
function start(ctx,now,quality,own){
 if(!(quality>0)||!Number.isFinite(now))return null;
 let frame=frames.get(ctx);if(!frame){frame={now,used:0};frames.set(ctx,frame);}else if(frame.now!==now){frame.now=now;frame.used=0;}
 if(frame.used>=(own?96:80))return null;return frame;
}
function puff(ctx,a,frame,x,y,w,h,alpha){
 if(frame.used++>=96)return;ctx.globalAlpha=alpha;ctx.drawImage(a,0,0,128,128,x-w/2,y-h/2,w,h);
}
export function drawEmeraldInfiniteArmorR102(ctx,x,y,now,quality=1,own=false){
 const frame=start(ctx,now,quality,own);if(!frame||![x,y].every(Number.isFinite))return;const a=atlas();if(!a)return;
 const reduced=quality<.75,count=reduced?2:4;
 ctx.save();ctx.filter='none';ctx.shadowBlur=0;ctx.globalCompositeOperation='lighter';
 puff(ctx,a,frame,x,y+7,106,33,.4);
 for(let i=0;i<count;i++){
  const phase=(now/2600+i/count)%1,side=i%2?-1:1,fade=Math.sin(phase*Math.PI);
  puff(ctx,a,frame,x+side*(25+phase*11)+Math.sin(now/800+i*2)*5,y-16-phase*92,38+phase*22,60+phase*24,.5*fade);
 }
 ctx.globalAlpha=.55;ctx.strokeStyle='#70ffad';ctx.lineWidth=1.2;
 ctx.beginPath();ctx.ellipse(x,y+9,40,12,0,now/2500,now/2500+1.4);ctx.stroke();
 ctx.restore();
}
export function drawEmeraldInfiniteWeaponR102(ctx,x,y,w,h,now,quality=1,role='muhafiz',own=false){
 const frame=start(ctx,now,quality,own);if(!frame||![x,y,w,h].every(Number.isFinite))return;const a=atlas();if(!a)return;
 const count=quality<.75?2:4;
 ctx.save();ctx.filter='none';ctx.shadowBlur=0;ctx.globalCompositeOperation='lighter';
 for(let i=0;i<count;i++){
  const phase=(now/1700+i/count)%1;
  const px=x+w*(role==='avci'?.52+Math.sin(phase*Math.PI*2)*.14:.51),py=y+h*(.12+phase*.64);
  puff(ctx,a,frame,px,py,w*.3,h*.32,.30+Math.sin(phase*Math.PI)*.24);
 }
 ctx.globalAlpha=.7;ctx.drawImage(a,140,38,36,42,x+w*.49-5,y+h*.16-7,10,14);frame.used++;
 ctx.restore();
}
