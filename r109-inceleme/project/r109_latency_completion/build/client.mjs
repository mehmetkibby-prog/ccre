import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {build} from '/workspace/ccre/r60_mount_work/tooling/node_modules/esbuild/lib/main.js';
import {parse} from '/tmp/col-perf-r11-dependencies/node_modules/acorn/dist/acorn.mjs';
const root=path.resolve(import.meta.dirname,'..'),base=root+'/../r104_boot_repair/working',work=root+'/working',suffix='/core511-source/scripts/core511',core=work+suffix;
const read=p=>fs.readFileSync(p,'utf8'),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex'),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const old=json(base+suffix+'/generated/native-client-proof.json'),composition=json(base+suffix+'/generated/native-http-composition-proof.json');
const bytes=(await build({absWorkingDir:work,entryPoints:[core+'/client-transport.mjs'],bundle:true,platform:'browser',format:'esm',target:'es2022',write:false,legalComments:'none',logLevel:'silent'})).outputFiles[0].contents;
const bridge='core511-transport-r105-'+sha(bytes).slice(0,16)+'.js';fs.writeFileSync(core+'/generated/client/'+bridge,bytes);
let game=read(base+suffix+'/generated/client/'+old.name);assert.equal(game.split(old.bridge).length-1,1);game=game.replace(old.bridge,bridge);assert(game.includes('https://discord.gg/sCbQh9D8r'));game=game.replaceAll('https://discord.gg/sCbQh9D8r','https://discord.gg/pBywtjhTN');
const gameName='game-client-core511-r105-'+sha(game).slice(0,16)+'.js';parse(game,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(core+'/generated/client/'+gameName,game);
let portal=read(base+suffix+'/generated/client/'+old.portal.name);assert.equal(portal.split(old.name).length-1,2);portal=portal.replaceAll(old.name,gameName);assert(portal.includes('https://discord.gg/sCbQh9D8r'));portal=portal.replaceAll('https://discord.gg/sCbQh9D8r','https://discord.gg/pBywtjhTN');
const portalName='auth-portal-core511-r105-'+sha(portal).slice(0,16)+'.js';parse(portal,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(core+'/generated/client/'+portalName,portal);
write(core+'/generated/native-client-proof.json',{...old,name:gameName,patchedSha256:sha(game),bridge,bridgeSha256:sha(bytes),portal:{...old.portal,name:portalName,patchedSha256:sha(portal)},connectionRecoveryR105:{sourceSha256:sha(read(core+'/client-transport.mjs')),worldSilenceMs:15000,requestDeadlineMs:10000,stableBackoffMs:15000,scope:'Recover lost world stream and preserve receipt-based command ordering. No gameplay or database rule changes.'}});
const {CLIENT_ASSET_NAMESPACE:namespace}=await import(core+'/client-assets.mjs');
for(const runtime of ['http-runtime','accounts-runtime']){
 const file='/'+runtime+'/dist-vds/server/index.js';let text=read(base+file);
 for(const [a,b]of [[old.name,gameName],[old.portal.name,portalName],[composition.clientAssetNamespace,namespace]]){assert(text.includes(a));text=text.replaceAll(a,b);}
 fs.writeFileSync(work+file,text);if(runtime==='http-runtime')write(core+'/generated/native-http-composition-proof.json',{...composition,generatedSha256:sha(text),clientAssetNamespace:namespace});
}
const bindings=read(base+suffix+'/native-http-bindings.mjs');assert.equal(bindings.split("readerBoot:'R104_BOOT1',").length-1,1);fs.writeFileSync(core+'/native-http-bindings.mjs',bindings.replace("readerBoot:'R104_BOOT1',","readerBoot:'R104_BOOT1',connectionRecovery:'R105_TOWER2',"));
const result={namespace,game:gameName,portal:portalName,admin:old.admin.name,bridge,clientNew:[gameName,portalName,old.admin.name,bridge]};write(root+'/evidence/client-build.json',result);console.log(JSON.stringify(result));
