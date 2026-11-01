// Decorative continuation only. Collision, spawns and playable bounds stay intact.
// Source crops draw only exposed screen strips; there are no buffers or filters.
export function sceneryGutterTiles(cx:number,cy:number,vw:number,vh:number,ww:number,wh:number){
 const left=cx-vw/2,top=cy-vh/2,right=cx+vw/2,bottom=cy+vh/2;
 const tiles=[];
 for(let j=Math.floor(top/wh);j<Math.ceil(bottom/wh);j++)for(let i=Math.floor(left/ww);i<Math.ceil(right/ww);i++){
  if(i===0&&j===0)continue;
  const l=Math.max(left,i*ww),t=Math.max(top,j*wh),r=Math.min(right,(i+1)*ww),b=Math.min(bottom,(j+1)*wh);
  if(r<=l||b<=t)continue;
  const flipX=Math.abs(i%2)===1,flipY=Math.abs(j%2)===1;
  tiles.push({x:flipX?r:l,y:flipY?b:t,width:r-l,height:b-t,flipX,flipY,
   sx:flipX?ww-(r-i*ww):l-i*ww,sy:flipY?wh-(b-j*wh):t-j*wh});
 }
 return tiles;
}
export function drawSceneryGutter(ctx:CanvasRenderingContext2D,image:HTMLImageElement,cx:number,cy:number,vw:number,vh:number,ww:number,wh:number){
 if(!image.complete||!image.naturalWidth||!image.naturalHeight)return;
 if(cx-vw/2>=0&&cy-vh/2>=0&&cx+vw/2<=ww&&cy+vh/2<=wh)return;
 for(const tile of sceneryGutterTiles(cx,cy,vw,vh,ww,wh)){
  ctx.save();ctx.translate(tile.x,tile.y);ctx.scale(tile.flipX?-1:1,tile.flipY?-1:1);
  ctx.drawImage(image,tile.sx/ww*image.naturalWidth,tile.sy/wh*image.naturalHeight,
   tile.width/ww*image.naturalWidth,tile.height/wh*image.naturalHeight,0,0,tile.width,tile.height);
  ctx.restore();
 }
}
