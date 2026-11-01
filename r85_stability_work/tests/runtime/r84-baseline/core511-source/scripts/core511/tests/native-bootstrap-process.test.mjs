import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,extraPlayer} from './process-fixture.mjs';
import {bootstrapHandler} from './native-bootstrap-fixture.mjs';
import {presenceHandler} from './native-presence-fixture.mjs';

test('native presence claim advertises all four25-capacity channels with actual admitted counts including C4',{timeout:35000},async t=>{
 const s=await setup(t,{shared:true}),{f,world,http,connect}=s;await world.stopJobs();await http('ticket');const ticket=await http('transfer',{channel:4});assert.equal(ticket.status,200);await connect(ticket);
 // A recent native player row without admission is not an occupied slot.
 const offline=extraPlayer(s,91);f.sql.prepare('UPDATE players SET channel=4,last_seen=? WHERE id=?').run(Math.floor(f.clock()/1000),offline.id);let seeds=0;
 const bootstrap=bootstrapHandler({...s,onLegacySeed:()=>{seeds++;}}),route=presenceHandler({...s,bootstrap}),response=await route(f.request({path:'/api/game-presence',body:{action:'claim'}}));assert.equal(response.status,200);const body=await response.json();assert.deepEqual(body.entry.channels.map(c=>c.id),[1,2,3,4]);assert.equal(body.entry.capacity,25);assert.deepEqual(body.entry.channels.map(c=>({id:c.id,capacity:c.capacity,online:c.online})),[1,2,3,4].map(id=>({id,capacity:25,online:Number(id===4)})));assert.equal(body.entry.area,'bazaar');assert.equal(seeds,0);
 assert.equal((await http('transfer',{channel:3})).status,200);assert.deepEqual((await bootstrap()).channels.map(c=>c.online),[0,0,1,0]);assert.equal((await http('logout')).status,200);assert.deepEqual((await bootstrap()).channels.map(c=>c.online),[0,0,0,0]);assert.equal(seeds,0);
});
