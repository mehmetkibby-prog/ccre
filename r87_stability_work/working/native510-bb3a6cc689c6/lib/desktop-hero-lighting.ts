// Cached relighting retains the authored silhouette, armour colours and transparency.
// Only desktop callers use these textures; no per-frame filters or pixel readback.
const frames=new Map<string,HTMLCanvasElement>();
const MAX_FRAMES=48;
export function desktopHeroFrame(image:HTMLImageElement,row:number,frame:number,tinted:HTMLCanvasElement|null,rarity?:string|null){
 const key=`${image.src}:${row}:${frame}:${rarity??''}`;
 const hit=frames.get(key);if(hit){frames.delete(key);frames.set(key,hit);return hit;}
 const width=Math.round(image.naturalWidth/6),height=Math.round(image.naturalHeight/3);
 if(!width||!height||typeof document==='undefined')return tinted;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const g=canvas.getContext('2d');if(!g)return tinted;
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 if(tinted)g.drawImage(tinted,0,0,width,height);
 else g.drawImage(image,frame*image.naturalWidth/6,row*image.naturalHeight/3,image.naturalWidth/6,image.naturalHeight/3,0,0,width,height);
 // A soft top-left key and shaded lower-right side add volume, not a luminous outline.
 g.globalCompositeOperation='source-atop';
 const light=g.createLinearGradient(0,0,width,height*.78);
 light.addColorStop(0,'rgba(255,244,218,.16)');light.addColorStop(.4,'rgba(255,248,230,.035)');light.addColorStop(.7,'rgba(10,17,24,.02)');light.addColorStop(1,'rgba(5,12,18,.13)');
 g.fillStyle=light;g.fillRect(0,0,width,height);
 g.globalCompositeOperation='source-over';frames.set(key,canvas);
 if(frames.size>MAX_FRAMES)frames.delete(frames.keys().next().value!);
 return canvas;
}
