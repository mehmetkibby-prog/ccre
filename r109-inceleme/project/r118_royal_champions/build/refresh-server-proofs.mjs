// Update generated-output identities only. Pinned V510 source identities and
// original SQL slices remain immutable and are still asserted by parity tests.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRetaliationRules} from '../../r109_latency_completion/working/core511-source/scripts/core511/generated/retaliation-rules.mjs';
const root=path.resolve(import.meta.dirname,'../../r109_latency_completion/working/core511-source/scripts/core511/generated');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const map={
 'rules-proof.json':{generatedSha256:'rules.mjs'},
 'attack-proof.json':{generatedSha256:'attack-rules.mjs',writerSha256:'attack-writer-rules.mjs',adventureAdapterSha256:'../adapt-adventure-attack.mjs'},
 'entry-proof.json':{generatedSha256:'entry-rules.mjs'},
 'respawn-proof.json':{generatedSha256:'respawn-rules.mjs'},
 'retaliation-proof.json':{generatedSha256:'retaliation-rules.mjs'},
 'cold-world-proof.json':{generatedSha256:'cold-world-rules.mjs'},
 'notification-proof.json':{generatedSha256:'notification-rules.mjs'},
 'channel-content-proof.json':{generatedSha256:'channel-content-rules.mjs'},
 'native-world-startup-proof.json':{generatedSha256:'native-world-startup.mjs'},
 'aggro-proof.json':{generatedSha256:'aggro-rules.mjs'},
 'world-job-proof.json':{generatedSha256:'world-job-rules.mjs'}
};
const result=[];
for(const [file,fields] of Object.entries(map)){
 const target=path.join(root,file),data=JSON.parse(fs.readFileSync(target));
 const previous=data.r118RoyalChampions?.hashes??{},hashes={...previous};
 for(const [field,source] of Object.entries(fields)){
  if(typeof data[field]!=='string')throw Error(file+' missing '+field);
  const current=sha(fs.readFileSync(path.join(root,source)));
  if(current===data[field])continue;
  hashes[field]={previous:previous[field]?.previous??data[field],current,file:source};data[field]=current;
 }
 if(file==='retaliation-proof.json'){
  const current=sha(createRetaliationRules().retaliateNative.toString()),field='nativeMethodSha256';
  if(data[field]!==current){hashes[field]={previous:previous[field]?.previous??data[field],current,method:'retaliateNative'};data[field]=current;}
 }
 for(const [field,value] of Object.entries(hashes))if(value.previous===value.current)delete hashes[field];
 if(Object.keys(hashes).length)data.r118RoyalChampions={scope:file==='native-world-startup-proof.json'?'Preserve pinned V510 dependencies and apply the existing R93 zumrut bounds/walkability via separate equivalent wrappers; no new startup migration.':'Explicit champion map extension and royal equipment family/material registration; pinned source hashes and legacy parity assertions are unchanged.',hashes};
 else delete data.r118RoyalChampions;
 fs.writeFileSync(target,JSON.stringify(data,null,2)+'\n');result.push({file,hashes});
}
fs.writeFileSync(path.resolve(import.meta.dirname,'../evidence/server-proofs.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
