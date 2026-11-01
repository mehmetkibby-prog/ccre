import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const base=new URL('core511-source/scripts/core511/',pathToFileURL((process.env.R85_RUNTIME_TREE??'/workspace/ccre/r86_stability_work/working')+'/'));
const {ResidentState}=await import(new URL('resident-state.mjs',base));
const {FixedLoop,DEFER_INPUT}=await import(new URL('fixed-loop.mjs',base));
const {ResourceLanes}=await import(new URL('resource-lanes.mjs',base));
const {ActorCheckpoints,CHECKPOINT_FIELDS}=await import(new URL('actor-checkpoint.mjs',base));
const {MovementActionMemory}=await import(new URL('movement-action.mjs',base));
const {previewDeathR54,acceptDeathPreviewR54}=await import(new URL('reward-reply-r54.mjs',base));
const {beginDeathMovementR86,deathMovementPermitR86,runDeathMovementR86,stopDeathMovementR86,deathMotionComparisonRowR86,mergeDeathRowR86,mergeDeathBundleR86,rebaseDeathCheckpointR86,rejectDeathMovementR86}=await import(new URL('death-movement-r86.mjs',base));
const {ResidentChannel}=await import(new URL('resident-channel.mjs',base));
process.env.CORE511_R86_DEATH_MOVEMENT='1';
function fixture(){
 let time=Date.now();const state=new ResidentState(1),published=[],packets=[],writes=[],lanes=new ResourceLanes();
 const row={...Object.fromEntries(CHECKPOINT_FIELDS.map(k=>[k,0])),id:'p',account_id:'account',channel:1,cycle:1,area:'forest',instanceId:'',arena_match_id:'',realtime_scope_version:0,role:'muhafiz',x:2700,y:2025,hp:100,max_hp:100,hp_revision:1,position_revision:1,movement_checked_at_ms:time-1000,motion_stream_id:'',last_seen:Math.floor(time/1000),gems:0};
 state.put('players',row);state.claim('p',1);
 const view={player:id=>state.read('players',id),setPlayer:r=>state.put('players',r),engagements:new Map(),setEngagement:(id,e)=>e?view.engagements.set(id,e):view.engagements.delete(id)};
 const checkpoints=new ActorCheckpoints({state,clock:()=>time,submit:async e=>{writes.push(e);return {key:e.key,result:{saved:e.payload.current}};}});checkpoints.hydrate(row);const captured=checkpoints.captureR53('p');
 const memory=new MovementActionMemory({state,view,world:{cycle:1,reset_at:0},fishing:new Map(),epoch:()=>1,settings:()=>({}),retaliate:()=>assert.fail('position-only motion must not settle PvE'),changed:()=>{},recordSecurityEvent:()=>{},wall:()=>time});
 const movement={memory,checkpoints,contextFor:()=>({auth:{account:{id:'account'},player:{id:'p'}},scope:{scopeVersion:0,cycle:1,channel:1,area:'forest',arenaMatchId:''}}),publish:(...a)=>published.push(a)};
 let group;const kernel=new FixedLoop({state,clock:()=>time,wall:()=>time,send:(id,p)=>packets.push(p),rules:{movement:context=>runDeathMovementR86(movement,context,deathMovementPermitR86(kernel,'p'))??DEFER_INPUT,combat:()=>DEFER_INPUT,ai:()=>{},respawn:()=>{},project:({results,lastApplied})=>({results,lastApplied})}});
 kernel.admit('p',1);kernel.stopped=false;const p=kernel.players.get('p');p.lastAccepted=1;kernel.settled(p,{type:'action',sequence:1,status:202});
 let release;const wait=new Promise(resolve=>release=resolve),pending=kernel.durableGroup(['p'],()=>wait,{replyTo:'p',emitReceipt:false,ackResult:()=>({type:'action',status:200})});
 const monster={id:'monster',hp:1,spawn_round:1,area:'forest',channel:1,is_boss:0,is_stone:0},input={action:'attack',ability:0,targetId:monster.id,intentId:'kill-proof',spawnRound:1};
 const preview=previewDeathR54([{target:monster,rolled:2}],()=>monster,{player:{...row,world_cycle:1},payload:input},{reserved_until:time+650},time),lease=lanes.acquire(['player:p','monster:monster'],'test');acceptDeathPreviewR54(preview,lease);
 const loop={lanes,checkpoints,publish:(...args)=>published.push(args)};group=beginDeathMovementR86(loop,{kernel,id:'p',input,ids:['p'],lease,preview,entries:[],joined:true});assert(group,'permit should activate');
 async function move(sequence,x){time+=200;kernel.enqueue('p',{sequence,epoch:1,kind:'movement',payload:{action:'move',x,y:2025,area:'forest',basePositionRevision:state.read('players','p').position_revision}});await kernel.tick();}
 async function finish(){stopDeathMovementR86(group);release({});await pending;await Promise.resolve();}
 return {state,view,kernel,p,memory,movement,checkpoints,captured,group,lease,loop,published,packets,writes,move,finish,get time(){return time;},advance:ms=>time+=ms};
}
test('700ms pending kill permits native position updates without HP/rewards; ACK merge preserves latest position and dirty durable base',async()=>{
 const f=fixture();try{
  await f.move(2,2715);await f.move(3,2730);f.advance(350);
  assert.equal(f.state.read('players','p').x,2730,JSON.stringify({packets:f.packets,metrics:f.kernel.metrics,p:f.p.queue}));assert.equal(f.state.read('players','p').hp,100);assert.equal(f.state.read('players','p').gems,0);assert.equal(f.p.lastApplied,3);assert.equal(f.p.deferred.length,0);assert(f.p.barrier);assert.equal(f.lease.state,'held');assert.equal(f.published.filter(e=>e[3]?.type==='move').length,2);
  stopDeathMovementR86(f.group);f.checkpoints.finishR53(f.captured,{saved:f.captured.payload.current});
  const durable={...f.group.actors[0].row,hp:95,hp_revision:2,gems:7};delete durable.cycle;delete durable.instanceId;const bundle=mergeDeathBundleR86(f.group,{player:durable,world:{cycle:1}});
  assert.equal(bundle.player.x,2730);assert.equal(bundle.player.hp,95);assert.equal(bundle.player.gems,7);f.view.setPlayer(bundle.player);assert(rebaseDeathCheckpointR86(f.group,f.checkpoints,durable));
  assert.equal(f.checkpoints.entries.get('p').base.x,2700);assert.equal(f.checkpoints.entries.get('p').base.hp,95);assert(f.checkpoints.changed('p'));
  await f.finish();await f.checkpoints.flush('p');assert.equal(f.writes[0].payload.base.x,2700);assert.equal(f.writes[0].payload.current.x,2730);assert.equal(f.writes[0].payload.current.hp,95);assert.equal(f.p.lastApplied,3);
 }finally{await f.finish();}
});
test('due PvE, root, HP/scope drift and external control cannot bypass the kill barrier',async()=>{
 for(const mutation of [f=>f.view.engagements.set('p',{next_hit_at_ms:f.time}),f=>f.view.setPlayer({...f.view.player('p'),root_until_ms:f.time+5000}),f=>f.view.setPlayer({...f.view.player('p'),hp:0}),f=>f.view.setPlayer({...f.view.player('p'),realtime_scope_version:1}),f=>f.p.externalHold={}]){
  const f=fixture();try{mutation(f);await f.move(2,2715);assert.equal(f.state.read('players','p').x,2700);assert.equal(f.p.lastApplied,1);assert.equal(f.p.queue.length,1);assert.equal(f.p.deferred.length,0);}finally{await f.finish();}
 }
});
test('guard rejection is not consumed/remapped into the pending attack ACK',async()=>{
 const f=fixture();try{
  const receiver={identities:new Map([['p',{}]]),kernel:f.kernel,ports:{guard:()=>({status:403,body:{code:'bot_check_required'}})}};
  const answer=ResidentChannel.prototype.action.call(receiver,{id:'p',input:{action:'move'},now:f.time});assert.equal(answer,DEFER_INPUT);assert.equal(f.p.lastApplied,1);assert.equal(f.p.deferred.length,0);
 }finally{await f.finish();}
});
test('authoritative relocation/death is never overwritten by buffered motion; permit closes on rejection',async()=>{
 for(const change of [{x:4000,position_revision:20},{hp:0,hp_revision:2},{realtime_scope_version:2,area:'bazaar'}]){
  const f=fixture();try{await f.move(2,2715);stopDeathMovementR86(f.group);const saved={...f.group.actors[0].row,...change},bundle=mergeDeathBundleR86(f.group,{player:saved,world:{cycle:1}});assert.deepEqual(bundle.player,saved);assert.equal(deathMovementPermitR86(f.kernel,'p'),null);rejectDeathMovementR86(f.group,f.time);rejectDeathMovementR86(f.group,f.time);assert.equal(f.published.filter(e=>e[3]?.type==='monster_reject').length,1);}finally{await f.finish();}
 }
});

