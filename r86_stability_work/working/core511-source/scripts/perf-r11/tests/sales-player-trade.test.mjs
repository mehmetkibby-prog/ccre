import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {tradeCommerce} from './commerce-fixture.mjs';
for(const mode of ['0','1']){
 test(`pipeline ${mode}: native player trade FULL COMMIT/reopen and replay preserve currency, item identity and premium provenance`,{timeout:20000},async()=>{const f=await tradeCommerce(mode);let reopened;try{
  await f.open();await f.offer('real-1');await f.offer('real-2',{gems:30});await f.ready();const tr=f.service.snapshot('real-2').trade,input={requestId:randomUUID(),action:'confirm',id:tr.id,revision:tr.revision};let committed=false;const exec=f.tradeDb.exec.bind(f.tradeDb);f.tradeDb.exec=sql=>{const r=exec(sql);if(sql==='COMMIT')committed=true;return r;};
  const result=await f.permanent(['real-1','real-2'],()=>f.service.act('real-2',input));assert.equal(committed,true);assert.equal(result.trade.status,'completed');const after=f.economic();assert.deepEqual(after.players.map(p=>p.gems),[120,80,100]);assert.equal(after.items.find(i=>i.id==='trade-item-real-1').player_id,'real-2');assert.equal(after.items.find(i=>i.id==='trade-item-real-1').premium_origin,1);
  assert.deepEqual(await f.permanent(['real-1','real-2'],()=>f.service.act('real-2',input)),result);assert.deepEqual(f.economic(),after);await assert.rejects(f.permanent(['real-1','real-2'],()=>f.service.act('real-2',{...input,action:'cancel'})),/İşlem kimliği yeniden/);assert.deepEqual(f.economic(),after);
  reopened=new DatabaseSync(f.h.file,{readOnly:true});assert.deepEqual(reopened.prepare("SELECT gems FROM players WHERE id IN ('real-1','real-2') ORDER BY id").all().map(r=>r.gems),[120,80]);assert.equal(reopened.prepare('SELECT COUNT(*) n FROM player_trade_receipts WHERE request_id=?').get(input.requestId).n,1);assert.equal(reopened.prepare('SELECT COUNT(*) n FROM player_trade_locks').get().n,0);assert.equal(f.ch.permanentWait.size,0);assert.equal(f.h.fatals.length,0);
 }finally{reopened?.close();await f.close();}});
 test(`pipeline ${mode}: native player trade failing final COMMIT rolls back both wallets, items and receipt`,{timeout:20000},async()=>{const f=await tradeCommerce(mode);try{
  await f.open();await f.offer('real-1');await f.offer('real-2',{gems:30});await f.ready();const tr=f.service.snapshot('real-2').trade,input={requestId:randomUUID(),action:'confirm',id:tr.id,revision:tr.revision},before=f.economic(),exec=f.tradeDb.exec.bind(f.tradeDb);let inject=true;f.tradeDb.exec=sql=>{if(sql==='COMMIT'&&inject){inject=false;throw Error('fixture_trade_commit_failure');}return exec(sql);};
  await assert.rejects(f.permanent(['real-1','real-2'],()=>f.service.act('real-2',input)),/fixture_trade_commit_failure/);assert.deepEqual(f.economic(),before);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM player_trade_receipts WHERE request_id=?').get(input.requestId).n,0);assert.equal(f.db.prepare('SELECT status FROM player_trades WHERE id=?').get(tr.id).status,'open');assert.equal(f.ch.permanentWait.size,0);
  const result=await f.permanent(['real-1','real-2'],()=>f.service.act('real-2',input));assert.equal(result.trade.status,'completed');assert.deepEqual(f.economic().players.map(p=>p.gems),[120,80,100]);
 }finally{await f.close();}});
 test(`pipeline ${mode}: changed item ownership and outsider confirmation cannot transfer either player's assets`,{timeout:20000},async()=>{const f=await tradeCommerce(mode);try{
  await f.open();await f.offer('real-1');await f.offer('real-2');await f.ready();const tr=f.service.snapshot('real-2').trade;await assert.rejects(f.permanent(['real-3'],()=>f.service.act('real-3',{requestId:randomUUID(),action:'confirm',id:tr.id,revision:tr.revision})),/Ticaret bulunamadı/);
  f.db.prepare("UPDATE player_items SET player_id='real-3' WHERE id='trade-item-real-1'").run();const before=f.economic();await assert.rejects(f.act('real-2','confirm'),/Eşya artık çantanda/);assert.deepEqual(f.economic(),before);assert.equal(f.db.prepare('SELECT status FROM player_trades WHERE id=?').get(tr.id).status,'open');assert.equal(f.ch.permanentWait.size,0);
 }finally{await f.close();}});
 test(`pipeline ${mode}: draining participant fences trade and resumes already-held peer without mutation`,{timeout:20000},async()=>{const f=await tradeCommerce(mode);try{
  await f.open();await f.offer('real-1');await f.offer('real-2');await f.ready();const before=f.economic();f.ch.drainingPlayers.add('real-2');await assert.rejects(f.act('real-2','confirm'),/owner_draining/);assert.deepEqual(f.economic(),before);assert.equal(f.ch.permanentWait.size,0);assert.equal(f.ch.drainingPlayers.has('real-1'),false);f.ch.drainingPlayers.delete('real-2');assert.equal(f.h.fatals.length,1,'supervisor receives the rejected participant freeze');
 }finally{f.ch.drainingPlayers.delete('real-2');await f.close();}});
}
