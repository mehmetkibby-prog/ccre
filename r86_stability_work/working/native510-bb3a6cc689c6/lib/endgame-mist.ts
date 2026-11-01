type Tone='gold'|'white'|'blue'|'violet'|'green';
const colors:Record<Tone,string>={gold:'255,201,111',white:'221,247,255',blue:'118,199,255',violet:'194,140,255',green:'120,235,171'};
const sprites=new Map<Tone,HTMLCanvasElement>();
const frames=new WeakMap<CanvasRenderingContext2D,{left:number;compact:boolean;quiet:boolean}>();
export function beginEndgameMistFrame(ctx:CanvasRenderingContext2D,compact:boolean,quiet=false){
 const budget=frames.get(ctx);if(budget){budget.left=compact?48:160;budget.compact=compact;budget.quiet=quiet;}else frames.set(ctx,{left:compact?48:160,compact,quiet});
}
function sprite(tone:Tone){
 const old=sprites.get(tone);if(old)return old;if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
 const g=canvas.getContext('2d');if(!g)return null;
 const glow=g.createRadialGradient(32,32,0,32,32,31),rgb=colors[tone];
 glow.addColorStop(0,`rgba(${rgb},.7)`);glow.addColorStop(.3,`rgba(${rgb},.32)`);glow.addColorStop(1,`rgba(${rgb},0)`);
 g.fillStyle=glow;g.fillRect(0,0,64,64);sprites.set(tone,canvas);return canvas;
}
// Fixed shared frame budget; no per-particle state, timers, filters or pixel reads.
export function drawEndgameMist(ctx:CanvasRenderingContext2D,x:number,y:number,now:number,tone:Tone,scale=1,seed=0){
 const budget=frames.get(ctx);if(budget&&budget.left<=0)return;
 const image=sprite(tone);if(!image)return;
 const quiet=budget?.quiet??false,count=quiet?1:budget?.compact?3:5;
 ctx.save();ctx.shadowBlur=0;ctx.globalCompositeOperation='source-over';
 for(let i=0;i<count;i++){
  if(budget&&budget.left--<=0)break;
  const t=quiet?.45:(now/2400+i/count+seed*.17)%1,w=(24+t*42)*scale;
  ctx.globalAlpha=quiet?.45:Math.sin(t*Math.PI)*.65;
  ctx.drawImage(image,x+Math.sin(i*2.4+seed+now/1900)*(6+t*14)*scale-w/2,y-(8+t*62)*scale-w*.45,w,w*.9);
 }
 ctx.restore();
}
