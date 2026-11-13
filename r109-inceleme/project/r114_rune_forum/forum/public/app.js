'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={horn:'M3 10h4l12-5v14L7 14H3z M7 14l2 6h3l-2-5 M22 9v6',scroll:'M6 4h14v13H8V6a2 2 0 0 0-4 0v2h4 M8 17H4v2a2 2 0 0 0 4 0v-2 M11 8h6 M11 11h6 M11 14h4',tool:'M14 5a5 5 0 0 0-5 7L3 18a2 2 0 0 0 3 3l6-6a5 5 0 0 0 7-6l-4 3-3-3 3-4z',calendar:'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 17h2',chat:'M3 4h18v13H9l-6 4z M7 8h10 M7 12h6',book:'M12 5Q7 2 3 4v16q5-2 9 0q4-2 9 0V4q-4-2-9 1v15',shield:'M12 2l8 4v6q0 6-8 10q-8-4-8-10V6z M8 12l3 3 5-6',bag:'M5 7h14l1 14H4z M8 7V5a4 4 0 0 1 8 0v2',spark:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',search:'M17 17l5 5 M19 11a8 8 0 1 1-16 0a8 8 0 0 1 16 0',lock:'M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4'};
const icon=id=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[id]??paths.chat}"/></svg>`;
const state={user:null,csrf:null,categories:[],topics:[],authMode:'register',demo:false,nav:0};
const time=value=>new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const badge=t=>`<span class="tag ${t.realm==='Akademi'?'blue':t.realm==='Efsane'?'green':'muted'}">${esc(t.realm)}</span>`;
const initials=name=>String(name||'?').slice(0,1).toLocaleUpperCase('tr');

