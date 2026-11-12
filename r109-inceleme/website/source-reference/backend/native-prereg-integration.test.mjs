/** Real native auth handlers + native FULL-durable SQLite/bot/session/SSO stores.
 * No production server, account, source file, password or token is touched.
 * The only CAPTCHA fixture adjustment replaces its random answer hash with a
 * known test answer; the real route still verifies ownership/expiry/consumption. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import {once} from 'node:events';
import {createHash,webcrypto,randomBytes} from 'node:crypto';
import {OPENING_MS,applyLaunch} from './launch-config.mjs';
import {LocalDatabase} from '../../r60_mount_work/working/native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {createEmptyAccountsDatabase} from '../../r60_mount_work/working/native510-bb3a6cc689c6/vds-server/src/accounts-bootstrap.mjs';
import {ensureLaunchSchema,createLaunchService} from '../../r60_mount_work/working/native510-bb3a6cc689c6/vds-server/src/launch-service.mjs';
import {createBotCheck} from '../../r60_mount_work/working/native510-bb3a6cc689c6/vds-server/src/bot-check.mjs';
import {RealmEntryStore} from '../../r60_mount_work/working/native510-bb3a6cc689c6/vds-server/src/realm-entry-store.mjs';
import {runEntryAdmission477,entryAdmissionResponse477} from '../../r60_mount_work/working/native510-bb3a6cc689c6/vds-server/src/entry-admission477.mjs';
import {colLabHttpAuth} from '../../r60_mount_work/working/native510-bb3a6cc689c6/vds-server/src/loadlab/http-auth.mjs';
import {safeLoadLabAuthCodeR12} from '../../r60_mount_work/working/native510-bb3a6cc689c6/vds-server/src/loadlab/auth-preparation-r12.mjs';

const native=fs.readFileSync(new URL('../../r60_mount_work/working/native510-bb3a6cc689c6/dist-vds/server/index.js',import.meta.url),'utf8');
function region(label){const marker='//#region '+label,start=native.indexOf(marker);assert(start>=0,label);const end=native.indexOf('//#endregion',start);assert(end>start);return native.slice(start,end);}
const guard=native.slice(native.indexOf('function assertLaunchLoginAllowed439(')).split('\n')[0];
const copied=region('lib/game-auth.ts')+'\n'+guard+'\n'+['app/api/auth/challenge/route.ts','app/api/auth/register/route.ts','app/api/auth/login/route.ts','app/api/auth/me/route.ts','app/api/launch/route.ts','app/api/realm/issue/route.ts'].map(region).join('\n');

async function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'col-prereg-native-')),dbFile=path.join(dir,'accounts.sqlite');
 createEmptyAccountsDatabase({destination:dbFile});const db=new LocalDatabase(dbFile);let now=OPENING_MS-3600000;
 ensureLaunchSchema(db.sqlite,{accountsOnly:true});const launch=createLaunchService(db.sqlite,{accountsOnly:true,now:()=>now});
 launch.save({...launch.settings(),mode:'closed'});
 const manifest={realms:[{id:'r1',origin:'https://r1.coreoflife.net',status:'open'}]};
 const realm={role:'accounts',manifest,store:new RealmEntryStore(db.sqlite,{manifest,now:()=>now})};
 const context=vm.createContext({console,Response,Request,Headers,TextEncoder,TextDecoder,AbortController,URL,crypto:webcrypto,btoa,atob,env:{DB:db,CORE_RUNTIME:'vds'},Date:class extends Date{static now(){return now;}},runEntryAdmission477,entryAdmissionResponse477,colLabHttpAuth,safeLoadLabAuthCodeR12,__exportAll:value=>value,__colLaunch:launch,__colBotCheck:createBotCheck(db.sqlite,{now:()=>now}),__colRealm:realm});
 vm.runInContext(copied,context,{filename:'exact-native-auth-r60.js'});
 const handlers=vm.runInContext('({"POST /api/auth/challenge":POST$37,"POST /api/auth/register":POST$33,"POST /api/auth/login":POST$35,"GET /api/auth/me":GET$27,"GET /api/launch":GET$17,"POST /api/realm/issue":POST$6})',context);
 const server=http.createServer(async(req,res)=>{try{
  const chunks=[];for await(const b of req)chunks.push(b);const data=Buffer.concat(chunks),webRequest=new Request('https://accounts.coreoflife.net'+req.url,{method:req.method,headers:req.headers,...(data.length?{body:data}:{}),duplex:'half'});
  const handler=handlers[req.method+' '+req.url];if(!handler){res.writeHead(404);res.end();return;}
  const result=await handler(webRequest),headers=Object.fromEntries(result.headers);const cookies=result.headers.getSetCookie();if(cookies.length)headers['set-cookie']=cookies;
  res.writeHead(result.status,headers);res.end(Buffer.from(await result.arrayBuffer()));
 }catch(error){res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({testError:error.message}));}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();fs.rmSync(dir,{recursive:true,force:true});});
 let ipSequence=0;
 async function request(url,{body,method=body?'POST':'GET',cookie='',csrf,ip='198.51.100.10',origin='https://accounts.coreoflife.net'}={}){
  const response=await fetch('http://127.0.0.1:'+server.address().port+url,{method,headers:{origin,'cf-connecting-ip':ip,...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(csrf?{'x-csrf-token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,body:await response.json(),cookies:response.headers.getSetCookie(),headers:response.headers};
 }
 async function challenge(ip){
  const response=await request('/api/auth/challenge',{body:{},ip});assert.equal(response.status,200,JSON.stringify(response.body));
  const {id,image}=response.body;assert.match(image,/^data:image\/png;base64,/);const png=Buffer.from(image.split(',')[1],'base64');assert(png.length>100);
  db.sqlite.prepare('UPDATE bot_challenges SET hash=? WHERE id=?').run(createHash('sha256').update(id+':654321').digest('hex'),id);
  return {id,answer:'654321',width:png.readUInt32BE(16),height:png.readUInt32BE(20)};
 }
 async function register(username='PreRegistered'){
  const ip='198.51.100.'+(20+(ipSequence++)),c=await challenge(ip),payload={username,email:username.toLowerCase()+'@example.invalid',password:'TestOnly-password-123',passwordConfirmation:'TestOnly-password-123',captchaId:c.id,captchaAnswer:c.answer,launchEmailConsent:false};
  const response=await request('/api/auth/register',{body:payload,ip});return {...response,payload,ip,cookie:response.cookies.map(c=>c.split(';')[0]).join('; ')};
 }
 let receipt=null;const store={async read(){return receipt;},async write(v){receipt=structuredClone(v);}};
 const client={async admin(input){if(input.method==='POST')launch.save(input.body.settings);return {settings:launch.settings()};},async accountsStatus(){return (await request('/api/launch')).body;},async gameStatus(){return launch.status();}};
 return {db,launch,realm,request,challenge,register,arm:()=>applyLaunch({client,store}),setTime:value=>{now=value;}};
}

test('actual native registration, existing/new sessions, exact launch boundary and signed-state SSO grant',async t=>{
 const f=await fixture(t),old=await f.register('AlreadyRegistered');assert.equal(old.status,201,JSON.stringify(old.body));
 const before=f.db.sqlite.prepare('SELECT * FROM accounts ORDER BY id').all(),sessionBefore=f.db.sqlite.prepare('SELECT * FROM auth_sessions ORDER BY token_hash').all();
 await f.arm();assert.deepEqual(f.db.sqlite.prepare('SELECT * FROM accounts ORDER BY id').all(),before);assert.deepEqual(f.db.sqlite.prepare('SELECT * FROM auth_sessions ORDER BY token_hash').all(),sessionBefore);
 const fresh=await f.register('NewPrereg');assert.equal(fresh.status,201,JSON.stringify(fresh.body));assert.equal(fresh.body.authenticated,true);assert.equal(fresh.body.launch.canPlay,false);assert.equal(fresh.body.launch.phase,'waiting');
 assert(fresh.cookies.some(c=>c.startsWith('__Host-yasam-session=')&&c.includes('HttpOnly')&&c.includes('Secure')));
 const row=f.db.sqlite.prepare('SELECT * FROM accounts WHERE id=?').get(fresh.body.account.id);assert.notEqual(row.password_hash,fresh.payload.password);assert.equal(row.password_iterations,100000);
 const registeredRows=f.db.sqlite.prepare('SELECT * FROM accounts ORDER BY id').all();
 const state=randomBytes(32).toString('base64url');
 f.setTime(OPENING_MS-1);
 const blockedLogin=await f.request('/api/auth/login',{body:{login:fresh.payload.username,password:fresh.payload.password},ip:'198.51.100.80'});assert.equal(blockedLogin.status,403);assert.equal(blockedLogin.body.code,'prereg_access_required');
 const blockedEntry=await f.request('/api/realm/issue',{body:{realmId:'r1',state},cookie:fresh.cookie,csrf:fresh.body.csrfToken});assert.equal(blockedEntry.status,403);assert.equal(blockedEntry.body.code,'realm_closed');
 f.setTime(OPENING_MS);
 const oldMe=await f.request('/api/auth/me',{cookie:old.cookie}),freshMe=await f.request('/api/auth/me',{cookie:fresh.cookie});
 for(const me of [oldMe,freshMe]){assert.equal(me.status,200,JSON.stringify(me.body));assert.equal(me.body.authenticated,true);assert.equal(me.body.launch.canPlay,true);assert.equal(me.body.launch.phase,'open');}
 assert.equal(oldMe.body.account.id,old.body.account.id);assert.equal(freshMe.body.account.id,fresh.body.account.id);
 const login=await f.request('/api/auth/login',{body:{login:fresh.payload.username,password:fresh.payload.password},ip:'198.51.100.80'});assert.equal(login.status,200,JSON.stringify(login.body));assert.equal(login.body.account.id,fresh.body.account.id);
 const issued=await f.request('/api/realm/issue',{body:{realmId:'r1',state},cookie:fresh.cookie,csrf:fresh.body.csrfToken});assert.equal(issued.status,200,JSON.stringify(issued.body));
 const destination=new URL(issued.body.destination);assert.equal(destination.origin,'https://r1.coreoflife.net');const code=new URLSearchParams(destination.hash.slice(1)).get('realmCode');
 const requestId=randomBytes(32).toString('base64url'),grant=f.realm.store.redeem({code,realmId:'r1',state,requestId});assert.equal(grant.account.id,fresh.body.account.id);
 assert.throws(()=>f.realm.store.redeem({code,realmId:'r1',state,requestId:randomBytes(32).toString('base64url')}),/entry_already_used/);
 assert.deepEqual(f.db.sqlite.prepare('SELECT * FROM accounts ORDER BY id').all(),registeredRows);
 const late=await f.register('AfterOpening');assert.equal(late.status,201,JSON.stringify(late.body));assert.equal(late.body.launch.canPlay,true);
});
test('actual native registration enforces CAPTCHA, same origin, uniqueness and 9-character password',async t=>{
 const f=await fixture(t);await f.arm();
 const base={username:'SecurityCheck',email:'security@example.invalid',password:'TestOnly-password-123',passwordConfirmation:'TestOnly-password-123',captchaId:'missing',captchaAnswer:'654321'};
 const missing=await f.request('/api/auth/register',{body:base});assert.equal(missing.status,400);assert.equal(missing.body.code,'captcha_invalid');
 const foreign=await f.request('/api/auth/register',{body:base,origin:'https://foreign.invalid'});assert.equal(foreign.status,403);assert.equal(foreign.body.code,'invalid_origin');
 const short=await f.request('/api/auth/register',{body:{...base,password:'12345678',passwordConfirmation:'12345678'}});assert.equal(short.status,400);assert.equal(short.body.code,'invalid_password');
 const mismatch=await f.request('/api/auth/register',{body:{...base,passwordConfirmation:'mismatch-password'}});assert.equal(mismatch.status,400);assert.equal(mismatch.body.code,'password_mismatch');
 assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM accounts').get().n,0);
 const first=await f.register('UniqueAccount');assert.equal(first.status,201);
 const reused=await f.request('/api/auth/register',{body:first.payload,ip:first.ip});assert.equal(reused.status,400);assert.equal(reused.body.code,'captcha_invalid');
 const c=await f.challenge(first.ip);const duplicate=await f.request('/api/auth/register',{body:{...first.payload,captchaId:c.id,captchaAnswer:c.answer},ip:first.ip});assert.equal(duplicate.status,409);assert.equal(duplicate.body.code,'account_exists');
 assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM accounts').get().n,1);
});
test('native anonymous session, CAPTCHA rate limit, and SSO CSRF remain enforced',async t=>{
 const f=await fixture(t);await f.arm();const anonymous=await f.request('/api/auth/me');assert.equal(anonymous.status,200);assert.equal(anonymous.body.authenticated,false);
 const ip='198.51.100.99';for(let i=0;i<15;i++){const r=await f.request('/api/auth/challenge',{body:{},ip});assert.equal(r.status,200);}
 const limited=await f.request('/api/auth/challenge',{body:{},ip});assert.equal(limited.status,429);assert.equal(limited.body.code,'rate_limited');assert(Number(limited.headers.get('retry-after'))>0);
 const account=await f.register('CsrfCheck');assert.equal(account.status,201);f.setTime(OPENING_MS);
 const withoutCsrf=await f.request('/api/realm/issue',{body:{realmId:'r1',state:randomBytes(32).toString('base64url')},cookie:account.cookie});assert.equal(withoutCsrf.status,403);assert.equal(withoutCsrf.body.code,'invalid_csrf');
 const badState=await f.request('/api/realm/issue',{body:{realmId:'r1',state:'tampered'},cookie:account.cookie,csrf:account.body.csrfToken});assert.equal(badState.status,400);assert.equal(badState.body.code,'invalid_state');
 assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM realm_entry_codes').get().n,0);
});
