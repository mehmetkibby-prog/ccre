import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {RoyalHttpR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/royal-http-r118.mjs';
import {RoyalServiceR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/royal-service-r118.mjs';
import {ROYAL_DEFAULTS_R118} from '../../r109_latency_completion/working/core511-source/scripts/core511/royal-config-r118.mjs';
import {createChampionsR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/champions-service-r118.mjs';
import {equipmentSetBonuses,equipmentSetState} from '../../r109_latency_completion/working/native510-bb3a6cc689c6/lib/equipment-sets.mjs';
import {installRoyalEquipmentTriggersR118} from '../../r109_latency_completion/working/native510-bb3a6cc689c6/vds-server/src/equipment-sets-schema.mjs';
import {adminHandlers,adminRequest} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/native-admin-fixture.mjs';
import {setupPvp} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/pvp-fixture.mjs';

const slots=['weapon','armor','helmet','shoes','necklace'];
const nativeSource=fs.readFileSync(new URL('../../r109_latency_completion/working/http-runtime/dist-vds/server/index.js',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));

test('emerald and royal pieces share one set family in pure and materialized SQL stats',()=>{
 const sql=new DatabaseSync(':memory:');try{
  sql.exec('CREATE TABLE players(id TEXT PRIMARY KEY,set_hp INT DEFAULT 0,set_pve INT DEFAULT 0,set_pvp INT DEFAULT 0,set_resistance INT DEFAULT 0,set_speed INT DEFAULT 0,set_attack INT DEFAULT 0); CREATE TABLE player_items(id TEXT PRIMARY KEY,player_id TEXT,kind TEXT,rarity TEXT,equipped INT); INSERT INTO players(id)VALUES(\'a\'),(\'b\')');
  installRoyalEquipmentTriggersR118(sql);
  const items=slots.map((kind,i)=>({id:String(i),player_id:'a',kind,rarity:'emerald',equipped:1}));
  for(const i of items)sql.prepare('INSERT INTO player_items VALUES(?,?,?,?,?)').run(i.id,i.player_id,i.kind,i.rarity,i.equipped);
  const before=plain(sql.prepare('SELECT * FROM players WHERE id=\'a\'').get());
  assert.deepEqual(equipmentSetBonuses(items),{hp:1000,pve:10,pvp:10,resistance:0,speed:12,attack:50});
  for(let i=0;i<5;i++){
   items[i].rarity='royal';sql.prepare("UPDATE player_items SET rarity='royal' WHERE id=?").run(String(i));
   assert.deepEqual(plain(sql.prepare('SELECT * FROM players WHERE id=\'a\'').get()),before);
   assert.equal(equipmentSetState('royal',items).count,5);
   assert.equal(equipmentSetBonuses(items).hp,1000);
  }
  sql.prepare("UPDATE player_items SET player_id='b' WHERE id='0'").run();
  assert.equal(sql.prepare("SELECT set_attack FROM players WHERE id='a'").get().set_attack,0);
  assert.equal(sql.prepare("SELECT set_hp FROM players WHERE id='b'").get().set_hp,0);
  sql.prepare("UPDATE player_items SET equipped=0 WHERE id IN ('1','2','3')").run();
  assert.equal(sql.prepare("SELECT set_hp FROM players WHERE id='a'").get().set_hp,0);
 }finally{sql.close();}
});

test('actual admin route rejects non-admin and cross-origin royal and champions edits',async()=>{
 let calls=0;const database={core511RoyalR118:{admin:async()=>{calls++;return {};},championsAdmin:async()=>{calls++;return {};}}};
 for(const feature of ['royal-r118','champions-r118']){
  const h=adminHandlers({source:nativeSource,database});
  h.setUser({id:'ordinary-player',email:'player@fixture.invalid'});
  assert.equal((await h.post(adminRequest({method:'POST',query:'?core511='+feature,body:{action:'royal_admin_read_r118'}}))).status,403);
  h.setUser({id:'admin-fixture',email:'admin@fixture.invalid'});
  assert.equal((await h.post(adminRequest({method:'POST',query:'?core511='+feature,origin:'https://attacker.invalid',body:{action:'royal_admin_save_r118'}}))).status,403);
 }
 assert.equal(calls,0);
});

test('admin configuration gate reauthorizes, commits exact revision and rejects stale saves',async t=>{
 const f=await setupPvp(t),sql=f.sql,royal=new RoyalServiceR118(sql),champions=createChampionsR118(sql);let admin='admin-fixture',gates=0;
 const core={writer:{services:{globals:{__colRoyalR118:royal,__colChampionsR118:champions}}},serial:fn=>fn()},database={sqlite:sql,core511Configuration:{async runAdminSettingsR65(_action,operation,authorize){gates++;await authorize();return operation();}}};
 const bridge=new RoyalHttpR118(database,()=>core),auth={adminId:'admin-fixture',reauthorize:async()=>admin};
 const initial=await bridge.admin({action:'royal_admin_read_r118'},auth);
 assert.equal(initial.revision,1);assert(initial.catalog.some(r=>r.id==='material:emerald_dust'));assert(initial.catalog.some(r=>r.id==='material:royal_crown'));
 const config=structuredClone(ROYAL_DEFAULTS_R118);config.recipes.armor.costs[0].amount=12;
 await bridge.admin({action:'royal_admin_save_r118',revision:1,config},auth);
 assert.equal(royal.settings().revision,2);assert.equal(royal.settings().config.recipes.armor.costs[0].amount,12);
 await assert.rejects(()=>bridge.admin({action:'royal_admin_save_r118',revision:1,config},auth),e=>e.gameCode==='royal_config_conflict_r118');
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM royal_admin_audit_r118').get().n,1);
 admin='revoked';await assert.rejects(()=>bridge.admin({action:'royal_admin_save_r118',revision:2,config},auth),e=>e.status===403);
 assert.equal(royal.settings().revision,2);assert.equal(gates,3);assert.equal(sql.isTransaction,false);
 admin='admin-fixture';const c=await bridge.championsAdmin({action:'champions_admin_read_r118'},auth);assert(c.species.length===4);assert(c.lootLabels.royal_crown);
 const changed=structuredClone(c.config);changed.monsters[c.species[0].key].xp=1234;
 await bridge.championsAdmin({action:'champions_admin_save_r118',revision:c.revision,config:changed},auth);
 assert.equal(champions.settings().config.monsters[c.species[0].key].xp,1234);
 await assert.rejects(()=>bridge.championsAdmin({action:'champions_admin_save_r118',revision:c.revision,config:changed},auth),e=>e.status===409);
 assert.equal(sql.isTransaction,false);
});

test('royal status authenticates twice and never leaks another character after session change',async()=>{
 let reads=0,auths=0;const first={account:{id:'a'},player:{id:'one'},tokenHash:'first'};
 const core={authenticate:async()=>++auths===1?first:{...first,player:{id:'two'}},serial:fn=>fn(),writer:{services:{globals:{__colRoyalR118:{status:()=>{reads++;return {};}}}}}};
 const bridge=new RoyalHttpR118({},()=>core),response=await bridge.route(new Request('https://game.invalid/api/royal-r118'));
 assert.equal(response.status,401);assert.equal(reads,0);assert.equal((await response.json()).code,'game_instance_expired');
 assert.equal((await bridge.route(new Request('https://game.invalid/api/royal-r118',{method:'POST'}))).status,405);
});
