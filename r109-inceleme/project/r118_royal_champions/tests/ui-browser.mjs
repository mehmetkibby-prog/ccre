// Real Chromium layout and interactions with the editable production UI modules.
// HTTP responses are synthetic fixtures; this is not a live realm acceptance test.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const project=path.resolve(import.meta.dirname,'..'),review=path.resolve(project,'../..');
const core=path.resolve(project,'../r109_latency_completion/working/core511-source/scripts/core511');
const deps=process.env.R118_UI_TEST_DEPS??'/tmp/royal-ui-r118-tests/node_modules';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'royal-ui-browser-')),out=path.join(project,'evidence/ui-browser');await fs.mkdir(out,{recursive:true});
const status={revision:3,enabled:true,champion:true,bonusPercent:8,location:{salvage:{area:'bazaar',x:1200,y:390,radius:245},transform:{area:'bazaar',x:1740,y:390,radius:245}},materials:{emerald_dust:40,royal_crown:3},items:[{id:'emerald-fixture',kind:'armor',role:'muhafiz',name:'Sonsuz Kadim Zümrüt Zırhı',power:150,royalPower:162,royalName:'Hükümdar Kraliyet Zırhı',infinite:true,itemStamp:'version-three'}],recipes:Object.fromEntries(['weapon','armor','helmet','shoes','necklace'].map(key=>[key,{costs:[{itemId:'material:emerald_dust',name:'Zümrüt Tozu',amount:8,available:40,missing:0},{itemId:'material:royal_crown',name:'Kraliyet Tacı',amount:1,available:3,missing:0},{itemId:'resource:gems',name:'Mücevher',amount:5000,available:15000,missing:0}]}]))};
const royal={revision:3,config:{enabled:true,recipes:Object.fromEntries(['weapon','armor','helmet','shoes','necklace'].map(key=>[key,{costs:[{itemId:'material:emerald_dust',amount:8},{itemId:'material:royal_crown',amount:1},{itemId:'resource:gems',amount:5000}]}]))},catalog:[{id:'material:emerald_dust',name:'Zümrüt Tozu',maxAmount:1000000},{id:'material:royal_crown',name:'Kraliyet Tacı',maxAmount:1000000},{id:'resource:gems',name:'Mücevher',maxAmount:1000000}]};
const species=[{key:'ivory_guard',name:'Fildişi Muhafız',count:12},{key:'golden_lion',name:'Altın Yeleli Arslan',count:12},{key:'crescent_hunter',name:'Hilal Avcısı',count:12},{key:'royal_colossus',name:'Saltanat Devi',count:12}];
const champions={revision:1,species,lootLabels:{royal_crown:'Kraliyet Tacı',emerald:'Kadim Zümrüt ekipman'},config:{enabled:true,monsters:Object.fromEntries(species.map(row=>[row.key,{name:row.name,hp:9000,damage:120,xp:550,essence:45,respawnSeconds:30,loot:{royal_crown:{chance:2,min:1,max:1},emerald:{chance:0,min:1,max:1}}}]))}};
const fixture=`import * as React from ${JSON.stringify(path.join(deps,'react/index.js'))};
import {createRoot} from ${JSON.stringify(path.join(deps,'react-dom/client.js'))};
import {createRoyalUIR118,openRoyalR118} from ${JSON.stringify(path.join(core,'royal-client-r118.mjs'))};
import {createRoyalAdminR118} from ${JSON.stringify(path.join(core,'royal-admin-client-r118.mjs'))};
import {createChampionsAdminR118} from ${JSON.stringify(path.join(core,'champions-admin-client-r118.mjs'))};
const status=${JSON.stringify(status)},royal=${JSON.stringify(royal)},champions=${JSON.stringify(champions)};
window.calls=[];
window.fetch=async(url,options)=>{window.calls.push({url,body:options?.body?JSON.parse(options.body):null});return {ok:true,status:200,json:async()=>url.includes('api/admin?core511=royal')?{royal}:url.includes('api/admin?core511=champions')?{champions}:status};};
const mode=new URLSearchParams(location.search).get('mode')??'transform';
const root=createRoot(document.getElementById('app'));
if(mode==='admin')root.render(React.createElement(createRoyalAdminR118(React)));
else if(mode==='map')root.render(React.createElement(createChampionsAdminR118(React)));
else{const UI=createRoyalUIR118(React);root.render(React.createElement(UI.Host,{own:{id:'test-player',name:'Şampiyon',area:'bazaar',x:mode==='salvage'?1200:1740,y:390},world:{area:'bazaar'},joined:true,post:async(url,payload)=>{window.calls.push({url,body:payload});return {message:'İşlem tamamlandı.'};}}));setTimeout(()=>openRoyalR118(mode),100);}
`;
await build({stdin:{contents:fixture,resolveDir:review,sourcefile:'ui-browser-fixture.mjs'},bundle:true,format:'esm',platform:'browser',outfile:path.join(temp,'fixture.js'),define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
await fs.writeFile(path.join(temp,'index.html'),'<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>R118 · Arayüz kontrolü</title><style>html,body{margin:0;background:#09140e;color:#eee;font-family:Arial,sans-serif}#app{max-width:1100px;margin:24px auto;padding:0 12px}button,input,select{font:inherit}</style><div id="app"></div><script type="module" src="/fixture.js"></script></html>');
const server=http.createServer(async(req,res)=>{try{const file=req.url.split('?')[0]==='/fixture.js'?'fixture.js':'index.html';res.setHeader('content-type',file.endsWith('.js')?'text/javascript':'text/html');res.end(await fs.readFile(path.join(temp,file)));}catch{res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.REVIEW_CHROMIUM??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const report=[];
try{
 for(const [label,width,height]of [['desktop',1280,900],['mobile',390,844],['landscape',844,390]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const mode of ['transform','salvage','admin','map']){
   await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}`);
   const selector=mode==='admin'?'.r118-admin':mode==='map'?'.r118-admin':'.royal118-dialog';await page.locator(selector).waitFor();
   if(mode==='transform'||mode==='salvage'){await page.getByLabel('Kadim Zümrüt eşya seç').selectOption('emerald-fixture');await page.getByRole('button',{name:mode==='transform'?'Dönüşümü incele':'Eritmeyi incele',exact:true}).click();await page.locator('.royal118-confirm').waitFor();}
   else await page.getByRole('button',{name:mode==='admin'?'Kraliyet tariflerini kaydet':'Harita ayarlarını kaydet',exact:true}).waitFor();
   const geometry=await page.locator(selector).evaluate(element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,scrollHeight:element.scrollHeight,clientHeight:element.clientHeight,documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};});
   assert(geometry.documentWidth<=width+1,mode+' horizontaloverflow '+label);assert(geometry.scrollWidth<=geometry.clientWidth+1,mode+' internaloverflow '+label);assert(geometry.x>=-1&&geometry.x+geometry.width<=width+1,mode+' bounds '+label);
   if(mode==='transform'||mode==='salvage'){assert(geometry.height<=height-20);const action=page.getByRole('button',{name:mode==='transform'?'Malzemeleri harca ve dönüştür':'Eşyayı erit · 1 Toz al',exact:true});await action.scrollIntoViewIfNeeded();assert(await action.isEnabled());const box=await action.boundingBox();assert(box.height>=44);}
   await page.screenshot({path:path.join(out,`${mode}-${label}.png`),fullPage:mode==='admin'||mode==='map'});report.push({mode,label,width,height,...geometry,browserErrors:[...errors]});assert.equal(errors.length,0);
  }
  await page.close();
 }
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({synthetic:true,productionModules:true,browser:'Chromium',cases:report},null,2)+'\n');console.log(JSON.stringify({passed:report.length,out,zeroHorizontalOverflow:true,browserErrors:0}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
