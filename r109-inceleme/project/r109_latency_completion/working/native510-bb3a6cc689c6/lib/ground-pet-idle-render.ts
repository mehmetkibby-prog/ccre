import {groundPetFrame,groundPetIdlePose,type GroundPetFollow} from './ground-pet-motion';

const FOX_CROPS=[[47,48,604,603],[644,59,1201,600],[50,655,575,1201],[668,657,1192,1201]] as const;
export function foxTailAnchor(pet:GroundPetFollow,size:number,now:number,seed:number,reducedMotion=false){
 const sit=groundPetIdlePose(pet,now,seed,reducedMotion).sit;
 return {x:pet.x-pet.facing*size*.3,y:pet.y-size*(.68-.28*sit)};
}
export function drawGroundPetSprite(ctx:CanvasRenderingContext2D, pet:GroundPetFollow,
  sprite:HTMLImageElement,walk:HTMLImageElement|undefined,foxIdle:HTMLImageElement|undefined,
  size:number,now:number,seed:number,reducedMotion=false){
 const pose=groundPetIdlePose(pet,now,seed,reducedMotion);
 const canWalk=!!walk?.complete&&walk.naturalWidth===1280&&walk.naturalHeight===256;
 const canSit=pet.kind!=='starter'||!!foxIdle?.complete&&foxIdle.naturalWidth>0;
 const sit=canSit?pose.sit:0;
 ctx.save();ctx.translate(pet.x,pet.y);ctx.scale(pet.facing,1);
 if(!pet.walking&&!reducedMotion){
  const breath=Math.sin(now/720+seed*.61);
  ctx.rotate(pose.shake*.055);
  ctx.transform(1+breath*.008,0,pose.look,1+breath*.015,0,0);
 }
 // Switch registered poses through a short crouch; never dissolve two bodies.
 const sitting=sit>=.5;
 ctx.scale(1,1-Math.sin(sit*Math.PI)*.07);
 if(!sitting){
  ctx.save();
  if(canWalk)ctx.drawImage(walk!,groundPetFrame(pet)*256,0,256,256,-size/2,-240/256*size,size,size);
  else if(pet.kind==='starter')ctx.drawImage(sprite,-size/2,-size,size,size);
  else{const w=sprite.naturalWidth/2,h=sprite.naturalHeight/2;ctx.drawImage(sprite,w,0,w,h,-size/2,-size*.91,size,size);}
  ctx.restore();
 }
 if(sitting){
  ctx.save();
  if(pet.kind==='starter'){
   const frame=sit<.65?1:pose.look>.009?3:2;
   const [x,y,r,b]=FOX_CROPS[frame],w=r-x,h=b-y;
   const height=size*.85,width=height*w/h;
   ctx.drawImage(foxIdle!,x,y,w,h,-width/2,-height,width,height);
  }else{
   const w=sprite.naturalWidth/2,h=sprite.naturalHeight/2;
   ctx.drawImage(sprite,0,0,w,h,-size/2,-size*.91,size,size);
  }
  ctx.restore();
 }
 ctx.restore();
}
