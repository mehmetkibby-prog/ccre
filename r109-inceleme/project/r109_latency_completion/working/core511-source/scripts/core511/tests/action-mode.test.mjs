import test from 'node:test';
import assert from 'node:assert/strict';
import {native} from './helpers.mjs';
import {setupPvp,json,put,update,response} from './pvp-fixture.mjs';
import {createAttackRules} from '../generated/attack-rules.mjs';
import {readAttackFrame} from '../attack-writer.mjs';
import {createActionWriterHandler,actionRandom} from '../action-writer.mjs';

const tables=['players','parties','party_members','party_invites','arena_queue','arena_matches','arena_match_players','arena_kill_claims','arena_reward_claims','pve_engagements','fishing_sessions'];
const capture=sql=>Object.fromEntries(tables.map(t=>[t,json(sql.prepare('SELECT * FROM '+t+' ORDER BY rowid').all())]));
async function setup(t){
 const s=await setupPvp(t);s.sql.function('strftime',(format,clock)=>{assert.equal(format,'%s');assert.equal(clock,'now');return String(Math.floor(s.nowMs/1000));});
 const {createArenaMarket}=await native('vds-server/src/arena-market.mjs');s.globals.__colArenaMarket=createArenaMarket(s.sql,{now:()=>s.nowMs});
 s.globals.__colDragonBoss={settings:()=>({config:{enabled:true}})};s.globals.__colEventIsland444={settings:()=>({config:{enabled:true}})};
 s.globals.__colRunes={settings:()=>({config:{enabled:true}})};s.globals.__colRuneV2={settings:()=>({config:{enabled:true}})};
 return s;
}
async function parity(s,id,input){
 const frame={player:readAttackFrame(s.sql,id,'',s.globals).player,settings:s.settings},events=[],record=(...a)=>{events.push(a);},rates=[],actualRates=[];
 const rules=createAttackRules({globals:s.globals,...actionRandom(s.seed),now:()=>s.nowMs,response,ports:{publishRealtimeRoomEvent:record,publishRealtimeWorldEvent:record,publishRealtimePlayerEvent:record,deliverRealtime:v=>v,settlePveEngagement:()=>null,enforceRateLimit:(...a)=>rates.push(a)}});
 s.sql.exec('SAVEPOINT mode_oracle');const expected=await rules.nativeAction(s.db,{...frame,playerId:id,payload:input,requestReceivedAtMs:s.nowMs,now:Math.floor(s.nowMs/1000),auth:{account:{id:s.sql.prepare('SELECT account_id FROM players WHERE id=?').get(id).account_id}}}),after=capture(s.sql);s.sql.exec('ROLLBACK TO mode_oracle;RELEASE mode_oracle');
 const handler=createActionWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:()=>true,assertResources:()=>true,affectedActors:()=>s.sql.prepare('SELECT id FROM players').all().map(p=>p.id),settleRetaliation:()=>null,enforceRateLimit:(_, ...a)=>actualRates.push(a),clock:()=>s.nowMs});
 const actual=await s.f.database.atomic(sql=>handler(sql,{input,seed:s.seed,nowMs:s.nowMs,receivedAtMs:s.nowMs,expected:frame},{actor:id}));
 assert.deepEqual(json(actual.result),json(expected),input.action);assert.deepEqual(json(actual.events),json(events));assert.deepEqual(actualRates,rates);assert.deepEqual(capture(s.sql),after,input.action);return actual.result;
}
test('native party invitation, stale reject, acceptance, leader-only removal and leader succession match',async t=>{
 const s=await setup(t);s.reset({area:'forest',extras:true});const leader=s.targetId,member='rival-extra';
 assert.equal((await parity(s,leader,{action:'invite_party',targetPlayerId:member})).body.ok,true);
 await parity(s,member,{action:'reject_party',targetPlayerId:leader,createdAt:Math.floor(s.nowMs/1000)-1});assert.ok(s.sql.prepare('SELECT * FROM party_invites WHERE recipient_id=?').get(member));
 const accepted=await parity(s,member,{action:'accept_party',targetPlayerId:leader});assert.equal(accepted.body.ok,true,JSON.stringify(accepted));
 assert.equal((await parity(s,member,{action:'kick_party',targetPlayerId:leader})).status,403);
 assert.equal((await parity(s,leader,{action:'leave_party'})).body.ok,true);assert.equal(s.sql.prepare('SELECT leader_id FROM parties').get().leader_id,member);
 assert.equal((await parity(s,member,{action:'leave_party'})).body.ok,true);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM parties').get().n,0);
 await parity(s,leader,{action:'invite_party',targetPlayerId:member});await parity(s,member,{action:'reject_party',targetPlayerId:leader,createdAt:Math.floor(s.nowMs/1000)});assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM party_invites').get().n,0);
 const expired=await parity(s,member,{action:'accept_party',targetPlayerId:leader});assert.equal(expired.status,404);
});
test('native arena admission starts all four modes atomically and retains party opposition guard',async t=>{
 const s=await setup(t);
 for(const size of [1,2,3,5]){
  s.reset({area:'forest'});s.sql.exec('DELETE FROM arena_queue');
  const ids=Array.from({length:size*2},(_,i)=>i===0?s.id:i===1?s.targetId:'arena-join-'+size+'-'+i);
  for(const id of ids.slice(2))put(s.sql,'players',{id,name:id,role:'avci',level:40,hp:1000,max_hp:1000,last_seen:Math.floor(s.nowMs/1000),area:'forest',channel:1,created_at:1});
  let roomId;for(const [i,id]of ids.entries()){
   s.seed=(i+1).toString(16).repeat(64);
   const r=await parity(s,id,{action:'arena_join_queue',arenaMode:size+'v'+size,teamName:i<size?'Team Alpha':'Team Beta',...(roomId?{roomId}:{})});
   assert.equal(r.body.ok,true,JSON.stringify(r));if(!roomId)roomId=s.sql.prepare('SELECT room_id FROM arena_queue WHERE player_id=?').get(id).room_id;
   assert.equal(Boolean(r.body.matched),i===ids.length-1);
  }
  const match=s.sql.prepare('SELECT * FROM arena_matches').get();assert.equal(match.team_size,size);assert.equal(match.status,'countdown');assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM arena_match_players WHERE match_id=?').get(match.id).n,size*2);
  assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM players WHERE arena_match_id=? AND area=?').get(match.id,'arena').n,size*2);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM arena_queue').get().n,0);
  s.sql.prepare("UPDATE arena_matches SET status='finished' WHERE id=?").run(match.id);await parity(s,s.id,{action:'arena_ack_result',matchId:match.id});assert.equal(s.sql.prepare('SELECT result_seen_at_ms FROM arena_match_players WHERE player_id=? AND match_id=?').get(s.id,match.id).result_seen_at_ms,s.nowMs);
 }
 s.reset({area:'forest'});s.sql.exec('DELETE FROM arena_queue');put(s.sql,'parties',{id:'queue-allies',leader_id:s.id,created_at:1});for(const id of [s.id,s.targetId])put(s.sql,'party_members',{party_id:'queue-allies',player_id:id,joined_at:1});
 assert.equal((await parity(s,s.id,{action:'arena_join_queue',arenaMode:'1v1',teamName:'Alpha'})).body.ok,true);const roomId=s.sql.prepare('SELECT room_id FROM arena_queue WHERE player_id=?').get(s.id).room_id;
 assert.equal((await parity(s,s.targetId,{action:'arena_join_queue',arenaMode:'1v1',teamName:'Beta',roomId})).status,409);await parity(s,s.id,{action:'arena_cancel_queue'});assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM arena_queue').get().n,0);
});
test('fourteen original travel branches preserve access checks, scope revision and dragon entry cost',async t=>{
 const s=await setup(t);s.sql.exec("UPDATE game_settings SET expansion65_enabled=1;UPDATE combat_settings SET afk_island_enabled=1,frozen_zone_enabled=1;UPDATE rune_v2_settings SET config_json=json_set(config_json,'$.enabled',1);UPDATE event_island_settings444 SET config_json=json_set(config_json,'$.enabled',1)");Object.assign(s.settings,{expansion65_enabled:1,afk_island_enabled:1,frozen_zone_enabled:1});
 for(const action of ['travel_event','travel_dragon','travel_rune_v2','travel_rune','travel_ancient','travel_afk','travel_market','travel_forest','travel_frozen','travel_fishing','travel_sanctum','travel_sinsi','travel_war','travel_black']){
  s.reset({area:'forest',actor:{level:65,rank_tier:1,red_pearls:1,gems:1000,essence:200}});const before=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id),r=await parity(s,s.id,{action,confirmPvp:true});assert.equal(r.body.ok,true,action+JSON.stringify(r));const after=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id);assert.equal(after.realtime_scope_version,before.realtime_scope_version+1);
  if(action==='travel_dragon'){assert.equal(after.red_pearls,0);assert.equal(after.gems,900);assert.equal(after.essence,0);assert.equal((await parity(s,s.id,{action})).body.ok,true);assert.equal(s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems,900);}
 }
 s.reset({area:'forest',actor:{level:65,rank_tier:1}});assert.equal((await parity(s,s.id,{action:'travel_rune_v2'})).body.code,'rune_v2_pvp_confirmation_required');update(s.sql,'players',s.id,{combat_lock_until_ms:s.nowMs+1});assert.equal((await parity(s,s.id,{action:'travel_forest'})).status,409);
});
