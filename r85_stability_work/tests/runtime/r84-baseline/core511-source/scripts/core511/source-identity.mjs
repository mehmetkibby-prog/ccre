import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Reproducible source candidate, not a signed installable release manifest.
// Evidence and progress prose are excluded so saving a result cannot change
// the identity of the code which produced it. Test adapters ARE included.
export function sourceIdentity(root=import.meta.dirname){
 const files=[];function walk(dir){for(const name of fs.readdirSync(dir).sort()){
  const file=path.join(dir,name),relative=path.relative(root,file),stat=fs.lstatSync(file);
  if(['evidence','node_modules'].includes(name)||name.startsWith('.'))continue;
  if(stat.isDirectory())walk(file);else if(stat.isFile()&&/\.(?:mjs|js|json|c)$/.test(name)){const bytes=fs.readFileSync(file);files.push({path:relative,bytes:bytes.length,sha256:hash(bytes)});}
 }}walk(root);
 const body={kind:'core511-source-candidate-v1',baselineManifestSha256:'bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',files};return {...body,sha256:hash(JSON.stringify(body))};
}
