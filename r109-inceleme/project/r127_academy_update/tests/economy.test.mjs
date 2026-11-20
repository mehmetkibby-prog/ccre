import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {httpActionFixture} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/native-http-action-fixture.mjs';
import {put} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/pvp-fixture.mjs';

test('Gezgin Marketi sells one extractor and returns exactly the socketed attack roll, including retried requests',async t=>{
 const s=await httpActionFixture(t),{f}=s;
 await s.core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET level=65,champion_level_r102=1 WHERE id=?').run(f.id));
 const gear=async(id,rarity,opts={})=>s.core.permanentPlayers([f.id],()=>put(f.sql,'player_items',{id,player_id:f.id,item_name:id,kind:'weapon',rarity,power:45,role:f.sql.prepare('SELECT role FROM players WHERE id=?').get(f.id).role,enchantments:'[]',created_at:1,...opts}));
 const call=async(body)=>{const r=await s.call(body);return {status:r.status,...await r.json()};};
 await gear('extract-test-item','red',{enchantments:JSON.stringify([{kind:'critical',value:4},{kind:'stone_attack',value:20}])});
 const buy={action:'buy_stone_extractor',requestId:randomUUID()};
 let result=await call(buy);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.extractors,1);assert.equal(result.gems,800);
 assert.deepEqual(await call(buy),result);
 const extract={action:'extract_socket_stone',requestId:randomUUID(),itemId:'extract-test-item',stoneKind:'attack:20'};
 assert.equal((await call({...extract,stoneKind:'attack:30'})).status,409);
 result=await call(extract);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.extractors,0);
 assert.deepEqual(await call(extract),result);
 assert.deepEqual(JSON.parse(f.sql.prepare('SELECT enchantments FROM player_items WHERE id=?').get(extract.itemId).enchantments),[{kind:'critical',value:4}]);
 assert.equal(f.sql.prepare("SELECT amount FROM player_stones WHERE player_id=? AND kind='attack:20'").get(f.id).amount,1);
 assert.equal((await call({...extract,requestId:randomUUID()})).status,409);
 for (const rarity of ['red','purple']){
  const eligible='bulk-test-'+rarity,locked='lock-test-'+rarity,equipped='wear-test-'+rarity;
  await gear(eligible,rarity);await gear(locked,rarity,{sale_locked499:1});await gear(equipped,rarity,{equipped:1,kind:rarity==='red'?'helmet':'shoes'});
  const sell={action:'sell_rarity',rarity,requestId:randomUUID()};
  const sale=await call(sell);assert.equal(sale.status,200,JSON.stringify(sale));assert.ok(sale.soldItemIds.includes(eligible));assert.ok(!sale.soldItemIds.includes(locked)&&!sale.soldItemIds.includes(equipped));
  assert.equal(sale.earned,sale.sold*(rarity==='purple'?50:f.sql.prepare('SELECT item_sale_red FROM game_settings WHERE id=1').get().item_sale_red));
  await gear('after-sale-'+rarity,rarity);
  const replay=await call(sell);assert.equal(replay.earned,sale.earned);assert.equal(replay.sold,sale.sold);assert.equal(replay.gems,sale.gems);
  assert.ok(f.sql.prepare('SELECT 1 FROM player_items WHERE id=?').get('after-sale-'+rarity));
 }
});
