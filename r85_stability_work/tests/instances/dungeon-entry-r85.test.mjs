import test from 'node:test';
import assert from 'node:assert/strict';
import {combatState} from '../../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {party} from './dungeon-party-fixture-r85.mjs';
import {until} from '../../working/core511-source/scripts/core511/tests/helpers.mjs';
test('native three-player dungeon entry waits for its durable ACK then all members ready and play in the same room',{timeout:35000},async t=>{
 const s=await party(t,{together:true}),{f,writer,actors,action,supervisor,faults}=s,command=writer.command.bind(writer);let release,committed=false;const wait=new Promise(r=>release=r);
 writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='dungeon_entry'&&!committed){committed=true;await wait;}return ack;};const pending=action(actors[0],{action:'create'});void pending.catch(()=>{});
 try{await until(()=>committed||faults.length,8000);assert.equal(faults.length,0);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dungeon_members').get().n,3);assert(!actors[0].live.packets.some(p=>p.results?.some(r=>r.sequence===1)));const state=await combatState(supervisor.rows.get(actors[0].ticket.channel));for(const actor of actors.slice(1))assert.equal(state.players.find(p=>p.id===actor.id).suspended,true);
  release();assert.equal((await pending).ok,true);for(const actor of actors.slice(1))assert.equal((await action(actor,{action:'ready',ready:true})).ok,true);assert.equal(f.sql.prepare('SELECT status FROM dungeon_runs').get().status,'active');assert.equal((await action(actors[0],{action:'move',x:1,y:0,sequence:1})).ok,true);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 }finally{release();await pending;}
});

