import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const deps=process.env.R118_UI_TEST_DEPS??'/tmp/royal-ui-r118-tests/node_modules';
const core=path.resolve(import.meta.dirname,'../../r109_latency_completion/working/core511-source/scripts/core511');
const {readRoyalR118,createRoyalUIR118,validRoyalPendingR118}=await import(pathToFileURL(path.join(core,'royal-client-r118.mjs')));
const {adminRequestR118,validateRoyalAdminR118,createRoyalAdminR118}=await import(pathToFileURL(path.join(core,'royal-admin-client-r118.mjs')));
const {validateChampionsAdminR118,createChampionsAdminR118}=await import(pathToFileURL(path.join(core,'champions-admin-client-r118.mjs')));
const {Window}=await import(pathToFileURL(path.join(deps,'happy-dom/lib/index.js')));
const React=await import(pathToFileURL(path.join(deps,'react/index.js')));
const {createRoot}=await import(pathToFileURL(path.join(deps,'react-dom/client.js')));
const kinds=['weapon','armor','helmet','shoes','necklace'];
const royalConfig=()=>({enabled:true,recipes:Object.fromEntries(kinds.map(key=>[key,{costs:[{itemId:'material:emerald_dust',amount:8},{itemId:'material:royal_crown',amount:1}]}]))});
const royalCatalog=[{id:'material:emerald_dust',name:'Zümrüt Tozu',maxAmount:1000000},{id:'material:royal_crown',name:'Kraliyet Tacı',maxAmount:1000000}];
const status=()=>({revision:3,enabled:true,champion:true,bonusPercent:8,location:{salvage:{area:'bazaar',x:1200,y:390,radius:245},transform:{area:'bazaar',x:1740,y:390,radius:245}},materials:{emerald_dust:40,royal_crown:3},items:[{id:'emerald-fixture',kind:'armor',role:'muhafiz',name:'Sonsuz Kadim Zümrüt Zırhı',power:100,royalPower:108,royalName:'Hükümdar Kraliyet Zırhı',infinite:true,itemStamp:'version-three'}],recipes:Object.fromEntries(kinds.map(key=>[key,{costs:[{itemId:'material:emerald_dust',name:'Zümrüt Tozu',amount:8,available:40,missing:0},{itemId:'material:royal_crown',name:'Kraliyet Tacı',amount:1,available:3,missing:0}]}]))});
const species=[{key:'ivory_guard',name:'Fildişi Muhafız',count:12},{key:'golden_lion',name:'Altın Yeleli Arslan',count:12},{key:'crescent_hunter',name:'Hilal Avcısı',count:12},{key:'royal_colossus',name:'Saltanat Devi',count:12}];
const mapConfig=()=>({enabled:true,monsters:Object.fromEntries(species.map(row=>[row.key,{name:row.name,hp:1000,damage:100,xp:100,essence:5,respawnSeconds:30,loot:{royal_crown:{chance:2,min:1,max:1},emerald:{chance:0,min:1,max:1}}}]))});
const response=(value,status=200)=>({ok:status>=200&&status<300,status,json:async()=>value});
async function dom(){
 const window=new Window({url:'https://royal-ui-fixture.invalid',width:390,height:844});
 for(const key of ['document','HTMLElement','Node','Event','MouseEvent','CustomEvent','location','sessionStorage'])globalThis[key]=window[key];globalThis.window=window;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 return {window,host,root,render:element=>React.act(async()=>root.render(element)),click:node=>React.act(async()=>node.dispatchEvent(new MouseEvent('click',{bubbles:true}))),change:(node,value)=>React.act(async()=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));}),flush:()=>React.act(async()=>{}),close:async()=>{await React.act(async()=>root.unmount());window.happyDOM.abort();}};
}
const button=(host,text)=>[...host.querySelectorAll('button')].find(node=>node.textContent===text);
const open=page=>React.act(async()=>window.dispatchEvent(new CustomEvent('core-royal-r118',{detail:page})));

