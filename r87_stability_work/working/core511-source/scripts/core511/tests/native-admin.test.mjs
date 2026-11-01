import test from 'node:test';
import assert from 'node:assert/strict';
import {adminHandlers,adminRequest,nativeAdminSource,patchedAdminSource} from './native-admin-fixture.mjs';
import {patchNativeAdmin} from '../patch-native-admin.mjs';
import {AdminDiagnostics,adminLoad511} from '../admin-diagnostics.mjs';
import {createAdminProfileResponder507} from '../generated/profiler-rules.mjs';
import {native} from './helpers.mjs';
import {KernelDiagnostics} from '../diagnostics.mjs';

test('native authorized profiler route must reach the current CORE511 independent world owner',async()=>{
 let seen;const api=adminHandlers({database:{core511Admin:{profile:async input=>{seen=input;return Response.json({state:'recording',target:input.target});}}}});
 const response=await api.post(adminRequest({method:'POST',body:{action:'cpu_profile507',target:'world'}}));assert.equal(response.status,200,await response.text());assert.deepEqual(structuredClone(seen),{operation:'start',target:'world'});
});

test('native admin patch changes only three diagnostic calls and retains the exact native response factory',async()=>{
 const {source,proof}=patchNativeAdmin(nativeAdminSource);assert.equal(proof.edits.length,3);let reverted=source;for(const edit of proof.edits){assert.equal(reverted.split(edit.replacement).length,2);reverted=reverted.replace(edit.replacement,edit.original);}assert.equal(reverted,nativeAdminSource);
 assert.throws(()=>patchNativeAdmin(source),/native_admin_routes_changed/);assert.throws(()=>patchNativeAdmin(nativeAdminSource.replace('if (!await requireAdmin())','if (false)')),/native_admin_guard_changed/);
 const original=await native('vds-server/src/cpu-profile507.mjs');assert.equal(createAdminProfileResponder507(()=>{}).toString(),original.adminCpuProfile507.toString());
});

test('native admin identity authorization precedes every diagnostics call and retains realm email policy',async()=>{
 let calls=0;const database={core511Admin:{profile:async()=>{calls++;return Response.json({});},load:async()=>{calls++;return Response.json({});}}};
 const candidates=[{user:null,expected:false},{user:{id:'other',email:'admin@fixture.invalid'},expected:false},{user:{id:'admin-fixture',email:'any@fixture.invalid'},realm:{},expected:true},{user:{id:'other',email:' ADMIN@fixture.invalid '},adminUserId:'',adminEmail:'Admin@fixture.invalid',expected:true},{user:{id:'other',email:'admin@fixture.invalid'},adminUserId:'',adminEmail:'Admin@fixture.invalid',realm:{},expected:false}];
 for(const options of candidates){const old=adminHandlers({...options,source:nativeAdminSource}),current=adminHandlers({...options,database});assert.equal(await old.requireAdmin(),options.expected);assert.equal(await current.requireAdmin(),options.expected);
  if(options.expected)continue;for(const [method,request]of [['get',()=>adminRequest({query:'?cpu_profile507=status'})],['get',()=>adminRequest({query:'?load=1'})],['post',()=>adminRequest({method:'POST',body:{action:'cpu_profile507',target:'world'},headers:{'x-col-lab-proof':'cannot-grant-admin'}})]]){assert.equal((await current[method](request())).status,403);assert.equal(current.reads,0);}
 }assert.equal(calls,0);
});

test('native same-Origin, JSON and actual body-size failures stay identical before profile access',async()=>{
 const invalid=[{origin:'https://evil.invalid'},{origin:null},{headers:{'Content-Type':'text/plain'}},{body:'{'},{body:[]},{headers:{'Content-Length':'16385'}},{body:{action:'cpu_profile507',target:'world',extra:'a'.repeat(16384)}}];
 for(const change of invalid){let calls=0;const old=adminHandlers({source:nativeAdminSource}),current=adminHandlers({database:{core511Admin:{profile:()=>{calls++;throw Error('must not reach profile');}}}}),make=()=>adminRequest({method:'POST',body:{action:'cpu_profile507',target:'world'},...change}),expected=await old.post(make()),actual=await current.post(make());assert.equal(actual.status,expected.status);assert(actual.status>=400);assert.deepEqual(await actual.json(),await expected.json());assert.equal(current.reads,0);assert.equal(calls,0);}
});

