import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {stageNativeHttp} from './native-http-bundle-fixture.mjs';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {patchNativeBotCheck} from '../patch-native-bot-check.mjs';
import {BASE,until} from './helpers.mjs';
import {put} from './pvp-fixture.mjs';

const due=s=>s.f.sql.prepare('SELECT due_ms FROM bot_due WHERE account_id=?').get(s.f.account.id).due_ms;
const challenge=(s,id)=>s.f.sql.prepare('SELECT * FROM bot_challenges WHERE id=?').get(id);
async function seed(s,deadline=Date.now()+60000){
 const id=randomUUID(),answer='123456';await s.host.database.atomic(()=>{s.f.sql.prepare('UPDATE bot_due SET due_ms=? WHERE account_id=?').run(deadline,s.f.account.id);put(s.f.sql,'bot_challenges',{id,owner:s.f.account.id,purpose:'game',hash:createHash('sha256').update(id+':'+answer).digest('hex'),image:'isolated-test-challenge',expires_ms:Date.now()+60000,attempts:0});});return {id,answer};
}
const call=(s,body,headers={})=>s.module.default(s.f.request({path:'/api/bot-check',body,headers}));

test('native CAPTCHA patch reverses exactly and retains original four guarded call sites',()=>{
 const original=fs.readFileSync(path.join(BASE,'dist-vds/server/index.js'),'utf8'),p=patchNativeBotCheck(original);assert.equal(p.proof.edits.length,4);let reversed=p.source;for(const e of p.proof.edits)reversed=reversed.replace(e.replacement,e.original);assert.equal(reversed,original);assert.throws(()=>patchNativeBotCheck(p.source),/native_bot_route_changed/);
});

test('verified CAPTCHA waits for durability and current channel ACK and survives the old deadline with periodic refresh enabled',{timeout:40000},async t=>{
 const s=await nativeHttpHost(t);await s.world.stopJobs();await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));s.module=await stageNativeHttp(t).load();const oldDue=Date.now()+6000,input=await seed(s,oldDue),ticket=await s.http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await s.connect(ticket);s.core.start();
 const {core,host}=s,row=core.processes.get(ticket.channel),request=row.control.request.bind(row.control),durable=host.database.durableAfterCommit.bind(host.database);let flushed=false,acked=false,answered=false,releaseFlush,releaseAck;
 const flushGate=new Promise(r=>releaseFlush=r),ackGate=new Promise(r=>releaseAck=r);
 host.database.durableAfterCommit=()=>{const work=durable();if(!flushed&&!challenge(s,input.id)){flushed=true;return Promise.resolve(work).then(()=>flushGate);}return work;};
 row.control.request=async(method,payload)=>{const result=await request(method,payload);if(method==='session'&&payload.botDueMs>oldDue&&!acked){acked=true;await ackGate;}return result;};
 try{const pending=call(s,input).finally(()=>answered=true);await until(()=>flushed,5000);assert.equal(answered,false);assert.equal(acked,false);assert.equal(core.sessions.get(s.f.id).security.botDueMs,oldDue);assert(due(s)>oldDue+1000000);releaseFlush();await until(()=>acked,5000);assert.equal(answered,false);
  await until(()=>Date.now()>=oldDue+1600,9000);assert.equal(live.ws.readyState,1,'The live channel must receive the new deadline before its original deadline.');releaseAck();const r=await pending;assert.equal(r.status,200,await r.text());assert.equal(core.sessions.get(s.f.id).security.botDueMs,due(s));assert.equal((await call(s,input)).status,400);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
 }finally{releaseFlush();releaseAck();host.database.durableAfterCommit=durable;row.control.request=request;}
});

