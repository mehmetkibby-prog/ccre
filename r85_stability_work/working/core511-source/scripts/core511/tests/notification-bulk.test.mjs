import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {native,temporary} from './helpers.mjs';
import {NotificationOutbox} from '../notification-outbox.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
async function fixture(t){const db=new LocalDatabase(path.join(temporary(t),'bulk.sqlite'),{create:true,groupWrites:true,asyncDurable:true});t.after(async()=>{db.close();await db.walSync.closing;});const actors=Array.from({length:100},(_,i)=>'actor-'+String(i).padStart(3,'0'));const box=new NotificationOutbox(db,{resolveRecipients:()=>actors,clock:()=>1000});await box.initialize();return {db,box,actors};}
const event=n=>[1,1,'forest',{type:'player_state',targetId:'actor-000',hp:n,hpRevision:n}];
test('bounded bulk outbox retains all100 sorted recipients, ordinal order, exact ACK counts and actor guard',async t=>{
 const {db,box,actors}=await fixture(t),result=await db.atomic(sql=>box.append(sql,{realm:'test',key:'operation'},{events:[event(1),event(2)]}));
 assert.deepEqual(result.notificationActors,actors);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM kernel511_notification_audience').get().n,200);
 for(const actor of actors)assert.deepEqual(box.pending(db.sqlite,actor).map(x=>x.id),result.notifications);
 assert.deepEqual(await box.acknowledge(actors[0],[result.notifications[0],result.notifications[0],result.notifications[1],'f'.repeat(64)],()=>true),{acknowledged:2});
 assert.deepEqual(await box.acknowledge(actors[0],result.notifications,()=>true),{acknowledged:0});assert.equal(box.pending(db.sqlite,actors[1]).length,2);
 await assert.rejects(box.acknowledge(actors[1],result.notifications,()=>false),/notification_ack_owner/);assert.equal(box.pending(db.sqlite,actors[1]).length,2);
});
test('failure inside multirow insertion rolls back every recipient and its event',async t=>{
 const {db,box}=await fixture(t);db.sqlite.exec("CREATE TRIGGER fail_middle BEFORE INSERT ON kernel511_notification_audience WHEN NEW.actor='actor-050' BEGIN SELECT RAISE(ABORT,'injected_recipient_failure'); END");
 await assert.rejects(db.atomic(sql=>box.append(sql,{realm:'test',key:'operation'},{events:[event(1)]})),/injected_recipient_failure/);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM kernel511_notification_audience').get().n,0);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM kernel511_notifications').get().n,0);
});
