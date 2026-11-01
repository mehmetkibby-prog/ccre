// One desktop reference scale across maps keeps characters equally sized.
// Desktop scenery gutters cover outside-map pixels without zooming actors in.
export function effectiveCameraZoom(preferred:number,width:number,height:number,worldWidth:number,worldHeight:number,desktop=false){
 const fit=Math.max(width/worldWidth,height/worldHeight);
 // Keep the six existing preferences and the slightly farther seventh step distinct, including on wide/Retina displays.
 // A narrow 20% range above coverage avoids the old 2x close-up regression.
 const desktopDistance=Math.max(-.25,Math.min(1,(preferred-.38)/(.98-.38)));
 const desktopScale=Math.max(width/3200,height/2000)*(1+desktopDistance*.2);
 return desktop ? desktopScale : Math.max(preferred,fit/1.2);
}
export function clampCamera(center:number,visible:number,world:number){
 return visible>=world?world/2:Math.max(visible/2,Math.min(world-visible/2,center));
}

export function areaCameraPreference(preferred:number,area:string,mobile:boolean,inDungeon=false){return preferred*(mobile&&area==="forest"&&!inDungeon ? .94 : 1);}

// A small extra forest-only distance adjustment, shared by drawing and picking.
export function areaCameraScale(area:string,inDungeon=false){return area==="forest"&&!inDungeon ? .95 : 1;}
