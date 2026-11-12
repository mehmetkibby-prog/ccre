import {nativeEngagementR53} from './r53-options.mjs';
import {createAttackWriterRules} from './generated/attack-writer-rules.mjs';
import {nativeAtomicStatements,readRetaliationFrame} from './retaliation-writer.mjs';
import {demand} from './contract.mjs';
import {createRuneBossRules} from './generated/rune-boss-rules.mjs';
import {readHeartbeatState} from './heartbeat-writer.mjs';
import {nativeRankedHit,runeV2RealPlayerSql483} from './generated/combat-guards.mjs';

const monsterFields=['id','name','x','y','hp','max_hp','respawn_at','variant','is_boss','despawn_at','spawn_round','area','channel','is_stone','wave_stage','summoned','parent_stone_id','root_until_ms','stun_until_ms','control_x','control_y'];
const retaliationFields=['id','name','x','y','hp','max_hp','respawn_at','variant','is_boss','despawn_at','spawn_round','area','channel','is_stone','loadlab_run_id','stun_until_ms','wave_stage','summoned','parent_stone_id'];
const pick=(row,keys)=>{if(!row)return row;const value={};for(const k of keys)value[k]=row[k];return value;};
const frozen=row=>row&&Object.freeze({...row});
const admissionRules=createAttackWriterRules({globals:{}});
const runeReadRules=createRuneBossRules();

// Read on admission or after a fenced equipment/service change. A read worker
// may execute this against a consistent SQLite snapshot; no function below the
// CombatFrames class can reach a database. Dead actors still get their gear
// projection so respawn needs no SQL in its first subsequent combat tick.
export function readCombatBundle(sql,actor,{revision,nowMs=Date.now()}={}){
 demand(Number.isSafeInteger(revision)&&revision>=0,'combat_bundle_revision');const db=nativeAtomicStatements(sql),retaliation=readRetaliationFrame(sql,actor,[]);
 const actorFrame=admissionRules.hydrateAttack(db,actor,'').player,targetFrame=admissionRules.hydrateCombatTarget(db,actor);demand(actorFrame&&targetFrame&&retaliation.player,'combat_bundle_missing_actor');
 const lab=sql.prepare("SELECT length(loadlab_run_id)>0 OR EXISTS(SELECT 1 FROM loadlab_entities_v1 e WHERE e.id=players.id OR e.account_id=players.account_id) OR EXISTS(SELECT 1 FROM loadlab_admissions_v1 a WHERE a.account_id=players.account_id) AS associated FROM players WHERE id=?").get(actor);
 const runeRankEligible=sql.prepare(`SELECT CASE WHEN ${runeV2RealPlayerSql483('p')} THEN 1 ELSE 0 END AS eligible FROM players p WHERE p.id=?`).get(actor)?.eligible===1;
 const arenaLife=actorFrame.arena_match_id?sql.prepare('SELECT MAX(victim_hp_revision) AS revision FROM arena_kill_claims WHERE match_id=? AND victim_id=?').get(actorFrame.arena_match_id,actor).revision:null;
 return {actor,revision,at:nowMs,actorFrame,targetFrame,retaliationPlayer:retaliation.player,armorItems:retaliation.armorItems.results,heartbeatState:readHeartbeatState(sql,actor),runeRankEligible,arenaLife,runeArmorJson:runeReadRules.readPlayers(db,[actor],actorFrame.channel)[0]?.armor_json484??'[]',pets:sql.prepare('SELECT kind,acquired_at,equipped FROM player_pets WHERE player_id=? AND equipped=1').all(actor),labAssociated:Boolean(lab?.associated),afk:sql.prepare('SELECT day,used_ms,bonus_ms,active,tick_at_ms FROM afk_hunt_state WHERE player_id=?').get(actor)??null};
}

