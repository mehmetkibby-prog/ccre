// Presentation only: no hitboxes, network requests, clocks or gameplay state.
// The game's existing frame loop draws at most 16 short-lived effects (8 on
// mobile/low quality). All geometry is bounded; no per-particle timers.
const TAU=Math.PI*2,roles=new Set(['muhafiz','avci','arkanist']);
const palette={muhafiz:['#f7d9a4','#ffc573','#ff8055','#ffdc82'],avci:['#a9e3c9','#a2e7ff','#62dca1','#f9d084'],arkanist:['#d2acff','#95e8ff','#bca2ff','#a7f5da']};
export function createSkillVisualsR102(){
 const list=[],seen=new Map();let serial=0;
 return {get size(){return list.length;},clear(){list.length=0;seen.clear();},
 enqueue({role,ability,from,to,now,key='',specialization=''}){
  if(!roles.has(role)||!Number.isInteger(ability)||ability<0||ability>3||![from?.x,from?.y,to?.x,to?.y,now].every(Number.isFinite))return false;
  if(key&&seen.has(key))return false;if(key){seen.set(key,now);if(seen.size>128)seen.delete(seen.keys().next().value);}
  if(list.length>=16)list.shift();list.push({role,ability,from:{x:from.x,y:from.y-34},to:{x:to.x,y:to.y-26},now,duration:ability===0?360:ability===1?620:900,specialization,serial:++serial});return true;
 },
 draw(ctx,now,{low=false,reduced=false,camera=null,width=Infinity,height=Infinity}={}){
  for(let i=list.length-1;i>=0;i--)if(now-list[i].now>list[i].duration||now<list[i].now-1000)list.splice(i,1);
  const start=Math.max(0,list.length-(low?8:16));
  for(let i=start;i<list.length;i++){
   const e=list[i],t=Math.max(0,Math.min(1,(now-e.now)/e.duration)),x=e.to.x,y=e.to.y;
   if(camera&&Math.abs(x-camera.x)>width/2+450&&Math.abs(e.from.x-camera.x)>width/2+450)continue;
   if(camera&&Math.abs(y-camera.y)>height/2+450&&Math.abs(e.from.y-camera.y)>height/2+450)continue;
   if(reduced&&t>.3)continue;
   ctx.save();ctx.globalAlpha=(1-t)*Math.min(1,t*12+.1);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=palette[e.role][e.ability];ctx.fillStyle=ctx.strokeStyle;
   const angle=Math.atan2(y-e.from.y,x-e.from.x),radius=e.ability===0?23:e.ability===1?38:68;
   const ring=(r,rotation=0)=>{ctx.beginPath();ctx.ellipse(x,y+12,r,r*.48,rotation,0,TAU);ctx.stroke();};
   if(e.role==='muhafiz'){
    ctx.lineWidth=e.ability===0?5:4;
    if(e.ability===1){const length=Math.hypot(x-e.from.x,y-e.from.y),n=Math.min(low?7:12,Math.max(3,Math.ceil(length/24)));ctx.beginPath();ctx.moveTo(e.from.x,e.from.y);ctx.lineTo(x,y);ctx.stroke();for(let j=1;j<n;j++){ctx.beginPath();ctx.ellipse(e.from.x+(x-e.from.x)*j/n,e.from.y+(y-e.from.y)*j/n,7,3,angle,0,TAU);ctx.stroke();}}
    else if(e.ability===0){ctx.beginPath();ctx.arc(x,y,radius+22*t,angle-1.1,angle+1.1);ctx.stroke();ctx.lineWidth=1.5;ctx.strokeStyle='#fff5db';ctx.beginPath();ctx.arc(x,y,radius+22*t-6,angle-.9,angle+.9);ctx.stroke();}
    else{ring(radius*(.5+t));ctx.lineWidth=1.5;ring(radius*(.65+t));const n=low?5:8;for(let j=0;j<n;j++){const a=j*TAU/n;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*radius*.4,y+Math.sin(a)*radius*.2);ctx.lineTo(x+Math.cos(a+.09)*radius*(1+t*.6),y+Math.sin(a+.09)*radius*.5*(1+t*.6));ctx.stroke();}}
   }else if(e.role==='avci'){
    const n=e.ability>=2?(low?3:5):e.ability===1?2:1;ctx.lineWidth=2;
    for(let j=0;j<n;j++){const offset=(j-(n-1)/2)*13,progress=Math.min(1,t*1.8),px=e.from.x+(x-e.from.x)*progress+Math.sin(angle)*offset,py=e.from.y+(y-e.from.y)*progress-Math.cos(angle)*offset;ctx.beginPath();ctx.moveTo(px-Math.cos(angle)*40,py-Math.sin(angle)*40);ctx.lineTo(px,py);ctx.lineTo(px-Math.cos(angle-.5)*12,py-Math.sin(angle-.5)*12);ctx.moveTo(px,py);ctx.lineTo(px-Math.cos(angle+.5)*12,py-Math.sin(angle+.5)*12);ctx.stroke();}
    if(e.ability>=2){ctx.lineWidth=1.5;ring(radius*(.6+t*.4));for(let j=0;j<(low?4:7);j++){const a=j*TAU/(low?4:7);ctx.beginPath();ctx.moveTo(x+Math.cos(a)*radius*.6,y+Math.sin(a)*radius*.3);ctx.lineTo(x+Math.cos(a+.3)*radius,y+Math.sin(a+.3)*radius*.5-16*(1-t));ctx.stroke();}}
   }else{
    const px=e.from.x+(x-e.from.x)*Math.min(1,t*2),py=e.from.y+(y-e.from.y)*Math.min(1,t*2);
    if(e.ability===0){ctx.lineWidth=3;ctx.beginPath();ctx.arc(px,py,9+5*Math.sin(t*Math.PI),0,TAU);ctx.stroke();ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(px,py,18,7,t*3,0,TAU);ctx.stroke();}
    else{ctx.lineWidth=2;ring(radius*(.7+t*.4));ctx.beginPath();const n=e.ability===1?6:8;for(let j=0;j<=n;j++){const a=j*TAU/n+(reduced?0:t*.3),rr=radius*(j%2===0?1:.7);ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.5);}ctx.stroke();for(let j=0;j<(low?3:5);j++){const a=j*TAU/(low?3:5),xx=x+Math.cos(a)*radius*.65,yy=y+Math.sin(a)*radius*.32;ctx.beginPath();ctx.moveTo(xx,yy-30*(1-t)-12);ctx.lineTo(xx-5,yy-7);ctx.lineTo(xx,yy+6);ctx.lineTo(xx+5,yy-7);ctx.closePath();ctx.stroke();}}
   }
   // Bright, short impact points replace the former large random particle burst.
   if(!reduced&&e.ability>0){ctx.strokeStyle='#f8f3da';ctx.lineWidth=1.4;for(let j=0;j<(low?3:6);j++){const a=j*TAU/(low?3:6)+e.serial*.7,rr=12+t*radius;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.6);ctx.lineTo(x+Math.cos(a)*(rr+7),y+Math.sin(a)*(rr+7)*.6);ctx.stroke();}}
   ctx.restore();
  }
 }
 };
}
export function useAnnouncementsR102(R){
 const [notice,setNotice]=R.useState(null),queue=R.useRef([]),seen=R.useRef(new Set()),current=R.useRef(null);
 const showAnnouncement=R.useCallback((m,serverTime)=>{
  if(!m||!Number.isSafeInteger(m.id)||seen.current.has(m.id)||typeof m.body!=='string'||m.body.length>140||typeof m.player_name!=='string'||m.player_name.length>40||!Number.isSafeInteger(m.announcement_expires_at_ms)||!Number.isFinite(serverTime))return;
  seen.current.add(m.id);if(seen.current.size>1024)seen.current.delete(seen.current.values().next().value);
  const ttl=Math.max(0,Math.min(60000,m.announcement_expires_at_ms-serverTime));if(!ttl)return;
  const drop=m.player_name.startsWith('GANİMET'),duration=drop?10000:['EVRİM','SEVİYE','ZİNDAN'].includes(m.player_name)?7000:ttl,value={message:m,duration,localDeadline:performance.now()+duration};
  if(current.current){if(queue.current.length>=4)queue.current.shift();queue.current.push(value);}else{current.current=value;setNotice(value);}
 },[]);
 R.useEffect(()=>{if(!notice)return;const next=()=>{const value=queue.current.shift()??null;if(value)value.localDeadline=performance.now()+value.duration;current.current=value;setNotice(value);};const id=setTimeout(next,Math.max(0,notice.localDeadline-performance.now()));return()=>clearTimeout(id);},[notice]);
 return {notice,showAnnouncement};
}
