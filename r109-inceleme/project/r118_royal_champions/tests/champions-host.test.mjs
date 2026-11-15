import test from 'node:test';
import assert from 'node:assert/strict';
import {httpActionFixture} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/native-http-action-fixture.mjs';
import {createAdventureSchema} from '../../r109_latency_completion/working/core511-source/scripts/core511/adventure-schema.mjs';
import {ChannelOwnership} from '../../r109_latency_completion/working/core511-source/scripts/core511/ownership.mjs';
import {setupEntry} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/entry-fixture.mjs';
import {until,native} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/helpers.mjs';
import {configurationSnapshot} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/native-configuration-fixture.mjs';
const {applyWorldDelta}=await native('lib/world-push.mjs');

test('authenticated reentry restores only eligible champions and safely relocates ineligible stored players',async t=>{
 const s=await setupEntry(t);createAdventureSchema(s.sql);await new ChannelOwnership(s.f.database,{realmId:'champions-entry-test',now:s.clock}).initialize();
 for(const champion of [1,0]){
  s.sql.prepare("UPDATE players SET area='champions',champion_level_r102=?,x=1800,y=1950,hp=1000,combat_lock_until_ms=0,last_seen=0 WHERE id=?").run(champion,s.id);
  const session=await s.auth.session(s.request());assert.equal(session.playerAccess.area,'champions');
  const r=await s.f.database.atomic(sql=>s.entry.prepare(sql,{session,channel:1}));assert.equal(r.accepted,true,JSON.stringify(r));
  const player=s.sql.prepare('SELECT area,x,y FROM players WHERE id=?').get(s.id);assert.equal(player.area,champion?'champions':'bazaar');assert.equal(player.x,champion?1800:1200);assert.equal(player.y,champion?1950:920);
 }
});

test('real four-owner runtime admits champions, streams map snapshots and deltas and propagates admin settings',{timeout:60000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s;let sequence=0;
 const faults=()=>s.faults.map(f=>f.error?.stack??JSON.stringify(f)).join('\n');
 const send=async payload=>{const seq=++sequence;s.live.ws.send(JSON.stringify({type:'input',sequence:seq,payload}));await until(()=>s.live.packets.some(p=>p.results?.some(r=>r.sequence===seq))||s.faults.length,12000);assert.equal(s.faults.length,0,faults());return s.live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===seq);};
 const current=()=>{let value;for(const packet of s.live.packets){const w=packet.world;if(w?.type==='world_snapshot')value=w.data;else if(w?.type==='world_delta'&&value)value=applyWorldDelta(value,w);}return value;};
 assert.equal((await send({action:'travel_champions',confirmPvp:true})).status,403);
 await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET champion_level_r102=1,combat_lock_until_ms=0 WHERE id=?').run(f.id));
 assert.equal((await send({action:'travel_champions'})).status,403);const enter=await send({action:'travel_champions',confirmPvp:true});assert.equal(enter.status,200,JSON.stringify(enter));
 await until(()=>current()?.area==='champions',10000);let snapshot=current();assert(snapshot.champions?.enabled);assert(snapshot.players.some(p=>p.id===f.id));const ownMonsters=snapshot.monsters.filter(m=>m.area==='champions');assert.equal(ownMonsters.length,48);assert(ownMonsters.every(m=>m.id.startsWith('champions-')&&m.channel===1));assert(snapshot.monsters.filter(m=>m.area!=='champions').every(m=>m.is_boss===1||m.id==='dragon-world-1'),JSON.stringify(snapshot.monsters.filter(m=>m.area!=='champions')));
 const auth={adminId:'fixture-admin',reauthorize:async()=> 'fixture-admin'},bridge=s.bindings.royalR118,before=await bridge.championsAdmin({action:'champions_admin_read_r118'},auth),config=structuredClone(before.config);config.monsters.ivory_guard.name='Deneme Muhafızı';config.monsters.ivory_guard.damage=888;config.monsters.ivory_guard.xp=321;config.monsters.ivory_guard.loot.royal_crown.chance=17;
 await bridge.championsAdmin({action:'champions_admin_save_r118',revision:before.revision,config},auth);
 for(const channel of [1,2,3,4]){const cfg=await configurationSnapshot(s.supervisor.rows.get(channel),'champions-ivory-guard-c'+channel+'-01');assert.equal(cfg.config.championsR118.revision,before.revision+1);assert.equal(cfg.config.championsR118.config.monsters.ivory_guard.damage,888);assert.equal(cfg.monster.name,'Deneme Muhafızı');}
 await until(()=>current()?.champions?.revision===before.revision+1,10000);assert(s.live.packets.some(p=>p.world?.type==='world_delta'));assert.equal(s.faults.length,0,faults());
});