test('bounded reads reject broken, unauthorized and timed-out responses without AbortSignal.any',async()=>{
 const before=fetch,any=AbortSignal.any;AbortSignal.any=undefined;
 try{
  globalThis.fetch=async()=>response({});await assert.rejects(readRoyalR118(),/eksik/);
  globalThis.fetch=async()=>response({error:'Oturum süren doldu'},401);await assert.rejects(readRoyalR118(),e=>e.status===401);
  globalThis.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('abort'),{name:'AbortError'})),{once:true}));
  await assert.rejects(readRoyalR118({timeoutMs:10}),/zamanında/);
  globalThis.fetch=async()=>response(status());assert.equal((await readRoyalR118()).revision,3);
 }finally{globalThis.fetch=before;AbortSignal.any=any;}
});

test('admin requests use authenticated CSRF route, reject missing revisions, and clear timeouts',async()=>{
 const view=await dom(),before=fetch;document.cookie='yasam-csrf-local=token%2Bvalue';
 try{
  let call;globalThis.fetch=async(url,options)=>{call={url,options};return response({royal:{revision:4,config:royalConfig(),catalog:royalCatalog}});};
  const result=await adminRequestR118('royal',{action:'royal_admin_read_r118'});assert.equal(result.revision,4);assert.equal(call.url,'/api/admin?core511=royal-r118');assert.equal(call.options.headers['x-csrf-token'],'token+value');assert.equal(call.options.credentials,'same-origin');
  globalThis.fetch=async()=>response({royal:{config:royalConfig()}});await assert.rejects(adminRequestR118('royal',{}),/eksik/);
  globalThis.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('abort'),{name:'AbortError'})),{once:true}));await assert.rejects(adminRequestR118('royal',{},{timeoutMs:10}),/zaman aşımına/);
 }finally{globalThis.fetch=before;await view.close();}
});

test('royal transform requires review, prevents duplicate submission, and replays same request after uncertain response',async()=>{
 const view=await dom(),before=fetch;let reads=0,changed=0,resolvePost;const calls=[];
 globalThis.fetch=async()=>{reads++;return response(status());};
 const post=async(url,payload)=>{calls.push({url,payload});if(calls.length===1)return await new Promise((resolve,reject)=>{resolvePost={resolve,reject};});return {message:'Dönüştürüldü.'};};
 const {Host}=createRoyalUIR118(React);const props={own:{id:'test-player',name:'Şampiyon',area:'bazaar',x:1740,y:390},world:{area:'bazaar'},joined:true,post,onChanged:async()=>{changed++;}};
 try{
  await view.render(React.createElement(Host,props));assert.equal(reads,0,'no backgroundpolling or load until useropens');await open('transform');assert.equal(reads,1);
  await view.change(view.host.querySelector('select'),'emerald-fixture');await view.click(button(view.host,'Dönüşümü incele'));assert.equal(calls.length,0,'reviewdoesnotconsumeanything');assert.match(view.host.textContent,/Efsunların, taşların ve geliştirmelerin korunur/);
  const commit=button(view.host,'Malzemeleri harca ve dönüştür');await view.click(commit);await view.click(commit);assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/action');assert.equal(calls[0].payload.itemStamp,'version-three');assert.equal(calls[0].payload.revision,3);
  await React.act(async()=>resolvePost.reject(Object.assign(Error('Bağlantı kesildi'),{status:503})));assert.match(view.host.textContent,/Bekleyen işlemin sonucu/);assert.equal(validRoyalPendingR118(JSON.parse(sessionStorage.getItem('core.royal.pending.r118:royal-ui-fixture.invalid:test-player'))),true);
  await view.render(React.createElement(Host,{...props,key:'reloaded'}));await open('transform');assert.match(view.host.textContent,/Bekleyen işlemin sonucu/,'uncertain command survives a component reload');
  await view.click(button(view.host,'Aynı işlemin sonucunu kontrol et'));assert.equal(calls.length,2);assert.deepEqual(calls[1].payload,calls[0].payload,'same durablecommandnotnewroll');assert.equal(changed,1);assert.equal(sessionStorage.getItem('core.royal.pending.r118:royal-ui-fixture.invalid:test-player'),null);assert.match(view.host.textContent,/Dönüştürüldü/);
 }finally{globalThis.fetch=before;await view.close();}
});