test('native wrong-answer attempts remain durable, bounded and one-use; GET retains native challenge and authentication rules',{timeout:35000},async t=>{
 const s=await nativeHttpHost(t);await s.world.stopJobs();await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));s.module=await stageNativeHttp(t).load();const input=await seed(s),before=due(s),db=s.host.database,durable=db.durableAfterCommit.bind(db);let attemptFlushes=0;
 db.durableAfterCommit=()=>{if(challenge(s,input.id)?.attempts>attemptFlushes)attemptFlushes=challenge(s,input.id).attempts;return durable();};
 try{assert.equal((await call(s,input,{'X-CSRF-Token':'bad'})).status,403);assert.equal(challenge(s,input.id).attempts,0);
  for(let i=1;i<=5;i++){assert.equal((await call(s,{...input,answer:'000000'})).status,400);assert.equal(challenge(s,input.id).attempts,i);assert.equal(attemptFlushes,i);}
  assert.equal((await call(s,input)).status,400);assert.equal(challenge(s,input.id).attempts,5);assert.equal(due(s),before);
 }finally{db.durableAfterCommit=durable;}
 await db.atomic(()=>s.f.sql.prepare('UPDATE bot_due SET due_ms=? WHERE account_id=?').run(Date.now()-1,s.f.account.id));
 const get=()=>s.module.default(s.f.request({path:'/api/bot-check',method:'GET'})),r=await get();assert.equal(r.status,200);const body=await r.json();assert.equal(body.required,true);assert.notEqual(body.id,input.id);assert.match(body.image,/^data:image\/png;base64,/);assert.equal(challenge(s,body.id).attempts,0);assert.equal((await (await get()).json()).id,body.id);
 const fresh=await seed(s);assert.equal((await call(s,{...fresh,answer:123456})).status,400);assert.equal(challenge(s,fresh.id).attempts,0);assert.equal((await call(s,fresh)).status,200);assert.equal(challenge(s,fresh.id),undefined);assert.equal((await call(s,fresh)).status,400);assert.equal(s.faults.length,0);
});

test('lost native CAPTCHA session ACK terminates only the old channel before response and reconnect uses current deadline',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),input=await seed(s),{core,supervisor,ticket}=s,source=supervisor.rows.get(ticket.channel),row=core.processes.get(ticket.channel),request=row.control.request.bind(row.control),others=[s.world.row,...supervisor.rows.values()].filter(r=>r!==source);let lost=false;
 row.control.request=async(method,payload)=>{const ack=await request(method,payload);if(method==='session'&&!lost){lost=true;throw Error('captcha_delivery_lost');}return ack;};
 const r=await call(s,input);assert.notEqual(r.status,200,await r.text());assert(lost);assert(source.exited);assert.equal(source.child.signalCode,'SIGKILL');assert.equal(challenge(s,input.id),undefined);
 await until(()=>supervisor.rows.get(ticket.channel)!==source&&supervisor.rows.get(ticket.channel)?.state==='running',20000);assert(others.every(r=>!r.exited));const fresh=await s.http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));const live=await s.connect(fresh);assert.equal(live.ws.readyState,1);assert.equal(core.sessions.get(s.f.id).security.botDueMs,due(s));assert.equal((await call(s,input)).status,400);assert(!s.faults.some(f=>f.supervisor),s.faults.map(f=>f.error?.stack).join('\n'));
});

for(const phase of ['before','after'])test('native CAPTCHA source SIGKILL '+phase+' COMMIT preserves original attempt and one-use outcome',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),input=await seed(s),oldDue=due(s),{host,supervisor,ticket}=s,source=supervisor.rows.get(ticket.channel),others=[s.world.row,...supervisor.rows.values()].filter(r=>r!==source),db=host.database,atomic=db.atomic.bind(db),durable=db.durableAfterCommit.bind(db);let killed=false;
 db.atomic=(operation,options)=>atomic(sql=>{const value=operation(sql);if(phase==='before'&&!killed&&!challenge(s,input.id)){killed=true;source.child.kill('SIGKILL');throw Error('captcha_before_commit');}return value;},options);
 db.durableAfterCommit=()=>{const pending=durable();if(phase==='after'&&!killed&&!challenge(s,input.id)){killed=true;return Promise.resolve(pending).then(()=>{source.child.kill('SIGKILL');throw Error('captcha_after_commit');});}return pending;};
 try{const r=await call(s,input);assert.notEqual(r.status,200,await r.text());}finally{db.atomic=atomic;db.durableAfterCommit=durable;}
 assert(killed);assert.equal(Boolean(challenge(s,input.id)),phase==='before');if(phase==='before'){assert.equal(challenge(s,input.id).attempts,0);assert.equal(due(s),oldDue);}else assert(due(s)>oldDue+1000000);
 await until(()=>source.exited&&supervisor.rows.get(ticket.channel)!==source&&supervisor.rows.get(ticket.channel)?.state==='running',20000);assert(others.every(r=>!r.exited));const fresh=await s.http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));await s.connect(fresh);assert.equal(s.core.sessions.get(s.f.id).security.botDueMs,due(s));assert.equal((await call(s,input)).status,phase==='before'?200:400);assert.equal((await call(s,input)).status,400);
});
