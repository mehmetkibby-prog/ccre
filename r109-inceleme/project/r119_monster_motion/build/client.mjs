import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {parse} from 'acorn';
import {analyze} from 'eslint-scope';
const root=path.resolve(import.meta.dirname,'..'),review=path.resolve(root,'../..');
const core=path.resolve(root,'../r109_latency_completion/working/core511-source/scripts/core511');
const zip=path.resolve(root,'../r118_royal_champions/artifacts/R118_ROYAL_61ba37784ffb.zip');
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(fs.readFileSync(zip)),'8a41b77d3cc136729468f0951ce651da56a01d8b71852b730de8e7f26c3c78e5');
const read=name=>execFileSync('python3',['-c','import sys,zipfile;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]))',zip,'payload/core511-source/scripts/core511/'+name],{maxBuffer:16*1024*1024}).toString();
const old=JSON.parse(read('generated/native-client-proof.json'));
const files=[],assets=[];
function immutable(prefix,text){
 execFileSync(process.execPath,['--check','--input-type=module'],{input:text});
 const name=prefix+'-'+hash(text).slice(0,16)+'.js',target=core+'/generated/client/'+name;
 if(fs.existsSync(target))assert.equal(fs.readFileSync(target,'utf8'),text);else fs.writeFileSync(target,text);
 files.push('generated/client/'+name);assets.push({name,sha256:hash(text),bytes:Buffer.byteLength(text)});return name;
}
const module='champions-client-r118.mjs';
const bundled=await build({absWorkingDir:review,entryPoints:[core+'/'+module],bundle:true,write:false,format:'esm',target:'es2020',charset:'utf8',minify:false,legalComments:'none'});
const map=immutable('core511-map-r119',bundled.outputFiles[0].text);
const before=read('generated/client/'+old.name);let game=before;const edits=[];
function edit(label,from,to){assert.equal(game.split(from).length-1,1,label);game=game.replace(from,to);edits.push({label,from,to});}
edit('new immutable map module',old.r118RoyalChampions.modules.map,map);
edit('reuse the North Forest renderer','createChampionsViewR118(ROYAL_MEDIA_R118)','createChampionsViewR118(ROYAL_MEDIA_R118,Zy)');
edit('reuse impact and quality inputs','colChampionsR118.drawEnemy(n3,i5,_r2.current===t4.id,a3,S2,E3,r6.travel,x3)','colChampionsR118.drawEnemy(n3,i5,_r2.current===t4.id,a3,S2,E3,r6.travel,x3,c5,P2.tier)');
edit('optional atlas descriptor; legacy callers stay identical','g2) {\n  let _2 = mv(n2), v2 = _2 === 2','g2, championProfileR119 = null) {\n  let _2 = championProfileR119?.species ?? mv(n2), v2 = _2 === 2');
// Preserve the full forest formula; only the optional profile adds a scale.
edit('champion scale; default remains one','y2 = n2.is_boss ? 1.75 : n2.variant === `katil` ? 1.2 : n2.variant === `agresif` ? 1.08 : 1, b2 =',
 'y2 = (n2.is_boss ? 1.75 : n2.variant === `katil` ? 1.2 : n2.variant === `agresif` ? 1.08 : 1) * (championProfileR119?.scale ?? 1), b2 =');
edit('select the species rows in the champion atlas','Ud(e3, g2, _2, 6, D2, O2 + 28,','Ud(e3, g2, championProfileR119?.atlasIndex ?? _2, championProfileR119?.rows ?? 6, D2, O2 + 28,');
const globals=text=>new Set(analyze(parse(text,{ecmaVersion:2022,sourceType:'module',ranges:true}),{ecmaVersion:2022,sourceType:'module',optimistic:true,ignoreEval:true}).globalScope.through.map(r=>r.identifier.name));
const previous=globals(before);assert.deepEqual([...globals(game)].filter(n=>!previous.has(n)),[]);
let inverse=game;for(const e of [...edits].reverse()){assert.equal(inverse.split(e.to).length-1,1,e.label);inverse=inverse.replace(e.to,e.from);}assert.equal(inverse,before);
const name=immutable('game-client-core511-r119',game),portalBefore=read('generated/client/'+old.portal.name);
assert.equal(portalBefore.split(old.name).length-1,2);
const portal=immutable('auth-portal-core511-r119',portalBefore.replaceAll(old.name,name));
const sha=n=>assets.find(a=>a.name===n).sha256;
const proof={...old,name,patchedSha256:sha(name),portal:{...old.portal,name:portal,patchedSha256:sha(portal)},r119MonsterMotion:{version:'R119_MOTION1',sourcePackageSha256:hash(fs.readFileSync(zip)),sourceCore:'0a603b75d3e5b7cd1d18753f760b2e92566b115cca8a6701e4bf07198308be28',sourceModuleSha256:hash(fs.readFileSync(core+'/'+module)),map,assets,edits}};
fs.writeFileSync(core+'/generated/native-client-proof.json',JSON.stringify(proof,null,2)+'\n');
const namespace='core511-'+createHash('sha256').update(fs.readFileSync(core+'/client-assets.mjs')).update(JSON.stringify(proof)).digest('hex').slice(0,16);
const result={namespace,game:name,portal,admin:old.admin.name,map,clientNew:[...assets.map(a=>a.name),old.admin.name],files:[module,'generated/native-client-proof.json',...files],inversePatchVerified:true,newUnresolvedReferences:0,serverLogicChanges:false,artFilesUnchanged:true};
fs.writeFileSync(root+'/build/client-spec.json',JSON.stringify(result,null,2)+'\n');fs.writeFileSync(root+'/evidence/client-build.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
