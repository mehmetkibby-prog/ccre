import { open } from 'node:fs/promises';
import { cpus, availableParallelism } from 'node:os';
import { posix } from 'node:path';
import { performance } from 'node:perf_hooks';

// Per-sampler state only: never share baselines between processes/VM realms.
// Normal samples open six files / <=24582 bytes. Every 60 s or after cgroup
// migration, discovery/limits open <=39 files / <=221223 bytes, including probes.
// At most four reads overlap. No path/raw text leaves this module.
const maxDepth=16,configurationMs=60000,maxCpuCount=65536,maxInteger=Number.MAX_SAFE_INTEGER;
const integer=value=>/^\d{1,16}$/.test(String(value))&&Number.isSafeInteger(Number(value))?Number(value):null;
const rounded=value=>Number.isFinite(value)&&value>=0&&value<=maxInteger?Math.min(maxInteger,Math.round(value*1000)/1000):null;
const safeCount=value=>Number.isInteger(value)&&value>0&&value<=maxCpuCount?value:null;
const empty=()=>({
 protocol:'native-host-capacity-v1',sampledAtMs:null,
 logicalCpuCount:null,availableCpuCount:null,cpuCapacityCeilingCores:null,
 cgroup:{scope:'visible-ancestors-only',status:'unavailable',limitsSampledAtMs:null,cpuQuotaStatus:'unavailable',cpuQuotaCores:null,memoryMaxStatus:'unavailable',memoryMaxMb:null,memoryCurrentMb:null,
  cpu:{scope:null,intervalMs:null,usedCores:null,periods:null,throttledPeriods:null,throttledMs:null,throttledPeriodsPercent:null,pressureSomeAvg10Percent:null,pressureFullAvg10Percent:null},
  memoryPressure:{scope:'current-cgroup',someAvg10Percent:null,fullAvg10Percent:null}},
 host:{scope:'host-wide-not-process',intervalMs:null,stealPercent:null},
});

async function readKernelText(file,maxBytes,prefix=false){
 let handle;
 try{
  handle=await open(file,'r');
  const buffer=Buffer.alloc(maxBytes+1);let offset=0;
  while(offset<buffer.length){
   const {bytesRead}=await handle.read(buffer,offset,buffer.length-offset,null);
   if(!bytesRead)break;offset+=bytesRead;if(prefix)break;
  }
  if(offset>maxBytes&&!prefix)return null;
  return buffer.subarray(0,Math.min(offset,maxBytes)).toString('utf8');
 }catch(error){return error?.code==='ENOENT'?undefined:null;}
 finally{if(handle)await handle.close().catch(()=>{});}
}

const cleanPath=value=>typeof value==='string'&&value.startsWith('/')&&!value.includes('\0')&&posix.normalize(value)===value?value:null;
const decodePath=value=>value.replace(/\\([0-7]{3})/g,(_,octal)=>String.fromCharCode(parseInt(octal,8)));
function membership(cgroup,mountinfo){
 if(typeof cgroup!=='string'||typeof mountinfo!=='string')return null;
 const path=cleanPath(cgroup.split('\n').find(line=>line.startsWith('0::'))?.slice(3));
 if(!path)return null;
 for(const line of mountinfo.split('\n')){
  const [left,right]=line.split(' - ');if(!right?.startsWith('cgroup2 '))continue;
  const fields=left.split(' '),root=cleanPath(decodePath(fields[3]||'')),mount=cleanPath(decodePath(fields[4]||''));
  // Only the conventional kernel mount is read; unusual mounts are unsupported.
  if(!root||!mount||(mount!=='/sys/fs/cgroup'&&!mount.startsWith('/sys/fs/cgroup/')))continue;
  if(root!=='/'&&path!==root&&!path.startsWith(`${root}/`))continue;
  const relative=root==='/'?path:path.slice(root.length),current=posix.join(mount,relative);
  if(current!==mount&&!current.startsWith(`${mount}/`))continue;
  const paths=[];let ancestor=current;
  while(paths.length<maxDepth){paths.push(ancestor);if(ancestor===mount)break;ancestor=posix.dirname(ancestor);}
  return {current,paths,complete:paths.at(-1)===mount,identity:`${root}\0${mount}\0${path}`};
 }
 return null;
}

