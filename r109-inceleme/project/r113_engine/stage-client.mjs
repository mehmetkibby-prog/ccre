import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {clientAssetPaths,CLIENT_ASSET_NAMESPACE} from '../r109_latency_completion/working/core511-source/scripts/core511/client-assets.mjs';

// Create a new immutable module namespace from the exact previous installed
// graph plus the new content-addressed assets. Old namespaces stay untouched.
export function stageClientR113(source,destination){
 const core=path.resolve(import.meta.dirname,'../r109_latency_completion/working/core511-source/scripts/core511');
 const proof=JSON.parse(fs.readFileSync(path.join(core,'generated/native-client-proof.json'))),prior=proof.engineR113.baseline;
 const namespaces=fs.readdirSync(path.join(source,'assets')).filter(n=>/^core511-[a-f0-9]{16}$/.test(n));
 assert.equal(namespaces.length,1,'supply one validated installed asset namespace');const old=namespaces[0];
 const rewrite=text=>clientAssetPaths(text.replaceAll('assets/'+old+'/','assets/').replaceAll(prior.name,proof.name).replaceAll(prior.bridge,proof.bridge).replaceAll(prior.portal,proof.portal.name));
 const assets=path.join(destination,'assets',CLIENT_ASSET_NAMESPACE);fs.mkdirSync(assets,{recursive:true});
 for(const file of fs.readdirSync(path.join(source,'assets',old),{recursive:true})){
  const input=path.join(source,'assets',old,file),output=path.join(assets,file);
  if(fs.statSync(input).isDirectory()){fs.mkdirSync(output,{recursive:true});continue;}fs.mkdirSync(path.dirname(output),{recursive:true});
  if(file.endsWith('.js'))fs.writeFileSync(output,rewrite(fs.readFileSync(input,'utf8')));else fs.copyFileSync(input,output);
 }
 for(const file of fs.readdirSync(path.join(core,'generated/client'))){
  const input=path.join(core,'generated/client',file),output=path.join(assets,file);
  if(file.endsWith('.js'))fs.writeFileSync(output,rewrite(fs.readFileSync(input,'utf8')));else fs.copyFileSync(input,output);
 }
 for(const file of ['index.html','accounts-index.html'])if(fs.existsSync(path.join(source,file)))fs.writeFileSync(path.join(destination,file),rewrite(fs.readFileSync(path.join(source,file),'utf8')));
 return {namespace:CLIENT_ASSET_NAMESPACE,sourceNamespace:old,game:proof.name,portal:proof.portal.name,bridge:proof.bridge};
}
if(process.argv[1]===import.meta.filename){assert(process.argv[2]&&process.argv[3]);console.log(JSON.stringify(stageClientR113(path.resolve(process.argv[2]),path.resolve(process.argv[3]))));}
