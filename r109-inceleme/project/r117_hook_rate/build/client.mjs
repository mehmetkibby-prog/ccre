import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const core=path.resolve(import.meta.dirname,'../../r109_latency_completion/working/core511-source/scripts/core511');
const generated=path.join(core,'generated/client');
const hash=s=>createHash('sha256').update(s).digest('hex');
const proofPath=path.join(core,'generated/native-client-proof.json');
const proofText=fs.readFileSync(proofPath,'utf8'),proof=JSON.parse(proofText);
assert(!proof.r117HookChance,'R117 client graph already built');
const namespace=p=>'core511-'+createHash('sha256').update(fs.readFileSync(path.join(core,'client-assets.mjs'))).update(JSON.stringify(p)).digest('hex').slice(0,16);
const sourcePath=path.join(core,'tower-client.mjs');
const source=fs.readFileSync(sourcePath,'utf8');
const sourceEdits=[
 ['bu sandıktan %6 olasılıkla','bu sandıktan %10 olasılıkla'],
 ["hook?'Sabit %6':'Kaldır'","hook?'Sabit %'+row.chance:'Kaldır'"],
 ['AZRAİL KANCASI %6 / 1 adet sabittir.','AZRAİL KANCASI %10 / 1 adet sabittir.'],
];
function change(original,edits){let text=original;for(const [from,to,count=1]of edits){assert.equal(text.split(from).length-1,count,'unique edit: '+from);text=text.replaceAll(from,to);}let restored=text;for(const [from,to]of [...edits].reverse())restored=restored.replaceAll(to,from);assert.equal(restored,original,'inverse edit proof');return text;}
const sourceNext=change(source,sourceEdits);
const assets=[];
function asset(oldName,oldSha,prefix,edits){const original=fs.readFileSync(path.join(generated,oldName),'utf8');assert.equal(hash(original),oldSha,oldName+' baseline hash');const text=change(original,edits),name=prefix+'-'+hash(text).slice(0,16)+'.js';execFileSync(process.execPath,['--check','--input-type=module'],{input:text,stdio:['pipe','pipe','pipe']});assets.push({name,text,sourceName:oldName,sourceSha256:hash(original),sha256:hash(text),edits:edits.map(([from,to,count=1])=>({from,to,count}))});return name;}
const labelEdits=[
 ['bu sand\\u0131ktan %6 olas\\u0131l\\u0131kla','bu sand\\u0131ktan %10 olas\\u0131l\\u0131kla'],
 ['hook ? "Sabit %6" :','hook ? "Sabit %" + row.chance :'],
 ['AZRA\\u0130L KANCASI %6 / 1 adet sabittir.','AZRA\\u0130L KANCASI %10 / 1 adet sabittir.'],
];
const oldTower=proof.additionsR102.tower,oldAdminTower=proof.additionsR102.adminTower;
assert.equal(oldTower,'core511-tower-r102-auto-ecdbd6f626b40250.js');
assert.equal(oldAdminTower,'core511-tower-admin-r102-hook-a06be5f2a5d1fa7a.js');
assert.equal(proof.name,'game-client-core511-r114-3a57abcac795f120.js');
assert.equal(proof.admin.name,'admin-client-core511-r103-d967d2e806534317.js');
assert.equal(proof.portal.name,'auth-portal-core511-r114-e8621310b1cae69d.js');
const tower=asset(oldTower,proof.additionsR102.towerSha256,'core511-tower-r117-hook10',labelEdits);
const adminTower=asset(oldAdminTower,proof.additionsR102.adminTowerSha256,'core511-tower-admin-r117-hook10',labelEdits);
const game=asset(proof.name,proof.patchedSha256,'game-client-core511-r117',[[oldTower,tower,3]]);
const admin=asset(proof.admin.name,proof.admin.patchedSha256,'admin-client-core511-r117',[[oldAdminTower,adminTower]]);
const portal=asset(proof.portal.name,proof.portal.patchedSha256,'auth-portal-core511-r117',[[proof.name,game,2]]);
const sha=name=>assets.find(row=>row.name===name).sha256;
const next={...proof,name:game,patchedSha256:sha(game),admin:{...proof.admin,name:admin,patchedSha256:sha(admin)},portal:{...proof.portal,name:portal,patchedSha256:sha(portal)},additionsR102:{...proof.additionsR102,tower,towerSha256:sha(tower),adminTower,adminTowerSha256:sha(adminTower)},r117HookChance:{baseline:{proofSha256:hash(proofText),namespace:namespace(proof),game:proof.name,admin:proof.admin.name,portal:proof.portal.name},chancePercent:10,source:{file:'tower-client.mjs',sourceSha256:hash(source),sha256:hash(sourceNext),edits:sourceEdits.map(([from,to])=>({from,to,count:1}))},assets:assets.map(({text,...row})=>row),scope:'Only Azrail hook probability labels and immutable asset references; admin fixed-rate controls and all later client patches retained.'}};
execFileSync(process.execPath,['--check','--input-type=module'],{input:sourceNext,stdio:['pipe','pipe','pipe']});
for(const row of assets){const target=path.join(generated,row.name);assert(!fs.existsSync(target),'new immutable name: '+row.name);}
fs.writeFileSync(sourcePath,sourceNext);
for(const row of assets)fs.writeFileSync(path.join(generated,row.name),row.text);
fs.writeFileSync(proofPath,JSON.stringify(next,null,2)+'\n');
const report={namespace:namespace(next),baselineNamespace:namespace(proof),game,admin,portal,clientNew:assets.map(row=>row.name),files:['tower-client.mjs','generated/native-client-proof.json',...assets.map(row=>'generated/client/'+row.name)],syntaxChecks:6,inverseEditsVerified:6,assets:assets.map(({text,...row})=>row)};
fs.writeFileSync(path.resolve(import.meta.dirname,'../evidence/client-build.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
