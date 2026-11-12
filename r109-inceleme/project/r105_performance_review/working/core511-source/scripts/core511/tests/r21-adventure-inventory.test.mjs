import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {BASE,SHA} from './helpers.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {createTowerSchema,TOWER_DEFAULTS,TOWER_CHEST,TOWER_MATERIALS} from '../tower-config.mjs';
import {createAdventureSchema} from '../adventure-schema.mjs';
process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {fixture}=await import('../../perf-r11/tests/reward/fixture.mjs');
async function scene(t){
 const f=await fixture();t.after(()=>f.close());const sql=f.database.sqlite;createTowerSchema(sql);createAdventureSchema(sql);
 const now=Date.now(),services=new NativeGameServices(sql,{clock:()=>now}),adventure=services.globals.__colAdventure;
 sql.prepare("UPDATE players SET hp=2000,max_hp=2000,level=30,area='bazaar',x=1200,y=390,channel=1,combat_lock_until_ms=0,arena_match_id='' WHERE id='real-1'").run();
 const mutate=fn=>f.database.atomic(()=>services.run({nowMs:now,seed:'a'.repeat(64)},fn));
 return {f,sql,services,adventure,mutate,command:(action,extra={})=>mutate(()=>adventure.command('real-1',{action,requestId:randomUUID(),...extra})),amount:kind=>sql.prepare('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get('real-1',kind)?.amount??0};
}
test('ordinary-map Azrail chest uses real writer service, consumes once and returns stable replay',async t=>{
 const s=await scene(t);s.adventure.material('real-1',TOWER_CHEST.kind,1);const requestId=randomUUID();
 const before=s.amount(TOWER_MATERIALS[2].kind),result=await s.command('adventure_tower_chest',{requestId});assert.equal(result.ok,true);assert.equal(s.amount(TOWER_CHEST.kind),0);assert.equal(s.amount(TOWER_MATERIALS[2].kind),before+1);
 const inventory=s.services.globals.__colDungeon.materials('real-1');assert.deepEqual(await s.command('adventure_tower_chest',{requestId}),result);assert.deepEqual(s.services.globals.__colDungeon.materials('real-1'),inventory);
 assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM adventure_receipts').get().n,1);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kadim_tower_receipts').get().n,1);
});
test('ordinary-map forge uses exact configured conversion, once-only replay, and rejects remote use',async t=>{
 const s=await scene(t),item=TOWER_MATERIALS[1];s.adventure.material('real-1',item.kind,3);const requestId=randomUUID(),before=s.amount('forge_ember491');
 const result=await s.command('adventure_refine',{requestId,kind:item.kind,amount:2});assert.equal(result.forge,item.forge*2);assert.equal(s.amount(item.kind),1);assert.equal(s.amount('forge_ember491'),before+item.forge*2);
 assert.deepEqual(await s.command('adventure_refine',{requestId,kind:item.kind,amount:2}),result);assert.equal(s.amount(item.kind),1);
 s.sql.prepare("UPDATE players SET x=2100,y=1000 WHERE id='real-1'").run();await assert.rejects(s.command('adventure_refine',{kind:item.kind,amount:1}),e=>e.adventureRule===true&&/Haso/.test(e.message));assert.equal(s.amount(item.kind),1);
});
test('known empty/combat/invalid inventory requests are rule rejections without persisted receipts',async t=>{
 const s=await scene(t);await assert.rejects(s.command('adventure_tower_chest'),e=>e.adventureRule===true&&/Sandığın yok/.test(e.message));
 await assert.rejects(s.command('adventure_refine',{kind:'missing',amount:1}),e=>e.adventureRule===true);
 s.adventure.material('real-1',TOWER_CHEST.kind,1);s.sql.prepare("UPDATE players SET combat_lock_until_ms=? WHERE id='real-1'").run(Date.now()+60000);
 await assert.rejects(s.command('adventure_tower_chest'),e=>e.adventureRule===true&&/savaş/.test(e.message));assert.equal(s.amount(TOWER_CHEST.kind),1);
 assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM adventure_receipts').get().n,0);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kadim_tower_receipts').get().n,0);
});
test('SQL failure after chest consumption stays fatal and outer transaction restores chest and receipts',async t=>{
 const s=await scene(t);s.adventure.material('real-1',TOWER_CHEST.kind,1);const before=s.services.globals.__colDungeon.materials('real-1');
 s.sql.exec("CREATE TRIGGER r21_chest_fault BEFORE INSERT ON kadim_tower_receipts BEGIN SELECT RAISE(ABORT,'r21_sql_fault'); END;");
 await assert.rejects(s.command('adventure_tower_chest'),e=>e.adventureRule!==true&&/r21_sql_fault/.test(e.message));
 assert.deepEqual(s.services.globals.__colDungeon.materials('real-1'),before);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM adventure_receipts').get().n,0);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kadim_tower_receipts').get().n,0);
});
test('spawned adventure profile cache stays bounded and evicted profiles reload from authoritative SQL',async t=>{
 const s=await scene(t);let first,last;
 await s.mutate(()=>{const run=s.adventure.insertRun('tower',1,s.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle,structuredClone(TOWER_DEFAULTS),{floor:1,wave:1});const spec={hp:123,damage:7,speed:100,attackMs:2000};for(let i=0;i<2055;i++){last=s.adventure.spawn(run,'guard',spec,i);first??=last;}});
 assert(s.adventure.profileCache.size<=2048);assert.equal(s.adventure.profileCache.has(first),false);const profile=s.adventure.profile(first);assert.equal(profile.hp,123);assert.equal(profile.damage,7);assert.equal(s.adventure.profileCache.size,2048);assert.equal(s.adventure.profile(last).kind,'guard');
});
