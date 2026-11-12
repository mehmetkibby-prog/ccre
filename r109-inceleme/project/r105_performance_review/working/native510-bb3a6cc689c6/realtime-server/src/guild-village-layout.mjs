export const GUILD_CASTLE_COST=Object.freeze({pearls:50,gems:50000,essence:2000});
export const GUILD_VILLAGE_WORLD=Object.freeze({width:3600,height:2400});
export const GUILD_HALL_WORLD=Object.freeze({width:2400,height:1600});
export const GUILD_VILLAGE_ENTRY=Object.freeze({x:1800,y:1320});
export const GUILD_HALL_ENTRY=Object.freeze({x:1200,y:1260});
export const GUILD_PLOTS=Object.freeze([
 ['Kuzeybatı Korusu',.26,.19],['Kuzey Burnu',.51,.11],['Doğu Kayalıkları',.73,.20],['Gündoğumu Kıyısı',.84,.42],
 ['Güneydoğu Bahçesi',.76,.65],['Güney Limanı',.50,.75],['Batı Bahçesi',.26,.65],['Günbatımı Kıyısı',.18,.41],
].map(([name,x,y],i)=>({slot:i+1,name,x:x*3600,y:y*2400})));
export const GUILD_DECOR=Object.freeze([
 {level:1,name:'Sancaklı Avlu',essence:1000,description:'Şato tabelasında lonca sancağı ve avlu unvanı.'},
 {level:2,name:'Altın Taht',essence:2500,description:'Salon ve şato tabelasında altın çerçeve ve taç.'},
 {level:3,name:'Kadim Şato',essence:5000,description:'Salon ve şato tabelasında kadim mühür ve zafer süslemesi.'},
]);
export function guildArea(area){
 if(typeof area!=='string')return null;
 const village=/^guild_village_([1-9][0-9]{0,3})$/.exec(area);if(village)return {kind:'village',district:Number(village[1])};
 const hall=/^guild_hall_([A-Za-z0-9-]{1,64})$/.exec(area);return hall?{kind:'hall',guildId:hall[1]}:null;
}
export const villageArea=district=>`guild_village_${district}`;
export const hallArea=guildId=>`guild_hall_${guildId}`;
export function guildWalkable(area,x,y){
 const room=guildArea(area);if(!room||!Number.isFinite(x)||!Number.isFinite(y))return false;
 if(room.kind==='hall')return x>=650&&x<=1800&&y>=460&&y<=1370;
 // An open inner island contains the central plaza and every castle entrance.
 return ((x-1800)/1510)**2+((y-1240)/1040)**2<=1
  && !GUILD_PLOTS.some(p=>Math.abs(x-p.x)<210&&y>p.y-170&&y<p.y+110);
}
export function guildSegment(area,ax,ay,bx,by){
 if(!guildWalkable(area,ax,ay)||!guildWalkable(area,bx,by))return false;
 const steps=Math.ceil(Math.hypot(bx-ax,by-ay)/20);for(let i=1;i<steps;i++)if(!guildWalkable(area,ax+(bx-ax)*i/steps,ay+(by-ay)*i/steps))return false;return true;
}
