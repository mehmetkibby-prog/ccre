import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp} from '../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {GameWriter} from '../working/core511-source/scripts/core511/writer-runtime.mjs';
import {NativeGameServices} from '../working/core511-source/scripts/core511/game-services.mjs';
import {createRewardServiceRefreshR89} from '../working/core511-source/scripts/core511/reward-service-refresh-r89.mjs';
test('native settings refresh preserves exact settings, same-revision edits, rollback recovery and dynamic services',async t=>{
 const f=await setupPvp(t),sql=f.sql,writer=new GameWriter(f.f.database,{realmId:'settings-r89',clock:()=>f.nowMs,ports:{guard:()=>true}});await writer.initialize();
 const services=writer.services,reference=new NativeGameServices(sql,{clock:()=>f.nowMs}),cache=createRewardServiceRefreshR89(services),g=services.globals;
 const keys=['__colStatus','__colQuests438','__colRunes','__colRuneV2','__colArenaMarket','__colBattlePass','__colProgression'];
 const counts=new Map();for(const key of [...keys,'__colEventIsland444']){const original=g[key].refresh;g[key].refresh=function(...args){counts.set(key,(counts.get(key)??0)+1);return original.apply(this,args);};}
 const snapshot=s=>Object.fromEntries(keys.map(key=>[key,JSON.parse(JSON.stringify((s.globals[key].settings??s.globals[key].snapshot).call(s.globals[key])))]));
 const refresh=()=>{services.refresh({serviceRefreshR89:cache});reference.refresh();assert.deepEqual(snapshot(services),snapshot(reference));};
 refresh();const first=new Map(counts);refresh();for(const key of keys)assert.equal(counts.get(key),first.get(key),'unchanged SQL configuration '+key);assert.equal(counts.get('__colEventIsland444'),2,'dynamic event state still refreshed');
 const row=sql.prepare('SELECT * FROM rune_v2_settings WHERE id=1').get(),config=JSON.parse(row.config_json);config.monsters.tide.respawnSeconds+=1;
 sql.prepare('UPDATE rune_v2_settings SET config_json=? WHERE id=1').run(JSON.stringify(config));refresh();assert.equal(g.__colRuneV2.settings().config.monsters.tide.respawnSeconds,config.monsters.tide.respawnSeconds);assert.equal(counts.get('__colRuneV2'),2,'same revision changed bytes must reload');
 sql.exec('BEGIN IMMEDIATE');const next=structuredClone(config);next.monsters.tide.respawnSeconds+=1;g.__colRuneV2.save(next,row.revision);sql.exec('ROLLBACK');
 assert.equal(g.__colRuneV2.settings().config.monsters.tide.respawnSeconds,next.monsters.tide.respawnSeconds,'native JS cache did observe the reverted edit');refresh();assert.equal(g.__colRuneV2.settings().config.monsters.tide.respawnSeconds,config.monsters.tide.respawnSeconds);
 const before=counts.get('__colRuneV2');cache.afterCommand({result:{result:{status:409,body:{not_executed:true}}}});refresh();assert.equal(counts.get('__colRuneV2'),before+1);
 sql.exec('BEGIN IMMEDIATE');assert.throws(()=>cache.refresh(services,'__colRuneV2'),/reward_service_refresh_context/);sql.exec('ROLLBACK');
 services.active={};assert.throws(()=>cache.refresh(services,'__colRuneV2'),/reward_service_refresh_context/);services.active=null;
 assert.equal(cache.refresh(services,'__colEventIsland444'),false);assert.equal(cache.refresh(services,'__colCommunityEvent'),false);
});
