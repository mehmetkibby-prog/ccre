import {createMistRewardPopupR70,mistRewardRowsR70} from './mist-reward-popup-r70.mjs';
import {CASTLE_AREA} from './castle-model-r59.mjs';
import {CASTLE_MAP_R59} from './castle-client-r59.mjs';
import {adventureArea,isAdventureArea,isMistArea,ADVENTURE_BOUNDS,adventureBounds,adventureSegment,adventureLabel} from './adventure-maps.mjs';
import {MIST_MAP,MIST_ATLAS,TOWER_ATLAS} from './adventure-media.mjs';
import {adventureImage,adventureImageStatus,retryAdventureImage,waitAdventureImages,ADVENTURE_ASSET_EVENT} from './adventure-images.mjs';
export {adventureArea,isAdventureArea,isMistArea,ADVENTURE_BOUNDS,adventureBounds,adventureSegment,adventureLabel};
export {adventureImage};
const profiles=new WeakMap();
const FIRST_TOWER='kadim_'+ '0'.repeat(32)+'_01',ANY_MIST='sis_'+'0'.repeat(32);
export function admissionTextureArea(action,run,portal){
 if(action==='adventure_tower_enter')return FIRST_TOWER;
 if(action==='adventure_mist_enter')return ANY_MIST;
 if(action==='adventure_next'&&run?.kind==='tower'&&run.floor<10){const a=adventureArea(run.area);return a?'kadim_'+a.run+'_'+String(run.floor+1).padStart(2,'0'):null;}
 return null;
}
export const MIST_NOTICE_MS=8000;
export const MIST_PORTAL_PARTICLES=12;
const mistObjectiveText=Object.freeze({clear:'Canavarları temizle, mühürlü sandığı aç.',seals:'Üç mührü kır, gizli bossu yen.',hunt:'Gezgin Sis Avcısı’nı bul ve yen.'});
export function mistObjectiveLabel(run){return mistObjectiveText[run?.objective]??'Sis içindeki hedefini keşfet.';}
export function mistProgressLabel(run){
 if(run?.chestClaimed)return 'Sandık açıldı';if(run?.clear)return 'Sandık hazır';const p=run?.progress;if(!p)return 'Görev sürüyor';
 if(run.objective==='seals'&&p.sealsRemaining>0)return p.sealsRemaining+' mühür kaldı';
 if(run.objective==='hunt')return 'Nadir yaratığı bul';
 if(run.objective==='seals'&&p.bossRemaining>0)return 'Bossu yen';
 return Math.max(0,p.remaining??p.enemies??0)+' düşman kaldı';
}
export function nearbyMistPortals(portals,area,own,now){return (portals??[]).filter(p=>p.area===area&&p.closes_ms>now&&p.entered<p.capacity&&(!own||Math.hypot(own.x-p.x,own.y-p.y)<=600));}
export const ADVENTURE_DOCK=Object.freeze({width:96,buttonHeight:44,gap:6,inset:10});
// Geometry is shared with CSS and focused viewport checks; no per-frame DOM reads.
export function adventureDockBounds(width,height,hasRun=true,chatOpen=false){const d=ADVENTURE_DOCK,h=d.buttonHeight*(hasRun?2:1)+(hasRun?d.gap:0);return{x:width-(chatOpen&&height<=500&&width>=600?Math.min(360,width-16)+16:d.inset)-d.width,y:(height-h)/2,width:d.width,height:h};}
export const ADVENTURE_DOCK_CSS=`.tower20-dock{position:fixed;right:max(${ADVENTURE_DOCK.inset}px,env(safe-area-inset-right,0px));top:50%;transform:translateY(-50%);z-index:35;display:grid;gap:${ADVENTURE_DOCK.gap}px;width:${ADVENTURE_DOCK.width}px;pointer-events:auto}.tower20-dock button{box-sizing:border-box;width:100%;height:${ADVENTURE_DOCK.buttonHeight}px;min-height:${ADVENTURE_DOCK.buttonHeight}px;margin:0;padding:4px 6px;border:1px solid #a98b52;border-radius:9px;background:#0d211deb;color:#f0dfb5;font:700 12px/1.25 system-ui;cursor:pointer;touch-action:manipulation}.tower20-dock button:disabled{opacity:.55}.tower20-dock small{display:block;font:10px/1.2 system-ui;color:#d0c7af}.tower20-dock .tower20-leave{background:#321d22ed}.tower20-expedition{display:grid;gap:10px}.tower20-expedition h3,.tower20-expedition p{margin:0}.tower20-expedition-actions{display:flex;gap:8px;flex-wrap:wrap}.tower20-expedition-actions button{flex:1 1 140px;min-height:44px}.tower18-dialog{box-sizing:border-box;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overscroll-behavior:contain}.tower20-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}@media(max-height:500px) and (min-width:600px){body:has(.game-shell .chat-panel.open) .tower20-dock{right:calc(min(360px,100vw - 16px) + 16px)}}`;

