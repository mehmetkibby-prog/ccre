import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {extraPlayer} from './process-fixture.mjs';
import {put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';

async function pair(t){
 const s=await httpActionFixture(t),b=extraPlayer(s,96),observer=extraPlayer(s,97),{core,f}=s;
 for(const p of [b,observer]){await s.host.database.atomic(()=>globalThis.__colLaunch.grant(p===b?'shared-account-96':'shared-account-97',true));assert.equal((await p.http()).status,200);p.ticket=await p.http('transfer',{channel:p===b?s.ticket.channel:4});assert.equal(p.ticket.status,200);p.live=await s.connect(p.ticket);}
 const item=randomUUID();await core.permanentPlayers([f.id,b.id],()=>{f.sql.prepare("UPDATE players SET gems=1000,potions=2,hp=100,area='bazaar',x=1790,y=1110,last_seen=? WHERE id IN (?,?)").run(Math.floor(Date.now()/1000),f.id,b.id);put(f.sql,'player_items',{id:item,player_id:f.id,kind:'weapon',item_name:'Isolated trade item',rarity:'common',power:1,role:'warrior',enchantments:'[]',equipped:0,created_at:Math.floor(Date.now()/1000)});});
 const call=(id,body,headers={})=>s.module.default(new Request(f.origin+'/api/trade',{method:'POST',headers:{...Object.fromEntries(core.sessions.get(id).request.headers),...headers},body:JSON.stringify(body)}));
 let trade;const act=async(id,action,extra={})=>{const body={action,requestId:randomUUID(),...(trade?{id:trade.id,revision:trade.revision}:{}),...extra},response=await call(id,body),value=await response.json();assert.equal(response.status,200,JSON.stringify(value));trade=value.trade;return body;};
 await act(f.id,'invite',{target:b.id});await act(b.id,'accept');await act(f.id,'offer',{offer:{gems:40,items:[item],materials:[{key:'potions',amount:1}]}});await act(b.id,'offer',{offer:{gems:20,items:[],materials:[]}});
 await act(f.id,'ready');await act(b.id,'ready');await act(f.id,'confirm');const final={action:'confirm',id:trade.id,revision:trade.revision,requestId:randomUUID(),target:observer.id};
 const row=()=>f.sql.prepare('SELECT * FROM player_trades WHERE id=?').get(trade.id),balances=()=>f.sql.prepare('SELECT id,gems,potions FROM players WHERE id IN (?,?) ORDER BY id').all(f.id,b.id);
 return {...s,b,observer,item,call,act,final,row,balances};
}

test('native trade drains the stored pair, transfers once and isolates notices; forged actor/revision/CSRF cannot spend',{timeout:50000},async t=>{
 const s=await pair(t),{f,b,core}=s;
 assert.equal((await s.call(b.id,s.final,{'X-CSRF-Token':'bad'})).status,403);assert.equal((await s.call(s.observer.id,s.final)).status,409);assert.equal((await s.call(b.id,{...s.final,revision:s.final.revision-1})).status,409);
 await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=1 WHERE id=?').run(f.id));
 const command=s.writer.command.bind(s.writer);let held=false,release,answered=false;const gate=new Promise(r=>release=r);s.writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===f.id&&request.operation==='native_action'&&!held){held=true;await gate;}return ack;};
 try{s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>held,7000);const pending=s.call(b.id,s.final).finally(()=>answered=true);await until(()=>core.permanent.entries.get(f.id)?.phase==='freezing',5000);assert.equal(answered,false);assert.equal(s.row().status,'open');release();const r=await pending;assert.equal(r.status,200,await r.text());}finally{release();s.writer.command=command;}
 assert.equal(s.row().status,'completed');assert.equal((await s.resources(f.id)).gems,980);assert.equal((await s.resources(b.id)).gems,1020);assert.equal((await s.view()).potions,0);assert.equal((await s.view(b.id)).potions,3);assert.equal(f.sql.prepare('SELECT player_id FROM player_items WHERE id=?').get(s.item).player_id,b.id);
 const notice=p=>p.type==='event'&&p.payload?.event?.type==='trade_changed'&&p.payload.event.eventId.startsWith('trade:'+s.final.id+':');await until(()=>s.live.packets.some(notice)&&b.live.packets.some(notice),5000);assert(!s.observer.live.packets.some(notice));
 const saved=s.balances();assert.equal((await s.call(b.id,s.final)).status,200);assert.equal((await s.call(b.id,{...s.final,requestId:randomUUID()})).status,409);assert.equal((await s.call(b.id,{...s.final,target:f.id})).status,409);assert.deepEqual(s.balances(),saved);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM player_trade_receipts WHERE player_id=? AND request_id=?').get(b.id,s.final.requestId).n,1);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0,s.faults.map(x=>x.error?.stack).join('\n'));
});

