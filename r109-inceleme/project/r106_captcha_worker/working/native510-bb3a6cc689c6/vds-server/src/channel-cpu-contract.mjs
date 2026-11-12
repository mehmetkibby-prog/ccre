import {readFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';

export function parseCpuSet(value){
 const cpus=new Set();
 if(typeof value!=='string'||!/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(value.trim()))throw Error('Invalid CPU set');
 for(const part of value.trim().split(',')){
  const [start,end=start]=part.split('-').map(Number);
  if(end<start||end-start>65536)throw Error('Invalid CPU range');
  for(let cpu=start;cpu<=end;cpu++)cpus.add(cpu);
 }
 return [...cpus].sort((a,b)=>a-b);
}
export function verifyFourCoreBudget({affinity,quota,parallelism=4}){
 const cpus=parseCpuSet(affinity);
 const [budget,period]=String(quota).trim().split(/\s+/);
 const quotaCores=budget==='max'?Infinity:Number(budget)/Number(period);
 if(!(quotaCores>0))throw Error('CPU quota could not be verified');
 if(cpus.length!==4)throw Error(`v417 acceptance requires exactly 4 pinned CPUs; observed ${cpus.length}`);
 if(quotaCores<4||parallelism<4)throw Error(`v417 acceptance CPU quota is below 4 cores (${Math.min(quotaCores,parallelism)})`);
 return {cpus,affinity,quotaCores:Number.isFinite(quotaCores)?quotaCores:null,requiredCores:4,verified:true};
}
export function currentFourCoreBudget(){
 const status=readFileSync('/proc/self/status','utf8');
 const affinity=status.match(/^Cpus_allowed_list:\s*(.+)$/m)?.[1]?.trim();
 // Check every visible cgroup ancestor: a child may say "max" while a parent
 // actually caps the container at one or two CPUs.
 const membership=readFileSync('/proc/self/cgroup','utf8').match(/^0::(.*)$/m)?.[1]??'/';
 let current='/sys/fs/cgroup'+(membership==='/'?'':membership),quotas=[];
 for(;;){
  try{const raw=readFileSync(current+'/cpu.max','utf8').trim();const [a,b]=raw.split(/\s+/);if(a!=='max')quotas.push({raw,cores:Number(a)/Number(b)});}catch{}
  if(current==='/sys/fs/cgroup')break;
  current=current.slice(0,current.lastIndexOf('/'));
  if(!current.startsWith('/sys/fs/cgroup'))break;
 }
 // Namespaced mounts sometimes expose the effective root but not the host
 // membership path. Its cpu.max is still mandatory evidence.
 const root=readFileSync('/sys/fs/cgroup/cpu.max','utf8').trim(),[a,b]=root.split(/\s+/);
 if(a!=='max')quotas.push({raw:root,cores:Number(a)/Number(b)});
 quotas.sort((a,b)=>a.cores-b.cores);
 return verifyFourCoreBudget({affinity,quota:quotas[0]?.raw??root,parallelism:availableParallelism()});
}
