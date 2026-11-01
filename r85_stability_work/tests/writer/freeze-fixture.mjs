import assert from 'node:assert/strict';
import {ActorIsolation} from '../../working/core511-source/scripts/core511/actor-isolation.mjs';
import {ResourceLanes} from '../../working/core511-source/scripts/core511/resource-lanes.mjs';
import {rejectActorJob} from '../../working/core511-source/scripts/core511/actor-rejection.mjs';
import {actorIsolations} from '../../working/core511-source/scripts/core511/actor-isolation-proof.mjs';
import {controlIsolationFor} from '../../working/core511-source/scripts/core511/actor-isolation-proof.mjs';
const source=process.env.R85_TEST_BASELINE==='1'?'../../working/core511-source/scripts/core511/':'../../working/core511-source/scripts/core511/';
const {ResidentControl}=await import(source+'resident-control.mjs');
const {StreamControl}=await import(source+'reliable-stream.mjs');
const {controlFreezeFailureForR85}=process.env.R85_TEST_BASELINE==='1'?{controlFreezeFailureForR85:()=>null}:await import('../../working/core511-source/scripts/core511/freeze-failure-r85.mjs');
const {unprovenFreezeR85}=process.env.R85_TEST_BASELINE==='1'?{unprovenFreezeR85:()=>false}:await import('../../working/core511-source/scripts/core511/freeze-outcomes-r85.mjs');