export class CombatFrames{
 constructor({view,settings,world,party,arena,team,participants,now=Date.now}){
  for(const fn of [settings,world,party,arena,team,participants])demand(typeof fn==='function','combat_frame_dependencies');Object.assign(this,{view,settings,world,party,arena,team,participants,now});this.entries=new Map();this.profiles=new Map();this.profileRevision=-1;this.metrics={projections:0,cacheHits:0,sqlReads:0};
 }
 hydrate(bundle){demand(bundle?.actor&&Number.isSafeInteger(bundle.revision),'invalid_combat_bundle');const previous=this.entries.get(bundle.actor);demand(!previous||bundle.revision>=previous.revision,'combat_bundle_stale');this.entries.set(bundle.actor,{...bundle,actorFrame:frozen(bundle.actorFrame),targetFrame:frozen(bundle.targetFrame),retaliationPlayer:frozen(bundle.retaliationPlayer),armorItems:Object.freeze(bundle.armorItems.map(frozen)),pets:Object.freeze(bundle.pets.map(frozen)),valid:true,cache:new Map()});}
 invalidate(id){const entry=this.entries.get(id);demand(entry,'combat_frame_missing');entry.valid=false;entry.cache.clear();}
 remove(id){this.entries.delete(id);}
 entry(id){const e=this.entries.get(id);demand(e?.valid,'combat_frame_stale');return e;}
 rankingEligible(player,monster){
  const entry=this.entry(player.id);demand(typeof entry.runeRankEligible==='boolean','combat_rank_snapshot');return nativeRankedHit(player,monster,entry.runeRankEligible);
 }
 changedArenaLife(original,candidate){
  if(original.player.area!=='arena'||original.player.hp_revision===candidate.player.hp_revision&&original.preloadedPvpTarget.hp_revision===candidate.preloadedPvpTarget.hp_revision)return false;
  return [original.player,original.preloadedPvpTarget].some(player=>{const entry=this.entry(player.id);demand(Object.hasOwn(entry,'arenaLife')&&entry.actorFrame.arena_match_id===original.player.arena_match_id,'combat_arena_snapshot');return entry.arenaLife!==null&&entry.arenaLife>player.hp_revision;});
 }
 setProfiles(rows,revision){demand(Number.isSafeInteger(revision)&&revision>=this.profileRevision,'combat_profile_stale');const next=new Map();for(const row of rows){const key=JSON.stringify([row.area,row.variant,row.family]);demand(!next.has(key),'combat_profile_ambiguous');next.set(key,row.hit_damage);}this.profiles=next;this.profileRevision=revision;}
 pet(id,time=this.now()){const e=this.entry(id),seconds=Math.floor(time/1000);return e.pets.find(p=>p.acquired_at+(p.kind==='starter'?259200:604800)>seconds)?.kind??null;}
 dragon(id,time=this.now()){return this.entry(id).pets.some(p=>p.kind==='dragon'&&p.acquired_at+604800>Math.floor(time/1000))?{active:1}:null;}
 frame(id,kind='actorFrame',view=this.view,time=this.now()){
  const entry=this.entry(id),row=view.player(id);if(!row)return null;const world=this.world(),pet=kind==='actorFrame'?this.pet(id,time):null,cached=entry.cache.get(kind);
  if(cached?.row===row&&(!nativeEngagementR53||Object.isFrozen(row))&&cached.cycle===world.cycle&&cached.reset===world.reset_at&&cached.pet===pet){this.metrics.cacheHits++;return cached.value;}
  const template=entry[kind],value={};for(const k of Object.keys(template))value[k]=Object.hasOwn(row,k)?row[k]:template[k];
  if(kind!=='targetFrame')value.world_cycle=world.cycle;
  if(kind==='actorFrame'){value.reset_at=world.reset_at;value.pet_kind=pet;}
  if(kind==='retaliationPlayer')value.rune_v2_test483=row.area==='rune_v2'?Number(Boolean(row.loadlab_run_id||entry.labAssociated)):0;
  Object.freeze(value);entry.cache.set(kind,{row,cycle:world.cycle,reset:world.reset_at,pet,value});this.metrics.projections++;return value;
 }
 attack(id,payload,receivedAtMs,now=this.now()){
  const player=this.frame(id,'actorFrame',this.view,now),monster=this.view.monster(payload.targetId);demand(player,'combat_actor_missing');return {player,playerId:id,payload,settings:this.settings(id),attackTargetId:typeof payload.targetId==='string'?payload.targetId:'',preloadedAttackMonster:pick(monster,monsterFields),requestReceivedAtMs:receivedAtMs,now:Math.floor(now/1000),auth:{account:{id:this.view.player(id).account_id}}};
 }
 pvp(id,payload,receivedAtMs,now=this.now()){
  const player=this.frame(id,'actorFrame',this.view,now),targetId=typeof payload.targetPlayerId==='string'&&/^[a-zA-Z0-9-]{8,64}$/.test(payload.targetPlayerId)?payload.targetPlayerId:'',target=this.view.player(targetId);demand(player,'combat_actor_missing');
  const visible=target&&target.hp>0&&target.last_seen>=Math.floor(now/1000)-30&&target.area===player.area&&target.channel===player.channel&&(player.area!=='arena'||target.arena_match_id&&target.arena_match_id===player.arena_match_id);
  const match=targetId&&player.area==='arena'?this.arena(player.arena_match_id):null,attackerTeam=match?this.team(match.id,id):null,targetTeam=match?this.team(match.id,targetId):null;
  return {playerId:id,payload,requestReceivedAtMs:receivedAtMs,actionSnapshot:{player,settings:this.settings(id),preloadedPvpTarget:visible?this.frame(targetId,'targetFrame',this.view,now):null,preloadedPvpArena:match&&attackerTeam!=null&&targetTeam!=null?{...match,attacker_team:attackerTeam,target_team:targetTeam}:null,pvpTargetId:targetId}};
 }
 retaliation(id,entries,view=this.view){
  demand(this.profileRevision>=0,'combat_profiles_missing');const bundle=this.entry(id),monsters=[];
  for(const entry of entries){const m=view.monster(entry.monster_id);if(!m)continue;let exact=null;
   if(['forest','frozen','black','ancient'].includes(m.area)&&['normal','agresif','katil'].includes(m.variant)&&m.summoned===0&&m.is_boss===0&&m.is_stone===0){const lower=m.id.toLowerCase(),family=m.area==='black'?'slot'+m.id.slice(-1):lower.startsWith('golge-')?'golge':lower.startsWith('curuk-')?'curuk':lower.startsWith('yutan-')?'yutan':null;exact=this.profiles.get(JSON.stringify([m.area,m.variant,family]))??null;}
   monsters.push({...pick(m,retaliationFields),exact_hit_damage:exact,provoked:Number(this.participants(id,m.id,m.spawn_round))});
  }
  return {player:this.frame(id,'retaliationPlayer',view),monsters,monsters489:{results:monsters},armorItems:{results:bundle.armorItems}};
 }
}
