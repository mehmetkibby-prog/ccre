import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';

// Move only the native synchronous projection, never the old HTTP sender,
// SQL invalidation/refresh scheduler or constructor, into the resident core.
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated');
const hash=s=>createHash('sha256').update(s).digest('hex'),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
const bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(bytes),file='vds-server/src/world-push.mjs',source=fs.readFileSync(path.join(root,file),'utf8');
if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Changed native world projection');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),declarations=[],methods=[],proof=[];
const names=new Set(['MONSTER_FIELDS','PLAYER_FIELDS','pick','liveDrops503','regionalExpiryCache','timedFields','WorldMonsterMap','maintenanceWorldOwner491','maintenanceWorldView491']);
const methodNames=new Set(['project','forgetFriends487','seedFriends487','friendCommitted487','friendsView487']);
for(const outer of ast.body){
 const node=outer.declaration??outer,name=node.id?.name??node.declarations?.[0]?.id.name;
 if(names.has(name)){const text=source.slice(node.start,node.end);declarations.push(text);proof.push({name,sha256:hash(text)});}
 if(name==='WorldPush')for(const method of node.body.body)if(methodNames.has(method.key.name)){const text=source.slice(method.start,method.end);methods.push(text);proof.push({name:method.key.name,sha256:hash(text)});}
}
if(methods.length!==methodNames.size||declarations.length!==names.size)throw Error('Native projection layout changed');
const rel=p=>JSON.stringify(path.relative(out,path.join(root,p)));
const generated=`import {friendOnline487} from ${rel('lib/friends487.mjs')};
import {partyView486} from ${rel('lib/party-view486.mjs')};
import {colLabIsMonster,colLabCanSeeMonster,colLabCanSeeCombat,colLabPlayerRun} from ${rel('vds-server/src/loadlab-gameplay.mjs')};
import {stoneBossFields476} from ${rel('lib/stone-boss-ranking476.mjs')};
import {publicWorldPlayer} from ${rel('vds-server/src/world-push-player.mjs')};
import {diffWorld,worldPushRoom,WORLD_PUSH_PROTOCOL} from ${rel('lib/world-push.mjs')};
import {pveEntries489} from ${rel('vds-server/src/pve-multi489.mjs')};
export {eventForViewer} from ${rel('realtime-server/src/visibility.mjs')};
export {colLabEventAudience,colLabAssertAction} from ${rel('vds-server/src/loadlab-gameplay.mjs')};
export {publicWorldPlayer,diffWorld,worldPushRoom,WORLD_PUSH_PROTOCOL,colLabPlayerRun,stoneBossFields476,pveEntries489};
export function createWorldProjectionRules({globals,runeV2BossWave484}){
 const globalThis=globals;
 ${declarations.join('\n')}
 class NativeProjection {${methods.join('\n')}}
 return {NativeProjection,WorldMonsterMap,timedFields,liveDrops503,MONSTER_FIELDS,PLAYER_FIELDS,pick,maintenanceWorldView491};
}
`;
parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'world-projection-rules.mjs'),generated);
fs.writeFileSync(path.join(out,'world-projection-proof.json'),JSON.stringify({baselineManifestSha256:baseline,file,sourceSha256:hash(source),bodies:proof,generatedSha256:hash(generated),edits:['Native project/visibility/private allowlist/timed field bodies preserved exactly','Dependency injection supplies the same maintenance state and native rune wave view','No legacy constructor, SQL access, realtime HTTP, async scheduler or timers included']},null,2)+'\n');
console.log(JSON.stringify({bytes:Buffer.byteLength(generated),bodies:proof.length}));
