import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const base=new URL('core511-source/scripts/core511/',pathToFileURL((process.env.R85_RUNTIME_TREE??'/workspace/ccre/r86_stability_work/working')+'/'));
process.env.CORE511_R57_COMMIT_SECTIONS='1';
const {refreshActorSectionsR52,actorSectionMetricsR52}=await import(new URL('actor-section-reuse-r52.mjs',base));
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

function sections(f){
 const owner=f.state.owners.get('p');Object.assign(owner,{channel:1,incarnation:'test-channel'});
 const before=f.group.actors[0].row,raw={...before,hp:95,hp_revision:2,gems:7};delete raw.cycle;delete raw.instanceId;
 const projected={id:'p',x:before.x,y:before.y,hp:before.hp,gems:0};
 const sub={ownerRow:projected,data:{area:'forest',channel:1,players:[projected]},revision:1,cache:{},privateOwnerCache:{}};
 const runtime={clock:()=>f.time,channel:{world:{cycle:1},owners:f.state.owners,view:f.view,kernel:f.kernel,state:f.state,lanes:f.loop.lanes,frames:{entries:new Map([['p',{valid:true}]])},presence:{merge:r=>r},setMonster:()=>assert.fail('unexpected monster')},world:{subscribers:new Map([['p',sub]])},dungeon:{locked:()=>false},slimReload:{forget:()=>{}}};
 const proofOwner={channel:1,incarnation:'test-channel',epoch:1};
 const result={players:[raw],engagement:null,sharedRefresh:{version:1,all:false,tables:['players'],actors:['p']},actorSectionsR52:{version:1,cycle:1,actor:'p',readSections:true,readDrops:false,actors:[{id:'p',owner:proofOwner,engagementRef:{kind:'ack-attack'}}]},actorCommitSectionsR57:{version:1,complete:true,cycle:1,readAtMs:f.time,actors:[{id:'p',owner:{...proofOwner},player:{...raw},engagement:null}]}};
 return {runtime,result,raw,sub,context:{deathMotionR86:f.group}};
}
test('certified commit sections preserve newer native motion with no full read and keep the exact SQL durable base',async()=>{
 const f=fixture();try{
  await f.move(2,2715);await f.move(3,2730);stopDeathMovementR86(f.group);
  f.checkpoints.finishR53(f.captured,{saved:f.captured.payload.current});
  const s=sections(f),receipt=JSON.stringify(s.result),applied=actorSectionMetricsR52.commitAppliedR57??0;
  assert.equal(refreshActorSectionsR52(s.runtime,s.result,()=>assert.fail('certified commit needs no reader'),s.context),true);
  assert.equal(actorSectionMetricsR52.commitAppliedR57,applied+1);assert.equal(JSON.stringify(s.result),receipt,'raw receipt/proof must not be overlaid');
  assert.equal(f.view.player('p').x,2730);assert.equal(f.view.player('p').hp,95);assert.equal(f.view.player('p').gems,7);
  assert.equal(s.sub.cache,null);assert.equal(s.sub.privateOwnerCache,null);assert.equal(s.sub.ownerRow.gems,7);
  assert(rebaseDeathCheckpointR86(f.group,f.checkpoints,s.raw));assert.equal(f.checkpoints.entries.get('p').base.x,2700);assert(f.checkpoints.changed('p'));
  await f.finish();await f.checkpoints.flush('p');assert.equal(f.writes[0].payload.base.x,2700);assert.equal(f.writes[0].payload.current.x,2730);
 }finally{await f.finish();}
});
test('motion comparison cannot excuse a tampered committed section, ACK position, or changed resident economy',async()=>{
 for(const mutate of [s=>s.result.actorCommitSectionsR57.actors[0].player.x++,s=>s.result.players[0].x++,s=>s.runtime.channel.view.setPlayer({...s.runtime.channel.view.player('p'),gems:999})]){
  const f=fixture();try{
   await f.move(2,2715);stopDeathMovementR86(f.group);const s=sections(f);mutate(s);const prior=f.view.player('p');
   assert.equal(refreshActorSectionsR52(s.runtime,s.result,undefined,s.context),false);assert.equal(f.view.player('p'),prior);assert.equal(s.sub.revision,1);assert.equal(f.group.savedRows.size,0);
  }finally{await f.finish();}
 }
});
test('authoritative section-reader fallback retains current-state and barrier fences with motion context',async()=>{
 const f=fixture();try{
  await f.move(2,2715);stopDeathMovementR86(f.group);const s=sections(f),snapshot=s.result.actorCommitSectionsR57;delete s.result.actorCommitSectionsR57;
  let reads=0;assert.equal(await refreshActorSectionsR52(s.runtime,s.result,async()=>{reads++;return snapshot;},s.context),true);assert.equal(reads,1);assert.equal(f.view.player('p').x,2715);assert.equal(f.view.player('p').gems,7);
 }finally{await f.finish();}
});
