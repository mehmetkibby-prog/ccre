import {isAdventureArea} from './adventure-maps.mjs';

const EMPTY=Object.freeze([]);
const scopeKey=(row,cycle)=>JSON.stringify([cycle,row.channel,row.area,row.instanceId??'']);
const cellKey=(scope,x,y)=>scope+':'+x+':'+y;
const sameBox=(a,b)=>a.scope===b.scope&&a.left===b.left&&a.right===b.right&&a.top===b.top&&a.bottom===b.bottom;
const contains=(box,scope,x,y)=>box&&box.scope===scope&&x>=box.left&&x<=box.right&&y>=box.top&&y<=box.bottom;

// Inverse broad phase: a monster belongs to each cell from which it could be
// acquired. Moving players read one cell; only monster footprint changes rebuild
// its sorted ID list. Native nearby() still decides exact range/ownership/order.
export class AggroSpatialIndexR52 {
 constructor({cycle,cellSize=256,maxRows=16384,maxEdges=131072,maxCells=32768}={}){
  this.cycle=cycle;this.cellSize=cellSize;this.maxRows=maxRows;this.maxEdges=maxEdges;this.maxCells=maxCells;
  this.rows=new Map();this.cells=new Map();this.edges=0;this.disabled=false;
  this.metrics={updates:0,footprints:0,queries:0,sorts:0,edgeAdds:0,edgeRemoves:0,disabled:0};
 }
 disable(){this.disabled=true;this.metrics.disabled++;this.rows.clear();this.cells.clear();this.edges=0;}
 remove(id){
  const old=this.rows.get(id);if(!old)return;
  for(let x=old.left;x<=old.right;x++)for(let y=old.top;y<=old.bottom;y++){
   const key=cellKey(old.scope,x,y),cell=this.cells.get(key);if(!cell)continue;
   if(cell.ids.delete(id)){this.edges--;this.metrics.edgeRemoves++;cell.sorted=null;}
   if(!cell.ids.size)this.cells.delete(key);
  }
  this.rows.delete(id);
 }
 upsert(row,cycle=this.cycle){
  if(this.disabled)return;this.metrics.updates++;
  // World reset changes the view cycle before removing/repopulating its rows.
  // While old rows remain the caller uses the original cycle-aware grid.
  if(cycle!==this.cycle){if(this.rows.size){this.disable();return;}this.cycle=cycle;}
  // The owning AggroMemory captures immutable rows and validates coordinates
  // through its original SpatialGrid before this optional index is updated.
  if(row.hp<=0||row.is_stone||/^rune-v2-boss-c[1-4]-1$/.test(row.id)){this.remove(row.id);return;}
  const old=this.rows.get(row.id),instanceId=row.instanceId??'',sameScope=old&&old.channel===row.channel&&old.area===row.area&&old.instanceId===instanceId;
  if(sameScope&&Object.is(old.x,row.x)&&Object.is(old.y,row.y))return;
  const radius=sameScope?old.radius:isAdventureArea(row.area)?650:370,size=this.cellSize;
  const next={scope:sameScope?old.scope:scopeKey(row,this.cycle),channel:row.channel,area:row.area,instanceId,radius,x:row.x,y:row.y,left:Math.floor((row.x-radius)/size),right:Math.floor((row.x+radius)/size),top:Math.floor((row.y-radius)/size),bottom:Math.floor((row.y+radius)/size)};
  if(old&&sameBox(old,next)){this.rows.set(row.id,next);return;}
  // Huge/corrupt coordinates must never create an unbounded loop. Falling back
  // disables only this optimization; the original grid/rules remain available.
  const width=next.right-next.left+1,height=next.bottom-next.top+1;
  if(!Number.isSafeInteger(next.left)||!Number.isSafeInteger(next.right)||!Number.isSafeInteger(next.top)||!Number.isSafeInteger(next.bottom)||width<1||height<1||width>7||height>7||(!old&&this.rows.size>=this.maxRows)){this.disable();return;}
  this.metrics.footprints++;
  if(old)for(let x=old.left;x<=old.right;x++)for(let y=old.top;y<=old.bottom;y++){
   if(contains(next,old.scope,x,y))continue;
   const key=cellKey(old.scope,x,y),cell=this.cells.get(key);
   if(cell?.ids.delete(row.id)){this.edges--;this.metrics.edgeRemoves++;cell.sorted=null;if(!cell.ids.size)this.cells.delete(key);}
  }
  for(let x=next.left;x<=next.right;x++)for(let y=next.top;y<=next.bottom;y++){
   if(contains(old,next.scope,x,y))continue;
   const key=cellKey(next.scope,x,y);let cell=this.cells.get(key);
   if(this.edges>=this.maxEdges||(!cell&&this.cells.size>=this.maxCells)){this.disable();return;}
   if(!cell)this.cells.set(key,cell={ids:new Set(),sorted:null});
   cell.ids.add(row.id);cell.sorted=null;this.edges++;this.metrics.edgeAdds++;
  }
  this.rows.set(row.id,next);
 }
 candidates(player,channel){
  if(this.disabled)return null;this.metrics.queries++;
  const key=cellKey(scopeKey({channel,area:player.area},this.cycle),Math.floor(player.x/this.cellSize),Math.floor(player.y/this.cellSize)),cell=this.cells.get(key);
  if(!cell)return EMPTY;
  if(!cell.sorted){cell.sorted=Object.freeze([...cell.ids].sort());this.metrics.sorts++;}
  return cell.sorted;
 }
 snapshot(){return {...this.metrics,rows:this.rows.size,cells:this.cells.size,edges:this.edges};}
}
