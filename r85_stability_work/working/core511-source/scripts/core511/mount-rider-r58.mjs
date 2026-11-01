// Built once per appearance, with real armor pixels; no per-frame pixel reads.
export function seatedRiderR58(sample,{left,top,w,h},host){
 const make=()=>{const c=host.document.createElement('canvas');c.width=144;c.height=152;return c;};
 const torso=make(),legs=make(),upper=torso.getContext('2d'),lower=legs.getContext('2d');if(!upper||!lower)return null;
 const hipX=72,hipY=108,cut=.55,bodyH=65,scale=bodyH/(h*cut),bodyW=w*scale;
 // Keep each leg's own armor and boot. A forward thigh and vertical shin
 // form a seated knee; the far leg is narrower and darker behind the saddle.
 const leg=(near)=>{
  lower.save();lower.translate(hipX+(near?4:-11),hipY-3);lower.globalAlpha=near?1:.66;
  lower.rotate(near?-1.02:-.82);
  const start=near?.51:.23,width=near?.37:.29;
  lower.drawImage(sample,left+w*start,top+h*.55,w*width,h*.24,-7,0,near?19:15,25);
  lower.translate(0,22);lower.rotate(near?1.15:.95);
  lower.drawImage(sample,left+w*start,top+h*.77,w*width,h*.23,-7,0,near?18:14,26);
  lower.restore();
 };
 leg(false);leg(true);
 upper.drawImage(sample,left,top,w,h*cut,hipX-bodyW/2,hipY-bodyH,bodyW,bodyH);
 return {r58:true,torso,legs};
}
export function drawSeatedRiderR58(ctx,sprite,pose,x,y,direction){
 const phase=pose.attackPhase??0,swing=pose.attacking?Math.sin(phase*Math.PI):0;
 ctx.save();ctx.translate(x,y-20+pose.bob);if(direction<-.08)ctx.scale(-1,1);
 ctx.drawImage(sprite.legs,-72,-108);ctx.rotate(.06+swing*.16);ctx.drawImage(sprite.torso,-72,-108);ctx.restore();return true;
}
