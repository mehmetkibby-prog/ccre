import {createHash} from 'node:crypto';
const helper=new URL('./worker-profile-r85.mjs',import.meta.url).href;
function once(source,before,after){if(source.split(before).length!==2)throw Error('writer_profile_anchor_drift:'+before);return source.replace(before,after);}
export async function load(url,context,next){
 const result=await next(url,context);
 if(!url.endsWith('/core511/reward-worker-runtime-r533.mjs'))return result;
 let source=String(result.source);
 if(createHash('sha256').update(source).digest('hex')!=='e6995b9ad487604bf054771f95532b462a84adb6c04eb8132efd435cff6a7d8b')throw Error('writer_profile_source_drift');
 source=`import {installWorkerProfileR85} from ${JSON.stringify(helper)};\nimport {stageSnapshotR51} from './stage-timing-r51.mjs';\n`+source;
 source=once(source,'const checkpoint=installRewardCheckpointR79(database,config.checkpointR79);','const profileR85=installWorkerProfileR85(database,{stageSnapshotR51});\n const checkpoint=installRewardCheckpointR79(database,config.checkpointR79);');
 source=once(source,'await writer.initialize();','await writer.initialize();profileR85.bind(writer);');
 source=once(source,'const started=performance.now();','await profileR85.begin(current);const started=performance.now();');
 source=once(source,'finally{current=null;}','finally{await profileR85.end(current);current=null;}');
 return {...result,source};
}
