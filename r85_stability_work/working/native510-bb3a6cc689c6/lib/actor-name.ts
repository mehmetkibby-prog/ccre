import {RANK_GROUPS} from './ranks.mjs';
type NameWidths = {prefixWidth:number;totalWidth:number};
const actorNameWidths = new WeakMap<CanvasRenderingContext2D,Map<string,NameWidths>>();
const guildAnchorWidths = new WeakMap<CanvasRenderingContext2D,Map<string,number>>();
const metricKey=(ctx:CanvasRenderingContext2D,name:string)=>JSON.stringify([ctx.font,ctx.direction,ctx.fontKerning,ctx.fontStretch,ctx.fontVariantCaps,ctx.letterSpacing,ctx.wordSpacing,ctx.textRendering,name]);
// Guild alignment uses the browser's full-string width, not an approximation
// from the separately painted level/name segments. Translation/zoom cannot
// change these CSS-pixel metrics; all text-shaping properties are in the key.
export function actorNameWidth(ctx:CanvasRenderingContext2D,name:string){
 let cache=guildAnchorWidths.get(ctx);if(!cache){cache=new Map();guildAnchorWidths.set(ctx,cache);}
 const key=metricKey(ctx,name),cached=cache.get(key);if(cached!==undefined)return cached;
 const width=ctx.measureText(name).width;
 if(cache.size>=512)cache.delete(cache.keys().next().value!);cache.set(key,width);return width;
}
const frames=new WeakMap<CanvasRenderingContext2D,{zoom:number;farMobile:boolean;desktop:boolean;slightlyLargerPlayers:boolean;mobileFarBoost:boolean;fifthMobile:boolean}>();
export function setActorNameFrame(ctx:CanvasRenderingContext2D,zoom:number,farMobile:boolean,desktop=false,slightlyLargerPlayers=false,mobileFarBoost=false,fifthMobile=false){
 const current=frames.get(ctx);
 if(current){current.fifthMobile=fifthMobile;current.mobileFarBoost=mobileFarBoost;current.zoom=zoom;current.farMobile=farMobile;current.desktop=desktop;current.slightlyLargerPlayers=slightlyLargerPlayers;}else frames.set(ctx,{zoom,farMobile,desktop,slightlyLargerPlayers,mobileFarBoost,fifthMobile});
}
// Player segments share one measured line, font and baseline. Monster colors stay intact.
export function drawActorName(ctx:CanvasRenderingContext2D,name:string,x:number,y:number,outline=false,player=false){
 const frame=frames.get(ctx);
 const paint=(stroke:boolean)=>{
  const parts=player?/^((?:Lv|Avcı|Fedai|Muhafız|Cellat|Hükümdar|Efsane)\s+\d+)(\s+)(.+)$/.exec(name):null;
  if(!parts){if(stroke)ctx.strokeText(name,x,y);ctx.fillText(name,x,y);return;}
  const prefix=parts[1]+parts[2];
  // Retain exact browser metrics on desktop too. The actual glyph drawing,
  // glow and positions remain unchanged; only repeated measurement is skipped.
  let cache=frame?actorNameWidths.get(ctx):undefined;
  if(frame&&!cache){cache=new Map();actorNameWidths.set(ctx,cache);}
  const key=metricKey(ctx,name);
  let widths=cache?.get(key);
  if(!widths){const prefixWidth=ctx.measureText(prefix).width;widths={prefixWidth,totalWidth:prefixWidth+ctx.measureText(parts[3]).width};
   if(cache){if(cache.size>=512)cache.delete(cache.keys().next().value!);cache.set(key,widths);}}
  const {prefixWidth,totalWidth}=widths;
  const start=ctx.textAlign==='center'?x-totalWidth/2:ctx.textAlign==='right'||ctx.textAlign==='end'?x-totalWidth:x;
  ctx.save();ctx.textAlign='left';ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(4,12,8,.95)';ctx.lineWidth=1.25/Math.max(.1,frame?.zoom??1);ctx.lineJoin='round';
  // Legacy light-yellow Lv treatment, aligned in the shared measured line.
  const rank=RANK_GROUPS.find(group=>parts[1].startsWith(group[1]+' '));
  ctx.fillStyle=rank?.[2]??'#ffe45c';ctx.shadowColor='#ffc400';ctx.shadowBlur=rank?0:frame?.desktop?7:0;if(rank)ctx.strokeText(parts[1],start,y);ctx.fillText(parts[1],start,y);ctx.shadowBlur=0;
  ctx.fillStyle='#ffffff';ctx.fillText(parts[3],start+prefixWidth,y);ctx.restore();
 };
 // Players retain the pre-V275 12px system-ui font/weight supplied by drawHero.
 // Distance readability adjustments below remain exclusive to monsters.
 if(player){if(frame?.slightlyLargerPlayers)ctx.font=ctx.font.replace(/\b12px\b/,frame.desktop?"14px":frame.fifthMobile?"16.06605px":frame.mobileFarBoost?"15.015px":"13px");paint(false);return;}
 if(!frame?.farMobile){
  if(frame?.desktop){const weight=ctx.font.startsWith('700')?'700':'600';ctx.font=`${weight} ${Math.max(12,9/Math.max(.1,frame.zoom))}px system-ui`;}
  paint(outline);return;
 }
 // Mobile monsters use the original world-space font supplied by their renderer.
 // Do not enlarge names to a fixed screen-space size at distant camera steps.
 paint(outline);
}

export function actorGuildFontSize(ctx:CanvasRenderingContext2D){const frame=frames.get(ctx);return frame?.desktop&&frame.slightlyLargerPlayers?13:frame?.fifthMobile&&!frame.desktop?14.8302:frame?.mobileFarBoost?13.86:12;}
