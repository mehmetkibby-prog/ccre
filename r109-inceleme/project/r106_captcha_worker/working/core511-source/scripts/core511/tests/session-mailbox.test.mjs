import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp} from './pvp-fixture.mjs';
import {native,until} from './helpers.mjs';
import {SessionMirror,readSessionMirror} from '../session-mirror.mjs';
import {ChannelMailbox} from '../channel-mailbox.mjs';
import {NotificationReceiver} from '../notification-outbox.mjs';

test('session mirror retains original security freshness, captcha/AFK, ban, maintenance and epoch gates without hot SQL',async t=>{
 const s=await setupPvp(t),{createBotCheck}=await native('vds-server/src/bot-check.mjs'),{RealmSecurityGate}=await native('vds-server/src/realm-security-gate.mjs');
 let time=s.nowMs;const account=s.sql.prepare('SELECT account_id FROM players WHERE id=?').get(s.id).account_id,version=s.sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(account).security_version;
 const player={area:'forest'},peer={channel:1,incarnation:'secure-channel'},owner={player_id:s.id,...peer,epoch:3},session={account:{id:account},player:{id:s.id},tokenHash:'abc-security-session',securityVersion:version,expiresAt:Math.floor(time/1000)+3600};
 const bot=createBotCheck(s.sql,{now:()=>time,exempt:()=>player.area==='afk'}),maintenance={allows:()=>true},security=new RealmSecurityGate({readSecurity:()=>{},applySecurity:()=>{},maintenance,now:()=>time});
 security.entries.set(account,{version,blocked:false,validUntil:time+30000,canPlay:true});const realm={role:'game',realm:{status:'open'},policy:{status:'open'},security,maintenance};
 const snapshot=readSessionMirror({sql:s.sql,session,owner,revision:1,realm,bot,launch:{},guild:{},clock:()=>time}),revoked=[];
 const mirror=new SessionMirror({peer,owner:()=>owner,player:()=>player,clock:()=>time,revoke:v=>revoked.push(v)}),id={actor:s.id,account,session:session.tokenHash,epoch:3,securityVersion:version};mirror.update(snapshot);
 const prepare=s.sql.prepare.bind(s.sql);s.sql.prepare=()=>assert.fail('hot session guard executed SQL');try{for(let i=0;i<10000;i++)assert.equal(mirror.check(id),true);}finally{s.sql.prepare=prepare;}
 assert.equal(revoked.length,0);time=snapshot.securityValidUntil;assert.equal(mirror.check(id).code,'security_verification_required');mirror.sweep();assert.equal(revoked.length,1);
 mirror.update({...snapshot,revision:2,securityValidUntil:time+30000,botDueMs:time});assert.equal(mirror.check(id).code,'bot_check_required');player.area='afk';assert.equal(mirror.check(id),true);player.area='forest';assert.equal(mirror.check(id).code,'bot_check_required');
 mirror.update({...snapshot,revision:3,securityValidUntil:time+30000,botDueMs:time+30000,blocked:true});assert.equal(mirror.check(id).code,'account_suspended');
 mirror.update({...snapshot,revision:4,securityValidUntil:time+30000,maintenanceAllowed:false});assert.equal(mirror.check(id).code,'game_maintenance');
 mirror.update({...snapshot,revision:5,securityValidUntil:time+30000});assert.equal(mirror.check({...id,epoch:4}).code,'session_epoch_fenced');assert.throws(()=>mirror.update({...snapshot,revision:4}),/session_mirror_stale/);
 mirror.retire(s.id,6);assert.equal(mirror.check(id).code,'session_epoch_fenced');assert.throws(()=>mirror.update({...snapshot,revision:6}),/session_mirror_stale/);
});

test('notification mailbox reconnect resends unacknowledged IDs, drains batches and does not lose a change during a read',async()=>{
 const events=Array.from({length:35},(_,i)=>({id:i.toString(16).padStart(64,'0'),payload:{n:i}})),pending=new Map(events.map(e=>[e.id,e]));let identity={actor:'mailbox-player',epoch:1},live=true,ackBroken=true,readRelease=null;
 const sent=[],applied=[],mailbox=new ChannelMailbox({identity:()=>identity,send:(_,message)=>{if(!live)return false;sent.push(message);return true;},request:async(method,payload)=>{
  if(method==='notification_pending'){if(readRelease)await new Promise(resolve=>readRelease(resolve));return [...pending.values()].slice(0,32);}
  if(ackBroken)throw Error('writer link interrupted');for(const id of payload.ids)pending.delete(id);return {};
 }});
 await mailbox.connected(identity);assert.equal(sent.length,32);const receiver=new NotificationReceiver({apply:e=>applied.push(e.n),ack:ids=>mailbox.acknowledge(identity,ids)});
 await assert.rejects(receiver.receive(sent[0]),/writer link interrupted/);assert.equal(pending.size,35);live=false;mailbox.disconnected(identity.actor);identity={...identity};live=true;ackBroken=false;
 await mailbox.connected(identity);assert.equal(sent.length,64);await receiver.receive(sent[32]);assert.deepEqual(applied,[0]);assert.equal(pending.size,34);assert(sent.some(e=>e.payload.n===32));
 let release;readRelease=resolve=>{release=resolve;};const flush=mailbox.flush(identity.actor);await until(()=>release);mailbox.changed([identity.actor]);readRelease=null;release();await flush;await until(()=>mailbox.pending.size===0);assert.equal(mailbox.again.size,0);
 await assert.rejects(mailbox.acknowledge({...identity},[sent[1].id]),/mailbox_session_changed/);
});

