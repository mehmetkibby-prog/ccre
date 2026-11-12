// This index only discovers native due entries. It never consumes a deadline:
// busy lanes, stun, a terminal hit and a clock rewind must all be retryable.
// Native insertion order, not heap order, determines hit/RNG execution order.
const MAX_ACTORS=128,MAX_TEXT=65536;
const sameEntry=(a,b)=>a?.monster_id===b?.monster_id&&a?.spawn_round===b?.spawn_round&&a?.next_hit_at_ms===b?.next_hit_at_ms&&a?.last_skill_at_ms===b?.last_skill_at_ms;
const valid=e=>e&&typeof e.monster_id==='string'&&Number.isSafeInteger(e.spawn_round)&&Number.isSafeInteger(e.next_hit_at_ms);
const before=(a,b)=>a.entry.next_hit_at_ms<b.entry.next_hit_at_ms||(a.entry.next_hit_at_ms===b.entry.next_hit_at_ms&&a.order<b.order);
function swap(heap,a,b){[heap[a],heap[b]]=[heap[b],heap[a]];heap[a].index=a;heap[b].index=b;}
function up(heap,index){while(index){const parent=(index-1)>>>1;if(!before(heap[index],heap[parent]))break;swap(heap,index,parent);index=parent;}return index;}
function down(heap,index){for(;;){const left=index*2+1;if(left>=heap.length)return;const right=left+1,child=right<heap.length&&before(heap[right],heap[left])?right:left;if(!before(heap[child],heap[index]))return;swap(heap,index,child);index=child;}}
function matches(state,row){return state.text===(row.attackers489||'{}')&&(!state.legacy||sameEntry(state.head,row));}
export class RetaliationDueQueueR52 {
 constructor(parse){this.parse=parse;this.rows=new Map();this.metrics={lookups:0,rebuilds:0,reused:0,selected:0,comparisons:0,evicted:0,updated:0,invalidated:0,reusedSelections:0};}
 forget(id){this.rows.delete(id);}
 // Called only after the existing resident hit has successfully published its
 // authoritative row. That one known replacement preserves all JSON keys and
 // native order; an unfamiliar image is never incrementally guessed at.
 hit(id,oldRow,newRow,oldEntry,newEntry){
  const state=this.rows.get(id);if(!state)return;
  const node=state.byMonster?.get(oldEntry?.monster_id);
  if(!oldRow||!newRow||!matches(state,oldRow)||state.legacy||!node||!sameEntry(node.entry,oldEntry)||oldEntry.monster_id!==newEntry?.monster_id||!valid(newEntry)||typeof newRow.attackers489!=='string'||newRow.attackers489.length>MAX_TEXT){this.rows.delete(id);this.metrics.invalidated++;return;}
  node.entry=newEntry;state.entries[node.order]=newEntry;state.text=newRow.attackers489;state.selection=null;
  down(state.heap,up(state.heap,node.index));this.metrics.updated++;
 }
 due(id,row,now){
  this.metrics.lookups++;
  if(!row){this.forget(id);return [];}
  // Keep the original outer head gate, including legacy rows with empty JSON.
  if(row.next_hit_at_ms>now)return [];
  const text=row.attackers489||'{}';
  if(typeof text!=='string'||text.length>MAX_TEXT){this.forget(id);return this.parse(row).filter(e=>e.next_hit_at_ms<=now);}
  let state=this.rows.get(id);
  if(!state||!matches(state,row)){
   // Use the native parser: Object.values order, fallback only when there are
   // zero values, then validity filtering and FIRST 32 (before due filtering).
   const entries=this.parse(row),heap=entries.map((entry,order)=>({entry,order,index:order})),byMonster=new Map();let unique=true;
   for(const node of heap){if(byMonster.has(node.entry.monster_id))unique=false;byMonster.set(node.entry.monster_id,node);}
   for(let i=(heap.length>>>1)-1;i>=0;i--)down(heap,i);
   const keyed=Object.entries(JSON.parse(text)),legacy=keyed.length===0;
   // A hit mutates attackers[monster.id], so only canonical key/value images
   // may use the O(log32) shortcut. Aliases, invalid rows or a 33rd value can
   // otherwise make the native first32 differ from the key being replaced.
   const canonical=keyed.length<=32&&keyed.every(([key,value])=>valid(value)&&key===value.monster_id);
   state={text,legacy,head:legacy?{monster_id:row.monster_id,spawn_round:row.spawn_round,next_hit_at_ms:row.next_hit_at_ms,last_skill_at_ms:row.last_skill_at_ms}:null,entries,heap,byMonster:unique&&canonical?byMonster:null};
   if(!this.rows.has(id)&&this.rows.size>=MAX_ACTORS){this.rows.delete(this.rows.keys().next().value);this.metrics.evicted++;}
   this.rows.set(id,state);this.metrics.rebuilds++;
  }else this.metrics.reused++;
  // With no successful hit (for example a busy or stunned attacker), the same
  // deadline interval has the same selection. Retain nodes, return fresh lists.
  const prior=state.selection;if(prior&&now>=prior.from&&now<prior.until){this.metrics.reusedSelections++;this.metrics.selected+=prior.nodes.length;return prior.nodes.map(node=>node.entry);}
  const selected=[],pending=state.heap.length?[0]:[];let from=-Infinity,until=Infinity;
  while(pending.length){const index=pending.pop(),node=state.heap[index];this.metrics.comparisons++;if(!(node.entry.next_hit_at_ms<=now)){until=Math.min(until,node.entry.next_hit_at_ms);continue;}from=Math.max(from,node.entry.next_hit_at_ms);selected.push(node);const left=index*2+1;if(left<state.heap.length)pending.push(left);if(left+1<state.heap.length)pending.push(left+1);}
  this.metrics.selected+=selected.length;
  selected.sort((a,b)=>a.order-b.order);state.selection={from,until,nodes:selected};
  return selected.map(node=>node.entry);
 }
}
