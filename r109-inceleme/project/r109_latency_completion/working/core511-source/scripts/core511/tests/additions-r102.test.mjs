import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {BASE,SHA} from './helpers.mjs';
import {ContentServiceR102} from '../content-service-r102.mjs';
import {createContentSchemaR102} from '../content-config-r102.mjs';
import {PlayerTradeR102} from '../player-trade-r102.mjs';
import {createWorldPlayerProjector} from '../world-player-projection-r102.mjs';
import {put} from './pvp-fixture.mjs';
process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {fixture}=await import('../../perf-r11/tests/reward/fixture.mjs');
async function scene(t){
 const f=await fixture();t.after(()=>f.close());const sql=f.database.sqlite;createContentSchemaR102(sql);
 const first=sql.prepare("SELECT * FROM players WHERE id='real-1'").get(),account=sql.prepare('SELECT * FROM accounts WHERE id=?').get(first.account_id);
 put(sql,'accounts',{...account,id:'account-real-2',username:'real-two',username_normalized:'real-two',email:'real-two@fixture.invalid',email_normalized:'real-two@fixture.invalid'});
 put(sql,'players',{...first,id:'real-2',account_id:'account-real-2',name:'Second Fixture'});
 const session=sql.prepare('SELECT * FROM auth_sessions WHERE account_id=?').get(first.account_id);
 put(sql,'auth_sessions',{...session,account_id:'account-real-2',token_hash:'token-real-2',csrf_hash:'csrf-real-2'});
 for(const id of ['real-1','real-2']){const p=sql.prepare('SELECT account_id FROM players WHERE id=?').get(id);put(sql,'game_presence',{account_id:p.account_id,token_hash:'token-'+id,instance_id:'fixture-'+id,expires_at_ms:Date.now()+3600000});}
 let now=Date.parse('2026-11-10T20:59:00Z');const content=new ContentServiceR102(sql,{now:()=>now});
 const tx=fn=>f.database.atomic(fn),cmd=(id,action,requestId=randomUUID())=>tx(()=>content.command(id,{action,requestId}));
 sql.exec("UPDATE players SET core_coins=3000,loadlab_run_id='' WHERE id LIKE 'real-%'");
 return {sql,content,tx,cmd,now:()=>now,setNow:n=>now=n};
}
test('three purchases per account/day, replay, reconnect, other account and Istanbul midnight',async t=>{
 const s=await scene(t),{sql,cmd,content}=s;
 const req=randomUUID();await cmd('real-1','auto_buy_r102',req);await cmd('real-1','auto_buy_r102',req);
 await cmd('real-1','auto_buy_r102');await cmd('real-1','auto_buy_r102');
 assert.equal(content.purchaseStatus(content.player('real-1')).purchasesRemaining,0);
 assert.equal(new ContentServiceR102(sql,{now:s.now}).purchaseStatus(content.player('real-1')).purchasedToday,3);
 const before=sql.prepare("SELECT id,core_coins FROM players WHERE id IN ('real-1','real-1') ORDER BY id").all();
 await assert.rejects(cmd('real-1','auto_buy_r102'),/Günlük 3/);assert.deepEqual(sql.prepare("SELECT id,core_coins FROM players WHERE id IN ('real-1','real-1') ORDER BY id").all(),before);
 assert.equal(content.balance('real-1','auto_attack_ticket_r102'),3);await cmd('real-2','auto_buy_r102');assert.equal(content.purchaseStatus(content.player('real-2')).purchasedToday,1);
 await cmd('real-1','auto_ticket_r102');assert.equal(content.autoStatus(content.player('real-1')).paidMs,10800000);
 s.setNow(Date.parse('2026-11-10T21:00:00Z'));assert.equal(content.purchaseStatus(content.player('real-1')).purchasesRemaining,3);
 assert.equal(content.autoStatus(content.player('real-1')).paidMs,10800000);await cmd('real-1','auto_buy_r102');
 assert.equal(content.purchaseStatus(content.player('real-1')).purchasedToday,1);
});
test('failed purchase rolls back the ticket, CP and quota together; old successful receipts count',async t=>{
 const s=await scene(t),{sql,cmd,content}=s;
 sql.exec("CREATE TEMP TRIGGER fail_purchase_test BEFORE INSERT ON content_receipts_r102 BEGIN SELECT RAISE(ABORT,'purchase commit rejected'); END");
 await assert.rejects(cmd('real-1','auto_buy_r102'),/purchase commit rejected/);
 assert.equal(content.player('real-1').core_coins,3000);assert.equal(content.balance('real-1','auto_attack_ticket_r102'),0);assert.equal(content.purchaseStatus(content.player('real-1')).purchasedToday,0);
 sql.exec('DROP TRIGGER fail_purchase_test');
 for(let i=0;i<3;i++)sql.prepare('INSERT INTO content_receipts_r102 VALUES(?,?,?,?,?,?)').run('real-1','historical-'+i,'auto_buy_r102','historical','{}',s.now()-1000);
 await assert.rejects(cmd('real-1','auto_buy_r102'),/Günlük 3/);
});
test('Azrail chest native two-party trade is replay safe and refuses changed stock and unknown material',async t=>{
 const s=await scene(t),{sql}=s,tr=new PlayerTradeR102(sql,s.now);
 // Use the exact native presence records from the fixture with its real clock.
 s.setNow(Date.now());sql.prepare("UPDATE players SET hp=100,area='bazaar',channel=1,x=1000,y=700,last_seen=?,combat_lock_until_ms=0,arena_match_id='' WHERE id IN ('real-1','real-2')").run(Math.floor(s.now()/1000));
 sql.prepare('UPDATE auth_sessions SET expires_at=?').run(Math.floor(s.now()/1000)+3600);sql.prepare('UPDATE game_presence SET expires_at_ms=?').run(s.now()+3600000);
 sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?)').run('real-1','tower_azrail_chest',3);
 let trade;const act=(id,action,extra={})=>{const r=tr.act(id,{action,requestId:randomUUID(),...(trade?{id:trade.id,revision:trade.revision}:{}),...extra});trade=r.trade;return r;};
 act('real-1','invite',{target:'real-2'});act('real-2','accept');
 assert.throws(()=>act('real-1','offer',{offer:{gems:0,items:[],materials:[{key:'dungeon:unapproved_chest',amount:1}]}}),/Malzemen/);
 act('real-1','offer',{offer:{gems:0,items:[],materials:[{key:'dungeon:tower_azrail_chest',amount:2}]}});
 act('real-1','ready');act('real-2','ready');act('real-1','confirm');
 const final={action:'confirm',id:trade.id,revision:trade.revision,requestId:randomUUID()};
 sql.prepare('UPDATE dungeon_materials SET amount=1 WHERE player_id=? AND kind=?').run('real-1','tower_azrail_chest');
 assert.throws(()=>tr.act('real-2',final),/Malzemen/);assert.equal(s.content.balance('real-2','tower_azrail_chest'),0);
 sql.prepare('UPDATE dungeon_materials SET amount=3 WHERE player_id=? AND kind=?').run('real-1','tower_azrail_chest');
 assert.equal(tr.act('real-2',final).trade.status,'completed');assert.equal(tr.act('real-2',final).trade.status,'completed');
 assert.equal(s.content.balance('real-1','tower_azrail_chest'),1);assert.equal(s.content.balance('real-2','tower_azrail_chest'),2);
});
test('infinite emerald FX follows forged item identity through equip and trade, never plain emerald or a renamed item',async t=>{
 const s=await scene(t),{sql}=s,project=createWorldPlayerProjector((q,args)=>sql.prepare(q).all(...args));
 for(const [id,kind] of [['green-weapon','weapon'],['green-armor','armor']])put(sql,'player_items',{id,player_id:'real-1',kind,role:'avci',item_name:'Sonsuz Kadim Zümrüt',rarity:'emerald',power:120,enchantments:'[]',equipped:1,created_at:1});
 const flags=(id,viewer='real-1')=>project([{id}],viewer,s.now())[0].rank;
 assert.equal(flags('real-1').emeraldInfiniteArmor,false);assert.equal(flags('real-1').emeraldInfiniteWeapon,false);
 for(const id of ['green-weapon','green-armor'])sql.prepare('INSERT INTO content_forge_r102 VALUES(?,?,?,?)').run(id,'real-1','{}',s.now());
 assert.equal(flags('real-1','observer').emeraldInfiniteArmor,true);assert.equal(flags('real-1','observer').emeraldInfiniteWeapon,true);
 sql.exec("UPDATE player_items SET equipped=0 WHERE id='green-armor'");assert.equal(flags('real-1').emeraldInfiniteArmor,false);
 sql.exec("UPDATE player_items SET player_id='real-2' WHERE id='green-weapon'");assert.equal(flags('real-1').emeraldInfiniteWeapon,false);assert.equal(flags('real-2','observer').emeraldInfiniteWeapon,true);
});
