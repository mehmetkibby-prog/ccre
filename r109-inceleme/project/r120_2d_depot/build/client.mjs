import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {analyze} from 'eslint-scope';
import {build} from 'esbuild';
const root=path.resolve(import.meta.dirname,'..'),review=path.resolve(root,'../..'),core=path.resolve(root,'../r109_latency_completion/working/core511-source/scripts/core511');
const zip=path.resolve(root,'../r119_monster_motion/artifacts/R119_MOTION_4596197ee9b4.zip');
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(fs.readFileSync(zip)),'8f544b172c6ea7afc737267f587c61daada01f6c6d33ba61d97a9db830575e39');
const read=name=>execFileSync('python3',['-c','import sys,zipfile;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]))',zip,'payload/core511-source/scripts/core511/'+name],{maxBuffer:16*1024*1024}).toString();
const old=JSON.parse(read('generated/native-client-proof.json')),before=read('generated/client/'+old.name);
const urls=s=>s.replace(/https:\/\/(?:www\.)?coreoflife\.net(?![\w.-])/g,'https://2d.coreoflife.net');
const ast=parse(before,{ecmaVersion:2022,sourceType:'module',ranges:true}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='Ll');assert(fn);
let nav;
function walk(n){if(!n||typeof n!=='object')return;if(n.type==='CallExpression'&&n.arguments[1]?.properties?.some(p=>p.key?.name==='className'&&p.value?.quasis?.[0]?.value?.cooked==='storage-pages')){assert(!nav);nav=n;}for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v?.type)walk(v);}
walk(fn);assert(nav);
const ret=fn.body.body.find(n=>n.type==='ReturnStatement'),children=ret.argument.arguments[1].properties.find(p=>p.key.name==='children').value;
const navSource=before.slice(nav.start,nav.end);assert.equal(before.slice(nav.end,nav.end+2),', ');
let game=before.slice(0,nav.start)+before.slice(nav.end+2);
const add=`(0,z.jsx)('style',{children:DEPOT_STYLE_R120}), i2 && ${navSource}, `;
game=game.slice(0,children.start+1)+add+game.slice(children.start+1);
const assets=[],files=[];
function immutable(prefix,text){
 execFileSync(process.execPath,['--check','--input-type=module'],{input:text});
 const name=prefix+'-'+hash(text).slice(0,16)+'.js',p=core+'/generated/client/'+name;
 if(fs.existsSync(p))assert.equal(fs.readFileSync(p,'utf8'),text);else fs.writeFileSync(p,text);
 assets.push({name,sha256:hash(text),bytes:Buffer.byteLength(text)});files.push('generated/client/'+name);return name;
}
const bundled=await build({absWorkingDir:review,entryPoints:[core+'/depot-style-r120.mjs'],bundle:true,write:false,format:'esm',target:'es2020',charset:'utf8',minify:false,legalComments:'none'});
const depot=immutable('core511-depot-r120',bundled.outputFiles[0].text);
game=`import {DEPOT_STYLE_R120} from './${depot}';\n`+urls(game);
const globals=s=>new Set(analyze(parse(s,{ecmaVersion:2022,sourceType:'module',ranges:true}),{ecmaVersion:2022,sourceType:'module',optimistic:true,ignoreEval:true}).globalScope.through.map(r=>r.identifier.name));
const prior=globals(before);assert.deepEqual([...globals(game)].filter(n=>!prior.has(n)),[]);
const name=immutable('game-client-core511-r120',game);
const portal=immutable('auth-portal-core511-r120',urls(read('generated/client/'+old.portal.name)).replaceAll(old.name,name));
const adminBefore=fs.readFileSync(core+'/generated/client/'+old.admin.name,'utf8');
// The R119 package retained this exact R118 admin source.
const admin=immutable('admin-client-core511-r120',urls(adminBefore));
const proof={...old,name,patchedSha256:hash(game),portal:{...old.portal,name:portal,patchedSha256:assets.find(a=>a.name===portal).sha256},admin:{...old.admin,name:admin},r120DomainDepot:{version:'R120_2D_DEPOT1',canonicalOrigin:'https://2d.coreoflife.net',sourcePackageSha256:hash(fs.readFileSync(zip)),depot,assets,storageMutationChanges:false,animationSource:'R119_MOTION1',requestGuardsPreserved:true}};
fs.writeFileSync(core+'/generated/native-client-proof.json',JSON.stringify(proof,null,2)+'\n');
const namespace=createHash('sha256').update(fs.readFileSync(core+'/client-assets.mjs')).update(JSON.stringify(proof)).digest('hex').slice(0,16);
const result={namespace:'core511-'+namespace,game:name,portal,admin,depot,clientNew:assets.map(a=>a.name),files:['depot-style-r120.mjs','generated/native-client-proof.json',...files],sourceGame:old.name,depotNavigationMovedBeforeBank:true,newUnresolvedReferences:0};
fs.writeFileSync(root+'/build/client-spec.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
