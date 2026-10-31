// Actual production classes and source-exact helper exports. The full native
// attack writer import is unavailable in this snapshot; no writer rule is
// replaced. Its two pure helper exports are extracted byte-for-byte instead.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ResidentState} from '../r82-work/core511-source/scripts/core511/resident-state.mjs';
import {ResourceLanes} from '../r82-work/core511-source/scripts/core511/resource-lanes.mjs';
import {FixedLoop} from '../r82-work/core511-source/scripts/core511/fixed-loop.mjs';

export const base=new URL('../r82-work/core511-source/scripts/core511/',import.meta.url);
export const source=name=>fs.readFileSync(new URL(name,base),'utf8');
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const turn=()=>new Promise(resolve=>setImmediate(resolve));
export function gate(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});promise.catch(()=>{});return {promise,resolve,reject};}
export async function until(test){for(let n=0;n<100;n++){if(test())return;await turn();}assert.fail('fixture did not reach expected state');}
const data=value=>'data:text/javascript;base64,'+Buffer.from(value).toString('base64');
const absolute=value=>value.replace(/from '(\.[^']+)'/g,(_,p)=>`from '${new URL(p,base).href}'`);
const rest=source('heartbeat-writer.mjs').match(/^export const heartbeatRestFrame=.*;$/m)?.[0];
assert(rest);
const restModule=data(`import {REST_INPUT_FIELDS} from '${new URL('generated/rest-regeneration-rules.mjs',base).href}';\n${rest}\n`);
const attack=source('attack-writer.mjs');
const random=attack.slice(attack.indexOf('export function attackRandom(seed){'),attack.indexOf('export function readAttackFrame('));
assert(random.startsWith('export function attackRandom(seed){')&&random.endsWith('}\n'));
const randomModule=data(`import {createHmac} from 'node:crypto';\nimport {OperationRandom} from '${new URL('operation-random.mjs',base).href}';\n${random}`);
export const replacements={
 'heartbeat-loop.mjs':[
  'c.lanes.release(lease);await this.maintenance(id,now,counter);return ack;',
  'c.lanes.release(lease);void this.maintenance(id,now,counter);return ack;'
 ],
 'shared-combat-channel.mjs':[
  'after:()=>loop.maintenance(id,now,counter)',
  'after:()=>{void loop.maintenance(id,now,counter);}'
 ]
};
export function patched(name){const before=source(name),[old,next]=replacements[name];assert.equal(before.split(old).length,2);return before.replace(old,next);}
export async function load(name,fixed=false){
 let body=fixed?patched(name):source(name);
 body=body.replace("from './heartbeat-writer.mjs'",`from '${restModule}'`);
 if(name==='shared-combat-channel.mjs')body=body.replace("from './attack-writer.mjs'",`from '${randomModule}'`);
 return import(data(absolute(body)));
}

