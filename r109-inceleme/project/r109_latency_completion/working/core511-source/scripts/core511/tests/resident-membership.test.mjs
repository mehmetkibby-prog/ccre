import test from 'node:test';
import assert from 'node:assert/strict';
import {ResidentMembership} from '../resident-membership.mjs';

const bundle=(id,revision,{party=null,members=[],arena=null,teams=[]}={})=>({player:{id},revision,party:party?{id:party}:null,partyMembers:members.map(player_id=>({player_id,party_id:party})),arena,arenaPlayers:teams.map(([player_id,team])=>({match_id:arena.id,player_id,team}))});
test('resident membership evicts kicked offline members and superseded arenas without losing other owned rosters',()=>{
 const cache=new ResidentMembership(),maps=[cache.parties,cache.arenas,cache.teams];
 const before={party:'group',members:['a','b','offline'],arena:{id:'match1',status:'active'},teams:[['a',1],['b',2]]};
 cache.hydrate(bundle('a',1,before));cache.hydrate(bundle('b',2,before));assert.equal(cache.parties.get('offline'),'group');
 cache.hydrate(bundle('a',3));assert.equal(cache.parties.has('a'),false,'old peer roster cannot restore the refreshed resident');assert.equal(cache.parties.get('offline'),'group','remaining owner still holds its cold snapshot');
 cache.hydrate(bundle('b',4,{party:'group',members:['b']}));assert.deepEqual([...cache.parties],[['b','group']]);assert.equal(cache.arenas.size,0);assert.equal(cache.teams.size,0);
 cache.hydrate(bundle('a',5,{arena:{id:'match2',status:'countdown'},teams:[['a',1],['opponent',2]]}));assert.equal(cache.arenas.has('match1'),false);assert.equal(cache.teams.has('match1:b'),false);assert.equal(cache.teams.get('match2:opponent'),2);
 cache.forget('a');assert.equal(cache.arenas.size,0);assert.equal(cache.teams.size,0);assert.equal(cache.parties.get('b'),'group');cache.forget('b');assert.equal(cache.snapshots.size,0);assert.equal(cache.parties.size,0);assert.deepEqual([cache.parties,cache.arenas,cache.teams],maps);
});
