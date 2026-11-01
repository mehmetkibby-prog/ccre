export const EVENT_WORLD444=Object.freeze({width:3600,height:2400});
export const EVENT_SPAWN444=Object.freeze({x:1800,y:1600});
export const EVENT_BOSSES444=Object.freeze([
 {kind:'world',name:'Çürümenin Kadimi',variant:'event_world',source:'boss.world'},
 {kind:'frozen',name:'Ayaz Tahtının Bekçisi',variant:'event_frozen',source:'boss.frozen_throne'},
 {kind:'water',name:'Buzgölü Semenderi',variant:'event_water',source:'boss.frozen_water'},
 {kind:'ancient',name:'Kadim Kökün Muhafızı',variant:'event_ancient',source:'boss.frozen_throne'},
 {kind:'dragon',name:'Külkanat · Kadim Ejderha',variant:'event_dragon'},
 {kind:'dungeon',name:'Bozulmuş Muhafız',variant:'event_dungeon'},
 {kind:'solo',name:'Demir Hükümdar',variant:'event_solo'}]);
const kinds=new Set(EVENT_BOSSES444.map(b=>b.kind));
export function eventKind444(value){const id=typeof value==='string'?value:value?.id??'';if(!id.startsWith('event-'))return null;return /^event-(world|frozen|water|ancient|dragon|dungeon|solo)-c[1-3]-[a-f0-9-]{36}$/.exec(id)?.[1]??null;}
export function eventWalkable444(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>=650&&x<=2950&&y>=480&&y<=1700;}
export function eventSegment444(ax,ay,bx,by){return eventWalkable444(ax,ay)&&eventWalkable444(bx,by);}
export function validateEventPlan444(value){if(!Array.isArray(value)||value.length>21)throw Error('En fazla 21 boss planı satırı olabilir.');const totals=[0,0,0,0];return value.map(r=>{if(!r||!kinds.has(r.kind)||!Number.isInteger(r.channel)||r.channel<1||r.channel>3||!Number.isInteger(r.count)||r.count<1||r.count>8)throw Error('Boss türü, kanal ve adet geçersiz.');totals[r.channel]+=r.count;if(totals[r.channel]>8)throw Error('Bir plan kanal başına en fazla 8 boss içerir.');return {kind:r.kind,channel:r.channel,count:r.count};});}
export function validateEventConfig444(v){if(!v||typeof v.enabled!=='boolean')throw Error('Ada açık/kapalı ayarı geçersiz.');if(!Number.isInteger(v.maxBossesPerChannel)||v.maxBossesPerChannel<1||v.maxBossesPerChannel>8)throw Error('Kanal başına boss sınırı 1–8 olmalı.');return {enabled:v.enabled,maxBossesPerChannel:v.maxBossesPerChannel,plan:validateEventPlan444(v.plan??[]),hpOverrides:validateEventHpOverrides448(v.hpOverrides??{})};}
export const defaultEventConfig444=()=>({enabled:false,maxBossesPerChannel:8,plan:[],hpOverrides:{}});

function validateEventHpOverrides448(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>7)throw Error('Boss can ayarları geçersiz.');
 const result={};for(const [kind,hp]of Object.entries(value)){
  if(!kinds.has(kind)||!Number.isSafeInteger(hp)||hp<1||hp>100000000)throw Error('Boss canı 1–100.000.000 arasında tam sayı olmalı.');
  result[kind]=hp;
 }return result;
}
