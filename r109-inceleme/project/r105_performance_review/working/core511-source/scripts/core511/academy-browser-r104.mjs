// Serialized into the public accounts page. No game loop or game assets load here.
export function academyBrowserR104(){
 const $=s=>document.querySelector(s);let me=null,challenge=null,busy=false,mode=new URLSearchParams(location.search).get('intent')==='login'?'login':'register',loading=false;
 let launch=JSON.parse($('#launch-state').textContent),received=performance.now(),poll=null,atBoundary=false;
 const say=(text,error=false)=>{const el=$('#message');el.textContent=text;el.classList.toggle('error',error);};
 async function api(url,body,csrf=false){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(url,{method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',signal:controller.signal,headers:body?{'content-type':'application/json',...(csrf?{'x-csrf-token':me?.csrfToken||''}:{})}:{},...(body?{body:JSON.stringify(body)}:{})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'İşlem tamamlanamadı. Yeniden dene.');return data;
  }catch(e){if(controller.signal.aborted)throw Error('Bağlantı zaman aşımına uğradı. Yeniden dene.');throw e;}finally{clearTimeout(timer);}
 }
 const error=e=>say(e.message||'Bağlantı kurulamadı. Yeniden dene.',true);
 async function captcha(){
  challenge=null;$('#captcha').hidden=true;
  const c=await api('/api/auth/challenge',{});
  if(typeof c.id!=='string'||!c.image?.startsWith('data:image/png;base64,')||c.image.length>250000)throw Error('Güvenlik kodu alınamadı.');
  $('#captcha').src=c.image;$('#captcha').hidden=false;challenge=c.id;$('#answer').value='';
 }
 function renderLaunch(){
  const open=launch.phase==='open'||launch.phase==='normal',scheduled=launch.automaticOpening===true;
  const remaining=Math.max(0,Math.ceil((launch.publicOpeningAt-launch.serverTime-(performance.now()-received))/1000));
  const units=[Math.floor(remaining/86400),Math.floor(remaining/3600)%24,Math.floor(remaining/60)%60,remaining%60];
  ['days','hours','minutes','seconds'].forEach((n,i)=>{$('#'+n).textContent=String(units[i]).padStart(2,'0');});
  $('#countdown').hidden=open||!scheduled;$('#opening-status').textContent=open?'Core Akademi açıldı. Maceraya katıl!':scheduled?(remaining>0?'Büyük açılışa kalan süre':'Açılış durumu doğrulanıyor…'):launch.phase==='maintenance'?'Akademi bakımda. Kayıt durumunu buradan takip edebilirsin.':'Açılış takvimi duraklatıldı.';
  const date=launch.publicOpeningAt||1795194000000;
  $('#opening-date').textContent=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'numeric',month:'long',year:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit',hour12:false}).format(date)+' · Türkiye saati';
  for(const el of document.querySelectorAll('[data-register-label]'))el.textContent=open?'Maceraya katıl':'Ücretsiz ön kayıt ol';
  $('#gift-heading').textContent=open?'Maceranın ilk günlerinde yanında.':'İlk yol arkadaşın hazır.';
  if(scheduled&&remaining===0&&!open&&!atBoundary){atBoundary=true;void refresh();}
 }
 async function publicState(){const data=await api('/api/launch?realm=r2');const s=data.launch||data;
  if(!Number.isFinite(s.serverTime)||!['waiting','ended','maintenance','open','normal'].includes(s.phase))throw Error('Açılış durumu doğrulanamadı.');
  launch=s;received=performance.now();renderLaunch();
 }
 async function state(){
  const d=await api('/api/realm/academy-registration');$('#auth').hidden=true;$('#member').hidden=false;$('#who').textContent=me.account.username;
  $('#apply').hidden=d.registered;$('#apply').disabled=d.registrationOpen===false;$('#enter').hidden=!d.canPlay;
  $('#state').textContent=d.canPlay?'Core Akademi hazır. Karakterini seçerek maceraya katılabilirsin.':d.registered?'Ön kaydın tamamlandı. Açılışta bu hesapla Core Akademi’ye katılabilirsin.':'Hesabın hazır. Aşağıdaki butonla Akademi ön kaydını tamamla.';
  if(d.canPlay&&d.registered&&d.approved&&launch.phase==='waiting')$('#state').textContent='Erken giriş iznin verildi. Açılışı beklemeden Core Akademi’ye katılabilirsin.';
  if(d.approvalRequired)$('#state').textContent=d.registered?'Başvurun alındı. Yönetici onayı bekleniyor.':'Akademi şu anda izinli test erişiminde.';
  if(d.registered&&launch.phase==='maintenance')$('#state').textContent='Kaydın korunuyor. Core Akademi şu anda bakımda.';
 }
 async function refresh(initial=false){
  if(loading||busy)return;loading=true;$('#refresh').disabled=true;$('#submit').disabled=true;
  try{
   const [s,a]=await Promise.allSettled([publicState(),api('/api/auth/me')]);
   if(a.status==='rejected')throw a.reason;me=a.value;
   if(me.authenticated){await state();say('');}else{$('#auth').hidden=false;$('#member').hidden=true;if(!challenge&&mode==='register')await captcha();say('');}
   if(s.status==='rejected')throw s.reason;
  }catch(e){error(e);if(initial)$('#auth').hidden=false;}finally{loading=false;$('#refresh').disabled=false;$('#submit').disabled=false;}
 }
 function toggle(next){mode=next;$('#register-tab').setAttribute('aria-selected',String(mode==='register'));$('#login-tab').setAttribute('aria-selected',String(mode==='login'));
  for(const el of document.querySelectorAll('[data-register]')){el.hidden=mode!=='register';for(const input of el.querySelectorAll('input'))input.disabled=mode!=='register';}
  $('#form-title').textContent=mode==='register'?'Ücretsiz ön kayıt':'Hesabınla giriş yap';$('#username').maxLength=mode==='register'?24:254;$('#username-label').textContent=mode==='register'?'Kullanıcı adı':'Kullanıcı adı veya e-posta';$('#password').maxLength=mode==='register'?20:128;$('#password').minLength=mode==='register'?9:1;$('#password').autocomplete=mode==='register'?'new-password':'current-password';$('#submit').textContent=mode==='register'?'Hesap oluştur ve ön kayıt ol':'Hesabımla giriş yap';say('');
 }
 $('#register-tab').onclick=()=>{if(!busy){toggle('register');if(!challenge)void captcha().catch(error);}};$('#login-tab').onclick=()=>{if(!busy)toggle('login');};$('#renew').onclick=()=>{if(!busy)void captcha().catch(error);};
 $('#form').onsubmit=async event=>{
  event.preventDefault();if(busy)return;busy=true;$('#submit').disabled=true;say('İşlemin tamamlanıyor…');
  try{
   if(mode==='register'){
    if($('#password').value!==$('#confirmation').value)throw Error('Parolalar aynı olmalı.');if(!challenge)throw Error('Güvenlik kodunu yenile.');
    me=await api('/api/auth/register',{realmId:'r2',username:$('#username').value,email:$('#email').value,password:$('#password').value,passwordConfirmation:$('#confirmation').value,captchaId:challenge,captchaAnswer:$('#answer').value});
   }else me=await api('/api/auth/login',{login:$('#username').value,password:$('#password').value});
   if(!me.authenticated)throw Error('Oturum doğrulanamadı. Yeniden giriş yap.');$('#form').reset();await state();say('');
  }catch(e){error(e);if(mode==='register')try{await captcha();}catch{}}finally{busy=false;$('#submit').disabled=false;}
 };
 $('#apply').onclick=async()=>{if(busy)return;busy=true;$('#apply').disabled=true;try{await api('/api/realm/academy-registration',{},true);await state();say('Ön kaydın tamamlandı.');}catch(e){error(e);}finally{busy=false;$('#apply').disabled=false;}};
 $('#refresh').onclick=()=>{atBoundary=false;void refresh();};$('#logout').onclick=async()=>{if(busy)return;busy=true;try{await api('/api/auth/logout',{},true);me=null;}catch(e){error(e);}finally{busy=false;void refresh();}};
 const modal=$('#video-modal'),content=$('#video-content');let opener=null;
 const closeVideo=()=>{content.replaceChildren();modal.hidden=true;document.body.classList.remove('video-open');opener?.focus();};
 for(const button of document.querySelectorAll('[data-video]'))button.onclick=()=>{
  opener=button;modal.hidden=false;document.body.classList.add('video-open');content.replaceChildren();
  if(button.dataset.video==='gameplay'){const f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/KgtTQqdQFaU?autoplay=1&playsinline=1&rel=0';f.title='Core of Life oynanış videosu';f.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';f.allowFullscreen=true;content.append(f);}
  else{const v=document.createElement('video');v.src=button.dataset.src;v.controls=true;v.playsInline=true;v.preload='metadata';v.autoplay=true;v.setAttribute('aria-label','Core of Life tanıtım videosu');content.append(v);}
  $('#close-video').focus();
 };
 $('#close-video').onclick=closeVideo;modal.onclick=e=>{if(e.target===modal)closeVideo();};
 document.addEventListener('keydown',e=>{if(modal.hidden)return;if(e.key==='Escape')closeVideo();if(e.key==='Tab'){const el=content.querySelector('video,iframe');if(e.shiftKey&&document.activeElement===$('#close-video')){e.preventDefault();(el||$('#close-video')).focus();}else if(!e.shiftKey&&document.activeElement===el){e.preventDefault();$('#close-video').focus();}}});
 const tick=setInterval(()=>{if(!document.hidden)renderLaunch();},1000);
 const schedule=()=>{clearInterval(poll);poll=null;if(!document.hidden)poll=setInterval(()=>void refresh(),30000);};
 document.addEventListener('visibilitychange',()=>{schedule();if(!document.hidden)void refresh();});window.addEventListener('online',()=>void refresh());
 window.addEventListener('pagehide',()=>{clearInterval(tick);clearInterval(poll);});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 toggle(mode);renderLaunch();schedule();void refresh(true);
}
