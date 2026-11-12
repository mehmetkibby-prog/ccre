import {fork} from 'node:child_process';import {once} from 'node:events';
const child=fork(new URL('./ipcbench-child.mjs',import.meta.url),{serialization:'advanced',stdio:['ignore','inherit','inherit','pipe','ipc']});
const raw=child.stdio[3];
const payload=Buffer.alloc(10*1024,97);const N=20000;
await new Promise(r=>setTimeout(r,300));
async function viaIpc(){const t=process.cpuUsage(),w=performance.now();for(let i=0;i<N;i++){await new Promise(r=>child.send({type:'kernel511-bytes',stream:'kernel511',bytes:payload},r));}const c=process.cpuUsage(t);child.send('report');const [m]=await once(child,'message');return {cpuUsPerMsg:((c.user+c.system)/N).toFixed(1),wallMs:(performance.now()-w).toFixed(0),got:m.n};}
async function viaRaw(){const t=process.cpuUsage(),w=performance.now();for(let i=0;i<N;i++){if(!raw.write(payload))await once(raw,'drain');}await new Promise(r=>raw.write(Buffer.alloc(0),r));const c=process.cpuUsage(t);await new Promise(r=>setTimeout(r,200));child.send('rawreport');const [m]=await once(child,'message');return {cpuUsPerMsg:((c.user+c.system)/N).toFixed(1),wallMs:(performance.now()-w).toFixed(0),got:m.rawBytes/payload.length};}
for(let i=0;i<2;i++){console.log('ipc',await viaIpc());console.log('raw',await viaRaw());}
child.kill();
