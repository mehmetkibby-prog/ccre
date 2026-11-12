import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated');
const hash=s=>createHash('sha256').update(s).digest('hex'),manifestBytes=fs.readFileSync(path.join(root,'realm-package-manifest.json')),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
if(hash(manifestBytes)!==baseline)throw Error('Exact V510 required');const manifest=JSON.parse(manifestBytes);
const catalogue=[['coupons','vds-server/src/cp-coupons483.mjs'],['dragon','vds-server/src/dragon-boss.mjs'],['quests','vds-server/src/quests438.mjs'],['runeLibrary','lib/runes.mjs'],['runeV2Library','lib/rune-v2.mjs'],['eventLibrary','lib/event-island444.mjs'],['cauldronGrants','vds-server/src/cauldron-grants488.mjs'],['cauldron','vds-server/src/cauldron-engine488.mjs'],['arena','vds-server/src/arena-market.mjs'],['battlePass','vds-server/src/battle-pass.mjs'],['events','vds-server/src/event-island444.mjs'],['runes','vds-server/src/runes.mjs'],['runeV2','vds-server/src/rune-v2.mjs'],['evolution','vds-server/src/first-evolution-quest.mjs'],['community','vds-server/src/community-event.mjs'],['guildVillage','vds-server/src/guild-village.mjs'],['status','vds-server/src/status.mjs'],['ranks','vds-server/src/ranks.mjs'],['progression','vds-server/src/progression-settings.mjs'],['premium','vds-server/src/premium-engine.mjs'],['guildSkill','vds-server/src/guild-skill.mjs']];
const files=catalogue.map(([,file])=>file),factories=catalogue.map(([name])=>name+'Module'),imports=[],modules=[],proof=[],channelEdits=[],allowedExec=new Set();
function channels(file,body){
 let text=body;
 const replace=(from,to)=>{if(!text.includes(from))return;text=text.replaceAll(from,to);channelEdits.push({file,from,to});};
 if(['lib/runes.mjs','lib/rune-v2.mjs','lib/event-island444.mjs','vds-server/src/runes.mjs','vds-server/src/event-island444.mjs'].includes(file)){
  const tree=parse(text,{ecmaVersion:'latest',sourceType:'module'}),changes=[];const walk=n=>{if(!n||typeof n!=='object')return;if(n.type==='Literal'&&n.regex?.pattern.includes('[1-3]')){const prior=text.slice(n.start,n.end);changes.push([n.start,n.end,'(fourChannels?'+prior.replaceAll('[1-3]','[1-4]')+':'+prior+')']);}for(const v of Object.values(n)){if(Array.isArray(v))for(const x of v)walk(x);else if(v?.type)walk(v);}};walk(tree);
  for(const [start,end,next]of changes.sort((a,b)=>b[0]-a[0])){channelEdits.push({file,from:text.slice(start,end),to:next});text=text.slice(0,start)+next+text.slice(end);}
 }
 if(['vds-server/src/runes.mjs','vds-server/src/rune-v2.mjs','vds-server/src/event-island444.mjs'].includes(file))replace('ch<=3','ch<=channelCount');
 if(file==='vds-server/src/event-island444.mjs'){
  replace('publicStates=Array(4)','publicStates=Array(channelCount+1)');replace('Array.from({length:4}','Array.from({length:channelCount+1}');replace('channel<=3','channel<=channelCount');replace('channel>3','channel>channelCount');replace('const totals=[0,0,0,0]','const totals=Array(channelCount+1).fill(0)');
  replace('const snapshot=(buildProfile)=>({...current,catalog:','const snapshot=(buildProfile)=>({...current,channels:Array.from({length:channelCount},(_,i)=>i+1),catalog:');
 }
 if(file==='lib/event-island444.mjs'){
  replace('value.length>21','value.length>7*channelCount');replace("'En fazla 21 boss planı satırı olabilir.'","'En fazla '+(7*channelCount)+' boss planı satırı olabilir.'");replace('const totals=[0,0,0,0]','const totals=Array(channelCount+1).fill(0)');replace('r.channel>3','r.channel>channelCount');
 }
 if(file==='vds-server/src/rune-v2.mjs'){
  const tree=parse(text,{ecmaVersion:'latest',sourceType:'module'}),changes=[];const walk=n=>{if(!n||typeof n!=='object')return;if(n.type==='Literal'&&typeof n.value==='string'&&n.value.includes("'rune-v2-boss-c3-1')"))changes.push([n.start,n.end,'(fourChannels?'+JSON.stringify(n.value.replace("'rune-v2-boss-c3-1')","'rune-v2-boss-c3-1','rune-v2-boss-c4-1')"))+':'+text.slice(n.start,n.end)+')']);for(const v of Object.values(n)){if(Array.isArray(v))for(const x of v)walk(x);else if(v?.type)walk(v);}};walk(tree);
  for(const [start,end,next]of changes.sort((a,b)=>b[0]-a[0])){channelEdits.push({file,from:text.slice(start,end),to:next});text=text.slice(0,start)+next+text.slice(end);}
 }
 return text;
}
for(const [index,file]of files.entries()){
 const source=fs.readFileSync(path.join(root,file),'utf8');if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Changed native service '+file);
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),lines=[],exports=[],bodies=[];
 for(const node of ast.body){
  if(node.type==='ImportDeclaration'){
   const resolved=node.source.value.startsWith('.')?path.resolve(root,path.dirname(file),node.source.value):node.source.value,localIndex=files.findIndex(f=>path.join(root,f)===resolved);let ref;
   if(localIndex>=0){if(localIndex>=index)throw Error('Native service dependency ordering '+file);ref='dependencies['+localIndex+']';}
   else{ref='module'+imports.length;const spec=resolved.startsWith('/')?path.relative(out,resolved):resolved;imports.push('import * as '+ref+' from '+JSON.stringify(spec.startsWith('.')||!resolved.startsWith('/')?spec:'./'+spec)+';');}
   for(const s of node.specifiers){if(s.type!=='ImportSpecifier')throw Error('Unexpected service import');lines.push('const '+s.local.name+'='+((node.source.value==='node:crypto'&&['randomUUID','randomInt'].includes(s.imported.name))?(s.imported.name==='randomUUID'?'uuid':'integer'):ref+'.'+s.imported.name)+';');}
  }else{
   const n=node.type==='ExportNamedDeclaration'?node.declaration:node;if(!n)throw Error('Unexpected service export');
   const body=source.slice(n.start,n.end);bodies.push({sha256:hash(body),start:n.start,end:n.end});lines.push(channels(file,body));
   if(file==='vds-server/src/premium-engine.mjs'&&n.type==='ClassDeclaration'&&n.id.name==='PremiumEngine'){
    const owner=n.body.body.find(method=>method.key.name==='expireOwner'),walk=child=>{if(!child||typeof child!=='object')return;if(child.type==='CallExpression'&&child.callee.property?.name==='exec'){const value=child.arguments[0]?.value;if(typeof value==='string'&&/^(SAVEPOINT premium_owner_expiry|RELEASE premium_owner_expiry|ROLLBACK TO premium_owner_expiry; RELEASE premium_owner_expiry)$/.test(value))allowedExec.add(value);}for(const value of Object.values(child)){if(Array.isArray(value))value.forEach(walk);else if(value?.type)walk(value);}};walk(owner);
   }
   if(n.type==='FunctionDeclaration'&&n.id.name.startsWith('create')){
    const walk=child=>{if(!child||typeof child!=='object')return;if(child.type==='CallExpression'&&child.callee.property?.name==='exec'&&child.callee.object?.type==='Identifier'&&['db','sql'].includes(child.callee.object.name)){
     const arg=child.arguments[0],value=arg?.type==='Literal'?arg.value:arg?.type==='TemplateLiteral'&&!arg.expressions.length?arg.quasis[0].value.cooked:null;if(typeof value==='string'&&/^\s*(DELETE|UPDATE|INSERT|WITH)\b/i.test(value))allowedExec.add(value);
    }for(const value of Object.values(child)){if(Array.isArray(value))for(const c of value)walk(c);else if(value?.type)walk(value);}};walk(n);
   }
   if(node.type==='ExportNamedDeclaration'){if(['FunctionDeclaration','ClassDeclaration'].includes(n.type))exports.push(n.id.name);else if(n.type==='VariableDeclaration')for(const d of n.declarations)exports.push(d.id.name);else throw Error('Unknown service export');}
  }
 }
 modules.push('function '+factories[index]+'({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};\n'+lines.join('\n')+'\nreturn {'+exports.join(',')+'};}');proof.push({file,sha256:hash(source),declarations:bodies,exports});
}
const generated="import {randomInt as nativeServiceInt} from 'node:crypto';\n"+imports.join('\n')+'\nconst ambient=globalThis;\nexport const NATIVE_MODE_SQL_BATCHES=Object.freeze('+JSON.stringify([...allowedExec])+');\n'+modules.join('\n')+'\nexport function createRewardServices({globals,uuid=()=>ambient.crypto.randomUUID(),random=Math.random,integer=nativeServiceInt,now=Date.now,fourChannels=false}){if(!globals)throw Error("reward_globals_required");const options={globals,uuid,random,integer,now,fourChannels,dependencies:[]};for(const factory of ['+factories.join(',')+'])options.dependencies.push(factory(options));return {'+catalogue.map(([name],index)=>name+':options.dependencies['+index+']').join(',')+'};}\n';
parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'reward-services.mjs'),generated);fs.writeFileSync(path.join(out,'reward-services-proof.json'),JSON.stringify({baselineManifestSha256:baseline,generatedSha256:hash(generated),modules:proof,channelEdits,changes:['ESM bindings injected for deterministic server UUID/RNG/clock and native sibling modules','Only recorded finite channel-count/classifier edits are opt-in; original economy/eligibility/claim SQL retained'],fullProductionIntegration:false},null,2)+'\n');console.log(JSON.stringify({modules:files.length,bytes:Buffer.byteLength(generated)}));