test('section comparison uses only immutable captured motion; installation preserves raw SQL receipt and actual durable base',async()=>{
 const f=fixture();try{
  await f.move(2,2715);const latest=f.view.player('p'),captured=f.group.actors[0].row;
  assert.throws(()=>deathMotionComparisonRowR86(f.group,'p',latest),/death_motion_refresh_phase/);
  stopDeathMovementR86(f.group);
  const comparison=deathMotionComparisonRowR86(f.group,'p',latest);assert.equal(comparison.x,2700);assert.equal(latest.x,2715);assert.equal(f.view.player('p'),latest);assert.equal(comparison.position_revision,captured.position_revision);
  const raw={...captured,hp:97,hp_revision:2,gems:4};delete raw.cycle;delete raw.instanceId;const rawBefore=structuredClone(raw);
  const installed=mergeDeathRowR86(f.group,raw,{cycle:1});assert.deepEqual(raw,rawBefore);assert.equal(installed.x,2715);assert.equal(installed.hp,97);assert.equal(installed.gems,4);assert.equal(f.group.savedRows.get('p'),raw);assert.equal(f.view.player('p'),latest);
  f.checkpoints.finishR53(f.captured,{saved:f.captured.payload.current});f.view.setPlayer(installed);assert(rebaseDeathCheckpointR86(f.group,f.checkpoints,raw));assert.equal(f.checkpoints.entries.get('p').base.x,2700);assert.equal(f.checkpoints.entries.get('p').base.hp,97);assert(f.checkpoints.changed('p'));
 }finally{await f.finish();}
});
test('section comparison cannot certify foreign rows, nonmotion drift or changed owner fences',async()=>{
 const f=fixture();try{
  await f.move(2,2715);stopDeathMovementR86(f.group);const latest=f.view.player('p');
  assert.equal(deathMotionComparisonRowR86(f.group,'p',{...latest}),null);
  f.view.setPlayer({...latest,hp:99});assert.equal(deathMotionComparisonRowR86(f.group,'p',f.view.player('p')),null);
  f.view.setPlayer(latest);const barrier=f.p.barrier;f.p.barrier={};assert.throws(()=>deathMotionComparisonRowR86(f.group,'p',latest),/death_motion_refresh_fenced/);f.p.barrier=barrier;
  const unrelated={id:'other',x:1};assert.equal(deathMotionComparisonRowR86(f.group,'other',unrelated),unrelated);
 }finally{await f.finish();}
});

