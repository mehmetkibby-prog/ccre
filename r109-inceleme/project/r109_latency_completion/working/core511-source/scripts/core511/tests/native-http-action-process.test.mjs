import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {OWNED_HTTP_ACTIONS} from '../native-http-action.mjs';
import {extraPlayer} from './process-fixture.mjs';
import {put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';

const row=s=>JSON.parse(JSON.stringify(s.f.sql.prepare('SELECT * FROM players WHERE id=?').get(s.f.id)));
const faults=s=>s.faults.map(f=>f.error?.stack).join('\n');

test('actual native HTTP potion purchase refreshes its owner and preserves native rejection and request guards',{timeout:35000},async t=>{
 const s=await httpActionFixture(t),before=row(s),response=await s.call({action:'buy_potion'});assert.equal(response.status,200,await response.text());const after=row(s),view=await s.view();assert.equal(after.potions,before.potions+1);assert.equal(view.potions,after.potions);assert.equal(view.essence,after.essence);assert(after.essence<before.essence);assert.equal(s.core.permanent.entries.size,0);
 await s.core.permanentPlayers([s.f.id],()=>s.f.sql.prepare('UPDATE players SET essence=0 WHERE id=?').run(s.f.id));const empty=row(s),denied=await s.call({action:'buy_potion'});assert.equal(denied.status,400);assert.match((await denied.json()).error,/İksir için/);assert.deepEqual(row(s),empty);assert.equal(s.core.permanent.entries.size,0);
 for(const [headers,status,code] of [[{Cookie:''},401,'authentication_required'],[{'X-CSRF-Token':''},403,'invalid_csrf'],[{Origin:'https://attacker.invalid'},403,'invalid_origin']]){const r=await s.call({action:'buy_potion'},headers);assert.equal(r.status,status);const b=await r.json();assert.equal(b.code,code);assert.deepEqual(row(s),empty);}
 const oversized=await s.call({action:'buy_potion',padding:'x'.repeat(5000)});assert.equal(oversized.status,413);assert.deepEqual(row(s),empty);assert.equal(s.faults.length,0,faults(s));
});

test('native HTTP economy waits for the already accepted potion and retains both durable outcomes',{timeout:35000},async t=>{
 const s=await httpActionFixture(t),{writer,core,f}=s;await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(f.id));
 const command=writer.command.bind(writer);let committed=false,release,answered=false;const gate=new Promise(r=>release=r);writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===f.id&&request.operation==='native_action'&&!committed){committed=true;await gate;}return ack;};
 try{s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>committed||s.faults.length,7000);assert(committed,faults(s));const before=row(s),pending=s.call({action:'buy_potion'}).finally(()=>answered=true);await until(()=>core.permanent.entries.get(f.id)?.phase==='freezing',5000);assert.equal(answered,false);assert.deepEqual(row(s),before);release();const response=await pending;assert.equal(response.status,200,await response.text());assert.equal(row(s).potions,2);assert.equal((await s.view()).potions,2);assert.equal(s.faults.length,0,faults(s));}finally{release();writer.command=command;}
});

test('every old hot HTTP action is fenced after native authorization and cannot mutate a second simulation',{timeout:35000},async t=>{
 const s=await httpActionFixture(t),before=row(s),monsters=JSON.stringify(s.f.sql.prepare('SELECT * FROM monsters ORDER BY id').all());
 for(const action of OWNED_HTTP_ACTIONS){const r=await s.call({action});assert.equal(r.status,428,action+': '+await r.text());assert.equal(r.headers.get('cache-control'),'no-store');}
 assert.deepEqual(row(s),before);assert.equal(JSON.stringify(s.f.sql.prepare('SELECT * FROM monsters ORDER BY id').all()),monsters);assert.equal(s.core.permanent.entries.size,0);assert.equal(s.faults.length,0,faults(s));
 const denied=await s.call({action:'attack'},{'X-CSRF-Token':''});assert.equal(denied.status,403);
 for(const [path,method,body]of [['/api/world','GET'],['/api/world?compact=1','GET'],['/api/world?owner=1','GET'],['/api/dungeon','GET'],['/api/dungeon','POST',{action:'stream'}],['/api/realtime/ticket','POST',{}]]){const r=await s.module.default(s.f.request({path,method,body}));assert.equal(r.status,428,path+': '+await r.text());}
 const market=await s.module.default(s.f.request({path:'/api/world?marketShop506=own',method:'GET'}));assert.equal(market.status,200,await market.text());assert.deepEqual(row(s),before);
});

