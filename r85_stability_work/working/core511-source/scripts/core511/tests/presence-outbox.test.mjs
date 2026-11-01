import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,update,json} from './pvp-fixture.mjs';
import {ResidentPresence,WriterPresence} from '../presence.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {NotificationOutbox,NotificationReceiver} from '../notification-outbox.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {readAttackFrame} from '../attack-writer.mjs';
import {prepareModeCase} from './mode-fixture.mjs';

test('authenticated stationary presence is memory-only; game COMMIT piggybacks it and stale ACK cannot clear a newer pong',async t=>{
 const s=await setupPvp(t),authority=new ChannelOwnership(s.f.database,{realmId:'presence511'});await authority.initialize();const peer={channel:1,incarnation:'presence-boot'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(s.id,peer,{sessionId:'presence-session',guard:()=>true});
 let time=s.nowMs;const rows=new Map([[s.id,json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id))]]),identity={actor:s.id,epoch:owner.epoch};authority.presenceOwner=id=>id===s.id?{...owner,admitted:true}:null;
 const local=new ResidentPresence({owner:()=>owner,player:id=>rows.get(id),setPlayer:p=>rows.set(p.id,p),clock:()=>time}),writer=new WriterPresence(authority,{clock:()=>time});const before=s.sql.prepare('SELECT last_seen FROM players WHERE id=?').get(s.id).last_seen;
 const actualPrepare=s.sql.prepare.bind(s.sql);s.sql.prepare=()=>assert.fail('heartbeat attempted SQL');
 try{for(let i=0;i<20;i++){time+=5000;local.seen(identity);writer.receive(peer,local.batch());}}finally{s.sql.prepare=actualPrepare;}
 assert.equal(s.sql.prepare('SELECT last_seen FROM players WHERE id=?').get(s.id).last_seen,before);assert.equal(rows.get(s.id).last_seen,Math.floor(time/1000));
 let stamps;await assert.rejects(s.f.database.atomic(sql=>{stamps=writer.materialize(sql);throw Error('rollback');}),/rollback/);assert.equal(s.sql.prepare('SELECT last_seen FROM players WHERE id=?').get(s.id).last_seen,before);assert.equal(writer.rows.size,1);
 await s.f.database.atomic(sql=>{stamps=writer.materialize(sql);});time+=5000;local.seen(identity);writer.receive(peer,local.batch());writer.acknowledged(stamps);assert.equal(writer.rows.size,1);
 await s.f.database.atomic(sql=>{stamps=writer.materialize(sql);});writer.acknowledged(stamps);assert.equal(writer.rows.size,0);assert.equal(s.sql.prepare('SELECT last_seen FROM players WHERE id=?').get(s.id).last_seen,Math.floor(time/1000));
 assert.throws(()=>writer.receive({...peer,incarnation:'retired'},local.batch()),/presence_owner_fenced/);assert.throws(()=>local.seen({...identity,epoch:owner.epoch+1}),/presence_owner_fenced/);
 const fresh=local.merge({...rows.get(s.id),last_seen:0},owner.epoch);assert.equal(fresh.last_seen,Math.floor(time/1000));
});