function cpuLimit(text){
 if(text===undefined)return {valid:true,cores:null}; // No controller at this visible level.
 if(typeof text!=='string')return {valid:false,cores:null};
 const match=/^(max|\d+)\s+(\d+)\s*$/.exec(text),period=integer(match?.[2]);
 if(!match||period===null||period===0)return {valid:false,cores:null};
 if(match[1]==='max')return {valid:true,cores:null};
 const quota=integer(match[1]),cores=quota===null?null:quota/period;
 return {valid:cores!==null&&cores>0&&cores<=maxCpuCount,cores};
}
function memoryLimit(text){
 if(text===undefined||text?.trim()==='max')return {valid:true,bytes:null};
 const bytes=typeof text==='string'?integer(text.trim()):null;
 return {valid:bytes!==null,bytes};
}
function counters(text){
 if(typeof text!=='string')return null;
 const result={};
 for(const line of text.trim().split('\n')){
  const [name,value,...extra]=line.trim().split(/\s+/);
  if(['usage_usec','nr_periods','nr_throttled','throttled_usec'].includes(name)&&extra.length===0)result[name]=integer(value);
 }
 return Object.values(result).some(value=>value!==null)?result:null;
}
function pressure(text){
 const result={some:null,full:null};if(typeof text!=='string')return result;
 for(const name of ['some','full']){
  const value=new RegExp(`^${name} avg10=(\\d+(?:\\.\\d+)?)\\s`,'m').exec(text)?.[1];
  const number=value===undefined?null:Number(value);
  if(number!==null&&Number.isFinite(number)&&number>=0&&number<=100)result[name]=rounded(number);
 }
 return result;
}
function hostCpu(text){
 if(typeof text!=='string')return null;
 const values=/^cpu\s+([^\n]+)\n?/.exec(text)?.[1]?.trim().split(/\s+/).slice(0,8).map(integer);
 // guest and guest_nice are already included in user/nice; do not sum them.
 return values?.length===8&&values.every(value=>value!==null)?values:null;
}
function difference(current,previous){
 return current!==null&&previous!==null&&current!==undefined&&previous!==undefined&&current>=previous?current-previous:null;
}

