import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setupPvp,json} from './pvp-fixture.mjs';
import {temporary,native} from './helpers.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {readAttackFrame} from '../attack-writer.mjs';

for(const phase of ['before','after'])test('actual native potion and outbox survive SIGKILL '+phase+' COMMIT, writer restart and duplicate replay',async t=>{
 const s=await setupPvp(t);s.reset({area:'forest',actor:{hp:500,potions:2,max_hp:1000}});const dir=temporary(t),file=path.join(dir,'crash.sqlite'),input=path.join(dir,'operation.json'),marker=path.join(dir,'marker');
 s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(s.f.file,file);const {LocalDatabase}=await native('vds-server/src/database.mjs');let db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});t.after(()=>db?.close());
 function boot(){let w;w=new GameWriter(db,{realmId:'outbox-native-crash',clock:()=>s.nowMs,ports:{guard:()=>true,assertResources:(sql,p,c)=>Boolean(w.authority.assertAdmitted(sql,c.peer,c.actor,c.epoch)),affectedActors:()=>[],enforceRateLimit:()=>null,recordSecurityEvent:()=>{},mixedPorts:()=>({selectMixedMonsters473:()=>[]}),resolveRecipients:(_,r)=>r.actors??[s.id]}});return w;}
 let writer=boot();await writer.initialize();const peer={channel:1,incarnation:'outbox-crash-channel'};await writer.register(peer);const owner=await writer.admit(s.id,peer,{sessionId:'outbox-native-session',guard:()=>true});
 const request={playerId:s.id,epoch:owner.epoch,sequence:1,operation:'native_action',operationId:'potion-notification-once',payload:{nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:s.seed,input:{action:'use_potion'},expected:{player:readAttackFrame(db.sqlite,s.id,'',writer.services.globals).player,settings:s.settings},resources:['player:'+s.id]}};
 db.sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');db.close();db=null;fs.writeFileSync(input,JSON.stringify({request,peer}));
 const child=spawn(process.execPath,[path.join(import.meta.dirname,'outbox-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let errors='';child.stderr.on('data',b=>errors+=b);const [,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',errors);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_native_outbox':'durable_native_outbox_before_ack');
 db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});const amount=phase==='after'?1:0;
 for(const table of ['kernel511_channel_receipts','kernel511_notifications','kernel511_notification_audience'])assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n,amount,table+' atomic boundary');assert.equal(db.sqlite.prepare('SELECT potions FROM players WHERE id=?').get(s.id).potions,2-amount);
 writer=boot();await writer.initialize();const result=await writer.command(peer,request),replay=await writer.command(peer,request);assert.deepEqual(json(result),json(replay));assert.equal(db.sqlite.prepare('SELECT potions FROM players WHERE id=?').get(s.id).potions,1);assert.equal((await writer.notificationPending(peer,{actor:s.id,epoch:owner.epoch})).length,1);
 await writer.notificationAck(peer,{actor:s.id,epoch:owner.epoch,ids:result.result.notifications});assert.equal((await writer.notificationPending(peer,{actor:s.id,epoch:owner.epoch})).length,0);
});
