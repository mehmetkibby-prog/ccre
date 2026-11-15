import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {parse} from 'acorn';
import {analyze} from 'eslint-scope';
import {patchGameR118} from './patch-game.mjs';
import {patchAdminR118} from './patch-admin.mjs';

const project=path.resolve(import.meta.dirname,'..');
const review=path.resolve(project,'../..');
const core=path.resolve(project,'../r109_latency_completion/working/core511-source/scripts/core511');
const generated=path.join(core,'generated/client');
const hash=s=>createHash('sha256').update(s).digest('hex');
const baselineZip=path.resolve(project,'../r117_hook_rate/artifacts/R117_HOOK10_28ecda32950b.zip');
const baselineProof=execFileSync('python3',['-c',"import zipfile,sys;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read('payload/core511-source/scripts/core511/generated/native-client-proof.json'))",baselineZip],{maxBuffer:8*1024*1024});
const proof=JSON.parse(baselineProof);
assert.equal(proof.name,'game-client-core511-r117-4feaa261f90b5d9c.js');
const old={game:proof.name,admin:proof.admin.name,portal:proof.portal.name};
const read=name=>fs.readFileSync(path.join(generated,name),'utf8');
const files=[],assets=[],sources=[];
const immutable=(name,data)=>{const target=path.join(generated,name);if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),hash(data),name+' immutable');else fs.writeFileSync(target,data);files.push('generated/client/'+name);assets.push({name,sha256:hash(data),bytes:Buffer.byteLength(data)});return name;};
const js=(prefix,text)=>{execFileSync(process.execPath,['--check','--input-type=module'],{input:text,stdio:['pipe','pipe','pipe']});return immutable(prefix+'-'+hash(text).slice(0,16)+'.js',text);};
const bundle=async(file,prefix)=>{const result=await build({absWorkingDir:review,entryPoints:[path.join(core,file)],bundle:true,write:false,format:'esm',target:'es2020',charset:'utf8',minify:false,legalComments:'none',metafile:true});for(const input of Object.keys(result.metafile.inputs)){const full=path.resolve(review,input);if(full.startsWith(core+path.sep)){const local=path.relative(core,full);if(!sources.includes(local))sources.push(local);}}return js(prefix,result.outputFiles[0].text);};
const artManifest=JSON.parse(fs.readFileSync(path.join(project,'art/manifest.json')));
const media=[];for(const entry of Object.values(artManifest.assets)){const data=fs.readFileSync(path.join(project,'art/optimized',entry.file));assert.equal(hash(data),entry.sha256);assert.equal(data.length,entry.bytes);immutable(entry.file,data);media.push({name:entry.file,sha256:entry.sha256,bytes:entry.bytes});}
const names={};
for(const [key,file]of Object.entries({ui:'royal-client-r118.mjs',art:'royal-visuals-r118.mjs',map:'champions-client-r118.mjs',presentation:'royal-presentation-r118.mjs',royalAdmin:'royal-admin-client-r118.mjs',championsAdmin:'champions-admin-client-r118.mjs',nav:'admin-navigation-r66.mjs'}))names[key]=await bundle(file,'core511-'+key+'-r118');
const contentOld='content-client-r103-chat-c073632f6ace7ffd.js';
const contentSource=read(contentOld);
// Preserve all subsequent chat/mobile fixes in the distributed R103 helper.
let contentNext=contentSource.replaceAll('Kadim Z\\xFCmr\\xFCt','Kadim Z\\xFCmr\\xFCt / Kraliyet');
assert.equal(contentSource.split('Kadim Z\\xFCmr\\xFCt').length-1,4);
assert.equal(contentNext.split('Math.round(v.power * 120) / 100').length-1,1);
contentNext=contentNext.replace('Math.round(v.power * 120) / 100',"v.rarity === 'royal' ? Math.round(v.power * 1.2) : Math.round(v.power * 120) / 100");
names.content=js('core511-content-r118',contentNext);
const transportOld=proof.bridge,transportSource=read(transportOld);
const transportAnchor='var NATIVE_ACTIONS = Object.freeze([...CONTENT_ACTIONS_R102,';
assert.equal(transportSource.split(transportAnchor).length-1,1);
const transportNext=transportSource.replace(transportAnchor,'var NATIVE_ACTIONS = Object.freeze(["royal_transform_r118","royal_salvage_r118","travel_champions",...CONTENT_ACTIONS_R102,');
names.transport=js('core511-transport-r118',transportNext);
const mediaNames={icons:Object.fromEntries(['emerald_dust','royal_crown'].map(key=>[key,artManifest.assets['royal-icon-'+key+'-r118'].file]))};
const gameSource=read(old.game),adminSource=read(old.admin),portalSource=read(old.portal);
assert.equal(hash(gameSource),proof.patchedSha256);assert.equal(hash(adminSource),proof.admin.patchedSha256);assert.equal(hash(portalSource),proof.portal.patchedSha256);
const game=patchGameR118(gameSource,names,mediaNames);
assert.equal(game.text.split(transportOld).length-1,1);game.text=game.text.replace(transportOld,names.transport);game.edits.push({label:'new commands use existing durable channel transport',from:transportOld,to:names.transport,count:1});
assert.equal(game.text.split(contentOld).length-1,1);game.text=game.text.replace(contentOld,names.content);game.edits.push({label:'preserve content helper with royal Sonsuz labels',from:contentOld,to:names.content,count:1});
const admin=patchAdminR118(adminSource,names);
function unresolved(source){const ast=parse(source,{ecmaVersion:2022,sourceType:'module',ranges:true});return new Set(analyze(ast,{ecmaVersion:2022,sourceType:'module',optimistic:true,ignoreEval:true}).globalScope.through.map(ref=>ref.identifier.name));}
for(const [label,before,after]of [['game',gameSource,game.text],['admin',adminSource,admin.text]]){const previous=unresolved(before),next=unresolved(after);const extra=[...next].filter(name=>!previous.has(name));assert.deepEqual(extra,[],label+' introduces no unresolved lexical references');}
// Reverse exact edits proves unrelated compiled code stayed byte-identical.
function inverse(result,original){let restored=result.text;for(const entry of [...result.edits].reverse()){if(entry.prefix){assert(restored.startsWith(entry.prefix));restored=restored.slice(entry.prefix.length);}else{assert.equal(restored.split(entry.to).length-1,entry.count,entry.label+' inverse count');restored=restored.replaceAll(entry.to,entry.from);}}assert.equal(restored,original,'inverse patch reproduces R117');}
inverse(game,gameSource);inverse(admin,adminSource);
names.game=js('game-client-core511-r118',game.text);names.admin=js('admin-client-core511-r118',admin.text);
assert.equal(portalSource.split(old.game).length-1,2);names.portal=js('auth-portal-core511-r118',portalSource.replaceAll(old.game,names.game));
const sha=name=>assets.find(row=>row.name===name).sha256;
const next={...proof,name:names.game,patchedSha256:sha(names.game),bridge:names.transport,bridgeSha256:sha(names.transport),admin:{...proof.admin,name:names.admin,patchedSha256:sha(names.admin)},portal:{...proof.portal,name:names.portal,patchedSha256:sha(names.portal)},media:[...(proof.media??[]),...media],r118RoyalChampions:{version:'R118_ROYAL1',baseline:{proofSha256:hash(baselineProof),...old,transport:transportOld,transportSha256:hash(transportSource)},modules:names,assets,sources:sources.map(file=>({file,sha256:hash(fs.readFileSync(path.join(core,file)))})),gameEdits:game.edits,adminEdits:admin.edits}};
// Rebuilds may create earlier immutable candidates. Keep their media proofs too;
// only current graph members are included in the package's clientNew list.
const proofPath=path.join(core,'generated/native-client-proof.json');
const previous=JSON.parse(fs.readFileSync(proofPath));
for(const row of previous.media??[])if(!next.media.some(existing=>existing.name===row.name))next.media.push(row);
fs.writeFileSync(proofPath,JSON.stringify(next,null,2)+'\n');
const namespace='core511-'+createHash('sha256').update(fs.readFileSync(path.join(core,'client-assets.mjs'))).update(JSON.stringify(next)).digest('hex').slice(0,16);
const report={namespace,...names,clientNew:assets.map(row=>row.name),files:['generated/native-client-proof.json',...sources,...files],syntaxChecks:assets.filter(row=>row.name.endsWith('.js')).length,inversePatchVerified:2,scopeChecks:2,mediaBytes:media.reduce((sum,row)=>sum+row.bytes,0),gamePatchCount:game.edits.length,adminPatchCount:admin.edits.length};
fs.writeFileSync(path.join(project,'build/client-spec.json'),JSON.stringify({admin:names.admin,clientNew:report.clientNew},null,2)+'\n');
fs.writeFileSync(path.join(project,'evidence/client-build.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
