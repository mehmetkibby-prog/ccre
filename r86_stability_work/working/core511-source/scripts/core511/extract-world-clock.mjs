import fs from 'node:fs';
import {adaptAdventureClock} from './adapt-adventure-generated.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=process.env.COL_CORE511_RULE_OUTPUT??path.join(import.meta.dirname,'generated');
const hash=x=>createHash('sha256').update(x).digest('hex'),bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));
const baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(bytes),file='vds-server/src/world-loop.mjs',source=fs.readFileSync(path.join(root,file),'utf8');
if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Changed V510 world clock rules');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),clazz=ast.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='WorldLoop').declaration;
const replacements={regenerate:[['this.channel>1&&m.channel===0','!this.owns(m)||this.blocked(m.id)'],['this.combat.updateMonster(m,{hp,last_regen_at_ms:nowMs});','if(this.combat.updateMonster(m,{hp,last_regen_at_ms:nowMs})===false)this.regenClocks.set(id,last);']],due:[['(!this.channel||this.channel===1||m.channel!==0)','this.owns(m)']],needsRepair:[['this.channel>1&&m.channel===0','!this.owns(m)'],["id==='stone-boss-black-c3'","id==='stone-boss-black-c3'||id==='stone-boss-black-c4'"]],needsDespawn:[['if(m.is_boss','if(this.owns(m)&&m.is_boss']],dragonDue:[['if(!m||!row)','if(!m||!this.owns(m)||!row)']]};
const slices=[],methods=[],derived=[];
for(const [name,edits]of Object.entries(replacements)){
 const node=clazz.body.body.find(n=>n.key.name===name),original=source.slice(node.start,node.end);let changed=original;
 for(const [from,to]of edits){if(changed.split(from).length!==2)throw Error('World clock edit drift '+name);changed=changed.replace(from,to);}
 slices.push({name,start:node.start,end:node.end,sha256:hash(original),edits});methods.push(changed);
 if(name==='needsRepair'||name==='needsDespawn'){
  const target=name==='needsRepair'?'repairCandidates':'despawnCandidates';
  let candidate=changed.replace(name+'(',target+'(');const at=candidate.indexOf('{');candidate=candidate.slice(0,at+1)+'const rows=[];'+candidate.slice(at+1);candidate=candidate.replaceAll('return true','rows.push(m)').replace('return false','return rows');
  derived.push({name:target,sourceMethod:name,generatedSha256:hash(candidate),edits:['collect every matching native predicate instead of returning after the first']});methods.push(candidate);
 }
}
const relative=name=>JSON.stringify(path.relative(out,path.join(root,'vds-server/src/'+name)));
let generated=`import {pveEntries489} from './aggro-rules.mjs';\nimport {colLabIsMonster,colLabMonsterActive} from ${relative('loadlab-gameplay.mjs')};\nexport class NativeWorldClockRules {\n${methods.join('\n')}\n}\n`;
const extractedSha256=hash(generated);generated=adaptAdventureClock(generated);
// Record the pre-existing R19 post-extraction edit in the method proof too.
slices.find(row=>row.name==='needsRepair').edits.push(["if(!colLabMonsterActive(m)||id==='dragon-world-1'","if(isAdventureArea(m.area)||!colLabMonsterActive(m)||id==='dragon-world-1'"]);
const finalAst=parse(generated,{ecmaVersion:'latest',sourceType:'module'});
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'world-clock-rules.mjs'),generated);
for(const method of derived){const node=finalAst.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='NativeWorldClockRules').declaration.body.body.find(n=>n.key.name===method.name);method.generatedSha256=hash(generated.slice(node.start,node.end));}
fs.writeFileSync(path.join(out,'world-clock-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),slices,derived,generatedSha256:hash(generated),extractedSha256,adaptation:'count-checked R19 ordinary-map adventure hooks',notes:['Explicit independent ownership replaces CH1 shared ownership','Regeneration defers monsters held by a durable operation without advancing their clocks','All formulas, rounding, limits, engagement expiry and loadlab guards preserved']},null,2)+'\n');
