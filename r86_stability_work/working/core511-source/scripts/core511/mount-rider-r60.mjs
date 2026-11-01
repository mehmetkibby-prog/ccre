import {seatedRiderR58} from './mount-rider-r58.mjs';
// The grip is measured in the SAME cropped native armor frame as the rider.
// Guardian and arcanist hold in the near (left) hand, hunter in the far hand.
// Cache the glove/cuff pixels once, then paint them over the weapon handle.
export function seatedRiderR60(sample,bounds,host,roleIndex){
 const sprite=seatedRiderR58(sample,bounds,host);if(!sprite)return null;
 const {left,top,w,h}=bounds,cut=.61,bodyH=72,scale=bodyH/(h*cut),bodyW=w*scale;
 const gripPoints=[{x:.16,y:.54},{x:.88,y:.54},{x:.27,y:.55}],point=gripPoints[roleIndex]??gripPoints[0];
 const torso=sprite.torso,ctx=torso.getContext('2d');ctx.clearRect(0,0,torso.width,torso.height);
 ctx.drawImage(sample,left,top,w,h*cut,72-bodyW/2,108-bodyH,bodyW,bodyH);
 const glove=host.document.createElement('canvas');glove.width=144;glove.height=152;const g=glove.getContext('2d');
 const gx=left+w*point.x,gy=top+h*point.y,gw=w*.10,gh=h*.075;
 g.drawImage(sample,gx-gw/2,gy-gh/2,gw,gh,72-bodyW/2+(gx-left-gw/2)*scale,108-bodyH+(gy-top-gh/2)*scale,gw*scale,gh*scale);
 return {...sprite,r60:true,glove,grip:{x:(point.x-.5)*bodyW,y:-bodyH+point.y*h*scale}};
}
export function mountedLeanR60(pose){return .025+(pose?.attacking?Math.sin(Math.max(0,Math.min(1,pose.attackPhase??0))*Math.PI)*.13:0);}
export function drawRiderLayerR60(ctx,sprite,pose,x,y,direction,gloveOnly=false){
 ctx.save();ctx.translate(x,y-20+pose.bob);if(direction<-.08)ctx.scale(-1,1);
 if(!gloveOnly)ctx.drawImage(sprite.legs,-72,-108);
 ctx.rotate(mountedLeanR60(pose));ctx.drawImage(gloveOnly?sprite.glove:sprite.torso,-72,-108);ctx.restore();return true;
}
export function mountedHandR60(x,y,direction,mount){
 const facing=direction<-.08?-1:1,p=mount.gripR60,lean=mountedLeanR60(mount),cos=Math.cos(lean),sin=Math.sin(lean);
 return {x:x+facing*(p.x*cos-p.y*sin),y:y+8+(mount.bob??0)+p.x*sin+p.y*cos,facing};
}
export function mountedWeaponRotationR60(role,rotation,pose){
 if(role!=='muhafiz'||!pose?.mountedR58?.gripR60)return rotation;
 // Carry the blade above the saddle. The existing class/skin-specific attack
 // rotation and pivot remain authoritative while swinging.
 return pose.attacking?rotation:rotation-Math.PI;
}
