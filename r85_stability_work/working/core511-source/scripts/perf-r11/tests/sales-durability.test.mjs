import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {fixture} from './reward/fixture.mjs';
const root=process.env.COL_NATIVE_TEST_ROOT, manifest=JSON.parse(await readFile(join(root,'realm-package-manifest.json'))), name='dist-vds/server/channel-runtime/index.mjs', bytes=await readFile(join(root,name)), row=manifest.files.find(r=>r.path===name);
assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);assert.equal(bytes.length,row.bytes);
const source=bytes.toString(),AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
function exactSlice(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);assert.equal(source.indexOf(start,a+1),-1,'ambiguous shipped handler');return source.slice(a,b);}
const safeIdCode=exactSlice('function safeId(value) {','function errorResponse(error) {');
const handlerCodes={sell_rarity:exactSlice('if (payload.action === "sell_rarity") {','if (payload.action === "sell_item") {'),sell_item:exactSlice('if (payload.action === "sell_item") {',"if(['answer_broken_core464','dismiss_broken_core464'].includes(payload.action))")};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const turn=()=>new Promise(setImmediate);
const settings={item_sale_white:5,item_sale_blue:17,item_sale_orange:41,item_sale_red:97};
async function make(mode){const previous=process.env.CORE_CHANNEL_WRITER_PIPELINE;process.env.CORE_CHANNEL_WRITER_PIPELINE=mode;let h;try{h=await fixture();}finally{if(previous===undefined)delete process.env.CORE_CHANNEL_WRITER_PIPELINE;else process.env.CORE_CHANNEL_WRITER_PIPELINE=previous;}
 const db=h.database.sqlite,ch=h.channels.get(1),actor='real-1';db.prepare('UPDATE players SET level=65,xp=6400 WHERE id=?').run(actor);
 const item=(id,overrides={})=>{const r={id,player_id:actor,kind:'weapon',item_name:'Sale fixture',rarity:'blue',power:1,role:'avci',enchantments:'[]',equipped:0,created_at:Math.floor(Date.now()/1000),...overrides};db.prepare('INSERT INTO player_items('+Object.keys(r).join(',')+') VALUES('+Object.keys(r).map(()=>'?').join(',')+')').run(...Object.values(r));};
 const act=payload=>ch.runPlayer(actor,async()=>{const player=db.prepare('SELECT * FROM players WHERE id=?').get(actor);const handler=new AsyncFunction('payload','database','playerId','player','settings','auth','enforceRateLimit','Response','crypto','now',safeIdCode+'\n'+handlerCodes[payload.action]);return handler(payload,ch,actor,player,settings,{account:{id:h.accountIds.get(actor)}},async()=>{},Response,{randomUUID},Math.floor(Date.now()/1000));});
 const state=()=>({wallet:{...db.prepare('SELECT gems,essence,xp FROM players WHERE id=?').get(actor)},items:db.prepare('SELECT id,player_id,rarity,equipped FROM player_items ORDER BY id').all().map(r=>({...r})),sales:db.prepare('SELECT id,item_id,price_gems,applied_at_ms FROM market_settlements ORDER BY id').all().map(r=>({...r}))});
 return{h,db,ch,item,act,state};}
