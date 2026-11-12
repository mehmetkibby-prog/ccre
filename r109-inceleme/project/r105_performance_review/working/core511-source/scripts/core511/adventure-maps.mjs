import {CASTLE_AREA,CASTLE_BOUNDS,CASTLE_ENTRY,castleWalkable,castleSegment} from './castle-model-r59.mjs';
import {MIST_LOOT_ACTIONS} from './mist-loot-actions.mjs';
// Map data only. All input, collision, prediction, combat and replication use
// the ordinary world engine. There is no DungeonEngine instance for these maps.
const AREA=/^(kadim|sis)_([a-f0-9]{32})(?:_(0[1-9]|10))?$/;
export const ADVENTURE_ACTIONS=Object.freeze([...MIST_LOOT_ACTIONS,'adventure_tower_enter','adventure_next','adventure_leave','adventure_mist_enter','adventure_chest','adventure_tower_chest','adventure_refine']);
export function adventureArea(area){
 if(area===CASTLE_AREA)return {kind:'castle',run:'castle-r59',floor:1};if(typeof area!=='string')return null;const m=AREA.exec(area);if(!m||m[1]==='kadim'&&!m[3]||m[1]==='sis'&&m[3])return null;
 return {kind:m[1]==='kadim'?'tower':'mist',run:m[2],floor:m[3]?Number(m[3]):1};
}
export const isAdventureArea=area=>adventureArea(area)!==null;
export const isMistArea=area=>adventureArea(area)?.kind==='mist';
export function mapArea(kind,id,floor=1){
 const token=String(id).replaceAll('-','');if(!/^[a-f0-9]{32}$/.test(token)||!['tower','mist'].includes(kind)||!Number.isInteger(floor)||floor<1||floor>10)throw Error('adventure_map_id');
 return kind==='tower'?`kadim_${token}_${String(floor).padStart(2,'0')}`:`sis_${token}`;
}
export const ADVENTURE_BOUNDS=Object.freeze({width:1600,height:1100});
export const ADVENTURE_ENTRY=Object.freeze({x:800,y:940});
// Keep tower geometry byte-for-byte equivalent; mist uses ordinary world units,
// with enough space between encounters and the four arrival positions.
export const MIST_BOUNDS=Object.freeze({width:2400,height:1600});
export const MIST_ENTRY=Object.freeze({x:1171.875,y:1359.375});
const mistKind=area=>area==='mist'||isMistArea(area);
export const adventureBounds=area=>area===CASTLE_AREA?CASTLE_BOUNDS:mistKind(area)?MIST_BOUNDS:ADVENTURE_BOUNDS;
export function adventureEntry(area,slot=0){if(area===CASTLE_AREA)return CASTLE_ENTRY;if(!mistKind(area))return ADVENTURE_ENTRY;const offsets=[[-50,0],[50,0],[-50,45],[50,45]],offset=offsets[Math.max(0,Math.min(3,slot))];return {x:MIST_ENTRY.x+offset[0],y:MIST_ENTRY.y+offset[1]};}
export function adventureWalkable(area,x,y){if(area===CASTLE_AREA)return castleWalkable(x,y);const bounds=adventureBounds(area);return isAdventureArea(area)&&Number.isFinite(x)&&Number.isFinite(y)&&x>=80&&x<=bounds.width-80&&y>=100&&y<=bounds.height-80;}
export function adventureSegment(area,x,y,tx,ty){if(area===CASTLE_AREA)return castleSegment(x,y,tx,ty);return adventureWalkable(area,x,y)&&adventureWalkable(area,tx,ty);}
export function adventureLabel(area){if(area===CASTLE_AREA)return 'Lonca Kalesi';const a=adventureArea(area);return a?(a.kind==='tower'?`Kadim Kulesi · ${a.floor}. Kat`:'Sis Yarığı'):null;}
export function adventureSpawn(index,count=1,area='tower',kind='claw'){
 if(!mistKind(area)){const angle=index*2.399963229728653,radius=150+index%4*95;return {x:800+Math.cos(angle)*radius,y:480+Math.sin(angle)*Math.min(300,radius)};}
 const unit=2400/1536,point=(x,y)=>({x:x*unit,y:y*unit});
 if(kind==='seal'){const [x,y]=[[300,240],[1350,365],[250,525]][index%3];return point(x,y);}
 // Coordinates are tied to the existing1536x1024 art: dirt paths and platforms,
 // not an independent simulation map. Default groups occupy separate approaches.
 const routes={claw:[[505,625,.2,-1],[495,550,-.2,-1],[475,480,-.5,-1],[430,410,-.5,-1],[395,345,-.5,-1],[355,285,-1,-.5]],guard:[[1085,650,.6,-1],[1150,565,.5,-1],[1225,480,0,-1],[1210,415,.8,-.5],[1260,390,1,0],[1355,365,1,0]],spirit:[[780,365,1,0],[885,355,1,-.2],[1025,310,1,.2],[1110,320,1,.3],[590,220,1,0],[675,190,1,0]],rare:[[1085,650,.6,-1],[1025,310,1,.2],[505,625,.2,-1],[780,365,1,0],[475,480,-.5,-1],[1150,565,.5,-1]]};
 const anchors=routes[kind];if(anchors){
  const placed=[];for(let i=0;i<=index;i++){const [x,y,dx,dy]=anchors[i%anchors.length],ring=Math.floor(i/anchors.length),offset=ring===0?0:Math.ceil(ring/2)*28*(ring%2?1:-1),length=Math.hypot(dx,dy);let p;
   for(const lateral of [0,32,-32,48,-48,64,-64]){p=point(x+offset*dx/length-lateral*dy/length,y+offset*dy/length+lateral*dx/length);if(placed.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>=40))break;}
   placed.push(p);
  }return placed[index];
 }
 if(count<=1)return point(830,185);
 const cols=Math.ceil(Math.sqrt(count)),spacing=36;
 return point(830+((index%cols)-(cols-1)/2)*spacing,185+Math.floor(index/cols)*spacing);
}
export const adventureMonsterId=id=>typeof id==='string'&&/^(golge|curuk|yutan)-adv-[a-f0-9]{32}$/.test(id);
