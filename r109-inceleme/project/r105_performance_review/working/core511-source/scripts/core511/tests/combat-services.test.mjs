import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE,SHA,native} from './helpers.mjs';
import {createCombatServices} from '../generated/combat-services.mjs';
process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {fixture}=await import('../../perf-r11/tests/reward/fixture.mjs');
const {createRanks}=await native('vds-server/src/ranks.mjs'),{createRunes}=await native('vds-server/src/runes.mjs'),{createRuneV2}=await native('vds-server/src/rune-v2.mjs'),{createStatus}=await native('vds-server/src/status.mjs');

test('resident rank/rune/status services reuse native rules without their per-hit rank SELECT',async t=>{
 const f=await fixture();t.after(()=>f.close());const db=f.database.sqlite,prior=globalThis.__colStatus;t.after(()=>{if(prior===undefined)delete globalThis.__colStatus;else globalThis.__colStatus=prior;});
 const nativeStatus=createStatus(db);globalThis.__colStatus=nativeStatus;
 const rank=createRanks(db),rune=createRunes(db),runeV2=createRuneV2(db),players=new Map();
 const profiles=new Map([['event-world-c4-00000000-0000-4000-8000-000000000000',Object.freeze({damage:87,cadence:2200,xp:750})]]);
 const service=createCombatServices({player:id=>players.get(id),rank:rank.settings().config,rune:rune.settings().config,runeV2:runeV2.settings().config,status:nativeStatus.settings().config,profiles});
 assert.equal(service.__colRunes.factor.toString(),rune.factor.toString(),'native rune/status method unchanged');
 for(const [level,tier,runeLevel,defense]of [[1,0,0,0],[65,1,5,6],[65,9,73,30],[64,9,73,30],[65,18,110,64]]){
  db.prepare('UPDATE players SET level=?,rank_tier=?,rune_defense_level=?,stat_defense=? WHERE id=?').run(level,tier,runeLevel,defense,'real-1');
  const p=db.prepare('SELECT * FROM players WHERE id=?').get('real-1');players.set(p.id,Object.freeze({...p}));
  assert.deepEqual(service.__colRanks.bonuses(p.id),rank.bonuses(p.id));assert.equal(service.__colRunes.factor(p,'defense'),rune.factor(p,'defense'));
  for(const owner of [p.id,'someone-else']){const input=[{id:p.id,equipped_armor_power:17,strong_players:4},{id:'missing',equipped_armor_power:3}],expected=rank.project(input,owner),prepare=db.prepare;db.prepare=()=>{throw Error('hot rank projection SQL');};try{assert.deepEqual(service.__colRanks.project(input,owner),expected);}finally{db.prepare=prepare;}}
  const cached=service.__colRanks.bonuses(p.id);players.set(p.id,Object.freeze({...p,hp:p.hp-1}));assert.equal(service.__colRanks.bonuses(p.id),cached,'ordinary HP changes reuse rank result');
 }
 for(const area of ['rune','rune_v2'])for(const key of ['tide','warden','sentinel','wraith'])for(let channel=1;channel<=4;channel++){
  const old={area,id:(area==='rune'?'rune-':'rune-v2-')+key+'-c'+Math.min(channel,3)+'-1'},current={...old,id:old.id.replace('-c3-','-c'+channel+'-')};
  assert.deepEqual(service[area==='rune'?'__colRunes':'__colRuneV2'].monster(current),(area==='rune'?rune:runeV2).monster(old));
 }
 assert.deepEqual(service.__colRuneV2.monster({area:'rune_v2',id:'rune-v2-boss-c4-1'}),runeV2.monster({area:'rune_v2',id:'rune-v2-boss-c3-1'}));
 const prepare=db.prepare;db.prepare=()=>{throw Error('SQL forbidden during hot service reads');};
 try{for(let i=0;i<1000;i++){const p=players.get('real-1');service.__colRanks.bonuses(p.id);service.__colRunes.factor(p,'defense');service.__colRunes.monster({area:'rune',id:'rune-tide-c4-1'});assert.equal(service.__colEventIsland444.profile([...profiles.keys()][0]).damage,87);}}
 finally{db.prepare=prepare;}
 const before=service.__colRanks.bonuses('real-1');assert.equal(service.__colRanks.forget('real-1'),true);assert.equal(service.__colRanks.forget('real-1'),false);
 const restored=service.__colRanks.bonuses('real-1');assert.deepEqual(restored,before);assert.notEqual(restored,before,'detached actors release their cached rank image');
 for(let i=0;i<100;i++){const id='absent-'+i;assert.deepEqual(service.__colRanks.bonuses(id),rank.bonuses(id));assert.equal(service.__colRanks.forget(id),false,'unowned lookup never enters the cache');}
});
