import {createHash} from 'node:crypto';
const helper=new URL('./worker-clean-cpu-r85.mjs',import.meta.url).href;
function once(source,before,after){if(source.split(before).length!==2)throw Error('clean_cpu_anchor_drift:'+before);return source.replace(before,after);}
export async function load(url,context,next){
 const result=await next(url,context);if(!url.endsWith('/core511/reward-worker-runtime-r533.mjs'))return result;
 let source=String(result.source);if(createHash('sha256').update(source).digest('hex')!=='ee98ff55cdc7473815fc79350a8b85bc16786bb1447a200831b3b55bc693f80b')throw Error('clean_cpu_source_drift');
 source='import {startCleanCpuR85} from '+JSON.stringify(helper)+';\n'+source;
 source=once(source,'let serial=0,queue=Promise.resolve();','const cpuR85=await startCleanCpuR85();let serial=0,queue=Promise.resolve();');
 source=once(source,'const started=performance.now();','cpuR85.begin(current);const started=performance.now();');
 source=once(source,"rankRefreshR85.afterCommand(ack);hook('after_command',{database,current,ack});","rankRefreshR85.afterCommand(ack);hook('after_command',{database,current,ack});await cpuR85.end(current,ack);");
 source=once(source,'}catch(error){rankRefreshR85.invalidate();','}catch(error){await cpuR85.end(current,null,error);rankRefreshR85.invalidate();');
 return {...result,source};
}
