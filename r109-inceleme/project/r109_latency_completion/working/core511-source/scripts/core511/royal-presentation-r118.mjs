export const royalEligibleClientR118=player=>Number(player?.rank?.championLevel??player?.champion_level_r102??0)>=1;
export function createRoyalPresentationR118(React,media,image){
 const icon=(kind,role)=>media.icons?.[kind==='weapon'?'weapon_'+role:kind]??null;
 function Icon({kind,role,size=54,className=''}){
  const src=icon(kind,role);return src?React.createElement('img',{src,alt:'',width:size,height:size,decoding:'async',className:'royal118-gear-icon '+className,style:{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',display:'inline-block',flexShrink:0}}):null;
 }
 function material(kind,size=42){return ['emerald_dust','royal_crown'].includes(kind)?React.createElement(Icon,{kind,size}):null;}
 function ground(item){
  const isMaterial=['emerald_dust','royal_crown'].includes(item?.kind),src=icon(item?.kind,item?.role);
  if(!src||(!isMaterial&&item.rarity!=='royal'))return null;
  return {src,columns:1,rows:1,col:0,row:0,glyph:'◆',label:item.item_name??item.name??(item.kind==='emerald_dust'?'Zümrüt Tozu':'Kraliyet Tacı'),color:'#ecdba8',rarity:isMaterial?'unique':'royal'};
 }
 function npc(ctx,now){
  const sprite=image(media.hero),x=1740,y=390;
  ctx.save();ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(x,y,34,11,0,0,Math.PI*2);ctx.fill();
  if(sprite){const cw=sprite.naturalWidth/6,ch=sprite.naturalHeight/3;ctx.drawImage(sprite,0,0,cw,ch,x-66,y-144,132,151);}
  ctx.textAlign='center';ctx.font='600 13px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#101b16';ctx.strokeText('Kraliyet Ustası',x,y-153);ctx.fillStyle='#f0dca4';ctx.fillText('Kraliyet Ustası',x,y-153);
  ctx.font='10px system-ui';ctx.strokeText('Hükümdar Seti · Dönüşüm',x,y-138);ctx.fillStyle='#eee9dd';ctx.fillText('Hükümdar Seti · Dönüşüm',x,y-138);ctx.restore();
 }
 return Object.freeze({icon,Icon,material,ground,npc});
}
