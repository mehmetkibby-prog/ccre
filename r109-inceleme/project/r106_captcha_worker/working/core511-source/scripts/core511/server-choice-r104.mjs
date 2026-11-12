import {randomBytes} from 'node:crypto';
const catalogCache=new WeakMap();
async function publicChoiceStatusR104(method,{launch,catalog}){
 const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
 if(method==='HEAD')return new Response(null,{headers});
 try{
  if(typeof catalog!=='function')throw Error('catalog unavailable');
  let cached=catalogCache.get(catalog);
  if(!cached||Date.now()-cached.at>=10000){
   cached={at:Date.now(),pending:Promise.resolve().then(()=>catalog())};catalogCache.set(catalog,cached);
   cached.pending.catch(()=>{if(catalogCache.get(catalog)===cached)catalogCache.delete(catalog);});
  }
  const rows=await cached.pending;
  const realms=['r1','r2'].map(id=>{
   const row=rows.find(r=>r.id===id);
   const label=id==='r2'&&launch.phase==='waiting'?'Ön Kayıt':row?.status==='maintenance'?'Bakımda':row?.status==='closed'?'Kapalı':row?.status==='full'?'Dolu':row?.status==='open'&&['Yoğun','Boş'].includes(row.load)?row.load:'Bağlantı bekleniyor';
   return {id,label};
  });
  return Response.json({realms},{headers});
 }catch{return Response.json({error:'Sunucu durumu alınamadı.'},{status:503,headers});}
}
function choiceStatusBrowserR104(){
 let pending=false,controller=null,timer=null,closed=false;
 async function refresh(){
  if(closed||pending||document.visibilityState==='hidden')return;
  pending=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),5000);
  try{
   const response=await fetch('/?servers=1&view=status',{signal:controller.signal,cache:'no-store',credentials:'omit'});
   if(!response.ok)throw Error('status unavailable');const data=await response.json();
   if(!Array.isArray(data.realms))throw Error('invalid status');
   for(const row of data.realms){
    if(!['r1','r2'].includes(row.id)||!['Ön Kayıt','Yoğun','Boş','Dolu','Bakımda','Kapalı','Bağlantı bekleniyor'].includes(row.label))continue;
    const badge=document.querySelector('[data-status="'+row.id+'"]');if(!badge)continue;
    badge.textContent=row.label;badge.classList.toggle('prereg',row.label==='Ön Kayıt');badge.classList.toggle('busy',['Yoğun','Dolu'].includes(row.label));
   }
  }catch{
   if(!closed)for(const badge of document.querySelectorAll('[data-status]:not(.prereg)')){badge.textContent='Bağlantı bekleniyor';badge.classList.remove('busy');}
  }finally{clearTimeout(timeout);pending=false;controller=null;}
 }
 const visible=()=>{if(document.visibilityState==='visible')void refresh();};
 const start=()=>{closed=false;clearInterval(timer);timer=setInterval(refresh,15000);void refresh();};
 addEventListener('pagehide',()=>{closed=true;clearInterval(timer);controller?.abort();});
 addEventListener('pageshow',start);document.addEventListener('visibilitychange',visible);start();
}
export function serverChoiceR104(method,{intent,launch,asset,view,catalog}){
 if(view==='status')return publicChoiceStatusR104(method,{launch,catalog});
 const register=intent==='register',mode=register?'register':'login',nonce=randomBytes(24).toString('base64');
 const waiting=launch.phase==='waiting',ready=['open','normal'].includes(launch.phase);
 const academy=register||!ready?'/akademi-kayit?intent='+mode:'/?chosenRealm=r2&intent='+mode;
 const html=`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0c1612"><title>Sunucunu seç · Core of Life</title><style nonce="${nonce}">
 *{box-sizing:border-box}body{margin:0;background:#0b1511;color:#ede9dc;font:15px/1.5 system-ui,sans-serif}a{color:inherit;text-decoration:none}a:focus-visible{outline:3px solid #f1d29a;outline-offset:5px}.wrap{width:min(1100px,100%);margin:auto;padding:0 28px}header{border-bottom:1px solid #b9a16c30}header .wrap{display:flex;justify-content:space-between;align-items:center;gap:15px;min-height:84px}.brand{font:600 23px Georgia;letter-spacing:2.8px}.brand small{font:9px system-ui;letter-spacing:4px;display:block;color:#a7bca8;margin-top:6px}.back{font-size:12px;color:#b8c9b5}main{padding-top:45px!important;padding-bottom:32px!important}.eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#d4bb86;margin:0 0 14px}h1{font:normal 52px/1.1 Georgia;margin:0 0 16px}p{color:#acbfab}.modes{display:flex;gap:7px;margin:23px 0 28px}.modes a{padding:10px 18px;border-radius:5px;border:1px solid #81967555;font-size:13px}.modes [aria-current=page]{background:#dcc18a;color:#142219;border-color:#dcc18a}.choices{display:grid;grid-template-columns:1fr 1fr;gap:24px}.card{position:relative;display:flex;flex-direction:column;border:1px solid #9bac7455;border-radius:12px;background:#13251b;overflow:hidden;transition:border-color .15s}.card:hover{border-color:#e4c88a}.badge{position:absolute;top:14px;right:14px;z-index:1;display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border:1px solid #a3bf9b77;border-radius:30px;background:#101e16f2;color:#d5e5ca;font-size:12px;font-weight:650;box-shadow:0 2px 12px #0004}.badge:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}.badge.prereg,.badge.busy{color:#f0d796;border-color:#d6b87999}.poster{width:100%;height:190px;object-fit:cover;display:block}.details{padding:24px;flex:1;display:flex;flex-direction:column}.tag{color:#b5cea9;text-transform:uppercase;letter-spacing:1.8px;font-size:9px}.card h2{font:normal 33px Georgia;margin:10px 0}.card p{font-size:14px;margin:0 0 24px}.cta{margin-top:auto;border-top:1px solid #8eaa6c30;padding-top:16px;display:flex;justify-content:space-between;color:#e6c88c;font-size:14px;font-weight:650}.note{font-size:12px;margin:23px 0 0}.note strong{color:#c7d4c0;font-weight:500}
 @media(max-width:650px){.wrap{padding:0 18px}header .wrap{min-height:65px}.brand{font-size:18px;letter-spacing:2px}.brand small{font-size:7px;letter-spacing:3px}.back{font-size:11px}main{padding-top:26px!important}h1{font-size:39px}.eyebrow{font-size:9px;letter-spacing:2px}main>p{font-size:13px}.modes{margin:18px 0}.choices{grid-template-columns:1fr;gap:16px}.poster{height:90px}.details{padding:17px 19px}.card h2{font-size:28px;margin:6px 0}.card p{font-size:12px;margin:0 0 13px}.cta{padding-top:12px;font-size:13px}.tag{font-size:8px}.note{font-size:11px}}
 @media(prefers-reduced-motion:reduce){.card{transition:none}}
 </style></head><body><header><div class="wrap"><a class="brand" href="https://coreoflife.net/">CORE OF LIFE<small>YAŞAM ÇEKİRDEĞİ</small></a><a class="back" href="https://coreoflife.net/">← Ana site</a></div></header><main class="wrap"><div class="eyebrow">Önce dünyanı seç</div><h1>Sunucunu seç</h1><p>${register?'Kayıt olmak':'Giriş yapmak'} istediğin sunucuyu seç.</p><nav class="modes" aria-label="Hesap işlemi"><a href="/?servers=1&amp;intent=login" ${!register?'aria-current="page"':''}>Giriş yap</a><a href="/?servers=1&amp;intent=register" ${register?'aria-current="page"':''}>Kayıt ol</a></nav><div class="choices">
 <a class="card" data-realm="r1" href="/?chosenRealm=r1&amp;intent=${mode}"><img class="poster" src="${asset('efsane')}" width="1280" height="640" alt="Core Efsane dünyası"><span class="badge" data-status="r1" role="status">Kontrol ediliyor</span><div class="details"><span class="tag">Efsanenin doğduğu dünya</span><h2>Core Efsane</h2><p>Kahramanların buluştuğu ana dünya. Hikâyene kaldığın yerden devam et.</p><span class="cta">${register?'Efsane’ye kayıt ol':'Efsane’ye giriş yap'}<span aria-hidden="true">→</span></span></div></a>
 <a class="card" data-realm="r2" href="${academy}"><img class="poster" src="${asset('akademi')}" width="1280" height="640" alt="Core Akademi dünyası"><span class="badge${waiting?' prereg':''}" data-status="r2" role="status">${waiting?'Ön Kayıt':'Kontrol ediliyor'}</span><div class="details"><span class="tag">${waiting?'Yeni dünya · Ön kayıt':'Yeni bir hikâye'}</span><h2>Core Akademi</h2><p>${waiting?'20 Kasım Cuma, 20.00’de açılıyor. Ön kaydını tamamla, başlangıç hediyelerin hazır olsun.':'Kahramanını seç, dostlarını topla. Akademi’deki macerana katıl.'}</p><span class="cta">${waiting?'Akademi ön kaydına git':register?'Akademi’ye kayıt ol':'Akademi’ye giriş yap'}<span aria-hidden="true">→</span></span></div></a>
 </div><p class="note"><strong>Tek hesap, iki ayrı dünya.</strong> Efsane ve Akademi’de aynı hesabı kullanabilirsin; karakterlerin ve ilerlemen ayrı tutulur.</p></main><script nonce="${nonce}">(${choiceStatusBrowserR104.toString()})();</script></body></html>`;
 return new Response(method==='HEAD'?null:html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','content-security-policy':`default-src 'none'; connect-src 'self'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`}});
}
