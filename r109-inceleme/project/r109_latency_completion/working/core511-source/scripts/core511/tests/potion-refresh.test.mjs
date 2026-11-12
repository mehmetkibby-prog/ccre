import test from 'node:test';
import assert from 'node:assert/strict';
import {canRefreshPotion} from '../potion-refresh.mjs';
test('fast potion refresh rejects death, scope, reward, gear, multi-actor and non-potion changes',()=>{
 const before={id:'a',hp:100,hp_revision:1,area:'forest',channel:1,arena_match_id:'',potions:2,gems:40,weapon_id:'sword'},context={id:'a',input:{action:'use_potion'}},result={players:[{...before,hp:120,hp_revision:2,potions:1}],encounters:[['a',null]],fishing:null};
 assert(canRefreshPotion(before,result,context));
 for(const patch of [{hp:0},{area:'war'},{channel:2},{gems:41},{weapon_id:'other'},{new_unrecognized_column:1},{arena_match_id:'fight'}])assert(!canRefreshPotion(before,{...result,players:[{...result.players[0],...patch}]},context));
 assert(!canRefreshPotion(before,{...result,players:[...result.players,{id:'b'}]},context));assert(!canRefreshPotion(before,result,{...context,input:{action:'donate'}}));
});
