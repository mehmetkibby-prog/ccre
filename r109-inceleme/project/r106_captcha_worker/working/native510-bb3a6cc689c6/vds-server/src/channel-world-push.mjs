// Preserve existing SQL visibility/snapshot callbacks in the trusted main
// process. Projection, coalescing, packet splitting and signed delivery run in
// the owning channel process, with the original WorldPush implementation.
export function attachChannelWorldPush(channels,push){
 const callbacks=new Map(),states=new Map();
 const committed=push.committed.bind(push),invalidate=push.invalidate.bind(push);
 const pending=new Map(),keys=new Map();let serial=0,job=null;
 const enqueue=(key,value)=>{const old=keys.get(key);if(old)pending.delete(old);const seq=++serial;keys.set(key,seq);pending.set(seq,{...value,key});};
 push.committed=change=>{committed(change);enqueue('c:'+change.table+':'+change.id,{kind:'commit',change});};
 push.invalidate=(owner,kind='full')=>{invalidate(owner,kind);enqueue('i:'+String(owner),{kind:'invalidate',owner,mode:kind==='full'||pending.get(keys.get('i:'+String(owner)))?.mode==='full'?'full':kind});};
 const read=async(state,{id,kind,topic,scope})=>{
  const registered=callbacks.get(id);if(!registered||registered.channel!==state.channel)throw Error('push_callback_scope');
  const context=registered.context;
  const result=kind==='full'?await context.read():kind==='owner'?await context.readOwner():kind==='shared'?await context.readShared(topic,scope):kind==='boss'?await context.readBossLeaders():null;
  if(push.db.worldReadFenceEnabledR13?.())await push.db.worldReadDurableR13();else if(push.durability.size)await Promise.all([...push.durability]);return result;
 };
 channels.pushRead=read;
 const connect=state=>state.pushConnect??=(async()=>{
  const old=states.get(state.channel);if(old?.incarnation===state.incarnation)return old;
  if(old)channels.db.combat.releaseProjectionCursor(old.cursor);
  const info={incarnation:state.incarnation,cursor:channels.db.combat.createProjectionCursor(),seen:serial,health:null};
  await state.rpc.request('pushInit',{origin:process.env.REALTIME_HTTP_ORIGIN,privateKey:process.env.REALTIME_SIGNING_PRIVATE_KEY});
  // A restarted channel has a fresh epoch. Clients use their existing silence
  // timeout/snapshot recovery; credentials are never reused across incarnations.
  states.set(state.channel,info);return info;
 })().catch(error=>{state.pushConnect=null;throw error;});
 push.subscribe=async context=>{
  if(!push.enabled)return {...context.data,worldPush:{enabled:false}};
  const channel=context.data.channel,state=channels.children.get(channel);
  if(!state?.ready)return {...context.data,worldPush:{enabled:false}};
  if(push.db.worldReadFenceEnabledR13?.())await push.db.worldReadDurableR13();else if(push.durability.size)await Promise.all([...push.durability]);
  await connect(state);const id=context.auth.player.id;callbacks.set(id,{channel,context});
  await tick();
  return state.rpc.request('pushSubscribe',{id,auth:{account:{id:context.auth.account?.id},player:{id},gamePresence:{instanceId:context.auth.gamePresence.instanceId,chatAfterId:context.auth.gamePresence.chatAfterId}},requestUrl:context.request.url,data:context.data,seed:{players:context.data.players.map(p=>push.players.get(p.id)).filter(Boolean),monsters:context.data.monsters.map(m=>push.monsters.get(m.id)).filter(Boolean),world:push.world}});
 };
 const tick=()=>{
  if(job)return job;
  job=(async()=>{
   const upto=serial,positions=channels.db.positions.projection();
   const loop=channels.db.worldLoop,engagements=[...loop.engagements].filter(([,e])=>e.expires_at_ms>=Date.now()),activePlayers=[...loop.activePlayers];
   await Promise.all([...channels.children.values()].filter(s=>s.ready).map(async state=>{
    const info=await connect(state);
    const changes=[...pending].filter(([seq])=>seq>info.seen&&seq<=upto).map(([,v])=>v);
    const combat=channels.db.combat.projectionDelta(info.cursor);
    try{info.health=await state.rpc.request('pushTick',{changes,positions,combat,engagements,activePlayers,pending:[...push.pending.keys()]});info.seen=upto;}
    catch(error){channels.stats.errors++;state.child.kill('SIGTERM');throw error;}
   }));
   const seen=Math.min(...[...states.values()].map(s=>s.seen));for(const [seq,value]of pending)if(seq<=seen){pending.delete(seq);if(keys.get(value.key)===seq)keys.delete(value.key);}
  })().finally(()=>{job=null;});return job;
 };
 push.tick=tick;
 const snapshot=push.snapshot.bind(push);
 push.snapshot=()=>{const base=snapshot(),rows=[...states.values()].map(s=>s.health).filter(Boolean);
  for(const key of ['rooms','packets','bytes','deltasPerSec','bytesPerSec','snapshotRequests','gaps','dropped','errors','internalSnapshots','keepalives','coalesced','ownerRefreshes','fullRefreshes','tickCpuMs','ticks','queuedPackets','attemptedBytes','splitFrames','splitPackets','seedRows','seedCpuMs','slices'])base[key]=rows.reduce((n,r)=>n+(r[key]??0),0);
  for(const key of ['tickMsMax','sliceMsMax','seedMsMax','maxPacketBytes','maxDeltaBytes'])base[key]=Math.max(0,...rows.map(r=>r[key]??0));
  for(const key of ['droppedReasons','sharedReads'])base[key]=Object.fromEntries([...new Set(rows.flatMap(r=>Object.keys(r[key]??{})))].map(k=>[k,rows.reduce((n,r)=>n+(r[key]?.[k]??0),0)]));
  base.largestFields=rows.reduce((a,r)=>r.maxDeltaBytes>a.maxDeltaBytes?r:a,{maxDeltaBytes:0}).largestFields??{};
  base.tickMsMean=base.tickCpuMs/Math.max(1,base.ticks);base.channels=rows.length;return base;};
 return {close(){for(const s of states.values())channels.db.combat.releaseProjectionCursor(s.cursor);callbacks.clear();states.clear();}};
}
