import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {patchNativeClient} from '../patch-native-client.mjs';
import {Core511Transport} from '../client-transport.mjs';

const core=path.resolve(import.meta.dirname,'..');
const proof=JSON.parse(fs.readFileSync(path.join(core,'generated/native-client-proof.json'),'utf8'));
const baseline=fs.readFileSync(path.join(process.env.COL_CORE511_BASE??path.join(core,'../../../native510-bb3a6cc689c6'),proof.file),'utf8');
const patched=patchNativeClient(baseline,'core511-transport-0123456789abcdef.js').source;
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}
function handlers(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});let callback;walk(ast,n=>{if(n.type==='VariableDeclarator'&&n.id.name==='wm'&&n.init?.type==='CallExpression')callback=n.init.arguments[0];});assert(callback);
 let sync;const catches=[];walk(callback,n=>{
  if(n.type==='VariableDeclarator'&&n.id.name==='l'&&source.slice(n.init.start,n.init.end).includes('cooldownRemainingMs'))sync=source.slice(n.init.start,n.init.end);
  if(n.type==='LogicalExpression'&&n.operator==='||'&&source.slice(n.left.start,n.left.end).startsWith('e===0&&t instanceof Q_&&t.payload.code===`basic_attack_cadence`'))catches.push(source.slice(n.left.start,n.left.end));
 });assert(sync);assert.equal(catches.length,2);
 const hold=ast.body.find(n=>n.id?.name==='bu');assert(hold);
 return {
  sync:({e=0,c,br,clock,updates=[]})=>Function('e','c','br','performance','xp','Wo','return '+sync)(e,c,br,{now:()=>clock.now},()=>clock.serverBase+clock.now,v=>updates.push(v)),
  rejected:(index,{sync,error})=>Function('e','t','Q_','l','return ('+catches[index]+')')(0,error,ApiError,sync),
  hold:Function('return ('+source.slice(hold.start,hold.end)+')')()
 };
}
class ApiError extends Error{constructor(payload){super(payload.code);this.payload=payload;}}
const old=handlers(baseline),fixed=handlers(patched);
// R19 already uses the target-bound R17 hold controller; only its native ACK
// and rejection handlers are the baseline ones in this comparison.
old.hold=fixed.hold;
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};

test('native attack ACK maps only the remaining server reservation, without a second full cooldown',()=>{
 const clock={now:1200,serverBase:100000};
 const before={current:[650,0,0,0]};old.sync({c:650,br:before,clock})({nextAttackAtMs:101750});assert.equal(before.current[0],650,'R19 ignored basic server deadline');
 const br={current:[650,0,0,0]};fixed.sync({c:650,br,clock})({nextAttackAtMs:101750});assert.equal(br.current[0],1750);
 const newer={current:[2000,0,0,0]};fixed.sync({c:650,br:newer,clock})({nextAttackAtMs:103000});assert.equal(newer.current[0],2000,'old ACK cannot rewrite a newer reservation');
 const monotonic={current:[2000,0,0,0]};fixed.sync({c:2000,br:monotonic,clock})({nextAttackAtMs:101100});assert.equal(monotonic.current[0],2000,'basic ACK never shortens reserved cadence');
 const relative={current:[650,0,0,0]};fixed.sync({c:650,br:relative,clock})({cooldownRemainingMs:75});assert.equal(relative.current[0],1275);
 const skill={current:[0,1900,0,0]},updates=[];fixed.sync({e:1,c:1900,br:skill,clock,updates})({cooldownRemainingMs:100});assert.equal(skill.current[1],1300);assert.equal(updates.length,1,'existing skill reconciliation stays unchanged');
});

test('both native PvE and PvP cadence rejection handlers adopt retryAfterMs only for their own reservation',()=>{
 for(let index=0;index<2;index++){
  const clock={now:1900,serverBase:100000},br={current:[1350,0,0,0]},error=new ApiError({code:'basic_attack_cadence',retryAfterMs:662,nextAttackAtMs:102550});
  const sync=fixed.sync({c:1350,br,clock});assert.equal(fixed.rejected(index,{sync,error}),true);assert.equal(br.current[0],2562);
  const newer={current:[3000,0,0,0]};fixed.rejected(index,{sync:fixed.sync({c:1350,br:newer,clock}),error});assert.equal(newer.current[0],3000);
  fixed.rejected(index,{sync:fixed.sync({c:2562,br,clock}),error:new ApiError({code:'basic_attack_cadence',retryAfterMs:NaN,nextAttackAtMs:NaN})});assert.equal(br.current[0],2562);
 }
});

async function delayedQueueScenario(h){
 const clock={now:0,serverBase:100000},br={current:[0,0,0,0]},sent=[],errors=[],promises=[];let target='monster:1',shots=0;
 const transport=new Core511Transport({fetch:()=>{throw Error('unexpected HTTP')},WebSocket:class{},origin:'https://fixture.invalid',headers:()=>({}),now:()=>clock.now});
 transport.ready=true;transport.ws={readyState:1,bufferedAmount:0,send(text){sent.push({...JSON.parse(text),at:clock.now});},close(){}};
 const heartbeat=transport.enqueue({action:'heartbeat'});promises.push(heartbeat);
 const held=h.hold({allowed:()=>true,blocked:()=>false,scope:()=> 'forest:1',target:()=>target,prepare:()=>true,readyAt:()=>br.current[0],attack:()=>{
  shots++;const c=br.current[0]=clock.now+650,sync=h.sync({c,br,clock});
  const p=transport.enqueue({action:'attack',ability:0,intentId:'shot-'+shots}).then(result=>{if(result.status>=400){const error=new ApiError(result.body);errors.push(error.payload.code);h.rejected(0,{sync,error});}else sync(result.body);});promises.push(p);return p;
 }});
 const ack=(status,body)=>transport.result({type:'action',sequence:transport.active.sequence,status,body});
 try{
  held.start('physical-space',0);clock.now=700;held.tick(clock.now);assert.equal(shots,2);assert.equal(transport.queue.length,2);
  clock.now=1800;ack(200,{ok:true});await flush();assert.equal(sent.at(-1).payload.intentId,'shot-1');
  clock.now=1900;ack(200,{ok:true,nextAttackAtMs:102450});await flush();assert.equal(sent.at(-1).payload.intentId,'shot-2');
  ack(429,{code:'basic_attack_cadence',retryAfterMs:662,nextAttackAtMs:102550});await flush();
  const before=shots;clock.now=1901;held.tick(clock.now);await flush();const premature=shots-before;
  if(premature){ack(429,{code:'basic_attack_cadence',retryAfterMs:662,nextAttackAtMs:102551});await flush();}
  // Physical ownership must survive this correction. Once the original target
  // dies, holding Space cannot attack its replacement; release is still needed.
  target='monster:2';clock.now=4000;held.tick(clock.now);await flush();const afterDeath=shots;
  held.release(clock.now);await Promise.all(promises);return {premature,errors,shots,afterDeath,readyAt:br.current[0]};
 }finally{transport.dispose();}
}

test('actual native hold and transport queue do not immediately repeat an attack rejected after a delayed command',async()=>{
 const before=await delayedQueueScenario(old);assert.equal(before.premature,1,'R19 immediately shoots again after its stale 429 cooldown');assert.equal(before.errors.length,2);
 const after=await delayedQueueScenario(fixed);assert.equal(after.premature,0);assert.equal(after.errors.length,1,'the original rejection is surfaced internally, never replayed');assert.equal(after.shots,2);assert.equal(after.afterDeath,2,'held attack cannot retarget after target death');assert.equal(after.readyAt,2562);
});
