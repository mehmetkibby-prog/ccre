// Animated breathing/shear cannot reuse a uniformly scaled shadow bitmap.
// Rasterize those draws on a bounded surface at the exact device transform,
// then copy it 1:1. The scene never receives an image filter or shadow pass.
/**
 * @param {() => HTMLCanvasElement} [createCanvas]
 * @param {number} [pixelLimit]
 * @param {(key:string,width:number,height:number,paint:(ctx:CanvasRenderingContext2D)=>void)=>HTMLCanvasElement|null} [texture]
 * @returns {(ctx:CanvasRenderingContext2D,image:HTMLImageElement,sx:number,sy:number,sw:number,sh:number,x:number,y:number,width:number,height:number,capturedMatrix?:DOMMatrix)=>boolean}
 */
export function createDesktopAffineSpritePainter(
  createCanvas = () => document.createElement('canvas'),
  pixelLimit = 1_048_576,
  texture,
) {
  /** @type {HTMLCanvasElement | null} */
  let canvas = null;
  /** @type {CanvasRenderingContext2D | null} */
  let g = null;
  return (ctx,image,sx,sy,sw,sh,x,y,width,height,capturedMatrix) => {
    const m=capturedMatrix??ctx.getTransform(),filter=ctx.filter||'none',composite=ctx.globalCompositeOperation;
    if(!image.complete||!image.naturalWidth||!image.naturalHeight
      || ![m.a,m.b,m.c,m.d,m.e,m.f,sx,sy,sw,sh,x,y,width,height,ctx.shadowBlur,ctx.shadowOffsetX,ctx.shadowOffsetY].every(Number.isFinite)
      || !(sw>0&&sh>0&&width>0&&height>0) || Math.abs(m.a*m.d-m.b*m.c)<1e-12
      || (filter!=='none'&&!/^(?:(?:saturate|brightness|contrast)\([\d.]+\)\s*)+$/.test(filter))
      || (composite!=='source-over'&&composite!=='lighter'))return false;
    const px=m.a*x+m.c*y+m.e,py=m.b*x+m.d*y+m.f;
    const ax=m.a*width,ay=m.b*width,bx=m.c*height,by=m.d*height;
    const pad=Math.ceil(ctx.shadowBlur*3+2);
    const left=Math.floor(Math.min(px,px+ax,px+bx,px+ax+bx)+Math.min(0,ctx.shadowOffsetX)-pad);
    const top=Math.floor(Math.min(py,py+ay,py+by,py+ay+by)+Math.min(0,ctx.shadowOffsetY)-pad);
    const right=Math.ceil(Math.max(px,px+ax,px+bx,px+ax+bx)+Math.max(0,ctx.shadowOffsetX)+pad);
    const bottom=Math.ceil(Math.max(py,py+ay,py+by,py+ay+by)+Math.max(0,ctx.shadowOffsetY)+pad);
    const w=right-left,h=bottom-top;
    // Refuse pathological transforms without changing the original draw path.
    const capacityW=Math.ceil(w/64)*64,capacityH=Math.ceil(h/64)*64;
    if(!(w>0&&h>0)||capacityW*capacityH>pixelLimit)return false;
    if(!canvas){canvas=createCanvas();g=canvas.getContext('2d');}
    if(!g||!canvas)return false;
    // Reuse the same scratch surface; continuously changing poses must not
    // allocate a new cache entry or grow retained texture memory each frame.
    if(canvas.width<capacityW||canvas.height<capacityH){
      const nextW=Math.max(canvas.width,capacityW),nextH=Math.max(canvas.height,capacityH);
      const targetW=nextW*nextH<=pixelLimit?nextW:capacityW,targetH=nextW*nextH<=pixelLimit?nextH:capacityH;
      if(targetW<canvas.width)canvas.width=targetW;
      if(targetH<canvas.height)canvas.height=targetH;
      if(canvas.width!==targetW)canvas.width=targetW;
      if(canvas.height!==targetH)canvas.height=targetH;
    }
    g.setTransform(1,0,0,1,0,0);
    g.clearRect(0,0,canvas.width,canvas.height);
    g.setTransform(m.a,m.b,m.c,m.d,m.e-left,m.f-top);
    g.imageSmoothingEnabled=ctx.imageSmoothingEnabled;g.imageSmoothingQuality=ctx.imageSmoothingQuality;
    /** @type {HTMLCanvasElement | null} */
    let filtered=null;
    if(filter!=='none'&&texture){
      // Pointwise color filters are invariant under pose changes. Keep the
      // complete source resolution, independent of the animated transform.
      const key=['desktop-source-filter',image.src,image.naturalWidth,image.naturalHeight,sx,sy,sw,sh,filter].join(':');
      filtered=texture(key,Math.ceil(sw),Math.ceil(sh),source=>{
        source.filter=filter;
        source.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);
      });
    }
    g.filter=filtered?'none':filter;g.globalAlpha=ctx.globalAlpha;g.globalCompositeOperation=composite;
    g.shadowColor=ctx.shadowColor;g.shadowBlur=ctx.shadowBlur;
    g.shadowOffsetX=ctx.shadowOffsetX;g.shadowOffsetY=ctx.shadowOffsetY;
    if(filtered)g.drawImage(filtered,0,0,sw,sh,x,y,width,height);
    else g.drawImage(image,sx,sy,sw,sh,x,y,width,height);
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.filter='none';ctx.shadowBlur=0;ctx.shadowColor='transparent';
    ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;ctx.globalAlpha=1;
    ctx.drawImage(canvas,0,0,w,h,left,top,w,h);
    ctx.restore();
    return true;
  };
}
