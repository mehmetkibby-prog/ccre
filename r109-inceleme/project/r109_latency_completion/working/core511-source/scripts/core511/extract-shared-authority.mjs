import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex'),root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated'),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));
if(hash(bytes)!==baseline)throw Error('Exact V510 required');const manifest=JSON.parse(bytes),proof=[];
for(const [file,name,from,to]of [
 ['vds-server/src/channel-protocol.mjs','shared-lease-protocol.mjs','export const CHANNEL_COUNT = 3;','export const CHANNEL_COUNT = 4;'],
 ['vds-server/src/channel-shared-authority.mjs','shared-lease-authority.mjs',"from './channel-protocol.mjs'","from './shared-lease-protocol.mjs'"]
]){
 const source=fs.readFileSync(path.join(root,file),'utf8');if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source)||source.split(from).length!==2)throw Error('Native shared lease source changed');const generated=source.replace(from,to);fs.writeFileSync(path.join(out,name),generated);proof.push({source:file,sourceSha256:hash(source),generated:name,generatedSha256:hash(generated),edit:{from,to}});
}
const selectorFile='vds-server/src/channel-shared-combat.mjs',selectorSource=fs.readFileSync(path.join(root,selectorFile),'utf8');if(manifest.files.find(r=>r.path===selectorFile)?.sha256!==hash(selectorSource))throw Error('Native shared selector changed');
const selectorSlice=selectorSource.slice(selectorSource.indexOf(' needs(payload,actor){'),selectorSource.indexOf('\n run(task){'));
const selector='// Mechanically copied V510 selection; bounded Map lookup replaces its combat storage reader.\nexport function sharedNeeds(payload,actor){'+selectorSlice.slice(selectorSlice.indexOf('{')+1).replace("  const table=this.database.combat.tables.get('monsters');\n  const target=table.records.get(payload.targetId)?.current??table.read?.get(payload.targetId);","  const target=this.localMonster(payload.targetId);")+'\n';fs.writeFileSync(path.join(out,'shared-lease-selection.mjs'),selector);
fs.writeFileSync(path.join(out,'shared-lease-proof.json'),JSON.stringify({baselineManifestSha256:baseline,files:proof,selector:{source:selectorFile,sourceSha256:hash(selectorSource),sliceSha256:hash(selectorSlice),generated:'shared-lease-selection.mjs',generatedSha256:hash(selector)},notes:['Native signed single-owner FIFO lease authority copied unchanged. Only channel count extends to four and protocol import points at that extension.','Native lease selector retains ability normalization and conservative area/unknown-target behavior; only target lookup uses the resident Map.','Authority lives in the independent world process. No timeout grants a replacement owner; actual supervisor fencing remains required.']},null,2)+'\n');
