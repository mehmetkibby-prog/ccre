import {arenaWingsOwned477,arenaWingsActive477,grantArenaWings477,resumeArenaWings477,projectArenaWingAppearance477} from '../../lib/arena-wings477.mjs';
import {deferDatabaseBackgroundTask} from './database.mjs';

// All reads for one member remain in the same synchronous turn. A sweep may
// yield between members, but it must never apply a captured/stale player row.
export function refreshDungeonMember({engine, database, premium, guildSkill, ranks}, _run, member) {
 const owner=engine.player(member.id);if(!owner)return;
 const arenaActive477=arenaWingsActive477(owner,engine.now()),arenaExpiry477=owner.arena_wings_expires_at_ms??0;
 if((owner.gm_visibility_revision||0)>=(member.visibilityRevision||0)){
  member.gmInvisible=owner.is_gm===1&&owner.gm_invisible===1;
  member.visibilityRevision=owner.gm_visibility_revision||0;
 }
 // Reconcile an admin reset in the existing serialized member refresh.
 // No new read, timer or stats rebuild; training, HP and cooldowns are retained.
 if(member.stats?.specialization&&!owner.specialization){member.stats.specialization='';member.stats.branch456=null;member.specialGuardUntil=0;}
 const refreshStats=()=>{member.stats=engine.statsFor(owner);member.maxHp=member.stats.maxHp;member.hp=Math.min(member.hp,member.maxHp);};
 if(member.runeRevision!==globalThis.__colRunes?.settings().revision||member.statusRevision!==globalThis.__colStatus?.settings().revision){refreshStats();member.runeRevision=globalThis.__colRunes?.settings().revision;member.statusRevision=globalThis.__colStatus?.settings().revision;}
 const pet=database.prepare("SELECT kind,name FROM player_pets WHERE player_id=? AND equipped=1 AND acquired_at+(CASE WHEN kind=char(115,116,97,114,116,101,114) THEN 259200 ELSE 604800 END)>unixepoch()").get(member.id);
 if(member.appearance&&member.appearance.petKind!==pet?.kind){refreshStats();member.appearance.petKind=pet?.kind;member.appearance.petName=pet?.name;}
 const premiumBuff=premium.buff(member.id);
 if(member.appearance&&(member.appearance.premiumBuff?.hp!==premiumBuff.hp||member.appearance.premiumBuff?.radiant!==premiumBuff.radiant||member.appearance.premiumBuff?.attack!==premiumBuff.attack||member.stats?.arenaWingsActive477!==arenaActive477||member.stats?.arenaWingsExpiresAt477!==arenaExpiry477)){refreshStats();member.appearance.premiumBuff=premiumBuff;}
 if(member.appearance?.rank&&member.appearance.rank.arenaWings!==arenaActive477)member.appearance.rank={...member.appearance.rank,arenaWings:arenaActive477};
 const buff=guildSkill.bonuses(member.id);
 if(member.appearance&&member.appearance.guildBuff?.until!==buff.until){refreshStats();member.appearance.guildBuff=buff;}
 if(member.appearance&&(member.rankRevision!==ranks.settings().revision||member.appearance.rank?.tier!==owner.rank_tier||member.rankCosmetics!==owner.rank_cosmetics)){
  refreshStats();member.appearance.rank=ranks.appearance(member.id);member.rankRevision=ranks.settings().revision;member.rankCosmetics=owner.rank_cosmetics;
 }
 const costume=!!database.prepare("SELECT 1 FROM player_items WHERE player_id=? AND kind='costume' AND equipped=1").get(member.id),weapon=!!owner.weapon_skin_enabled;
 if(member.appearance&&(member.appearance.costume!==costume||member.appearance.weaponSkin!==weapon||member.appearance.wings!==!!owner.wings_equipped)){
  refreshStats();member.appearance.costume=costume;member.appearance.weaponSkin=weapon;member.appearance.wings=!!owner.wings_equipped;
 }
}

// Dungeon simulation runs every 33 ms. Disk checkpoints and cosmetic/stat
// refreshes must not accumulate all rooms' synchronous work in that callback.
// Save the live run at execution time; a finish/reset must never be resurrected
// by an older queued snapshot. Atomic transitions/rewards bypass this queue.
export function createDungeonMaintenance({engine, database, premium, guildSkill, ranks,
 available=()=>true, defer=deferDatabaseBackgroundTask, persist=run=>engine.save(run),
 refreshMember=(run,member)=>refreshDungeonMember({engine,database,premium,guildSkill,ranks},run,member),
 onError=(error,label)=>console.error('Dungeon maintenance retry',label,error.message),onWork=()=>{},now=Date.now}={}) {
 const saves=new Map(),refreshes=[],lastErrors=new Map();let pumping=null;
 const live=run=>engine.runs.get(run.id)===run;
 const clear=()=>{saves.clear();refreshes.length=0;};
 const start=()=>{
  if(pumping)return pumping;
  pumping=(async()=>{
   while(saves.size||refreshes.length){
    await defer(async()=>{
     if(!available()){clear();return;}
     const entry=saves.entries().next().value;
     const label=entry?'dungeon_checkpoint':'dungeon_member_refresh';
     const started=performance.now();
     try{
      if(entry){
       const [id,run]=entry;saves.delete(id);
       if(live(run)&&engine.now()-(engine.lastSave.get(id)??0)>=1000)await persist(run);
      }else{
       const {run,member}=refreshes.shift();
       if(live(run)&&run.members.includes(member))refreshMember(run,member);
      }
     }catch(error){
      const at=now();
      if(at-(lastErrors.get(label)??-Infinity)>=5000){lastErrors.set(label,at);onError(error,label);}
     }finally{onWork(label,performance.now()-started,performance.timeOrigin+started,undefined,!entry);}
    });
   }
  })().catch(error=>{clear();onError(error,'dungeon_scheduler');}).finally(()=>{pumping=null;});
  return pumping;
 };
 return {
  checkpoint(run){if(!available()||!live(run))return;saves.set(run.id,run);void start();},
  refresh(){
   if(!available()||refreshes.length)return;
   for(const run of engine.runs.values())for(const member of run.members)refreshes.push({run,member});
   if(refreshes.length)void start();
  },
  whenIdle(){return pumping??Promise.resolve();},
 };
}

// Recoverable checkpoints share the primary async-WAL lane. Commands,
// transitions, exits and rewards keep their existing synchronous FULL path.
export function createDungeonCheckpointWriter(engine,database){
 return async run=>{
  if(engine.runs.get(run.id)!==run)return;
  const expected=engine.persistedAt.get(run.id);
  if(expected===undefined)return;
  const stamp=Math.max(engine.now(),expected+1),state=engine.measure('dungeon_serialize',()=>JSON.stringify(run));
  const started=performance.now();
  const [result]=await database.batch([database.prepare(
   'UPDATE dungeon_runs SET state=?,updated_at=? WHERE id=? AND status=? AND updated_at=?'
  ).bind(state,stamp,run.id,run.status,expected)]);
  if(result.meta.changes&&engine.persistedAt.get(run.id)===expected){engine.persistedAt.set(run.id,stamp);engine.lastSave.set(run.id,engine.now());}
  engine.onWork('dungeon_save',performance.now()-started,performance.timeOrigin+started,Buffer.byteLength(state),false);
 };
}
