import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

// Exercise the installed recovery scheduler and actor-isolation branches.
// These flags are read once at import; they affect this test process only.
process.env.CORE511_R62_REWARD_RECOVERY='1';
process.env.CORE511_ACTOR_FAULT_ISOLATION='1';
export const schedulerSource=process.env.CORE511_SCHEDULER_UNDER_TEST
 ?pathToFileURL(process.env.CORE511_SCHEDULER_UNDER_TEST)
 :new URL('../../r80-work/core511-source/scripts/core511/shared-world-jobs.mjs',import.meta.url);
const {SharedWorldJobs}=await import(schedulerSource.href);
export const START_MS=1700000000000;

export function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

// Real scheduler, synthetic writer/control ports and a deterministic wall clock.
// This fixture does not open a database, create a game process or measure latency.
export function schedulerFixture(t,options={},Scheduler=SharedWorldJobs){
 let nowMs=START_MS,revision=0,h;
 t.mock.method(Date,'now',()=>nowMs);
 const calls=[],failures=[];
 const record=(name,payload)=>calls.push({at:nowMs-START_MS,name,payload:payload===undefined?undefined:structuredClone(payload)});
 const evaluate=async value=>typeof value==='function'?value(h):value;
 const initialWorld={id:1,cycle:1,reset_at:0,guardian_reward_at:Math.floor(START_MS/1000)+100000,...options.world};
 const kinds=['monsters','participants','bossParticipants'];
 const runtime={
  peer:{channel:0,role:'world',incarnation:'scheduler-test-world'},
  initial:{world:initialWorld,system:{incarnation:'scheduler-test-world',epoch:1}},
  clock:()=>nowMs,lifecycle:{pending:null},projecting:null,
  changed:new Map(),version:0,
  view:{monsters:new Map(),owners:new Map(),engagements:new Map(),engagedByMonster:new Map(),
   setMonster(row){this.monsters.set(row.id,row);},receive(rows){assert.ok(Array.isArray(rows));}},
  rules:{regenClocks:new Map(),config:new Map()},
  sharedCombat:{busy:false,async idle(){record('sharedCombat.idle');}},
  journal:{pending:null,base:new Map(kinds.map(name=>[name,new Map()])),current:new Map(kinds.map(name=>[name,new Map()])),events:[],
   async drain(){record('journal.drain');},hydrate(kind,rows){assert.ok(kinds.includes(kind));assert.ok(Array.isArray(rows));}},
  setWorld(point){record('setWorld');this.worldPoint=point;this.initial.world={...point.world};},
  async project(){record('project');},
  fail(error){failures.push(error);record('fail',{code:error.code??error.message});},
  writer:{epoch:1,
   async drain(){record('writer.drain');},
   async submit(command){
    record('writer.'+command.kind,command);
    if(command.kind==='world_upkeep'){
     if(options.upkeep)await options.upkeep(h,command);
     return {result:{worldPoint:{revision:++revision,world:{...runtime.initial.world}}}};
    }
    assert.equal(command.kind,'world_transition');
    if(options.commit)await options.commit(h,command);
    if(options.refresh!==false){
     const {token,mode}=command.payload;
     const world={...runtime.initial.world};
     if(mode==='reset'){world.cycle++;world.reset_at=0;world.guardian_reward_at=Math.floor(nowMs/1000)+100000;}
     if(mode==='guardian')world.guardian_reward_at=Math.floor(nowMs/1000)+100000;
     const worldPoint={revision:++revision,world};
     if(mode==='reset'){
      const initial={world,worldPoint,system:{incarnation:runtime.peer.incarnation,epoch:runtime.writer.epoch},monsters:[],engagements:[],participants:[],bossParticipants:[],config:{}};
      h.jobs.refresh({token,worldPoint,initial});
     }else h.jobs.refresh({token,worldPoint});
     record('transition.refreshed');
    }
    return {result:{world:{...runtime.initial.world}}};
   },
  },
  async request(method,payload){
   record('request.'+method,payload);
   if(method==='guild_war_due')return {due:Boolean(await evaluate(options.guildDue))};
   if(method==='world_player_jobs'){if(options.playerJobs)await options.playerJobs(h,payload);return {ok:true};}
   if(method==='heartbeat_due')return await evaluate(options.heartbeat)??null;
   if(method==='dungeon_lifecycle_due')return {due:Boolean(await evaluate(options.dungeonDue))};
   if(method==='world_cleanup')return {deferred:Boolean(await evaluate(options.cleanupDeferred))};
   assert.equal(method,'world_transition_prepare');
   assert.equal(h.jobs.blocked,true);
   if(typeof options.prepare==='function')return options.prepare(h,payload);
   if(options.prepare==='skipped'||options.prepare==='aborted')return {...payload,prepared:false,[options.prepare]:true};
   return {...payload,prepared:true};
  },
 };
 const jobs=new Scheduler(runtime);jobs.enabled=true;
 h={jobs,runtime,calls,failures,
  get offset(){return nowMs-START_MS;},
  setOffset(offset){nowMs=START_MS+offset;},
  begin(offset){this.setOffset(offset);jobs.tick(nowMs);return jobs.pending;},
  async tick(offset){const pending=this.begin(offset);if(pending)await pending;},
  async ticks(until,step=50,from=0){for(let offset=from;offset<until;offset+=step)await this.tick(offset);},
  count(name){return calls.filter(row=>row.name===name).length;},
  times(name){return calls.filter(row=>row.name===name).map(row=>row.at);},
  named(name){return calls.filter(row=>row.name===name);},
 };
 return h;
}

export const fastScoped=()=>({scopedRewardR79:true,retryAfterMs:50});
export const heartbeatEntry=()=>({actor:'actor-1',epoch:1,counter:1,cycle:1,nowMs:Date.now(),maintenanceReason:'arena_due',heartbeat:{channel:1,area:'forest',arena_match_id:''}});
