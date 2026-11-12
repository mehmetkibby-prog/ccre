// 100-client diagnostic of implemented COMPONENTS, not a release/load gate.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Worker,MessageChannel} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import {BASE,SHA} from '../tests/helpers.mjs';
import {validateLocalLoad} from '../acceptance.mjs';
const durationMs=Number(process.env.CORE511_BENCH_MS??180000),out=process.env.CORE511_BENCH_OUT;
if(!out||!Number.isSafeInteger(durationMs)||durationMs<1000)throw Error('Explicit benchmark output and valid duration required');
process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {nativeFixture507}=await import('../../entry507/native-fixture.mjs');const fixture=await nativeFixture507();const settings={...fixture.settings};await fixture.close();
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'core511-component-load-')),workers=[],clients=[],proof=randomUUID();let generator,monitor;
const waitMessage=(worker,type)=>new Promise((resolve,reject)=>{
 const onMessage=message=>{if(message.type===type){cleanup();resolve(message);}},onError=error=>{cleanup();reject(error);},onExit=code=>{cleanup();reject(Error('Worker exited '+code));};
 const cleanup=()=>{worker.off('message',onMessage);worker.off('error',onError);worker.off('exit',onExit);};worker.on('message',onMessage);worker.on('error',onError);worker.on('exit',onExit);
});
async function spawn(data){const worker=new Worker(new URL('./worker.mjs',import.meta.url),{workerData:{base:BASE,proof,...data},resourceLimits:{maxOldGenerationSizeMb:256}});workers.push(worker);await waitMessage(worker,'ready');return worker;}
let packets=0,errors=0,inputCount=0,maxRss=0;
try{
 const writer=await spawn({role:'writer',file:path.join(dir,'component.sqlite')}),channels=[];
 for(let channel=1;channel<=4;channel++){
  const worker=await spawn({role:'channel',channel,settings});channels.push(worker);
  const {port1,port2}=new MessageChannel();writer.postMessage({type:'port',port:port1,channel},[port1]);worker.postMessage({type:'writer',port:port2},[port2]);
  for(let i=0;i<25;i++){const id='bench-'+channel+'-'+i,pair=new MessageChannel();worker.postMessage({type:'client',id,port:pair.port2},[pair.port2]);const client={id,port:pair.port1,sequence:0,x:2700+i%5*12,y:2025+Math.floor(i/5)*12};client.port.on('message',packet=>{if(packet.type==='error')errors++;else packets++;});clients.push(client);}
 }
 const starting=workers.map(worker=>waitMessage(worker,'started'));for(const worker of workers)worker.postMessage({type:'start'});await Promise.all(starting);
 const start=performance.now(),cpu=process.cpuUsage();let frame=0;
 generator=setInterval(()=>{frame++;for(const client of clients){if(frame%4===0){client.port.postMessage({sequence:++client.sequence,epoch:1,kind:'movement',payload:{action:'move',x:client.x+(frame%8===0?4:0),y:client.y,area:'forest'}});inputCount++;}if(frame%10===0){client.port.postMessage({sequence:++client.sequence,epoch:1,kind:'combat',payload:{action:'attack'}});inputCount++;}}},50);
 monitor=setInterval(()=>{maxRss=Math.max(maxRss,process.memoryUsage().rss);if(maxRss>4*1024**3)throw Error('RSS budget exceeded');},1000);
 await new Promise(resolve=>setTimeout(resolve,durationMs));clearInterval(generator);clearInterval(monitor);
 const channelResults=channels.map(worker=>waitMessage(worker,'result'));for(const worker of channels)worker.postMessage({type:'stop'});const results=(await Promise.all(channelResults)).map(message=>message.result);
 const finalWriter=waitMessage(writer,'result');writer.postMessage({type:'stop'});const writerResult=(await finalWriter).result;
 const usage=process.cpuUsage(cpu),elapsedMs=performance.now()-start,report={schemaVersion:1,workload:'kernel-components',actualGameRules:false,transport:'message-channel',baselineManifestSha256:SHA,manifestSha256:null,durationMs:elapsedMs,players:100,channels:results,writer:writerResult,packets,inputCount,errors,resources:{cpuBudget:4,cpuMs:(usage.user+usage.system)/1000,totalCpuFraction:(usage.user+usage.system)/1000/elapsedMs/4,maxRssBytes:maxRss},coverage:['original movement validator and SQL-CAS memory adapter','original dungeon damage formula only','original PvE retaliation formula only','spatial AOI and dirty object projection','original V510 SQLite group/fsync writer with component receipts'],limitations:['NOT complete game: no lethal rewards, dungeon lifecycle, quests, arena, guild war, party or shared bosses','No WebSocket, nginx, browser, ticket verification or production startup in this timed workload','Generator, channels and writer share one OS process with isolated worker heaps; CPU includes generator','Host has 8 vCPU quota and 8 GiB RAM; taskset restricts execution to 4 CPUs, RSS is monitored against 4 GiB','No 100-player game capacity or installation authorization can be inferred']};
 report.acceptance=validateLocalLoad(report,'0'.repeat(64));await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({out,elapsedMs,totalCpuFraction:report.resources.totalCpuFraction,maxRssBytes:maxRss,channels:results.map(c=>({channel:c.channel,elu:c.elu,tickP95Ms:c.tickP95Ms,ackP95Ms:c.ack.p95Ms,errors:c.errors})),errors,acceptance:report.acceptance.passed}));
}finally{clearInterval(generator);clearInterval(monitor);for(const client of clients)client.port.close();await Promise.allSettled(workers.map(worker=>worker.terminate()));await fs.rm(dir,{recursive:true,force:true});}
