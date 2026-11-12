import {zumrutNode} from './zumrut-map-r93.mjs';

// Per-channel, bounded by the static resource catalog. Existing world frames
// read this only for Zümrüt; expiration does not write SQL or schedule work.
const states=new WeakMap();
const EMPTY=Object.freeze({rows:Object.freeze([]),deadline:Infinity});
const valid=(row,channel)=>row&&row.channel===channel&&typeof row.nodeId==='string'&&zumrutNode(row.nodeId)&&Number.isSafeInteger(row.availableAtMs)&&row.availableAtMs>0;
function stateFor(world){let state=states.get(world);if(!state){state={rows:new Map(),view:EMPTY};states.set(world,state);}return state;}
function rebuild(state){
 const rows=[...state.rows.values()].sort((a,b)=>a.nodeId.localeCompare(b.nodeId));
 state.view=rows.length?Object.freeze({rows:Object.freeze(rows),deadline:Math.min(...rows.map(row=>row.availableAtMs))}):EMPTY;
 return state.view;
}
export function mergeZumrutNodeDepletionsR93(world,rows,now){
 if(!world||!Array.isArray(rows)||!Number.isFinite(now))return false;
 let state=states.get(world),changed=false;
 for(const row of rows){
  if(!valid(row,world.state.channel)||row.availableAtMs<=now)continue;
  state??=stateFor(world);const prior=state.rows.get(row.nodeId);
  if(prior&&prior.availableAtMs>=row.availableAtMs)continue;
  state.rows.set(row.nodeId,Object.freeze({nodeId:row.nodeId,channel:row.channel,availableAtMs:row.availableAtMs}));changed=true;
 }
 if(changed)rebuild(state);return changed;
}
export function zumrutNodeProjectionR93(world,area,now){
 if(area!=='zumrut')return null;
 const state=states.get(world);if(!state)return EMPTY;
 if(now>=state.view.deadline){for(const [id,row]of state.rows)if(row.availableAtMs<=now)state.rows.delete(id);return rebuild(state);}
 return state.view;
}
export function acceptZumrutNodeCommitR93(world,command,ack,now){
 if(command?.operation!=='native_action'||command.payload?.input?.action!=='zumrut_finish'||ack?.result?.result?.status!==200)return false;
 const row=ack.result.result.body?.nodeDepletion;
 return row?mergeZumrutNodeDepletionsR93(world,[row],now):false;
}
