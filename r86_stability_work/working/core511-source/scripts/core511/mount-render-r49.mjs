import {clientGameplayR55} from './gameplay-client-r55.mjs';
import {clientGameplayR58} from './gameplay-client-r58.mjs';
import {seatedRiderR58,drawSeatedRiderR58} from './mount-rider-r58.mjs';
import {clientGameplayR60} from './gameplay-client-r60.mjs';
import {seatedRiderR60,drawRiderLayerR60} from './mount-rider-r60.mjs';
// Fixed catalog images and a bounded appearance cache. Reuses the native frame
// clock; no mount entity, interval, extra RAF, network call, or pixel read per frame.
const KINDS=new Set(['wolf','boar','stag']);
export function createMountRendererR49(art={},host=globalThis){
 const images=new Map(),riders=new Map(),sourceIds=new WeakMap();let nextSourceId=0;
 function asset(kind){
  if(!KINDS.has(kind)||!art[kind])return null;
  let row=images.get(kind);if(!row){const config=typeof art[kind]==='string'?{src:art[kind]}:art[kind],image=new host.Image();row={...config,image,columns:config.columns??6,rows:config.rows??1,width:config.width??200,seatX:config.seatX??.44,seatY:config.seatY??.44,baseline:config.baseline??.9375};image.decoding='async';image.src=config.src;images.set(kind,row);}
  return row.image.complete&&row.image.naturalWidth>0&&row.image.naturalHeight>0?row:null;
 }
 function pose(mount,moving,now,direction=1,attackPhase=0,attacking=false){
  if(!mount?.mounted||!KINDS.has(mount.kind))return null;
  const a=asset(mount.kind);if(!a)return null;
  const cellWidth=a.image.naturalWidth/a.columns,cellHeight=a.image.naturalHeight/a.rows,height=a.width*cellHeight/cellWidth,frame=moving?1+Math.floor(now/105)%Math.max(1,a.columns*a.rows-1):0,placement=a.placement?.[frame]??a;
  const baseline=placement.baseline??a.baseline,seatY=placement.seatY??a.seatY,seatX=placement.seatX??a.seatX,lift=Math.max(48,(baseline-seatY)*height+8);
  return{...a,baseline,seatX,seatY,cellWidth,cellHeight,height,frame,flip:direction<-.08?-1:1,bob:moving?Math.sin(now/105*Math.PI)*1.15:0,lift,labelLift:Math.max(20,lift-36),attackPhase,attacking};
 }
 function animal(ctx,p,x,y){
  if(!p)return false;
  ctx.save();ctx.translate(x,y);ctx.scale(p.flip,1);ctx.shadowBlur=0;
  ctx.drawImage(p.image,p.frame%p.columns*p.cellWidth,Math.floor(p.frame/p.columns)*p.cellHeight,p.cellWidth,p.cellHeight,-p.seatX*p.width,-p.baseline*p.height,p.width,p.height);ctx.restore();return true;
 }
 function riderImage(image,row,tinted,fallback=false){
  if(!image?.complete&&!image?.width)return null;
  const source=tinted??image,sw=tinted?source.width:fallback?(image.naturalWidth??image.width)/3:(image.naturalWidth??image.width)/6,sh=tinted?source.height:fallback?(image.naturalHeight??image.height):(image.naturalHeight??image.height)/3;
  if(!(sw>0&&sh>0))return null;
  if(!sourceIds.has(source))sourceIds.set(source,++nextSourceId);
  const fixed=clientGameplayR55.mountRender,key=sourceIds.get(source)+':'+row+':'+fallback+':'+fixed+':'+clientGameplayR58.mountRender+':'+clientGameplayR60.mountRender;
  let cached=riders.get(key);if(cached&&cached.source===source)return cached.canvas;
  const sample=host.document.createElement('canvas');sample.width=Math.ceil(sw);sample.height=Math.ceil(sh);const c=sample.getContext('2d',{willReadFrequently:true});if(!c)return null;
  c.drawImage(source,tinted?0:fallback?row*sw:0,tinted||fallback?0:row*sh,sw,sh,0,0,sw,sh);
  let left=sw,top=sh,right=0,bottom=0;
  try{const pixels=c.getImageData(0,0,sample.width,sample.height).data;for(let y=0;y<sample.height;y++)for(let x=0;x<sample.width;x++)if(pixels[(y*sample.width+x)*4+3]>24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}catch{return null;}
  if(right<=left||bottom<=top)return null;
  if(clientGameplayR58.mountRender){
   const canvas=clientGameplayR60.mountRender?seatedRiderR60(sample,{left,top,w:right-left+1,h:bottom-top+1},host,row):seatedRiderR58(sample,{left,top,w:right-left+1,h:bottom-top+1},host);if(!canvas)return null;
   if(riders.size>=72)riders.delete(riders.keys().next().value);riders.set(key,{source,canvas});return canvas;
  }
  const w=right-left+1,h=bottom-top+1,canvas=host.document.createElement('canvas');canvas.width=144;canvas.height=152;const out=canvas.getContext('2d');if(!out)return null;
  const bodyH=fixed?74:86,cut=fixed?.55:.70,bodyW=Math.min(94,bodyH*w/(h*(fixed?cut:.72))),seatX=72,seatY=108;
  // Far and near legs bend at the saddle. Both use the player's real armor.
  const leg=(x,alpha)=>{out.save();out.globalAlpha=alpha;out.translate(x,seatY-4);out.rotate(fixed?-.95:-.67);out.drawImage(sample,left+w*.47,top+h*cut,w*.31,h*(fixed?.20:.15),-6,0,16,fixed?24:21);out.translate(0,fixed?21:17);out.rotate(fixed?1.2:.89);out.drawImage(sample,left+w*.48,top+h*(fixed?.75:.84),w*.31,h*(fixed?.25:.16),-6,0,14,fixed?28:24);out.restore();};
  leg(seatX-13,.68);out.drawImage(sample,left,top,w,h*cut,seatX-bodyW/2,seatY-bodyH,bodyW,bodyH);leg(seatX+4,1);
  if(riders.size>=72)riders.delete(riders.keys().next().value);riders.set(key,{source,canvas});return canvas;
 }
 function body(ctx,p,{image,roleIndex=0,tinted,fallback,x,y,direction}){
  const sprite=riderImage(image,roleIndex,tinted,false)??riderImage(fallback,roleIndex,null,true);if(!sprite)return false;
  if(sprite.r60){p.riderR60=sprite;p.gripR60=sprite.grip;return drawRiderLayerR60(ctx,sprite,p,x,y,direction);}
  if(sprite.r58)return drawSeatedRiderR58(ctx,sprite,p,x,y,direction);
  ctx.save();ctx.translate(x,y-20+p.bob);if(direction<-.08)ctx.scale(-1,1);ctx.drawImage(sprite,-72,-108,144,152);ctx.restore();return true;
 }
 function grip(ctx,p,x,y,direction){return !!p?.riderR60&&drawRiderLayerR60(ctx,p.riderR60,p,x,y,direction,true);}
 return{pose,animal,body,grip,cacheSize:()=>({images:images.size,riders:riders.size})};
}
