import {TOWER_ART_R69} from './generated/client/core511-tower-art-r69-db590592a52dc7dd.js';
// Shared, immutable illustrated atlas for the six existing tower materials.
// Keep immediate canvas vectors until image decoding completes; no item or economy changes.
const outline='#18251f';
const shape=(d,fill,stroke=outline,width=2)=>Object.freeze({d,fill,stroke,width});
export const TOWER_MATERIAL_ART_R40=Object.freeze({
 tower_seal_shard:Object.freeze([
  shape('M32 5 49 13 56 30 49 49 32 59 15 49 8 30 15 13Z','#a87935'),
  shape('M32 11 45 17 50 31 44 45 32 52 20 45 14 31 20 17Z','#e1bd6f'),
  shape('M32 18 41 31 32 44 23 31Z','#86612d'),
  shape('M32 23V39M25 31H39','none','#ffe6a4',2.5)
 ]),
 tower_chain_ore:Object.freeze([
  shape('M12 33 26 12Q32 4 40 9L43 11Q51 16 45 25L33 42Q27 49 19 44L16 42Q9 38 12 33Z','#788e95'),
  shape('M21 32 31 17Q34 13 38 16Q42 18 38 23L28 38Q25 41 22 38Q18 36 21 32Z','#172822'),
  shape('M23 40 35 23Q40 16 48 21L51 23Q58 29 52 37L40 54Q34 62 26 56L23 54Q16 49 23 40Z','#aabcc1'),
  shape('M30 43 41 29Q44 26 47 29Q50 31 47 35L36 49Q33 53 30 50Q27 47 30 43Z','#20342c'),
  shape('M15 33 27 16M42 24 48 27','none','#e6f0ee',2)
 ]),
 tower_mourning_essence:Object.freeze([
  shape('M32 5 48 17 56 36 45 53 25 59 10 44 8 24 20 11Z','#433653'),
  shape('M32 5 35 27 20 32 8 24 20 11Z','#b5a2cb'),
  shape('M35 27 48 17 56 36 39 39Z','#80679f'),
  shape('M20 32 35 27 39 39 25 59 10 44Z','#66517f'),
  shape('M30 23 40 34 31 45 22 34Z','#bce4d2'),
  shape('M30 28 35 34 30 39 26 34Z','#effff7','none')
 ]),
 tower_azrail_seal:Object.freeze([
  shape('M19 8H45L41 17 43 46 49 54Q32 61 15 54L21 46 23 17Z','#735044'),
  shape('M20 18Q32 22 44 18L43 46Q31 53 20 46Z','#a65563'),
  shape('M21 25Q32 29 43 25M21 32Q32 36 43 32M21 39Q32 43 43 39','none','#e0a0a7',2),
  shape('M39 45Q53 44 49 55Q46 62 55 57','none','#c77381',3),
  shape('M19 8Q32 3 45 8L42 13Q31 17 22 13Z','#bd9270')
 ]),
 tower_azrail_chest:Object.freeze([
  shape('M9 29Q9 13 21 12H43Q55 13 55 29V50Q32 58 9 50Z','#735137'),
  shape('M9 29Q9 13 21 12H43Q55 13 55 29Z','#a77d43'),
  shape('M9 30 32 37 55 30V50L32 57 9 50Z','#6a482f'),
  shape('M18 14V31L24 33V12M40 12V33L46 31V14','none','#d5b465',4),
  shape('M9 29 32 36 55 29M32 36V56','none','#d5b465',3),
  shape('M27 31H37V43H27Z','#e1c078'),
  shape('M32 35V40','none','#4d3b2c',2.5)
 ]),
 tower_azrail_hook:Object.freeze([
  shape('M29 6H39L37 23 39 37Q42 51 31 57Q18 63 11 51L9 40 18 47Q23 53 29 47Q34 44 31 36L29 23Z','#96a8b1'),
  shape('M29 6H39L38 17H30Z','#765a80'),
  shape('M30 10H38M30 14H38','none','#c2a1c9',2),
  shape('M35 24 37 39Q39 50 30 53Q22 57 16 49','none','#edf2ed',2),
  shape('M9 40 18 47 13 49Z','#dbe7e5')
 ])
});

const towerKindsR69=Object.keys(TOWER_MATERIAL_ART_R40);
let atlasR69=null;
function preloadTowerR69(){if(!atlasR69&&typeof Image!=='undefined'){atlasR69=new Image();atlasR69.decoding='async';atlasR69.src=TOWER_ART_R69;atlasR69.decode?.().catch(()=>{});}return atlasR69;}
preloadTowerR69();
export function towerMaterialIconR40(React,kind,label){
 const index=towerKindsR69.indexOf(kind);if(index<0)return null;
 return React.createElement('span',{className:'tower18-icon tower69-material-icon',role:'img','aria-label':label,title:label,
  style:{display:'inline-block',width:54,height:54,flexShrink:0,borderRadius:5,backgroundImage:'url("'+TOWER_ART_R69+'")',backgroundSize:'300% 200%',backgroundRepeat:'no-repeat',backgroundPosition:(index%3*50)+'% '+(Math.floor(index/3)*100)+'%'}});
}
function fallbackTowerMaterialIconR40(React,kind,label){
 if(!Object.hasOwn(TOWER_MATERIAL_ART_R40,kind))return null;const paths=TOWER_MATERIAL_ART_R40[kind],h=React.createElement;
 return h('svg',{className:'tower18-icon tower40-material-icon',viewBox:'0 0 64 64',width:54,height:54,
  role:'img','aria-label':label,focusable:'false',style:{backgroundImage:'none',overflow:'visible'}},
  h('title',null,label),...paths.map((p,index)=>h('path',{key:index,d:p.d,fill:p.fill,stroke:p.stroke,
   strokeWidth:p.width,strokeLinecap:'round',strokeLinejoin:'round'})));
}

const canvasPaths=new Map(); // Six immutable keys maximum; no per-frame parsing.
export function drawTowerMaterialIconR40(ctx,loot){
 const index=towerKindsR69.indexOf(loot?.kind),atlas=preloadTowerR69();
 if(index>=0&&atlas?.complete&&atlas.naturalWidth){const w=atlas.naturalWidth/3,h=atlas.naturalHeight/2;ctx.drawImage(atlas,index%3*w,Math.floor(index/3)*h,w,h,loot.x-25,loot.y-45,50,50);return true;}

 if(!Object.hasOwn(TOWER_MATERIAL_ART_R40,loot?.kind)||typeof Path2D==='undefined')return false;const shapes=TOWER_MATERIAL_ART_R40[loot.kind];
 let paths=canvasPaths.get(loot.kind);if(!paths){paths=shapes.map(s=>({...s,path:new Path2D(s.d)}));canvasPaths.set(loot.kind,paths);}
 ctx.save();ctx.translate(loot.x-25,loot.y-45);ctx.scale(50/64,50/64);ctx.lineCap='round';ctx.lineJoin='round';
 for(const p of paths){if(p.fill!=='none'){ctx.fillStyle=p.fill;ctx.fill(p.path);}if(p.stroke!=='none'){ctx.strokeStyle=p.stroke;ctx.lineWidth=p.width;ctx.stroke(p.path);}}
 ctx.restore();return true;
}
