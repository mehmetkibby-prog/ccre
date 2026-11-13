import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';

const root=path.resolve(import.meta.dirname,'../r109_latency_completion/working');
const core=path.join(root,'core511-source/scripts/core511');
const hash=x=>createHash('sha256').update(x).digest('hex');
const proofPath=path.join(core,'generated/native-client-proof.json');
const proof=JSON.parse(fs.readFileSync(proofPath));
assert(!proof.r114Rune,'R114 geometry already built; do not rebase on itself');
const expectedSources=['6e00a81ae5f87551e2c85ba95cce99dd402957792323c29101f480a1526403ae','3d0f537861a9e203b9c8e5dee55a116720b6a8da4d43b747b4de2133c86fb2cc','a4be465bdc35291867ce3788b811bce241bd40da4b71c3793f7b49bd2ab86bf3'];
const changes=[];
// Only the rune map geometry changes. All native movement speed, ownership,
// rank, HP, sequence and world-bound checks remain in their original handlers.
function openCoast(source) {
  let next=source;
  for (const [name,value] of [
    ['RUNE_WALKABLE_POLYGON','[[0,0],[RUNE_WORLD.width,0],[RUNE_WORLD.width,RUNE_WORLD.height],[0,RUNE_WORLD.height]]'],
    ['RUNE_OBSTACLES','[]'],
  ]) {
    const pattern=new RegExp('((?:export )?const '+name+'\\s*=)[^\\n]+;');
    assert.equal([...next.matchAll(new RegExp(pattern,'g'))].length,1,'unique '+name);
    next=next.replace(pattern,'$1'+value+';');
  }
  parse(next,{ecmaVersion:'latest',sourceType:'module'});
  return next;
}
for(const file of ['native510-bb3a6cc689c6/lib/runes.mjs','native510-bb3a6cc689c6/realtime-server/src/rune-map.mjs','core511-source/scripts/core511/generated/reward-services.mjs']){
  const target=path.join(root,file),before=fs.readFileSync(target,'utf8'),after=openCoast(before);
  assert.equal(hash(before),expectedSources[changes.length],'expected R113 source: '+file);
  changes.push({file,before:hash(before),after:hash(after)});
  fs.writeFileSync(target,after);
}
const rewardProofFile=path.join(core,'generated/reward-services-proof.json');
const rewardProof=JSON.parse(fs.readFileSync(rewardProofFile));
rewardProof.r114Geometry={source:'lib/runes.mjs',scope:['rune','rune_v2'],changes:changes.slice(0,3),preserved:'original reward, RNG, receipt and four-channel code'};
rewardProof.generatedSha256=changes[2].after;
fs.writeFileSync(rewardProofFile,JSON.stringify(rewardProof,null,2)+'\n');

const dir=path.join(core,'generated/client');
const original=fs.readFileSync(path.join(dir,proof.name),'utf8');
assert.equal(hash(original),proof.patchedSha256);
const game=openCoast(original),name='game-client-core511-r114-'+hash(game).slice(0,16)+'.js';
const oldPortal=fs.readFileSync(path.join(dir,proof.portal.name),'utf8');
assert.equal(hash(oldPortal),proof.portal.patchedSha256);
assert(oldPortal.includes(proof.name));
const portal=oldPortal.replaceAll(proof.name,name),portalName='auth-portal-core511-r114-'+hash(portal).slice(0,16)+'.js';
for(const [file,bytes] of [[name,game],[portalName,portal]]){
  const target=path.join(dir,file);
  if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),hash(bytes));
  else fs.writeFileSync(target,bytes);
}
const next={...proof,name,patchedSha256:hash(game),portal:{...proof.portal,name:portalName,patchedSha256:hash(portal)},r114Rune:{sourceGame:proof.name,sourceGameSha256:proof.patchedSha256,sourcePortal:proof.portal.name,scope:['rune','rune_v2'],geometry:'rectangular world boundary; no interior or coastline collision'}};
fs.writeFileSync(proofPath,JSON.stringify(next,null,2)+'\n');
fs.mkdirSync(path.join(import.meta.dirname,'evidence'),{recursive:true});
fs.writeFileSync(path.join(import.meta.dirname,'evidence/rune-build.json'),JSON.stringify({changes,game:name,portal:portalName,live:false},null,2)+'\n');
console.log(JSON.stringify({changes,game:name,portal:portalName}));