for(const phase of ['before','after'])test('native trade source SIGKILL '+phase+' COMMIT preserves both balances, item identity and one receipt',{timeout:50000},async t=>{
 const s=await pair(t),{f,b,core,host,supervisor}=s,source=supervisor.rows.get(s.ticket.channel),others=[s.world.row,...supervisor.rows.values()].filter(r=>r!==source),before=s.balances(),exec=f.sql.exec.bind(f.sql),durable=host.database.durableAfterCommit.bind(host.database);let killed=false;
 f.sql.exec=text=>{if(phase==='before'&&!killed&&text==='COMMIT'&&s.row().status==='completed'){killed=true;source.child.kill('SIGKILL');throw Error('trade_before_commit');}return exec(text);};
 host.database.durableAfterCommit=()=>{const result=durable();if(phase==='after'&&!killed&&s.row().status==='completed'){killed=true;return Promise.resolve(result).then(()=>{source.child.kill('SIGKILL');throw Error('trade_after_commit');});}return result;};
 try{assert.notEqual((await s.call(b.id,s.final)).status,200);}finally{f.sql.exec=exec;host.database.durableAfterCommit=durable;}
 assert(killed);assert.equal(s.row().status,phase==='after'?'completed':'open');if(phase==='before')assert.deepEqual(s.balances(),before);
 await until(()=>source.exited&&supervisor.rows.get(s.ticket.channel)!==source&&supervisor.rows.get(s.ticket.channel)?.state==='running'&&!core.permanent.entries.size,20000);assert(others.every(r=>!r.exited));
 for(const [id,http]of [[f.id,s.http],[b.id,b.http]]){const ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));await s.connect(ticket);}
 assert.equal((await s.call(b.id,s.final)).status,200);assert.equal((await s.call(b.id,s.final)).status,200);assert.equal((await s.resources(f.id)).gems,980);assert.equal((await s.resources(b.id)).gems,1020);assert.equal(f.sql.prepare('SELECT player_id FROM player_items WHERE id=?').get(s.item).player_id,b.id);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM player_trade_receipts WHERE player_id=? AND request_id=?').get(b.id,s.final.requestId).n,1);
});

test('actual native storage and guild donation retain owned current resources, replay and authorization',{timeout:40000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s,call=(path,body,headers={})=>s.module.default(f.request({path,body,headers}));
 await core.permanentPlayers([f.id],()=>f.sql.prepare("UPDATE players SET area='bazaar',x=1790,y=1110 WHERE id=?").run(f.id));
 const deposit={action:'storage_deposit',itemId:'counter:potions',amount:1,requestId:randomUUID()};assert.equal((await call('/api/storage',deposit,{'X-CSRF-Token':'bad'})).status,403);
 for(let i=0;i<2;i++){const r=await call('/api/storage',deposit);assert.equal(r.status,200,await r.text());}assert.equal((await s.view()).potions,1);
 const slot=f.sql.prepare("SELECT * FROM player_storage_items WHERE player_id=? AND kind='potions'").get(f.id);assert.equal(slot.amount,1);const withdraw={action:'storage_withdraw',itemId:slot.id,amount:1,requestId:randomUUID()};assert.equal((await call('/api/storage',withdraw)).status,200);assert.equal((await call('/api/storage',withdraw)).status,200);assert.equal((await s.view()).potions,2);assert.equal((await call('/api/storage',{...deposit,amount:3,requestId:randomUUID()})).status,409);
 const gid='http-final-guild511';await core.permanentPlayers([f.id],()=>{f.sql.prepare('INSERT INTO guilds(id,name,name_key,leader_id,created_at) VALUES(?,?,?,?,1)').run(gid,'Final Guild','final guild',f.id);f.sql.prepare('INSERT INTO guild_members(player_id,guild_id,joined_at) VALUES(?,?,1) ON CONFLICT(player_id) DO UPDATE SET guild_id=excluded.guild_id').run(f.id,gid);f.sql.prepare('INSERT INTO guild_castles(guild_id,district,slot,purchased_by,purchased_at) VALUES(?,1,1,?,1)').run(gid,f.id);f.sql.prepare("UPDATE players SET area=?,x=790,y=650,essence=100 WHERE id=?").run('guild_hall_'+gid,f.id);});
 await core.nativeConfiguration.run([],()=>globalThis.__colGuildVillage.save(true,globalThis.__colGuildVillage.settings().revision));const donation={action:'donate',amount:7,requestId:randomUUID()};for(let i=0;i<2;i++){const r=await call('/api/guild-skill',donation);assert.equal(r.status,200,await r.text());}assert.equal((await s.view()).essence,93);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM guild_skill_receipts WHERE request_id=?').get(donation.requestId).n,1);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0,s.faults.map(x=>x.error?.stack).join('\n'));
});
