import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const proof=JSON.parse(fs.readFileSync(new URL('./generated/native-client-proof.json',import.meta.url)));
// A versioned directory keeps circular ES-module imports in one immutable
// graph. Renaming only the game and portal leaves the bootstrap importing V510.
export const CLIENT_ASSET_NAMESPACE='core511-'+createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).update(JSON.stringify(proof)).digest('hex').slice(0,16);
export function clientAssetPaths(source){
 source=source.replaceAll(path.basename(proof.file),proof.name).replaceAll(path.basename(proof.portal.file),proof.portal.name);
 return source.replaceAll('/assets/','/assets/'+CLIENT_ASSET_NAMESPACE+'/').replace(/(["'`])assets\//g,'$1assets/'+CLIENT_ASSET_NAMESPACE+'/');
}
export function stageClientAssets(base,client){
 const assets=path.join(client,'assets'),version=path.join(assets,CLIENT_ASSET_NAMESPACE);
 fs.mkdirSync(version,{recursive:true});
 for(const name of fs.readdirSync(path.join(base,'dist-vds/client/assets'))){
  const from=path.join(base,'dist-vds/client/assets',name),to=path.join(version,name);
  if(name.endsWith('.js')){
   fs.writeFileSync(to,clientAssetPaths(fs.readFileSync(from,'utf8')));
  }else fs.cpSync(from,to,{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
 }
 for(const name of fs.readdirSync(new URL('./generated/client/',import.meta.url))){
  const data=fs.readFileSync(new URL('./generated/client/'+name,import.meta.url));
  if(name.endsWith('.js'))fs.writeFileSync(path.join(version,name),clientAssetPaths(data.toString('utf8')));
  else{
   const media=proof.media?.find(row=>row.name===name);
   if(!media||!['.webp','.jpg'].some(ext=>name.endsWith(ext))||media.bytes!==data.length||media.sha256!==createHash('sha256').update(data).digest('hex'))throw Error('client_media_proof_mismatch');
   fs.writeFileSync(path.join(version,name),data);
  }
 }
 return {namespace:CLIENT_ASSET_NAMESPACE};
}
