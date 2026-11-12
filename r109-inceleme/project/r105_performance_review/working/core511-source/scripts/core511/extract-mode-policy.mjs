import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated'),hash=s=>createHash('sha256').update(s).digest('hex');
const baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b',bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(bytes),file='dist-vds/server/index.js',source=fs.readFileSync(path.join(root,file),'utf8');if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Changed native mode policy source');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),proof=[],policies={};
function nodes(node,predicate,out=[]){
 if(!node||typeof node!=='object')return out;if(predicate(node))out.push(node);
 for(const value of Object.values(node)){
  if(Array.isArray(value)){for(const n of value)nodes(n,predicate,out);}
  else if(value&&typeof value==='object')nodes(value,predicate,out);
 }
 return out;
}
function fn(name){const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!n)throw Error('Native function missing '+name);return n;}
function persistent(name,scope,kinds,services){
 const node=fn(name),calls=nodes(node,n=>n.type==='CallExpression'&&n.callee.name==='enforceRateLimit');if(calls.length!==1||calls[0].arguments[0].value!==scope||source.slice(calls[0].arguments[1].start,calls[0].arguments[1].end)!=='auth.account.id')throw Error('Native policy layout changed');
 const call=calls[0],options=call.arguments[2];if(options.type!=='ObjectExpression'||options.properties.some(p=>p.value.type!=='Literal'))throw Error('Native literal policy required');
 const value={scope,options:Object.fromEntries(options.properties.map(p=>[p.key.name,p.value.value]))};
 for(const service of services)if(!source.slice(node.start,node.end).includes('globalThis.'+service))throw Error('Native rank service moved');
 for(const kind of kinds)policies[kind]=value;proof.push({name,scope,kinds,start:call.start,end:call.end,sha256:hash(source.slice(call.start,call.end))});
}
persistent('POST$9','rank-equip',['rune','arena_market','battle_pass','quest','cauldron'],['__colRunes','__colArenaMarket','__colBattlePass','__colQuests438','__colCauldron488']);
persistent('POST$28','community-claim',['community_claim'],['__colCommunityEvent']);
const guild=nodes(fn('POST$19'),n=>n.type==='CallExpression'&&n.callee.name==='enforceLocalActionRate');if(guild.length!==1||guild[0].arguments[1].value!=='guild')throw Error('Native guild local policy moved');policies.guild_village={localCategory:'guild'};proof.push({name:'POST$19',start:guild[0].start,end:guild[0].end,sha256:hash(source.slice(guild[0].start,guild[0].end))});
const security=fn('recordSecurityEvent');if(!security.async||security.body.body.length!==0)throw Error('Native security event is no longer empty');const original=source.slice(security.start,security.end);proof.push({name:'recordSecurityEvent',start:security.start,end:security.end,sha256:hash(original)});
const generated=`// Exact native HTTP service rate groups. The rank services share ONE key.
export const NATIVE_MODE_RATE=Object.freeze(Object.fromEntries(Object.entries(${JSON.stringify(policies)}).map(([k,v])=>[k,Object.freeze({...v,...(v.options?{options:Object.freeze(v.options)}:{})})])));
// Native body is empty; only async/export/name adapt to the synchronous lane.
${original.replace('async function recordSecurityEvent','export function recordNativeSecurityEvent')}
`;
parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'mode-policy.mjs'),generated);fs.writeFileSync(path.join(out,'mode-policy-proof.json'),JSON.stringify({baselineManifestSha256:baseline,file,sourceSha256:hash(source),bodies:proof,generatedSha256:hash(generated),edits:['Extract native literal rate scopes/options; preserve shared rank key and separate community key','Guild uses original local guild category','Native security event body is exactly empty; remove async for synchronous lane']},null,2)+'\n');console.log(JSON.stringify({policies:Object.keys(policies).length}));