export function adventureTextureURLs(area){if(area===CASTLE_AREA)return [CASTLE_MAP_R59];const a=adventureArea(area);if(!a)return [];return a.kind==='tower'?['/assets/tower-r18/floor-'+(a.floor<4?1:a.floor<7?4:a.floor<10?7:10)+'.webp',TOWER_ATLAS]:[MIST_MAP,MIST_ATLAS];}
export function adventureTexture(area){const url=adventureTextureURLs(area)[0];return url?adventureImage(url):null;}
export function adventureTextureStatus(area){const states=adventureTextureURLs(area).map(adventureImageStatus);return states.includes('failed')?'failed':states.length&&states.some(s=>s!=='ready')?'loading':'ready';}
export function retryAdventureTextures(area){for(const url of adventureTextureURLs(area))retryAdventureImage(url);}
// Prefetch the map AND its creature atlas before entry, not at the first hit.
// All decoding/retries stay outside movement, combat and the server ACK path.
export function preloadAdventureTextures(area){const a=adventureArea(area);if(!a)return;for(const url of adventureTextureURLs(area))adventureImage(url);if(a.kind==='tower'&&a.floor<10){const next=a.floor+1;adventureImage('/assets/tower-r18/floor-'+(next<4?1:next<7?4:next<10?7:10)+'.webp');}}
export function adventureProfile(world,id){const data=world?.adventure511;if(!data)return null;let map=profiles.get(data);if(!map){map=new Map(data.profiles??[]);profiles.set(data,map);}return map.get(id)??null;}
// Loading state remains visible/selectable; never substitute forest artwork.
export function drawAdventurePlaceholder(ctx,enemy,selected){
 const hp=Number(enemy?.hp)||0,max=Math.max(1,Number(enemy?.maxHp??enemy?.max_hp)||hp);
 ctx.save();ctx.translate(enemy.x,enemy.y);ctx.fillStyle='#23312be6';ctx.strokeStyle=selected?'#e2c583':'#9ba995';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-30,22,32,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.textAlign='center';ctx.font='700 12px system-ui';ctx.fillStyle='#eee1bc';ctx.strokeStyle='#07110e';ctx.lineWidth=3;ctx.strokeText(enemy.name??'Sefer düşmanı',0,-73);ctx.fillText(enemy.name??'Sefer düşmanı',0,-73);ctx.fillStyle='#17211a';ctx.fillRect(-40,-67,80,5);ctx.fillStyle='#bc8465';ctx.fillRect(-40,-67,80*Math.max(0,Math.min(1,hp/max)),5);ctx.restore();
}
// The live atlas is an irregular contact sheet, not eight equal tiles. Keep
// each complete sprite and its aspect ratio. Cutouts are prepared once per atlas
// and kind; outlines exclude neighbouring sprites without changing source art.
export const MIST_SPRITES=Object.freeze({"claw":{"rect":[23,108,423,395],"outline":[[22,312],[16,289],[0,108],[0,104],[1,95],[2,91],[6,84],[39,27],[40,26],[79,1],[95,0],[103,0],[199,25],[281,64],[283,65],[335,93],[337,95],[400,171],[401,175],[412,239],[421,331],[422,346],[422,355],[410,360],[332,387],[313,393],[287,394],[262,389]]},"guard":{"rect":[405,48,481,453],"outline":[[62,379],[0,68],[203,1],[211,0],[214,1],[225,5],[243,14],[456,368],[467,388],[469,392],[480,417],[96,452],[94,452],[91,450],[89,449],[85,446],[81,442],[78,438]]},"spirit":{"rect":[779,62,389,449],"outline":[[388,179],[388,181],[387,299],[321,414],[315,419],[312,421],[263,448],[258,448],[252,447],[248,446],[234,439],[131,382],[124,378],[121,375],[79,331],[4,233],[2,230],[0,226],[0,216],[41,126],[42,124],[43,122],[164,15],[180,1],[186,0],[287,3],[294,4],[307,21],[331,59],[387,173]]},"seal":{"rect":[1224,84,250,425],"outline":[[246,155],[249,169],[249,172],[244,349],[240,386],[215,396],[157,419],[72,424],[34,411],[30,409],[21,404],[4,394],[2,392],[0,297],[11,193],[39,133],[80,64],[170,3],[173,1],[175,0],[177,0],[179,4]]},"keeper":{"rect":[2,508,498,456],"outline":[[326,0],[442,25],[462,90],[469,111],[491,206],[492,214],[494,232],[497,320],[497,325],[495,407],[485,428],[482,434],[480,436],[454,445],[449,446],[405,452],[92,455],[84,455],[79,454],[76,453],[58,447],[43,431],[39,425],[18,374],[17,371],[15,364],[1,304],[0,284],[0,280],[135,68],[157,37],[159,35],[165,33],[210,20],[291,4]]},"rare":{"rect":[508,603,293,372],"outline":[[158,366],[3,302],[2,299],[0,289],[0,264],[2,57],[11,28],[12,26],[18,21],[57,4],[75,0],[91,0],[146,28],[209,65],[235,86],[236,88],[256,116],[258,120],[278,162],[279,170],[291,315],[292,326],[292,334],[283,340],[225,364],[210,370],[184,371]]},"gold":{"rect":[787,511,422,457],"outline":[[346,456],[58,443],[49,436],[48,435],[41,425],[17,363],[0,301],[0,299],[3,281],[89,71],[90,69],[125,29],[168,7],[188,0],[222,6],[287,21],[322,31],[374,60],[389,114],[402,161],[413,215],[421,311],[419,438],[417,439],[412,441],[395,448],[389,450],[381,452],[353,456]]},"chest":{"rect":[1214,621,310,348],"outline":[[0,175],[0,154],[12,116],[19,101],[40,64],[58,46],[63,43],[152,6],[193,0],[274,69],[286,87],[287,89],[301,129],[308,156],[309,172],[309,175],[305,306],[226,347],[225,347],[26,298],[18,296],[12,294],[10,293]]}});
const mistSpriteCache=new WeakMap();
function mistSprite(image,kind){
 const spec=MIST_SPRITES[kind];if(!spec)return null;let cache=mistSpriteCache.get(image);if(!cache){cache=new Map();mistSpriteCache.set(image,cache);}if(cache.has(kind))return cache.get(kind);
 const [x,y,w,h]=spec.rect,sx=image.naturalWidth/1536,sy=image.naturalHeight/1024;let cutout;
 if(typeof OffscreenCanvas!=='undefined')cutout=new OffscreenCanvas(w,h);else if(typeof document!=='undefined'){cutout=document.createElement('canvas');cutout.width=w;cutout.height=h;}
 const c=cutout?.getContext('2d');if(c){c.beginPath();for(let i=0;i<spec.outline.length;i++){const p=spec.outline[i];if(i)c.lineTo(p[0],p[1]);else c.moveTo(p[0],p[1]);}c.closePath();c.clip();c.drawImage(image,x*sx,y*sy,w*sx,h*sy,0,0,w,h);}
 const result=c?{image:cutout,x:0,y:0,width:w,height:h,ratio:w/h}:{image,x:x*sx,y:y*sy,width:w*sx,height:h*sy,ratio:w/h};cache.set(kind,result);return result;
}
// Native North Forest's motion atlas selects five travel/attack frames. Keep
// that cadence, but deform each approved adventure sprite as an articulated
// mesh (feet, arms/weapon, torso, head), never a rotating whole-picture card.
export const ADVENTURE_MOTION_FRAMES=5;
const motionCache=new Map();let motionBytes=0;
const MOTION_CACHE_BYTES=48*1024*1024;
const motionSelections=Object.fromEntries(['idle','walk','attack'].map(state=>[state,Object.freeze(Array.from({length:5},(_,frame)=>Object.freeze({state,frame})))]));
const meshX=[0,.15,.3,.5,.7,.85,1],meshY=[0,.18,.3,.43,.55,.68,.8,.9,1];
export function adventureMotionFrame(now,moving,attack,travel,stationary=false){
 const phase=Math.max(0,Math.min(.999,Number(attack)||0));
 const state=phase>0?'attack':moving&&!stationary?'walk':'idle',frame=phase>0?Math.floor(phase*5):moving&&!stationary?Math.floor(Math.max(0,Number(travel)||0)/19)%5:Math.floor(Math.max(0,Number(now)||0)/190)%5;return motionSelections[state][frame];
}
// The art faces right before the host applies facing. Bones are display-only;
// their deformation cannot change positions, hitboxes or authoritative damage.
export function adventureMotionPoint(x,y,state,frame,style='humanoid'){
 const phase=frame/5*Math.PI*2,step=state==='walk'?Math.sin(phase):0,breath=state==='idle'?Math.sin(phase):0;
 const wind=state==='attack'?[0,-.5,.35,1,.15][frame]:0;
 const turn=(px,py,cx,cy,angle)=>{const co=Math.cos(angle),si=Math.sin(angle);return {x:cx+(px-cx)*co-(py-cy)*si,y:cy+(px-cx)*si+(py-cy)*co};};
 if(style==='stone')return{x:x+(x-.5)*.018*breath,y:y-Math.sin(Math.PI*y)*.01*breath};
 if(style==='beast'){
  const front=Math.max(0,(x-.5)*2),feet=Math.max(0,(y-.55)/.45),side=x<.5?-1:1;
  return{x:x+step*side*.13*feet+wind*(.035+front*.1),y:y-Math.max(0,step*side)*.11*feet-Math.abs(step)*.015-front*wind*.05-breath*.008*Math.sin(Math.PI*y)};
 }
 let p={x,y};
 // Five distinct opposite-leg / shoulder / head poses at the native forest
 // travel and attack cadence. The silhouette and material textures stay intact.
 const side=x<.5?-1:1,leg=Math.max(0,Math.min(1,(y-.61)/.24));
 const legPose=turn(x,y,side<0?.35:.65,.62,step*side*.28);
 p.x+=(legPose.x-x)*leg;p.y+=(legPose.y-y)*leg-Math.max(0,step*side)*.055*leg;
 const arm=Math.max(0,Math.min(1,(Math.abs(x-.5)-.14)/.2))*Math.max(0,1-Math.abs(y-.49)/.32);
 const armPose=turn(x,y,side<0?.33:.67,.3,side*(wind*.8-step*.27));
 p.x+=(armPose.x-x)*arm;p.y+=(armPose.y-y)*arm;
 const torso=Math.max(0,1-Math.abs(y-.43)/.34);p.x+=wind*.055*torso;p.y-=Math.abs(step)*.018+breath*.012*torso;
 if(style==='caster'){p.x+=Math.sin(phase+y*6)*.035*Math.max(0,(y-.55)/.45);p.y-=Math.abs(step)*.025+wind*.025;}
 return p;
}
function motionCanvas(width,height){let c;if(typeof OffscreenCanvas!=='undefined')c=new OffscreenCanvas(width,height);else if(typeof document!=='undefined'){c=document.createElement('canvas');c.width=width;c.height=height;}return c;}
function drawMotionTriangle(ctx,image,source,target){
 const [s0,s1,s2]=source,[t0,t1,t2]=target,ux=s1.x-s0.x,uy=s1.y-s0.y,vx=s2.x-s0.x,vy=s2.y-s0.y,det=ux*vy-uy*vx;
 if(!det)return;const ax=t1.x-t0.x,ay=t1.y-t0.y,bx=t2.x-t0.x,by=t2.y-t0.y,a=(ax*vy-bx*uy)/det,b=(ay*vy-by*uy)/det,c=(bx*ux-ax*vx)/det,d=(by*ux-ay*vx)/det;
 ctx.save();ctx.beginPath();ctx.moveTo(t0.x,t0.y);ctx.lineTo(t1.x,t1.y);ctx.lineTo(t2.x,t2.y);ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,t0.x-a*s0.x-c*s0.y,t0.y-b*s0.x-d*s0.y);ctx.drawImage(image,0,0);ctx.restore();
}
// Mesh preparation is deferred to bounded idle jobs, never the render loop.
// A newly seen kind remains visible in its original pose while its frames warm.
const motionPending=new Set(),motionFailed=new Set(),motionQueue=[];let motionScheduled=false;
function prepareMotionFrame(sprite,cacheKey,state,frame,style){
  const scale=Math.min(1,256/Math.max(sprite.width,sprite.height)),w=Math.max(1,Math.round(sprite.width*scale)),h=Math.max(1,Math.round(sprite.height*scale)),pad=32,canvas=motionCanvas(w+pad*2,h+pad*2),c=canvas?.getContext('2d'),base=motionCanvas(w,h),b=base?.getContext('2d');
  if(!c||!b)throw Error('adventure_motion_canvas_unavailable');b.drawImage(sprite.image,sprite.x,sprite.y,sprite.width,sprite.height,0,0,w,h);
  const points=meshY.map(y=>meshX.map(x=>{const p=adventureMotionPoint(x,y,state,frame,style);return {source:{x:x*w,y:y*h},target:{x:pad+p.x*w,y:pad+p.y*h}};}));
  for(let row=0;row<meshY.length-1;row++)for(let col=0;col<meshX.length-1;col++){
   const a=points[row][col],b=points[row][col+1],d=points[row+1][col],e=points[row+1][col+1];
   drawMotionTriangle(c,base,[a.source,b.source,e.source],[a.target,b.target,e.target]);drawMotionTriangle(c,base,[a.source,e.source,d.source],[a.target,e.target,d.target]);
  }
  const entry={canvas,w,h,pad,bytes:canvas.width*canvas.height*4};motionCache.set(cacheKey,entry);motionBytes+=entry.bytes;
  while(motionBytes>MOTION_CACHE_BYTES&&motionCache.size>1){const oldest=motionCache.keys().next().value;motionBytes-=motionCache.get(oldest).bytes;motionCache.delete(oldest);}
}
function scheduleMotionJob(){
 if(motionScheduled||!motionQueue.length)return;motionScheduled=true;
 const run=deadline=>{motionScheduled=false;const started=performance.now();let count=0;try{do{const job=motionQueue.shift();try{if(job&&!motionCache.has(job.cacheKey))prepareMotionFrame(job.sprite,job.cacheKey,job.state,job.frame,job.style);}catch{if(job){motionFailed.add(job.cacheKey);while(motionFailed.size>256)motionFailed.delete(motionFailed.values().next().value);}}finally{if(job)motionPending.delete(job.cacheKey);}count++;}while(motionQueue.length&&count<4&&performance.now()-started<4&&(!deadline||deadline.timeRemaining()>2));}finally{scheduleMotionJob();}};
 if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1000});
 else if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>setTimeout(run,0));
 else setTimeout(run,0);
}
function queueMotionFrame(sprite,key,state,frame,style,priority=false){
 const cacheKey=key+':'+state+':'+frame;if(motionCache.has(cacheKey)||motionFailed.has(cacheKey))return;
 if(motionPending.has(cacheKey)){if(priority){const i=motionQueue.findIndex(job=>job.cacheKey===cacheKey);if(i>0)motionQueue.unshift(motionQueue.splice(i,1)[0]);}return;}if(motionQueue.length>=256)return;
 motionPending.add(cacheKey);const job={sprite,cacheKey,state,frame,style};if(priority)motionQueue.unshift(job);else motionQueue.push(job);scheduleMotionJob();
}
export function drawAdventureMotion(ctx,sprite,key,width,height,now,moving,attack,travel,style='humanoid',stationary=false){
 const selected=adventureMotionFrame(now,moving,attack,travel,stationary),cacheKey=key+':'+selected.state+':'+selected.frame;
 let entry=motionCache.get(cacheKey);
 if(entry){motionCache.delete(cacheKey);motionCache.set(cacheKey,entry);}else{
  // First queue the visible state, then its neighbours and remaining states.
  queueMotionFrame(sprite,key,selected.state,selected.frame,style,true);
  for(const state of ['idle','walk','attack'])for(let frame=0;frame<5;frame++)queueMotionFrame(sprite,key,state,frame,style);
  for(let offset=1;offset<5&&!entry;offset++)entry=motionCache.get(key+':'+selected.state+':'+((selected.frame+5-offset)%5));
  if(!entry)return false;
 }
 const px=entry.pad*width/entry.w,py=entry.pad*height/entry.h;ctx.drawImage(entry.canvas,-width/2-px,-height-py,width+px*2,height+py*2);return true;
}

