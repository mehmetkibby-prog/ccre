import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from '/tmp/core511-build-deps/node_modules/acorn/dist/acorn.mjs';
import {sha} from './source-fixture.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('./combined-client-candidate.json',import.meta.url)));
const source=fs.readFileSync(manifest.candidate,'utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const declaration=name=>{const node=ast.body.find(row=>row.type==='FunctionDeclaration'&&row.id.name===name||row.type==='VariableDeclaration'&&row.declarations.some(x=>x.id.name===name));assert(node,name);return source.slice(node.start,node.end);};
const start=source.indexOf('r3 = (e5, t4, n4, r4, i4 = e5.monsters ?? [], colPublicTicket503 = null) => {');
const end=source.indexOf('\n    Xe2.current = ',start);
assert(start>0&&end>start);
const applySource='globalThis.applySnapshot = '+source.slice(start+5,end).trim();
const reviveStart=source.indexOf('  let fm2 = (0, R.useCallback)((e4) => {'),reviveEnd=source.indexOf('}, []), mm2 =',reviveStart);
const revive=source.slice(reviveStart,reviveEnd)+'}, []);';
const helpers=['xl','Sl','Cl','rg','ig','mg','hg','yg','bg','qg','acceptArenaRound472'].map(declaration).join('\n');
const eventStart=source.indexOf('        if (t4 === `player_respawn` && !ae2(a4)) {'),eventEnd=source.indexOf('\n      } finally {',eventStart);
assert(eventStart>0&&eventEnd>eventStart);
const eventSource='globalThis.applyRespawnEvent=(a4)=>{const t4=a4.type;'+source.slice(eventStart,eventEnd)+'\n};';
const rows=[];

function fixture({area='forest',newArea=area,held=0}={}){
 const ref=current=>({current});const noop=()=>{};
 const player={id:'p',hp:0,max_hp:100,hp_revision:10,respawn_at_ms:102600,area,x:1,y:2,position_revision:1};
 const world={area,channel:1,world:{cycle:1,reset_at:0,guardian_reward_at:0},players:[player],snapshotAtMs:100000,serverTime:100,inventory:[{id:'optimistic'}],storageItems:[],stones:[],pets:[],leaders:[],shops:[],listings:[],monsters:[],drops:[],chat:[],regionalMessages:[],directMessages:[]};
 const sandbox={Date:{now:()=>110000},performance:{now:()=>110000},Map,Set,Math,Number,arenaRoundCheckpoints472:new WeakMap(),window:{clearTimeout:noop},R:{useCallback:fn=>fn},$g:{x:0,y:0},Kt:()=> 'fixture',Sp2:noop,md:()=>false,Lp2:noop,ha2:noop,tc2:noop,Xs2:noop,$a2:noop,vc2:noop,xo2:noop,ca2:noop,To2:noop,Vc2:noop,bc2:noop,Kc2:noop,L_:(id,round)=>id+':'+round,wp2:()=>null,kp2:(_id,_round,hp)=>hp,zp2:async()=>false,Rp2:noop};
 for(const [,name]of applySource.matchAll(/([\w$]+)\.current/g))sandbox[name]??=ref(0);
 for(const name of ['Rt2','Ft2','zt2','Vt2','Zt2','Mt2','sn2','en2','tn2','Or2','rr2','ir2','Tn2','Fn2','hi2','Sn2','nr2','En2','Zi2','$p2'])sandbox[name]=ref(new Map());
 sandbox.Bt2=ref(new Set());
 Object.assign(sandbox,{F2:ref(world),g2:ref('p'),D2:ref(10),oe2:ref(9),w2:ref(0),ce2:ref(true),le2:ref(false),fr2:ref(held),_e2:ref(1),b2:ref({x:1,y:2}),St2:ref(1),Dt2:ref(null),At2:ref(null),pe2:ref(null),Si2:ref({x:0,y:0}),Sr2:ref(null),wr2:ref(null),Je2:ref(null),L2:ref(null),Fc2:ref(null),Vi2:ref(1),v2:ref(true),wa2:ref({accept:()=>null,project:players=>players}),nt2:ref({snapshot:value=>value}),colFullFollowup503:ref({canPublish:()=>false})});
 Object.assign(sandbox,{ae2:()=>false,oe3:()=>false,M2:(value,fallback)=>typeof value==='number'&&Number.isFinite(value)?value:fallback,isAdventureArea511:()=>false,colRuneCoast483:()=>false,Zp2:noop});
 vm.createContext(sandbox);vm.runInContext(helpers+'\n'+revive+'\n'+applySource+'\n'+eventSource,sandbox);
 const alive={...world,area:newArea,snapshotAtMs:110000,serverTime:110,inventory:[{id:'authoritative'}],players:[{...player,area:newArea,hp:100,hp_revision:11,respawn_at_ms:0,x:30,y:40,position_revision:2}]};
 const apply=()=>{sandbox.incoming=structuredClone(alive);vm.runInContext('applySnapshot(incoming,_e2.current,performance.now(),"push")',sandbox);};
 const state=()=>({hp:sandbox.F2.current.players[0].hp,revision:sandbox.D2.current,deadline:sandbox.F2.current.players[0].respawn_at_ms,area:sandbox.F2.current.area,dead:sandbox.ce2.current,respawnRevision:sandbox.oe2.current});
 return {sandbox,apply,state};
}

for(const [area,newArea]of [['forest','forest'],['rune_v2','bazaar']]){
 test('exact snapshot callback revives '+area+' to '+newArea+' after optimistic operation releases',()=>{
  const f=fixture({area,newArea,held:1});f.apply();assert.deepEqual(f.state(),{hp:0,revision:10,deadline:102600,area,dead:true,respawnRevision:9});
  const held=f.state();f.sandbox.fr2.current=0;f.apply();assert.deepEqual(f.state(),{hp:100,revision:11,deadline:0,area:newArea,dead:false,respawnRevision:11});
  rows.push({scenario:area+' to '+newArea,held,settled:f.state()});
 });
 test('heartbeat revision ahead of a held snapshot recovers '+area+' to '+newArea+' once optimistic operation releases',()=>{
  const f=fixture({area,newArea,held:1});f.sandbox.D2.current=11;f.sandbox.w2.current=100;f.apply();
  assert.equal(f.state().dead,true);assert.equal(f.state().deadline,102600);assert.equal(f.state().hp,100);
  const held=f.state();f.sandbox.fr2.current=0;f.apply();assert.equal(f.state().dead,false);assert.equal(f.state().deadline,0);assert.equal(f.state().respawnRevision,11);
  rows.push({scenario:'heartbeat overtakes '+area+' to '+newArea,held,settled:f.state()});
 });
}
test('fresh snapshots cannot revive a newer death with stale authority',()=>{
 const f=fixture();f.sandbox.D2.current=12;f.sandbox.F2.current.players[0].hp_revision=12;f.apply();assert.equal(f.state().hp,0);assert.equal(f.state().dead,true);assert.equal(f.state().revision,12);
 rows.push({scenario:'stale alive revision 11 versus newer death 12',settled:f.state()});
});
test('cross-area respawn event clears a held optimistic snapshot and duplicate revision cannot repeat revival',()=>{
 const f=fixture({area:'rune_v2',newArea:'bazaar',held:1});f.apply();assert.equal(f.state().dead,true);
 const event={type:'player_respawn',playerId:'p',hp:100,maxHp:100,hpRevision:11,area:'bazaar',x:30,y:40,channel:1,cycle:1};
 f.sandbox.applyRespawnEvent(event);assert.equal(f.state().dead,false);assert.equal(f.state().area,'bazaar');assert.equal(f.state().deadline,0);assert.equal(f.sandbox.fr2.current,1);
 const generation=f.sandbox.St2.current;f.sandbox.applyRespawnEvent(event);assert.equal(f.sandbox.St2.current,generation);
 rows.push({scenario:'private cross-area event bypasses pending economy snapshot; repeated revision ignored',settled:f.state(),pendingEconomy:f.sandbox.fr2.current});
});
test('old private respawn notification cannot revive a newer authoritative death',()=>{
 const f=fixture({area:'rune_v2',newArea:'bazaar',held:1});f.sandbox.D2.current=12;f.sandbox.F2.current.players[0].hp_revision=12;f.sandbox.F2.current.players[0].respawn_at_ms=120000;
 const before=f.state(),generation=f.sandbox.St2.current;
 f.sandbox.applyRespawnEvent({type:'player_respawn',playerId:'p',hp:100,maxHp:100,hpRevision:11,area:'bazaar',x:30,y:40,channel:1,cycle:1});
 assert.deepEqual(f.state(),before);assert.equal(f.sandbox.St2.current,generation);assert.equal(f.state().dead,true);
 rows.push({scenario:'old actor-private respawn revision 11 rejected after newer death revision 12',settled:f.state()});
 fs.writeFileSync(new URL('../../evidence/snapshot-vitals.json',import.meta.url),JSON.stringify({scope:'Exact current snapshot-merge, revival and player_respawn event callback bodies with authoritative fields represented in controlled React refs. Rendering/visibility/monster side effects isolated; not full React/native integration or a live permanent-death reproduction.',candidateSha256:sha(source),snapshotCallbackSha256:sha(applySource),revivalCallbackSha256:sha(revive),respawnEventCallbackSha256:sha(eventSource),cases:rows,productionChanges:0},null,2)+'\n');
});
