import {createContentSchemaR102} from '../content-config-r102.mjs';
import {BASE,SHA,native} from './helpers.mjs';
import {nativeAtomicStatements} from '../retaliation-writer.mjs';
import {createAttackRules} from '../generated/attack-rules.mjs';
import {PvpMemory} from '../pvp-memory.mjs';
import {AggroMemory} from '../aggro-memory.mjs';
import {attackRandom} from '../attack-writer.mjs';
process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {fixture}=await import('../../perf-r11/tests/reward/fixture.mjs');
const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');
export const json=x=>JSON.parse(JSON.stringify(x));
export const response={json:(body,{status=200,headers}={})=>({body,status,headers,json:()=>body})};
export const put=(sql,table,row)=>sql.prepare('INSERT INTO '+table+'('+Object.keys(row).join(',')+') VALUES('+Object.keys(row).map(()=>'?').join(',')+')').run(...Object.values(row));
export const update=(sql,table,id,row)=>sql.prepare('UPDATE '+table+' SET '+Object.keys(row).map(k=>k+'=?').join(',')+' WHERE id=?').run(...Object.values(row),id);
export async function setupPvp(t){
 const f=await fixture();t.after(()=>f.close());const sql=f.database.sqlite,db=nativeAtomicStatements(sql),id='real-1',targetId='rival-511',nowMs=Date.now();installRegistry({now:()=>nowMs});createContentSchemaR102(sql);
 const settings={...sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()},globals={};
 for(const pid of [targetId,'rival-extra'])put(sql,'players',{id:pid,name:pid,role:'avci',area:'war',channel:1,x:1000,y:1000,hp:1000000,max_hp:1000000,level:40,last_seen:Math.floor(nowMs/1000),created_at:1});
 const seed='7'.repeat(64),factory=()=>createAttackRules({globals,now:()=>nowMs});
 function reset({role='avci',ability=0,area='war',actor={},victim={},extras=false,mixed=false}={}){
  sql.exec('DELETE FROM combat_events;DELETE FROM pve_engagements;DELETE FROM party_members;DELETE FROM parties;DELETE FROM arena_match_players;DELETE FROM arena_matches;DELETE FROM arena_kill_claims;DELETE FROM arena_reward_claims;DELETE FROM arena_announcements;DELETE FROM war_kill_claims;DELETE FROM pvp_reward_cooldowns;');
  // This fixture isolates PvP; mixed tests explicitly activate their monsters.
  sql.prepare("UPDATE monsters SET hp=0 WHERE area IN ('black','rune_v2')").run();
  for(const [pid,patch]of [[id,actor],[targetId,victim],['rival-extra',{x:1150,last_seen:extras?Math.floor(nowMs/1000):1}]])update(sql,'players',pid,{role:pid===id?role:'avci',level:40,area,channel:1,arena_match_id:'',x:1000,y:1000,hp:pid===id?800:1000000,max_hp:pid===id?1000:1000000,hp_revision:0,respawn_at_ms:0,gems:1000,skill_one:5,skill_two:5,skill_three:5,skill_four:5,stun_until_ms:0,root_until_ms:0,attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0,special_guard_until_ms:0,specialization:'',rod_equipped:0,combat_lock_until_ms:0,last_monster_hit_at:0,last_seen:Math.floor(nowMs/1000),...patch});
  if(area==='arena'){
   put(sql,'arena_matches',{id:'pvp-match',mode:'1v1',team_size:1,status:'active',world_cycle:1,channel:1,team_a_name:'A',team_b_name:'B',starts_at_ms:nowMs-1000,created_at_ms:nowMs-1000,updated_at_ms:nowMs-1000,kill_target:3,reward_gems:100});
   for(const pid of [id,targetId,'rival-extra']){update(sql,'players',pid,{arena_match_id:'pvp-match'});put(sql,'arena_match_players',{id:'member-'+pid,slot:1,joined_at_ms:nowMs-1000,match_id:'pvp-match',player_id:pid,team:pid===id?1:2});}
  }
  const rules=factory(),frame=rules.hydratePvp(db,id,targetId,Math.floor(nowMs/1000));frame.player.pet_kind=null;frame.settings=settings;
  const view=new AggroMemory({channel:1,cycle:1,now:()=>nowMs}),frames=new Map();for(const p of sql.prepare('SELECT * FROM players').all()){view.setPlayer(p);const f=rules.hydratePvp(db,p.id,id,Math.floor(nowMs/1000));frames.set(p.id,{...f.player,pet_kind:null});}
  const party=new Map(sql.prepare('SELECT * FROM party_members').all().map(p=>[p.player_id,p.party_id])),arenas=new Map(sql.prepare('SELECT * FROM arena_matches').all().map(p=>[p.id,p])),teams=new Map(sql.prepare('SELECT * FROM arena_match_players').all().map(p=>[p.match_id+':'+p.player_id,p.team]));
  const context={actionSnapshot:frame,playerId:id,payload:{action:'pvp_attack',targetPlayerId:targetId,ability,intentId:'pvp-test'},requestReceivedAtMs:nowMs};
  const oldEvents=[];let original;original=createAttackRules({globals,now:()=>nowMs,...attackRandom(seed),response,ports:{releasePvpCommit:()=>{},pvpContinuity:c=>original.nativeContinuity(db,frame,c),readActionSnapshot:(_,p,actor)=>({...original.hydratePvp(db,actor,p.targetPlayerId,Math.floor(nowMs/1000)),settings}),publishRealtimeRoomEvent:(...a)=>{oldEvents.push(a);},publishRealtimePlayerEvent:(...a)=>{oldEvents.push(a);},deliverRealtime:v=>v,selectMixedMonsters473:()=>[]}});
  const memory=new PvpMemory({view,globals,frameFor:pid=>frames.get(pid),players:()=>[...view.players.values()],party:pid=>party.get(pid),arena:key=>arenas.get(key),team:(match,pid)=>teams.get(match+':'+pid),dragon:()=>null,pet:()=>null,changedArenaLife:()=>false,blocked:()=>false,cycle:()=>1,mixedPorts:mixed?{}:{selectMixedMonsters473:()=>[]}});
  return {context,view,frames,memory,original,oldEvents,party,arenas,teams};
 }
 return {f,sql,db,id,targetId,nowMs,settings,globals,seed,reset};
}
