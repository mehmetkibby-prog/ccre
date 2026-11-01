import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from '/workspace/ccre/r60_mount_work/tooling/node_modules/playwright/index.mjs';
const root='/workspace/ccre/r87_stability_work';
const files={baseline:root+'/working/core511-source/scripts/core511/generated/client/game-client-core511-r85-b25e12cf61072ebe.js',candidate:root+'/tests/client-candidate.js'};
const sources=Object.fromEntries(Object.entries(files).map(([key,file])=>{const source=fs.readFileSync(file,'utf8'),start=source.indexOf('    let e4 = `wings`;'),end=source.indexOf('  }, []), ia2 =',start);assert(start>0&&end>start);return[key,{body:source.slice(start,end),sha256:createHash('sha256').update(source).digest('hex')}];}));
const report={scope:'Exact production wings loader bodies in real browser Canvas2D, deterministic synthetic atlas, fourfold CPU throttle. This is not a complete game renderer/FPS or live-server test.',runs:[],passed:false};
for(const [name,executablePath] of [['chromium','/usr/bin/chromium'],['edge','/tmp/r72-edge/opt/microsoft/msedge/msedge']]){
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const fixture=await browser.newPage();
  const png=await fixture.evaluate(()=>{const c=document.createElement('canvas');c.width=768;c.height=512;const ctx=c.getContext('2d'),d=ctx.createImageData(768,512);for(let i=0;i<d.data.length;i+=4){d.data[i]=(i*17>>>4)%256;d.data[i+1]=(i*31>>>2)%256;d.data[i+2]=(i*7>>>1)%256;d.data[i+3]=255;}ctx.putImageData(d,0,0);return c.toDataURL().split(',')[1];});await fixture.close();
  for(const [mode,source] of Object.entries(sources)){
   const page=await browser.newPage();let requests=0;
   await page.route('http://127.0.0.1:38087/**',route=>{if(route.request().url().endsWith('.png')){requests++;return route.fulfill({status:200,contentType:'image/png',body:Buffer.from(png,'base64')});}return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>R87 isolated atlas regression</title><canvas width="640" height="360"></canvas>'});});
   await page.goto('http://127.0.0.1:38087/');
   const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   const result=await page.evaluate(async body=>{
    const V2={current:{}},gr2={current:new Set()},loader=new Function('V2','gr2',body),frames=[],tasks=[],slices=[];
    let measuring=false,active=true,last=0,rafCount=0;
    const observer=new PerformanceObserver(list=>{for(const item of list.getEntries())if(measuring)tasks.push(item.duration);});observer.observe({type:'longtask',buffered:false});
    const originalTimeout=window.setTimeout.bind(window);window.setTimeout=(fn,delay,...args)=>originalTimeout(()=>{const start=performance.now();try{return fn(...args);}finally{if(measuring)slices.push(performance.now()-start);}},delay);
    const tick=now=>{if(measuring&&last)frames.push(now-last);last=now;rafCount++;if(active)requestAnimationFrame(tick);};requestAnimationFrame(tick);
    await new Promise(resolve=>originalTimeout(resolve,200));measuring=true;last=0;const started=performance.now();
    for(let n=0;n<50;n++)loader(V2,gr2);
    await new Promise((resolve,reject)=>{const poll=()=>V2.current.wings?resolve():performance.now()-started>15000?reject(Error('atlas_timeout')):originalTimeout(poll,5);poll();});
    const readyMs=performance.now()-started;await new Promise(resolve=>originalTimeout(resolve,100));measuring=false;active=false;observer.disconnect();
    const pixels=V2.current.wings.getContext('2d').getImageData(0,0,768,512).data;
    const digest=await crypto.subtle.digest('SHA-256',pixels);
    const summarize=values=>{values.sort((a,b)=>a-b);return{count:values.length,p99:values[Math.max(0,Math.ceil(values.length*.99)-1)]??null,max:values.at(-1)??null};};
    return{readyMs,rafIntervalsMs:summarize(frames),timerSliceMs:summarize(slices),longTasksMs:tasks,rafCount,loadingGuardReleased:!gr2.current.has('wings'),rgbaSHA256:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')};
   },source.body);
   assert.equal(requests,1,'50 simultaneous requests must load/process once');assert(result.loadingGuardReleased);
   report.runs.push({browser:name,mode,sourceSHA256:source.sha256,requests,...result});await page.close();
  }
  const runs=report.runs.filter(row=>row.browser===name);assert.equal(runs[0].rgbaSHA256,runs[1].rgbaSHA256,'Rendered pixels differ');
  const page=await browser.newPage();let fail=true;
  await page.route('http://127.0.0.1:38087/**',route=>route.request().url().endsWith('.png')?route.fulfill({status:fail?404:200,contentType:'image/png',body:fail?'missing':Buffer.from(png,'base64')}):route.fulfill({body:'<!doctype html><title>Retry test</title>',contentType:'text/html'}));await page.goto('http://127.0.0.1:38087/');
  await page.evaluate(body=>{window.atlasRefs={V2:{current:{}},gr2:{current:new Set()}};window.loadAtlas=new Function('V2','gr2',body);loadAtlas(atlasRefs.V2,atlasRefs.gr2);},sources.candidate.body);
  await page.waitForFunction(()=>!atlasRefs.gr2.current.size);assert.equal(await page.evaluate(()=>!!atlasRefs.V2.current.wings),false);fail=false;
  await page.evaluate(()=>loadAtlas(atlasRefs.V2,atlasRefs.gr2));await page.waitForFunction(()=>!!atlasRefs.V2.current.wings);
  const noContext=await page.evaluate(()=>{atlasRefs.V2.current={};const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=()=>null;loadAtlas(atlasRefs.V2,atlasRefs.gr2);return new Promise(resolve=>setTimeout(()=>{HTMLCanvasElement.prototype.getContext=original;resolve(!atlasRefs.gr2.current.size&&!atlasRefs.V2.current.wings);},200));});assert(noContext);await page.close();
 }finally{await browser.close();}
}
report.passed=true;fs.writeFileSync(root+'/evidence/browser-atlas.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
