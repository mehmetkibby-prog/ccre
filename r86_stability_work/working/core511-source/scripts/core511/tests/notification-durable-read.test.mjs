import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {native,temporary,until} from './helpers.mjs';
import {NotificationOutbox} from '../notification-outbox.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {installGroupCommit} from '../group-commit.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
test('mailbox cannot expose a later committed notification while its WAL fsync is still held',async t=>{
 const db=new LocalDatabase(path.join(temporary(t),'read.sqlite'),{create:true,groupWrites:true,asyncDurable:true});t.after(async()=>{db.close();await db.walSync.closing;});
 const box=new NotificationOutbox(db,{resolveRecipients:()=>['p']});await box.initialize();const groups=installGroupCommit(db),flush=db.walSync.flush.bind(db.walSync);let release,writeAcknowledged=false,visible=false;
 db.walSync.flush=async()=>{await new Promise(r=>release=r);return flush();};
 const writing=db.atomic(sql=>box.append(sql,{realm:'test',key:'pending'},{events:[[1,1,'forest',{type:'player_state',targetId:'p',hp:9}]]})).then(r=>{writeAcknowledged=true;return r;});await until(()=>release);
 const writer=Object.assign(Object.create(GameWriter.prototype),{database:db,notifications:box,durableGroups:groups,authority:{assertAdmitted(_sql,_peer,actor,epoch){assert.equal(actor,'p');assert.equal(epoch,1);return true;}}});
 const pending=Promise.resolve(writer.notificationPending({channel:1},{actor:'p',epoch:1})).then(x=>{visible=true;return x;});await new Promise(r=>setImmediate(r));const exposedBeforeFsync=visible;assert.equal(writeAcknowledged,false);release();await writing;const events=await pending;assert.equal(events.length,1);assert.equal(exposedBeforeFsync,false,'commit-before-show: SQL-visible must not mean durable-visible');
});
test('a snapshot containing a later COMMIT waits for its later flush, not the already-running flush',async t=>{
 const db=new LocalDatabase(path.join(temporary(t),'late.sqlite'),{create:true,groupWrites:true,asyncDurable:true});t.after(async()=>{db.close();await db.walSync.closing;});
 const box=new NotificationOutbox(db,{resolveRecipients:()=>['p']});await box.initialize();const groups=installGroupCommit(db),flush=db.walSync.flush.bind(db.walSync),holds=[];db.walSync.flush=async()=>{await new Promise(r=>holds.push(r));return flush();};
 const write=key=>db.atomic(sql=>box.append(sql,{realm:'test',key},{events:[[1,1,'forest',{type:'player_state',targetId:'p',hp:9}]]}));
 const first=write('first');await until(()=>holds.length===1);const second=write('second');await until(()=>db.sqlite.prepare('SELECT count(*) n FROM kernel511_notifications').get().n===2&&!db.sqlite.isTransaction);
 const writer=Object.assign(Object.create(GameWriter.prototype),{database:db,notifications:box,durableGroups:groups,authority:{assertAdmitted(){return true;}}});let visible=false;const reading=writer.notificationPending({channel:1},{actor:'p',epoch:1}).then(x=>{visible=true;return x;});
 holds[0]();await first;await until(()=>holds.length===2);const premature=visible;holds[1]();await second;assert.equal((await reading).length,2);assert.equal(premature,false);assert.equal(holds.length,2,'read reuses existing durability promises, no extra fsync');
});
