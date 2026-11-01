// Administrative entry is separate from gameplay admission. Passwords, rate
// limits, sanctions, CSRF, signed realm tickets and session creation stay native.
import {ADMIN_STATUS_PATH,adminStatusHtml} from './admin-status.mjs';
import {AsyncLocalStorage} from 'node:async_hooks';
import {randomBytes} from 'node:crypto';

export const ADMIN_ENTRY_VERSION='admin-entry-r9';
const scope=new AsyncLocalStorage();
const marker=Symbol.for('core511.admin-entry.r9');
const token=/^[-_A-Za-z0-9]{43}$/;

export function administrativeLoginPolicy(launch,owner){
 if(launch[marker])return;
 const status=launch.status.bind(launch);
 launch.status=accountId=>{
  const result=status(accountId);
  if(!scope.getStore()?.login)return result;
  // The native login route has anonymous maintenance checks before and after
  // password verification. Only this request may reach those existing checks.
  // Its mandatory account-specific check below still rejects every non-owner.
  if(!accountId)return result.phase==='maintenance'?{...result,phase:'admin-authentication'}:result;
  const allowed=typeof owner()==='string'&&owner().length>0&&accountId===owner();
  return {...result,canPlay:allowed,showLanding:!allowed};
 };
 Object.defineProperty(launch,marker,{value:true});
}

function browserEntry(config){
 const q=s=>document.querySelector(s),message=q('#message'),form=q('form'),password=q('#password'),back=q('#continue'),logout=q('#logout');
 if(config.role==='accounts'){back.href=config.gameOrigin+'/admin-login';back.textContent='Girişi yeniden başlat';}
 let active=false,me;
 function say(text){message.textContent=text;}
 function csrf(){return me?.csrfToken||document.cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith('__Host-yasam-csrf='))?.slice('__Host-yasam-csrf='.length)||'';}
 async function request(url,body,withCsrf=false){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{...(body?{'content-type':'application/json'}:{}),...(withCsrf?{'x-csrf-token':decodeURIComponent(csrf())}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||data.message||'İşlem tamamlanamadı. Yeniden dene.');
   return data;
  }finally{clearTimeout(timer);}
 }
 async function continueOwner(){
  if(config.role==='game'){
   await request('/api/admin/launch');
   try{sessionStorage.removeItem('col-admin-return');}catch{}
   location.replace('/admin/oyun-durumu');return;
  }
  if(me?.account?.realmAdmin!==true){say('Bu hesap yönetici hesabı değil. Yönetici hesabınla giriş yap.');logout.hidden=false;return;}
  const params=new URLSearchParams(location.search),realm=params.get('realm'),state=params.get('state');
  if(realm&&state){
   if(realm!==config.realmId||!/^[-_A-Za-z0-9]{43}$/.test(state))throw Error('Giriş bağlantısı geçersiz. Yönetici girişini yeniden başlat.');
   say('Yönetici paneline bağlanılıyor…');
   const issued=await request('/api/realm/issue',{realmId:realm,state},true),dest=new URL(issued.destination);
   if(dest.origin!==config.gameOrigin||dest.pathname!=='/')throw Error('Giriş adresi doğrulanamadı.');
   dest.search='?admin=1';location.replace(dest.href);return;
  }
  location.replace(config.gameOrigin+'/admin-login');
 }
 async function start(){
  if(config.role==='game'){
   try{sessionStorage.setItem('col-admin-return','1');}catch{}
   const params=new URLSearchParams(location.hash.slice(1));
   if(params.has('realmCode')){
    const code=params.get('realmCode'),state=params.get('realmState');
    history.replaceState({},'','/admin-login');
    if(!/^[-_A-Za-z0-9]{43}$/.test(code||'')||!/^[-_A-Za-z0-9]{43}$/.test(state||''))throw Error('Giriş bağlantısı geçersiz.');
    await request('/api/realm/redeem',{code,state});
   }
  }
  me=await request('/api/auth/me');
  if(config.role==='accounts'&&new URLSearchParams(location.search).get('logout')==='1'){
   if(me.authenticated)await request('/api/auth/logout',{},true);
   me=null;const url=new URL(location.href);url.searchParams.delete('logout');history.replaceState({},'',url.pathname+url.search);
  }
  if(me?.authenticated){logout.hidden=false;await continueOwner();return;}
  if(config.role==='game'){say('Yönetici oturumunu yeniden doğrula.');back.hidden=false;}
  else{form.hidden=false;say('Yönetici hesabının kullanıcı adı ve parolasıyla giriş yap.');q('#username').focus();}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(active)return;active=true;q('#submit').disabled=true;say('Hesap doğrulanıyor…');
  try{me=await request('/api/admin-session/login',{login:q('#username').value,password:password.value});password.value='';if(!me.authenticated)throw Error('Oturum doğrulanamadı.');await continueOwner();}
  catch(error){say(error.message);back.hidden=false;}
  finally{password.value='';active=false;q('#submit').disabled=false;}
 });
 logout.addEventListener('click',async()=>{
  if(active)return;active=true;
  try{const result=await request('/api/auth/logout',{},true);me=null;if(config.role==='game'){const u=new URL(result.redirectUrl||config.authOrigin);if(u.origin!==config.authOrigin)throw Error('Çıkış adresi doğrulanamadı.');location.replace(config.authOrigin+'/admin-login?logout=1');}else{logout.hidden=true;form.hidden=false;say('Yönetici hesabınla giriş yap.');}}
  catch(error){say(error.message);}finally{active=false;}
 });
 start().catch(error=>{say(error.message);back.hidden=false;if(config.role==='accounts')form.hidden=false;});
}