// Output is exactly 28 fixed scalar fields, at most three object levels, no
// arrays/history. All numeric values are finite, nonnegative, <= MAX_SAFE_INTEGER;
// CPU counts/ceilings <= 65536, percentages <= 100. Unsupported/first deltas use
// null. A zero delta is a successful measurement. Read failures reset baselines.
export function createHostResourceSampler({readText=readKernelText,platform=process.platform,logicalCpuCount=()=>cpus().length,availableCpuCount=availableParallelism,now=Date.now,monotonic=()=>performance.now()}={}){
 let latest=empty(),pending=null,previousCpu=null,previousHost=null,configuration=null;
 const read=async(path,limit=4096,prefix=false)=>{try{return await readText(path,limit,prefix);}catch{return null;}};
 async function collect(){
  const next=empty(),started=monotonic();
  const refreshCounts=!configuration||started-configuration.at>=configurationMs;
  next.logicalCpuCount=latest.logicalCpuCount;next.availableCpuCount=latest.availableCpuCount;
  if(refreshCounts){
   try{next.logicalCpuCount=safeCount(logicalCpuCount());}catch{next.logicalCpuCount=null;}
   try{next.availableCpuCount=safeCount(availableCpuCount());}catch{next.availableCpuCount=null;}
  }
  next.cpuCapacityCeilingCores=next.availableCpuCount??next.logicalCpuCount;
  if(platform==='linux'){
   const [groupText,statText]=await Promise.all([read('/proc/self/cgroup'),read('/proc/stat',4096,true)]);
   const stat=hostCpu(statText),hostAt=monotonic();
   if(stat&&previousHost&&hostAt>previousHost.at){
    const deltas=stat.map((value,index)=>difference(value,previousHost.values[index]));
    const total=deltas.every(value=>value!==null)?deltas.reduce((sum,value)=>sum+value,0):0;
    if(Number.isSafeInteger(total)&&total>0){next.host.intervalMs=rounded(hostAt-previousHost.at);next.host.stealPercent=rounded(100*deltas[7]/total);}
   }
   previousHost=stat?{at:hostAt,values:stat}:null;
   if(!configuration||groupText!==configuration.groupText||started-configuration.at>=configurationMs){
    if(!refreshCounts){
     try{next.logicalCpuCount=safeCount(logicalCpuCount());}catch{next.logicalCpuCount=null;}
     try{next.availableCpuCount=safeCount(availableCpuCount());}catch{next.availableCpuCount=null;}
     next.cpuCapacityCeilingCores=next.availableCpuCount??next.logicalCpuCount;
    }
    const group=membership(groupText,await read('/proc/self/mountinfo',65536));
    configuration={at:started,groupText,group,limitsSampledAtMs:rounded(now()),cpuComplete:group?.complete??false,memoryComplete:group?.complete??false,quota:null,maxMemory:null,cpuPath:group?.current};
    let cpuObserved=false,memoryObserved=false;
    // Two asynchronous reads at a time, including inherited systemd/container limits.
    for(const path of group?.paths??[]){
     const [cpuText,memoryText]=await Promise.all([read(`${path}/cpu.max`),read(`${path}/memory.max`)]);
     const cpu=cpuLimit(cpuText),memory=memoryLimit(memoryText);
     configuration.cpuComplete&&=cpu.valid;configuration.memoryComplete&&=memory.valid;
     cpuObserved||=typeof cpuText==='string'&&cpu.valid;memoryObserved||=typeof memoryText==='string'&&memory.valid;
     if(cpu.valid&&cpu.cores!==null&&(configuration.quota===null||cpu.cores<=configuration.quota)){configuration.quota=cpu.cores;configuration.cpuPath=path;}
     if(memory.valid&&memory.bytes!==null&&(configuration.maxMemory===null||memory.bytes<configuration.maxMemory))configuration.maxMemory=memory.bytes;
    }
    configuration.cpuComplete&&=cpuObserved;configuration.memoryComplete&&=memoryObserved;
   }
   const {group,cpuComplete,memoryComplete,quota,maxMemory,cpuPath}=configuration;
   if(group){
    next.cgroup.status=cpuComplete&&memoryComplete?'ready':'partial';
    next.cgroup.limitsSampledAtMs=configuration.limitsSampledAtMs;
    next.cgroup.cpuQuotaStatus=cpuComplete?(quota===null?'unlimited':'finite'):'unavailable';
    next.cgroup.cpuQuotaCores=quota===null?null:rounded(quota);
    next.cgroup.memoryMaxStatus=memoryComplete?(maxMemory===null?'unlimited':'finite'):'unavailable';
    next.cgroup.memoryMaxMb=maxMemory===null?null:rounded(maxMemory/1048576);
    if(quota!==null)next.cpuCapacityCeilingCores=rounded(Math.min(next.cpuCapacityCeilingCores??quota,quota));
    const [cpuText,cpuPressureText,memoryText,memoryPressureText]=await Promise.all([read(`${cpuPath}/cpu.stat`),read(`${cpuPath}/cpu.pressure`),read(`${group.current}/memory.current`),read(`${group.current}/memory.pressure`)]);
    const cpu=counters(cpuText),cpuAt=monotonic(),cpuPressure=pressure(cpuPressureText),memoryPressure=pressure(memoryPressureText);
    const cpuIdentity=`${group.identity}\0${cpuPath}`;
    next.cgroup.cpu.scope=cpuPath===group.current?'current-cgroup':'quota-ancestor-including-siblings';
    next.cgroup.cpu.pressureSomeAvg10Percent=cpuPressure.some;next.cgroup.cpu.pressureFullAvg10Percent=cpuPressure.full;
    const memoryCurrent=typeof memoryText==='string'?integer(memoryText.trim()):null;
    next.cgroup.memoryCurrentMb=memoryCurrent===null?null:rounded(memoryCurrent/1048576);
    next.cgroup.memoryPressure.someAvg10Percent=memoryPressure.some;next.cgroup.memoryPressure.fullAvg10Percent=memoryPressure.full;
    if(cpu&&previousCpu?.identity===cpuIdentity&&cpuAt>previousCpu.at){
     const elapsed=cpuAt-previousCpu.at,used=difference(cpu.usage_usec,previousCpu.values.usage_usec),periods=difference(cpu.nr_periods,previousCpu.values.nr_periods),throttled=difference(cpu.nr_throttled,previousCpu.values.nr_throttled),throttledUs=difference(cpu.throttled_usec,previousCpu.values.throttled_usec);
     // A counter regression invalidates this entire interval (for example, restart).
     const reset=Object.keys(cpu).some(name=>cpu[name]!==null&&previousCpu.values[name]!==null&&cpu[name]<previousCpu.values[name]);
     if(!reset){
      next.cgroup.cpu.intervalMs=rounded(elapsed);
      next.cgroup.cpu.usedCores=used===null?null:rounded(used/(elapsed*1000));
      next.cgroup.cpu.periods=periods;next.cgroup.cpu.throttledPeriods=throttled;next.cgroup.cpu.throttledMs=throttledUs===null?null:rounded(throttledUs/1000);
      // Throttled time can exceed wall time; only period incidence is a percentage.
      if(periods>0&&throttled!==null&&throttled<=periods)next.cgroup.cpu.throttledPeriodsPercent=rounded(100*throttled/periods);
     }
    }
    previousCpu=cpu?{identity:cpuIdentity,at:cpuAt,values:cpu}:null;
   }else previousCpu=null;
  }else{previousCpu=null;previousHost=null;}
  next.sampledAtMs=rounded(now());latest=next;
 }
 return {
  // Single flight prevents slow filesystem reads from accumulating work.
  sample(){if(!pending)pending=collect().catch(()=>{previousCpu=null;previousHost=null;}).finally(()=>{pending=null;});return pending;},
  snapshot(){return { ...latest,cgroup:{...latest.cgroup,cpu:{...latest.cgroup.cpu},memoryPressure:{...latest.cgroup.memoryPressure}},host:{...latest.host}};},
 };
}
