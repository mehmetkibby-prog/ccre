import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {BASE,temporary} from './helpers.mjs';
import {composeNativeHttp} from '../compose-native-http.mjs';
import {stageClientAssets,clientAssetPaths} from '../client-assets.mjs';

// A source-only isolated mirror: unchanged dependencies point to the verified
// native tree; only the candidate main module is written in the temporary tree.
export function stageNativeHttp(t,{source=fs.readFileSync(new URL('../../../../http-runtime/dist-vds/server/index.js',import.meta.url),'utf8')}={}){
 const root=temporary(t),server=path.join(root,'dist-vds/server');fs.mkdirSync(server,{recursive:true});fs.writeFileSync(path.join(root,'package.json'),'{"type":"module"}');
 for(const name of ['lib','vds-server','node_modules'])fs.symlinkSync(path.join(BASE,name),path.join(root,name),'dir');
 const client=path.join(root,'dist-vds/client'),assets=path.join(client,'assets');fs.mkdirSync(assets,{recursive:true});
 for(const name of (fs.existsSync(path.join(BASE,'dist-vds/client'))?fs.readdirSync(path.join(BASE,'dist-vds/client')):[]))if(name!=='assets')fs.cpSync(path.join(BASE,'dist-vds/client',name),path.join(client,name),{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
 // Vinext deliberately rejects asset symlinks escaping the client root. Real
 // immutable releases contain regular files; use reflink copies in fixtures.
 for(const name of (fs.existsSync(path.join(BASE,'dist-vds/client/assets'))?fs.readdirSync(path.join(BASE,'dist-vds/client/assets')):[]))fs.cpSync(path.join(BASE,'dist-vds/client/assets',name),path.join(assets,name),{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
 for(const name of fs.readdirSync(new URL('../generated/client/',import.meta.url)))fs.copyFileSync(new URL('../generated/client/'+name,import.meta.url),path.join(assets,name));
 if(fs.existsSync(path.join(BASE,'dist-vds/client/assets')))stageClientAssets(BASE,client);
 for(const name of fs.readdirSync(path.join(BASE,'dist-vds/server')))if(name!=='index.js')fs.cpSync(path.join(BASE,'dist-vds/server',name),path.join(server,name),{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
 for(const relative of ['__vite_rsc_assets_manifest.js','ssr/__vite_rsc_assets_manifest.js']){const file=path.join(server,relative);if(fs.existsSync(file))fs.writeFileSync(file,clientAssetPaths(fs.readFileSync(file,'utf8')));else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'export default {serverResources:{},clientReferenceDeps:{}};');}}
 const file=path.join(server,'index.js');fs.writeFileSync(file,source);return {root,file,load:()=>import(pathToFileURL(file))};
}
