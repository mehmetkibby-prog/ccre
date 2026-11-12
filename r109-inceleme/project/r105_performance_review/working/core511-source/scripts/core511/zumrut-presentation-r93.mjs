// Client-only projection helpers. Server deadlines remain authoritative; there
// is no polling, simulation timer or predicted inventory credit here.
const local=new Map(),projected=new WeakMap(),shown=new Set();
let clock=null;
const perf=()=>typeof performance!=='undefined'?performance.now():Date.now();
function stamp(serverAtMs,at=perf()){
 if(!Number.isFinite(serverAtMs))return;
 // Older snapshots must never extend a recent confirmed node cooldown.
 const estimated=clock?clock.serverAtMs+Math.max(0,at-clock.at):-Infinity;
 if(serverAtMs>estimated)clock={serverAtMs,at};
}
function key(nodeId,channel){return channel+':'+nodeId;}
export function rememberZumrutDepletionR93(row,serverAtMs){
 if(!row||typeof row.nodeId!=='string'||!Number.isInteger(row.channel)||!Number.isFinite(row.availableAtMs))return;
 stamp(serverAtMs);if(row.availableAtMs<=zumrutServerNowR93())return;const id=key(row.nodeId,row.channel),prior=local.get(id);
 if(!prior||row.availableAtMs>prior.availableAtMs)local.set(id,{...row});
 while(local.size>512)local.delete(local.keys().next().value);
}
export function acceptZumrutStateR93(state,channel){stamp(state?.serverAtMs);for(const row of state?.nodeDepletions??[])rememberZumrutDepletionR93({...row,channel:row.channel??channel},state.serverAtMs);}
export function zumrutServerNowR93(world){
 const serverAtMs=world?.zumrutR93?.serverAtMs??world?.snapshotAtMs??(Number.isFinite(world?.serverTime)?world.serverTime*1000:undefined);
 stamp(serverAtMs);return clock?clock.serverAtMs+Math.max(0,perf()-clock.at):Date.now();
}
function projectedRows(world){const rows=world?.zumrutR93?.nodeDepletions;if(!Array.isArray(rows))return null;let index=projected.get(rows);if(!index){index=new Map(rows.filter(row=>row&&typeof row.nodeId==='string'&&Number.isFinite(row.availableAtMs)).map(row=>[key(row.nodeId,row.channel??world.channel),row.availableAtMs]));projected.set(rows,index);}return index;}
export function zumrutNodeRespawnAtR93(nodeId,world){const id=key(nodeId,world?.channel),value=local.get(id),now=zumrutServerNowR93(world);if(value&&value.availableAtMs<=now)local.delete(id);return Math.max(local.get(id)?.availableAtMs??0,projectedRows(world)?.get(id)??0);}
export function zumrutNodeAvailableR93(nodeId,world,serverNow){return zumrutNodeRespawnAtR93(nodeId,world)<=(Number.isFinite(serverNow)?serverNow:zumrutServerNowR93(world));}
export function zumrutNextRespawnR93(world){const now=zumrutServerNowR93(world);let next=Infinity;for(const row of local.values())if(row.channel===world?.channel&&row.availableAtMs>now)next=Math.min(next,row.availableAtMs);for(const [id,at]of projectedRows(world)??[])if(id.startsWith(world.channel+':')&&at>now)next=Math.min(next,at);return Number.isFinite(next)?next:null;}
export function claimZumrutToastR93(operationId){if(typeof operationId!=='string'||shown.has(operationId))return false;shown.add(operationId);while(shown.size>256)shown.delete(shown.values().next().value);return true;}
export function resetZumrutPresentationForTestR93(){local.clear();shown.clear();clock=null;}
