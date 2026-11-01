import {createHash} from 'node:crypto';
const helper=new URL('./worker-boot-probe-r85.mjs',import.meta.url).href;
function once(source,before,after){if(source.split(before).length!==2)throw Error('boot_probe_anchor_drift:'+before);return source.replace(before,after);}
export async function load(url,context,next){
 const result=await next(url,context);if(!url.endsWith('/core511/reward-worker-runtime-r533.mjs'))return result;
 let source=String(result.source);if(createHash('sha256').update(source).digest('hex')!=='ee98ff55cdc7473815fc79350a8b85bc16786bb1447a200831b3b55bc693f80b')throw Error('boot_probe_source_drift');
 source='import {createBootProbeR85} from '+JSON.stringify(helper)+';\n'+source;
 source=once(source,'if(statementBootPoolR61)prepareCombatStatementBootR61(sql);','if(statementBootPoolR61)prepareCombatStatementBootR61(sql);const bootProbeR85=createBootProbeR85(sql);bootProbeR85.snapshot("ready");let bootFirstR85=true;');
 source=once(source,'writer.refreshOwners();writer.services.refresh({rankRefreshR85});','if(bootFirstR85)bootProbeR85.snapshot("before-first-refresh",current);writer.refreshOwners();writer.services.refresh({rankRefreshR85});if(bootFirstR85)bootProbeR85.snapshot("after-first-refresh",current);');
 source=once(source,"rankRefreshR85.afterCommand(ack);hook('after_command',{database,current,ack});","rankRefreshR85.afterCommand(ack);hook('after_command',{database,current,ack});if(bootFirstR85){bootProbeR85.snapshot('after-first-command',current,ack);bootFirstR85=false;}");
 return {...result,source};
}
