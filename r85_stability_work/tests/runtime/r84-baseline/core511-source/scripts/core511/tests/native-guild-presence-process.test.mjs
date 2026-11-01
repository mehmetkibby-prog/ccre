import test from 'node:test';
import assert from 'node:assert/strict';
import {villageFixture} from './native-guild-village-fixture.mjs';
import {membershipHandler,membershipRequest} from './native-guild-membership-fixture.mjs';
import {until} from './helpers.mjs';

async function staleLiveGuest(t){
 const s=await villageFixture(t);s.f.sql.prepare('UPDATE players SET last_seen=0 WHERE id=?').run(s.guest.id);const stamp=Date.now();s.guest.live.ws.pong();await until(()=>s.writer.presence.rows.get(s.guest.id)?.at>=stamp,5000);assert.equal(s.f.sql.prepare('SELECT last_seen FROM players WHERE id=?').get(s.guest.id).last_seen,0);return {...s,stamp,handler:membershipHandler(s)};
}

test('idle live guild invite materializes only authenticated presence in its owned native transaction',{timeout:40000},async t=>{
 const s=await staleLiveGuest(t),before=s.writer.presence.rows.get(s.guest.id),response=await s.handler(membershipRequest(s,{action:'invite',target:s.guest.id}));assert.equal(response.status,200,await response.text());
 assert(s.f.sql.prepare('SELECT last_seen FROM players WHERE id=?').get(s.guest.id).last_seen>=Math.floor(s.stamp/1000));assert(s.f.sql.prepare('SELECT * FROM guild_invites WHERE recipient_id=?').get(s.guest.id));assert.notEqual(s.writer.presence.rows.get(s.guest.id),before);assert.deepEqual([s.world.row,...s.supervisor.rows.values()],s.old);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('rejected native guild action rolls back presence materialization and keeps the authenticated stamp for retry',{timeout:40000},async t=>{
 const s=await staleLiveGuest(t),stamp=s.writer.presence.rows.get(s.guest.id),before=s.f.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,denied=await s.handler(membershipRequest(s,{action:'kick',target:s.f.id},'member'));assert.equal(denied.status,409,await denied.text());assert.equal(s.f.sql.prepare('SELECT last_seen FROM players WHERE id=?').get(s.guest.id).last_seen,0);assert(s.writer.presence.rows.get(s.guest.id)?.at>=stamp.at);assert.equal(s.f.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,before);
 const accepted=await s.handler(membershipRequest(s,{action:'invite',target:s.guest.id}));assert.equal(accepted.status,200,await accepted.text());assert(s.f.sql.prepare('SELECT last_seen FROM players WHERE id=?').get(s.guest.id).last_seen>=Math.floor(stamp.at/1000));assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('guild commit acknowledgement never consumes a newer authenticated pong recorded during resume',{timeout:40000},async t=>{
 const s=await staleLiveGuest(t),presence=s.writer.presence,acknowledge=presence.acknowledged.bind(presence),peer=s.supervisor.rows.get(4).peer,session=s.core.sessions.get(s.guest.id);let newer;
 presence.acknowledged=written=>{if(written.some(row=>row.actor===s.guest.id)){const old=presence.rows.get(s.guest.id);presence.receive(peer,[{actor:s.guest.id,epoch:session.identity.epoch,at:old.at+1}]);newer=presence.rows.get(s.guest.id);}return acknowledge(written);};
 try{const response=await s.handler(membershipRequest(s,{action:'invite',target:s.guest.id}));assert.equal(response.status,200,await response.text());assert(newer);assert.equal(presence.rows.get(s.guest.id),newer);}finally{presence.acknowledged=acknowledge;}
 assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});