test('economic event, receipt and recipient outbox commit together; delivery/ACK loss replays one presentation',async t=>{
 const s=await setupPvp(t),authority=new ChannelOwnership(s.f.database,{realmId:'outbox511'});await authority.initialize();const peer={channel:1,incarnation:'outbox-boot'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(s.id,peer,{sessionId:'outbox-session',guard:()=>true});
 const box=new NotificationOutbox(s.f.database,{resolveRecipients:(_,r)=>r.actors??[s.id]});await box.initialize();
 registerOwnedRule(authority,'grant',(sql,p,c)=>{sql.prepare('UPDATE players SET gems=gems+? WHERE id=?').run(5,c.actor);return box.append(sql,c,{events:[[1,1,'forest',[s.id],{type:'reward',amount:5}]],amount:5});});
 const request={playerId:s.id,epoch:owner.epoch,sequence:1,operation:'grant',operationId:'outbox-operation',payload:{}};const gems=s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems;
 const result=await authority.command(peer,request),replay=await authority.command(peer,request);assert.deepEqual(replay,result);assert.equal(s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems,gems+5);assert.equal(result.result.events.length,0);
 let calls=0,loseAck=true;const receiver=new NotificationReceiver({apply:()=>calls++,ack:ids=>{if(loseAck)throw Error('socket interrupted');return box.acknowledge(s.id,ids,()=>true);}});
 let pending=box.pending(s.sql,s.id);assert.equal(pending.length,1);await assert.rejects(receiver.receive(pending[0]),/socket interrupted/);assert.equal(calls,1);assert.equal(box.pending(s.sql,s.id).length,1);
 const restarted=new NotificationOutbox(s.f.database,{resolveRecipients:()=>[s.id]});await restarted.initialize();pending=restarted.pending(s.sql,s.id);loseAck=false;await Promise.all([receiver.receive(pending[0]),receiver.receive(pending[0])]);assert.equal(calls,1);assert.equal(box.pending(s.sql,s.id).length,0);assert.equal(await box.prune(),1);
 // A notification cannot be acknowledged through a foreign actor/session.
 await assert.rejects(box.acknowledge(s.targetId,result.result.notifications,()=>false),/notification_ack_owner/);
});

test('assembled native writer binds premium/guild/dungeon services, actor snapshots, receipt and outbox without heartbeat SQL',async t=>{
 const s=await setupPvp(t);s.reset({area:'forest',actor:{potions:2,hp:500,max_hp:1000}});let writer,time=s.nowMs;
 const ports={guard:(sql,p,c)=>Boolean(sql.prepare('SELECT 1 FROM players WHERE id=?').get(c.actor)),assertResources:(sql,p,c)=>Boolean(writer.authority.assertAdmitted(sql,c.peer,c.actor,c.epoch)),affectedActors:()=>[],enforceRateLimit:()=>null,recordSecurityEvent:()=>{},mixedPorts:()=>({selectMixedMonsters473:()=>[]}),resolveRecipients:(sql,r)=>r.actors??sql.prepare('SELECT player_id FROM kernel511_admissions WHERE channel=?').all(r.channels[0]).map(p=>p.player_id)};
 writer=new GameWriter(s.f.database,{realmId:'assembled-writer',ports,clock:()=>time});await writer.initialize();const peer={channel:1,incarnation:'assembled-writer-boot'};await writer.register(peer);const owner=await writer.admit(s.id,peer,{sessionId:'assembled-writer-session',guard:()=>true});
 const frame=readAttackFrame(s.sql,s.id,'',writer.services.globals).player;time+=60000;writer.presence.receive(peer,[{actor:s.id,epoch:owner.epoch,at:time}]);
 const request={playerId:s.id,epoch:owner.epoch,sequence:1,operation:'native_action',operationId:'assembled-potion',payload:{input:{action:'use_potion'},nowMs:time,receivedAtMs:time,seed:s.seed,expected:{player:frame,settings:s.settings},resources:['player:'+s.id]}};
 const result=await writer.command(peer,request);assert.equal(result.result.result.body.ok,true);assert.equal(s.sql.prepare('SELECT potions FROM players WHERE id=?').get(s.id).potions,1);assert.equal(writer.presence.rows.size,0);assert.equal(s.sql.prepare('SELECT last_seen FROM players WHERE id=?').get(s.id).last_seen,Math.floor(time/1000));assert.deepEqual(json(await writer.command(peer,request)),json(result));
 const rune=await prepareModeCase({...s,nowMs:time},'rune','rune_claim'),mode={...request,sequence:2,operation:'mode_action',operationId:'assembled-rune',payload:rune};await assert.rejects(writer.command(peer,mode),{code:'native_write_resource_scope'});
 const claim=await writer.command(peer,{...mode,payload:{...rune,resources:['player:'+s.id]}});assert(claim.result.result);
 for(const key of ['__colPremium','__colGuildSkill','__colProgression','__colDungeon'])assert(writer.services.globals[key]);
 await s.f.database.atomic(()=>writer.services.run({seed:s.seed,nowMs:time},g=>{
  const player=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id),stats=g.__colDungeon.statsFor(player);assert(stats.attack>0&&stats.maxHp>0);assert.equal(g.__colDungeon.locked(s.id),false);
  for(const kind of ['frozen','water','ancient','dragon','dungeon','solo','world']){const profile=writer.services.eventProfile(kind,s.settings);assert(profile.hp>0&&profile.damage>0&&profile.xp>=0&&profile.loot.lootProfileJson);}
 }));
});