test('native listing sale freezes server-selected buyer and foreign seller and replay never pays twice',{timeout:40000},async t=>{
 const s=await httpActionFixture(t),seller=extraPlayer(s,83),{f,core}=s;await s.host.database.atomic(()=>globalThis.__colLaunch.grant('shared-account-83',true));assert.equal((await seller.http()).status,200);seller.ticket=await seller.http('transfer',{channel:4});assert.equal(seller.ticket.status,200,JSON.stringify(seller.ticket));seller.live=await s.connect(seller.ticket);
 const listing='http-listing-'+randomUUID(),shop='http-shop-'+randomUUID(),requestId=randomUUID(),now=Math.floor(Date.now()/1000);
 await core.permanentPlayers([f.id,seller.id],()=>{f.sql.prepare('UPDATE players SET gems=1000 WHERE id IN (?,?)').run(f.id,seller.id);const buyer=f.sql.prepare('SELECT x,y,channel FROM players WHERE id=?').get(f.id);put(f.sql,'market_shops',{id:shop,owner_id:seller.id,owner_name:'Seller',name:'Shop',x:buyer.x,y:buyer.y,channel:buyer.channel,created_at:now,active:1});put(f.sql,'market_listings',{id:listing,shop_id:shop,seller_id:seller.id,kind:'essence',item_name:'Yaşam Özü',rarity:'white',power:0,amount:11,price_gems:20,created_at:now});});
 const a=f.sql.prepare('SELECT gems,essence FROM players WHERE id=?').get(f.id),b=f.sql.prepare('SELECT gems FROM players WHERE id=?').get(seller.id),body={action:'buy_listing',listingId:listing,requestId,sellerId:'untrusted-other'};
 const response=await s.call(body);assert.equal(response.status,200,await response.text());const result=await s.view(seller.id);assert.equal(f.sql.prepare('SELECT gems FROM players WHERE id=?').get(seller.id).gems,b.gems+20);assert.equal((await s.resources(seller.id)).gems,b.gems+20);assert.equal(result.suspended,false);assert.equal(row(s).gems,a.gems-20);assert.equal(row(s).essence,a.essence+11);assert.equal((await s.view()).essence,row(s).essence);
 const committed=JSON.stringify(f.sql.prepare('SELECT id,gems,essence FROM players WHERE id IN (?,?) ORDER BY id').all(f.id,seller.id));for(const repeat of [body,{...body,requestId:randomUUID()}]){const retry=await s.call(repeat);assert.equal(retry.status,200,await retry.text());assert.equal(JSON.stringify(f.sql.prepare('SELECT id,gems,essence FROM players WHERE id IN (?,?) ORDER BY id').all(f.id,seller.id)),committed);}
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM market_settlements WHERE listing_id=?').get(listing).n,1);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0,faults(s));
});

for(const phase of ['before','after'])test('actual native HTTP purchase with source SIGKILL '+phase+' COMMIT keeps the current outcome and retires the stale owner',{timeout:40000},async t=>{
 const s=await httpActionFixture(t),{host,f,core,supervisor,writer,ticket}=s,db=host.database,source=supervisor.rows.get(ticket.channel),others=[...supervisor.rows.values()].filter(r=>r!==source),world=s.world.row,before=row(s),execute=db.execute.bind(db),durable=db.durableAfterCommit.bind(db);let killed=false;
 db.execute=statement=>{const result=execute(statement);if(phase==='before'&&!killed&&statement.sql.startsWith('UPDATE players SET essence = essence - ?, potions = potions + 1')){killed=true;source.child.kill('SIGKILL');throw Error('native_http_purchase_before_commit');}return result;};
 db.durableAfterCommit=()=>{const pending=durable();if(phase==='after'&&!killed&&row(s).potions===before.potions+1){killed=true;return Promise.resolve(pending).then(()=>{source.child.kill('SIGKILL');throw Error('native_http_purchase_after_commit');});}return pending;};
 try{const response=await s.call({action:'buy_potion'});assert.notEqual(response.status,200,await response.text());}finally{db.execute=execute;db.durableAfterCommit=durable;}
 assert(killed);assert.equal(row(s).potions,before.potions+(phase==='after'?1:0));await until(()=>source.exited&&supervisor.rows.get(ticket.channel)!==source&&supervisor.rows.get(ticket.channel)?.state==='running'&&!core.permanent.entries.has(f.id),20000);assert.equal(source.child.signalCode,'SIGKILL');assert.equal(s.world.row,world);assert(others.every(r=>supervisor.rows.get(r.peer.channel)===r));assert.equal(row(s).potions,before.potions+(phase==='after'?1:0));const fresh=await s.http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));await s.connect(fresh);assert.equal((await s.view()).potions,row(s).potions);assert.equal(writer.authority.owner(f.id).incarnation,supervisor.rows.get(fresh.channel).peer.incarnation);
});
