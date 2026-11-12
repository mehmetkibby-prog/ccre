import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary} from './helpers.mjs';
import {setupWorldJobs,jobCommand} from './world-jobs-fixture.mjs';
import {seedGuildWar,captureGuildDatabase,put,update,json} from './guild-war-fixture.mjs';
import {seedHeartbeatRewards,heartbeatDescriptor} from './heartbeat-maintenance-fixture.mjs';
import {bindHeartbeatCrash} from './heartbeat-crash-fixture.mjs';
import {NotificationOutbox} from '../notification-outbox.mjs';
import {createRetaliationRules} from '../generated/retaliation-rules.mjs';
import {readAttackFrame} from '../attack-writer.mjs';
import {readHeartbeatState,heartbeatRestFrame} from '../heartbeat-writer.mjs';

for(const scenario of ['death','rewards','guild'])test('actual heartbeat '+scenario+' SIGKILL at both COMMIT boundaries keeps economy, receipts and notifications together',{timeout:25000},async t=>{
 const f=await setupWorldJobs(t),{sql,nowMs}=f;for(const channel of [1,2,3,4])await f.authority.registerProcess(channel,'heartbeat-crash-'+channel);
 f.reset({area:scenario==='death'?'rune_v2':'forest',actor:{hp:scenario==='death'?1:500,max_hp:1000,gems:103,last_regen_at:nowMs-4000,last_movement_at_ms:nowMs-20000,last_monster_hit_at:0}});
 const actorPeer={realm:f.peer.realm,channel:1,incarnation:'heartbeat-crash-1'},owner=await f.authority.admit(f.id,actorPeer,{sessionId:'heartbeat-crash-session',guard:()=>true});
 await new NotificationOutbox(f.f.database,{resolveRecipients:()=>[f.id]}).initialize();let request,peer;
 if(scenario==='death'){
  const mid='rune-v2-tide-c1-1';sql.prepare('DELETE FROM monsters WHERE id=?').run(mid);put(sql,'monsters',{id:mid,name:'Heartbeat death fixture',area:'rune_v2',channel:1,x:1000,y:1000,hp:1000,max_hp:1000,spawn_round:700,variant:'normal'});
  const nativeRules=createRetaliationRules({globals:f.services.globals,now:()=>nowMs,fourChannels:true});f.db.batch(nativeRules.preparePveEngagement(f.db,sql.prepare('SELECT * FROM players WHERE id=?').get(f.id),sql.prepare('SELECT * FROM monsters WHERE id=?').get(mid),nowMs-5000));
  const raw=sql.prepare('SELECT * FROM players WHERE id=?').get(f.id);request={playerId:f.id,epoch:owner.epoch,sequence:1,operationId:'heartbeat-death-once',operation:'heartbeat',payload:{nowMs,seed:'b'.repeat(64),expected:{player:readAttackFrame(sql,f.id,'',f.services.globals).player,rest:heartbeatRestFrame(raw),settings:f.settings,state:readHeartbeatState(sql,f.id)},resources:['player:'+f.id,'monster:'+mid]}};peer=actorPeer;
 }else{
  if(scenario==='rewards')seedHeartbeatRewards(f);else{seedGuildWar(f,{home:4,delta:300000});update(sql,'players',f.targetId,{last_seen:1});}
  request=jobCommand(f,'heartbeat');request.payload.fence='isolated-heartbeat';request.payload.heartbeatJob={...heartbeatDescriptor(f),epoch:owner.epoch};peer=f.peer;
 }
 const data={peer,request,settings:f.settings},dir=temporary(t),input=path.join(dir,'input.json'),before=captureGuildDatabase(sql);fs.writeFileSync(input,JSON.stringify(data));sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(f.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'heartbeat-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null,stderr);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_heartbeat':'durable_heartbeat_before_ack');
  const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const {writer,authority}=bindHeartbeatCrash(db,data),receipt=scenario==='death'?'kernel511_channel_receipts':'kernel511_system_receipts',amount=phase==='after'?1:0;
   assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM '+receipt).get().n,amount);if(phase==='before'){assert.deepEqual(captureGuildDatabase(db.sqlite),before);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,0);}
   const inspect=()=>{if(scenario==='death')assert.deepEqual({...db.sqlite.prepare('SELECT hp,gems FROM players WHERE id=?').get(f.id)},{hp:0,gems:98});else if(scenario==='rewards'){assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM boss_reward_claims').get().n,1);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM sinsi_reward_claims').get().n,4);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM normal_reward_claims').get().n,6);}else{assert.equal(db.sqlite.prepare("SELECT wars_won FROM guilds WHERE id='war-guild-1'").get().wars_won,1);assert.equal(authority.owner(f.id).channel,4);assert.equal(authority.owner(f.id).epoch,owner.epoch+1);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,1);}};
   if(phase==='after')inspect();const ack=await writer.command(peer,request),after=captureGuildDatabase(db.sqlite);inspect();assert.deepEqual(json(await writer.command(peer,request)),json(ack));assert.deepEqual(captureGuildDatabase(db.sqlite),after);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM '+receipt).get().n,1);
  }finally{db.close();}
 }
});
