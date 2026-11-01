// SQL/result oracle is unchanged; assert exactly the intended extra private cross-area respawn event.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary} from '../../working/core511-source/scripts/core511/tests/helpers.mjs';
import {setupPvp,json,put,update,response} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {createAttackRules} from '../../working/core511-source/scripts/core511/generated/attack-rules.mjs';
import {readAttackFrame} from '../../working/core511-source/scripts/core511/attack-writer.mjs';
import {createActionWriterHandler,actionRandom} from '../../working/core511-source/scripts/core511/action-writer.mjs';
import {ChannelOwnership,registerOwnedRule} from '../../working/core511-source/scripts/core511/ownership.mjs';
import {SkillMemory} from '../../working/core511-source/scripts/core511/skill-memory.mjs';
import {DurableWorldState,readWorldPoint} from '../../working/core511-source/scripts/core511/world-state.mjs';
const tables=['world_state','players','player_items','world_drops','dungeon_materials','player_stones','guild_essence_rewards','messages','fishing_sessions'];
const capture=sql=>Object.fromEntries(tables.map(table=>[table,json(sql.prepare('SELECT * FROM '+table+' ORDER BY rowid').all())]));
const fixedSqlClock=(s,nowMs)=>s.sql.function('strftime',{varargs:true},pattern=>{assert.equal(pattern,'%s');return String(Math.floor(nowMs/1000));});
async function parity(s,input,{nowMs=s.nowMs,actors=()=>[],globals=s.globals}={}){
 // Native movement triggers stamp SQLite wall time. Both oracle and adapter
 // must share the same fixed SQL clock as their already fixed JS action time.
 fixedSqlClock(s,nowMs);
 const expectedFrame={player:readAttackFrame(s.sql,s.id,'',globals).player,settings:s.settings},events=[],rates=[],actualRates=[];
 const original=createAttackRules({globals,...actionRandom(s.seed),now:()=>nowMs,response,ports:{publishRealtimeRoomEvent:(...a)=>{events.push(a);},publishRealtimeWorldEvent:(...a)=>{events.push(a);},deliverRealtime:v=>v,settlePveEngagement:()=>null,enforceRateLimit:(...a)=>{rates.push(a);}}});
 s.sql.exec('SAVEPOINT action_oracle');const expected=await original.nativeAction(s.db,{...expectedFrame,playerId:s.id,payload:input,requestReceivedAtMs:nowMs,now:Math.floor(nowMs/1000),auth:{account:{id:s.sql.prepare('SELECT account_id FROM players WHERE id=?').get(s.id).account_id}}}),after=capture(s.sql);s.sql.exec('ROLLBACK TO action_oracle;RELEASE action_oracle');
 const handler=createActionWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>globals,assertOwnership:()=>true,assertResources:()=>true,affectedActors:actors,settleRetaliation:()=>null,enforceRateLimit:(_, ...a)=>{actualRates.push(a);},clock:()=>nowMs});
 const actual=await s.f.database.atomic(sql=>handler(sql,{input,seed:s.seed,nowMs,receivedAtMs:nowMs,expected:expectedFrame},{actor:s.id}));
 assert.deepEqual(json(actual.result),json(expected),input.action);const expectedEvents=[...events];
 if(input.action==='respawn'&&expected.status===200&&expected.body.area!==expectedFrame.player.area){
  const source=events.find(args=>args[3]?.type==='player_respawn');assert(source,'original room respawn event');
  expectedEvents.push([source[0],expectedFrame.player.channel,expected.body.area,[s.id],source[3]]);
 }
 assert.deepEqual(json(actual.events),json(expectedEvents));assert.deepEqual(actualRates,rates);assert.deepEqual(capture(s.sql),after,input.action);return actual;
}
test('native respawn preserves region, arena countdown/round and no-early-revive rules',async t=>{
 const s=await setupPvp(t);for(const area of ['forest','frozen','black','war','rune_v2','arena'])for(const ready of [false,true]){s.reset({area,actor:{hp:0,respawn_at_ms:s.nowMs+(ready?-1:1000)}});const result=await parity(s,{action:'respawn'});assert.equal(result.result.status,ready?200:409,area);}
 s.reset({area:'arena',actor:{hp:0,respawn_at_ms:s.nowMs-1}});update(s.sql,'arena_matches','pvp-match',{mode:'3v3',team_size:3});const waiting=await parity(s,{action:'respawn'});assert.equal(waiting.result.body.code,'arena_waiting_for_round498');
});
