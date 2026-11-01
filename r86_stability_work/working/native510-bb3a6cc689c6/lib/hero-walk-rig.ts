// A shared lower-body rig keeps every armour painting and its hand positions.
// Poses are baked at display resolution, never deformed for every actor/frame.
export const WALK_RIG_FRAMES = 16;
export function walkRigStep(now:number,role:string){
 const duration=role==='avci'?560:role==='arkanist'?680:640;
 return Math.floor(((now%duration)+duration)%duration/duration*WALK_RIG_FRAMES);
}
export function walkRigPoint(u:number,v:number,step:number,role:string){
 const phase=step/WALK_RIG_FRAMES*Math.PI*2;
 const leg=Math.tanh((u-.51)*7);
 const start=role==='arkanist'?.53:.51;
 const t=Math.max(0,Math.min(1,(v-start)/(.96-start)));
 const weight=t*t*(3-2*t);
 const swing=Math.sin(phase)*leg;
 const stride=role==='avci'?.13:role==='arkanist'?.09:.115;
 // The supporting sole stays down. Only the returning leg lifts and bends.
 const lift=Math.max(0,swing);
 const knee=Math.sin(t*Math.PI)*lift;
 return {x:u+swing*stride*weight-knee*.025*leg,
   y:v-lift*.065*weight+knee*.012};
}
const MAX_POSES=320;
// A crowded desktop scene can need 3 classes x 5 armour looks x 16 poses.
// Their existing double-resolution frames exceed 48 MiB; evicting them while
// they are still visible causes perpetual rebaking and near-static walking.
// Keep the mobile budget unchanged and isolate it from desktop/avatar churn.
const mobilePoseCache={poses:new Map<string,HTMLCanvasElement>(),bytes:0,limit:48*1024*1024};
const desktopPoseCache={poses:new Map<string,HTMLCanvasElement>(),bytes:0,limit:96*1024*1024};
// Cold poses used to run 96 clipped draws inside the input/paint callback.
// Bake at most one mesh row per task; even Safari timer fallbacks yield to input.
const pendingPoses=new Map<string,()=>boolean>();
let bakeScheduled=false;
function schedulePoseBake(){
 if(bakeScheduled||!pendingPoses.size)return;
 bakeScheduled=true;
 const bake=()=>{
  bakeScheduled=false;
  const job=pendingPoses.entries().next().value;
  if(job && job[1]())pendingPoses.delete(job[0]);
  schedulePoseBake();
 };
 // A busy Chrome frame can use the timeout for every slice. At 120 ms, one
 // pose needed 840 ms and other armour looks could stay almost static for
 // seconds. Match Safari's existing 8 ms deadline, still one row per task.
 if(typeof window.requestIdleCallback==='function')window.requestIdleCallback(bake,{timeout:8});
 else window.setTimeout(bake,8);
}
export function articulatedWalkFrame(image:HTMLImageElement,row:number,step:number,role:string,width:number,height:number,tinted:HTMLCanvasElement|null,rarity?:string|null){
 const cache=rarity?.endsWith(':desktop')?desktopPoseCache:mobilePoseCache;
 const poses=cache.poses;
 const prefix=`${image.src}:${row}:${role}:${width}:${height}:${rarity??''}:`;
 const key=prefix+step;
 const hit=poses.get(key);if(hit){poses.delete(key);poses.set(key,hit);return hit;}
 // Backpressure keeps an in-progress pose alive even in a crowded scene.
 if(!pendingPoses.has(key)&&pendingPoses.size<64){
  const bake=bakeWalkFrame(image,row,step,role,width,height,tinted);
  pendingPoses.set(key,()=>{
   const slice=bake.next();
   if(!slice.done)return false;
   const canvas=slice.value;
   if(canvas){poses.set(key,canvas);cache.bytes+=canvas.width*canvas.height*4;
    while(poses.size>MAX_POSES||cache.bytes>cache.limit){const oldest=poses.keys().next().value!;const old=poses.get(oldest)!;cache.bytes-=old.width*old.height*4;poses.delete(oldest);}
   }
   return true;
  });
  schedulePoseBake();
 }
 // Keep the same armour visible while the requested pose is being prepared.
 for(let distance=1;distance<=WALK_RIG_FRAMES/2;distance++){
  const closest=poses.get(prefix+((step-distance+WALK_RIG_FRAMES)%WALK_RIG_FRAMES))
   ??poses.get(prefix+((step+distance)%WALK_RIG_FRAMES));
  if(closest)return closest;
 }
 return null;
}
function* bakeWalkFrame(image:HTMLImageElement,row:number,step:number,role:string,width:number,height:number,tinted:HTMLCanvasElement|null){
 const pad=20,canvas=document.createElement('canvas');canvas.width=Math.ceil(width+pad*2);canvas.height=Math.ceil(height+pad*2);
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 const cols=8,rows=12,cw=image.naturalWidth/6,ch=image.naturalHeight/3;
 // Resample the atlas once, rather than resampling a large texture per triangle.
 const source=document.createElement('canvas');source.width=Math.ceil(width);source.height=Math.ceil(height);
 const sourceContext=source.getContext('2d');if(!sourceContext)return null;
 if(tinted)sourceContext.drawImage(tinted,0,0,source.width,source.height);
 else sourceContext.drawImage(image,0,row*ch,cw,ch,0,0,source.width,source.height);
 const point=(i:number,j:number)=>{const p=walkRigPoint(i/cols,j/rows,step,role);return{x:p.x*width+pad,y:p.y*height+pad};};
 const draw=(a:{x:number;y:number},b:{x:number;y:number},c:{x:number;y:number},sa:{x:number;y:number},sb:{x:number;y:number},sc:{x:number;y:number})=>{
  const det=(sb.x-sa.x)*(sc.y-sa.y)-(sc.x-sa.x)*(sb.y-sa.y);
  const ax=((b.x-a.x)*(sc.y-sa.y)-(c.x-a.x)*(sb.y-sa.y))/det;
  const bx=((c.x-a.x)*(sb.x-sa.x)-(b.x-a.x)*(sc.x-sa.x))/det;
  const ay=((b.y-a.y)*(sc.y-sa.y)-(c.y-a.y)*(sb.y-sa.y))/det;
  const by=((c.y-a.y)*(sb.x-sa.x)-(b.y-a.y)*(sc.x-sa.x))/det;
  ctx.save();ctx.beginPath();
  // Subpixel overlap seals triangle edges without a visible mesh on Safari.
  const cx=(a.x+b.x+c.x)/3,cy=(a.y+b.y+c.y)/3;
  for(const [n,p] of [a,b,c].entries()){const dx=p.x-cx,dy=p.y-cy,len=Math.hypot(dx,dy)||1;const x=p.x+dx/len*.35,y=p.y+dy/len*.35;if(n===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
  ctx.closePath();ctx.clip();ctx.transform(ax,ay,bx,by,a.x-ax*sa.x-bx*sa.y,a.y-ay*sa.x-by*sa.y);
  ctx.drawImage(source,0,0,width,height);
  ctx.restore();
 };
 // The upper body stays whole; hands and equipment retain their exact anchors.
 const seam=height*.5;
 ctx.drawImage(source,0,0,source.width,source.height*.5,pad,pad,width,seam);
 for(let j=6;j<rows;j++){
 for(let i=0;i<cols;i++){
  const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);
  const sa={x:i/cols*width,y:j/rows*height},sb={x:(i+1)/cols*width,y:sa.y},sc={x:sb.x,y:(j+1)/rows*height},sd={x:sa.x,y:sc.y};
  draw(a,b,c,sa,sb,sc);draw(a,c,d,sa,sc,sd);
 }
 yield;
 }
 return canvas;
}
