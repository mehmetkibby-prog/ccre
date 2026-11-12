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

browserEntry({role:'accounts',realmId:'r1',gameOrigin:'https://r1.coreoflife.net',authOrigin:'https://accounts.coreoflife.net'});
