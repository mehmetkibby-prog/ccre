import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {native,temporary,player} from './helpers.mjs';
import {ChannelOwnership,OrderedWriterClient,registerOwnedRule} from '../ownership.mjs';
import {actorRejection,rejectActorJob,receiveActorRejection} from '../actor-rejection.mjs';
import {FixedLoop} from '../fixed-loop.mjs';
import {ResidentState} from '../resident-state.mjs';
import {ResourceLanes} from '../resource-lanes.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
const peer={channel:4,incarnation:'actor-rejection-test'};
const request={playerId:'p',epoch:1,sequence:1,operationId:'job-1',operation:'reward',payload:{}};
const error=()=>Object.assign(Error('shared_terminal_actor_fenced'),{code:'shared_terminal_actor_fenced'});

test('pre-execution denial cancels only the job; next write keeps sequence and durability',async t=>{
 const db=new LocalDatabase(path.join(temporary(t),'test.sqlite'),{create:true,groupWrites:true,asyncDurable:true});t.after(()=>db.close());
 const authority=new ChannelOwnership(db,{realmId:'test'});await authority.initialize();await authority.registerProcess(4,peer.incarnation);
 const owner=await authority.admit('p',peer,{sessionId:'session',guard:()=>true});let executions=0,unknown=0;
 registerOwnedRule(authority,'reward',()=>({amount:++executions}));
 const client=new OrderedWriterClient({peer,owner:()=>owner,request:(p,r)=>authority.command(p,r),onUnknown:()=>unknown++});client.seed('p',1,0);
 authority.commandGuard=()=>{throw error();};
 await assert.rejects(client.submit({actor:'p',key:'denied',kind:'reward',payload:{}}),e=>actorRejection(e)?.actor==='p');
 assert.equal(unknown,0);assert.equal(executions,0);assert.equal(client.finalSequence('p'),0);assert.equal(authority.owner('p').sequence,0);
 authority.commandGuard=()=>true;const ack=await client.submit({actor:'p',key:'accepted',kind:'reward',payload:{}});
 assert.equal(ack.result.amount,1);assert.equal(client.finalSequence('p'),1);assert.equal(authority.owner('p').sequence,1);
 // A previously committed/replayed sequence can never be reported unexecuted.
 authority.commandGuard=()=>{throw error();};await assert.rejects(authority.command(peer,{...request,operationId:'accepted'}),e=>!actorRejection(e));
 await authority.disconnectProcess(4,peer.incarnation);await assert.rejects(authority.command(peer,{...request,sequence:2}),e=>e.code==='channel_process_fenced'&&!actorRejection(e));
});

test('typed denial settles its input, releases only its resource lease, and leaves other actors running',async()=>{
 const state=new ResidentState(4),lanes=new ResourceLanes(),sent=[],fatal=[];for(const id of ['p','q']){state.put('players',player(id,4));state.claim(id,1);}
 const rejected=rejectActorJob(error(),peer,request),lease=lanes.acquire(['player:p'],'test');
 const kernel=new FixedLoop({state,onFatal:e=>fatal.push(e),send:(id,packet)=>sent.push({id,packet}),rules:{movement:()=>({status:200}),combat:({id,kernel})=>{kernel.durableGroup([id],async()=>{lanes.reject(lease,rejected);throw rejected;},{replyTo:id,emitReceipt:false});return {};},ai:()=>{},respawn:()=>{},project:({results})=>({results})}});
 for(const id of ['p','q'])kernel.admit(id,1);kernel.stopped=false;kernel.enqueue('p',{epoch:1,sequence:1,kind:'combat'});kernel.tick();await assert.rejects(kernel.players.get('p').barrier);kernel.enqueue('q',{epoch:1,sequence:1,kind:'movement'});kernel.tick();
 assert.equal(fatal.length,0);assert.equal(kernel.failure,null);assert.equal(state.owners.get('p').pending,0);assert.equal(lanes.busy(['player:p']),false);assert(sent.some(v=>v.id==='p'&&v.packet.results.some(r=>r.sequence===1&&r.status===409)));assert.equal(kernel.players.get('q').lastApplied,1);
 const unknown=lanes.acquire(['player:p'],'unknown');lanes.reject(unknown,error());assert.equal(unknown.state,'unknown');
});

test('IPC rejection must match the pending actor, epoch, operation and sequence; text codes never suffice',()=>{
 const trusted=rejectActorJob(error(),peer,request),wire=actorRejection(trusted);
 assert.equal(actorRejection(error()),null);assert(receiveActorRejection(error(),wire,'command',request));
 for(const patch of [{playerId:'q'},{epoch:2},{sequence:2},{operationId:'other'},{operation:'purchase'},{payload:{sharedLease:'forged'}}])assert.throws(()=>receiveActorRejection(error(),wire,'command',{...request,...patch}),/invalid_actor_rejection/);
 assert.equal(actorRejection(rejectActorJob(error(),peer,{...request,payload:{sharedLease:'terminal'}})),null);
});

test('accepted stale-epoch input is answered without running a rule or stopping its neighbours',()=>{
 const state=new ResidentState(4),packets=[];for(const id of ['p','q']){state.put('players',player(id,4));state.claim(id,1);}
 const kernel=new FixedLoop({state,send:(id,packet)=>packets.push({id,packet}),rules:{movement:({id})=>{assert.equal(id,'q');return {status:200};},combat:()=>assert.fail('stale rule executed'),ai:()=>{},respawn:()=>{},project:({results})=>({results})}});
 for(const id of ['p','q'])kernel.admit(id,1);kernel.stopped=false;kernel.enqueue('p',{epoch:1,sequence:1,kind:'combat'});state.freeze('p',1);state.release('p',1);kernel.enqueue('q',{epoch:1,sequence:1,kind:'movement'});kernel.tick();assert.equal(kernel.failure,null);assert.equal(kernel.players.get('q').lastApplied,1);assert(packets.some(p=>p.id==='p'&&p.packet.results.some(r=>r.sequence===1&&r.status===409)));
});
