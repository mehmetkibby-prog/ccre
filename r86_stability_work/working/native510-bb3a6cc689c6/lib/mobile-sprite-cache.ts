type TextureCache = (key:string,width:number,height:number,paint:(ctx:CanvasRenderingContext2D)=>void)=>HTMLCanvasElement|null;
export type SpritePainter = (ctx:CanvasRenderingContext2D,image:HTMLImageElement,sx:number,sy:number,sw:number,sh:number,x:number,y:number,width:number,height:number)=>boolean;

// Bake image scaling and its shadow together at the actual scene resolution.
// Movement only changes the destination; no per-frame blur or atlas rescaling.
export function createMobileSpritePainter(texture:TextureCache):SpritePainter {
 return (ctx,image,sx,sy,sw,sh,x,y,width,height)=>{
  const m=ctx.getTransform(),scale=Math.abs(m.a);
  if(!image.complete||!image.naturalWidth||!image.naturalHeight||m.b!==0||m.c!==0||Math.abs(m.d)!==scale||!(scale>0))return false;
  const blur=ctx.shadowBlur,pad=Math.ceil(blur*2+2);
  if(ctx.shadowOffsetX||ctx.shadowOffsetY||ctx.filter&&ctx.filter!=='none')return false;
  const w=Math.ceil(width*scale)+pad*2,h=Math.ceil(height*scale)+pad*2;
  const key=[image.src,image.naturalWidth,image.naturalHeight,sx,sy,sw,sh,width,height,scale,blur,ctx.shadowColor].join(':');
  const bitmap=texture(key,w,h,g=>{
   g.setTransform(scale,0,0,scale,pad,pad);
   g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
   g.shadowBlur=blur;g.shadowColor=ctx.shadowColor;
   g.drawImage(image,sx,sy,sw,sh,0,0,width,height);
  });
  if(!bitmap)return false;
  ctx.save();ctx.shadowBlur=0;ctx.shadowColor='transparent';
  ctx.drawImage(bitmap,x-pad/scale,y-pad/scale,w/scale,h/scale);
  ctx.restore();return true;
 };
}