export function drawAdventureEnemy(ctx,enemy,profile,selected,now,moving,attack,travel,direction,drawTower,nativeRig,area){
 if(!profile){
  if(isAdventureArea(area??enemy?.area)&&/^(?:curuk|yutan|golge)-adv-[a-f0-9]{32}$/.test(enemy?.id??'')){drawAdventurePlaceholder(ctx,enemy,selected);return true;}
  return false;
 }
 const decorated={...enemy,maxHp:enemy.max_hp,direction};if(profile.feature==='tower')return drawTower(ctx,{...decorated,towerKind:profile.kind},selected,now,moving,attack,travel,nativeRig);
 const kinds=['claw','guard','spirit','seal','keeper','rare','gold'],index=kinds.indexOf(profile.kind),img=adventureImage(MIST_ATLAS);if(index<0)return false;if(!img){drawAdventurePlaceholder(ctx,decorated,selected);return true;}
 const sprite=mistSprite(img,profile.kind),boss=profile.boss,size=boss?250:profile.stationary?170:155,height=size*MIST_SPRITES[profile.kind].rect[3]/512,width=height*sprite.ratio,style=profile.stationary?'stone':['claw','rare'].includes(profile.kind)?'beast':profile.kind==='spirit'?'caster':'humanoid';
 ctx.save();ctx.fillStyle=selected?'#c1e2c366':'#0007';ctx.beginPath();ctx.ellipse(enemy.x,enemy.y+8,size*.23,13,0,0,Math.PI*2);ctx.fill();ctx.translate(enemy.x,enemy.y+8);ctx.scale(direction?.x>.1?-1:1,1);if(!drawAdventureMotion(ctx,sprite,'mist:'+profile.kind,width,height,now,moving,attack,travel,style,!!profile.stationary))ctx.drawImage(sprite.image,sprite.x,sprite.y,sprite.width,sprite.height,-width/2,-height,width,height);ctx.restore();ctx.save();ctx.textAlign='center';ctx.font='700 12px system-ui';ctx.strokeStyle='#071510';ctx.fillStyle=boss?'#e9ce8a':'#c4eee1';ctx.lineWidth=3;ctx.strokeText(enemy.name,enemy.x,enemy.y-height-8);ctx.fillText(enemy.name,enemy.x,enemy.y-height-8);ctx.fillStyle='#08231f';ctx.fillRect(enemy.x-45,enemy.y-height-2,90,5);ctx.fillStyle='#78b9ab';ctx.fillRect(enemy.x-45,enemy.y-height-2,90*Math.max(0,Math.min(1,enemy.hp/Math.max(1,enemy.max_hp))),5);ctx.restore();return true;
}
// Reusable sprites are built once per colour. Each visible portal uses a fixed
// twelve sparks and six fog sprites; no particle objects, timers or DOM reads.
const mistFxCache=[null,null];
const mistSparks=Object.freeze(Array.from({length:MIST_PORTAL_PARTICLES},(_,i)=>Object.freeze({phase:i/MIST_PORTAL_PARTICLES,speed:.68+(i%4)*.11,radius:39+(i%3)*5})));
function mistEffectSprites(gold){
 const key=gold?1:0;if(mistFxCache[key])return mistFxCache[key];
 const make=(width,height,paint)=>{let canvas;if(typeof OffscreenCanvas!=='undefined')canvas=new OffscreenCanvas(width,height);else if(typeof document!=='undefined'){canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;}else return null;const c=canvas.getContext('2d');if(!c)return null;paint(c);return canvas;};
 const glow=gold?'232,191,105':'116,214,199';
 const mouth=make(160,220,c=>{c.translate(80,110);c.scale(.65,1);const g=c.createRadialGradient(0,0,4,0,0,100);g.addColorStop(0,'rgba(2,14,20,.98)');g.addColorStop(.55,'rgba(5,24,29,.97)');g.addColorStop(.70,`rgba(${glow},.55)`);g.addColorStop(.79,`rgba(${glow},.15)`);g.addColorStop(1,`rgba(${glow},0)`);c.fillStyle=g;c.fillRect(-120,-110,240,220);});
 const fog=make(96,96,c=>{const g=c.createRadialGradient(48,48,2,48,48,46);g.addColorStop(0,`rgba(${glow},.26)`);g.addColorStop(.4,`rgba(${glow},.13)`);g.addColorStop(1,`rgba(${glow},0)`);c.fillStyle=g;c.fillRect(0,0,96,96);});
 if(!mouth||!fog)return null;return mistFxCache[key]={mouth,fog};
}
export function drawMistPortal(ctx,portal,nowMs){
 const fx=mistEffectSprites(portal.gold),t=nowMs/1000,pulse=1+Math.sin(t*2.2)*.025;
 ctx.save();ctx.translate(portal.x,portal.y);ctx.fillStyle=portal.gold?'#d4ad4c26':'#5aaea62c';ctx.beginPath();ctx.ellipse(0,7,65,19,0,0,Math.PI*2);ctx.fill();
 if(fx){ctx.drawImage(fx.mouth,-80*pulse,-175*pulse,160*pulse,220*pulse);for(let i=0;i<6;i++){const a=t*.24+i*Math.PI/3;ctx.drawImage(fx.fog,Math.cos(a)*38-44,-55+Math.sin(a)*58-44,88,88);}}
 else{ctx.fillStyle='#071c22ee';ctx.beginPath();ctx.ellipse(0,-65,43,77,0,0,Math.PI*2);ctx.fill();}
 ctx.strokeStyle=portal.gold?'#edce82':'#9de8db';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,-65,43*pulse,77*pulse,0,t*.7,t*.7+Math.PI*1.45);ctx.stroke();ctx.globalAlpha=.55;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,-65,35,66,0,-t*.9,-t*.9+Math.PI*1.4);ctx.stroke();ctx.globalAlpha=1;
 for(let i=0;i<mistSparks.length;i++){const p=mistSparks[i],f=(t*.13*p.speed+p.phase)%1,a=f*Math.PI*2,x=Math.cos(a)*p.radius,y=-65+Math.sin(a)*78;ctx.globalAlpha=.35+.6*Math.sin(f*Math.PI);ctx.fillStyle=portal.gold?'#ffdf94':'#c0fff0';ctx.fillRect(x-1.5,y-1.5,3,3);}
 ctx.globalAlpha=1;ctx.font='700 13px system-ui';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#071916';ctx.fillStyle=portal.gold?'#f6d48b':'#d4f7e8';const label=portal.gold?'Altın Sis Yarığı':'Sis Yarığı';ctx.strokeText(label,0,-164);ctx.fillText(label,0,-164);ctx.font='11px system-ui';const seconds=Math.max(0,Math.ceil((portal.closes_ms-nowMs)/1000)),hint=portal.entered>=portal.capacity?'Dolu':seconds+' sn · '+portal.entered+'/'+portal.capacity;ctx.strokeText(hint,0,-147);ctx.fillText(hint,0,-147);ctx.restore();
}
export function drawAdventureScene(ctx,world,nowMs,visible){
 const data=world?.adventure511;if(!data)return;
 for(const portal of data.portals??[]){if(portal.area!==world.area||portal.closes_ms<=nowMs||visible&&!visible(portal.x,portal.y,200))continue;drawMistPortal(ctx,portal,nowMs);}
 const run=data.run;if(!run||run.area!==world.area)return;const h=run.hazard;
 if(h&&h.at>nowMs){ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.angle??0);ctx.strokeStyle='#ffc783';ctx.fillStyle='#d43b494a';ctx.lineWidth=4;ctx.beginPath();if(h.kind==='line')ctx.rect(-h.radius,-65,h.radius*2,130);else{ctx.arc(0,0,h.radius,0,Math.PI*2);if(h.kind==='ring'){ctx.moveTo(Math.max(0,h.radius-110),0);ctx.arc(0,0,Math.max(0,h.radius-110),0,Math.PI*2,true);}}ctx.fill('evenodd');ctx.stroke();ctx.restore();}
 if(run.clear&&run.kind==='tower'){ctx.save();ctx.textAlign='center';ctx.font='700 18px system-ui';ctx.fillStyle='#e7cf8b';ctx.strokeStyle='#09251e';ctx.lineWidth=4;const label=run.floor<10?'Kat tamamlandı · Sonraki kat':'Azrail yenildi · Sandığın çantanda';ctx.strokeText(label,800,140);ctx.fillText(label,800,140);ctx.restore();}
}
export const MIST_UI_CSS=`.tower20-dock.mist24-dock button{-webkit-tap-highlight-color:transparent;border-color:#6da799;background:#0d2522f2}.tower20-dock .mist24-arrival{font:600 11px/12px system-ui;padding:3px 4px;white-space:normal}.tower20-dock .mist24-ready{border-color:#d7be77;color:#f4d99b}.mist24-dialog.tower18-dialog{width:min(540px,calc(100vw - 24px));padding:18px;border-color:#5f9a8b}.mist24-title{display:flex;align-items:center;gap:10px;font-size:20px;color:#d3f0e3}.mist24-statline{display:flex;gap:8px;flex-wrap:wrap}.mist24-statline span{padding:5px 9px;border:1px solid #3e675d;border-radius:7px;background:#16372e;font-size:12px}.mist24-pvp{color:#ffc7ad}.mist24-objective{padding:12px;border:1px solid #477d6d;border-radius:9px;background:#102e25}.mist24-objective strong,.mist24-objective small{display:block}.mist24-objective small{margin-top:8px;color:#acccbb}.mist24-portal{display:grid;gap:5px;width:100%;text-align:left!important;border-color:#538477!important}.mist24-portal small{display:block;font-size:12px;color:#bccfc1}.mist24-rules{font-size:12px;line-height:1.6;color:#b5c5bb}.mist24-expedition .tower20-expedition-actions button{min-height:44px}.mist24-fallback{position:fixed;inset:50% auto auto 50%;transform:translate(-50%,-50%);z-index:70;overflow:auto;background:#0d1a16;color:#e7e5d6;border:1px solid #5f9a8b;border-radius:12px;box-shadow:0 20px 70px #000b;max-height:calc(100dvh - 24px)}@media(max-height:500px){.mist24-dialog.tower18-dialog{padding:12px;max-height:calc(100dvh - 20px)}.mist24-dialog .tower20-expedition{gap:7px}.mist24-objective{padding:8px}}`;
// A lost transition response must not trap the player after the authoritative
// map/run has already advanced. Reward/refine outcomes still require receipt retry.
function adventureTransitionConfirmed(pending,data,area){
 if(!pending||!data||data===pending.beforeData)return false;const r=data.run;
 if(pending.action==='adventure_next')return !!r&&r.id===pending.runId&&r.kind==='tower'&&r.floor===pending.floor+1&&r.revision>pending.revision&&r.area===area&&area!==pending.area;
 if(pending.action==='adventure_leave')return !!pending.runId&&!r&&!!area&&!isAdventureArea(area)&&area!==pending.area;
 if(pending.action==='adventure_tower_enter')return !pending.runId&&!!r?.id&&r.kind==='tower'&&r.floor>=1&&r.area===area&&isAdventureArea(area)&&area!==pending.area;
 if(pending.action==='adventure_mist_enter')return !pending.runId&&!!pending.portalRunId&&r?.id===pending.portalRunId&&r.kind==='mist'&&r.area===area&&isMistArea(area)&&area!==pending.area;
 return false;
}
export function createAdventureUI(React,{Dialog,Content,Header,Title,Description,Portal,Icon,css,rewardArt,GearIcon,TOWER_ITEMS=[]}={}){
 const h=React.createElement,RewardPopup=createMistRewardPopupR70(React,{rewardArt,GearIcon});
 function Entry({world,own,post,onChange,onTravel,uiSuspended}){
  const data=world?.adventure511,run=data?.run,info=data?.towerInfo,config=info?.config,items=info?.inventory??{},area=own?.area??world?.area;
  const [open,setOpen]=React.useState(false),[tab,setTab]=React.useState('tower'),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState(''),[now,setNow]=React.useState(Date.now()),[notice,setNotice]=React.useState(null),[claimedRun,setClaimedRun]=React.useState(null),[preparing,setPreparing]=React.useState(false);
  const lock=React.useRef(false),pending=React.useRef(null),seen=React.useRef(new Set()),alive=React.useRef(true),preflight=React.useRef(null),active=React.useRef(null),context=React.useRef(null);context.current={area,actor:own?.id,runId:run?.id};
  const [reward,setReward]=React.useState(null),rewardSeen=React.useRef(new Set());const closeReward=React.useCallback(()=>setReward(null),[]);
  React.useEffect(()=>{setReward(null);rewardSeen.current.clear();},[own?.id]);
  const chestClaimed=run?.chestClaimed===true||!!run?.id&&claimedRun===run.id;
  const [,assetChanged]=React.useReducer(n=>n+1,0);
  React.useEffect(()=>{const changed=()=>assetChanged();window.addEventListener(ADVENTURE_ASSET_EVENT,changed);return()=>window.removeEventListener(ADVENTURE_ASSET_EVENT,changed);},[]);
  React.useEffect(()=>{alive.current=true;const show=()=>{preloadAdventureTextures('kadim_'+'0'.repeat(32)+'_01');setOpen(true);setTab('tower');},end=()=>{preflight.current?.abort();setOpen(false);};window.addEventListener('tower-open',show);window.addEventListener('coreoflife:game-session-ended',end);return()=>{alive.current=false;preflight.current?.abort();window.removeEventListener('tower-open',show);window.removeEventListener('coreoflife:game-session-ended',end);};},[]);
  React.useEffect(()=>{const operation=pending.current;if(world?.area===area&&(adventureTransitionConfirmed(operation,data,area)||operation?.action==='adventure_chest'&&operation.runId===run?.id&&run?.chestClaimed)){operation.settled=true;pending.current=null;setMessage('Sefer durumu sunucudan doğrulandı.');setOpen(false);}},[data,area,world?.area]);
  React.useEffect(()=>{if(uiSuspended)setOpen(false);},[uiSuspended]);
  React.useEffect(()=>{preloadAdventureTextures(area);if(!own?.id||isAdventureArea(area))return;const timer=setTimeout(()=>preloadAdventureTextures(area==='bazaar'?FIRST_TOWER:ANY_MIST),300);return()=>clearTimeout(timer);},[area,own?.id]);
  React.useEffect(()=>()=>preflight.current?.abort(),[area,own?.id,run?.id]);
  React.useEffect(()=>{setNow(Date.now());},[run?.id,run?.deadline]);
  React.useEffect(()=>{if(!run&&!(data?.portals?.length))return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[!!run,!!data?.portals?.length]);
  React.useEffect(()=>{const at=Date.now();for(const p of nearbyMistPortals(data?.portals,area,own,at)){preloadAdventureTextures(ANY_MIST);if(!seen.current.has(p.id)){seen.current.add(p.id);setNotice({id:p.id,area,until:at+MIST_NOTICE_MS,text:'Yakında bir '+(p.gold?'Altın Sis Yarığı':'Sis Yarığı')+' açıldı!'});}}if(seen.current.size>128)seen.current=new Set((data?.portals??[]).map(p=>p.id));},[data?.portals,area,own?.x,own?.y]);
  React.useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),Math.max(0,notice.until-Date.now()));return()=>clearTimeout(timer);},[notice]);
  async function act(action,extra={}){
   // Leaving stays available while a next-floor image is loading. Cancel only
   // that unsent admission; an already sent command retains its receipt rules.
   if(lock.current){if(action==='adventure_leave'&&preflight.current){preflight.current.abort();preflight.current=null;}else return;}
   const key=JSON.stringify([action,extra]);if(pending.current&&pending.current.key!==key){setMessage('Önce önceki işlemi aynı düğmeyle yeniden sorgula.');return;}
   if(action==='adventure_chest'&&chestClaimed)return;
   const token={};active.current=token;lock.current=true;setBusy(true);setMessage('');let operation=null;
   try{
    const target=admissionTextureArea(action,run);
    if(target&&!pending.current){
     const snapshot=context.current,abort=new AbortController();preflight.current=abort;setPreparing(true);setMessage('Sefer görselleri hazırlanıyor…');setOpen(true);
     await waitAdventureImages(adventureTextureURLs(target),{signal:abort.signal});
     if(abort.signal.aborted||context.current.area!==snapshot.area||context.current.actor!==snapshot.actor||context.current.runId!==snapshot.runId||active.current!==token)return;
     preflight.current=null;setPreparing(false);
    }
    pending.current??={key,id:crypto.randomUUID(),action,beforeData:data,runId:run?.id??null,floor:run?.floor,revision:run?.revision??0,area,portalRunId:data?.portals?.find(p=>p.id===extra.portalId)?.run_id};operation=pending.current;
    const result=await post('/api/action',{action,...extra,requestId:operation.id});if(result.error)throw Error(result.error);pending.current=null;
    if(alive.current){if(action==='adventure_chest'){setClaimedRun(operation.runId);const earned=mistRewardRowsR70(result);if(earned&&!rewardSeen.current.has(earned.runId)){rewardSeen.current.add(earned.runId);if(rewardSeen.current.size>64)rewardSeen.current.delete(rewardSeen.current.values().next().value);setReward(earned);setOpen(false);}}setMessage(result.message??'Tamamlandı.');if(['adventure_tower_enter','adventure_next','adventure_leave','adventure_mist_enter'].includes(action))setOpen(false);onChange?.();}
   }catch(error){
    if(operation?.settled||active.current!==token||error?.name==='AbortError')return;
    if(error?.status>=400&&error.status<500&&error?.payload?.code!=='command_outcome_unknown')pending.current=null;
    if(alive.current){setMessage(error?.message??'İşlem tamamlanamadı. Aynı düğmeyle yeniden sorgula.');setTab(action==='adventure_tower_enter'?'tower':'expedition');setOpen(true);}
   }finally{if(active.current===token){preflight.current=null;active.current=null;lock.current=false;if(alive.current){setBusy(false);setPreparing(false);}}}
  }
  const portals=nearbyMistPortals(data?.portals,area,own,now),remaining=Math.max(0,Math.ceil(((run?.deadline??now)-now)/1000));
  const assetStatus=adventureTextureStatus(area);
  const assetNotice=run&&assetStatus!=='ready'&&h('p',{role:'status',className:'mist24-rules'},assetStatus==='failed'?'Sefer görselleri indirilemedi.':'Sefer görselleri yükleniyor…',assetStatus==='failed'&&h('button',{type:'button',onClick:()=>retryAdventureTextures(area)},'Görselleri yeniden yükle'));
  const summary=run?(run.kind==='tower'?run.floor+'. Kat · '+run.name:(run.gold?'Altın ':'')+'Sis Yarığı'):null;
  const clock=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
  const mistContext=tab==='expedition'&&(run?.kind==='mist'||!run&&portals.length>0),arrival=notice&&notice.area===area&&notice.until>now&&portals.some(p=>p.id===notice.id)?notice.text:'';
  const expedition=h('section',{className:'tower20-expedition'+(mistContext?' mist24-expedition':'')},run?h(React.Fragment,null,h('h3',{className:run.kind==='mist'?'mist24-title':undefined},summary),run.kind==='tower'?h(React.Fragment,null,h('p',null,'Kalan süre: '+clock),h('p',null,'Dalga '+run.wave+' / '+run.waves)):h(React.Fragment,null,h('div',{className:'mist24-statline'},h('span',null,'Kalan süre '+clock),h('span',{className:'mist24-pvp'},'PVP AÇIK')),h('div',{className:'mist24-objective'},h('strong',null,mistObjectiveLabel(run)),h('small',null,mistProgressLabel({...run,chestClaimed}))),h('p',{className:'mist24-rules'},'Bir oyuncu seni öldürürse biriken tüm Özün ve Mücevherinin %15’i, düştüğün yerde adının yazdığı sandığa konur. Sandığa dokunan oyuncu 3 saniye kesintisiz bekleyerek onu alabilir; hareket, saldırı veya hasar toplamayı keser. Ölürsen Pazar Köyü’ne dönersin. Süre dolunca geldiğin haritaya dönersin. İstediğin zaman çıkabilirsin.')),h('div',{className:'tower20-expedition-actions'},run.clear&&run.kind==='tower'&&run.floor<10&&h('button',{disabled:busy,onClick:()=>act('adventure_next')},'Sonraki kata geç'),run.clear&&run.kind==='mist'&&h('button',{disabled:busy||chestClaimed,onClick:()=>act('adventure_chest')},chestClaimed?'Sis Sandığı açıldı':'Sis Sandığı’nı aç'),h('button',{disabled:busy&&!preparing,onClick:()=>act('adventure_leave')},'Seferden çık'))):h(React.Fragment,null,h('p',{className:'mist24-rules'},'Her yarıkta rastgele bir hedef. En fazla 4 kişi girer; içeride PvP açıktır. Bir oyuncu seni öldürürse biriken tüm Özün ve Mücevherinin %15’i, düştüğün yerde adının yazdığı sandığa konur. Sandığa dokunan oyuncu 3 saniye kesintisiz bekleyerek onu alabilir; hareket, saldırı veya hasar toplamayı keser. Ölürsen Pazar Köyü’ne dönersin.'),...portals.map(p=>h('button',{className:'mist24-portal',key:p.id,disabled:busy||!own||Math.hypot(own.x-p.x,own.y-p.y)>150,onClick:()=>act('adventure_mist_enter',{portalId:p.id})},(p.gold?'Altın ':'')+'Sis Yarığı · '+p.entered+'/'+p.capacity+' · '+Math.ceil((p.closes_ms-now)/1000)+' sn',h('small',null,!own||Math.hypot(own.x-p.x,own.y-p.y)>150?'Girmek için portala yaklaş':'Sis Yarığı’na gir'))),!portals.length&&h('p',null,'Aktif seferin yok.')));
  const body=h('div',{className:'tower18-body'},!mistContext&&h('nav',{className:'tower18-nav'},...[...(run||portals.length?['expedition']:[]),'tower'].map(x=>h('button',{key:x,onClick:()=>setTab(x),'aria-pressed':tab===x},x==='expedition'?'Sefer':x==='tower'?'Kadim Kulesi':'Kule Çantası'))),message&&h('p',{role:'status'},message),assetNotice,tab==='expedition'?expedition:tab==='tower'?h(React.Fragment,null,h('div',{className:'tower18-hero'},h('img',{src:'/assets/tower-r18/entrance.webp',alt:'Kadim Kulesi'}),h('div',null,h('h3',null,'Kadim Kulesi'),h('p',null,'10 kat. Dalgaları tamamla, bir sonraki kata geç. İstediğin zaman çıkabilirsin.'))),h('div',{className:'tower18-floor-grid'},...(config?.floors??[]).map((f,i)=>h('div',{className:'tower18-floor',key:i},h('b',null,(i+1)+'. kat'),f.name,' · '+f.waves+' dalga'))),run?h('button',{onClick:()=>setOpen(false)},'Seferine dön'):area!=='bazaar'?h('button',{onClick:()=>{setOpen(false);onTravel?.();}},'Pazar Köyü’ne git'):h('button',{disabled:busy||!config?.enabled,onClick:()=>act('adventure_tower_enter')},config?.enabled?'Kadim Kulesi’ne gir':'Kule kapalı')):h('div',{className:'tower18-items'},...TOWER_ITEMS.map(([kind,name,forge])=>h('div',{className:'tower18-item',key:kind},Icon&&h(Icon,{kind}),h('span',null,name,h('small',null,(items[kind]??0)+' adet')),kind==='tower_azrail_chest'&&h('button',{disabled:busy||!!run||!(items[kind]>0),onClick:()=>act('adventure_tower_chest')},'Aç'),forge>0&&h('button',{disabled:busy||!!run||area!=='bazaar'||!(items[kind]>0),onClick:()=>act('adventure_refine',{kind,amount:1})},forge+' Kor Mührü')))));
  const dock=!uiSuspended&&(run||portals.length>0)&&h('aside',{className:'tower20-dock'+(run?.kind==='mist'||portals.length?' mist24-dock':''),'aria-label':'Sefer kontrolleri'},h('button',{type:'button',className:!run&&arrival?'mist24-arrival':run?.kind==='mist'&&run.clear?'mist24-ready':undefined,'aria-label':run?'Sefer bilgileri: '+summary:'Yakındaki Sis Yarıkları','aria-expanded':open&&tab==='expedition',onClick:()=>{setTab('expedition');setOpen(true);}},!run&&arrival?arrival:h(React.Fragment,null,run?(run.kind==='tower'?run.floor+'. Kat':chestClaimed?'Sandık açıldı':run.clear?'Sandık hazır':'Sis Yarığı'):'Sis Yarığı',h('small',null,run?(run.clear?'Tamamlandı · İncele':clock+' · Sefer'):'Yaklaş ve gir'))),run&&h('button',{type:'button',className:'tower20-leave',disabled:busy&&!preparing,onClick:()=>act('adventure_leave')},'Seferden çık'),arrival&&h('span',{className:'tower20-sr',role:'status'},arrival));
  return h(React.Fragment,null,!uiSuspended&&reward&&(Portal?Portal(h(RewardPopup,{reward,onClose:closeReward}),document.body):h(RewardPopup,{reward,onClose:closeReward})),h('style',null,(css??ADVENTURE_DOCK_CSS)+MIST_UI_CSS),dock&&(Portal?Portal(dock,document.body):dock),Dialog?h(Dialog,{open:open&&!uiSuspended,onOpenChange:setOpen},h(Content,{className:'tower18-dialog'+(mistContext?' mist24-dialog':'')},h(Header,null,h(Title,null,mistContext?'Sis Yarığı':tab==='expedition'?'Sefer':'Kadim Kulesi'),h(Description,null,mistContext?'Hedefin, kalan süren ve güvenli çıkış':tab==='expedition'?'İlerleme, geçitler ve çıkış':'Katlar ve sefer bilgisi')),body)):open&&!uiSuspended?h('div',{className:'tower18-dialog'+(mistContext?' mist24-dialog mist24-fallback':''),role:'dialog','aria-label':mistContext?'Sis Yarığı':'Sefer'},h('button',{onClick:()=>setOpen(false)},'Kapat'),body):null);
 }
 return {Entry};
}

export function adventureAttackProgress(world,id,now){const run=world?.adventure511?.run,h=run?.hazard;if(run?.area!==world?.area||!h||h.at<=now||h.created>now||adventureProfile(world,id)?.kind!=='azrail')return null;return Math.max(.001,Math.min(.999,(now-h.created)/Math.max(1,h.at-h.created)));}
