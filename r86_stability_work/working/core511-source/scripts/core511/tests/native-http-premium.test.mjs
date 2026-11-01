import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {extraPlayer} from './process-fixture.mjs';
import {put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';

test('actual native premium market drains the foreign seller, refreshes both owners and retains one-payment replay',{timeout:40000},async t=>{
 const s=await httpActionFixture(t),seller=extraPlayer(s,84),{f,core}=s;await s.host.database.atomic(()=>globalThis.__colLaunch.grant('shared-account-84',true));assert.equal((await seller.http()).status,200);seller.ticket=await seller.http('transfer',{channel:4});assert.equal(seller.ticket.status,200,JSON.stringify(seller.ticket));seller.live=await s.connect(seller.ticket);
 const listing=randomUUID(),body={action:'market_buy',listingId:listing,requestId:randomUUID(),sellerId:'untrusted-other'};
 await core.permanentPlayers([f.id,seller.id],()=>{f.sql.prepare("UPDATE players SET gems=1000,area='bazaar',item_link_orbs=0 WHERE id IN (?,?)").run(f.id,seller.id);f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(seller.id);put(f.sql,'premium_listings',{id:listing,seller_id:seller.id,product:'item_link',payload:JSON.stringify({amount:3}),price:20,created_at:Date.now()});});
 const call=body=>s.module.default(f.request({path:'/api/premium',body})),command=s.writer.command.bind(s.writer);let committed=false,release,answered=false;const gate=new Promise(r=>release=r);s.writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===seller.id&&request.operation==='native_action'&&!committed){committed=true;await gate;}return ack;};
 try{seller.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>committed,7000);const pending=call(body).finally(()=>answered=true);await until(()=>core.permanent.entries.get(seller.id)?.phase==='freezing',5000);assert.equal(answered,false);assert.equal(f.sql.prepare('SELECT gems FROM players WHERE id=?').get(seller.id).gems,1000);release();const r=await pending;assert.equal(r.status,200,await r.text());}finally{release();s.writer.command=command;}
 assert.equal((await s.view(seller.id)).potions,1);
 assert.equal(f.sql.prepare('SELECT gems FROM players WHERE id=?').get(seller.id).gems,1020);assert.equal((await s.resources(seller.id)).gems,1020);assert.equal((await s.resources(f.id)).gems,980);assert.equal((await s.resources(f.id)).item_link_orbs,3);
 const saved=f.sql.prepare('SELECT id,gems,item_link_orbs FROM players WHERE id IN (?,?) ORDER BY id').all(f.id,seller.id);assert.equal((await call(body)).status,200);assert.equal((await call({...body,requestId:randomUUID()})).status,409);assert.deepEqual(f.sql.prepare('SELECT id,gems,item_link_orbs FROM players WHERE id IN (?,?) ORDER BY id').all(f.id,seller.id),saved);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM premium_receipts WHERE id=?').get(body.requestId).n,1);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0);
});
