import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6');
const out=path.join(import.meta.dirname,'generated'),hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));
const baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(bytes),proof={baselineManifestSha256:baseline,modules:[],integrationComplete:false};
fs.mkdirSync(out,{recursive:true});
for(const name of ['channel-protocol.mjs','channel-authority.mjs']){
 const file='vds-server/src/'+name,source=fs.readFileSync(path.join(root,file),'utf8');
 if(manifest.files.find(row=>row.path===file)?.sha256!==hash(source))throw Error('Changed authority source');
 let result=source;const edits=[];
 function replace(from,to,expected){const count=result.split(from).length-1;if(count!==expected)throw Error('Authority transform mismatch '+from);result=result.split(from).join(to);edits.push({from,to,count});}
 if(name==='channel-protocol.mjs'){
  replace("'col-channel-ipc-v1'","'col-kernel511-owner-v1'",1);
  replace('CHANNEL_COUNT = 3','CHANNEL_COUNT = 4',1);
 }else{
  const relative=path.relative(out,path.join(root,'vds-server/src/prepared-statements477.mjs'));
  replace("'./prepared-statements477.mjs'",JSON.stringify(relative),1);
  replace("'./channel-protocol.mjs'","'./owner-protocol.mjs'",1);
  replace('channel BETWEEN 1 AND 3','channel BETWEEN 1 AND 4',2);
  for(const table of ['channel_processes','channel_owners','channel_receipts','channel_write_streams','channel_owner_channel','channel_receipt_expiry']){
   const count=result.split(table).length-1;if(!count)throw Error('Missing authority table '+table);
   replace(table,'kernel511_'+table,count);
  }
 }
 const generated=name==='channel-protocol.mjs'?'owner-protocol.mjs':'owner-authority.mjs';
 parse(result,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,generated),result);
 proof.modules.push({source:file,sourceSha256:hash(source),generated,generatedSha256:hash(result),edits});
}
fs.writeFileSync(path.join(out,'owner-proof.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({modules:2,changes:'four-channel count, isolated table namespace, import relocation only'}));
