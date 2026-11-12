import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './accounts-fixture.mjs';

test('exact accounts routes register and log in with asynchronous CAPTCHA; CSRF and replay remain enforced',async t=>{
 const f=await fixture(t);f.launch.save({...f.launch.settings(),mode:'open'});f.realm.control.saveRealm({realmId:'r1',status:'open',registrationOpen:true});
 assert.equal((await f.request('/api/auth/challenge',{body:{},origin:'https://foreign.invalid'})).status,403);
 const a=await f.register('WorkerRegistration');assert.equal(a.status,201,JSON.stringify(a.body));
 const me=await f.request('/api/auth/me',{cookie:a.cookie});assert.equal(me.status,200);assert.equal(me.body.authenticated,true);
 const replay=await f.request('/api/auth/register',{body:{...a.payload,username:'SecondUser',email:'second@example.invalid'},ip:a.ip});assert.equal(replay.status,400);
 const login=await f.request('/api/auth/login',{body:{username:a.payload.username,password:a.payload.password},ip:'198.51.100.99'});assert.equal(login.status,200,JSON.stringify(login.body));
});

test('independent registration forms sharing an IP survive concurrent preparation and both can register',async t=>{
 const f=await fixture(t),ip='198.51.100.15';f.launch.save({...f.launch.settings(),mode:'open'});f.realm.control.saveRealm({realmId:'r1',status:'open',registrationOpen:true});
 const [a,b]=await Promise.all([f.challenge(ip),f.challenge(ip)]);assert.notEqual(a.id,b.id);assert.equal(a.width,252);assert.equal(a.height,88);
 for(const [i,c] of [a,b].entries()){
  const username='SharedWorker'+i,payload={username,email:username.toLowerCase()+'@example.invalid',password:'TestOnly-pass-123',passwordConfirmation:'TestOnly-pass-123',captchaId:c.id,captchaAnswer:c.answer,launchEmailConsent:false};
  const r=await f.request('/api/auth/register',{body:payload,ip});assert.equal(r.status,201,JSON.stringify(r.body));
 }
});

test('existing registration rate limit still blocks repeated CAPTCHA requests',async t=>{
 const f=await fixture(t),ip='198.51.100.16';
 for(let n=0;n<15;n++){const r=await f.request('/api/auth/challenge',{body:{},ip});assert.equal(r.status,200,JSON.stringify(r.body));assert.deepEqual(Object.keys(r.body).sort(),['expiresAt','id','image']);}
 assert.equal((await f.request('/api/auth/challenge',{body:{},ip})).status,429);
});
