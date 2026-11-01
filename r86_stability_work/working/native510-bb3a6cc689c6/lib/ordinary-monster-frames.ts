import type {SpritePainter} from './mobile-sprite-cache';
// Pre-rendered frames: a single draw call, fixed feet, no mesh or per-frame rasterization.
export function drawOrdinaryMonsterFrame(ctx:CanvasRenderingContext2D,atlas:HTMLImageElement|undefined,species:number,rows:number,x:number,bottom:number,size:number,travel:number,moving:boolean,attack:number,directionX:number,facesLeft=false,paintSprite?:SpritePainter){
 if(!atlas?.complete||atlas.naturalWidth!==1280||atlas.naturalHeight!==rows*256)return false;
 const frame=attack>0?Math.min(4,Math.floor(attack*5)):moving?Math.floor(travel/19)%5:0;
 const row=species*2+(attack>0?1:0),scale=size/216;
 const flip=facesLeft?directionX>.08:directionX<-.08;
 ctx.save();ctx.translate(x,bottom);if(flip)ctx.scale(-1,1);
 if(!paintSprite?.(ctx,atlas,frame*256,row*256,256,256,-128*scale,-232*scale,256*scale,256*scale))
 ctx.drawImage(atlas,frame*256,row*256,256,256,-128*scale,-232*scale,256*scale,256*scale);
 ctx.restore();return true;
}
