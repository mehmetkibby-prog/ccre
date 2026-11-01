import {demand} from './contract.mjs';
const scopeKey = row => JSON.stringify([row.cycle,row.channel,row.area,row.instanceId??'']);
const order=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
export class SpatialGrid {
 constructor({cellSize=256,maxRadius=2048,trackScopes=false}={}) {
  demand(Number.isFinite(cellSize)&&cellSize>0,'invalid_grid_size');
  this.cellSize=cellSize;this.maxRadius=maxRadius;this.rows=new Map();this.cells=new Map();this.geometryRevision=0;this.scopes=trackScopes?new Map():null;
 }
 key(row) { return scopeKey(row)+':'+Math.floor(row.x/this.cellSize)+':'+Math.floor(row.y/this.cellSize); }
 upsert(row) {
  demand(row&&typeof row.id==='string'&&Number.isFinite(row.x)&&Number.isFinite(row.y),'invalid_grid_entity');
  const key=this.key(row),old=this.rows.get(row.id),scope=this.scopes?scopeKey(row):null;
  const moved=!old||old.key!==key||!Object.is(old.row.x,row.x)||!Object.is(old.row.y,row.y);
  if(!old||old.key!==key||!Object.is(old.row.x,row.x)||!Object.is(old.row.y,row.y))this.geometryRevision++;
  if(old?.key!==key) {
   if(old)this.remove(row.id);
   let cell=this.cells.get(key);if(!cell)this.cells.set(key,cell=new Map());
   cell.set(row.id,row);
  } else this.cells.get(key).set(row.id,row);
  if(this.scopes){let state=this.scopes.get(scope);if(!state)this.scopes.set(scope,state={count:0,revision:this.geometryRevision});if(old?.key!==key)state.count++;if(moved)state.revision=this.geometryRevision;}
  this.rows.set(row.id,{key,row,...(this.scopes?{scope}:{})});
 }
 remove(id) {
  const old=this.rows.get(id);if(!old)return;
  this.geometryRevision++;
  const cell=this.cells.get(old.key);cell.delete(id);if(!cell.size)this.cells.delete(old.key);
  this.rows.delete(id);
  if(this.scopes){const state=this.scopes.get(old.scope);if(--state.count===0)this.scopes.delete(old.scope);else state.revision=this.geometryRevision;}
 }
 scopeRevision(scope){return this.scopes?this.scopes.get(scopeKey(scope))?.revision??0:this.geometryRevision;}
 nearby(scope,x,y,radius,predicate=()=>true) {
  demand(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(radius)&&radius>=0&&radius<=this.maxRadius,'invalid_grid_query');
  const prefix=scopeKey(scope),size=this.cellSize,out=[];
  for(let cx=Math.floor((x-radius)/size);cx<=Math.floor((x+radius)/size);cx++)
   for(let cy=Math.floor((y-radius)/size);cy<=Math.floor((y+radius)/size);cy++)
    for(const row of this.cells.get(prefix+':'+cx+':'+cy)?.values()??[])
     if((row.x-x)**2+(row.y-y)**2<=radius*radius&&predicate(row))out.push(row);
  // Stable tie order is independent of cell traversal and insertion order.
  return out.sort(order);
 }
}
