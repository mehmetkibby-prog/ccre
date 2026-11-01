// Serialize only a target's short read/validate/commit phase, never network delivery.
export function createPvpCommitGate(maxPerTarget=64, maxTargets=512, waitMs=1500) {
  type Waiter={resolve:(release:(()=>void)|null)=>void;timer:ReturnType<typeof setTimeout>};
  const targets=new Map<string,{waiting:Waiter[]}>();
  function owner(key:string,entry:{waiting:Waiter[]}) {
    let released=false;
    return ()=>{
      if(released)return;released=true;
      const next=entry.waiting.shift();
      if(next){clearTimeout(next.timer);next.resolve(owner(key,entry));}
      else if(targets.get(key)===entry)targets.delete(key);
    };
  }
  async function acquire(key:string):Promise<(()=>void)|null> {
    let entry=targets.get(key);
    if(!entry){
      if(targets.size>=maxTargets)return null;
      entry={waiting:[]};targets.set(key,entry);return owner(key,entry);
    }
    if(entry.waiting.length>=maxPerTarget-1)return null;
    const queue=entry;
    return new Promise(resolve=>{
      const waiter:Waiter={resolve,timer:setTimeout(()=>{
        const index=queue.waiting.indexOf(waiter);
        if(index>=0){queue.waiting.splice(index,1);resolve(null);}
      },waitMs)};
      queue.waiting.push(waiter);
    });
  }
  return {acquire,size:()=>targets.size};
}
export const pvpCommitGate=createPvpCommitGate();
type ActorScope={id:string;hp:number;area:string;channel:number;arena_match_id:string;realtime_scope_version:number};
export function samePvpActorScope(original:ActorScope|null,current:ActorScope|null) {
  return Boolean(original&&current&&original.hp>0&&current.hp>0&&
    original.id===current.id&&original.area===current.area&&original.channel===current.channel&&
    original.arena_match_id===current.arena_match_id&&original.realtime_scope_version===current.realtime_scope_version);
}
