import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {RoyalServiceR118,royalItemStampR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/royal-service-r118.mjs';
import {createRoyalSchemaR118,ROYAL_DEFAULTS_R118,validateRoyalConfigR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/royal-config-r118.mjs';
function scene(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec(`CREATE TABLE players(id TEXT PRIMARY KEY,champion_level_r102 INTEGER NOT NULL DEFAULT 0,hp INTEGER NOT NULL DEFAULT 100,area TEXT NOT NULL DEFAULT 'bazaar',x REAL NOT NULL DEFAULT 1740,y REAL NOT NULL DEFAULT 390,arena_match_id TEXT NOT NULL DEFAULT '',combat_lock_until_ms INTEGER NOT NULL DEFAULT 0,gems INTEGER NOT NULL DEFAULT 20000);
 CREATE TABLE player_items(id TEXT PRIMARY KEY,player_id TEXT NOT NULL,kind TEXT NOT NULL,item_name TEXT NOT NULL,rarity TEXT NOT NULL,power REAL NOT NULL,role TEXT NOT NULL,enchantments TEXT NOT NULL DEFAULT '[]',equipped INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT 1,expires_at_ms INTEGER NOT NULL DEFAULT 0,sale_locked499 INTEGER NOT NULL DEFAULT 0,premium_origin INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE dungeon_materials(player_id TEXT NOT NULL,kind TEXT NOT NULL,amount INTEGER NOT NULL,PRIMARY KEY(player_id,kind));
 CREATE TABLE player_stones(player_id TEXT NOT NULL,kind TEXT NOT NULL,amount INTEGER NOT NULL,PRIMARY KEY(player_id,kind));
 CREATE TABLE content_forge_r102(item_id TEXT PRIMARY KEY,player_id TEXT NOT NULL,before_json TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE player_trade_locks(player_id TEXT PRIMARY KEY,trade_id TEXT NOT NULL);
 INSERT INTO players(id,champion_level_r102) VALUES('one',1),('other',0);
 INSERT INTO dungeon_materials VALUES('one','emerald_dust',24),('one','royal_crown',3);`);
 createRoyalSchemaR118(sql);const service=new RoyalServiceR118(sql,{now:()=>1000});
 const tx=fn=>{sql.exec('BEGIN IMMEDIATE');try{const result=fn();sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}};
 const item=(id='gear')=>sql.prepare('SELECT * FROM player_items WHERE id=?').get(id);
 const put=(id='gear',values={})=>{
  const i={id,player_id:'one',kind:'weapon',item_name:'+5 Sonsuz Kadim Zümrüt Hükümkılıcı',rarity:'emerald',power:460,role:'muhafiz',enchantments:'[{"kind":"attack","value":30},{"kind":"evolution_level","value":3}]',...values};
  const keys=Object.keys(i);sql.prepare(`INSERT INTO player_items(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>i[k]));return item(id);
 };
 const request=(action='royal_transform_r118',id='gear',extra={})=>({action,itemId:id,itemStamp:royalItemStampR118(item(id)),requestId:randomUUID(),revision:service.settings().revision,...extra});
 const cmd=input=>tx(()=>service.command('one',input));
 return {sql,service,tx,item,put,request,cmd};
}
test('conversion preserves item identity, enhancement, stones and authentic infinite provenance; charges once across reconnect',t=>{
 const s=scene(t),before=s.put();s.sql.prepare('INSERT INTO content_forge_r102 VALUES(?,?,?,?)').run('gear','one','{}',1);
 const req=s.request(),result=s.cmd(req),after=s.item();
 assert.equal(after.rarity,'royal');assert.equal(after.power,493.6);assert.equal(after.item_name,'+5 Sonsuz Kraliyet Hükümkılıcı');
 for(const k of Object.keys(before).filter(k=>!['rarity','power','item_name'].includes(k)))assert.equal(after[k],before[k]);
 assert.equal(s.service.balance('one','emerald_dust'),16);assert.equal(s.service.balance('one','royal_crown'),2);assert.equal(s.service.player('one').gems,15000);
 assert.deepEqual(s.cmd(req),result);
 const reconnect=new RoyalServiceR118(s.sql,{now:()=>2000});assert.deepEqual(s.tx(()=>reconnect.command('one',req)),result);
 assert.equal(s.service.balance('one','emerald_dust'),16);assert.equal(s.sql.prepare('SELECT count(*) n FROM royal_transforms_r118').get().n,1);
 assert.throws(()=>s.cmd({...req,revision:req.revision+1}),/farklı içerik/);
 assert.throws(()=>s.cmd({...req,requestId:randomUUID()}),/Kadim Zümrüt/);
});
test('all five slots and three classes use their royal names and base-power bonus',t=>{
 const s=scene(t);s.sql.exec("UPDATE players SET gems=1000000; UPDATE dungeon_materials SET amount=100000");
 for(const role of ['muhafiz','avci','arkanist'])for(const kind of ['weapon','armor','helmet','shoes','necklace']){
  const id=role+'-'+kind;s.put(id,{kind,role,power:kind==='weapon'?350:300,item_name:'Kadim Zümrüt'});
  const result=s.cmd(s.request('royal_transform_r118',id));assert.equal(result.item.rarity,'royal');assert.equal(result.item.power,kind==='weapon'?378:324);assert.match(result.item.name,/Kraliyet/);
 }
 assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM royal_transforms_r118').get().n,15);
});
test('salvage consumes one chosen item for exactly one dust; replay and new request cannot duplicate dust',t=>{
 const s=scene(t);s.put();s.sql.exec("UPDATE players SET x=1200,champion_level_r102=0 WHERE id='one'");
 const req=s.request('royal_salvage_r118','gear',{confirm:true});assert.equal(s.cmd(req).material.amount,1);
 assert.equal(s.item(),undefined);assert.equal(s.service.balance('one','emerald_dust'),25);
 assert.equal(s.cmd(req).material.amount,1);assert.equal(s.service.balance('one','emerald_dust'),25);
 assert.throws(()=>s.cmd({...req,requestId:randomUUID()}),/Kadim Zümrüt/);assert.equal(s.sql.prepare('SELECT count(*) n FROM royal_salvage_r118').get().n,1);
});
test('receipt insertion failure rolls back conversion materials, resources, item and history',t=>{
 const s=scene(t),before=s.put(),req=s.request();s.sql.exec("CREATE TEMP TRIGGER reject_royal_receipt BEFORE INSERT ON royal_receipts_r118 BEGIN SELECT RAISE(ABORT,'receipt storage failed'); END");
 assert.throws(()=>s.cmd(req),/receipt storage failed/);assert.deepEqual(s.item(),before);assert.equal(s.service.balance('one','emerald_dust'),24);assert.equal(s.service.player('one').gems,20000);assert.equal(s.sql.prepare('SELECT count(*) n FROM royal_transforms_r118').get().n,0);
 s.sql.exec('DROP TRIGGER reject_royal_receipt');assert.equal(s.cmd(req).item.rarity,'royal');
});
test('dust cap and receipt failure leave salvaged item intact',t=>{
 const s=scene(t),before=s.put();s.sql.exec("UPDATE players SET x=1200 WHERE id='one'; UPDATE dungeon_materials SET amount=1000000000 WHERE kind='emerald_dust'");
 const req=s.request('royal_salvage_r118','gear',{confirm:true});assert.throws(()=>s.cmd(req),/sınırına/);assert.deepEqual(s.item(),before);assert.equal(s.sql.prepare('SELECT count(*) n FROM royal_salvage_r118').get().n,0);
 s.sql.exec("UPDATE dungeon_materials SET amount=0 WHERE kind='emerald_dust'; CREATE TEMP TRIGGER reject_royal_receipt BEFORE INSERT ON royal_receipts_r118 BEGIN SELECT RAISE(ABORT,'receipt storage failed'); END");
 assert.throws(()=>s.cmd(req),/receipt storage failed/);assert.deepEqual(s.item(),before);assert.equal(s.service.balance('one','emerald_dust'),0);
});
test('stale ingredient revision, stale item stamp, insufficient costs and forged targets fail without consumption',t=>{
 const s=scene(t),before=s.put(),req=s.request();
 s.tx(()=>s.service.saveConfig(structuredClone(ROYAL_DEFAULTS_R118),1,'admin'));
 assert.throws(()=>s.cmd(req),/malzemeleri değişti/);
 s.sql.prepare('UPDATE player_items SET power=power+1 WHERE id=?').run('gear');assert.throws(()=>s.cmd({...req,revision:2}),/Eşya değişti/);
 s.sql.exec("UPDATE dungeon_materials SET amount=0 WHERE kind='royal_crown'");assert.throws(()=>s.cmd(s.request()),/malzemeler eksik/);
 assert.throws(()=>s.cmd({...s.request(),itemId:'nonexistent'}),/Kadim Zümrüt/);assert.equal(s.service.balance('one','emerald_dust'),24);assert.equal(s.service.player('one').gems,20000);assert.equal(s.sql.prepare('SELECT count(*) n FROM royal_transforms_r118').get().n,0);
});
test('champion, location, combat, active trade, equipment lock and explicit salvage confirmation are enforced',t=>{
 const s=scene(t);s.put();s.sql.exec("UPDATE players SET champion_level_r102=0 WHERE id='one'");assert.throws(()=>s.cmd(s.request()),/Şampiyon/);
 s.sql.exec("UPDATE players SET champion_level_r102=1,x=1200 WHERE id='one'");assert.throws(()=>s.cmd(s.request()),/Kraliyet Tezgâhı/);
 assert.throws(()=>s.cmd(s.request('royal_salvage_r118')),/onayla/);
 s.sql.exec("UPDATE players SET x=1740,combat_lock_until_ms=2000 WHERE id='one'");assert.throws(()=>s.cmd(s.request()),/Tezgâhı/);
 s.sql.exec("UPDATE players SET combat_lock_until_ms=0 WHERE id='one'; INSERT INTO player_trade_locks VALUES('one','active-trade')");assert.throws(()=>s.cmd(s.request()),/ticareti/);s.sql.exec('DELETE FROM player_trade_locks');
 for(const [column,value] of [['equipped',1],['sale_locked499',1],['expires_at_ms',100000]]){s.sql.prepare(`UPDATE player_items SET ${column}=? WHERE id='gear'`).run(value);assert.throws(()=>s.cmd(s.request()),/Kadim Zümrüt/);s.sql.prepare(`UPDATE player_items SET ${column}=0 WHERE id='gear'`).run();}
 s.sql.exec("UPDATE player_items SET player_id='other' WHERE id='gear'");assert.throws(()=>s.cmd(s.request()),/Kadim Zümrüt/);
 assert.equal(s.service.balance('one','emerald_dust'),24);
});
test('database prevents bypassed royal equip and removes royal gear when champion status is lost',t=>{
 const s=scene(t);s.put('crown',{rarity:'royal',kind:'helmet',equipped:1});
 assert.throws(()=>s.put('othergear',{rarity:'royal',player_id:'other',equipped:1}),/royal_champion_required/);
 assert.throws(()=>s.sql.exec("UPDATE player_items SET player_id='other' WHERE id='crown'"),/royal_champion_required/);
 s.sql.exec("UPDATE players SET champion_level_r102=0 WHERE id='one'");assert.equal(s.item('crown').equipped,0);
 assert.throws(()=>s.sql.exec("UPDATE player_items SET equipped=1 WHERE id='crown'"),/royal_champion_required/);
 assert.equal(s.item('crown').player_id,'one');
});
test('admin validation forbids hidden currencies, unknown fields, duplicate costs and zero-dust recipes; settings replay conflicts',t=>{
 const s=scene(t);assert.equal(validateRoyalConfigR118(ROYAL_DEFAULTS_R118).recipes.weapon.costs[0].amount,8);
 for(const costs of [[],[{itemId:'resource:core_coins',amount:1}],[{itemId:'material:emerald_dust',amount:0}],[{itemId:'material:emerald_dust',amount:1},{itemId:'material:emerald_dust',amount:2}],[{itemId:'resource:gems',amount:1}]]){const cfg=structuredClone(ROYAL_DEFAULTS_R118);cfg.recipes.weapon.costs=costs;assert.throws(()=>validateRoyalConfigR118(cfg));}
 const cfg=structuredClone(ROYAL_DEFAULTS_R118);cfg.recipes.weapon.costs[0].amount=17;s.tx(()=>s.service.saveConfig(cfg,1,'admin'));
 assert.equal(s.service.settings().config.recipes.weapon.costs[0].amount,17);assert.throws(()=>s.tx(()=>s.service.saveConfig(cfg,1,'admin')),/Ayarlar değişmiş/);assert.equal(s.sql.prepare('SELECT count(*) n FROM royal_admin_audit_r118').get().n,1);
});
test('mutations reject calls outside authoritative transaction and schema initialization is idempotent',t=>{
 const s=scene(t);s.put();assert.throws(()=>s.service.command('one',s.request()),/royal_writer_transaction_required/);
 s.tx(()=>s.service.saveConfig({...structuredClone(ROYAL_DEFAULTS_R118),enabled:false},1,'admin'));createRoyalSchemaR118(s.sql);
 assert.equal(s.service.settings().revision,2);assert.equal(s.service.settings().config.enabled,false);assert.equal(s.item().rarity,'emerald');
});
