import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {BASE,hash,native,temporary} from './helpers.mjs';
import {setupWorldJobs,jobCommand} from './world-jobs-fixture.mjs';
import {ensureGuildWarReturns,finishGuildWars,guildWarDue} from '../guild-war.mjs';
import {seedGuildWar,captureGuildDatabase,put,update,json} from './guild-war-fixture.mjs';
import {GUILD_WAR_TIMEOUT_SQL,GUILD_WAR_NATIVE_FINISH_SQL} from '../generated/guild-war-rules.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {createWorldTransitionHandler} from '../world-jobs.mjs';
const proof=JSON.parse(fs.readFileSync(new URL('../generated/guild-war-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.source),'utf8');
test('guild-war timeout and return trigger retain exact native source proof',()=>{
 assert.equal(hash(source),proof.sourceSha256);for(const row of [proof.timeout,proof.finish])assert.equal(hash(source.slice(row.start,row.end)),row.sha256);assert.equal(hash(fs.readFileSync(new URL('../generated/guild-war-rules.mjs',import.meta.url))),proof.generatedSha256);
 assert.equal(GUILD_WAR_NATIVE_FINISH_SQL,source.slice(proof.finish.start,proof.finish.end));
});
test('guild timeout matches every native database row for waiting/countdown/active, score ties, boundaries and offline players',async t=>{
 const f=await setupWorldJobs(t);ensureGuildWarReturns(f.sql);f.sql.function('unixepoch',{varargs:true},()=>Math.floor(f.nowMs/1000));f.sql.function('strftime',{varargs:true},format=>{assert.equal(format,'%s');return String(Math.floor(f.nowMs/1000));});
 let serial=0;for(const status of ['waiting','countdown','active'])for(const scores of [[4,2],[1,5],[3,3]])for(const delta of [-1,0,1])for(const offline of [false,true]){
  f.sql.exec('DELETE FROM guild_war_locks;DELETE FROM guild_war_returns;');const id=seedGuildWar(f,{id:'guild-native-clock-'+(++serial),status,delta,a:scores[0],b:scores[1],offline});
  f.sql.exec('SAVEPOINT guild_oracle');f.sql.exec(GUILD_WAR_NATIVE_FINISH_SQL);f.sql.prepare(GUILD_WAR_TIMEOUT_SQL).run(f.nowMs,f.nowMs,f.nowMs);const expected=captureGuildDatabase(f.sql);f.sql.exec('ROLLBACK TO guild_oracle;RELEASE guild_oracle');
  assert.equal(guildWarDue(f.sql,f.nowMs),delta<=0);const request=jobCommand(f,'guild_timeout'),ack=await f.writer.command(f.peer,request);assert.deepEqual(captureGuildDatabase(f.sql),expected,JSON.stringify({status,scores,delta,offline}));assert.equal(ack.result.guild.finished,delta<=0?1:0);assert.deepEqual(json(await f.writer.command(f.peer,request)),json(ack));assert.equal(f.sql.prepare('SELECT status FROM arena_matches WHERE id=?').get(id).status,delta>0?status:status==='waiting'?'cancelled':'finished');
 }
 const invalid=jobCommand(f,'guild_timeout');invalid.payload.fence='not-frozen';await assert.rejects(f.writer.command(f.peer,invalid),/world_transition_not_frozen/);
});
test('guild return uses the fourth public channel when the first three have 25 live players',async t=>{
 const f=await setupWorldJobs(t);ensureGuildWarReturns(f.sql);f.sql.exec('UPDATE players SET last_seen=1');seedGuildWar(f,{home:1});for(const id of [f.id,f.targetId])update(f.sql,'players',id,{channel:4});
 for(const channel of [1,2,3])for(let n=0;n<25;n++)put(f.sql,'players',{id:'occupied-'+channel+'-'+n,name:'occupied '+channel+' '+n,role:'avci',area:'bazaar',channel,x:1200,y:920,last_seen:Math.floor(f.nowMs/1000),created_at:1});
 await f.writer.command(f.peer,jobCommand(f,'guild_timeout'));for(const id of [f.id,f.targetId]){const p=f.sql.prepare('SELECT * FROM players WHERE id=?').get(id);assert.equal(p.channel,4);assert.equal(p.area,'bazaar');assert.equal(p.last_seen,Math.floor(f.nowMs/1000));}
});
test('reconnect admissions retain their 25 slots and returning ownership changes atomically with the native match',async t=>{
 const f=await setupWorldJobs(t);ensureGuildWarReturns(f.sql);f.sql.exec('UPDATE players SET last_seen=1');const peers=[1,2,3,4].map(channel=>({channel,incarnation:'guild-owner-'+channel}));for(const peer of peers)await f.authority.registerProcess(peer.channel,peer.incarnation);
 seedGuildWar(f,{home:4,channel:2});for(let n=0;n<25;n++){const id='grace-player-'+n;put(f.sql,'players',{id,name:'grace player '+n,role:'avci',area:'bazaar',channel:4,x:1200,y:920,last_seen:Math.floor(f.nowMs/1000)-35,created_at:1});await f.authority.admit(id,peers[3],{sessionId:'session-'+n,guard:()=>true});}
 const owner=await f.authority.admit(f.id,peers[1],{sessionId:'moving-session',guard:()=>true});const before=captureGuildDatabase(f.sql);
 await assert.rejects(f.f.database.atomic(sql=>{finishGuildWars(sql,f.nowMs,{authority:f.authority});throw Error('rollback-return');}),/rollback-return/);assert.deepEqual(captureGuildDatabase(f.sql),before);assert.equal(f.authority.owner(f.id).epoch,owner.epoch);
 const result=await f.f.database.atomic(sql=>finishGuildWars(sql,f.nowMs,{authority:f.authority})),after=f.authority.owner(f.id);assert.equal(after.channel,1);assert.equal(after.epoch,owner.epoch+1);assert.equal(after.sequence,0);assert.equal(f.authority.admission(f.id).channel,1);assert.equal(f.authority.admission(f.id).epoch,after.epoch);assert.equal(result.moves.length,1);assert.equal(f.authority.counts().get(4),25);assert.equal(f.sql.prepare('SELECT wars_won FROM guilds WHERE id=?').get('war-guild-1').wars_won,1);
 assert.throws(()=>f.authority.assertAdmitted(f.sql,peers[1],f.id,owner.epoch),/owner_epoch_fenced/);
});
test('actual writer SIGKILL at both guild return COMMIT boundaries preserves native score, HP and owner/admission together',{timeout:20000},async t=>{
 const f=await setupWorldJobs(t);ensureGuildWarReturns(f.sql);for(const channel of [1,2,3,4])await f.authority.registerProcess(channel,'guild-crash-'+channel);seedGuildWar(f,{home:4});const old=await f.authority.admit(f.id,{channel:1,incarnation:'guild-crash-1'},{sessionId:'guild-crash-session',guard:()=>true});
 const request=jobCommand(f,'guild_timeout');request.payload.fence='isolated-guild-writer';request.payload.owners=JSON.stringify(f.sql.prepare('SELECT player_id,channel,epoch,incarnation,sequence FROM kernel511_channel_owners ORDER BY player_id').all());
 const dir=temporary(t),input=path.join(dir,'input.json'),before=captureGuildDatabase(f.sql);fs.writeFileSync(input,JSON.stringify({peer:f.peer,request}));f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(f.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'guild-war-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',bytes=>stderr+=bytes);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null,stderr);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_guild_return':'durable_guild_return_before_ack');
  const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const authority=new ChannelOwnership(db,{realmId:f.peer.realm}),writer=new SystemWriter(db,{realmId:f.peer.realm,authority}),services=new NativeGameServices(db.sqlite,{clock:()=>f.nowMs});writer.add('world_transition',createWorldTransitionHandler({services,authority,clock:()=>f.nowMs,assertFrozen:(sql,payload)=>payload.fence==='isolated-guild-writer'&&payload.owners===JSON.stringify(sql.prepare('SELECT player_id,channel,epoch,incarnation,sequence FROM kernel511_channel_owners ORDER BY player_id').all())}));
   const player=db.sqlite.prepare('SELECT * FROM players WHERE id=?').get(f.id),owner=authority.owner(f.id),admission=authority.admission(f.id);assert.equal(db.sqlite.prepare("SELECT wars_won FROM guilds WHERE id='war-guild-1'").get().wars_won,phase==='before'?0:1);assert.equal(owner.epoch,old.epoch+(phase==='after'?1:0));assert.equal(owner.channel,phase==='before'?1:4);assert.equal(admission.channel,owner.channel);assert.equal(admission.epoch,owner.epoch);assert.equal(player.channel,owner.channel);assert.equal(player.hp,phase==='before'?1:4321);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,phase==='before'?0:1);if(phase==='before')assert.deepEqual(captureGuildDatabase(db.sqlite),before);
   const ack=await writer.command(f.peer,request),after=captureGuildDatabase(db.sqlite);assert.deepEqual(json(await writer.command(f.peer,request)),json(ack));assert.deepEqual(captureGuildDatabase(db.sqlite),after);assert.equal(authority.owner(f.id).epoch,old.epoch+1);assert.equal(db.sqlite.prepare("SELECT wars_won FROM guilds WHERE id='war-guild-1'").get().wars_won,1);
  }finally{db.close();}
 }
});
