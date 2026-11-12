// Final approved sunny alpine map, matched to the 1536x1024 artwork at 3.125x.
// Shared pure geometry: no SQL, schedules or per-node simulation work.
export const ZUMRUT_AREA='zumrut';
export const ZUMRUT_NAME='Zümrüt Vadisi';
export const ZUMRUT_BOUNDS=Object.freeze({width:4800,height:3200});
export const ZUMRUT_SPAWN=Object.freeze({x:1100,y:2630});
export const ZUMRUT_NPC=Object.freeze({id:'usta',x:1190,y:2490,name:'Dağcı Aras',title:'Balta & Kazma'});
export const ZUMRUT_BENCH=Object.freeze({id:'workbench',x:1485,y:2445,name:'Vadi Tezgâhı'});
export const ZUMRUT_REACH=150;
export const ZUMRUT_BRIDGES=Object.freeze([1140,2345]);
export const ZUMRUT_CHALET_R93=Object.freeze({left:505,top:1860,right:1150,bottom:2415});
const SCALE=3.125,GRID=256;
const RIVER_PIXELS=[[0,954,38],[60,954,36],[130,951,38],[170,927,66],[190,884,72],[210,845,69],[230,811,64],[250,781,62],[270,766,49],[290,784,52],[310,812,61],[330,834,63],[350,841,65],[370,850,63],[390,885,70],[410,920,74],[430,950,74],[450,965,75],[470,949,71],[490,921,68],[510,875,73],[530,823,76],[550,783,69],[570,757,65],[590,766,69],[610,791,70],[630,836,74],[650,876,73],[670,913,74],[690,930,74],[710,934,62],[730,938,64],[750,946,66],[770,965,56],[790,987,62],[810,1019,63],[830,1040,66],[850,1044,66],[870,1025,64],[890,991,64],[910,952,66],[930,934,66],[950,927,62],[970,941,64],[990,977,70],[1010,1009,67],[1024,1043,68]];
const PATH_PIXELS=[[[345,202],[330,224],[349,252],[400,280],[457,318],[547,348],[640,365],[695,378],[759,355]],[[548,347],[438,358],[352,383],[321,419],[292,467],[254,505],[240,534],[266,568],[296,602],[377,642],[461,685],[538,719],[599,768],[653,793],[740,779],[818,757],[855,750]],[[260,552],[361,533],[415,507],[464,485],[524,462],[576,422],[644,395],[703,378]],[[855,750],[756,774],[631,808],[495,817],[382,850],[295,849]],[[907,346],[1000,329],[1084,335],[1161,311],[1210,291],[1299,265],[1358,255],[1407,276],[1455,309],[1440,357],[1410,392],[1388,433],[1351,455],[1360,484],[1393,512],[1367,549],[1261,570],[1190,576],[1148,600],[1120,639],[1119,672],[1082,710],[1046,743],[1012,751]]];
const TREE_PIXELS=[[155,145],[215,204],[276,169],[310,112],[390,180],[441,145],[510,175],[570,147],[604,204],[724,216],[779,201],[678,259],[524,220],[456,254],[555,308],[613,333],[380,332],[315,298],[270,253],[110,278],[168,329],[108,382],[174,450],[276,434],[338,493],[456,384],[518,399],[636,439],[730,508],[818,502],[566,528],[390,577],[217,532],[110,532],[37,502],[156,633],[50,650],[426,607],[500,650],[577,612],[642,707],[633,846],[568,899],[399,918],[340,828],[219,900],[132,968],[85,862],[69,799],[351,975],[475,962],[669,992],[715,910],[824,897],[783,827],[1096,170],[1146,180],[1189,245],[1287,255],[1365,219],[1480,304],[1394,356],[1250,335],[1125,300],[991,315],[939,279],[1058,248],[1190,391],[1467,401],[1278,470],[1130,460],[1214,526],[1315,519],[1446,560],[1110,582],[1015,590],[1058,665],[1251,624],[1315,678],[1402,725],[1500,728],[1268,751],[1162,714],[1324,809],[1470,873],[1408,937],[1250,981],[1157,986],[1210,894],[1474,1009]];
const ROCK_PIXELS=[[116,174],[356,124],[316,205],[214,265],[260,320],[321,375],[424,484],[71,565],[296,871],[223,977],[38,901],[150,793],[583,652],[619,567],[610,487],[666,305],[639,223],[799,462],[770,710],[701,835],[972,605],[962,548],[1008,220],[1054,300],[1027,357],[1248,399],[1299,347],[1413,262],[1318,179],[1503,213],[1494,467],[1155,496],[1143,756],[1343,721],[1441,825],[1270,884],[1491,937],[1343,955],[1424,684],[1070,928]];
const riverRows=Object.freeze(RIVER_PIXELS.map(row=>Object.freeze(row.map(value=>value*SCALE))));
function riverValue(y,column){if(y<=riverRows[0][0])return riverRows[0][column];if(y>=riverRows.at(-1)[0])return riverRows.at(-1)[column];let low=0,high=riverRows.length-1;while(high-low>1){const mid=(low+high)>>1;if(riverRows[mid][0]>y)high=mid;else low=mid;}const a=riverRows[low],b=riverRows[high],t=(y-a[0])/(b[0]-a[0]);return a[column]+(b[column]-a[column])*t;}
export const ZUMRUT_RIVER_POINTS_R93=riverRows;
export const zumrutRiverX=y=>riverValue(y,1);
export const zumrutRiverHalfWidth=y=>riverValue(y,2);
// The two painted decks slope slightly upward to the right. Their walkable
// bands include both landings while keeping adjacent water impassable.
export function zumrutOnBridge(x,y){return ZUMRUT_BRIDGES.some((by,i)=>{const dx=x-zumrutRiverX(by);return Math.abs(dx)<=310&&Math.abs(y-by+dx*(i?.21:.16))<=69;});}
export function zumrutInWater(x,y){return Math.abs(x-zumrutRiverX(y))<zumrutRiverHalfWidth(y)&&!zumrutOnBridge(x,y);}
export function zumrutFishingPoint(point){const y=Math.max(570,Math.min(3070,Number(point?.y)||0)),center=zumrutRiverX(y),side=(Number(point?.x)||0)<center?-1:1;return {x:center+side*(zumrutRiverHalfWidth(y)-36),y};}
export function zumrutNearRiver(point){const x=Number(point?.x),y=Number(point?.y);return Number.isFinite(x)&&Number.isFinite(y)&&y>=570&&y<=3070&&!zumrutOnBridge(x,y)&&!zumrutInWater(x,y)&&Math.abs(x-zumrutRiverX(y))-zumrutRiverHalfWidth(y)<=100;}
function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length)):0;return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);}
export function zumrutPathDistance(x,y){let d=Infinity;for(const path of PATH_PIXELS)for(let i=1;i<path.length;i++)d=Math.min(d,segmentDistance(x/SCALE,y/SCALE,path[i-1],path[i])*SCALE);return d;}
const nodes=[],cells=new Map(),byId=new Map();
const cellKey=(x,y)=>Math.floor(x/GRID)+','+Math.floor(y/GRID);
function nearby(x,y,r){const out=[];for(let cy=Math.floor((y-r)/GRID);cy<=Math.floor((y+r)/GRID);cy++)for(let cx=Math.floor((x-r)/GRID);cx<=Math.floor((x+r)/GRID);cx++)for(const node of cells.get(cx+','+cy)??[])out.push(node);return out;}
for(const [kind,points]of [['tree',TREE_PIXELS],['rock',ROCK_PIXELS]])for(let i=0;i<points.length;i++){
 const [px,py]=points[i],x=px*SCALE,y=py*SCALE,variant=i%2;
 const node=Object.freeze({id:kind+'-'+String(i+1).padStart(3,'0'),kind,x,y,variant,scale:kind==='tree'?.86+(i*7%11)*.023:.86+(i*3%9)*.025,radius:kind==='tree'?21:28});nodes.push(node);byId.set(node.id,node);const key=cellKey(x,y);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(node);
}
export const ZUMRUT_NODES=Object.freeze(nodes);
export const ZUMRUT_LAYOUT_R93=Object.freeze({version:2,trees:TREE_PIXELS.length,rocks:ROCK_PIXELS.length,worldWidth:4800,worldHeight:3200});
export function zumrutNode(id){return byId.get(id)??null;}
export function zumrutNodesInRect(x,y,width,height,pad=180){const out=[];for(let cy=Math.floor((y-pad)/GRID);cy<=Math.floor((y+height+pad)/GRID);cy++)for(let cx=Math.floor((x-pad)/GRID);cx<=Math.floor((x+width+pad)/GRID);cx++)for(const node of cells.get(cx+','+cy)??[])if(node.x>=x-pad&&node.x<=x+width+pad&&node.y>=y-pad&&node.y<=y+height+pad)out.push(node);return out;}
export function zumrutWalkable(x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<75||x>4725||y<400||y>3120||zumrutInWater(x,y))return false;
 const house=ZUMRUT_CHALET_R93;if(x>=house.left&&x<=house.right&&y>=house.top&&y<=house.bottom)return false;
 if(Math.hypot(x-ZUMRUT_BENCH.x,y-ZUMRUT_BENCH.y)<47||Math.hypot(x-ZUMRUT_NPC.x,y-ZUMRUT_NPC.y)<31)return false;
 // Harvest nodes are interaction props, not permanent navigation walls. Their
 // temporary disappearance cannot leave an invisible collision obstacle or
 // require database work in native movement/collision checks.
 return true;
}
export function zumrutSegment(x0,y0,x1,y1){if(![x0,y0,x1,y1].every(Number.isFinite)||!zumrutWalkable(x0,y0))return false;const distance=Math.hypot(x1-x0,y1-y0),steps=Math.max(1,Math.ceil(distance/12));if(steps>1000)return false;for(let i=1;i<=steps;i++)if(!zumrutWalkable(x0+(x1-x0)*i/steps,y0+(y1-y0)*i/steps))return false;return true;}
export function zumrutNearest(point,reach=ZUMRUT_REACH,eligible=()=>true){if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;let chosen=null,best=reach;for(const node of [...nearby(point.x,point.y,reach),{...ZUMRUT_NPC,kind:'shop'},{...ZUMRUT_BENCH,kind:'craft'}]){if(!eligible(node))continue;const d=Math.hypot(node.x-point.x,node.y-point.y);if(d<=best){chosen=node;best=d;}}return chosen;}
export function zumrutHit(x,y,eligible=()=>true){let chosen=null,best=Infinity;for(const node of [...nearby(x,y,220),{...ZUMRUT_NPC,kind:'shop'},{...ZUMRUT_BENCH,kind:'craft'}]){if(!eligible(node))continue;const half=node.kind==='tree'?63:node.kind==='rock'?54:70,height=node.kind==='tree'?220:node.kind==='shop'?135:90;if(Math.abs(x-node.x)<=half&&y>=node.y-height&&y<=node.y+20){const d=Math.hypot(x-node.x,y-(node.y-height/2));if(d<best){chosen=node;best=d;}}}return chosen;}
export {ZUMRUT_AREA as ZUMRUT_AREA_R93,ZUMRUT_SPAWN as ZUMRUT_ENTRY_R93,ZUMRUT_NPC as ZUMRUT_NPC_R93,ZUMRUT_BENCH as ZUMRUT_BENCH_R93,ZUMRUT_NODES as ZUMRUT_NODES_R93};
export const ZUMRUT_WORLD_R93=Object.freeze({...ZUMRUT_BOUNDS,minX:75,maxX:4725,minY:400,maxY:3120});
export const isZumrutWalkableR93=zumrutWalkable,isZumrutSegmentR93=zumrutSegment;
export const canZumrutFishR93=(x,y)=>zumrutNearRiver({x,y})&&zumrutWalkable(x,y);