export function gate(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
export async function turns(n=20){for(let i=0;i<n;i++)await Promise.resolve();}

// Uses the exact production parent coordinator, actor-isolation proof consumer,
// resident freeze/refresh/resume implementation, and resource leases. Only the
// database identity lookups and checkpoint/fsync completion are controlled ports.
export function fixture(PermanentCoordinator,{kinds=['stopped','stopped','healthy'],channels=[1,2,3],Isolation=ActorIsolation,wire=false}={}){
 const ids=kinds.map((_,index)=>'actor-'+(index+1)),events=[],faults=[],gates=new Map(),controls=new Map(),owners=new Map(),admissions=new Map(),players=new Map(),isolated=[];
 for(const [index,id]of ids.entries()){
  const channel=channels[index],incarnation='boot-'+channel;
  owners.set(id,{player_id:id,epoch:1,sequence:0,state:'active',channel,incarnation});admissions.set(id,{player_id:id,epoch:1,channel,session_id:'session-'+id});
  players.set(id,{id,epoch:1,suspended:false,externalHold:null});gates.set(id,gate());
 }
 const authority={owner:id=>owners.get(id),admission:id=>admissions.get(id),simulation:()=>null};
 for(const channel of new Set(channels)){
  const peer={channel,incarnation:'boot-'+channel,realm:'r85-fixture'},local=ids.filter(id=>owners.get(id).channel===channel),lanes=new ResourceLanes(),quarantines=new Map();
  for(const id of local){
   const kind=kinds[ids.indexOf(id)];
   if(kind==='stopped'){
    const error=rejectActorJob(Object.assign(Error('checkpoint_snapshot_conflict'),{code:'checkpoint_snapshot_conflict'}),peer,{playerId:id,epoch:1,sequence:1,operationId:'checkpoint-'+id,operation:'actor_checkpoint',payload:{}});
    const proof={actor:id,epoch:1,token:'quarantine-'+id,stopped:true,finalSequence:0};
    quarantines.set(id,{id,epoch:1,error,ready:gates.get(id).promise.then(()=>{events.push('stopped:'+id);return proof;})});
    players.get(id).suspended=true;
   }
  }
  const kernel={players:new Map(local.map(id=>[id,players.get(id)])),quiesce:async(id,epoch)=>{
   assert.equal(epoch,1);players.get(id).suspended=true;events.push('quiesced:'+id);
   if(kinds[ids.indexOf(id)]==='pending'){
    await gates.get(id).promise;
    core.actorIsolation.unknownActors.set(id,new Set([{operationId:'unknown-'+id,owners:[{id,owner:{...owners.get(id)}}]}]));
    events.push('pending:'+id);throw Object.assign(Error('actor_command_pending'),{code:'actor_command_pending'});
   }
   return {id,epoch};
  },quiesceGroup:async requests=>Promise.all(requests.map(r=>kernel.quiesce(r.id,r.epoch))),resume(id,epoch){assert.equal(epoch,1);players.get(id).suspended=false;events.push('resumed:'+id);}};
  const control=new ResidentControl({kernel,peer,lanes,writer:{finalSequence:()=>0},frames:{invalidate:id=>events.push('invalidated:'+id),hydrate:()=>{}},
   checkpoints:{drain:async id=>{await gates.get(id).promise;if(kinds[ids.indexOf(id)]==='unknown')throw Object.assign(Error('ipc_control_outcome_unknown'),{code:'ipc_control_outcome_unknown'});events.push('checkpoint:'+id);},hydrate:()=>{}},combatCheckpoints:{drain:async()=>{}},
   unknownActor:id=>kinds[ids.indexOf(id)]==='pending',quarantined:id=>quarantines.get(id),readBundle:async id=>({player:{id,channel},engagement:null}),applyBundle:bundle=>events.push('hydrated:'+bundle.player.id),onFault:error=>{faults.push({where:'resident',code:error.code});events.push('resident-fault:'+error.code);}
  });
  const row={control,peer,lanes};controls.set(channel,row);
  const dispatch=(method,payload)=>{if(method==='freeze')return row.control.freeze(payload);if(method==='freeze_group')return row.control.freezeGroup(payload.requests);if(method==='refresh_frozen')return row.control.refresh(payload);if(method==='resume')return row.control.resume(payload);throw Error('Unexpected control '+method);};
  if(wire){
   // Use the production parent control receiver and stopped-proof wire codec.
   // JSON round-tripping prevents a local WeakMap brand from accidentally
   // making a passing fixture conceal missing authenticated transport facts.
   const stream=new StreamControl();row.stream=stream;
   stream.attach(frame=>void Promise.resolve().then(()=>dispatch(frame.method,frame.payload)).then(value=>({type:'control_result',id:frame.id,ok:true,value}),error=>{
    const unproven=unprovenFreezeR85(error),isolation=unproven?null:controlIsolationFor(error,frame.method,frame.payload),failure=unproven?null:controlFreezeFailureForR85(error,frame.method,frame.payload);
    return {type:'control_result',id:frame.id,ok:false,code:error.code,...(isolation?{actorIsolation:isolation}:{}),...(failure?{freezeFailureR85:failure}:{})};
   }).then(reply=>stream.receive(JSON.parse(JSON.stringify(reply)))));
   row.request=(method,payload)=>stream.request(method,payload);
   row.endpoint={freeze:p=>row.request('freeze',p),freezeGroup:requests=>row.request('freeze_group',{requests}),refresh:p=>row.request('refresh_frozen',p),resume:p=>row.request('resume',p)};
  }else row.request=dispatch;
 }
 const core={realmId:'r85-fixture',clock:()=>1000000,authority,sessions:new Map(),transitions:new Map(),transferGroups:new Set(),presence:{revoke:()=>{}},processes:new Map([...controls].map(([channel,value])=>[channel,{peer:value.peer,online:true}])),
  process(peer){const row=controls.get(peer.channel);assert.equal(row.peer.incarnation,peer.incarnation);return {peer:row.peer,control:{request:row.request}};},
  // This inherited proof-composition fixture stops at the pending outcome;
  // it has no native writer barrier to settle. Keep its explicit endpoint
  // ports at that scope. Real cancellation/next-input coverage runs with OS
  // children and SQLite in native-recovery-r85.test.mjs.
  endpoint:(channel,incarnation)=>{const row=controls.get(channel);assert.equal(row.peer.incarnation,incarnation);return row.endpoint??{freeze:r=>row.control.freeze(r),freezeGroup:r=>row.control.freezeGroup(r),refresh:r=>row.control.refresh(r),resume:r=>row.control.resume(r)};},
  onFault:issue=>{faults.push({where:'coordinator',actor:issue.actor,code:issue.error.code});events.push('coordinator-fault:'+issue.actor);},
  database:{sqlite:{prepare(sql){assert.match(sql,/SELECT player_id FROM party_members/);return {all:()=>ids.map(player_id=>({player_id}))};}}}
 };
 const isolation=new Isolation(core);core.actorIsolation=isolation;
 isolation.queue=row=>{isolated.push(row.actor);events.push('isolate:'+row.actor);};
 const permanent=new PermanentCoordinator({authority,endpointFor:core.endpoint,durable:async()=>events.push('durable'),onFault:(row,error)=>core.onFault({actor:row.id,error}),recoverRejectedFreeze:(held,error)=>isolation.rejectFreeze(held,error),availabilityCheck:requested=>isolation.assertAvailable(requested),knownPendingFreeze:(held,error)=>isolation.pendingFreeze?.(held,error)===true});core.permanent=permanent;
 const release=id=>gates.get(id).resolve();
 const outcome=error=>({code:error?.code,proofs:actorIsolations(error).map(row=>row.actor),isolated:[...isolated],entries:[...permanent.entries].map(([id,row])=>({id,phase:row.phase})),transitions:[...core.transitions].map(([id,row])=>({id,phase:row.phase})),players:[...players].map(([id,row])=>({id,suspended:row.suspended})),events,faults});
 return {core,permanent,isolation,ids,events,faults,gates,controls,owners,players,isolated,release,outcome};
}
