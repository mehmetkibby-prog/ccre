import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),root=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=path.join(import.meta.dirname,'generated'),baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
const bytes=fs.readFileSync(path.join(root,'realm-package-manifest.json'));if(hash(bytes)!==baseline)throw Error('Exact V510 required');const manifest=JSON.parse(bytes),file='vds-server/src/rune-v2-combat484.mjs',source=fs.readFileSync(path.join(root,file),'utf8');if(manifest.files.find(r=>r.path===file)?.sha256!==hash(source))throw Error('Native rune boss changed');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),nodes=ast.body.map(n=>n.declaration??n),run=nodes.find(n=>n.id?.name==='run'),cancel=nodes.find(n=>n.id?.name==='cancel');
function walk(node,fn){if(!node||typeof node!=='object')return;fn(node);for(const [key,value]of Object.entries(node))if(key!=='parent'&&value&&typeof value==='object'){if(Array.isArray(value))value.forEach(n=>walk(n,fn));else walk(value,fn);}}
const text=n=>source.slice(n.start,n.end),sync=s=>s.replaceAll('async function ','function ').replaceAll('await ','');
function adapted(node,changes){let value=text(node);for(const [start,end,replacement]of changes.sort((a,b)=>b[0]-a[0]))value=value.slice(0,start-node.start)+replacement+value.slice(end-node.start);return sync(value);}
function bindings(n){const found=[];walk(n,v=>{if(v.type==='CallExpression'&&v.callee?.property?.name==='bind'&&v.callee.object?.callee?.property?.name==='prepare')found.push(v);});if(found.length!==1)throw Error('Rune binding drift '+text(n).slice(0,90));return found[0];}
const args=n=>bindings(n).arguments.map(text).join(','),changes=[],storage=[];let targetBinding;
walk(run,n=>{
 if(n.type==='VariableDeclaration'){
  const names=n.declarations.map(d=>d.id.name).join(',');let replacement;
  if(names==='loop,channels')replacement='const loop=port.worldLoop,channels=[port.channel];';
  if(names==='id,boss')replacement='const id=bossId(channel),boss=loop.monster(id);';
  if(names==='result'&&text(n).includes('await db.batch('))replacement='const result=port.initialize('+args(n)+');';
  if(names==='rows')replacement='const rows=port.readPlayers(ids,channel);';
  if(names==='projectionGuard485')replacement='';
  if(names==='guard')replacement='const guard=port.prepare('+(text(n).includes("phase='telegraph',cast_id")?"'wave'":"impact?'impact':'basic'")+','+args(n)+');';
  if(replacement!==undefined){changes.push([n.start,n.end,replacement]);storage.push({kind:names,start:n.start,end:n.end,sha256:hash(text(n))});}
 }
 if(n.type==='IfStatement'&&text(n.test)==='loop?.enabled'&&n.alternate){changes.push([n.start,n.end,text(n.consequent)]);storage.push({kind:'resident candidates',start:n.start,end:n.end,sha256:hash(text(n))});}
 if(n.type==='CallExpression'&&n.callee?.property?.name==='bind'&&n.callee.object?.callee?.property?.name==='prepare'&&text(n).startsWith('db.prepare(`UPDATE players SET hp='))targetBinding=n;
});
if(!targetBinding||changes.length!==8)throw Error('Rune memory boundaries changed '+changes.length);changes.push([targetBinding.start,targetBinding.end,"port.prepare('target',"+targetBinding.arguments.map(text).join(',')+')']);storage.push({kind:'target mutation',start:targetBinding.start,end:targetBinding.end,sha256:hash(text(targetBinding))});
let memory=adapted(run,changes).replace('function run(db,','function runMemory(port,').replaceAll('db.','port.').replaceAll('cancel(db,','cancelMemory(port,');
let rowsNode;walk(run,n=>{if(n.type==='VariableDeclaration'&&n.declarations[0].id.name==='rows')rowsNode=n;});
const readPlayers='function readPlayers(db,ids,channel){'+sync(text(rowsNode))+'return rows;}';
const cancelGuard=cancel.body.body.find(n=>n.type==='VariableDeclaration'&&n.declarations[0].id.name==='guard');if(!cancelGuard)throw Error('Rune cancel boundary missing');
let memoryCancel=adapted(cancel,[[cancelGuard.start,cancelGuard.end,"const guard=port.prepare('cancel',"+args(cancelGuard)+');']]).replace('function cancel(db,','function cancelMemory(port,').replaceAll('db.','port.');
if(/\b(?:db|await)\b|\b(?:SELECT|UPDATE|INSERT)\b/.test(memory+memoryCancel))throw Error('Rune memory must contain no SQL or asynchronous work');
const lines=["import {randomUUID as nativeUUID} from 'node:crypto';",'export function createRuneBossRules({globals=globalThis,uuid=nativeUUID,fourChannels=true}={}){','const globalThis=globals,randomUUID=uuid;'],slices=[];
for(const n of nodes){
 if(n.type==='ImportDeclaration'||n.id?.name==='tickRuneV2Boss484')continue;
 if(!['VariableDeclaration','FunctionDeclaration'].includes(n.type))throw Error('Rune declaration drift');
 let value=text(n);if(n===run||n===cancel)value=sync(value);if(n===run)value=value.replace('db.channel?[db.channel]:[1,2,3]','db.channel?[db.channel]:(fourChannels?[1,2,3,4]:[1,2,3])').replace('![1,2,3].includes(channel)','!(fourChannels?[1,2,3,4]:[1,2,3]).includes(channel)');
 lines.push(value);slices.push({name:n.id?.name??n.declarations.map(d=>d.id.name).join(','),start:n.start,end:n.end,sha256:hash(text(n))});
}
memory=memory.replace('![1,2,3].includes(channel)','!(fourChannels?[1,2,3,4]:[1,2,3]).includes(channel)');
lines.push(memory,memoryCancel,readPlayers,'return Object.freeze({runNative:run,cancelNative:cancel,runMemory,readPlayers,context,expose,views,wave:runeV2BossWave484,projectedOrigin:runeV2ProjectedOrigin485});','}\n');const generated=lines.join('\n');parse(generated,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'rune-boss-rules.mjs'),generated);
fs.writeFileSync(path.join(out,'rune-boss-proof.json'),JSON.stringify({baselineManifestSha256:baseline,source:file,sourceSha256:hash(source),slices,storageBoundaries:storage,generatedSha256:hash(generated),edits:['Native synchronous writer variant only removes async/await inside the outer sole-writer transaction','Memory variant replaces only SQL reads/mutations with explicit resident ports; no SQL or async work remains','Original target sorting, radius, telegraph, cadence, cancellation and hit publication remain unchanged','Explicit process channels include channel4; original one owner/session rules remain','Ambient guild/rune/combat services and UUID source injected']},null,2)+'\n');
console.log(JSON.stringify({bytes:generated.length,slices:slices.length,storageBoundaries:storage.length}));
