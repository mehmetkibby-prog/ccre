// At most 25 active heads. Reinsert after EACH consumed command: draining one
// actor's complete queue lets its newer kill overtake another actor's older
// input and acquire the whole party again. No reservation or global hold.
const eligible=p=>!p.passive&&!p.suspended&&!p.barrier&&p.queue[0]?.kind==='combat';
const compare=(a,b)=>a.head.at-b.head.at||a.order-b.order;
export function* combatInputOrder(players){
 const ready=[];let order=0;
 for(const pair of players){if(eligible(pair[1]))ready.push({pair,order,head:pair[1].queue[0]});order++;}
 ready.sort(compare);
 while(ready.length){
  const row=ready.shift(),p=row.pair[1];if(!eligible(p))continue;
  const prior=p.queue[0];yield row.pair;
  // Unconsumed/DEFER heads are attempted only once in this wave. A pending
  // durable operation excludes every fenced party member through eligibility.
  if(eligible(p)&&p.queue[0]!==prior){
   row.head=p.queue[0];let low=0,high=ready.length;
   while(low<high){const mid=(low+high)>>>1;if(compare(ready[mid],row)<=0)low=mid+1;else high=mid;}
   ready.splice(low,0,row);
  }
 }
}
