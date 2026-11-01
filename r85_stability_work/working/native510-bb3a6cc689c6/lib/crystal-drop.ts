// Grounded loot: one brief landing, then a stable chest with a cheap light ring.
export function drawCrystalChestDrop(ctx:CanvasRenderingContext2D,drop:{x:number;y:number;amount?:number},elapsed:number,image:HTMLImageElement|undefined,compact:boolean,simplified=false){
  const t=Math.max(0,elapsed),landing=460;
  const lift=t<landing?48*(1-(t/landing)**2):t<760?Math.sin((t-landing)/300*Math.PI)*9:0;
  const squash=t>=landing&&t<580?Math.sin((t-landing)/120*Math.PI)*.09:0;
  ctx.save();ctx.translate(drop.x,drop.y);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(0,3,29-lift*.15,10-lift*.045,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(106,238,192,.38)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,2,34,12,0,0,Math.PI*2);ctx.stroke();
  if(t>=landing&&t<1000){const impact=(t-landing)/540;ctx.globalAlpha=1-impact;ctx.strokeStyle='#9affd9';ctx.beginPath();ctx.ellipse(0,3,30+impact*24,11+impact*8,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  ctx.save();ctx.translate(0,-lift);ctx.scale(1+squash,1-squash);
  if(image?.complete&&image.naturalWidth)ctx.drawImage(image,-43,-77,86,86);
  ctx.restore();
  const count=simplified?0:compact?2:4;for(let i=0;i<count;i++){const p=(t/1800+i/count)%1;ctx.globalAlpha=.35*Math.sin(p*Math.PI);ctx.fillStyle=i%2?'#ffe3a0':'#98ffd7';ctx.fillRect(Math.sin(i*2.3)*25,-18-p*54,2,3);}ctx.globalAlpha=1;
  ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.8)';const label=(drop.amount??1)>1?`Kristal Sandığı ×${drop.amount}`:'Kristal Sandığı';ctx.strokeText(label,0,23);ctx.fillStyle='#caffdf';ctx.fillText(label,0,23);ctx.restore();
}

export function drawMoonlightChestDrop(ctx:CanvasRenderingContext2D,drop:{x:number;y:number;amount?:number},elapsed:number,image:HTMLImageElement|undefined,compact:boolean){
 const lift=Math.max(0,32*(1-Math.min(1,elapsed/420)));
 ctx.save();ctx.translate(drop.x,drop.y);
 ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.ellipse(0,4,28,9,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='rgba(237,211,124,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,3,34,12,0,0,Math.PI*2);ctx.stroke();
 if(image?.complete&&image.naturalWidth)ctx.drawImage(image,-40,-77-lift,80,80);
 else{ctx.fillStyle='#d3a94d';ctx.fillRect(-24,-46-lift,48,34);ctx.fillStyle='#f7e2a0';ctx.fillRect(-23,-49-lift,46,8);}
 ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.85)';
 const label=(drop.amount??1)>1?`Ayışığı Sandığı ×${drop.amount}`:'Ayışığı Sandığı';
 ctx.strokeText(label,0,23);ctx.fillStyle='#ffe8a6';ctx.fillText(label,0,23);ctx.restore();
}
