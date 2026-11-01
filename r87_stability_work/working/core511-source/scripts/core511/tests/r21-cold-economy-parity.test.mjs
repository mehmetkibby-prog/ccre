import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';
import {extraPlayer,combatState} from './process-fixture.mjs';

const request=(action,extra={})=>({action,requestId:randomUUID(),requestAt:Date.now(),...extra});
const row=s=>s.f.sql.prepare('SELECT * FROM players WHERE id=?').get(s.f.id);
const call=async(s,payload,status=200)=>{const response=await s.call(payload),body=await response.json();assert.equal(response.status,status,JSON.stringify(body));return body;};

// New coverage for V510 cold paths that were not exercised by the 698 hot-action
// and R20 combat gates. All storage is the isolated native fixture database.
test('R21 native cold equipment, sale and inventory results reach the resident owner without changing V510 guards',{timeout:60000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s,sql=f.sql,id=randomUUID(),locked=randomUUID(),wrongRole=randomUUID();
 await core.permanentPlayers([f.id],()=>{
  sql.prepare('UPDATE players SET level=30,hp=100,gems=100000,essence=100000,skill_one=1,skill_two=1,skill_three=1 WHERE id=?').run(f.id);
  for(const [key,sale_locked499,role]of [[id,0,row(s).role],[locked,1,row(s).role],[wrongRole,0,row(s).role==='warrior'?'archer':'warrior']])put(sql,'player_items',{id:key,player_id:f.id,kind:'armor',item_name:'R21 isolated armor',rarity:'white',power:10,role,enchantments:'[]',equipped:0,sale_locked499,created_at:Math.floor(Date.now()/1000)});
 });
 const before=row(s),potion=await call(s,request('buy_potion'));assert.equal(potion.potions,before.potions+1);assert.equal((await s.view()).potions,before.potions+1);assert.equal((await s.view()).essence,row(s).essence);
 const exchanged=await call(s,request('exchange_essence'));assert.equal(exchanged.gems,row(s).gems);assert.equal((await s.resources(f.id)).gems,row(s).gems);
 const equipped=await call(s,request('equip',{itemId:id}));assert.equal(sql.prepare('SELECT equipped FROM player_items WHERE id=?').get(id).equipped,1);assert.equal((await s.resources(f.id)).max_hp,equipped.maxHp);
 await until(()=>s.live.packets.some(p=>p.type==='event'&&p.payload?.event?.eventId?.startsWith('equip:')),5000);
 await call(s,request('equip',{itemId:wrongRole}),400);assert.equal(sql.prepare('SELECT equipped FROM player_items WHERE id=?').get(id).equipped,1);
 await call(s,request('sell_item',{itemId:id}),400);await call(s,request('sell_item',{itemId:locked}),400);
 await call(s,request('unequip',{itemId:id}));const sale=request('sell_item',{itemId:id}),wallet=row(s).gems;await call(s,sale);const sold=row(s).gems;assert(sold>wallet);await call(s,sale);assert.equal(row(s).gems,sold);assert.equal((await s.resources(f.id)).gems,sold);assert.equal(sql.prepare('SELECT COUNT(*) n FROM market_settlements WHERE listing_id=?').get('npc:'+id).n,1);
 const beforeSkill=row(s).skill_one;await call(s,request('upgrade_skill',{slot:1}));assert.equal(row(s).skill_one,beforeSkill+1);assert.equal((await s.resources(f.id)).skill_one,beforeSkill+1);
 const beforeReject=row(s);await call(s,request('craft_stone',{stoneKind:'not-a-stone'}),400);assert.equal(row(s).gems,beforeReject.gems);assert.equal(row(s).stone_dust,beforeReject.stone_dust);
 assert.equal(sql.isTransaction,false);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('R21 explicitly selected party actors retain membership guards and native 1v1 arena admission after cold owner refresh',{timeout:60000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s,other=extraPlayer(s,121),host=extraPlayer(s,122,'r21-party-leader');
 await s.host.database.atomic(()=>{globalThis.__colLaunch.grant('shared-account-121',true);globalThis.__colLaunch.grant('shared-account-122',true);});
 const hostSelected=await host.http('character',{channel:1});assert.equal(hostSelected.status,200,JSON.stringify(hostSelected));const leader=await s.connect(hostSelected);
 const selected=await other.http('character',{channel:1});assert.equal(selected.status,200,JSON.stringify(selected));const guest=await s.connect(selected);
 await core.permanentPlayers([host.id,other.id],()=>{for(const id of [host.id,other.id])f.sql.prepare("UPDATE players SET level=40,hp=max_hp,area='bazaar',x=1000,y=1000,combat_lock_until_ms=0,arena_match_id='',last_seen=? WHERE id=?").run(Math.floor(Date.now()/1000),id);});
 const seq=new WeakMap(),send=async(client,payload)=>{const sequence=(seq.get(client)??0)+1;seq.set(client,sequence);client.ws.send(JSON.stringify({type:'input',sequence,payload}));await until(()=>client.packets.some(p=>p.results?.some(r=>r.sequence===sequence))||s.faults.length,8000);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));return client.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);};
 const invite=await send(leader,{action:'invite_party',targetPlayerId:other.id});assert.equal(invite.status,200,JSON.stringify(invite));
 await until(()=>guest.packets.some(p=>p.type==='event'&&p.payload?.event?.type==='party_invite'),5000);
 const accept=await send(guest,{action:'accept_party',targetPlayerId:host.id});assert.equal(accept.status,200,JSON.stringify(accept));
 const roster=f.sql.prepare('SELECT player_id,party_id FROM party_members ORDER BY player_id').all().map(r=>[r.player_id,r.party_id]);assert.equal(roster.length,2);assert.deepEqual((await combatState(s.supervisor.rows.get(1))).parties.sort(),roster);
 assert.equal((await send(guest,{action:'kick_party',targetPlayerId:host.id})).status,403);assert.equal((await send(leader,{action:'kick_party',targetPlayerId:other.id})).status,200);assert.equal((await send(leader,{action:'leave_party'})).status,200);
 assert.equal((await combatState(s.supervisor.rows.get(1))).parties.length,0);
 const joined=await send(leader,{action:'arena_join_queue',arenaMode:'1v1',teamName:'R21 First'});assert.equal(joined.status,200,JSON.stringify(joined));assert.equal(joined.body.queued,true);
 const room=f.sql.prepare('SELECT room_id FROM arena_queue WHERE player_id=?').get(host.id).room_id;
 const matched=await send(guest,{action:'arena_join_queue',arenaMode:'1v1',teamName:'R21 Second',roomId:room});assert.equal(matched.status,200,JSON.stringify(matched));assert.equal(matched.body.matched,true);
 const current=await combatState(s.supervisor.rows.get(1));for(const id of [host.id,other.id]){const p=current.players.find(p=>p.id===id),db=f.sql.prepare('SELECT area,arena_match_id FROM players WHERE id=?').get(id);assert.equal(p.area,'arena');assert.equal(p.match,db.arena_match_id);assert.equal(db.area,'arena');}
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM arena_matches').get().n,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM arena_match_players').get().n,2);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM arena_queue').get().n,0);
 assert.equal((await send(guest,{action:'arena_join_queue',arenaMode:'1v1',teamName:'Again'})).status,409);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM arena_matches').get().n,1);assert.equal(s.faults.length,0);
});
