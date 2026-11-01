import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {extraPlayer} from './process-fixture.mjs';
import {put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';

async function seed(s){const itemId=randomUUID(),requestId=randomUUID();await s.core.permanentPlayers([s.f.id],()=>{s.f.sql.prepare('UPDATE players SET item_link_orbs=2,hp=1 WHERE id=?').run(s.f.id);put(s.f.sql,'player_items',{id:itemId,player_id:s.f.id,kind:'weapon',item_name:'Isolated item link',rarity:'common',power:1,role:'warrior',enchantments:'[]',equipped:0,created_at:Math.floor(Date.now()/1000)});});return {requestId,itemId,body:'Isolated item message',scope:'regional'};}
const call=(s,body,headers={})=>s.module.default(s.f.request({path:'/api/chat',body,headers}));
const receipt=(s,id)=>s.f.sql.prepare('SELECT * FROM item_link_receipts WHERE request_id=?').get(id);
const orbs=s=>s.f.sql.prepare('SELECT item_link_orbs FROM players WHERE id=?').get(s.f.id).item_link_orbs;

test('native item-link chat drains accepted work, spends once and delivers private messages only to current intended players',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),recipient=extraPlayer(s,91),observer=extraPlayer(s,92),{core,f}=s;
 for(const other of [recipient,observer]){await s.host.database.atomic(()=>globalThis.__colLaunch.grant(other===recipient?'shared-account-91':'shared-account-92',true));assert.equal((await other.http()).status,200);other.ticket=await other.http('transfer',{channel:4});assert.equal(other.ticket.status,200);other.live=await s.connect(other.ticket);}
 const input={...await seed(s),recipientId:recipient.id};assert.equal((await call(s,input,{'X-CSRF-Token':'bad'})).status,403);assert.equal(orbs(s),2);
 const command=s.writer.command.bind(s.writer);let accepted=false,answered=false,release;const gate=new Promise(r=>release=r);s.writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===f.id&&request.operation==='native_action'&&!accepted){accepted=true;await gate;}return ack;};let body;
 try{s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>accepted,7000);const pending=call(s,input).finally(()=>answered=true);await until(()=>core.permanent.entries.get(f.id)?.phase==='freezing',5000);assert.equal(answered,false);assert.equal(orbs(s),2);assert.equal(receipt(s,input.requestId),undefined);release();const r=await pending;assert.equal(r.status,200);body=await r.json();}finally{release();s.writer.command=command;}
 assert.equal(orbs(s),1);assert.equal((await s.resources(f.id)).item_link_orbs,1);assert.equal((await s.view()).potions,1);assert.equal(body.message.recipient_id,recipient.id);const notice=p=>p.type==='event'&&p.payload?.event?.type==='direct_message'&&p.payload.event.message.id===body.message.id;
 await until(()=>recipient.live.packets.some(notice)&&s.live.packets.some(notice),5000);assert(!observer.live.packets.some(notice));const saved=receipt(s,input.requestId),replay=await call(s,input);assert.equal(replay.status,200);assert.equal((await replay.json()).message.id,body.message.id);assert.deepEqual(receipt(s,input.requestId),saved);assert.equal(orbs(s),1);
 assert.equal((await call(s,{...input,recipientId:observer.id})).status,409);assert.equal(orbs(s),1);assert.equal((await call(s,{...input,requestId:randomUUID(),itemId:randomUUID()})).status,409);assert.equal(orbs(s),1);
 await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET item_link_orbs=0 WHERE id=?').run(f.id));assert.equal((await call(s,{...input,requestId:randomUUID()})).status,409);assert.equal(orbs(s),0);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

for(const phase of ['before','after'])test('native item-link source SIGKILL '+phase+' COMMIT preserves one debit and immutable receipt',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),input=await seed(s),{host,supervisor,ticket,core,f}=s,source=supervisor.rows.get(ticket.channel),others=[s.world.row,...supervisor.rows.values()].filter(r=>r!==source),sql=f.sql,exec=sql.exec.bind(sql),durable=host.database.durableAfterCommit.bind(host.database);let killed=false;
 sql.exec=text=>{if(phase==='before'&&!killed&&text==='COMMIT'&&receipt(s,input.requestId)){killed=true;source.child.kill('SIGKILL');throw Error('item_link_before_commit');}return exec(text);};
 host.database.durableAfterCommit=()=>{const result=durable();if(phase==='after'&&!killed&&receipt(s,input.requestId)){killed=true;return Promise.resolve(result).then(()=>{source.child.kill('SIGKILL');throw Error('item_link_after_commit');});}return result;};
 try{assert.notEqual((await call(s,input)).status,200);}finally{sql.exec=exec;host.database.durableAfterCommit=durable;}
 assert(killed);assert.equal(Boolean(receipt(s,input.requestId)),phase==='after');assert.equal(orbs(s),phase==='after'?1:2);await until(()=>source.exited&&supervisor.rows.get(ticket.channel)!==source&&supervisor.rows.get(ticket.channel)?.state==='running'&&!core.permanent.entries.has(f.id),20000);assert(others.every(r=>!r.exited));const fresh=await s.http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));await s.connect(fresh);assert.equal((await call(s,input)).status,200);assert.equal((await call(s,input)).status,200);assert.equal(orbs(s),1);assert.equal((await s.resources(f.id)).item_link_orbs,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM item_link_receipts WHERE request_id=?').get(input.requestId).n,1);
});
