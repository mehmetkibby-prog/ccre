import {nativeEngagementR53} from './r53-options.mjs';
import {pveEntries489 as legacyEntries} from '../../../native510-bb3a6cc689c6/vds-server/src/pve-multi489.mjs';

// Persistent, bounded images. A proposal/checkpoint can retain an old image;
// replacing an attacker never mutates that image or its deadlines.
const states=new WeakMap(),decoded=new WeakMap();
const fields=['player_id','monster_id','spawn_round','next_hit_at_ms','expires_at_ms','hit_sequence','updated_at_ms','last_skill_at_ms'];
const valid=(key,e)=>e&&key===e.monster_id&&!/^(0|[1-9][0-9]*)$/.test(key)&&['spawn_round','next_hit_at_ms','last_skill_at_ms'].every(k=>Number.isSafeInteger(e[k])&&e[k]>=0);
const before=(a,b)=>a.next_hit_at_ms<b.next_hit_at_ms||a.next_hit_at_ms===b.next_hit_at_ms&&a.monster_id<b.monster_id;
function heapify(heap){for(let i=(heap.length>>>1)-1;i>=0;i--)down(heap,i);return heap;}
function down(h,i){for(;;){let j=i*2+1;if(j>=h.length)return;if(j+1<h.length&&before(h[j+1],h[j]))j++;if(!before(h[j],h[i]))return;[h[i],h[j]]=[h[j],h[i]];i=j;}}
function replaceHeap(heap,id,value){const h=heap.slice(),i=h.findIndex(e=>e.monster_id===id);if(i>=0){h[i]=value;for(let n=i;n>0;){const p=(n-1)>>>1;if(!before(h[n],h[p]))break;[h[n],h[p]]=[h[p],h[n]];n=p;}down(h,h.indexOf(value));}else{h.push(value);for(let n=h.length-1;n>0;){const p=(n-1)>>>1;if(!before(h[n],h[p]))break;[h[n],h[p]]=[h[p],h[n]];n=p;}}return h;}
function state(row){
 if(!row||!nativeEngagementR53)return null;
 const own=states.get(row);if(own)return own;if(decoded.has(row))return decoded.get(row);
 let value=null;try{const data=JSON.parse(row.attackers489||'{}'),pairs=Object.entries(data);if(pairs.length<=32&&pairs.every(([k,e])=>valid(k,e))){const map=new Map(pairs.map(([k,e])=>[k,Object.freeze({...e})]));value={map,heap:heapify([...map.values()]),membership:Object.freeze([...map.keys()]),legacy:map.size===0};}}catch{}
 if(Object.isFrozen(row))decoded.set(row,value);return value;
}
function make(meta,s){
 if(!s.order)s.order=new Map([...s.map.keys()].map((id,index)=>[id,index]));
 const row={};for(const k of fields)row[k]=meta[k];let text;
 Object.defineProperty(row,'attackers489',{enumerable:true,get(){return text??=JSON.stringify(Object.fromEntries(s.map));}});
 states.set(row,s);return Object.freeze(row);
}
export const isEngagementR53=row=>Boolean(row&&states.has(row));
export function cloneEngagementR53(row,patch={}){const s=states.get(row);return s?make({...Object.fromEntries(fields.map(k=>[k,row[k]])),...patch},s):null;}
export function entriesR53(row){const s=state(row);return s&&!s.legacy?[...s.map.values()]:legacyEntries(row);}
export function sameMembersR53(a,b){const x=state(a),y=state(b);return Boolean(x&&y&&!x.legacy&&!y.legacy&&(x.membership===y.membership||x.map.size===y.map.size&&x.membership.every(k=>y.map.has(k))));}
export function nativeStateR53(row){return state(row);}
export function dueR53(row,now){
 if(!row||row.next_hit_at_ms>now)return [];
 const s=state(row);if(!s||s.legacy)return legacyEntries(row).filter(e=>e.next_hit_at_ms<=now);
 const due=[],pending=s.heap.length?[0]:[];
 while(pending.length){const i=pending.pop(),e=s.heap[i];if(e.next_hit_at_ms>now)continue;due.push(e);const l=i*2+1;if(l<s.heap.length)pending.push(l);if(l+1<s.heap.length)pending.push(l+1);}
 // Native execution order is insertion order, not chronological/heap order.
 s.order??=new Map([...s.map.keys()].map((id,index)=>[id,index]));
 return due.sort((a,b)=>s.order.get(a.monster_id)-s.order.get(b.monster_id));
}
export function updateEngagementR53(row,entry,patch={},head=true){
 const s=state(row);if(!s||s.legacy)return null;
 const value=Object.freeze({...entry}),map=new Map(s.map),existed=map.has(entry.monster_id);map.set(entry.monster_id,value);
 if(map.size>32)return null;
 const next={map,heap:replaceHeap(s.heap,entry.monster_id,value),membership:existed?s.membership:Object.freeze([...map.keys()]),order:existed?s.order:undefined,legacy:false},first=next.heap[0];
 const meta=Object.fromEntries(fields.map(k=>[k,row[k]]));
 return make({...meta,...patch,...(head?{monster_id:first.monster_id,spawn_round:first.spawn_round,next_hit_at_ms:first.next_hit_at_ms}:{})},next);
}
export function createEngagementR53(meta,entries){const map=new Map(entries.map(e=>[e.monster_id,Object.freeze({...e})]));return make(meta,{map,heap:heapify([...map.values()]),membership:Object.freeze([...map.keys()]),legacy:false});}
export function removeEngagementR53(row,id){
 const s=state(row);if(!s||s.legacy)return undefined;
 const map=new Map(s.map);map.delete(id);if(!map.size)return null;
 const heap=heapify(s.heap.filter(e=>e.monster_id!==id)),first=heap[0];
 return make({...Object.fromEntries(fields.map(k=>[k,row[k]])),monster_id:first.monster_id,spawn_round:first.spawn_round,next_hit_at_ms:first.next_hit_at_ms},{map,heap,membership:Object.freeze([...map.keys()]),legacy:false});
}

export function hitEngagementR53(row,entry){return isEngagementR53(row)?{...Object.fromEntries(fields.map(k=>[k,row[k]])),...entry}:{...row,...entry};}
