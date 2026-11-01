// Rasterize a padded map viewport at its display resolution, then reuse it
// while the camera moves within that padding. Never cache actors or hazards.
type MapPresenter=(ctx:CanvasRenderingContext2D,canvas:HTMLCanvasElement,left:number,top:number,width:number,height:number)=>void;
export function createMobileMapCache(createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'), present?:MapPresenter, pixelLimit = 6_000_000) {
 const canvas=createCanvas();
 const g=canvas.getContext('2d',{alpha:false});
 let source: HTMLImageElement | null=null;
 let key='',left=0,top=0,right=0,bottom=0;
 return {
  draw(ctx:CanvasRenderingContext2D,image:HTMLImageElement,cx:number,cy:number,vw:number,vh:number,ww:number,wh:number,scale:number) {
   if(!g || !image.naturalWidth || !image.naturalHeight || !(vw>0&&vh>0&&ww>0&&wh>0&&scale>0))return false;
   const l=Math.max(0,cx-vw/2),t=Math.max(0,cy-vh/2),r=Math.min(ww,cx+vw/2),b=Math.min(wh,cy+vh/2);
   const signature=[image.src,image.naturalWidth,image.naturalHeight,vw,vh,ww,wh,scale].join(':');
   if(source!==image||key!==signature||l<left||t<top||r>right||b>bottom) {
    const pad=96;
    // Anchor every cache rebuild to the same world-pixel grid. Drawing this
    // cache is then exactly 1:1 in device pixels, without a second resample.
    left=Math.max(0,Math.floor((l-pad)*scale)/scale);top=Math.max(0,Math.floor((t-pad)*scale)/scale);
    right=Math.ceil(Math.min(ww,r+pad)*scale)/scale;bottom=Math.ceil(Math.min(wh,b+pad)*scale)/scale;
    const w=right-left,h=bottom-top;
    if(w<=0||h<=0)return false;
    const pixelWidth=Math.max(1,Math.round(w*scale)),pixelHeight=Math.max(1,Math.round(h*scale));
    // An unusually large viewport uses the original map directly, not a blurry
    // undersized cache. Invalidate first so it cannot reuse stale contents.
    source=null;key='';
    if(pixelWidth*pixelHeight>pixelLimit){if(canvas.width!==1||canvas.height!==1)canvas.width=canvas.height=1;return false;}
    canvas.width=pixelWidth;canvas.height=pixelHeight;
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    const sourceW=Math.min(right,ww)-left,sourceH=Math.min(bottom,wh)-top;
    g.drawImage(image,left/ww*image.naturalWidth,top/wh*image.naturalHeight,sourceW/ww*image.naturalWidth,sourceH/wh*image.naturalHeight,0,0,sourceW*scale,sourceH*scale);
    source=image;key=signature;
   }
   if(present)present(ctx,canvas,left,top,right-left,bottom-top);
   else ctx.drawImage(canvas,left,top,right-left,bottom-top);
   return true;
  },
  dispose(){source=null;key='';canvas.width=canvas.height=1;},
 };
}

// Retain the map as a compositor layer. Camera travel moves this existing
// bitmap; only reaching the padded edge, resizing or changing maps rasterizes.
// Actors, hazards and labels stay in their original live scene/text canvases.
export function createMobileMapLayer(canvas:HTMLCanvasElement){
 let ratio=1,transform='',size='';
 const cache=createMobileMapCache(()=>canvas,(ctx,bitmap,left,top)=>{
  const m=ctx.getTransform();
  const nextSize=`${bitmap.width}:${bitmap.height}:${ratio}`;
  if(nextSize!==size){bitmap.style.width=`${bitmap.width/ratio}px`;bitmap.style.height=`${bitmap.height/ratio}px`;size=nextSize;}
  const nextTransform=`translate3d(${(m.a*left+m.c*top+m.e)/ratio}px,${(m.b*left+m.d*top+m.f)/ratio}px,0)`;
  if(nextTransform!==transform){bitmap.style.transform=nextTransform;transform=nextTransform;}
  bitmap.hidden=false;
 });
 return {
  draw(ctx:CanvasRenderingContext2D,image:HTMLImageElement,cx:number,cy:number,vw:number,vh:number,ww:number,wh:number,scale:number,pixelRatio:number){
   ratio=pixelRatio;
   const drawn=cache.draw(ctx,image,cx,cy,vw,vh,ww,wh,scale);
   if(!drawn)canvas.hidden=true;
   return drawn;
  },
  hide(){canvas.hidden=true;},
  dispose(){canvas.hidden=true;cache.dispose();},
 };
}
