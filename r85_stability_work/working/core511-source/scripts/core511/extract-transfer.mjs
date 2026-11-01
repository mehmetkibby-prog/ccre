import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6');
const out=process.env.COL_CORE511_OUT??path.join(import.meta.dirname,'generated'),hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json')),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
if(hash(bytes)!==baseline)throw Error('Exact V510 baseline required');
const manifest=JSON.parse(bytes),file='dist-vds/server/channel-runtime/index.mjs',source=fs.readFileSync(path.join(root,file),'utf8');
if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Changed native transfer rules');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),nodes=[];
function visit(node){if(!node||typeof node!=='object')return;if(node.type)nodes.push(node);for(const [key,value]of Object.entries(node)){if(key==='start'||key==='end')continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}}
visit(ast);const text=n=>source.slice(n.start,n.end);
function one(predicate){const found=nodes.filter(predicate);if(found.length!==1)throw Error('Ambiguous native transfer section '+found.length);return found[0];}
const branch=one(n=>n.type==='IfStatement'&&text(n.test)==='payload.action === "select_channel"');
const guarded=one(n=>n.type==='IfStatement'&&n.start>branch.start&&n.end<branch.end&&text(n.test)==='typeof database.transferPlayer === "function"');
const transfer=guarded.consequent.body.find(n=>n.type==='VariableDeclaration'&&n.declarations[0].id.name==='transferred');
const plan=source.slice(guarded.consequent.body[0].start,transfer.start);
const guardPredicates=[
 s=>s.startsWith('auth.player && dungeonLocked(auth.player.id)'),
 s=>s==='player.area===\'rune_v2\'&&!(payload.action===\'respawn\'&&player.hp<=0)&&(!runeEligible(player)||!globalThis.__colRuneV2?.settings().config.enabled)',
 s=>s==='player.area===\'rune\'&&(!runeEligible(player)||!globalThis.__colRunes?.settings().config.enabled)',
 s=>s==='player.area === "ancient" && !canEnterAncient(settings, player)',
 s=>s==='player.reset_at > now'
];
const guards=guardPredicates.map(fn=>one(n=>n.type==='IfStatement'&&n.start<branch.start&&n.start>source.indexOf('async function runTimedAction')&&fn(text(n.test))));
const declarations=['expansion65Available','canEnterAncient','clamp$1','dungeonLocked'].map(name=>one(n=>n.type==='FunctionDeclaration'&&n.id.name===name));
const nativeBranch=text(branch),old='clamp$1(Math.floor(Number(payload.channel) || 0), 1, 3)';
if(nativeBranch.split(old).length!==2)throw Error('Missing native three-channel selector');
const adventureBoundary='if (payload.action === "select_channel") {';
if(nativeBranch.split(adventureBoundary).length!==2)throw Error('Native transfer action boundary changed');
const adventureGuard='\n if(isAdventureArea(player.area))return Response.json({error:"Kanal değiştirmek için önce seferden çık."},{status:409});';
const updated=nativeBranch.replace(old,old.replace(', 1, 3)',', 1, 4)')).replace(adventureBoundary,adventureBoundary+adventureGuard);
const runePath=path.relative(out,path.join(root,'lib/runes.mjs'));
const prefix=`import {isAdventureArea} from '../adventure-maps.mjs';\nimport {runeEligible,RUNE_GATE_MESSAGE} from ${JSON.stringify(runePath)};\nconst ambient=globalThis;\nexport function createTransferRules({globals=ambient,capacity=()=>25,response=ambient.Response}={}){\nconst globalThis=globals,channelCapacity510=capacity,Response=response;\n`;
const context='const {player,settings,payload,playerId,now,requestReceivedAtMs,database,settlePveEngagement}=context;const auth={player};';
const nativeSelect='async function selectChannel(context){\n'+context+'\n'+guards.map(text).join('\n')+'\n'+updated+'\nthrow Error("invalid_transfer_action");\n}';
const syncSelect=nativeSelect.replace('async function selectChannel','function selectChannelSync').replaceAll('await ','');
const generated=prefix+declarations.map(text).join('\n')+'\nasync function selectChannel(context){\n'+context+'\n'+guards.map(text).join('\n')+'\n'+updated+'\nthrow Error("invalid_transfer_action");\n}\n'+
 'function writerPlan({database,playerId,targetChannel,now,requestReceivedAtMs,settings}){\n'+plan.replace('await database.prepare','database.prepare')+'\nreturn {switchStatement,cleanupStatements};\n}\n'+
 syncSelect+'\nreturn {selectChannel,selectChannelSync,writerPlan};\n}\n';
parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'transfer-rules.mjs'),generated);
fs.writeFileSync(path.join(out,'transfer-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),generatedSha256:hash(generated),branch:{start:branch.start,end:branch.end,sha256:hash(nativeBranch)},guards:guards.map(n=>({start:n.start,end:n.end,sha256:hash(text(n))})),plan:{start:guarded.consequent.body[0].start,end:transfer.start,sha256:hash(plan)},edits:['R19 strict adventure-area guard requires leaving the run before channel transfer in both native preflights','channel selector 1..3 to 1..4','channel capacity dependency now defaults to 25 for every channel','writer-only plan uses synchronous membership read','synchronous native preflight removes await; original asynchronous entry retained','Response is injected for synchronous writer result without changing branches'],integrationComplete:false},null,2)+'\n');
console.log(JSON.stringify({guards:guards.length,sourceRules:'V510 select_channel and original party/arena/market cleanup'}));
