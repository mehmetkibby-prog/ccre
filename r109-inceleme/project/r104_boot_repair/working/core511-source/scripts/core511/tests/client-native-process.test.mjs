import test from 'node:test';
import assert from 'node:assert/strict';
import {Core511Transport} from '../client-transport.mjs';
import {nativeHttpServerFixture} from './native-http-server-fixture.mjs';
import {until} from './helpers.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');

test('browser transport runs native potion and transfer over real HTTP and WS with current authoritative snapshots',{timeout:40000},async t=>{
 const s=await nativeHttpServerFixture(t);await s.host.database.atomic(()=>s.f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(s.f.id));
 class DirectSocket extends WebSocket{constructor(url){const parsed=new URL(url),channel=Number(parsed.pathname.split('/').at(-1));super('ws://127.0.0.1:'+s.listeners[channel].port+parsed.pathname,{origin:s.f.origin});}}
 const fetch=async(url,options={})=>{const u=new URL(url,s.f.origin),r=await s.call(u.pathname+u.search,{method:options.method??'GET',body:options.body,headers:options.headers});return new Response(r.bytes,{status:r.status,headers:r.headers});};
 const core=new Core511Transport({fetch,WebSocket:DirectSocket,origin:s.f.origin,headers:()=>Object.fromEntries(s.f.request().headers)});t.after(()=>core.dispose());
 const view=await core.image();assert(view.players.some(p=>p.id===s.f.id));assert.equal(core.playerId,s.f.id);const result=await core.request('/api/action',{method:'POST',body:JSON.stringify({action:'use_potion'})},fetch);assert.equal(result.status,200,await result.clone().text());assert.equal((await result.json()).hp>1,true);await until(()=>core.world.players.find(p=>p.id===s.f.id)?.potions===1,5000);
 const transfer=await core.request('/api/action',{method:'POST',body:JSON.stringify({action:'select_channel',channel:4})},fetch);if(transfer.status!==200)console.error('transfer_failure_diagnostic',JSON.stringify({faults:s.faults,processes:s.f.sql.prepare('SELECT channel,incarnation,online FROM kernel511_channel_processes').all()},(_key,value)=>value instanceof Error?{message:value.message,code:value.code,stack:value.stack}:value));assert.equal(transfer.status,200,await transfer.clone().text());assert.equal(core.world.channel,4);assert.equal(s.writer.authority.owner(s.f.id).channel,4);assert.equal(core.world.players.find(p=>p.id===s.f.id).potions,1);assert.equal(core.world.world.cycle,view.world.cycle);core.dispose();
});
