import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary} from './helpers.mjs';
import {json} from './pvp-fixture.mjs';
import {captureModes} from './mode-fixture.mjs';
import {standaloneRevoke} from './native-guild-village-unit-fixture.mjs';
import {guildActionFixture,prepareGuildAction} from './native-guild-actions-unit-fixture.mjs';
import {membershipOracle} from './native-guild-membership-fixture.mjs';
import {createNativeGuildMembership} from '../generated/native-guild-membership.mjs';

for(const action of ['create','invite','accept','decline','permission','transfer','tax','withdraw'])test('owned guild '+action+' preserves native full rows, reply and private event without extra access repair',async t=>{
 const s=await guildActionFixture(t),{actor,body}=prepareGuildAction(s,action),clock=()=>s.nowMs,uuid=()=> 'abcdef01-2345-4678-890a-bcdef0123456',events=[],original=membershipOracle({clock,uuid,publish:(...args)=>events.push(args)});if(action==='withdraw')body.amount='10';s.adapter.membershipRules=createNativeGuildMembership({clock,uuid});let expected,rows;s.sql.exec('SAVEPOINT native_guild_action_oracle');
 try{expected=await original.action(s.db,actor,body);await original.changed(s.db,actor,body,expected);rows=captureModes(s.sql);}finally{s.sql.exec('ROLLBACK TO native_guild_action_oracle;RELEASE native_guild_action_oracle');}
 assert.equal(events.length,1);const result=await s.adapter.membership(s.core.guild,actor,body);assert.deepEqual(json(result),json(expected));assert.deepEqual(captureModes(s.sql),rows);assert.equal(s.sql.prepare("SELECT area FROM players WHERE id='guild-offline-expired'").get().area,'guild_hall_missing');
 const notices=s.sql.prepare('SELECT payload FROM kernel511_notifications ORDER BY ordinal').all().map(r=>JSON.parse(r.payload));assert.equal(notices.length,1);assert.equal(notices[0].cycle,events[0][0]);assert.deepEqual(notices[0].event,json(events[0][2]));assert.deepEqual(notices[0].actors,json([...new Set(events[0][1].map(p=>p.id))]));
});

test('owned guild treasury preserves original amount, request, authority, funds and character capacity rejection',async t=>{
 const s=await guildActionFixture(t),{body}=prepareGuildAction(s,'withdraw'),original=membershipOracle({clock:()=>s.nowMs,uuid:()=>crypto.randomUUID(),publish:()=>{}}),before=captureModes(s.sql);
 for(const [actor,input]of [[s.id,{...body,amount:0}],[s.id,{...body,amount:'not-a-number'}],[s.id,{...body,amount:101}],[s.id,{...body,amount:9000000000001}],[s.id,{...body,requestId:'short'}],[s.targetId,body]]){
  let error;s.sql.exec('SAVEPOINT native_guild_funds_reject');try{await original.action(s.db,actor,input);}catch(e){error=e;}finally{s.sql.exec('ROLLBACK TO native_guild_funds_reject;RELEASE native_guild_funds_reject');}assert(error,JSON.stringify({actor,input}));await assert.rejects(s.adapter.membership(s.core.guild,actor,input),e=>e.message===error.message);assert.deepEqual(captureModes(s.sql),before);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,0);
 }
 s.sql.prepare('UPDATE players SET essence=9000000000000 WHERE id=?').run(s.id);const capped=captureModes(s.sql);await assert.rejects(s.adapter.membership(s.core.guild,s.id,body),/Öz taşıma sınırına/);assert.deepEqual(captureModes(s.sql),capped);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,0);
});

test('native live and archived guild withdrawal receipts prevent a second payment while preserving each original accepted reply',async t=>{
 const s=await guildActionFixture(t),{body}=prepareGuildAction(s,'withdraw');body.amount=100;const original=membershipOracle({clock:()=>s.nowMs,uuid:()=>crypto.randomUUID(),publish:()=>{}}),initial=s.sql.prepare('SELECT essence FROM players WHERE id=?').get(s.id).essence;
 await s.adapter.membership(s.core.guild,s.id,body);assert.equal(s.sql.prepare('SELECT essence FROM players WHERE id=?').get(s.id).essence,initial+100);let before=captureModes(s.sql),expected=await original.action(s.db,s.id,body),actual=await s.adapter.membership(s.core.guild,s.id,body);assert.deepEqual(json(actual),json(expected));assert.match(actual.message,/tekrar ödeme yapılmadı/);assert.deepEqual(captureModes(s.sql),before);
 await s.adapter.membership(s.core.guild,s.id,{action:'disband',id:'mode-guild',name:'Core guild'});assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM guild_ledger').get().n,0);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM closed_guild_ledger').get().n,1);before=captureModes(s.sql);expected=await original.action(s.db,s.id,body);actual=await s.adapter.membership(s.core.guild,s.id,body);assert.deepEqual(json(actual),json(expected));assert.deepEqual(captureModes(s.sql),before);assert.equal(s.sql.prepare('SELECT essence FROM players WHERE id=?').get(s.id).essence,initial+100);
 const count=s.sql.prepare("SELECT COUNT(*) n FROM kernel511_notifications WHERE json_extract(payload,'$.event.type')='guild_changed'").get().n;assert.equal(count,4,'Native accepted replay still emits its original presentation refresh');
});

test('sole writer SIGKILL at both treasury COMMIT sides preserves debit, credit, native receipt and private refresh',{timeout:20000},async t=>{
 const s=await guildActionFixture(t),{body}=prepareGuildAction(s,'withdraw'),initial=s.sql.prepare('SELECT essence FROM players WHERE id=?').get(s.id).essence,dir=temporary(t),input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify({kind:'membership',id:s.id,body,nowMs:s.nowMs}));s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(s.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'native-guild-village-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_guild_membership':'durable_guild_membership_before_reply');
  const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const {core,adapter}=await standaloneRevoke(database,s.nowMs),sql=database.sqlite,read=()=>json({essence:sql.prepare('SELECT essence FROM players WHERE id=?').get(s.id).essence,treasury:sql.prepare("SELECT treasury FROM guilds WHERE id='mode-guild'").get().treasury,ledger:sql.prepare('SELECT * FROM guild_ledger ORDER BY id').all(),notices:sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n}),before=read();assert.equal(before.essence,initial+(phase==='before'?0:10));assert.equal(before.treasury,phase==='before'?100:90);assert.equal(before.ledger.length,phase==='before'?0:1);assert.equal(before.notices,phase==='before'?0:1);
   const reply=await adapter.membership(core.guild,s.id,body),after=read();assert.equal(after.essence,initial+10);assert.equal(after.treasury,90);assert.equal(after.ledger.length,1);assert.equal(after.notices,phase==='before'?1:2);assert.match(reply.message,phase==='before'?/güvenle karakterine/:/tekrar ödeme yapılmadı/);
  }finally{database.close();await database.walSync?.closing;}
 }
});
