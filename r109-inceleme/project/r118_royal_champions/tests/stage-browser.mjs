// Isolated browser fixture: cached immutable dependency files and current generated roots.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const project=path.resolve(import.meta.dirname,'../..'),core=project+'/r109_latency_completion/working/core511-source/scripts/core511';
// The two legacy media files were absent from the historical fixture cache.
// Fetch only public, read-only URLs and require the reviewed immutable digest.
const mediaRoot=project+'/r118_royal_champions/evidence/public-media';
const media=JSON.parse(fs.readFileSync(project+'/r118_royal_champions/evidence/runtime-media.json'));
for(const [relative,row]of Object.entries(media)){
 const file=path.join(mediaRoot,relative);let bytes;
 if(fs.existsSync(file))bytes=fs.readFileSync(file);else{
  const response=await fetch(row.source,{signal:AbortSignal.timeout(20000)});assert(response.ok,'public fixture media download failed: '+response.status);bytes=Buffer.from(await response.arrayBuffer());
 }
 assert.equal(bytes.length,row.bytes,'reviewed public media size');assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,'reviewed public media digest');assert.equal(bytes.subarray(8,12).toString(),'WEBP','genuine WebP fixture');
 fs.mkdirSync(path.dirname(file),{recursive:true});if(!fs.existsSync(file))fs.writeFileSync(file,bytes);
}
const proof=JSON.parse(fs.readFileSync(core+'/generated/native-client-proof.json'));
const {CLIENT_ASSET_NAMESPACE,stageClientAssets}=await import(core+'/client-assets.mjs');
const old=project+'/r105_performance_review/evidence/final-browser-assets',oldAssets=old+'/assets',prior=fs.readdirSync(oldAssets).find(f=>f.startsWith('core511-'));
const stage=process.env.AUDIT_ASSETS||project+'/r118_royal_champions/evidence/runtime-assets',base='/tmp/r118-browser-base';fs.rmSync(base,{recursive:true,force:true});fs.mkdirSync(base+'/dist-vds/client/assets',{recursive:true});
const normalize=text=>text.replaceAll('/assets/'+prior+'/','/assets/').replaceAll('assets/'+prior+'/','assets/').replace(/game-client-core511-r\d+-[a-f0-9]+\.js/g,proof.name).replace(/auth-portal-core511-r\d+-[a-f0-9]+\.js/g,proof.portal.name).replace(/admin-client-core511-r\d+-[a-f0-9]+\.js/g,proof.admin.name);
for(const name of fs.readdirSync(oldAssets+'/'+prior)){const file=oldAssets+'/'+prior+'/'+name;if(!fs.statSync(file).isFile())continue;const to=base+'/dist-vds/client/assets/'+name;if(/\.(js|css)$/.test(name))fs.writeFileSync(to,normalize(fs.readFileSync(file,'utf8')));else fs.copyFileSync(file,to);}
stageClientAssets(base,stage);const html=normalize(fs.readFileSync(old+'/index.html','utf8')).replaceAll('/assets/','/assets/'+CLIENT_ASSET_NAMESPACE+'/');fs.writeFileSync(stage+'/index.html',html);
console.log(JSON.stringify({stage,namespace:CLIENT_ASSET_NAMESPACE,game:proof.name,admin:proof.admin.name}));