export function adminEntryHtml(config,nonce){
 const json=JSON.stringify(config).replaceAll('<','\\u003c');
 return '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Core of Life · Yönetici girişi</title>'+
 `<style nonce="${nonce}">*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07130f;color:#f6eed6;font:17px/1.5 system-ui}main{width:min(440px,92vw);padding:30px;background:#10231b;border:1px solid #456b55;border-radius:16px}h1{font-size:27px;margin-top:0}label{display:block;margin:16px 0}input{display:block;width:100%;padding:12px;border:1px solid #53745f;background:#08170e;color:inherit;border-radius:8px;font:inherit}button,a{display:inline-block;border:1px solid #6a9b7c;border-radius:8px;padding:11px 16px;background:#244e37;color:inherit;font:inherit;text-decoration:none;cursor:pointer}button:disabled{opacity:.5}#logout{background:transparent;margin-top:18px}[hidden]{display:none!important}.note{color:#acc3ae;font-size:14px}#message{min-height:50px}</style>`+
 '<main data-core511-admin-entry="'+ADMIN_ENTRY_VERSION+'"><h1>Yönetici girişi</h1><p class="note">Buradan giriş yapmak oyunu açmaz. Oyun durumunu panelden yönetebilirsin.</p><p id="message" role="status" aria-live="polite">Oturum kontrol ediliyor…</p><form hidden><label>Kullanıcı adı veya e-posta<input id="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="254" required></label><label>Parola<input id="password" type="password" autocomplete="current-password" maxlength="128" required></label><button id="submit">Yönetici girişi</button></form><a id="continue" href="/api/realm/begin?admin=1" hidden>Hesabımla yeniden giriş yap</a><button id="logout" type="button" hidden>Hesaptan çık</button></main>'+
 `<script nonce="${nonce}">(${browserEntry.toString()})(${json});</script></html>`;
}

export function attachAdminEntry(server,{runtime,launch}){
 const role=runtime.role,realm=role==='game'?runtime.realm:runtime.manifest.realms.find(r=>r.id===runtime.manifest.primaryRealmId);
 if(!['accounts','game'].includes(role)||!realm)throw Error('admin_entry_configuration');
 if(role==='accounts')administrativeLoginPolicy(launch,()=>process.env.ADMIN_USER_ID);
 const config={role,realmId:realm.id,gameOrigin:realm.origin,authOrigin:runtime.authOrigin||runtime.manifest.authOrigin};
 for(const origin of [config.gameOrigin,config.authOrigin]){const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin)throw Error('admin_entry_origin');}
 const listeners=server.listeners('request');server.removeAllListeners('request');
 const forward=(req,res)=>{for(const listener of listeners)listener.call(server,req,res);};
 const redirect=value=>{
  try{const u=new URL(String(value));if(u.origin===config.authOrigin&&u.pathname==='/'&&u.searchParams.get('realm')===realm.id&&token.test(u.searchParams.get('state')||'')){u.pathname='/admin-login';return u.href;}}catch{}
  return value;
 };
 server.on('request',(req,res)=>{
  let url;try{url=new URL(req.url,'http://internal.invalid');}catch{return forward(req,res);}
  if(role==='game'&&req.method==='GET'&&url.pathname===ADMIN_STATUS_PATH){
   const nonce=randomBytes(24).toString('base64');
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store, max-age=0','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`});
   res.end(adminStatusHtml(nonce));return;
  }
  if(req.method==='GET'&&(url.pathname==='/admin-login'||url.pathname==='/'&&url.searchParams.get('admin')==='1')){
   const nonce=randomBytes(24).toString('base64');
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store, max-age=0','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`});
   res.end(adminEntryHtml(config,nonce));return;
  }
  if(role==='game'&&req.method==='GET'&&url.pathname==='/api/realm/begin'&&url.searchParams.get('admin')==='1'){
   // Retain the native nonce creation and all three HttpOnly state cookies.
   // Change only the destination page of the native 303 response.
   const set=res.setHeader,head=res.writeHead;
   res.setHeader=function(name,value){return set.call(this,name,String(name).toLowerCase()==='location'?redirect(value):value);};
   res.writeHead=function(...args){for(let i=1;i<args.length;i++){const h=args[i];if(!h||typeof h!=='object')continue;if(Array.isArray(h)){for(let j=0;j<h.length;j+=2)if(String(h[j]).toLowerCase()==='location')h[j+1]=redirect(h[j+1]);}else{for(const k of Object.keys(h))if(k.toLowerCase()==='location')h[k]=redirect(h[k]);}}return head.apply(this,args);};
   forward(req,res);return;
  }
  if(url.pathname==='/api/admin-session/login'){
   if(role!=='accounts'||req.method!=='POST'){
    res.writeHead(role==='accounts'?405:404,{'content-type':'application/json','cache-control':'no-store'});res.end('{"error":"Yönetici girişi bu adreste kullanılamıyor."}');return;
   }
   req.url='/api/auth/login';scope.run({login:true},()=>forward(req,res));return;
  }
  forward(req,res);
 });
}
