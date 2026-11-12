import {ZUMRUT_AREA,ZUMRUT_NPC,ZUMRUT_BENCH,zumrutRiverX,zumrutRiverHalfWidth,zumrutNodesInRect,zumrutNode,zumrutFishingPoint,zumrutOnBridge} from './zumrut-map-r93.mjs';
import {drawZumrutItemR93} from './zumrut-icons-r93.mjs';
import {zumrutNodeAvailableR93,zumrutServerNowR93} from './zumrut-presentation-r93.mjs';
import {ZUMRUT_SWING_MS_R95,ZUMRUT_CONTACT_PHASE_R95} from './zumrut-gather-timing-r95.mjs';
import {createZumrutPeerPresentationR96} from './zumrut-peer-presentation-r96.mjs';
export const ZUMRUT_TERRAIN_ART_R93='zumrut-terrain-r93-bcec784fbce4dda0.webp';
export const ZUMRUT_PROP_ART_R93='zumrut-props-r93-2a4c1d827afff6e3.webp';
const TAU=Math.PI*2,LIMIT=12*1024*1024;
const sprites=new Map(),peersR96=createZumrutPeerPresentationR96();let active=null,lastArea=null,art=null,chipFrameR96=-1,remoteChipsR96=0;
export const ZUMRUT_RENDER_BUDGET_R93=Object.freeze({terrainBytes:LIMIT,particleLimit:12,tileWorldSize:0,artBytes:375324});
// Tight atlas source bounds retain individual silhouettes and the feet/root
// pivot. Trees and boulders are never painted into the terrain image.
const PROP_CROPS=Object.freeze([[108,34,315,439],[650,40,239,435],[1126,164,313,244],[122,688,282,201],[568,605,399,321]]);
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function line(c,points,color,width){c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function ready(image){return !!image?.complete&&image.naturalWidth>0;}
function ensureArt(){
 if(art||typeof Image==='undefined')return art;
 const load=file=>{const image=new Image();image.decoding='async';image.src=new URL('./'+file,import.meta.url).href;image.decode?.().catch(()=>{});return image;};
 // Loading starts only when the existing game renderer actually enters this map.
 art={terrain:load(ZUMRUT_TERRAIN_ART_R93),props:load(ZUMRUT_PROP_ART_R93)};return art;
}
function prop(c,index,x,y,width,height){const image=art?.props;if(!ready(image))return false;const [sx,sy,sw,sh]=PROP_CROPS[index];c.drawImage(image,sx,sy,sw,sh,x-width/2,y-height*.975,width,height);return true;}
// The approved terrain is only 1536 x 1024 (6 MiB decoded). Drawing this one
// image avoids the fractional-camera seams and opaque tile-edge shimmer, and
// removes the former 12 MiB LRU canvases and their allocations while walking.
export function zumrutTerrainCacheStatsR93(){return {tiles:0,bytes:0,limit:LIMIT,sprites:sprites.size,artLoaded:!!ready(art?.terrain),propsLoaded:!!ready(art?.props),terrainSourceBytes:ready(art?.terrain)?art.terrain.naturalWidth*art.terrain.naturalHeight*4:0};}
export function clearZumrutRenderCacheR93(){sprites.clear();active=null;peersR96.reset();}
function cleanPaint(c){c.globalAlpha=1;c.globalCompositeOperation='source-over';c.shadowBlur=0;c.shadowOffsetX=0;c.shadowOffsetY=0;c.shadowColor='transparent';if('filter' in c)c.filter='none';c.setLineDash([]);}
function cssWorldScale(c,view){
 // The native view can pass its CSS scale directly. Standalone renderers and
 // screenshots derive it from the same transform, excluding backing-store DPR.
 const supplied=view?.zoom??view?.cssScale;
 if(Number.isFinite(supplied)&&supplied>0)return supplied;
 const m=c.getTransform(),surface=c.canvas,cssWidth=surface?.clientWidth,
  ratio=Number.isFinite(view?.pixelRatio)&&view.pixelRatio>0?view.pixelRatio:cssWidth>0?surface.width/cssWidth:1;
 return Math.max(.05,Math.hypot(m.a,m.b)/ratio);
}
function water(c,now,view,options,left,top,right,bottom){
 const scale=cssWorldScale(c,view),lowQuality=!!options.lowQuality,count=lowQuality?8:12,width=Math.min(5,1.3/scale),time=options.reduced?900:Number.isFinite(now)?now:0;
 // Fixed, culled work on the native frame: no particles, timers or allocations
 // of canvases. Mobile quality still animates water, with fewer highlights.
 for(let i=0;i<count;i++){
  const phase=(time/3600+i*.61803398875)%1,
   yy=575+i*(2460/(count-1))+phase*95,
   xx=zumrutRiverX(yy)+Math.sin(i*7)*zumrutRiverHalfWidth(yy)*.26;
  if(yy<top-12||yy>bottom+12||xx<left-60||xx>right+60||zumrutOnBridge(xx,yy)||zumrutOnBridge(xx-45,yy)||zumrutOnBridge(xx+45,yy))continue;
  c.globalAlpha=.42*Math.sin(phase*Math.PI);
  line(c,[[xx-36,yy],[xx-12,yy-3],[xx+12,yy+2],[xx+38,yy]],'#e3fff6',width);
  c.globalAlpha=.16*Math.sin(phase*Math.PI);
  line(c,[[xx-19,yy+12],[xx+7,yy+13],[xx+25,yy+10]],'#b7f5ed',width*.8);
 }
 if(left<3070&&right>2770&&top<625&&bottom>200){
  // Follow the three painted waterfall steps; moving dashes suggest falling
  // water while keeping every highlight on the existing approved artwork.
  c.setLineDash([35,61]);
  for(let i=0;i<(lowQuality?3:5);i++){
   const offset=(i-(lowQuality?1:2))*9;
   c.globalAlpha=.21+.04*Math.sin(time/710+i*1.7);c.lineDashOffset=-time*.105-i*23;
   line(c,[[2990+offset,216],[2990+offset,286],[2985+offset,328],[2958+offset,368],[2945+offset,395],[2940+offset,442],[2930+offset,483],[2918+offset,530]],'#f3ffff',width*1.3);
  }
  c.setLineDash([]);
  for(let i=0;i<2;i++){
   const phase=(time/2100+i*.5)%1;c.globalAlpha=.36*(1-phase);c.strokeStyle='#e9fff8';c.lineWidth=width;
   c.beginPath();c.ellipse(2885,552+phase*20,30+phase*65,7+phase*12,0,0,TAU);c.stroke();
  }
 }
}
export function setZumrutAnimationR93(value){active=value?{...value}:null;}
export function zumrutAnimationR93(id,now,player){
 if(id===undefined)return active;
 if(active?.playerId===id)return active.phase==='channeling'&&(!Number.isFinite(now)||!Number.isFinite(active.visualEndsAt)||now<active.visualEndsAt)?active:null;
 return peersR96.get(id,now,player);
}
export function syncZumrutPeersR96(world,ownId,now,options={}){peersR96.frame(world,ownId,now,{...options,serverNow:options.serverNow??(()=>zumrutServerNowR93(world))});}
export function zumrutPeerAnimationsR96(){return peersR96.values();}
export function zumrutPeerStateR96(){return peersR96.inspect();}
function nodeImpactR96(nodeId,now){
 let impact=0,age=0;
 const consider=animation=>{if(!animation||animation.nodeId!==nodeId||animation.phase!=='channeling'||Number.isFinite(animation.visualEndsAt)&&now>=animation.visualEndsAt)return;const hit=gatherCycle(now,animation.kind,animation).impact;if(hit>impact){impact=hit;age=(now-animation.visualStartedAt)/SWING_MS;}};
 consider(active);for(const peer of peersR96.forNode(nodeId))consider(peer);return {impact,age};
}
export function drawZumrutTerrainR93(c,area,now,view,options={}){
 if(area!==ZUMRUT_AREA){if(lastArea===ZUMRUT_AREA){sprites.clear();active=null;peersR96.reset();}lastArea=area;return false;}lastArea=area;ensureArt();
 const vw=view?.width??1600,vh=view?.height??900,cx=view?.x??1100,cy=view?.y??2630,
  left=Math.max(0,cx-vw/2),top=Math.max(0,cy-vh/2),right=Math.min(4800,cx+vw/2),bottom=Math.min(3200,cy+vh/2);
 if(right<=left||bottom<=top)return true;
 c.save();try{
  cleanPaint(c);c.imageSmoothingEnabled=true;
  if(ready(art?.terrain))c.drawImage(art.terrain,0,0,4800,3200);
  else{c.fillStyle='#95b867';c.fillRect(0,0,4800,3200);}
  if(ready(art?.terrain))water(c,now,view,options,left,top,right,bottom);
 }finally{c.restore();}return true;
}
function labels(c,title,subtitle,x,y,view){
 const inverse=1/cssWorldScale(c,view);
 c.save();try{
  cleanPaint(c);c.translate(x,y);c.scale(inverse,inverse);
  c.font='600 17px system-ui';const titleWidth=c.measureText(title).width;
  c.font='500 12px system-ui';const w=Math.ceil(Math.max(titleWidth,c.measureText(subtitle).width))+18;
  c.fillStyle='#10251dd9';c.beginPath();
  if(c.roundRect)c.roundRect(-w/2,-49,w,43,6);else c.rect(-w/2,-49,w,43);
  c.fill();c.textAlign='center';c.textBaseline='alphabetic';c.lineJoin='round';c.lineWidth=2.5;c.strokeStyle='#102019';
  c.font='600 17px system-ui';c.strokeText(title,0,-30);c.fillStyle='#ffe4a0';c.fillText(title,0,-30);
  c.font='500 12px system-ui';c.strokeText(subtitle,0,-13);c.fillStyle='#f0efd6';c.fillText(subtitle,0,-13);
 }finally{c.restore();}
}
function axe(c,pick=false){c.save();c.rotate(-.62);drawZumrutItemR93(c,pick?'pickaxe':'axe',14.7,-15.4,70);c.restore();}
function shop(c,now,drawNpc,view){
 c.save();try{cleanPaint(c);if(drawNpc)drawNpc(c,ZUMRUT_NPC,now);}finally{c.restore();}
 labels(c,ZUMRUT_NPC.name,ZUMRUT_NPC.title,ZUMRUT_NPC.x,ZUMRUT_NPC.y-143,view);
}
function bench(c,now,view){
 c.save();try{
  cleanPaint(c);ellipse(c,ZUMRUT_BENCH.x+8,ZUMRUT_BENCH.y+3,106,23,'#22372522');
  prop(c,4,ZUMRUT_BENCH.x,ZUMRUT_BENCH.y,285,229);
  if(active?.kind==='craft'&&active.phase==='channeling'){
   const phase=(now-active.visualStartedAt)/1000;c.globalCompositeOperation='lighter';
   for(let i=0;i<4;i++){const a=i/4*TAU+phase*1.4;ellipse(c,ZUMRUT_BENCH.x+Math.cos(a)*55,ZUMRUT_BENCH.y-132+Math.sin(a)*21,2,2,'#f6e9a5');}
  }
 }finally{c.restore();}
 labels(c,ZUMRUT_BENCH.name,'Malzemeleri dönüştür',ZUMRUT_BENCH.x,ZUMRUT_BENCH.y-229,view);
}
export function drawZumrutObjectsR93(c,world,now,view,drawList,own,drawNpc=null){if(world?.area!==ZUMRUT_AREA)return;ensureArt();const vw=view?.width??1600,vh=view?.height??900,cx=view?.x??1100,cy=view?.y??2630,serverNow=zumrutServerNowR93(world);const visible=(x,y,pad=230)=>x>=cx-vw/2-pad&&x<=cx+vw/2+pad&&y>=cy-vh/2-pad&&y<=cy+vh/2+pad;
 for(const node of zumrutNodesInRect(cx-vw/2,cy-vh/2,vw,vh,270)){
  if(!zumrutNodeAvailableR93(node.id,world,serverNow))continue;
  const key=node.kind+node.variant;if(!sprites.has(key))sprites.set(key,{index:node.kind==='tree'?node.variant%2:2+node.variant%2});const index=sprites.get(key).index;
  drawList.push({y:node.y,draw:()=>{const {age,impact}=nodeImpactR96(node.id,now),isTree=node.kind==='tree';const alpha=own&&Math.abs(own.x-node.x)<65&&own.y<node.y&&own.y>node.y-210?.42:1;c.save();cleanPaint(c);c.translate(node.x+(isTree?0:Math.sin(age*71)*2*impact),node.y);c.scale(node.scale,node.scale);c.globalAlpha=alpha;
   ellipse(c,13,3,isTree?39:48,isTree?11:14,'#29462c2b');if(isTree)c.rotate(Math.sin(age*26)*.023*impact);
   if(!prop(c,index,0,0,isTree?(index===0?172:132):134,isTree?245:100))ellipse(c,0,0,node.radius,node.radius*.45,'#45674766');
   if(impact&&!isTree){c.globalAlpha=.2*impact;ellipse(c,0,-7,52+impact*9,14,'#e8dfb4');}c.restore();}});
 }
 // The approved chalet is baked into terrain; only native NPC and workbench
 // join the engine's existing depth-sorted draw list.
 if(visible(ZUMRUT_NPC.x,ZUMRUT_NPC.y))drawList.push({y:ZUMRUT_NPC.y,draw:()=>shop(c,now,drawNpc,view)});if(visible(ZUMRUT_BENCH.x,ZUMRUT_BENCH.y))drawList.push({y:ZUMRUT_BENCH.y,draw:()=>bench(c,now,view)});
}
// One bounded, render-only timeline drives the native body, attached grip and
// resource impact. No timers, network actions or world-position changes.
const SWING_MS=ZUMRUT_SWING_MS_R95;
const SWING_KEYS=[
 [0,0,0,0,.38],[.16,-3,-1,-.06,-1.35],[.42,-5,-2,-.11,-1.65],
 [ZUMRUT_CONTACT_PHASE_R95,4,4,.18,1.12],[.68,2,3,.13,1.24],[.86,0,1,.035,.72],[1,0,0,0,.38]
];
function gatherCycle(now,kind,animation=active){
 const elapsed=Math.max(0,now-(animation?.visualStartedAt??now)),phase=(elapsed%SWING_MS)/SWING_MS;
 let i=1;while(i<SWING_KEYS.length-1&&phase>SWING_KEYS[i][0])i++;
 const a=SWING_KEYS[i-1],b=SWING_KEYS[i],u=(phase-a[0])/(b[0]-a[0]),t=u*u*(3-2*u),mix=n=>a[n]+(b[n]-a[n])*t,pick=kind==='stone';
 return {phase,x:mix(1),y:mix(2)*(pick?1.2:1),angle:mix(3)*(pick?1.12:1),toolAngle:mix(4),
  frame:phase<.12?0:phase<.50?3:phase<.72?4:phase<.94?5:0,
  impact:phase>=ZUMRUT_CONTACT_PHASE_R95?Math.sin((phase-ZUMRUT_CONTACT_PHASE_R95)/(1-ZUMRUT_CONTACT_PHASE_R95)*Math.PI):0,pick};
}
export function zumrutGatherPoseR93(id,now,facing=1,player){
 const animation=zumrutAnimationR93(id,now,player);
 if(!animation||animation.phase!=='channeling'||!['wood','stone'].includes(animation.kind))return null;
 const pose=gatherCycle(now,animation.kind,animation),sign=facing<-.08?-1:1;
 pose.x*=sign;pose.angle*=sign;return pose;
}
export function applyZumrutGatherPoseR93(c,x,y,pose){
 if(!pose)return;c.translate(x+pose.x,y+18+pose.y);c.rotate(pose.angle);c.translate(-x,-(y+18));
}
// Gathering uses the palm rather than the caster's spell/staff origin. These
// offsets are measured from the existing native motion atlas (frames 0/3/4/5).
// Ay applies costume/body scaling afterwards, identically to the drawn hand.
const CASTER_GRIP_DELTA={0:[-3,-4],3:[3,-19],4:[15,-18],5:[-3,-5]};
export function zumrutGatherHandR93(role,hand,frame){
 const delta=role==='arkanist'?CASTER_GRIP_DELTA[frame]:null;
 return delta?{...hand,x:hand.x+delta[0]*hand.facing,y:hand.y+delta[1]}:hand;
}
export function drawZumrutGatherToolR93(c,hand,pose,pick=pose?.pick){
 if(!pose||!hand)return;c.save();c.translate(hand.x,hand.y);c.scale(hand.facing<0?-1:1,1);c.rotate(pose.toolAngle);axe(c,pick);c.restore();
}
export function drawZumrutHeldToolR93(c,player,now){
 if(!player)return;const hand=player.toolHandR93??{x:player.x+23,y:player.y-35,facing:1},animation=player.gatherDisabledR96?null:zumrutAnimationR93(player.id,now,player);
 if(!animation||animation.phase!=='channeling'){if(!['axe','pickaxe'].includes(player.equippedToolR93))return;c.save();c.translate(hand.x,hand.y);c.scale(hand.facing<0?-1:1,1);c.rotate(.38);c.scale(.78,.78);axe(c,player.equippedToolR93==='pickaxe');c.restore();return;}
 const node=zumrutNode(animation.nodeId),pick=animation.kind==='stone',craft=animation.kind==='craft',facing=(node?.x??ZUMRUT_BENCH.x)<player.x?-1:1,elapsed=Math.max(0,now-animation.visualStartedAt),cycle=gatherCycle(now,animation.kind,animation),p=cycle.phase;
 // Own gathering tool is drawn inside Ay's body transform at its atlas grip.
 // Craft and idle tools retain their existing separate rendering path.
 if(craft||!player.gatherBodyR93){c.save();c.translate(hand.x,hand.y);c.scale(facing,1);c.rotate(craft?Math.sin(elapsed/160)*.7:cycle.toolAngle);axe(c,pick||craft);c.restore();}
 // Eight deterministic wood chips / stone fragments only after tool contact.
 const impactStart=craft?.72:ZUMRUT_CONTACT_PHASE_R95;
 if(p>impactStart){if(chipFrameR96!==now){chipFrameR96=now;remoteChipsR96=0;}const remote=animation!==active,count=remote?Math.min(8,Math.max(0,16-remoteChipsR96)):8;if(remote)remoteChipsR96+=count;const phase=(p-impactStart)/(1-impactStart),px=node?.x??ZUMRUT_BENCH.x,py=(node?.y??ZUMRUT_BENCH.y)-(pick?38:craft?132:34);c.save();for(let i=0;i<count;i++){const a=-Math.PI+i*.41,v=32+i*9,x=px+Math.cos(a)*v*phase,y=py+Math.sin(a)*v*phase+36*phase*phase;c.globalAlpha=1-phase;c.fillStyle=pick||craft?(i%2?'#e9e4ad':'#adc5c4'):(i%2?'#d9ba77':'#967047');c.fillRect(x,y,pick?3:5,pick?3:2);}c.restore();}
}
export function drawZumrutFishingR93(c,now,fishing,point,rodTip){if(!fishing||!point)return;const target=zumrutFishingPoint(point),tip=rodTip??{x:point.x+27,y:point.y-120},bob=Math.sin(now/190)*2;c.save();c.strokeStyle='#f6e9c7bb';c.lineWidth=1.4;c.beginPath();c.moveTo(tip.x,tip.y);c.quadraticCurveTo((tip.x+target.x)/2,Math.min(tip.y,target.y)-45,target.x,target.y+bob);c.stroke();ellipse(c,target.x,target.y+bob,5,8,fishing.biteAtMs<=now?'#f7d47b':'#e58870');for(let i=0;i<2;i++){const p=(now/1600+i*.5)%1;c.strokeStyle=`rgba(219,255,236,${.5*(1-p)})`;c.beginPath();c.ellipse(target.x,target.y,10+28*p,4+10*p,0,0,TAU);c.stroke();}c.restore();}
export function drawZumrutToolIconR93(c,kind,x=0,y=0,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);axe(c,kind==='pickaxe');c.restore();}