test('native profile status errors and sanitized download headers pass through unchanged',async()=>{
 let result;const diagnostics=new AdminDiagnostics({sample:async()=>({}),profile:async()=>{if(result instanceof Error)throw result;return result;}}),api=adminHandlers({database:{core511Admin:diagnostics}});
 for(const [code,status]of [['profile_invalid_target',400],['profile_busy',409],['profile_process_changed',409]]){result=Object.assign(Error('internal-sensitive-detail'),{code});const r=await api.post(adminRequest({method:'POST',body:{action:'cpu_profile507',target:'world'}}));assert.equal(r.status,status);assert.equal(r.headers.get('cache-control'),'no-store');const body=await r.json();assert.equal(body.code,code);assert(!JSON.stringify(body).includes('internal-sensitive-detail'));}
 result=new Response('{"nodes":[]}',{headers:{'content-type':'application/json','content-disposition':'attachment; filename="coreoflife-world-fixture.cpuprofile"','cache-control':'no-store','x-content-type-options':'nosniff'}});const r=await api.get(adminRequest({query:'?cpu_profile507=download&id=fixture'}));assert.equal(r,result);assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.equal(await r.text(),'{"nodes":[]}');
});

test('admin view retains every owner and bounds numeric tick details without leaking raw process state',async()=>{
 const process={current:{sampledAtMs:10000,loopUtilization:.25,loopExcessMs:51.3},memoryMb:{rss:90},secret:'private-marker'},metrics={process,players:25,ticks:99,tickP95Ms:7.2,maxMs:51.4,messagesPerSecond:250,writerAckP95Ms:8.8,slowest:Array.from({length:15},(_,i)=>({tick:i,ms:50-i,at:9000+i,actor:'private-marker'})),owners:['private-marker']};
 const snapshot={measuredAtMs:10000,main:process,targets:[{target:'world',available:true,metrics},{target:'channel-4',available:true,metrics}]},result=adminLoad511(snapshot,10000);assert.equal(result.rows.length,6);assert.equal(result.rows[0].busyPercent,25);assert.equal(result.rows[0].loopDelayMs,51.3);assert.equal(result.rows[2].status,'unavailable');const fourth=result.rows.at(-1);assert.equal(fourth.online504.count,25);assert.equal(fourth.kernel511.slowest.length,10);assert.equal(fourth.kernel511.maxTickMs,51.4);assert(!JSON.stringify(result).includes('private-marker'));assert.equal(result.rows[1].kernel511.messagesPerSecond,null);
 const stale=adminLoad511(snapshot,17001).rows.at(-1);assert.equal(stale.status,'stale');assert.equal(stale.kernel511,null);assert.equal(stale.online504.count,null);assert.equal(adminLoad511(snapshot,9999).rows[0].status,'stale');
 const broken=new AdminDiagnostics({sample:async()=>{throw Error('private-marker');},profile:async()=>{}});const failure=await broken.load();assert.equal(failure.status,503);assert(!JSON.stringify(await failure.json()).includes('private-marker'));
});

test('a cached admin sample cannot advertise a retired owner as currently available',async t=>{
 const row={online:true,control:{request:async()=>({players:25})}},core={processes:new Map([[4,row]])},diagnostics=new KernelDiagnostics(core,{clock:()=>10000});t.after(()=>diagnostics.close());const first=await diagnostics.sample();assert.equal(first.targets[0].available,true);row.online=false;const next=await diagnostics.sample();assert.equal(next.targets[0].available,false);
});
test('native authorized load route must expose main world and all four current channel owners',async()=>{
 const targets=['main','world','channel-1','channel-2','channel-3','channel-4'],api=adminHandlers({database:{core511Admin:{load:async()=>Response.json({rows:targets.map(key=>({key}))})}}});
 const response=await api.get(adminRequest({query:'?load=1'}));assert.equal(response.status,200);assert.deepEqual((await response.json()).rows.map(row=>row.key),targets);
});
