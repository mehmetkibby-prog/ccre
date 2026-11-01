import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {OperationRandom} from '../operation-random.mjs';
import {AttackMemory} from '../attack-memory.mjs';
test('buffer-free RNG words match pre-change bytes, rejection draws, rolls and UUIDs exactly',()=>{
 const reference=JSON.parse(fs.readFileSync(new URL('./rng-before-pool-vectors.json',import.meta.url)));assert.match(reference.referenceFileSha256,/^[a-f0-9]{64}$/);
 for(const row of reference.cases){const rng=new OperationRandom(row.seed);for(const op of row.operations){const actual=rng[op.method](...op.args);assert.deepEqual(Buffer.isBuffer(actual)?actual.toString('hex'):actual,op.expected);}}
});
test('pooled transaction maps cannot mutate earlier proposals and are cleared on exception',()=>{
 const a=Object.create(AttackMemory.prototype),scratch={players:new Map(),monsters:new Map(),engagements:new Map(),participants:new Map(),bossParticipants:new Map()};let serial=0,fail=false;
 Object.assign(a,{running:false,scratch,metrics:{attacks:0,durable:0},remember:p=>p,rules:{memoryAttack(port,copy){a.t.players.set('actor',{id:'actor',hp:++serial});a.t.events.push(['event',serial]);a.t.combatEvents.push({serial});copy.player.hp=0;if(fail)throw Error('native-failure');return {ok:true};}}});
 const context={player:{id:'actor',hp:100},payload:{}},first=a.step(context,{commit:false}),saved=structuredClone(first),same=scratch.players;
 a.step(context,{commit:false});assert.deepEqual(first,saved);assert.equal(context.player.hp,100);assert.equal(a.scratch.players,same);assert.equal(same.size,0);assert.equal(a.t,null);
 fail=true;assert.throws(()=>a.step(context,{commit:false}),/native-failure/);assert.equal(same.size,0);assert.equal(a.running,false);assert.equal(a.t,null);assert.equal(scratch.events,null);fail=false;a.step(context,{commit:false});assert.deepEqual(first,saved);
});
