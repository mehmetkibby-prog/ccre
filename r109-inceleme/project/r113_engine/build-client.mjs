import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

// Rebuild only the transport. Rebuilding the V510 base would discard every
// subsequent HUD, champion, skill, authentication and preregistration patch.
const core=path.resolve(import.meta.dirname,'../r109_latency_completion/working/core511-source/scripts/core511');
const out=path.join(core,'generated/client'),proofPath=path.join(core,'generated/native-client-proof.json');
const proof=JSON.parse(fs.readFileSync(proofPath)),hash=value=>createHash('sha256').update(value).digest('hex');
const oldGame=fs.readFileSync(path.join(out,proof.name),'utf8'),oldPortal=fs.readFileSync(path.join(out,proof.portal.name),'utf8');
assert.equal(hash(oldGame),proof.patchedSha256);assert.equal(hash(oldPortal),proof.portal.patchedSha256);
assert.equal(hash(fs.readFileSync(path.join(out,proof.bridge))),proof.bridgeSha256);
assert(oldGame.includes(proof.bridge));assert(oldPortal.includes(proof.name));
const result=await build({entryPoints:[path.join(core,'client-transport.mjs')],bundle:true,platform:'browser',format:'esm',target:'es2022',write:false,legalComments:'none',logLevel:'silent'});
const bytes=result.outputFiles[0].contents,bridge='core511-transport-r113-'+hash(bytes).slice(0,16)+'.js';
const game=oldGame.replaceAll(proof.bridge,bridge),name='game-client-core511-r113-'+hash(game).slice(0,16)+'.js';
const portal=oldPortal.replaceAll(proof.name,name),portalName='auth-portal-core511-r113-'+hash(portal).slice(0,16)+'.js';
// Content-addressed assets are never overwritten with different content.
for(const [file,content]of [[bridge,bytes],[name,game],[portalName,portal]]){
 const target=path.join(out,file);if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),hash(content));else fs.writeFileSync(target,content);
}
const next={...proof,name,bridge,bridgeSha256:hash(bytes),patchedSha256:hash(game),transportSourceSha256:hash(fs.readFileSync(path.join(core,'client-transport.mjs'))),portal:{...proof.portal,name:portalName,patchedSha256:hash(portal)},engineR113:{version:1,baseline:proof.engineR113?.baseline??{name:proof.name,bridge:proof.bridge,portal:proof.portal.name},orderedActions:2}};
fs.writeFileSync(proofPath,JSON.stringify(next,null,2)+'\n');
console.log(JSON.stringify({name,bridge,portal:portalName,preservedFeatures:Object.keys(proof).filter(k=>k!=='engineR113')}));
