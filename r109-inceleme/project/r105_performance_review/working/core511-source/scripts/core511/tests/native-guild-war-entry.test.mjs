import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {guildActionFixture} from './native-guild-actions-unit-fixture.mjs';
import {membershipOracle} from './native-guild-membership-fixture.mjs';
import {createNativeGuildMembership} from '../generated/native-guild-membership.mjs';
import {captureModes} from './mode-fixture.mjs';
import {put,update,json} from './pvp-fixture.mjs';
import {standaloneRevoke} from './native-guild-village-unit-fixture.mjs';
import {native,temporary} from './helpers.mjs';

export async function fixture(t){
 const s=await guildActionFixture(t),sql=s.sql,template=sql.prepare('SELECT * FROM players WHERE id=?').get(s.targetId),players=[s.id,s.targetId,'war-a3','war-b1','war-b2','war-b3'],now=Math.floor(s.nowMs/1000);
 for(const id of players.slice(2))put(sql,'players',{...template,id,name:id,account_id:null,last_seen:now,level:65,gems:1000000,is_gm:0});
 put(sql,'guilds',{id:'war-guild-b',name:'War guild B',name_key:'war guild b',leader_id:players[3],created_at:now});
 for(const [i,id]of players.entries()){update(sql,'players',id,{area:'bazaar',arena_match_id:'',channel:i===3?3:i%4+1,hp:template.max_hp,combat_lock_until_ms:0,last_seen:now});sql.prepare('DELETE FROM pve_engagements WHERE player_id=?').run(id);sql.prepare('INSERT INTO guild_members(player_id,guild_id,joined_at) VALUES(?,?,?) ON CONFLICT(player_id) DO UPDATE SET guild_id=excluded.guild_id').run(id,i<3?'mode-guild':'war-guild-b',now);}
 sql.function('unixepoch',{varargs:true},()=>now);
 return {...s,players};
}
const uuidSequence=(base=0)=>{let n=base;return ()=>'11111111-2222-4333-8444-'+String(++n).padStart(12,'0');};
async function compare(s,actor,body){
 const clock=()=>s.nowMs,events=[],base=(s.uuidBase=(s.uuidBase??0)+100),native=membershipOracle({clock,uuid:uuidSequence(base),publish:(...a)=>events.push(a)});s.adapter.membershipRules=createNativeGuildMembership({clock,uuid:uuidSequence(base)});let expected,rows;
 s.sql.exec('SAVEPOINT guild_war_native');try{expected=await native.action(s.db,actor,body);await native.changed(s.db,actor,body,expected);rows=captureModes(s.sql);}finally{s.sql.exec('ROLLBACK TO guild_war_native;RELEASE guild_war_native');}
 const before=s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,actual=await s.adapter.membership(s.core.guild,actor,body);assert.deepEqual(json(actual),json(expected));assert.deepEqual(captureModes(s.sql),rows);
 const notices=s.sql.prepare('SELECT payload FROM kernel511_notifications ORDER BY ordinal').all().slice(before).map(r=>JSON.parse(r.payload));assert.equal(notices.length,1);assert.deepEqual(notices[0].event,json(events[0][2]));assert.deepEqual(notices[0].actors,json([...new Set(events[0][1].map(p=>p.id))]));return actual;
}
async function pending(s){await compare(s,s.players[0],{action:'challenge',target:'war-guild-b'});return s.sql.prepare("SELECT id FROM guild_wars WHERE defender='war-guild-b'").get().id;}
async function waiting(s){const id=await pending(s);await compare(s,s.players[3],{action:'war_accept',id});for(const actor of [s.players[1],s.players[2],s.players[4]])await compare(s,actor,{action:'war_join',id});return id;}

test('all native guild war entry cases, kickoff, join replay and private recipients preserve complete native rows',async t=>{
 const s=await fixture(t),id=await waiting(s),reply=await compare(s,s.players[5],{action:'war_join',id});assert.equal(reply.started,true);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM guild_war_returns WHERE war_id=?').get(id).n,6);assert(s.players.every(actor=>s.sql.prepare('SELECT channel FROM players WHERE id=?').get(actor).channel===3));
 const replay=await compare(s,s.players[5],{action:'war_join',id});assert.equal(replay.started,false);assert.match(replay.message,/Zaten/);
});

test('native guild war decline and repeated decline preserve original rejection and no partial notice',async t=>{
 const s=await fixture(t),id=await pending(s);await compare(s,s.players[3],{action:'war_decline',id});const before=captureModes(s.sql),count=s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n;
 await assert.rejects(s.adapter.membership(s.core.guild,s.players[3],{action:'war_decline',id}),/İşlem uygulanamadı/);assert.deepEqual(captureModes(s.sql),before);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,count);
});

test('native guild readiness and authority rejections preserve full rows and original errors',async t=>{
 const s=await fixture(t),id=await pending(s),clock=()=>s.nowMs,original=membershipOracle({clock,uuid:uuidSequence(),publish:()=>{}});
 for(const [actor,body,change]of [[s.players[0],{action:'war_accept',id},null],[s.players[3],{action:'war_accept',id},['hp',0]],[s.players[3],{action:'war_accept',id},['last_seen',0]],[s.players[3],{action:'war_accept',id},['combat_lock_until_ms',s.nowMs+1000]],[s.players[5],{action:'war_join',id},null]]){
  const saved=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.players[4]);if(change)update(s.sql,'players',s.players[4],{[change[0]]:change[1]});const before=captureModes(s.sql);let rejected;
  s.sql.exec('SAVEPOINT guild_war_rejected');try{await original.action(s.db,actor,body);}catch(error){rejected=error;}finally{s.sql.exec('ROLLBACK TO guild_war_rejected;RELEASE guild_war_rejected');}assert(rejected);await assert.rejects(s.adapter.membership(s.core.guild,actor,body),error=>error.message===rejected.message);assert.deepEqual(captureModes(s.sql),before);if(change)update(s.sql,'players',s.players[4],{[change[0]]:saved[change[0]]});
 }
});

