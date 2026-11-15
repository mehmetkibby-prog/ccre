import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {BASE,SHA} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/helpers.mjs';
import {put} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {createRoyalSchemaR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/royal-config-r118.mjs';
import {ContentServiceR102} from '../../r109_latency_completion/working/core511-source/scripts/core511/content-service-r102.mjs';
import {EMERALD_COST_R102} from '../../r109_latency_completion/working/core511-source/scripts/core511/content-config-r102.mjs';
import {ZUMRUT_BY_ID_R93} from '../../r109_latency_completion/working/core511-source/scripts/core511/zumrut-catalog-r93.mjs';
import {enhancementBonus491} from '../../r109_latency_completion/working/native510-bb3a6cc689c6/lib/enhancement491.mjs';
import {createEnhancement491} from '../../r109_latency_completion/working/native510-bb3a6cc689c6/vds-server/src/enhancement-engine491.mjs';
import {RoyalServiceR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/royal-service-r118.mjs';
process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {fixture}=await import('../../r109_latency_completion/working/core511-source/scripts/perf-r11/tests/reward/fixture.mjs');
test('royal conversion and salvage work against full native schema, existing triggers and native atomic commit',async t=>{
 const f=await fixture();t.after(()=>f.close());const sql=f.database.sqlite;createRoyalSchemaR118(sql);
 sql.exec("UPDATE players SET champion_level_r102=1,hp=100,area='bazaar',x=1740,y=390,arena_match_id='',combat_lock_until_ms=0,gems=20000 WHERE id='real-1'");
 for(const kind of ['emerald_dust','royal_crown'])sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=20').run('real-1',kind,20);
 put(sql,'player_items',{id:'royal-native-candidate',player_id:'real-1',kind:'armor',item_name:'+3 Kadim Zümrüt Zırhı',rarity:'emerald',power:311,role:'arkanist',enchantments:'[{"kind":"hp","value":300}]',equipped:0,created_at:1});
 const service=new RoyalServiceR118(sql),status=service.status('real-1'),item=status.items.find(i=>i.id==='royal-native-candidate');assert.ok(item);
 const request={action:'royal_transform_r118',requestId:randomUUID(),revision:status.revision,itemId:item.id,itemStamp:item.itemStamp};
 const result=await f.database.atomic(()=>service.command('real-1',request));assert.equal(result.item.power,335);assert.equal(result.item.rarity,'royal');
 const owned=sql.prepare('SELECT * FROM player_items WHERE id=?').get(item.id);assert.equal(owned.enchantments,'[{"kind":"hp","value":300}]');
 assert.deepEqual(await f.database.atomic(()=>service.command('real-1',request)),result);
 sql.exec("UPDATE player_items SET equipped=1 WHERE id='royal-native-candidate'");assert.equal(sql.prepare('SELECT equipped FROM player_items WHERE id=?').get(item.id).equipped,1);
 sql.exec("UPDATE players SET champion_level_r102=0 WHERE id='real-1'");assert.equal(sql.prepare('SELECT equipped FROM player_items WHERE id=?').get(item.id).equipped,0);
 put(sql,'player_items',{id:'salvage-native-candidate',player_id:'real-1',kind:'weapon',item_name:'Kadim Zümrüt Öz Asası',rarity:'emerald',power:350,role:'arkanist',enchantments:'[]',equipped:0,created_at:1});
 sql.exec("UPDATE players SET x=1200 WHERE id='real-1'");const dustBefore=service.balance('real-1','emerald_dust'),salvage=service.status('real-1').items.find(i=>i.id==='salvage-native-candidate');
 await f.database.atomic(()=>service.command('real-1',{action:'royal_salvage_r118',requestId:randomUUID(),itemId:salvage.id,itemStamp:salvage.itemStamp,confirm:true}));
 assert.equal(service.balance('real-1','emerald_dust'),dustBefore+1);assert.equal(sql.prepare('SELECT 1 FROM player_items WHERE id=?').get(salvage.id),undefined);
});

test('native Sonsuz and Royal transformations commute for every +level while preserving fixed enhancement bonuses',async t=>{
 const f=await fixture();t.after(()=>f.close());const sql=f.database.sqlite;createRoyalSchemaR118(sql);
 sql.exec("UPDATE players SET champion_level_r102=1,hp=100,area='bazaar',x=1740,y=390,arena_match_id='',combat_lock_until_ms=0,gems=10000000 WHERE id='real-1'");
 for(const r of EMERALD_COST_R102){const p=ZUMRUT_BY_ID_R93.get(r.itemId).payment;if(p.table==='dungeon_materials')sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=100000').run('real-1',p.kind,100000);}
 for(const kind of ['emerald_dust','royal_crown'])sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=100000').run('real-1',kind,100000);
 const royal=new RoyalServiceR118(sql),content=new ContentServiceR102(sql);
 const transform=async id=>{const status=royal.status('real-1'),view=status.items.find(i=>i.id===id);return f.database.atomic(()=>royal.command('real-1',{action:'royal_transform_r118',requestId:randomUUID(),revision:status.revision,itemId:id,itemStamp:view.itemStamp}));};
 const infinite=id=>f.database.atomic(()=>content.command('real-1',{action:'emerald_infinite_r102',requestId:randomUUID(),itemId:id}));
 for(const kind of ['weapon','armor'])for(let level=0;level<=5;level++){
  const base=kind==='weapon'?350:300,E=enhancementBonus491(kind,level),ids=['before','after'].map(order=>order+'-'+kind+'-'+level);
  for(const id of ids)put(sql,'player_items',{id,player_id:'real-1',kind,item_name:'+'+level+' Kadim Zümrüt',rarity:'emerald',power:base+E,role:'arkanist',enchantments:'[{"kind":"hp","value":100}]',equipped:0,created_at:1});
  await infinite(ids[0]);await transform(ids[0]);await transform(ids[1]);await infinite(ids[1]);
  const old=sql.prepare('SELECT * FROM player_items WHERE id=?').get(ids[0]),next=sql.prepare('SELECT * FROM player_items WHERE id=?').get(ids[1]);
  assert.equal(old.power,next.power,kind+' +'+level);assert.equal(old.power,Math.round((base*1.08+E)*1.2));assert.equal(old.item_name,next.item_name);assert.equal(old.enchantments,next.enchantments);
  await assert.rejects(infinite(ids[0]),/henüz Sonsuz yapılmamış/);await assert.rejects(infinite(ids[1]),/henüz Sonsuz yapılmamış/);
 }
});

test('new royal power remains integer and can be enhanced by the unchanged native enhancement guard',async t=>{
 const f=await fixture();t.after(()=>f.close());const sql=f.database.sqlite;createRoyalSchemaR118(sql);
 sql.exec("PRAGMA synchronous=FULL; UPDATE players SET champion_level_r102=1,hp=100,area='bazaar',x=1740,y=390,arena_match_id='',combat_lock_until_ms=0,gems=100000 WHERE id='real-1'; DELETE FROM pve_engagements WHERE player_id='real-1'; DELETE FROM dungeon_members WHERE player_id='real-1'");
 for(const kind of ['emerald_dust','royal_crown'])sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=20').run('real-1',kind,20);
 put(sql,'player_items',{id:'enhance-royal',player_id:'real-1',kind:'weapon',item_name:'+0 Sonsuz Kadim Zümrüt Öz Asası',rarity:'emerald',power:420,role:'arkanist',enchantments:'[{"kind":"attack","value":30}]',equipped:0,created_at:1});
 sql.prepare('INSERT INTO content_forge_r102 VALUES(?,?,?,?)').run('enhance-royal','real-1',JSON.stringify({kind:'weapon',item_name:'+0 Kadim Zümrüt Öz Asası',power:350}),1);
 const royal=new RoyalServiceR118(sql),status=royal.status('real-1'),view=status.items.find(i=>i.id==='enhance-royal');
 await f.database.atomic(()=>royal.command('real-1',{action:'royal_transform_r118',requestId:randomUUID(),revision:status.revision,itemId:view.id,itemStamp:view.itemStamp}));
 assert.equal(sql.prepare('SELECT power FROM player_items WHERE id=?').get(view.id).power,454);
 sql.exec("UPDATE players SET x=1200,y=390 WHERE id='real-1'");const enhance=createEnhancement491(sql,{randomInt:()=>0,isTestPlayer:()=>false}),cfg=enhance.settings();
 cfg.config.enabled=true;for(const row of cfg.config.stages){row.requirements=[];row.successPercent=100;}const saved=enhance.save(cfg.config,cfg.revision);
 const account=sql.prepare("SELECT account_id FROM players WHERE id='real-1'").get().account_id;const input={action:'enhance_equipment491',requestId:randomUUID(),itemId:view.id,expectedLevel:0,configRevision:saved.revision};
 const enhanced=enhance.command(account,'real-1',input);assert.equal(enhanced.ok,true);assert.equal(enhanced.receipt.toLevel,1);assert.equal(enhanced.receipt.item.power,457);assert.equal(enhance.command(account,'real-1',input).replayed,true);
 const persisted=sql.prepare('SELECT * FROM player_items WHERE id=?').get(view.id);assert.equal(persisted.rarity,'royal');assert.equal(persisted.power,457);assert.equal(persisted.enchantments,'[{"kind":"attack","value":30}]');assert.equal(sql.prepare('SELECT level FROM item_enhancements491 WHERE item_id=?').get(view.id).level,1);
});