test('queued motion uses the native receive-time PvE deadline; processing delay cannot turn an earlier move into a due hit',async()=>{
 for(const offset of [199,200,201]){
  const f=fixture();try{
   const due=f.time+200;f.view.engagements.set('p',{player_id:'p',next_hit_at_ms:due});const engagement=f.view.engagements.get('p');
   f.advance(offset);const received=f.time;f.kernel.enqueue('p',{sequence:2,epoch:1,kind:'movement',payload:{action:'move',x:2715,y:2025,area:'forest',basePositionRevision:1}});
   f.advance(500);assert(f.time>due);await f.kernel.tick();
   assert.equal(f.view.player('p').x,offset<200?2715:2700);assert.equal(f.p.lastApplied,offset<200?2:1);assert.equal(f.p.queue.length,offset<200?0:1);
   assert.equal(f.view.player('p').hp,100);assert.equal(f.view.player('p').gems,0);assert.equal(f.view.engagements.get('p'),engagement);assert(f.p.barrier);assert.equal(f.p.deferred.length,0);
   if(offset<200){const event=f.published.find(e=>e[3]?.type==='move');assert.equal(event[3].serverAt,received);assert.equal(f.kernel.metrics.deathMovementR86.moves,1);}else assert.equal(f.kernel.metrics.deathMovementR86.blockedState,1);
  }finally{await f.finish();}
 }
});
