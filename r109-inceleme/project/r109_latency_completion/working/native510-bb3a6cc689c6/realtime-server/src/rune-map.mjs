export const RUNE_TYPES=Object.freeze({
 rune_defense:{label:'Safir Siper Rünü',short:'Savunma',stat:'defense',color:'#55aeff',image:'rune-defense-v422',shard:'Safir Siper Parçası'},
 rune_attack:{label:'Kızıl Kudret Rünü',short:'Saldırı',stat:'attack',color:'#ff6478',image:'rune-attack-v422',shard:'Kızıl Kudret Parçası'},
 rune_hp:{label:'Zümrüt Yaşam Rünü',short:'Can',stat:'hp',color:'#4fde9b',image:'rune-hp-v422',shard:'Zümrüt Yaşam Parçası'}
});
export const RUNE_MOBS=Object.freeze([
 {key:'tide',name:'Gelgit Pençesi',count:5,hp:4800,damage:62,xp:180},
 {key:'warden',name:'Mercan Muhafızı',count:5,hp:6200,damage:75,xp:220},
 {key:'sentinel',name:'Şato Nöbetçisi',count:5,hp:7400,damage:88,xp:260},
 {key:'wraith',name:'Derinlik Ruhu',count:5,hp:5500,damage:96,xp:240}
]);
export const RUNE_WORLD={width:4320,height:2880};
export const RUNE_SPAWN={x:2121,y:2579};
export const RUNE_GATE_MESSAGE='Giriş için 65. seviye ve Öz Avcısı rütbesi gerekiyor.';
export const runeEligible=p=>!!p&&Number(p.level)>=65&&Number(p.rank_tier??p.rank?.tier)>=1;
export const isRuneKind=k=>typeof k==='string'&&Object.hasOwn(RUNE_TYPES,k);
export function runeUpgradeCost(level){if(!Number.isSafeInteger(level)||level<1||!Number.isSafeInteger(level+2))throw Error('Rün seviyesi geçersiz.');return level+2;}
export const runeBonusPercent=(level,step=.2)=>Math.round(level*step*1000000)/1000000;
export function runeMonsterKey(monster){return monster?.area==='rune'?String(monster.id).match(/^rune-(tide|warden|sentinel|wraith)-c[1-3]-\d+$/)?.[1]??null:null;}
export const RUNE_WALKABLE_POLYGON=[[1195,967],[2162,844],[2232,615],[3164,615],[3234,809],[4096,686],[4219,914],[4078,1125],[4781,1195],[4816,1494],[4500,1916],[4430,2514],[3938,2812],[3076,3076],[2900,3463],[2426,3463],[2250,3094],[1652,2760],[1301,2461],[1195,2004],[1125,1600],[1055,1248]].map(([x,y])=>[Math.round(x*.8),Math.round(y*.8)]);
export const RUNE_OBSTACLES=[[[2039,1121],[2278,1058],[2584,1146],[2739,1287],[2591,1498],[2275,1568],[2039,1434]],[[3347,1870],[3561,1870],[3730,1986],[3544,2148],[3305,2116],[3206,2000]]].map(poly=>poly.map(([x,y])=>[Math.round(x*.8),Math.round(y*.8)]));
const inside=(x,y,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const edgeDistance=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);};
const runeEdges=[RUNE_WALKABLE_POLYGON,...RUNE_OBSTACLES].flatMap(poly=>poly.map((p,i)=>[p,poly[(i+1)%poly.length]]));
export function runeWalkable(x,y,margin=0){if(!Number.isFinite(x)||!Number.isFinite(y)||!inside(x,y,RUNE_WALKABLE_POLYGON)||RUNE_OBSTACLES.some(p=>inside(x,y,p)))return false;return !(margin>0)||runeEdges.every(([a,b])=>edgeDistance(x,y,a,b)>=margin);}
export function runeWalkableSegment(x1,y1,x2,y2,margin=0){if(!runeWalkable(x1,y1,margin)||!runeWalkable(x2,y2,margin))return false;const cross=(ax,ay,bx,by,cx,cy)=>(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);for(const[a,b]of runeEdges){const c1=cross(x1,y1,x2,y2,...a),c2=cross(x1,y1,x2,y2,...b),c3=cross(...a,...b,x1,y1),c4=cross(...a,...b,x2,y2);if(c1*c2<=0&&c3*c4<=0&&Math.max(x1,x2)>=Math.min(a[0],b[0])&&Math.min(x1,x2)<=Math.max(a[0],b[0])&&Math.max(y1,y2)>=Math.min(a[1],b[1])&&Math.min(y1,y2)<=Math.max(a[1],b[1]))return false;if(margin>0&&(edgeDistance(...a,[x1,y1],[x2,y2])<margin||edgeDistance(...b,[x1,y1],[x2,y2])<margin))return false;}return true;}
const runePoints={"tide":[[3750,1140],[1230,1980],[3190,720],[2770,1840],[2350,1140]],"warden":[[950,1000],[3330,1980],[1510,860],[3330,1420],[2350,1560]],"sentinel":[[2350,2120],[1930,1420],[1790,2260],[1650,1840],[2770,720]],"wraith":[[2350,580],[2770,1280],[1370,1420],[1930,720],[2770,2260]]};
export const RUNE_SPAWNS=Object.freeze(Object.entries(runePoints).flatMap(([key,points])=>points.map(([x,y],i)=>({key,slot:i+1,x,y}))));
export function defaultRuneConfig(){return {enabled:true,bonusPerLevel:.2,monsters:Object.fromEntries(RUNE_MOBS.map(m=>[m.key,{name:m.name,hp:m.hp,damage:m.damage,xp:m.xp,respawnSeconds:30,loot:{...Object.fromEntries(Object.keys(RUNE_TYPES).map(k=>[k,{chance:3,min:1,max:1}])),essence:{chance:100,min:5,max:10},gems:{chance:10,min:1,max:3},potions:{chance:5,min:1,max:1},red:{chance:1,min:1,max:1},orange:{chance:2,min:1,max:1},blue:{chance:3,min:1,max:1},white:{chance:0,min:1,max:1},purple:{chance:0,min:1,max:1},stone_dust:{chance:2,min:1,max:2},stone_book:{chance:1,min:1,max:1},evolution_scroll:{chance:.2,min:1,max:1},pearl:{chance:0,min:1,max:1},weathered_iron:{chance:0,min:1,max:1},wing:{chance:0,min:1,max:1},infinite:{chance:0,min:1,max:1},pet:{chance:0,min:1,max:1}}}]))};}
export const RUNE_LOOT_LABELS={...Object.fromEntries(Object.entries(RUNE_TYPES).map(([k,v])=>[k,v.shard])),essence:'Yaşam Özü',gems:'Mücevher',potions:'Kırmızı İksir',red:'Kırmızı ekipman',orange:'Turuncu ekipman',blue:'Mavi ekipman',white:'Beyaz ekipman',purple:'Mor ekipman',stone_dust:'Taş Tozu',stone_book:'Taş Sanatı Kitabı',evolution_scroll:'Evrim Parşömeni',pearl:'İnci',weathered_iron:'Eskitilmiş Demir Parçası',wing:'Kanat Parçası',infinite:'Sonsuz Taşı Parçası',pet:'Ejderha Parçası'};
export function validateRuneConfig(input){
 const def=defaultRuneConfig(),out={enabled:input?.enabled===true,bonusPerLevel:Number(input?.bonusPerLevel),monsters:{}};
 if(typeof input?.enabled!=='boolean'||!Number.isFinite(out.bonusPerLevel)||out.bonusPerLevel<0||out.bonusPerLevel>100)throw Error('Rün seviye bonusu %0–100 arasında olmalı.');
 for(const m of RUNE_MOBS){const v=input?.monsters?.[m.key];if(!v)throw Error('Dört canavarın ayarları gerekli.');
  const row={name:m.name,hp:Number(v.hp),damage:Number(v.damage),xp:Number(v.xp),respawnSeconds:Number(v.respawnSeconds),loot:{}};
  for(const [k,min,max]of [['hp',1,10000000],['damage',0,1000000],['xp',0,1000000],['respawnSeconds',1,86400]])if(!Number.isSafeInteger(row[k])||row[k]<min||row[k]>max)throw Error(m.name+': '+k+' ayarı geçersiz.');
  for(const k of Object.keys(def.monsters[m.key].loot)){const r=v.loot?.[k];if(!r||!Number.isFinite(r.chance)||r.chance<0||r.chance>100||!Number.isSafeInteger(r.min)||!Number.isSafeInteger(r.max)||r.min<1||r.max<r.min||r.max>(['white','blue','orange','red','purple'].includes(k)?3:100))throw Error(m.name+': '+RUNE_LOOT_LABELS[k]+' oranı veya miktarı geçersiz.');row.loot[k]={chance:r.chance,min:r.min,max:r.max};}
  out.monsters[m.key]=row;
 }return out;
}