for(const mode of ['0','1']){
 test(`pipeline ${mode}: exact shipped single-item sale waits for WAL fsync and receipt/action retries never pay twice`,{timeout:15000},async()=>{const f=await make(mode),gate=deferred(),release=deferred(),flush=f.h.database.walSync.flush.bind(f.h.database.walSync);let reopened;try{
  f.item('sale-item-0001');f.h.database.walSync.flush=async()=>{gate.resolve();await release.promise;return flush();};let acknowledged=false;
  const payload={action:'sell_item',itemId:'sale-item-0001',requestId:'sale-request-0001'},pending=f.act(payload).then(r=>{acknowledged=true;return r;});await gate.promise;await turn();assert.equal(acknowledged,false,'sale response cannot precede durable WAL');release.resolve();const response=await pending;assert.equal(response.status,200);assert.equal((await response.json()).gems,27);f.h.database.walSync.flush=flush;
  const request=f.h.requests.at(-1).request;assert.equal((await f.h.writer.write(f.h.peers.get(1),request)).writerBatch.replayed,true);const saved=f.state();assert.equal(saved.items.length,0);assert.equal(saved.sales.length,1);assert.ok(saved.sales[0].applied_at_ms>0);
  assert.equal((await f.act(payload)).status,200);assert.deepEqual(f.state(),saved);await assert.rejects(f.h.writer.write(f.h.peers.get(1),{...request,actor:'bot-1'}),{code:'writer_sequence_reused'});assert.deepEqual(f.state(),saved);
  reopened=new DatabaseSync(f.h.file,{readOnly:true});assert.equal(reopened.prepare("SELECT gems FROM players WHERE id='real-1'").get().gems,27);assert.equal(reopened.prepare("SELECT COUNT(*) n FROM player_items WHERE id='sale-item-0001'").get().n,0);assert.equal(reopened.prepare("SELECT COUNT(*) n FROM market_settlements WHERE applied_at_ms>0").get().n,1);
 }finally{release.resolve();f.h.database.walSync.flush=flush;reopened?.close();await f.h.close();}});
 test(`pipeline ${mode}: exact bulk sale and duplicate receipt preserve protected items and exact currency`,{timeout:15000},async()=>{const f=await make(mode);try{
  f.item('bulk-item-0001');f.item('bulk-item-0002');f.item('bulk-protected-0001',{equipped:1});f.item('bulk-protected-0002',{rarity:'unique'});f.item('bulk-protected-0003',{kind:'earring'});
  const payload={action:'sell_rarity',rarity:'blue',requestId:'bulk-request-0001'},response=await f.act(payload),body=await response.json();assert.equal(response.status,200);assert.deepEqual(body.soldItemIds.sort(),['bulk-item-0001','bulk-item-0002']);assert.equal(body.earned,34);assert.equal(body.gems,44);const saved=f.state();assert.equal(saved.items.length,3);assert.equal(saved.sales.length,2);
  const request=f.h.requests.at(-1).request;assert.equal((await f.h.writer.write(f.h.peers.get(1),request)).writerBatch.replayed,true);assert.equal((await f.act(payload)).status,200);assert.deepEqual(f.state(),saved);
 }finally{await f.h.close();}});
 test(`pipeline ${mode}: foreign, equipped, unique and forbidden-kind single sales cannot debit inventory or credit currency`,{timeout:15000},async()=>{const f=await make(mode);try{
  f.item('guarded-item-0001',{player_id:'bot-1'});f.item('guarded-item-0002',{equipped:1});f.item('guarded-item-0003',{rarity:'unique'});f.item('guarded-item-0004',{kind:'rune_attack'});const before=f.state();for(let i=1;i<=4;i++)assert.equal((await f.act({action:'sell_item',itemId:'guarded-item-000'+i,requestId:'guarded-request-000'+i})).status,400);assert.deepEqual(f.state(),before);
 }finally{await f.h.close();}});
 test(`pipeline ${mode}: sale credit failure rolls back item deletion and settlement atomically`,{timeout:15000},async()=>{const f=await make(mode);try{
  f.item('rollback-item-0001');f.db.exec("CREATE TRIGGER reject_sale_credit BEFORE UPDATE OF gems ON players WHEN NEW.gems>OLD.gems BEGIN SELECT RAISE(ABORT,'fixture_sale_credit_failure'); END");const before=f.state();await assert.rejects(f.act({action:'sell_item',itemId:'rollback-item-0001',requestId:'rollback-request-0001'}),/fixture_sale_credit_failure/);assert.deepEqual(f.state(),before);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM channel_write_receipts').get().n,0);
 }finally{await f.h.close();}});
}
