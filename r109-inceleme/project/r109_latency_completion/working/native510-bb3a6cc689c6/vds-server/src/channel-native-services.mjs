import {createAdminPlayerReset495} from './admin-player-reset495.mjs';
import {createEnhancement491} from './enhancement-engine491.mjs';
import {createCauldron488} from './cauldron-engine488.mjs';
import {createRuneV2} from './rune-v2.mjs';
import {createAdminGuildReset470} from './admin-guild-reset470.mjs';
import {ensureEventIsland444,createEventIsland444} from './event-island444.mjs';
import {ensureQuests438Schema,createQuests438} from './quests438.mjs';
import {ensureBattlePassSchema,createBattlePass} from './battle-pass.mjs';
import {ensureStatusSchema,createStatus} from './status.mjs';
import {ensureGameplay425Schema,createMonsterRanking} from './gameplay425.mjs';
import {ensureArenaMarketSchema,createArenaMarket} from './arena-market.mjs';
import {createRunes} from './runes.mjs';
import {cachePreparedStatements} from './prepared-cache.mjs';
import {createProgressionSettings} from './progression-settings.mjs';
import {createCommunityEvent} from './community-event.mjs';
import {createOnboarding} from './onboarding.mjs';
import {createEvolutionQuest} from './first-evolution-quest.mjs';
import {createRanks} from './ranks.mjs';
import {createDragonBoss} from './dragon-boss.mjs';
import {ItemLinks} from './item-links.mjs';
import {PlayerTrade} from './player-trade.mjs';
import {createStorage} from './storage.mjs';
import {createBotCheck} from './bot-check.mjs';
import {createLaunchService} from './launch-service.mjs';
import {createLaunchEmailService} from './launch-email.mjs';
import {createLevelRanking} from './level-ranking.mjs';
import {createStarterReward} from './starter-reward.mjs';
import {DungeonEngine} from './dungeon-engine.mjs';
import {createGuildVillage} from './guild-village.mjs';
import {PremiumEngine} from './premium-engine.mjs';
import {createGuildVoice} from './guild-voice.mjs';
import {createGuildSkill} from './guild-skill.mjs';

// Service construction only. In particular this function has NO clocks and
// does not start a dungeon, voice sweep, world tick, memory flush or push loop.
export function initializeChannelNativeServices(sqlite,{realmRuntime,database,readOnly=false,coordinatorOnly=false}={}){
 if(readOnly&&process.env.CORE_PREPARED_CACHE!=='0')cachePreparedStatements(sqlite);
 globalThis.__colEquipmentSets=true;
 globalThis.__colProgression=createProgressionSettings(sqlite);
 globalThis.__colCommunityEvent=createCommunityEvent(sqlite);
 globalThis.__colOnboarding=createOnboarding(sqlite);
 globalThis.__colEvolutionQuest=createEvolutionQuest(sqlite);
 globalThis.__colRanks=createRanks(sqlite);
 globalThis.__colQuests438=createQuests438(sqlite);globalThis.__colBattlePass=createBattlePass(sqlite);globalThis.__colCauldron488=createCauldron488(sqlite);globalThis.__colEnhancement491=createEnhancement491(sqlite);globalThis.__colStatus=createStatus(sqlite);globalThis.__colRunes=createRunes(sqlite);globalThis.__colRuneV2=createRuneV2(sqlite);globalThis.__colEventIsland444=createEventIsland444(sqlite);globalThis.__colArenaMarket=createArenaMarket(sqlite);
 globalThis.__colDragonBoss=createDragonBoss(sqlite);
 globalThis.__colItemLinks=new ItemLinks(sqlite);
 globalThis.__colPlayerTrade=new PlayerTrade(sqlite);
 globalThis.__colStorage=createStorage(sqlite);
 const player=sqlite.prepare('SELECT area,arena_match_id FROM players WHERE account_id=?');
 globalThis.__colBotCheck=createBotCheck(sqlite,{exempt:id=>{const player476=player.get(id);return player476?.area==='afk';},...(readOnly?{write:(sql,params)=>database.prepare(sql).bind(...params).run()}:{})});
 globalThis.__colLaunch=createLaunchService(sqlite);
 if(realmRuntime){
  const local=globalThis.__colLaunch;
  const playable=id=>{const e=realmRuntime.security.entries.get(id);return realmRuntime.policy?.status==='open'&&e&&realmRuntime.security.allows(id,e.version);};
  globalThis.__colLaunch={...local,status:id=>({...local.status(id),...realmRuntime.policy?.launch,...(realmRuntime.maintenance?.policy?{phase:realmRuntime.maintenance.policy.phase,maintenanceText:realmRuntime.maintenance.policy.maintenanceText,maintenanceDeadlineMs:realmRuntime.maintenance.policy.deadlineMs}:{}),showLanding:['waiting','ended','maintenance'].includes(realmRuntime.maintenance?.policy?.phase??realmRuntime.policy?.launch?.phase)&&!realmRuntime.maintenance?.isGameMaster(id),canPlay:id?!!playable(id):realmRuntime.maintenance?.policy?.phase!=='maintenance'}),deadline:id=>playable(id)?realmRuntime.maintenance.deadline(id):Date.now()};
 }
 if(!readOnly)globalThis.__colLaunchEmail=createLaunchEmailService(sqlite);
 globalThis.__colLevelRanking=createLevelRanking(sqlite);globalThis.__colMonsterRanking=createMonsterRanking(sqlite);
 globalThis.__colStarterReward=createStarterReward(sqlite,{initialize:!readOnly});
 if(!readOnly&&!coordinatorOnly)globalThis.__colDungeon=new DungeonEngine(sqlite);
 if(coordinatorOnly){
  // Administrative reads/grants and membership locks, without creating a
  // simulation engine, run map or timer on the writer process.
  const admin={db:sqlite,now:Date.now};
  for(const name of ['settings','admin','material','materials','membership','locked'])admin[name]=DungeonEngine.prototype[name].bind(admin);
  globalThis.__colDungeon=admin;
 }
 globalThis.__colGuildVillage=createGuildVillage(sqlite,{dungeonLocked:id=>globalThis.__colDungeon?.locked(id)??false});
 globalThis.__colPremium=new PremiumEngine(sqlite);
 globalThis.__colGuildVoice=createGuildVoice(sqlite);
 globalThis.__colGuildSkill=createGuildSkill(sqlite,{refreshHp:id=>coordinatorOnly?globalThis.__colChannelPermanent([id],()=>globalThis.__colPremium.refreshHp(id)):globalThis.__colPremium.refreshHp(id)});
 if(coordinatorOnly)globalThis.__colGuildSkill.sync=()=>globalThis.__colGuildSkill.syncInBackground();
 if(coordinatorOnly)globalThis.__colAdminPlayerReset495=createAdminPlayerReset495(sqlite,{permanent:(ids,operation)=>globalThis.__colChannelPermanent(ids,operation),refreshHp:id=>globalThis.__colPremium.refreshHp(id),repairHall:id=>globalThis.__colGuildVillage.repair(id),sweepVoice:()=>globalThis.__colGuildVoice.sweep()});
 if(coordinatorOnly)globalThis.__colAdminGuildReset470=createAdminGuildReset470(sqlite,{permanent:(ids,operation)=>globalThis.__colChannelPermanent(ids,operation),refreshHp:id=>globalThis.__colPremium.refreshHp(id),repairHall:id=>globalThis.__colGuildVillage.repair(id),sweepVoice:()=>globalThis.__colGuildVoice.sweep()});
}