test('salvage confirms loss of exactly selected item and protects locked or nonchampion remote actions',async()=>{
 const view=await dom(),before=fetch,calls=[];globalThis.fetch=async()=>response({...status(),champion:false});
 const {Host}=createRoyalUIR118(React);const props={own:{id:'test-player',name:'Oyuncu',area:'bazaar',x:1200,y:390},world:{area:'bazaar'},joined:true,post:async(_url,payload)=>{calls.push(payload);return {};}};
 try{
  await view.render(React.createElement(Host,props));await open('salvage');await view.change(view.host.querySelector('select'),'emerald-fixture');assert.equal(button(view.host,'Eritmeyi incele').disabled,false,'salvage available beforechampion');await view.click(button(view.host,'Eritmeyi incele'));assert.match(view.host.textContent,/Eşya, taşları ve geliştirmeleri silinir/);assert.equal(calls.length,0);await view.click(button(view.host,'Eşyayı erit · 1 Toz al'));assert.equal(calls[0].confirm,true);assert.equal(calls[0].itemId,'emerald-fixture');assert.equal(calls[0].itemStamp,'version-three');assert.equal(calls[0].action,'royal_salvage_r118');
  await open('transform');await view.change(view.host.querySelector('select'),'emerald-fixture');assert.equal(button(view.host,'Dönüşümü incele').disabled,true);assert.match(view.host.textContent,/en az Şampiyon Lv 1/);
 }finally{globalThis.fetch=before;await view.close();}
});

test('read failure leaves visible retry rather than permanent loading and abort on close causes no stale state',async()=>{
 const view=await dom(),before=fetch;let broken=true;
 globalThis.fetch=async()=>broken?response({error:'Servis hazır değil'},503):response(status());
 const {Host}=createRoyalUIR118(React);
 try{await view.render(React.createElement(Host,{own:{id:'p',name:'P',x:1740,y:390},world:{area:'bazaar'},joined:true,post:async()=>({})}));await open('transform');assert.match(view.host.textContent,/Servis hazır değil/);assert.doesNotMatch(view.host.textContent,/yükleniyor/);broken=false;await view.click(button(view.host,'Bilgileri yeniden yükle'));assert(view.host.querySelector('select'));await view.click(button(view.host,'×'));assert.equal(view.host.querySelector('[role=dialog]'),null);}
 finally{globalThis.fetch=before;await view.close();}
});

test('admin validates mandatorydust, resourcebounds, duplicateingredients and safe fourmonsterloot quantities',()=>{
 const config=royalConfig();assert.equal(validateRoyalAdminR118(config,royalCatalog),'');config.recipes.weapon.costs=[{itemId:'material:royal_crown',amount:1}];assert.match(validateRoyalAdminR118(config,royalCatalog),/Zümrüt Tozu/);config.recipes.weapon.costs=[{itemId:'material:emerald_dust',amount:8},{itemId:'material:emerald_dust',amount:1}];assert.match(validateRoyalAdminR118(config,royalCatalog),/farklı/);
 const map=mapConfig(),labels={royal_crown:'Kraliyet Tacı',emerald:'Kadim Zümrüt ekipman'};assert.equal(validateChampionsAdminR118(map,species,labels),'');map.monsters.ivory_guard.loot.emerald.max=4;assert.match(validateChampionsAdminR118(map,species,labels),/1–3/);map.monsters.ivory_guard.loot.emerald.max=1;map.monsters.ivory_guard.essence=0;assert.equal(validateChampionsAdminR118(map,species,labels),'');map.monsters.ivory_guard.hp=10000001;assert.match(validateChampionsAdminR118(map,species,labels),/Can/);
});

