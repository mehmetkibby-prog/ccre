export const LEVEL_UP_DURATION=3000;
export function levelUpProgress(now:number,until:number){
 const elapsed=LEVEL_UP_DURATION-(until-now);
 return until>0&&elapsed>=0&&elapsed<LEVEL_UP_DURATION?elapsed/LEVEL_UP_DURATION:null;
}
export function drawLevelUpEffect(ctx:CanvasRenderingContext2D,x:number,y:number,now:number,until:number,_level:number,compact=false,_zoom=1,reducedMotion=false){
 const t=levelUpProgress(now,until);if(t===null)return;
 const fade=Math.min(1,t*14)*Math.min(1,(1-t)*4);
 const expand=1-Math.pow(1-Math.min(1,t/.6),3);
 ctx.save();ctx.translate(x,y+8);ctx.lineCap='round';
 // Keep the feet fixed, with a broad crest and two outward gold shock rings.
 if(!reducedMotion){
  ctx.globalAlpha=fade*.13;ctx.fillStyle='#e9d88b';ctx.beginPath();ctx.ellipse(0,0,68,25,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<2;i++){
   const p=Math.max(0,Math.min(1,(t-i*.13)/.65));if(p<=0||p>=1)continue;
   ctx.globalAlpha=fade*(1-p)*.9;ctx.strokeStyle=i?'#fff6d4':'#ecc765';ctx.lineWidth=i?2.5:4;
   ctx.beginPath();ctx.ellipse(0,0,36+p*106,14+p*34,0,0,Math.PI*2);ctx.stroke();
  }
  ctx.globalAlpha=fade*.85;ctx.strokeStyle='#e8c66f';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(0,0,57,20,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4;const r=59;
   ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*21);ctx.lineTo(Math.cos(a)*(r+10),Math.sin(a)*25);ctx.stroke();
  }
  // Soft overlapping shafts avoid blur filters and per-frame texture allocation.
  for(let i=0;i<4;i++){
   const w=22+i*12,h=135+expand*38;
   ctx.globalAlpha=fade*(.045-i*.006);ctx.fillStyle=i%2?'#f3dfa1':'#80e5ac';
   ctx.beginPath();ctx.moveTo(-w,0);ctx.lineTo(-w*.6,-h);ctx.lineTo(w*.6,-h);ctx.lineTo(w,0);ctx.closePath();ctx.fill();
  }
  const count=compact?14:24;
  for(let i=0;i<count;i++){
   const p=(t*1.65+i/count)%1,angle=i*2.399+t*3.5;
   const r=31+Math.sin(p*Math.PI)*33,px=Math.cos(angle)*r,py=-p*145+Math.sin(angle)*10;
   const size=1.5+Math.sin(i*7.1)**2*2.1;
   ctx.globalAlpha=fade*Math.sin(p*Math.PI)*.95;ctx.fillStyle=i%3?'#ffe6a3':'#d4ffe5';
   ctx.beginPath();ctx.moveTo(px,py-size*2.2);ctx.lineTo(px+size,py);ctx.lineTo(px,py+size*2.2);ctx.lineTo(px-size,py);ctx.closePath();ctx.fill();
  }
 }
 // Reduced-motion players still see a quiet crest, never a text banner.
 if(reducedMotion){ctx.globalAlpha=fade*.65;ctx.strokeStyle='#e8d495';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,66,24,0,0,Math.PI*2);ctx.stroke();}
 ctx.restore();
}
