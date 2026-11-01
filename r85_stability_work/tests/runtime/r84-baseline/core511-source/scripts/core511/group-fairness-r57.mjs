import {castleEnabled,CASTLE_AREA,CASTLE_CHANNEL} from './castle-model-r59.mjs';
import {groupFairnessR57} from './r57-options.mjs';
import {normalPlayerR53} from './r53-options.mjs';
// A waiting group is a scheduling preference, never ownership. Retain it over
// ticks and another member's pending commit, until this exact accepted head
// runs or is retired. Only strictly later overlapping durable actions yield.
const states=new WeakMap();
function state(kernel){
 if(!groupFairnessR57||!kernel.running||kernel.failure)return null;
 let s=states.get(kernel);if(!s){s=new Map();states.set(kernel,s);}return s;
}
function live(kernel,w,current){
 const p=kernel.players.get(w.id);
 return p===w.player&&!p.suspended&&!p.passive&&p.epoch===w.epoch&&kernel.state.owners.get(w.id)===w.owner&&(p.queue[0]?.payload===w.input||current.id===w.id&&current.input===w.input&&current.inputOrder===w.inputOrder);
}
export function olderGroupWaitingR57(context){
 const {kernel,id,input,inputOrder,ids=[id],resources=[]}=context,s=state(kernel);if(!s||!Number.isSafeInteger(inputOrder))return false;
 let blocked=false;
 for(const [actor,w]of s){
  if(!live(kernel,w,context)){s.delete(actor);continue;}
  if(w.id===id&&w.input===input||inputOrder<=w.inputOrder)continue;
  if(ids.some(member=>w.ids.has(member))||resources.some(key=>w.resources.has(key)))blocked=true;
 }
 return blocked;
}
export function rememberDeferredGroupR57({kernel,id,input,inputOrder,ids,resources=[]}){
 const s=state(kernel);if(!s||ids.length<1||ids.length>(castleEnabled()&&kernel.state.channel===CASTLE_CHANNEL?30:25)||!Array.isArray(resources)||resources.length>2048||!resources.every(key=>typeof key==='string'&&key.length<=512)||!Number.isSafeInteger(inputOrder))return;
 if(ids.some(member=>{const p=kernel.players.get(member),row=kernel.state.read('players',member);return !p||p.suspended||p.passive||!(normalPlayerR53(row)||castleEnabled()&&row?.area===CASTLE_AREA&&row.channel===CASTLE_CHANNEL)||row.channel!==kernel.state.channel;}))return;
 const player=kernel.players.get(id),owner=kernel.state.owners.get(id);if(!player||!owner||s.size>=(castleEnabled()&&kernel.state.channel===CASTLE_CHANNEL?100:25)&&!s.has(id))return;
 // Retaliation potions can hold a READ lease on the dying monster even when
 // their actor is outside the reward party. Compare the trusted footprint as
 // well, so newer readers cannot keep extending an older exclusive wait.
 s.set(id,{id,input,inputOrder,ids:new Set(ids),resources:new Set(resources),player,epoch:player.epoch,owner});
}
