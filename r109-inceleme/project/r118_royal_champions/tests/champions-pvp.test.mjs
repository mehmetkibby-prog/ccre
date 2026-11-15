import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,json} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {attackRandom} from '../../r109_latency_completion/working/core511-source/scripts/core511/attack-writer.mjs';
import {createAttackWriterRules} from '../../r109_latency_completion/working/core511-source/scripts/core511/generated/attack-writer-rules.mjs';
import {createChampionsR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/champions-service-r118.mjs';

test('champions PvP all three roles and primary/AoE skills preserve native/memory parity',async t=>{
 const s=await setupPvp(t);s.sql.prepare("UPDATE monsters SET hp=0 WHERE area='champions'").run();s.globals.__colChampionsR118=createChampionsR118(s.sql);
 for(const role of ['avci','arkanist','muhafiz'])for(const ability of [0,1,2]){
  const c=s.reset({area:'champions',role,ability,actor:{champion_level_r102:1},victim:{champion_level_r102:1},extras:true});
  const targetFrames=new Map([...c.view.players.keys()].map(id=>[id,c.original.hydratePvp(s.db,s.id,id,Math.floor(s.nowMs/1000)).preloadedPvpTarget]));c.memory.targetFrameFor=id=>targetFrames.get(id);
  const actual=c.memory.step(c.context,{...attackRandom(s.seed),nowMs:s.nowMs});const expected=await c.original.nativePvp(s.db,json(c.context));
  assert.equal(expected.status,200,JSON.stringify(expected));assert.deepEqual(json(actual.result),json(expected),role+'/'+ability);assert.deepEqual(json(actual.events),json(c.oldEvents));
  for(const p of c.view.players.values())assert.deepEqual(json(p),json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(p.id)),role+'/'+ability+'/'+p.id);
 }
});

test('champions PvP death keeps gems and equipment, respawns in map, and rejects unqualified return',async t=>{
 const s=await setupPvp(t);s.sql.prepare("UPDATE monsters SET hp=0 WHERE area='champions'").run();s.globals.__colChampionsR118=createChampionsR118(s.sql);
 const c=s.reset({area:'champions',actor:{champion_level_r102:1},victim:{champion_level_r102:1,hp:1}}),items=s.sql.prepare('SELECT * FROM player_items WHERE player_id=? ORDER BY id').all(s.targetId);
 const result=await c.original.nativePvp(s.db,json(c.context));assert.equal(result.status,200,JSON.stringify(result));let victim=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.targetId);assert.equal(victim.hp,0);assert.equal(victim.gems,1000);assert.deepEqual(s.sql.prepare('SELECT * FROM player_items WHERE player_id=? ORDER BY id').all(s.targetId),items);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM war_kill_claims').get().n,0);
 const response={json:(body,{status=200}={})=>({body,status})},rules=createAttackWriterRules({globals:s.globals,now:()=>s.nowMs+60000,response,ports:{publishRealtimeRoomEvent:()=>{},publishRealtimeRoomEventToChannels:()=>{},publishRealtimePlayerEvent:()=>{},deliverRealtime:v=>v}});
 const respawn=()=>rules.nativeAction(s.db,{player:s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.targetId),playerId:s.targetId,payload:{action:'respawn'},settings:s.settings,requestReceivedAtMs:s.nowMs+60000,now:Math.floor(s.nowMs/1000)+60,auth:{account:{id:1}}});
 const back=respawn();assert.equal(back.status,200,JSON.stringify(back));victim=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.targetId);assert.equal(victim.area,'champions');assert.equal(victim.x,1800);assert.equal(victim.y,1950);assert.equal(victim.gems,1000);
 s.sql.prepare('UPDATE players SET champion_level_r102=0,hp=0,respawn_at_ms=1 WHERE id=?').run(s.targetId);assert.equal(respawn().status,200);assert.equal(s.sql.prepare('SELECT area FROM players WHERE id=?').get(s.targetId).area,'bazaar');
});
