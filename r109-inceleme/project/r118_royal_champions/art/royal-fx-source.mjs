// Shared bounded white/gold VFX. No particle arrays, timers, filters or peractor atlases.
let royalFxAtlasR118;
const royalFxBudgetsR118=new WeakMap();
function royalAtlasR118(){
 if(royalFxAtlasR118)return royalFxAtlasR118;
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=192;canvas.height=128;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 const gradient=ctx.createRadialGradient(64,64,1,64,64,62);
 gradient.addColorStop(0,'rgba(255,251,225,.88)');
 gradient.addColorStop(.14,'rgba(250,233,173,.60)');
 gradient.addColorStop(.46,'rgba(212,169,81,.28)');
 gradient.addColorStop(1,'rgba(122,84,32,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 ctx.strokeStyle='rgba(255,244,203,.95)';ctx.lineWidth=1.4;
 ctx.beginPath();ctx.moveTo(158,39);ctx.lineTo(161,54);ctx.lineTo(174,58);
 ctx.lineTo(161,62);ctx.lineTo(158,77);ctx.lineTo(155,62);
 ctx.lineTo(142,58);ctx.lineTo(155,54);ctx.closePath();ctx.stroke();
 royalFxAtlasR118=canvas;return canvas;
}
function royalFrameR118(ctx,now,quality,own){
 if(!(quality>0)||!Number.isFinite(now))return null;
 const tick=Math.floor(now/16);let frame=royalFxBudgetsR118.get(ctx);
 if(!frame){frame={tick,used:0,limit:96};royalFxBudgetsR118.set(ctx,frame);}
 else if(frame.tick!==tick){frame.tick=tick;frame.used=0;}
 frame.limit=quality<.75?48:96;
 return frame.used<(own?frame.limit:frame.limit-16)?frame:null;
}
function royalPuffR118(ctx,atlas,frame,x,y,w,h,alpha){
 if(frame.used>=frame.limit)return;frame.used++;ctx.globalAlpha=alpha;
 ctx.drawImage(atlas,0,0,128,128,x-w/2,y-h/2,w,h);
}
export function drawRoyalArmorFxR118(ctx,x,y,now,quality=1,own=false){
 if(!Number.isFinite(x)||!Number.isFinite(y))return;
 const frame=royalFrameR118(ctx,now,quality,own);if(!frame)return;
 const atlas=royalAtlasR118();if(!atlas)return;
 const count=quality<.75?1:3;
 ctx.save();ctx.filter='none';ctx.shadowBlur=0;ctx.globalCompositeOperation='lighter';
 royalPuffR118(ctx,atlas,frame,x,y+7,104,30,.30);
 for(let i=0;i<count;i++){
  const phase=(now/2900+i/count)%1,side=i%2?-1:1;
  royalPuffR118(ctx,atlas,frame,x+side*(20+phase*13)+Math.sin(now/1050+i*2.4)*4,
   y-19-phase*84,30+phase*26,46+phase*30,Math.sin(phase*Math.PI)*.37);
 }
 ctx.globalAlpha=.58;ctx.strokeStyle='#efd8a3';ctx.lineWidth=1;
 ctx.beginPath();ctx.ellipse(x,y+8,37,10,0,now/3200,now/3200+1.9);ctx.stroke();
 if(frame.used<frame.limit){frame.used++;ctx.globalAlpha=.65;ctx.drawImage(atlas,138,35,40,46,x-5,y-58-Math.sin(now/1000)*6,10,12);}
 ctx.restore();
}
export function drawRoyalWeaponFxR118(ctx,x,y,w,h,now,quality=1,role='muhafiz',own=false){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return;
 const frame=royalFrameR118(ctx,now,quality,own);if(!frame)return;
 const atlas=royalAtlasR118();if(!atlas)return;
 const count=quality<.75?1:3;
 ctx.save();ctx.filter='none';ctx.shadowBlur=0;ctx.globalCompositeOperation='lighter';
 for(let i=0;i<count;i++){
  const phase=(now/1850+i/count)%1;
  const px=x+w*(role==='avci'?.50+Math.sin(phase*Math.PI*2)*.12:.50);
  royalPuffR118(ctx,atlas,frame,px,y+h*(.13+phase*.63),w*.27,h*.25,.22+Math.sin(phase*Math.PI)*.24);
 }
 if(frame.used<frame.limit){frame.used++;ctx.globalAlpha=.7;ctx.drawImage(atlas,138,35,40,46,x+w*.49-5,y+h*.13-7,10,14);}
 ctx.restore();
}
