// Load on first guild-war entry only; reuse one decoded image, without animated
// background layers, filters or particles on mobile.
let image:HTMLImageElement|null=null;
export function getGuildWarMap(){
 if(!image){image=new Image();image.decoding='async';image.src='/game/guild-arena-v287.webp';}
 return image.complete&&image.naturalWidth>0?image:null;
}
