import fs from 'node:fs';
import {adaptAdventureAggro} from './adapt-adventure-generated.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=process.env.COL_CORE511_RULE_OUTPUT??path.join(import.meta.dirname,'generated');
const hash=x=>createHash('sha256').update(x).digest('hex'),bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));
const baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(bytes),file='vds-server/src/world-loop.mjs',source=fs.readFileSync(path.join(root,file),'utf8');
if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Changed V510 aggro rules');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),clazz=ast.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='WorldLoop').declaration;
const nearby=clazz.body.body.find(n=>n.key.name==='nearby'),original=source.slice(nearby.start,nearby.end);
let changed=original.replace('channels=this.monstersByScope.get(p.area)','channels=this.candidateScopes(p)');
if(changed===original)throw Error('Native aggro candidate lookup changed');
changed=changed.replaceAll('rune-v2-boss-c[1-3]-1','rune-v2-boss-c[1-4]-1');
const oldStone="base.id==='stone-boss-black-c3'";if(changed.split(oldStone).length!==2)throw Error('Native stone aggro range changed');
changed=changed.replace(oldStone,oldStone+"||base.id==='stone-boss-black-c4'");
const areas=ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='EVENT_NEARBY_AREAS444'));
const relative=name=>JSON.stringify(path.relative(out,path.join(root,'vds-server/src/'+name)));
let generated=`import {optimizeR18} from ${relative('perf-r18-features.mjs')};
import {pveEntries489 as nativeEntries} from ${relative('pve-multi489.mjs')};
import {colLabSamePlayerCohort,colLabMayAffectMonster} from ${relative('loadlab-gameplay.mjs')};
${source.slice(areas.start,areas.end)}
const entries=new WeakMap();
export function pveEntries489(row){if(!row)return [];if(!Object.isFrozen(row))return nativeEntries(row);let value=entries.get(row);if(!value){value=nativeEntries(row);entries.set(row,value);}return value;}
export class NativeAggroRules {
${changed}
}
`;
const extractedSha256=hash(generated);generated=adaptAdventureAggro(generated);
const finalAst=parse(generated,{ecmaVersion:'latest',sourceType:'module'});
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'aggro-rules.mjs'),generated);
fs.writeFileSync(path.join(out,'aggro-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),methodSha256:hash(original),generatedSha256:hash(generated),extractedSha256,adaptation:'count-checked R19 ordinary-map adventure hooks',edits:['candidate scope lookup uses spatial grid','rune/black boss id families extended to channel4','immutable engagement JSON parsed once per changed row'],fullAiIntegrationComplete:false},null,2)+'\n');
console.log(JSON.stringify({method:'WorldLoop.nearby',rules:'native aggro ranges,nearest player,ties,32-engagement limit and cohort guards preserved'}));