async function api(route,options={}){
  // Downloadable design preview is read-only; it never collects credentials.
  if(window.__FORUM_PREVIEW__){
    const data=window.__FORUM_PREVIEW__,url=new URL(route,'http://preview');
    if(options.method==='POST')throw Error('Bu dosya bir taslaktır; gerçek hesap veya gönderi oluşturmaz.');
    if(url.pathname==='/session')return{user:null,csrf:null,demo:true};
    if(url.pathname==='/categories')return data.categories;
    if(url.pathname==='/captcha')return{image:data.captcha};
    if(url.pathname==='/topics'){
      const c=url.searchParams.get('category'),q=url.searchParams.get('search');
      return{topics:data.topics.filter(t=>(!c||t.category===c)&&(!q||t.title.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')))),hasMore:false,page:0};
    }
    const id=url.pathname.match(/^\/topics\/(\d+)$/)?.[1];if(id){const topic=data.topics.find(t=>t.id===Number(id));if(!topic)throw Error('Konu bulunamadı.');return{topic,replies:[],hasMore:false,page:0};}
  }
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch('/forum/api'+route,{...options,signal:controller.signal,credentials:'same-origin',headers:{'Content-Type':'application/json',...(state.csrf?{'X-CSRF-Token':state.csrf}:{}),...options.headers}});
    const data=await response.json();if(!response.ok)throw Error(data.error??'İşlem tamamlanamadı.');return data;
  }catch(e){if(e.name==='AbortError')throw Error('Bağlantı gecikti. Tekrar dene.');throw e;}finally{clearTimeout(timeout);}
}
function toast(text){const el=$('#toast');el.textContent=text;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,4500);}
function account(){
  document.body.classList.toggle('logged-in',!!state.user);
  $('#account-actions').innerHTML=state.user?`<span class="account-name">${esc(state.user.name)}${state.user.role==='admin'?' · Yönetici':''}</span><button class="button outline" id="logout">Çıkış</button>`:'<button class="button outline" data-auth="login">Giriş yap</button><button class="button gold" data-auth="register">Üye ol</button>';
  $('#preview-label').hidden=!state.demo;
}
async function refreshCategories(){const result=await api('/categories');state.categories=result.categories;$('#forum-stats').innerHTML=`<div><span>Konular</span><b>${Number(result.topicCount)}</b></div><div><span>Üyeler</span><b>${Number(result.memberCount)}</b></div>${state.demo?'<small>Ön izlemedeki örnek içerik sayılarıdır.</small>':''}`;}
function categoryRows(group){
 return state.categories.filter(c=>c.group===group).map(c=>`<a class="category-row" href="#category/${c.id}"><span class="category-icon">${icon(c.icon)}</span><div class="category-copy"><strong>${esc(c.name)}</strong><p>${esc(c.description)}</p></div><div class="row-count"><b>${Number(c.topics)}</b>konu</div><div class="row-latest"><strong>${esc(c.latest?.title??'İlk konuyu sen aç')}</strong><small><span class="mini-avatar">${initials(c.latest?.name)}</span>${esc(c.latest?.name??'Henüz paylaşım yok')}</small></div></a>`).join('');
}
function forumGroup(group,title,caption,lock){return`<section class="forum-section"><div class="section-band"><h3>${title}</h3><small>${icon(lock?'lock':'chat')}${caption}</small></div>${categoryRows(group)}</section>`;}
function rows(topics){return topics.map(t=>`<article class="topic-row"><span class="avatar ${t.role==='admin'?'':'member'}">${initials(t.name)}</span><div class="topic-row-copy">${badge(t)}${t.pinned?' <span class="tag">Sabit</span>':''}<a href="#topic/${t.id}">${esc(t.title)}</a><small>${esc(t.name)} · ${esc(state.categories.find(c=>c.id===t.category)?.name)} · ${time(t.updated)}</small></div><div class="replies"><b>${Number(t.replies)}</b>yanıt</div></article>`).join('');}
function header(title,detail='',eyebrow='CORE OF LIFE'){$('#section-title').textContent=title;$('#section-title').classList.toggle('topic-title',location.hash.startsWith('#topic/'));$('#section-eyebrow').textContent=eyebrow;$('#breadcrumb-detail').textContent=detail?' / '+detail:'';$('#new-topic').hidden=false;}
function officialNews(){
 $('#latest-official').innerHTML=state.topics.filter(t=>state.categories.find(c=>c.id===t.category)?.adminOnly).slice(0,3).map(t=>`<a class="news-item" href="#topic/${t.id}">${badge(t)}<strong>${esc(t.title)}</strong><small>Core Yönetim · ${time(t.updated)}</small></a>`).join('');
}
function mainScroll(){if(location.hash)$('#main').scrollIntoView({block:'start'});}
async function render(){
 const seq=++state.nav;
 try{
   const [kind,id]=location.hash.slice(1).split('/'),content=$('#forum-content');
   if(kind==='topic'){
     const data=await api('/topics/'+encodeURIComponent(id));if(seq!==state.nav)return;
     const t=data.topic,c=state.categories.find(c=>c.id===t.category);header(t.title,c?.name,'TOPLULUK / '+(c?.name??'KONU').toLocaleUpperCase('tr'));$('#new-topic').hidden=true;
     const canReply=state.user&&(!c.adminOnly||state.user.role==='admin')&&(!t.locked||state.user.role==='admin');
     content.innerHTML=`<div class="post-meta">${badge(t)}${c.adminOnly?'<span class="tag">Resmî duyuru</span>':''}${t.pinned?'<span class="tag">Sabit konu</span>':''}${t.locked?'<span class="tag">Yanıtlara kapalı</span>':''}</div>${post(t)}${data.replies.map(post).join('')}${data.hasMore?'<button class="button outline" id="more-replies">Sonraki yanıtlar →</button>':''}${state.user?.role==='admin'?`<div class="moderation"><button class="button outline" data-moderate="pin" data-id="${t.id}">${t.pinned?'Sabitlemeyi kaldır':'Sabitle'}</button><button class="button outline" data-moderate="lock" data-id="${t.id}">${t.locked?'Yanıtları aç':'Yanıtları kilitle'}</button><button class="button outline" data-moderate="hide" data-id="${t.id}">Konuyu gizle</button></div>`:''}${canReply?`<form class="reply-box" id="reply-form" data-id="${t.id}"><h3>Sohbete katıl.</h3><div class="field"><label for="reply-body">Yanıtın</label><textarea id="reply-body" name="body" rows="4" minlength="2" maxlength="10000" required placeholder="Mesajını yaz..."></textarea></div><p class="form-error" id="reply-error" role="alert"></p><button class="button gold">Yanıtı gönder →</button></form>`:`<div class="access-note">${icon('lock')}${c.adminOnly?'Bu bölümde yalnız yöneticiler konu ve yanıt paylaşabilir.':t.locked?'Bu konu yeni yanıtlara kapalı.':'Yanıt yazmak için giriş yap veya üye ol.'}${!state.user&&!c.adminOnly&&!t.locked?'<button class="text-button" data-auth="login">Giriş yap →</button>':''}</div>`}`;
     let page=0;$('#more-replies')?.addEventListener('click',async()=>{try{const next=await api('/topics/'+t.id+'?page='+(++page));$('#more-replies').insertAdjacentHTML('beforebegin',next.replies.map(post).join(''));$('#more-replies').hidden=!next.hasMore;}catch(e){toast(e.message);}});
   }else if(kind==='category'||kind==='search'){
     const c=state.categories.find(c=>c.id===id),query=kind==='search'?decodeURIComponent(id??''):'';
     if(kind==='category'&&!c)throw Error('Bölüm bulunamadı.');
     header(c?.name??'Arama sonuçları',c?.name??query,c?.adminOnly?'YÖNETİMDEN':'TOPLULUK');
     const params=new URLSearchParams(c?{category:c.id}:{search:query});
     const data=await api('/topics?'+params);if(seq!==state.nav)return;
     content.innerHTML=`${c?.adminOnly?`<div class="access-note">${icon('lock')}Bu bölümde yalnız yöneticiler paylaşım yapabilir. Herkes okuyabilir.</div>`:''}<div class="topic-list">${data.topics.length?rows(data.topics):'<div class="empty-state">Henüz konu bulunmuyor.</div>'}</div>${data.hasMore?'<div class="pagination"><button class="button outline" id="more-topics">Daha fazla konu →</button></div>':''}`;
     let page=0;$('#more-topics')?.addEventListener('click',async()=>{try{params.set('page',String(++page));const next=await api('/topics?'+params);$('.topic-list').insertAdjacentHTML('beforeend',rows(next.topics));$('#more-topics').hidden=!next.hasMore;}catch(e){toast(e.message);}});
     if(c?.adminOnly&&state.user?.role!=='admin')$('#new-topic').hidden=true;
   }else{
     header(kind==='official'?'Yönetimden haberler':'Topluluk forumu');
     content.innerHTML=forumGroup('official','Yönetimden','Yalnızca yönetici paylaşır',true)+(kind==='official'?'':forumGroup('players','Oyuncu topluluğu','Üyelere açık',false))+`<div class="recent-heading"><h3>Son konuşulanlar</h3><span>TOPLULUKTAN</span></div>${rows(state.topics.filter(t=>!state.categories.find(c=>c.id===t.category)?.adminOnly).slice(0,4))}`;
   }
 }catch(e){$('#forum-content').innerHTML=`<div class="empty-state"><p>${esc(e.message)}</p><button class="button outline" id="retry-forum">Tekrar dene</button></div>`;}
}
function post(t){return`<article class="topic-post"><header class="post-head"><span class="avatar ${t.role==='admin'?'':'member'}">${initials(t.name)}</span><div><strong>${esc(t.name)}</strong><small>${t.role==='admin'?'Core of Life Yönetimi':'Topluluk üyesi'}</small></div><time>${time(t.created)}</time></header><p class="post-body">${esc(t.body)}</p></article>`;}
let captchaSerial=0;
async function captcha(){
 const seq=++captchaSerial;$('#renew-captcha').disabled=true;$('#auth-submit').disabled=true;$('#auth-captcha').value='';$('#captcha-image').removeAttribute('src');
 try{const data=await api('/captcha');if(seq!==captchaSerial)return;$('#captcha-image').src=data.image;$('#auth-submit').disabled=false;}catch(e){if(seq===captchaSerial)$('#auth-error').textContent=e.message;}finally{if(seq===captchaSerial)$('#renew-captcha').disabled=false;}
}
async function auth(mode){
 state.authMode=mode;const register=mode==='register',recover=mode==='recover';$('#auth-form').reset();$('#auth-error').textContent='';
 $$('.register-only').forEach(el=>el.hidden=!register);$('#auth-email').required=register;$('#auth-repeat').required=register||recover;$$('.repeat-only').forEach(el=>el.hidden=!(register||recover));$$('.recovery-only').forEach(el=>el.hidden=!recover);$('#auth-recovery').required=recover;$('#auth-terms').required=register;
 $('#auth-title').textContent=register?'Hikâyeye sen de katıl.':'Tekrar hoş geldin.';$('#auth-eyebrow').textContent=register?'TOPLULUĞA KATIL':'FORUM HESABIN';$('#auth-intro').textContent=register?'Forum hesabını oluştur, sohbetin bir parçası ol.':'Sohbetine ve yol arkadaşlarına geri dön.';
 $('#auth-submit').textContent=register?'Hesabımı oluştur →':'Giriş yap →';$('#auth-password').autocomplete=register?'new-password':'current-password';
 $('#auth-switch').innerHTML=register?'Zaten üye misin? <button class="text-button" data-auth="login">Giriş yap</button>':'Henüz üye değil misin? <button class="text-button" data-auth="register">Hesap oluştur</button>';
 if(recover){$('#auth-title').textContent='Hesabına geri dön.';$('#auth-intro').textContent='Kurtarma anahtarını ve yeni parolanı gir. Eski oturumlar kapatılır.';$('#auth-submit').textContent='Yeni parolayı kaydet →';$('#auth-password').autocomplete='new-password';}
 $('#auth-switch').innerHTML+=recover?' <button class="text-button" data-auth="login">Girişe dön</button>':' <button class="text-button" data-auth="recover">Parolamı unuttum</button>';
 if(!$('#auth-dialog').open)$('#auth-dialog').showModal();$('#auth-name').focus();await captcha();
}
function compose(){
 if(!state.user){void auth('login');return;}
 const available=state.categories.filter(c=>!c.adminOnly||state.user.role==='admin');
 $('#compose-form').reset();$('#compose-error').textContent='';$('#compose-category').innerHTML=available.map(c=>`<option value="${c.id}">${esc(c.name)}${c.adminOnly?' · Yönetici':''}</option>`).join('');
 const selected=location.hash.match(/^#category\/(.+)$/)?.[1];if(available.some(c=>c.id===selected))$('#compose-category').value=selected;
 $('#compose-admin').hidden=state.user.role!=='admin';$('#compose-dialog').showModal();
}
document.addEventListener('click',async event=>{
 const target=event.target.closest('button,a');if(!target)return;
 if(target.dataset.auth){event.preventDefault();void auth(target.dataset.auth);}
 if(target.hasAttribute('data-close'))target.closest('dialog').close();
 if(target.id==='rules-link')$('#rules-dialog').showModal();
 if(target.id==='new-topic')compose();
 if(target.id==='renew-captcha')void captcha();
 if(target.id==='retry-forum')void boot();
 if(target.id==='logout'){try{await api('/logout',{method:'POST',body:'{}'});state.user=null;state.csrf=null;account();await render();toast('Çıkış yapıldı.');}catch(e){toast(e.message);}}
 if(target.dataset.moderate){
   if(target.dataset.moderate==='hide'&&!confirm('Bu konu forumdan gizlensin mi?'))return;
   try{await api('/topics/'+target.dataset.id+'/moderate',{method:'POST',body:JSON.stringify({action:target.dataset.moderate})});await refreshCategories();if(target.dataset.moderate==='hide')location.hash='';else await render();toast('Konu güncellendi.');}catch(e){toast(e.message);}
 }
});
$('#search-form').addEventListener('submit',e=>{e.preventDefault();location.hash='search/'+encodeURIComponent($('#search').value.trim());});
$('#auth-form').addEventListener('submit',async e=>{
 e.preventDefault();const form=new FormData(e.target),register=state.authMode==='register',recover=state.authMode==='recover';$('#auth-error').textContent='';
 if((register||recover)&&form.get('password')!==form.get('repeat')){$('#auth-error').textContent='Parolalar eşleşmiyor.';return;}
 $('#auth-submit').disabled=true;
 try{const result=await api(register?'/register':recover?'/recover':'/login',{method:'POST',body:JSON.stringify({name:form.get('name'),recovery:form.get('recovery'),password:form.get('password'),email:form.get('email'),terms:form.get('terms')==='on',captcha:form.get('captcha')})});state.user=result.user;state.csrf=result.csrf;e.target.reset();$('#auth-dialog').close();if(result.recoveryCode){$('#recovery-code').value=result.recoveryCode;$('#recovery-dialog').showModal();}account();await refreshCategories();await render();toast(register?'Forum hesabın oluşturuldu. Hoş geldin!':'Hoş geldin, '+state.user.name+'.');}catch(error){$('#auth-error').textContent=error.message;await captcha();}finally{if($('#captcha-image').hasAttribute('src'))$('#auth-submit').disabled=false;}
});
$('#compose-form').addEventListener('submit',async e=>{
 e.preventDefault();const form=new FormData(e.target),button=e.target.querySelector('[type=submit]');button.disabled=true;$('#compose-error').textContent='';
 try{const result=await api('/topics',{method:'POST',body:JSON.stringify({category:form.get('category'),realm:form.get('realm'),title:form.get('title'),body:form.get('body'),pinned:form.get('pinned')==='on',locked:form.get('locked')==='on'})});$('#compose-dialog').close();await refreshCategories();state.topics=(await api('/topics')).topics;officialNews();location.hash='topic/'+result.id;toast('Konun yayınlandı.');}catch(error){$('#compose-error').textContent=error.message;}finally{button.disabled=false;}
});
document.addEventListener('submit',async e=>{
 if(e.target.id!=='reply-form')return;e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;
 try{await api('/topics/'+e.target.dataset.id+'/reply',{method:'POST',body:JSON.stringify({body:new FormData(e.target).get('body')})});await render();toast('Yanıtın yayınlandı.');}catch(error){$('#reply-error').textContent=error.message;button.disabled=false;}
});
$('#recovery-dialog').addEventListener('close',()=>{$('#recovery-code').value='';});
window.addEventListener('hashchange',()=>{void render();mainScroll();});
$$('[data-icon]').forEach(el=>el.insertAdjacentHTML('afterbegin',icon(el.dataset.icon)));
async function boot(){try{const [session,,topics]=await Promise.all([api('/session'),refreshCategories(),api('/topics')]);Object.assign(state,session);state.topics=topics.topics;account();officialNews();await render();}catch(e){$('#forum-content').innerHTML=`<div class="empty-state"><p>${esc(e.message)}</p><button class="button outline" id="retry-forum">Tekrar dene</button></div>`;}}
void boot();
