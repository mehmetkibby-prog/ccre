// R93: one immutable illustrated atlas, loaded only when an item is displayed.
// Built beside the atlas in generated/client. The source is bundled by the release builder.
export const ZUMRUT_ART_FILE_R93='zumrut-items-r93-7753cdbf438ef095.webp';
export const ZUMRUT_ART_URL_R93=new URL('./'+ZUMRUT_ART_FILE_R93,import.meta.url).href;
export const ZUMRUT_TALISMAN_FILE_R93='mount-talisman-r93-0bd57198fab39f6a.webp';
export const ZUMRUT_TALISMAN_URL_R93=new URL('./'+ZUMRUT_TALISMAN_FILE_R93,import.meta.url).href;
export const ZUMRUT_ICON_CELLS_R93=Object.freeze({
 wood:Object.freeze([0,0]),stone:Object.freeze([1,0]),axe:Object.freeze([0,1]),pickaxe:Object.freeze([1,1]),talisman:Object.freeze([0,0])
});
const aliases=Object.freeze({mount_talisman_r93:'talisman','material:mount_talisman_r93':'talisman',zumrut_wood_r93:'wood',zumrut_stone_r93:'stone',zumrut_axe_r93:'axe',zumrut_pickaxe_r93:'pickaxe',zumrut_wood:'wood',zumrut_stone:'stone',zumrut_axe:'axe',zumrut_pickaxe:'pickaxe',wood_r93:'wood',stone_r93:'stone',axe_r93:'axe',pickaxe_r93:'pickaxe'});
const labels=Object.freeze({wood:'Odun',stone:'Taş',axe:'Oduncu Baltası',pickaxe:'Madenci Kazması',talisman:'Binek Tılsımı'});
export function zumrutIconKindR93(kind){return Object.hasOwn(ZUMRUT_ICON_CELLS_R93,kind)?kind:aliases[kind]??null;}
export function zumrutIconStyleR93(kind,size=54,url){
 const k=zumrutIconKindR93(kind),cell=ZUMRUT_ICON_CELLS_R93[k];if(!cell)return null;url??=k==='talisman'?ZUMRUT_TALISMAN_URL_R93:ZUMRUT_ART_URL_R93;
 return {display:'inline-block',width:size,height:size,flexShrink:0,verticalAlign:'middle',
  backgroundImage:'url("'+url+'")',backgroundSize:k==='talisman'?'100% 100%':'200% 200%',backgroundRepeat:'no-repeat',
  backgroundPosition:(cell[0]*100)+'% '+(cell[1]*100)+'%',filter:'drop-shadow(0 2px 2px #071b1266)'};
}
export function zumrutItemIconR93(React,kind,label,size=54,{url,className=''}={}){
 const k=zumrutIconKindR93(kind),style=zumrutIconStyleR93(k,size,url);if(!style)return null;
 return React.createElement('span',{className:'zumrut93-item-icon '+className,role:'img','aria-label':label||labels[k],title:label||labels[k],style});
}
const atlases=new Map(); // Two immutable image assets maximum: resource/tool atlas and talisman.
export function preloadZumrutArtR93(url=ZUMRUT_ART_URL_R93){
 if(typeof Image==='undefined')return null;
 if(!atlases.has(url)){if(atlases.size>=2)atlases.delete(atlases.keys().next().value);const image=new Image();image.decoding='async';image.src=url;image.decode?.().catch(()=>{});atlases.set(url,image);}
 return atlases.get(url);
}
// Immediate small-vector fallback while the atlas decodes. No global timers or eager preload.
const shapes={
 talisman:[
  ['M27 9Q19 2 16 11Q13 19 25 17M27 9Q40 1 44 11L43 19','none','#735039',4],
  ['M18 18Q32 9 46 18Q60 34 51 54L40 58 38 48 43 45Q51 28 38 23H26Q13 28 21 45L26 48 24 58 13 54Q3 34 18 18Z','#b78c43'],
  ['M18 18Q32 9 46 18M13 49 20 52M44 52 51 49','none','#f5d88a',2],
  ['M31 22 43 32 39 45 31 51 22 44 20 32Z','#0c6c45'],
  ['M31 22 43 32 31 35 20 32Z','#70c99b'],['M31 35 39 45 31 51 22 44Z','#1fa573'],
  ['M21 12 33 10 43 17 32 26 21 20Z','#c49b59'],
  ['M28 13 31 15 37 14 36 17 32 18 30 22 27 18Z','#f5d68c']
 ],
 wood:[
  ['M10 29 35 13 57 22 31 40Z','#503523'],['M7 37 32 21 56 33 29 50Z','#785034'],
  ['M11 29C3 31 2 44 12 49L27 56C38 58 43 44 34 38Z','#c99553'],
  ['M13 32C6 34 7 43 15 46L28 51C35 53 39 45 32 41Z','#edbe73'],
  ['M16 35C10 37 13 43 18 44L28 48C33 48 35 45 29 43Z','#b8813d'],
  ['M17 39 29 44','none','#ffe3a0',1.5],['M30 19 48 27M23 26 42 35M19 21 38 31','none','#af8150',2],
  ['M24 20 43 33 36 46M29 17 48 30 41 42','none','#dbc390',3],['M43 8 37 26 50 18M40 16 33 17M42 12 48 12','none','#527542',2]
 ],
 stone:[
  ['M9 37 19 17 39 8 53 25 58 45 36 57 15 52Z','#657a81'],
  ['M19 17 39 8 35 31 9 37Z','#b7c8c8'],['M39 8 53 25 35 31Z','#8fa5ac'],
  ['M9 37 35 31 36 57 15 52Z','#93a3a3'],['M35 31 53 25 58 45 36 57Z','#455c68'],
  ['M19 17 35 31 39 8M35 31 36 57','none','#d1dcd8',1.4],
  ['M6 44 15 34 26 44 23 55 10 56Z','#7c9091'],['M15 34 18 46 6 44Z','#c3ceca'],
  ['M43 47 54 42 61 49 58 57 44 58Z','#8b9b9a'],['M14 50 20 47M40 23 44 22','none','#63845b',3]
 ],
 axe:[
  ['M12 55 17 59 47 13 42 10Z','#5e3b24'],['M16 55 43 13','none','#ae7950',2],
  ['M34 12 42 5 48 11 46 20 57 24 51 37 38 28Z','#7793a0'],
  ['M42 5 48 11 46 20 57 24 51 37 49 26 39 22 34 12Z','#c5d4d8'],
  ['M57 24 51 37 47 34 52 23Z','#edf3eb'],
  ['M32 19 41 24 45 17 36 12Z','#ba8d45'],['M34 17 42 21','none','#f1cc79',1.7],
  ['M11 51 19 55 28 41 20 37Z','#215f4e'],['M14 48 22 51M17 44 25 47M20 40 28 43','none','#83ab87',1.4],
  ['M10 54 17 59 21 55 13 50Z','#bd954e']
 ],
 pickaxe:[
  ['M11 55 16 59 46 12 41 9Z','#69452c'],['M15 54 43 13','none','#b48858',2],
  ['M18 11Q32 4 44 12Q56 22 59 39Q47 26 38 23Q30 17 12 18Z','#748b99'],
  ['M18 11Q32 4 44 12Q56 22 59 39Q50 24 40 18Q28 11 12 18Z','#cbd8dc'],
  ['M13 18 22 11Q33 8 40 12','none','#f3f1e8',1.4],
  ['M34 17 42 22 47 15 39 9Z','#bd914c'],['M37 14 44 18','none','#f2d08d',1.7],
  ['M10 52 18 57 28 42 20 37Z','#245665'],['M14 49 21 53M17 45 24 49M20 41 27 45','none','#81a7ad',1.4],
  ['M9 55 16 60 20 56 12 51Z','#bf9957']
 ]
};
const pathCache=new Map(); // At most five entries, reused by every inventory/world draw.
export function drawZumrutItemR93(ctx,kind,x,y,size=48,{url,angle=0,alpha=1}={}){
 const k=zumrutIconKindR93(kind),cell=ZUMRUT_ICON_CELLS_R93[k];if(!cell)return false;
 url??=k==='talisman'?ZUMRUT_TALISMAN_URL_R93:ZUMRUT_ART_URL_R93;const img=preloadZumrutArtR93(url);ctx.save();ctx.translate(x,y);if(angle)ctx.rotate(angle);ctx.globalAlpha*=alpha;
 if(img?.complete&&img.naturalWidth){const columns=k==='talisman'?1:2,w=img.naturalWidth/columns,h=img.naturalHeight/columns;ctx.drawImage(img,cell[0]*w,cell[1]*h,w,h,-size/2,-size/2,size,size);}
 else if(typeof Path2D!=='undefined'){
  let paths=pathCache.get(k);if(!paths){paths=shapes[k].map(([d,fill,stroke='#1b2d2b',width=1.5])=>({path:new Path2D(d),fill,stroke,width}));pathCache.set(k,paths);}
  ctx.translate(-size/2,-size/2);ctx.scale(size/64,size/64);ctx.lineJoin='round';ctx.lineCap='round';
  for(const p of paths){if(p.fill!=='none'){ctx.fillStyle=p.fill;ctx.fill(p.path);}if(p.stroke!=='none'){ctx.strokeStyle=p.stroke;ctx.lineWidth=p.width;ctx.stroke(p.path);}}
 }
 ctx.restore();return true;
}
