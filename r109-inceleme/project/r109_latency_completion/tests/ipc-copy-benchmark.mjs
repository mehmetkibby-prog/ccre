import {fileURLToPath as reviewFilePath} from 'node:url';
const reviewWorkspace=reviewFilePath(new URL('../../',import.meta.url));
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {performance,PerformanceObserver} from 'node:perf_hooks';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const paths={before:(reviewWorkspace+'r107_population_stability/working/core511-source/scripts/core511/process-stream.mjs'),after:new URL('../working/core511-source/scripts/core511/process-stream.mjs',import.meta.url).pathname};
// Experimental incoming-view variant exists only under evidence, never shipped.
paths.both=new URL('../evidence/process-stream-both-copies.mjs',import.meta.url).pathname;
fs.writeFileSync(paths.both,fs.readFileSync(paths.after,'utf8').replace('this.push(Buffer.from(message.bytes));','this.push(Buffer.from(message.bytes.buffer,message.bytes.byteOffset,message.bytes.byteLength));'));
const rows=[];
for(let repeat=0;repeat<3;repeat++)for(const name of repeat%2?['both','after','before']:['before','after','both']){
 const module=pathToFileURL(paths[name]).href,{ProcessStream}=await import(module),child=fork(new URL('./ipc-copy-benchmark-child.mjs',import.meta.url),[module],{serialization:'advanced',stdio:['ignore','ignore','inherit','ipc']});
 await new Promise(resolve=>child.on('message',m=>{if(m.type==='bench-ready')resolve();}));
 const stream=new ProcessStream(child,{stream:'bench'}),bytes=Buffer.alloc(65536,29);let receive;
 stream.on('data',chunk=>{assert.equal(chunk.length,bytes.length);assert.equal(chunk[0],29);receive();});
 const step=()=>new Promise(resolve=>{receive=resolve;stream.write(bytes);});for(let n=0;n<50;n++)await step();
 let gcMs=0;const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())gcMs+=e.duration;});observer.observe({entryTypes:['gc']});
 const start=performance.now(),cpu=process.cpuUsage();for(let n=0;n<1000;n++)await step();
 const elapsed=performance.now()-start,used=process.cpuUsage(cpu);await new Promise(r=>setImmediate(r));observer.disconnect();
 const exited=once(child,'exit');stream.end();await exited;stream.destroy();
 rows.push({name,repeat,roundtrips:1000,payloadBytes:bytes.length,elapsedMs:elapsed,mainCpuMs:(used.user+used.system)/1000,mainGcMs:gcMs});
}
console.log(JSON.stringify(rows,null,2));fs.writeFileSync(new URL('../evidence/ipc-copy-variants.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');