test('admin stale-save response keeps draft and requires explicit reload before newrevision save',async()=>{
 const view=await dom(),before=fetch,requests=[];let readCount=0;
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);requests.push(body);if(body.action==='royal_admin_save_r118')return response({error:'Ayarlar başka pencerede değişti.'},409);return response({royal:{revision:++readCount,config:royalConfig(),catalog:royalCatalog}});};
 const Admin=createRoyalAdminR118(React);
 try{await view.render(React.createElement(Admin));await view.click(button(view.host,'Kraliyet tariflerini kaydet'));assert.equal(requests[1].revision,1);assert.equal(button(view.host,'Kraliyet tariflerini kaydet').disabled,true);assert.match(view.host.textContent,/başka pencerede/);await view.click(button(view.host,'Kayıtlı ayarları yükle'));assert.equal(button(view.host,'Kraliyet tariflerini kaydet').disabled,false);await view.click(button(view.host,'Kraliyet tariflerini kaydet'));assert.equal(requests.at(-1).revision,2);}
 finally{globalThis.fetch=before;await view.close();}
});

test('mapadmin edits independent crown chance and species with plain zero-essence support',async()=>{
 const view=await dom(),before=fetch;globalThis.fetch=async()=>response({champions:{revision:1,config:mapConfig(),species,lootLabels:{royal_crown:'Kraliyet Tacı',emerald:'Kadim Zümrüt ekipman'}}});
 const Admin=createChampionsAdminR118(React);
 try{await view.render(React.createElement(Admin));assert.match(view.host.textContent,/48 canavar/);assert(view.host.querySelector('[aria-label="Ganimet oranı 1"]'));await view.click(button(view.host,'Altın Yeleli Arslan'));assert.equal(view.host.querySelector('input[type=text]').value,'Altın Yeleli Arslan');assert.equal(view.host.querySelector('[aria-label="Öz"]').min,'0');await view.click(button(view.host,'Kaldır'));assert.match(view.host.textContent,/eşya düşürme kapalı/);await view.click(button(view.host,'+ Ganimet ekle'));assert.equal(view.host.querySelector('[aria-label="Ganimet oranı 1"]').value,'0');}
 finally{globalThis.fetch=before;await view.close();}
});

test('Haso entry closes the existing suspended dialog before opening salvage',async()=>{
 const view=await dom(),before=fetch;globalThis.fetch=async()=>response(status());
 const UI=createRoyalUIR118(React);
 function App(){const [hasoOpen,setHasoOpen]=React.useState(true);return React.createElement(React.Fragment,null,React.createElement(UI.Host,{own:{id:'p',name:'P',area:'bazaar',x:1200,y:390},world:{area:'bazaar'},joined:true,suspended:hasoOpen,post:async()=>({})}),hasoOpen&&React.createElement(UI.SalvageEntry,{area:'bazaar',onOpen:()=>setHasoOpen(false)}));}
 try{await view.render(React.createElement(App));await view.click(view.host.querySelector('[data-royal-entry=salvage]'));await React.act(async()=>new Promise(resolve=>setTimeout(resolve,10)));assert.match(view.host.querySelector('[role=dialog]')?.textContent??'',/Zümrüt Tozu · Demirci Haso/);assert.equal(view.host.querySelector('[data-royal-entry]'),null);}
 finally{globalThis.fetch=before;await view.close();}
});

test('both new admin panels recover from an incomplete initial response with explicit retry',async()=>{
 for(const [create,data]of [[createRoyalAdminR118,{royal:{revision:1,config:royalConfig(),catalog:royalCatalog}}],[createChampionsAdminR118,{champions:{revision:1,config:mapConfig(),species,lootLabels:{royal_crown:'Kraliyet Tacı',emerald:'Kadim Zümrüt ekipman'}}}]]){
  const view=await dom(),before=fetch;let count=0;globalThis.fetch=async()=>response(++count===1?{}:data);
  try{await view.render(React.createElement(create(React)));assert.match(view.host.textContent,/eksik/);assert.doesNotMatch(view.host.textContent,/yükleniyor/);await view.click(button(view.host,'Yeniden dene'));assert.equal(count,2);assert(view.host.querySelector('select'));}
  finally{globalThis.fetch=before;await view.close();}
 }
});
