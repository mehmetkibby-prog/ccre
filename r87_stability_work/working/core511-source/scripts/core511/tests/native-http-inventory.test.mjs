import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {native} from './helpers.mjs';
import {put} from './pvp-fixture.mjs';
const player=s=>s.f.sql.prepare('SELECT * FROM players WHERE id=?').get(s.f.id);
const payload=(action,extra={})=>({action,requestId:randomUUID(),requestAt:Date.now(),...extra});
const call=async(s,body,status=200)=>{const r=await s.call(body),value=await r.json();assert.equal(r.status,status,JSON.stringify(value));return value;};

test('actual native HTTP specialization, jewelry and candy retain guards, receipts, rollback and current resident resources',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s,{SPECIALIZATIONS456,JEWELRY456,JEWELRY_RECIPE456,PAKIZE456}=await native('lib/expansion456.mjs');
 assert.throws(()=>f.db.nativeOperation({name:'expansion456.act',playerId:f.id,accountId:f.account.id,input:{}}),{code:'native_http_inventory_scope'});
 await core.permanentPlayers([f.id],()=>f.sql.prepare("UPDATE players SET level=30,specialization='',skill_four=0,gems=100000,area='bazaar',x=?,y=? WHERE id=?").run(PAKIZE456.x,PAKIZE456.y,f.id));
 const branch=SPECIALIZATIONS456[player(s).role][0].id,choice=payload('choose_specialization456',{specialization:branch});await call(s,choice);assert.equal(player(s).specialization,branch);assert.equal((await s.resources(f.id)).specialization,branch);
 await call(s,payload('upgrade_specialization456'));const upgraded=player(s);assert.equal(upgraded.skill_four,1);assert(upgraded.gems<100000);assert.equal((await s.resources(f.id)).skill_four,1);
 const buy=payload('buy_specialization_reset463',{expectedPrice:5000});await call(s,buy);const bought=player(s);assert.equal(bought.gems,upgraded.gems-5000);assert.equal((await s.resources(f.id)).gems,bought.gems);assert.equal((await call(s,buy)).replayed,true);assert.equal(player(s).gems,bought.gems);
 await call(s,payload('use_specialization_reset463'));assert.equal(player(s).specialization,'');assert.equal(player(s).skill_four,1);assert.equal((await s.resources(f.id)).specialization,'');
 const craft=payload('craft_jewelry456',{kind:Object.keys(JEWELRY456)[0]}),before=player(s).gems;await call(s,craft,409);assert.equal(player(s).gems,before);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM expansion456_receipts WHERE player_id=? AND request_id=?').get(f.id,craft.requestId).n,0);
 await core.permanentPlayers([f.id],()=>{for(const[kind,amount]of Object.entries(JEWELRY_RECIPE456.materials))put(f.sql,'dungeon_materials',{player_id:f.id,kind,amount});put(f.sql,'dungeon_materials',{player_id:f.id,kind:'halloween_candy',amount:1});});
 const made=await call(s,craft);assert.equal(player(s).gems,before-JEWELRY_RECIPE456.gems);assert.equal((await s.resources(f.id)).gems,player(s).gems);assert.equal(f.sql.prepare('SELECT player_id FROM player_items WHERE id=?').get(made.itemId).player_id,f.id);assert.equal((await call(s,craft)).itemId,made.itemId);
 const candy=payload('use_halloween_candy456');await call(s,candy);const expiry=player(s).halloween_candy_until;assert(expiry>Date.now());assert.equal((await s.resources(f.id)).halloween_candy_until,expiry);await call(s,candy);await call(s,payload('use_halloween_candy456'),409);assert.equal(player(s).halloween_candy_until,expiry);
 await call(s,payload('exchange_wands456'),409);assert.equal(f.sql.isTransaction,false);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0);
});

test('actual native broken core answer and dismissal preserve scope, reward and replay while refreshing the current owner',{timeout:35000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s;
 const puzzle=async()=>{const id=randomUUID();await core.permanentPlayers([f.id],()=>{const p=player(s),revision=f.sql.prepare('SELECT revision FROM broken_core_settings464 WHERE id=1').get().revision;f.sql.prepare('DELETE FROM broken_core_state464 WHERE player_id=?').run(f.id);put(f.sql,'broken_core_state464',{player_id:f.id,puzzle_id:id,correct_slot:0,expires_at:Date.now()+60000,area:p.area,channel:p.channel,scope_version:p.realtime_scope_version,config_revision:revision,test:1,xp:0,essence:10});});return id;};
 const puzzleId=await puzzle(),before=player(s).essence,answer=payload('answer_broken_core464',{puzzleId,choiceId:'a'});
 await call(s,{...answer,choiceId:'invalid'},409);assert.equal(player(s).essence,before);
 const result=await call(s,answer);assert.equal(result.correct,true);assert.equal(player(s).essence,before+10);assert.equal((await s.view()).essence,before+10);assert.equal((await call(s,answer)).replayed,true);assert.equal(player(s).essence,before+10);await call(s,{...answer,choiceId:'b'},409);
 const dismissed=await call(s,payload('dismiss_broken_core464',{puzzleId:await puzzle()}));assert.equal(dismissed.correct,false);assert.equal(player(s).essence,before+10);assert.equal((await s.view()).essence,before+10);assert.equal(f.sql.isTransaction,false);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0);
});