test('native guild kickoff waits at 26 occupancy, starts at 25, and denies a new foreign join at 25 including channel four',async t=>{
 const s=await fixture(t),sql=s.sql,template=sql.prepare('SELECT * FROM players WHERE id=?').get(s.players[5]),now=Math.floor(s.nowMs/1000);
 put(sql,'players',{...template,id:'late-member',name:'late-member',account_id:null,area:'bazaar',arena_match_id:'',channel:2,last_seen:now});put(sql,'guild_members',{player_id:'late-member',guild_id:'war-guild-b',joined_at:now});const id=await waiting(s);
 // Keep the original SQL occupancy/team/time guards; only the authorized
 // four-channel capacity provider differs from the pinned three-channel file.
 sql.prepare('UPDATE arena_matches SET channel=4 WHERE id=?').run(id);
 for(let i=0;i<20;i++)put(sql,'players',{...template,id:'occupied-'+i,name:'occupied-'+i,account_id:null,channel:4,last_seen:now});
 let reply=await compare(s,s.players[5],{action:'war_join',id});assert.equal(reply.started,false);assert.equal(sql.prepare('SELECT status FROM arena_matches WHERE id=?').get(id).status,'waiting');
 sql.prepare("UPDATE players SET last_seen=0 WHERE id='occupied-19'").run();reply=await compare(s,s.players[5],{action:'war_join',id});assert.equal(reply.started,true);assert(s.players.every(actor=>sql.prepare('SELECT channel FROM players WHERE id=?').get(actor).channel===4));
 const before=captureModes(sql);
 await assert.rejects(s.adapter.membership(s.core.guild,'late-member',{action:'war_join',id}),/Katılamadın/);assert.deepEqual(captureModes(sql),before);
 sql.prepare("UPDATE players SET last_seen=0 WHERE id='occupied-18'").run();reply=await compare(s,'late-member',{action:'war_join',id});assert.equal(reply.started,false);assert.match(reply.message,/katıldın/);assert.equal(sql.prepare("SELECT channel FROM players WHERE id='late-member'").get().channel,4);
});

async function admitPlayers(s){
 const authority=s.writer.authority;
 for(const channel of [1,2,3,4])await authority.registerProcess(channel,'guild-war-entry-owner-'+channel);
 for(const id of s.players){const {channel}=s.sql.prepare('SELECT channel FROM players WHERE id=?').get(id);await authority.admit(id,{channel,incarnation:'guild-war-entry-owner-'+channel},{sessionId:'war-session-'+id,guard:()=>true});}
 return authority;
}

test('guild kickoff counts disconnected admission grace even when native SQL liveness excludes those players',async t=>{
 const s=await fixture(t),id=await waiting(s),authority=await admitPlayers(s),template=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.players[5]);
 for(let n=0;n<20;n++){const actor='war-grace-'+n;put(s.sql,'players',{...template,id:actor,name:actor,account_id:null,channel:3,last_seen:Math.floor(s.nowMs/1000)-35});await authority.admit(actor,{channel:3,incarnation:'guild-war-entry-owner-3'},{sessionId:'grace-session-'+n,guard:()=>true});}
 const before=captureModes(s.sql),owners=s.players.map(p=>authority.owner(p)),count=s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n;
 await assert.rejects(s.adapter.membership(s.core.guild,s.players[5],{action:'war_join',id}),{code:'guild_return_capacity'});assert.deepEqual(captureModes(s.sql),before);assert.deepEqual(s.players.map(p=>authority.owner(p)),owners);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,count);
});

test('sole writer SIGKILL on both guild kickoff COMMIT sides atomically preserves all six moves, epochs and native notice',{timeout:20000},async t=>{
 const s=await fixture(t),id=await waiting(s),authority=await admitPlayers(s),old=s.players.map(p=>authority.owner(p)),count=s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,body={action:'war_join',id},actor=s.players[5],dir=temporary(t),input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify({kind:'membership',id:actor,body,nowMs:s.nowMs}));s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(s.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'native-guild-village-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_guild_membership':'durable_guild_membership_before_reply');
  const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const {core,adapter}=await standaloneRevoke(database,s.nowMs),sql=database.sqlite,verify=(committed,notices)=>{
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM guild_war_returns WHERE war_id=?').get(id).n,committed?6:0);assert.equal(sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,notices);
    for(const [i,p]of s.players.entries()){const owner=core.authority.owner(p),row=sql.prepare('SELECT channel,area FROM players WHERE id=?').get(p),admission=core.authority.admission(p);assert.equal(owner.channel,committed?3:old[i].channel);assert.equal(owner.epoch,old[i].epoch+(committed&&old[i].channel!==3?1:0));assert.equal(row.channel,owner.channel);assert.equal(row.area,committed?'arena':'bazaar');assert.equal(admission.channel,owner.channel);assert.equal(admission.epoch,owner.epoch);}
   };
   verify(phase==='after',count+(phase==='after'?1:0));const reply=await adapter.membership(core.guild,actor,body);assert.equal(reply.started,phase==='before');verify(true,count+(phase==='before'?1:2));
  }finally{database.close();await database.walSync?.closing;}
 }
});
