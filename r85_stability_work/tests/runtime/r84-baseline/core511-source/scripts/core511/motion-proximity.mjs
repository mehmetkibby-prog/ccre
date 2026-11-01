// Cosmetic audience only. No position, input, owner, epoch or fence is written.
export const MOTION_SCREEN_MULTIPLIER=1.5;
export function validMotionMultiplier(value){return typeof value==='number'&&Number.isFinite(value)&&value>=1.5&&value<=6;}
export function motionViewport(entry,payload,row){
 if(!row||payload?.area!==row.area||payload?.streamId!==entry.streamId)return false;
 const {width,height}=payload;
 if(![width,height].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=1000000))return false;
 // A viewport can only widen this connection's audience. Zooming/resizing
 // cannot briefly hide a visible player while older samples are in flight.
 const old=entry.viewport;
 entry.viewport={width:Math.max(old?.width??0,width),height:Math.max(old?.height??0,height)};
 return true;
}
export function nearMotion(viewer,event,multiplier,now){
 const {entry,row}=viewer,view=entry.viewport;
 // Legacy/reconnecting clients and camera easing after a teleport retain
 // R33's full audience until an authenticated viewport is known/stable.
 if(!view||now<(entry.cameraSettlesAt??0))return true;
 // Use a FULL screen diagonal: at a map edge the character need not be at
 // screen centre. 512 also covers own prediction, camera easing and sprites.
 const radius=Math.hypot(view.width,view.height)*multiplier+512;
 return (event.x-row.x)**2+(event.y-row.y)**2<=radius*radius;
}
