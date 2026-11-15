// Presentation only. Travel, damage, loot and champion eligibility are authoritative.
export const CHAMPIONS_BOUNDS_R118=Object.freeze({width:3600,height:2400});
export const CHAMPIONS_SPAWN_R118=Object.freeze({x:1800,y:1950});
export const CHAMPIONS_NAME_R118='Şampiyonlar Diyarı';
export const CHAMPIONS_PVP_NOTICE_R118='Şampiyonlar Diyarı’nda PvP açıktır. Diğer oyuncular sana saldırabilir; alan saldırıları oyunculara da isabet edebilir. Haritaya girilsin mi?';
const species=Object.freeze(['ivory_guard','golden_lion','crescent_hunter','royal_colossus']);
export function championsSegmentR118(x,y,tx,ty){
 return [x,y,tx,ty].every(Number.isFinite)&&x>=80&&x<=3520&&y>=100&&y<=2320&&tx>=80&&tx<=3520&&ty>=100&&ty<=2320;
}
export function clampChampionsR118(point){return {x:Math.max(80,Math.min(3520,point.x)),y:Math.max(100,Math.min(2320,point.y))};}
export function createChampionsViewR118(assets={}){
 const cache=new Map();
 function image(url){
  if(!url||typeof Image==='undefined')return null;
  let value=cache.get(url);
  if(!value){value=new Image();value.decoding='async';value.src=url;cache.set(url,value);}
  return value.complete&&value.naturalWidth>0?value:null;
 }
 function key(monster){
  if(monster?.area!=='champions')return null;
  return species.find(value=>String(monster.id).includes(value))??null;
 }
 function preload(){image(assets.map);for(const kind of species)image(assets.monsters?.[kind]);}
 function drawEnemy(ctx,monster,selected,now,moving,attack,travel,direction){
  const kind=key(monster);if(!kind)return false;
  const sprite=image(assets.monsters?.[kind]);if(!sprite)return false;
  const cols=5,rows=2,cw=sprite.naturalWidth/cols,ch=sprite.naturalHeight/rows;
  const height=kind==='royal_colossus'?188:kind==='golden_lion'?155:163,width=height*cw/ch;
  const row=attack>0?1:0,frame=attack>0?Math.min(4,Math.floor(Math.max(0,Math.min(.999,attack))*cols)):moving?Math.floor(Math.abs(travel)/14)%cols:Math.floor(now/230)%cols;
  const x=monster.x,y=monster.y,mirror=(direction?.x??1)<0;
  ctx.save();ctx.translate(x,y);ctx.fillStyle=selected?'rgba(246,211,130,.28)':'rgba(0,0,0,.25)';
  ctx.beginPath();ctx.ellipse(0,0,width*.23,10,0,0,Math.PI*2);ctx.fill();
  if(selected){ctx.strokeStyle='#e6c66c';ctx.lineWidth=1.6;ctx.stroke();}
  ctx.scale(mirror?-1:1,1);ctx.drawImage(sprite,frame*cw,row*ch,cw,ch,-width/2,-height*(232/256),width,height);ctx.restore();
  const hp=Math.max(0,Math.min(1,Number(monster.hp)/Math.max(1,Number(monster.max_hp))));
  ctx.save();ctx.font='600 11px system-ui';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.lineWidth=3;ctx.strokeStyle='rgba(8,12,11,.95)';
  const text=String(monster.name??'Şampiyon Muhafızı');ctx.strokeText(text,x,y-height-5);ctx.fillStyle='#fff2d3';ctx.fillText(text,x,y-height-5);
  if(selected||hp<1){ctx.fillStyle='#291e1c';ctx.fillRect(x-25,y-height-1,50,4);ctx.fillStyle='#bf6147';ctx.fillRect(x-25,y-height-1,50*hp,4);}ctx.restore();
  return true;
 }
 return Object.freeze({preload,image,key,texture:()=>image(assets.map),drawEnemy});
}
