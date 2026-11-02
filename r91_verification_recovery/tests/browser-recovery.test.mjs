import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {build} from '/workspace/ccre/r60_mount_work/tooling/node_modules/esbuild/lib/main.js';
import {chromium} from '/workspace/ccre/r60_mount_work/tooling/node_modules/playwright/index.mjs';

const root=new URL('../',import.meta.url).pathname;
const asset=fs.readFileSync('/workspace/ccre/r60_mount_work/design-r60/live-assets/client/game-instance-559vKpBT-ga4172-prereg-1788d-e486-48ff1d5b32ef-6a1e68bc.js','utf8');
// Exact shipped consumer, with React/DOM dialog primitives supplied by fixture.
const consumer=asset.slice(asset.indexOf('function _({enabled:'),asset.indexOf('var v=null,y;'));
const viewport=asset.slice(0,asset.indexOf('import{'));
const old=fs.readFileSync('/tmp/core511-r90-startup-fix/working/core511-source/scripts/core511/generated/client/game-client-core511-r88-aa6aed7dd8933fa4.js','utf8');
const proof=JSON.parse(fs.readFileSync(root+'working/core511-source/scripts/core511/generated/native-client-proof.json'));
const candidate=fs.readFileSync(root+'working/core511-source/scripts/core511/generated/client/'+proof.name,'utf8');
const extract=s=>s.slice(s.indexOf('function colUseVerificationState501('),s.indexOf('function colTimedInfo502('));
const bundles={};
for(const [name,source] of [['old',old],['new',candidate]]) {
 const result=await build({stdin:{contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import * as jsx from 'react/jsx-runtime';
const m=React,h=jsx;
const l=({open,children})=>open?children:null,a=({children})=>children,u=()=>null;
const o=React.forwardRef(({children,...props},ref)=>React.createElement('section',{ref,role:'dialog',className:props.className,style:{position:'fixed',zIndex:301}},children));
const c=({children})=>React.createElement('header',null,children),s=({children})=>React.createElement('h2',null,children),i=({children})=>React.createElement('p',null,children);
${viewport}\n${consumer}\n${extract(source)}
const challenge={required:true,id:'current-challenge',image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWAAAAABJRU5ErkJggg==',expiresAt:Date.now()+300000};
const probe=window.probe={calls:0,mode:'hang',pending:[],events:[],enabled:true,player:'player-1',challenge,
 fetch:async(url,options)=>{probe.calls++;probe.signal=options.signal;
  if(probe.mode==='hang')return new Promise(resolve=>probe.pending.push(resolve));
  if(probe.mode==='body')return {ok:true,json:()=>new Promise(resolve=>probe.pending.push(data=>resolve(data)))};
  if(probe.mode==='malformed')return {ok:true,json:async()=>({})};
  if(probe.mode==='error')return {ok:false,status:503};
  return {ok:true,json:async()=>probe.mode==='required'?challenge:{required:false,dueAt:Date.now()+1800000}};},
 resolve(value=challenge){const pending=this.pending.splice(0);for(const resolve of pending)resolve({ok:true,json:async()=>value});},
 notify(){window.dispatchEvent(new Event('coreoflife:bot-check'));},retry(){return colRetryVerification501(this.state);},
 change(value){Object.assign(this,value);this.render(v=>v+1);}
};
function App(){const [,render]=React.useState(0);probe.render=render;const state=colUseVerificationState501(React);probe.state=state;
 const ref=React.useRef(false),[required,setRequired]=React.useState(false);
 colUseVerificationListener501(React,state,probe.enabled,setRequired,ref,()=>false);
 return React.createElement(React.Fragment,null,
  colVerificationBlocked501(state,probe.player,probe.enabled,false)?React.createElement(colVerificationWait501,{React,state}):React.createElement('p',{id:'ready'},'Oyuna hazır'),
  React.createElement(_,{enabled:probe.enabled,read:()=>colReadVerification501(probe.fetch,state,()=>probe.player),post:async()=>{throw Error('Kod hatalı.');},onRequired:value=>{colVerificationAccept501(state,probe.player,value,probe.enabled);ref.current=value;setRequired(value);probe.events.push(value);}}));}
createRoot(document.getElementById('root')).render(React.createElement(App));
`,resolveDir:'/workspace/ccre/r60_mount_work/tooling',sourcefile:'probe.jsx'},bundle:true,write:false,format:'iife',platform:'browser'});
 bundles[name]=result.outputFiles[0].text;
}

test('shipped verification consumer recovers stalled reads and retries on desktop and mobile',{timeout:60000},async t=>{
 const app=http.createServer((req,res)=>{res.setHeader('content-type',req.url.endsWith('.js')?'text/javascript':'text/html');res.end(req.url.endsWith('.js')?bundles[req.url.slice(1,-3)]:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/'+(req.url.includes('old')?'old':'new')+'.js"></script>');});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.close(r)));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});t.after(()=>browser.close());
 const evidence=[];
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const open=async(name='new')=>{await page.goto(`http://127.0.0.1:${app.address().port}/${name}`);await page.waitForFunction(()=>window.probe?.calls===1);await page.clock.install();};
  await open('old');await page.clock.runFor(31000);
  assert.equal(await page.evaluate(()=>probe.calls),1);assert.equal(await page.locator('.col-verification-wait501').count(),1);
  t.diagnostic(`${mobile?'mobile':'desktop'} original: after 31s one unresolved read still owns all polls.`);
  await open();await page.evaluate(()=>probe.mode='clear');await page.clock.runFor(16000);
  await page.locator('#ready').waitFor();assert.equal(await page.evaluate(()=>probe.calls),2);
  // Retry must settle the old reader before the consumer receives the refresh event.
  await open();await page.evaluate(()=>probe.mode='clear');await page.getByRole('button',{name:'Yeniden dene'}).click();
  await page.locator('#ready').waitFor();assert.equal(await page.evaluate(()=>probe.calls),2);
  await page.evaluate(()=>probe.resolve());await page.clock.runFor(10);assert.equal(await page.locator('#ready').count(),1);
  // A body that never finishes also has a deadline; HTTP success alone is insufficient.
  await open();await page.evaluate(()=>{probe.mode='body';return probe.retry();});
  await page.clock.runFor(12001);await page.getByText('Doğrulama bağlantısı gecikti.',{exact:false}).waitFor();
  assert.equal(await page.locator('#ready').count(),0);await page.evaluate(()=>probe.mode='clear');await page.clock.runFor(5000);await page.locator('#ready').waitFor();
  // Duplicate requirement events may not starve the current challenge response.
  await open();await page.evaluate(()=>{probe.notify();return probe.retry();});
  assert.equal(await page.evaluate(()=>probe.calls),2);
  await page.evaluate(()=>{probe.notify();probe.notify();probe.notify();probe.resolve();});
  await page.getByRole('dialog').waitFor();assert.equal(await page.locator('#ready').count(),0);
  await page.getByRole('textbox').fill('000000');await page.getByRole('button',{name:'Doğrula ve devam et'}).click();
  await page.getByText('Kod hatalı.',{exact:true}).waitFor();assert.equal(await page.locator('#ready').count(),0);
  await page.screenshot({path:root+`evidence/verification-${mobile?'mobile':'desktop'}.png`});
  // Malformed and unavailable status never masquerade as a successful check.
  for(const mode of ['malformed','error']){await open();await page.evaluate(mode=>{probe.mode=mode;return probe.retry();},mode);await page.getByText(mode==='malformed'?'Doğrulama yanıtı eksik geldi.':'Doğrulama bilgisi alınamadı.',{exact:false}).waitFor();assert.equal(await page.locator('#ready').count(),0);}
  // Disable / unmount releases the observer; late data cannot revive the gate.
  await open();await page.evaluate(()=>probe.change({enabled:false}));await page.locator('#ready').waitFor();await page.evaluate(()=>probe.resolve());await page.clock.runFor(15000);assert.equal(await page.locator('#ready').count(),1);
  assert.deepEqual(errors,[]);evidence.push({mobile,originalStallReproduced:true,automaticRecovery:true,manualRetry:true,bodyTimeout:true,duplicateNotifications:true,lateResponseFenced:true,wrongAnswerRemainsBlocked:true,malformedFailClosed:true,unmount:true,pageErrors:errors});
  await context.close();
 }
 fs.writeFileSync(root+'evidence/browser.json',JSON.stringify({browser:browser.version(),scope:'Exact packaged verification functions plus unchanged shipped CAPTCHA component, real React and browser; dialog primitives are fixture DOM, not the entire game.',results:evidence},null,2)+'\n');
});
