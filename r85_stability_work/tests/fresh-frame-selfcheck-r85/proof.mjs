import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isProxy} from 'node:util/types';
import {performance} from 'node:perf_hooks';
import {sameAttackFrame,readAttackFrame} from '../../working/core511-source/scripts/core511/attack-writer.mjs';
import {stablePresenceFrame} from '../../working/core511-source/scripts/core511/presence.mjs';
import {setupPvp} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';

const basePath=new URL('../../working/core511-source/scripts/core511/attack-writer.mjs',import.meta.url),candidatePath=new URL('../../candidates/fresh-frame-selfcheck-r85/attack-writer.mjs',import.meta.url);
const base=fs.readFileSync(basePath,'utf8'),candidate=fs.readFileSync(candidatePath,'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(hash(base),'15719dcd652a0d5f1d930303cb69cd577a84a8bd4217a89aa13271f1916948b6');
const start='  const checkedExpectedR61=',end='  const nativeDb=nativeAtomicStatements';
const branch=source=>source.slice(source.indexOf(start),source.indexOf(end));
assert(base.indexOf(start)>0&&candidate.indexOf(start)>0);
const helperStart=candidate.indexOf('// The private R61 secondary callback'),helperEnd=candidate.indexOf('\nexport function attackRandom',helperStart);
assert(helperStart>0&&helperEnd>helperStart);
const helper=candidate.slice(helperStart,helperEnd);
// All owner/resource/time/checkpoint/native execution code remains exact.
assert.equal(candidate.replace("import {isProxy} from 'node:util/types';\n",'').replace(helper+'\n','').replace(branch(candidate),branch(base)),base);
assert(base.includes('const handle=(sqlite,payload,context,batchReadR61=null)=>'));
assert(base.includes('handle(sql,p,c,{fresh:secondary,omit:!last})'));
const build=(source,{count=false}={})=>{
 const counts={compare:0,copy:0};
 const compare=count?(...args)=>{counts.compare++;return sameAttackFrame(...args);}:sameAttackFrame;
 const copy=count?value=>{counts.copy++;return stablePresenceFrame(value);}:stablePresenceFrame;
 const body=(source===candidate?helper:'')+'\nreturn function(frame,settings,expected,batchReadR61){const context={},sqlite={};'+branch(source)+'return true;};';
 return {run:new Function('sameAttackFrame','stablePresenceFrame','actorFrameConflict','isProxy',body)(compare,copy,code=>Object.assign(Error(code),{code}),isProxy),counts};
};
const sourceFunctions={baseline:build(base,{count:true}),candidate:build(candidate,{count:true})};
const plain=()=>({frame:{player:Object.assign(Object.create(null),{id:'a',x:1,last_seen:1}),monster:Object.assign(Object.create(null),{id:'m',hp:10})},settings:Object.freeze({damage:2}),expected:{player:{id:'a',x:1,last_seen:9},monster:{id:'m',hp:10},settings:{damage:2}},effects:[]});
const cases=[];
function check(name,factory,fresh,expectedOutcome){
 const outcomes=[];
 for(const version of ['baseline','candidate']){
  const s=factory(),fn=sourceFunctions[version];let outcome;
  try{outcome=fn.run(s.frame,s.settings,s.expected,fresh?{fresh:true}:null);}catch(error){outcome=error.code??error.name;}
  outcomes.push({outcome,effects:s.effects});
 }
 assert.deepEqual(outcomes[1],outcomes[0],name);if(expectedOutcome!==undefined)assert.equal(outcomes[0].outcome,expectedOutcome,name);
 cases.push({name,outcome:outcomes[0].outcome,effectsEqual:true});
}
check('primary matches',plain,false,true);
check('primary player mismatch',()=>{const s=plain();s.expected.player.x=2;return s;},false,'attack_frame_conflict');
check('primary monster mismatch',()=>{const s=plain();s.expected.monster.hp=2;return s;},false,'attack_frame_conflict');
check('primary settings mismatch',()=>{const s=plain();s.expected.settings.damage=3;return s;},false,'attack_settings_conflict');
check('primary missing expected remains rejected',()=>({...plain(),expected:undefined}),false,'attack_frame_conflict');
check('private fresh ignores earlier resident expected',()=>{const s=plain();s.expected={};return s;},true,true);
check('fresh missing player remains rejected',()=>{const s=plain();s.frame.player=null;return s;},true,'attack_frame_conflict');
check('fresh null monster',()=>{const s=plain();s.frame.monster=null;return s;},true,true);
check('fresh undefined monster',()=>{const s=plain();s.frame.monster=undefined;return s;},true,true);
check('fresh undefined settings',()=>({...plain(),settings:undefined}),true,true);
check('fresh accessor row',()=>{const s=plain();let n=0;Object.defineProperty(s.frame.player,'x',{enumerable:true,get(){s.effects.push('x');return ++n;}});return s;},true,'attack_frame_conflict');
check('fresh accessor frame',()=>{const s=plain(),p=s.frame.player;Object.defineProperty(s.frame,'player',{get(){s.effects.push('player');return p;}});return s;},true,true);
check('fresh nonenumerable last_seen accessor',()=>{const s=plain();Object.defineProperty(s.frame.player,'last_seen',{enumerable:false,get(){s.effects.push('seen');return 1;}});return s;},true,true);
check('fresh symbol accessor copied by spread',()=>{const s=plain();Object.defineProperty(s.frame.player,Symbol('test'),{enumerable:true,get(){s.effects.push('symbol');return 2;}});return s;},true,true);
check('fresh effectful settings accessor',()=>{const s=plain();let n=0;s.settings={get damage(){s.effects.push('damage');return ++n;}};return s;},true,'attack_settings_conflict');
check('fresh proxy row',()=>{const s=plain();s.frame.player=new Proxy(s.frame.player,{get(target,key,receiver){s.effects.push('get:'+String(key));return Reflect.get(target,key,receiver);},ownKeys(target){s.effects.push('keys');return Reflect.ownKeys(target);},getOwnPropertyDescriptor(target,key){s.effects.push('descriptor:'+String(key));return Reflect.getOwnPropertyDescriptor(target,key);}});return s;},true,true);
check('fresh nested data keeps canonical fallback',()=>{const s=plain();s.settings={nested:{a:1}};return s;},true,true);
check('fresh BigInt keeps original rejection',()=>{const s=plain();s.settings={big:1n};return s;},true,'TypeError');

const cleanups=[],native=await setupPvp({after:fn=>cleanups.push(fn)});let benchmark;
try{
 const monster=native.sql.prepare('SELECT id FROM monsters LIMIT 1').get();assert(monster);
 const frame=readAttackFrame(native.sql,native.id,monster.id,native.globals),settings=Object.freeze(native.settings),expected={...frame,settings};
 assert(frame.player&&frame.monster);assert.equal(Object.getPrototypeOf(frame.player),null);
 const beforeBase={...sourceFunctions.baseline.counts},beforeCandidate={...sourceFunctions.candidate.counts};
 assert(sourceFunctions.baseline.run(frame,settings,expected,{fresh:true}));assert(sourceFunctions.candidate.run(frame,settings,expected,{fresh:true}));
 assert.equal(sourceFunctions.baseline.counts.compare-beforeBase.compare,3);assert.equal(sourceFunctions.baseline.counts.copy-beforeBase.copy,2);
 assert.equal(sourceFunctions.candidate.counts.compare-beforeCandidate.compare,0);assert.equal(sourceFunctions.candidate.counts.copy-beforeCandidate.copy,0);
 const functions={baseline:build(base).run,candidate:build(candidate).run},iterations=3000,samples={baseline:[],candidate:[]};
 for(const fn of Object.values(functions))for(let i=0;i<1000;i++)fn(frame,settings,expected,{fresh:true});
 for(let round=0;round<5;round++)for(const name of round%2?['candidate','baseline']:['baseline','candidate']){const at=performance.now();for(let i=0;i<iterations;i++)functions[name](frame,settings,expected,{fresh:true});samples[name].push(performance.now()-at);}
 const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
 benchmark={iterations,rounds:5,rowsFromActualNativeSQLite:true,playerFields:Object.keys(frame.player).length,monsterFields:Object.keys(frame.monster).length,settingsFields:Object.keys(settings).length,samplesMs:samples,baselineMedianMs:median(samples.baseline),candidateMedianMs:median(samples.candidate),ratio:median(samples.candidate)/median(samples.baseline)};
}finally{for(const cleanup of cleanups.reverse())await cleanup();}
const report={passed:true,baseline:{path:basePath.pathname,bytes:Buffer.byteLength(base),sha256:hash(base)},candidate:{path:candidatePath.pathname,bytes:Buffer.byteLength(candidate),sha256:hash(candidate)},sourceDifferenceRestrictedToGuardedSelfComparison:true,privateCallbackUnchanged:true,cases,benchmark,limits:['Source-exact comparison branch plus actual native SQLite frame/settings inputs; no full game command or crowd run.','Benchmark measures this validation branch only and cannot establish end-to-end latency savings.','Accessor/proxy/non-scalar unexpected shapes retain the original comparison path.']};
fs.writeFileSync(new URL('../../evidence/fresh-frame-selfcheck-r85-proof.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
