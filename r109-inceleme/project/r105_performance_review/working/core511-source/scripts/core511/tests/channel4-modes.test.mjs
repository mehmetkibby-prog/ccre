import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {native,hash} from './helpers.mjs';
import {createAttackWriterRules} from '../generated/attack-writer-rules.mjs';
import {actionRandom} from '../action-writer.mjs';
import {NativeModeServices} from '../mode-services.mjs';
import {setupPvp,json} from './pvp-fixture.mjs';
import {captureModes,compareMode,modeGlobals} from './mode-fixture.mjs';

test('four-channel native event and rune classifiers recognize all valid families and reject invalid scope',async()=>{
 const rules=createAttackWriterRules({globals:{},fourChannels:true}),old=createAttackWriterRules({globals:{}}),event=await native('lib/event-island444.mjs'),rune=await native('lib/runes.mjs'),v2=await native('lib/rune-v2.mjs'),uuid='11111111-1111-4111-8111-111111111111';
 for(const channel of [1,2,3,4]){
  for(const {kind}of event.EVENT_BOSSES444){const id=`event-${kind}-c${channel}-${uuid}`;assert.equal(rules.eventKind444(id),kind);assert.equal(old.eventKind444(id),event.eventKind444(id));}
  for(const key of ['tide','warden','sentinel','wraith']){const row={area:'rune',id:`rune-${key}-c${channel}-1`},v={area:'rune_v2',id:`rune-v2-${key}-c${channel}-1`};assert.equal(rules.runeMonsterKey(row),key);assert.equal(old.runeMonsterKey(row),rune.runeMonsterKey(row));assert.equal(rules.runeV2MonsterKey(v),key);assert.equal(old.runeV2MonsterKey(v),v2.runeV2MonsterKey(v));}
  assert.equal(rules.runeV2MonsterKey({area:'rune_v2',id:`rune-v2-boss-c${channel}-1`}),'boss');
 }
 for(const c of [0,5,11]){assert.equal(rules.eventKind444(`event-dragon-c${c}-${uuid}`),null);assert.equal(rules.runeMonsterKey({area:'rune',id:`rune-tide-c${c}-1`}),null);assert.equal(rules.runeV2MonsterKey({area:'rune_v2',id:`rune-v2-boss-c${c}-1`}),null);}
 assert.equal(rules.runeV2MonsterKey({area:'forest',id:'rune-v2-boss-c4-1'}),null);
});
test('native rune drop helper uses operation UUID and dice without ambient randomness',async()=>{
 const {prepareRuneDrops}=await native('lib/rune-drops.mjs'),seed='6'.repeat(64),profile={runeLoot:{rune_attack:{chance:100,min:1,max:3},blue:{chance:100,min:1,max:1}}},participants=[{player_id:'p-one'},{player_id:'p-two'}],helpers={role:()=> 'avci',name:()=> 'Original fixture gear',power:()=>20,enchants:()=>[]},params=[profile,participants,'rune-tide-c3-1',{x:10,y:20},{},100,helpers];
 const previous=globalThis.crypto.randomUUID,rng=actionRandom(seed);let expected;
 try{globalThis.crypto.randomUUID=rng.uuid;expected=prepareRuneDrops(...params,rng.random);}finally{globalThis.crypto.randomUUID=previous;}
 const rules=createAttackWriterRules({globals:{},...actionRandom(seed),fourChannels:true}),ambient=Math.random;
 try{Math.random=()=>{throw Error('ambient RNG forbidden');};globalThis.crypto.randomUUID=()=>{throw Error('ambient UUID forbidden');};assert.deepEqual(rules.prepareRuneDrops(...params),expected);}
 finally{Math.random=ambient;globalThis.crypto.randomUUID=previous;}
});
test('native event spawn and clear retain receipts and shared public cache through channel4',async t=>{
 const s=await setupPvp(t),{createEventIsland444}=await native('vds-server/src/event-island444.mjs'),{EVENT_BOSSES444,defaultEventConfig444}=await native('lib/event-island444.mjs');
 s.sql.prepare('UPDATE event_island_settings444 SET config_json=? WHERE id=1').run(JSON.stringify({...defaultEventConfig444(),enabled:true}));
 const profile=kind=>({hp:12345,damage:35,xp:100,loot:{lootSourceKey:'event.catalog',lootProfileRevision:0,lootProfileJson:JSON.stringify({version:1,kind,config:{loot:[]}})}}),services=new NativeModeServices(s.sql,{globals:modeGlobals,clock:()=>s.nowMs,fourChannels:false}),plan=EVENT_BOSSES444.map(b=>({kind:b.kind,channel:3,count:1})),requestId=s.nowMs+'-11111111-1111-4111-8111-111111111111';
 await compareMode(s,services,'event-spawn',db=>createEventIsland444(db,{now:()=>s.nowMs}),o=>o.spawn(plan,requestId,'test-admin',profile),g=>g.__colEventIsland444.spawn(plan,requestId,'test-admin',profile));
 const four=new NativeModeServices(s.sql,{globals:modeGlobals,clock:()=>s.nowMs,fourChannels:true}),event=four.globals.__colEventIsland444,call=fn=>s.f.database.atomic(()=>four.run({nowMs:s.nowMs,seed:hash(s.seed+'event4')},()=>fn()));
 const result=await call(()=>event.spawn(plan.map(p=>({...p,channel:4})),s.nowMs+'-22222222-2222-4222-8222-222222222222','test-admin',profile));assert.equal(result.ids.length,7);assert.deepEqual(event.public(4).activeKinds,[...EVENT_BOSSES444.map(b=>b.kind)].sort());
 const before=captureModes(s.sql);await assert.rejects(call(()=>event.clear(5,s.nowMs+'-33333333-3333-4333-8333-333333333333','test-admin')),/Kanal/);assert.deepEqual(captureModes(s.sql),before);
 await call(()=>event.clear(4,s.nowMs+'-44444444-4444-4444-8444-444444444444','test-admin'));assert.equal(s.sql.prepare("SELECT COUNT(*) n FROM monsters WHERE area='event' AND channel=4 AND hp>0").get().n,0);assert.equal(s.sql.prepare("SELECT COUNT(*) n FROM monsters WHERE area='event' AND channel=3 AND hp>0").get().n,7);assert.deepEqual(event.public(4).activeKinds,[]);
});