test('overlapping native transition holds drain reads and defer validated notification ACKs until the last release',async()=>{
 const actor='held-mailbox',identity={actor,epoch:1},message={id:'a'.repeat(64),payload:{n:1}},sent=[],calls=[];let release,read=true;
 const mailbox=new ChannelMailbox({identity:()=>identity,send:(_id,m)=>sent.push(m),request:async(method,payload)=>{calls.push([method,payload]);if(method==='notification_pending'){if(read)await new Promise(resolve=>release=resolve);return calls.some(([m])=>m==='notification_ack')?[]:[message];}return {};}});
 const reading=mailbox.connected(identity);await until(()=>release);let held=false;const hold=mailbox.hold('global-token',[actor]).then(()=>held=true);await mailbox.hold('shared-token',[]);await Promise.resolve();assert.equal(held,false);read=false;release();await reading;await hold;await mailbox.hold('shared-token',[actor]);
 await mailbox.acknowledge(identity,[message.id]);mailbox.changed([actor]);assert.equal(calls.length,1);mailbox.resume('global-token');await Promise.resolve();assert.equal(calls.length,1);mailbox.resume('shared-token');await until(()=>calls.some(([name])=>name==='notification_ack'));await until(()=>mailbox.pending.size===0&&mailbox.acknowledging.size===0);assert.equal(calls.filter(([name])=>name==='notification_ack').length,1);assert.equal(mailbox.held(actor),false);assert.equal(sent.length,1);
});

test('transition waits for an in-flight notification ACK and cannot send a retired epoch ACK after rehome',async()=>{
 const actor='moving-mailbox',message={id:'b'.repeat(64),payload:{}},calls=[];let identity={actor,epoch:1},release;
 const mailbox=new ChannelMailbox({identity:()=>identity,send:()=>true,request:async(method,payload)=>{calls.push([method,payload]);if(method==='notification_pending')return [message];await new Promise(resolve=>release=resolve);return {};}});
 await mailbox.connected(identity);const ack=mailbox.acknowledge(identity,[message.id]);await until(()=>release);let held=false;const hold=mailbox.hold('return-token',[actor]).then(()=>held=true);await Promise.resolve();assert.equal(held,false);release();await ack;await hold;
 mailbox.delivered.set(actor,new Set([message.id]));await mailbox.acknowledge(identity,[message.id]);mailbox.disconnected(actor);identity={actor,epoch:2};mailbox.resume('return-token');await until(()=>calls.some(([method,p])=>method==='notification_pending'&&p.epoch===2));assert.equal(calls.filter(([method])=>method==='notification_ack').length,1);assert.equal(mailbox.deferredAcks.size,0);
});

test('startup notification bursts coalesce but post-read commits and held mail are never lost',async t=>{
 const identity={actor:'burst',epoch:1},sent=[],stored=[],calls=[];let release=null,block=false;
 const box=new ChannelMailbox({identity:()=>identity,send:(_id,m)=>{sent.push(m);return true;},request:async(method,p)=>{calls.push(method);if(method==='notification_pending'){const snapshot=stored.slice(0,32);if(block)await new Promise(resolve=>release=resolve);return snapshot;}for(const id of p.ids){const index=stored.findIndex(e=>e.id===id);if(index>=0)stored.splice(index,1);}return {};}});t.after(()=>box.close());
 const event=n=>({id:n.toString(16).padStart(64,'0'),payload:{n}});
 for(let i=0;i<25;i++){stored.push(event(i));box.changed([identity.actor]);}
 await until(()=>sent.length===25);assert.equal(calls.filter(x=>x==='notification_pending').length,1);await box.acknowledge(identity,sent.map(m=>m.id));assert.equal(calls.filter(x=>x==='notification_pending').length,1);
 block=true;const pending=box.flush(identity.actor);await until(()=>release);stored.push(event(26));box.changed([identity.actor]);block=false;release();await pending;await until(()=>sent.some(m=>m.id===event(26).id));
 await box.hold('held',[identity.actor]);await box.acknowledge(identity,[event(26).id]);stored.push(event(27));box.changed([identity.actor]);await new Promise(resolve=>setTimeout(resolve,65));box.resume('held');await until(()=>sent.some(m=>m.id===event(27).id));assert.equal(new Set(sent.map(m=>m.id)).size,27);
});
