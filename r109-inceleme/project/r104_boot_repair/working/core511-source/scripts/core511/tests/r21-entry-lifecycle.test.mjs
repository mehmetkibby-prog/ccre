import test from 'node:test';
import assert from 'node:assert/strict';
import {setupEntry} from './entry-fixture.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {createAdventureSchema} from '../adventure-schema.mjs';
import {until} from './helpers.mjs';
async function fixture(t,kind){
 const s=await setupEntry(t);createAdventureSchema(s.sql);
 const authority=new ChannelOwnership(s.f.database,{realmId:'r21-entry-lifecycle',now:s.clock});await authority.initialize();
 const peers=[1,4].map(channel=>({channel,incarnation:'r21-channel-'+channel}));for(const p of peers)await authority.registerProcess(p.channel,p.incarnation);
 const session=await s.auth.session(s.request());let run;
 await s.f.database.atomic(sql=>s.services.run({nowMs:s.clock(),seed:'a'.repeat(64)},()=>{
  const adventure=s.globals.__colAdventure;run=adventure.insertRun(kind,1,sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle,{},{});run.deadline_ms=s.clock()+600000;adventure.save(run);adventure.join(adventure.player(s.id),run);
  sql.prepare('UPDATE players SET last_seen=?,combat_lock_until_ms=0 WHERE id=?').run(Math.floor(s.clock()/1000)-60,s.id);
 }));
 const enter=channel=>authority.admit(s.id,peers.find(p=>p.channel===channel),{sessionId:s.tokenHash,guard:()=>true,prepare:sql=>s.entry.prepare(sql,{session,channel})});
 return {...s,authority,session,run,enter};
}
for(const kind of ['tower','mist'])test('unowned '+kind+' reconnect cannot silently move an active run to a different chosen channel',async t=>{
 const s=await fixture(t,kind),rejected=await s.enter(4);
 assert.equal(rejected.accepted,false);assert.equal(rejected.result.status,409);assert.equal(rejected.result.body.code,'entry_adventure_channel_locked');assert.equal(rejected.result.body.currentChannel,1);
 assert.equal(s.authority.admission(s.id),null);assert.equal(s.sql.prepare('SELECT channel FROM players WHERE id=?').get(s.id).channel,1);assert.equal(s.globals.__colAdventure.current(s.id).id,s.run.id);
 const owner=await s.enter(1);assert.equal(owner.channel,1);assert.equal(s.sql.prepare('SELECT area FROM players WHERE id=?').get(s.id).area,s.run.area);
 // Active-owner transfer takes the exact native preflight, with the existing
 // adventure guard before any channel switch or membership cleanup.
 const transfer=await s.f.database.atomic(sql=>s.entry.transferPreflight(sql,{session:s.session,channel:4}));assert.equal(transfer.accepted,false);assert.match(transfer.result.body.error,/önce seferden çık/);
});
for(const state of ['expired','cycle','dead'])test('entry settles '+state+' run before applying the explicit new channel',async t=>{
 const s=await fixture(t,'mist');
 if(state==='expired')s.sql.prepare('UPDATE adventure_runs SET deadline_ms=? WHERE id=?').run(s.clock()-1,s.run.id);
 if(state==='cycle')s.sql.prepare('UPDATE adventure_runs SET cycle=cycle-1 WHERE id=?').run(s.run.id);
 if(state==='dead')s.sql.prepare('UPDATE players SET hp=0 WHERE id=?').run(s.id);
 const owner=await s.enter(4);assert.equal(owner.channel,4);const p=s.sql.prepare('SELECT channel,area,hp FROM players WHERE id=?').get(s.id);assert.equal(p.channel,4);assert.equal(p.area,'bazaar');assert(p.hp>0);assert.equal(s.globals.__colAdventure.membership(s.id),undefined);
});
async function ordinaryEntry(t,{age=60,combatMs=0}={}){
 const s=await setupEntry(t);createAdventureSchema(s.sql);
 const authority=new ChannelOwnership(s.f.database,{realmId:'r21-ordinary-entry',now:s.clock});await authority.initialize();
 const peers=[1,2,3,4].map(channel=>({channel,incarnation:'r21-choice-'+channel}));for(const p of peers)await authority.registerProcess(p.channel,p.incarnation);
 s.sql.prepare('UPDATE players SET last_seen=?,combat_lock_until_ms=?,channel=1 WHERE id=?').run(Math.floor(s.clock()/1000)-age,s.clock()+combatMs,s.id);
 const session=await s.auth.session(s.request());
 const enter=channel=>authority.admit(s.id,peers.find(p=>p.channel===channel),{sessionId:s.tokenHash,guard:()=>true,prepare:sql=>s.entry.prepare(sql,{session,channel})});
 return {...s,authority,session,enter};
}
for(const channel of [1,2,3,4])test('fresh offline admission honors explicit channel '+channel+' despite stale combat lock',async t=>{
 const s=await ordinaryEntry(t,{combatMs:10000}),owner=await s.enter(channel);
 assert.equal(owner.channel,channel);assert.equal(s.sql.prepare('SELECT channel FROM players WHERE id=?').get(s.id).channel,channel);
});
test('recent reconnect cannot escape genuine combat by selecting another channel',async t=>{
 const s=await ordinaryEntry(t,{age:1,combatMs:10000}),result=await s.enter(4);
 assert.equal(result.accepted,false);assert.equal(result.result.body.code,'entry_reconnect_combat');assert.equal(s.authority.admission(s.id),null);
 const resumed=await s.enter(1);assert.equal(resumed.channel,1);
});
test('ordinary admission and starter grant acknowledge only after durable commit and never duplicate the grant',async t=>{
 const s=await ordinaryEntry(t);
 s.sql.prepare('UPDATE launch_settings SET registration_at=?,opens_at=? WHERE id=1').run((s.account.created_at-1)*1000,(s.account.created_at+1)*1000);
 const durable=s.f.database.durableAfterCommit.bind(s.f.database);let release,acknowledged=false;
 const hold=new Promise(r=>release=r);s.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>hold);t.after(()=>release());
 const pending=s.enter(4).then(owner=>{acknowledged=true;return owner;});await until(()=>!!s.authority.admission(s.id));
 assert.equal(acknowledged,false);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM prereg_rewards WHERE account_id=?').get(s.account.id).n,1);
 release();assert.equal((await pending).channel,4);s.f.database.durableAfterCommit=durable;
 assert.equal((await s.enter(4)).channel,4);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM prereg_rewards WHERE account_id=?').get(s.account.id).n,1);
});
