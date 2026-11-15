// Presentation only. Travel, damage, loot and champion eligibility are authoritative.
export const CHAMPIONS_BOUNDS_R118=Object.freeze({width:3600,height:2400});
export const CHAMPIONS_SPAWN_R118=Object.freeze({x:1800,y:1950});
export const CHAMPIONS_NAME_R118='Şampiyonlar Diyarı';
export const CHAMPIONS_PVP_NOTICE_R118='Şampiyonlar Diyarı’nda PvP açıktır. Diğer oyuncular sana saldırabilir; alan saldırıları oyunculara da isabet edebilir. Haritaya girilsin mi?';
const species=Object.freeze(['ivory_guard','golden_lion','crescent_hunter','royal_colossus']);
// Same five-frame animation/foot pivot as the North Forest. Each champion
// sheet contains one species (two rows); species controls body size, not RNG.
const forestProfiles=Object.freeze({
 ivory_guard:Object.freeze({species:1,atlasIndex:0,rows:2,scale:1}),
 golden_lion:Object.freeze({species:0,atlasIndex:0,rows:2,scale:1.08}),
 crescent_hunter:Object.freeze({species:1,atlasIndex:0,rows:2,scale:1}),
 royal_colossus:Object.freeze({species:2,atlasIndex:0,rows:2,scale:1.18}),
});
export function championsSegmentR118(x,y,tx,ty){
 return [x,y,tx,ty].every(Number.isFinite)&&x>=80&&x<=3520&&y>=100&&y<=2320&&tx>=80&&tx<=3520&&ty>=100&&ty<=2320;
}
export function clampChampionsR118(point){return {x:Math.max(80,Math.min(3520,point.x)),y:Math.max(100,Math.min(2320,point.y))};}
export function createChampionsViewR118(assets={},drawForestEnemy=null){
 const cache=new Map();
 function image(url){
  if(!url||typeof Image==='undefined')return null;
  let value=cache.get(url);
  if(!value){value=new Image();value.decoding='async';value.src=url;cache.set(url,value);}
  return value.complete&&value.naturalWidth>0?value:null;
 }
 function key(monster){
  if(monster?.area!=='champions')return null;
  const match=/^champions-(ivory-guard|golden-lion|crescent-hunter|royal-colossus)-c[1-4]-(?:0[1-9]|1[0-2])$/.exec(String(monster.id));
  return match?match[1].replaceAll('-','_'):null;
 }
 function preload(){image(assets.map);for(const kind of species)image(assets.monsters?.[kind]);}
 function drawEnemy(ctx,monster,selected,now,moving,attack,travel,direction,hitPulse=0,quality=2){
  const kind=key(monster);if(!kind)return false;
  const sprite=image(assets.monsters?.[kind]);if(!sprite)return false;
  if(sprite.naturalWidth!==1280||sprite.naturalHeight!==512||typeof drawForestEnemy!=='function')return false;
  // One existing renderer owns idle/run/attack, direction threshold, body
  // anchor, selection, hit effect, name and HP. No separate timer or loop.
  drawForestEnemy(ctx,null,monster,selected,hitPulse,attack,direction,false,moving,now,travel,quality,
   undefined,undefined,undefined,undefined,sprite,forestProfiles[kind]);
  return true;
 }
 return Object.freeze({preload,image,key,texture:()=>image(assets.map),drawEnemy});
}
