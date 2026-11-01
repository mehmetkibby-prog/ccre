import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,manifest,hash} from './helpers.mjs';
import {IngressRate} from '../ingress-rate.mjs';
import {GamePresenceBridge} from '../game-presence.mjs';
import {patchNativeAuth} from '../patch-native-auth.mjs';
const nativeFile='dist-vds/server/channel-runtime/index.mjs',source=fs.readFileSync(path.join(BASE,nativeFile),'utf8');assert.equal(hash(source),manifest.files.find(r=>r.path===nativeFile).sha256);
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
test('WS ingress preserves native category thresholds, dungeon rate and transfer windows without SQL',()=>{
 let now=100000;const original=names=>vm.runInNewContext('(()=>{const localWindows=new Map(),rates=new Map();let nextLocalCleanupAtMs=0;'+names.map(name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);return source.slice(n.start,n.end);}).join('\n')+'return {enforceLocalActionRate,rate};})()',{Date:{now:()=>now}});
 const old=original(['enforceLocalActionRate','rate']),rate=new IngressRate({clock:()=>now,modeRate:()=>{throw Error('unbound native mode rate');}}),identity={actor:'player-rate',account:'account-rate'};
 for(const action of ['move','attack','pvp_attack','collect','claim_rewards','fishing_input','upgrade_unique','evolve_weapon','sell_item','cast_support456']){
  now+=120001;for(let i=0;i<730;i++)assert.equal(rate.check(identity,{action}),old.enforceLocalActionRate(identity.account,action),action+':'+i);
 }
 now+=120001;for(let i=0;i<27;i++)assert.equal(rate.check(identity,{action:'dungeon',input:{action:'move'}}),old.rate(identity.actor)?1:0);now+=1000;assert.equal(rate.check(identity,{action:'dungeon'}),0);
 now+=120001;for(let i=0;i<360;i++)assert.equal(rate.check(identity,{action:'move'}),0);
 const snapshot=rate.snapshot(identity),target=new IngressRate({clock:()=>now,modeRate:()=>0});target.restore(identity,snapshot);assert.equal(target.check(identity,{action:'move'}),60);target.restore(identity,snapshot);assert.equal(target.rules.localWindows.get('account-rate:move').count,361);assert.throws(()=>target.restore({...identity,account:'different'},snapshot),/rate_transfer_scope/);
});
test('authenticated WS presence extends only the same native DB instance/session and expires or revokes without heartbeat SQL',()=>{
 let time=100000,allowed=true;const owner={player_id:'player',channel:4,epoch:3,incarnation:'channel-4',state:'active',admitted:true},identity={actor:'player',account:'account',session:'session',epoch:3},peer={channel:4,incarnation:'channel-4'};
 const session={player:{id:'player'},account:{id:'account'},tokenHash:'session',securityVersion:7,gamePresence:{instanceId:'tab',tokenHash:'session',expiresAtMs:100100,chatAfterId:42}};
 const bridge=new GamePresenceBridge({owner:()=>owner,security:()=>allowed,clock:()=>time});bridge.admit(session,owner);assert.equal(bridge.augment(session),session);
 bridge.seen(peer,identity);time=100200;assert.equal(bridge.augment(session).gamePresence.expiresAtMs,140000);assert.equal(bridge.augment(session).gamePresence.chatAfterId,42);assert.equal(session.gamePresence.expiresAtMs,100100);
 for(const changed of [{gamePresence:undefined},{tokenHash:'other'},{securityVersion:8},{gamePresence:{...session.gamePresence,instanceId:'other-tab'}},{gamePresence:{...session.gamePresence,tokenHash:'other-session'}}]){const s={...session,...changed};assert.equal(bridge.augment(s),s);}
 bridge.disconnect(peer,identity);assert.equal(bridge.augment(session).gamePresence.expiresAtMs,140000,'short disconnect retains its existing bounded lease, not a new one');time=140000;assert.equal(bridge.augment(session),session);
 time=140001;bridge.seen(peer,identity);allowed=false;assert.equal(bridge.augment(session),session);assert.throws(()=>bridge.seen(peer,identity),/security/);allowed=true;owner.epoch=4;assert.equal(bridge.augment(session),session);assert.throws(()=>bridge.seen(peer,identity),/fenced/);owner.epoch=3;bridge.revoke({account:'account'});assert.equal(bridge.augment(session),session);
});
test('native auth patch changes only the final return after unchanged session/account checks',()=>{
 for(const file of ['dist-vds/server/channel-runtime/index.mjs','dist-vds/server/index.js']){
  const input=fs.readFileSync(path.join(BASE,file),'utf8');assert.equal(hash(input),manifest.files.find(r=>r.path===file).sha256);const {source:output}=patchNativeAuth(input);
  assert.equal(output.replace('return globalThis.__colCore511Presence?.augment(session) ?? session;','return session;'),input);
 }
});
