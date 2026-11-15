import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {httpActionFixture} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/native-http-action-fixture.mjs';
import {put} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {until} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/helpers.mjs';
import {readAttackFrame} from '../../r109_latency_completion/working/core511-source/scripts/core511/attack-writer.mjs';
import {RoyalServiceR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/royal-service-r118.mjs';

test('actual owner transport collects a crown, transforms once, salvages once and native equip enforces champion ownership',{timeout:60000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s;let sequence=0;
 const faults=()=>s.faults.map(f=>f.error?.stack??JSON.stringify(f)).join('\n');
 const send=async payload=>{
  const seq=++sequence;s.live.ws.send(JSON.stringify({type:'input',sequence:seq,payload}));
  await until(()=>s.live.packets.some(p=>p.results?.some(r=>r.sequence===seq))||s.faults.length,12000);
  assert.equal(s.faults.length,0,faults());const result=s.live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===seq);assert.ok(result,JSON.stringify(s.live.packets));return result;
 };
 const status=async()=>{const request=f.request({path:'/api/royal-r118',method:'GET'}),response=await s.bindings.route(request,()=>new Response(null,{status:404}));assert.equal(response.status,200,await response.clone().text());return response.json();};
 const material=kind=>f.sql.prepare('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(f.id,kind)?.amount??0;
 await core.permanentPlayers([f.id],()=>{
  f.sql.prepare("UPDATE players SET is_gm=0,level=1,champion_level_r102=1,area='champions',x=1800,y=2150,hp=1000,gems=50000,enchant_scrolls=2,combat_lock_until_ms=0 WHERE id=?").run(f.id);
  f.sql.prepare("INSERT INTO player_stones(player_id,kind,amount) VALUES(?,'attack',2) ON CONFLICT(player_id,kind) DO UPDATE SET amount=2").run(f.id);
  for(const [kind,amount]of [['emerald_dust',8],['royal_crown',0]])f.sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=excluded.amount').run(f.id,kind,amount);
  for(const [id,kind,power]of [['royal-host-weapon','weapon',350],['royal-host-salvage','armor',300]])put(f.sql,'player_items',{id,player_id:f.id,kind,item_name:'Kadim Zümrüt',rarity:'emerald',power,role:f.sql.prepare('SELECT role FROM players WHERE id=?').get(f.id).role,enchantments:kind==='weapon'?'[{"kind":"critical","value":5},{"kind":"evolution_level","value":1}]':'[]',equipped:0,created_at:1});
  const now=Math.floor(Date.now()/1000);put(f.sql,'world_drops',{id:'royal-host-crown',owner_id:f.id,monster_id:'champions-ivory-guard-c1-01',kind:'royal_crown',item_name:'Kraliyet Tacı',rarity:'white',power:0,amount:1,role:'arkanist',enchantments:'[]',x:1800,y:2150,expires_at:now+120,collectible_at:now});
 });
 const collected=await send({action:'collect',targetId:'royal-host-crown'});assert.equal(collected.status,200,JSON.stringify(collected));assert.equal(material('royal_crown'),1);
 assert.equal(f.sql.prepare('SELECT 1 FROM world_drops WHERE id=?').get('royal-host-crown'),undefined);
 assert.equal((await send({action:'collect',targetId:'royal-host-crown'})).status,404);assert.equal(material('royal_crown'),1);
 await core.permanentPlayers([f.id],()=>f.sql.prepare("UPDATE players SET area='bazaar',x=1740,y=390,combat_lock_until_ms=0 WHERE id=?").run(f.id));
 const info=await status(),candidate=info.items.find(i=>i.id==='royal-host-weapon');assert.ok(candidate);
 const transform={action:'royal_transform_r118',requestId:randomUUID(),itemId:candidate.id,itemStamp:candidate.itemStamp,revision:info.revision};
 const converted=await send(transform);assert.equal(converted.status,200,JSON.stringify(converted));assert.equal(material('royal_crown'),0);assert.equal(material('emerald_dust'),0);
 let gear=f.sql.prepare('SELECT * FROM player_items WHERE id=?').get(candidate.id);assert.equal(gear.rarity,'royal');assert.equal(gear.power,378);
 assert.equal((await send(transform)).status,200);assert.equal(material('emerald_dust'),0);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM royal_transforms_r118 WHERE item_id=?').get(candidate.id).n,1);
 const equip=await s.call({action:'equip',itemId:candidate.id});assert.equal(equip.status,200,await equip.clone().text());assert.equal(f.sql.prepare('SELECT equipped FROM player_items WHERE id=?').get(candidate.id).equipped,1);
 assert.deepEqual({...f.sql.prepare('SELECT is_gm,level,champion_level_r102 FROM players WHERE id=?').get(f.id)},{is_gm:0,level:1,champion_level_r102:1});
 const socket=await s.call({action:'socket_stone',itemId:candidate.id,stoneKind:'attack'});assert.equal(socket.status,200,await socket.clone().text());assert.equal((await socket.json()).stoneAmount,1);
 assert.equal(f.sql.prepare("SELECT amount FROM player_stones WHERE player_id=? AND kind='attack'").get(f.id).amount,1);
 const rerollInput={action:'reroll',itemId:candidate.id,requestId:randomUUID()},premium=body=>s.module.default(f.request({path:'/api/premium',body}));
 const reroll=await premium(rerollInput);assert.equal(reroll.status,200,await reroll.clone().text());assert.equal((await reroll.json()).ok,true);
 const rerolled=f.sql.prepare('SELECT * FROM player_items WHERE id=?').get(candidate.id),effects=JSON.parse(rerolled.enchantments);
 assert.equal(rerolled.rarity,'royal');assert.equal(rerolled.power,378);assert.equal(rerolled.equipped,1);assert.equal(rerolled.player_id,f.id);
 assert.deepEqual(effects.find(e=>e.kind==='stone_attack'),{kind:'stone_attack',value:25});assert.deepEqual(effects.find(e=>e.kind==='evolution_level'),{kind:'evolution_level',value:1});assert.equal(effects.filter(e=>!e.kind.startsWith('stone_')&&!e.kind.startsWith('evolution_')).length,1);
 assert.equal(f.sql.prepare('SELECT enchant_scrolls FROM players WHERE id=?').get(f.id).enchant_scrolls,1);
 // Preserve the native 250ms crafting gate; a replay after that gate must
 // return the durable receipt without consuming a second scroll.
 await delay(275);
 const replayReroll=await premium(rerollInput);assert.equal(replayReroll.status,200,await replayReroll.clone().text());assert.equal(f.sql.prepare('SELECT enchant_scrolls FROM players WHERE id=?').get(f.id).enchant_scrolls,1);assert.equal(f.sql.prepare('SELECT enchantments FROM player_items WHERE id=?').get(candidate.id).enchantments,rerolled.enchantments);
 const native=readAttackFrame(f.sql,f.id,'',s.writer.services.globals).player;assert(native.equipped_weapon_power>=378,JSON.stringify(native));
 await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET champion_level_r102=0 WHERE id=?').run(f.id));
 const forbidden=await s.call({action:'equip',itemId:candidate.id});assert.equal(forbidden.status,403,await forbidden.clone().text());assert.equal(f.sql.prepare('SELECT equipped FROM player_items WHERE id=?').get(candidate.id).equipped,0);
 await core.permanentPlayers([f.id],()=>f.sql.prepare("UPDATE players SET x=1200,y=390,combat_lock_until_ms=0 WHERE id=?").run(f.id));
 const salvageInfo=await status(),salvage=salvageInfo.items.find(i=>i.id==='royal-host-salvage'),salvageInput={action:'royal_salvage_r118',requestId:randomUUID(),itemId:salvage.id,itemStamp:salvage.itemStamp,confirm:true};
 assert.equal((await send(salvageInput)).status,200);assert.equal((await send(salvageInput)).status,200);assert.equal(material('emerald_dust'),1);assert.equal(f.sql.prepare('SELECT 1 FROM player_items WHERE id=?').get(salvage.id),undefined);
 const renewed=new RoyalServiceR118(f.sql),persisted=renewed.status(f.id);assert.equal(persisted.materials.emerald_dust,1);assert.equal(persisted.materials.royal_crown,0);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM royal_receipts_r118 WHERE player_id=?').get(f.id).n,2);
 assert.equal(s.faults.length,0,faults());assert.equal(f.sql.isTransaction,false);
});
