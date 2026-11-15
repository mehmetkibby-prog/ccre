import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '../../../node_modules/playwright/index.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const modulePath=path.resolve(root,'../../r109_latency_completion/working/core511-source/scripts/core511/royal-visuals-r118.mjs');
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(req.url.split('?')[0]);
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body style="margin:0;background:#132019"><canvas id="c" width="1280" height="720"></canvas></body></html>');return;}
 const file=name==='/visuals.mjs'?modulePath:path.join(root,'optimized',path.basename(name));
 if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',name.endsWith('.mjs')?'text/javascript':'image/webp');res.end(fs.readFileSync(file));
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const result=await page.evaluate(async()=>{
  const fx=await import('/visuals.mjs'),canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
  const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});
  const [map,hero,weapons]=await Promise.all([load(fx.ROYAL_MEDIA_R118.map),load(fx.ROYAL_MEDIA_R118.hero),load(fx.ROYAL_MEDIA_R118.weapons)]);
  const sorted=arr=>arr.slice().sort((a,b)=>a-b),percentile=(arr,q)=>sorted(arr)[Math.min(arr.length-1,Math.floor(arr.length*q))];
  const reports=[];let draws=0;const draw=ctx.drawImage.bind(ctx);ctx.drawImage=(...args)=>{draws++;draw(...args);};
  for(let repeat=0;repeat<3;repeat++)for(const quality of [0,1,.5]){
   const times=[],intervals=[],counts=[];let last=0;
   for(let frame=0;frame<150;frame++)await new Promise(resolve=>requestAnimationFrame(now=>{
    draws=0;const start=performance.now();ctx.drawImage(map,0,0,1280,720);
    for(let player=0;player<50;player++){
     const x=56+(player%10)*127,y=120+Math.floor(player/10)*137,role=['muhafiz','avci','arkanist'][player%3];
     const pose=frame%50<25?Math.floor(frame/5)%3:3+Math.floor(frame/6)%3;
     ctx.drawImage(hero,pose*320,(player%3)*366,320,366,x-40,y-91,80,91.5);
     ctx.drawImage(weapons,(player%3)*256,0,256,256,x+12,y-62,30,62);
     fx.drawRoyalArmorFxR118(ctx,x,y-12,now,quality,player===49);
     fx.drawRoyalWeaponFxR118(ctx,x+12,y-62,30,62,now,quality,role,player===49);
    }
    const time=performance.now()-start;
    if(frame>=30){times.push(time);counts.push(draws);if(last)intervals.push(now-last);}last=now;resolve();
   }));
   reports.push({repeat:repeat+1,actors:50,quality,frames:times.length,drawSubmissionMs:{p50:percentile(times,.5),p95:percentile(times,.95),p99:percentile(times,.99),max:Math.max(...times)},rafIntervalMs:{p95:percentile(intervals,.95),p99:percentile(intervals,.99),over50:intervals.filter(v=>v>50).length},drawCallsPerFrame:{min:Math.min(...counts),max:Math.max(...counts)}});
  }
  return {browser:navigator.userAgent,viewport:{width:canvas.width,height:canvas.height},reports};
 });
 result.scope='Local headless Chromium Canvas2D art-only benchmark, 50 royal actors; draw submission and requestAnimationFrame timing, not a live gameplay/network performance guarantee.';
 result.generatedAt=new Date().toISOString();
 fs.writeFileSync(path.join(root,'canvas-benchmark.json'),JSON.stringify(result,null,2)+'\n');
 await page.screenshot({path:path.join(root,'previews/fifty-royal-actors.png')});
 console.log(JSON.stringify(result,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
