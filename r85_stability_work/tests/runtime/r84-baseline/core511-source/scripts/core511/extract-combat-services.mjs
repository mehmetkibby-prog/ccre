import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated'),hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json')),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(bytes),proof=[];
function read(name){const source=fs.readFileSync(path.join(root,name),'utf8');if(manifest.files.find(r=>r.path===name)?.sha256!==hash(source))throw Error('Native service mismatch '+name);proof.push({file:name,sha256:hash(source)});return source;}
function walk(node,fn){
 if(!node||typeof node!=='object')return;fn(node);
 for(const value of Object.values(node)){
  if(Array.isArray(value)){for(const child of value)walk(child,fn);}
  else if(value?.type)walk(value,fn);
 }
}
function method(file,factory,name){const source=read(file),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});let outer,found;walk(ast,n=>{if(n.type==='FunctionDeclaration'&&n.id.name===factory)outer=n;});walk(outer,n=>{if(n.type==='Property'&&n.key.name===name&&n.method)found=n;});if(!found)throw Error('Missing native method '+name);return source.slice(found.start,found.end);}
const factor=method('vds-server/src/runes.mjs','createRunes','factor'),bonuses=method('vds-server/src/ranks.mjs','createRanks','bonuses');
const rankProject=method('vds-server/src/ranks.mjs','createRanks','project'),rankSource=read('vds-server/src/ranks.mjs');let infoNode;walk(parse(rankSource,{ecmaVersion:'latest',sourceType:'module'}),node=>{if(node.type==='VariableDeclarator'&&node.id.name==='info')infoNode=node;});if(!infoNode)throw Error('Native rank info missing');const rankInfo=rankSource.slice(infoNode.start,infoNode.end);
const projectFrom="const states=new Map(db.prepare(`SELECT ${fields} FROM players WHERE id IN (${rows.map(()=>'?').join(',')})`).all(...rows.map(p=>p.id)).map(p=>[p.id,p]));",projectTo='const states=new Map(rows.map(p=>player(p.id)).filter(Boolean).map(p=>[p.id,p]));';if(rankProject.split(projectFrom).length!==2)throw Error('Native rank projection lookup changed');
const from="const p=db.prepare('SELECT level,rank_tier,rank_unlocked,rank_cosmetics FROM players WHERE id=?').get(id);",to='const p=player(id);';
if(bonuses.split(from).length!==2)throw Error('Native rank lookup changed');
const rune=read('lib/runes.mjs'),v2=read('lib/rune-v2.mjs'),declarations=[];
for(const file of ['vds-server/src/extra-products.mjs','lib/guild-skill.mjs','lib/infinite-power.mjs'])read(file);
for(const [source,names]of [[rune,['runeMonsterKey']],[v2,['isRuneV2Boss','runeV2MonsterKey']]]){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 for(const name of names){const n=ast.body.find(n=>n.declaration?.id?.name===name||n.declaration?.declarations?.some(d=>d.id.name===name)).declaration;declarations.push(source.slice(n.start,n.end).replaceAll('[1-3]','[1-4]'));}
}
const rel=name=>JSON.stringify(path.relative(out,path.join(root,name)));
const generated=`import {totalRankBonuses,validateRankConfig,RANK_AREAS} from ${rel('lib/ranks.mjs')};
import {arenaWingsActive477} from ${rel('lib/arena-wings477.mjs')};
import {runeEligible,validateRuneConfig} from ${rel('lib/runes.mjs')};
import {validateRuneV2Config,RUNE_V2_AREA} from ${rel('lib/rune-v2.mjs')};
import {statusBonus,validateStatusConfig} from ${rel('lib/status.mjs')};
export {extraBuff} from ${rel('vds-server/src/extra-products.mjs')};
export {guildSkillLevel,EMPTY_GUILD_BUFF} from ${rel('lib/guild-skill.mjs')};
export {infiniteEquipmentPower} from ${rel('lib/infinite-power.mjs')};
${declarations.join('\n')}
export function createCombatServices({player,rank,rune,runeV2,status,profiles}){
 const rankConfig=validateRankConfig(rank),current={config:validateRuneConfig(rune)},runeV2Config=validateRuneV2Config(runeV2),statusConfig=validateStatusConfig(status);
 const globalThis={__colStatus:{bonus:(p,stat)=>statusBonus(p,stat,statusConfig)}};
 const settings=()=>({config:rankConfig});const ${rankInfo};const nativeRank={${bonuses.replace(from,to)},${rankProject.replace(projectFrom,projectTo)}},ranks=new Map();
 const cachedRank=id=>{const p=player(id);if(!p){ranks.delete(id);return Object.freeze(nativeRank.bonuses(id));}const old=ranks.get(id);if(old&&old.level===p.level&&old.tier===p.rank_tier&&old.unlocked===p.rank_unlocked&&old.cosmetics===p.rank_cosmetics)return old.result;
  const result=Object.freeze(nativeRank.bonuses(id));ranks.set(id,{level:p?.level,tier:p?.rank_tier,unlocked:p?.rank_unlocked,cosmetics:p?.rank_cosmetics,result});return result;};
 return Object.freeze({__colStatus:globalThis.__colStatus,__colRanks:Object.freeze({bonuses:cachedRank,settings,project:nativeRank.project,forget:id=>ranks.delete(id)}),__colRunes:Object.freeze({${factor},settings:()=>current,monster(m){const key=runeMonsterKey(m);return key?current.config.monsters[key]:null;}}),
 __colRuneV2:Object.freeze({settings:()=>({config:runeV2Config}),monster:m=>{const key=runeV2MonsterKey(m);return key?runeV2Config.monsters[key]:null;}}),
 __colEventIsland444:Object.freeze({profile:m=>profiles.get(typeof m==='string'?m:m.id)})});
}
`;
parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'combat-services.mjs'),generated);
fs.writeFileSync(path.join(out,'combat-services-proof.json'),JSON.stringify({baselineManifestSha256:baseline,sources:proof,nativeRuneFactorSha256:hash(factor),nativeRankBonusesSha256:hash(bonuses),nativeRankProjectionSha256:hash(rankProject),nativeRankInfoSha256:hash(rankInfo),generatedSha256:hash(generated),edits:['rank SELECT replaced by resident player lookup; cache invalidates on every native rank input change','rank cache forgets detached actors and never retains absent-player lookups','original rank project/info retained; bulk SELECT replaced by bounded resident player lookup','rune/status factor uses original method and original statusBonus','rune/v2 classifiers extend channel set to4','event profiles use hydrated immutable Map'],productionHydrationBound:true},null,2)+'\n');
console.log(JSON.stringify({bytes:Buffer.byteLength(generated)}));
