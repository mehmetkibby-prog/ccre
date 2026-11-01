import {randomUUID} from 'node:crypto';
const bossId=channel=>`rune-v2-boss-c${channel}-1`;
// Sparse admin fence: only this channel's canonical Rune boss waits. Existing
// durable hits finish, dirty regeneration flushes, then HP/config commit once.
export function installRuneV2HealthControl485(rpc,db){
 rpc.handlers.runeV2HealthFreeze485=async({token})=>{
  if(typeof token!=='string'||!token||db.runeV2HealthFence485)throw Error('rune_boss_health_fenced485');
  const id=bossId(db.channel);let release;const promise=new Promise(r=>release=r);
  const fence={id,token,promise,release};db.runeV2HealthFence485=fence;
  db.combat.locks.set(id,(db.combat.locks.get(id)??0)+1);
  // No new hit can enter the target after the fence is installed. Locks also
  // stop memory regeneration. The ordinary writer keeps its durability gate.
  await db.combat.waitForTarget(id);await db.flushMemory();return {ok:true};
 };
 rpc.handlers.runeV2HealthResume485=async({token})=>{
  const fence=db.runeV2HealthFence485;if(!fence||fence.token!==token)throw Error('rune_boss_health_token485');
  await db.applyCommitted([{table:'monsters',id:fence.id,keys:[fence.id],staticChanged:'rune_boss_health485'},{table:'rune_v2_settings',id:1,keys:[1],staticChanged:'rune_boss_health485'}]);
  const locks=db.combat.locks.get(fence.id)-1;if(locks)db.combat.locks.set(fence.id,locks);else db.combat.locks.delete(fence.id);
  delete db.runeV2HealthFence485;fence.release();return {ok:true};
 };
}
export function createRuneV2HealthSave485(supervisor,save){
 let tail=Promise.resolve();
 return (config,revision)=>{
  const work=tail.then(async()=>{
   const held=[];
   try{
    for(const channel of [1,2,3]){
     const state=supervisor.children.get(channel);if(!state?.ready)throw Error('channel_unavailable');
     const token=randomUUID();
     try{await state.rpc.request('runeV2HealthFreeze485',{token},{timeoutMs:10000});}
     catch(error){supervisor.notificationFailed(state,error);throw error;}
     held.push({state,token});
    }
    return save(config,revision);
   }finally{
    const failures=[];
    for(const {state,token}of held)try{await state.rpc.request('runeV2HealthResume485',{token},{timeoutMs:5000});}catch(error){supervisor.notificationFailed(state,error);failures.push(error);}
    if(failures.length)throw new AggregateError(failures,'rune_boss_health_resume_failed485');
   }
  });
  tail=work.catch(()=>{});return work;
 };
}
// The supported single-process runtime shares one CombatStore across channels.
// It needs the same sparse fence without pretending resident RPCs exist.
export function createRuneV2LocalHealthSave485(database,save){
 let tail=Promise.resolve();
 return (config,revision)=>{
  const work=tail.then(async()=>{
   const ids=[1,2,3].map(bossId),store=database.combat;let release;
   const promise=new Promise(r=>release=r);database.runeV2HealthFence485={ids,promise,release};
   for(const id of ids)store?.locks.set(id,(store.locks.get(id)??0)+1);
   try{
    await Promise.all(ids.map(id=>store?.waitForTarget(id)));await database.flushMemory();
    const result=save(config,revision);
    if(store?.enabled)for(const id of ids)store.syncEntity('monsters',id);
    return result;
   }finally{
    for(const id of ids)if(store){const count=store.locks.get(id)-1;if(count)store.locks.set(id,count);else store.locks.delete(id);}
    delete database.runeV2HealthFence485;release();
   }
  });tail=work.catch(()=>{});return work;
 };
}
