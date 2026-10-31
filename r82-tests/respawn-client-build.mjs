import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const sha=source=>createHash('sha256').update(source).digest('hex');
const root=new URL('../',import.meta.url);
const directory=new URL('r82-work/core511-source/scripts/core511/generated/client/',root);
export const oldName='game-client-core511-r79-51fbce3bd7351cf0.js';
export const oldHash='51fbce3bd7351cf064f8828a7fd9fdcb9d1611510b59120154ae5b8cb926bb3c';

export function buildRespawnClientR82(){
 const source=fs.readFileSync(new URL(oldName,directory),'utf8');
 assert.equal(sha(source),oldHash,'pinned shipped R79 game bundle');
 const marker='  (0, R.useEffect)(() => {\n    if (!Ea2 || !Db || wb > 0)';
 const start=source.indexOf(marker),end=source.indexOf('\n  let Ub =',start);
 assert(start>=0&&end>start&&source.indexOf(marker,start+1)<0,'one exact respawn effect');
 const oldEffect=source.slice(start,end);
 const nextEffect=fs.readFileSync(new URL('respawn-client-effect.txt',import.meta.url),'utf8').trimEnd();
 const next=source.slice(0,start)+nextEffect+source.slice(end);
 assert.equal(next.slice(0,start)+oldEffect+next.slice(start+nextEffect.length),source,'exact inverse: only one effect changed');
 const hash=sha(next),name='game-client-core511-r82-'+hash.slice(0,16)+'.js';
 fs.writeFileSync(new URL(name,directory),next);
 assert.equal(sha(fs.readFileSync(new URL(oldName,directory))),oldHash,'old content-addressed URL remains immutable');
 const proof={scope:'one automatic player respawn React effect only',oldName,oldSha256:oldHash,newName:name,newSha256:hash,
  oldBytes:Buffer.byteLength(source),newBytes:Buffer.byteLength(next),oldEffectSha256:sha(oldEffect),newEffectSha256:sha(nextEffect),
  oldEffectStartLine:source.slice(0,start).split('\n').length,exactInverse:true,oldBundleUnchanged:true,
  note:'Client control-flow tests use exact bundle effect bodies and controlled hooks/clock; this is not full browser or live VDS reproduction.'};
 fs.writeFileSync(new URL('respawn-client-patch-proof.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');
 return proof;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildRespawnClientR82(),null,2));
