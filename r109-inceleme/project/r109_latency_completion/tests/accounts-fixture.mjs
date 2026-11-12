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
const OPENING_MS=Date.parse('2026-10-30T20:00:00+03:00');
import {LocalDatabase} from '../working/native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {createEmptyAccountsDatabase} from '../working/native510-bb3a6cc689c6/vds-server/src/accounts-bootstrap.mjs';
import {ensureLaunchSchema,createLaunchService} from '../working/native510-bb3a6cc689c6/vds-server/src/launch-service.mjs';
import {createBotCheck} from '../working/native510-bb3a6cc689c6/vds-server/src/bot-check.mjs';
import {RealmControl} from '../working/native510-bb3a6cc689c6/vds-server/src/realm-control.mjs';
import {RealmEntryStore} from '../working/native510-bb3a6cc689c6/vds-server/src/realm-entry-store.mjs';
import {runEntryAdmission477,entryAdmissionResponse477} from '../working/native510-bb3a6cc689c6/vds-server/src/entry-admission477.mjs';
import {colLabHttpAuth} from '../working/native510-bb3a6cc689c6/vds-server/src/loadlab/http-auth.mjs';
import {safeLoadLabAuthCodeR12} from '../working/native510-bb3a6cc689c6/vds-server/src/loadlab/auth-preparation-r12.mjs';

const native=fs.readFileSync(new URL('../working/accounts-runtime/dist-vds/server/index.js',import.meta.url),'utf8');
function region(label){const marker='//#region '+label,start=native.indexOf(marker);assert(start>=0,label);const end=native.indexOf('//#endregion',start);assert(end>start);return native.slice(start,end);}
const guard=native.slice(native.indexOf('function assertLaunchLoginAllowed439(')).split('\n')[0];
const dbStart=native.indexOf('function db() {'),dbFunction=native.slice(dbStart,native.indexOf('\n}',dbStart)+2);assert(dbFunction.includes('return env.DB'));
const copied=dbFunction+'\n'+region('lib/game-auth.ts')+'\n'+guard+'\n'+['app/api/auth/challenge/route.ts','app/api/auth/register/route.ts','app/api/auth/login/route.ts','app/api/auth/reset-password/route.ts','app/api/auth/logout/route.ts','app/api/auth/me/route.ts','app/api/launch/route.ts','app/api/realm/issue/route.ts'].map(region).join('\n')+'\n'+region('app/api/realm/catalog/route.ts')+'\n'+native.slice(native.indexOf('async function accountsEntryR101('),native.indexOf('export { accountsEntryR101'));

export async function fixture(t,{staticRoot=null,hooks={},databaseFile=null,listenPort=0}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'col-prereg-native-')),dbFile=databaseFile||path.join(dir,'accounts.sqlite'),existing=fs.existsSync(dbFile);
 if(!existing)createEmptyAccountsDatabase({destination:dbFile});const db=new LocalDatabase(dbFile);let now=OPENING_MS-3600000;
 ensureLaunchSchema(db.sqlite,{accountsOnly:true});const launch=createLaunchService(db.sqlite,{accountsOnly:true,now:()=>now});
 if(!existing)launch.save({...launch.settings(),mode:'closed'});
 const manifest={primaryRealmId:'r1',authOrigin:'https://accounts.coreoflife.net',realms:[{id:'r1',origin:'https://r1.coreoflife.net',status:'open'}]};
 const realm={role:'accounts',manifest,store:new RealmEntryStore(db.sqlite,{manifest,now:()=>now})};
 realm.control=new RealmControl(db.sqlite,manifest);
 const context=vm.createContext({console,process,Response,Request,Headers,TextEncoder,TextDecoder,AbortController,URL,crypto:webcrypto,btoa,atob,env:{DB:db,CORE_RUNTIME:'vds'},Date:class extends Date{static now(){return now;}},runEntryAdmission477,entryAdmissionResponse477,colLabHttpAuth,safeLoadLabAuthCodeR12,__exportAll:value=>value,__colLaunch:launch,__colBotCheck:createBotCheck(db.sqlite,{now:()=>now}),__colRealm:realm});
 vm.runInContext(copied,context,{filename:'exact-native-auth-r60.js'});
 const handlers=vm.runInContext('({"POST /api/auth/challenge":POST$37,"POST /api/auth/register":POST$33,"POST /api/auth/login":POST$35,"POST /api/auth/reset-password":POST$32,"POST /api/auth/logout":POST$34,"GET /api/auth/me":GET$27,"GET /api/launch":GET$17,"POST /api/realm/issue":POST$6,"GET /api/realm/catalog":GET$5,"GET /api/realm/academy-registration":accountsEntryR101,"POST /api/realm/academy-registration":accountsEntryR101})',context);
 const server=http.createServer(async(req,res)=>{try{
  const chunks=[];for await(const b of req)chunks.push(b);const data=Buffer.concat(chunks),webRequest=new Request('https://accounts.coreoflife.net'+req.url,{method:req.method,headers:req.headers,...(data.length?{body:data}:{}),duplex:'half'});
  const pathname=new URL(req.url,'http://fixture').pathname;
  if(pathname==='/api/site-launch'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify(launch.status()));return;}
  const hook=hooks[req.url];if(hook){const value=await hook(webRequest);res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify(value));return;}
  const isChoice=pathname==='/'&&new URL(req.url,'https://fixture').searchParams.get('servers')==='1';const handler=pathname==='/akademi-kayit'||isChoice?context.accountsEntryR101:handlers[req.method+' '+pathname];if(!handler){
    if(staticRoot){
      const file=path.resolve(staticRoot,'.'+(pathname==='/on-kayit'?'/prereg.html':pathname==='/'?'/index.html':pathname));
      if(file.startsWith(staticRoot+'/')&&fs.existsSync(file)&&fs.statSync(file).isFile()){
        const type={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4'}[path.extname(file)]||'application/octet-stream';
        res.writeHead(200,{'content-type':type,'cache-control':'no-store','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; object-src 'none'; frame-src https://www.youtube-nocookie.com"}).end(fs.readFileSync(file));return;
      }
    }
    res.writeHead(404).end();return;
  }
  const result=await handler(webRequest),headers=Object.fromEntries(result.headers);const cookies=result.headers.getSetCookie();if(cookies.length)headers['set-cookie']=cookies;
  res.writeHead(result.status,headers);res.end(Buffer.from(await result.arrayBuffer()));
 }catch(error){res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({testError:error.message}));}});
 server.listen(listenPort,'127.0.0.1');await once(server,'listening');
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
  const ip='198.51.100.'+(20+(ipSequence++)),c=await challenge(ip),payload={username,email:username.toLowerCase()+'@example.invalid',password:'TestOnly-pass-123',passwordConfirmation:'TestOnly-pass-123',captchaId:c.id,captchaAnswer:c.answer,launchEmailConsent:false};
  const response=await request('/api/auth/register',{body:payload,ip});return {...response,payload,ip,cookie:response.cookies.map(c=>c.split(';')[0]).join('; ')};
 }
 return {server,context,db,dbFile,launch,realm,request,challenge,register,origin:'http://127.0.0.1:'+server.address().port,setTime:value=>{now=value;}};
}
