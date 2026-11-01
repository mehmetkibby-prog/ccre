// One tiny shared sprite; no blur filters, pixel reads, timers or particle objects.
let puff:HTMLCanvasElement|null=null;
const budgets=new WeakMap<CanvasRenderingContext2D,{left:number;petLeft:number;compact:boolean;quiet:boolean}>();
export function beginEmeraldFrame(ctx:CanvasRenderingContext2D,compact:boolean,heat=false,quiet=false){const left=compact?(heat?24:36):120;const petLeft=compact?(heat?6:24):60;const budget=budgets.get(ctx);if(budget){budget.left=left;budget.petLeft=petLeft;budget.compact=compact;budget.quiet=quiet;}else budgets.set(ctx,{left,petLeft,compact,quiet});}
function sprite(){
 if(puff)return puff;if(typeof document==='undefined')return null;
 const c=document.createElement('canvas');c.width=64;c.height=64;const g=c.getContext('2d');if(!g)return null;
 const light=g.createRadialGradient(32,32,0,32,32,31);light.addColorStop(0,'rgba(116,226,158,.5)');light.addColorStop(.42,'rgba(78,184,117,.26)');light.addColorStop(1,'rgba(44,143,91,0)');
 g.fillStyle=light;g.fillRect(0,0,64,64);return puff=c;
}
export function drawEmeraldMist(ctx:CanvasRenderingContext2D,x:number,y:number,now:number,seed=0,stars=false,compact=false,tail=false){
 const budget=budgets.get(ctx);if(budget&&(stars?budget.left:budget.petLeft)<=0)return;
 const image=sprite();if(!image)return;
 const small=budget?.compact??compact,quiet=budget?.quiet??false,count=quiet?1:tail?(small?5:6):small?3:5;
 ctx.save();ctx.translate(x,y);ctx.shadowBlur=0;
 for(let i=0;i<count;i++){
  if(budget&&(stars?budget.left--:budget.petLeft--)<=0)break;
  const p=quiet?.45:(now/2300+i/count+seed*.137)%1;
  const side=Math.sin(i*2.4+seed),w=tail?30+p*38:24+p*34;
  ctx.globalAlpha=quiet?(tail?.4:.18):Math.sin(p*Math.PI)*(tail?.95:.45);
  ctx.drawImage(image,side*(tail?5+p*12:10+p*15)-w/2,(tail?0:-8)-p*(tail?42:48)-w*.55,w,w*.8);
 }
 if(stars&&!quiet)for(let i=0;i<(small?3:5);i++){
  if(budget&&(stars?budget.left--:budget.petLeft--)<=0)break;
  const p=(now/1700+i*.23)%1,s=1.4+Math.sin(p*Math.PI)*1.4,px=Math.sin(i*2.7)*31,py=-16-p*58;
  ctx.globalAlpha=Math.sin(p*Math.PI)*.8;ctx.fillStyle=i%2?'#e5ffce':'#9af5c2';
  ctx.beginPath();ctx.moveTo(px,py-s*2);ctx.lineTo(px+s*.5,py-s*.5);ctx.lineTo(px+s*2,py);ctx.lineTo(px+s*.5,py+s*.5);ctx.lineTo(px,py+s*2);ctx.lineTo(px-s*.5,py+s*.5);ctx.lineTo(px-s*2,py);ctx.lineTo(px-s*.5,py-s*.5);ctx.closePath();ctx.fill();
 }
 ctx.restore();
}