export async function fixture({fixed=false,writerGate=null,refreshGate=null,scheduleGate=gate(),scheduleError=null,shared=false,sharedDurable=true}={}){
 const {HeartbeatLoop}=await load('heartbeat-loop.mjs',fixed);
 const id='a',now=100000,events=[],scheduleRequests=[],fatals=[],nativeRequests=[],state=new ResidentState(1),lanes=new ResourceLanes();
 const player={id,account_id:'account-a',channel:1,area:'forest',arena_match_id:'',cycle:1,instanceId:'',x:100,y:100,hp:100,max_hp:100,hp_revision:1,respawn_at_ms:0,last_seen:100,last_regen_at:0,last_movement_at_ms:0,last_monster_hit_at:0,attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0};
 state.put('players',player);state.claim(id,1);
 const view={player:actor=>state.read('players',actor),monster:()=>null,monsters:new Map(),nearby:()=>[],setPlayer:row=>state.put('players',row),engagements:new Map(),setEngagement:(actor,row)=>view.engagements.set(actor,row)};
 let gearDue=true;
 const c={peer:{channel:1,incarnation:'fixture'},state,view,lanes,world:{cycle:1},owners:new Map([[id,{epoch:1,channel:1,incarnation:'fixture'}]]),globals:{},settings:{rest_regen_percent:1,rest_regen_combat_delay_seconds:5,rest_regen_still_seconds:2},
  frames:{entry:()=>({heartbeatState:{gearDue,queue:null}}),frame:actor=>view.player(actor),retaliation:()=>({})},retaliationMemory:{due:()=>[],arm:()=>{}},
  checkpoints:{drain:async()=>events.push('actor-drain'),hydrateCommitted:()=>events.push('actor-hydrate'),hydrate:()=>events.push('actor-hydrate')},
  combatCheckpoints:{drain:async()=>events.push('combat-drain')},encounters:{hydrateCommitted:()=>events.push('encounter-hydrate')},
  writer:{submit:async command=>{nativeRequests.push(command);events.push('native-start');if(writerGate)await writerGate.promise;events.push('native-ack');return {key:command.key,result:{player:view.player(id),events:[],engagement:null,result:{status:200,body:{ok:true,hp:100,hpRevision:1}}}};}},
  applyCommit:async()=>{events.push('refresh-start');if(refreshGate)await refreshGate.promise;events.push('refresh-end');gearDue=false;},
  ports:{publish:()=>events.push('publish')}
 };
 let loop;
 const rules={combat:ctx=>loop.act(ctx),movement:()=>{events.push('move');state.patch('players',id,{x:view.player(id).x+1});return {status:200,body:{moved:true}};},ai:()=>{},respawn:()=>{},project:ctx=>ctx.results.length?{results:ctx.results}:null};
 const sent=[];c.kernel=new FixedLoop({state,rules,wall:()=>now,send:(_,packet)=>sent.push(packet),onFatal:error=>fatals.push(error)});c.kernel.admit(id,1);c.kernel.stopped=false;
 loop=new HeartbeatLoop(c,{schedule:async request=>{events.push('schedule-start');scheduleRequests.push(request);await scheduleGate.promise;if(scheduleError)throw scheduleError;events.push('schedule-end');return {queued:true};},onFatal:error=>{fatals.push(error);c.kernel.fail(error);}});
 if(shared){
  const {SharedCombatChannel}=await load('shared-combat-channel.mjs',fixed);
  const runtime={channel:c,request:async(method)=>{events.push(method);if(method==='shared_acquire')return {proof:'trusted-fixture',snapshot:{cycle:1,monsters:[]}};if(method==='shared_prepare')return {prepared:true,players:[]};return {ok:true};},fail:error=>c.kernel.fail(error)};
  const bridge=new SharedCombatChannel(runtime);c.sharedCombat=bridge;
  bridge.hasShared=()=>true;
  if(!sharedDurable){
   // Initial plan takes the shared path; the actual second plan can become
   // nonterminal once the shared authority is held, as allowed by read().
   const original=loop.memory.plan.bind(loop.memory);let count=0;
   loop.memory.plan=(...args)=>{if(++count===2)gearDue=false;return original(...args);};
  }
 }
 const actor=c.kernel.players.get(id);
 function enqueue(action){c.kernel.enqueue(id,{sequence:actor.lastAccepted+1,epoch:1,kind:action==='move'?'movement':'combat',payload:{action}});}
 async function tick(){return c.kernel.tick();}
 const start=async()=>{enqueue('heartbeat');enqueue('move');await tick();return {barrier:actor.barrier};};
 return {id,now,c,loop,actor,state,events,sent,scheduleRequests,scheduleGate,fatals,nativeRequests,start,tick,enqueue,setGearDue:value=>gearDue=value};
}

export function writeDrafts(){
 const folder=new URL('../r83-investigation/server/',import.meta.url);
 const files=[];
 for(const name of Object.keys(replacements)){
  const before=source(name),after=patched(name);fs.writeFileSync(new URL(name,folder),after);
  files.push({path:name,beforeSha256:hash(before),afterSha256:hash(after),beforeBytes:Buffer.byteLength(before),afterBytes:Buffer.byteLength(after),old:replacements[name][0],replacement:replacements[name][1]});
 }
 return {files,pureImportExports:{heartbeatRestFrame:hash(rest),attackRandom:hash(random)},method:'full source-exact HeartbeatLoop and SharedCombatChannel classes; only two actual pure helper exports isolated to avoid unavailable transitive native writer modules; real FixedLoop, ResourceLanes, ResidentState, HeartbeatMemory; controlled IPC/native writer and refresh ports'};
}
