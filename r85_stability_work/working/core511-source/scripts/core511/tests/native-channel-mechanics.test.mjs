import test from 'node:test';
import assert from 'node:assert/strict';
import {createChannelMechanics,SHARED_NATIVE_ACTIONS} from '../native-channel-mechanics.mjs';
import {NATIVE_ACTIONS} from '../generated/action-names.mjs';

test('production mechanics require an independent world and cannot broaden local ownership from client fields',()=>{
 const peer={channel:4,incarnation:'native-mechanics-test'},shared={},r={peer,sharedCombat:shared,channel:{sharedCombat:shared,attack:{shared},pvp:{shared},owners:new Map([['actor',{channel:4,incarnation:peer.incarnation}]]),view:{player:id=>({id,channel:4})}}};
 assert.throws(()=>createChannelMechanics({peer,initial:{},runtime:()=>r}),/native_mechanics_world_required/);
 const mechanics=createChannelMechanics({peer,initial:{sharedWorld:{epoch:1}},runtime:()=>r});
 for(const action of NATIVE_ACTIONS){
  const input={action,players:['foreign'],resources:['player:foreign','monster:foreign']};
  if(SHARED_NATIVE_ACTIONS.includes(action)||action==='guardian_dash')assert.throws(()=>mechanics.footprint('actor',input),/native_mechanics_shared_required/);
  else assert.deepEqual(mechanics.footprint('actor',input),{players:['actor'],resources:['player:actor']});
 }
 assert.throws(()=>mechanics.footprint('foreign',{action:'use_potion'}),/native_mechanics_actor/);
 assert.throws(()=>mechanics.footprint('actor',{action:'mode',kind:'guild_village',command:{action:'revoke'}}),/native_mechanics_shared_required/);
 assert.deepEqual(mechanics.footprint('actor',{action:'mode',kind:'rune',command:{action:'rune_craft',players:['foreign']}}),{players:['actor'],resources:['player:actor']});
 for(const method of ['affectedAttack','affectedPvp'])assert.throws(()=>mechanics[method](),/native_mechanics_terminal_world_required/);
 r.channel.attack.shared=null;assert.throws(()=>mechanics.footprint('actor',{action:'donate'}),/native_mechanics_runtime_binding/);
});
