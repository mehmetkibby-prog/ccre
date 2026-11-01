import test from 'node:test';
import assert from 'node:assert/strict';
import {potionJoinTargetsR56} from '../working/core511-source/scripts/core511/potion-join-r56.mjs';
import {canRefreshPotion} from '../working/core511-source/scripts/core511/potion-refresh.mjs';

test('Rune potion join includes only the ordinary catalog and one matching actor scope',()=>{
 const p={id:'actor',area:'rune_v2',channel:2,arena_match_id:'',instance_id:''};
 const m={id:'rune-v2-tide-c2-1',area:'rune_v2',channel:2,is_boss:0,is_stone:0,summoned:0};
 const base={input:{action:'use_potion'},ids:[p.id],footprint:{resources:['player:'+p.id,'monster:'+m.id]}};
 const run=(player=p,monster=m,patch={})=>potionJoinTargetsR56({...base,kernel:{state:{channel:2,read:(table,id)=>table==='players'?player:monster}},...patch});
 assert.deepEqual(run(),[m.id]);
 assert.deepEqual(run(p,m,{footprint:{resources:['player:'+p.id]}}),[]);
 for(const patch of [{id:'rune-v2-boss-c2'},{id:'rune-v2-tide-c1-1'},{id:'rune-v2-tide-c2-6'},{id:'custom-rune-monster'},{channel:0},{channel:1},{is_boss:1},{is_stone:1},{summoned:1},{area:'forest'}])assert.equal(run(p,{...m,...patch}),null,JSON.stringify(patch));
 for(const patch of [{area:'dungeon'},{area:'mist'},{area:'tower'},{channel:1},{arena_match_id:'match'},{instance_id:'instance'},{instanceId:'instance'}])assert.equal(run({...p,...patch}),null,JSON.stringify(patch));
 for(const patch of [{sharedLease:'lease'},{localScope:{kind:'claim'}},{resources:['player:other']},{resources:['player:'+p.id,'monster:'+m.id,'monster:'+m.id]}])assert.equal(run(p,m,{footprint:{...base.footprint,...patch}}),null);
 assert.equal(run(p,m,{ids:[p.id,'other']}),null);
 assert.equal(run(p,m,{input:{action:'collect'}}),null);
});

test('Rune potion refresh preserves scope/equipment and falls back for death, rewards or additional actors',()=>{
 const previous={id:'actor',hp:300,hp_revision:1,area:'rune_v2',channel:2,arena_match_id:'',potions:2,gems:40,weapon_id:'sword',instance_id:''};
 const context={id:'actor',input:{action:'use_potion'}};
 const result={players:[{...previous,hp:500,hp_revision:2,potions:1}],encounters:[['actor',null]],fishing:null};
 assert(canRefreshPotion(previous,result,context));
 for(const patch of [{hp:0},{area:'forest'},{channel:1},{gems:41},{weapon_id:'new-sword'},{new_column:1},{arena_match_id:'match'},{instance_id:'instance'}])assert(!canRefreshPotion(previous,{...result,players:[{...result.players[0],...patch}]},context),JSON.stringify(patch));
 for(const patch of [{drop:{id:'loot'}},{fishing:{}},{monsters:[{id:'monster'}]},{players:[...result.players,{id:'other'}]},{encounters:[['other',null]]}])assert(!canRefreshPotion(previous,{...result,...patch},context));
 assert(!canRefreshPotion({...previous,hp:0},result,context));
 assert(!canRefreshPotion(previous,result,{...context,input:{action:'claim_rewards'}}));
});
