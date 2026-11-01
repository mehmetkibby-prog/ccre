// Administrative UI only. All reads/writes use the existing authenticated,
// CSRF-protected native launch API. No database or gameplay routes are added.
export const ADMIN_STATUS_PATH='/admin/oyun-durumu';

export function panelBrowser(){
 const q=s=>document.querySelector(s),state=q('#state'),reason=q('#reason');
 let busy=false,csrfValue='';
 async function request(method='GET',body){
  const token=csrfValue||document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-yasam-csrf='))?.split('=').slice(1).join('=')||'';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch('/api/admin/launch',{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{...(body?{'content-type':'application/json','x-csrf-token':decodeURIComponent(token)}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||data.message||'Yönetici oturumu doğrulanamadı. Yönetici girişini kullanın.');
   return data;
  }finally{clearTimeout(timer);}
 }
 function show(data){
  const c=data.panel511;
  if(!c){state.textContent='Durum doğrulanamadı';reason.textContent='Hesap servisi R23 ile yeniden başlatılmalı.';return;}
  const mode=data.settings?.mode;
  state.textContent=c.confirmedOpen?'Oyun açık · doğrulandı':mode==='maintenance'?'Oyun bakımda':mode==='open'?'Açılış henüz doğrulanmadı':'Oyun kapalı';
  q('#detail').textContent='Panel kararı: '+(mode==='open'?'Açık':mode==='maintenance'?'Bakım':mode)+' · Oyun süreci: '+(c.phase==='maintenance'?'Bakım':c.jobsEnabled?'Çalışıyor':'Bekliyor')+' · Revizyon: '+data.settings.revision;
  reason.textContent=c.confirmedOpen?'Oyuncu girişi ve dünya işlemleri açık.':c.reason||'Oyunu açmak için Oyun Açık düğmesine basın.';
  q('#open').disabled=busy||c.canOpen!==true;
 }
 async function refresh(){const data=await request();show(data);return data;}
 async function save(mode){
  if(busy)return;busy=true;q('#open').disabled=true;q('#maintenance').disabled=true;
  q('#message').textContent=mode==='open'?'Açılış doğrulanıyor…':'Bakım kararı kaydediliyor…';
  try{
   const current=await request();
   const result=await request('POST',{action:'save',settings:{...current.settings,mode}});
   show(result);q('#message').textContent=mode==='maintenance'?'Bakım kaydedildi. İçerideki oyuncuların kayıtları tamamlanıp bağlantıları kapatılır.':result.panel511?.confirmedOpen?'Oyun açıldı.':'Açılış doğrulanamadı; güncel durumu kontrol edin.';
  }catch(error){
   q('#message').textContent=error.name==='AbortError'?'Yanıt süresi doldu. Güncel durum kontrol ediliyor.':error.message;
  }finally{
   busy=false;q('#maintenance').disabled=false;
   try{await refresh();}catch(error){state.textContent='Durum okunamadı';reason.textContent=error.message;}
  }
 }
 q('#open').addEventListener('click',()=>save('open'));
 q('#maintenance').addEventListener('click',()=>save('maintenance'));
 q('#refresh').addEventListener('click',()=>refresh().catch(error=>{reason.textContent=error.message;}));
 void (async()=>{const response=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});const me=await response.json();csrfValue=me.csrfToken||'';await refresh();})().catch(error=>{state.textContent='Yönetici girişi gerekli';reason.textContent=error.message;});
}

export function adminStatusHtml(nonce){
 return `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Core of Life · Oyun durumu</title>
 <style nonce="${nonce}">*{box-sizing:border-box}body{margin:0;padding:24px;background:#07130f;color:#f6eed6;font:17px/1.55 system-ui}main{max-width:760px;margin:6vh auto;padding:28px;border:1px solid #456b55;border-radius:16px;background:#10231b}h1{font-size:28px}h2{font-size:23px;color:#a8e5ba}button,a{display:inline-block;margin:6px 6px 6px 0;padding:12px 16px;border:1px solid #6a9b7c;border-radius:8px;background:#244e37;color:inherit;text-decoration:none;font:inherit}button{cursor:pointer}button:disabled{opacity:.45;cursor:default}#reason{white-space:pre-wrap}#message{color:#ffdba2}small{color:#b9cdbf}</style>
 <main><h1>Oyun durumu</h1><h2 id="state" role="status">Kontrol ediliyor…</h2><small id="detail"></small><p id="reason"></p><p id="message" role="alert"></p>
 <button id="open" disabled>Oyun Açık</button><button id="maintenance">Bakıma Al</button><button id="refresh">Durumu Yenile</button><p><a href="/admin">Ana yönetim paneli</a><a href="/admin-login">Yönetici girişi</a></p>
 <small>Eski dünya zamanı uyarısı varsa ana panelde Dünya Canı ayarını kaydedin. Bu işlem için Dünya Döngüsünü Sıfırla düğmesini kullanmayın. Buradaki durum sunucudan okunur; seçim yapmak tek başına oyunu açmaz.</small></main>
 <script nonce="${nonce}">(${panelBrowser.toString()})();</script></html>`;
}
