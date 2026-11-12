// Focused real LocalDatabase/PNG comparison, independent of the game load runs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance,PerformanceObserver} from 'node:perf_hooks';
const root=path.resolve(import.meta.dirname,'..'),tree=process.env.STUTTER_TREE,label=process.env.LOAD_LABEL;
assert(['r105','r106'].includes(label));
const native=tree+'/native510-bb3a6cc689c6/vds-server/src';
const {LocalDatabase}=await import(native+'/database.mjs');
const {createBotCheck}=await import(native+'/bot-check.mjs');
const out=root+'/evidence/captcha-benchmark-'+label+'.json';assert(!fs.existsSync(out));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'captcha-benchmark-'));
const db=new LocalDatabase(dir+'/captcha.sqlite',{create:true,groupWrites:true,asyncDurable:true});
const bot=createBotCheck(db.sqlite),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const gc=[];const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())gc.push({ms:e.duration,kind:e.detail.kind});});observer.observe({entryTypes:['gc']});
const report={label,scope:'isolated native LocalDatabase and real PNG rendering; three bursts of 20 requests, not game capacity',phases:[]};
const pct=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]||0;
let serial=0;
try{
 report.sqlite={journal:db.sqlite.prepare('PRAGMA journal_mode').get(),synchronous:db.sqlite.prepare('PRAGMA synchronous').get(),asyncWal:!!db.walSync};
 for(const [phase,n,repeats] of [['cold',1,1],['warm-bursts',20,3]]){
  const timings=[],latencies=[],lag=[];let last=performance.now();
  const timer=setInterval(()=>{const now=performance.now();lag.push(Math.max(0,now-last-2));last=now;},2);
  const before={memory:process.memoryUsage(),cpu:process.cpuUsage(),commits:db.writeStats.commits},started=performance.now();
  try{
   await sleep(20);
   for(let round=0;round<repeats;round++){
    const results=await Promise.all(Array.from({length:n},async()=>{
     const owner='visitor-'+(++serial),timing={},begin=performance.now();
     const commit=fn=>db.atomic(fn,{timing});
     const value=label==='r106'?await bot.challengeAsyncR106(owner,'register',{fresh:true,commit}):await commit(()=>bot.challenge(owner,'register',{fresh:true}));
     timings.push(timing);latencies.push(performance.now()-begin);
     assert(value.image.startsWith('data:image/png;base64,iVBOR'));assert(value.expiresAt>Date.now());return value.id;
    }));
    assert.equal(new Set(results).size,n);await sleep(100);
   }
   await sleep(20);
  }finally{clearInterval(timer);}
  const cpu=process.cpuUsage(before.cpu),durationMs=performance.now()-started;
  report.phases.push({phase,requests:n*repeats,durationMs,requestP95Ms:pct(latencies,.95),requestMaxMs:Math.max(...latencies),databaseCallbackP95Ms:pct(timings.map(t=>t.jobMs),.95),databaseCallbackMaxMs:Math.max(...timings.map(t=>t.jobMs)),transactionMaxMs:Math.max(...timings.map(t=>t.transactionMs)),timerDelayMaxMs:Math.max(...lag),timerDelaysOver50:lag.filter(x=>x>50).length,cpuMicros:cpu,commits:db.writeStats.commits-before.commits,memoryBefore:before.memory,memoryAfter:process.memoryUsage()});
 }
 report.rows=db.sqlite.prepare('SELECT count(*) AS n FROM bot_challenges').get().n;assert.equal(report.rows,61);report.gc=gc;report.passed=true;
}finally{observer.disconnect();await db.durableAfterCommit();db.close();fs.rmSync(dir,{recursive:true,force:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
