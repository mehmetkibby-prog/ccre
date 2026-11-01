import {defaultLootTemplateR87} from '../default-loot-cache-r87.mjs';
import {CASTLE_AREA,castleEnabled} from '../castle-model-r59.mjs';
import {readEventConfigR86} from '../event-config-cache-r86.mjs';
import {groundLoot30s,GROUND_LOOT_SECONDS,groundLootExpired} from '../ground-loot-expiry.mjs';
// R31 fixed belt catalogue; generated extraction remains otherwise intact.
import {beltStats} from '../belt-model.mjs';
import {beltBonusSql,beltXpSql} from '../belt-statistics.mjs';
import {isAdventureArea,isMistArea,adventureBounds,adventureWalkable,adventureSegment,adventureMonsterId} from '../adventure-maps.mjs';
import {RUNE_V2_AREA} from "../../../../native510-bb3a6cc689c6/lib/rune-v2.mjs";
import {RUNE_LOOT_LABELS} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {EVENT_BOSSES444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {EVENT_SPAWN444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {EVENT_WORLD444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {RUNE_GATE_MESSAGE} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {RUNE_SPAWN} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {RUNE_TYPES} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {RUNE_WORLD} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {STONE_MIXED_PARTICIPANT_SQL476} from "../../../../native510-bb3a6cc689c6/lib/stone-boss-ranking476.mjs";
import {STONE_PARTICIPANT_SQL476} from "../../../../native510-bb3a6cc689c6/lib/stone-boss-ranking476.mjs";
import {STONE_WINNER_GEMS_SQL476} from "../../../../native510-bb3a6cc689c6/lib/stone-boss-ranking476.mjs";
import {balanceArea487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {balanceFactor487,levelExemptEnabledR58} from "../level-rewards-r58.mjs";
import {balanceFromSnapshot487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {balanceSnapshot487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {balanceXpSql487} from "../level-rewards-r58.mjs";
import {battlePassXpSql} from "../../../../native510-bb3a6cc689c6/lib/battle-pass.mjs";
import {catalogMultiplier487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {cauldronDropSnapshot488} from "../../../../native510-bb3a6cc689c6/lib/cauldron488.mjs";
import {cauldronDropStatements488} from "../../../../native510-bb3a6cc689c6/lib/cauldron488.mjs";
import {colLabAssertPlans} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabBossMonster} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabIsMonster} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabIsPlayer} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabMayAffectMonster} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabMayAffectPlayer} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabMonsterSource} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabNormalRespawnSecondsR10} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabRewardDatabase} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabTagReward} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabTagWarReward} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {skillFourGrowth456 as colSkillGrowth456} from "../../../../native510-bb3a6cc689c6/lib/expansion456.mjs";
import {specialization456 as colSpec456} from "../../../../native510-bb3a6cc689c6/lib/expansion456.mjs";
import {defaultBalance487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {defaultSpecialistSkills459} from "../../../../native510-bb3a6cc689c6/lib/specialist-skills459.mjs";
import {dragonMixedParticipant498} from "../../../../native510-bb3a6cc689c6/lib/dragon-ranking498.mjs";
import {dragonParticipant498} from "../../../../native510-bb3a6cc689c6/lib/dragon-ranking498.mjs";
import {equipmentTotalsR18} from "../../../../native510-bb3a6cc689c6/vds-server/src/perf-r18-pure.mjs";
import {eventOccurrence499} from "../../../../native510-bb3a6cc689c6/lib/event-queue499.mjs";
import {eventSegment444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {eventWalkable444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {forgeDropSnapshot491} from "../../../../native510-bb3a6cc689c6/lib/forge-material491.mjs";
import {forgeDropStatements491} from "../../../../native510-bb3a6cc689c6/lib/forge-material491.mjs";
import {isDragonRankBoss498} from "../../../../native510-bb3a6cc689c6/lib/dragon-ranking498.mjs";
import {isRuneV2Boss as nativeRuneV2Boss} from "../../../../native510-bb3a6cc689c6/lib/rune-v2.mjs";
import {materialLevelItem498} from "../../../../native510-bb3a6cc689c6/lib/material-level498.mjs";
import {materialLevelPolicy498} from "../../../../native510-bb3a6cc689c6/lib/material-level498.mjs";
import {normalizeEventQueue499} from "../../../../native510-bb3a6cc689c6/lib/event-queue499.mjs";
import {optimizeR18} from "../../../../native510-bb3a6cc689c6/vds-server/src/perf-r18-features.mjs";
import {pveArmSql489} from "../../../../native510-bb3a6cc689c6/vds-server/src/pve-multi489.mjs";
import {questKillSql438} from "../../../../native510-bb3a6cc689c6/lib/quests438.mjs";
import {questMonsterEligible438 as nativeQuestMonsterEligible438} from "../../../../native510-bb3a6cc689c6/lib/quests438.mjs";
import {runeEligible} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {runeLootSnapshot498} from "../../../../native510-bb3a6cc689c6/lib/rune-material498.mjs";
import {runeV2MixedParticipant483} from "../../../../native510-bb3a6cc689c6/lib/rune-v2-ranking.mjs";
import {runeV2Participant483} from "../../../../native510-bb3a6cc689c6/lib/rune-v2-ranking.mjs";
import {runeWalkable} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {runeWalkableSegment} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {scaleLootGroups487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {validateBalance487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {validateSpecialistSkills459} from "../../../../native510-bb3a6cc689c6/lib/specialist-skills459.mjs";
import {createLootProfileCacheR61} from '../loot-profile-cache-r61.mjs';
const ambient=globalThis;
export function createAttackWriterRules({random=Math.random,now=Date.now,globals,uuid=()=>ambient.crypto.randomUUID(),getRandomValues=array=>ambient.crypto.getRandomValues(array),fourChannels=false,ports={},response=ambient.Response}={}){
if(!globals)throw Error("attack_globals_required");const globalThis=globals,Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}},crypto={randomUUID:uuid,getRandomValues},Response=response;
const Promise={all:values=>values.map(syncValue),allSettled:values=>values.map(value=>({status:"fulfilled",value:syncValue(value)}))};function syncValue(value){if(value?.then)throw Error("async_native_attack_boundary");return value;}
const lootProfileCacheR61=createLootProfileCacheR61();
const env={CORE_RUNTIME:"vds"},realtime=null,timing={mark(){}};
const settlePveEngagement=(...args)=>{if(typeof ports.settlePveEngagement!=="function")throw Error("attack_port_unbound:settlePveEngagement");return ports.settlePveEngagement(...args);};
const prepareMixedPlayers473=(...args)=>{if(typeof ports.prepareMixedPlayers473!=="function")throw Error("attack_port_unbound:prepareMixedPlayers473");return ports.prepareMixedPlayers473(...args);};
const selectMixedMonsters473=(...args)=>{if(typeof ports.selectMixedMonsters473!=="function")throw Error("attack_port_unbound:selectMixedMonsters473");return ports.selectMixedMonsters473(...args);};
const runMixedBlack473=(...args)=>{if(typeof ports.runMixedBlack473!=="function")throw Error("attack_port_unbound:runMixedBlack473");return ports.runMixedBlack473(...args);};
const publishRealtimeRoomEvent=(...args)=>{if(typeof ports.publishRealtimeRoomEvent!=="function")throw Error("attack_port_unbound:publishRealtimeRoomEvent");return ports.publishRealtimeRoomEvent(...args);};
const publishRealtimeRoomEventToChannels=(...args)=>{if(typeof ports.publishRealtimeRoomEventToChannels!=="function")throw Error("attack_port_unbound:publishRealtimeRoomEventToChannels");return ports.publishRealtimeRoomEventToChannels(...args);};
const deliverRealtime=(...args)=>{if(typeof ports.deliverRealtime!=="function")throw Error("attack_port_unbound:deliverRealtime");return ports.deliverRealtime(...args);};
const scheduleRequestTask=(...args)=>{if(typeof ports.scheduleRequestTask!=="function")throw Error("attack_port_unbound:scheduleRequestTask");return ports.scheduleRequestTask(...args);};
const startBackgroundTask=(...args)=>{if(typeof ports.startBackgroundTask!=="function")throw Error("attack_port_unbound:startBackgroundTask");return ports.startBackgroundTask(...args);};
const publishCommunityProgress=(...args)=>{if(typeof ports.publishCommunityProgress!=="function")throw Error("attack_port_unbound:publishCommunityProgress");return ports.publishCommunityProgress(...args);};
const runRewardDelivery=(...args)=>{if(typeof ports.runRewardDelivery!=="function")throw Error("attack_port_unbound:runRewardDelivery");return ports.runRewardDelivery(...args);};
const publishRealtimePlayerEvent=(...args)=>{if(typeof ports.publishRealtimePlayerEvent!=="function")throw Error("attack_port_unbound:publishRealtimePlayerEvent");return ports.publishRealtimePlayerEvent(...args);};
const publishRealtimeWorldEvent=(...args)=>{if(typeof ports.publishRealtimeWorldEvent!=="function")throw Error("attack_port_unbound:publishRealtimeWorldEvent");return ports.publishRealtimeWorldEvent(...args);};
const pvpContinuity=(...args)=>{if(typeof ports.pvpContinuity!=="function")throw Error("attack_port_unbound:pvpContinuity");return ports.pvpContinuity(...args);};
const releasePvpCommit=(...args)=>{if(typeof ports.releasePvpCommit!=="function")throw Error("attack_port_unbound:releasePvpCommit");return ports.releasePvpCommit(...args);};
const readActionSnapshot=(...args)=>{if(typeof ports.readActionSnapshot!=="function")throw Error("attack_port_unbound:readActionSnapshot");return ports.readActionSnapshot(...args);};
const enforceRateLimit=(...args)=>{if(typeof ports.enforceRateLimit!=="function")throw Error("attack_port_unbound:enforceRateLimit");return ports.enforceRateLimit(...args);};
const isRuneV2Boss=id=>nativeRuneV2Boss(id)||(fourChannels&&id==="rune-v2-boss-c4-1");
const questMonsterEligible438=monster=>!(fourChannels&&(monster?.id??monster?.monster_id)==="rune-v2-boss-c4-1")&&nativeQuestMonsterEligible438(monster);
function eventKind444(value){const id=typeof value==='string'?value:value?.id??'';if(!id.startsWith('event-'))return null;return (fourChannels?/^event-(world|frozen|water|ancient|dragon|dungeon|solo)-c[1-4]-[a-f0-9-]{36}$/:/^event-(world|frozen|water|ancient|dragon|dungeon|solo)-c[1-3]-[a-f0-9-]{36}$/).exec(id)?.[1]??null;}
function runeV2MonsterKey(monster){if(monster?.area!==RUNE_V2_AREA)return null;return isRuneV2Boss(monster.id)?'boss':String(monster.id).match((fourChannels?/^rune-v2-(tide|warden|sentinel|wraith)-c[1-4]-[1-5]$/:/^rune-v2-(tide|warden|sentinel|wraith)-c[1-3]-[1-5]$/))?.[1]??null;}
function runeMonsterKey(monster){return monster?.area==='rune'?String(monster.id).match((fourChannels?/^rune-(tide|warden|sentinel|wraith)-c[1-4]-\d+$/:/^rune-(tide|warden|sentinel|wraith)-c[1-3]-\d+$/))?.[1]??null:null;}
function prepareRuneDrops(profile,participants,monsterId,center,settings,now,helpers,random=Math.random){
 const rules=profile.runeLoot,rows=[];if(!rules||!participants.length)return rows;
 const owner=participants[Math.min(participants.length-1,Math.floor(random()*participants.length))];
 helpers.onOwner487?.(owner);
 for(const [kind,rule]of Object.entries(rules)){
  if(!(rule.chance>0)||random()*100>=rule.chance*(helpers.balance487?.(kind,owner)??1))continue;
  const amount=rule.min+Math.floor(random()*(rule.max-rule.min+1));
  if(['white','blue','orange','red','purple','emerald'].includes(kind)){
   for(let n=0;n<amount;n++){const slots=['weapon','armor','helmet','shoes','necklace'],gearKind=slots[Math.floor(random()*slots.length)],role=helpers.role(),item={type:'gear',family:'generic',kind:gearKind,rarity:kind};
    rows.push([crypto.randomUUID(),owner.player_id,monsterId,gearKind,helpers.name(item,role),kind,helpers.power(item,settings),1,role,JSON.stringify(helpers.enchants(settings,gearKind)),center.x+rows.length%5*10,center.y+Math.floor(rows.length/5)*8,now+GROUND_LOOT_SECONDS,now+5]);}
  }else{
   const label=RUNE_LOOT_LABELS[kind]??kind;
   rows.push([crypto.randomUUID(),owner.player_id,monsterId,kind,label,kind in RUNE_TYPES?'unique':'white',0,amount,null,'[]',center.x+rows.length%5*10,center.y+Math.floor(rows.length/5)*8,now+GROUND_LOOT_SECONDS,now+5]);
  }
 }
 return rows;
}
function eventBossProfile444(kind,settings){
 const n=(v,d,min=1,max=100000000)=>Math.max(min,Math.min(max,Math.round(Number.isFinite(Number(v))?Number(v):d)));const xp=n(settings.boss_xp_reward,500,0),dungeon=dungeonService().settings(),solo=globalThis.__colProgression.snapshot().solo,dragon=dragonService().settings();
 const hp=kind==='frozen'?settings.frozen_boss_hp:kind==='water'?settings.frozen_water_hp:kind==='ancient'?settings.ancient_boss_hp:kind==='dragon'?dragon.config.hp:kind==='dungeon'?dungeon.boss_hp:kind==='solo'?solo.boss_hp:settings.boss_hp;
 const damage=kind==='frozen'?48*settings.frozen_boss_damage_scale:kind==='water'?32*settings.frozen_water_damage_scale:kind==='ancient'?48*settings.ancient_boss_damage_scale:kind==='dungeon'?dungeon.boss_damage:kind==='solo'?solo.boss_damage:48*settings.boss_damage_scale;
 const source=EVENT_BOSSES444.find(b=>b.kind===kind)?.source;let loot;
 if(source)loot=createLootProfileSnapshot({sourceKey:source,revision:0,customized:false,updatedAt:0,profile:directLootProfile(buildDefaultLootProfile(source,settings))});
 else{let saved={version:1,kind};if(kind==='dragon')saved.config={...dragon.config,loot:dragon.config.loot.filter(r=>!String(r.itemId).includes('emerald'))};else if(kind==='solo')saved.config={...solo,loot:solo.loot.filter(r=>!String(r.itemId).includes('emerald'))};else saved.config=dungeon;if(kind==='dragon'&&!saved.config.loot.some(r=>r.chance>0))saved.config.loot=[{itemId:'resource:essence',chance:100,min:5,max:5}];loot={lootSourceKey:'event.catalog',lootProfileRevision:0,lootProfileJson:JSON.stringify(saved)};}
 return {hp:n(hp,18000),damage:n(damage,20,1,1000000),xp:n(kind==='frozen'?settings.frozen_boss_xp_reward:kind==='water'?settings.frozen_water_xp_reward:kind==='ancient'?settings.ancient_boss_xp_reward:xp,xp,0),loot};
}
const RUNE_V2_IDS_SQL483="'rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1'"+(fourChannels?",'rune-v2-boss-c4-1'":"");
const isRuneV2RankBoss483=id=>typeof id==='string'&&(fourChannels?/^rune-v2-boss-c[1-4]-1$/:/^rune-v2-boss-c[1-3]-1$/).test(id);
const runeV2RealPlayerSql483=p=>`${p}.is_gm=0 AND ${p}.loadlab_run_id='' AND EXISTS(SELECT 1 FROM accounts eligible_account483 WHERE eligible_account483.id=${p}.account_id AND eligible_account483.permanently_banned=0 AND eligible_account483.email NOT LIKE '%@loadlab.invalid') AND NOT EXISTS(SELECT 1 FROM loadlab_entities_v1 marked483 WHERE marked483.id=${p}.id OR marked483.account_id=${p}.account_id) AND NOT EXISTS(SELECT 1 FROM loadlab_admissions_v1 admitted483 WHERE admitted483.account_id=${p}.account_id)`;
const eligible=runeV2RealPlayerSql483('actor');
const RUNE_V2_WINNER_INSERT_SQL483=`INSERT OR IGNORE INTO rune_v2_boss_winner_claims483(monster_id,spawn_round,winner_id,damage,first_hit_at_ms,bonus_gems,config_revision,claim_token,created_at_ms)
 SELECT victim.id,victim.spawn_round,COALESCE(winner.player_id,''),COALESCE(winner.stone_damage476,0),COALESCE(winner.stone_first_hit_at_ms476,0),
 CASE WHEN winner.player_id IS NULL THEN 0 ELSE MIN(MAX(0,9000000000000-recipient.gems),COALESCE(json_extract(defeat.loot_profile_json,'$.runeV2Boss.topDamageGems'),250)) END,
 COALESCE(json_extract(defeat.loot_profile_json,'$.runeV2Boss.revision'),1),?,?
 FROM monsters victim JOIN normal_defeats defeat ON defeat.monster_id=victim.id AND defeat.spawn_round=victim.spawn_round
 LEFT JOIN monster_participants winner ON winner.monster_id=victim.id AND winner.spawn_round=victim.spawn_round AND winner.player_id=(
  SELECT mp.player_id FROM monster_participants mp JOIN players actor ON actor.id=mp.player_id WHERE mp.monster_id=victim.id AND mp.spawn_round=victim.spawn_round AND mp.stone_damage476>0 AND ${eligible}
  ORDER BY mp.stone_damage476 DESC,mp.stone_first_hit_at_ms476 ASC,mp.player_id ASC LIMIT 1)
 LEFT JOIN players recipient ON recipient.id=winner.player_id
 WHERE victim.id=? AND victim.spawn_round=? AND victim.hp>0 AND victim.hp<=? AND victim.area='rune_v2' AND victim.loadlab_run_id='' AND victim.id='rune-v2-boss-c'||victim.channel||'-1' AND victim.id IN (${RUNE_V2_IDS_SQL483})`;
const RUNE_V2_WINNER_PAY_SQL483=`UPDATE players SET gems=gems+(SELECT bonus_gems FROM rune_v2_boss_winner_claims483 WHERE monster_id=? AND spawn_round=? AND claim_token=? AND applied=0)
 WHERE id=(SELECT winner_id FROM rune_v2_boss_winner_claims483 WHERE monster_id=? AND spawn_round=? AND claim_token=? AND applied=0) AND ${runeV2RealPlayerSql483('players')}`;
function prepareRuneV2Winner483(database,target,rolled,nowMs){if(!isRuneV2RankBoss483(target.id))return [];const token=crypto.randomUUID(),args=[target.id,target.spawn_round,token];return [database.prepare(RUNE_V2_WINNER_INSERT_SQL483).bind(token,nowMs,target.id,target.spawn_round,rolled),database.prepare(RUNE_V2_WINNER_PAY_SQL483).bind(...args,...args),database.prepare('UPDATE rune_v2_boss_winner_claims483 SET applied=1 WHERE monster_id=? AND spawn_round=? AND claim_token=? AND applied=0').bind(...args)];}
function colTransferLevel491(item){if(!item||!["weapon","armor","helmet","shoes","necklace","earring","bracelet"].includes(item.kind))return 0;const match=/^\+([0-5]) /.exec(String(item.item_name??''));return match?Number(match[1]):0;}
function colTransferBonus491(item){return (item?.kind==='weapon'?[0,3,8,15,25,40]:[0,2,6,11,18,28])[colTransferLevel491(item)];}
function defaultFishingCatch482(){return {pearl:12,red_pearl:8,talisman:10,sokan:30,levrek:20,zargana:20};}
function validateFishingCatch482(input){
 const keys=['pearl','red_pearl','talisman','sokan','levrek','zargana'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==keys.length||Object.keys(input).some(key=>!keys.includes(key)))throw Error('Altı av ödülünün oranını gir.');
 const next={};let total=0;
 for(const key of keys){const value=input[key];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100||Math.abs(value*100-Math.round(value*100))>0.000001)throw Error('Oranlar 0–100 arasında, en fazla iki ondalıklı olmalı.');next[key]=value;total+=Math.round(value*100);}
 if(total!==10000)throw Error('Yakalama oranlarının toplamı %100 olmalı.');
 return next;
}
function readFishingCatch482(raw){try{const value=typeof raw==='string'?JSON.parse(raw):raw;return validateFishingCatch482(value?.fishingCatchWeights482??defaultFishingCatch482());}catch{return defaultFishingCatch482();}}
 function colSupportCast456(database,player,settings,payload,receivedAt){
 const branch=colSpec456(player.role,player.specialization,settings),time=Date.now();
 const areas=['forest','frozen','sanctum','dragon','sinsi','black','war','arena','ancient','afk','event','rune','rune_v2'];
 if(!branch||!['heal','guard'].includes(branch.effect)||player.level<30||player.hp<=0||player.rod_equipped||(!isAdventureArea(player.area)&&!areas.includes(player.area)))return Response.json({error:'Bu uzmanlık becerisi kullanılamıyor.'},{status:409});
 if(globalThis.__colDungeon?.locked(player.id))return Response.json({error:'Beceriyi zindan kontrollerinden kullanmalısın.'},{status:409});
 const gear=equippedEnchantItems(player),cooldown=effectiveSkillCooldown444(branch.cooldown,Math.min(50,enchantmentTotal(gear,'cast_speed')+(player.jewelry_cast_speed||0))),until=receivedAt+cooldown;
 const arenaGuard=player.area==='arena'?" AND EXISTS(SELECT 1 FROM arena_matches m WHERE m.id=players.arena_match_id AND m.status IN ('countdown','active') AND m.starts_at_ms<=? AND (m.id NOT LIKE 'guild-%' OR m.starts_at_ms+600000>?))":'';
 const reserve=database.prepare('UPDATE players SET attack_four_at=MAX(attack_four_at,?)+?,special_guard_until_ms=?,combat_lock_until_ms=MAX(combat_lock_until_ms,?) WHERE id=? AND hp>0 AND level>=30 AND rod_equipped=0 AND stun_until_ms<=? AND attack_four_at<=? AND specialization=? AND role=? AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=?'+arenaGuard+' RETURNING attack_four_at AS reserved_until,special_guard_until_ms').bind(receivedAt,cooldown,branch.effect==='guard'?time+branch.guardMs:0,time+5000,player.id,time,receivedAt,branch.id,player.role,player.area,player.channel,player.arena_match_id,player.realtime_scope_version,...(player.area==='arena'?[time,time]:[]));
 const friendly=player.area===CASTLE_AREA?"p.arena_match_id='' AND EXISTS(SELECT 1 FROM guild_members mine JOIN guild_members peer ON peer.guild_id=mine.guild_id WHERE mine.player_id=? AND peer.player_id=p.id)":player.area==='arena'?"p.arena_match_id=? AND EXISTS(SELECT 1 FROM arena_match_players mine JOIN arena_match_players peer ON peer.match_id=mine.match_id AND peer.team=mine.team WHERE mine.player_id=? AND peer.player_id=p.id AND mine.match_id=p.arena_match_id AND EXISTS(SELECT 1 FROM party_members pm505 JOIN party_members pp505 ON pp505.party_id=pm505.party_id WHERE pm505.player_id=mine.player_id AND pp505.player_id=peer.player_id))":"p.arena_match_id='' AND EXISTS(SELECT 1 FROM party_members mine JOIN party_members peer ON peer.party_id=mine.party_id WHERE mine.player_id=? AND peer.player_id=p.id)";
 const friendlyParams=player.area==='arena'?[player.arena_match_id,player.id]:[player.id];
 let targets=[player];
 if(branch.effect==='heal'){
  // Filtering reach before LIMIT prevents remote teammates occupying the bounded slots.
  const rows=database.prepare('SELECT p.id,p.hp,p.max_hp,p.x,p.y,p.realtime_scope_version FROM players p JOIN players caster ON caster.id=? WHERE p.hp>0 AND p.loadlab_run_id=caster.loadlab_run_id AND (length(p.loadlab_run_id)=0 OR p.loadlab_team=caster.loadlab_team) AND p.channel=? AND p.area=? AND p.arena_match_id=? AND (p.id=? OR (p.last_seen>=? AND p.hp<p.max_hp)) AND (p.x-caster.x)*(p.x-caster.x)+(p.y-caster.y)*(p.y-caster.y)<=102400 AND (p.id=? OR ('+friendly+')) ORDER BY p.id=? DESC,(p.x-caster.x)*(p.x-caster.x)+(p.y-caster.y)*(p.y-caster.y),p.id LIMIT 5').bind(player.id,player.channel,player.area,player.arena_match_id,player.id,Math.floor(time/1000)-30,player.id,...friendlyParams,player.id).all();
  targets=rows.results;
 }
 const healRate=Math.min(.30,branch.heal*colSkillGrowth456(player.skill_four,settings.skill_upgrade_damage_per_level));
 const healStatements=(healRate>0?targets:[]).map(p=>{
  const targetFriendly=player.area==='arena'?"EXISTS(SELECT 1 FROM arena_match_players mine JOIN arena_match_players peer ON peer.match_id=mine.match_id AND peer.team=mine.team WHERE mine.player_id=? AND peer.player_id=players.id AND mine.match_id=players.arena_match_id AND EXISTS(SELECT 1 FROM party_members pm505 JOIN party_members pp505 ON pp505.party_id=pm505.party_id WHERE pm505.player_id=mine.player_id AND pp505.player_id=peer.player_id))":"players.arena_match_id='' AND EXISTS(SELECT 1 FROM party_members mine JOIN party_members peer ON peer.party_id=mine.party_id WHERE mine.player_id=? AND peer.player_id=players.id)";
  const canHealOther=branch.effect==='heal'?" OR ("+targetFriendly+")":'';
  return database.prepare('UPDATE players SET hp=MIN(max_hp,hp+MAX(1,CAST(ROUND(max_hp*?) AS INTEGER))),hp_revision=hp_revision+1 WHERE id=? AND hp>0 AND hp<max_hp AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=? AND (id=?'+canHealOther+') AND EXISTS(SELECT 1 FROM players caster WHERE caster.id=? AND caster.hp>0 AND caster.specialization=? AND caster.attack_four_at=? AND caster.loadlab_run_id=players.loadlab_run_id AND caster.area=players.area AND caster.channel=players.channel AND caster.arena_match_id=players.arena_match_id AND caster.realtime_scope_version=? AND (players.x-caster.x)*(players.x-caster.x)+(players.y-caster.y)*(players.y-caster.y)<=102400) RETURNING id,hp,max_hp,hp_revision').bind(healRate,p.id,player.area,player.channel,player.arena_match_id,p.realtime_scope_version??player.realtime_scope_version,player.id,...(branch.effect==='heal'?[player.id]:[]),player.id,branch.id,until,player.realtime_scope_version);
 });
 // Guard and every heal share the sole durable writer transaction. Rejected
 // cooldown, scope, death, or stun cannot partially apply a support cast.
 const result=database.guardedBatch(reserve,healStatements),reserved=result.guard.results[0];
 if(!reserved)return Response.json({error:'Yetenek henüz hazır değil veya savaş durumun değişti.'},{status:409});
 const healed=result.results.flatMap(r=>r.results??[]),own=healed.find(p=>p.id===player.id),effect={type:'specialization_effect',eventId:'spec456:'+player.id+':'+until,actorId:player.id,specialization:branch.id,kind:branch.effect,x:player.x,y:player.y,targets:healed,serverAt:time,until:time+850};
 // Existing player_state keeps both clients and the realtime room HP current.
 const updates=healed.map(p=>publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'player_state',eventId:'spec456-hp:'+until+':'+p.id,targetId:p.id,hp:p.hp,maxHp:p.max_hp,hpRevision:p.hp_revision,serverAt:time},player.arena_match_id||undefined));
 updates.push(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,effect,player.arena_match_id||undefined));
 deliverRealtime(Promise.all(updates));
 return Response.json({ok:true,specialEffect:effect,cooldownRemainingMs:cooldown,reservedUntilMs:Number(reserved.reserved_until),...(own?{hp:own.hp,maxHp:own.max_hp,hpRevision:own.hp_revision}:{}),special_guard_until_ms:Number(reserved.special_guard_until_ms)});
}
 function colTrapImpact456(database,attacker,target,kind,branch,now,intentId){
 if(!(kind==='player'?colLabMayAffectPlayer(attacker,target):colLabMayAffectMonster(attacker,target)))return null;
 if(kind==='monster'&&(isBlackStoneBoss476(target.id)||isRuneV2Boss(target.id)))return null;
 if(branch?.effect!=='root'||attacker.role!=='avci'||!(branch.rootMs>0))return null;
 const until=now+Math.max(0,Math.min(2000,Number(branch.rootMs)||0));
 let controlled;
 if(kind==='player')controlled=database.prepare('UPDATE players SET root_until_ms=MAX(root_until_ms,?),hp_revision=hp_revision+1 WHERE id=? AND hp>0 AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=? AND EXISTS(SELECT 1 FROM players caster WHERE caster.id=? AND caster.hp>0 AND caster.specialization=? AND caster.loadlab_run_id=players.loadlab_run_id AND caster.area=players.area AND caster.channel=players.channel AND caster.arena_match_id=players.arena_match_id AND caster.realtime_scope_version=?) RETURNING x,y,hp,hp_revision,position_revision,root_until_ms,stun_until_ms').bind(until,target.id,attacker.area,attacker.channel,attacker.arena_match_id,target.realtime_scope_version,attacker.id,branch.id,attacker.realtime_scope_version).first();
 else controlled=database.prepare('UPDATE monsters SET root_until_ms=MAX(root_until_ms,?),control_x=?,control_y=? WHERE id=? AND hp>0 AND spawn_round=? AND area=? AND channel=? AND is_boss=0 AND is_stone=0 RETURNING root_until_ms,stun_until_ms').bind(until,target.x,target.y,target.id,target.spawn_round,attacker.area,attacker.channel).first();
 if(!controlled)return null;
 return {type:'guardian_control',eventId:'trap456:'+attacker.id+':'+(intentId??now),intentId,attackerId:attacker.id,actorId:attacker.id,targetId:target.id,targetKind:kind,ability:3,casterPoint:{x:attacker.x,y:attacker.y},from:{x:target.x,y:target.y},to:{x:target.x,y:target.y},moved:null,controlled,targetPoint:{x:target.x,y:target.y},serverAt:now,area:attacker.area,channel:attacker.channel,...(kind==='monster'?{spawnRound:target.spawn_round}:{})};
}
function colJewelry456(items){let attack=0,defense=0,castSpeed=0,strongPlayers=0,resistantPlayers=0;for(const i of items){if(i.equipped!==1)continue;if(i.kind==='earring'){attack+=20;castSpeed+=10;strongPlayers+=5;defense+=colTransferBonus491(i);}else if(i.kind==='bracelet'){attack+=20;defense+=50;resistantPlayers+=5;defense+=colTransferBonus491(i);}}return {attack,defense,castSpeed,strongPlayers,resistantPlayers};}
function effectiveSkillCooldown444(baseMs,speedPercent=0){const raw=Number(baseMs),base=Number.isFinite(raw)?Math.max(500,Math.round(raw)):10000;const speed=Number(speedPercent),safe=Number.isFinite(speed)?Math.max(0,Math.min(50,speed)):0;return Math.max(500,Math.round(base/(1+safe/100)));}
const EMERALD_SET444=Object.freeze({name:'Kadim Zümrüt Seti',slots:['weapon','armor','helmet','shoes','necklace'],bonuses:{hp:1000,pve:10,pvp:10,resistance:0,speed:12,attack:50}});
function emeraldName444(kind,role){return kind==='weapon'?({muhafiz:'Kadim Zümrüt Hükümkılıcı',avci:'Kadim Zümrüt Ufuk Yayı',arkanist:'Kadim Zümrüt Öz Asası'}[role]??'Kadim Zümrüt Hükümkılıcı'):({armor:'Kadim Zümrüt Zırhı',helmet:'Kadim Zümrüt Tacı',necklace:'Kadim Zümrüt Kalbi',shoes:'Kadim Zümrüt Çizmeleri'}[kind]??'Kadim Zümrüt');}
function emeraldPower444(kind,settings={}){if(kind==='weapon')return 350;if(kind==='armor')return 300;const unique=Math.max(1,Number(settings[kind==='weapon'?'unique_weapon_power':'unique_armor_power'])||(kind==='weapon'?180:150));const percent=Number.isFinite(Number(settings.infinite_power_percent))?Math.max(0,Number(settings.infinite_power_percent)):30;const weaponBase=Math.max(1,Number(settings.infinite_weapon_power)||230);const infinite=globalThis.__colDragonBoss?.infinitePower?.({kind,power:unique})??(kind==='weapon'&&unique<=180?Math.max(unique,weaponBase):kind==='weapon'?Math.max(unique,Math.round(unique*(1+percent/100)),weaponBase):Math.round(unique*(1+percent/100)));return Math.min(100000,Math.ceil(infinite*1.15));}
function colRuneFactor(p,stat){return globalThis.__colRunes?.factor(p,stat)??1;}
var PROGRESSION_MATERIALS = Object.freeze({forge_ember491:{"label":"Kor Mührü","image":"../game/forge-ember-v491","note":"Tüm canavarlardan kazanılabilen artı basma malzemesi. Demirci Haso’da kullanılır; pazarda satılabilir."},"rune_defense":{label:"Safir Siper Parçası",image:"rune-defense-v422-shard"},"rune_attack":{label:"Kızıl Kudret Parçası",image:"rune-attack-v422-shard"},"rune_hp":{label:"Zümrüt Yaşam Parçası",image:"rune-hp-v422-shard"},
	solo_key: {
		label: "Zindan Anahtarı",
		image: "solo-key-v410",
		note: "Demirci Haso’da 3 İnci + 100 Mücevher karşılığında üretilir. Bir solo zindan girişi için kullanılır."
	},
	weathered_iron: {
		label: "Eskitilmiş Demir Parçası",
		image: "weathered-iron-v410",
		note: "Solo zindan bossunun özel malzemesi."
	},
	strong_branch: {
		label: "Güçlü Dal",
		image: "strong-branch-v410",
		area: "forest",
		areaName: "Kuzey Ormanı",
		note: "Kuzey Ormanı canavarlarından düşen artı basma malzemesi."
	},
	strong_crystal: {
		label: "Güçlü Kristal",
		image: "strong-crystal-v410",
		area: "frozen",
		areaName: "Donmuş Çam Geçidi",
		note: "Donmuş Çam Geçidi canavarlarından düşen artı basma malzemesi."
	},
	desert_plant: {
		label: "Çöl Bitkisi",
		image: "desert-plant-v410",
		area: "black",
		areaName: "Kara Bölge",
		note: "Kara Bölge canavarlarından düşen artı basma malzemesi."
	},
	master_scroll: {
		label: "Usta Parşömeni",
		image: "master-scroll-v410",
		area: "ancient",
		areaName: "Kadim Kök Vadisi",
		note: "Kadim Kök Vadisi canavarlarından düşen artı basma malzemesi."
	}
});
var UPGRADE_MATERIAL_KINDS = Object.freeze([
	"strong_branch",
	"strong_crystal",
	"desert_plant",
	"master_scroll"
]);
function progressionMaterial(kind) {
	return typeof kind === "string" && Object.hasOwn(PROGRESSION_MATERIALS, kind) ? PROGRESSION_MATERIALS[kind] : null;
}
function materialForSource(source) {
	const area = String(source).split(".")[0];
	return UPGRADE_MATERIAL_KINDS.find((kind) => PROGRESSION_MATERIALS[kind].area === area);
}
var LOOT_PPM = 1e6;
var LOOT_BPS = 1e4;
var MAX_LOOT_PROFILE_JSON_BYTES = 12e3;
var LOOT_GEAR_KINDS = [
	"weapon",
	"armor",
	"helmet",
	"shoes",
	"necklace"
];
var OPEN_WORLD_LOOT_GEAR_KINDS = [
	"weapon",
	"armor",
	"shoes",
	"necklace"
];
var LOOT_RARITIES = [
	"white",
	"blue",
	"orange",
	"red"
];
var LOOT_RESOURCE_KINDS = [
	"essence",
	"stone_dust",
	"pearl",
	"stone_book",
	"evolution_scroll",
	"strong_branch",
	"strong_crystal",
	"desert_plant",
	"master_scroll"
];
var SPECIAL_LOOT_RESOURCES = ["pearl", "stone_dust"];
var LOOT_ITEM_FAMILIES = ["generic", "sinsi"];
var LOOT_SOURCE_DEFINITIONS = [
	{
		key: "ancient.golge.normal",
		label: "Kadim Kök Vadisi · Kızıl Pençe",
		zone: "ancient"
	},
	{
		key: "ancient.curuk.normal",
		label: "Kadim Kök Vadisi · Kök Muhafızı",
		zone: "ancient"
	},
	{
		key: "ancient.yutan.normal",
		label: "Kadim Kök Vadisi · Kül Kâhini",
		zone: "ancient"
	},
	{
		key: "black.slot1",
		label: "Kara Bölge · 1. Obsidyen Akrep",
		zone: "black"
	},
	{
		key: "black.slot2",
		label: "Kara Bölge · 2. Kumtaşı Golemi",
		zone: "black"
	},
	{
		key: "black.slot3",
		label: "Kara Bölge · 3. Mezar Muhafızı",
		zone: "black"
	},
	{
		key: "black.slot4",
		label: "Kara Bölge · 4. Kül Çakalı",
		zone: "black"
	},
	{
		key: "black.slot5",
		label: "Kara Bölge · 5. Obsidyen Akrep",
		zone: "black"
	},
	{
		key: "black.slot6",
		label: "Kara Bölge · 6. Kumtaşı Golemi",
		zone: "black"
	},
	{
		key: "black.slot7",
		label: "Kara Bölge · 7. Mezar Muhafızı",
		zone: "black"
	},
	{
		key: "black.slot8",
		label: "Kara Bölge · 8. Kül Çakalı",
		zone: "black"
	},
	{
		key: "forest.golge.normal",
		label: "Kuzey Ormanı · Gölge Kurdu · Normal",
		zone: "forest"
	},
	{
		key: "forest.golge.agresif",
		label: "Kuzey Ormanı · Gölge Kurdu · Agresif",
		zone: "forest"
	},
	{
		key: "forest.golge.katil",
		label: "Kuzey Ormanı · Gölge Kurdu · Katil",
		zone: "forest"
	},
	{
		key: "forest.curuk.normal",
		label: "Kuzey Ormanı · Çürük Muhafız · Normal",
		zone: "forest"
	},
	{
		key: "forest.curuk.agresif",
		label: "Kuzey Ormanı · Çürük Muhafız · Agresif",
		zone: "forest"
	},
	{
		key: "forest.curuk.katil",
		label: "Kuzey Ormanı · Çürük Muhafız · Katil",
		zone: "forest"
	},
	{
		key: "forest.yutan.normal",
		label: "Kuzey Ormanı · Öz Yutan · Normal",
		zone: "forest"
	},
	{
		key: "forest.yutan.agresif",
		label: "Kuzey Ormanı · Öz Yutan · Agresif",
		zone: "forest"
	},
	{
		key: "forest.yutan.katil",
		label: "Kuzey Ormanı · Öz Yutan · Katil",
		zone: "forest"
	},
	{
		key: "frozen.golge.normal",
		label: "Donmuş Çam Geçidi · Kırağı Vaşağı · Normal",
		zone: "frozen"
	},
	{
		key: "frozen.golge.agresif",
		label: "Donmuş Çam Geçidi · Kırağı Vaşağı · Agresif",
		zone: "frozen"
	},
	{
		key: "frozen.golge.katil",
		label: "Donmuş Çam Geçidi · Kırağı Vaşağı · Katil",
		zone: "frozen"
	},
	{
		key: "frozen.curuk.normal",
		label: "Donmuş Çam Geçidi · Buzkök Golemi · Normal",
		zone: "frozen"
	},
	{
		key: "frozen.curuk.agresif",
		label: "Donmuş Çam Geçidi · Buzkök Golemi · Agresif",
		zone: "frozen"
	},
	{
		key: "frozen.curuk.katil",
		label: "Donmuş Çam Geçidi · Buzkök Golemi · Katil",
		zone: "frozen"
	},
	{
		key: "frozen.yutan.normal",
		label: "Donmuş Çam Geçidi · Tipi Kâhini · Normal",
		zone: "frozen"
	},
	{
		key: "frozen.yutan.agresif",
		label: "Donmuş Çam Geçidi · Tipi Kâhini · Agresif",
		zone: "frozen"
	},
	{
		key: "frozen.yutan.katil",
		label: "Donmuş Çam Geçidi · Tipi Kâhini · Katil",
		zone: "frozen"
	},
	{
		key: "sinsi.golge.agresif",
		label: "Sinsi Taş Vadisi · Sinsi Gölge Kurdu",
		zone: "sinsi"
	},
	{
		key: "sinsi.curuk.agresif",
		label: "Sinsi Taş Vadisi · Sinsi Muhafız",
		zone: "sinsi"
	},
	{
		key: "sinsi.yutan.katil",
		label: "Sinsi Taş Vadisi · Sinsi Öz Yutan",
		zone: "sinsi"
	},
	{
		key: "sinsi.stone",
		label: "Sinsi Taş Vadisi · Sinsi Taş",
		zone: "sinsi"
	},
	{
		key: "boss.world",
		label: "Dünya Bossu · Çürümenin Kadimi",
		zone: "boss"
	},
	{
		key: "boss.black_stone",
		label: "Kara Bölge · Kara Taş Muhafızı",
		zone: "boss"
	},
	{
		key: "boss.frozen_throne",
		label: "Ayaz Tahtının Bekçisi",
		zone: "boss"
	},
	{
		key: "boss.frozen_water",
		label: "Buzgölü Semenderi",
		zone: "boss"
	}
];
var SIMPLE_LOOT_BUCKET_IDS = [
	"red_all",
	"orange_main",
	"orange_accessory",
	"blue_main",
	"blue_accessory",
	"white_main",
	"white_accessory"
];
var FOREST_SIMPLE_LOOT_CHANCES = {
	red_all: 1e4,
	orange_main: 5e4,
	orange_accessory: 3e4,
	blue_main: 15e4,
	blue_accessory: 5e4,
	white_main: 35e4,
	white_accessory: 8e4
};
var FROZEN_SIMPLE_LOOT_CHANCES = {
	red_all: 11e3,
	orange_main: 55e3,
	orange_accessory: 33e3,
	blue_main: 165e3,
	blue_accessory: 55e3,
	white_main: 385e3,
	white_accessory: 88e3
};
var ANCIENT_SIMPLE_LOOT_CHANCES = {
	red_all: 6e3,
	orange_main: 57e3,
	orange_accessory: 35e3,
	blue_main: 17e4,
	blue_accessory: 6e4,
	white_main: 535e3,
	white_accessory: 137e3
};
var SOURCE_KEYS = new Set(LOOT_SOURCE_DEFINITIONS.map((entry) => entry.key));
var GEAR_KINDS = new Set(LOOT_GEAR_KINDS);
var RARITIES = new Set(LOOT_RARITIES);
var RESOURCE_KINDS = new Set(LOOT_RESOURCE_KINDS);
var ITEM_FAMILIES = new Set(LOOT_ITEM_FAMILIES);
var SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,47}$/;
var SAFE_LABEL = /^[^\u0000-\u001f\u007f]{1,80}$/u;
function isLootSourceKey(value) {
	return typeof value === "string" && SOURCE_KEYS.has(value);
}
function lootSourceDefinition(key) {
	return LOOT_SOURCE_DEFINITIONS.find((entry) => entry.key === key);
}
function finiteNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}
function integerInRange(value, min, max) {
	return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}
function chanceToPpm(value) {
	return Math.round(Math.max(0, Math.min(1, finiteNumber(value))) * LOOT_PPM);
}
function weightedSplit(total, weights) {
	const safeTotal = Math.max(0, Math.floor(total));
	const safeWeights = weights.map((weight) => Math.max(0, finiteNumber(weight)));
	const weightTotal = safeWeights.reduce((sum, weight) => sum + weight, 0);
	if (safeTotal === 0 || weightTotal <= 0) return weights.map(() => 0);
	const exact = safeWeights.map((weight) => safeTotal * weight / weightTotal);
	const result = exact.map(Math.floor);
	const remainder = safeTotal - result.reduce((sum, value) => sum + value, 0);
	const priority = exact.map((value, index) => ({
		index,
		fraction: value - Math.floor(value)
	})).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
	for (let index = 0; index < remainder; index += 1) result[priority[index % priority.length].index] += 1;
	return result;
}
function kindWeights(armorChance) {
	const armorPpm = chanceToPpm(armorChance);
	const accessories = weightedSplit(armorPpm, [
		1,
		1,
		1
	]);
	return [LOOT_PPM - armorPpm, ...accessories];
}
function legacyRarityPpms(totalChance, redChance, orangeChance, blueChance) {
	let remaining = chanceToPpm(totalChance);
	const red = Math.min(remaining, chanceToPpm(redChance));
	remaining -= red;
	const orange = Math.min(remaining, chanceToPpm(orangeChance));
	remaining -= orange;
	const blue = Math.min(remaining, chanceToPpm(blueChance));
	remaining -= blue;
	return {
		white: remaining,
		blue,
		orange,
		red
	};
}
function gearOutcomes(rarityPpms, armorChance, family, charmEnabled) {
	const weights = kindWeights(armorChance);
	const outcomes = [];
	for (const rarity of [
		"red",
		"orange",
		"blue",
		"white"
	]) {
		const chances = weightedSplit(rarityPpms[rarity], weights);
		for (let index = 0; index < OPEN_WORLD_LOOT_GEAR_KINDS.length; index += 1) {
			const kind = OPEN_WORLD_LOOT_GEAR_KINDS[index];
			outcomes.push({
				id: `${rarity}-${kind}`,
				item: {
					type: "gear",
					family: family === "sinsi" && (kind === "weapon" || kind === "armor") ? "sinsi" : "generic",
					kind,
					rarity
				},
				baseChancePpm: chances[index],
				minAmount: 1,
				maxAmount: 1,
				charmWeight: charmEnabled ? chances[index] : 0
			});
		}
	}
	return outcomes;
}
var SIMPLE_BUCKET_KINDS = {
	red_all: [
		"weapon",
		"armor",
		"shoes",
		"necklace"
	],
	orange_main: ["weapon", "armor"],
	orange_accessory: ["shoes", "necklace"],
	blue_main: ["weapon", "armor"],
	blue_accessory: ["shoes", "necklace"],
	white_main: ["weapon", "armor"],
	white_accessory: ["shoes", "necklace"]
};
var SIMPLE_BUCKET_RARITY = {
	red_all: "red",
	orange_main: "orange",
	orange_accessory: "orange",
	blue_main: "blue",
	blue_accessory: "blue",
	white_main: "white",
	white_accessory: "white"
};
function normalizedSimpleChance(value) {
	return Math.max(0, Math.min(LOOT_PPM, Math.round(finiteNumber(value))));
}
function simpleGearOutcomes(chances, family) {
	const byOutcome = /* @__PURE__ */ new Map();
	for (const bucketId of SIMPLE_LOOT_BUCKET_IDS) {
		const rarity = SIMPLE_BUCKET_RARITY[bucketId];
		const kinds = SIMPLE_BUCKET_KINDS[bucketId];
		const split = weightedSplit(normalizedSimpleChance(chances[bucketId]), kinds.map(() => 1));
		kinds.forEach((kind, index) => {
			const baseChancePpm = split[index];
			byOutcome.set(`${rarity}-${kind}`, {
				id: `${rarity}-${kind}`,
				item: {
					type: "gear",
					family: family === "sinsi" && (kind === "weapon" || kind === "armor") ? "sinsi" : "generic",
					kind,
					rarity
				},
				baseChancePpm,
				minAmount: 1,
				maxAmount: 1,
				charmWeight: baseChancePpm
			});
		});
	}
	return [
		"red",
		"orange",
		"blue",
		"white"
	].flatMap((rarity) => OPEN_WORLD_LOOT_GEAR_KINDS.map((kind) => byOutcome.get(`${rarity}-${kind}`)).filter(Boolean));
}
function extractSimpleLootChances(profile) {
	const result = Object.fromEntries(SIMPLE_LOOT_BUCKET_IDS.map((id) => [id, 0]));
	const gearGroup = profile.groups.find((group) => group.outcomes.some((outcome) => outcome.item.type === "gear"));
	for (const outcome of gearGroup?.outcomes ?? []) {
		if (outcome.item.type !== "gear") continue;
		const chance = normalizedSimpleChance(outcome.baseChancePpm);
		if (outcome.item.rarity === "purple") continue;
		if (outcome.item.rarity === "red") result.red_all += chance;
		else if (outcome.item.kind === "weapon" || outcome.item.kind === "armor") result[`${outcome.item.rarity}_main`] += chance;
		else result[`${outcome.item.rarity}_accessory`] += chance;
	}
	return result;
}
function simpleLootTotalChancePpm(chances) {
	return SIMPLE_LOOT_BUCKET_IDS.reduce((sum, id) => sum + normalizedSimpleChance(chances[id]), 0);
}
function rescaleSimpleLootChances(chances, requestedPpm) {
	const target = normalizedSimpleChance(requestedPpm);
	const current = SIMPLE_LOOT_BUCKET_IDS.map((id) => normalizedSimpleChance(chances[id]));
	const scaled = weightedSplit(target, current.some((value) => value > 0) ? current : SIMPLE_LOOT_BUCKET_IDS.map((id) => FOREST_SIMPLE_LOOT_CHANCES[id]));
	return Object.fromEntries(SIMPLE_LOOT_BUCKET_IDS.map((id, index) => [id, scaled[index]]));
}
function withSimpleLootChances(profile, chances) {
	const family = profile.key === "sinsi.stone" ? "sinsi" : "generic";
	let replaced = false;
	const groups = profile.groups.map((group) => {
		if (replaced || !group.outcomes.some((outcome) => outcome.item.type === "gear")) return group;
		replaced = true;
		return {
			...group,
			rolls: 1,
			charmMultiplierBps: 12500,
			outcomes: simpleGearOutcomes(chances, family)
		};
	});
	return {
		...profile,
		groups
	};
}
function withEquipmentDropChance(profile, chancePpm) {
	if (profile.key.startsWith("boss.")) return profile;
	if (profile.groups.find((g) => g.gearChanceModel === "direct")) return withSimpleLootChances(profile, rescaleSimpleLootChances(extractSimpleLootChances(profile), chancePpm));
	return {
		...profile,
		groups: profile.groups.map((group) => group.outcomes.some((o) => o.item.type === "gear") ? {
			...group,
			equipmentChancePpm: normalizedSimpleChance(chancePpm)
		} : group)
	};
}
function directLootProfile(profile) {
	if (profile.key.startsWith("boss.")) return profile;
	const legacy = upgradeEquipmentDropProfile(profile);
	return {
		...legacy,
		groups: legacy.groups.map((group) => {
			if (!group.outcomes.some((outcome) => outcome.item.type === "gear") || group.gearChanceModel === "direct") return group;
			const total = normalizedSimpleChance(group.equipmentChancePpm ?? 0);
			const buckets = rescaleSimpleLootChances(extractSimpleLootChances(legacy), total);
			const family = profile.key === "sinsi.stone" ? "sinsi" : "generic";
			const { equipmentChancePpm: _oldGate, ...rest } = group;
			return {
				...rest,
				gearChanceModel: "direct",
				outcomes: simpleGearOutcomes(buckets, family)
			};
		})
	};
}
function balanceWhiteLootChances(chances) {
	const colored = chances.red_all + chances.orange_main + chances.orange_accessory + chances.blue_main + chances.blue_accessory;
	const weights = [chances.white_main, chances.white_accessory];
	const white = weightedSplit(Math.max(0, LOOT_PPM - colored), weights.some((v) => v > 0) ? weights : [1, 1]);
	return {
		...chances,
		white_main: white[0],
		white_accessory: white[1]
	};
}
function upgradeEquipmentDropProfile(profile) {
	if (profile.key.startsWith("boss.")) return profile;
	const group = profile.groups.find((g) => g.outcomes.some((o) => o.item.type === "gear"));
	if (!group || group.equipmentChancePpm !== void 0 || group.gearChanceModel === "direct") return profile;
	const old = extractSimpleLootChances(profile);
	const gate = Math.min(2e5, simpleLootTotalChancePpm(old));
	return withEquipmentDropChance(withSimpleLootChances(profile, balanceWhiteLootChances({
		...old,
		red_all: Math.min(6e3, old.red_all)
	})), gate);
}
function allowsSpecialLootResources(sourceKey) {
	return sourceKey === "boss.black_stone" || sourceKey === "sinsi.stone" || sourceKey === "boss.world" || sourceKey === "boss.frozen_throne" || sourceKey === "boss.frozen_water";
}
function allowsProfileResource(sourceKey, kind) {
	if (UPGRADE_MATERIAL_KINDS.includes(kind)) return materialForSource(sourceKey) === kind;
	if (SPECIAL_LOOT_RESOURCES.some((resource) => resource === kind)) return allowsSpecialLootResources(sourceKey);
	return (kind === "stone_book" || kind === "evolution_scroll") && sourceKey.startsWith("boss.");
}
function resourceOutcome(kind, minAmount, maxAmount) {
	return {
		id: kind,
		item: {
			type: "resource",
			kind
		},
		baseChancePpm: LOOT_PPM,
		minAmount: Math.max(1, Math.floor(minAmount)),
		maxAmount: Math.max(1, Math.floor(maxAmount)),
		charmWeight: 0
	};
}
function rareResourceOutcome(kind, chancePpm, minAmount = 1, maxAmount = minAmount) {
	const safeMin = Math.max(1, Math.floor(finiteNumber(minAmount, 1)));
	return {
		...resourceOutcome(kind, safeMin, Math.max(safeMin, Math.floor(finiteNumber(maxAmount, safeMin)))),
		baseChancePpm: Math.max(0, Math.min(LOOT_PPM, Math.round(finiteNumber(chancePpm, 0))))
	};
}
function variantEssenceRange(key) {
	if (key.endsWith(".katil")) return {
		min: 8,
		max: 13
	};
	if (key.endsWith(".agresif")) return {
		min: 5,
		max: 8
	};
	return {
		min: 2,
		max: 4
	};
}
function regularProfile(key, settings) {
	const essence = variantEssenceRange(key);
	const simpleChances = key.startsWith("forest.") ? FOREST_SIMPLE_LOOT_CHANCES : key.startsWith("frozen.") ? FROZEN_SIMPLE_LOOT_CHANCES : key.startsWith("ancient.") ? ANCIENT_SIMPLE_LOOT_CHANCES : null;
	return [{
		id: "gear",
		label: "Ekipman",
		rolls: 1,
		charmMultiplierBps: 12500,
		outcomes: simpleChances ? simpleGearOutcomes({ ...simpleChances }, "generic") : gearOutcomes(legacyRarityPpms(settings.regular_item_drop_chance, settings.regular_red_chance, settings.regular_orange_chance, settings.regular_blue_chance), settings.regular_armor_chance, "generic", true)
	}, {
		id: "essence",
		label: "Yaşam Özü",
		rolls: 1,
		charmMultiplierBps: LOOT_BPS,
		outcomes: [resourceOutcome("essence", essence.min, essence.max)]
	}];
}
function frozenEliteProfile(key, settings) {
	const throne = key === "boss.frozen_throne";
	return [
		{
			id: "gear",
			label: "Ekipman",
			rolls: 1,
			charmMultiplierBps: 12500,
			outcomes: gearOutcomes(legacyRarityPpms(throne ? settings.frozen_boss_item_drop_chance : settings.frozen_water_item_drop_chance, settings.regular_red_chance, settings.regular_orange_chance, settings.regular_blue_chance), settings.regular_armor_chance, "generic", true)
		},
		{
			id: "essence",
			label: "Yaşam Özü",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [resourceOutcome("essence", throne ? 20 : 8, throne ? 35 : 14)]
		},
		{
			id: "stone-book",
			label: "Taş Sanatı Kitabı",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [rareResourceOutcome("stone_book", throne ? settings.frozen_boss_stone_book_chance * LOOT_PPM : settings.frozen_water_stone_book_chance * LOOT_PPM, throne ? settings.frozen_boss_stone_book_min : settings.frozen_water_stone_book_min, throne ? settings.frozen_boss_stone_book_max : settings.frozen_water_stone_book_max)]
		},
		{
			id: "evolution-scroll",
			label: "Evrim Parşömeni",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [rareResourceOutcome("evolution_scroll", throne ? settings.frozen_boss_evolution_scroll_chance * LOOT_PPM : settings.frozen_water_evolution_scroll_chance * LOOT_PPM, throne ? settings.frozen_boss_evolution_scroll_min : settings.frozen_water_evolution_scroll_min, throne ? settings.frozen_boss_evolution_scroll_max : settings.frozen_water_evolution_scroll_max)]
		}
	];
}
function worldBossProfile(settings) {
	return [
		{
			id: "gear",
			label: "Ekipman",
			rolls: 1,
			charmMultiplierBps: 12500,
			outcomes: gearOutcomes(legacyRarityPpms(settings.regular_item_drop_chance, settings.boss_red_chance, settings.boss_orange_chance, settings.boss_blue_chance), settings.boss_armor_chance, "generic", true)
		},
		{
			id: "essence",
			label: "Yaşam Özü",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [resourceOutcome("essence", 28, 46)]
		},
		{
			id: "stone-book",
			label: "Taş Sanatı Kitabı",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [rareResourceOutcome("stone_book", settings.world_boss_stone_book_chance * LOOT_PPM, settings.world_boss_stone_book_min, settings.world_boss_stone_book_max)]
		},
		{
			id: "evolution-scroll",
			label: "Evrim Parşömeni",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [rareResourceOutcome("evolution_scroll", settings.world_boss_evolution_scroll_chance * LOOT_PPM, settings.world_boss_evolution_scroll_min, settings.world_boss_evolution_scroll_max)]
		}
	];
}
function sinsiStoneProfile(settings) {
	const essenceMin = Math.max(1, Math.floor(finiteNumber(settings.sinsi_stone_essence_min, 1)));
	const essenceMax = Math.max(essenceMin, Math.floor(finiteNumber(settings.sinsi_stone_essence_max, essenceMin)));
	return [
		{
			id: "gear",
			label: "Sinsi ekipman",
			rolls: 1,
			charmMultiplierBps: 12500,
			outcomes: gearOutcomes(legacyRarityPpms(settings.sinsi_stone_gear_drops > 0 ? settings.regular_item_drop_chance : 0, settings.sinsi_stone_red_chance, settings.sinsi_stone_orange_chance, settings.sinsi_stone_blue_chance), settings.sinsi_stone_armor_chance, "sinsi", true)
		},
		{
			id: "stone-dust",
			label: "Taş Tozu",
			rolls: finiteNumber(settings.sinsi_stone_dust_reward) > 0 ? 1 : 0,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [resourceOutcome("stone_dust", settings.sinsi_stone_dust_reward, settings.sinsi_stone_dust_reward)]
		},
		{
			id: "essence",
			label: "Yaşam Özü",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [resourceOutcome("essence", essenceMin, essenceMax)]
		}
	];
}
function buildDefaultLootProfile(key, settings) {
	const definition = lootSourceDefinition(key);
	let groups;
	if (key === "boss.black_stone") groups = frozenEliteProfile("boss.frozen_throne",{...settings,regular_red_chance:.05,regular_orange_chance:.2,regular_blue_chance:.4,regular_armor_chance:.5,frozen_boss_item_drop_chance:.75,frozen_boss_stone_book_chance:.3,frozen_boss_stone_book_min:1,frozen_boss_stone_book_max:1,frozen_boss_evolution_scroll_chance:.3,frozen_boss_evolution_scroll_min:1,frozen_boss_evolution_scroll_max:1});
	else if (key === "boss.world") groups = worldBossProfile(settings);
	else if (key === "boss.frozen_throne" || key === "boss.frozen_water") groups = frozenEliteProfile(key, settings);
	else if (key === "sinsi.stone") groups = sinsiStoneProfile(settings);
	else groups = regularProfile(key, settings);
	const profile = {
		version: 1,
		key,
		label: definition.label,
		groups
	};
	return upgradeEquipmentDropProfile(withSimpleLootChances(profile, extractSimpleLootChances(profile)));
}
function monsterSpecies(monster) {
	const id = String(monster.id ?? "").toLocaleLowerCase("tr-TR");
	const name = String(monster.name ?? "").toLocaleLowerCase("tr-TR");
	if (id.startsWith("golge-") || name.includes("kurd") || name.includes("kurt")) return "golge";
	if (id.startsWith("curuk-") || name.includes("muhafız") || name.includes("muhafiz")) return "curuk";
	if (id.startsWith("yutan-") || name.includes("yutan")) return "yutan";
	return null;
}
function resolveLootSourceKey(monster) {
 if(isBlackStoneBoss476(monster.id))return "boss.black_stone";if(monster.area==='event')return EVENT_BOSSES444.find(b=>b.kind===eventKind444(monster))?.source??null;
 if(monster.area==='rune_v2'){const k=runeV2MonsterKey(monster);return k?'rune_v2.'+k:null;}if(monster.area==='rune'){const k=runeMonsterKey(monster);return k?'rune.'+k:null;}
	const id = String(monster.id ?? "");
	if (monster.area === "afk") return null;
	if (monster.area === "black") {
		const slot = /-black-c[1-3]-([1-8])$/.exec(id)?.[1];
		return slot ? `black.slot${slot}` : null;
	}
	if (id === "frozen-boss-1" || id === "ancient-boss-1") return "boss.frozen_throne";
	if (id.startsWith("frozen-water-c")) return "boss.frozen_water";
	if (Boolean(monster.is_boss)) return "boss.world";
	if (Boolean(monster.is_stone)) return "sinsi.stone";
	const species = monsterSpecies(monster);
	if (!species) return null;
	if (monster.area === "sinsi" || Boolean(monster.summoned)) {
		if (species === "golge") return "sinsi.golge.agresif";
		if (species === "curuk") return "sinsi.curuk.agresif";
		return "sinsi.yutan.katil";
	}
	if (monster.area === "ancient") return `ancient.${species}.normal`;
	const zone = monster.area === "frozen" ? "frozen" : "forest";
	const rawVariant = String(monster.variant ?? "").toLocaleLowerCase("tr-TR");
	return `${zone}.${species}.${rawVariant === "katil" ? "katil" : rawVariant === "agresif" ? "agresif" : "normal"}`;
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizedItem(value, path, errors) {
	if (!isRecord(value)) {
		errors.push(`${path}: Geçerli bir eşya seçilmelidir.`);
		return null;
	}
	if (value.type === "gear") {
		if (!ITEM_FAMILIES.has(String(value.family))) errors.push(`${path}.family: Bilinmeyen ekipman ailesi.`);
		if (!GEAR_KINDS.has(String(value.kind))) errors.push(`${path}.kind: Bilinmeyen ekipman türü.`);
		if (!RARITIES.has(String(value.rarity))) errors.push(`${path}.rarity: Bilinmeyen nadirlik.`);
		if (!ITEM_FAMILIES.has(String(value.family)) || !GEAR_KINDS.has(String(value.kind)) || !RARITIES.has(String(value.rarity))) return null;
		if (value.family === "sinsi" && value.kind !== "weapon" && value.kind !== "armor") {
			errors.push(`${path}: Sinsi aile yalnız silah ve zırhta kullanılabilir.`);
			return null;
		}
		return {
			type: "gear",
			family: value.family,
			kind: value.kind,
			rarity: value.rarity
		};
	}
	if (value.type === "resource") {
		if (!RESOURCE_KINDS.has(String(value.kind))) {
			errors.push(`${path}.kind: Bilinmeyen kaynak türü.`);
			return null;
		}
		return {
			type: "resource",
			kind: value.kind
		};
	}
	errors.push(`${path}.type: Yalnız ekipman veya kaynak seçilebilir.`);
	return null;
}
function validateLootProfile(sourceKey, input) {
	const errors = [];
	if (!isLootSourceKey(sourceKey)) return {
		ok: false,
		errors: ["Bilinmeyen canavar veya boss profili."]
	};
	if (!isRecord(input)) return {
		ok: false,
		errors: ["Ganimet profili geçerli bir nesne olmalıdır."]
	};
	if (input.version !== 1) errors.push("version: Yalnız profil sürümü 1 destekleniyor.");
	if (input.key !== sourceKey) errors.push("key: Profil, seçilen canavar veya boss ile eşleşmiyor.");
	if (!Array.isArray(input.groups)) errors.push("groups: Ganimet grupları liste olmalıdır.");
	else if (input.groups.length > 12) errors.push(`groups: En fazla 12 grup kullanılabilir.`);
	const groups = [];
	const groupIds = /* @__PURE__ */ new Set();
	let totalRolls = 0;
	if (Array.isArray(input.groups)) input.groups.slice(0, 13).forEach((rawGroup, groupIndex) => {
		const path = `groups[${groupIndex}]`;
		if (!isRecord(rawGroup)) {
			errors.push(`${path}: Geçerli bir grup olmalıdır.`);
			return;
		}
		const id = typeof rawGroup.id === "string" ? rawGroup.id.trim() : "";
		const label = typeof rawGroup.label === "string" ? rawGroup.label.trim() : "";
		if (!SAFE_ID.test(id)) errors.push(`${path}.id: 1-48 karakterlik güvenli bir kimlik olmalıdır.`);
		if (groupIds.has(id)) errors.push(`${path}.id: Grup kimlikleri benzersiz olmalıdır.`);
		groupIds.add(id);
		if (!SAFE_LABEL.test(label)) errors.push(`${path}.label: 1-80 karakterlik geçerli bir başlık olmalıdır.`);
		if (!integerInRange(rawGroup.rolls, 0, 12)) errors.push(`${path}.rolls: 0 ile 12 arasında tam sayı olmalıdır.`);
		if (!integerInRange(rawGroup.charmMultiplierBps, 1e4, 3e4)) errors.push(`${path}.charmMultiplierBps: 10000 ile 30000 arasında tam sayı olmalıdır.`);
		const rolls = integerInRange(rawGroup.rolls, 0, 12) ? Number(rawGroup.rolls) : 0;
		totalRolls += rolls;
		if (!Array.isArray(rawGroup.outcomes)) errors.push(`${path}.outcomes: Sonuçlar liste olmalıdır.`);
		else if (rawGroup.outcomes.length > 32) errors.push(`${path}.outcomes: En fazla 32 sonuç kullanılabilir.`);
		const outcomes = [];
		const outcomeIds = /* @__PURE__ */ new Set();
		let totalChancePpm = 0;
		if (Array.isArray(rawGroup.outcomes)) rawGroup.outcomes.slice(0, 33).forEach((rawOutcome, outcomeIndex) => {
			const outcomePath = `${path}.outcomes[${outcomeIndex}]`;
			if (!isRecord(rawOutcome)) {
				errors.push(`${outcomePath}: Geçerli bir sonuç olmalıdır.`);
				return;
			}
			const outcomeId = typeof rawOutcome.id === "string" ? rawOutcome.id.trim() : "";
			if (!SAFE_ID.test(outcomeId)) errors.push(`${outcomePath}.id: 1-48 karakterlik güvenli bir kimlik olmalıdır.`);
			if (outcomeIds.has(outcomeId)) errors.push(`${outcomePath}.id: Sonuç kimlikleri grup içinde benzersiz olmalıdır.`);
			outcomeIds.add(outcomeId);
			const item = normalizedItem(rawOutcome.item, `${outcomePath}.item`, errors);
			if (!integerInRange(rawOutcome.baseChancePpm, 0, 1e6)) errors.push(`${outcomePath}.baseChancePpm: 0 ile 1000000 arasında tam sayı olmalıdır.`);
			if (!integerInRange(rawOutcome.minAmount, 1, 1e6)) errors.push(`${outcomePath}.minAmount: 1 ile 1000000 arasında tam sayı olmalıdır.`);
			if (!integerInRange(rawOutcome.maxAmount, 1, 1e6)) errors.push(`${outcomePath}.maxAmount: 1 ile 1000000 arasında tam sayı olmalıdır.`);
			if (integerInRange(rawOutcome.minAmount, 1, 1e6) && integerInRange(rawOutcome.maxAmount, 1, 1e6) && Number(rawOutcome.minAmount) > Number(rawOutcome.maxAmount)) errors.push(`${outcomePath}: Asgari miktar azami miktarı aşamaz.`);
			if (!integerInRange(rawOutcome.charmWeight, 0, 1e6)) errors.push(`${outcomePath}.charmWeight: 0 ile 1000000 arasında tam sayı olmalıdır.`);
			if (item?.type === "gear" && (rawOutcome.minAmount !== 1 || rawOutcome.maxAmount !== 1)) errors.push(`${outcomePath}: Ekipman miktarı 1 olmalıdır; birden fazla deneme için grup tekrarını kullanın.`);
			if (integerInRange(rawOutcome.baseChancePpm, 0, 1e6)) totalChancePpm += Number(rawOutcome.baseChancePpm);
			if (item && integerInRange(rawOutcome.baseChancePpm, 0, 1e6) && integerInRange(rawOutcome.minAmount, 1, 1e6) && integerInRange(rawOutcome.maxAmount, 1, 1e6) && integerInRange(rawOutcome.charmWeight, 0, 1e6)) outcomes.push({
				id: outcomeId,
				item,
				baseChancePpm: Number(rawOutcome.baseChancePpm),
				minAmount: Number(rawOutcome.minAmount),
				maxAmount: Number(rawOutcome.maxAmount),
				charmWeight: Number(rawOutcome.charmWeight)
			});
		});
		if (totalChancePpm > 1e6) errors.push(`${path}: Birbirini dışlayan sonuçların toplam şansı %100'ü aşamaz.`);
		if (rawGroup.gearChanceModel !== void 0 && rawGroup.gearChanceModel !== "direct") errors.push(`${path}: Ekipman oran modeli geçersiz.`);
		if (rawGroup.gearChanceModel === "direct") {
			if (rawGroup.equipmentChancePpm !== void 0 || !outcomes.length || outcomes.some((o) => o.item.type !== "gear") || rolls !== 1) errors.push(`${path}: Kesim başı oranları tek ekipman grubunda ve tek çekilişte kullanılmalıdır.`);
		}
		if (rawGroup.equipmentChancePpm !== void 0) {
			if (!integerInRange(rawGroup.equipmentChancePpm, 0, 1e6)) errors.push(`${path}: Ekipman düşme şansı 0–1000000 arasında tam sayı olmalıdır.`);
			if (!outcomes.length || outcomes.some((o) => o.item.type !== "gear") || totalChancePpm !== 1e6 || rolls !== 1) errors.push(`${path}: Yeni ekipman dağılımı yalnız ekipman, tek deneme ve toplam %100 olmalıdır.`);
		}
		if (SAFE_ID.test(id) && SAFE_LABEL.test(label) && integerInRange(rawGroup.rolls, 0, 12) && integerInRange(rawGroup.charmMultiplierBps, 1e4, 3e4) && Array.isArray(rawGroup.outcomes)) groups.push({
			id,
			label,
			rolls,
			charmMultiplierBps: Number(rawGroup.charmMultiplierBps),
			outcomes,
			...rawGroup.equipmentChancePpm !== void 0 ? { equipmentChancePpm: Number(rawGroup.equipmentChancePpm) } : {},
			...rawGroup.gearChanceModel === "direct" ? { gearChanceModel: "direct" } : {}
		});
	});
	if (totalRolls > 24) errors.push(`Grupların toplam deneme sayısı 24 değerini aşamaz.`);
	const normalized = {
		version: 1,
		key: sourceKey,
		label: lootSourceDefinition(sourceKey).label,
		groups
	};
	if (new TextEncoder().encode(JSON.stringify(normalized)).byteLength > 12e3) errors.push(`Profil ${MAX_LOOT_PROFILE_JSON_BYTES} bayt sınırını aşıyor.`);
	return errors.length ? {
		ok: false,
		errors: errors.slice(0, 40)
	} : {
		ok: true,
		profile: normalized
	};
}
function validateRewardSafeLootProfile(sourceKey, input) {
	const structural = validateLootProfile(sourceKey, input);
	if (!structural.ok) return structural;
	const { profile } = structural;
	const errors = [];
	const gearGroups = profile.groups.filter((group) => group.outcomes.some((outcome) => outcome.item.type === "gear"));
	if (gearGroups.length !== 1) errors.push("Profilde tam bir ekipman grubu olmalıdır.");
	const gearGroup = gearGroups[0];
	if (gearGroup) {
		if (gearGroup.rolls !== 1) errors.push("Ekipman grubu yalnız bir çekiliş yapmalıdır.");
		if (gearGroup.outcomes.some((outcome) => outcome.item.type !== "gear")) errors.push("Ekipman grubu kaynaklarla karıştırılamaz.");
	}
	const essenceEntries = profile.groups.flatMap((group) => group.outcomes.filter((outcome) => outcome.item.type === "resource" && outcome.item.kind === "essence").map((outcome) => ({
		group,
		outcome
	})));
	if (essenceEntries.length !== 1) errors.push("Profilde tam bir Yaşam Özü sonucu olmalıdır.");
	const essenceEntry = essenceEntries[0];
	if (essenceEntry) {
		const { group, outcome } = essenceEntry;
		if (group.outcomes.length !== 1) errors.push("Yaşam Özü ayrı ve korumalı bir grupta olmalıdır.");
		if (group.rolls !== 1 || outcome.baseChancePpm !== 1e6) errors.push("Yaşam Özü her kesimde tam bir kez ve %100 oranla çekilmelidir.");
		if (group.charmMultiplierBps !== 1e4 || outcome.charmWeight !== 0) errors.push("Yaşam Özü oranı Ganimet Tılsımı ile değiştirilemez.");
	}
	const protectedGroups = /* @__PURE__ */ new Set();
	if (gearGroup) protectedGroups.add(gearGroup);
	if (essenceEntry) protectedGroups.add(essenceEntry.group);
	const extraGroups = profile.groups.filter((group) => !protectedGroups.has(group));
	if (!allowsSpecialLootResources(sourceKey) && extraGroups.some((g) => g.outcomes.some((o) => o.item.type !== "resource" || !UPGRADE_MATERIAL_KINDS.includes(o.item.kind) || !allowsProfileResource(sourceKey, o.item.kind)))) errors.push("Ek malzemeler yalnız bosslarda ve Sinsi Taş'ta kullanılabilir.");
	if (extraGroups.length) {
		const seen = /* @__PURE__ */ new Set();
		for (const group of extraGroups) {
			const outcome = group.outcomes[0];
			if (group.rolls < 0 || group.rolls > 1 || group.outcomes.length !== 1 || outcome?.item.type !== "resource" || !allowsProfileResource(sourceKey, outcome.item.kind)) errors.push("Ek malzemeler yalnız tek çekilişlik, ayrı kaynak grupları olabilir.");
			else {
				if (seen.has(outcome.item.kind)) errors.push("Her özel malzeme için yalnız bir düşme oranı ayarlanabilir.");
				seen.add(outcome.item.kind);
				if (group.charmMultiplierBps !== 1e4 || outcome.charmWeight !== 0) errors.push("Ek malzeme oranları Ganimet Tılsımı ile değiştirilemez.");
			}
		}
	}
	return errors.length ? {
		ok: false,
		errors
	} : structural;
}
function getBossEffectiveLootGroups(profile, hasDropCharm, eventPercent = 0, itemMultiplier = 1) {
	return (profile.key === "sinsi.stone" ? withLegacyHelmetDrops(profile) : profile).groups.map((originalGroup) => {
		const group = profile.key === "sinsi.stone" ? originalGroup : {
			...originalGroup,
			outcomes: originalGroup.outcomes.filter((o) => !(o.item.type === "gear" && o.item.kind === "helmet"))
		};
		const baseTotalChancePpm = group.outcomes.reduce((sum, outcome) => sum + outcome.baseChancePpm, 0);
		const multiplier = hasDropCharm ? group.charmMultiplierBps : LOOT_BPS;
		const targetTotal = Math.min(LOOT_PPM, Math.round(baseTotalChancePpm * multiplier / LOOT_BPS));
		const bonusShares = weightedSplit(Math.max(0, targetTotal - baseTotalChancePpm), group.outcomes.map((outcome) => outcome.charmWeight));
		let outcomes = group.outcomes.map((outcome, index) => ({
			...outcome,
			effectiveChancePpm: outcome.baseChancePpm + bonusShares[index]
		}));
		const bossEquipment = profile.key.startsWith("boss.") && outcomes.some((outcome) => outcome.item.type === "gear");
		if (bossEquipment) {
			outcomes = outcomes.filter((outcome) => outcome.item.type === "gear");
			if (!outcomes.some((outcome) => outcome.effectiveChancePpm > 0)) outcomes = OPEN_WORLD_LOOT_GEAR_KINDS.map((kind) => ({
				id: `boss-fallback-${kind}`,
				item: {
					type: "gear",
					family: "generic",
					kind,
					rarity: "white"
				},
				baseChancePpm: 0,
				effectiveChancePpm: LOOT_PPM / OPEN_WORLD_LOOT_GEAR_KINDS.length,
				minAmount: 1,
				maxAmount: 1,
				charmWeight: 0
			}));
			const shares = weightedSplit(LOOT_PPM, outcomes.map((outcome) => outcome.effectiveChancePpm));
			outcomes = outcomes.map((outcome, index) => ({
				...outcome,
				effectiveChancePpm: shares[index]
			}));
		}
		if (eventPercent > 0 && !bossEquipment && !outcomes.some((o) => o.item.type === "resource" && o.item.kind === "essence")) {
			const shares = weightedSplit(Math.min(LOOT_PPM, Math.round(outcomes.reduce((n, o) => n + o.effectiveChancePpm, 0) * (1 + Math.min(500, eventPercent) / 100))), outcomes.map((o) => o.effectiveChancePpm));
			outcomes = outcomes.map((o, i) => ({
				...o,
				effectiveChancePpm: shares[i]
			}));
		}
		if (profile.key.startsWith("forest.") && itemMultiplier < 1) outcomes = outcomes.map((o) => ({
			...o,
			effectiveChancePpm: o.item.type === "resource" && o.item.kind === "essence" ? o.effectiveChancePpm : Math.round(o.effectiveChancePpm * Math.max(0, itemMultiplier))
		}));
		const effectiveTotalChancePpm = outcomes.reduce((sum, outcome) => sum + outcome.effectiveChancePpm, 0);
		return {
			...group,
			rolls: bossEquipment ? 3 : group.rolls,
			baseTotalChancePpm,
			effectiveTotalChancePpm,
			outcomes
		};
	});
}
function getEffectiveLootGroups(profile, hasDropCharm, eventPercent = 0, itemMultiplier = 1, materialLevel498 = false) {
	if (profile.key.startsWith("boss.")) return getBossEffectiveLootGroups(profile, hasDropCharm, eventPercent, itemMultiplier);
	const effectiveProfile = withLegacyHelmetDrops(upgradeEquipmentDropProfile(profile));
	const eventMultiplier = 1 + Math.max(0, Math.min(500, finiteNumber(eventPercent))) / 100;
	const levelMultiplier = (profile.key.startsWith('forest.')||profile.key.startsWith('frozen.')||profile.key.startsWith('black.')) ? Math.max(0, Math.min(1, finiteNumber(itemMultiplier, 1))) : 1;
	return effectiveProfile.groups.map((group) => {
		if (group.outcomes.some((o) => o.item.type === "gear")) {
			const direct = group.gearChanceModel === "direct";
			const baseTotalChancePpm = direct ? group.outcomes.reduce((sum, o) => sum + o.baseChancePpm, 0) : normalizedSimpleChance(group.equipmentChancePpm ?? 0);
			const charmMultiplier = hasDropCharm ? group.charmMultiplierBps / LOOT_BPS : 1;
			const effectiveTotalChancePpm = Math.round(Math.min(LOOT_PPM, baseTotalChancePpm * charmMultiplier * eventMultiplier) * levelMultiplier);
			const weights = group.outcomes.map((o) => o.baseChancePpm);
			const base = weightedSplit(baseTotalChancePpm, weights);
			const effective = weightedSplit(effectiveTotalChancePpm, weights);
			return {
				...group,
				rolls: 1,
				baseTotalChancePpm,
				effectiveTotalChancePpm,
				outcomes: group.outcomes.map((outcome, i) => ({
					...outcome,
					...!direct ? { conditionalChancePpm: outcome.baseChancePpm } : {},
					baseChancePpm: base[i],
					effectiveChancePpm: effective[i]
				}))
			};
		}
		const baseTotalChancePpm = group.outcomes.reduce((sum, o) => sum + o.baseChancePpm, 0);
		const essence = group.outcomes.some((o) => o.item.type === "resource" && o.item.kind === "essence");
		const fixedMaterial = group.outcomes.some((o) => o.item.type === "resource" && UPGRADE_MATERIAL_KINDS.includes(o.item.kind));
		const allMaterials498=materialLevel498&&group.outcomes.every(o=>materialLevelItem498(o.item));
		const target = essence || fixedMaterial ? baseTotalChancePpm : Math.round(Math.min(LOOT_PPM, baseTotalChancePpm * eventMultiplier) * (allMaterials498?1:levelMultiplier));
		const chances = weightedSplit(target, group.outcomes.map((o) => o.baseChancePpm));
		const materialChances498=materialLevel498&&!allMaterials498&&!essence&&!fixedMaterial&&levelMultiplier!==1&&group.outcomes.some(o=>materialLevelItem498(o.item))?weightedSplit(Math.round(Math.min(LOOT_PPM,baseTotalChancePpm*eventMultiplier)),group.outcomes.map(o=>o.baseChancePpm)):null;
		const effectiveChances498=materialChances498?chances.map((chance,i)=>materialLevelItem498(group.outcomes[i].item)?materialChances498[i]:chance):chances;
		return {
			...group,
			baseTotalChancePpm,
			effectiveTotalChancePpm: materialChances498?effectiveChances498.reduce((sum,chance)=>sum+chance,0):target,
			outcomes: group.outcomes.map((outcome, i) => ({
				...outcome,
				effectiveChancePpm: effectiveChances498[i]
			}))
		};
	});
}
function normalizedRandom(random) {
	const value = finiteNumber(random());
	if (value <= 0) return 0;
	if (value >= 1) return 1 - Number.EPSILON;
	return value;
}
function rollLootProfile(profile, options) {
	const random = options.random ?? Math.random;
	const rolled = [];
	let equipmentAwarded = 0;
	let equipmentAttempted = false;
	const boss = profile.key.startsWith("boss.");
	const eventMultiplier = 1 + Math.max(0, Math.min(500, options.eventPercent ?? 0)) / 100;
	const bossRollValue = 3 * eventMultiplier;
	const bossRolls = !boss || eventMultiplier === 1 ? 3 : Math.floor(bossRollValue) + (random() < bossRollValue % 1 ? 1 : 0);
	const equipmentLimit = boss ? bossRolls : 1;
	let essenceAwarded = false;
	const specialAwarded = /* @__PURE__ */ new Set();
	for (const original of scaleLootGroups487(getEffectiveLootGroups(profile, options.hasDropCharm, options.eventPercent, options.itemMultiplier,options.materialLevel498??false),options.levelBalanceMultiplier487??1,profile.key.startsWith("boss."),options.materialLevel498??false)) {
		const group = {
			...original,
			outcomes: original.outcomes.map((o) => ({ ...o }))
		};
		const gearGroup = group.outcomes.some((o) => o.item.type === "gear");
		if (gearGroup && !boss && equipmentAttempted) continue;
		if (gearGroup && !boss) equipmentAttempted = true;
		for (let rollIndex = 0; rollIndex < (gearGroup ? boss ? bossRolls : 1 : group.rolls); rollIndex += 1) {
			if (gearGroup && !boss && group.gearChanceModel !== "direct" && Math.floor(normalizedRandom(random) * 1e6) >= group.effectiveTotalChancePpm) continue;
			const value = Math.floor(normalizedRandom(random) * LOOT_PPM);
			let cursor = 0;
			const outcome = group.outcomes.find((candidate) => {
				cursor += gearGroup && !boss && group.gearChanceModel !== "direct" ? candidate.conditionalChancePpm ?? 0 : candidate.effectiveChancePpm*(gearGroup&&boss&&rollIndex>=3?(options.levelBalanceMultiplier487??1):1);
				return value < cursor;
			});
			if (!outcome) continue;
			if (outcome.item.type === "gear") {
				if (equipmentAwarded >= equipmentLimit) continue;
				equipmentAwarded += 1;
			} else if (outcome.item.kind === "essence") {
				if (essenceAwarded) continue;
				essenceAwarded = true;
			} else {
				if (!allowsProfileResource(profile.key, outcome.item.kind) || specialAwarded.has(outcome.item.kind)) continue;
				specialAwarded.add(outcome.item.kind);
			}
			const amountSpan = outcome.maxAmount - outcome.minAmount + 1;
			const amount = outcome.minAmount + Math.floor(normalizedRandom(random) * amountSpan);
			rolled.push({
				groupId: group.id,
				rollIndex,
				outcomeId: outcome.id,
				item: outcome.item,
				amount,
				chancePpm: outcome.effectiveChancePpm
			});
		}
	}
	const ancientNormal = profile.key.startsWith("ancient.") && profile.key.endsWith(".normal");
	const purpleChance = Math.max(0, Math.min(LOOT_PPM, Math.floor(boss ? options.bossPurpleChancePpm ?? 0 : ancientNormal ? (options.ancientNormalPurpleChancePpm ?? 0)*(rolled.some(row=>row.item.type==="gear")?1:options.levelBalanceMultiplier487??1) : 0)));
	const firstGear = purpleChance > 0 ? rolled.findIndex((row) => row.item.type === "gear") : -1;
	if (purpleChance > 0 && (ancientNormal || firstGear >= 0) && Math.floor(normalizedRandom(random) * 1e6) < purpleChance) {
		const kind = LOOT_GEAR_KINDS[Math.floor(normalizedRandom(random) * LOOT_GEAR_KINDS.length)];
		const purple = {
			...firstGear >= 0 ? rolled[firstGear] : {
				groupId: "ancient-purple",
				rollIndex: 0,
				outcomeId: `purple-${kind}`,
				amount: 1
			},
			item: {
				type: "gear",
				family: "generic",
				rarity: "purple",
				kind
			},
			chancePpm: purpleChance
		};
		if (firstGear >= 0) rolled[firstGear] = purple;
		else rolled.push(purple);
	}
	return rolled;
}
var GENERIC_GEAR_NAMES = {
	muhafiz: {
		weapon: {
			white: "Kül Çeliği",
			blue: "Safir Nöbet",
			orange: "Güneş Yaran",
			red: "Kızıl Kıyamet"
		},
		armor: {
			white: "Demir Nöbet Zırhı",
			blue: "Safir Muhafız Zırhı",
			orange: "Kor Tahtı Zırhı",
			red: "Kan Tahtı Zırhı"
		},
		helmet: {
			white: "Demir Nöbet Miğferi",
			blue: "Safir Nöbet Miğferi",
			orange: "Kor Tahtı Miğferi",
			red: "Kan Tahtı Miğferi"
		},
		shoes: {
			white: "Kül Muhafız Çizmeleri",
			blue: "Safir Muhafız Çizmeleri",
			orange: "Kor Muhafız Çizmeleri",
			red: "Kızıl Muhafız Çizmeleri"
		},
		necklace: {
			white: "Kül Muhafız Kolyesi",
			blue: "Safir Muhafız Kolyesi",
			orange: "Kor Muhafız Kolyesi",
			red: "Kızıl Muhafız Kolyesi"
		}
	},
	avci: {
		weapon: {
			white: "Sis Kirişli Yay",
			blue: "Ayaz Dişi Yayı",
			orange: "Kor Anka Yayı",
			red: "Kızıl Ejder Yayı"
		},
		armor: {
			white: "Sınır Derisi",
			blue: "Mavi Gölge Postu",
			orange: "Anka Avcı Zırhı",
			red: "Alev Avcısı Zırhı"
		},
		helmet: {
			white: "Sınır Avcı Başlığı",
			blue: "Mavi Gölge Başlığı",
			orange: "Anka Avcı Başlığı",
			red: "Alev Avcısı Başlığı"
		},
		shoes: {
			white: "Kül Avcı Çizmeleri",
			blue: "Safir Avcı Çizmeleri",
			orange: "Kor Avcı Çizmeleri",
			red: "Kızıl Avcı Çizmeleri"
		},
		necklace: {
			white: "Kül Avcı Kolyesi",
			blue: "Safir Avcı Kolyesi",
			orange: "Kor Avcı Kolyesi",
			red: "Kızıl Avcı Kolyesi"
		}
	},
	arkanist: {
		weapon: {
			white: "Kül Asası",
			blue: "Rün Çağrısı",
			orange: "Yıldız Kıran",
			red: "Kızıl Hiçlik"
		},
		armor: {
			white: "Soluk Cübbe",
			blue: "Safir Rün Cübbesi",
			orange: "Güneş Dokuması",
			red: "Kan Rünü Cübbesi"
		},
		helmet: {
			white: "Soluk Rün Tacı",
			blue: "Safir Rün Tacı",
			orange: "Güneş Tacı",
			red: "Kan Rünü Tacı"
		},
		shoes: {
			white: "Kül Rün Çizmeleri",
			blue: "Safir Rün Çizmeleri",
			orange: "Kor Rün Çizmeleri",
			red: "Kızıl Rün Çizmeleri"
		},
		necklace: {
			white: "Kül Rün Kolyesi",
			blue: "Safir Rün Kolyesi",
			orange: "Kor Rün Kolyesi",
			red: "Kızıl Rün Kolyesi"
		}
	}
};
var SINSI_GEAR_NAMES = {
	muhafiz: {
		weapon: "Sinsi Kaya Kılıcı",
		armor: "Sinsi Taş Zırhı"
	},
	avci: {
		weapon: "Sinsi Kaya Yayı",
		armor: "Sinsi İzci Zırhı"
	},
	arkanist: {
		weapon: "Sinsi Kaya Asası",
		armor: "Sinsi Rün Cübbesi"
	}
};
function rollLootRole(random = Math.random) {
	return [
		"muhafiz",
		"avci",
		"arkanist"
	][Math.min(2, Math.max(0, Math.floor(random() * 3)))];
}
function resolveLootItemName(item, role) {if(item.rarity==="emerald")return emeraldName444(item.kind,role);
	if (item.type === "resource") return progressionMaterial(item.kind)?.label ?? (item.kind === "stone_dust" ? "Taş Tozu" : item.kind === "pearl" ? "İnci" : item.kind === "stone_book" ? "Taş Sanatı Kitabı" : item.kind === "evolution_scroll" ? "Evrim Parşömeni" : "Yaşam Özü");
	const safeRole = role === "avci" || role === "arkanist" ? role : "muhafiz";
	if (item.rarity === "purple") return {
		muhafiz: {
			weapon: "Mor Kök Kılıcı",
			armor: "Mor Kök Zırhı",
			helmet: "Mor Kök Miğferi",
			shoes: "Mor Kök Çizmeleri",
			necklace: "Mor Kök Kolyesi"
		},
		avci: {
			weapon: "Alacakaranlık Yayı",
			armor: "Alacakaranlık Zırhı",
			helmet: "Alacakaranlık Başlığı",
			shoes: "Alacakaranlık Çizmeleri",
			necklace: "Alacakaranlık Kolyesi"
		},
		arkanist: {
			weapon: "Kadim Menekşe Asası",
			armor: "Kadim Menekşe Cübbesi",
			helmet: "Kadim Menekşe Tacı",
			shoes: "Kadim Menekşe Çizmeleri",
			necklace: "Kadim Menekşe Kolyesi"
		}
	}[safeRole][item.kind];
	if (item.family === "sinsi" && (item.kind === "weapon" || item.kind === "armor")) return SINSI_GEAR_NAMES[safeRole][item.kind];
	return GENERIC_GEAR_NAMES[safeRole][item.kind][item.rarity];
}
function resolveLootPowerRange(item, settings) {if(item.rarity==="emerald"){const power=emeraldPower444(item.kind,settings);return {min:power,max:power};}
	if (item.type === "resource") return {
		min: 0,
		max: 0
	};
	const gearClass = item.kind === "weapon" ? "weapon" : "armor";
	if (item.rarity === "purple") {
		const redMax = Math.max(0, Math.floor(finiteNumber(settings[`red_${gearClass}_power_max`])));
		const uniquePower = Math.max(1, Math.floor(finiteNumber(settings[`unique_${gearClass}_power`], gearClass === "weapon" ? 180 : 150)));
		const max = Math.min(uniquePower - 1, redMax + 15);
		return {
			min: Math.max(0, Math.min(max, redMax + 5)),
			max: Math.max(0, max)
		};
	}
	const min = Math.max(0, Math.floor(finiteNumber(settings[`${item.rarity}_${gearClass}_power_min`])));
	return {
		min,
		max: Math.max(min, Math.floor(finiteNumber(settings[`${item.rarity}_${gearClass}_power_max`], min)))
	};
}
function rollLootPower(item, settings, random = Math.random) {
	const range = resolveLootPowerRange(item, settings);
	return range.min + Math.floor(normalizedRandom(random) * (range.max - range.min + 1));
}
function compactLootProfile(profile) {
	return [
		1,
		profile.key,
		profile.groups.map((group) => [
			group.id,
			group.label,
			group.rolls,
			group.charmMultiplierBps,
			group.outcomes.map((outcome) => [
				outcome.id,
				outcome.item.type === "gear" ? [
					0,
					outcome.item.family,
					outcome.item.kind,
					outcome.item.rarity
				] : [1, outcome.item.kind],
				outcome.baseChancePpm,
				outcome.minAmount,
				outcome.maxAmount,
				outcome.charmWeight
			]),
			...group.gearChanceModel === "direct" ? [null, "direct"] : group.equipmentChancePpm !== void 0 ? [group.equipmentChancePpm] : []
		])
	];
}
function expandCompactLootProfile(sourceKey, value) {
	if (!Array.isArray(value) || value[0] !== 1 || value[1] !== sourceKey || !Array.isArray(value[2])) return value;
	return {
		version: 1,
		key: sourceKey,
		label: lootSourceDefinition(sourceKey).label,
		groups: value[2].map((rawGroup) => {
			if (!Array.isArray(rawGroup)) return rawGroup;
			return {
				id: rawGroup[0],
				label: rawGroup[1],
				rolls: rawGroup[2],
				charmMultiplierBps: rawGroup[3],
				...rawGroup[5] !== void 0 && rawGroup[5] !== null ? { equipmentChancePpm: rawGroup[5] } : {},
				...rawGroup[6] === "direct" ? { gearChanceModel: "direct" } : {},
				outcomes: Array.isArray(rawGroup[4]) ? rawGroup[4].map((rawOutcome) => {
					if (!Array.isArray(rawOutcome) || !Array.isArray(rawOutcome[1])) return rawOutcome;
					const rawItem = rawOutcome[1];
					return {
						id: rawOutcome[0],
						item: rawItem[0] === 0 ? {
							type: "gear",
							family: rawItem[1],
							kind: rawItem[2],
							rarity: rawItem[3]
						} : {
							type: "resource",
							kind: rawItem[1]
						},
						baseChancePpm: rawOutcome[2],
						minAmount: rawOutcome[3],
						maxAmount: rawOutcome[4],
						charmWeight: rawOutcome[5]
					};
				}) : rawGroup[4]
			};
		})
	};
}
function parseStoredLootProfile(sourceKey, value) {
	try {
		const validated = validateLootProfile(sourceKey, expandCompactLootProfile(sourceKey, typeof value === "string" ? JSON.parse(value) : value));
		return validated.ok ? validated.profile : null;
	} catch {
		return null;
	}
}
function createLootProfileSnapshot(record) {
	return {
		lootSourceKey: record.sourceKey,
		lootProfileRevision: Math.max(0, Math.floor(record.revision)),
		lootProfileJson: JSON.stringify(compactLootProfile(record.profile))
	};
}
function readLootProfileSnapshot(snapshot, fallbackProfile) {
	const sourceKey = isLootSourceKey(snapshot.loot_source_key) ? snapshot.loot_source_key : fallbackProfile.key;
	const parsed = parseStoredLootProfile(sourceKey, snapshot.loot_profile_json);
	const revision = Number.isInteger(snapshot.loot_profile_revision) && Number(snapshot.loot_profile_revision) >= 0 ? Number(snapshot.loot_profile_revision) : 0;
	return {
		sourceKey: parsed ? sourceKey : fallbackProfile.key,
		revision,
		customized: revision > 0,
		updatedAt: 0,
		profile: withEvolutionScrolls(parsed ?? fallbackProfile, fallbackProfile, false)
	};
}
function parseLootProfileSnapshot(snapshot, fallbackProfile) {
	return readLootProfileSnapshot(snapshot, fallbackProfile).profile;
}
function parseLiveLootProfileSnapshot(snapshot, fallbackProfile) {
	const profile = parseLootProfileSnapshot(snapshot, fallbackProfile);
	const validated = validateRewardSafeLootProfile(fallbackProfile.key, profile);
	return validated.ok ? validated.profile : fallbackProfile;
}
function withEvolutionScrolls(profile, fallback, replace = true) {
	if (!profile.key.startsWith("boss.")) return profile;
	const group = fallback.groups.find((g) => g.id === "evolution-scroll");
	if (!group) return profile;
	const existing = profile.groups.some((g) => g.id === group.id);
	if (existing && !replace) return profile;
	return {
		...profile,
		groups: existing ? profile.groups.map((g) => g.id === group.id ? group : g) : [...profile.groups, group]
	};
}
function withLegacyHelmetDrops(profile) {
	if (profile.key !== "sinsi.stone") return {
		...profile,
		groups: profile.groups.map((g) => ({
			...g,
			outcomes: g.outcomes.filter((o) => !(o.item.type === "gear" && o.item.kind === "helmet"))
		}))
	};
	if (profile.groups.some((g) => g.outcomes.some((o) => o.item.type === "gear" && o.item.kind === "helmet"))) return profile;
	return {
		...profile,
		groups: profile.groups.map((g) => ({
			...g,
			outcomes: g.outcomes.flatMap((o) => {
				if (o.item.type !== "gear" || o.item.kind !== "armor") return [o];
				const chance = Math.floor(o.baseChancePpm / 2), charm = Math.floor(o.charmWeight / 2);
				return [{
					...o,
					baseChancePpm: o.baseChancePpm - chance,
					charmWeight: o.charmWeight - charm
				}, {
					...o,
					id: o.id + "-helmet",
					item: {
						...o.item,
						kind: "helmet",
						family: "generic"
					},
					baseChancePpm: chance,
					charmWeight: charm
				}];
			})
		}))
	};
}
function withUpgradeMaterialDrops(profile, rules) {
	const kind = materialForSource(profile.key);
	const groups = profile.groups.filter((g) => !g.outcomes.some((o) => o.item.type === "resource" && UPGRADE_MATERIAL_KINDS.includes(o.item.kind)));
	if (!kind) return {
		...profile,
		groups
	};
	const rule = rules[kind];
	if (!rule) return {
		...profile,
		groups
	};
	return {
		...profile,
		groups: [...groups, {
			id: "upgrade-material",
			label: progressionMaterial(kind).label,
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [{
				id: kind,
				item: {
					type: "resource",
					kind
				},
				baseChancePpm: Math.round(rule.chance * 1e4),
				minAmount: rule.min,
				maxAmount: rule.max,
				charmWeight: 0
			}]
		}]
	};
}
var EQUIPMENT_SETS = Object.freeze({
	red: {
		name: "Kızıl Set",
		slots: [
			"weapon",
			"armor",
			"shoes",
			"necklace"
		],
		bonuses: {
			hp: 0,
			pve: 3,
			pvp: 3,
			resistance: 0,
			speed: 3
		}
	},
	unique: {"name":"Eşsiz Set","slots":["weapon","armor","helmet","shoes","necklace"],"bonuses":{"hp":600,"pve":6,"pvp":6,"resistance":6,"speed":9}},
	purple: {
		name: "Mor Kök Seti",
		slots: [
			"weapon",
			"armor",
			"helmet",
			"shoes",
			"necklace"
		],
		bonuses: {
			hp: 500,
			pve: 5,
			pvp: 5,
			resistance: 5,
			speed: 5
		}
	},
	infinite: {
		name: "Sonsuz Set",
		slots: [
			"weapon",
			"armor",
			"helmet",
			"shoes",
			"necklace"
		],
		bonuses: {
			hp: 700,
			pve: 7,
			pvp: 7,
			resistance: 7,
			speed: 10
		}
	}
,emerald:EMERALD_SET444});
function equipmentSetState(rarity,items){
 const definition=EQUIPMENT_SETS[rarity];if(!definition)return null;
 const worn=new Set(items.filter(item=>item.equipped===1&&item.rarity===rarity).map(item=>item.kind));
 const count=definition.slots.filter(slot=>worn.has(slot)).length;
 const thresholds=Object.fromEntries(Object.keys(definition.bonuses).map(key=>[key,colEquipmentSetThreshold473(key,definition)]));
 const activeBonuses=Object.fromEntries(Object.entries(definition.bonuses).map(([key,value])=>[key,count>=thresholds[key]?value:0]));
 return {...definition,rarity,count,complete:count===definition.slots.length,missing:definition.slots.filter(slot=>!worn.has(slot)),thresholds,activeBonuses};
}
function colEquipmentSetThreshold473(key,definition){
 // V476: each lower tier remains active when a higher-tier piece is removed.
 // Red has no HP bonus and keeps its original three positive bonuses at 2/3/4.
 if(definition.bonuses.hp>0)return key==='hp'?2:key==='pve'?3:key==='pvp'?4:definition.slots.length;
 return key==='pve'?2:key==='pvp'?3:definition.slots.length;
}
function equipmentSetBonuses(items){
 const total={
		hp: 0,
		pve: 0,
		pvp: 0,
		resistance: 0,
		speed: 0
	,attack:0};
 for(const rarity of Object.keys(EQUIPMENT_SETS)){
  const state=equipmentSetState(rarity,items);
  for(const key of Object.keys(total))total[key]+=(state.activeBonuses[key]??0);
 }return total;
}
function effectiveAttackCooldownMs(baseCooldownMs, attackSpeedPercent) {
	const base = Math.max(1, Math.round(Number(baseCooldownMs) || 1));
	const speed = Math.max(0, Math.min(80, Number(attackSpeedPercent) || 0));
	return Math.max(120, Math.round(base / (1 + speed / 100)));
}
function regionalMonsterMultiplier(area, forestPower, frozenPower, isStone = false) {
	return 1 + Math.max(0, Math.min(10, Number(isStone ? 0 : area === "forest" ? forestPower : area === "frozen" ? frozenPower : 0) || 0)) / 100;
}
var validEnchantments = new Set([
 "critical_damage491",
	"stone_talisman",
	"stone_talisman_color",
	"evolution_level",
	"evolution_kills",
	"evolution_attack",
	"evolution_critical",
	"evolution_players",
	"forest_power",
	"frozen_power",
	"fire",
	"ice",
	"sword_defense",
	"arrow_defense",
	"magic_defense",
	"strong_players",
	"resistant_players",
	"critical",
	"attack_speed","cast_speed",
	"life_steal",
	"attack_block",
	"hp",
	"stone_critical",
	"stone_attack",
	"stone_defense",
	"stone_block"
]);
var weaponForbiddenEnchantments = new Set([
	"sword_defense",
	"arrow_defense",
	"magic_defense",
	"resistant_players",
	"attack_block",
	"hp"
]);
function enchantmentFitsItem(kind,itemKind){if(kind==='critical_damage491')return itemKind==='helmet';if(!itemKind)return true;if(['forest_power','frozen_power','cast_speed'].includes(kind))return ['weapon','armor','necklace'].includes(itemKind);if(kind==='stone_talisman'||kind==='stone_talisman_color'||kind.startsWith('evolution_'))return itemKind==='weapon';if(kind==='attack_block')return itemKind==='armor'||itemKind==='helmet';if(kind==='stone_critical'||kind==='stone_attack')return itemKind==='weapon';if(kind==='stone_defense'||kind==='stone_block')return itemKind==='armor';if(itemKind==='weapon')return !weaponForbiddenEnchantments.has(kind);if(itemKind==='armor'||itemKind==='helmet')return kind!=='fire'&&kind!=='ice'&&kind!=='attack_speed';return kind!=='fire'&&kind!=='ice'&&kind!=='attack_speed'&&kind!=='life_steal';}
function isGearKind(value) {
	return value === "weapon" || value === "armor" || value === "helmet" || value === "shoes" || value === "necklace" || value === "earring" || value === "bracelet";
}
function parseEnchantments(value, itemKind) {
	if (typeof value !== "string" || !value) return [];
	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((entry) => validEnchantments.has(entry.kind) && Number.isFinite(Number(entry.value)) && (!["forest_power", "frozen_power"].includes(String(entry.kind)) || Number.isInteger(Number(entry.value)) && Number(entry.value) >= 1 && Number(entry.value) <= 10) && (![
			"attack_speed","cast_speed",
			"life_steal",
			"attack_block"
		].includes(String(entry.kind)) || Number(entry.value) > 0) && enchantmentFitsItem(entry.kind, itemKind)).map((entry) => ({
			kind: entry.kind,
			value: entry.kind.startsWith("evolution_") ? Math.max(0, Math.min(entry.kind === "evolution_kills" ? 1e9 : entry.kind === "evolution_level" ? 3 : entry.kind === "evolution_attack" ? 1e5 : 80, Math.floor(Number(entry.value)))) : entry.kind==="cast_speed"?Math.max(1,Math.min(50,Math.round(Number(entry.value)))):entry.kind === "attack_speed" ? Math.max(1, Math.min(80, Math.round(Number(entry.value)))) : entry.kind === "stone_critical" ? Math.max(7, Math.min(10, Math.round(Number(entry.value)))) : entry.kind === "stone_attack" ? Math.max(20, Math.min(30, Math.round(Number(entry.value)))) : entry.kind === "stone_defense" ? Math.max(30, Math.min(50, Math.round(Number(entry.value)))) : entry.kind === "stone_block" ? Math.max(6, Math.min(8, Math.round(Number(entry.value)))) : entry.kind === "life_steal" || entry.kind === "attack_block" ? Math.max(1, Math.min(15, Math.round(Number(entry.value)))) : Math.max(0, Math.min(entry.kind === "hp" ? 1e6 : 95, Math.round(Number(entry.value))))
		}));
	} catch {
		return [];
	}
}
function totalParsedEnchantments(entries, kind) {
	const total = entries.filter((entry) => entry.kind === kind).reduce((sum, entry) => sum + entry.value, 0);
	const cap = kind==='critical_damage491'?10:kind==="cast_speed"?50:kind === "forest_power" || kind === "frozen_power" ? 10 : kind === "stone_attack" ? 30 : kind === "stone_defense" ? 50 : kind === "stone_critical" ? 10 : kind === "stone_block" ? 8 : kind === "life_steal" ? 15 : kind === "attack_block" ? 15 : kind === "hp" ? 3e6 : kind === "resistant_players" ? 90 : 80;
	const evoKind = kind === "stone_attack" ? "evolution_attack" : kind === "critical" ? "evolution_critical" : kind === "strong_players" ? "evolution_players" : null;
	const talisman = kind === "stone_attack" && entries.some((e) => e.kind === "stone_talisman") ? 15 : 0;
	const evolution = evoKind ? entries.filter((e) => e.kind === evoKind).reduce((sum, e) => sum + e.value, 0) : 0;
	return Math.max(0, Math.min(cap, total)) + evolution + talisman;
}
function colEnhancementEntries491(item,entries) {
 // Keep the already parsed array and avoid allocations for unenhanced items
 // and name-less combat projection rows (which already contain virtual stats).
 if(typeof item?.item_name!=='string'||!item.item_name.startsWith('+5 '))return entries;
 if(item.kind==='weapon')entries.push({kind:'strong_players',value:5});
 else if(item.kind==='shoes')entries.push({kind:'strong_players',value:3});
 else if(item.kind==='armor')entries.push({kind:'resistant_players',value:5});
 else if(item.kind==='necklace')entries.push({kind:'resistant_players',value:3});
 else if(item.kind==='helmet')entries.push({kind:'critical_damage491',value:10});
 return entries;
}
function createEnchantmentTotals(items) {
 if(optimizeR18)return equipmentTotalsR18(items,parseEnchantments,colEnhancementEntries491,totalParsedEnchantments);
	const entries = items.flatMap((item) => colEnhancementEntries491(item,parseEnchantments(item.enchantments, item.kind)));
	return (kind) => totalParsedEnchantments(entries, kind);
}
function enchantmentTotal(items, kind) {
 if(optimizeR18)return equipmentTotalsR18(items,parseEnchantments,colEnhancementEntries491,totalParsedEnchantments)(kind);
	return totalParsedEnchantments(items.flatMap((item) => colEnhancementEntries491(item,parseEnchantments(item.enchantments, item.kind))), kind);
}
function attackIsBlocked(percent, roll = Math.random()) {
	const chance = Math.max(0, Math.min(15, Number(percent) || 0));
	return chance > 0 && Number.isFinite(roll) && roll >= 0 && roll < chance / 100;
}
function calculateEquipmentStats(role, items, settings, wingsEquipped, weaponSkin = false, rank = {
	hp: 0,
	defense: 0,
	pve: 0,
	pvp: 0
}, guild = {
	attack: 0,
	hp: 0,
	xp: 0
}, premium = {
	attack: 0,
	hp: 0
}) {
	const equipped = items.filter((item) => item.equipped === 1 && (isGearKind(item.kind) || item.kind === "costume"));
	const total = createEnchantmentTotals(equipped);
	const set = equipmentSetBonuses(equipped);
 const jewelry456=colJewelry456(equipped),beltR31=beltStats(items);
	const weaponPower = equipped.filter((item) => item.kind === "weapon").reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + total("stone_attack") + jewelry456.attack + beltR31.attack;
	const armorPower = equipped.filter((item) => item.kind !== "weapon" && item.kind !== "earring" && item.kind !== "bracelet").reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + total("stone_defense") + jewelry456.defense;
	const hpBonus = total("hp") + set.hp + beltR31.hp;
	const roleBaseAttack = role === "arkanist" ? settings.arcanist_base_attack : role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack;
	const criticalBonus = total("critical") + total("stone_critical");
	const criticalChance = Math.max(0, Math.min(.95, settings.base_critical_chance + (wingsEquipped ? settings.wing_critical_chance : 0) + criticalBonus / 100));
	return {
		baseMaxHp: Math.max(1, Math.round(settings.player_max_hp)),
		hpBonus,
		maxHp: Math.max(1, Math.round(settings.player_max_hp) + hpBonus + rank.hp + guild.hp + premium.hp),
		roleBaseAttack,
		weaponPower,
		weaponSkinAttack: weaponSkin ? 20 : 0,
		monsterPower: (premium.monsters ?? 0) + (weaponSkin ? 10 : 0) + rank.pve + set.pve + (total("stone_talisman") > 0 ? 2 : 0),
		attack: (roleBaseAttack + guild.attack + premium.attack + weaponPower + (weaponSkin ? 20 : 0) + (wingsEquipped ? settings.wing_attack_bonus : 0))+(set.attack??0),
		armorPower,
		defense: armorPower + (wingsEquipped ? settings.wing_defense_bonus : 0) + rank.defense + (role === "muhafiz" ? 10 : 0),
		forestPower: total("forest_power"),
		frozenPower: total("frozen_power"),
		fire: total("fire"),
		ice: total("ice"),
		swordDefense: total("sword_defense"),
		arrowDefense: total("arrow_defense"),
		magicDefense: total("magic_defense"),
		strongPlayers: total("strong_players") + jewelry456.strongPlayers + beltR31.strongPlayers + rank.pvp + set.pvp,
		resistantPlayers: total("resistant_players") + jewelry456.resistantPlayers + set.resistance,
		criticalBonus,
		attackSpeed: total("attack_speed") + set.speed,castSpeed:Math.min(50,total("cast_speed")+jewelry456.castSpeed),
		lifeSteal: total("life_steal"),
		attackBlock: total("attack_block") + total("stone_block"),
		criticalChance,
		thirdSkillCriticalChance: Math.max(0, Math.min(.95, criticalChance + settings.third_skill_critical_bonus)),
		criticalDamageMultiplier: settings.critical_damage_multiplier + total("critical_damage491") / 100
	};
}
var ENCHANT_TIERS = [
 ['forest_power','Kuzey Ormanı gücü',[2,4,8,10],10],
 ['frozen_power','Donmuş Çam gücü',[2,4,8,10],10],
 ['fire','Ateş',[2,4,8,10],80], ['ice','Buz',[2,4,8,10],80],
 ['sword_defense','Kılıç savunması',[2,4,9,12],80],
 ['arrow_defense','Ok savunması',[2,4,9,12],80],
 ['magic_defense','Büyü savunması',[2,4,9,12],80],
 ['strong_players','Oyunculara karşı güç',[2,4,8,10],80],
 ['resistant_players','Oyunculara karşı savunma',[2,4,9,12],80],
 ['critical','Kritik şansı',[1,2,4,6],80],
 ['attack_speed','Saldırı hızı',[2,4,8,10],80],
 ['cast_speed','Büyü Hızı',[4,8,16,20],50],
 ['life_steal','Can çalma',[3,6,12,15],15],
 ['attack_block','Saldırı bloklama',[3,6,12,15],15],
 ['hp','Azami can',[60,120,240,300],1000000],
];
var TIER_SUFFIXES = ['one','two','four','five'];
var tierKeys = kind => TIER_SUFFIXES.map(suffix=>`enchant_${kind}_tier_${suffix}`);
function enchantTierValues(settings,kind) {
 const definition=ENCHANT_TIERS.find(d=>d[0]===kind);
 if(!definition)throw new Error('Geçersiz efsun türü.');
 const valid = value => Number.isSafeInteger(value)&&value>=1&&value<=definition[3];
 const keys=tierKeys(kind), legacyKey=`enchant_${kind}_tier_three`;
 // Some old installations supplied only three columns. Expand those bounds
 // into four choices without increasing their old maximum or editing items.
 if(settings?.[keys[2]]==null&&settings?.[keys[3]]==null&&settings?.[legacyKey]!=null){
  const oldMax=Number(settings[legacyKey]);
  const top=valid(oldMax)?oldMax:definition[2][3];
  const oldMin=Number(settings[keys[0]]??Math.min(definition[2][0],top));
  const low=valid(oldMin)&&oldMin<=top?oldMin:Math.min(definition[2][0],top);
  return Array.from({length:4},(_,i)=>low+Math.floor((top-low)*i/3));
 }
 return keys.map((key,i)=>{
  const value=Number(settings?.[key]??definition[2][i]);
  return valid(value)?value:definition[2][i];
 });
}
function rollEnchantmentValue(settings,kind,random=Math.random){
 const roll=Number(random());
 return enchantTierValues(settings,kind)[Number.isFinite(roll)?Math.min(3,Math.max(0,Math.floor(roll*4))):0];
}
var clamp$2 = (value, min, max) => Math.max(min, Math.min(max, value));
var enchantKinds = [
	{
		kind: "forest_power",
		weight: "enchant_forest_power_weight"
	},
	{
		kind: "frozen_power",
		weight: "enchant_frozen_power_weight"
	},
	{
		kind: "fire",
		weight: "enchant_fire_weight",
		min: "enchant_fire_min",
		max: "enchant_fire_max"
	},
	{
		kind: "ice",
		weight: "enchant_ice_weight",
		min: "enchant_ice_min",
		max: "enchant_ice_max"
	},
	{
		kind: "sword_defense",
		weight: "enchant_sword_defense_weight",
		min: "enchant_sword_defense_min",
		max: "enchant_sword_defense_max"
	},
	{
		kind: "arrow_defense",
		weight: "enchant_arrow_defense_weight",
		min: "enchant_arrow_defense_min",
		max: "enchant_arrow_defense_max"
	},
	{
		kind: "magic_defense",
		weight: "enchant_magic_defense_weight",
		min: "enchant_magic_defense_min",
		max: "enchant_magic_defense_max"
	},
	{
		kind: "strong_players",
		weight: "enchant_strong_players_weight",
		min: "enchant_strong_players_min",
		max: "enchant_strong_players_max"
	},
	{
		kind: "resistant_players",
		weight: "enchant_resistant_players_weight",
		min: "enchant_resistant_players_min",
		max: "enchant_resistant_players_max"
	},
	{
		kind: "critical",
		weight: "enchant_critical_weight",
		min: "enchant_critical_min",
		max: "enchant_critical_max"
	},
	{
		kind: "attack_speed",
		weight: "enchant_attack_speed_weight",
		min: "enchant_attack_speed_min",
		max: "enchant_attack_speed_max"
	},{kind:"cast_speed",weight:"enchant_cast_speed_weight"},
	{
		kind: "life_steal",
		weight: "enchant_life_steal_weight",
		min: "enchant_life_steal_min",
		max: "enchant_life_steal_max"
	},
	{
		kind: "attack_block",
		weight: "enchant_attack_block_weight",
		min: "enchant_attack_block_min",
		max: "enchant_attack_block_max"
	},
	{
		kind: "hp",
		weight: "enchant_hp_weight"
	}
];
function rollEnchantments(settings, itemKind) {
	if (Math.random() >= clamp$2(settings.enchant_item_chance, 0, 1)) return [];
	const countChances = [
		clamp$2(settings.enchant_one_chance, 0, 1),
		clamp$2(settings.enchant_two_chance, 0, 1),
		clamp$2(settings.enchant_three_chance, 0, 1),
		clamp$2(settings.enchant_four_chance, 0, 1)
	];
	const totalChance = countChances.reduce((sum, chance) => sum + chance, 0);
	let countRoll = Math.random() * Math.max(Number.EPSILON, totalChance);
	let wanted = 1;
	for (let index = 0; index < countChances.length; index += 1) {
		countRoll -= countChances[index];
		if (countRoll <= 0) {
			wanted = index + 1;
			break;
		}
	}
	return enchantKinds.filter((entry) => enchantmentFitsItem(entry.kind, itemKind) && !(itemKind === "armor" && entry.kind === "critical")).map((entry) => ({
		...entry,
		score: Math.random() * Math.max(0, entry.weight ? Number(settings[entry.weight]) : .8)
	})).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, wanted).map((entry) => {
		return {
			kind: entry.kind,
			value: rollEnchantmentValue(settings, entry.kind)
		};
	});
}
function setSelectSql() {
	return [
		"hp",
		"pve",
		"pvp",
		"resistance",
		"speed"
	,"attack"].map((k) => globalThis.__colEquipmentSets ? `set_${k}` : `0 AS set_${k}`).join(",");
}
function fishingEventRewardMutation(id, multiplierSql479='1') {
	switch (id) {
		case "enchant_scroll": return {
			set: `enchant_scrolls = enchant_scrolls + (${multiplierSql479}) * 1`,
			columns: "enchant_scrolls"
		};
		case "enchant_add": return {
			set: `enchant_add_scrolls = enchant_add_scrolls + (${multiplierSql479}) * 1`,
			columns: "enchant_add_scrolls"
		};
		case "afk_ticket": return {
			set: `afk_tickets = afk_tickets + (${multiplierSql479}) * 1`,
			columns: "afk_tickets"
		};
		case "auto_potion": return {
			set: `auto_potion_owned = 1, auto_potion_total = MAX(0, auto_potion_remaining) + (${multiplierSql479}) * 1000000, auto_potion_remaining = MAX(0, auto_potion_remaining) + (${multiplierSql479}) * 1000000`,
			columns: "auto_potion_owned, auto_potion_remaining, auto_potion_total, auto_potion_enabled"
		};
		default: return {
			set: ``,
			columns: ""
		};
	}
}
function extraService() {
	return globalThis.__colPremium;
}
function premiumBuff(id) {
	return extraService()?.buff(id) ?? {
		attack: 0,
		hp: 0,
		radiant: false,
		essence: 0
	};
}
function premiumXpSql(alias = "p") {
	return beltXpSql(alias)+'*'+`(CASE WHEN ${alias}.halloween_candy_until>unixepoch()*1000 THEN 1.25 ELSE 1 END)*` + `(CASE WHEN ${alias}.arena_exp_until>unixepoch()*1000 THEN 1.2 ELSE 1 END)*`+(extraService() ? `(CASE WHEN ${alias}.pumpkin_enabled499=1 AND ${alias}.pumpkin_until499>CAST(ROUND((julianday('now')-2440587.5)*86400000) AS INTEGER) THEN 1.25 WHEN ${alias}.radiant_enabled=1 AND ${alias}.radiant_until>unixepoch()*1000 THEN 1.2 WHEN EXISTS(SELECT 1 FROM player_items WHERE player_id=${alias}.id AND kind='costume' AND equipped=1) THEN 1.2 ELSE 1 END)` : `(CASE WHEN EXISTS(SELECT 1 FROM player_items WHERE player_id=${alias}.id AND kind='costume' AND equipped=1) THEN 1.2 ELSE 1 END)`);
}
function wisdomSql() {
	return extraService() ? "(CASE WHEN players.wisdom_until>unixepoch()*1000 THEN 1.25 ELSE 1 END)" : "1";
}
var EMPTY_GUILD_BUFF = Object.freeze({
	attack: 0,
	hp: 0,
	xp: 0,
	until: 0,
	level: 0
});
function guildSkillService() {
	return globalThis.__colGuildSkill;
}
function guildBuff(id) {
	return guildSkillService()?.bonuses(id) ?? EMPTY_GUILD_BUFF;
}
function guildXpSql(alias = "p") {
	return guildSkillService() ? `(1+COALESCE((SELECT CASE s.active_level WHEN 1 THEN .05 WHEN 2 THEN .07 WHEN 3 THEN .15 ELSE 0 END FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=${alias}.id AND s.active_until>unixepoch()*1000),0))` : "1";
}
var EMPTY_RANK_BONUSES = Object.freeze({
	hp: 0,
	defense: 0,
	pve: 0,
	pvp: 0
});
var DRAGON_WORLD = Object.freeze({
	width: 3e3,
	height: 1875
});
var DRAGON_ENTRY = Object.freeze({
	x: 1500,
	y: 1510
});
function dragonService() {
	return globalThis.__colDragonBoss ?? null;
}
function rankService() {
	return globalThis.__colRanks;
}
function serverRankBonuses(id) {
	return rankService()?.bonuses(id) ?? EMPTY_RANK_BONUSES;
}
var ANCIENT_WORLD = Object.freeze({
	width: 3600,
	height: 3600
});
var ANCIENT_SPAWN = Object.freeze({
	x: 1740,
	y: 2940
});
function expansion65Available(settings, player) {
	return Number(settings?.expansion65_enabled) === 1 || !!(player?.id && Number(player.is_gm) === 1 && player.id === settings?.expansion65_preview_player_id);
}
function canEnterAncient(settings, player) {
	return expansion65Available(settings, player) && Number(player?.level) >= 50;
}
function levelCapSql(alias = "players") {
	if (!/^[a-z_]+$/.test(alias)) throw new Error("Invalid SQL alias");
	return `(CASE WHEN (SELECT expansion65_enabled FROM game_settings WHERE id=1)=1 OR (${alias}.is_gm=1 AND ${alias}.id=(SELECT expansion65_preview_player_id FROM game_settings WHERE id=1)) THEN 65 ELSE 50 END)`;
}
var GUILD_VILLAGE_WORLD = Object.freeze({
	width: 3600,
	height: 2400
});
var GUILD_HALL_WORLD = Object.freeze({
	width: 2400,
	height: 1600
});
var GUILD_PLOTS = Object.freeze([
	[
		"Kuzeybatı Korusu",
		.26,
		.19
	],
	[
		"Kuzey Burnu",
		.51,
		.11
	],
	[
		"Doğu Kayalıkları",
		.73,
		.2
	],
	[
		"Gündoğumu Kıyısı",
		.84,
		.42
	],
	[
		"Güneydoğu Bahçesi",
		.76,
		.65
	],
	[
		"Güney Limanı",
		.5,
		.75
	],
	[
		"Batı Bahçesi",
		.26,
		.65
	],
	[
		"Günbatımı Kıyısı",
		.18,
		.41
	]
].map(([name, x, y], i) => ({
	slot: i + 1,
	name,
	x: x * 3600,
	y: y * 2400
})));
function guildArea(area) {
	if (typeof area !== "string") return null;
	const village = /^guild_village_([1-9][0-9]{0,3})$/.exec(area);
	if (village) return {
		kind: "village",
		district: Number(village[1])
	};
	const hall = /^guild_hall_([A-Za-z0-9-]{1,64})$/.exec(area);
	return hall ? {
		kind: "hall",
		guildId: hall[1]
	} : null;
}
function guildWalkable(area, x, y) {
	const room = guildArea(area);
	if (!room || !Number.isFinite(x) || !Number.isFinite(y)) return false;
	if (room.kind === "hall") return x >= 650 && x <= 1800 && y >= 460 && y <= 1370;
	return ((x - 1800) / 1510) ** 2 + ((y - 1240) / 1040) ** 2 <= 1 && !GUILD_PLOTS.some((p) => Math.abs(x - p.x) < 210 && y > p.y - 170 && y < p.y + 110);
}
function guildSegment(area, ax, ay, bx, by) {
	if (!guildWalkable(area, ax, ay) || !guildWalkable(area, bx, by)) return false;
	const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 20);
	for (let i = 1; i < steps; i++) if (!guildWalkable(area, ax + (bx - ax) * i / steps, ay + (by - ay) * i / steps)) return false;
	return true;
}
var AFK_WORLD = Object.freeze({
	width: 5400,
	height: 3600
});
var AFK_SPAWN = Object.freeze({
	x: 1180,
	y: 2340
});
var AFK_FREE_MS = 7200 * 1e3;
function afkDay(nowMs) {
	return Math.floor((nowMs + 3 * 36e5) / 864e5);
}
function afkRemaining(state, nowMs) {
	if (!state || state.day !== afkDay(nowMs)) return AFK_FREE_MS;
	const elapsed = state.active ? Math.min(15e3, Math.max(0, nowMs - state.tick_at_ms)) : 0;
	return Math.max(0, AFK_FREE_MS + state.bonus_ms - state.used_ms - elapsed);
}
var FOREST_CORE_OBSTACLE = Object.freeze({
	x: 2700,
	y: 1707.5,
	radiusX: 76,
	radiusY: 48
});
function insideForestCore(x, y) {
	const c = FOREST_CORE_OBSTACLE;
	return ((x - c.x) / c.radiusX) ** 2 + ((y - c.y) / c.radiusY) ** 2 < 1;
}
function forestCoreSegment(fromX, fromY, toX, toY) {
	const c = FOREST_CORE_OBSTACLE, ax = (fromX - c.x) / c.radiusX, ay = (fromY - c.y) / c.radiusY;
	const dx = (toX - fromX) / c.radiusX, dy = (toY - fromY) / c.radiusY, squared = dx * dx + dy * dy;
	if (![
		ax,
		ay,
		dx,
		dy
	].every(Number.isFinite)) return false;
	const start = ax * ax + ay * ay, dot = ax * dx + ay * dy;
	if (start < 1) return dot >= 0;
	const t = squared ? Math.max(0, Math.min(1, -dot / squared)) : 0;
	return (ax + t * dx) ** 2 + (ay + t * dy) ** 2 >= 1;
}
var ANCIENT_CORE_OBSTACLE = Object.freeze({
	x: 1800,
	y: 1820,
	radiusX: 76,
	radiusY: 48
});
function insideAncientCore(x, y) {
	const c = ANCIENT_CORE_OBSTACLE;
	return ((x - c.x) / c.radiusX) ** 2 + ((y - c.y) / c.radiusY) ** 2 < 1;
}
function ancientCoreSegment(fromX, fromY, toX, toY) {
	const c = ANCIENT_CORE_OBSTACLE, ax = (fromX - c.x) / c.radiusX, ay = (fromY - c.y) / c.radiusY;
	const dx = (toX - fromX) / c.radiusX, dy = (toY - fromY) / c.radiusY, squared = dx * dx + dy * dy;
	if (![
		ax,
		ay,
		dx,
		dy
	].every(Number.isFinite)) return false;
	const start = ax * ax + ay * ay, dot = ax * dx + ay * dy;
	if (start < 1) return dot >= 0;
	const t = squared ? Math.max(0, Math.min(1, -dot / squared)) : 0;
	return (ax + t * dx) ** 2 + (ay + t * dy) ** 2 >= 1;
}
var WAR_WORLD = {
	width: 3600,
	height: 2250
};
var WAR_SAFE = {
	x: 1800,
	y: 996,
	radiusX: 450,
	radiusY: 342
};
function inWarSafeZone(x, y) {
	return ((x - WAR_SAFE.x) / WAR_SAFE.radiusX) ** 2 + ((y - WAR_SAFE.y) / WAR_SAFE.radiusY) ** 2 <= 1;
}
var COMMON_WORLD = {
	width: 2400,
	height: 1500
};
var BLACK_WORLD = {
	width: 5400,
	height: 3375
};
var BLACK_SPAWN = {
	x: 2700,
	y: 2925
};
var FOREST_WORLD = {
	width: 5400,
	height: 3375
};
var FROZEN_WORLD = {
	width: 4800,
	height: 3e3
};
var FOREST_SPAWN = {
	x: 2700,
	y: 2025
};
var BAZAAR_SPAWN = {
	x: 1200,
	y: 920
};
var FROZEN_SPAWN = {
	x: 3525,
	y: 2325
};
var FROZEN_LAKE = {
	x: 4170,
	y: 495,
	radiusX: 780,
	radiusY: 555
};
var FISHING_LAKE$1 = {
	x: 1200,
	y: 745,
	radiusX: 735,
	radiusY: 445
};
var FOREST_WALKABLE_POLYGON = [
	[45, 65],
	[5355, 65],
	[5355, 3330],
	[45, 3330]
];
function areaWorld(area) {if(isAdventureArea(area))return adventureBounds(area);if(area==='event')return EVENT_WORLD444;
 if(area==='rune'||area==='rune_v2')return RUNE_WORLD;
	const social = guildArea(area);
	if (social) return social.kind === "village" ? GUILD_VILLAGE_WORLD : GUILD_HALL_WORLD;
	if (area === "dragon") return DRAGON_WORLD;
	if (area === "afk") return AFK_WORLD;
	if (area === "ancient") return ANCIENT_WORLD;
	return area === "war" ? WAR_WORLD : area === "black" ? BLACK_WORLD : area === "frozen" ? FROZEN_WORLD : area === "forest" ? FOREST_WORLD : COMMON_WORLD;
}
function insideForestBounds(x, y) {
	if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
	let inside = false;
	for (let index = 0, previous = FOREST_WALKABLE_POLYGON.length - 1; index < FOREST_WALKABLE_POLYGON.length; previous = index, index += 1) {
		const [x1, y1] = FOREST_WALKABLE_POLYGON[index];
		const [x2, y2] = FOREST_WALKABLE_POLYGON[previous];
		const cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
		if (Math.abs(cross) < 1e-7 && x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && y >= Math.min(y1, y2) && y <= Math.max(y1, y2)) return true;
		if (y1 > y !== y2 > y && x < (x2 - x1) * (y - y1) / (y2 - y1) + x1) inside = !inside;
	}
	return inside;
}
function isForestWalkablePosition(x, y) {
	return insideForestBounds(x, y) && !insideForestCore(x, y);
}
function isFrozenWalkablePosition(x, y) {
	if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
	if (x < 55 || x > FROZEN_WORLD.width - 55 || y < 80 || y > FROZEN_WORLD.height - 55) return false;
	return ((x - FROZEN_LAKE.x) / FROZEN_LAKE.radiusX) ** 2 + ((y - FROZEN_LAKE.y) / FROZEN_LAKE.radiusY) ** 2 > 1;
}
function isAreaWalkablePosition(area, x, y) {if(isAdventureArea(area))return adventureWalkable(area,x,y);if(area==='event')return eventWalkable444(x,y);
 if(area==='rune'||area==='rune_v2')return runeWalkable(x,y);
	if (guildArea(area)) return guildWalkable(area, x, y);
	if (area === "forest") return isForestWalkablePosition(x, y);
	if (area === "frozen") return isFrozenWalkablePosition(x, y);
	const world = areaWorld(area);
	if (!Number.isFinite(x) || !Number.isFinite(y) || x < 55 || x > world.width - 55 || y < 80 || y > world.height - 55) return false;
	if (area === "ancient" && insideAncientCore(x, y)) return false;
	if (area === "arena" && (x < 280 || x > 2120 || y < 250 || y > 1250)) return false;
	if (area === "fishing") return ((x - FISHING_LAKE$1.x) / FISHING_LAKE$1.radiusX) ** 2 + ((y - FISHING_LAKE$1.y) / FISHING_LAKE$1.radiusY) ** 2 >= 1.02;
	return true;
}
function isAreaWalkableSegment(area, fromX, fromY, toX, toY) {if(isAdventureArea(area))return adventureSegment(area,fromX,fromY,toX,toY);if(area==='event')return eventSegment444(fromX,fromY,toX,toY);
 if(area==='rune'||area==='rune_v2')return runeWalkableSegment(fromX,fromY,toX,toY);
	if (guildArea(area)) return guildSegment(area, fromX, fromY, toX, toY);
	if (area === "forest") return insideForestBounds(fromX, fromY) && insideForestBounds(toX, toY) && forestCoreSegment(fromX, fromY, toX, toY);
	if (area === "ancient") return [
		fromX,
		fromY,
		toX,
		toY
	].every(Number.isFinite) && fromX >= 55 && fromX <= ANCIENT_WORLD.width - 55 && fromY >= 80 && fromY <= ANCIENT_WORLD.height - 55 && toX >= 55 && toX <= ANCIENT_WORLD.width - 55 && toY >= 80 && toY <= ANCIENT_WORLD.height - 55 && ancientCoreSegment(fromX, fromY, toX, toY);
	if (!isAreaWalkablePosition(area, fromX, fromY) || !isAreaWalkablePosition(area, toX, toY)) return false;
	const lake = area === "frozen" ? FROZEN_LAKE : area === "fishing" ? FISHING_LAKE$1 : null;
	if (lake) {
		const ax = (fromX - lake.x) / lake.radiusX, ay = (fromY - lake.y) / lake.radiusY;
		const dx = (toX - fromX) / lake.radiusX, dy = (toY - fromY) / lake.radiusY;
		const squared = dx * dx + dy * dy;
		const ratio = squared ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / squared)) : 0;
		const closest = (ax + ratio * dx) ** 2 + (ay + ratio * dy) ** 2;
		if (area === "frozen" ? closest <= 1 : closest < 1.02) return false;
	}
	return true;
}
var service = () => globalThis.__colCommunityEvent;
function readCommunityProgress(accountId) {
	try {
		return service()?.progress(accountId) ?? null;
	} catch (error) {
		console.warn("Community progress read failed; calendar reconciliation remains active.", error);
		return null;
	}
}
function samePvpActorScope(original, current) {
	return Boolean(original && current && original.hp > 0 && current.hp > 0 && original.id === current.id && original.area === current.area && original.channel === current.channel && original.arena_match_id === current.arena_match_id && original.realtime_scope_version === current.realtime_scope_version);
}
function armorDamageReduction(defense, mode = "pvp") {
	const value = Number(defense);
	const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
	const pve = mode === "pve";
	const divisor = pve ? 100 : 250;
	const oldCap = pve ? .8 : .55;
	const extraCap = pve ? .02 : .05;
	const excess = Math.max(0, safe - divisor * oldCap);
	return Math.min(oldCap, safe / divisor) + extraCap * (excess / (excess + divisor));
}
function forestLootMultiplier(sourceKey,level,policy={}){
 const source=String(sourceKey),playerLevel=Number(level);
 const after=Number.isInteger(policy.forest_after_level)?policy.forest_after_level:30;
 const reduction=Number.isFinite(policy.forest_reduction_percent)?Math.max(0,Math.min(100,policy.forest_reduction_percent)):30;
 const reduced=source.startsWith('forest.')?playerLevel>after:source.startsWith('frozen.')?playerLevel>=40:source.startsWith('black.')?playerLevel>=50:false;
 return reduced?1-reduction/100:1;
}
var WEAPON_KILL_SQL = `UPDATE player_items SET enchantments=CASE
  WHEN EXISTS(SELECT 1 FROM json_each(enchantments) WHERE json_extract(value,'$.kind')='evolution_kills')
  THEN json_set(enchantments,(SELECT '$['||key||'].value' FROM json_each(enchantments) WHERE json_extract(value,'$.kind')='evolution_kills' LIMIT 1),
    MIN(1000000000,COALESCE((SELECT json_extract(value,'$.value') FROM json_each(enchantments) WHERE json_extract(value,'$.kind')='evolution_kills' LIMIT 1),0)+1))
  ELSE json_insert(enchantments,'$[#]',json_object('kind','evolution_kills','value',1)) END
  WHERE id=? AND player_id=? AND kind='weapon' AND equipped=1
  AND EXISTS(SELECT 1 FROM monsters WHERE id=? AND spawn_round=? AND hp>0 AND hp<=? AND is_stone=0)`;
var BOSS_SANCTUM_ENTRY = {
	x: 1200,
	y: 1230
};
var SINSI_STONE_ENTRY = {
	x: 1200,
	y: 1320
};
var WAR_ENTRY = {
	x: 1800,
	y: 996
};
var PVP_REWARD_COOLDOWN_MS = 1800 * 1e3;
function isBlackStoneBoss476(id){return id==='stone-boss-black-c1'||id==='stone-boss-black-c2'||id==='stone-boss-black-c3'||fourChannels&&id==='stone-boss-black-c4';}
var FROZEN_BOSS_ID = "frozen-boss-1";
var ANCIENT_BOSS_ID = "ancient-boss-1";
function isFrozenBossId(id) {
	return id === FROZEN_BOSS_ID;
}
function isAncientBossId(id) {
	return id === ANCIENT_BOSS_ID;
}
function isFrozenWaterId(id) {
	return typeof id === "string" && id.startsWith("frozen-water-c");
}
function isFrozenEliteId(id) {
	return isRuneV2Boss(id) || isBlackStoneBoss476(id) || isFrozenBossId(id) || isAncientBossId(id) || isFrozenWaterId(id);
}
function clamp$1(value, min, max) {
	return Math.max(min, Math.min(max, value));
}
function distance(a, b) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}
function safeId(value) {
	return typeof value === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(value) ? value : "";
}
const EVENT_KINDS = ['loot','xp','essence','chest','moonlight','fishing','halloween'];
const EVENT_LABELS = {loot:'Ganimet Bereketi',xp:'Tecrübe Bereketi',essence:'Öz Bereketi',chest:'Kristal Sandığı',moonlight:'Ayışığı Sandığı',fishing:'Balıkçılık Etkinliği',halloween:'Cadılar Bayramı'};
const CHEST_PRIZES = [
 {id:'pearl',label:'Beyaz İnci',weight:2}, {id:'potion',label:'Kırmızı İksir',weight:20},
 {id:'weapon',label:'Turuncu Silah',weight:1}, {id:'armor',label:'Turuncu Zırh',weight:1},
 {id:'essence5',label:'5 Öz',weight:20}, {id:'essence8',label:'8 Öz',weight:15},
 {id:'essence10',label:'10 Öz',weight:15}, {id:'essence15',label:'15 Öz',weight:10},
 {id:'essence20',label:'20 Öz',weight:6}, {id:'sokan',label:'Sokan Balığı',weight:10},
 {id:'fifth_enchant',label:'Beşinci Efsun Nesnesi',weight:0.1},
 {id:'red_pearl',label:'Kırmızı İnci',weight:0.1},
];
const MOONLIGHT_PRIZES = [
 {id:'essence20',label:'20 Yaşam Özü',weight:30},{id:'potions5',label:'5 Kırmızı İksir',weight:25},
 {id:'dust5',label:'5 Taş Tozu',weight:20},{id:'gems20',label:'20 Mücevher',weight:15},
 {id:'wing',label:'Kanat Parçası',weight:1},{id:'pearl',label:'Beyaz İnci',weight:2},
 {id:'dragon',label:'Ejderha Parçası',weight:.6},{id:'necklace',label:'Kırmızı Kolye · rastgele efsun',weight:1},
 {id:'attack_stone',label:'Saldırı Gücü Taşı',weight:1},{id:'evolution_scroll',label:'Evrim Parşömeni',weight:1},
 {id:'fifth_enchant',label:'Beşinci Efsun Nesnesi',weight:.05},
 {id:'red_pearl',label:'Kırmızı İnci',weight:.05},
];
const FISHING_EVENT_PRIZES = [
 {id:'enchant_scroll',label:'Efsun Değiştirme Nesnesi',weight:50,image:'/game/enchant-change.webp'},
 {id:'enchant_add',label:'Efsun Artırma Nesnesi',weight:30,image:'/game/enchant-add-v262.webp'},
 {id:'afk_ticket',label:'Oto Av Bileti · +2 saat',weight:15,image:'/game/afk-ticket-v350.webp'},
 {id:'auto_potion',label:'Oto Kırmızı İksir',weight:5,image:'/game/auto-red-potion.webp'},
];
function defaultEvents(){return {version:1,events:Object.fromEntries(EVENT_KINDS.map(kind=>[kind,{enabled:false,start:0,end:0,percent:kind==='chest'?2:kind==='moonlight'||kind==='fishing'||kind==='halloween'?1:20,runId:''}])),weights:Object.fromEntries(CHEST_PRIZES.map(p=>[p.id,p.weight])),moonlightWeights:Object.fromEntries(MOONLIGHT_PRIZES.map(p=>[p.id,p.weight])),fishingWeights:Object.fromEntries(FISHING_EVENT_PRIZES.map(p=>[p.id,p.weight])),halloweenWeights:Object.fromEntries(MOONLIGHT_PRIZES.map(p=>[p.id,p.weight])),halloweenWandChance:20,fishingRedPearlChance460:5,fishingCatchWeights482:defaultFishingCatch482(),specialistSkills459:defaultSpecialistSkills459()};}
function validateEvents(input){
 if(!input||typeof input!=='object')throw new Error('Etkinlik ayarları geçersiz.');
 const config=defaultEvents();
 for(const kind of EVENT_KINDS){const e=(kind==='moonlight'||kind==='fishing'||kind==='halloween')&&!input.events?.[kind]?config.events[kind]:input.events?.[kind];if(!e||typeof e.enabled!=='boolean'||!Number.isFinite(e.percent)||e.percent<0||e.percent>(kind==='chest'||kind==='moonlight'||kind==='fishing'||kind==='halloween'?100:500)||!Number.isSafeInteger(e.start)||!Number.isSafeInteger(e.end)||e.start<0||e.end<0||e.end>4102444800||((e.enabled||e.start||e.end)&&!(e.start>0&&e.end>e.start)))throw new Error(`${EVENT_LABELS[kind]}: oranı ve başlangıç/bitiş saatini kontrol et.`);
 config.events[kind]={enabled:e.enabled,start:e.start,end:e.end,percent:e.percent,runId:typeof e.runId==='string'?e.runId.slice(0,80):''};config.events[kind].schedule499=normalizeEventQueue499(kind,e.schedule499,config.events[kind]);}
 for(const prize of CHEST_PRIZES){const w=input.weights?.[prize.id]??((prize.id==='fifth_enchant'||prize.id==='red_pearl')?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Sandık ağırlıkları 0–100000 arasında olmalı.');config.weights[prize.id]=w;}
 if(Object.values(config.weights).reduce((a,b)=>a+b,0)<=0)throw new Error('Sandıkta en az bir ödül açık olmalı.');
 for(const prize of MOONLIGHT_PRIZES){const w=input.moonlightWeights?.[prize.id]??((input.moonlightWeights===undefined||prize.id==='red_pearl')?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Ayışığı Sandığı ağırlıkları 0–100000 arasında olmalı.');config.moonlightWeights[prize.id]=w;}
 if(Object.values(config.moonlightWeights).reduce((a,b)=>a+b,0)<=0)throw new Error('Ayışığı Sandığında en az bir ödül açık olmalı.');
 for(const prize of FISHING_EVENT_PRIZES){const w=input.fishingWeights?.[prize.id]??(input.fishingWeights===undefined?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Balıkçılık ödül ağırlıkları 0–100000 arasında olmalı.');config.fishingWeights[prize.id]=w;}
 if(Object.values(config.fishingWeights).reduce((a,b)=>a+b,0)<=0)throw new Error('Balıkçılık etkinliğinde en az bir ödül açık olmalı.');
 for(const prize of MOONLIGHT_PRIZES){const w=input.halloweenWeights?.[prize.id]??(input.halloweenWeights===undefined?config.moonlightWeights[prize.id]:prize.id==='red_pearl'?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Bal Kabağı ağırlıkları 0–100000 arasında olmalı.');config.halloweenWeights[prize.id]=w;}
 if(Object.values(config.halloweenWeights).reduce((a,b)=>a+b,0)<=0)throw new Error('Bal Kabağında en az bir ödül açık olmalı.');
 const wand=input.halloweenWandChance??20;if(!Number.isFinite(wand)||wand<0||wand>100)throw new Error('Cadı değneği şansı 0–100 arasında olmalı.');config.halloweenWandChance=wand;const red=input.fishingRedPearlChance460??5;if(typeof red!=='number'||!Number.isFinite(red)||red<0||red>100||Math.abs(red*100-Math.round(red*100))>0.000001)throw new Error('Kırmızı inci şansı 0–100 arasında, en fazla iki ondalıklı olmalı.');config.fishingRedPearlChance460=red;config.fishingCatchWeights482=validateFishingCatch482(input.fishingCatchWeights482??defaultFishingCatch482());config.specialistSkills459=validateSpecialistSkills459(input.specialistSkills459??defaultSpecialistSkills459());
 config.highLevelBalance487=validateBalance487(input.highLevelBalance487??defaultBalance487());
 return config;
}
function parseEvents(raw){try{return validateEvents(typeof raw==='string'?JSON.parse(raw):raw);}catch{return defaultEvents();}}
let cachedEventsRaw;
let cachedEventsConfig;
const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;};
function readEventsConfig(raw){
 if(typeof raw!=='string')return parseEvents(raw);
 if(raw!==cachedEventsRaw){cachedEventsConfig=readEventConfigR86(raw,()=>deepFreeze(parseEvents(raw)));cachedEventsRaw=raw;}
 return cachedEventsConfig;
}
function eventBonus(config,kind,now=Date.now()/1000){return eventOccurrence499(config.events[kind],now)?.percent??0;}
function bonusAmount(amount,percent,random=Math.random){const value=Math.max(0,amount)*(1+Math.max(0,percent)/100),base=Math.floor(value);return base+(random()<value-base?1:0);}
function rollFishingEventReward(config,now=Date.now()/1000,random=Math.random){
 const chance=eventBonus(config,'fishing',now);if(chance<=0||random()*100>=chance)return null;
 const total=FISHING_EVENT_PRIZES.reduce((sum,p)=>sum+config.fishingWeights[p.id],0);
 let roll=Math.max(0,Math.min(1-Number.EPSILON,random()))*total;
 for(const prize of FISHING_EVENT_PRIZES){roll-=config.fishingWeights[prize.id];if(roll<0)return prize;}
 return null;
}
 function restoreStolenLife(database, playerId, amount, memoryCombat = false) {
	if (!Number.isSafeInteger(amount) || amount <= 0) return null;
	const commit = (statements) => memoryCombat && database.combat?.enabled ? database.combatBatch(statements, playerId) : database.batch(statements);
	const rows = commit([database.prepare("SELECT hp FROM players WHERE id=?").bind(playerId), database.prepare("UPDATE players SET hp=MIN(max_hp,hp+?),hp_revision=hp_revision+1 WHERE id=? AND hp>0 AND hp<max_hp RETURNING hp,hp_revision,max_hp").bind(amount, playerId)]);
	const healed = rows[1].results[0];
	return healed ? {
		...healed,
		healed: Math.max(0, healed.hp - Number(rows[0].results[0].hp))
	} : null;
}
function hasWingBonus(player) {
	return player?.wings_equipped === 1 || player?.core_wings === 1;
}
function infiniteEquipmentPower(item,settings){const bonus=colTransferBonus491(item);const power=Math.max(0,Number(item.power)||0)-bonus;const percent=Math.max(0,Number(settings.infinite_power_percent)||0);const weaponBase=Math.max(1,Math.round(Number(settings.infinite_weapon_power)||230));if(item.kind==='weapon'&&power<=180)return Math.max(power,weaponBase)+bonus;const scaled=Math.round(power*(1+percent/100));return (item.kind==='weapon'?Math.max(power,scaled,weaponBase):scaled)+bonus;}
function dungeonService() {
	const service = globalThis.__colDungeon;
	if (!service) throw new Error("Zindan hizmeti bu sunucuda henüz hazır değil.");
	service.stats = calculateEquipmentStats;
	service.makeGear = (item, settings, cfg) => {
		const definition = {
			type: "gear",
			family: item.family ?? "generic",
			kind: item.kind,
			rarity: item.rarity
		};
		const uniquePower = item.kind === "weapon" ? settings.unique_weapon_power : settings.unique_armor_power;
		return {
			item_name: ["unique", "infinite"].includes(item.rarity) ? item.name : resolveLootItemName(definition, item.role),
			power: item.rarity === "infinite" ? infiniteEquipmentPower({
				kind: item.kind,
				power: uniquePower
			}, cfg) : item.rarity === "unique" ? uniquePower : rollLootPower(definition, settings),
			enchantments: JSON.stringify(rollEnchantments(settings, item.kind))
		};
	};
	return service;
}
var GUILD_MONSTER_KILL_SQL = `INSERT OR IGNORE INTO guild_monster_claims(world_cycle,monster_id,spawn_round,guild_id)
 SELECT (SELECT cycle FROM world_state WHERE id=1),monster.id,monster.spawn_round,member.guild_id FROM monsters monster JOIN guild_members member ON member.player_id=?
 WHERE monster.id=? AND monster.spawn_round=? AND monster.hp>0 AND monster.hp<=? AND monster.is_stone=0`;
function guardianEndpoint(area, from, toward, travel) {
	const length = Math.hypot(toward.x - from.x, toward.y - from.y);
	if (!length || !Number.isFinite(length)) return { ...from };
	const distance = Math.min(length, Math.max(0, travel));
	const endpoint = {
		x: from.x + (toward.x - from.x) / length * distance,
		y: from.y + (toward.y - from.y) / length * distance
	};
	if (isAreaWalkableSegment(area, from.x, from.y, endpoint.x, endpoint.y)) return endpoint;
	let result = { ...from };
	for (let moved = Math.min(8, distance); moved <= distance; moved = Math.min(distance, moved + 8)) {
		const next = {
			x: from.x + (toward.x - from.x) / length * moved,
			y: from.y + (toward.y - from.y) / length * moved
		};
		if (!isAreaWalkableSegment(area, result.x, result.y, next.x, next.y)) break;
		result = next;
		if (moved === distance) break;
	}
	return result;
}
 function applyGuardianImpact(database, attacker, ability, target, kind, now, retry = 0) {
 if(!(kind==='player'?colLabMayAffectPlayer(attacker,target):colLabMayAffectMonster(attacker,target)))return null;
 if(kind==="monster"&&ability===1&&(isBlackStoneBoss476(target.id)||isRuneV2Boss(target.id)))return null;
	if (attacker.role !== "muhafiz" || (ability !== 1 && ability !== 2)) return null;
	const own = database.prepare("SELECT x,y,hp,position_revision,root_until_ms,stun_until_ms FROM players WHERE id=? AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=?").bind(attacker.id, attacker.area, attacker.channel, attacker.arena_match_id, attacker.realtime_scope_version).first();
	if (!own || own.hp <= 0 || own.stun_until_ms > now || ability === 2 && own.root_until_ms > now) return null;
	const hitTarget = target;
	if (kind === "player") {
		const live = database.prepare(`SELECT x,y,realtime_scope_version FROM players
      WHERE id=? AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=?${ability === 1 ? " AND hp>0" : ""}`).bind(target.id, attacker.area, attacker.channel, attacker.arena_match_id, target.realtime_scope_version ?? -1).first();
		if (!live) return null;
		target = {
			...target,
			...live
		};
	}
	const length = Math.hypot(target.x - own.x, target.y - own.y);
	if (length > (ability === 1 ? 720 : 600) + 125) return null;
	const actorId = ability === 1 ? target.id : attacker.id;
	const from = ability === 1 ? target : own;
	const toward = ability === 1 ? own : target;
	const to = guardianEndpoint(attacker.area, from, toward, Math.min(ability === 1 ? 720 : 600, Math.max(0, length - (ability === 1 ? 65 : 38))));
	const until = now + (ability === 1 ? 2000 : 450);
	let moved = null;
	if (ability === 2 || kind === "player") {
		const id = actorId;
		moved = database.prepare(`UPDATE players SET x=?,y=?,position_revision=position_revision+1,
      movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,
      hp_revision=hp_revision+1,root_until_ms=MAX(root_until_ms,?),stun_until_ms=MAX(stun_until_ms,?)
      WHERE id=? AND hp>0 AND area=? AND channel=? AND arena_match_id=?
        AND x=? AND y=? AND realtime_scope_version=? RETURNING x,y,position_revision,hp,hp_revision,root_until_ms,stun_until_ms`).bind(to.x, to.y, now, ability === 1 ? until : now, ability === 1 ? until : 0, id, attacker.area, attacker.channel, attacker.arena_match_id, from.x, from.y, ability === 2 ? attacker.realtime_scope_version : target.realtime_scope_version).first();
		if (!moved) {
			if (retry < 4) return applyGuardianImpact(database, attacker, ability, hitTarget, kind, now, retry + 1);
			return null;
		}
	}
	let controlled = null;
	if (kind === "player" && ability === 2 && Math.hypot(to.x - target.x, to.y - target.y) <= 100) controlled = database.prepare(`UPDATE players SET root_until_ms=MAX(root_until_ms,?),stun_until_ms=MAX(stun_until_ms,?),hp_revision=hp_revision+1
      WHERE id=? AND hp>0 AND area=? AND channel=? AND arena_match_id=? AND x=? AND y=?
      RETURNING x,y,position_revision,hp,hp_revision,root_until_ms,stun_until_ms`).bind(until, until, target.id, attacker.area, attacker.channel, attacker.arena_match_id, target.x, target.y).first();
	else if (kind === "monster" && !isBlackStoneBoss476(target.id) && !isRuneV2Boss(target.id)) {
		const endpoint = ability === 1 ? to : target;
		controlled = database.prepare(`UPDATE monsters SET control_x=?,control_y=?,root_until_ms=MAX(root_until_ms,?),stun_until_ms=MAX(stun_until_ms,?)
      WHERE id=? AND hp>0 AND spawn_round=? AND area=? AND (channel=0 OR channel=?) AND is_stone=0
      RETURNING root_until_ms,stun_until_ms`).bind(endpoint.x, endpoint.y, until, until, target.id, target.spawn_round, attacker.area, attacker.channel).first();
	}
	return {
		type: "guardian_control",
		eventId: crypto.randomUUID(),
		attackerId: attacker.id,
		targetId: target.id,
		targetKind: kind,
		ability,
		casterPoint: {
			x: own.x,
			y: own.y
		},
		from: {
			x: from.x,
			y: from.y
		},
		to,
		actorId,
		moved,
		controlled,
		targetPoint: {
			x: target.x,
			y: target.y
		},
		serverAt: now,
		area: attacker.area,
		channel: attacker.channel,
		...kind === "monster" ? { spawnRound: target.spawn_round } : {}
	};
}
function lifeStealAmount(damage, percent) {
	return Math.floor(Math.max(0, damage) * Math.max(0, Math.min(15, percent)) / 100);
}
 function dashGuardian(database, player, direction, now, cooldown, retry = 0) {
	const own = database.prepare("SELECT x,y FROM players WHERE id=?").bind(player.id).first();
	const length = Math.hypot(direction.x, direction.y);
	if (!own || !Number.isFinite(length) || length < .01) return null;
	const to = guardianEndpoint(player.area, own, {
		x: own.x + direction.x / length * 600,
		y: own.y + direction.y / length * 600
	}, 600);
	const moved = database.prepare(`UPDATE players SET x=?,y=?,attack_three_at=?+?,position_revision=position_revision+1,
    hp_revision=hp_revision+1,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0
    WHERE id=? AND role='muhafiz' AND hp>0 AND rod_equipped=0 AND root_until_ms<=? AND stun_until_ms<=?
      AND attack_three_at<=? AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=? AND x=? AND y=?
    RETURNING x,y,position_revision,hp,hp_revision,root_until_ms,stun_until_ms`).bind(to.x, to.y, now, cooldown, now, player.id, now, now, now, player.area, player.channel, player.arena_match_id, player.realtime_scope_version, own.x, own.y).first();
	if (!moved && retry < 2) return dashGuardian(database, player, direction, now, cooldown, retry + 1);
	return moved ? {
		type: "guardian_control",
		eventId: crypto.randomUUID(),
		attackerId: player.id,
		actorId: player.id,
		targetId: "",
		targetKind: "player",
		ability: 2,
		casterPoint: own,
		from: own,
		to,
		targetPoint: to,
		moved,
		controlled: null,
		serverAt: now,
		area: player.area,
		channel: player.channel
	} : null;
}
function guardianCastVisual(attacker, ability, target, kind, now) {
	if (attacker.role !== "muhafiz" || ability < 1 || ability > 2) return null;
	const casterPoint = {
		x: attacker.x,
		y: attacker.y
	};
	return {
		type: "guardian_control",
		eventId: crypto.randomUUID(),
		attackerId: attacker.id,
		actorId: attacker.id,
		targetId: target.id,
		targetKind: kind,
		ability,
		casterPoint,
		from: ability === 1 ? {
			x: target.x,
			y: target.y
		} : casterPoint,
		to: casterPoint,
		targetPoint: {
			x: target.x,
			y: target.y
		},
		moved: null,
		controlled: null,
		visualOnly: true,
		serverAt: now,
		area: attacker.area,
		channel: attacker.channel,
		...kind === "monster" ? { spawnRound: target.spawn_round } : {}
	};
}
var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
var FISHING_PROOF_SCALE = 1e6;
function fishingMotion(seed) {
	const normalizedSeed = Math.max(0, Math.floor(seed));
	return {
		phase: normalizedSeed % 628319 / 1e5,
		frequency: 1.45 + Math.floor(normalizedSeed / 8) % 401 / 1e3,
		amplitude: .27 + Math.floor(normalizedSeed / 3208) % 61 / 1e3
	};
}
function advanceFishingProof(state, requestedAtMs) {
	const biteAtMs = Math.max(state.started_at_ms, state.bite_at_ms);
	let cursorMs = Math.max(biteAtMs, state.proof_updated_at_ms || biteAtMs);
	const endMs = Math.max(cursorMs, Math.min(requestedAtMs, state.expires_at_ms + 3e3));
	let bar = clamp(state.proof_bar / FISHING_PROOF_SCALE, .06, .94);
	let velocity = clamp(state.proof_velocity / FISHING_PROOF_SCALE, -4, 4);
	let progress = clamp(state.proof_progress / FISHING_PROOF_SCALE, 0, 1);
	const holding = state.proof_holding === 1;
	const motion = fishingMotion(state.proof_seed);
	while (cursorMs < endMs && progress > 0 && progress < 1) {
		const stepMs = Math.min(20, endMs - cursorMs);
		const dt = stepMs / 1e3;
		cursorMs += stepMs;
		const elapsed = Math.max(0, (cursorMs - biteAtMs) / 1e3);
		const fishPosition = clamp(.5 + Math.sin(elapsed * motion.frequency + motion.phase + Math.sin(elapsed * .71 + motion.phase * .31) * 1.8) * motion.amplitude + Math.sin(elapsed * motion.frequency * 2.13 + motion.phase * .73) * motion.amplitude * .28, .06, .94);
		velocity += (holding ? -1.72 : 1.22) * dt;
		velocity *= Math.pow(.38, dt);
		bar += velocity * dt;
		if (bar < .06) {
			bar = .06;
			velocity = Math.abs(velocity) * .2;
		}
		if (bar > .94) {
			bar = .94;
			velocity = -Math.abs(velocity) * .2;
		}
		progress = clamp(progress + (Math.abs(bar - fishPosition) <= .19 ? .135 : -.105) * dt, 0, 1);
	}
	return {
		updatedAtMs: endMs,
		bar: Math.round(bar * FISHING_PROOF_SCALE),
		velocity: Math.round(velocity * FISHING_PROOF_SCALE),
		progress: Math.round(progress * FISHING_PROOF_SCALE)
	};
}
function replayFishingInputs(proof, inputs, nowMs) {
	if (!inputs.length || inputs.length > 64) throw new Error("invalid_batch");
	let state = { ...proof };
	let changes = 0;
	for (const input of inputs) {
		const atMs = proof.bite_at_ms + input.at;
		if (!Number.isSafeInteger(input.at) || typeof input.holding !== "boolean" || input.at < 0 || atMs < state.proof_updated_at_ms || atMs > proof.expires_at_ms || atMs > nowMs + 250 || atMs < nowMs - 5e3) throw new Error("invalid_time");
		const advanced = advanceFishingProof(state, atMs);
		if (state.proof_holding !== Number(input.holding)) changes++;
		state = {
			...state,
			proof_updated_at_ms: advanced.updatedAtMs,
			proof_bar: advanced.bar,
			proof_velocity: advanced.velocity,
			proof_progress: advanced.progress,
			proof_holding: Number(input.holding)
		};
	}
	return {
		state,
		samples: inputs.length,
		changes
	};
}
var ARENA_RULES = {
	"1v1": {
		mode: "1v1",
		teamSize: 1,
		totalPlayers: 2,
		killTarget: 5,
		label: "1'e 1"
	},
	"2v2": {
		mode: "2v2",
		teamSize: 2,
		totalPlayers: 4,
		killTarget: 10,
		label: "2’ye 2"
	},
	"3v3": {
		mode: "3v3",
		teamSize: 3,
		totalPlayers: 6,
		killTarget: 15,
		label: "3'e 3"
	},
	"5v5": {
		mode: "5v5",
		teamSize: 5,
		totalPlayers: 10,
		killTarget: 25,
		label: "5'e 5"
	}
};
var ARENA_COUNTDOWN_MS = 4e3;
var ARENA_ANNOUNCEMENT_MS = 7e3;
var ARENA_QUEUE_TTL_MS = 45e3;
var ARENA_RECONNECT_GRACE_MS = 3e4;
function isArenaMode(value) {
	return value === "1v1" || value === "2v2" || value === "3v3" || value === "5v5";
}
function safeArenaTeamName(value) {
	if (typeof value !== "string") return "";
	return value.normalize("NFKC").replace(/[^\p{L}\p{N} _-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 24);
}
function arenaSpawn(team, slot, teamSize) {
	const safeSlot = Math.max(0, Math.min(Math.max(0, teamSize - 1), Math.floor(slot)));
	if (teamSize > 5) return {
		x: team === 1 ? 450 + Math.floor(safeSlot / 8) * 60 : 1950 - Math.floor(safeSlot / 8) * 60,
		y: 400 + safeSlot % 8 * 100
	};
	const spread = teamSize <= 1 ? 0 : (safeSlot - (teamSize - 1) / 2) * 115;
	return {
		x: team === 1 ? 650 : 1750,
		y: 750 + spread
	};
}
function readAreaSkillHints(input) {
	const result = /* @__PURE__ */ new Map();
	if (!Array.isArray(input) || input.length > 32) return result;
	for (const raw of input) {
		if (!raw || typeof raw !== "object") continue;
		const row = raw;
		if (typeof row.id !== "string" || row.id.length > 120 || typeof row.spawnRound !== "number" || !Number.isSafeInteger(row.spawnRound) || typeof row.x !== "number" || typeof row.y !== "number" || !Number.isFinite(row.x) || !Number.isFinite(row.y)) continue;
		result.set(row.id, {
			id: row.id,
			spawnRound: row.spawnRound,
			x: row.x,
			y: row.y
		});
	}
	return result;
}
function areaSkillPoint(target, player, hint, nowMs, primary = false, recentlyProvoked = false) {
	if (Number(target.root_until_ms) > nowMs && Number.isFinite(target.control_x) && Number.isFinite(target.control_y)) return {
		x: Number(target.control_x),
		y: Number(target.control_y)
	};
	if (!hint || hint.id !== target.id || hint.spawnRound !== target.spawn_round || target.is_stone || target.is_boss) return target;
	const leash = primary || recentlyProvoked ? 480 : 150;
	if (Math.hypot(hint.x - target.x, hint.y - target.y) > leash + 2 || (primary || recentlyProvoked) && Math.hypot(player.x - hint.x, player.y - hint.y) > 500 || Math.hypot(player.x - target.x, player.y - target.y) > (primary || recentlyProvoked ? 850 : 500) || !isAreaWalkablePosition(target.area, hint.x, hint.y) || !isAreaWalkableSegment(target.area, target.x, target.y, hint.x, hint.y)) return target;
	return {
		x: hint.x,
		y: hint.y
	};
}
var DROP_COLLECTION_RANGE = 280;
var FISHERMAN = {
	x: 1770,
	y: 970
};
var FISHING_SPAWN = {
	x: 1900,
	y: 1040
};
var FISHING_LAKE = {
	x: 1200,
	y: 745,
	radiusX: 735,
	radiusY: 445
};
var FISHERMAN_INTERACTION_RANGE = 260;
var PENDING_DROP_ENCHANTMENTS = "__pending__";
var PROFILE_PENDING_DROP_ENCHANTMENTS = "__profile_pending__";
var WORLD_BOSS_TOP_DAMAGE_GEMS = 30;
 function announceRareDrop(database, player, itemName, dropId, rarity, now) {
	const expiresAtMs = Date.now() + 7e3;
	const requestId = `${rarity}-drop-${dropId}`.slice(0, 80);
	const inserted = database.prepare(`INSERT INTO messages
    (player_id, player_name, recipient_id, scope, area, channel, body, created_at, announcement_expires_at_ms, announcement_request_id)
    VALUES (?, 'GANİMET', NULL, 'world', NULL, 1, ?, ?, ?, ?)
    ON CONFLICT(player_id, announcement_request_id) DO NOTHING
    RETURNING id, player_id, player_name, recipient_id, scope, area, channel, body, created_at, announcement_expires_at_ms`).bind(player.id, rarity === "purple" ? `${player.name}, ${itemName} kazandı!` : `${itemName} · ${player.name} kazanmıştır!`, now, expiresAtMs, requestId).first();
	if (!inserted) return;
	broadcastAnnouncement(database, inserted, now);
}
 function broadcastAnnouncement(database, inserted, now) {
	const [world, rooms] = Promise.all([database.prepare("SELECT cycle FROM world_state WHERE id = 1").first(), database.prepare("SELECT DISTINCT channel, area, arena_match_id FROM players WHERE last_seen >= ?").bind(now - 30).all()]);
	if (!world) return;
	publishRealtimeWorldEvent(world.cycle, rooms.results.map((room) => ({
		channel: room.channel,
		area: room.area,
		arenaMatchId: room.arena_match_id || void 0
	})), {
		type: "chat_message",
		eventId: `chat-message:${inserted.id}`,
		chatScope: "world",
		cycle: world.cycle,
		serverAt: Date.now(),
		message: inserted
	});
}
function rejectBasicAttackCadence(cooldownMs, pveHit) {
	const nowMs = Date.now();
	const nextAttackAtMs = nowMs + cooldownMs;
	return Response.json({
		pveHit,
		error: "Saldırı ritmi eşitleniyor.",
		code: "basic_attack_cadence",
		nextAttackAtMs,
		retryAfterMs: clamp$1(Math.ceil(nextAttackAtMs - nowMs + 12), 12, cooldownMs + 120)
	}, { status: 429 });
}
function monsterCombatPosition(monster, player) {
	if (Number(monster.root_until_ms) > Date.now()) return {
		ok: true,
		supplied: true,
		x: Number(monster.control_x),
		y: Number(monster.control_y)
	};
	if (monster.is_stone || isFrozenWaterId(monster.id) || isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary) return {
		ok: true,
		supplied: false,
		x: monster.x,
		y: monster.y
	};
	const deltaX = player.x - monster.x;
	const deltaY = player.y - monster.y;
	const anchorDistance = Math.hypot(deltaX, deltaY);
	if (!anchorDistance) return {
		ok: true,
		supplied: false,
		x: monster.x,
		y: monster.y
	};
	const maximumChase = isBlackStoneBoss476(monster.id) || (isFrozenBossId(monster.id)||isRuneV2Boss(monster.id)) || monster.id === "ancient-boss-1" ? 460 : 480;
	const travel = Math.min(maximumChase, Math.max(0, anchorDistance - 85));
	const x = monster.x + deltaX / anchorDistance * travel;
	const y = monster.y + deltaY / anchorDistance * travel;
	return isAreaWalkablePosition(monster.area, x, y) ? {
		ok: true,
		supplied: true,
		x,
		y
	} : {
		ok: true,
		supplied: false,
		x: monster.x,
		y: monster.y
	};
}
function colCriticalMultiplier491(base,player){const raw=player.equipped_helmet_enchantments;if(typeof raw!=='string'||!raw.includes('"critical_damage491"'))return base;return base+enchantmentTotal([{kind:'helmet',enchantments:raw}],'critical_damage491')/100;}
function equippedEnchantItems(player) {
	const items = [
		{
			kind: "weapon",
			enchantments: player.equipped_weapon_enchantments
		},
		{
			kind: "armor",
			enchantments: player.equipped_armor_enchantments
		},
		{
			kind: "helmet",
			enchantments: player.equipped_helmet_enchantments
		},
		{
			kind: "shoes",
			enchantments: player.equipped_shoes_enchantments
		},
		{
			kind: "necklace",
			enchantments: player.equipped_necklace_enchantments
		}
	];
 const earring456=player.jewelry_earring_enchantments,bracelet456=player.jewelry_bracelet_enchantments;
 if(typeof earring456==='string'&&earring456&&earring456!=='[]')items.push({kind:'earring',enchantments:earring456});
 if(typeof bracelet456==='string'&&bracelet456&&bracelet456!=='[]')items.push({kind:'bracelet',enchantments:bracelet456});
 return items;
}
function droppedGearKind(kind) {
	if (kind === "weapon") return "weapon";
	const roll = Math.floor(Math.random() * 12);
	return roll < 4 ? "armor" : roll < 8 ? "shoes" : "necklace";
}
function droppedGearName(kind, role, rarity, currentName) {
	if (kind === "weapon" || kind === "armor") return currentName ?? (kind === "weapon" ? "Kadim Silah" : "Kadim Zırh");
	const prefix = rarity === "red" ? "Kızıl" : rarity === "orange" ? "Kor" : rarity === "blue" ? "Safir" : "Kül";
	const className = role === "avci" ? "Avcı" : role === "arkanist" ? "Rün" : "Muhafız";
	return kind === "shoes" ? `${prefix} ${className} Çizmeleri` : kind === "helmet" ? `${prefix} ${className} ${role === "arkanist" ? "Tacı" : role === "avci" ? "Başlığı" : "Miğferi"}` : `${prefix} ${className} Kolyesi`;
}
 function finalizePendingDropEnchantments(database, settings, scope) {
	const scoped = scope ? " AND owner_id = ?" + (scope.dropId ? " AND id = ?" : " AND monster_id IN (SELECT value FROM json_each(?))") : "";
	const binds = scope ? [scope.ownerId, scope.dropId ?? JSON.stringify(scope.monsterIds ?? [])] : [];
	const rows = database.prepare(`SELECT id, kind, item_name, rarity, role, enchantments FROM world_drops
     WHERE enchantments IN ('__pending__','__profile_pending__') AND kind IN ('weapon','armor','helmet','shoes','necklace')${scoped}
     ORDER BY expires_at LIMIT 64`).bind(...binds).all();
	if (!rows.results.length) return;
	database.batch(rows.results.map((row) => {
		const kind = row.enchantments === PROFILE_PENDING_DROP_ENCHANTMENTS && isGearKind(row.kind) ? row.kind : droppedGearKind(row.kind);
		return database.prepare(groundLoot30s ? "UPDATE world_drops SET kind = ?, item_name = ?, enchantments = ?, expires_at = expires_at WHERE id = ? AND enchantments = ?" : "UPDATE world_drops SET kind = ?, item_name = ?, enchantments = ?, expires_at = MAX(expires_at, CAST(strftime('%s','now') AS INTEGER) + 120) WHERE id = ? AND enchantments = ?").bind(kind, droppedGearName(kind, row.role, row.rarity, row.item_name), JSON.stringify(rollEnchantments(settings, kind)), row.id, row.enchantments);
	}));
}
 function tryFinalizePendingDropEnchantments(database, settings, scope) {
	try {
		finalizePendingDropEnchantments(database, settings, scope);
	} catch (error) {
		console.error("Bekleyen ganimet efsunları tamamlanamadı; sonraki istekte yeniden denenecek.", error);
	}
}
function profileFromDefeat(defeat, fallbackKey, settings) {
 if(!lootProfileCacheR61)return profileFromDefeatUncachedR61(defeat,fallbackKey,settings);
 return lootProfileCacheR61(defeat,fallbackKey,settings,()=>profileFromDefeatUncachedR61(defeat,fallbackKey,settings));
}
function profileFromDefeatUncachedR61(defeat, fallbackKey, settings) {
 if(String(fallbackKey).startsWith('rune.')||String(fallbackKey).startsWith('rune_v2.')){const saved=JSON.parse(defeat.loot_profile_json);if(saved?.version!==1||saved.key!==fallbackKey||!saved.runeLoot)throw Error('Rün ganimeti kaydı geçersiz.');return saved;}
	return parseLiveLootProfileSnapshot(defeat, directLootProfile(buildDefaultLootProfile(fallbackKey, settings)));
}
function prepareProfileDrops(profile, participants, monsterId, center, settings, now, eventSnapshot, pearlsRetired = false) {
 // Only this frozen boss profile grants independent existing rolls to each
 // authoritative participant. Old pending deaths and ordinary rune mobs keep
 // their original single-owner distribution; no ranking reward is duplicated.
 if(profile.runeBossPersonal502===true&&profile.key==='rune_v2.boss'&&(fourChannels?/^rune-v2-boss-c[1-4]-1$/:/^rune-v2-boss-c[1-3]-1$/).test(colLabMonsterSource(monsterId))){
  const personal502={...profile,runeBossPersonal502:false};
  return participants.flatMap(participant=>prepareProfileDrops(personal502,[participant],monsterId,center,settings,now,eventSnapshot,pearlsRetired));
 }

 if(profile.runeLoot){const rates487=JSON.parse(eventSnapshot||'{}'),policy487=balanceFromSnapshot487(rates487),area487=balanceArea487({...center,id:monsterId},profile.key);let owner487;
 const rows=prepareRuneDrops(profile,participants,monsterId,center,settings,now,{role:rollLootRole,name:resolveLootItemName,power:rollLootPower,enchants:rollEnchantments,onOwner487:o=>{owner487=o;},balance487:(kind,owner)=>catalogMultiplier487(kind,balanceFactor487(policy487,area487,owner.level),materialLevelPolicy498(rates487))});
 // Event chest rolls were missing entirely on rune profiles. Keep the same
 // frozen event chances, level policy, one owner and durable claim gate.
 if(owner487)for(const [event,kind,label,dx]of [['chest','crystal_chest','Kristal Sandığı',-20],['moonlight','moonlight_chest','Ayışığı Sandığı',0],['halloween','halloween_pumpkin','Bal Kabağı',20]]){
  const rate=(Number(rates487[event])||0)*(policy487?.enabled?balanceFactor487(policy487,area487,owner487.level):1);
  if(rate>0&&Math.random()*100<rate)rows.push([crypto.randomUUID(),owner487.player_id,monsterId,kind,label,'orange',0,1,null,'[]',center.x+dx,center.y+22,now+GROUND_LOOT_SECONDS,now+5]);
 }return rows;}
	const rates = JSON.parse(eventSnapshot || "{}");
 const balance487=balanceFromSnapshot487(rates),balanceArea=balanceArea487({...center,id:monsterId},profile.key);
	if (rates.materials) profile = withUpgradeMaterialDrops(profile, rates.materials);
	const expiresAt = now + GROUND_LOOT_SECONDS;
	const collectibleAt = now + 5;
	const prepared = [];
	const personalBossLoot = profile.key.startsWith("boss.");
	const lootOwnerIndex = participants.length ? Math.floor(Math.random() * participants.length) : -1;
	participants.forEach((participant, participantIndex) => {
		const ownsItems = personalBossLoot || participantIndex === lootOwnerIndex;
		const levelBalanceMultiplier487=balanceFactor487(balance487,balanceArea,participant.level);
		const itemMultiplier = balance487?.enabled||levelExemptEnabledR58(balanceArea)?1:forestLootMultiplier(profile.key, participant.level, settings);
		const bossPurpleChance = ownsItems ? (monsterId === "ancient-boss-1"||eventKind444(monsterId)==='ancient') ? settings.ancient_boss_purple_chance : (colLabMonsterSource(monsterId) === "dunya-bosu-1"||eventKind444(monsterId)==='world') ? settings.world_boss_purple_chance : 0 : 0;
		const ancientNormalPurpleChance = participantIndex === lootOwnerIndex && profile.key?.startsWith("ancient.") ? settings.ancient_normal_purple_chance : 0;
		rollLootProfile(profile, {
			hasDropCharm: participant.drop_charm_until > now,
			eventPercent: rates.loot ?? 0,
			itemMultiplier,levelBalanceMultiplier487,materialLevel498:materialLevelPolicy498(rates),
			bossPurpleChancePpm: Math.round(Math.max(0, Math.min(1, bossPurpleChance)) * 1e6),
			ancientNormalPurpleChancePpm: Math.round(Math.max(0, Math.min(1, ancientNormalPurpleChance)) * 1e6)
		}).forEach((drop, dropIndex) => {
			if (pearlsRetired && drop.item.kind === "pearl") return;
			if (drop.item.kind !== "essence" && !ownsItems) return;
			const gear = drop.item.type === "gear";
			const lootRole = gear ? rollLootRole() : participant.role;
			const itemName = resolveLootItemName(drop.item, lootRole);
			const angle = (participantIndex * 1.73 + dropIndex * 2.41) % (Math.PI * 2);
			const radius = 18 + (participantIndex * 19 + dropIndex * 23) % 39;
			prepared.push([
				crypto.randomUUID(),
				participant.player_id,
				monsterId,
				drop.item.kind,
				gear ? droppedGearName(drop.item.kind, lootRole, drop.item.rarity, itemName) : itemName,
				drop.item.type === "gear" ? drop.item.rarity : drop.item.kind === "stone_dust" ? "orange" : drop.item.kind === "pearl" ? "blue" : "white",
				gear ? rollLootPower(drop.item, settings) : 0,
				drop.item.kind === "essence" ? bonusAmount(drop.amount, rates.essence ?? 0) : drop.amount,
				gear ? lootRole : null,
				gear ? JSON.stringify(rollEnchantments(settings, drop.item.kind)) : "[]",
				center.x + Math.cos(angle) * radius,
				center.y + Math.sin(angle) * radius * .72,
				expiresAt,
				collectibleAt
			]);
		});
		if (ownsItems && Math.random() * 100 < (rates.chest ?? 0) * itemMultiplier * levelBalanceMultiplier487) prepared.push([
			crypto.randomUUID(),
			participant.player_id,
			monsterId,
			"crystal_chest",
			"Kristal Sandığı",
			"blue",
			0,
			1,
			null,
			"[]",
			center.x + participantIndex * 10,
			center.y + 20,
			expiresAt,
			collectibleAt
		]);
		if (ownsItems && Math.random() * 100 < (rates.moonlight ?? 0) * itemMultiplier * levelBalanceMultiplier487) prepared.push([
			crypto.randomUUID(),
			participant.player_id,
			monsterId,
			"moonlight_chest",
			"Ayışığı Sandığı",
			"orange",
			0,
			1,
			null,
			"[]",
			center.x + participantIndex * 10 + 14,
			center.y + 22,
			expiresAt,
			collectibleAt
		]);
 if(ownsItems&&(rates.halloween??0)>0&&Math.random()*100<(rates.halloween??0)*itemMultiplier*levelBalanceMultiplier487)prepared.push([crypto.randomUUID(),participant.player_id,monsterId,'halloween_pumpkin','Bal Kabağı','orange',0,1,null,'[]',center.x+participantIndex*10+24,center.y+24,expiresAt,collectibleAt]);
	});
	return prepared;
}
function profileDropInsertStatements(database, rows, gate) {
	if (!rows.length) return [];
	const claimSql = gate.kind === "boss" ? `SELECT 1 FROM boss_reward_claims claim
       WHERE claim.boss_round = ? AND claim.player_id = CAST(json_extract(drop_row, '$[1]') AS TEXT)
         AND claim.claim_token = ?` : gate.kind === "sinsi" ? `SELECT 1 FROM sinsi_reward_claims claim
       WHERE claim.monster_id = ? AND claim.spawn_round = ?
         AND claim.player_id = CAST(json_extract(drop_row, '$[1]') AS TEXT) AND claim.claim_token = ?` : `SELECT 1 FROM normal_reward_claims claim
       WHERE claim.monster_id = ? AND claim.spawn_round = ?
         AND claim.player_id = CAST(json_extract(drop_row, '$[1]') AS TEXT) AND claim.claim_token = ?`;
	const statement = database.prepare(`WITH drops(drop_row) AS (SELECT value FROM json_each(?))
     INSERT OR IGNORE INTO world_drops
       (id, owner_id, monster_id, kind, item_name, rarity, power, amount, role, enchantments,
        x, y, expires_at, collectible_at)
     SELECT
       CAST(json_extract(drop_row, '$[0]') AS TEXT),
       CAST(json_extract(drop_row, '$[1]') AS TEXT),
       CAST(json_extract(drop_row, '$[2]') AS TEXT),
       CAST(json_extract(drop_row, '$[3]') AS TEXT),
       json_extract(drop_row, '$[4]'),
       CAST(json_extract(drop_row, '$[5]') AS TEXT),
       CAST(json_extract(drop_row, '$[6]') AS INTEGER),
       CAST(json_extract(drop_row, '$[7]') AS INTEGER),
       json_extract(drop_row, '$[8]'),
       CAST(json_extract(drop_row, '$[9]') AS TEXT),
       CAST(json_extract(drop_row, '$[10]') AS REAL),
       CAST(json_extract(drop_row, '$[11]') AS REAL),
       CAST(json_extract(drop_row, '$[12]') AS INTEGER),
       CAST(json_extract(drop_row, '$[13]') AS INTEGER)
     FROM drops
     WHERE EXISTS (${claimSql})`);
	return [gate.kind === "boss" ? statement.bind(JSON.stringify(rows), gate.bossRound, gate.claimToken) : statement.bind(JSON.stringify(rows), gate.monsterId, gate.spawnRound, gate.claimToken)];
}
var defaultLootSnapshotCache = /* @__PURE__ */ new WeakMap();
function defaultLootSnapshot(target, settings) {if(isAdventureArea(target.area)){const p=globalThis.__colAdventure?.profile(target);if(!p)throw Error('adventure_loot_profile_missing');return {lootSourceKey:'adventure.catalog',lootProfileRevision:1,lootProfileJson:JSON.stringify(p)};}if(target.area==='event'){const p=globalThis.__colEventIsland444?.profile(target);if(p?.loot)return p.loot;}
 if(target.area==='rune_v2')return runeLootSnapshot498(globalThis.__colRuneV2?.lootSnapshot(target)??null);if(target.area==='rune')return runeLootSnapshot498(globalThis.__colRunes?.lootSnapshot(target)??null);
	if (target.id === "dragon-world-1") return {
		lootSourceKey: "boss.dragon",
		lootProfileRevision: dragonService()?.settings().revision ?? 0,
		lootProfileJson: JSON.stringify(dragonService()?.settings().config)
	};
	const sourceKey = resolveLootSourceKey(target);
	if (!sourceKey) return null;
	let settingsCache = defaultLootSnapshotCache.get(settings);
	if (!settingsCache) {
		settingsCache = /* @__PURE__ */ new Map();
		defaultLootSnapshotCache.set(settings, settingsCache);
	}
	const cached = settingsCache.get(sourceKey);
	if (cached) return cached;
	const snapshot = defaultLootTemplateR87(settings, sourceKey, () => createLootProfileSnapshot({
		sourceKey,
		revision: 0,
		customized: false,
		updatedAt: 0,
		profile: directLootProfile(buildDefaultLootProfile(sourceKey, settings))
	}));
	settingsCache.set(sourceKey, snapshot);
	return snapshot;
}
function prepareMonsterXp(database, settings, now, monsterId, spawnRound, reward, lethalDamage, includeBefore = false, questMonster438 = null) {
 const adventureXp511=adventureMonsterId(monsterId);
	const token = crypto.randomUUID(), xp = Math.max(0, Math.floor(reward));
 const balanceXpFactor487=balanceXpSql487(settings,questMonster438,monsterId),balanceXpPrefix487=balanceXpFactor487==='1'?'':balanceXpFactor487+'*';
	const peers = `peers AS (
    SELECT source.id AS source_id,ally.id AS ally_id FROM sources source
    JOIN party_members mine ON mine.player_id=source.id
    JOIN party_members team ON team.party_id=mine.party_id AND team.player_id<>source.id
    JOIN players ally ON ally.id=team.player_id
    WHERE ${adventureXp511?0:1}=1 AND source.hp>0 AND MAX(source.last_seen,CAST(source.movement_checked_at_ms/1000 AS INTEGER),CAST(source.last_monster_hit_at/1000 AS INTEGER))>=(SELECT seen_since FROM reward_input) AND ally.hp>0 AND MAX(ally.last_seen,CAST(ally.movement_checked_at_ms/1000 AS INTEGER),CAST(ally.last_monster_hit_at/1000 AS INTEGER))>=(SELECT seen_since FROM reward_input)
    AND ally.area=source.area AND ally.channel=source.channel AND ally.arena_match_id=source.arena_match_id
    AND (ally.x-source.x)*(ally.x-source.x)+(ally.y-source.y)*(ally.y-source.y)<=5760000)`;
	const historical = `${adventureXp511?"AND p.hp>0 AND EXISTS(SELECT 1 FROM adventure_members a JOIN adventure_runs r ON r.id=a.run_id JOIN adventure_monsters am ON am.run_id=r.id WHERE a.player_id=p.id AND a.departed=0 AND am.id=mp.monster_id AND p.area=am.area AND p.channel=r.channel)":""} AND NOT EXISTS(SELECT 1 FROM normal_reward_claims r WHERE r.monster_id=mp.monster_id AND r.spawn_round=mp.spawn_round AND r.player_id=mp.player_id)
    AND NOT EXISTS(SELECT 1 FROM sinsi_reward_claims r WHERE r.monster_id=mp.monster_id AND r.spawn_round=mp.spawn_round AND r.player_id=mp.player_id)
    AND NOT EXISTS(SELECT 1 FROM boss_reward_claims r WHERE (mp.monster_id='dunya-bosu-1' OR EXISTS(SELECT 1 FROM loadlab_boss_rounds_v1 lab_round WHERE lab_round.monster_id=mp.monster_id AND lab_round.boss_round=mp.spawn_round)) AND r.boss_round=mp.spawn_round AND r.player_id=mp.player_id)`;
	const statementsR54 = [
		...includeBefore ? [database.prepare(`SELECT id,xp${globalThis.__colRanks ? ",rank_xp" : ""} FROM players WHERE id IN (SELECT player_id FROM monster_participants WHERE monster_id=? AND spawn_round=?)`).bind(monsterId, spawnRound)] : [],
		database.prepare(`WITH reward_input(seen_since,xp_amount) AS (SELECT ?,?), sources AS (
      SELECT p.* FROM monster_participants mp JOIN players p ON p.id=mp.player_id
      WHERE mp.monster_id=? AND mp.spawn_round=?
      AND (? IS NULL OR EXISTS(SELECT 1 FROM monsters m WHERE m.id=mp.monster_id AND m.spawn_round=mp.spawn_round AND m.hp>0 AND m.hp<=?))
      AND NOT EXISTS(SELECT 1 FROM monster_xp_claims c WHERE c.monster_id=mp.monster_id AND c.spawn_round=mp.spawn_round AND c.player_id=mp.player_id)
      ${historical}
    ),${peers}
    INSERT OR IGNORE INTO monster_xp_claims(monster_id,spawn_round,player_id,claim_token,awarded_at)
    SELECT ?,?,id,?,? FROM(SELECT id FROM sources UNION SELECT ally_id FROM peers)`).bind(now - 30, xp, monsterId, spawnRound, lethalDamage ?? null, lethalDamage ?? null, monsterId, spawnRound, token, now),
		database.prepare(`WITH RECURSIVE reward_input(seen_since,xp_amount) AS (SELECT ?,?), sources AS (
      SELECT p.* FROM monster_participants mp JOIN players p ON p.id=mp.player_id
      JOIN monster_xp_claims c ON c.monster_id=mp.monster_id AND c.spawn_round=mp.spawn_round AND c.player_id=mp.player_id WHERE c.claim_token=? ${historical}
    ),${peers},
    buckets AS (SELECT s.id,COALESCE('party:'||pm.party_id,'solo:'||s.id) AS bucket FROM sources s LEFT JOIN party_members pm ON pm.player_id=s.id WHERE pm.party_id IS NULL OR(s.hp>0 AND MAX(s.last_seen,CAST(s.movement_checked_at_ms/1000 AS INTEGER),CAST(s.last_monster_hit_at/1000 AS INTEGER))>=(SELECT seen_since FROM reward_input))),
    recipients AS(SELECT bucket,id AS player_id FROM buckets UNION SELECT b.bucket,p.ally_id FROM peers p JOIN buckets b ON b.id=p.source_id),
    ranked AS(SELECT bucket,player_id,COUNT(*) OVER(PARTITION BY bucket) AS member_count,ROW_NUMBER() OVER(PARTITION BY bucket ORDER BY player_id) AS member_rank FROM recipients),
    amounts AS(SELECT player_id,SUM(CAST((SELECT xp_amount FROM reward_input)*(100+2*(MIN(5,member_count)-1))/100 AS INTEGER)) AS amount FROM ranked GROUP BY player_id),
    boosted AS MATERIALIZED(SELECT p.id,ROUND(a.amount*${balanceXpPrefix487}${guildXpSql()}*(CASE WHEN p.xp_ring_until>? THEN 1.25 ELSE 1 END)*(CASE WHEN EXISTS(SELECT 1 FROM player_pets WHERE player_id=p.id AND acquired_at+604800>unixepoch() AND equipped=1 AND kind='dog') THEN 1.2 WHEN EXISTS(SELECT 1 FROM player_pets WHERE player_id=p.id AND acquired_at+604800>unixepoch() AND equipped=1 AND kind IN ('bird','monkey')) THEN 1.1 ELSE 1 END)*${premiumXpSql()}) AS amount FROM amounts a JOIN players p ON p.id=a.player_id),
    curve(level,total_xp,next_cost) AS(SELECT 1,0,CAST(json_extract((SELECT xp_curve_json FROM game_settings WHERE id=1),'$[0]') AS INTEGER)
    UNION ALL SELECT level+1,total_xp+next_cost,COALESCE(CAST(json_extract((SELECT xp_curve_json FROM game_settings WHERE id=1),'$['||level||']') AS INTEGER),0) FROM curve WHERE level<65)
    UPDATE players SET ${globalThis.__colQuests438?.enabled&&questMonsterEligible438(questMonster438)?questKillSql438()+',':''}${battlePassXpSql('CASE WHEN level>=65 AND rank_tier>0 THEN ROUND((SELECT amount FROM boosted WHERE id=players.id)*'+wisdomSql()+') ELSE (SELECT amount FROM boosted WHERE id=players.id) END','players','((SELECT seen_since FROM reward_input)+30)*1000')},${globalThis.__colRanks ? `rank_xp=CASE WHEN level>=65 AND rank_tier>0 THEN MIN(9000000000000,rank_xp+ROUND((SELECT amount FROM boosted WHERE id=players.id)*${wisdomSql()})) ELSE rank_xp END,` : ""}xp=CASE WHEN level>=${levelCapSql()} THEN xp ELSE MIN((SELECT total_xp FROM curve WHERE level=${levelCapSql()}),xp+(SELECT amount FROM boosted WHERE id=players.id)) END,level=MAX(level,COALESCE((SELECT MAX(level) FROM curve WHERE level<=${levelCapSql()} AND total_xp<=xp+(SELECT amount FROM boosted WHERE id=players.id)),1))
    WHERE id IN(SELECT player_id FROM monster_xp_claims WHERE claim_token=?) AND id IN(SELECT id FROM boosted) RETURNING id,xp,level${globalThis.__colRanks ? ",rank_xp" : ""}`).bind(now - 30, xp, token, now, token),
        ...cauldronDropStatements488(database,settings,questMonster438,monsterId,token,now,colLabIsMonster),
        ...forgeDropStatements491(database,settings,questMonster438,monsterId,token,colLabIsMonster)
	];
	return ports.prepareMonsterXpR54?.({database,statements:statementsR54,subject:questMonster438,monsterId,spawnRound,lethalDamage,includeBefore,token,xp,now,settings,extra:!!extraService(),guild:!!guildSkillService(),ranks:!!globalThis.__colRanks,quest:!!(globalThis.__colQuests438?.enabled&&questMonsterEligible438(questMonster438)),balanceSql:balanceXpFactor487})??statementsR54;
}
 function awardProfileBossRewards(database, settings, now, pending) {
	return runRewardDelivery(database, `boss:${pending.boss_round}`,  () => {
        const loadlabBoss=colLabBossMonster(pending.boss_round);
        const rewardMonsterId=loadlabBoss?.id??"dunya-bosu-1";
        database=colLabRewardDatabase(database,{monster_id:rewardMonsterId,spawn_round:pending.boss_round});
		const bossRound = pending.boss_round;
		const claimToken = crypto.randomUUID();
		const bossXp = Math.max(0, Math.floor(pending.xp_reward));
		const profile = profileFromDefeat(pending, "boss.world", settings);
		const participants = (database.prepare(`SELECT bp.player_id, p.role, p.level, p.drop_charm_until
     FROM boss_participants bp JOIN players p ON p.id = bp.player_id
     WHERE bp.boss_round = ? AND bp.total_damage > 0
     ORDER BY bp.created_at, bp.player_id`).bind(bossRound).all()).results;
		const drops = prepareProfileDrops(profile, participants, rewardMonsterId, pending, settings, now, pending.events_snapshot, pending.pearls_retired === 1);
		const xpStatements488=prepareMonsterXp(database, settings, now, rewardMonsterId, bossRound, bossXp, null, false, {...pending,monster_id:rewardMonsterId,monster_area:"sanctum"});
		const rewardBatch = database.batch([
			...xpStatements488,
			database.prepare(`INSERT OR IGNORE INTO boss_reward_claims (boss_round, player_id, claim_token, awarded_at)
       SELECT bp.boss_round, bp.player_id, ?, ? FROM boss_participants bp
       JOIN players p ON p.id = bp.player_id
       WHERE bp.boss_round = ? AND bp.total_damage > 0`).bind(claimToken, now, bossRound),
			database.prepare(`UPDATE players SET gems = gems + ?
       WHERE id = (
         SELECT bp.player_id FROM boss_participants bp
         JOIN players ranked ON ranked.id = bp.player_id
         WHERE bp.boss_round = ? AND bp.total_damage > 0
         ORDER BY bp.total_damage DESC, bp.created_at ASC, ranked.name ASC, bp.player_id ASC
         LIMIT 1
       ) AND EXISTS (
         SELECT 1 FROM boss_reward_claims claim
         WHERE claim.boss_round = ? AND claim.player_id = players.id AND claim.claim_token = ?
       )`).bind(WORLD_BOSS_TOP_DAMAGE_GEMS, bossRound, bossRound, claimToken),
			...profileDropInsertStatements(database, drops, {
				kind: "boss",
				bossRound,
				claimToken
			}),
			database.prepare(`DELETE FROM boss_participants
       WHERE boss_round = ? AND EXISTS (
         SELECT 1 FROM boss_reward_claims claim
         WHERE claim.boss_round = ? AND claim.claim_token = ?
       )`).bind(bossRound, bossRound, claimToken)
		]);
		return {
			bossRound,
			claimToken,
			awarded: Number(rewardBatch[xpStatements488.length]?.meta?.changes ?? 0) > 0,
			groundDrops: drops.length
		};
	});
}
 function awardPendingBossRewards(database, settings, now, preferredBossRound, requiredParticipantId) {
	const roundClause = preferredBossRound === void 0 ? "" : "AND bp.boss_round = ?";
	const playerClause = requiredParticipantId ? "AND bp.player_id = ?" : "";
	const pendingStatement = database.prepare(`SELECT bp.boss_round, defeat.x, defeat.y, defeat.xp_reward,
       defeat.events_snapshot, defeat.loot_source_key, defeat.loot_profile_revision, defeat.loot_profile_json,
       ${env.CORE_RUNTIME === "vds" ? "defeat.pearls_retired" : "0 AS pearls_retired"}
     FROM boss_participants bp
     JOIN boss_defeats defeat ON defeat.boss_round = bp.boss_round
     JOIN players p ON p.id = bp.player_id
     LEFT JOIN boss_reward_claims claim ON claim.boss_round = bp.boss_round AND claim.player_id = bp.player_id
     WHERE bp.total_damage > 0 AND claim.player_id IS NULL ${roundClause} ${playerClause}
     ORDER BY bp.boss_round LIMIT 1`);
	const pending = preferredBossRound !== void 0 && requiredParticipantId ? pendingStatement.bind(preferredBossRound, requiredParticipantId).first() : preferredBossRound !== void 0 ? pendingStatement.bind(preferredBossRound).first() : requiredParticipantId ? pendingStatement.bind(requiredParticipantId).first() : pendingStatement.first();
	if (!pending) return null;
	return awardProfileBossRewards(database, settings, now, pending);
}
function monsterXpReward(target, settings) {if(isAdventureArea(target.area))return globalThis.__colAdventure?.profile(target)?.xp??0;if(isBlackStoneBoss476(target.id))return settings.black_stone_boss_xp_reward;if(target.area==='event')return globalThis.__colEventIsland444?.profile(target)?.xp??0;
 if(target.area==='rune_v2')return globalThis.__colRuneV2?.monster(target)?.xp??0;if(target.area==='rune')return globalThis.__colRunes?.monster(target)?.xp??0;
	if (isFrozenBossId(target.id)) return settings.frozen_boss_xp_reward;
	if (target.id === "ancient-boss-1") return settings.ancient_boss_xp_reward;
	if (isFrozenWaterId(target.id)) return settings.frozen_water_xp_reward;
	if (target.is_boss || target.id === "dragon-world-1") return settings.boss_xp_reward;
	if (target.is_stone) return settings.sinsi_stone_xp_reward;
	if (target.area === "sinsi" || target.summoned) {
		if (target.id.startsWith("golge-")) return settings.sinsi_shadow_wolf_xp_reward;
		if (target.id.startsWith("curuk-")) return settings.sinsi_guardian_xp_reward;
		if (target.id.startsWith("yutan-")) return settings.sinsi_devourer_xp_reward;
		return 0;
	}
	if (target.area === "frozen") {
		if (target.variant === "katil") return settings.frozen_killer_variant_xp_reward;
		if (target.variant === "agresif") return settings.frozen_aggressive_variant_xp_reward;
		if (target.id.startsWith("golge-")) return settings.frozen_shadow_wolf_xp_reward;
		if (target.id.startsWith("curuk-")) return settings.frozen_rotten_guardian_xp_reward;
		if (target.id.startsWith("yutan-")) return settings.frozen_essence_devourer_xp_reward;
		return 0;
	}
	if (target.area === "ancient") return target.id.startsWith("golge-") ? settings.ancient_golge_xp_reward : target.id.startsWith("curuk-") ? settings.ancient_curuk_xp_reward : settings.ancient_yutan_xp_reward;
	if (target.area === "afk") return settings.afk_island_xp_reward;
	if (target.area === "black") return settings.black_monster_xp_reward;
	if (target.variant === "katil") return settings.killer_variant_xp_reward;
	if (target.variant === "agresif") return settings.aggressive_variant_xp_reward;
	if (target.id.startsWith("golge-")) return settings.shadow_wolf_xp_reward;
	if (target.id.startsWith("curuk-")) return settings.rotten_guardian_xp_reward;
	if (target.id.startsWith("yutan-")) return settings.essence_devourer_xp_reward;
	return 0;
}
function normalEssenceRoll(target) {if(isAdventureArea(target.area))return {min:0,span:0};if(target.area==='event')return {min:0,span:0};
	if (isBlackStoneBoss476(target.id) || isFrozenBossId(target.id) || target.id === "ancient-boss-1") return {
		min: 20,
		span: 16
	};
	if (isFrozenWaterId(target.id)) return {
		min: 8,
		span: 7
	};
	return target.variant === "katil" ? {
		min: 8,
		span: 6
	} : target.variant === "agresif" ? {
		min: 5,
		span: 4
	} : {
		min: 2,
		span: 3
	};
}
function monsterIsInPlayerWorld(monster, player) {
    if(!colLabMayAffectMonster(player,monster))return false;
	if (monster.area !== player.area) return false;
	return monster.channel === 0 || monster.channel === player.channel;
}
function pveAttackCadenceMs(monster) {if(isAdventureArea(monster.area))return globalThis.__colAdventure?.profile(monster)?.cadence??2200;if(monster.area==='event')return globalThis.__colEventIsland444?.profile(monster)?.cadence??2100;
	const base = isFrozenWaterId(monster.id) ? 2850 : isBlackStoneBoss476(monster.id) || (isFrozenBossId(monster.id)||isRuneV2Boss(monster.id)) || monster.id === "ancient-boss-1" ? 2250 : monster.is_boss || monster.id === "dragon-world-1" ? 2100 : monster.variant === "katil" ? 800 : monster.variant === "agresif" || monster.summoned ? 950 : 1100;
	const jitter = [...monster.id].reduce((sum, character) => sum * 33 + character.charCodeAt(0) >>> 0, 0) % 221;
	return base + (monster.is_boss || monster.id === "dragon-world-1" || isBlackStoneBoss476(monster.id) || (isFrozenBossId(monster.id)||isRuneV2Boss(monster.id)) || monster.id === "ancient-boss-1" || isFrozenWaterId(monster.id) ? jitter : jitter % 81);
}
 function armPveEngagement(database, player, monster, nowMs) {if(isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary)return;
	const statements = preparePveEngagement(database, player, monster, nowMs);
	if (!statements.length) return;
	if (database.combat?.enabled && !database.channelCompute) {
		// A newly approached monster is not yet in the private combat store.
		// Resident channels return immediately for an already loaded monster.
		database.combat.syncEntity('monsters', monster.id);
		database.combatBatch(statements, player.id);
	} else {
		// Legacy compute frames include existing engagements, not new candidates.
		// Keep acquisition in the existing writer lane; later hits are unchanged.
		database.batch(statements);
	}
}
function preparePveEngagement(database, player, monster, nowMs) {if(isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary)return [];
 if(isRuneV2Boss(monster.id))return [];
    if(!colLabMayAffectMonster(player,monster))return [];
	if (player.area === "afk" || monster.is_stone || monster.hp <= 0) return [];
	const nextHitAtMs = nowMs + pveAttackCadenceMs(monster);
	const keepExisting = `pve_engagements.expires_at_ms >= excluded.updated_at_ms
    AND EXISTS (SELECT 1 FROM monsters live_monster
      WHERE live_monster.id = pve_engagements.monster_id
        AND live_monster.spawn_round = pve_engagements.spawn_round AND live_monster.hp > 0)`;
	return [database.prepare(`INSERT INTO pve_engagements
         (player_id, monster_id, spawn_round, next_hit_at_ms, expires_at_ms, hit_sequence, updated_at_ms, last_skill_at_ms,attackers489)
       SELECT ?, ?, ?, ?, ?, 0, ?, ?, ? FROM players current_player
       WHERE current_player.id = ? AND current_player.hp > 0
         AND current_player.area = ? AND current_player.channel = ? AND current_player.arena_match_id = ?
         AND current_player.realtime_scope_version = ?
         AND EXISTS (SELECT 1 FROM monsters current_monster
           WHERE current_monster.id = ? AND current_monster.spawn_round = ? AND current_monster.hp > 0)
       ON CONFLICT(player_id) DO UPDATE SET
         attackers489 = ${pveArmSql489()},
         monster_id = CASE WHEN ${keepExisting} THEN pve_engagements.monster_id ELSE excluded.monster_id END,
         spawn_round = CASE WHEN ${keepExisting} THEN pve_engagements.spawn_round ELSE excluded.spawn_round END,
         next_hit_at_ms = CASE WHEN ${keepExisting}
           THEN MIN(pve_engagements.next_hit_at_ms, excluded.next_hit_at_ms) ELSE excluded.next_hit_at_ms END,
         expires_at_ms = CASE WHEN ${keepExisting}
           THEN MAX(pve_engagements.expires_at_ms, excluded.expires_at_ms) ELSE excluded.expires_at_ms END,
         last_skill_at_ms = CASE WHEN ${keepExisting} THEN pve_engagements.last_skill_at_ms ELSE excluded.last_skill_at_ms END,
         updated_at_ms = excluded.updated_at_ms
       RETURNING player_id`).bind(player.id, monster.id, monster.spawn_round, nextHitAtMs, nowMs + 8e3, nowMs, nowMs, JSON.stringify({[monster.id]:{monster_id:monster.id,spawn_round:monster.spawn_round,next_hit_at_ms:nextHitAtMs,last_skill_at_ms:nowMs}}), player.id, player.area, player.channel, player.arena_match_id, player.realtime_scope_version, monster.id, monster.spawn_round), database.prepare(`UPDATE players SET combat_lock_until_ms = MAX(combat_lock_until_ms, ?)
       WHERE id = ? AND hp > 0 AND area = ? AND channel = ? AND arena_match_id = ?
         AND realtime_scope_version = ?
         AND EXISTS (SELECT 1 FROM pve_engagements engagement
           WHERE engagement.player_id = players.id AND engagement.updated_at_ms = ?)`).bind(nowMs + 5e3, player.id, player.area, player.channel, player.arena_match_id, player.realtime_scope_version, nowMs)];
}
 function spawnSinsiStoneWaves(database, stone, fromStage, toStage, settings) {
	const statements = [];
	const templates = [
		{
			prefix: "golge",
			name: "Sinsi Gölge Kurdu",
			variant: "agresif"
		},
		{
			prefix: "curuk",
			name: "Sinsi Muhafız",
			variant: "agresif"
		},
		{
			prefix: "yutan",
			name: "Sinsi Öz Yutan",
			variant: "katil"
		}
	];
	for (let stage = fromStage + 1; stage <= toStage; stage += 1) for (let index = 0; index < settings.sinsi_stone_wave_count; index += 1) {
		const template = templates[(stone.spawn_round + stage + index) % templates.length];
		const angle = index / Math.max(1, settings.sinsi_stone_wave_count) * Math.PI * 2 + stage * .67;
		const radius = 105 + stage * 18;
		const id = `${template.prefix}-sinsi-${stone.channel}-${stone.id.slice(-1)}-${stone.spawn_round}-${stage}-${index}`;
		statements.push(database.prepare(`INSERT OR IGNORE INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round,
           area, channel, is_stone, wave_stage, summoned, parent_stone_id)
         SELECT ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, ?, 'sinsi', ?, 0, 0, 1, ?
         WHERE EXISTS (SELECT 1 FROM monsters WHERE id = ? AND spawn_round = ? AND hp > 0 AND wave_stage >= ?)`).bind(id, template.name, stone.x + Math.cos(angle) * radius, stone.y + Math.sin(angle) * radius * .62, settings.sinsi_stone_summon_hp, settings.sinsi_stone_summon_hp, template.variant, stone.spawn_round, stone.channel, stone.id, stone.id, stone.spawn_round, stage));
	}
	if (statements.length) database.batch(statements);
	return statements.length;
}
 function awardProfileSinsiStoneRewards(database, settings, now, pending) {
	return runRewardDelivery(database, `sinsi:${pending.monster_id}:${pending.spawn_round}`,  () => {
		const claimToken = crypto.randomUUID();
		const stoneXp = Math.max(0, Math.floor(pending.xp_reward));
		const profile = profileFromDefeat(pending, "sinsi.stone", settings);
		const participants = (database.prepare(`SELECT participant.player_id, p.role, p.level, p.drop_charm_until
     FROM monster_participants participant JOIN players p ON p.id = participant.player_id
     WHERE participant.monster_id = ? AND participant.spawn_round = ?
     ORDER BY participant.created_at, participant.player_id`).bind(pending.monster_id, pending.spawn_round).all()).results;
		const drops = prepareProfileDrops(profile, participants, pending.monster_id, pending, settings, now, pending.events_snapshot, pending.pearls_retired === 1);
		const xpStatements488=prepareMonsterXp(database, settings, now, pending.monster_id, pending.spawn_round, stoneXp, null, false, {...pending,monster_area:"sinsi"});
		const rewardBatch = database.batch([
			...xpStatements488,
			database.prepare(`INSERT OR IGNORE INTO sinsi_reward_claims
         (monster_id, spawn_round, player_id, claim_token, awarded_at)
       SELECT participant.monster_id, participant.spawn_round, participant.player_id, ?, ?
       FROM monster_participants participant
       WHERE participant.monster_id = ? AND participant.spawn_round = ?`).bind(claimToken, now, pending.monster_id, pending.spawn_round),
			...profileDropInsertStatements(database, drops, {
				kind: "sinsi",
				monsterId: pending.monster_id,
				spawnRound: pending.spawn_round,
				claimToken
			})
		]);
		const awarded = Number(rewardBatch[xpStatements488.length]?.meta?.changes ?? 0) > 0;
		return {
			monsterId: pending.monster_id,
			spawnRound: pending.spawn_round,
			claimToken,
			awarded,
			groundDrops: drops.length
		};
	});
}
 function awardPendingSinsiStoneRewards(database, settings, now, preferred) {
	const preferredClause = preferred ? "AND defeat.monster_id = ? AND defeat.spawn_round = ?" : "";
	const pendingStatement = database.prepare(`SELECT pending507.monster_id, pending507.spawn_round, pending507.x, pending507.y, pending507.xp_reward,
       pending507.events_snapshot, pending507.loot_source_key, pending507.loot_profile_revision, pending507.loot_profile_json,
       ${env.CORE_RUNTIME === "vds" ? "pending507.pearls_retired" : "0 AS pearls_retired"}
     FROM sinsi_defeats pending507
     WHERE (pending507.monster_id,pending507.spawn_round)=(
       SELECT defeat.monster_id,defeat.spawn_round FROM sinsi_defeats defeat
       WHERE EXISTS(SELECT 1 FROM monster_participants participant
         WHERE participant.monster_id=defeat.monster_id AND participant.spawn_round=defeat.spawn_round
         AND NOT EXISTS(SELECT 1 FROM sinsi_reward_claims claim
           WHERE claim.monster_id=participant.monster_id AND claim.spawn_round=participant.spawn_round AND claim.player_id=participant.player_id))
       ${preferredClause} ORDER BY defeat.defeated_at,defeat.monster_id LIMIT 1)`);
	const pending = preferred ? pendingStatement.bind(preferred.id, preferred.spawn_round).first() : pendingStatement.first();
	if (!pending) return null;
	return awardProfileSinsiStoneRewards(database, settings, now, pending);
}
 function tryAwardPendingSinsiStoneRewards(database, settings, now, preferred) {
	try {
		return awardPendingSinsiStoneRewards(database, settings, now, preferred);
	} catch (error) {
		console.error("Sinsi Taş ödülleri tamamlanamadı; sonraki istekte yeniden denenecek.", error);
		return null;
	}
}
function normalPendingSourceKey(pending) {
 if(/^rune_v2\.(tide|warden|sentinel|wraith|boss)$/.test(pending.loot_source_key))return pending.loot_source_key;if(/^rune\.(tide|warden|sentinel|wraith)$/.test(pending.loot_source_key))return pending.loot_source_key;
	if (isLootSourceKey(pending.loot_source_key)) return pending.loot_source_key;
	return resolveLootSourceKey({
		id: pending.monster_id,
		name: pending.monster_name,
		area: pending.monster_area,
		variant: pending.monster_variant,
		is_boss: pending.monster_is_boss,
		is_stone: pending.monster_is_stone,
		summoned: pending.monster_summoned
	});
}
 function awardProfileNormalRewards(database, settings, now, pending) {
	return runRewardDelivery(database, `normal:${pending.monster_id}:${pending.spawn_round}`,  () => {
        database=colLabRewardDatabase(database,pending);
        if(pending.loot_source_key==='adventure.catalog'){database.batch(prepareMonsterXp(database,settings,now,pending.monster_id,pending.spawn_round,pending.xp_reward,null,false,pending));return globalThis.__colAdventure.award(pending);}
		if(eventKind444(pending.monster_id)&&pending.loot_source_key==='event.catalog') {
			database.batch(prepareMonsterXp(database, settings, now, pending.monster_id, pending.spawn_round, pending.xp_reward, null, false, pending));
			return globalThis.__colEventIsland444.award(pending, (item) => {
				const definition = {
					type: "gear",
					family: item.family ?? "generic",
					kind: item.kind,
					rarity: item.rarity
				};
				const uniquePower = item.kind === "weapon" ? settings.unique_weapon_power : settings.unique_armor_power;
				return {
					name: ["unique", "infinite"].includes(item.rarity) ? item.name : resolveLootItemName(definition, item.role),
					power: item.rarity === "infinite" ? dragonService().infinitePower({
						kind: item.kind,
						power: uniquePower
					}) : item.rarity === "unique" ? uniquePower : rollLootPower(definition, settings),
					enchantments: JSON.stringify(rollEnchantments(settings, item.kind))
				};
			});
		}
		if (pending.monster_id === "dragon-world-1") {
			database.batch(prepareMonsterXp(database, settings, now, pending.monster_id, pending.spawn_round, pending.xp_reward, null, false, pending));
			return dragonService().award(pending, (item) => {
				const definition = {
					type: "gear",
					family: item.family ?? "generic",
					kind: item.kind,
					rarity: item.rarity
				};
				const uniquePower = item.kind === "weapon" ? settings.unique_weapon_power : settings.unique_armor_power;
				return {
					name: ["unique", "infinite"].includes(item.rarity) ? item.name : resolveLootItemName(definition, item.role),
					power: item.rarity === "infinite" ? dragonService().infinitePower({
						kind: item.kind,
						power: uniquePower
					}) : item.rarity === "unique" ? uniquePower : rollLootPower(definition, settings),
					enchantments: JSON.stringify(rollEnchantments(settings, item.kind))
				};
			});
		}
		if (pending.monster_area === "afk" || pending.monster_id.includes("-afk-")) {
			const claimToken = crypto.randomUUID();
			const forgeAfkXp491=prepareMonsterXp(database, settings, now, pending.monster_id, pending.spawn_round, pending.xp_reward, null, false, pending);
			const outcome = database.batch([
				...forgeAfkXp491,
				database.prepare(`INSERT OR IGNORE INTO normal_reward_claims(monster_id,spawn_round,player_id,claim_token,awarded_at)
        SELECT mp.monster_id,mp.spawn_round,mp.player_id,?,? FROM monster_participants mp
        JOIN players p ON p.id=mp.player_id WHERE mp.monster_id=? AND mp.spawn_round=?`).bind(claimToken, now, pending.monster_id, pending.spawn_round),
				database.prepare(`UPDATE afk_hunt_state SET
        last_reward_token=CASE WHEN kills_since_essence+1>=next_essence_at THEN ? ELSE '' END,
        kills_since_essence=CASE WHEN kills_since_essence+1>=next_essence_at THEN 0 ELSE kills_since_essence+1 END,
        next_essence_at=CASE WHEN kills_since_essence+1>=next_essence_at THEN 4+ABS(RANDOM()%3) ELSE next_essence_at END
        WHERE player_id IN(SELECT player_id FROM normal_reward_claims WHERE claim_token=?)`).bind(claimToken, claimToken),
				database.prepare(`UPDATE players SET essence=essence+2${globalThis.__colPremium ? "+CASE WHEN essence_until>unixepoch()*1000 THEN CAST((essence_bonus_remainder+2)/5 AS INTEGER) ELSE 0 END,essence_bonus_remainder=CASE WHEN essence_until>unixepoch()*1000 THEN (essence_bonus_remainder+2)%5 ELSE essence_bonus_remainder END" : ""} WHERE id IN
        (SELECT player_id FROM afk_hunt_state WHERE last_reward_token=?)`).bind(claimToken),
				database.prepare(`UPDATE normal_defeats SET rewards_completed_at=MAX(1,?) WHERE monster_id=? AND spawn_round=?
        AND rewards_completed_at=0 AND NOT EXISTS(SELECT 1 FROM monster_participants mp
          LEFT JOIN normal_reward_claims claim ON claim.monster_id=mp.monster_id AND claim.spawn_round=mp.spawn_round AND claim.player_id=mp.player_id
          WHERE mp.monster_id=normal_defeats.monster_id AND mp.spawn_round=normal_defeats.spawn_round AND claim.player_id IS NULL)`).bind(now, pending.monster_id, pending.spawn_round)
			]);
			return {
				monsterId: pending.monster_id,
				spawnRound: pending.spawn_round,
				claimToken,
				awarded: Number(outcome[forgeAfkXp491.length]?.meta?.changes ?? 0) > 0,
				groundDrops: 0
			};
		}
		const sourceKey = normalPendingSourceKey(pending);
		if (!sourceKey) return null;
		const claimToken = crypto.randomUUID();
		const frozenBoss = isFrozenBossId(pending.monster_id)||eventKind444(pending.monster_id)==='frozen';
		const ancientBoss = pending.monster_id === "ancient-boss-1"||eventKind444(pending.monster_id)==='ancient';
		const frozenWater = isFrozenWaterId(pending.monster_id)||eventKind444(pending.monster_id)==='water';
		const gemReward = Math.max(0, Math.floor(isBlackStoneBoss476(pending.monster_id) ? settings.black_stone_boss_reward_gems : frozenBoss ? settings.frozen_boss_reward_gems : ancientBoss ? settings.ancient_boss_reward_gems : frozenWater ? settings.frozen_water_reward_gems : 0));
		const profile = profileFromDefeat(pending, sourceKey, settings);
		const participants = (database.prepare(`SELECT mp.player_id, p.role, p.level, p.drop_charm_until
     FROM monster_participants mp JOIN players p ON p.id = mp.player_id
     WHERE mp.monster_id = ? AND mp.spawn_round = ?
     ORDER BY mp.created_at, mp.player_id`).bind(pending.monster_id, pending.spawn_round).all()).results;
		const drops = prepareProfileDrops(profile, participants, pending.monster_id, pending, settings, now, pending.events_snapshot, pending.pearls_retired === 1);
		const xpStatements488=prepareMonsterXp(database, settings, now, pending.monster_id, pending.spawn_round, pending.xp_reward, null, false, pending);
		const rewardBatch = database.batch([
			...xpStatements488,
			database.prepare(`INSERT OR IGNORE INTO normal_reward_claims
         (monster_id, spawn_round, player_id, claim_token, awarded_at)
       SELECT mp.monster_id, mp.spawn_round, mp.player_id, ?, ?
       FROM monster_participants mp JOIN players p ON p.id = mp.player_id
       WHERE mp.monster_id = ? AND mp.spawn_round = ?`).bind(claimToken, now, pending.monster_id, pending.spawn_round),
			(isBlackStoneBoss476(pending.monster_id)?database.prepare(STONE_WINNER_GEMS_SQL476).bind(gemReward,pending.monster_id,pending.spawn_round,claimToken):database.prepare("UPDATE players SET gems=gems+? WHERE id IN (SELECT player_id FROM normal_reward_claims WHERE claim_token=?)").bind(gemReward, claimToken)),
			...profileDropInsertStatements(database, drops, {
				kind: "normal",
				monsterId: pending.monster_id,
				spawnRound: pending.spawn_round,
				claimToken
			}),
			...env.CORE_RUNTIME === "vds" ? [database.prepare(`UPDATE normal_defeats SET rewards_completed_at = MAX(1, ?)
       WHERE monster_id = ? AND spawn_round = ? AND rewards_completed_at = 0
         AND NOT EXISTS (
           SELECT 1 FROM monster_participants mp JOIN players p ON p.id = mp.player_id
           LEFT JOIN normal_reward_claims claim ON claim.monster_id = mp.monster_id
             AND claim.spawn_round = mp.spawn_round AND claim.player_id = mp.player_id
           WHERE mp.monster_id = normal_defeats.monster_id
             AND mp.spawn_round = normal_defeats.spawn_round AND claim.player_id IS NULL
         )`).bind(now, pending.monster_id, pending.spawn_round)] : []
		]);
		const awarded = Number(rewardBatch[xpStatements488.length]?.meta?.changes ?? 0) > 0;
		if (awarded && !colLabIsMonster(pending.monster_id)) for (const drop of drops.filter((row) => row[5] === "purple")) try {
			const owner = database.prepare("SELECT id, name FROM players WHERE id = ?").bind(drop[1]).first();
			if (owner) announceRareDrop(database, owner, drop[4] ?? "Mor Kök ekipmanı", drop[0], "purple", now);
		} catch (error) {
			console.warn("Mor ekipman duyurusu ertelendi; ganimet teslimi korundu.", error);
		}
		return {
			monsterId: pending.monster_id,
			spawnRound: pending.spawn_round,
			claimToken,
			awarded,
			groundDrops: drops.length
		};
	});
}
 function awardPendingNormalRewards(database, settings, now, preferred, requiredParticipantId) {
	const preferredClause = preferred ? "AND defeat.monster_id = ? AND defeat.spawn_round = ?" : "";
	const playerClause = requiredParticipantId ? "AND mp.player_id = ?" : "";
	const pendingClause = env.CORE_RUNTIME === "vds" ? "AND defeat.rewards_completed_at = 0" : "";
	const pendingStatement = database.prepare(`SELECT defeat.monster_id, defeat.spawn_round, defeat.x, defeat.y, defeat.xp_reward,
       defeat.essence_min, defeat.essence_span,
       defeat.events_snapshot, defeat.loot_source_key, defeat.loot_profile_revision, defeat.loot_profile_json,
       ${env.CORE_RUNTIME === "vds" ? "defeat.pearls_retired" : "0 AS pearls_retired"},
       monster.name AS monster_name, monster.area AS monster_area, monster.variant AS monster_variant,
       monster.is_boss AS monster_is_boss, monster.is_stone AS monster_is_stone, monster.summoned AS monster_summoned
     FROM normal_defeats defeat
     JOIN monster_participants mp ON mp.monster_id = defeat.monster_id AND mp.spawn_round = defeat.spawn_round
     JOIN players p ON p.id = mp.player_id
     LEFT JOIN monsters monster ON monster.id = defeat.monster_id
     LEFT JOIN normal_reward_claims claim
       ON claim.monster_id = mp.monster_id AND claim.spawn_round = mp.spawn_round AND claim.player_id = mp.player_id
     WHERE claim.player_id IS NULL ${preferredClause} ${playerClause} ${pendingClause}
     ORDER BY defeat.defeated_at, defeat.monster_id LIMIT 1`);
	const pending = preferred && requiredParticipantId ? pendingStatement.bind(preferred.id, preferred.spawn_round, requiredParticipantId).first() : preferred ? pendingStatement.bind(preferred.id, preferred.spawn_round).first() : requiredParticipantId ? pendingStatement.bind(requiredParticipantId).first() : pendingStatement.first();
	if (!pending) return null;
	return awardProfileNormalRewards(database, settings, now, pending);
}
function canFishAt(position) {
	const normalized = ((position.x - FISHING_LAKE.x) / FISHING_LAKE.radiusX) ** 2 + ((position.y - FISHING_LAKE.y) / FISHING_LAKE.radiusY) ** 2;
	return normalized >= .94 && normalized <= 1.78;
}
function rollFish(settings,random=Math.random){
 const chances=readFishingCatch482(settings.events_json),labels={pearl:'Beyaz İnci',red_pearl:'Kırmızı İnci',talisman:'Tılsım Taşı',sokan:'Sokan Balığı',levrek:'Levrek',zargana:'Zargana'};
 // Integer hundredths avoid a second draw and keep each boundary exclusive.
 let roll=Math.min(9999,Math.max(0,Math.floor(random()*10000))),kind='sokan';
 for(const key of ['pearl','red_pearl','talisman','sokan','levrek','zargana']){const weight=Math.round(chances[key]*100);if(roll<weight){kind=key;break;}roll-=weight;}
 return {kind,label:labels[kind],weight:chances[kind],difficulty:kind==='zargana'?'zor':kind==='levrek'?'orta':'kolay',earliestMs:kind==='zargana'?6500:kind==='levrek'?5000:3600,expiresMs:kind==='zargana'?29000:kind==='levrek'?25000:22000};
}
const TEAM_MODES="('2v2','3v3','5v5')";
function arenaRoundReady498(team) {
  if (team !== 1 && team !== 2) throw Error('arena_round_team498');
  return `(id LIKE 'guild-%' OR mode NOT IN ${TEAM_MODES} OR (
    (SELECT COUNT(*) FROM arena_match_players opposing WHERE opposing.match_id=arena_matches.id AND opposing.team=${3-team})=team_size
    AND NOT EXISTS(SELECT 1 FROM arena_match_players opposing LEFT JOIN players survivor ON survivor.id=opposing.player_id
      WHERE opposing.match_id=arena_matches.id AND opposing.team=${3-team}
      AND (survivor.id IS NULL OR survivor.hp>0 OR survivor.area!='arena' OR survivor.arena_match_id!=arena_matches.id))))`;
}
function selectArenaTeams498(candidates, teamSize) {
  if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 5 || candidates.length !== teamSize*2) return null;
  const groups=new Map();
  for (const row of candidates) {
    const key=row.queue_group498 || ('solo:'+row.player_id);
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(row);
  }
  const blocks=[...groups.values()];
  if (blocks.some(rows=>rows.length>teamSize || rows.some(row=>Number(row.group_size498??1)!==rows.length))) return null;
  const a=[],b=[];
  function fit(index) {
    if(index===blocks.length)return a.length===teamSize&&b.length===teamSize;
    const block=blocks[index];
    for(const side of [a,b])if(side.length+block.length<=teamSize){side.push(...block);if(fit(index+1))return true;side.splice(side.length-block.length,block.length);}
    return false;
  }
  return fit(0)?[...a,...b]:null;
}
 function queueArenaGroup498(database, {playerId, mode, teamName, channel, nowMs, roomId, requestedRoom, teamSize, capacity}) {
  // Party reads guide the UI error; INSERT revalidates the entire membership and
  // every eligibility condition under the ordinary authoritative writer commit.
  const membership=teamSize>1?database.prepare(`SELECT party.id,party.leader_id FROM party_members member JOIN parties party ON party.id=member.party_id WHERE member.player_id=?`).bind(playerId).first():null;
  const members=membership?(database.prepare(`SELECT player_id FROM party_members WHERE party_id=? ORDER BY joined_at,player_id`).bind(membership.id).all()).results:[];
  const grouped=members.length>1;
  if(grouped&&membership.leader_id!==playerId)return {error:'Arena sırasına grubu yalnızca grup lideri alabilir.'};
  if(grouped&&members.length!==teamSize)return {error:`${mode} için grubunda tam ${teamSize} oyuncu olmalı. Tek başına da sıraya girebilirsin.`};
  const ids=grouped?members.map(row=>row.player_id):[playerId];
  const partyId=grouped?membership.id:'';
  const queueGroup=crypto.randomUUID();
  const results=database.batch([
    database.prepare('DELETE FROM arena_queue WHERE last_seen_ms < ?').bind(nowMs-45000),
    database.prepare(`INSERT INTO arena_queue(player_id,mode,team_name,channel,queued_at_ms,last_seen_ms,room_id,queue_group498,group_size498,party_id498,creator_id498)
      WITH roster AS (SELECT value AS player_id FROM json_each(?)),
      eligible AS (SELECT p.id FROM roster JOIN players p ON p.id=roster.player_id
        WHERE p.hp>0 AND p.level>=10 AND p.arena_match_id='' AND p.area!='arena' AND p.channel=? AND p.loadlab_run_id=''
          AND p.last_seen>=? AND p.combat_lock_until_ms<=?
          AND NOT EXISTS(SELECT 1 FROM arena_queue existing WHERE existing.player_id=p.id)
          AND NOT EXISTS(SELECT 1 FROM pve_engagements engagement WHERE engagement.player_id=p.id)
          AND (SELECT COUNT(*) FROM arena_match_players ap JOIN arena_matches am ON am.id=ap.match_id
            WHERE ap.player_id=p.id AND ap.joined_at_ms>=CAST((?+10800000)/86400000 AS INTEGER)*86400000-10800000
              AND am.id NOT LIKE 'guild-%' AND am.mode=?)<CASE ? WHEN '1v1' THEN 5 WHEN '2v2' THEN 3 WHEN '3v3' THEN 2 WHEN '5v5' THEN 1 ELSE 0 END)
      SELECT roster.player_id,?,?,?,?,?,?,?,?,?,CASE WHEN ?='' THEN ? ELSE
        (SELECT creator_id498 FROM arena_queue WHERE room_id=? AND mode=? AND channel=? LIMIT 1) END
      FROM roster
      WHERE (SELECT COUNT(*) FROM eligible)=?
        AND (?=1 OR ?!='' OR NOT EXISTS(SELECT 1 FROM party_members mine JOIN party_members peer ON peer.party_id=mine.party_id AND peer.player_id!=mine.player_id WHERE mine.player_id=?))
        AND (?='' OR (EXISTS(SELECT 1 FROM parties WHERE id=? AND leader_id=?)
          AND (SELECT COUNT(*) FROM party_members WHERE party_id=?)=?
          AND NOT EXISTS(SELECT 1 FROM roster WHERE NOT EXISTS(SELECT 1 FROM party_members pm WHERE pm.party_id=? AND pm.player_id=roster.player_id))))
        AND (?='' OR EXISTS(SELECT 1 FROM arena_queue host JOIN players owner ON owner.id=host.player_id
          WHERE host.room_id=? AND host.mode=? AND host.channel=? AND host.player_id=host.creator_id498
            AND host.last_seen_ms>=? AND owner.last_seen>=? AND owner.channel=host.channel AND owner.area!='arena'))
        AND (?!='1v1' OR NOT EXISTS(SELECT 1 FROM roster joining JOIN party_members mine ON mine.player_id=joining.player_id JOIN party_members peer ON peer.party_id=mine.party_id JOIN arena_queue opponent ON opponent.player_id=peer.player_id WHERE opponent.room_id=?))
        AND (SELECT COUNT(*) FROM arena_queue WHERE room_id=?)+?<=?
      RETURNING player_id`).bind(JSON.stringify(ids),channel,Math.floor(nowMs/1000)-30,nowMs,nowMs,mode,mode,
        mode,teamName,channel,nowMs,nowMs,roomId,queueGroup,ids.length,partyId,requestedRoom,playerId,roomId,mode,channel,
        ids.length,teamSize,partyId,playerId,partyId,partyId,playerId,partyId,ids.length,partyId,requestedRoom,roomId,mode,channel,nowMs-45000,Math.floor(nowMs/1000)-30,
        mode,roomId,roomId,ids.length,capacity)
  ]);
  return results[1].results.length===ids.length?{ok:true,playerIds:ids}:{error:'Oda dolmuş veya kapanmış olabilir. Gruptaki herkes aynı kanalda, çevrimiçi, savaştan çıkmış ve Arena hakkı açık olmalı.'};
}
 function acceptArenaSafeParty498(database,{playerId,senderId,partyId,now,senderMembership}) {
  const available=`NOT EXISTS(SELECT 1 FROM party_members WHERE player_id=?) AND NOT EXISTS(SELECT 1 FROM players arena_member WHERE arena_member.area='arena' AND arena_member.arena_match_id!=''
    AND (arena_member.id IN (?,?) OR arena_member.id IN (SELECT player_id FROM party_members WHERE party_id=?)))`;
  const args=[playerId,playerId,senderId,partyId];
  return database.batch([
    ...!senderMembership?[
      database.prepare(`INSERT INTO parties(id,leader_id,created_at) SELECT ?,?,? WHERE ${available} AND NOT EXISTS(SELECT 1 FROM party_members WHERE player_id=?)`).bind(partyId,senderId,now,...args,senderId),
      database.prepare(`INSERT INTO party_members(player_id,party_id,joined_at) SELECT ?,?,? WHERE ${available} AND EXISTS(SELECT 1 FROM parties WHERE id=? AND leader_id=?) AND NOT EXISTS(SELECT 1 FROM party_members WHERE player_id=?)`).bind(senderId,partyId,now,...args,partyId,senderId,senderId)
    ]:[],
    database.prepare(`INSERT INTO party_members(player_id,party_id,joined_at) SELECT ?,?,? WHERE ${available}
      AND (SELECT COUNT(*) FROM party_members WHERE party_id=?)<5
      AND EXISTS(SELECT 1 FROM party_members WHERE party_id=? AND player_id=?)
      AND NOT EXISTS(SELECT 1 FROM party_members WHERE player_id=?) RETURNING player_id`).bind(playerId,partyId,now,...args,partyId,partyId,senderId,playerId),
    database.prepare('DELETE FROM party_invites WHERE recipient_id=? AND changes()>0').bind(playerId)
  ]);
}
 function tryCreateArenaMatch(database, mode, channel, settings, worldCycle, nowMs, roomId) {
	const rule = ARENA_RULES[mode];
	const candidates = (database.prepare(`SELECT q.player_id, q.team_name, q.queue_group498, q.group_size498, q.party_id498, p.name, p.area
     FROM arena_queue q JOIN players p ON p.id = q.player_id
     WHERE q.mode = ? AND q.channel = ? AND q.last_seen_ms >= ? AND q.room_id = ?
       AND p.channel = q.channel AND p.area != 'arena'
       AND p.hp > 0 AND p.level >= 10 AND p.arena_match_id = '' AND p.combat_lock_until_ms <= ?
       AND NOT EXISTS (SELECT 1 FROM pve_engagements engagement WHERE engagement.player_id = p.id)
       AND (SELECT COUNT(*) FROM arena_match_players ap JOIN arena_matches am ON am.id=ap.match_id WHERE ap.player_id=p.id AND ap.joined_at_ms>=CAST((${nowMs}+10800000)/86400000 AS INTEGER)*86400000-10800000 AND am.id NOT LIKE 'guild-%' AND am.mode=q.mode) < CASE q.mode WHEN '1v1' THEN 5 WHEN '2v2' THEN 3 WHEN '3v3' THEN 2 WHEN '5v5' THEN 1 ELSE 0 END
 AND p.last_seen >= ?
     ORDER BY q.queued_at_ms, q.player_id LIMIT ?`).bind(mode, channel, nowMs - ARENA_QUEUE_TTL_MS, roomId, nowMs, Math.floor(nowMs / 1e3) - 30, rule.totalPlayers).all()).results;
	if (candidates.length < rule.totalPlayers) return null;
	const selected = selectArenaTeams498(candidates, rule.teamSize);
	if (!selected) return null;
	const selectedIds = selected.map((entry) => entry.player_id);
	const placeholders = selectedIds.map(() => "?").join(",");
	const matchId = crypto.randomUUID();
	const startsAtMs = nowMs + ARENA_COUNTDOWN_MS;
	const rawTeamAName = selected[0]?.team_name || "Takım A";
	const rawTeamBName = selected[rule.teamSize]?.team_name || "Takım B";
	const teamAName = rawTeamAName;
	const teamBName = rawTeamAName.localeCompare(rawTeamBName, "tr", { sensitivity: "accent" }) === 0 ? `${rawTeamBName.slice(0, 18)} Rakip` : rawTeamBName;
	const rewardGems = mode === "5v5" ? settings.arena_5v5_reward_gems : mode === "3v3" ? settings.arena_3v3_reward_gems : mode === "2v2" ? settings.arena_2v2_reward_gems : settings.arena_1v1_reward_gems;
	const writes = [
		database.prepare(`INSERT INTO arena_matches
        (id, world_cycle, channel, mode, status, team_size, kill_target, team_a_name, team_b_name,
         reward_gems, starts_at_ms, created_at_ms, updated_at_ms)
       SELECT ?, ?, ?, ?, 'countdown', ?, ?, ?, ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM arena_queue q JOIN players p ON p.id = q.player_id
              WHERE q.player_id IN (${placeholders}) AND q.mode = ? AND q.channel = ? AND q.room_id = ?
                AND q.last_seen_ms >= ? AND p.channel = q.channel AND p.area != 'arena'
                AND (q.queue_group498='' OR (SELECT COUNT(*) FROM arena_queue complete WHERE complete.queue_group498=q.queue_group498 AND complete.room_id=q.room_id AND complete.player_id IN (${placeholders}))=q.group_size498)
                AND (q.party_id498='' OR ((SELECT COUNT(*) FROM party_members pm WHERE pm.party_id=q.party_id498)=q.group_size498 AND EXISTS(SELECT 1 FROM party_members pm WHERE pm.party_id=q.party_id498 AND pm.player_id=p.id)))
                AND (q.mode='1v1' OR q.party_id498!='' OR NOT EXISTS(SELECT 1 FROM party_members mine JOIN party_members peer ON peer.party_id=mine.party_id AND peer.player_id!=mine.player_id WHERE mine.player_id=p.id))
                AND EXISTS(SELECT 1 FROM json_each(?) expected498 WHERE json_extract(expected498.value,'$.player_id')=q.player_id AND json_extract(expected498.value,'$.queue_group498')=q.queue_group498 AND json_extract(expected498.value,'$.group_size498')=q.group_size498 AND json_extract(expected498.value,'$.party_id498')=q.party_id498)
                AND p.hp > 0 AND p.level >= 10 AND p.arena_match_id = '' AND p.combat_lock_until_ms <= ?
                AND NOT EXISTS (SELECT 1 FROM pve_engagements engagement WHERE engagement.player_id = p.id)
                AND (SELECT COUNT(*) FROM arena_match_players ap JOIN arena_matches am ON am.id=ap.match_id WHERE ap.player_id=p.id AND ap.joined_at_ms>=CAST((${nowMs}+10800000)/86400000 AS INTEGER)*86400000-10800000 AND am.id NOT LIKE 'guild-%' AND am.mode=q.mode) < CASE q.mode WHEN '1v1' THEN 5 WHEN '2v2' THEN 3 WHEN '3v3' THEN 2 WHEN '5v5' THEN 1 ELSE 0 END
 AND p.last_seen >= ?) = ?
       AND NOT EXISTS(SELECT 1 FROM json_each(?) side_a JOIN json_each(?) side_b ON CAST(side_a.key AS INTEGER)<${rule.teamSize} AND CAST(side_b.key AS INTEGER)>=${rule.teamSize} JOIN party_members ally_a ON ally_a.player_id=side_a.value JOIN party_members ally_b ON ally_b.party_id=ally_a.party_id AND ally_b.player_id=side_b.value)
       RETURNING id`).bind(matchId, worldCycle, channel, mode, rule.teamSize, rule.killTarget, teamAName, teamBName, rewardGems, startsAtMs, nowMs, nowMs, ...selectedIds, mode, channel, roomId, nowMs - ARENA_QUEUE_TTL_MS, ...selectedIds, JSON.stringify(selected.map(({player_id,queue_group498,group_size498,party_id498})=>({player_id,queue_group498,group_size498,party_id498}))), nowMs, Math.floor(nowMs / 1e3) - 30, rule.totalPlayers, JSON.stringify(selectedIds), JSON.stringify(selectedIds)),
		...selected.map((entry, index) => {
			const team = index < rule.teamSize ? 1 : 2;
			const slot = index % rule.teamSize;
			return database.prepare(`INSERT INTO arena_match_players (id, match_id, player_id, team, slot, joined_at_ms)
         SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM arena_matches WHERE id = ?)
         ON CONFLICT(match_id, player_id) DO NOTHING`).bind(`${matchId}:${entry.player_id}`, matchId, entry.player_id, team, slot, nowMs, matchId);
		}),
		...selected.map((entry, index) => {
			const spawn = arenaSpawn(index < rule.teamSize ? 1 : 2, index % rule.teamSize, rule.teamSize);
			return database.prepare(`UPDATE players SET area = 'arena', arena_match_id = ?, x = ?, y = ?, hp = max_hp,
          hp_revision = hp_revision + 1, respawn_at_ms = 0,
          attack_one_at = 0, attack_two_at = 0, attack_three_at = 0, attack_four_at=0, special_guard_until_ms=0,
          movement_checked_at_ms = CAST(strftime('%s','now') AS INTEGER) * 1000,
          movement_debt_ms = 0, motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1,
          realtime_scope_version = realtime_scope_version + 1, combat_lock_until_ms = 0
         WHERE id = ? AND arena_match_id = '' AND EXISTS (SELECT 1 FROM arena_matches WHERE id = ?)`).bind(matchId, spawn.x, spawn.y, entry.player_id, matchId);
		}),
		database.prepare(`DELETE FROM pve_engagements
       WHERE player_id IN (SELECT id FROM players WHERE arena_match_id = ?)
         AND EXISTS (SELECT 1 FROM arena_matches WHERE id = ?)`).bind(matchId, matchId),
		database.prepare(`DELETE FROM fishing_sessions WHERE player_id IN (${placeholders}) AND EXISTS (SELECT 1 FROM arena_matches WHERE id = ?)`).bind(...selectedIds, matchId),
		database.prepare(`DELETE FROM arena_queue WHERE player_id IN (${placeholders}) AND EXISTS (SELECT 1 FROM arena_matches WHERE id = ?)`).bind(...selectedIds, matchId)
	];
	if (!(database.batch(writes))[0].results[0]) return null;
	const matchFoundEvent = {
		type: "arena_match_found",
		eventId: `arena-found:${matchId}`,
		matchId,
		mode,
		playerIds: selectedIds,
		startsAtMs,
		teamAName,
		teamBName,
		serverAt: nowMs
	};
	Promise.all([...new Set(selected.map((entry) => entry.area))].filter((area) => /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(area)).map((area) => publishRealtimeRoomEvent(worldCycle, channel, area, matchFoundEvent)));
	return {
		matchId,
		startsAtMs,
		selectedIds,
		teamAName,
		teamBName,
		rule,
		rewardGems
	};
}
 function tryFinishArenaForfeit(database, matchId, nowMs) {
	const onlineCutoff = Math.floor((nowMs - ARENA_RECONNECT_GRACE_MS) / 1e3);
	const teamOnlineSql = (team) => `EXISTS (
    SELECT 1 FROM arena_match_players member
    JOIN players online_player ON online_player.id = member.player_id
    WHERE member.match_id = arena_matches.id AND member.team = ${team}
      AND online_player.area = 'arena' AND online_player.arena_match_id = arena_matches.id
      AND online_player.last_seen >= ?
      AND (arena_matches.id LIKE 'guild-%' OR arena_matches.mode NOT IN ('2v2','3v3','5v5') OR online_player.hp>0)
  )`;
	const teamAOnline = teamOnlineSql(1);
	const teamBOnline = teamOnlineSql(2);
	return database.prepare(`UPDATE arena_matches SET
       status = 'finished',
       winner_team = CASE WHEN ${teamAOnline} THEN 1 ELSE 2 END,
       finished_at_ms = ?, updated_at_ms = ?
     WHERE id = ? AND status IN ('countdown','active')
       AND starts_at_ms <= ?
       AND ((${teamAOnline} AND NOT ${teamBOnline})
         OR (${teamBOnline} AND NOT ${teamAOnline}))
     RETURNING *`).bind(onlineCutoff, nowMs, nowMs, matchId, nowMs - ARENA_RECONNECT_GRACE_MS, onlineCutoff, onlineCutoff, onlineCutoff, onlineCutoff).first();
}
 function settleArenaMatch(database, match, nowMs) {
	if (match.id.startsWith("guild-")) return Boolean(database.prepare("SELECT id FROM arena_matches WHERE id=? AND status='finished' AND settlement_token=?").bind(match.id, "guild-settled:" + match.id).first());
	if (match.status !== "finished" || !match.winner_team || match.settlement_token) return false;
	const settlementToken = crypto.randomUUID();
	const winnerName = match.winner_team === 1 ? match.team_a_name : match.team_b_name;
	const message = `${winnerName}, ${ARENA_RULES[match.mode].label} Arena savaşını ${match.team_a_score}-${match.team_b_score} kazandı!`;
	const results = database.batch([
		database.prepare(`UPDATE arena_matches SET settlement_token = ?, updated_at_ms = ?
       WHERE id = ? AND status = 'finished' AND settlement_token = ''
         AND world_cycle = ?
         AND EXISTS (
           SELECT 1 FROM world_state
           WHERE id = 1 AND cycle = ? AND reset_at = 0
         )
       RETURNING id`).bind(settlementToken, nowMs, match.id, match.world_cycle, match.world_cycle),
		database.prepare(`INSERT INTO pvp_reward_cooldowns (player_id, reward_scope, last_awarded_at_ms, claim_token)
       SELECT mp.player_id, 'arena_win', ?, ? || ':' || mp.player_id
       FROM arena_matches m JOIN arena_match_players mp ON mp.match_id = m.id AND mp.team = m.winner_team
       WHERE m.id = ? AND m.settlement_token = ? AND m.reward_gems > 0
         AND (m.team_a_score + m.team_b_score) > 0
       ON CONFLICT(player_id, reward_scope) DO UPDATE SET
         last_awarded_at_ms = excluded.last_awarded_at_ms,
         claim_token = excluded.claim_token
       WHERE pvp_reward_cooldowns.last_awarded_at_ms <= excluded.last_awarded_at_ms - ?
       RETURNING player_id, last_awarded_at_ms`).bind(nowMs, settlementToken, match.id, settlementToken, PVP_REWARD_COOLDOWN_MS),
		database.prepare(`INSERT INTO arena_reward_claims (id, match_id, player_id, gems, settlement_token, awarded_at_ms)
       SELECT m.id || ':' || mp.player_id, m.id, mp.player_id,
         CASE WHEN EXISTS (
           SELECT 1 FROM pvp_reward_cooldowns cooldown
           WHERE cooldown.player_id = mp.player_id AND cooldown.reward_scope = 'arena_win'
             AND cooldown.claim_token = ? || ':' || mp.player_id
         ) THEN m.reward_gems ELSE 0 END,
         ?, ?
       FROM arena_matches m JOIN arena_match_players mp ON mp.match_id = m.id AND mp.team = m.winner_team
       WHERE m.id = ? AND m.settlement_token = ?
       ON CONFLICT(match_id, player_id) DO NOTHING`).bind(settlementToken, settlementToken, nowMs, match.id, settlementToken),
		database.prepare(`UPDATE players SET gems = gems + COALESCE((
         SELECT claim.gems FROM arena_reward_claims claim
         WHERE claim.match_id = ? AND claim.player_id = players.id AND claim.settlement_token = ?
       ), 0)
       WHERE EXISTS (
         SELECT 1 FROM arena_reward_claims claim
         WHERE claim.match_id = ? AND claim.player_id = players.id AND claim.settlement_token = ?
       )
         AND EXISTS (SELECT 1 FROM arena_matches WHERE id = ? AND settlement_token = ?)`).bind(match.id, settlementToken, match.id, settlementToken, match.id, settlementToken),
		database.prepare(`DELETE FROM pve_engagements
       WHERE player_id IN (SELECT id FROM players WHERE arena_match_id = ?)
         AND EXISTS (SELECT 1 FROM arena_matches WHERE id = ? AND settlement_token = ?)`).bind(match.id, match.id, settlementToken),
		database.prepare(`UPDATE players SET area = 'bazaar', arena_match_id = '', x = ?, y = ?,
        hp = max_hp, hp_revision = hp_revision + 1, respawn_at_ms = 0,
        attack_one_at = 0, attack_two_at = 0, attack_three_at = 0, attack_four_at=0, special_guard_until_ms=0,
        movement_checked_at_ms = CAST(strftime('%s','now') AS INTEGER) * 1000,
        movement_debt_ms = 0, motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1,
        realtime_scope_version = realtime_scope_version + 1, combat_lock_until_ms = 0
       WHERE arena_match_id = ? AND EXISTS (SELECT 1 FROM arena_matches WHERE id = ? AND settlement_token = ?)`).bind(BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, match.id, match.id, settlementToken),
		database.prepare(`INSERT INTO arena_announcements (match_id, mode, team_name, message, created_at_ms, expires_at_ms)
       SELECT id, mode, ?, ?, ?, ? FROM arena_matches WHERE id = ? AND settlement_token = ?
       ON CONFLICT(match_id) DO NOTHING`).bind(winnerName, message, nowMs, nowMs + ARENA_ANNOUNCEMENT_MS, match.id, settlementToken)
	]);
	const settled = Boolean(results[0].results[0]);
	if (settled) {
		const rooms = (database.prepare(`SELECT DISTINCT channel, area, arena_match_id FROM players
       WHERE last_seen >= ? AND area IN ('forest','frozen','bazaar','fishing','sanctum','sinsi','war','arena','black','ancient')
       LIMIT 80`).bind(Math.floor(nowMs / 1e3) - 30).all()).results;
		const announcement = {
			match_id: match.id,
			mode: match.mode,
			team_name: winnerName,
			message,
			created_at_ms: nowMs,
			expires_at_ms: nowMs + ARENA_ANNOUNCEMENT_MS
		};
		Promise.all(rooms.map((room) => publishRealtimeRoomEvent(match.world_cycle, room.channel, room.area, {
			type: "arena_announcement",
			eventId: `arena-announcement:${match.id}`,
			announcement,
			serverAt: nowMs
		}, room.area === "arena" ? room.arena_match_id : void 0)));
	}
	return settled;
}
 function colNotifyPvpGemLoss479(player,hit,targetId,hpRevision,nowMs){
 if(!hit||hit.hp>0||!Number.isSafeInteger(hit.pvp_gems_lost479)||hit.pvp_gems_lost479<0)return;
 const loss=hit.pvp_gems_lost479;
 deliverRealtime(publishRealtimePlayerEvent(player.world_cycle,player.channel,player.area,[targetId],{type:'pvp_gem_loss479',eventId:'pvp-gems479:'+targetId+':'+hpRevision,targetId,hpRevision,pvpGemsLost479:loss,message:`PvP'de yenildin. Mücevherlerinin %5'i (${loss} Mücevher) azaldı.`,serverAt:nowMs},player.arena_match_id||void 0));
}
function mixedNative(database){const wallNowSql473="CAST(unixepoch('subsec')*1000 AS INTEGER)";
const failure=code=>Object.assign(new Error(code),{code}); function commitMixedBlack473(database,{player,center,playerPlans,monsterPlans,cooldownAtMs,cooldownMs,nowMs,respawnSeconds}){
 colLabAssertPlans(player,playerPlans.map(p=>p.target),monsterPlans.map(p=>p.target));
 if((!isMistArea(player.area)&&!['black','rune_v2'].includes(player.area))||player.arena_match_id||!['avci','arkanist'].includes(player.role)||!playerPlans.length||!monsterPlans.length)throw failure('mixed_cast_internal_scope');
 if(!['player','monster'].includes(center.kind)||typeof database.combatHit!=='function')throw failure('mixed_cast_internal_plan');
 if(playerPlans.length>29)throw failure('mixed_cast_internal_target_limit');
 if(new Set(playerPlans.map(p=>p.target.id)).size!==playerPlans.length||new Set(monsterPlans.map(p=>p.target.id)).size!==monsterPlans.length)throw failure('mixed_cast_duplicate_target');
 if(!(center.kind==='player'?playerPlans:monsterPlans).some(p=>p.target.id===center.id))throw failure('mixed_cast_primary_missing');
 if(center.kind==='monster'&&!monsterPlans.some(p=>p.target.id===center.id&&p.target.spawn_round===center.spawnRound))throw failure('mixed_cast_primary_round_changed');
 const players=JSON.stringify(playerPlans.map(p=>({id:p.target.id,hp:p.target.hp,revision:p.target.hp_revision,scope:p.target.realtime_scope_version,damage:p.totalDamage})));
 const dragonContribution498=monsterPlans.some(p=>isDragonRankBoss498(p.target.id));const runeV2Contribution483=monsterPlans.some(p=>isRuneV2Boss(p.target.id));const stoneContribution476=dragonContribution498||runeV2Contribution483||monsterPlans.some(p=>isBlackStoneBoss476(p.target.id));
 const monsters=JSON.stringify(monsterPlans.map(p=>({id:p.target.id,hp:p.target.hp,round:p.target.spawn_round,channel:p.target.channel,x:p.target.x,y:p.target.y,root:p.target.root_until_ms||0,controlX:p.target.control_x??null,controlY:p.target.control_y??null,...(stoneContribution476?{stoneDamage476:p.rolled}:{})})));
 // ChannelDatabase flushes the matching memory generation before this guard.
 // Both populations are proved before cooldown or damage becomes durable.
 const guard=database.prepare(`UPDATE players SET attack_three_at=MAX(attack_three_at,?)+?,combat_lock_until_ms=MAX(combat_lock_until_ms,?)
  WHERE id=? AND hp>0 AND stun_until_ms<=? AND attack_three_at<=?
   AND area=? AND channel=? AND arena_match_id='' AND realtime_scope_version=?
   AND COALESCE((SELECT cycle FROM world_state WHERE id=1),1)=?
   AND (?='monster' OR EXISTS(SELECT 1 FROM players primary_target WHERE primary_target.id=? AND primary_target.x=? AND primary_target.y=?
     AND (players.x-primary_target.x)*(players.x-primary_target.x)+(players.y-primary_target.y)*(players.y-primary_target.y)<=?))
   AND (?='player' OR (players.x-?)*(players.x-?)+(players.y-?)*(players.y-?)<=?)
   AND players.x=? AND players.y=?
   AND NOT EXISTS(SELECT 1 FROM json_each(?) expected WHERE NOT EXISTS(SELECT 1 FROM players victim
     WHERE victim.id=json_extract(expected.value,'$.id') AND victim.id!=players.id AND victim.hp=json_extract(expected.value,'$.hp') AND victim.hp>0
      AND victim.hp_revision=json_extract(expected.value,'$.revision') AND victim.realtime_scope_version=json_extract(expected.value,'$.scope')
 AND NOT EXISTS(SELECT 1 FROM party_members party_actor497 JOIN party_members party_peer497 ON party_peer497.party_id=party_actor497.party_id WHERE party_actor497.player_id=players.id AND party_peer497.player_id=victim.id)
      AND victim.loadlab_run_id=players.loadlab_run_id AND (players.loadlab_run_id='' OR (players.loadlab_team>0 AND victim.loadlab_team>0 AND victim.loadlab_team!=players.loadlab_team)) AND victim.area=players.area AND victim.channel=players.channel AND victim.arena_match_id=''
      AND MAX(victim.last_seen,CAST(victim.movement_checked_at_ms/1000 AS INTEGER),CAST(victim.last_monster_hit_at/1000 AS INTEGER))>=?
      AND (victim.x-?)*(victim.x-?)+(victim.y-?)*(victim.y-?)<=90000))
   AND NOT EXISTS(SELECT 1 FROM json_each(?) expected WHERE NOT EXISTS(SELECT 1 FROM monsters victim
     WHERE victim.id=json_extract(expected.value,'$.id') AND victim.hp=json_extract(expected.value,'$.hp') AND victim.hp>0
      AND victim.loadlab_run_id=players.loadlab_run_id AND victim.spawn_round=json_extract(expected.value,'$.round') AND victim.area=players.area
      AND victim.channel=json_extract(expected.value,'$.channel') AND (victim.channel=0 OR victim.channel=players.channel)
      AND victim.x=json_extract(expected.value,'$.x') AND victim.y=json_extract(expected.value,'$.y')
      AND COALESCE(victim.root_until_ms,0)=json_extract(expected.value,'$.root')
      AND victim.control_x IS json_extract(expected.value,'$.controlX') AND victim.control_y IS json_extract(expected.value,'$.controlY')
      AND (victim.root_until_ms<=? OR victim.root_until_ms>${wallNowSql473})))
  RETURNING attack_three_at AS reserved_until`)
  .bind(cooldownAtMs,cooldownMs,nowMs+5000,player.id,nowMs,cooldownAtMs,player.area,player.channel,player.realtime_scope_version,player.world_cycle,
   center.kind,center.id,center.x,center.y,((player.role==='avci'?500:470)+95)**2,
   center.kind,center.rangeX??center.x,center.rangeX??center.x,center.rangeY??center.y,center.rangeY??center.y,((player.role==='avci'?500:470)+(center.rangeLeeway??100))**2,
   player.x,player.y,
   players,Math.floor(nowMs/1000)-30,center.x,center.x,center.y,center.y,monsters,nowMs);
 const hasLethalGems479=playerPlans.some(p=>p.target.hp<=p.totalDamage);
 const hp=database.prepare(`${hasLethalGems479 ? "WITH before_gems479 AS MATERIALIZED (SELECT victim.id,victim.gems AS before_gems FROM json_each(?) prior JOIN players victim ON victim.id=json_extract(prior.value,'$.id') WHERE victim.hp>0 AND victim.hp<=CAST(json_extract(prior.value,'$.damage') AS INTEGER)) " : ""}UPDATE players SET hp=MAX(0,players.hp-CAST(json_extract(hit.value,'$.damage') AS INTEGER)),hp_revision=players.hp_revision+1,
   ${hasLethalGems479 ? "gems=CASE WHEN players.loadlab_run_id='' AND players.area NOT GLOB 'sis_*' AND players.area!='guild_castle' AND players.hp<=CAST(json_extract(hit.value,'$.damage') AS INTEGER) THEN (SELECT before_gems FROM before_gems479 WHERE id=players.id)-CAST((SELECT before_gems FROM before_gems479 WHERE id=players.id)/20 AS INTEGER) ELSE players.gems END," : ""}
   respawn_at_ms=CASE WHEN players.hp-CAST(json_extract(hit.value,'$.damage') AS INTEGER)<=0 THEN ? ELSE 0 END,
   last_monster_hit_at=?,combat_lock_until_ms=MAX(players.combat_lock_until_ms,?) FROM json_each(?) hit
  WHERE players.id=json_extract(hit.value,'$.id') AND players.hp_revision=json_extract(hit.value,'$.revision') AND players.realtime_scope_version=json_extract(hit.value,'$.scope')
   AND EXISTS(SELECT 1 WHERE players.area=? AND players.channel=? AND players.arena_match_id='')
  RETURNING id,hp,hp_revision,respawn_at_ms,gems${hasLethalGems479 ? ",CASE WHEN loadlab_run_id='' AND area NOT GLOB 'sis_*' AND area!='guild_castle' THEN (SELECT before_gems FROM before_gems479 WHERE id=players.id)-gems ELSE NULL END AS pvp_gems_lost479" : ""}`).bind(...(hasLethalGems479?[players]:[]),nowMs+respawnSeconds*1000,nowMs,nowMs+5000,players,player.area,player.channel);
 const events=database.prepare(`INSERT INTO combat_events(player_id,target_id,role,ability,created_at)
  SELECT ?,json_extract(hit.value,'$.id'),?,2,? FROM json_each(?) hit ORDER BY CAST(hit.key AS INTEGER)`)
  .bind(player.id,player.role,nowMs,players);
 const participants=(dragonContribution498?dragonMixedParticipant498(database,player.id,nowMs,monsters):runeV2Contribution483?runeV2MixedParticipant483(database,player.id,nowMs,monsters):stoneContribution476?database.prepare(STONE_MIXED_PARTICIPANT_SQL476).bind(player.id,Math.floor(nowMs/1000),nowMs,monsters):database.prepare(`INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at)
  SELECT victim.id,victim.spawn_round,?,? FROM json_each(?) expected JOIN monsters victim ON victim.id=json_extract(expected.value,'$.id')
  WHERE victim.hp>0 AND victim.spawn_round=json_extract(expected.value,'$.round')
  ON CONFLICT(monster_id,spawn_round,player_id) DO UPDATE SET created_at=excluded.created_at`)
  .bind(player.id,Math.floor(nowMs/1000),monsters));
 // Only guarded lethal rows materialize death/XP/reward SQL. No ordinary
 // monster HP or participant mutation may take the memory ACK fast path here.
 const plans=monsterPlans.map((original,index)=>{
  if(original.target.hp<=original.rolled)original.prepareDurable?.();
  const participantIndex=original.hitStatements.findIndex(s=>/^INSERT INTO monster_participants\b/.test(s.sql));
  if(participantIndex<0||!/^SELECT hp FROM monsters WHERE id=\? AND hp>0 AND spawn_round=\?$/.test(original.hitStatements[original.beforeHealthIndex]?.sql))throw failure('mixed_cast_plan_shape');
  const removed=[participantIndex,original.beforeHealthIndex];
  const shifted=i=>i<0?i:i-removed.filter(r=>r<i).length;
  original.hitStatements=original.hitStatements.filter((_,i)=>!removed.includes(i));
  original.healthResultIndex=shifted(original.healthResultIndex);
  original.xpResultIndex=shifted(original.xpResultIndex);
  // The guard proves exactly this HP before any unique monster write; no
  // duplicate SELECT is needed to compute effective damage after its UPDATE.
  original.beforeHealthIndex=-1;
  const {prepareDurable,...p}=original;
  const extra=index===0?3:0;
  return {...p,hitStatements:extra?[hp,events,participants,...p.hitStatements]:[...p.hitStatements],
   beforeHealthIndex:-1,healthResultIndex:p.healthResultIndex+extra,
   xpResultIndex:p.xpResultIndex<0?p.xpResultIndex:p.xpResultIndex+extra};
 });
 // A monster XP/level trigger may change a participant's HP after the hit.
 // Return the final committed player state, retaining the hit's killed flag.
 plans[plans.length-1].hitStatements.push(database.prepare('SELECT id,hp,hp_revision,respawn_at_ms,gems FROM players WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(playerPlans.map(p=>p.target.id))));
 const count=plans.reduce((n,p)=>n+p.hitStatements.length,0);
 if(count>512)throw failure('mixed_cast_plan_limit'); // known precommit refusal, never truncate targets
 const committed=database.combatHit(guard,plans,{durableCast473:true});
 if(!committed.guard.results.length)return{accepted:false,guard:committed.guard,playerRows:[],monsterResults:new Map(),plans};
 const playerRows=committed.results[0].results,finalPlayerRows=committed.results.at(-1).results,monsterResults=new Map();let offset=0;
 for(let i=0;i<plans.length;i++){
  const p=plans[i],rows=committed.results.slice(offset+(i===0?3:0),offset+p.hitStatements.length);
  monsterResults.set(p.target.id,rows);offset+=p.hitStatements.length;
 }
 return{accepted:true,guard:committed.guard,playerRows,finalPlayerRows,monsterResults,plans:monsterPlans};
}
 function selectMixedMonsters473(player,center473,primaryMonster473,payload,nowMs){
 const all473=(database.prepare('SELECT id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,despawn_at,spawn_round,area,channel,is_stone,wave_stage,summoned,parent_stone_id,root_until_ms,control_x,control_y FROM monsters WHERE hp>0 AND area=? AND (channel=0 OR channel=?)').bind(player.area,player.channel).all()).results;
 const hints473=readAreaSkillHints(payload.areaTargets),provoked473=new Set();
 if(hints473.size){const recent473=database.prepare('SELECT target_id FROM combat_events WHERE created_at>=? AND player_id=?').bind(nowMs-8000,player.id).all();for(const row of recent473.results)if(hints473.has(row.target_id))provoked473.add(row.target_id);}
 return all473.filter(target=>monsterIsInPlayerWorld(target,player)&&distance(center473,areaSkillPoint(target,player,hints473.get(target.id),nowMs,target.id===primaryMonster473?.id,provoked473.has(target.id)))<=300).sort((a,b)=>Number(b.id===primaryMonster473?.id)-Number(a.id===primaryMonster473?.id)||a.id.localeCompare(b.id));
 }
 function prepareMixedPlayers473(player,settings,center472,nowMs,pvpRolls){
  const playerId=player.id,arenaMatchId='',target={id:'',...center472},ability=2,branch456=null;
  const attackerGear=equippedEnchantItems(player);
  let enchantmentTotals473_attackerGear;
  const rows473 = (database.prepare(`SELECT stat_attack,stat_defense,stat_hp,stat_revision,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms, essence, contribution, xp, level, gems, potions, ${setSelectSql()},
          specialization,skill_four,attack_four_at,special_guard_until_ms,jewelry_attack,jewelry_defense,jewelry_cast_speed,jewelry_pvp,${beltBonusSql('strongPlayers','players')} AS belt_pvp_r31,jewelry_resist,jewelry_earring_enchantments,jewelry_bracelet_enchantments,halloween_candy_until,skill_one, skill_two, skill_three, has_rod, rod_equipped, fish_sokan, fish_levrek, fish_zargana, pearls, stone_dust,
          xp_ring_until, drop_charm_until, (SELECT equipped FROM player_items WHERE player_id=players.id AND kind='costume' LIMIT 1) AS costume_equipped, has_wings, wings_equipped, (SELECT equipped FROM dungeon_wings WHERE player_id=players.id) AS core_wings, area, channel, arena_match_id, last_seen,
          combat_lock_until_ms, realtime_scope_version, weapon_skin_enabled,
          COALESCE((SELECT SUM(power) FROM player_items WHERE player_id = players.id AND kind IN ('armor','helmet','shoes','necklace','costume') AND equipped = 1), 0) AS equipped_armor_power,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), '[]') AS equipped_weapon_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'armor' AND equipped = 1 LIMIT 1), '[]') AS equipped_armor_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'helmet' AND equipped = 1 LIMIT 1), '[]') AS equipped_helmet_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'shoes' AND equipped = 1 LIMIT 1), '[]') AS equipped_shoes_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'necklace' AND equipped = 1 LIMIT 1), '[]') AS equipped_necklace_enchantments, EXISTS(SELECT 1 FROM player_pets WHERE player_id=players.id AND kind='dragon' AND acquired_at+604800>unixepoch() AND equipped=1) AS defender_dragon

    FROM players WHERE id != ? AND (players.area='guild_castle' OR NOT EXISTS(SELECT 1 FROM party_members party_actor497 JOIN party_members party_peer497 ON party_peer497.party_id=party_actor497.party_id WHERE party_actor497.player_id=?1 AND party_peer497.player_id=players.id)) AND (players.area!='guild_castle' OR EXISTS(SELECT 1 FROM guild_members castle_actor59 JOIN guild_members castle_peer59 ON castle_actor59.guild_id!=castle_peer59.guild_id WHERE castle_actor59.player_id=?1 AND castle_peer59.player_id=players.id)) AND hp > 0 AND last_seen >= ? AND loadlab_run_id=(SELECT actor.loadlab_run_id FROM players actor WHERE actor.id=?1) AND (loadlab_run_id='' OR (loadlab_team>0 AND loadlab_team!=(SELECT actor.loadlab_team FROM players actor WHERE actor.id=?1)))
      AND area = ? AND channel = ? AND arena_match_id = ?
      AND (x-?)*(x-?)+(y-?)*(y-?) <= 90000
      AND (area != 'war' OR (x-1800)*(x-1800)/202500.0+(y-996)*(y-996)/116964.0>1)
      AND (area != 'arena' OR EXISTS (
        SELECT 1 FROM arena_match_players attacker JOIN arena_match_players defender ON defender.match_id=attacker.match_id
        WHERE attacker.player_id=? AND defender.player_id=players.id AND attacker.match_id=? AND attacker.team!=defender.team))
    ORDER BY CASE WHEN id=? THEN 0 ELSE 1 END, (x-?)*(x-?)+(y-?)*(y-?), id LIMIT 29`)
                                .bind(playerId, Math.floor(nowMs / 1000) - 30, player.area, player.channel, arenaMatchId, center472.x, center472.x, center472.y, center472.y, playerId, arenaMatchId, target.id, center472.x, center472.x, center472.y, center472.y).all()).results;
                            
  if(!rows473.length)return [];
  pvpRolls??={critical:Math.random(),spread:Math.random(),block:Math.random()};
  const areaRows472=rows473;
  const castGuild472 = guildBuff(player.id), castPremium472 = premiumBuff(player.id);
                            const castRanks472 = new Map((rankService()?.project([{ id: playerId }, ...areaRows472.map(p => ({ id: p.id }))], playerId) ?? []).map(p => [p.id, p.rank?.bonuses]));
                            const areaRolls472 = pvpRolls;
                            
  return areaRows472.map((target,index)=>{const pvpRolls={...areaRolls472,block:index===0?areaRolls472.block:Math.random()};
  const defenderGear = equippedEnchantItems(target);
  let enchantmentTotals473_defenderGear;
                                const roleBase = (player.role === "arkanist" ? settings.arcanist_base_attack : player.role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack) + castGuild472.attack + castPremium472.attack + (player.set_attack ?? 0);
                                const weaponPower = player.equipped_weapon_power + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_attack");
                                const armorPower = target.equipped_armor_power + (target.jewelry_defense || 0) + (target.role === 'muhafiz' ? 10 : 0) + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_defense") + (castRanks472.get(target.id)?.defense ?? 0);
                                const skillLevel = [
                                    player.skill_one,
                                    player.skill_two,
                                    player.skill_three, player.skill_four
                                ][ability];
                                const multiplier = [
                                    settings.skill_one_multiplier,
                                    settings.skill_two_multiplier,
                                    settings.skill_three_multiplier, branch456?.multiplier ?? 1
                                ][ability];
                                const criticalChance = clamp$1(settings.base_critical_chance + (ability === 2 ? settings.third_skill_critical_bonus : 0) + (hasWingBonus(player) ? settings.wing_critical_chance : 0) + ((enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("critical") + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_critical")) / 100, 0, .95);
                                const criticalRoll = pvpRolls.critical;
                                const critical = criticalRoll < criticalChance;
                                const strongPlayers = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("strong_players") + ((player.jewelry_pvp || 0)+(player.belt_pvp_r31||0)) + (player.pet_kind === "dragon" ? 10 : 0) + (castRanks472.get(player.id)?.pvp ?? 0) + (player.set_pvp ?? 0);
                                const defenderDragon = target.defender_dragon;
                                const resistantPlayers = clamp$1((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("resistant_players") + (target.jewelry_resist || 0) + (target.set_resistance ?? 0) + (defenderDragon ? 10 : 0), 0, 90);
                                const defenseKind = player.role === "avci" ? "arrow_defense" : player.role === "arkanist" ? "magic_defense" : "sword_defense";
                                const classDefense = (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))(defenseKind);
                                const spreadRoll = pvpRolls.spread;
                                const baseRaw = Math.max(1, Math.floor(colRuneFactor(player, 'attack') * (roleBase + weaponPower + (hasWingBonus(player) ? settings.wing_attack_bonus : 0) + (player.pet_kind === "dog" ? 0 : player.pet_kind === "dragon" ? 45 : player.pet_kind === "starter" ? 10 : player.pet_kind ? 20 : 0) + spreadRoll * 7) * multiplier * (1 + (skillLevel - 1) * settings.skill_upgrade_damage_per_level) * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
                                const armorReduction = armorDamageReduction((armorPower + (hasWingBonus(target) ? settings.wing_defense_bonus : 0)) * colRuneFactor(target, 'defense'), "pvp");
                                const attackBlocked = attackIsBlocked((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("attack_block") + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_block"), pvpRolls.block);
                                const directDamage = attackBlocked ? 0 : Math.max(1, Math.round(baseRaw * (1 + strongPlayers / 100) * (1 - armorReduction) * (1 - classDefense / 100) * (1 - resistantPlayers / 100) * (target.special_guard_until_ms > nowMs ? 1 - (colSpec456(target.role, target.specialization, settings)?.guard ?? 0) : 1)));
                                const firePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("fire");
                                const icePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("ice");
                                const fireDamage = !attackBlocked && firePercent ? Math.max(1, Math.round(directDamage * firePercent / 100)) : 0;
                                const iceDamage = !attackBlocked && icePercent ? Math.max(1, Math.round(directDamage * icePercent / 100)) : 0;
                                const totalDamage = directDamage + fireDamage + iceDamage;
                                const wouldKill = target.hp <= totalDamage;
                                
  return {target,totalDamage,directDamage,fireDamage,iceDamage,attackBlocked,critical,wouldKill,criticalRoll,spreadRoll,roleBase,weaponPower,multiplier,skillLevel,criticalChance,strongPlayers,armorReduction,classDefense,resistantPlayers,firePercent,icePercent};});
 }
 function runMixedBlack473(context473){
 const {player,settings,center473,monster,targets,playerPlans473,rolls473,nowMs,cooldownAtMs,cooldownMs,intentId,attackPveHit,reject473}=context473;
 const playerId=player.id,attackingPlayer=player,ability=2,branch456=null,now=Math.floor(nowMs/1000);
 const enchantmentTotals=createEnchantmentTotals(equippedEnchantItems(player));
 const premium499=premiumBuff(player.id);
 const roleBase = (player.role === "arkanist" ? settings.arcanist_base_attack : player.role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack) + guildBuff(player.id).attack + premium499.attack + (player.set_attack ?? 0);
                    const skillGrowth = 1 + ([
                        player.skill_one,
                        player.skill_two,
                        player.skill_three, player.skill_four
                    ][ability] - 1) * settings.skill_upgrade_damage_per_level;
                    const multipliers = [
                        settings.skill_one_multiplier,
                        settings.skill_two_multiplier,
                        settings.skill_three_multiplier, branch456?.multiplier ?? 1
                    ];
                    const criticalChance = clamp$1(settings.base_critical_chance + (ability === 2 ? settings.third_skill_critical_bonus : 0) + (hasWingBonus(player) ? settings.wing_critical_chance : 0) + (enchantmentTotals("critical") + enchantmentTotals("stone_critical")) / 100, 0, .95);
                    const critical = rolls473.critical < criticalChance;
                    const wingAttack = (hasWingBonus(player) ? settings.wing_attack_bonus : 0) + (player.pet_kind === "dog" ? 0 : player.pet_kind === "dragon" ? 45 : player.pet_kind === "starter" ? 10 : player.pet_kind ? 20 : 0);
                    const firePercent = enchantmentTotals("fire");
                    const icePercent = enchantmentTotals("ice");
                    const stoneAttackPower = enchantmentTotals("stone_attack");
                    const rankPveBonus = serverRankBonuses(player.id).pve + (player.set_pve ?? 0) + (premium499.monsters ?? 0);
                    const regionMultiplier = (target) => regionalMonsterMultiplier(target.area, enchantmentTotals("forest_power"), enchantmentTotals("frozen_power"), !!target.is_stone) * (target.is_stone ? 1 : 1 + ((player.weapon_skin_enabled === 1 ? 10 : 0) + rankPveBonus + (player.arena_wings_equipped === 1 && (!(player.arena_wings_expires_at_ms>0)||player.arena_wings_expires_at_ms>nowMs) ? 10 : 0)) / 100) * (enchantmentTotals("stone_talisman") > 0 ? 1.02 : 1);
                    const eventConfig = readEventsConfig(settings.events_json);
                    const eventRates = {forge491:forgeDropSnapshot491(settings),cauldron488:cauldronDropSnapshot488(settings,player.area),highLevelBalance487:balanceSnapshot487(settings,player.area),
                        materials: globalThis.__colProgression?.snapshot().materials,
                        loot: eventBonus(eventConfig, "loot", now),
                        xp: eventBonus(eventConfig, "xp", now),
                        essence: eventBonus(eventConfig, "essence", now),
                        chest: eventBonus(eventConfig, "chest", now),
                        moonlight: eventBonus(eventConfig, "moonlight", now), halloween: eventBonus(eventConfig, "halloween", now)
                    };
                    const prepareMonsterHit = (target, targetIndex, rolledHit465 = null, includeRewards465 = true) => {
                        const directDamage = rolledHit465?.directDamage ?? Math.max(1, Math.floor(colRuneFactor(player, 'attack') * (roleBase + player.equipped_weapon_power + stoneAttackPower + wingAttack + Math.random() * 7) * multipliers[ability] * skillGrowth * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
                        const elemental = rolledHit465?.elemental ?? [...firePercent ? [{
                                    kind: "fire",
                                    damage: Math.max(1, Math.round(directDamage * firePercent / 100))
                                }] : [], ...icePercent ? [{
                                    kind: "ice",
                                    damage: Math.max(1, Math.round(directDamage * icePercent / 100))
                                }] : []];
                        const rolled = rolledHit465?.rolled ?? Math.max(1, Math.floor((directDamage + elemental.reduce((sum, entry) => sum + entry.damage, 0)) * regionMultiplier(target)));
                        const respawn = isAdventureArea(target.area)?0:target.area === 'event' ? 0 : now + (target.area === 'rune_v2' ? globalThis.__colRuneV2.monster(target).respawnSeconds : target.area === 'rune' ? globalThis.__colRunes.monster(target).respawnSeconds : target.id === "dragon-world-1" ? dragonService()?.settings().config.interval ?? 10800 : isBlackStoneBoss476(target.id) ? settings.black_stone_boss_respawn_seconds : isFrozenBossId(target.id) ? settings.frozen_boss_respawn_seconds : target.id === "ancient-boss-1" ? settings.ancient_boss_respawn_seconds : isFrozenWaterId(target.id) ? settings.frozen_water_respawn_seconds : target.is_boss ? settings.boss_respawn_seconds : target.is_stone ? settings.sinsi_stone_respawn_seconds : target.summoned ? 2 : target.area === "ancient" ? settings.ancient_monster_respawn_seconds : target.area === "forest" ? colLabNormalRespawnSecondsR10(target, settings.forest_monster_respawn_seconds) : target.area === "frozen" ? settings.frozen_monster_respawn_seconds : target.area === "black" ? settings.black_monster_respawn_seconds : target.area === "afk" ? settings.afk_island_respawn_seconds : 18);
                        const hitStatements = [...targetIndex === 0 ? [database.prepare("INSERT INTO combat_events (player_id, target_id, role, ability, created_at) VALUES (?, ?, ?, ?, ?)").bind(playerId, monster.id, player.role, ability, nowMs)] : [], (isDragonRankBoss498(target.id)?dragonParticipant498(database,playerId,now,rolled,nowMs,target.id,target.spawn_round):isRuneV2Boss(target.id)?runeV2Participant483(database,playerId,now,rolled,nowMs,target.id,target.spawn_round):isBlackStoneBoss476(target.id)?database.prepare(STONE_PARTICIPANT_SQL476).bind(playerId,now,rolled,nowMs,target.id,target.spawn_round):database.prepare(`INSERT INTO monster_participants (monster_id, spawn_round, player_id, created_at)
             SELECT id, spawn_round, ?, ? FROM monsters WHERE id = ? AND hp > 0 AND spawn_round = ?
             ON CONFLICT(monster_id, spawn_round, player_id) DO UPDATE SET created_at = excluded.created_at`).bind(playerId, now, target.id, target.spawn_round))];
                        if (target.is_boss) {
                            hitStatements.push(database.prepare(`INSERT INTO boss_participants (boss_round, player_id, hit_count, total_damage, created_at)
             SELECT spawn_round, ?, 1, MIN(hp, ?), ? FROM monsters
             WHERE id = ? AND is_boss = 1 AND hp > 0 AND spawn_round = ?
             ON CONFLICT(boss_round, player_id) DO UPDATE SET
               hit_count = boss_participants.hit_count + 1,
               total_damage = boss_participants.total_damage + excluded.total_damage`).bind(playerId, rolled, now, target.id, target.spawn_round));
                        }
                        const loadlabRewardStart = hitStatements.length;
                        let xpResultIndex = -1;
                        if (includeRewards465) {
                            const xpReward = target.area === "afk" ? settings.afk_island_xp_reward : bonusAmount(monsterXpReward(target, settings), eventRates.xp);
                            const essenceRoll = normalEssenceRoll(target);
                            const lootSnapshot = defaultLootSnapshot(target, settings);
                            if (target.is_boss) {
                                hitStatements.push(database.prepare(`INSERT OR IGNORE INTO boss_defeats
               (boss_round, defeated_at, x, y, xp_reward, loot_source_key, loot_profile_revision, loot_profile_json, events_snapshot)
             SELECT spawn_round, ?, x, y, ?, ?,
               COALESCE((
                 SELECT version.revision FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), 0),
               COALESCE((
                 SELECT version.profile_json FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), ?), ?
             FROM monsters
             WHERE id = ? AND is_boss = 1 AND hp > 0 AND hp <= ? AND spawn_round = ?`).bind(now, xpReward, lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootProfileJson ?? "", JSON.stringify(eventRates), target.id, rolled, target.spawn_round));
                            }
                            else if (target.is_stone)
                                hitStatements.push(database.prepare(`INSERT OR IGNORE INTO sinsi_defeats
               (monster_id, spawn_round, defeated_at, x, y, xp_reward,
                loot_source_key, loot_profile_revision, loot_profile_json, events_snapshot)
             SELECT id, spawn_round, ?, x, y, ?, ?,
               COALESCE((
                 SELECT version.revision FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), 0),
               COALESCE((
                 SELECT version.profile_json FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), ?), ?
             FROM monsters
             WHERE id = ? AND is_stone = 1 AND hp > 0 AND hp <= ? AND spawn_round = ?`).bind(now, xpReward, lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootProfileJson ?? "", JSON.stringify(eventRates), target.id, rolled, target.spawn_round));
                            else
                                hitStatements.push(database.prepare(`INSERT OR IGNORE INTO normal_defeats
               (monster_id, spawn_round, defeated_at, x, y, xp_reward, essence_min, essence_span,
                loot_source_key, loot_profile_revision, loot_profile_json, events_snapshot)
             SELECT id, spawn_round, ?, x, y, ?, ?, ?, ?,
               COALESCE((
                 SELECT version.revision FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), 0),
               COALESCE((
                 SELECT version.profile_json FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), ?), ?
             FROM monsters
             WHERE id = ? AND is_boss = 0 AND hp > 0 AND hp <= ? AND spawn_round = ?`).bind(now, xpReward, essenceRoll.min, essenceRoll.span, lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootProfileJson ?? "", JSON.stringify(eventRates), target.id, rolled, target.spawn_round));
                            hitStatements.push(...prepareRuneV2Winner483(database,target,rolled,nowMs));const cauldronXpStatements488=prepareMonsterXp(database,settings,now,target.id,target.spawn_round,xpReward,rolled,true,target);const cauldronXpOffset488=hitStatements.length;hitStatements.push(...cauldronXpStatements488);
                            xpResultIndex = cauldronXpOffset488 + 2;
                            hitStatements.push(database.prepare(GUILD_MONSTER_KILL_SQL).bind(playerId, target.id, target.spawn_round, rolled));
                            hitStatements.push(database.prepare(WEAPON_KILL_SQL).bind(player.equipped_weapon_id, playerId, target.id, target.spawn_round, rolled));
                        }
                        colLabTagReward(hitStatements.slice(loadlabRewardStart),target,"inline");
                        const beforeHealthIndex = hitStatements.length;
                        hitStatements.push(database.prepare("SELECT hp FROM monsters WHERE id=? AND hp>0 AND spawn_round=?").bind(target.id, target.spawn_round));
                        hitStatements.push(database.prepare(`UPDATE monsters SET hp = MAX(0, hp - ?), last_damaged_at_ms = ?,
             wave_stage = CASE WHEN is_stone = 0 THEN wave_stage
               WHEN hp - ? <= 0 THEN 3
               WHEN hp - ? <= max_hp / 2 THEN MAX(wave_stage, 2)
               ELSE MAX(wave_stage, 1) END,
             respawn_at = CASE WHEN hp - ? <= 0 THEN ? ELSE respawn_at END,
             despawn_at = CASE WHEN hp - ? <= 0 AND is_boss = 1 THEN 0 ELSE despawn_at END
           WHERE id = ? AND hp > 0 AND spawn_round = ? RETURNING hp, wave_stage`).bind(rolled, nowMs, rolled, rolled, rolled, respawn, rolled, target.id, target.spawn_round));
                        const healthResultIndex = hitStatements.length - 1;
                        if (targets.length === 1) {
                            hitStatements.push(database.prepare(`DELETE FROM pve_engagements WHERE player_id = ? AND monster_id = ? AND spawn_round = ? AND NOT EXISTS (SELECT 1 FROM json_each(pve_engagements.attackers489) multi489 JOIN monsters live489 ON live489.id=multi489.key AND live489.spawn_round=json_extract(multi489.value,'$.spawn_round') WHERE live489.hp>0 AND live489.id<>pve_engagements.monster_id)
             AND EXISTS (SELECT 1 FROM monsters WHERE id = ? AND spawn_round = ? AND hp <= 0)`).bind(playerId, target.id, target.spawn_round, target.id, target.spawn_round));
                            hitStatements.push(...preparePveEngagement(database, attackingPlayer, target, nowMs));
                        }
                        const plan465 = {
                            target,
                            rolled,
                            elemental,
                            hitStatements,
                            xpResultIndex,
                            beforeHealthIndex,
                            healthResultIndex
                        };
                        if (!includeRewards465)
                            plan465.prepareDurable = () => { const complete = prepareMonsterHit(target, targetIndex, { directDamage, elemental, rolled }, true); delete plan465.prepareDurable; Object.assign(plan465, complete); };
                        return plan465;
                    };
                    
 if(center473.kind==='player'){
  const retaliation473=settlePveEngagement(database,playerId,settings,nowMs);
  if(retaliation473){player.hp=retaliation473.hp;player.hp_revision=retaliation473.hp_revision;player.respawn_at_ms=retaliation473.respawn_at_ms;if(retaliation473.dead)return reject473('Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun.',409);}
 }
 const plans473=targets.map((target,index)=>prepareMonsterHit(target,index,null,false));
 let mixed473;
 try{mixed473=commitMixedBlack473(database,{player,center:center473,playerPlans:playerPlans473,monsterPlans:plans473,cooldownAtMs,cooldownMs,nowMs,respawnSeconds:settings.pvp_respawn_seconds});}
 catch(error){if(error?.code==='mixed_cast_plan_limit')return reject473('Bu alan vuruşu çok fazla yaratık sonucu içeriyor; hedefleri ayırarak tekrar dene.',409);throw error;}
 if(!mixed473.accepted)return reject473('Hedef veya yetenek durumu değişti; yeniden dene.',409);
 releasePvpCommit();
 const hpById473=new Map(mixed473.playerRows.map(row=>[row.id,row])),finalHp473=new Map(mixed473.finalPlayerRows.map(row=>[row.id,row]));
 for(const row479 of mixed473.playerRows)colNotifyPvpGemLoss479(player,row479,row479.id,row479.hp_revision,nowMs);
 const pvpHits473=playerPlans473.map(p=>{const hit=hpById473.get(p.target.id),final=finalHp473.get(p.target.id);if(!hit||!final)throw Error('mixed_player_commit_invariant');return {targetId:p.target.id,targetName:p.target.name,damage:p.totalDamage,directDamage:p.directDamage,attackBlocked:p.attackBlocked,hp:final.hp,hpRevision:final.hp_revision,respawnAtMs:final.respawn_at_ms,killed:hit.hp<=0,critical:p.critical,targetGems:final.gems,pvpGemsLost479:hit.pvp_gems_lost479??null,elemental:[...(p.fireDamage?[{kind:'fire',damage:p.fireDamage}]:[]),...(p.iceDamage?[{kind:'ice',damage:p.iceDamage}]:[])]};});
 const hits=[],states=[],progression=[],tasks473=[];let ownXpGain=0;
 let actualDamageDealt=playerPlans473.reduce((sum,p)=>sum+Math.min(p.totalDamage,p.target.hp),0);
 for(const p of plans473){
  const rows=mixed473.monsterResults.get(p.target.id),updated=rows?.[p.healthResultIndex]?.results[0];if(!updated)throw Error('mixed_monster_commit_invariant');
  const nextHp=Number(updated.hp),killed=nextHp<=0;
  actualDamageDealt+=Math.max(0,Number(p.target.hp)-nextHp);
  hits.push({id:p.target.id,damage:p.rolled,hp:nextHp,killed,critical,spawnRound:p.target.spawn_round,elemental:p.elemental});
  states.push({id:p.target.id,spawnRound:p.target.spawn_round,hp:nextHp});
  progression.push(...rows[p.xpResultIndex]?.results??[]);
  if(killed){const before=rows[p.xpResultIndex-2]?.results?.find(row=>row.id===playerId),after=rows[p.xpResultIndex]?.results?.find(row=>row.id===playerId);ownXpGain+=before&&after?Math.max(0,after.xp-before.xp)+Math.max(0,(after.rank_xp??0)-(before.rank_xp??0)):0;}
  if(p.target.is_stone){if(!killed&&Number(updated.wave_stage)>p.target.wave_stage)tasks473.push(()=>spawnSinsiStoneWaves(database,p.target,p.target.wave_stage,Number(updated.wave_stage),settings));if(killed)tasks473.push(()=>tryAwardPendingSinsiStoneRewards(database,settings,now,p.target));}
 }
 if(targets.length>1){const retaliating=targets.find(target=>!target.is_stone&&hits.some(hit=>hit.id===target.id&&!hit.killed));if(retaliating)armPveEngagement(database,attackingPlayer,retaliating,nowMs);else database.prepare('DELETE FROM pve_engagements WHERE player_id=? AND monster_id IN(SELECT value FROM json_each(?)) AND NOT EXISTS (SELECT 1 FROM json_each(pve_engagements.attackers489) multi489 JOIN monsters live489 ON live489.id=multi489.key AND live489.spawn_round=json_extract(multi489.value,\'$.spawn_round\') WHERE live489.hp>0 AND live489.id<>pve_engagements.monster_id)').bind(playerId,JSON.stringify(targets.map(t=>t.id))).run();}
 const lifeSteal=restoreStolenLife(database,playerId,lifeStealAmount(actualDamageDealt,enchantmentTotals('life_steal')));
 const correlation473={primaryTargetType:center473.kind,primaryTargetId:center473.id,...center473.kind==='monster'?{primarySpawnRound:monster.spawn_round}:{}};
 const publishes473=pvpHits473.map((hit,index)=>{const p=playerPlans473[index];return publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'pvp_result',eventId:`pvp:${nowMs}:${playerId}:${hit.targetId}`,intentId,...correlation473,attackerId:playerId,ability,...hit,attackerGems:player.gems,
 __combatAudit:intentId&&!p.attackBlocked?{v:1,intentId,attacker:{id:playerId,hp:player.hp,revision:player.hp_revision,scopeVersion:player.realtime_scope_version},target:{id:p.target.id,hp:p.target.hp,revision:p.target.hp_revision,scopeVersion:p.target.realtime_scope_version},rolls:{critical:p.criticalRoll,spread:p.spreadRoll},rules:{roleBase:p.roleBase,weaponPower:p.weaponPower,wingAttack:hasWingBonus(player)?settings.wing_attack_bonus:0,multiplier:p.multiplier,skillGrowth:1+(p.skillLevel-1)*settings.skill_upgrade_damage_per_level,scale:settings.skill_damage_scale,criticalChance:p.criticalChance,criticalMultiplier:colCriticalMultiplier491(settings.critical_damage_multiplier,player),strongPlayers:p.strongPlayers,armorReduction:p.armorReduction,classDefense:p.classDefense,resistantPlayers:p.resistantPlayers,firePercent:p.firePercent,icePercent:p.icePercent}}:undefined,serverAt:nowMs});});
 const targetChannels473=new Map(targets.map(t=>[t.id,t.channel]));
 for(const channel of (fourChannels?[1,2,3,4]:[1,2,3])){const roomHits=hits.filter(hit=>channel===player.channel||targetChannels473.get(hit.id)===0),roomStates=states.filter(state=>channel===player.channel||targetChannels473.get(state.id)===0);if(roomHits.length)publishes473.push(publishRealtimeRoomEventToChannels(player.world_cycle,[channel],player.area,{type:'monster_result',eventId:`monster:${intentId??crypto.randomUUID()}:${nowMs}:mixed:${channel}`,intentId,...correlation473,attackerId:playerId,targetId:monster.id,ability,hits:roomHits,states:roomStates,serverAt:nowMs},channel===player.channel?channel:undefined));}
 if(lifeSteal)publishes473.push(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'player_state',eventId:crypto.randomUUID(),targetId:playerId,hp:lifeSteal.hp,hpRevision:lifeSteal.hp_revision,maxHp:lifeSteal.max_hp,serverAt:nowMs}));
 deliverRealtime(Promise.all(publishes473));
 if(tasks473.length){const followup=startBackgroundTask(()=>{for(const task of tasks473)task();});if(!scheduleRequestTask(followup,'Mixed monster combat follow-up'))followup;}
 const common473={ok:true,...correlation473,pveHit:attackPveHit,lifeSteal,progression,xp:ownXpGain,groundDrops:0,rewardPending:hits.some(hit=>hit.killed),cooldownRemainingMs:Math.max(0,Number(mixed473.guard.results[0].reserved_until)-Date.now()),tickCount:settings.elemental_tick_count,tickIntervalMs:settings.elemental_tick_interval_ms,message:`${pvpHits473.length} oyuncu ve ${hits.length} yaratığa alan saldırısı.`};
 return Response.json(center473.kind==='player'?{...common473,...pvpHits473[0],hits:pvpHits473,monsterHits:hits,monsterStates:states,attackerGems:player.gems}:{...common473,hits,states,pvpHits:pvpHits473});
}return {selectMixedMonsters473,prepareMixedPlayers473,runMixedBlack473:context=>{ports.beforeMixed?.(context);return runMixedBlack473(context);}};}
function mixedMemory(port){const failure=code=>Object.assign(new Error(code),{code});function commitMixedMemory({player,center,playerPlans,monsterPlans,cooldownAtMs,cooldownMs,nowMs,respawnSeconds}){
 colLabAssertPlans(player,playerPlans.map(p=>p.target),monsterPlans.map(p=>p.target));
 if((!isMistArea(player.area)&&!['black','rune_v2'].includes(player.area))||player.arena_match_id||!['avci','arkanist'].includes(player.role)||!playerPlans.length||!monsterPlans.length)throw failure('mixed_cast_internal_scope');
 if(!['player','monster'].includes(center.kind)||typeof port.commit!=='function')throw failure('mixed_cast_internal_plan');
 if(playerPlans.length>29)throw failure('mixed_cast_internal_target_limit');
 if(new Set(playerPlans.map(p=>p.target.id)).size!==playerPlans.length||new Set(monsterPlans.map(p=>p.target.id)).size!==monsterPlans.length)throw failure('mixed_cast_duplicate_target');
 if(!(center.kind==='player'?playerPlans:monsterPlans).some(p=>p.target.id===center.id))throw failure('mixed_cast_primary_missing');
 if(center.kind==='monster'&&!monsterPlans.some(p=>p.target.id===center.id&&p.target.spawn_round===center.spawnRound))throw failure('mixed_cast_primary_round_changed');
return port.commit({player,center,playerPlans,monsterPlans,cooldownAtMs,cooldownMs,nowMs,respawnSeconds});}
 function selectMixedMonsters473(player,center473,primaryMonster473,payload,nowMs){
 const all473=port.monsters(player);
 const hints473=readAreaSkillHints(payload.areaTargets),provoked473=new Set();
 if(hints473.size){const recent473={results:port.recentAttacks(player.id,nowMs-8000)};for(const row of recent473.results)if(hints473.has(row.target_id))provoked473.add(row.target_id);}
 return all473.filter(target=>monsterIsInPlayerWorld(target,player)&&distance(center473,areaSkillPoint(target,player,hints473.get(target.id),nowMs,target.id===primaryMonster473?.id,provoked473.has(target.id)))<=300).sort((a,b)=>Number(b.id===primaryMonster473?.id)-Number(a.id===primaryMonster473?.id)||a.id.localeCompare(b.id));
 }
 function prepareMixedPlayers473(player,settings,center472,nowMs,pvpRolls){
  const playerId=player.id,arenaMatchId='',target={id:'',...center472},ability=2,branch456=null;
  const attackerGear=equippedEnchantItems(player);
  let enchantmentTotals473_attackerGear;
  const rows473 = port.players(player,center472,nowMs);
                            
  if(!rows473.length)return [];
  pvpRolls??={critical:Math.random(),spread:Math.random(),block:Math.random()};
  const areaRows472=rows473;
  const castGuild472 = guildBuff(player.id), castPremium472 = premiumBuff(player.id);
                            const castRanks472 = new Map((rankService()?.project([{ id: playerId }, ...areaRows472.map(p => ({ id: p.id }))], playerId) ?? []).map(p => [p.id, p.rank?.bonuses]));
                            const areaRolls472 = pvpRolls;
                            
  return areaRows472.map((target,index)=>{const pvpRolls={...areaRolls472,block:index===0?areaRolls472.block:Math.random()};
  const defenderGear = equippedEnchantItems(target);
  let enchantmentTotals473_defenderGear;
                                const roleBase = (player.role === "arkanist" ? settings.arcanist_base_attack : player.role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack) + castGuild472.attack + castPremium472.attack + (player.set_attack ?? 0);
                                const weaponPower = player.equipped_weapon_power + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_attack");
                                const armorPower = target.equipped_armor_power + (target.jewelry_defense || 0) + (target.role === 'muhafiz' ? 10 : 0) + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_defense") + (castRanks472.get(target.id)?.defense ?? 0);
                                const skillLevel = [
                                    player.skill_one,
                                    player.skill_two,
                                    player.skill_three, player.skill_four
                                ][ability];
                                const multiplier = [
                                    settings.skill_one_multiplier,
                                    settings.skill_two_multiplier,
                                    settings.skill_three_multiplier, branch456?.multiplier ?? 1
                                ][ability];
                                const criticalChance = clamp$1(settings.base_critical_chance + (ability === 2 ? settings.third_skill_critical_bonus : 0) + (hasWingBonus(player) ? settings.wing_critical_chance : 0) + ((enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("critical") + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_critical")) / 100, 0, .95);
                                const criticalRoll = pvpRolls.critical;
                                const critical = criticalRoll < criticalChance;
                                const strongPlayers = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("strong_players") + ((player.jewelry_pvp || 0)+(player.belt_pvp_r31||0)) + (player.pet_kind === "dragon" ? 10 : 0) + (castRanks472.get(player.id)?.pvp ?? 0) + (player.set_pvp ?? 0);
                                const defenderDragon = target.defender_dragon;
                                const resistantPlayers = clamp$1((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("resistant_players") + (target.jewelry_resist || 0) + (target.set_resistance ?? 0) + (defenderDragon ? 10 : 0), 0, 90);
                                const defenseKind = player.role === "avci" ? "arrow_defense" : player.role === "arkanist" ? "magic_defense" : "sword_defense";
                                const classDefense = (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))(defenseKind);
                                const spreadRoll = pvpRolls.spread;
                                const baseRaw = Math.max(1, Math.floor(colRuneFactor(player, 'attack') * (roleBase + weaponPower + (hasWingBonus(player) ? settings.wing_attack_bonus : 0) + (player.pet_kind === "dog" ? 0 : player.pet_kind === "dragon" ? 45 : player.pet_kind === "starter" ? 10 : player.pet_kind ? 20 : 0) + spreadRoll * 7) * multiplier * (1 + (skillLevel - 1) * settings.skill_upgrade_damage_per_level) * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
                                const armorReduction = armorDamageReduction((armorPower + (hasWingBonus(target) ? settings.wing_defense_bonus : 0)) * colRuneFactor(target, 'defense'), "pvp");
                                const attackBlocked = attackIsBlocked((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("attack_block") + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_block"), pvpRolls.block);
                                const directDamage = attackBlocked ? 0 : Math.max(1, Math.round(baseRaw * (1 + strongPlayers / 100) * (1 - armorReduction) * (1 - classDefense / 100) * (1 - resistantPlayers / 100) * (target.special_guard_until_ms > nowMs ? 1 - (colSpec456(target.role, target.specialization, settings)?.guard ?? 0) : 1)));
                                const firePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("fire");
                                const icePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("ice");
                                const fireDamage = !attackBlocked && firePercent ? Math.max(1, Math.round(directDamage * firePercent / 100)) : 0;
                                const iceDamage = !attackBlocked && icePercent ? Math.max(1, Math.round(directDamage * icePercent / 100)) : 0;
                                const totalDamage = directDamage + fireDamage + iceDamage;
                                const wouldKill = target.hp <= totalDamage;
                                
  return {target,totalDamage,directDamage,fireDamage,iceDamage,attackBlocked,critical,wouldKill,criticalRoll,spreadRoll,roleBase,weaponPower,multiplier,skillLevel,criticalChance,strongPlayers,armorReduction,classDefense,resistantPlayers,firePercent,icePercent};});
 }
 function runMixedBlack473(context473){
 const {player,settings,center473,monster,targets,playerPlans473,rolls473,nowMs,cooldownAtMs,cooldownMs,intentId,attackPveHit,reject473}=context473;
 const playerId=player.id,attackingPlayer=player,ability=2,branch456=null,now=Math.floor(nowMs/1000);
 const enchantmentTotals=createEnchantmentTotals(equippedEnchantItems(player));
 const premium499=premiumBuff(player.id);
 const roleBase = (player.role === "arkanist" ? settings.arcanist_base_attack : player.role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack) + guildBuff(player.id).attack + premium499.attack + (player.set_attack ?? 0);
                    const skillGrowth = 1 + ([
                        player.skill_one,
                        player.skill_two,
                        player.skill_three, player.skill_four
                    ][ability] - 1) * settings.skill_upgrade_damage_per_level;
                    const multipliers = [
                        settings.skill_one_multiplier,
                        settings.skill_two_multiplier,
                        settings.skill_three_multiplier, branch456?.multiplier ?? 1
                    ];
                    const criticalChance = clamp$1(settings.base_critical_chance + (ability === 2 ? settings.third_skill_critical_bonus : 0) + (hasWingBonus(player) ? settings.wing_critical_chance : 0) + (enchantmentTotals("critical") + enchantmentTotals("stone_critical")) / 100, 0, .95);
                    const critical = rolls473.critical < criticalChance;
                    const wingAttack = (hasWingBonus(player) ? settings.wing_attack_bonus : 0) + (player.pet_kind === "dog" ? 0 : player.pet_kind === "dragon" ? 45 : player.pet_kind === "starter" ? 10 : player.pet_kind ? 20 : 0);
                    const firePercent = enchantmentTotals("fire");
                    const icePercent = enchantmentTotals("ice");
                    const stoneAttackPower = enchantmentTotals("stone_attack");
                    const rankPveBonus = serverRankBonuses(player.id).pve + (player.set_pve ?? 0) + (premium499.monsters ?? 0);
                    const regionMultiplier = (target) => regionalMonsterMultiplier(target.area, enchantmentTotals("forest_power"), enchantmentTotals("frozen_power"), !!target.is_stone) * (target.is_stone ? 1 : 1 + ((player.weapon_skin_enabled === 1 ? 10 : 0) + rankPveBonus + (player.arena_wings_equipped === 1 && (!(player.arena_wings_expires_at_ms>0)||player.arena_wings_expires_at_ms>nowMs) ? 10 : 0)) / 100) * (enchantmentTotals("stone_talisman") > 0 ? 1.02 : 1);
                    const eventConfig = readEventsConfig(settings.events_json);
                    const eventRates = {forge491:forgeDropSnapshot491(settings),cauldron488:cauldronDropSnapshot488(settings,player.area),highLevelBalance487:balanceSnapshot487(settings,player.area),
                        materials: globalThis.__colProgression?.snapshot().materials,
                        loot: eventBonus(eventConfig, "loot", now),
                        xp: eventBonus(eventConfig, "xp", now),
                        essence: eventBonus(eventConfig, "essence", now),
                        chest: eventBonus(eventConfig, "chest", now),
                        moonlight: eventBonus(eventConfig, "moonlight", now), halloween: eventBonus(eventConfig, "halloween", now)
                    };
                    const prepareMonsterHit = (target,targetIndex,rolledHit465=null)=>{
                        const directDamage = rolledHit465?.directDamage ?? Math.max(1, Math.floor(colRuneFactor(player, 'attack') * (roleBase + player.equipped_weapon_power + stoneAttackPower + wingAttack + Math.random() * 7) * multipliers[ability] * skillGrowth * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
                        const elemental = rolledHit465?.elemental ?? [...firePercent ? [{
                                    kind: "fire",
                                    damage: Math.max(1, Math.round(directDamage * firePercent / 100))
                                }] : [], ...icePercent ? [{
                                    kind: "ice",
                                    damage: Math.max(1, Math.round(directDamage * icePercent / 100))
                                }] : []];
                        const rolled = rolledHit465?.rolled ?? Math.max(1, Math.floor((directDamage + elemental.reduce((sum, entry) => sum + entry.damage, 0)) * regionMultiplier(target)));
                        const respawn = isAdventureArea(target.area)?0:target.area === 'event' ? 0 : now + (target.area === 'rune_v2' ? globalThis.__colRuneV2.monster(target).respawnSeconds : target.area === 'rune' ? globalThis.__colRunes.monster(target).respawnSeconds : target.id === "dragon-world-1" ? dragonService()?.settings().config.interval ?? 10800 : isBlackStoneBoss476(target.id) ? settings.black_stone_boss_respawn_seconds : isFrozenBossId(target.id) ? settings.frozen_boss_respawn_seconds : target.id === "ancient-boss-1" ? settings.ancient_boss_respawn_seconds : isFrozenWaterId(target.id) ? settings.frozen_water_respawn_seconds : target.is_boss ? settings.boss_respawn_seconds : target.is_stone ? settings.sinsi_stone_respawn_seconds : target.summoned ? 2 : target.area === "ancient" ? settings.ancient_monster_respawn_seconds : target.area === "forest" ? colLabNormalRespawnSecondsR10(target, settings.forest_monster_respawn_seconds) : target.area === "frozen" ? settings.frozen_monster_respawn_seconds : target.area === "black" ? settings.black_monster_respawn_seconds : target.area === "afk" ? settings.afk_island_respawn_seconds : 18);
                        return port.monsterPlan({target,targetIndex,directDamage,elemental,rolled,respawn,attackingPlayer,monster,ability,nowMs,now,targetsCount:targets.length});};
                    
 if(center473.kind==='player'){
  const retaliation473=port.retaliate(playerId,settings,nowMs);
  if(retaliation473){player.hp=retaliation473.hp;player.hp_revision=retaliation473.hp_revision;player.respawn_at_ms=retaliation473.respawn_at_ms;if(retaliation473.dead)return reject473('Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun.',409);}
 }
 const plans473=targets.map((target,index)=>prepareMonsterHit(target,index,null,false));
 let mixed473;
 try{mixed473=commitMixedMemory({player,center:center473,playerPlans:playerPlans473,monsterPlans:plans473,cooldownAtMs,cooldownMs,nowMs,respawnSeconds:settings.pvp_respawn_seconds});}
 catch(error){if(error?.code==='mixed_cast_plan_limit')return reject473('Bu alan vuruşu çok fazla yaratık sonucu içeriyor; hedefleri ayırarak tekrar dene.',409);throw error;}
 if(!mixed473.accepted)return reject473('Hedef veya yetenek durumu değişti; yeniden dene.',409);
 releasePvpCommit();
 const hpById473=new Map(mixed473.playerRows.map(row=>[row.id,row])),finalHp473=new Map(mixed473.finalPlayerRows.map(row=>[row.id,row]));
 for(const row479 of mixed473.playerRows)port.nonlethalGems(row479);
 const pvpHits473=playerPlans473.map(p=>{const hit=hpById473.get(p.target.id),final=finalHp473.get(p.target.id);if(!hit||!final)throw Error('mixed_player_commit_invariant');return {targetId:p.target.id,targetName:p.target.name,damage:p.totalDamage,directDamage:p.directDamage,attackBlocked:p.attackBlocked,hp:final.hp,hpRevision:final.hp_revision,respawnAtMs:final.respawn_at_ms,killed:hit.hp<=0,critical:p.critical,targetGems:final.gems,pvpGemsLost479:hit.pvp_gems_lost479??null,elemental:[...(p.fireDamage?[{kind:'fire',damage:p.fireDamage}]:[]),...(p.iceDamage?[{kind:'ice',damage:p.iceDamage}]:[])]};});
 const hits=[],states=[],progression=[],tasks473=[];let ownXpGain=0;
 let actualDamageDealt=playerPlans473.reduce((sum,p)=>sum+Math.min(p.totalDamage,p.target.hp),0);
 for(const p of plans473){
  const rows=mixed473.monsterResults.get(p.target.id),updated=rows?.[p.healthResultIndex]?.results[0];if(!updated)throw Error('mixed_monster_commit_invariant');
  const nextHp=Number(updated.hp),killed=nextHp<=0;
  actualDamageDealt+=Math.max(0,Number(p.target.hp)-nextHp);
  hits.push({id:p.target.id,damage:p.rolled,hp:nextHp,killed,critical,spawnRound:p.target.spawn_round,elemental:p.elemental});
  states.push({id:p.target.id,spawnRound:p.target.spawn_round,hp:nextHp});
  progression.push(...rows[p.xpResultIndex]?.results??[]);
  if(killed){const before=rows[p.xpResultIndex-2]?.results?.find(row=>row.id===playerId),after=rows[p.xpResultIndex]?.results?.find(row=>row.id===playerId);ownXpGain+=before&&after?Math.max(0,after.xp-before.xp)+Math.max(0,(after.rank_xp??0)-(before.rank_xp??0)):0;}
  if(p.target.is_stone){if(!killed&&Number(updated.wave_stage)>p.target.wave_stage)tasks473.push(()=>port.requiresWriter(p.target,p.target.wave_stage,Number(updated.wave_stage),settings));if(killed)tasks473.push(()=>port.requiresWriter(settings,now,p.target));}
 }
 if(targets.length>1){const retaliating=targets.find(target=>!target.is_stone&&hits.some(hit=>hit.id===target.id&&!hit.killed));if(retaliating)port.arm(attackingPlayer,retaliating,nowMs);else port.clearDeadEncounter(playerId,targets);}
 const lifeSteal=port.restoreLife(playerId,lifeStealAmount(actualDamageDealt,enchantmentTotals('life_steal')));
 const correlation473={primaryTargetType:center473.kind,primaryTargetId:center473.id,...center473.kind==='monster'?{primarySpawnRound:monster.spawn_round}:{}};
 const publishes473=pvpHits473.map((hit,index)=>{const p=playerPlans473[index];return publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'pvp_result',eventId:`pvp:${nowMs}:${playerId}:${hit.targetId}`,intentId,...correlation473,attackerId:playerId,ability,...hit,attackerGems:player.gems,
 __combatAudit:intentId&&!p.attackBlocked?{v:1,intentId,attacker:{id:playerId,hp:player.hp,revision:player.hp_revision,scopeVersion:player.realtime_scope_version},target:{id:p.target.id,hp:p.target.hp,revision:p.target.hp_revision,scopeVersion:p.target.realtime_scope_version},rolls:{critical:p.criticalRoll,spread:p.spreadRoll},rules:{roleBase:p.roleBase,weaponPower:p.weaponPower,wingAttack:hasWingBonus(player)?settings.wing_attack_bonus:0,multiplier:p.multiplier,skillGrowth:1+(p.skillLevel-1)*settings.skill_upgrade_damage_per_level,scale:settings.skill_damage_scale,criticalChance:p.criticalChance,criticalMultiplier:colCriticalMultiplier491(settings.critical_damage_multiplier,player),strongPlayers:p.strongPlayers,armorReduction:p.armorReduction,classDefense:p.classDefense,resistantPlayers:p.resistantPlayers,firePercent:p.firePercent,icePercent:p.icePercent}}:undefined,serverAt:nowMs});});
 const targetChannels473=new Map(targets.map(t=>[t.id,t.channel]));
 for(const channel of (fourChannels?[1,2,3,4]:[1,2,3])){const roomHits=hits.filter(hit=>channel===player.channel||targetChannels473.get(hit.id)===0),roomStates=states.filter(state=>channel===player.channel||targetChannels473.get(state.id)===0);if(roomHits.length)publishes473.push(publishRealtimeRoomEventToChannels(player.world_cycle,[channel],player.area,{type:'monster_result',eventId:`monster:${intentId??crypto.randomUUID()}:${nowMs}:mixed:${channel}`,intentId,...correlation473,attackerId:playerId,targetId:monster.id,ability,hits:roomHits,states:roomStates,serverAt:nowMs},channel===player.channel?channel:undefined));}
 if(lifeSteal)publishes473.push(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'player_state',eventId:crypto.randomUUID(),targetId:playerId,hp:lifeSteal.hp,hpRevision:lifeSteal.hp_revision,maxHp:lifeSteal.max_hp,serverAt:nowMs}));
 deliverRealtime(publishes473);
 if(tasks473.length){const followup=startBackgroundTask(()=>{for(const task of tasks473)task();});if(!scheduleRequestTask(followup,'Mixed monster combat follow-up'))followup;}
 const common473={ok:true,...correlation473,pveHit:attackPveHit,lifeSteal,progression,xp:ownXpGain,groundDrops:0,rewardPending:hits.some(hit=>hit.killed),cooldownRemainingMs:Math.max(0,Number(mixed473.guard.results[0].reserved_until)-Date.now()),tickCount:settings.elemental_tick_count,tickIntervalMs:settings.elemental_tick_interval_ms,message:`${pvpHits473.length} oyuncu ve ${hits.length} yaratığa alan saldırısı.`};
 return Response.json(center473.kind==='player'?{...common473,...pvpHits473[0],hits:pvpHits473,monsterHits:hits,monsterStates:states,attackerGems:player.gems}:{...common473,hits,states,pvpHits:pvpHits473});
}return {selectMixedMonsters473,prepareMixedPlayers473,runMixedBlack473};}
 function nativeAttack(database,context){const {player,playerId,payload,settings,attackTargetId,preloadedAttackMonster,requestReceivedAtMs,now,auth}=context;const {selectMixedMonsters473,prepareMixedPlayers473,runMixedBlack473}=mixedNative(database);
					const control = database.prepare("SELECT stun_until_ms,root_until_ms FROM players WHERE id=?").bind(playerId).first();
					if (player.role === "muhafiz" && Number(payload.ability) === 2 && Number(control?.root_until_ms) > Date.now()) return Response.json({ error: "Sabitlenmişken hamle yapamazsın." }, { status: 409 });
					if (Number(control?.stun_until_ms) > Date.now()) return Response.json({
						error: "Sersemletildin; kısa süre sonra saldırabilirsin.",
						code: "combat_stunned"
					}, { status: 409 });
					const intentId = typeof payload.intentId === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(payload.intentId) ? payload.intentId : void 0;
					const targetId = typeof payload.targetId === "string" ? payload.targetId : "";
					const requestedSpawnRound = Number(payload.spawnRound);
					const publishMonsterAttackRejection =  () => {
						if (intentId && targetId && Number.isSafeInteger(requestedSpawnRound) && requestedSpawnRound >= 0) publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
							type: "monster_reject",
							eventId: `monster-reject:${intentId}:${Date.now()}`,
							intentId,
							attackerId: playerId,
							targetId,
							spawnRound: requestedSpawnRound,
							serverAt: Date.now()
						});
					};
					let attackPveHit;
					const rejectMonsterAttack =  (error, status) => {
						deliverRealtime(publishMonsterAttackRejection());
						return Response.json({
							pveHit: attackPveHit,
							error
						}, { status });
					};
					if (!isAdventureArea(player.area) && player.area !== "event" && player.area !== "rune_v2" && player.area !== "rune" && player.area !== "ancient" && player.area !== "forest" && player.area !== "frozen" && player.area !== "sanctum" && player.area !== "dragon" && player.area !== "sinsi" && player.area !== "black" && player.area !== "afk") return rejectMonsterAttack("Bu bölgede savaşılmaz.", 400);
					if (player.area === "afk") {
						if (!settings.afk_island_enabled && !player.is_gm) return rejectMonsterAttack("Ada oyunculara henüz açık değil.", 403);
						const hunt = database.prepare("SELECT day,used_ms,bonus_ms,active,tick_at_ms FROM afk_hunt_state WHERE player_id=?").bind(playerId).first();
						if (!hunt?.active || hunt.day !== afkDay(Date.now()) || Date.now() - hunt.tick_at_ms > 15e3 || afkRemaining(hunt, Date.now()) <= 0) return rejectMonsterAttack("Oto av kapalı veya bugünkü süren doldu.", 403);
					}
					if (player.rod_equipped) return rejectMonsterAttack("Savaşmak için çantandan bir silah kuşanmalısın.", 400);
					const pendingRetaliation = settlePveEngagement(database, playerId, settings, Date.now());
					attackPveHit = pendingRetaliation?.pveHit;
					if (pendingRetaliation) {
						player.hp = pendingRetaliation.hp;
						player.hp_revision = pendingRetaliation.hp_revision;
						player.respawn_at_ms = pendingRetaliation.respawn_at_ms;
						if (pendingRetaliation.dead) return rejectMonsterAttack("Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun.", 409);
					}
					timing.mark("pve_retaliation");
					const attackingPlayer = player;
					if (!Number.isSafeInteger(requestedSpawnRound) || requestedSpawnRound < 0) return rejectMonsterAttack("Geçersiz yaratık turu.", 400);
					const monster = targetId === attackTargetId ? preloadedAttackMonster : null;
					if (!monster) return rejectMonsterAttack("Yaratık bulunamadı.", 404);
					if (!monsterIsInPlayerWorld(monster, player)) return rejectMonsterAttack("Bu yaratık başka bir bölgede.", 409);
					const publishCurrentMonsterState =  () => {
						const channels = monster.channel === 0 ? Array.from({ length: fourChannels ? 4 : 3 }, (_, channelIndex) => channelIndex + 1) : [monster.channel];
						publishRealtimeRoomEventToChannels(player.world_cycle, channels, player.area, {
							type: "monster_result",
							eventId: `monster-state:${intentId ?? crypto.randomUUID()}:${monster.id}:${monster.spawn_round}`,
							intentId,
							attackerId: playerId,
							targetId: monster.id,
							ability: clamp$1(Math.floor(Number(payload.ability) || 0), 0, 3),
							hits: [],
							states: [{
								id: monster.id,
								spawnRound: monster.spawn_round,
								hp: Math.max(0, monster.hp)
							}],
							serverAt: Date.now()
						}, player.channel);
					};
					if (monster.hp <= 0) {
						deliverRealtime(publishCurrentMonsterState());
						return Response.json({
							pveHit: attackPveHit,
							ok: true,
							hits: [],
							states: [{
								id: monster.id,
								spawnRound: monster.spawn_round,
								hp: 0
							}],
							xp: 0,
							groundDrops: 0,
							message: "Yaratık yenildi."
						});
					}
					if (monster.spawn_round !== requestedSpawnRound) {
						deliverRealtime(publishCurrentMonsterState());
						return Response.json({
							pveHit: attackPveHit,
							ok: true,
							hits: [],
							states: [{
								id: monster.id,
								spawnRound: monster.spawn_round,
								hp: monster.hp
							}],
							xp: 0,
							groundDrops: 0,
							message: "Yaratığın güncel turu eşitlendi."
						});
					}
					const syncedMonsterPosition = monsterCombatPosition(monster, attackingPlayer);
					const combatMonster = syncedMonsterPosition.supplied ? {
						...monster,
						x: syncedMonsterPosition.x,
						y: syncedMonsterPosition.y
					} : monster;
					const ability = clamp$1(Math.floor(Number(payload.ability) || 0), 0, 3);
					const branch456=ability===3?colSpec456(player.role,player.specialization,settings):null;
 if(ability===3&&(!branch456||['heal','guard'].includes(branch456.effect)||!Number.isInteger(Number(payload.ability))||Number(payload.ability)!==3))return Response.json({error:'Uzmanlık saldırısı açık değil.'},{status:409});
 const unlockLevel=ability===3?30:ability===0?1:ability===1?settings.skill_two_unlock_level:settings.skill_three_unlock_level;
					if (player.level < unlockLevel) return rejectMonsterAttack(`Bu yetenek ${unlockLevel}. seviyede açılır.`, 400);
					const baseRange = player.role === "muhafiz" ? 190 : player.role === "avci" ? 500 : 470;
					const attackRange = player.role === "muhafiz" && (ability===1||ability===2) ? ability === 1 ? 720 : 600 : ability === 2 ? Math.max(baseRange, 285) : baseRange;
					const chaseLeeway = monster.is_boss || isFrozenEliteId(monster.id) ? 125 : 100;
					if (player.role === "muhafiz" && ability > 0 && !isAreaWalkableSegment(player.area, player.x, player.y, combatMonster.x, combatMonster.y)) return rejectMonsterAttack("Hedef ile aranda engel var.", 400);
					if (distance(attackingPlayer, combatMonster) > attackRange + (player.role === "muhafiz" && ability > 0 ? 0 : chaseLeeway)) return rejectMonsterAttack("Yaratık menzil dışında.", 400);
					const nowMs = Date.now();
					const attackColumn=ability===3?"attack_four_at":ability===0?"attack_one_at":ability===1?"attack_two_at":"attack_three_at";
					const enchantmentTotals = createEnchantmentTotals(equippedEnchantItems(player));
					const baseCooldownMs=ability===3?branch456.cooldown:ability===0?650:ability===1?settings.skill_two_cooldown_ms:settings.skill_three_cooldown_ms;
					const cooldownMs = ability === 0 ? effectiveAttackCooldownMs(baseCooldownMs, enchantmentTotals("attack_speed") + (player.set_speed ?? 0)) : effectiveSkillCooldown444(baseCooldownMs, Math.min(50,enchantmentTotals("cast_speed")+(player.jewelry_cast_speed||0)));
					const cooldownGraceMs = ability === 0 ? 220 : 0;
					const cooldownAtMs = requestReceivedAtMs;
if((isMistArea(player.area)||player.area==='black'||player.area==='rune_v2')&&ability===2&&player.role!=='muhafiz'){
  const mixedPoint473=areaSkillPoint(monster,attackingPlayer,readAreaSkillHints(payload.areaTargets).get(monster.id),nowMs,true,false);
  const mixedPlayers473=prepareMixedPlayers473(player,settings,mixedPoint473,nowMs,null);
  if(mixedPlayers473.length){
   if(typeof database.combatHit!=='function')return rejectMonsterAttack('Alan saldırısı için oyun sunucusuna yeniden bağlan.',503);
   const mixedCenter473={kind:'monster',id:monster.id,spawnRound:monster.spawn_round,x:mixedPoint473.x,y:mixedPoint473.y,rangeX:combatMonster.x,rangeY:combatMonster.y,rangeLeeway:chaseLeeway};
   const mixedTargets473=selectMixedMonsters473(player,mixedCenter473,monster,payload,nowMs);
   if(!mixedTargets473.some(row=>row.id===monster.id&&row.spawn_round===monster.spawn_round))return rejectMonsterAttack('Yaratığın turu değişti; hedefi yeniden seç.',409);
   return runMixedBlack473({player,settings,center473:mixedCenter473,monster,targets:mixedTargets473,playerPlans473:mixedPlayers473,rolls473:{critical:mixedPlayers473[0].criticalRoll},nowMs,cooldownAtMs,cooldownMs,intentId,attackPveHit,reject473:rejectMonsterAttack});
  }
 }
					const guardedDatabase = database;
					const memoryCombat = database.combat?.enabled ? database.combatHit.bind(database) : null;
					const nativeGuardedBatch = !memoryCombat && env.CORE_RUNTIME === "vds" && ability === 0 && typeof guardedDatabase.guardedBatch === "function" ? guardedDatabase.guardedBatch.bind(database) : null;
					const cooldownStatement = database.prepare(`UPDATE players SET ${attackColumn} = MAX(${attackColumn}, ?) + ?,
           combat_lock_until_ms = MAX(combat_lock_until_ms, ?)
         WHERE id = ? AND hp > 0 AND stun_until_ms <= ? AND ${attackColumn} <= ?
           AND area = ? AND channel = ? AND arena_match_id = ? AND realtime_scope_version = ?
         RETURNING ${attackColumn} AS reserved_until`).bind(cooldownAtMs, cooldownMs, nowMs + 5e3, playerId, nowMs, cooldownAtMs + cooldownGraceMs, attackingPlayer.area, attackingPlayer.channel, attackingPlayer.arena_match_id, attackingPlayer.realtime_scope_version);
					const cooldownAccepted = nativeGuardedBatch || memoryCombat ? null : cooldownStatement.first();
					if (!nativeGuardedBatch && !memoryCombat && !cooldownAccepted) {
						if (ability === 0) {
							deliverRealtime(publishMonsterAttackRejection());
							return rejectBasicAttackCadence(cooldownMs, attackPveHit);
						}
						return rejectMonsterAttack("Yetenek henüz hazır değil.", 429);
					}
					timing.mark("pve_validation");
					let reservedUntilMs = Number(cooldownAccepted?.reserved_until ?? 0);
					let actualDamageDealt = 0;
					let guardianEffect = null;
					const premium499=premiumBuff(player.id);
 const roleBase = (player.role === "arkanist" ? settings.arcanist_base_attack : player.role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack) + guildBuff(player.id).attack + premium499.attack + (player.set_attack??0);
					const skillGrowth = 1 + ([
						player.skill_one,
						player.skill_two,
						player.skill_three,player.skill_four
					][ability] - 1) * settings.skill_upgrade_damage_per_level;
					const multipliers = [
						settings.skill_one_multiplier,
						settings.skill_two_multiplier,
						settings.skill_three_multiplier,branch456?.multiplier??1
					];
					const criticalChance = clamp$1(settings.base_critical_chance + (ability === 2 ? settings.third_skill_critical_bonus : 0) + (hasWingBonus(player) ? settings.wing_critical_chance : 0) + (enchantmentTotals("critical") + enchantmentTotals("stone_critical")) / 100, 0, .95);
					const critical = Math.random() < criticalChance;
					const wingAttack = (hasWingBonus(player) ? settings.wing_attack_bonus : 0) + (player.pet_kind === "dog" ? 0 : player.pet_kind === "dragon" ? 45 : player.pet_kind === "starter" ? 10 : player.pet_kind ? 20 : 0);
					const firePercent = enchantmentTotals("fire");
					const icePercent = enchantmentTotals("ice");
					const all = ability === 2 && player.role !== "muhafiz" ? (database.prepare("SELECT id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned, parent_stone_id, root_until_ms, control_x, control_y FROM monsters WHERE hp > 0 AND area = ? AND (channel = 0 OR channel = ?)").bind(player.area, player.channel).all()).results : [monster];
					const areaHints = ability === 2 && player.role !== "muhafiz" ? readAreaSkillHints(payload.areaTargets) : /* @__PURE__ */ new Map();
					const recentlyProvoked = /* @__PURE__ */ new Set();
					if (areaHints.size > 0) {
						const attacks = database.prepare("SELECT target_id FROM combat_events WHERE created_at >= ? AND player_id = ?").bind(nowMs - 8e3, playerId).all();
						for (const attack of attacks.results) if (areaHints.has(attack.target_id)) recentlyProvoked.add(attack.target_id);
					}
					const areaPoint = (target) => areaSkillPoint(target, attackingPlayer, areaHints.get(target.id), nowMs, target.id === monster.id, recentlyProvoked.has(target.id));
					const areaCenter = areaPoint(monster);
					const targets = ability === 2 && player.role !== "muhafiz" ? all.filter((candidate) => monsterIsInPlayerWorld(candidate, player) && distance(areaCenter, areaPoint(candidate)) <= 300) : [monster];
					const stoneAttackPower = enchantmentTotals("stone_attack");
					const rankPveBonus = serverRankBonuses(player.id).pve + (player.set_pve ?? 0) + (premium499.monsters ?? 0);
					const regionMultiplier = (target) => regionalMonsterMultiplier(target.area, enchantmentTotals("forest_power"), enchantmentTotals("frozen_power"), !!target.is_stone) * (target.is_stone ? 1 : 1 + ((player.weapon_skin_enabled === 1 ? 10 : 0) + rankPveBonus + (player.arena_wings_equipped===1&&(!(player.arena_wings_expires_at_ms>0)||player.arena_wings_expires_at_ms>nowMs)?10:0)) / 100) * (enchantmentTotals("stone_talisman") > 0 ? 1.02 : 1);
					const minimumDirectDamage = Math.max(1, Math.floor(colRuneFactor(player,'attack')*(roleBase + player.equipped_weapon_power + stoneAttackPower + wingAttack) * multipliers[ability] * skillGrowth * settings.skill_damage_scale));
					const minimumPreviewDamage = minimumDirectDamage + (firePercent ? Math.max(1, Math.round(minimumDirectDamage * firePercent / 100)) : 0) + (icePercent ? Math.max(1, Math.round(minimumDirectDamage * icePercent / 100)) : 0);
					const foreignRealtimeChannels = Array.from({ length: fourChannels ? 4 : 3 }, (_, channelIndex) => channelIndex + 1).filter((channel) => channel !== player.channel);
					const monsterPreviews = targets.map((target) => ({
						targetId: target.id,
						spawnRound: target.spawn_round,
						damage: Math.max(1, Math.floor(minimumPreviewDamage * regionMultiplier(target))),
						targetX: target.id === monster.id ? combatMonster.x : areaPoint(target).x,
						targetY: target.id === monster.id ? combatMonster.y : areaPoint(target).y
					}));
					const previewPublishes = [];
					const publishPreviewGroup = (scope, channels, previews) => {
						const primaryPreview = previews[0];
						return publishRealtimeRoomEventToChannels(player.world_cycle, channels, player.area, {
							type: "monster_preview",
							eventId: `monster-preview:${intentId}:${scope}`,
							intentId,
							attackerId: playerId,
							targetId: primaryPreview.targetId,
							spawnRound: primaryPreview.spawnRound,
							damage: primaryPreview.damage,
							previews,
							serverAt: nowMs
						});
					};
					const publishMonsterPreviews = () => {
						if (intentId) {
							const currentChannelPreviews = monsterPreviews.filter((_, index) => targets[index].channel === 0 || targets[index].channel === player.channel);
							const foreignSharedPreviews = monsterPreviews.filter((_, index) => targets[index].channel === 0);
							if (currentChannelPreviews.length) previewPublishes.push(publishPreviewGroup("current", [player.channel], currentChannelPreviews));
							if (foreignRealtimeChannels.length && foreignSharedPreviews.length) previewPublishes.push(publishPreviewGroup("shared", foreignRealtimeChannels, foreignSharedPreviews));
						}
					};
					if (!nativeGuardedBatch && !memoryCombat) publishMonsterPreviews();
					const hits = [];
					const states = [];
					const postPublishTasks = [];
					const groundDrops = 0;
					const progression = [];
					let ownXpGain = 0;
					const eventConfig = readEventsConfig(settings.events_json);
					const eventRates = {forge491:forgeDropSnapshot491(settings),cauldron488:cauldronDropSnapshot488(settings,player.area),highLevelBalance487:balanceSnapshot487(settings,player.area),
						materials: globalThis.__colProgression?.snapshot().materials,
						loot: eventBonus(eventConfig, "loot", now),
						xp: eventBonus(eventConfig, "xp", now),
						essence: eventBonus(eventConfig, "essence", now),
						chest: eventBonus(eventConfig, "chest", now),
						moonlight: eventBonus(eventConfig, "moonlight", now), halloween:eventBonus(eventConfig,"halloween",now)
					};
					const prepareMonsterHit = (target, targetIndex, rolledHit465 = null, includeRewards465 = true) => {
						const directDamage = rolledHit465?.directDamage ?? Math.max(1, Math.floor(colRuneFactor(player,'attack')*(roleBase + player.equipped_weapon_power + stoneAttackPower + wingAttack + Math.random() * 7) * multipliers[ability] * skillGrowth * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
						const elemental = rolledHit465?.elemental ?? [...firePercent ? [{
							kind: "fire",
							damage: Math.max(1, Math.round(directDamage * firePercent / 100))
						}] : [], ...icePercent ? [{
							kind: "ice",
							damage: Math.max(1, Math.round(directDamage * icePercent / 100))
						}] : []];
						const rolled = rolledHit465?.rolled ?? Math.max(1, Math.floor((directDamage + elemental.reduce((sum, entry) => sum + entry.damage, 0)) * regionMultiplier(target)));
						const respawn = isAdventureArea(target.area)?0:target.area==='event'?0:now + (target.area==='rune_v2'?globalThis.__colRuneV2.monster(target).respawnSeconds:target.area==='rune'?globalThis.__colRunes.monster(target).respawnSeconds:target.id === "dragon-world-1" ? dragonService()?.settings().config.interval ?? 10800 : isBlackStoneBoss476(target.id) ? settings.black_stone_boss_respawn_seconds : isFrozenBossId(target.id) ? settings.frozen_boss_respawn_seconds : target.id === "ancient-boss-1" ? settings.ancient_boss_respawn_seconds : isFrozenWaterId(target.id) ? settings.frozen_water_respawn_seconds : target.is_boss ? settings.boss_respawn_seconds : target.is_stone ? settings.sinsi_stone_respawn_seconds : target.summoned ? 2 : target.area === "ancient" ? settings.ancient_monster_respawn_seconds : target.area === "forest" ? colLabNormalRespawnSecondsR10(target, settings.forest_monster_respawn_seconds) : target.area === "frozen" ? settings.frozen_monster_respawn_seconds : target.area === "black" ? settings.black_monster_respawn_seconds : target.area === "afk" ? settings.afk_island_respawn_seconds : 18);
						const hitStatements = [...targetIndex === 0 ? [database.prepare("INSERT INTO combat_events (player_id, target_id, role, ability, created_at) VALUES (?, ?, ?, ?, ?)").bind(playerId, monster.id, player.role, ability, nowMs)] : [], (isDragonRankBoss498(target.id)?dragonParticipant498(database,playerId,now,rolled,nowMs,target.id,target.spawn_round):isRuneV2Boss(target.id)?runeV2Participant483(database,playerId,now,rolled,nowMs,target.id,target.spawn_round):isBlackStoneBoss476(target.id)?database.prepare(STONE_PARTICIPANT_SQL476).bind(playerId,now,rolled,nowMs,target.id,target.spawn_round):database.prepare(`INSERT INTO monster_participants (monster_id, spawn_round, player_id, created_at)
             SELECT id, spawn_round, ?, ? FROM monsters WHERE id = ? AND hp > 0 AND spawn_round = ?
             ON CONFLICT(monster_id, spawn_round, player_id) DO UPDATE SET created_at = excluded.created_at`).bind(playerId, now, target.id, target.spawn_round))];
						if (target.is_boss) {
							hitStatements.push(database.prepare(`INSERT INTO boss_participants (boss_round, player_id, hit_count, total_damage, created_at)
             SELECT spawn_round, ?, 1, MIN(hp, ?), ? FROM monsters
             WHERE id = ? AND is_boss = 1 AND hp > 0 AND spawn_round = ?
             ON CONFLICT(boss_round, player_id) DO UPDATE SET
               hit_count = boss_participants.hit_count + 1,
               total_damage = boss_participants.total_damage + excluded.total_damage`).bind(playerId, rolled, now, target.id, target.spawn_round));
						}
                        const loadlabRewardStart = hitStatements.length;
                        let xpResultIndex = -1;
                        if(includeRewards465 && ports.skipNonlethalRewardsR56?.(target,rolled)!==true){
						const xpReward = target.area === "afk" ? settings.afk_island_xp_reward : bonusAmount(monsterXpReward(target, settings), eventRates.xp);
						const essenceRoll = normalEssenceRoll(target);
						const lootSnapshot = defaultLootSnapshot(target, settings);
						if(target.is_boss){
							hitStatements.push(database.prepare(`INSERT OR IGNORE INTO boss_defeats
               (boss_round, defeated_at, x, y, xp_reward, loot_source_key, loot_profile_revision, loot_profile_json, events_snapshot)
             SELECT spawn_round, ?, x, y, ?, ?,
               COALESCE((
                 SELECT version.revision FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), 0),
               COALESCE((
                 SELECT version.profile_json FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), ?), ?
             FROM monsters
             WHERE id = ? AND is_boss = 1 AND hp > 0 AND hp <= ? AND spawn_round = ?`).bind(now, xpReward, lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootProfileJson ?? "", JSON.stringify(eventRates), target.id, rolled, target.spawn_round));
						} else if (target.is_stone) hitStatements.push(database.prepare(`INSERT OR IGNORE INTO sinsi_defeats
               (monster_id, spawn_round, defeated_at, x, y, xp_reward,
                loot_source_key, loot_profile_revision, loot_profile_json, events_snapshot)
             SELECT id, spawn_round, ?, x, y, ?, ?,
               COALESCE((
                 SELECT version.revision FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), 0),
               COALESCE((
                 SELECT version.profile_json FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), ?), ?
             FROM monsters
             WHERE id = ? AND is_stone = 1 AND hp > 0 AND hp <= ? AND spawn_round = ?`).bind(now, xpReward, lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootProfileJson ?? "", JSON.stringify(eventRates), target.id, rolled, target.spawn_round));
						else hitStatements.push(database.prepare(`INSERT OR IGNORE INTO normal_defeats
               (monster_id, spawn_round, defeated_at, x, y, xp_reward, essence_min, essence_span,
                loot_source_key, loot_profile_revision, loot_profile_json, events_snapshot)
             SELECT id, spawn_round, ?, x, y, ?, ?, ?, ?,
               COALESCE((
                 SELECT version.revision FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), 0),
               COALESCE((
                 SELECT version.profile_json FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), ?), ?
             FROM monsters
             WHERE id = ? AND is_boss = 0 AND hp > 0 AND hp <= ? AND spawn_round = ?`).bind(now, xpReward, essenceRoll.min, essenceRoll.span, lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootProfileJson ?? "", JSON.stringify(eventRates), target.id, rolled, target.spawn_round));
						hitStatements.push(...prepareRuneV2Winner483(database,target,rolled,nowMs));const cauldronXpStatements488=prepareMonsterXp(database,settings,now,target.id,target.spawn_round,xpReward,rolled,true,target);const cauldronXpOffset488=hitStatements.length;hitStatements.push(...cauldronXpStatements488);
						xpResultIndex = cauldronXpOffset488 + 2;
						hitStatements.push(database.prepare(GUILD_MONSTER_KILL_SQL).bind(playerId, target.id, target.spawn_round, rolled));
						hitStatements.push(database.prepare(WEAPON_KILL_SQL).bind(player.equipped_weapon_id, playerId, target.id, target.spawn_round, rolled));
                        }
						colLabTagReward(hitStatements.slice(loadlabRewardStart),target,"inline");
                        const beforeHealthIndex = hitStatements.length;
						hitStatements.push(database.prepare("SELECT hp FROM monsters WHERE id=? AND hp>0 AND spawn_round=?").bind(target.id, target.spawn_round));
						hitStatements.push(database.prepare(`UPDATE monsters SET hp = MAX(0, hp - ?), last_damaged_at_ms = ?,
             wave_stage = CASE WHEN is_stone = 0 THEN wave_stage
               WHEN hp - ? <= 0 THEN 3
               WHEN hp - ? <= max_hp / 2 THEN MAX(wave_stage, 2)
               ELSE MAX(wave_stage, 1) END,
             respawn_at = CASE WHEN hp - ? <= 0 THEN ? ELSE respawn_at END,
             despawn_at = CASE WHEN hp - ? <= 0 AND is_boss = 1 THEN 0 ELSE despawn_at END
           WHERE id = ? AND hp > 0 AND spawn_round = ? RETURNING hp, wave_stage`).bind(rolled, nowMs, rolled, rolled, rolled, respawn, rolled, target.id, target.spawn_round));
						const healthResultIndex = hitStatements.length - 1;
						if (targets.length === 1) {
							hitStatements.push(database.prepare(`DELETE FROM pve_engagements WHERE player_id = ? AND monster_id = ? AND spawn_round = ? AND NOT EXISTS (SELECT 1 FROM json_each(pve_engagements.attackers489) multi489 JOIN monsters live489 ON live489.id=multi489.key AND live489.spawn_round=json_extract(multi489.value,'$.spawn_round') WHERE live489.hp>0 AND live489.id<>pve_engagements.monster_id)
             AND EXISTS (SELECT 1 FROM monsters WHERE id = ? AND spawn_round = ? AND hp <= 0)`).bind(playerId, target.id, target.spawn_round, target.id, target.spawn_round));
							hitStatements.push(...preparePveEngagement(database, attackingPlayer, target, nowMs));
						}
						const plan465 = {
							target,
							rolled,
							elemental,
							hitStatements,
							xpResultIndex,
							beforeHealthIndex,
							healthResultIndex
						};
                        if(!includeRewards465)plan465.prepareDurable=()=>{const complete=prepareMonsterHit(target,targetIndex,{directDamage,elemental,rolled},true);delete plan465.prepareDurable;Object.assign(plan465,complete);};
                        return plan465;
					};
					const memoryPlans = memoryCombat ? targets.map((target,index)=>prepareMonsterHit(target,index,null,false)) : null;
					const memoryResults = /* @__PURE__ */ new Map();
					if (memoryPlans) {
						const outcome = memoryCombat(cooldownStatement, memoryPlans, {onPendingR13:typeof realtime?.onPendingR13==='function'? provisional => realtime.onPendingR13({...provisional,intentId,cycle:player.world_cycle,channel:player.channel,area:player.area,serverAt:Date.now()}):undefined});
						if (!outcome.guard.results[0]) {
							deliverRealtime(publishMonsterAttackRejection());
							return rejectBasicAttackCadence(cooldownMs, attackPveHit);
						}
						reservedUntilMs = Number(outcome.guard.results[0].reserved_until);
						publishMonsterPreviews();
						let offset = 0;
						for (const plan of memoryPlans) {
							memoryResults.set(plan.target.id, outcome.results.slice(offset, offset + plan.hitStatements.length));
							offset += plan.hitStatements.length;
						}
					}
					const hitGroupSize = env.CORE_RUNTIME === "vds" && ability === 2 && player.role !== "muhafiz" ? (ports.hitGroupSizeR56??4) : 1;
					for (let targetOffset = 0; targetOffset < targets.length; targetOffset += hitGroupSize) {
						const hitPlans = targets.slice(targetOffset, targetOffset + hitGroupSize).map((target, index) => memoryPlans?.find((plan) => plan.target.id === target.id) ?? prepareMonsterHit(target, targetOffset + index));
						const queuedResults = (!memoryCombat && hitGroupSize > 1 ? (ports.batchHitsR56?ports.batchHitsR56(database,hitPlans).map(value=>({status:"fulfilled",value})):Promise.allSettled(hitPlans.map((plan) => database.batch(plan.hitStatements)))) : null)?.map((outcome) => {
							if (outcome.status === "rejected") throw outcome.reason;
							return outcome.value;
						});
						for (const [planIndex, plan] of hitPlans.entries()) {
							const { target, rolled, elemental, hitStatements, xpResultIndex, beforeHealthIndex, healthResultIndex } = plan;
							const queuedHitResults = queuedResults?.[planIndex];
							const guardedHit = nativeGuardedBatch ? nativeGuardedBatch(cooldownStatement, hitStatements) : null;
							if (guardedHit) {
								const accepted = guardedHit.guard.results[0];
								if (!accepted) {
									deliverRealtime(publishMonsterAttackRejection());
									return rejectBasicAttackCadence(cooldownMs, attackPveHit);
								}
								reservedUntilMs = Number(accepted.reserved_until);
								publishMonsterPreviews();
							}
							const hitResults = memoryResults.get(target.id) ?? queuedHitResults ?? (guardedHit ? guardedHit.results : database.batch(hitStatements));
							progression.push(...hitResults[xpResultIndex]?.results ?? []);
							const updated = hitResults[healthResultIndex]?.results[0];
							if (!updated) {
								const current = database.prepare("SELECT hp, spawn_round FROM monsters WHERE id = ?").bind(target.id).first();
								if (current) states.push({
									id: target.id,
									spawnRound: Number(current.spawn_round),
									hp: Math.max(0, Number(current.hp))
								});
								continue;
							}
							const nextHp = Number(updated.hp);
							actualDamageDealt += Math.max(0, Number((hitResults[beforeHealthIndex]?.results[0])?.hp ?? nextHp) - nextHp);
							if (target.id === monster.id) {
								const impactAtMs = Date.now();
								guardianEffect = ability===3&&branch456?.effect==='root'?colTrapImpact456(database,player,{...target,x:combatMonster.x,y:combatMonster.y},'monster',branch456,impactAtMs,intentId):applyGuardianImpact(database, player, ability, {
									...target,
									x: combatMonster.x,
									y: combatMonster.y
								}, "monster", impactAtMs) ?? guardianCastVisual(player, ability, {
									...target,
									x: combatMonster.x,
									y: combatMonster.y
								}, "monster", impactAtMs);
								if (guardianEffect && intentId) Object.assign(guardianEffect, { intentId });
								if (guardianEffect) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, guardianEffect));
							}
							const killed = nextHp <= 0;
							hits.push({
								id: target.id,
								damage: rolled,
								hp: nextHp,
								killed,
								critical,
								spawnRound: target.spawn_round,
								elemental
							});
							states.push({
								id: target.id,
								spawnRound: target.spawn_round,
								hp: nextHp
							});
							if (target.is_stone && !killed && Number(updated.wave_stage) > target.wave_stage) postPublishTasks.push(() => spawnSinsiStoneWaves(database, target, target.wave_stage, Number(updated.wave_stage), settings));
							if (killed) {
								const beforeXp = (hitResults[xpResultIndex - 2]?.results)?.find((p) => p.id === playerId);
								const afterXp = (hitResults[xpResultIndex]?.results)?.find((p) => p.id === playerId);
								ownXpGain += beforeXp && afterXp ? Math.max(0, afterXp.xp - beforeXp.xp) + Math.max(0, (afterXp.rank_xp ?? 0) - (beforeXp.rank_xp ?? 0)) : 0;
								if (target.is_boss) continue;
								if (target.is_stone) {
									postPublishTasks.push(() => tryAwardPendingSinsiStoneRewards(database, settings, now, target));
									continue;
								}
							}
						}
					}
					const targetScopeByRound = new Map(targets.map((target) => [`${target.id}:${target.spawn_round}`, target.channel]));
					const communityProgress = targets.some((target) => target.area === "forest" && !target.is_boss && !target.is_stone && !target.summoned && hits.some((hit) => hit.id === target.id && hit.spawnRound === target.spawn_round && hit.killed)) ? readCommunityProgress() : null;
					if (communityProgress && !colLabIsPlayer(playerId)) {
						if (!scheduleRequestTask(publishCommunityProgress(), "Community counter delivery"));
					}
					const targetScopeById = new Map(targets.map((target) => [target.id, target.channel]));
					const resultScope = (id, spawnRound) => targetScopeByRound.get(`${id}:${spawnRound}`) ?? targetScopeById.get(id);
					const publishResultGroup = (scope, channels, groupHits, groupStates, dedicatedChannel) => publishRealtimeRoomEventToChannels(player.world_cycle, channels, player.area, {
						type: "monster_result",
						eventId: `monster:${intentId ?? crypto.randomUUID()}:${nowMs}:${scope}`,
						intentId,
						attackerId: playerId,
						targetId: monster.id,
						ability,
						hits: groupHits,
						states: groupStates,
						...communityProgress ? { communityProgress } : {},
						serverAt: nowMs
					}, dedicatedChannel);
					const resultPublishes = [];
					const sharedHits = hits.filter((hit) => resultScope(hit.id, hit.spawnRound) === 0);
					const sharedStates = states.filter((state) => resultScope(state.id, state.spawnRound) === 0);
					const currentHits = hits.filter((hit) => {
						const scope = resultScope(hit.id, hit.spawnRound);
						return scope === 0 || scope === player.channel;
					});
					const currentStates = states.filter((state) => {
						const scope = resultScope(state.id, state.spawnRound);
						return scope === 0 || scope === player.channel;
					});
					if (currentHits.length || currentStates.length) resultPublishes.push(publishResultGroup("current", [player.channel], currentHits, currentStates, player.channel));
					if (foreignRealtimeChannels.length && (sharedHits.length || sharedStates.length)) resultPublishes.push(publishResultGroup("shared", foreignRealtimeChannels, sharedHits, sharedStates));
					for (const resultChannel of [...new Set(targets.filter((target) => target.channel > 0).map((target) => target.channel))]) {
						if (resultChannel === player.channel) continue;
						const channelHits = hits.filter((hit) => resultScope(hit.id, hit.spawnRound) === resultChannel);
						const channelStates = states.filter((state) => resultScope(state.id, state.spawnRound) === resultChannel);
						if (channelHits.length || channelStates.length) resultPublishes.push(publishResultGroup(`channel-${resultChannel}`, [resultChannel], channelHits, channelStates));
					}
					if (!hits.length && !states.length && intentId) {
						resultPublishes.push(publishRealtimeRoomEventToChannels(player.world_cycle, [player.channel], player.area, {
							type: "monster_reject",
							eventId: `monster-reject:${intentId}:${nowMs}:current`,
							intentId,
							attackerId: playerId,
							targetId: monster.id,
							spawnRound: monster.spawn_round,
							serverAt: nowMs
						}, player.channel));
						const firstSharedTarget = targets.find((target) => target.channel === 0);
						if (firstSharedTarget && foreignRealtimeChannels.length) resultPublishes.push(publishRealtimeRoomEventToChannels(player.world_cycle, foreignRealtimeChannels, player.area, {
							type: "monster_reject",
							eventId: `monster-reject:${intentId}:${nowMs}:shared`,
							intentId,
							attackerId: playerId,
							targetId: firstSharedTarget.id,
							spawnRound: firstSharedTarget.spawn_round,
							serverAt: nowMs
						}));
					}
					if (targets.length > 1) {
						const primaryHit = hits.find((hit) => hit.id === monster.id);
						const retaliatingMonster = targets.find((target) => !target.is_stone && hits.some((hit) => hit.id === target.id && hit.spawnRound === target.spawn_round && !hit.killed));
						if (retaliatingMonster) armPveEngagement(database, attackingPlayer, retaliatingMonster, nowMs);
						else if (primaryHit?.killed) database.prepare("DELETE FROM pve_engagements WHERE player_id = ? AND monster_id = ? AND spawn_round = ? AND NOT EXISTS (SELECT 1 FROM json_each(pve_engagements.attackers489) multi489 JOIN monsters live489 ON live489.id=multi489.key AND live489.spawn_round=json_extract(multi489.value,'$.spawn_round') WHERE live489.hp>0 AND live489.id<>pve_engagements.monster_id)").bind(playerId, monster.id, monster.spawn_round).run();
					}
					deliverRealtime(Promise.all([...previewPublishes, ...resultPublishes]));
					if (!hits.length) {
						database.batch([database.prepare(`UPDATE players SET ${attackColumn} = ? WHERE id = ? AND ${attackColumn} = ?`).bind(reservedUntilMs - cooldownMs, playerId, reservedUntilMs), database.prepare("DELETE FROM combat_events WHERE player_id = ? AND target_id = ? AND ability = ? AND created_at = ?").bind(playerId, monster.id, ability, nowMs)]);
						return Response.json({
							pveHit: attackPveHit,
							ok: true,
							hits: [],
							states,
							xp: 0,
							groundDrops: 0,
							message: "Yaratık bu vuruştan hemen önce yenildi."
						});
					}
					const lifeSteal = restoreStolenLife(database, playerId, lifeStealAmount(actualDamageDealt, enchantmentTotals("life_steal")), true);
					if (lifeSteal) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
						type: "player_state",
						eventId: crypto.randomUUID(),
						targetId: playerId,
						hp: lifeSteal.hp,
						hpRevision: lifeSteal.hp_revision,
						maxHp: lifeSteal.max_hp,
						serverAt: nowMs
					}));
					if (postPublishTasks.length) {
						const followUp = startBackgroundTask( () => {
							for (const task of postPublishTasks) task();
						});
						if (!scheduleRequestTask(followUp, "Monster combat follow-up")) followUp;
					}
					const killedCount = hits.filter((hit) => hit.killed).length;
					const shatteredStone = targets.some((target) => target.is_stone && hits.some((hit) => hit.id === target.id && hit.killed));
					return Response.json({
						pveHit: attackPveHit,
						ok: true,
						guardianEffect,
						lifeSteal,
						hits,
						states,
						progression,
						xp: ownXpGain,
						groundDrops,
						rewardPending: killedCount > 0,
						...communityProgress ? { communityProgress: readCommunityProgress(auth.account.id) } : {},
						...ability === 0 ? { nextAttackAtMs: reservedUntilMs } : { cooldownRemainingMs: Math.max(0, reservedUntilMs - Date.now()) },
						tickCount: settings.elemental_tick_count,
						tickIntervalMs: settings.elemental_tick_interval_ms,
						message: shatteredStone ? "Sinsi Taş parçalandı · yönetici profilindeki ganimetlerin hazırlanıyor." : killedCount ? `${killedCount} yaratık düştü · katılan herkese ganimet şansı · +${ownXpGain} TP` : `${hits.length > 1 ? hits.length + " hedefe" : monster.name + " yaratığına"} ${hits.reduce((sum, hit) => sum + hit.damage, 0)} hasar.`
					});
				}
 function nativePvp(database,context){const {actionSnapshot,playerId,payload,requestReceivedAtMs}=context;const {selectMixedMonsters473,prepareMixedPlayers473,runMixedBlack473}=mixedNative(database);
					let currentPvpSnapshot = actionSnapshot;
					const pvpRolls = {
						critical: Math.random(),
						spread: Math.random(),
						block: Math.random()
					};
					for (let attempt = 0; attempt < 3; attempt++) {
						const { player, settings, preloadedPvpTarget, preloadedPvpArena, pvpTargetId } = currentPvpSnapshot;
						if (!player) return Response.json({ error: "Karakter artık mevcut değil." }, { status: 409 });
						const control = database.prepare("SELECT stun_until_ms,root_until_ms, EXISTS(SELECT 1 FROM party_members mine497 JOIN party_members peer497 ON peer497.party_id=mine497.party_id WHERE mine497.player_id=players.id AND peer497.player_id=?) AS same_party497 FROM players WHERE id=?").bind(pvpTargetId,playerId).first();
						if (player.role === "muhafiz" && Number(payload.ability) === 2 && Number(control?.root_until_ms) > Date.now()) return Response.json({ error: "Sabitlenmişken hamle yapamazsın." }, { status: 409 });
						if (Number(control?.stun_until_ms) > Date.now()) return Response.json({
							error: "Sersemletildin; kısa süre sonra saldırabilirsin.",
							code: "combat_stunned"
						}, { status: 409 });
						const arenaMatchId = player.area === "arena" ? player.arena_match_id : "";
						const isArena = Boolean(arenaMatchId);
						const targetPlayerId = pvpTargetId;
						const target = preloadedPvpTarget;
						const intentId = typeof payload.intentId === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(payload.intentId) ? payload.intentId : void 0;
						const publishPvpAttackRejection =  () => {
							releasePvpCommit();
							if (!intentId || !targetPlayerId) return;
							const rejectedAt = Date.now();
							publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
								type: "pvp_reject",
								eventId: `pvp-reject:${intentId}:${rejectedAt}`,
								intentId,
								attackerId: playerId,
								targetId: targetPlayerId,
								...target ? {
									hp: target.hp,
									hpRevision: target.hp_revision,
									respawnAtMs: target.respawn_at_ms
								} : {},
								serverAt: rejectedAt
							}, arenaMatchId || void 0);
						};
						const rejectPvpAttack =  (error, status) => {
							deliverRealtime(publishPvpAttackRejection());
							return Response.json({ error }, { status });
						};
						if(player.area===CASTLE_AREA&&!globalThis.__colCastle?.mayDamage(player,target,Date.now()))return rejectPvpAttack("Kalede yalnız savaş saatinde rakip loncaya saldırabilirsin.",423);
if (player.area!==CASTLE_AREA&&control?.same_party497) return rejectPvpAttack("Parti arkadaşına saldıramazsın.", 400);
if (!pvpContinuity(currentPvpSnapshot)) return rejectPvpAttack("Savaş alanı veya hedefin durumu değişti; hedefi yeniden seç.", 409);
						if (player.area!==CASTLE_AREA && !isMistArea(player.area) && player.area !== "war" && player.area !== "black" && player.area !== "rune_v2" && !isArena) return rejectPvpAttack("Oyuncularla Savaş Meydanı, Kara Bölge veya Arena'da savaşabilirsin.", 400);
						if (player.rod_equipped) return rejectPvpAttack("Savaşmak için bir silah kuşanmalısın.", 400);
						const attacker = player;
						if (!targetPlayerId || targetPlayerId === playerId) return rejectPvpAttack("Geçerli bir rakip seç.", 400);
						if (!target) return rejectPvpAttack("Rakip artık savaş alanında değil.", 409);
                        if(!colLabMayAffectPlayer(player,target))return rejectPvpAttack("Test karakterleri yalnız kendi test grubuyla savaşabilir.",403);
						let nowMs = Date.now();
						let arenaMatch = null;
						if (isArena) {
							arenaMatch = preloadedPvpArena?.id === arenaMatchId ? preloadedPvpArena : null;
							if (!arenaMatch || arenaMatch.status !== "countdown" && arenaMatch.status !== "active") return rejectPvpAttack("Arena maçı sona erdi.", 409);
							if (arenaMatch.attacker_team === arenaMatch.target_team) return rejectPvpAttack("Takım arkadaşına saldıramazsın.", 400);
							nowMs = Date.now();
							if (nowMs < arenaMatch.starts_at_ms) return rejectPvpAttack("Geri sayım bitmeden saldırı yapılamaz.", 423);
						}
						const ability = clamp$1(Math.floor(Number(payload.ability) || 0), 0, 3);
						const branch456=ability===3?colSpec456(player.role,player.specialization,settings):null;
 if(ability===3&&(!branch456||['heal','guard'].includes(branch456.effect)||!Number.isInteger(Number(payload.ability))||Number(payload.ability)!==3))return Response.json({error:'Uzmanlık saldırısı açık değil.'},{status:409});
 const unlockLevel=ability===3?30:ability===0?1:ability===1?settings.skill_two_unlock_level:settings.skill_three_unlock_level;
						if (player.level < unlockLevel) return rejectPvpAttack(`Bu yetenek ${unlockLevel}. seviyede açılır.`, 400);
						const attackRange = player.role === "muhafiz" ? ability === 1 ? 720 : ability === 2 ? 600 : 190 : player.role === "avci" ? 500 : 470;
						if (player.role === "muhafiz" && ability > 0 && !isAreaWalkableSegment(player.area, attacker.x, attacker.y, target.x, target.y)) return rejectPvpAttack("Hedef ile aranda engel var.", 400);
						if (distance(attacker, target) > attackRange + (player.role === "muhafiz" && ability > 0 ? 0 : 95)) return rejectPvpAttack("Rakip menzil dışında.", 400);
						const attackColumn=ability===3?"attack_four_at":ability===0?"attack_one_at":ability===1?"attack_two_at":"attack_three_at";
						const attackerGear = equippedEnchantItems(player);
						let enchantmentTotals473_attackerGear;
						const baseCooldownMs=ability===3?branch456.cooldown:ability===0?650:ability===1?settings.skill_two_cooldown_ms:settings.skill_three_cooldown_ms;
						const cooldownMs = ability === 0 ? effectiveAttackCooldownMs(baseCooldownMs, (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("attack_speed") + (player.set_speed ?? 0)) : effectiveSkillCooldown444(baseCooldownMs, Math.min(50,(enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("cast_speed")+(player.jewelry_cast_speed||0)));
						const cooldownGraceMs = ability === 0 ? 220 : 0;
						const cooldownAtMs = requestReceivedAtMs;
/* V472: only the existing Avci/Arkanist third-skill circle. One durable cast. */
if (ability === 2 && (player.role === "avci" || player.role === "arkanist")) {
  const areaLimit472 = 29, center472 = target;
  if (player.area === "war" && (inWarSafeZone(player.x, player.y) || inWarSafeZone(target.x, target.y))) return rejectPvpAttack("Güvenli çemberde savaşılmaz.", 409);
  const areaRows472 = (database.prepare(`SELECT stat_attack,stat_defense,stat_hp,stat_revision,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms, essence, contribution, xp, level, gems, potions, ${setSelectSql()},
          specialization,skill_four,attack_four_at,special_guard_until_ms,jewelry_attack,jewelry_defense,jewelry_cast_speed,jewelry_pvp,${beltBonusSql('strongPlayers','players')} AS belt_pvp_r31,jewelry_resist,jewelry_earring_enchantments,jewelry_bracelet_enchantments,halloween_candy_until,skill_one, skill_two, skill_three, has_rod, rod_equipped, fish_sokan, fish_levrek, fish_zargana, pearls, stone_dust,
          xp_ring_until, drop_charm_until, (SELECT equipped FROM player_items WHERE player_id=players.id AND kind='costume' LIMIT 1) AS costume_equipped, has_wings, wings_equipped, (SELECT equipped FROM dungeon_wings WHERE player_id=players.id) AS core_wings, area, channel, arena_match_id, last_seen,
          combat_lock_until_ms, realtime_scope_version, weapon_skin_enabled,
          COALESCE((SELECT SUM(power) FROM player_items WHERE player_id = players.id AND kind IN ('armor','helmet','shoes','necklace','costume') AND equipped = 1), 0) AS equipped_armor_power,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), '[]') AS equipped_weapon_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'armor' AND equipped = 1 LIMIT 1), '[]') AS equipped_armor_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'helmet' AND equipped = 1 LIMIT 1), '[]') AS equipped_helmet_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'shoes' AND equipped = 1 LIMIT 1), '[]') AS equipped_shoes_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'necklace' AND equipped = 1 LIMIT 1), '[]') AS equipped_necklace_enchantments, EXISTS(SELECT 1 FROM player_pets WHERE player_id=players.id AND kind='dragon' AND acquired_at+604800>unixepoch() AND equipped=1) AS defender_dragon

    FROM players WHERE id != ? AND (players.area='guild_castle' OR NOT EXISTS(SELECT 1 FROM party_members party_actor497 JOIN party_members party_peer497 ON party_peer497.party_id=party_actor497.party_id WHERE party_actor497.player_id=?1 AND party_peer497.player_id=players.id)) AND (players.area!='guild_castle' OR EXISTS(SELECT 1 FROM guild_members castle_actor59 JOIN guild_members castle_peer59 ON castle_actor59.guild_id!=castle_peer59.guild_id WHERE castle_actor59.player_id=?1 AND castle_peer59.player_id=players.id)) AND hp > 0 AND last_seen >= ? AND loadlab_run_id=(SELECT actor.loadlab_run_id FROM players actor WHERE actor.id=?1) AND (loadlab_run_id='' OR (loadlab_team>0 AND loadlab_team!=(SELECT actor.loadlab_team FROM players actor WHERE actor.id=?1)))
      AND area = ? AND channel = ? AND arena_match_id = ?
      AND (x-?)*(x-?)+(y-?)*(y-?) <= 90000
      AND (area != 'war' OR (x-1800)*(x-1800)/202500.0+(y-996)*(y-996)/116964.0>1)
      AND (area != 'arena' OR EXISTS (
        SELECT 1 FROM arena_match_players attacker JOIN arena_match_players defender ON defender.match_id=attacker.match_id
        WHERE attacker.player_id=? AND defender.player_id=players.id AND attacker.match_id=? AND attacker.team!=defender.team))
    ORDER BY CASE WHEN id=? THEN 0 ELSE 1 END, (x-?)*(x-?)+(y-?)*(y-?), id LIMIT 29`)
    .bind(playerId, Math.floor(nowMs/1000)-30, player.area, player.channel, arenaMatchId,
      center472.x,center472.x,center472.y,center472.y,playerId,arenaMatchId,target.id,
      center472.x,center472.x,center472.y,center472.y).all()).results.filter(row=>!castleEnabled()||player.area!==CASTLE_AREA||ports.castlePvpTargetR59(row.id));
  const rejectArea472=(error, code)=>{
    const response=rejectPvpAttack(error,409);
    return Response.json({...(response.json()),code},{status:409,headers:response.headers});
  };
  if (!areaRows472.length || areaRows472[0].id !== target.id) return rejectArea472("Hedefin durumu değişti; hedefi yeniden seç.", "pvp_area_primary_unavailable");
  const primary472=areaRows472[0];
  if (!samePvpActorScope(target,primary472)) return rejectArea472("Hedefin savaş alanı değişti; hedefi yeniden seç.", "pvp_area_primary_scope_changed");
  if (primary472.hp_revision !== target.hp_revision && !pvpContinuity({...currentPvpSnapshot,preloadedPvpTarget:primary472})) return rejectArea472("Hedefin yaşamı değişti; hedefi yeniden seç.", "pvp_area_primary_life_changed");
  const castGuild472=guildBuff(player.id),castPremium472=premiumBuff(player.id);
  const castRanks472=new Map((rankService()?.project([{id:playerId},...areaRows472.map(p=>({id:p.id}))],playerId)??[]).map(p=>[p.id,p.rank?.bonuses]));
  const areaRolls472=pvpRolls;
  const plans472 = areaRows472.map((target, index) => {
    const pvpRolls = { ...areaRolls472, block: index === 0 ? areaRolls472.block : Math.random() };
    const defenderGear = equippedEnchantItems(target);
    let enchantmentTotals473_defenderGear;
						const roleBase = (player.role === "arkanist" ? settings.arcanist_base_attack : player.role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack) + castGuild472.attack + castPremium472.attack + (player.set_attack??0);
						const weaponPower = player.equipped_weapon_power + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_attack");
						const armorPower = target.equipped_armor_power + (target.jewelry_defense||0) + (target.role==='muhafiz'?10:0) + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_defense") + (castRanks472.get(target.id)?.defense??0);
						const skillLevel = [
							player.skill_one,
							player.skill_two,
							player.skill_three,player.skill_four
						][ability];
						const multiplier = [
							settings.skill_one_multiplier,
							settings.skill_two_multiplier,
							settings.skill_three_multiplier,branch456?.multiplier??1
						][ability];
						const criticalChance = clamp$1(settings.base_critical_chance + (ability === 2 ? settings.third_skill_critical_bonus : 0) + (hasWingBonus(player) ? settings.wing_critical_chance : 0) + ((enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("critical") + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_critical")) / 100, 0, .95);
						const criticalRoll = pvpRolls.critical;
						const critical = criticalRoll < criticalChance;
						const strongPlayers = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("strong_players") + ((player.jewelry_pvp||0)+(player.belt_pvp_r31||0)) + (player.pet_kind === "dragon" ? 10 : 0) + (castRanks472.get(player.id)?.pvp??0) + (player.set_pvp ?? 0);
						const defenderDragon = target.defender_dragon;
						const resistantPlayers = clamp$1((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("resistant_players") + (target.jewelry_resist||0) + (target.set_resistance ?? 0) + (defenderDragon ? 10 : 0), 0, 90);
						const defenseKind = player.role === "avci" ? "arrow_defense" : player.role === "arkanist" ? "magic_defense" : "sword_defense";
						const classDefense = (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))(defenseKind);
						const spreadRoll = pvpRolls.spread;
						const baseRaw = Math.max(1, Math.floor(colRuneFactor(player,'attack')*(roleBase + weaponPower + (hasWingBonus(player) ? settings.wing_attack_bonus : 0) + (player.pet_kind === "dog" ? 0 : player.pet_kind === "dragon" ? 45 : player.pet_kind === "starter" ? 10 : player.pet_kind ? 20 : 0) + spreadRoll * 7) * multiplier * (1 + (skillLevel - 1) * settings.skill_upgrade_damage_per_level) * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
						const armorReduction = armorDamageReduction((armorPower + (hasWingBonus(target) ? settings.wing_defense_bonus : 0))*colRuneFactor(target,'defense'), "pvp");
						const attackBlocked = attackIsBlocked((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("attack_block") + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_block"), pvpRolls.block);
						const directDamage = attackBlocked ? 0 : Math.max(1, Math.round(baseRaw * (1 + strongPlayers / 100) * (1 - armorReduction) * (1 - classDefense / 100) * (1 - resistantPlayers / 100)*(target.special_guard_until_ms>nowMs?1-(colSpec456(target.role,target.specialization,settings)?.guard??0):1)));
						const firePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("fire");
						const icePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("ice");
						const fireDamage = !attackBlocked && firePercent ? Math.max(1, Math.round(directDamage * firePercent / 100)) : 0;
						const iceDamage = !attackBlocked && icePercent ? Math.max(1, Math.round(directDamage * icePercent / 100)) : 0;
						const totalDamage = directDamage + fireDamage + iceDamage;
						const wouldKill = target.hp <= totalDamage;
						
						const killClaimId = isArena ? crypto.randomUUID() : "";
						const scoringTeam = arenaMatch?.attacker_team === 2 ? 2 : 1;
						const arenaScoreWrites = isArena && arenaMatch && wouldKill ? [
							database.prepare(`INSERT INTO arena_kill_claims (id, match_id, killer_id, victim_id, victim_hp_revision, created_at_ms)
           SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (
             SELECT 1 FROM players victim WHERE victim.id = ? AND victim.hp = 0
               AND victim.hp_revision = ? AND victim.area = 'arena' AND victim.arena_match_id = ?
           ) AND EXISTS (
             SELECT 1 FROM arena_matches m
             JOIN arena_match_players attacker ON attacker.match_id = m.id AND attacker.player_id = ?
             JOIN arena_match_players defender ON defender.match_id = m.id AND defender.player_id = ?
             WHERE m.id = ? AND m.status IN ('countdown','active') AND m.starts_at_ms <= ?
               AND attacker.team != defender.team
           ) ON CONFLICT(match_id, victim_id, victim_hp_revision) DO NOTHING RETURNING id`).bind(killClaimId, arenaMatchId, playerId, target.id, target.hp_revision + 1, nowMs, target.id, target.hp_revision + 1, arenaMatchId, playerId, target.id, arenaMatchId, nowMs),
							database.prepare(`UPDATE arena_match_players SET kills = kills + 1 WHERE match_id = ? AND player_id = ?
           AND EXISTS (SELECT 1 FROM arena_kill_claims WHERE id = ?)`).bind(arenaMatchId, playerId, killClaimId),
							database.prepare(`UPDATE arena_match_players SET deaths = deaths + 1 WHERE match_id = ? AND player_id = ?
           AND EXISTS (SELECT 1 FROM arena_kill_claims WHERE id = ?)`).bind(arenaMatchId, target.id, killClaimId),
							] : [];
						const warKillClaimId = isArena ? "" : crypto.randomUUID();
						const warRewardToken = isArena ? "" : crypto.randomUUID();
						const warEconomyWrites = player.area === "war" && wouldKill ? [
							database.prepare(`INSERT INTO war_kill_claims (id, killer_id, victim_id, victim_hp_revision, created_at_ms)
           SELECT ?, ?, ?, ?, ? WHERE EXISTS (
             SELECT 1 FROM players victim WHERE victim.id = ? AND victim.hp = 0
               AND victim.hp_revision = ? AND victim.area = 'war' AND victim.channel = ?
           )
           ON CONFLICT(victim_id, victim_hp_revision) DO NOTHING RETURNING id`).bind(warKillClaimId, playerId, target.id, target.hp_revision + 1, nowMs, target.id, target.hp_revision + 1, player.channel),
							database.prepare(`INSERT INTO pvp_reward_cooldowns (player_id, reward_scope, last_awarded_at_ms, claim_token)
           SELECT claim.killer_id, 'war_kill:' || claim.victim_id, ?, ? FROM war_kill_claims claim
           JOIN players killer ON killer.id = claim.killer_id
           JOIN players victim ON victim.id = claim.victim_id
           WHERE claim.id = ? AND claim.killer_id = ? AND ? > 0
             AND killer.level >= 5 AND victim.level >= 5
             AND NOT EXISTS (SELECT 1 FROM war_kill_claims reciprocal
               WHERE reciprocal.killer_id = claim.victim_id AND reciprocal.victim_id = claim.killer_id
                 AND reciprocal.created_at_ms >= ?)
           ON CONFLICT(player_id, reward_scope) DO UPDATE SET
             last_awarded_at_ms = excluded.last_awarded_at_ms,
             claim_token = excluded.claim_token
           WHERE pvp_reward_cooldowns.last_awarded_at_ms <= excluded.last_awarded_at_ms - ?
           RETURNING last_awarded_at_ms`).bind(nowMs, warRewardToken, warKillClaimId, playerId, settings.pvp_kill_reward_gems, nowMs - 360 * 6e4, PVP_REWARD_COOLDOWN_MS),
							database.prepare(`UPDATE players SET gems = gems + CASE WHEN EXISTS (
             SELECT 1 FROM pvp_reward_cooldowns
             WHERE player_id = ? AND reward_scope LIKE 'war_kill:%' AND claim_token = ?
           ) THEN ? ELSE 0 END
           WHERE id = ? AND EXISTS (SELECT 1 FROM war_kill_claims WHERE id = ? AND killer_id = ?)
           RETURNING gems`).bind(playerId, warRewardToken, settings.pvp_kill_reward_gems, playerId, warKillClaimId, playerId),
							database.prepare(`SELECT gems FROM players WHERE id = ? AND EXISTS (SELECT 1 FROM war_kill_claims WHERE id = ? AND victim_id = ?)`).bind(target.id, warKillClaimId, target.id),
							database.prepare(`SELECT last_awarded_at_ms + ? AS reward_available_at_ms
           FROM pvp_reward_cooldowns
           WHERE player_id = ? AND reward_scope = 'war_kill:' || ?
             AND EXISTS (SELECT 1 FROM war_kill_claims WHERE id = ?)`).bind(PVP_REWARD_COOLDOWN_MS, playerId, target.id, warKillClaimId)
						] : [];
						
colLabTagWarReward(warEconomyWrites,player,target);
return {target,arenaScoreWrites,warEconomyWrites,killClaimId,totalDamage,directDamage,fireDamage,iceDamage,attackBlocked,critical,wouldKill,criticalRoll,spreadRoll,roleBase,weaponPower,multiplier,skillLevel,criticalChance,strongPlayers,armorReduction,classDefense,resistantPlayers,firePercent,icePercent};

  });
if(isMistArea(player.area)||player.area==='black'||player.area==='rune_v2'){
  const mixedCenter473={kind:'player',id:target.id,x:center472.x,y:center472.y};
  const mixedTargets473=selectMixedMonsters473(player,mixedCenter473,null,payload,nowMs);
  if(mixedTargets473.length){
   if(typeof database.combatHit!=='function')return rejectPvpAttack('Alan saldırısı için oyun sunucusuna yeniden bağlan.',503);
   return runMixedBlack473({player,settings,center473:mixedCenter473,monster:mixedTargets473[0],targets:mixedTargets473,playerPlans473:plans472,rolls473:pvpRolls,nowMs,cooldownAtMs,cooldownMs,intentId,reject473:rejectPvpAttack});
  }
 }
  const victims472 = JSON.stringify(plans472.map(({target:t})=>({id:t.id,hp:t.hp,revision:t.hp_revision,scope:t.realtime_scope_version})));
  const areaGuard472 = database.prepare(`UPDATE players SET attack_three_at = MAX(attack_three_at, ?) + ?, combat_lock_until_ms = MAX(combat_lock_until_ms, ?)
    WHERE id=? AND hp>0 AND stun_until_ms<=? AND attack_three_at<=?
      AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=?
      AND COALESCE((SELECT cycle FROM world_state WHERE id=1),1)=?
      AND (area!='war' OR (x-1800)*(x-1800)/202500.0+(y-996)*(y-996)/116964.0>1)
      AND EXISTS(SELECT 1 FROM players primary_target WHERE primary_target.id=?
        AND (players.x-primary_target.x)*(players.x-primary_target.x)+(players.y-primary_target.y)*(players.y-primary_target.y)<=?)
      AND NOT EXISTS(SELECT 1 FROM json_each(?) expected WHERE NOT EXISTS(
        SELECT 1 FROM players victim JOIN players center ON center.id=?
        WHERE victim.id=json_extract(expected.value,'$.id') AND victim.hp=json_extract(expected.value,'$.hp') AND victim.hp>0
          AND victim.hp_revision=json_extract(expected.value,'$.revision') AND victim.realtime_scope_version=json_extract(expected.value,'$.scope')
 AND NOT EXISTS(SELECT 1 FROM party_members party_actor497 JOIN party_members party_peer497 ON party_peer497.party_id=party_actor497.party_id WHERE party_actor497.player_id=players.id AND party_peer497.player_id=victim.id)
          AND victim.area=players.area AND victim.channel=players.channel AND victim.arena_match_id=players.arena_match_id
          AND MAX(victim.last_seen,CAST(victim.movement_checked_at_ms/1000 AS INTEGER),CAST(victim.last_monster_hit_at/1000 AS INTEGER))>=? AND (victim.x-center.x)*(victim.x-center.x)+(victim.y-center.y)*(victim.y-center.y)<=90000
          AND (victim.area!='war' OR (victim.x-1800)*(victim.x-1800)/202500.0+(victim.y-996)*(victim.y-996)/116964.0>1)
          AND (victim.area!='arena' OR EXISTS(SELECT 1 FROM arena_matches m
            JOIN arena_match_players a ON a.match_id=m.id AND a.player_id=players.id
            JOIN arena_match_players d ON d.match_id=m.id AND d.player_id=victim.id
            WHERE m.id=players.arena_match_id AND m.status IN ('active','countdown') AND m.starts_at_ms<=?
              AND (m.id NOT LIKE 'guild-%' OR m.starts_at_ms+600000>MAX(?,CAST(unixepoch('subsec')*1000 AS INTEGER))) AND a.team!=d.team))))
    RETURNING attack_three_at AS reserved_until`)
    .bind(cooldownAtMs,cooldownMs,nowMs+5000,playerId,nowMs,cooldownAtMs,player.area,player.channel,arenaMatchId,player.realtime_scope_version,
      player.world_cycle,target.id,(attackRange+95)**2,victims472,target.id,Math.floor(nowMs/1000)-30,nowMs,nowMs);
  // The all-victim guard proves every row before either statement runs.
  // UPDATE/INSERT triggers still report each changed player/event key.
  // Keep scope predicates correlated so SQLite probes the bounded target IDs by PK.
  const damageRows472 = JSON.stringify(plans472.map(p=>({id:p.target.id,damage:p.totalDamage,revision:p.target.hp_revision,scope:p.target.realtime_scope_version})));
  const hasLethalGems479=plans472.some(p=>p.wouldKill);
 const targetUpdates472 = database.prepare(`${hasLethalGems479 ? "WITH before_gems479 AS MATERIALIZED (SELECT victim.id,victim.gems AS before_gems FROM json_each(?) prior JOIN players victim ON victim.id=json_extract(prior.value,'$.id') WHERE victim.hp>0 AND victim.hp<=CAST(json_extract(prior.value,'$.damage') AS INTEGER)) " : ""}UPDATE players SET
      hp=MAX(0,players.hp-CAST(json_extract(hit.value,'$.damage') AS INTEGER)), hp_revision=players.hp_revision+1,
   ${hasLethalGems479 ? "gems=CASE WHEN players.loadlab_run_id='' AND players.area NOT GLOB 'sis_*' AND players.area!='guild_castle' AND players.hp<=CAST(json_extract(hit.value,'$.damage') AS INTEGER) THEN (SELECT before_gems FROM before_gems479 WHERE id=players.id)-CAST((SELECT before_gems FROM before_gems479 WHERE id=players.id)/20 AS INTEGER) ELSE players.gems END," : ""}
      respawn_at_ms=CASE WHEN players.hp-CAST(json_extract(hit.value,'$.damage') AS INTEGER)<=0 THEN ? ELSE 0 END,
      last_monster_hit_at=?, combat_lock_until_ms=MAX(players.combat_lock_until_ms,?)
    FROM json_each(?) AS hit
    WHERE players.id=json_extract(hit.value,'$.id') AND players.id!=? AND players.hp>0
      AND players.hp_revision=json_extract(hit.value,'$.revision') AND players.realtime_scope_version=json_extract(hit.value,'$.scope')
      AND EXISTS(SELECT 1 WHERE players.area=? AND players.channel=? AND players.arena_match_id=?)
    RETURNING players.id AS id, hp, hp_revision, respawn_at_ms, gems${hasLethalGems479 ? ",CASE WHEN loadlab_run_id='' AND area NOT GLOB 'sis_*' AND area!='guild_castle' THEN (SELECT before_gems FROM before_gems479 WHERE id=players.id)-gems ELSE NULL END AS pvp_gems_lost479" : ""}`)
    .bind(...(hasLethalGems479?[damageRows472]:[]),nowMs+settings.pvp_respawn_seconds*1000,nowMs,nowMs+5000,damageRows472,playerId,player.area,player.channel,arenaMatchId);
  const eventInserts472 = database.prepare(`INSERT INTO combat_events(player_id,target_id,role,ability,created_at)
    SELECT ?,json_extract(hit.value,'$.id'),?,?,? FROM json_each(?) AS hit
    WHERE EXISTS(SELECT 1 FROM players victim WHERE victim.id=json_extract(hit.value,'$.id')
      AND victim.hp_revision=json_extract(hit.value,'$.revision')+1 AND victim.realtime_scope_version=json_extract(hit.value,'$.scope')
      AND victim.area=? AND victim.channel=? AND victim.arena_match_id=?)
    ORDER BY CAST(hit.key AS INTEGER)`)
    .bind(playerId,player.role,ability,nowMs,damageRows472,player.area,player.channel,arenaMatchId);
  const statements472 = [targetUpdates472,eventInserts472];
  // All lethal claims and statistics precede the ONE score write/round trigger.
  for (const p of plans472) statements472.push(...p.arenaScoreWrites.slice(0,3));
  const scoreIndex472 = statements472.length;
  const claimIds472 = plans472.filter(p=>p.arenaScoreWrites.length).map(p=>p.killClaimId);
  if (claimIds472.length) {
    const scoringTeam472=arenaMatch.attacker_team===2?2:1;
    const claimCount472=`MIN((SELECT COUNT(*) FROM arena_kill_claims WHERE id IN (SELECT value FROM json_each(?)) AND match_id=? AND killer_id=?),CASE WHEN id NOT LIKE 'guild-%' AND mode IN ('2v2','3v3','5v5') THEN 1 ELSE 2147483647 END)`;
    const claimParams472=[JSON.stringify(claimIds472),arenaMatchId,playerId];
    statements472.push(database.prepare(`UPDATE arena_matches SET
      team_a_score=team_a_score+CASE WHEN ?=1 THEN ${claimCount472} ELSE 0 END,
      team_b_score=team_b_score+CASE WHEN ?=2 THEN ${claimCount472} ELSE 0 END,
      status=CASE WHEN (CASE WHEN ?=1 THEN team_a_score ELSE team_b_score END)+${claimCount472}>=kill_target THEN 'finished' ELSE 'active' END,
      winner_team=CASE WHEN (CASE WHEN ?=1 THEN team_a_score ELSE team_b_score END)+${claimCount472}>=kill_target THEN ? ELSE 0 END,
      finished_at_ms=CASE WHEN (CASE WHEN ?=1 THEN team_a_score ELSE team_b_score END)+${claimCount472}>=kill_target THEN ? ELSE 0 END,
      updated_at_ms=?
      WHERE id=? AND status IN ('active','countdown') AND starts_at_ms<=? AND ${claimCount472}>0 AND ${arenaRoundReady498(scoringTeam472)} RETURNING *`)
      .bind(scoringTeam472,...claimParams472,scoringTeam472,...claimParams472,scoringTeam472,...claimParams472,
        scoringTeam472,...claimParams472,scoringTeam472,scoringTeam472,...claimParams472,nowMs,nowMs,arenaMatchId,nowMs,...claimParams472));
  }
  for (const p of plans472) {p.warIndex472=statements472.length; statements472.push(...p.warEconomyWrites);}
  timing.mark("pvp_validation");
  const committed472=database.guardedBatch(areaGuard472,statements472);
  if (!committed472.guard.results.length) return rejectArea472("Hedef veya yetenek durumu değişti; yeniden dene.", "pvp_area_guard_changed");
  const updatedById472 = new Map(committed472.results[0].results.map((row)=>[row.id,row]));
  timing.mark("pvp_commit");
  releasePvpCommit();
  const reservedUntilMs472=Number(committed472.guard.results[0].reserved_until);
  let attackerGems472=player.gems;
  const hits472=plans472.map((p,index)=>{
    const updated=updatedById472.get(p.target.id);
    // Every UPDATE predicate is proved by the guard under the writer transaction.
    if(!updated)throw Error('pvp_area_commit_invariant');
    const reward=p.warEconomyWrites.length?committed472.results[p.warIndex472+1]?.results[0]:null;
    if(p.warEconomyWrites.length)attackerGems472=Number(committed472.results[p.warIndex472+2]?.results[0]?.gems??attackerGems472);
    return {targetId:p.target.id,targetName:p.target.name,damage:p.totalDamage,directDamage:p.directDamage,attackBlocked:p.attackBlocked,
      hp:updated.hp,hpRevision:updated.hp_revision,respawnAtMs:updated.respawn_at_ms,killed:updated.hp<=0,critical:p.critical,pvpGemsLost479:updated.pvp_gems_lost479??null,
      targetGems:Number((p.warEconomyWrites.length?committed472.results[p.warIndex472+3]?.results[0]?.gems:undefined)??updated.gems),
      elemental:[...(p.fireDamage?[{kind:'fire',damage:p.fireDamage}]:[]),...(p.iceDamage?[{kind:'ice',damage:p.iceDamage}]:[])],
      ...(p.warEconomyWrites.length?{rewardGranted:Boolean(reward),rewardGems:reward?settings.pvp_kill_reward_gems:0,
        rewardAvailableAtMs:Number(committed472.results[p.warIndex472+4]?.results[0]?.reward_available_at_ms??0)}:{})};
  });
  let scoredMatch472=claimIds472.length?committed472.results[scoreIndex472]?.results[0]??null:null;
  let matchFinished472=false;
  if(scoredMatch472?.status==='finished')matchFinished472=settleArenaMatch(database,scoredMatch472,nowMs);
  if(scoredMatch472){
    scoredMatch472=database.prepare('SELECT * FROM arena_matches WHERE id=?').bind(arenaMatchId).first();
    const ids472=JSON.stringify([playerId,...hits472.map(h=>h.targetId)]);
    const resetRows472=(database.prepare('SELECT id,hp,max_hp,hp_revision,respawn_at_ms,gems FROM players WHERE arena_match_id=? OR id IN (SELECT value FROM json_each(?))').bind(arenaMatchId,ids472).all()).results;
    for(const row of resetRows472){
      if(row.id===playerId)attackerGems472=row.gems;
      const hit=hits472.find(h=>h.targetId===row.id);if(hit)Object.assign(hit,{hp:row.hp,hpRevision:row.hp_revision,respawnAtMs:row.respawn_at_ms,targetGems:row.gems});
      if(!matchFinished472&&!arenaMatchId.startsWith('guild-'))deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,'arena',
        {type:'player_state',eventId:crypto.randomUUID(),targetId:row.id,hp:row.hp,hpRevision:row.hp_revision,maxHp:row.max_hp,serverAt:nowMs},arenaMatchId));
    }
  }
  const lifeSteal472=restoreStolenLife(database,playerId,lifeStealAmount(plans472.reduce((sum,p)=>sum+Math.min(p.totalDamage,p.target.hp),0),(enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))('life_steal')));
  if(lifeSteal472)deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'player_state',eventId:crypto.randomUUID(),targetId:playerId,hp:lifeSteal472.hp,hpRevision:lifeSteal472.hp_revision,maxHp:lifeSteal472.max_hp,serverAt:nowMs},arenaMatchId||void 0));
  if(!matchFinished472)for(let index=0;index<hits472.length;index++){
    const hit=hits472[index],p=plans472[index];
    deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'pvp_result',eventId:`pvp:${nowMs}:${playerId}:${hit.targetId}`,intentId,primaryTargetId:target.id,attackerId:playerId,ability,...hit,attackerGems:attackerGems472,
      __combatAudit:intentId&&!p.attackBlocked?{v:1,intentId,attacker:{id:playerId,hp:player.hp,revision:player.hp_revision,scopeVersion:player.realtime_scope_version},
        target:{id:p.target.id,hp:p.target.hp,revision:p.target.hp_revision,scopeVersion:p.target.realtime_scope_version},rolls:{critical:p.criticalRoll,spread:p.spreadRoll},
        rules:{roleBase:p.roleBase,weaponPower:p.weaponPower,wingAttack:hasWingBonus(player)?settings.wing_attack_bonus:0,multiplier:p.multiplier,
          skillGrowth:1+(p.skillLevel-1)*settings.skill_upgrade_damage_per_level,scale:settings.skill_damage_scale,criticalChance:p.criticalChance,
          criticalMultiplier:colCriticalMultiplier491(settings.critical_damage_multiplier,player),strongPlayers:p.strongPlayers,armorReduction:p.armorReduction,classDefense:p.classDefense,
          resistantPlayers:p.resistantPlayers,firePercent:p.firePercent,icePercent:p.icePercent}}:void 0,
      ...(scoredMatch472?{arenaMatchId,teamAScore:scoredMatch472.team_a_score,teamBScore:scoredMatch472.team_b_score,killTarget:scoredMatch472.kill_target}:{}),serverAt:nowMs},arenaMatchId||void 0));
  }
  if(matchFinished472&&scoredMatch472)deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,'arena',{type:'arena_match_finished',eventId:`arena-finished:${arenaMatchId}`,matchId:arenaMatchId,mode:scoredMatch472.mode,winnerTeam:scoredMatch472.winner_team,teamAName:scoredMatch472.team_a_name,teamBName:scoredMatch472.team_b_name,teamAScore:scoredMatch472.team_a_score,teamBScore:scoredMatch472.team_b_score,rewardGems:scoredMatch472.reward_gems,serverAt:nowMs},arenaMatchId));
  for(const row479 of updatedById472.values())colNotifyPvpGemLoss479(player,row479,row479.id,row479.hp_revision,nowMs);
  return Response.json({ok:true,...hits472[0],hits:hits472,lifeSteal:lifeSteal472,attackerGems:attackerGems472,
    cooldownRemainingMs:Math.max(0,reservedUntilMs472-Date.now()),matchFinished:matchFinished472,
    ...(scoredMatch472?{arenaMatch:{id:arenaMatchId,teamAScore:scoredMatch472.team_a_score,teamBScore:scoredMatch472.team_b_score,killTarget:scoredMatch472.kill_target,winnerTeam:scoredMatch472.winner_team}}:{}),
    tickCount:settings.elemental_tick_count,tickIntervalMs:settings.elemental_tick_interval_ms,message:`${hits472.length} rakibe alan saldırısı.`});
}

						const pvpCooldownStatement = database.prepare(`UPDATE players SET ${attackColumn} = MAX(${attackColumn}, ?) + ?,
           combat_lock_until_ms = MAX(combat_lock_until_ms, ?)
         WHERE id = ? AND hp > 0 AND stun_until_ms <= ? AND ${attackColumn} <= ?
           AND area = ? AND channel = ? AND arena_match_id = ? AND realtime_scope_version = ?
         RETURNING ${attackColumn} AS reserved_until`).bind(cooldownAtMs, cooldownMs, nowMs + 5e3, playerId, nowMs, cooldownAtMs + cooldownGraceMs, player.area, player.channel, arenaMatchId, player.realtime_scope_version);
						const defenderGear = equippedEnchantItems(target);
						let enchantmentTotals473_defenderGear;
						const premium499=premiumBuff(player.id);
 const roleBase = (player.role === "arkanist" ? settings.arcanist_base_attack : player.role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack) + guildBuff(player.id).attack + premium499.attack + (player.set_attack??0);
						const weaponPower = player.equipped_weapon_power + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_attack");
						const armorPower = target.equipped_armor_power + (target.jewelry_defense||0) + (target.role==='muhafiz'?10:0) + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_defense") + serverRankBonuses(target.id).defense;
						const skillLevel = [
							player.skill_one,
							player.skill_two,
							player.skill_three,player.skill_four
						][ability];
						const multiplier = [
							settings.skill_one_multiplier,
							settings.skill_two_multiplier,
							settings.skill_three_multiplier,branch456?.multiplier??1
						][ability];
						const criticalChance = clamp$1(settings.base_critical_chance + (ability === 2 ? settings.third_skill_critical_bonus : 0) + (hasWingBonus(player) ? settings.wing_critical_chance : 0) + ((enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("critical") + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_critical")) / 100, 0, .95);
						const criticalRoll = pvpRolls.critical;
						const critical = criticalRoll < criticalChance;
						const strongPlayers = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("strong_players") + ((player.jewelry_pvp||0)+(player.belt_pvp_r31||0)) + (player.pet_kind === "dragon" ? 10 : 0) + serverRankBonuses(player.id).pvp + (player.set_pvp ?? 0);
						const defenderDragon = database.prepare("SELECT 1 AS active FROM player_pets WHERE player_id=? AND kind='dragon' AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped=1").bind(target.id).first();
						const resistantPlayers = clamp$1((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("resistant_players") + (target.jewelry_resist||0) + (target.set_resistance ?? 0) + (defenderDragon ? 10 : 0), 0, 90);
						const defenseKind = player.role === "avci" ? "arrow_defense" : player.role === "arkanist" ? "magic_defense" : "sword_defense";
						const classDefense = (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))(defenseKind);
						const spreadRoll = pvpRolls.spread;
						const baseRaw = Math.max(1, Math.floor(colRuneFactor(player,'attack')*(roleBase + weaponPower + (hasWingBonus(player) ? settings.wing_attack_bonus : 0) + (player.pet_kind === "dog" ? 0 : player.pet_kind === "dragon" ? 45 : player.pet_kind === "starter" ? 10 : player.pet_kind ? 20 : 0) + spreadRoll * 7) * multiplier * (1 + (skillLevel - 1) * settings.skill_upgrade_damage_per_level) * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
						const armorReduction = armorDamageReduction((armorPower + (hasWingBonus(target) ? settings.wing_defense_bonus : 0))*colRuneFactor(target,'defense'), "pvp");
						const attackBlocked = attackIsBlocked((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("attack_block") + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_block"), pvpRolls.block);
						const directDamage = attackBlocked ? 0 : Math.max(1, Math.round(baseRaw * (1 + strongPlayers / 100) * (1 - armorReduction) * (1 - classDefense / 100) * (1 - resistantPlayers / 100)*(target.special_guard_until_ms>nowMs?1-(colSpec456(target.role,target.specialization,settings)?.guard??0):1)));
						const firePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("fire");
						const icePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("ice");
						const fireDamage = !attackBlocked && firePercent ? Math.max(1, Math.round(directDamage * firePercent / 100)) : 0;
						const iceDamage = !attackBlocked && icePercent ? Math.max(1, Math.round(directDamage * icePercent / 100)) : 0;
						const totalDamage = directDamage + fireDamage + iceDamage;
						const wouldKill = target.hp <= totalDamage;
						if (player.area === "war" && (inWarSafeZone(player.x, player.y) || inWarSafeZone(target.x, target.y))) return rejectPvpAttack("Güvenli çemberde savaşılmaz.", 409);
						let pvpCooldownAccepted = wouldKill ? pvpCooldownStatement.first() : null;
						if (wouldKill && !pvpCooldownAccepted) {
							if (ability === 0) {
								deliverRealtime(publishPvpAttackRejection());
								return rejectBasicAttackCadence(cooldownMs);
							}
							return rejectPvpAttack("Yetenek henüz hazır değil.", 429);
						}
						timing.mark("pvp_validation");
						const targetUpdate = isArena ? database.prepare(`${wouldKill ? "WITH before_gems479 AS MATERIALIZED (SELECT gems AS before_gems FROM players WHERE id=?) " : ""}UPDATE players SET ${wouldKill ? "gems=CASE WHEN loadlab_run_id='' AND area NOT GLOB 'sis_*' AND area!='guild_castle' THEN (SELECT before_gems FROM before_gems479)-CAST((SELECT before_gems FROM before_gems479)/20 AS INTEGER) ELSE gems END," : ""}hp = MAX(0, hp - ?), hp_revision = hp_revision + 1,
            respawn_at_ms = CASE WHEN hp - ? <= 0 THEN ? ELSE 0 END, last_monster_hit_at = ?,
            combat_lock_until_ms = MAX(combat_lock_until_ms, ?)
           WHERE id = ? AND hp > 0 AND hp_revision = ? ${wouldKill ? "" : "AND changes() = 1"} AND area = 'arena' AND arena_match_id = ?
             AND realtime_scope_version = ?
             AND (area!='war' OR (x-1800)*(x-1800)/202500.0+(y-996)*(y-996)/116964.0>1)
             AND EXISTS (SELECT 1 FROM players live_attacker
               WHERE live_attacker.id = ? AND live_attacker.hp > 0 AND live_attacker.area = 'arena'
                 AND live_attacker.channel = ? AND live_attacker.arena_match_id = ?
                 AND NOT EXISTS(SELECT 1 FROM party_members party_actor497 JOIN party_members party_peer497 ON party_peer497.party_id=party_actor497.party_id WHERE party_actor497.player_id=live_attacker.id AND party_peer497.player_id=players.id)
 AND live_attacker.realtime_scope_version = ? AND (live_attacker.area!='war' OR (live_attacker.x-1800)*(live_attacker.x-1800)/202500.0+(live_attacker.y-996)*(live_attacker.y-996)/116964.0>1))
             AND EXISTS (SELECT 1 FROM arena_matches m
               JOIN arena_match_players attacker ON attacker.match_id = m.id AND attacker.player_id = ?
               JOIN arena_match_players defender ON defender.match_id = m.id AND defender.player_id = ?
               WHERE m.id = ? AND m.status IN ('countdown','active') AND m.starts_at_ms <= ? AND attacker.team != defender.team
               AND (m.id NOT LIKE 'guild-%' OR m.starts_at_ms+600000 > CAST(unixepoch('subsec')*1000 AS INTEGER)))
           RETURNING hp, hp_revision, respawn_at_ms, gems${wouldKill ? ",CASE WHEN loadlab_run_id='' AND area NOT GLOB 'sis_*' AND area!='guild_castle' THEN (SELECT before_gems FROM before_gems479)-gems ELSE NULL END AS pvp_gems_lost479" : ""}`).bind(...(wouldKill?[target.id]:[]),totalDamage, totalDamage, nowMs + settings.pvp_respawn_seconds * 1e3, nowMs, nowMs + 5e3, target.id, target.hp_revision, arenaMatchId, target.realtime_scope_version, playerId, player.channel, arenaMatchId, player.realtime_scope_version, playerId, target.id, arenaMatchId, nowMs) : database.prepare(`${wouldKill ? "WITH before_gems479 AS MATERIALIZED (SELECT gems AS before_gems FROM players WHERE id=?) " : ""}UPDATE players SET ${wouldKill ? "gems=CASE WHEN loadlab_run_id='' AND area NOT GLOB 'sis_*' AND area!='guild_castle' THEN (SELECT before_gems FROM before_gems479)-CAST((SELECT before_gems FROM before_gems479)/20 AS INTEGER) ELSE gems END," : ""}hp = MAX(0, hp - ?), hp_revision = hp_revision + 1,
            respawn_at_ms = CASE WHEN hp - ? <= 0 THEN ? ELSE 0 END, last_monster_hit_at = ?,
            combat_lock_until_ms = MAX(combat_lock_until_ms, ?)
           WHERE id = ? AND hp > 0 AND hp_revision = ? ${wouldKill ? "" : "AND changes() = 1"} AND area = ? AND channel = ?
             AND realtime_scope_version = ?
             AND (area!='war' OR (x-1800)*(x-1800)/202500.0+(y-996)*(y-996)/116964.0>1)
             AND EXISTS (SELECT 1 FROM players live_attacker
               WHERE live_attacker.id = ? AND live_attacker.hp > 0 AND live_attacker.area = ?
                 AND live_attacker.channel = ? AND live_attacker.arena_match_id = ''
                 AND NOT EXISTS(SELECT 1 FROM party_members party_actor497 JOIN party_members party_peer497 ON party_peer497.party_id=party_actor497.party_id WHERE party_actor497.player_id=live_attacker.id AND party_peer497.player_id=players.id)
 AND live_attacker.realtime_scope_version = ? AND (live_attacker.area!='war' OR (live_attacker.x-1800)*(live_attacker.x-1800)/202500.0+(live_attacker.y-996)*(live_attacker.y-996)/116964.0>1))
           RETURNING hp, hp_revision, respawn_at_ms, gems${wouldKill ? ",CASE WHEN loadlab_run_id='' AND area NOT GLOB 'sis_*' AND area!='guild_castle' THEN (SELECT before_gems FROM before_gems479)-gems ELSE NULL END AS pvp_gems_lost479" : ""}`).bind(...(wouldKill?[target.id]:[]),totalDamage, totalDamage, nowMs + settings.pvp_respawn_seconds * 1e3, nowMs, nowMs + 5e3, target.id, target.hp_revision, player.area, player.channel, target.realtime_scope_version, playerId, player.area, player.channel, player.realtime_scope_version);
						const eventInsert = isArena ? database.prepare(`INSERT INTO combat_events (player_id, target_id, role, ability, created_at)
           SELECT ?, ?, ?, ?, ? WHERE ${wouldKill ? "1" : "changes() = 1"} AND EXISTS (
             SELECT 1 FROM players WHERE id = ? AND hp_revision = ? AND area = 'arena' AND arena_match_id = ?
           )`).bind(playerId, target.id, player.role, ability, nowMs, target.id, target.hp_revision + 1, arenaMatchId) : database.prepare(`INSERT INTO combat_events (player_id, target_id, role, ability, created_at)
           SELECT ?, ?, ?, ?, ? WHERE ${wouldKill ? "1" : "changes() = 1"} AND EXISTS (
             SELECT 1 FROM players WHERE id = ? AND hp_revision = ? AND area = ? AND channel = ?
           )`).bind(playerId, target.id, player.role, ability, nowMs, target.id, target.hp_revision + 1, player.area, player.channel);
						const killClaimId = isArena ? crypto.randomUUID() : "";
						const scoringTeam = arenaMatch?.attacker_team === 2 ? 2 : 1;
						const arenaScoreWrites = isArena && arenaMatch && wouldKill ? [
							database.prepare(`INSERT INTO arena_kill_claims (id, match_id, killer_id, victim_id, victim_hp_revision, created_at_ms)
           SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (
             SELECT 1 FROM players victim WHERE victim.id = ? AND victim.hp = 0
               AND victim.hp_revision = ? AND victim.area = 'arena' AND victim.arena_match_id = ?
           ) AND EXISTS (
             SELECT 1 FROM arena_matches m
             JOIN arena_match_players attacker ON attacker.match_id = m.id AND attacker.player_id = ?
             JOIN arena_match_players defender ON defender.match_id = m.id AND defender.player_id = ?
             WHERE m.id = ? AND m.status IN ('countdown','active') AND m.starts_at_ms <= ?
               AND attacker.team != defender.team
           ) ON CONFLICT(match_id, victim_id, victim_hp_revision) DO NOTHING RETURNING id`).bind(killClaimId, arenaMatchId, playerId, target.id, target.hp_revision + 1, nowMs, target.id, target.hp_revision + 1, arenaMatchId, playerId, target.id, arenaMatchId, nowMs),
							database.prepare(`UPDATE arena_match_players SET kills = kills + 1 WHERE match_id = ? AND player_id = ?
           AND EXISTS (SELECT 1 FROM arena_kill_claims WHERE id = ?)`).bind(arenaMatchId, playerId, killClaimId),
							database.prepare(`UPDATE arena_match_players SET deaths = deaths + 1 WHERE match_id = ? AND player_id = ?
           AND EXISTS (SELECT 1 FROM arena_kill_claims WHERE id = ?)`).bind(arenaMatchId, target.id, killClaimId),
							database.prepare(`UPDATE arena_matches SET
             team_a_score = team_a_score + CASE WHEN ? = 1 THEN 1 ELSE 0 END,
             team_b_score = team_b_score + CASE WHEN ? = 2 THEN 1 ELSE 0 END,
             status = CASE WHEN (CASE WHEN ? = 1 THEN team_a_score + 1 ELSE team_b_score + 1 END) >= kill_target THEN 'finished' ELSE 'active' END,
             winner_team = CASE WHEN (CASE WHEN ? = 1 THEN team_a_score + 1 ELSE team_b_score + 1 END) >= kill_target THEN ? ELSE 0 END,
             finished_at_ms = CASE WHEN (CASE WHEN ? = 1 THEN team_a_score + 1 ELSE team_b_score + 1 END) >= kill_target THEN ? ELSE 0 END,
             updated_at_ms = ?
           WHERE id = ? AND status IN ('countdown','active') AND starts_at_ms <= ?
             AND EXISTS (SELECT 1 FROM arena_kill_claims WHERE id = ?)
             AND ${arenaRoundReady498(scoringTeam)}
           RETURNING *`).bind(scoringTeam, scoringTeam, scoringTeam, scoringTeam, scoringTeam, scoringTeam, nowMs, nowMs, arenaMatchId, nowMs, killClaimId)
						] : [];
						const warKillClaimId = isArena ? "" : crypto.randomUUID();
						const warRewardToken = isArena ? "" : crypto.randomUUID();
						const warEconomyWrites = player.area === "war" && wouldKill ? [
							database.prepare(`INSERT INTO war_kill_claims (id, killer_id, victim_id, victim_hp_revision, created_at_ms)
           SELECT ?, ?, ?, ?, ? WHERE EXISTS (
             SELECT 1 FROM players victim WHERE victim.id = ? AND victim.hp = 0
               AND victim.hp_revision = ? AND victim.area = 'war' AND victim.channel = ?
           )
           ON CONFLICT(victim_id, victim_hp_revision) DO NOTHING RETURNING id`).bind(warKillClaimId, playerId, target.id, target.hp_revision + 1, nowMs, target.id, target.hp_revision + 1, player.channel),
							database.prepare(`INSERT INTO pvp_reward_cooldowns (player_id, reward_scope, last_awarded_at_ms, claim_token)
           SELECT claim.killer_id, 'war_kill:' || claim.victim_id, ?, ? FROM war_kill_claims claim
           JOIN players killer ON killer.id = claim.killer_id
           JOIN players victim ON victim.id = claim.victim_id
           WHERE claim.id = ? AND claim.killer_id = ? AND ? > 0
             AND killer.level >= 5 AND victim.level >= 5
             AND NOT EXISTS (SELECT 1 FROM war_kill_claims reciprocal
               WHERE reciprocal.killer_id = claim.victim_id AND reciprocal.victim_id = claim.killer_id
                 AND reciprocal.created_at_ms >= ?)
           ON CONFLICT(player_id, reward_scope) DO UPDATE SET
             last_awarded_at_ms = excluded.last_awarded_at_ms,
             claim_token = excluded.claim_token
           WHERE pvp_reward_cooldowns.last_awarded_at_ms <= excluded.last_awarded_at_ms - ?
           RETURNING last_awarded_at_ms`).bind(nowMs, warRewardToken, warKillClaimId, playerId, settings.pvp_kill_reward_gems, nowMs - 360 * 6e4, PVP_REWARD_COOLDOWN_MS),
							database.prepare(`UPDATE players SET gems = gems + CASE WHEN EXISTS (
             SELECT 1 FROM pvp_reward_cooldowns
             WHERE player_id = ? AND reward_scope LIKE 'war_kill:%' AND claim_token = ?
           ) THEN ? ELSE 0 END
           WHERE id = ? AND EXISTS (SELECT 1 FROM war_kill_claims WHERE id = ? AND killer_id = ?)
           RETURNING gems`).bind(playerId, warRewardToken, settings.pvp_kill_reward_gems, playerId, warKillClaimId, playerId),
							database.prepare(`SELECT gems FROM players WHERE id = ? AND EXISTS (SELECT 1 FROM war_kill_claims WHERE id = ? AND victim_id = ?)`).bind(target.id, warKillClaimId, target.id),
							database.prepare(`SELECT last_awarded_at_ms + ? AS reward_available_at_ms
           FROM pvp_reward_cooldowns
           WHERE player_id = ? AND reward_scope = 'war_kill:' || ?
             AND EXISTS (SELECT 1 FROM war_kill_claims WHERE id = ?)`).bind(PVP_REWARD_COOLDOWN_MS, playerId, target.id, warKillClaimId)
						] : [];
						colLabTagWarReward(warEconomyWrites,player,target);
                        const mutationStatements = [
							targetUpdate,
							eventInsert,
							...arenaScoreWrites,
							...warEconomyWrites
						];
						const batchWrites = database.batch(wouldKill ? mutationStatements : [pvpCooldownStatement, ...mutationStatements]);
						const attackWrites = wouldKill ? batchWrites : batchWrites.slice(1);
						if (!wouldKill) {
							pvpCooldownAccepted = batchWrites[0].results[0] ?? null;
							if (!pvpCooldownAccepted) {
								if (ability === 0) {
									deliverRealtime(publishPvpAttackRejection());
									return rejectBasicAttackCadence(cooldownMs);
								}
								return rejectPvpAttack("Yetenek henüz hazır değil.", 429);
							}
						}
						const reservedUntilMs = Number(pvpCooldownAccepted.reserved_until);
						timing.mark("pvp_commit");
						const updated = attackWrites[0].results[0];
						if (!updated) {
							database.prepare(`UPDATE players SET ${attackColumn} = ? WHERE id = ? AND ${attackColumn} = ?`).bind(reservedUntilMs - cooldownMs, playerId, reservedUntilMs).run();
							if (attempt < 2) {
								const fresh = readActionSnapshot(database, payload, playerId);
								if (pvpContinuity(fresh)) {
									if (fresh.player) fresh.player.pet_kind = (database.prepare("SELECT kind FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped=1 LIMIT 1").bind(playerId).first())?.kind ?? null;
									currentPvpSnapshot = fresh;
									continue;
								}
							}
							return rejectPvpAttack("Hedefin durumu değişti; hedefi yeniden seç.", 409);
						}
						releasePvpCommit();
						const impactAtMs = Date.now();
						const guardianEffect = (attackBlocked ? null : ability===3&&branch456?.effect==='root'?colTrapImpact456(database,player,target,'player',branch456,impactAtMs,intentId):applyGuardianImpact(database, player, ability, target, "player", impactAtMs)) ?? guardianCastVisual({
							...player,
							x: attacker.x,
							y: attacker.y
						}, ability, target, "player", impactAtMs);
						if (guardianEffect && intentId) Object.assign(guardianEffect, { intentId });
						if (guardianEffect) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, guardianEffect, arenaMatchId || void 0));
						const lifeSteal = restoreStolenLife(database, playerId, lifeStealAmount(Math.min(totalDamage, target.hp), enchantmentTotal(equippedEnchantItems(player), "life_steal")));
						if (lifeSteal) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
							type: "player_state",
							eventId: crypto.randomUUID(),
							targetId: playerId,
							hp: lifeSteal.hp,
							hpRevision: lifeSteal.hp_revision,
							maxHp: lifeSteal.max_hp,
							serverAt: nowMs
						}, arenaMatchId || void 0));
						let attackerGems = player.gems;
						const pvpGemsLost479=updated.pvp_gems_lost479??null;
						let targetGems = updated.gems;
						let responseHp = updated.hp;
						let responseHpRevision = updated.hp_revision;
						let responseRespawnAtMs = updated.respawn_at_ms;
						const killed = updated.hp <= 0;
						let scoredMatch = isArena ? attackWrites[5]?.results[0] ?? null : null;
if(scoredMatch&&scoredMatch.status!=="finished"&&!arenaMatchId.startsWith("guild-")){scoredMatch=database.prepare("SELECT * FROM arena_matches WHERE id=?").bind(arenaMatchId).first();const resetRows=(database.prepare("SELECT id,hp,max_hp,hp_revision,respawn_at_ms FROM players WHERE arena_match_id=?").bind(arenaMatchId).all()).results;for(const reset of resetRows){if(reset.id===target.id){responseHp=reset.hp;responseHpRevision=reset.hp_revision;responseRespawnAtMs=0;}deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,"arena",{type:"player_state",eventId:crypto.randomUUID(),targetId:reset.id,hp:reset.hp,hpRevision:reset.hp_revision,maxHp:reset.max_hp,serverAt:nowMs},arenaMatchId));}}
						const warBaseIndex = 2 + arenaScoreWrites.length;
						let warRewardGranted = false;
						let warRewardAvailableAtMs = 0;
						if (player.area === "war" && killed) {
							warRewardGranted = Boolean(attackWrites[warBaseIndex + 1]?.results[0]);
							attackerGems = Number((attackWrites[warBaseIndex + 2]?.results[0])?.gems ?? attackerGems);
							targetGems = Number((attackWrites[warBaseIndex + 3]?.results[0])?.gems ?? targetGems);
							warRewardAvailableAtMs = Number((attackWrites[warBaseIndex + 4]?.results[0])?.reward_available_at_ms ?? 0);
						}
						let matchFinished = false;
						if (killed && isArena && scoredMatch) {
							if (scoredMatch?.status === "finished") {
								matchFinished = settleArenaMatch(database, scoredMatch, nowMs);
								if (matchFinished) {
									const balances = database.batch([database.prepare("SELECT gems FROM players WHERE id = ?").bind(playerId), database.prepare("SELECT gems, hp, hp_revision, respawn_at_ms FROM players WHERE id = ?").bind(target.id)]);
									attackerGems = Number(balances[0].results[0]?.gems ?? attackerGems);
									const settledTarget = balances[1].results[0];
									targetGems = Number(settledTarget?.gems ?? targetGems);
									responseHp = Number(settledTarget?.hp ?? responseHp);
									responseHpRevision = Number(settledTarget?.hp_revision ?? responseHpRevision);
									responseRespawnAtMs = Number(settledTarget?.respawn_at_ms ?? 0);
								}
							}
						}
						if (!matchFinished) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
							type: "pvp_result",
							eventId: `pvp:${nowMs}:${playerId}:${target.id}`,
							intentId,
							attackerId: playerId,
							targetId: target.id,
							ability,
							damage: totalDamage,
							attackBlocked,
							hp: responseHp,
							hpRevision: responseHpRevision,
							respawnAtMs: responseRespawnAtMs,
							killed,
							critical,
							attackerGems,
							targetGems,pvpGemsLost479,
							__combatAudit: intentId && !attackBlocked ? {
								v: 1,
								intentId,
								attacker: {
									id: playerId,
									hp: player.hp,
									revision: player.hp_revision,
									scopeVersion: player.realtime_scope_version
								},
								target: {
									id: target.id,
									hp: target.hp,
									revision: target.hp_revision,
									scopeVersion: target.realtime_scope_version
								},
								rolls: {
									critical: criticalRoll,
									spread: spreadRoll
								},
								rules: {
									roleBase,
									weaponPower,
									wingAttack: hasWingBonus(player) ? settings.wing_attack_bonus : 0,
									multiplier,
									skillGrowth: 1 + (skillLevel - 1) * settings.skill_upgrade_damage_per_level,
									scale: settings.skill_damage_scale,
									criticalChance,
									criticalMultiplier: colCriticalMultiplier491(settings.critical_damage_multiplier,player),
									strongPlayers,
									armorReduction,
									classDefense,
									resistantPlayers,
									firePercent,
									icePercent
								}
							} : void 0,
							...player.area === "war" && killed ? {
								rewardGranted: warRewardGranted,
								rewardGems: warRewardGranted ? settings.pvp_kill_reward_gems : 0,
								rewardAvailableAtMs: warRewardAvailableAtMs
							} : {},
							...scoredMatch ? {
								arenaMatchId,
								teamAScore: scoredMatch.team_a_score,
								teamBScore: scoredMatch.team_b_score,
								killTarget: scoredMatch.kill_target
							} : {},
							serverAt: nowMs
						}, arenaMatchId || void 0));
						if (matchFinished && scoredMatch) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, "arena", {
							type: "arena_match_finished",
							eventId: `arena-finished:${arenaMatchId}`,
							matchId: arenaMatchId,
							mode: scoredMatch.mode,
							winnerTeam: scoredMatch.winner_team,
							teamAName: scoredMatch.team_a_name,
							teamBName: scoredMatch.team_b_name,
							teamAScore: scoredMatch.team_a_score,
							teamBScore: scoredMatch.team_b_score,
							rewardGems: scoredMatch.reward_gems,
							serverAt: nowMs
						}, arenaMatchId));
						colNotifyPvpGemLoss479(player,updated,target.id,updated.hp_revision,nowMs);
						const arenaScoreMessage = scoredMatch ? `${target.name} yenildi · ${scoredMatch.team_a_name} ${scoredMatch.team_a_score}-${scoredMatch.team_b_score} ${scoredMatch.team_b_name}` : "";
						return Response.json({
							ok: true,
							guardianEffect,
							lifeSteal,
							targetId: target.id,
							targetName: target.name,
							damage: totalDamage,
							directDamage,
							attackBlocked,
							hp: responseHp,
							hpRevision: responseHpRevision,
							respawnAtMs: responseRespawnAtMs,
							killed,
							critical,
							attackerGems,
							targetGems,pvpGemsLost479,
							...ability === 0 ? { nextAttackAtMs: reservedUntilMs } : { cooldownRemainingMs: Math.max(0, reservedUntilMs - Date.now()) },
							...player.area === "war" && killed ? {
								rewardGranted: warRewardGranted,
								rewardGems: warRewardGranted ? settings.pvp_kill_reward_gems : 0,
								rewardAvailableAtMs: warRewardAvailableAtMs
							} : {},
							matchFinished,
							...scoredMatch ? { arenaMatch: {
								id: arenaMatchId,
								teamAScore: scoredMatch.team_a_score,
								teamBScore: scoredMatch.team_b_score,
								killTarget: scoredMatch.kill_target,
								winnerTeam: scoredMatch.winner_team
							} } : {},
							elemental: [...fireDamage ? [{
								kind: "fire",
								damage: fireDamage
							}] : [], ...iceDamage ? [{
								kind: "ice",
								damage: iceDamage
							}] : []],
							tickCount: settings.elemental_tick_count,
							tickIntervalMs: settings.elemental_tick_interval_ms,
							message: attackBlocked ? `${target.name} saldırını blokladı!` : (isMistArea(player.area) || player.area === "black" || player.area === "rune_v2") && killed ? `${target.name} yenildi.` : isArena ? matchFinished && scoredMatch ? `${scoredMatch.winner_team === 1 ? scoredMatch.team_a_name : scoredMatch.team_b_name} Arena savaşını kazandı!` : killed ? arenaScoreMessage : `${target.name}: ${totalDamage} hasar.` : killed ? settings.pvp_kill_reward_gems <= 0 ? `${target.name} yenildi · Savaş Meydanı ödülü yönetici tarafından kapalı` : warRewardGranted ? `${target.name} yenildi · +${settings.pvp_kill_reward_gems} Mücevher · yeni ödül 30 dakika sonra` : `${target.name} yenildi · savaş devam ediyor · ödül hakkına ${Math.max(1, Math.ceil((warRewardAvailableAtMs - nowMs) / 6e4))} dakika kaldı` : `${target.name}: ${totalDamage} hasar${classDefense ? ` · %${classDefense} ${defenseKind === "arrow_defense" ? "ok" : defenseKind === "magic_defense" ? "büyü" : "kılıç"} savunması` : ""}${resistantPlayers ? ` · %${resistantPlayers} oyuncu savunması` : ""}.`
						});
					}
					return Response.json({ error: "Hedefin durumu değişti; yeniden dene." }, { status: 409 });
				}
 function memoryPvp(port,context){const {actionSnapshot,playerId,payload,requestReceivedAtMs}=context;
					let currentPvpSnapshot = actionSnapshot;
					const pvpRolls = {
						critical: Math.random(),
						spread: Math.random(),
						block: Math.random()
					};
					for (let attempt = 0; attempt < 3; attempt++) {
						const { player, settings, preloadedPvpTarget, preloadedPvpArena, pvpTargetId } = currentPvpSnapshot;
						if (!player) return Response.json({ error: "Karakter artık mevcut değil." }, { status: 409 });
						const control = port.control(playerId,pvpTargetId);
						if (player.role === "muhafiz" && Number(payload.ability) === 2 && Number(control?.root_until_ms) > Date.now()) return Response.json({ error: "Sabitlenmişken hamle yapamazsın." }, { status: 409 });
						if (Number(control?.stun_until_ms) > Date.now()) return Response.json({
							error: "Sersemletildin; kısa süre sonra saldırabilirsin.",
							code: "combat_stunned"
						}, { status: 409 });
						const arenaMatchId = player.area === "arena" ? player.arena_match_id : "";
						const isArena = Boolean(arenaMatchId);
						const targetPlayerId = pvpTargetId;
						const target = preloadedPvpTarget;
						const intentId = typeof payload.intentId === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(payload.intentId) ? payload.intentId : void 0;
						const publishPvpAttackRejection =  () => {
							releasePvpCommit();
							if (!intentId || !targetPlayerId) return;
							const rejectedAt = Date.now();
							publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
								type: "pvp_reject",
								eventId: `pvp-reject:${intentId}:${rejectedAt}`,
								intentId,
								attackerId: playerId,
								targetId: targetPlayerId,
								...target ? {
									hp: target.hp,
									hpRevision: target.hp_revision,
									respawnAtMs: target.respawn_at_ms
								} : {},
								serverAt: rejectedAt
							}, arenaMatchId || void 0);
						};
						const rejectPvpAttack =  (error, status) => {
							deliverRealtime(publishPvpAttackRejection());
							return Response.json({ error }, { status });
						};
						if(player.area===CASTLE_AREA&&!globalThis.__colCastle?.mayDamage(player,target,Date.now()))return rejectPvpAttack("Kalede yalnız savaş saatinde rakip loncaya saldırabilirsin.",423);
if (player.area!==CASTLE_AREA&&control?.same_party497) return rejectPvpAttack("Parti arkadaşına saldıramazsın.", 400);
if (!pvpContinuity(currentPvpSnapshot)) return rejectPvpAttack("Savaş alanı veya hedefin durumu değişti; hedefi yeniden seç.", 409);
						if (player.area!==CASTLE_AREA && !isMistArea(player.area) && player.area !== "war" && player.area !== "black" && player.area !== "rune_v2" && !isArena) return rejectPvpAttack("Oyuncularla Savaş Meydanı, Kara Bölge veya Arena'da savaşabilirsin.", 400);
						if (player.rod_equipped) return rejectPvpAttack("Savaşmak için bir silah kuşanmalısın.", 400);
						const attacker = player;
						if (!targetPlayerId || targetPlayerId === playerId) return rejectPvpAttack("Geçerli bir rakip seç.", 400);
						if (!target) return rejectPvpAttack("Rakip artık savaş alanında değil.", 409);
                        if(!colLabMayAffectPlayer(player,target))return rejectPvpAttack("Test karakterleri yalnız kendi test grubuyla savaşabilir.",403);
						let nowMs = Date.now();
						let arenaMatch = null;
						if (isArena) {
							arenaMatch = preloadedPvpArena?.id === arenaMatchId ? preloadedPvpArena : null;
							if (!arenaMatch || arenaMatch.status !== "countdown" && arenaMatch.status !== "active") return rejectPvpAttack("Arena maçı sona erdi.", 409);
							if (arenaMatch.attacker_team === arenaMatch.target_team) return rejectPvpAttack("Takım arkadaşına saldıramazsın.", 400);
							nowMs = Date.now();
							if (nowMs < arenaMatch.starts_at_ms) return rejectPvpAttack("Geri sayım bitmeden saldırı yapılamaz.", 423);
						}
						const ability = clamp$1(Math.floor(Number(payload.ability) || 0), 0, 3);
						const branch456=ability===3?colSpec456(player.role,player.specialization,settings):null;
 if(ability===3&&(!branch456||['heal','guard'].includes(branch456.effect)||!Number.isInteger(Number(payload.ability))||Number(payload.ability)!==3))return Response.json({error:'Uzmanlık saldırısı açık değil.'},{status:409});
 const unlockLevel=ability===3?30:ability===0?1:ability===1?settings.skill_two_unlock_level:settings.skill_three_unlock_level;
						if (player.level < unlockLevel) return rejectPvpAttack(`Bu yetenek ${unlockLevel}. seviyede açılır.`, 400);
						const attackRange = player.role === "muhafiz" ? ability === 1 ? 720 : ability === 2 ? 600 : 190 : player.role === "avci" ? 500 : 470;
						if (player.role === "muhafiz" && ability > 0 && !isAreaWalkableSegment(player.area, attacker.x, attacker.y, target.x, target.y)) return rejectPvpAttack("Hedef ile aranda engel var.", 400);
						if (distance(attacker, target) > attackRange + (player.role === "muhafiz" && ability > 0 ? 0 : 95)) return rejectPvpAttack("Rakip menzil dışında.", 400);
						const attackColumn=ability===3?"attack_four_at":ability===0?"attack_one_at":ability===1?"attack_two_at":"attack_three_at";
						const attackerGear = equippedEnchantItems(player);
						let enchantmentTotals473_attackerGear;
						const baseCooldownMs=ability===3?branch456.cooldown:ability===0?650:ability===1?settings.skill_two_cooldown_ms:settings.skill_three_cooldown_ms;
						const cooldownMs = ability === 0 ? effectiveAttackCooldownMs(baseCooldownMs, (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("attack_speed") + (player.set_speed ?? 0)) : effectiveSkillCooldown444(baseCooldownMs, Math.min(50,(enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("cast_speed")+(player.jewelry_cast_speed||0)));
						const cooldownGraceMs = ability === 0 ? 220 : 0;
						const cooldownAtMs = requestReceivedAtMs;
/* V472: only the existing Avci/Arkanist third-skill circle. One durable cast. */
if (ability === 2 && (player.role === "avci" || player.role === "arkanist")) {
  const areaLimit472 = 29, center472 = target;
  if (player.area === "war" && (inWarSafeZone(player.x, player.y) || inWarSafeZone(target.x, target.y))) return rejectPvpAttack("Güvenli çemberde savaşılmaz.", 409);
  const areaRows472 = port.targets(player,target,nowMs,arenaMatchId);
  const rejectArea472=(error, code)=>{
    const response=rejectPvpAttack(error,409);
    return Response.json({...(response.json()),code},{status:409,headers:response.headers});
  };
  if (!areaRows472.length || areaRows472[0].id !== target.id) return rejectArea472("Hedefin durumu değişti; hedefi yeniden seç.", "pvp_area_primary_unavailable");
  const primary472=areaRows472[0];
  if (!samePvpActorScope(target,primary472)) return rejectArea472("Hedefin savaş alanı değişti; hedefi yeniden seç.", "pvp_area_primary_scope_changed");
  if (primary472.hp_revision !== target.hp_revision && !pvpContinuity({...currentPvpSnapshot,preloadedPvpTarget:primary472})) return rejectArea472("Hedefin yaşamı değişti; hedefi yeniden seç.", "pvp_area_primary_life_changed");
  const castGuild472=guildBuff(player.id),castPremium472=premiumBuff(player.id);
  const castRanks472=new Map((rankService()?.project([{id:playerId},...areaRows472.map(p=>({id:p.id}))],playerId)??[]).map(p=>[p.id,p.rank?.bonuses]));
  const areaRolls472=pvpRolls;
  const plans472 = areaRows472.map((target, index) => {
    const pvpRolls = { ...areaRolls472, block: index === 0 ? areaRolls472.block : Math.random() };
    const defenderGear = equippedEnchantItems(target);
    let enchantmentTotals473_defenderGear;
						const roleBase = (player.role === "arkanist" ? settings.arcanist_base_attack : player.role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack) + castGuild472.attack + castPremium472.attack + (player.set_attack??0);
						const weaponPower = player.equipped_weapon_power + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_attack");
						const armorPower = target.equipped_armor_power + (target.jewelry_defense||0) + (target.role==='muhafiz'?10:0) + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_defense") + (castRanks472.get(target.id)?.defense??0);
						const skillLevel = [
							player.skill_one,
							player.skill_two,
							player.skill_three,player.skill_four
						][ability];
						const multiplier = [
							settings.skill_one_multiplier,
							settings.skill_two_multiplier,
							settings.skill_three_multiplier,branch456?.multiplier??1
						][ability];
						const criticalChance = clamp$1(settings.base_critical_chance + (ability === 2 ? settings.third_skill_critical_bonus : 0) + (hasWingBonus(player) ? settings.wing_critical_chance : 0) + ((enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("critical") + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_critical")) / 100, 0, .95);
						const criticalRoll = pvpRolls.critical;
						const critical = criticalRoll < criticalChance;
						const strongPlayers = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("strong_players") + ((player.jewelry_pvp||0)+(player.belt_pvp_r31||0)) + (player.pet_kind === "dragon" ? 10 : 0) + (castRanks472.get(player.id)?.pvp??0) + (player.set_pvp ?? 0);
						const defenderDragon = port.dragon(target.id);
						const resistantPlayers = clamp$1((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("resistant_players") + (target.jewelry_resist||0) + (target.set_resistance ?? 0) + (defenderDragon ? 10 : 0), 0, 90);
						const defenseKind = player.role === "avci" ? "arrow_defense" : player.role === "arkanist" ? "magic_defense" : "sword_defense";
						const classDefense = (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))(defenseKind);
						const spreadRoll = pvpRolls.spread;
						const baseRaw = Math.max(1, Math.floor(colRuneFactor(player,'attack')*(roleBase + weaponPower + (hasWingBonus(player) ? settings.wing_attack_bonus : 0) + (player.pet_kind === "dog" ? 0 : player.pet_kind === "dragon" ? 45 : player.pet_kind === "starter" ? 10 : player.pet_kind ? 20 : 0) + spreadRoll * 7) * multiplier * (1 + (skillLevel - 1) * settings.skill_upgrade_damage_per_level) * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
						const armorReduction = armorDamageReduction((armorPower + (hasWingBonus(target) ? settings.wing_defense_bonus : 0))*colRuneFactor(target,'defense'), "pvp");
						const attackBlocked = attackIsBlocked((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("attack_block") + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_block"), pvpRolls.block);
						const directDamage = attackBlocked ? 0 : Math.max(1, Math.round(baseRaw * (1 + strongPlayers / 100) * (1 - armorReduction) * (1 - classDefense / 100) * (1 - resistantPlayers / 100)*(target.special_guard_until_ms>nowMs?1-(colSpec456(target.role,target.specialization,settings)?.guard??0):1)));
						const firePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("fire");
						const icePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("ice");
						const fireDamage = !attackBlocked && firePercent ? Math.max(1, Math.round(directDamage * firePercent / 100)) : 0;
						const iceDamage = !attackBlocked && icePercent ? Math.max(1, Math.round(directDamage * icePercent / 100)) : 0;
						const totalDamage = directDamage + fireDamage + iceDamage;
						const wouldKill = port.predictNonlethal(target,totalDamage);
						
						const killClaimId = isArena ? crypto.randomUUID() : "";
						const scoringTeam = arenaMatch?.attacker_team === 2 ? 2 : 1;
						const arenaScoreWrites = [];
						const warKillClaimId = isArena ? "" : crypto.randomUUID();
						const warRewardToken = isArena ? "" : crypto.randomUUID();
						const warEconomyWrites = [];
						
colLabTagWarReward(warEconomyWrites,player,target);
return {target,arenaScoreWrites,warEconomyWrites,killClaimId,totalDamage,directDamage,fireDamage,iceDamage,attackBlocked,critical,wouldKill,criticalRoll,spreadRoll,roleBase,weaponPower,multiplier,skillLevel,criticalChance,strongPlayers,armorReduction,classDefense,resistantPlayers,firePercent,icePercent};

  });
if(isMistArea(player.area)||player.area==='black'||player.area==='rune_v2'){
  const mixedCenter473={kind:'player',id:target.id,x:center472.x,y:center472.y};
  const mixedTargets473=selectMixedMonsters473(player,mixedCenter473,null,payload,nowMs);
  if(mixedTargets473.length){
   if(typeof port.mixedAttack!=='function')return rejectPvpAttack('Alan saldırısı için oyun sunucusuna yeniden bağlan.',503);
   return runMixedBlack473({player,settings,center473:mixedCenter473,monster:mixedTargets473[0],targets:mixedTargets473,playerPlans473:plans472,rolls473:pvpRolls,nowMs,cooldownAtMs,cooldownMs,intentId,reject473:rejectPvpAttack});
  }
 }
  const victims472 = JSON.stringify(plans472.map(({target:t})=>({id:t.id,hp:t.hp,revision:t.hp_revision,scope:t.realtime_scope_version})));
  const areaGuard472 = port.areaPlan({player,target,plans:plans472,attackRange,cooldownAtMs,cooldownMs,nowMs});
  // The all-victim guard proves every row before either statement runs.
  // UPDATE/INSERT triggers still report each changed player/event key.
  // Keep scope predicates correlated so SQLite probes the bounded target IDs by PK.
  const damageRows472 = JSON.stringify(plans472.map(p=>({id:p.target.id,damage:p.totalDamage,revision:p.target.hp_revision,scope:p.target.realtime_scope_version})));
  const hasLethalGems479=plans472.some(p=>p.wouldKill);
 const targetUpdates472 = port.damagePlan(plans472,{player,nowMs,isArena,arenaMatchId});
  const eventInserts472 = port.eventsPlan(plans472,{player,ability,nowMs});
  const statements472 = [targetUpdates472,eventInserts472];
  // All lethal claims and statistics precede the ONE score write/round trigger.
  for (const p of plans472) statements472.push(...p.arenaScoreWrites.slice(0,3));
  const scoreIndex472 = statements472.length;
  const claimIds472 = plans472.filter(p=>p.arenaScoreWrites.length).map(p=>p.killClaimId);
  if(claimIds472.length)port.requiresWriter();
  for (const p of plans472) {p.warIndex472=statements472.length; statements472.push(...p.warEconomyWrites);}
  timing.mark("pvp_validation");
  const committed472=port.guardedBatch(areaGuard472,statements472);
  if (!committed472.guard.results.length) return rejectArea472("Hedef veya yetenek durumu değişti; yeniden dene.", "pvp_area_guard_changed");
  const updatedById472 = new Map(committed472.results[0].results.map((row)=>[row.id,row]));
  timing.mark("pvp_commit");
  releasePvpCommit();
  const reservedUntilMs472=Number(committed472.guard.results[0].reserved_until);
  let attackerGems472=player.gems;
  const hits472=plans472.map((p,index)=>{
    const updated=updatedById472.get(p.target.id);
    // Every UPDATE predicate is proved by the guard under the writer transaction.
    if(!updated)throw Error('pvp_area_commit_invariant');
    const reward=p.warEconomyWrites.length?committed472.results[p.warIndex472+1]?.results[0]:null;
    if(p.warEconomyWrites.length)attackerGems472=Number(committed472.results[p.warIndex472+2]?.results[0]?.gems??attackerGems472);
    return {targetId:p.target.id,targetName:p.target.name,damage:p.totalDamage,directDamage:p.directDamage,attackBlocked:p.attackBlocked,
      hp:updated.hp,hpRevision:updated.hp_revision,respawnAtMs:updated.respawn_at_ms,killed:updated.hp<=0,critical:p.critical,pvpGemsLost479:updated.pvp_gems_lost479??null,
      targetGems:Number((p.warEconomyWrites.length?committed472.results[p.warIndex472+3]?.results[0]?.gems:undefined)??updated.gems),
      elemental:[...(p.fireDamage?[{kind:'fire',damage:p.fireDamage}]:[]),...(p.iceDamage?[{kind:'ice',damage:p.iceDamage}]:[])],
      ...(p.warEconomyWrites.length?{rewardGranted:Boolean(reward),rewardGems:reward?settings.pvp_kill_reward_gems:0,
        rewardAvailableAtMs:Number(committed472.results[p.warIndex472+4]?.results[0]?.reward_available_at_ms??0)}:{})};
  });
  let scoredMatch472=claimIds472.length?committed472.results[scoreIndex472]?.results[0]??null:null;
  let matchFinished472=false;
  if(scoredMatch472?.status==='finished')port.requiresWriter();
  if(scoredMatch472)port.requiresWriter();
  const lifeSteal472=port.restoreLife(playerId,lifeStealAmount(plans472.reduce((sum,p)=>sum+Math.min(p.totalDamage,p.target.hp),0),(enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))('life_steal')));
  if(lifeSteal472)deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'player_state',eventId:crypto.randomUUID(),targetId:playerId,hp:lifeSteal472.hp,hpRevision:lifeSteal472.hp_revision,maxHp:lifeSteal472.max_hp,serverAt:nowMs},arenaMatchId||void 0));
  if(!matchFinished472)for(let index=0;index<hits472.length;index++){
    const hit=hits472[index],p=plans472[index];
    deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'pvp_result',eventId:`pvp:${nowMs}:${playerId}:${hit.targetId}`,intentId,primaryTargetId:target.id,attackerId:playerId,ability,...hit,attackerGems:attackerGems472,
      __combatAudit:intentId&&!p.attackBlocked?{v:1,intentId,attacker:{id:playerId,hp:player.hp,revision:player.hp_revision,scopeVersion:player.realtime_scope_version},
        target:{id:p.target.id,hp:p.target.hp,revision:p.target.hp_revision,scopeVersion:p.target.realtime_scope_version},rolls:{critical:p.criticalRoll,spread:p.spreadRoll},
        rules:{roleBase:p.roleBase,weaponPower:p.weaponPower,wingAttack:hasWingBonus(player)?settings.wing_attack_bonus:0,multiplier:p.multiplier,
          skillGrowth:1+(p.skillLevel-1)*settings.skill_upgrade_damage_per_level,scale:settings.skill_damage_scale,criticalChance:p.criticalChance,
          criticalMultiplier:colCriticalMultiplier491(settings.critical_damage_multiplier,player),strongPlayers:p.strongPlayers,armorReduction:p.armorReduction,classDefense:p.classDefense,
          resistantPlayers:p.resistantPlayers,firePercent:p.firePercent,icePercent:p.icePercent}}:void 0,
      ...(scoredMatch472?{arenaMatchId,teamAScore:scoredMatch472.team_a_score,teamBScore:scoredMatch472.team_b_score,killTarget:scoredMatch472.kill_target}:{}),serverAt:nowMs},arenaMatchId||void 0));
  }
  if(matchFinished472&&scoredMatch472)deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,'arena',{type:'arena_match_finished',eventId:`arena-finished:${arenaMatchId}`,matchId:arenaMatchId,mode:scoredMatch472.mode,winnerTeam:scoredMatch472.winner_team,teamAName:scoredMatch472.team_a_name,teamBName:scoredMatch472.team_b_name,teamAScore:scoredMatch472.team_a_score,teamBScore:scoredMatch472.team_b_score,rewardGems:scoredMatch472.reward_gems,serverAt:nowMs},arenaMatchId));
  for(const row479 of updatedById472.values())colNotifyPvpGemLoss479(player,row479,row479.id,row479.hp_revision,nowMs);
  return Response.json({ok:true,...hits472[0],hits:hits472,lifeSteal:lifeSteal472,attackerGems:attackerGems472,
    cooldownRemainingMs:Math.max(0,reservedUntilMs472-Date.now()),matchFinished:matchFinished472,
    ...(scoredMatch472?{arenaMatch:{id:arenaMatchId,teamAScore:scoredMatch472.team_a_score,teamBScore:scoredMatch472.team_b_score,killTarget:scoredMatch472.kill_target,winnerTeam:scoredMatch472.winner_team}}:{}),
    tickCount:settings.elemental_tick_count,tickIntervalMs:settings.elemental_tick_interval_ms,message:`${hits472.length} rakibe alan saldırısı.`});
}

						const pvpCooldownStatement = port.reservePlan({player,attackColumn,cooldownAtMs,cooldownMs,cooldownGraceMs,nowMs});
						const defenderGear = equippedEnchantItems(target);
						let enchantmentTotals473_defenderGear;
						const premium499=premiumBuff(player.id);
 const roleBase = (player.role === "arkanist" ? settings.arcanist_base_attack : player.role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack) + guildBuff(player.id).attack + premium499.attack + (player.set_attack??0);
						const weaponPower = player.equipped_weapon_power + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_attack");
						const armorPower = target.equipped_armor_power + (target.jewelry_defense||0) + (target.role==='muhafiz'?10:0) + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_defense") + serverRankBonuses(target.id).defense;
						const skillLevel = [
							player.skill_one,
							player.skill_two,
							player.skill_three,player.skill_four
						][ability];
						const multiplier = [
							settings.skill_one_multiplier,
							settings.skill_two_multiplier,
							settings.skill_three_multiplier,branch456?.multiplier??1
						][ability];
						const criticalChance = clamp$1(settings.base_critical_chance + (ability === 2 ? settings.third_skill_critical_bonus : 0) + (hasWingBonus(player) ? settings.wing_critical_chance : 0) + ((enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("critical") + (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("stone_critical")) / 100, 0, .95);
						const criticalRoll = pvpRolls.critical;
						const critical = criticalRoll < criticalChance;
						const strongPlayers = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("strong_players") + ((player.jewelry_pvp||0)+(player.belt_pvp_r31||0)) + (player.pet_kind === "dragon" ? 10 : 0) + serverRankBonuses(player.id).pvp + (player.set_pvp ?? 0);
						const defenderDragon = port.dragon(target.id);
						const resistantPlayers = clamp$1((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("resistant_players") + (target.jewelry_resist||0) + (target.set_resistance ?? 0) + (defenderDragon ? 10 : 0), 0, 90);
						const defenseKind = player.role === "avci" ? "arrow_defense" : player.role === "arkanist" ? "magic_defense" : "sword_defense";
						const classDefense = (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))(defenseKind);
						const spreadRoll = pvpRolls.spread;
						const baseRaw = Math.max(1, Math.floor(colRuneFactor(player,'attack')*(roleBase + weaponPower + (hasWingBonus(player) ? settings.wing_attack_bonus : 0) + (player.pet_kind === "dog" ? 0 : player.pet_kind === "dragon" ? 45 : player.pet_kind === "starter" ? 10 : player.pet_kind ? 20 : 0) + spreadRoll * 7) * multiplier * (1 + (skillLevel - 1) * settings.skill_upgrade_damage_per_level) * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
						const armorReduction = armorDamageReduction((armorPower + (hasWingBonus(target) ? settings.wing_defense_bonus : 0))*colRuneFactor(target,'defense'), "pvp");
						const attackBlocked = attackIsBlocked((enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("attack_block") + (enchantmentTotals473_defenderGear ??= createEnchantmentTotals(defenderGear))("stone_block"), pvpRolls.block);
						const directDamage = attackBlocked ? 0 : Math.max(1, Math.round(baseRaw * (1 + strongPlayers / 100) * (1 - armorReduction) * (1 - classDefense / 100) * (1 - resistantPlayers / 100)*(target.special_guard_until_ms>nowMs?1-(colSpec456(target.role,target.specialization,settings)?.guard??0):1)));
						const firePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("fire");
						const icePercent = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("ice");
						const fireDamage = !attackBlocked && firePercent ? Math.max(1, Math.round(directDamage * firePercent / 100)) : 0;
						const iceDamage = !attackBlocked && icePercent ? Math.max(1, Math.round(directDamage * icePercent / 100)) : 0;
						const totalDamage = directDamage + fireDamage + iceDamage;
						const wouldKill = port.predictNonlethal(target,totalDamage);
						if (player.area === "war" && (inWarSafeZone(player.x, player.y) || inWarSafeZone(target.x, target.y))) return rejectPvpAttack("Güvenli çemberde savaşılmaz.", 409);
						let pvpCooldownAccepted = wouldKill ? pvpCooldownStatement.first() : null;
						if (wouldKill && !pvpCooldownAccepted) {
							if (ability === 0) {
								deliverRealtime(publishPvpAttackRejection());
								return rejectBasicAttackCadence(cooldownMs);
							}
							return rejectPvpAttack("Yetenek henüz hazır değil.", 429);
						}
						timing.mark("pvp_validation");
						const targetUpdate = port.damagePlan([{target,totalDamage}],{player,nowMs,isArena,arenaMatchId});
						const eventInsert = port.eventsPlan([{target,totalDamage}],{player,ability,nowMs});
						const killClaimId = isArena ? crypto.randomUUID() : "";
						const scoringTeam = arenaMatch?.attacker_team === 2 ? 2 : 1;
						const arenaScoreWrites = [];
						const warKillClaimId = isArena ? "" : crypto.randomUUID();
						const warRewardToken = isArena ? "" : crypto.randomUUID();
						const warEconomyWrites = [];
						colLabTagWarReward(warEconomyWrites,player,target);
                        const mutationStatements = [
							targetUpdate,
							eventInsert,
							...arenaScoreWrites,
							...warEconomyWrites
						];
						const batchWrites = port.batch(wouldKill ? mutationStatements : [pvpCooldownStatement,...mutationStatements]);
						const attackWrites = wouldKill ? batchWrites : batchWrites.slice(1);
						if (!wouldKill) {
							pvpCooldownAccepted = batchWrites[0].results[0] ?? null;
							if (!pvpCooldownAccepted) {
								if (ability === 0) {
									deliverRealtime(publishPvpAttackRejection());
									return rejectBasicAttackCadence(cooldownMs);
								}
								return rejectPvpAttack("Yetenek henüz hazır değil.", 429);
							}
						}
						const reservedUntilMs = Number(pvpCooldownAccepted.reserved_until);
						timing.mark("pvp_commit");
						const updated = attackWrites[0].results[0];
						if (!updated) {
							port.undoCooldown(playerId,attackColumn,reservedUntilMs,cooldownMs);
							if (attempt < 2) {
								const fresh = port.snapshot( payload, playerId);
								if (pvpContinuity(fresh)) {
									if (fresh.player) fresh.player.pet_kind = port.pet(playerId);
									currentPvpSnapshot = fresh;
									continue;
								}
							}
							return rejectPvpAttack("Hedefin durumu değişti; hedefi yeniden seç.", 409);
						}
						releasePvpCommit();
						const impactAtMs = Date.now();
						const guardianEffect = (attackBlocked ? null : ability===3&&branch456?.effect==='root'?port.trap(player,target,'player',branch456,impactAtMs,intentId):port.guardian( player, ability, target, "player", impactAtMs)) ?? guardianCastVisual({
							...player,
							x: attacker.x,
							y: attacker.y
						}, ability, target, "player", impactAtMs);
						if (guardianEffect && intentId) Object.assign(guardianEffect, { intentId });
						if (guardianEffect) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, guardianEffect, arenaMatchId || void 0));
						const lifeSteal = port.restoreLife( playerId, lifeStealAmount(Math.min(totalDamage, target.hp), enchantmentTotal(equippedEnchantItems(player), "life_steal")));
						if (lifeSteal) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
							type: "player_state",
							eventId: crypto.randomUUID(),
							targetId: playerId,
							hp: lifeSteal.hp,
							hpRevision: lifeSteal.hp_revision,
							maxHp: lifeSteal.max_hp,
							serverAt: nowMs
						}, arenaMatchId || void 0));
						let attackerGems = player.gems;
						const pvpGemsLost479=updated.pvp_gems_lost479??null;
						let targetGems = updated.gems;
						let responseHp = updated.hp;
						let responseHpRevision = updated.hp_revision;
						let responseRespawnAtMs = updated.respawn_at_ms;
						const killed = updated.hp <= 0;
						let scoredMatch = isArena ? attackWrites[5]?.results[0] ?? null : null;
if(scoredMatch&&scoredMatch.status!=="finished"&&!arenaMatchId.startsWith("guild-"))port.requiresWriter();
						const warBaseIndex = 2 + arenaScoreWrites.length;
						let warRewardGranted = false;
						let warRewardAvailableAtMs = 0;
						if (player.area === "war" && killed) {
							warRewardGranted = Boolean(attackWrites[warBaseIndex + 1]?.results[0]);
							attackerGems = Number((attackWrites[warBaseIndex + 2]?.results[0])?.gems ?? attackerGems);
							targetGems = Number((attackWrites[warBaseIndex + 3]?.results[0])?.gems ?? targetGems);
							warRewardAvailableAtMs = Number((attackWrites[warBaseIndex + 4]?.results[0])?.reward_available_at_ms ?? 0);
						}
						let matchFinished = false;
						if(killed && isArena && scoredMatch)port.requiresWriter();
						if (!matchFinished) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
							type: "pvp_result",
							eventId: `pvp:${nowMs}:${playerId}:${target.id}`,
							intentId,
							attackerId: playerId,
							targetId: target.id,
							ability,
							damage: totalDamage,
							attackBlocked,
							hp: responseHp,
							hpRevision: responseHpRevision,
							respawnAtMs: responseRespawnAtMs,
							killed,
							critical,
							attackerGems,
							targetGems,pvpGemsLost479,
							__combatAudit: intentId && !attackBlocked ? {
								v: 1,
								intentId,
								attacker: {
									id: playerId,
									hp: player.hp,
									revision: player.hp_revision,
									scopeVersion: player.realtime_scope_version
								},
								target: {
									id: target.id,
									hp: target.hp,
									revision: target.hp_revision,
									scopeVersion: target.realtime_scope_version
								},
								rolls: {
									critical: criticalRoll,
									spread: spreadRoll
								},
								rules: {
									roleBase,
									weaponPower,
									wingAttack: hasWingBonus(player) ? settings.wing_attack_bonus : 0,
									multiplier,
									skillGrowth: 1 + (skillLevel - 1) * settings.skill_upgrade_damage_per_level,
									scale: settings.skill_damage_scale,
									criticalChance,
									criticalMultiplier: colCriticalMultiplier491(settings.critical_damage_multiplier,player),
									strongPlayers,
									armorReduction,
									classDefense,
									resistantPlayers,
									firePercent,
									icePercent
								}
							} : void 0,
							...player.area === "war" && killed ? {
								rewardGranted: warRewardGranted,
								rewardGems: warRewardGranted ? settings.pvp_kill_reward_gems : 0,
								rewardAvailableAtMs: warRewardAvailableAtMs
							} : {},
							...scoredMatch ? {
								arenaMatchId,
								teamAScore: scoredMatch.team_a_score,
								teamBScore: scoredMatch.team_b_score,
								killTarget: scoredMatch.kill_target
							} : {},
							serverAt: nowMs
						}, arenaMatchId || void 0));
						if (matchFinished && scoredMatch) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, "arena", {
							type: "arena_match_finished",
							eventId: `arena-finished:${arenaMatchId}`,
							matchId: arenaMatchId,
							mode: scoredMatch.mode,
							winnerTeam: scoredMatch.winner_team,
							teamAName: scoredMatch.team_a_name,
							teamBName: scoredMatch.team_b_name,
							teamAScore: scoredMatch.team_a_score,
							teamBScore: scoredMatch.team_b_score,
							rewardGems: scoredMatch.reward_gems,
							serverAt: nowMs
						}, arenaMatchId));
						colNotifyPvpGemLoss479(player,updated,target.id,updated.hp_revision,nowMs);
						const arenaScoreMessage = scoredMatch ? `${target.name} yenildi · ${scoredMatch.team_a_name} ${scoredMatch.team_a_score}-${scoredMatch.team_b_score} ${scoredMatch.team_b_name}` : "";
						return Response.json({
							ok: true,
							guardianEffect,
							lifeSteal,
							targetId: target.id,
							targetName: target.name,
							damage: totalDamage,
							directDamage,
							attackBlocked,
							hp: responseHp,
							hpRevision: responseHpRevision,
							respawnAtMs: responseRespawnAtMs,
							killed,
							critical,
							attackerGems,
							targetGems,pvpGemsLost479,
							...ability === 0 ? { nextAttackAtMs: reservedUntilMs } : { cooldownRemainingMs: Math.max(0, reservedUntilMs - Date.now()) },
							...player.area === "war" && killed ? {
								rewardGranted: warRewardGranted,
								rewardGems: warRewardGranted ? settings.pvp_kill_reward_gems : 0,
								rewardAvailableAtMs: warRewardAvailableAtMs
							} : {},
							matchFinished,
							...scoredMatch ? { arenaMatch: {
								id: arenaMatchId,
								teamAScore: scoredMatch.team_a_score,
								teamBScore: scoredMatch.team_b_score,
								killTarget: scoredMatch.kill_target,
								winnerTeam: scoredMatch.winner_team
							} } : {},
							elemental: [...fireDamage ? [{
								kind: "fire",
								damage: fireDamage
							}] : [], ...iceDamage ? [{
								kind: "ice",
								damage: iceDamage
							}] : []],
							tickCount: settings.elemental_tick_count,
							tickIntervalMs: settings.elemental_tick_interval_ms,
							message: attackBlocked ? `${target.name} saldırını blokladı!` : (isMistArea(player.area) || player.area === "black" || player.area === "rune_v2") && killed ? `${target.name} yenildi.` : isArena ? matchFinished && scoredMatch ? `${scoredMatch.winner_team === 1 ? scoredMatch.team_a_name : scoredMatch.team_b_name} Arena savaşını kazandı!` : killed ? arenaScoreMessage : `${target.name}: ${totalDamage} hasar.` : killed ? settings.pvp_kill_reward_gems <= 0 ? `${target.name} yenildi · Savaş Meydanı ödülü yönetici tarafından kapalı` : warRewardGranted ? `${target.name} yenildi · +${settings.pvp_kill_reward_gems} Mücevher · yeni ödül 30 dakika sonra` : `${target.name} yenildi · savaş devam ediyor · ödül hakkına ${Math.max(1, Math.ceil((warRewardAvailableAtMs - nowMs) / 6e4))} dakika kaldı` : `${target.name}: ${totalDamage} hasar${classDefense ? ` · %${classDefense} ${defenseKind === "arrow_defense" ? "ok" : defenseKind === "magic_defense" ? "büyü" : "kılıç"} savunması` : ""}${resistantPlayers ? ` · %${resistantPlayers} oyuncu savunması` : ""}.`
						});
					}
					return Response.json({ error: "Hedefin durumu değişti; yeniden dene." }, { status: 409 });
				}
 function nativeContinuity(database,originalPvpSnapshot,candidate){
					const original = originalPvpSnapshot;
					if (!samePvpActorScope(original.player, candidate.player) || !samePvpActorScope(original.preloadedPvpTarget, candidate.preloadedPvpTarget) || original.player?.world_cycle !== candidate.player?.world_cycle) return false;
					if (original.player.area === "arena" && (original.player.hp_revision !== candidate.player.hp_revision || original.preloadedPvpTarget.hp_revision !== candidate.preloadedPvpTarget.hp_revision)) {
						if (database.prepare(`SELECT 1 AS changed FROM arena_kill_claims WHERE match_id=? AND
          ((victim_id=? AND victim_hp_revision>?) OR (victim_id=? AND victim_hp_revision>?)) LIMIT 1`).bind(original.player.arena_match_id, original.player.id, original.player.hp_revision, original.preloadedPvpTarget.id, original.preloadedPvpTarget.hp_revision).first()) return false;
					}
					return true;
				}
 function memoryContinuity(port,originalPvpSnapshot,candidate){
					const original = originalPvpSnapshot;
					if (!samePvpActorScope(original.player, candidate.player) || !samePvpActorScope(original.preloadedPvpTarget, candidate.preloadedPvpTarget) || original.player?.world_cycle !== candidate.player?.world_cycle) return false;
					if (original.player.area === "arena" && (original.player.hp_revision !== candidate.player.hp_revision || original.preloadedPvpTarget.hp_revision !== candidate.preloadedPvpTarget.hp_revision)) {
						if (port.changedArenaLife(original,candidate)) return false;
					}
					return true;
				}
function hydratePvp(database,identity,targetPlayerId,nowSeconds){const identitySql="?",now=nowSeconds,payload={action:"pvp_attack",targetPlayerId};const playerPromise = database.prepare(payload.action === "collect" ? `SELECT id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms,
        essence, level, rank_tier, area, channel, arena_match_id, last_seen,
        combat_lock_until_ms, realtime_scope_version,
        COALESCE((SELECT reset_at FROM world_state WHERE id = 1), 0) AS reset_at,
        COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) AS world_cycle
       FROM players WHERE id = ${identitySql}` : `SELECT stat_attack,stat_defense,stat_hp,stat_revision,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms, essence, contribution, xp, level, gems, potions, ${setSelectSql()},
        specialization,skill_four,attack_four_at,special_guard_until_ms,jewelry_attack,jewelry_defense,jewelry_cast_speed,jewelry_pvp,${beltBonusSql('strongPlayers','players')} AS belt_pvp_r31,jewelry_resist,jewelry_earring_enchantments,jewelry_bracelet_enchantments,halloween_candy_until,skill_one, skill_two, skill_three, has_rod, rod_equipped, fish_sokan, fish_levrek, fish_zargana, pearls, stone_dust,
        xp_ring_until, drop_charm_until, (SELECT equipped FROM player_items WHERE player_id=players.id AND kind='costume' LIMIT 1) AS costume_equipped, has_wings, wings_equipped, (SELECT equipped FROM dungeon_wings WHERE player_id=players.id) AS core_wings, area, channel, arena_match_id, last_seen,
        combat_lock_until_ms, realtime_scope_version, weapon_skin_enabled,
        COALESCE((SELECT reset_at FROM world_state WHERE id = 1), 0) AS reset_at,
        COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) AS world_cycle,
        COALESCE((SELECT power FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), 0) + CASE WHEN players.weapon_skin_enabled=1 THEN 20 ELSE 0 END + players.jewelry_attack + ${beltBonusSql('attack','players')} AS equipped_weapon_power,
        (SELECT id FROM player_items WHERE player_id=players.id AND kind='weapon' AND equipped=1 LIMIT 1) AS equipped_weapon_id,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), '[]') AS equipped_weapon_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'armor' AND equipped = 1 LIMIT 1), '[]') AS equipped_armor_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'helmet' AND equipped = 1 LIMIT 1), '[]') AS equipped_helmet_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'shoes' AND equipped = 1 LIMIT 1), '[]') AS equipped_shoes_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'necklace' AND equipped = 1 LIMIT 1), '[]') AS equipped_necklace_enchantments
       FROM players WHERE id = ${identitySql}`).bind(identity).first();const pvpTargetId = payload.action === "pvp_attack" ? safeId(payload.targetPlayerId) : "";const pvpTargetPromise = pvpTargetId ? database.prepare(`SELECT stat_attack,stat_defense,stat_hp,stat_revision,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms, essence, contribution, xp, level, gems, potions, ${setSelectSql()},
          specialization,skill_four,attack_four_at,special_guard_until_ms,jewelry_attack,jewelry_defense,jewelry_cast_speed,jewelry_pvp,${beltBonusSql('strongPlayers','players')} AS belt_pvp_r31,jewelry_resist,jewelry_earring_enchantments,jewelry_bracelet_enchantments,halloween_candy_until,skill_one, skill_two, skill_three, has_rod, rod_equipped, fish_sokan, fish_levrek, fish_zargana, pearls, stone_dust,
          xp_ring_until, drop_charm_until, (SELECT equipped FROM player_items WHERE player_id=players.id AND kind='costume' LIMIT 1) AS costume_equipped, has_wings, wings_equipped, (SELECT equipped FROM dungeon_wings WHERE player_id=players.id) AS core_wings, area, channel, arena_match_id, last_seen,
          combat_lock_until_ms, realtime_scope_version, weapon_skin_enabled,
          COALESCE((SELECT SUM(power) FROM player_items WHERE player_id = players.id AND kind IN ('armor','helmet','shoes','necklace','costume') AND equipped = 1), 0) AS equipped_armor_power,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), '[]') AS equipped_weapon_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'armor' AND equipped = 1 LIMIT 1), '[]') AS equipped_armor_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'helmet' AND equipped = 1 LIMIT 1), '[]') AS equipped_helmet_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'shoes' AND equipped = 1 LIMIT 1), '[]') AS equipped_shoes_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'necklace' AND equipped = 1 LIMIT 1), '[]') AS equipped_necklace_enchantments
         FROM players WHERE id = ? AND hp > 0 AND last_seen >= ?
           AND EXISTS (SELECT 1 FROM players viewer WHERE viewer.id = ${identitySql}
             AND viewer.area = players.area AND viewer.channel = players.channel
             AND (viewer.area != 'arena' OR (players.arena_match_id != '' AND players.arena_match_id = viewer.arena_match_id)))`).bind(pvpTargetId, now - 30, identity).first() : null;const pvpArenaPromise = pvpTargetId ? database.prepare(`SELECT m.*, attacker.team AS attacker_team, defender.team AS target_team
       FROM players viewer
       JOIN arena_matches m ON m.id = viewer.arena_match_id
       JOIN arena_match_players attacker ON attacker.match_id = m.id AND attacker.player_id = viewer.id
       JOIN arena_match_players defender ON defender.match_id = m.id AND defender.player_id = ?
       WHERE viewer.id = ${identitySql} AND viewer.area = 'arena' LIMIT 1`).bind(pvpTargetId, identity).first() : null;return {player:playerPromise,preloadedPvpTarget:pvpTargetPromise,preloadedPvpArena:pvpArenaPromise,pvpTargetId};}
 function nativeAction(database,context){const {player,playerId,payload,settings,attackTargetId,preloadedAttackMonster,requestReceivedAtMs,now,auth}=context;switch(payload.action){case "claim_rewards":{
					const seen = /* @__PURE__ */ new Set();
					const rewardTargets = (Array.isArray(payload.rewardTargets) ? payload.rewardTargets : []).flatMap((target) => {
						const id = typeof target?.id === "string" && /^[a-z0-9-]{1,64}$/.test(target.id) ? target.id : "";
						const suppliedRound = Number(target?.spawnRound);
						const spawnRound = Number.isInteger(suppliedRound) && suppliedRound >= 0 ? suppliedRound : -1;
						const key = `${id}:${spawnRound}`;
						if (!id || spawnRound < 0 || seen.has(key)) return [];
						seen.add(key);
						return [{
							id,
							spawn_round: spawnRound
						}];
					}).slice(0, 10);
					if (!rewardTargets.length) return Response.json({
						ok: true,
						processed: 0
					});
					enforceRateLimit("claim-rewards", auth.account.id, {
						limit: 120,
						windowSeconds: 60,
						blockSeconds: 10
					});
					const rewardSettings = settings;
					timing.mark("reward_limits");
					let processed = 0;
					for (const target of rewardTargets) {
						if (target.id === "dunya-bosu-1" || colLabBossMonster(target.spawn_round)?.id===target.id) {
							if ((awardPendingBossRewards(database, rewardSettings, now, target.spawn_round, playerId))?.awarded) processed += 1;
							continue;
						}
						if ((target.id.startsWith("sinsi-tasi-") ? tryAwardPendingSinsiStoneRewards(database, rewardSettings, now, target) : awardPendingNormalRewards(database, rewardSettings, now, target, playerId))?.awarded) processed += 1;
					}
					timing.mark("reward_delivery");
					if (!processed) tryFinalizePendingDropEnchantments(database, rewardSettings, {
						ownerId: playerId,
						monsterIds: rewardTargets.map((target) => target.id)
					});
					timing.mark("reward_repair");
					const targetIds = [...new Set(rewardTargets.map((target) => target.id))];
					const freshDrops = targetIds.length ? (database.prepare(`SELECT id, owner_id, monster_id, kind, item_name, rarity, power, amount, role, enchantments, x, y, expires_at, collectible_at
             FROM world_drops WHERE owner_id = ? AND expires_at >= ? AND collectible_at >= ?
             AND enchantments NOT IN (?, ?)
             AND monster_id IN (${targetIds.map(() => "?").join(",")}) ORDER BY collectible_at, id`).bind(playerId, now, now, PENDING_DROP_ENCHANTMENTS, PROFILE_PENDING_DROP_ENCHANTMENTS, ...targetIds).all()).results : [];
					timing.mark("reward_drops");
					const communityProgress = readCommunityProgress(auth.account.id);
					timing.mark("reward_progress");
					return Response.json({
						ok: true,
						processed,
						drops: freshDrops,
						communityProgress
					});
				}
case "donate":{
					const amount = Number(payload.amount);
                    if(!Number.isSafeInteger(amount)||amount<1||amount>player.essence)return Response.json({error:'Bağışlamak istediğin Öz miktarını 1 ile bakiyen arasında seç.'},{status:400});
					if (amount < 1) return Response.json({ error: "Bağışlayacak Yaşam Özün yok." }, { status: 400 });
					const decayedHealth = "MAX(0, health - MAX(0, ? - updated_at) * ?)";
					const donationResults = database.batch([database.prepare("UPDATE players SET essence = essence - ?, contribution = contribution + ?, last_seen = ? WHERE id = ? AND hp > 0 AND essence >= ? RETURNING essence, contribution").bind(amount, amount, now, playerId, amount), database.prepare(`UPDATE world_state SET health = MIN(100, ${decayedHealth} + ? * MAX(.15, (100 - ${decayedHealth}) / 100.0)), updated_at = ?
           WHERE id = 1 AND changes() > 0 RETURNING health`).bind(now, settings.health_decay_per_second, amount * settings.donation_health_per_essence, now, settings.health_decay_per_second, now)]);
					const spent = donationResults[0].results[0];
					const worldHealth = donationResults[1].results[0]?.health;
					if (!spent || typeof worldHealth !== "number") return Response.json({ error: "Öz miktarı değişti; güncel bakiye alınıyor." }, { status: 409 });
					return Response.json({
						ok: true,
						...spent,
						worldHealth,
						message: `${amount} Yaşam Özü bağışladın · dünya sağlığı %${worldHealth.toFixed(2)}`
					});
				}
case "respawn":{
					if (player.area === "arena" && player.arena_match_id) {
						const arenaRespawn = database.prepare(`SELECT m.id, m.status, m.team_size, mp.team, mp.slot
           FROM arena_matches m JOIN arena_match_players mp ON mp.match_id = m.id
           WHERE m.id = ? AND mp.player_id = ? LIMIT 1`).bind(player.arena_match_id, playerId).first();
						if (!arenaRespawn || arenaRespawn.status !== "countdown" && arenaRespawn.status !== "active") return Response.json({ error: "Arena sonucu eşitleniyor." }, { status: 409 });
                        if(!arenaRespawn.id.startsWith("guild-")&&arenaRespawn.team_size>1)return Response.json({code:"arena_waiting_for_round498",error:"Takım raundu bitene kadar bekle. Tüm rakipler düşünce yeni raund başlayacak."},{status:409});
						const arenaPoint = arenaSpawn(arenaRespawn.team === 2 ? 2 : 1, arenaRespawn.slot, arenaRespawn.team_size);
						const arenaResult = database.prepare(`UPDATE players SET hp = max_hp, hp_revision = hp_revision + 1, respawn_at_ms = 0,
            x = ?, y = ?, last_seen = ?, movement_checked_at_ms = ?, movement_debt_ms = 0,
            motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1, combat_lock_until_ms = 0
           WHERE id = ? AND area = 'arena' AND arena_match_id = ? AND hp <= 0
             AND respawn_at_ms > 0 AND respawn_at_ms <= ?
             AND NOT EXISTS(SELECT 1 FROM arena_matches blocked498 WHERE blocked498.id=players.arena_match_id AND blocked498.id NOT LIKE 'guild-%' AND blocked498.mode IN ('2v2','3v3','5v5') AND blocked498.status IN ('active','countdown'))
           RETURNING hp, max_hp, hp_revision, area, x, y`).bind(arenaPoint.x, arenaPoint.y, now, Date.now(), playerId, arenaRespawn.id, Date.now()).first();
						if (!arenaResult) return Response.json({ error: "Yeniden doğuş henüz hazır değil." }, { status: 409 });
						database.prepare("DELETE FROM pve_engagements WHERE player_id = ?").bind(playerId).run();
						publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
							type: "player_respawn",
							eventId: `arena-respawn:${Date.now()}:${playerId}`,
							playerId,
							hp: arenaResult.hp,
							maxHp: arenaResult.max_hp,
							hpRevision: arenaResult.hp_revision,
							area: "arena",
							x: arenaResult.x,
							y: arenaResult.y
						}, player.arena_match_id);
						return Response.json({
							ok: true,
							hp: arenaResult.hp,
							maxHp: arenaResult.max_hp,
							hpRevision: arenaResult.hp_revision,
							area: "arena",
							x: arenaResult.x,
							y: arenaResult.y
						});
					}
					const respawnArea = player.area===CASTLE_AREA||player.area==='rune_v2'?'bazaar':player.area==='event'&&globalThis.__colEventIsland444?.settings().config.enabled?'event':player.area==='rune'&&runeEligible(player)?'rune':player.area === "dragon" ? "dragon" : player.area === "ancient" ? "ancient" : player.area === "black" ? "black" : player.area === "war" ? "war" : player.area === "frozen" ? "frozen" : player.area === "sanctum" ? "sanctum" : "forest";
					const respawnPoint = respawnArea==='event'?EVENT_SPAWN444:respawnArea==='bazaar'?BAZAAR_SPAWN:respawnArea==='rune'?RUNE_SPAWN:respawnArea === "dragon" ? DRAGON_ENTRY : respawnArea === "ancient" ? ANCIENT_SPAWN : respawnArea === "black" ? BLACK_SPAWN : respawnArea === "war" ? WAR_ENTRY : respawnArea === "frozen" ? FROZEN_SPAWN : respawnArea === "sanctum" ? BOSS_SANCTUM_ENTRY : FOREST_SPAWN;
					const result = database.prepare(`UPDATE players SET hp = max_hp, hp_revision = hp_revision + 1, respawn_at_ms = 0,
          area = ?, arena_match_id = '', x = ?, y = ?, last_seen = ?, movement_checked_at_ms = ?, movement_debt_ms = 0,
          motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1, realtime_scope_version = realtime_scope_version + 1,
          combat_lock_until_ms = 0
          WHERE id = ? AND hp <= 0 AND respawn_at_ms > 0 AND respawn_at_ms <= ?
          AND NOT EXISTS(SELECT 1 FROM arena_matches blocked498 WHERE blocked498.id=players.arena_match_id AND blocked498.id NOT LIKE 'guild-%' AND blocked498.mode IN ('2v2','3v3','5v5') AND blocked498.status IN ('active','countdown'))
         RETURNING hp, max_hp, hp_revision, area, x, y`).bind(respawnArea, respawnPoint.x, respawnPoint.y, now, Date.now(), playerId, Date.now()).first();
					if (!result) return Response.json({ error: "Yeniden doğuş henüz hazır değil." }, { status: 409 });
					database.prepare("DELETE FROM pve_engagements WHERE player_id = ?").bind(playerId).run();
					publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
						type: "player_respawn",
						eventId: `respawn:${Date.now()}:${playerId}`,
						playerId,
						hp: result.hp,
						maxHp: result.max_hp,
						hpRevision: result.hp_revision,
						area: result.area,
						x: result.x,
						y: result.y
					});
					return Response.json({
						ok: true,
						hp: result.hp,
						maxHp: result.max_hp,
						hpRevision: result.hp_revision,
						area: result.area,
						x: result.x,
						y: result.y
					});
				}
case "collect":{
 let lootAmount473;const lootResponse473=(value,options)=>{if(value?.ok!==true)return Response.json(value,options);const amount=Number(lootAmount473??drop?.amount);return Response.json(Number.isSafeInteger(amount)&&amount>0?{...value,lootReceipts473:[{id:drop.id,ownerId:playerId,label:drop.item_name,amount}]}:value,options);};

					if (player.area !== "bazaar" && player.area !== "event" && player.area !== "rune_v2" && player.area !== "rune" && player.area !== "ancient" && player.area !== "forest" && player.area !== "frozen" && player.area !== "sanctum" && player.area !== "dragon" && player.area !== "sinsi" && player.area !== "black") return lootResponse473({ error: "Bu bölgede ganimet toplanamaz." }, { status: 400 });
					const targetId = typeof payload.targetId === "string" ? payload.targetId : "";
					let drop = database.prepare("SELECT id, owner_id, monster_id, kind, item_name, rarity, power, amount, role, enchantments, x, y, expires_at, collectible_at FROM world_drops WHERE id = ? AND owner_id = ?").bind(targetId, playerId).first();
					if (groundLoot30s && drop && groundLootExpired(drop.expires_at, now)) return lootResponse473({ code: "loot_expired", error: "Ganimet artık burada değil." }, { status: 404 });
					if (drop?.enchantments === PENDING_DROP_ENCHANTMENTS || drop?.enchantments === PROFILE_PENDING_DROP_ENCHANTMENTS) {
						tryFinalizePendingDropEnchantments(database, settings, {
							ownerId: playerId,
							dropId: targetId
						});
						drop = database.prepare("SELECT id, owner_id, monster_id, kind, item_name, rarity, power, amount, role, enchantments, x, y, expires_at, collectible_at FROM world_drops WHERE id = ? AND owner_id = ?").bind(targetId, playerId).first();
					}
					if (!drop || groundLootExpired(drop.expires_at, now)) return lootResponse473({ error: "Ganimet artık burada değil." }, { status: 404 });
					if (drop.enchantments === PENDING_DROP_ENCHANTMENTS || drop.enchantments === PROFILE_PENDING_DROP_ENCHANTMENTS) return lootResponse473({ error: "Eşyanın efsunları hazırlanıyor; bir an sonra tekrar dene." }, { status: 409 });
					if (payload.automatic === true && drop.collectible_at > now) return lootResponse473({ error: "Ganimet henüz yerde görünüyor." }, { status: 409 });
					if ((drop.monster_id.startsWith('event-')?(globalThis.__colEventIsland444.settings().config.enabled?'event':'bazaar'):drop.monster_id.startsWith('rune-v2-')?'rune_v2':drop.monster_id.startsWith('rune-')?'rune':drop.monster_id === "dragon-world-1" ? "dragon" : drop.monster_id === "dunya-bosu-1" ? "sanctum" : drop.monster_id.includes("-ancient-") || drop.monster_id === "ancient-boss-1" ? "ancient" : drop.monster_id.includes("-black-") ? "black" : drop.monster_id.startsWith("frozen-") || drop.monster_id.includes("-frozen-") ? "frozen" : drop.monster_id.startsWith("sinsi-tasi-") || drop.monster_id.includes("-sinsi-") ? "sinsi" : "forest") !== player.area) return lootResponse473({ error: "Bu ganimet başka bir bölgede." }, { status: 409 });
					if (drop.collectible_at > now && distance(player, drop) > DROP_COLLECTION_RANGE) return lootResponse473({ error: "Ganimete biraz daha yaklaşmalısın." }, { status: 400 });
					if(eventKind444(drop.monster_id)&&['dragon','solo','dungeon'].includes(eventKind444(drop.monster_id)))return lootResponse473(globalThis.__colEventIsland444.collect(playerId,drop.id));
 if (drop.monster_id === "dragon-world-1") return lootResponse473(dragonService().collect(playerId, drop.id));
					if ((UPGRADE_MATERIAL_KINDS.includes(drop.kind)||Object.hasOwn(RUNE_TYPES,drop.kind)||['weathered_iron','wing','infinite','pet','halloween_pumpkin','witch_wand','halloween_candy'].includes(drop.kind))) {
						if (!(database.batch([database.prepare(`INSERT INTO dungeon_materials(player_id,kind,amount) SELECT ?,kind,amount FROM world_drops WHERE id=? AND owner_id=? AND kind=? AND expires_at>=?
            ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount RETURNING amount`).bind(playerId, drop.id, playerId, drop.kind, now), database.prepare("DELETE FROM world_drops WHERE id=? AND owner_id=? AND kind=? AND expires_at>=?").bind(drop.id, playerId, drop.kind, now)]))[0].results[0]) return lootResponse473({ error: "Ganimet az önce toplandı." }, { status: 409 });
						return lootResponse473({
							ok: true,
							message: `${drop.item_name} çantana eklendi.`
						});
					}
					if (drop.kind === "crystal_chest") {
						if (!(database.batch([database.prepare(`INSERT INTO player_stones(player_id,kind,amount) SELECT ?,'crystal_chest',amount FROM world_drops WHERE id=? AND owner_id=? AND kind='crystal_chest' AND expires_at>=?
            ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount RETURNING amount`).bind(playerId, drop.id, playerId, now), database.prepare("DELETE FROM world_drops WHERE id=? AND owner_id=? AND kind='crystal_chest' AND expires_at>=?").bind(drop.id, playerId, now)]))[0].results[0]) return lootResponse473({ error: "Sandık az önce toplandı." }, { status: 409 });
						return lootResponse473({
							ok: true,
							message: "Kristal Sandığı çantana eklendi. Çantandan açabilirsin."
						});
					}
					if (drop.kind === "moonlight_chest") {
						if (!(database.batch([database.prepare(`INSERT INTO player_stones(player_id,kind,amount) SELECT ?,'moonlight_chest',amount FROM world_drops WHERE id=? AND owner_id=? AND kind='moonlight_chest' AND expires_at>=?
            ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount RETURNING amount`).bind(playerId, drop.id, playerId, now), database.prepare("DELETE FROM world_drops WHERE id=? AND owner_id=? AND kind='moonlight_chest' AND expires_at>=?").bind(drop.id, playerId, now)]))[0].results[0]) return lootResponse473({ error: "Sandık az önce toplandı." }, { status: 409 });
						return lootResponse473({
							ok: true,
							message: "Ayışığı Sandığı çantana eklendi. Çantandan açabilirsin."
						});
					}
					if(drop.kind==='gems'||drop.kind==='potions'){
 const col=drop.kind;const result=database.batch([database.prepare(`UPDATE players SET ${col}=${col}+(SELECT amount FROM world_drops WHERE id=? AND owner_id=? AND kind=? AND expires_at>=?) WHERE id=? AND area IN ('rune','rune_v2') AND EXISTS(SELECT 1 FROM world_drops WHERE id=? AND owner_id=? AND kind=? AND expires_at>=?) RETURNING ${col}`).bind(drop.id,playerId,col,now,playerId,drop.id,playerId,col,now),database.prepare("DELETE FROM world_drops WHERE id=? AND owner_id=? AND kind=? AND expires_at>=? AND changes()>0").bind(drop.id,playerId,col,now)]);
 if(!result[0].results[0])return lootResponse473({error:'Ganimet az önce toplandı.'},{status:409});return lootResponse473({ok:true,...result[0].results[0],message:drop.item_name+' topladın.'});}
 if (drop.kind === "pearl") {
						const results = database.batch([database.prepare(`UPDATE players SET pearls = pearls + ?, last_seen = ? WHERE id = ? AND EXISTS (
               SELECT 1 FROM world_drops WHERE id = ? AND owner_id = ? AND kind = 'pearl' AND expires_at >= ?
             ) RETURNING pearls`).bind(drop.amount, now, playerId, drop.id, playerId, now), database.prepare("DELETE FROM world_drops WHERE id = ? AND owner_id = ? AND kind = 'pearl' AND expires_at >= ?").bind(drop.id, playerId, now)]);
						const balance = results[0].results[0];
						if (!balance || Number(results[1].meta?.changes ?? 0) < 1) return lootResponse473({ error: "Ganimet az önce toplandı." }, { status: 409 });
						return lootResponse473({
							ok: true,
							pearls: balance.pearls,
							message: `+${drop.amount} İnci topladın.`
						});
					}
					if (drop.kind === "stone_dust") {
						const results = database.batch([database.prepare(`UPDATE players SET stone_dust = stone_dust + ?, last_seen = ? WHERE id = ? AND EXISTS (
               SELECT 1 FROM world_drops WHERE id = ? AND owner_id = ? AND kind = 'stone_dust' AND expires_at >= ?
             ) RETURNING stone_dust`).bind(drop.amount, now, playerId, drop.id, playerId, now), database.prepare("DELETE FROM world_drops WHERE id = ? AND owner_id = ? AND kind = 'stone_dust' AND expires_at >= ?").bind(drop.id, playerId, now)]);
						const balance = results[0].results[0];
						if (!balance || Number(results[1].meta?.changes ?? 0) < 1) return lootResponse473({ error: "Ganimet az önce toplandı." }, { status: 409 });
						return lootResponse473({
							ok: true,
							stoneDust: balance.stone_dust,
							message: `+${drop.amount} Taş Tozu topladın.`
						});
					}
					if (drop.kind === "stone_book") {
						const balance = (database.batch([database.prepare(`INSERT INTO player_stones(player_id,kind,amount)
            SELECT ?,'book',? WHERE EXISTS(
              SELECT 1 FROM world_drops WHERE id=? AND owner_id=? AND kind='stone_book' AND expires_at>=?
            ) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount RETURNING amount`).bind(playerId, drop.amount, drop.id, playerId, now), database.prepare("DELETE FROM world_drops WHERE id=? AND owner_id=? AND kind='stone_book' AND expires_at>=?").bind(drop.id, playerId, now)]))[0].results[0];
						if (!balance) return lootResponse473({ error: "Bu kitap artık alınamaz." }, { status: 409 });
						return lootResponse473({
							ok: true,
							stoneBooks: balance.amount,
							message: `+${drop.amount} Taş Sanatı Kitabı topladın.`
						});
					}
					if (drop.kind === "evolution_scroll") {
						const balance = (database.batch([database.prepare(`INSERT INTO player_stones(player_id,kind,amount)
            SELECT ?,'evolution_scroll',? WHERE EXISTS(
              SELECT 1 FROM world_drops WHERE id=? AND owner_id=? AND kind='evolution_scroll' AND expires_at>=?
            ) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount RETURNING amount`).bind(playerId, drop.amount, drop.id, playerId, now), database.prepare("DELETE FROM world_drops WHERE id=? AND owner_id=? AND kind='evolution_scroll' AND expires_at>=?").bind(drop.id, playerId, now)]))[0].results[0];
						if (!balance) return lootResponse473({ error: "Bu kitap artık alınamaz." }, { status: 409 });
						return lootResponse473({
							ok: true,
							evolutionScrolls: balance.amount,
							message: `+${drop.amount} Evrim Parşömeni topladın.`
						});
					}
					if (drop.kind === "essence") {
						const party = database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first();
						const members = party ? (database.prepare(`SELECT pm.player_id FROM party_members pm JOIN players p ON p.id = pm.player_id
               WHERE pm.party_id = ? AND p.last_seen >= ? ORDER BY pm.joined_at`).bind(party.party_id, now - 30).all()).results : [{ player_id: playerId }];
						const recipients = members.length ? members : [{ player_id: playerId }];
						const share = Math.floor(drop.amount / recipients.length);
						const remainder = drop.amount - share * recipients.length;
						const results = database.batch([...recipients.flatMap((member, index) => {
							const amount = share + (index < remainder ? 1 : 0);
							return [database.prepare(`INSERT INTO guild_essence_rewards(id,player_id,amount,created_at)
           SELECT ?,p.id,${amount}${globalThis.__colPremium ? `+CASE WHEN p.essence_until>unixepoch()*1000 THEN CAST((${amount}+p.essence_bonus_remainder)/5 AS INTEGER) ELSE 0 END` : ""},? FROM players p WHERE p.id=? AND EXISTS(SELECT 1 FROM world_drops WHERE id=? AND owner_id=? AND kind='essence' AND expires_at>=?
           AND EXISTS(SELECT 1 FROM players owner WHERE owner.id=? AND owner.area=?)) ON CONFLICT(id) DO NOTHING RETURNING amount`).bind(drop.id + ":" + member.player_id, now, member.player_id, drop.id, playerId, now, playerId, player.area), ...globalThis.__colPremium ? [database.prepare(`UPDATE players SET essence_bonus_remainder=CASE WHEN essence_until>unixepoch()*1000 THEN (essence_bonus_remainder+${amount})%5 ELSE essence_bonus_remainder END WHERE id=? AND changes()>0`).bind(member.player_id)] : []];
						}), database.prepare(`DELETE FROM world_drops WHERE id = ? AND owner_id = ? AND kind = 'essence' AND expires_at >= ?
             AND EXISTS (SELECT 1 FROM players owner WHERE owner.id = ? AND owner.area = ?)`).bind(drop.id, playerId, now, playerId, player.area)]);
						if (!(Number(results.at(-1)?.meta?.changes ?? 0) > 0)) return lootResponse473({ error: "Ganimet az önce toplandı." }, { status: 409 });
						const balance = database.prepare("SELECT essence FROM players WHERE id = ?").bind(playerId).first();
 lootAmount473=Number(results[recipients.findIndex(member=>member.player_id===playerId)*(globalThis.__colPremium?2:1)]?.results?.[0]?.amount??0);
						return lootResponse473({
							ok: true,
							essence: balance?.essence ?? player.essence,
							shared: recipients.length,
							message: recipients.length > 1 ? `+${drop.amount} Yaşam Özü partide eşit paylaşıldı.` : `+${drop.amount} Yaşam Özü topladın.`
						});
					}
					const results = database.batch([database.prepare(`INSERT INTO player_items (id, player_id, kind, item_name, rarity, power, role, enchantments, equipped, created_at)
           SELECT id, owner_id, kind, item_name, rarity, power, role, enchantments, 0, ?
           FROM world_drops
           WHERE id = ? AND owner_id = ? AND kind != 'essence' AND enchantments NOT IN (?, ?) AND expires_at >= ?
             AND EXISTS (SELECT 1 FROM players owner WHERE owner.id = ? AND owner.area = ?)`).bind(now, drop.id, playerId, PENDING_DROP_ENCHANTMENTS, PROFILE_PENDING_DROP_ENCHANTMENTS, now, playerId, player.area), database.prepare(`DELETE FROM world_drops WHERE id = ? AND owner_id = ? AND kind != 'essence' AND enchantments NOT IN (?, ?) AND expires_at >= ?
           AND EXISTS (SELECT 1 FROM players owner WHERE owner.id = ? AND owner.area = ?)`).bind(drop.id, playerId, PENDING_DROP_ENCHANTMENTS, PROFILE_PENDING_DROP_ENCHANTMENTS, now, playerId, player.area)]);
					if (!(Number(results.at(-1)?.meta?.changes ?? 0) > 0)) return lootResponse473({ error: "Ganimet az önce toplandı." }, { status: 409 });
					if (drop.rarity === "red" || drop.rarity === "purple") try {
						announceRareDrop(database, player, drop.item_name, drop.id, drop.rarity, now);
					} catch (error) {
						console.warn("Nadir eşya duyurusu gönderilemedi; ganimet teslimi korundu.", error);
					}
					return lootResponse473({
						ok: true,
						item: {
							id: drop.id,
							kind: drop.kind,
							item_name: drop.item_name,
							rarity: drop.rarity,
							power: drop.power,
							role: drop.role,
							enchantments: drop.enchantments,
							equipped: 0
						},
						message: `${drop.item_name} çantana eklendi.`
					});
				}
case "use_potion":{
					if (player.area === "war" || player.area === "arena" || player.arena_match_id) return Response.json({ error: "Savaş Meydanı, Arena ve lonca savaşında can iksiri kullanılamaz." }, { status: 409 });
					if (payload.automatic === true) {
						if (!database.prepare("SELECT 1 FROM players WHERE id=? AND auto_potion_owned=1 AND auto_potion_enabled=1 AND auto_potion_at_ms<=? AND hp>0 AND hp<=max_hp*.5").bind(playerId, requestReceivedAtMs - 2e3).first()) return Response.json({
							ok: true,
							message: ""
						});
					}
					const pendingRetaliation = settlePveEngagement(database, playerId, settings, requestReceivedAtMs);
					if (pendingRetaliation?.dead) return Response.json({
						error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun.",
						hp: pendingRetaliation.hp,
						maxHp: pendingRetaliation.max_hp,
						hpRevision: pendingRetaliation.hp_revision,
						respawnAtMs: pendingRetaliation.respawn_at_ms
					}, { status: 409 });
					const result = payload.automatic === true ? database.prepare("UPDATE players SET hp=hp+MIN(max_hp-hp,auto_potion_remaining),auto_potion_remaining=MAX(0,auto_potion_remaining-(max_hp-hp)),auto_potion_owned=CASE WHEN auto_potion_remaining<=max_hp-hp THEN 0 ELSE 1 END,auto_potion_enabled=CASE WHEN auto_potion_remaining<=max_hp-hp THEN 0 ELSE auto_potion_enabled END,hp_revision=hp_revision+1,auto_potion_at_ms=?,last_seen=? WHERE id=? AND hp>0 AND hp<=max_hp*.5 AND area NOT IN ('war','arena') AND COALESCE(arena_match_id,'')='' AND auto_potion_owned=1 AND auto_potion_remaining>0 AND auto_potion_enabled=1 AND auto_potion_at_ms<=? RETURNING hp,max_hp,hp_revision,potions").bind(requestReceivedAtMs, now, playerId, requestReceivedAtMs - 2e3).first() : database.prepare("UPDATE players SET hp = MIN(max_hp,hp+MAX(1,CAST(max_hp*.2 AS INTEGER))), hp_revision = hp_revision + 1, respawn_at_ms = 0, potions = potions - 1, last_seen = ? WHERE id = ? AND area NOT IN ('war','arena') AND COALESCE(arena_match_id,'')='' AND potions > 0 AND hp > 0 AND hp < max_hp RETURNING hp, max_hp, hp_revision, potions").bind(now, playerId).first();
					if (!result) return Response.json({ error: player.hp >= player.max_hp ? "Canın zaten dolu." : "Can iksirin yok." }, { status: 400 });
					publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
						type: "player_state",
						eventId: `potion:${Date.now()}:${playerId}:${result.hp_revision}`,
						targetId: playerId,
						hp: result.hp,
						maxHp: result.max_hp,
						hpRevision: result.hp_revision,
						respawnAtMs: 0
					}, player.area === "arena" ? player.arena_match_id : void 0);
					return Response.json({
						ok: true,
						...result,
						maxHp: result.max_hp,
						hpRevision: result.hp_revision,
						message: "Oto iksir canını yeniledi."
					});
				}
case "guardian_dash":{
					if (player.role !== "muhafiz" || player.level < settings.skill_three_unlock_level || (!isAdventureArea(player.area)&&!["forest","frozen","sanctum","dragon","sinsi","black","war","arena","ancient","afk","event","rune","rune_v2"].includes(player.area))) return Response.json({ error: "Bu hamle şu anda kullanılamaz." }, { status: 400 });
					if (player.area === "arena") {
						const match = database.prepare("SELECT starts_at_ms,status FROM arena_matches WHERE id=?").bind(player.arena_match_id).first();
						if (!match || Date.now() < match.starts_at_ms || !["active", "countdown"].includes(match.status)) return Response.json({ error: "Arena geri sayımını bekle." }, { status: 409 });
					}
					const guardianCooldown444 = effectiveSkillCooldown444(settings.skill_three_cooldown_ms, Math.min(50,enchantmentTotal(equippedEnchantItems(player), "cast_speed")+(player.jewelry_cast_speed||0)));
const guardianEffect = dashGuardian(database, player, {
						x: Number(payload.directionX),
						y: Number(payload.directionY)
					}, Date.now(), guardianCooldown444);
					if (!guardianEffect) return Response.json({ error: "Hamle henüz hazır değil veya sabitlendin." }, { status: 409 });
					deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, guardianEffect, player.arena_match_id || void 0));
					return Response.json({
						ok: true,
						guardianEffect,
						cooldownRemainingMs: guardianCooldown444
					});
				}
case "start_fishing":{
					enforceRateLimit("fishing", auth.account.id, {
						limit: 20,
						windowSeconds: 60,
						blockSeconds: 30
					});
					if (player.area !== "fishing") return Response.json({ error: "Balık yalnızca Şelale Gölü'nde tutulabilir." }, { status: 400 });
					if (!player.has_rod || !player.rod_equipped) return Response.json({ error: "Balık tutmak için oltanı kuşanmalısın." }, { status: 400 });
					if (!canFishAt(player)) return Response.json({ error: "Oltanı atmak için göle biraz yaklaşman yeterli." }, { status: 400 });
					const liveChances = database.prepare(`SELECT g.events_json,g.fish_sokan_weight,g.fish_levrek_weight,g.fish_zargana_weight,e.fishing_pearl_chance${globalThis.__colPremium ? ",e.fishing_talisman_chance" : ""}
        FROM game_settings g JOIN economy_settings e ON e.id=g.id WHERE g.id=1`).first();
					const fish = rollFish({
						...settings,
						...liveChances
					});
					const nonce = crypto.randomUUID();
					const startedAtMs = Date.now();
					const proofSeed = crypto.getRandomValues(new Uint32Array(1))[0] & 2147483647;
					const biteAtMs = startedAtMs + 900 + proofSeed % 901;
					const created = (database.batch([database.prepare(`UPDATE players SET last_seen = ?
           WHERE id = ? AND hp > 0 AND area = 'fishing' AND has_rod = 1 AND rod_equipped = 1
           AND fishing_cooldown_until_ms <= ?
           AND NOT EXISTS (SELECT 1 FROM fishing_sessions WHERE player_id = players.id AND expires_at_ms >= ?)`).bind(now, playerId, startedAtMs, startedAtMs), database.prepare(`INSERT INTO fishing_sessions
             (player_id, nonce, fish_kind, started_at_ms, bite_at_ms, earliest_finish_at_ms, expires_at_ms,
              proof_updated_at_ms, proof_sequence, proof_bar, proof_velocity, proof_progress, proof_holding,
              proof_samples, proof_changes, proof_seed)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, 0, 580000, 0, 260000, 0, 0, 0, ? FROM players
           WHERE id = ? AND hp > 0 AND area = 'fishing' AND has_rod = 1 AND rod_equipped = 1
             AND fishing_cooldown_until_ms <= ?
           ON CONFLICT(player_id) DO UPDATE SET nonce=excluded.nonce, fish_kind=excluded.fish_kind,
           started_at_ms=excluded.started_at_ms, bite_at_ms=excluded.bite_at_ms,
           earliest_finish_at_ms=excluded.earliest_finish_at_ms, expires_at_ms=excluded.expires_at_ms,
           proof_updated_at_ms=excluded.proof_updated_at_ms, proof_sequence=0, proof_bar=580000,
           proof_velocity=0, proof_progress=260000, proof_holding=0, proof_samples=0, proof_changes=0,
           proof_seed=excluded.proof_seed
           WHERE fishing_sessions.expires_at_ms < ?
           RETURNING nonce, fish_kind, started_at_ms, bite_at_ms, expires_at_ms, proof_updated_at_ms,
             proof_sequence, proof_bar, proof_velocity, proof_progress, proof_holding, proof_seed`).bind(playerId, nonce, fish.kind, startedAtMs, biteAtMs, biteAtMs + 5400, startedAtMs + 29e3, biteAtMs, proofSeed, playerId, startedAtMs, startedAtMs)]))[1].results[0];
					const active = created ?? database.prepare(`SELECT fishing_sessions.nonce, fishing_sessions.fish_kind, fishing_sessions.started_at_ms,
           fishing_sessions.bite_at_ms, fishing_sessions.expires_at_ms, fishing_sessions.proof_updated_at_ms,
           fishing_sessions.proof_sequence, fishing_sessions.proof_bar, fishing_sessions.proof_velocity,
           fishing_sessions.proof_progress, fishing_sessions.proof_holding, fishing_sessions.proof_seed
         FROM fishing_sessions
         JOIN players ON players.id = fishing_sessions.player_id
         WHERE fishing_sessions.player_id = ? AND fishing_sessions.expires_at_ms >= ?
           AND players.area = 'fishing' AND players.has_rod = 1 AND players.rod_equipped = 1`).bind(playerId, startedAtMs).first();
					if (!active) return Response.json({ error: "Olta şu anda kullanılamıyor." }, { status: 409 });
					const serverNowMs = Date.now();
					return Response.json({
						ok: true,
						fishing: {
							nonce: active.nonce,
							kind: "sokan",
							label: "Bilinmeyen Av",
							difficulty: active.fish_kind === "zargana" ? "zor" : active.fish_kind === "levrek" ? "orta" : "kolay",
							proofSequence: active.proof_sequence,
							proofSeed: active.proof_seed,
							proofBar: active.proof_bar / FISHING_PROOF_SCALE,
							proofVelocity: active.proof_velocity / FISHING_PROOF_SCALE,
							proofProgress: active.proof_progress / FISHING_PROOF_SCALE,
							proofHolding: active.proof_holding === 1,
							proofElapsedMs: Math.max(0, active.proof_updated_at_ms - active.bite_at_ms),
							biteInMs: active.bite_at_ms - serverNowMs,
							expiresInMs: Math.max(1e3, active.expires_at_ms - serverNowMs)
						},
						message: created ? "Oltanı göle attın… şamandırayı izle." : "Devam eden balık avına döndün."
					});
				}
case "fishing_input":{
					enforceRateLimit("fishing-input", auth.account.id, {
						limit: 480,
						windowSeconds: 60,
						blockSeconds: 15
					});
					const nonce = typeof payload.fishingNonce === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(payload.fishingNonce) ? payload.fishingNonce : "";
					const inputSequence = Math.floor(Number(payload.inputSequence));
					if (!nonce || !Number.isSafeInteger(inputSequence) || inputSequence < 1 || typeof payload.holding !== "boolean") return Response.json({ error: "Balık kontrolü geçersiz." }, { status: 400 });
					const inputAtMs = Date.now();
					const proof = database.prepare(`SELECT fish_kind, started_at_ms, bite_at_ms, earliest_finish_at_ms, expires_at_ms,
          proof_updated_at_ms, proof_sequence, proof_bar, proof_velocity, proof_progress,
          proof_holding, proof_samples, proof_changes, proof_seed
         FROM fishing_sessions WHERE player_id = ? AND nonce = ? LIMIT 1`).bind(playerId, nonce).first();
					if (!proof || inputAtMs > proof.expires_at_ms + 3e3) return Response.json({ error: "Balık avı artık geçerli değil." }, { status: 409 });
					if (inputAtMs < proof.bite_at_ms) return Response.json({ error: "Balık henüz vurmadı." }, { status: 425 });
					if (inputSequence !== proof.proof_sequence + 1) return Response.json({
						error: "Balık kontrol sırası eşitleniyor.",
						expectedInputSequence: proof.proof_sequence + 1
					}, { status: 409 });
					const inputs = payload.fishingInputs ?? [{
						at: Math.floor(Number(payload.inputElapsedMs)),
						holding: payload.holding
					}];
					let replay;
					try {
						if (!Array.isArray(inputs) || inputs.some((input) => !input || typeof input !== "object")) throw new Error("invalid_batch");
						replay = replayFishingInputs(proof, inputs, inputAtMs);
					} catch {
						return Response.json({ error: "Balık kontrol zamanı eşitlenemedi. Yeniden olta atabilirsin." }, { status: 409 });
					}
					const advanced = {
						updatedAtMs: replay.state.proof_updated_at_ms,
						bar: replay.state.proof_bar,
						velocity: replay.state.proof_velocity,
						progress: replay.state.proof_progress
					};
					const nextHolding = replay.state.proof_holding;
					const updated = database.prepare(`UPDATE fishing_sessions SET proof_updated_at_ms = ?, proof_sequence = ?, proof_bar = ?,
          proof_velocity = ?, proof_progress = ?, proof_holding = ?, proof_samples = proof_samples + ?,
          proof_changes = proof_changes + ?
         WHERE player_id = ? AND nonce = ? AND proof_sequence = ? AND proof_updated_at_ms = ?
         RETURNING proof_sequence, proof_progress, proof_samples, proof_changes`).bind(advanced.updatedAtMs, inputSequence, advanced.bar, advanced.velocity, advanced.progress, nextHolding, replay.samples, replay.changes, playerId, nonce, proof.proof_sequence, proof.proof_updated_at_ms).first();
					if (!updated) return Response.json({ error: "Balık kontrol sırası eşitleniyor." }, { status: 409 });
					return Response.json({
						ok: true,
						proofSequence: updated.proof_sequence,
						proofState: {
							...advanced,
							updatedAtMs: advanced.updatedAtMs - proof.bite_at_ms,
							holding: nextHolding
						},
						proofProgress: updated.proof_progress / FISHING_PROOF_SCALE
					});
				}
case "finish_fishing":{
					const nonce = typeof payload.fishingNonce === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(payload.fishingNonce) ? payload.fishingNonce : "";
					const nowMs = Date.now();
					const attempt = nonce ? database.prepare(`SELECT fish_kind, started_at_ms, bite_at_ms, earliest_finish_at_ms, expires_at_ms,
          proof_updated_at_ms, proof_sequence, proof_bar, proof_velocity, proof_progress,
          proof_holding, proof_samples, proof_changes, proof_seed
         FROM fishing_sessions WHERE player_id = ? AND nonce = ?`).bind(playerId, nonce).first() : null;
					if (!attempt) return Response.json({ error: "Balık avı artık geçerli değil." }, { status: 409 });
					if (nowMs < attempt.earliest_finish_at_ms) return Response.json({
						error: "Yakalama tamamlanıyor…",
						retryAfterMs: attempt.earliest_finish_at_ms - nowMs
					}, { status: 425 });
					if (nowMs > attempt.expires_at_ms + 3e3) return Response.json({ error: "Av oturumunun süresi doldu; yeniden olta atabilirsin." }, { status: 409 });
					let finishProof = attempt;
					if (payload.fishingInputs !== void 0) try {
						if (!Array.isArray(payload.fishingInputs) || payload.fishingInputs.some((input) => !input || typeof input !== "object")) throw new Error("invalid_batch");
						finishProof = replayFishingInputs(attempt, payload.fishingInputs, nowMs).state;
					} catch {
						return Response.json({ error: "Son balık kontrolü eşitlenemedi." }, { status: 409 });
					}
					const advanced = advanceFishingProof(finishProof, nowMs);
					if (advanced.progress <= 0) return Response.json({ error: "Balık kaçtı; yeniden olta atabilirsin." }, { status: 409 });
					if (finishProof.proof_progress < 1e6 && nowMs - finishProof.proof_updated_at_ms > 5e3 || finishProof.proof_updated_at_ms - finishProof.bite_at_ms < 3600 || advanced.progress < 1e6) return Response.json({ error: "Balığı yeşil alanda biraz daha tutmalısın." }, { status: 425 });
					const fishColumn = attempt.fish_kind === "red_pearl" ? "red_pearls" : attempt.fish_kind === "talisman" ? "talisman_stones" : attempt.fish_kind === "pearl" ? "pearls" : attempt.fish_kind === "zargana" ? "fish_zargana" : attempt.fish_kind === "levrek" ? "fish_levrek" : "fish_sokan";
					const label = attempt.fish_kind === "red_pearl" ? "Kırmızı İnci" : attempt.fish_kind === "talisman" ? "Tılsım Taşı" : attempt.fish_kind === "pearl" ? "Beyaz İnci" : attempt.fish_kind === "zargana" ? "Zargana" : attempt.fish_kind === "levrek" ? "Levrek" : "Sokan Balığı";
					const doubles = globalThis.__colPremium && [
						"sokan",
						"levrek",
						"zargana"
					].includes(attempt.fish_kind);
					const eventReward = globalThis.__colPremium ? rollFishingEventReward(readEventsConfig(settings.events_json), nowMs / 1e3) : null;
					const guideMultiplierSql479 = "CASE WHEN fishing_guide_until > ?1 THEN 2 ELSE 1 END";
					const eventMutation = fishingEventRewardMutation(eventReward?.id, guideMultiplierSql479);
					const result = (database.batch([
						database.prepare(`UPDATE fishing_sessions SET proof_updated_at_ms = ?, proof_bar = ?, proof_velocity = ?, proof_progress = ?
           WHERE player_id = ? AND nonce = ? AND proof_sequence = ? AND proof_updated_at_ms = ?
           RETURNING player_id`).bind(advanced.updatedAtMs, advanced.bar, advanced.velocity, advanced.progress, playerId, nonce, attempt.proof_sequence, attempt.proof_updated_at_ms),
						database.prepare(`UPDATE players SET quest_fish438=MIN(1000000000,quest_fish438+CASE WHEN EXISTS(SELECT 1 FROM quest_settings438 WHERE id=1 AND enabled=1) THEN 1 ELSE 0 END),${fishColumn} = ${fishColumn} + MAX((${doubles ? "CASE WHEN bait_remaining>0 THEN 2 ELSE 1 END" : "1"}),(${guideMultiplierSql479}))${doubles ? ",bait_remaining=MAX(0,bait_remaining-1)" : ""}, last_seen = ?${eventMutation.set ? ", " + eventMutation.set : ""}
          WHERE id = ? AND hp > 0 AND area = 'fishing' AND rod_equipped = 1
          AND EXISTS (SELECT 1 FROM fishing_sessions WHERE player_id = ? AND nonce = ?
            AND earliest_finish_at_ms <= ? AND expires_at_ms + 3000 >= ?
            AND proof_progress >= ?)
          AND changes() > 0
          RETURNING fishing_guide_until, red_pearls, fish_sokan, fish_levrek, fish_zargana, pearls${attempt.fish_kind === "talisman" ? ", talisman_stones" : ""}${doubles ? ", bait_remaining" : ""}${eventMutation.columns ? ", " + eventMutation.columns : ""}`).bind(nowMs, now, playerId, playerId, nonce, nowMs, nowMs, FISHING_PROOF_SCALE),
						database.prepare("DELETE FROM fishing_sessions WHERE player_id = ? AND nonce = ? AND changes() > 0").bind(playerId, nonce)
					]))[1].results[0];
					if (!result) return Response.json({ error: "Av durumu değişti; yeniden kontrol et." }, { status: 409 });
					return Response.json({
						ok: true,
						fishKind: attempt.fish_kind,
						fishingRewardMultiplier: result.fishing_guide_until>nowMs?2:1,
						fish: result,
						eventReward: eventReward ? {
							id: eventReward.id,
							label: eventReward.label
						} : null,
						message: `${label} yakaladın! ${result.fishing_guide_until>nowMs?"Balıkçılık Kılavuzu: av ödülleri 2 kat; Bereketli Olta Yemi ile birleşmez. ":""}${attempt.fish_kind === "pearl" || attempt.fish_kind === "red_pearl" || attempt.fish_kind === "talisman" ? "Malzemeler bölümüne eklendi." : "Çantana eklendi."}${eventReward ? ` Etkinlik ödülü: ${eventReward.label}! Çanta → Nesne Market bölümüne eklendi.` : ""}`
					});
				}
case "cancel_fishing":{
					const nonce = typeof payload.fishingNonce === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(payload.fishingNonce) ? payload.fishingNonce : "";
					if (!nonce) return Response.json({ error: "Balık avı kimliği geçersiz." }, { status: 400 });
					database.batch([database.prepare(`UPDATE players SET fishing_cooldown_until_ms = MAX(fishing_cooldown_until_ms,
             COALESCE((SELECT earliest_finish_at_ms FROM fishing_sessions WHERE player_id = ? AND nonce = ?), 0))
           WHERE id = ?`).bind(playerId, nonce, playerId), database.prepare("DELETE FROM fishing_sessions WHERE player_id = ? AND nonce = ?").bind(playerId, nonce)]);
					return Response.json({
						ok: true,
						message: "Oltanı sudan çektin."
					});
				}
case "sell_fish":{
					if (player.area !== "fishing" || distance(player, FISHERMAN) > FISHERMAN_INTERACTION_RANGE) return Response.json({ error: "Balığı satmak için Balıkçı Hasan'ın yanına gelmelisin." }, { status: 400 });
					if (payload.fishKind === "all") {
      const sold479=database.prepare(`UPDATE players SET gems=gems+fish_sokan*?+fish_levrek*?+fish_zargana*?,fish_sokan=0,fish_levrek=0,fish_zargana=0,last_seen=?
       WHERE id=? AND hp>0 AND area='fishing' AND (fish_sokan>0 OR fish_levrek>0 OR fish_zargana>0)
       RETURNING gems,fish_sokan,fish_levrek,fish_zargana`).bind(settings.fish_sokan_value,settings.fish_levrek_value,settings.fish_zargana_value,now,playerId).first();
      if(!sold479)return Response.json({error:"Çantanda satılacak balık yok."},{status:400});
      return Response.json({ok:true,...sold479,message:"Tüm balıkların satıldı. Mücevherlerin çantana eklendi."});
     }
     if (payload.fishKind !== "sokan" && payload.fishKind !== "levrek" && payload.fishKind !== "zargana") return Response.json({ error: "Balık türü geçersiz." }, { status: 400 });
					const fishKind = payload.fishKind;
					const column = fishKind === "zargana" ? "fish_zargana" : fishKind === "levrek" ? "fish_levrek" : "fish_sokan";
					const value = fishKind === "zargana" ? settings.fish_zargana_value : fishKind === "levrek" ? settings.fish_levrek_value : settings.fish_sokan_value;
					const label = fishKind === "zargana" ? "Zargana" : fishKind === "levrek" ? "Levrek" : "Sokan Balığı";
					const result = database.prepare(`UPDATE players SET ${column} = ${column} - 1, gems = gems + ?, last_seen = ? WHERE id = ? AND hp > 0 AND area = 'fishing' AND ${column} > 0 RETURNING gems, fish_sokan, fish_levrek, fish_zargana`).bind(value, now, playerId).first();
					if (!result) return Response.json({ error: `Çantanda satılacak ${label} yok.` }, { status: 400 });
					return Response.json({
						ok: true,
						...result,
						message: `${label} satıldı · +${value} Mücevher`
					});
				}
case "arena_join_queue":{
					enforceRateLimit("arena-queue", auth.account.id, {
						limit: 20,
						windowSeconds: 60,
						blockSeconds: 15
					});
					if (!isArenaMode(payload.arenaMode)) return Response.json({ error: "Geçerli bir Arena modu seç." }, { status: 400 });
                    if (player.level < 10) return Response.json({ error: "Arena için en az 10. seviye gerekiyor." }, { status: 403 });
					const teamName = safeArenaTeamName(payload.teamName);
					if (teamName.length < 2) return Response.json({ error: "Takım adı en az 2 karakter olmalı." }, { status: 400 });
					if (player.hp <= 0) return Response.json({ error: "Yeniden doğmadan Arena sırasına giremezsin." }, { status: 409 });
					if (player.area === "arena" || player.arena_match_id) return Response.json({ error: "Zaten devam eden bir Arena maçındasın." }, { status: 409 });
					const quota=globalThis.__colArenaMarket.limits(playerId)[payload.arenaMode];if(!quota||quota.used>=quota.limit)return Response.json({error:'Bu modda günlük Arena giriş hakkın doldu. Hakların Türkiye saatiyle 00.00’da yenilenir.'},{status:409});
 const queueNowMs = Date.now();
					const requestedRoom = payload.roomId === void 0 ? "" : safeId(payload.roomId);
					if (payload.roomId !== void 0 && !requestedRoom) return Response.json({ error: "Oda geçersiz." }, { status: 400 });
					const roomId = requestedRoom || crypto.randomUUID();
					const capacity = ARENA_RULES[payload.arenaMode].totalPlayers;
                    const queued498=queueArenaGroup498(database,{playerId,mode:payload.arenaMode,teamName,channel:player.channel,nowMs:queueNowMs,roomId,requestedRoom,teamSize:ARENA_RULES[payload.arenaMode].teamSize,capacity});
                    if(!queued498.ok)return Response.json({error:queued498.error},{status:409});
					const created = tryCreateArenaMatch(database, payload.arenaMode, player.channel, settings, player.world_cycle, queueNowMs, roomId);
					const selectedIndex = created?.selectedIds.indexOf(playerId) ?? -1;
					if (created && selectedIndex >= 0) {
						const spawn = arenaSpawn(selectedIndex < created.rule.teamSize ? 1 : 2, selectedIndex % created.rule.teamSize, created.rule.teamSize);
						return Response.json({
							ok: true,
							matched: true,
							area: "arena",
							x: spawn.x,
							y: spawn.y,
							matchId: created.matchId,
							startsAtMs: created.startsAtMs,
							message: `${ARENA_RULES[payload.arenaMode].label} eşleşmesi bulundu. Arena hazırlanıyor!`
						});
					}
					const waiting = database.prepare("SELECT COUNT(*) AS count FROM arena_queue WHERE room_id = ? AND channel = ?").bind(roomId, player.channel).first();
					return Response.json({
						ok: true,
						queued: true,
						queuedCount: Number(waiting?.count ?? 1),
						needed: ARENA_RULES[payload.arenaMode].totalPlayers,
						message: requestedRoom ? "Odaya katıldın. Oda dolunca maç başlayacak." : "Odan oluşturuldu ve oyunculara listelendi."
					});
				}
case "arena_cancel_queue":{
					const cancelled = database.prepare("DELETE FROM arena_queue WHERE player_id = ? RETURNING player_id").bind(playerId).first();
					return Response.json({
						ok: true,
						cancelled: Boolean(cancelled),
						message: cancelled ? "Arena sırasından ayrıldın." : "Aktif Arena kaydın yok."
					});
				}
case "arena_ack_result":{
					const matchId = safeId(payload.matchId);
					if (!matchId) return Response.json({ error: "Arena sonucu geçersiz." }, { status: 400 });
					database.prepare(`UPDATE arena_match_players SET result_seen_at_ms = ?
         WHERE player_id = ? AND match_id = ? AND result_seen_at_ms = 0
           AND EXISTS (SELECT 1 FROM arena_matches WHERE id = ? AND status = 'finished')`).bind(Date.now(), playerId, matchId, matchId).run();
					return Response.json({ ok: true });
				}
case "invite_party":{
					const targetPlayerId = safeId(payload.targetPlayerId);
					if (!targetPlayerId || targetPlayerId === playerId) return Response.json({ error: "Geçerli bir oyuncu seçmelisin." }, { status: 400 });
					const target = database.prepare("SELECT name FROM players WHERE id = ? AND last_seen >= ? AND channel = ? AND area = ?").bind(targetPlayerId, now - 30, player.channel, player.area).first();
					if (!target) return Response.json({ error: "Oyuncu artık yanında değil." }, { status: 404 });
					const invited494=database.prepare(`INSERT INTO party_invites (recipient_id, sender_id, created_at) SELECT ?, ?, ? WHERE NOT EXISTS(SELECT 1 FROM party_members WHERE player_id=?)
         ON CONFLICT(recipient_id) DO UPDATE SET sender_id = excluded.sender_id, created_at = excluded.created_at WHERE NOT EXISTS(SELECT 1 FROM party_members WHERE player_id=excluded.recipient_id) RETURNING recipient_id`).bind(targetPlayerId,playerId,now,targetPlayerId).first();
          if(!invited494)return Response.json({error:"Oyuncu zaten bir partide."},{status:409});
					deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
						type: "party_invite",
						eventId: crypto.randomUUID(),
						recipientId: targetPlayerId,
						senderId: playerId,
						senderName: player.name,
						createdAt: now,
						serverAt: Date.now()
					}, player.arena_match_id || void 0));
					return Response.json({
						ok: true,
						message: `${target.name} oyuncusuna parti daveti gönderildi.`
					});
				}
case "reject_party":{
          const sender494=safeId(payload.targetPlayerId),stamp494=Number(payload.createdAt);
          if(!sender494||!Number.isSafeInteger(stamp494)||stamp494<1)return Response.json({error:"Parti daveti geçersiz."},{status:400});
          database.prepare("DELETE FROM party_invites WHERE recipient_id=? AND sender_id=? AND created_at=?").bind(playerId,sender494,stamp494).run();
          return Response.json({ok:true,message:"Parti daveti reddedildi."});
        }
case "accept_party":{
					const senderId = safeId(payload.targetPlayerId);
					if (!(senderId ? database.prepare("SELECT sender_id FROM party_invites WHERE recipient_id = ? AND sender_id = ? AND created_at >= ?").bind(playerId, senderId, now - 120).first() : null)) return Response.json({ error: "Parti davetinin süresi dolmuş." }, { status: 404 });
					if (database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first()) return Response.json({ error: "Zaten bir partidesin." }, { status: 400 });
					const senderMembership = database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(senderId).first();
					const partyId = senderMembership?.party_id ?? crypto.randomUUID();
					if (((senderMembership ? database.prepare("SELECT COUNT(*) AS count FROM party_members WHERE party_id = ?").bind(partyId).first() : { count: 1 })?.count ?? 0) >= 5) return Response.json({ error: "Bu parti dolu." }, { status: 409 });
                    const joinedParty = acceptArenaSafeParty498(database,{playerId,senderId,partyId,now,senderMembership});
					if (!joinedParty[joinedParty.length - 2]?.results.length) return Response.json({ error: "Grup dolmuş veya üyelerden biri Arena maçında olabilir. Maç bitince daveti yeniden dene." }, { status: 409 });
					return Response.json({
						ok: true,
						message: "Gruba katıldın. Yakındaki canlı ve aktif üyeler tam EXP ve %2–8 grup bonusu alır. Öz paylaşımı da aktiftir."
					});
				}
case "kick_party":{
          const targetPlayerId = safeId(payload.targetPlayerId);
          if (!targetPlayerId || targetPlayerId === playerId) return Response.json({error:"Başka bir grup üyesi seçmelisin."},{status:400});
          const removed = database.prepare("DELETE FROM party_members WHERE player_id = ? AND player_id <> ?\n        AND party_id IN (SELECT party.id FROM parties party JOIN party_members leader ON leader.party_id=party.id\n          WHERE party.leader_id=? AND leader.player_id=party.leader_id)\n        RETURNING player_id").bind(targetPlayerId,playerId,playerId).first();
          if (!removed) return Response.json({error:"Yalnız grup başkanı kendi grubundan oyuncu çıkarabilir."},{status:403});
          return Response.json({ok:true,message:"Oyuncu gruptan çıkarıldı."});
        }
case "leave_party":{
					const membership = database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first();
					if (!membership) return Response.json({ error: "Bir partide değilsin." }, { status: 400 });
					database.prepare("DELETE FROM party_members WHERE player_id = ?").bind(playerId).run();
					const remaining = database.prepare("SELECT player_id FROM party_members WHERE party_id = ? ORDER BY joined_at LIMIT 1").bind(membership.party_id).first();
					if (remaining) database.prepare("UPDATE parties SET leader_id = CASE WHEN leader_id = ? THEN ? ELSE leader_id END WHERE id = ?").bind(playerId, remaining.player_id, membership.party_id).run();
					else database.prepare("DELETE FROM parties WHERE id = ?").bind(membership.party_id).run();
					return Response.json({
						ok: true,
						message: "Partiden ayrıldın."
					});
				}
case "travel_event":case "travel_dragon":case "travel_rune_v2":case "travel_rune":case "travel_ancient":case "travel_afk":case "travel_market":case "travel_forest":case "travel_frozen":case "travel_fishing":case "travel_sanctum":case "travel_sinsi":case "travel_war":case "travel_black":{
					if (player.area === "arena" || player.arena_match_id) return Response.json({ error: "Arena maçı bitmeden bölgeden ayrılamazsın." }, { status: 409 });
					if ((settlePveEngagement(database, playerId, settings, requestReceivedAtMs))?.dead) return Response.json({ error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun." }, { status: 409 });
					if (player.combat_lock_until_ms > requestReceivedAtMs) return Response.json({ error: "Savaş sürerken ışınlanamazsın. Birkaç saniye uzak durup tekrar dene." }, { status: 409 });
					if (payload.action === "travel_afk" && (player.level < 30 || !settings.afk_island_enabled && !player.is_gm)) return Response.json({ error: "Otomatik Av Adası şu anda yalnızca yönetici ön izlemesine açık veya 30. seviye gerekiyor." }, { status: 403 });
					if (payload.action === "travel_black" && player.level < 40) return Response.json({ error: "Kara Bölge 40. seviyede açılır." }, { status: 403 });
					if (payload.action === "travel_dragon" && !dragonService()?.settings().config.enabled) return Response.json({ error: "Ejderha haritası şu anda kapalı." }, { status: 409 });
					if(payload.action==='travel_rune_v2'&&payload.confirmPvp!==true)return Response.json({error:'PvP ve ölümde %5 mücevher kaybı uyarısını onaylamalısın.',code:'rune_v2_pvp_confirmation_required'},{status:403});if(payload.action==='travel_rune_v2'&&(!runeEligible(player)||!globalThis.__colRuneV2?.settings().config.enabled))return Response.json({error:'Karanlık Rün Sahili şu anda kapalı veya 65. seviye ve rütbe gerekiyor.'},{status:403});if(payload.action==='travel_rune'&&(!runeEligible(player)||!globalThis.__colRunes?.settings().config.enabled))return Response.json({error:RUNE_GATE_MESSAGE},{status:403});
 if(payload.action==='travel_event'&&!globalThis.__colEventIsland444?.settings().config.enabled)return Response.json({error:'Etkinlik Adası şu anda kapalı.'},{status:403});
 const destination = payload.action==='travel_rune_v2'?'rune_v2':payload.action==='travel_event'?'event':payload.action==='travel_rune'?'rune':payload.action === "travel_dragon" ? "dragon" : payload.action === "travel_afk" ? "afk" : payload.action === "travel_ancient" ? "ancient" : payload.action === "travel_black" ? "black" : payload.action === "travel_market" ? "bazaar" : payload.action === "travel_frozen" ? "frozen" : payload.action === "travel_fishing" ? "fishing" : payload.action === "travel_sanctum" ? "sanctum" : payload.action === "travel_sinsi" ? "sinsi" : payload.action === "travel_war" ? "war" : "forest";
					if (destination === "ancient" && !canEnterAncient(settings, player)) return Response.json({ error: "Bu bölge henüz sana açık değil veya 50 seviyeye ulaşmadın." }, { status: 403 });
					if (destination === "sinsi" && player.level < settings.sinsi_stone_unlock_level) return Response.json({ error: `Sinsi Taş Vadisi ${settings.sinsi_stone_unlock_level}. seviyede açılır.` }, { status: 403 });
					if (destination === "frozen" && !settings.frozen_zone_enabled) return Response.json({ error: "Donmuş Çam Geçidi şu anda kapalı." }, { status: 403 });
					if (destination === "frozen" && player.level < 20) return Response.json({ error: `Donmuş Çam Geçidi 20. seviyede açılır.` }, { status: 403 });
					const target = destination === "event" ? EVENT_SPAWN444 : (destination === "rune" || destination === "rune_v2") ? RUNE_SPAWN : destination === "dragon" ? DRAGON_ENTRY : destination === "afk" ? AFK_SPAWN : destination === "ancient" ? ANCIENT_SPAWN : destination === "black" ? BLACK_SPAWN : destination === "frozen" ? FROZEN_SPAWN : destination === "fishing" ? FISHING_SPAWN : destination === "sanctum" ? BOSS_SANCTUM_ENTRY : destination === "sinsi" ? SINSI_STONE_ENTRY : destination === "war" ? WAR_ENTRY : destination === "bazaar" ? BAZAAR_SPAWN : FOREST_SPAWN;
					if (!database.prepare(`UPDATE players SET red_pearls=red_pearls-(CASE WHEN ?='dragon' AND area!='dragon' THEN 1 ELSE 0 END),gems=gems-100*(CASE WHEN ?='dragon' AND area!='dragon' THEN 1 ELSE 0 END),essence=essence-200*(CASE WHEN ?='dragon' AND area!='dragon' THEN 1 ELSE 0 END),area = ?, x = ?, y = ?, last_seen = ?,
          movement_checked_at_ms = ?, movement_debt_ms = 0, motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1,
          realtime_scope_version = realtime_scope_version + 1, combat_lock_until_ms = 0
          WHERE id = ? AND hp > 0 AND combat_lock_until_ms <= ? AND realtime_scope_version = ?
            AND (? != 'frozen' OR level >= ?)
            AND (? != 'afk' OR (level >= 30 AND ((SELECT afk_island_enabled FROM combat_settings WHERE id=1)=1 OR is_gm=1)))
            AND (? != 'ancient' OR (level>=50 AND ${levelCapSql()}=65))
 AND (? != 'event' OR json_extract((SELECT config_json FROM event_island_settings444 WHERE id=1),'$.enabled')=1) AND (? NOT IN ('rune','rune_v2') OR (level>=65 AND rank_tier>=1)) AND (CASE WHEN ?='rune_v2' THEN json_extract((SELECT config_json FROM rune_v2_settings WHERE id=1),'$.enabled') ELSE 1 END)=1 AND (?!='dragon' OR area='dragon' OR (red_pearls>=1 AND gems>=100 AND essence>=200))
          RETURNING id`).bind(destination,destination,destination,destination, target.x, target.y, now, Date.now(), playerId, requestReceivedAtMs, player.realtime_scope_version, destination, 20, destination, destination, destination,destination,destination,destination).first()) return Response.json({ error: destination==="dragon"?"Ejderha girişi için 1 Kırmızı İnci, 100 Mücevher ve 200 Öz gerekir. Savaş dışında tekrar dene.":"Savaş veya karakter durumu değişti; bölge geçişini tekrar dene." }, { status: 409 });
					return Response.json({
						ok: true,
						area: destination,
						x: target.x,
						y: target.y,
						message: destination === "rune_v2" ? "Karanlık Rün Sahili’ye vardın." : destination === "event" ? "Etkinlik Adası’na vardın." : destination === "rune" ? "Kadim Rün Sahili’ne vardın." : destination === "dragon" ? "Külkanat Krateri’ne vardın." : destination === "afk" ? "Otomatik Av Adası’na vardın. Oto avı açarak süreyi başlat." : destination === "ancient" ? "Kadim Kök Vadisi’ne vardın." : destination === "black" ? "Kara Bölge: PvP açık. Ölünce eşyaların korunur ve burada yeniden doğarsın." : destination === "bazaar" ? "Pazar Köyü'ne vardın." : destination === "frozen" ? "Donmuş Çam Geçidi'ne vardın." : destination === "fishing" ? "Şelale Gölü'ne vardın." : destination === "sanctum" ? "Yaşam Çekirdeği Tapınağı'na ışınlandın." : destination === "sinsi" ? "Sinsi Taş Vadisi'ne vardın." : destination === "war" ? "Savaş Meydanı'na girdin. Tüm gezginler artık rakibin." : "Kuzey Ormanı'na döndün."
					});
				}default:throw Error("native_action_unbound");}}
function planMemory(port,context){const {player,playerId,payload,settings,attackTargetId,preloadedAttackMonster,requestReceivedAtMs,now,auth}=context;
					const control = port.control(playerId);
					if (player.role === "muhafiz" && Number(payload.ability) === 2 && Number(control?.root_until_ms) > Date.now()) return Response.json({ error: "Sabitlenmişken hamle yapamazsın." }, { status: 409 });
					if (Number(control?.stun_until_ms) > Date.now()) return Response.json({
						error: "Sersemletildin; kısa süre sonra saldırabilirsin.",
						code: "combat_stunned"
					}, { status: 409 });
					const intentId = typeof payload.intentId === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(payload.intentId) ? payload.intentId : void 0;
					const targetId = typeof payload.targetId === "string" ? payload.targetId : "";
					const requestedSpawnRound = Number(payload.spawnRound);
					const publishMonsterAttackRejection = () => {
						if (intentId && targetId && Number.isSafeInteger(requestedSpawnRound) && requestedSpawnRound >= 0) publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
							type: "monster_reject",
							eventId: `monster-reject:${intentId}:${Date.now()}`,
							intentId,
							attackerId: playerId,
							targetId,
							spawnRound: requestedSpawnRound,
							serverAt: Date.now()
						});
					};
					let attackPveHit;
					const rejectMonsterAttack = (error, status) => {
						deliverRealtime(publishMonsterAttackRejection());
						return Response.json({
							pveHit: attackPveHit,
							error
						}, { status });
					};
					if (!isAdventureArea(player.area) && player.area !== "event" && player.area !== "rune_v2" && player.area !== "rune" && player.area !== "ancient" && player.area !== "forest" && player.area !== "frozen" && player.area !== "sanctum" && player.area !== "dragon" && player.area !== "sinsi" && player.area !== "black" && player.area !== "afk") return rejectMonsterAttack("Bu bölgede savaşılmaz.", 400);
					if (player.area === "afk") {
						if (!settings.afk_island_enabled && !player.is_gm) return rejectMonsterAttack("Ada oyunculara henüz açık değil.", 403);
						const hunt = port.afk(playerId);
						if (!hunt?.active || hunt.day !== afkDay(Date.now()) || Date.now() - hunt.tick_at_ms > 15e3 || afkRemaining(hunt, Date.now()) <= 0) return rejectMonsterAttack("Oto av kapalı veya bugünkü süren doldu.", 403);
					}
					if (player.rod_equipped) return rejectMonsterAttack("Savaşmak için çantandan bir silah kuşanmalısın.", 400);
					const pendingRetaliation = port.retaliate(playerId,settings,Date.now());
					attackPveHit = pendingRetaliation?.pveHit;
					if (pendingRetaliation) {
						player.hp = pendingRetaliation.hp;
						player.hp_revision = pendingRetaliation.hp_revision;
						player.respawn_at_ms = pendingRetaliation.respawn_at_ms;
						if (pendingRetaliation.dead) return rejectMonsterAttack("Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun.", 409);
					}
					timing.mark("pve_retaliation");
					const attackingPlayer = player;
					if (!Number.isSafeInteger(requestedSpawnRound) || requestedSpawnRound < 0) return rejectMonsterAttack("Geçersiz yaratık turu.", 400);
					const monster = targetId === attackTargetId ? preloadedAttackMonster : null;
					if (!monster) return rejectMonsterAttack("Yaratık bulunamadı.", 404);
					if (!monsterIsInPlayerWorld(monster, player)) return rejectMonsterAttack("Bu yaratık başka bir bölgede.", 409);
					const publishCurrentMonsterState = () => {
						const channels = monster.channel === 0 ? Array.from({ length: fourChannels ? 4 : 3 }, (_, channelIndex) => channelIndex + 1) : [monster.channel];
						publishRealtimeRoomEventToChannels(player.world_cycle, channels, player.area, {
							type: "monster_result",
							eventId: `monster-state:${intentId ?? crypto.randomUUID()}:${monster.id}:${monster.spawn_round}`,
							intentId,
							attackerId: playerId,
							targetId: monster.id,
							ability: clamp$1(Math.floor(Number(payload.ability) || 0), 0, 3),
							hits: [],
							states: [{
								id: monster.id,
								spawnRound: monster.spawn_round,
								hp: Math.max(0, monster.hp)
							}],
							serverAt: Date.now()
						}, player.channel);
					};
					if (monster.hp <= 0) {
						deliverRealtime(publishCurrentMonsterState());
						return Response.json({
							pveHit: attackPveHit,
							ok: true,
							hits: [],
							states: [{
								id: monster.id,
								spawnRound: monster.spawn_round,
								hp: 0
							}],
							xp: 0,
							groundDrops: 0,
							message: "Yaratık yenildi."
						});
					}
					if (monster.spawn_round !== requestedSpawnRound) {
						deliverRealtime(publishCurrentMonsterState());
						return Response.json({
							pveHit: attackPveHit,
							ok: true,
							hits: [],
							states: [{
								id: monster.id,
								spawnRound: monster.spawn_round,
								hp: monster.hp
							}],
							xp: 0,
							groundDrops: 0,
							message: "Yaratığın güncel turu eşitlendi."
						});
					}
					const syncedMonsterPosition = monsterCombatPosition(monster, attackingPlayer);
					const combatMonster = syncedMonsterPosition.supplied ? {
						...monster,
						x: syncedMonsterPosition.x,
						y: syncedMonsterPosition.y
					} : monster;
					const ability = clamp$1(Math.floor(Number(payload.ability) || 0), 0, 3);
					const branch456=ability===3?colSpec456(player.role,player.specialization,settings):null;
 if(ability===3&&(!branch456||['heal','guard'].includes(branch456.effect)||!Number.isInteger(Number(payload.ability))||Number(payload.ability)!==3))return Response.json({error:'Uzmanlık saldırısı açık değil.'},{status:409});
 const unlockLevel=ability===3?30:ability===0?1:ability===1?settings.skill_two_unlock_level:settings.skill_three_unlock_level;
					if (player.level < unlockLevel) return rejectMonsterAttack(`Bu yetenek ${unlockLevel}. seviyede açılır.`, 400);
					const baseRange = player.role === "muhafiz" ? 190 : player.role === "avci" ? 500 : 470;
					const attackRange = player.role === "muhafiz" && (ability===1||ability===2) ? ability === 1 ? 720 : 600 : ability === 2 ? Math.max(baseRange, 285) : baseRange;
					const chaseLeeway = monster.is_boss || isFrozenEliteId(monster.id) ? 125 : 100;
					if (player.role === "muhafiz" && ability > 0 && !isAreaWalkableSegment(player.area, player.x, player.y, combatMonster.x, combatMonster.y)) return rejectMonsterAttack("Hedef ile aranda engel var.", 400);
					if (distance(attackingPlayer, combatMonster) > attackRange + (player.role === "muhafiz" && ability > 0 ? 0 : chaseLeeway)) return rejectMonsterAttack("Yaratık menzil dışında.", 400);
					const nowMs = Date.now();
					const attackColumn=ability===3?"attack_four_at":ability===0?"attack_one_at":ability===1?"attack_two_at":"attack_three_at";
					const enchantmentTotals = createEnchantmentTotals(equippedEnchantItems(player));
					const baseCooldownMs=ability===3?branch456.cooldown:ability===0?650:ability===1?settings.skill_two_cooldown_ms:settings.skill_three_cooldown_ms;
					const cooldownMs = ability === 0 ? effectiveAttackCooldownMs(baseCooldownMs, enchantmentTotals("attack_speed") + (player.set_speed ?? 0)) : effectiveSkillCooldown444(baseCooldownMs, Math.min(50,enchantmentTotals("cast_speed")+(player.jewelry_cast_speed||0)));
					const cooldownGraceMs = ability === 0 ? 220 : 0;
					const cooldownAtMs = requestReceivedAtMs;
if((isMistArea(player.area)||player.area==='black'||player.area==='rune_v2')&&ability===2&&player.role!=='muhafiz'){
  const mixedPoint473=areaSkillPoint(monster,attackingPlayer,readAreaSkillHints(payload.areaTargets).get(monster.id),nowMs,true,false);
  const mixedPlayers473=prepareMixedPlayers473(player,settings,mixedPoint473,nowMs,null);
  if(mixedPlayers473.length){
   if(typeof port.mixedAttack!=='function')return rejectMonsterAttack('Alan saldırısı için oyun sunucusuna yeniden bağlan.',503);
   const mixedCenter473={kind:'monster',id:monster.id,spawnRound:monster.spawn_round,x:mixedPoint473.x,y:mixedPoint473.y,rangeX:combatMonster.x,rangeY:combatMonster.y,rangeLeeway:chaseLeeway};
   const mixedTargets473=selectMixedMonsters473(player,mixedCenter473,monster,payload,nowMs);
   if(!mixedTargets473.some(row=>row.id===monster.id&&row.spawn_round===monster.spawn_round))return rejectMonsterAttack('Yaratığın turu değişti; hedefi yeniden seç.',409);
   return runMixedBlack473({player,settings,center473:mixedCenter473,monster,targets:mixedTargets473,playerPlans473:mixedPlayers473,rolls473:{critical:mixedPlayers473[0].criticalRoll},nowMs,cooldownAtMs,cooldownMs,intentId,attackPveHit,reject473:rejectMonsterAttack});
  }
 }
const nativeGuardedBatch=false,memoryCombat=true;
const cooldownAccepted=port.reservePreview({playerId,player:attackingPlayer,attackColumn,cooldownMs,cooldownAtMs,cooldownGraceMs,nowMs});
if(!cooldownAccepted){if(ability===0){deliverRealtime(publishMonsterAttackRejection());return rejectBasicAttackCadence(cooldownMs,attackPveHit);}return rejectMonsterAttack("Yetenek henüz hazır değil.",429);}
					timing.mark("pve_validation");
					let reservedUntilMs = Number(cooldownAccepted?.reserved_until ?? 0);
					let actualDamageDealt = 0;
					let guardianEffect = null;
					const premium499=premiumBuff(player.id);
 const roleBase = (player.role === "arkanist" ? settings.arcanist_base_attack : player.role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack) + guildBuff(player.id).attack + premium499.attack + (player.set_attack??0);
					const skillGrowth = 1 + ([
						player.skill_one,
						player.skill_two,
						player.skill_three,player.skill_four
					][ability] - 1) * settings.skill_upgrade_damage_per_level;
					const multipliers = [
						settings.skill_one_multiplier,
						settings.skill_two_multiplier,
						settings.skill_three_multiplier,branch456?.multiplier??1
					];
					const criticalChance = clamp$1(settings.base_critical_chance + (ability === 2 ? settings.third_skill_critical_bonus : 0) + (hasWingBonus(player) ? settings.wing_critical_chance : 0) + (enchantmentTotals("critical") + enchantmentTotals("stone_critical")) / 100, 0, .95);
					const critical = Math.random() < criticalChance;
					const wingAttack = (hasWingBonus(player) ? settings.wing_attack_bonus : 0) + (player.pet_kind === "dog" ? 0 : player.pet_kind === "dragon" ? 45 : player.pet_kind === "starter" ? 10 : player.pet_kind ? 20 : 0);
					const firePercent = enchantmentTotals("fire");
					const icePercent = enchantmentTotals("ice");
					const all = ability === 2 && player.role !== "muhafiz" ? port.monsters(player) : [monster];
					const areaHints = ability === 2 && player.role !== "muhafiz" ? readAreaSkillHints(payload.areaTargets) : /* @__PURE__ */ new Map();
					const recentlyProvoked = /* @__PURE__ */ new Set();
					if (areaHints.size > 0) {
						const attacks = {results:port.recentAttacks(playerId,nowMs-8e3)};
						for (const attack of attacks.results) if (areaHints.has(attack.target_id)) recentlyProvoked.add(attack.target_id);
					}
					const areaPoint = (target) => areaSkillPoint(target, attackingPlayer, areaHints.get(target.id), nowMs, target.id === monster.id, recentlyProvoked.has(target.id));
					const areaCenter = areaPoint(monster);
					const targets = ability === 2 && player.role !== "muhafiz" ? all.filter((candidate) => monsterIsInPlayerWorld(candidate, player) && distance(areaCenter, areaPoint(candidate)) <= 300) : [monster];
					const stoneAttackPower = enchantmentTotals("stone_attack");
					const rankPveBonus = serverRankBonuses(player.id).pve + (player.set_pve ?? 0) + (premium499.monsters ?? 0);
					const regionMultiplier = (target) => regionalMonsterMultiplier(target.area, enchantmentTotals("forest_power"), enchantmentTotals("frozen_power"), !!target.is_stone) * (target.is_stone ? 1 : 1 + ((player.weapon_skin_enabled === 1 ? 10 : 0) + rankPveBonus + (player.arena_wings_equipped===1&&(!(player.arena_wings_expires_at_ms>0)||player.arena_wings_expires_at_ms>nowMs)?10:0)) / 100) * (enchantmentTotals("stone_talisman") > 0 ? 1.02 : 1);
					const minimumDirectDamage = Math.max(1, Math.floor(colRuneFactor(player,'attack')*(roleBase + player.equipped_weapon_power + stoneAttackPower + wingAttack) * multipliers[ability] * skillGrowth * settings.skill_damage_scale));
					const minimumPreviewDamage = minimumDirectDamage + (firePercent ? Math.max(1, Math.round(minimumDirectDamage * firePercent / 100)) : 0) + (icePercent ? Math.max(1, Math.round(minimumDirectDamage * icePercent / 100)) : 0);
					const foreignRealtimeChannels = Array.from({ length: fourChannels ? 4 : 3 }, (_, channelIndex) => channelIndex + 1).filter((channel) => channel !== player.channel);
					const monsterPreviews = targets.map((target) => ({
						targetId: target.id,
						spawnRound: target.spawn_round,
						damage: Math.max(1, Math.floor(minimumPreviewDamage * regionMultiplier(target))),
						targetX: target.id === monster.id ? combatMonster.x : areaPoint(target).x,
						targetY: target.id === monster.id ? combatMonster.y : areaPoint(target).y
					}));
					const previewPublishes = [];
					const publishPreviewGroup = (scope, channels, previews) => {
						const primaryPreview = previews[0];
						return publishRealtimeRoomEventToChannels(player.world_cycle, channels, player.area, {
							type: "monster_preview",
							eventId: `monster-preview:${intentId}:${scope}`,
							intentId,
							attackerId: playerId,
							targetId: primaryPreview.targetId,
							spawnRound: primaryPreview.spawnRound,
							damage: primaryPreview.damage,
							previews,
							serverAt: nowMs
						});
					};
					const publishMonsterPreviews = () => {
						if (intentId) {
							const currentChannelPreviews = monsterPreviews.filter((_, index) => targets[index].channel === 0 || targets[index].channel === player.channel);
							const foreignSharedPreviews = monsterPreviews.filter((_, index) => targets[index].channel === 0);
							if (currentChannelPreviews.length) previewPublishes.push(publishPreviewGroup("current", [player.channel], currentChannelPreviews));
							if (foreignRealtimeChannels.length && foreignSharedPreviews.length) previewPublishes.push(publishPreviewGroup("shared", foreignRealtimeChannels, foreignSharedPreviews));
						}
					};
					if (!nativeGuardedBatch && !memoryCombat) publishMonsterPreviews();
					const hits = [];
					const states = [];
					const postPublishTasks = [];
					const groundDrops = 0;
					const progression = [];
					let ownXpGain = 0;
					const eventConfig = readEventsConfig(settings.events_json);
					const eventRates = {forge491:forgeDropSnapshot491(settings),cauldron488:cauldronDropSnapshot488(settings,player.area),highLevelBalance487:balanceSnapshot487(settings,player.area),
						materials: globalThis.__colProgression?.snapshot().materials,
						loot: eventBonus(eventConfig, "loot", now),
						xp: eventBonus(eventConfig, "xp", now),
						essence: eventBonus(eventConfig, "essence", now),
						chest: eventBonus(eventConfig, "chest", now),
						moonlight: eventBonus(eventConfig, "moonlight", now), halloween:eventBonus(eventConfig,"halloween",now)
					};
					const prepareMonsterHit=(target,targetIndex,rolledHit465=null)=>{
						const directDamage = rolledHit465?.directDamage ?? Math.max(1, Math.floor(colRuneFactor(player,'attack')*(roleBase + player.equipped_weapon_power + stoneAttackPower + wingAttack + Math.random() * 7) * multipliers[ability] * skillGrowth * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
						const elemental = rolledHit465?.elemental ?? [...firePercent ? [{
							kind: "fire",
							damage: Math.max(1, Math.round(directDamage * firePercent / 100))
						}] : [], ...icePercent ? [{
							kind: "ice",
							damage: Math.max(1, Math.round(directDamage * icePercent / 100))
						}] : []];
						const rolled = rolledHit465?.rolled ?? Math.max(1, Math.floor((directDamage + elemental.reduce((sum, entry) => sum + entry.damage, 0)) * regionMultiplier(target)));
						const respawn = isAdventureArea(target.area)?0:target.area==='event'?0:now + (target.area==='rune_v2'?globalThis.__colRuneV2.monster(target).respawnSeconds:target.area==='rune'?globalThis.__colRunes.monster(target).respawnSeconds:target.id === "dragon-world-1" ? dragonService()?.settings().config.interval ?? 10800 : isBlackStoneBoss476(target.id) ? settings.black_stone_boss_respawn_seconds : isFrozenBossId(target.id) ? settings.frozen_boss_respawn_seconds : target.id === "ancient-boss-1" ? settings.ancient_boss_respawn_seconds : isFrozenWaterId(target.id) ? settings.frozen_water_respawn_seconds : target.is_boss ? settings.boss_respawn_seconds : target.is_stone ? settings.sinsi_stone_respawn_seconds : target.summoned ? 2 : target.area === "ancient" ? settings.ancient_monster_respawn_seconds : target.area === "forest" ? colLabNormalRespawnSecondsR10(target, settings.forest_monster_respawn_seconds) : target.area === "frozen" ? settings.frozen_monster_respawn_seconds : target.area === "black" ? settings.black_monster_respawn_seconds : target.area === "afk" ? settings.afk_island_respawn_seconds : 18);
						
return {target,targetIndex,directDamage,elemental,rolled,respawn};};
return {accepted:true,player,attackingPlayer,monster,combatMonster,ability,intentId,attackPveHit,attackColumn,cooldownMs,cooldownAtMs,cooldownGraceMs,nowMs,branch456,critical,enchantmentTotals,targets,plans:targets.map(prepareMonsterHit),monsterPreviews,eventRates,foreignRealtimeChannels};}
 function memoryAttack(port,context){const {player,playerId,payload,settings,attackTargetId,preloadedAttackMonster,requestReceivedAtMs,now,auth}=context;
					const control = port.control(playerId);
					if (player.role === "muhafiz" && Number(payload.ability) === 2 && Number(control?.root_until_ms) > Date.now()) return Response.json({ error: "Sabitlenmişken hamle yapamazsın." }, { status: 409 });
					if (Number(control?.stun_until_ms) > Date.now()) return Response.json({
						error: "Sersemletildin; kısa süre sonra saldırabilirsin.",
						code: "combat_stunned"
					}, { status: 409 });
					const intentId = typeof payload.intentId === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(payload.intentId) ? payload.intentId : void 0;
					const targetId = typeof payload.targetId === "string" ? payload.targetId : "";
					const requestedSpawnRound = Number(payload.spawnRound);
					const publishMonsterAttackRejection =  () => {
						if (intentId && targetId && Number.isSafeInteger(requestedSpawnRound) && requestedSpawnRound >= 0) publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
							type: "monster_reject",
							eventId: `monster-reject:${intentId}:${Date.now()}`,
							intentId,
							attackerId: playerId,
							targetId,
							spawnRound: requestedSpawnRound,
							serverAt: Date.now()
						});
					};
					let attackPveHit;
					const rejectMonsterAttack =  (error, status) => {
						deliverRealtime(publishMonsterAttackRejection());
						return Response.json({
							pveHit: attackPveHit,
							error
						}, { status });
					};
					if (!isAdventureArea(player.area) && player.area !== "event" && player.area !== "rune_v2" && player.area !== "rune" && player.area !== "ancient" && player.area !== "forest" && player.area !== "frozen" && player.area !== "sanctum" && player.area !== "dragon" && player.area !== "sinsi" && player.area !== "black" && player.area !== "afk") return rejectMonsterAttack("Bu bölgede savaşılmaz.", 400);
					if (player.area === "afk") {
						if (!settings.afk_island_enabled && !player.is_gm) return rejectMonsterAttack("Ada oyunculara henüz açık değil.", 403);
						const hunt = port.afk(playerId);
						if (!hunt?.active || hunt.day !== afkDay(Date.now()) || Date.now() - hunt.tick_at_ms > 15e3 || afkRemaining(hunt, Date.now()) <= 0) return rejectMonsterAttack("Oto av kapalı veya bugünkü süren doldu.", 403);
					}
					if (player.rod_equipped) return rejectMonsterAttack("Savaşmak için çantandan bir silah kuşanmalısın.", 400);
					const pendingRetaliation = port.retaliate(playerId,settings,Date.now());
					attackPveHit = pendingRetaliation?.pveHit;
					if (pendingRetaliation) {
						player.hp = pendingRetaliation.hp;
						player.hp_revision = pendingRetaliation.hp_revision;
						player.respawn_at_ms = pendingRetaliation.respawn_at_ms;
						if (pendingRetaliation.dead) return rejectMonsterAttack("Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun.", 409);
					}
					timing.mark("pve_retaliation");
					const attackingPlayer = player;
					if (!Number.isSafeInteger(requestedSpawnRound) || requestedSpawnRound < 0) return rejectMonsterAttack("Geçersiz yaratık turu.", 400);
					const monster = targetId === attackTargetId ? preloadedAttackMonster : null;
					if (!monster) return rejectMonsterAttack("Yaratık bulunamadı.", 404);
					if (!monsterIsInPlayerWorld(monster, player)) return rejectMonsterAttack("Bu yaratık başka bir bölgede.", 409);
					const publishCurrentMonsterState =  () => {
						const channels = monster.channel === 0 ? Array.from({ length: fourChannels ? 4 : 3 }, (_, channelIndex) => channelIndex + 1) : [monster.channel];
						publishRealtimeRoomEventToChannels(player.world_cycle, channels, player.area, {
							type: "monster_result",
							eventId: `monster-state:${intentId ?? crypto.randomUUID()}:${monster.id}:${monster.spawn_round}`,
							intentId,
							attackerId: playerId,
							targetId: monster.id,
							ability: clamp$1(Math.floor(Number(payload.ability) || 0), 0, 3),
							hits: [],
							states: [{
								id: monster.id,
								spawnRound: monster.spawn_round,
								hp: Math.max(0, monster.hp)
							}],
							serverAt: Date.now()
						}, player.channel);
					};
					if (monster.hp <= 0) {
						deliverRealtime(publishCurrentMonsterState());
						return Response.json({
							pveHit: attackPveHit,
							ok: true,
							hits: [],
							states: [{
								id: monster.id,
								spawnRound: monster.spawn_round,
								hp: 0
							}],
							xp: 0,
							groundDrops: 0,
							message: "Yaratık yenildi."
						});
					}
					if (monster.spawn_round !== requestedSpawnRound) {
						deliverRealtime(publishCurrentMonsterState());
						return Response.json({
							pveHit: attackPveHit,
							ok: true,
							hits: [],
							states: [{
								id: monster.id,
								spawnRound: monster.spawn_round,
								hp: monster.hp
							}],
							xp: 0,
							groundDrops: 0,
							message: "Yaratığın güncel turu eşitlendi."
						});
					}
					const syncedMonsterPosition = monsterCombatPosition(monster, attackingPlayer);
					const combatMonster = syncedMonsterPosition.supplied ? {
						...monster,
						x: syncedMonsterPosition.x,
						y: syncedMonsterPosition.y
					} : monster;
					const ability = clamp$1(Math.floor(Number(payload.ability) || 0), 0, 3);
					const branch456=ability===3?colSpec456(player.role,player.specialization,settings):null;
 if(ability===3&&(!branch456||['heal','guard'].includes(branch456.effect)||!Number.isInteger(Number(payload.ability))||Number(payload.ability)!==3))return Response.json({error:'Uzmanlık saldırısı açık değil.'},{status:409});
 const unlockLevel=ability===3?30:ability===0?1:ability===1?settings.skill_two_unlock_level:settings.skill_three_unlock_level;
					if (player.level < unlockLevel) return rejectMonsterAttack(`Bu yetenek ${unlockLevel}. seviyede açılır.`, 400);
					const baseRange = player.role === "muhafiz" ? 190 : player.role === "avci" ? 500 : 470;
					const attackRange = player.role === "muhafiz" && (ability===1||ability===2) ? ability === 1 ? 720 : 600 : ability === 2 ? Math.max(baseRange, 285) : baseRange;
					const chaseLeeway = monster.is_boss || isFrozenEliteId(monster.id) ? 125 : 100;
					if (player.role === "muhafiz" && ability > 0 && !isAreaWalkableSegment(player.area, player.x, player.y, combatMonster.x, combatMonster.y)) return rejectMonsterAttack("Hedef ile aranda engel var.", 400);
					if (distance(attackingPlayer, combatMonster) > attackRange + (player.role === "muhafiz" && ability > 0 ? 0 : chaseLeeway)) return rejectMonsterAttack("Yaratık menzil dışında.", 400);
					const nowMs = Date.now();
					const attackColumn=ability===3?"attack_four_at":ability===0?"attack_one_at":ability===1?"attack_two_at":"attack_three_at";
					const enchantmentTotals = createEnchantmentTotals(equippedEnchantItems(player));
					const baseCooldownMs=ability===3?branch456.cooldown:ability===0?650:ability===1?settings.skill_two_cooldown_ms:settings.skill_three_cooldown_ms;
					const cooldownMs = ability === 0 ? effectiveAttackCooldownMs(baseCooldownMs, enchantmentTotals("attack_speed") + (player.set_speed ?? 0)) : effectiveSkillCooldown444(baseCooldownMs, Math.min(50,enchantmentTotals("cast_speed")+(player.jewelry_cast_speed||0)));
					const cooldownGraceMs = ability === 0 ? 220 : 0;
					const cooldownAtMs = requestReceivedAtMs;
if((isMistArea(player.area)||player.area==='black'||player.area==='rune_v2')&&ability===2&&player.role!=='muhafiz'){
  const mixedPoint473=areaSkillPoint(monster,attackingPlayer,readAreaSkillHints(payload.areaTargets).get(monster.id),nowMs,true,false);
  const mixedPlayers473=prepareMixedPlayers473(player,settings,mixedPoint473,nowMs,null);
  if(mixedPlayers473.length){
   if(typeof port.mixedAttack!=='function')return rejectMonsterAttack('Alan saldırısı için oyun sunucusuna yeniden bağlan.',503);
   const mixedCenter473={kind:'monster',id:monster.id,spawnRound:monster.spawn_round,x:mixedPoint473.x,y:mixedPoint473.y,rangeX:combatMonster.x,rangeY:combatMonster.y,rangeLeeway:chaseLeeway};
   const mixedTargets473=selectMixedMonsters473(player,mixedCenter473,monster,payload,nowMs);
   if(!mixedTargets473.some(row=>row.id===monster.id&&row.spawn_round===monster.spawn_round))return rejectMonsterAttack('Yaratığın turu değişti; hedefi yeniden seç.',409);
   return runMixedBlack473({player,settings,center473:mixedCenter473,monster,targets:mixedTargets473,playerPlans473:mixedPlayers473,rolls473:{critical:mixedPlayers473[0].criticalRoll},nowMs,cooldownAtMs,cooldownMs,intentId,attackPveHit,reject473:rejectMonsterAttack});
  }
 }
const memoryCombat=(guard,plans)=>port.commitHits(guard,plans),nativeGuardedBatch=null;const cooldownStatement={playerId,player:attackingPlayer,attackColumn,cooldownMs,cooldownAtMs,cooldownGraceMs,nowMs};
					const cooldownAccepted = nativeGuardedBatch || memoryCombat ? null : cooldownStatement.first();
					if (!nativeGuardedBatch && !memoryCombat && !cooldownAccepted) {
						if (ability === 0) {
							deliverRealtime(publishMonsterAttackRejection());
							return rejectBasicAttackCadence(cooldownMs, attackPveHit);
						}
						return rejectMonsterAttack("Yetenek henüz hazır değil.", 429);
					}
					timing.mark("pve_validation");
					let reservedUntilMs = Number(cooldownAccepted?.reserved_until ?? 0);
					let actualDamageDealt = 0;
					let guardianEffect = null;
					const premium499=premiumBuff(player.id);
 const roleBase = (player.role === "arkanist" ? settings.arcanist_base_attack : player.role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack) + guildBuff(player.id).attack + premium499.attack + (player.set_attack??0);
					const skillGrowth = 1 + ([
						player.skill_one,
						player.skill_two,
						player.skill_three,player.skill_four
					][ability] - 1) * settings.skill_upgrade_damage_per_level;
					const multipliers = [
						settings.skill_one_multiplier,
						settings.skill_two_multiplier,
						settings.skill_three_multiplier,branch456?.multiplier??1
					];
					const criticalChance = clamp$1(settings.base_critical_chance + (ability === 2 ? settings.third_skill_critical_bonus : 0) + (hasWingBonus(player) ? settings.wing_critical_chance : 0) + (enchantmentTotals("critical") + enchantmentTotals("stone_critical")) / 100, 0, .95);
					const critical = Math.random() < criticalChance;
					const wingAttack = (hasWingBonus(player) ? settings.wing_attack_bonus : 0) + (player.pet_kind === "dog" ? 0 : player.pet_kind === "dragon" ? 45 : player.pet_kind === "starter" ? 10 : player.pet_kind ? 20 : 0);
					const firePercent = enchantmentTotals("fire");
					const icePercent = enchantmentTotals("ice");
					const all = ability === 2 && player.role !== "muhafiz" ? port.monsters(player) : [monster];
					const areaHints = ability === 2 && player.role !== "muhafiz" ? readAreaSkillHints(payload.areaTargets) : /* @__PURE__ */ new Map();
					const recentlyProvoked = /* @__PURE__ */ new Set();
					if (areaHints.size > 0) {
						const attacks = {results:port.recentAttacks(playerId,nowMs-8e3)};
						for (const attack of attacks.results) if (areaHints.has(attack.target_id)) recentlyProvoked.add(attack.target_id);
					}
					const areaPoint = (target) => areaSkillPoint(target, attackingPlayer, areaHints.get(target.id), nowMs, target.id === monster.id, recentlyProvoked.has(target.id));
					const areaCenter = areaPoint(monster);
					const targets = ability === 2 && player.role !== "muhafiz" ? all.filter((candidate) => monsterIsInPlayerWorld(candidate, player) && distance(areaCenter, areaPoint(candidate)) <= 300) : [monster];
					const stoneAttackPower = enchantmentTotals("stone_attack");
					const rankPveBonus = serverRankBonuses(player.id).pve + (player.set_pve ?? 0) + (premium499.monsters ?? 0);
					const regionMultiplier = (target) => regionalMonsterMultiplier(target.area, enchantmentTotals("forest_power"), enchantmentTotals("frozen_power"), !!target.is_stone) * (target.is_stone ? 1 : 1 + ((player.weapon_skin_enabled === 1 ? 10 : 0) + rankPveBonus + (player.arena_wings_equipped===1&&(!(player.arena_wings_expires_at_ms>0)||player.arena_wings_expires_at_ms>nowMs)?10:0)) / 100) * (enchantmentTotals("stone_talisman") > 0 ? 1.02 : 1);
					const minimumDirectDamage = Math.max(1, Math.floor(colRuneFactor(player,'attack')*(roleBase + player.equipped_weapon_power + stoneAttackPower + wingAttack) * multipliers[ability] * skillGrowth * settings.skill_damage_scale));
					const minimumPreviewDamage = minimumDirectDamage + (firePercent ? Math.max(1, Math.round(minimumDirectDamage * firePercent / 100)) : 0) + (icePercent ? Math.max(1, Math.round(minimumDirectDamage * icePercent / 100)) : 0);
					const foreignRealtimeChannels = Array.from({ length: fourChannels ? 4 : 3 }, (_, channelIndex) => channelIndex + 1).filter((channel) => channel !== player.channel);
					const monsterPreviews = targets.map((target) => ({
						targetId: target.id,
						spawnRound: target.spawn_round,
						damage: Math.max(1, Math.floor(minimumPreviewDamage * regionMultiplier(target))),
						targetX: target.id === monster.id ? combatMonster.x : areaPoint(target).x,
						targetY: target.id === monster.id ? combatMonster.y : areaPoint(target).y
					}));
					const previewPublishes = [];
					const publishPreviewGroup = (scope, channels, previews) => {
						const primaryPreview = previews[0];
						return publishRealtimeRoomEventToChannels(player.world_cycle, channels, player.area, {
							type: "monster_preview",
							eventId: `monster-preview:${intentId}:${scope}`,
							intentId,
							attackerId: playerId,
							targetId: primaryPreview.targetId,
							spawnRound: primaryPreview.spawnRound,
							damage: primaryPreview.damage,
							previews,
							serverAt: nowMs
						});
					};
					const publishMonsterPreviews = () => {
						if (intentId) {
							const currentChannelPreviews = monsterPreviews.filter((_, index) => targets[index].channel === 0 || targets[index].channel === player.channel);
							const foreignSharedPreviews = monsterPreviews.filter((_, index) => targets[index].channel === 0);
							if (currentChannelPreviews.length) previewPublishes.push(publishPreviewGroup("current", [player.channel], currentChannelPreviews));
							if (foreignRealtimeChannels.length && foreignSharedPreviews.length) previewPublishes.push(publishPreviewGroup("shared", foreignRealtimeChannels, foreignSharedPreviews));
						}
					};
					if (!nativeGuardedBatch && !memoryCombat) publishMonsterPreviews();
					const hits = [];
					const states = [];
					const postPublishTasks = [];
					const groundDrops = 0;
					const progression = [];
					let ownXpGain = 0;
					const eventConfig = readEventsConfig(settings.events_json);
					const eventRates = {forge491:forgeDropSnapshot491(settings),cauldron488:cauldronDropSnapshot488(settings,player.area),highLevelBalance487:balanceSnapshot487(settings,player.area),
						materials: globalThis.__colProgression?.snapshot().materials,
						loot: eventBonus(eventConfig, "loot", now),
						xp: eventBonus(eventConfig, "xp", now),
						essence: eventBonus(eventConfig, "essence", now),
						chest: eventBonus(eventConfig, "chest", now),
						moonlight: eventBonus(eventConfig, "moonlight", now), halloween:eventBonus(eventConfig,"halloween",now)
					};
					const prepareMonsterHit=(target,targetIndex,rolledHit465=null)=>{
						const directDamage = rolledHit465?.directDamage ?? Math.max(1, Math.floor(colRuneFactor(player,'attack')*(roleBase + player.equipped_weapon_power + stoneAttackPower + wingAttack + Math.random() * 7) * multipliers[ability] * skillGrowth * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
						const elemental = rolledHit465?.elemental ?? [...firePercent ? [{
							kind: "fire",
							damage: Math.max(1, Math.round(directDamage * firePercent / 100))
						}] : [], ...icePercent ? [{
							kind: "ice",
							damage: Math.max(1, Math.round(directDamage * icePercent / 100))
						}] : []];
						const rolled = rolledHit465?.rolled ?? Math.max(1, Math.floor((directDamage + elemental.reduce((sum, entry) => sum + entry.damage, 0)) * regionMultiplier(target)));
						const respawn = isAdventureArea(target.area)?0:target.area==='event'?0:now + (target.area==='rune_v2'?globalThis.__colRuneV2.monster(target).respawnSeconds:target.area==='rune'?globalThis.__colRunes.monster(target).respawnSeconds:target.id === "dragon-world-1" ? dragonService()?.settings().config.interval ?? 10800 : isBlackStoneBoss476(target.id) ? settings.black_stone_boss_respawn_seconds : isFrozenBossId(target.id) ? settings.frozen_boss_respawn_seconds : target.id === "ancient-boss-1" ? settings.ancient_boss_respawn_seconds : isFrozenWaterId(target.id) ? settings.frozen_water_respawn_seconds : target.is_boss ? settings.boss_respawn_seconds : target.is_stone ? settings.sinsi_stone_respawn_seconds : target.summoned ? 2 : target.area === "ancient" ? settings.ancient_monster_respawn_seconds : target.area === "forest" ? colLabNormalRespawnSecondsR10(target, settings.forest_monster_respawn_seconds) : target.area === "frozen" ? settings.frozen_monster_respawn_seconds : target.area === "black" ? settings.black_monster_respawn_seconds : target.area === "afk" ? settings.afk_island_respawn_seconds : 18);
						return port.hitPlan({target,targetIndex,directDamage,elemental,rolled,respawn,attackingPlayer,monster,ability,nowMs,now,targetsCount:targets.length});};
					const memoryPlans = memoryCombat ? targets.map((target,index)=>prepareMonsterHit(target,index,null,false)) : null;
					const memoryResults = /* @__PURE__ */ new Map();
					if (memoryPlans) {
						const outcome = memoryCombat(cooldownStatement, memoryPlans, {onPendingR13:typeof realtime?.onPendingR13==='function'? provisional => realtime.onPendingR13({...provisional,intentId,cycle:player.world_cycle,channel:player.channel,area:player.area,serverAt:Date.now()}):undefined});
						if (!outcome.guard.results[0]) {
							deliverRealtime(publishMonsterAttackRejection());
							return rejectBasicAttackCadence(cooldownMs, attackPveHit);
						}
						reservedUntilMs = Number(outcome.guard.results[0].reserved_until);
						publishMonsterPreviews();
						let offset = 0;
						for (const plan of memoryPlans) {
							memoryResults.set(plan.target.id, outcome.results.slice(offset, offset + plan.hitStatements.length));
							offset += plan.hitStatements.length;
						}
					}
					const hitGroupSize = env.CORE_RUNTIME === "vds" && ability === 2 && player.role !== "muhafiz" ? 4 : 1;
					for (let targetOffset = 0; targetOffset < targets.length; targetOffset += hitGroupSize) {
						const hitPlans = targets.slice(targetOffset, targetOffset + hitGroupSize).map((target, index) => memoryPlans?.find((plan) => plan.target.id === target.id) ?? prepareMonsterHit(target, targetOffset + index));
						const queuedResults = (!memoryCombat && hitGroupSize > 1 ? Promise.allSettled(hitPlans.map((plan) => port.forbiddenBatch())) : null)?.map((outcome) => {
							if (outcome.status === "rejected") throw outcome.reason;
							return outcome.value;
						});
						for (const [planIndex, plan] of hitPlans.entries()) {
							const { target, rolled, elemental, hitStatements, xpResultIndex, beforeHealthIndex, healthResultIndex } = plan;
							const queuedHitResults = queuedResults?.[planIndex];
							const guardedHit = nativeGuardedBatch ? nativeGuardedBatch(cooldownStatement, hitStatements) : null;
							if (guardedHit) {
								const accepted = guardedHit.guard.results[0];
								if (!accepted) {
									deliverRealtime(publishMonsterAttackRejection());
									return rejectBasicAttackCadence(cooldownMs, attackPveHit);
								}
								reservedUntilMs = Number(accepted.reserved_until);
								publishMonsterPreviews();
							}
							const hitResults = memoryResults.get(target.id) ?? queuedHitResults ?? (guardedHit ? guardedHit.results : port.forbiddenBatch());
							progression.push(...hitResults[xpResultIndex]?.results ?? []);
							const updated = hitResults[healthResultIndex]?.results[0];
							if (!updated) {
								const current = port.currentMonster(target.id);
								if (current) states.push({
									id: target.id,
									spawnRound: Number(current.spawn_round),
									hp: Math.max(0, Number(current.hp))
								});
								continue;
							}
							const nextHp = Number(updated.hp);
							actualDamageDealt += Math.max(0, Number((hitResults[beforeHealthIndex]?.results[0])?.hp ?? nextHp) - nextHp);
							if (target.id === monster.id) {
								const impactAtMs = Date.now();
								guardianEffect = ability===3&&branch456?.effect==='root'?port.trap(player,{...target,x:combatMonster.x,y:combatMonster.y},'monster',branch456,impactAtMs,intentId):port.guardian( player, ability, {
									...target,
									x: combatMonster.x,
									y: combatMonster.y
								}, "monster", impactAtMs) ?? guardianCastVisual(player, ability, {
									...target,
									x: combatMonster.x,
									y: combatMonster.y
								}, "monster", impactAtMs);
								if (guardianEffect && intentId) Object.assign(guardianEffect, { intentId });
								if (guardianEffect) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, guardianEffect));
							}
							const killed = nextHp <= 0;
							hits.push({
								id: target.id,
								damage: rolled,
								hp: nextHp,
								killed,
								critical,
								spawnRound: target.spawn_round,
								elemental
							});
							states.push({
								id: target.id,
								spawnRound: target.spawn_round,
								hp: nextHp
							});
							if (target.is_stone && !killed && Number(updated.wave_stage) > target.wave_stage) postPublishTasks.push(() => port.stoneWaves( target, target.wave_stage, Number(updated.wave_stage), settings));
							if (killed) {
								const beforeXp = (hitResults[xpResultIndex - 2]?.results)?.find((p) => p.id === playerId);
								const afterXp = (hitResults[xpResultIndex]?.results)?.find((p) => p.id === playerId);
								ownXpGain += beforeXp && afterXp ? Math.max(0, afterXp.xp - beforeXp.xp) + Math.max(0, (afterXp.rank_xp ?? 0) - (beforeXp.rank_xp ?? 0)) : 0;
								if (target.is_boss) continue;
								if (target.is_stone) {
									postPublishTasks.push(() => port.stoneRewards( settings, now, target));
									continue;
								}
							}
						}
					}
					const targetScopeByRound = new Map(targets.map((target) => [`${target.id}:${target.spawn_round}`, target.channel]));
					const communityProgress = targets.some((target) => target.area === "forest" && !target.is_boss && !target.is_stone && !target.summoned && hits.some((hit) => hit.id === target.id && hit.spawnRound === target.spawn_round && hit.killed)) ? readCommunityProgress() : null;
					if (communityProgress && !colLabIsPlayer(playerId)) {
						if (!scheduleRequestTask(publishCommunityProgress(), "Community counter delivery"));
					}
					const targetScopeById = new Map(targets.map((target) => [target.id, target.channel]));
					const resultScope = (id, spawnRound) => targetScopeByRound.get(`${id}:${spawnRound}`) ?? targetScopeById.get(id);
					const publishResultGroup = (scope, channels, groupHits, groupStates, dedicatedChannel) => publishRealtimeRoomEventToChannels(player.world_cycle, channels, player.area, {
						type: "monster_result",
						eventId: `monster:${intentId ?? crypto.randomUUID()}:${nowMs}:${scope}`,
						intentId,
						attackerId: playerId,
						targetId: monster.id,
						ability,
						hits: groupHits,
						states: groupStates,
						...communityProgress ? { communityProgress } : {},
						serverAt: nowMs
					}, dedicatedChannel);
					const resultPublishes = [];
					const sharedHits = hits.filter((hit) => resultScope(hit.id, hit.spawnRound) === 0);
					const sharedStates = states.filter((state) => resultScope(state.id, state.spawnRound) === 0);
					const currentHits = hits.filter((hit) => {
						const scope = resultScope(hit.id, hit.spawnRound);
						return scope === 0 || scope === player.channel;
					});
					const currentStates = states.filter((state) => {
						const scope = resultScope(state.id, state.spawnRound);
						return scope === 0 || scope === player.channel;
					});
					if (currentHits.length || currentStates.length) resultPublishes.push(publishResultGroup("current", [player.channel], currentHits, currentStates, player.channel));
					if (foreignRealtimeChannels.length && (sharedHits.length || sharedStates.length)) resultPublishes.push(publishResultGroup("shared", foreignRealtimeChannels, sharedHits, sharedStates));
					for (const resultChannel of [...new Set(targets.filter((target) => target.channel > 0).map((target) => target.channel))]) {
						if (resultChannel === player.channel) continue;
						const channelHits = hits.filter((hit) => resultScope(hit.id, hit.spawnRound) === resultChannel);
						const channelStates = states.filter((state) => resultScope(state.id, state.spawnRound) === resultChannel);
						if (channelHits.length || channelStates.length) resultPublishes.push(publishResultGroup(`channel-${resultChannel}`, [resultChannel], channelHits, channelStates));
					}
					if (!hits.length && !states.length && intentId) {
						resultPublishes.push(publishRealtimeRoomEventToChannels(player.world_cycle, [player.channel], player.area, {
							type: "monster_reject",
							eventId: `monster-reject:${intentId}:${nowMs}:current`,
							intentId,
							attackerId: playerId,
							targetId: monster.id,
							spawnRound: monster.spawn_round,
							serverAt: nowMs
						}, player.channel));
						const firstSharedTarget = targets.find((target) => target.channel === 0);
						if (firstSharedTarget && foreignRealtimeChannels.length) resultPublishes.push(publishRealtimeRoomEventToChannels(player.world_cycle, foreignRealtimeChannels, player.area, {
							type: "monster_reject",
							eventId: `monster-reject:${intentId}:${nowMs}:shared`,
							intentId,
							attackerId: playerId,
							targetId: firstSharedTarget.id,
							spawnRound: firstSharedTarget.spawn_round,
							serverAt: nowMs
						}));
					}
					if (targets.length > 1) {
						const primaryHit = hits.find((hit) => hit.id === monster.id);
						const retaliatingMonster = targets.find((target) => !target.is_stone && hits.some((hit) => hit.id === target.id && hit.spawnRound === target.spawn_round && !hit.killed));
						if (retaliatingMonster) port.arm(attackingPlayer,retaliatingMonster,nowMs);
						else if (primaryHit?.killed) port.clearDeadEncounter(playerId,monster);
					}
					deliverRealtime([...previewPublishes,...resultPublishes]);
					if (!hits.length) {
						port.undoEmptyAttack({playerId,attackColumn,reservedUntilMs,cooldownMs,monster,ability,nowMs});
						return Response.json({
							pveHit: attackPveHit,
							ok: true,
							hits: [],
							states,
							xp: 0,
							groundDrops: 0,
							message: "Yaratık bu vuruştan hemen önce yenildi."
						});
					}
					const lifeSteal = port.restoreLife( playerId, lifeStealAmount(actualDamageDealt, enchantmentTotals("life_steal")), true);
					if (lifeSteal) deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
						type: "player_state",
						eventId: crypto.randomUUID(),
						targetId: playerId,
						hp: lifeSteal.hp,
						hpRevision: lifeSteal.hp_revision,
						maxHp: lifeSteal.max_hp,
						serverAt: nowMs
					}));
					if (postPublishTasks.length) {
						const followUp = startBackgroundTask( () => {
							for (const task of postPublishTasks) task();
						});
						if (!scheduleRequestTask(followUp, "Monster combat follow-up")) followUp;
					}
					const killedCount = hits.filter((hit) => hit.killed).length;
					const shatteredStone = targets.some((target) => target.is_stone && hits.some((hit) => hit.id === target.id && hit.killed));
					return Response.json({
						pveHit: attackPveHit,
						ok: true,
						guardianEffect,
						lifeSteal,
						hits,
						states,
						progression,
						xp: ownXpGain,
						groundDrops,
						rewardPending: killedCount > 0,
						...communityProgress ? { communityProgress: readCommunityProgress(auth.account.id) } : {},
						...ability === 0 ? { nextAttackAtMs: reservedUntilMs } : { cooldownRemainingMs: Math.max(0, reservedUntilMs - Date.now()) },
						tickCount: settings.elemental_tick_count,
						tickIntervalMs: settings.elemental_tick_interval_ms,
						message: shatteredStone ? "Sinsi Taş parçalandı · yönetici profilindeki ganimetlerin hazırlanıyor." : killedCount ? `${killedCount} yaratık düştü · katılan herkese ganimet şansı · +${ownXpGain} TP` : `${hits.length > 1 ? hits.length + " hedefe" : monster.name + " yaratığına"} ${hits.reduce((sum, hit) => sum + hit.damage, 0)} hasar.`
					});
				}
 function guardianMemory(port, attacker, ability, target, kind, now, retry = 0) {
 if(!(kind==='player'?colLabMayAffectPlayer(attacker,target):colLabMayAffectMonster(attacker,target)))return null;
 if(kind==="monster"&&ability===1&&(isBlackStoneBoss476(target.id)||isRuneV2Boss(target.id)))return null;
	if (attacker.role !== "muhafiz" || (ability !== 1 && ability !== 2)) return null;
	const own = port.ownPlayer(attacker.id,attacker.area,attacker.channel,attacker.arena_match_id,attacker.realtime_scope_version);
	if (!own || own.hp <= 0 || own.stun_until_ms > now || ability === 2 && own.root_until_ms > now) return null;
	const hitTarget = target;
	if (kind === "player") {
		const live = port.targetPlayer(target.id,attacker.area,attacker.channel,attacker.arena_match_id,target.realtime_scope_version ?? -1,ability);
		if (!live) return null;
		target = {
			...target,
			...live
		};
	}
	const length = Math.hypot(target.x - own.x, target.y - own.y);
	if (length > (ability === 1 ? 720 : 600) + 125) return null;
	const actorId = ability === 1 ? target.id : attacker.id;
	const from = ability === 1 ? target : own;
	const toward = ability === 1 ? own : target;
	const to = guardianEndpoint(attacker.area, from, toward, Math.min(ability === 1 ? 720 : 600, Math.max(0, length - (ability === 1 ? 65 : 38))));
	const until = now + (ability === 1 ? 2000 : 450);
	let moved = null;
	if (ability === 2 || kind === "player") {
		const id = actorId;
		moved = port.movePlayer(to.x,to.y,now,ability === 1 ? until : now,ability === 1 ? until : 0,id,attacker.area,attacker.channel,attacker.arena_match_id,from.x,from.y,ability === 2 ? attacker.realtime_scope_version : target.realtime_scope_version);
		if (!moved) {
			if (retry < 4) return guardianMemory(port, attacker, ability, hitTarget, kind, now, retry + 1);
			return null;
		}
	}
	let controlled = null;
	if (kind === "player" && ability === 2 && Math.hypot(to.x - target.x, to.y - target.y) <= 100) controlled = port.stunPlayer(until,until,target.id,attacker.area,attacker.channel,attacker.arena_match_id,target.x,target.y);
	else if (kind === "monster" && !isBlackStoneBoss476(target.id) && !isRuneV2Boss(target.id)) {
		const endpoint = ability === 1 ? to : target;
		controlled = port.controlMonster(endpoint.x,endpoint.y,until,until,target.id,target.spawn_round,attacker.area,attacker.channel);
	}
	return {
		type: "guardian_control",
		eventId: crypto.randomUUID(),
		attackerId: attacker.id,
		targetId: target.id,
		targetKind: kind,
		ability,
		casterPoint: {
			x: own.x,
			y: own.y
		},
		from: {
			x: from.x,
			y: from.y
		},
		to,
		actorId,
		moved,
		controlled,
		targetPoint: {
			x: target.x,
			y: target.y
		},
		serverAt: now,
		area: attacker.area,
		channel: attacker.channel,
		...kind === "monster" ? { spawnRound: target.spawn_round } : {}
	};
}
 function trapMemory(port,attacker,target,kind,branch,now,intentId){
 if(!(kind==='player'?colLabMayAffectPlayer(attacker,target):colLabMayAffectMonster(attacker,target)))return null;
 if(kind==='monster'&&(isBlackStoneBoss476(target.id)||isRuneV2Boss(target.id)))return null;
 if(branch?.effect!=='root'||attacker.role!=='avci'||!(branch.rootMs>0))return null;
 const until=now+Math.max(0,Math.min(2000,Number(branch.rootMs)||0));
 let controlled;
 if(kind==='player')controlled=port.rootPlayer(until,target.id,attacker.area,attacker.channel,attacker.arena_match_id,target.realtime_scope_version,attacker.id,branch.id,attacker.realtime_scope_version);
 else controlled=port.rootMonster(until,target.x,target.y,target.id,target.spawn_round,attacker.area,attacker.channel);
 if(!controlled)return null;
 return {type:'guardian_control',eventId:'trap456:'+attacker.id+':'+(intentId??now),intentId,attackerId:attacker.id,actorId:attacker.id,targetId:target.id,targetKind:kind,ability:3,casterPoint:{x:attacker.x,y:attacker.y},from:{x:target.x,y:target.y},to:{x:target.x,y:target.y},moved:null,controlled,targetPoint:{x:target.x,y:target.y},serverAt:now,area:attacker.area,channel:attacker.channel,...(kind==='monster'?{spawnRound:target.spawn_round}:{})};
}
 function dashMemory(port, player, direction, now, cooldown, retry = 0) {
	const own = port.dashRead(player.id);
	const length = Math.hypot(direction.x, direction.y);
	if (!own || !Number.isFinite(length) || length < .01) return null;
	const to = guardianEndpoint(player.area, own, {
		x: own.x + direction.x / length * 600,
		y: own.y + direction.y / length * 600
	}, 600);
	const moved = port.dashMove(to.x,to.y,now,cooldown,now,player.id,now,now,now,player.area,player.channel,player.arena_match_id,player.realtime_scope_version,own.x,own.y);
	if (!moved && retry < 2) return dashMemory(port, player, direction, now, cooldown, retry + 1);
	return moved ? {
		type: "guardian_control",
		eventId: crypto.randomUUID(),
		attackerId: player.id,
		actorId: player.id,
		targetId: "",
		targetKind: "player",
		ability: 2,
		casterPoint: own,
		from: own,
		to,
		targetPoint: to,
		moved,
		controlled: null,
		serverAt: now,
		area: player.area,
		channel: player.channel
	} : null;
}
 function supportMemory(port,player,settings,payload,receivedAt){
 const branch=colSpec456(player.role,player.specialization,settings),time=Date.now();
 const areas=['forest','frozen','sanctum','dragon','sinsi','black','war','arena','ancient','afk','event','rune','rune_v2'];
 if(!branch||!['heal','guard'].includes(branch.effect)||player.level<30||player.hp<=0||player.rod_equipped||(!isAdventureArea(player.area)&&!areas.includes(player.area)))return Response.json({error:'Bu uzmanlık becerisi kullanılamıyor.'},{status:409});
 if(globalThis.__colDungeon?.locked(player.id))return Response.json({error:'Beceriyi zindan kontrollerinden kullanmalısın.'},{status:409});
 const gear=equippedEnchantItems(player),cooldown=effectiveSkillCooldown444(branch.cooldown,Math.min(50,enchantmentTotal(gear,'cast_speed')+(player.jewelry_cast_speed||0))),until=receivedAt+cooldown;
 
 const reserve=port.reserve([receivedAt,cooldown,branch.effect==='guard'?time+branch.guardMs:0,time+5000,player.id,time,receivedAt,branch.id,player.role,player.area,player.channel,player.arena_match_id,player.realtime_scope_version,...(player.area==='arena'?[time,time]:[])]);
 
 const friendlyParams=player.area==='arena'?[player.arena_match_id,player.id]:[player.id];
 let targets=[player];
 if(branch.effect==='heal'){
  // Filtering reach before LIMIT prevents remote teammates occupying the bounded slots.
  const rows=port.targets(player,time);
  targets=rows.results;
 }
 const healRate=Math.min(.30,branch.heal*colSkillGrowth456(player.skill_four,settings.skill_upgrade_damage_per_level));
 const healStatements=(healRate>0?targets:[]).map(p=>{
  
  
  return port.healPlan([healRate,p.id,player.area,player.channel,player.arena_match_id,p.realtime_scope_version??player.realtime_scope_version,player.id,...(branch.effect==='heal'?[player.id]:[]),player.id,branch.id,until,player.realtime_scope_version],branch.effect==='heal');
 });
 // Guard and every heal share the sole durable writer transaction. Rejected
 // cooldown, scope, death, or stun cannot partially apply a support cast.
 const result=port.commitSupport(reserve,healStatements),reserved=result.guard.results[0];
 if(!reserved)return Response.json({error:'Yetenek henüz hazır değil veya savaş durumun değişti.'},{status:409});
 const healed=result.results.flatMap(r=>r.results??[]),own=healed.find(p=>p.id===player.id),effect={type:'specialization_effect',eventId:'spec456:'+player.id+':'+until,actorId:player.id,specialization:branch.id,kind:branch.effect,x:player.x,y:player.y,targets:healed,serverAt:time,until:time+850};
 // Existing player_state keeps both clients and the realtime room HP current.
 const updates=healed.map(p=>publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'player_state',eventId:'spec456-hp:'+until+':'+p.id,targetId:p.id,hp:p.hp,maxHp:p.max_hp,hpRevision:p.hp_revision,serverAt:time},player.arena_match_id||undefined));
 updates.push(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,effect,player.arena_match_id||undefined));
 deliverRealtime(updates);
 return Response.json({ok:true,specialEffect:effect,cooldownRemainingMs:cooldown,reservedUntilMs:Number(reserved.reserved_until),...(own?{hp:own.hp,maxHp:own.max_hp,hpRevision:own.hp_revision}:{}),special_guard_until_ms:Number(reserved.special_guard_until_ms)});
}
 function dashActionMemory(port,context){const {player,playerId,payload,settings,requestReceivedAtMs}=context;
					if (player.role !== "muhafiz" || player.level < settings.skill_three_unlock_level || (!isAdventureArea(player.area)&&!["forest","frozen","sanctum","dragon","sinsi","black","war","arena","ancient","afk","event","rune","rune_v2"].includes(player.area))) return Response.json({ error: "Bu hamle şu anda kullanılamaz." }, { status: 400 });
					if (player.area === "arena") {
						const match = port.arena(player.arena_match_id);
						if (!match || Date.now() < match.starts_at_ms || !["active", "countdown"].includes(match.status)) return Response.json({ error: "Arena geri sayımını bekle." }, { status: 409 });
					}
					const guardianCooldown444 = effectiveSkillCooldown444(settings.skill_three_cooldown_ms, Math.min(50,enchantmentTotal(equippedEnchantItems(player), "cast_speed")+(player.jewelry_cast_speed||0)));
const guardianEffect = port.dash( player, {
						x: Number(payload.directionX),
						y: Number(payload.directionY)
					}, Date.now(), guardianCooldown444);
					if (!guardianEffect) return Response.json({ error: "Hamle henüz hazır değil veya sabitlendin." }, { status: 409 });
					deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, guardianEffect, player.arena_match_id || void 0));
					return Response.json({
						ok: true,
						guardianEffect,
						cooldownRemainingMs: guardianCooldown444
					});
				}
function hydrateAttack(database,identity,attackTargetId){const identitySql="?",payload={action:"attack"};const attackMonsterPromise = attackTargetId ? database.prepare("SELECT id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned, parent_stone_id,root_until_ms,stun_until_ms,control_x,control_y FROM monsters WHERE id = ?").bind(attackTargetId).first() : null;const playerPromise = database.prepare(payload.action === "collect" ? `SELECT id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms,
        essence, level, rank_tier, area, channel, arena_match_id, last_seen,
        combat_lock_until_ms, realtime_scope_version,
        COALESCE((SELECT reset_at FROM world_state WHERE id = 1), 0) AS reset_at,
        COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) AS world_cycle
       FROM players WHERE id = ${identitySql}` : `SELECT stat_attack,stat_defense,stat_hp,stat_revision,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms, essence, contribution, xp, level, gems, potions, ${setSelectSql()},
        specialization,skill_four,attack_four_at,special_guard_until_ms,jewelry_attack,jewelry_defense,jewelry_cast_speed,jewelry_pvp,${beltBonusSql('strongPlayers','players')} AS belt_pvp_r31,jewelry_resist,jewelry_earring_enchantments,jewelry_bracelet_enchantments,halloween_candy_until,skill_one, skill_two, skill_three, has_rod, rod_equipped, fish_sokan, fish_levrek, fish_zargana, pearls, stone_dust,
        xp_ring_until, drop_charm_until, (SELECT equipped FROM player_items WHERE player_id=players.id AND kind='costume' LIMIT 1) AS costume_equipped, has_wings, wings_equipped, (SELECT equipped FROM dungeon_wings WHERE player_id=players.id) AS core_wings, area, channel, arena_match_id, last_seen,
        combat_lock_until_ms, realtime_scope_version, weapon_skin_enabled,
        COALESCE((SELECT reset_at FROM world_state WHERE id = 1), 0) AS reset_at,
        COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) AS world_cycle,
        COALESCE((SELECT power FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), 0) + CASE WHEN players.weapon_skin_enabled=1 THEN 20 ELSE 0 END + players.jewelry_attack + ${beltBonusSql('attack','players')} AS equipped_weapon_power,
        (SELECT id FROM player_items WHERE player_id=players.id AND kind='weapon' AND equipped=1 LIMIT 1) AS equipped_weapon_id,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), '[]') AS equipped_weapon_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'armor' AND equipped = 1 LIMIT 1), '[]') AS equipped_armor_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'helmet' AND equipped = 1 LIMIT 1), '[]') AS equipped_helmet_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'shoes' AND equipped = 1 LIMIT 1), '[]') AS equipped_shoes_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'necklace' AND equipped = 1 LIMIT 1), '[]') AS equipped_necklace_enchantments
       FROM players WHERE id = ${identitySql}`).bind(identity).first();return {player:playerPromise,monster:attackMonsterPromise};}
function hydrateCombatTarget(database,identity){return database.prepare(`SELECT stat_attack,stat_defense,stat_hp,stat_revision,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms, essence, contribution, xp, level, gems, potions, ${setSelectSql()},
          specialization,skill_four,attack_four_at,special_guard_until_ms,jewelry_attack,jewelry_defense,jewelry_cast_speed,jewelry_pvp,${beltBonusSql('strongPlayers','players')} AS belt_pvp_r31,jewelry_resist,jewelry_earring_enchantments,jewelry_bracelet_enchantments,halloween_candy_until,skill_one, skill_two, skill_three, has_rod, rod_equipped, fish_sokan, fish_levrek, fish_zargana, pearls, stone_dust,
          xp_ring_until, drop_charm_until, (SELECT equipped FROM player_items WHERE player_id=players.id AND kind='costume' LIMIT 1) AS costume_equipped, has_wings, wings_equipped, (SELECT equipped FROM dungeon_wings WHERE player_id=players.id) AS core_wings, area, channel, arena_match_id, last_seen,
          combat_lock_until_ms, realtime_scope_version, weapon_skin_enabled,
          COALESCE((SELECT SUM(power) FROM player_items WHERE player_id = players.id AND kind IN ('armor','helmet','shoes','necklace','costume') AND equipped = 1), 0) AS equipped_armor_power,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), '[]') AS equipped_weapon_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'armor' AND equipped = 1 LIMIT 1), '[]') AS equipped_armor_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'helmet' AND equipped = 1 LIMIT 1), '[]') AS equipped_helmet_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'shoes' AND equipped = 1 LIMIT 1), '[]') AS equipped_shoes_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'necklace' AND equipped = 1 LIMIT 1), '[]') AS equipped_necklace_enchantments FROM players WHERE id=?`).bind(identity).first();}
function prepareHits(database,context,plan){const {player,playerId,payload,settings,attackTargetId,preloadedAttackMonster,requestReceivedAtMs,now,auth}=context;const {attackColumn,cooldownMs,cooldownAtMs,cooldownGraceMs,nowMs,attackingPlayer,monster,ability,critical,targets,eventRates}=plan;const {roleBase,wingAttack,multipliers,skillGrowth,stoneAttackPower,firePercent,icePercent,regionMultiplier}=plan;const prepareMonsterHit = (target, targetIndex, rolledHit465 = null, includeRewards465 = true) => {
						const directDamage = rolledHit465?.directDamage ?? Math.max(1, Math.floor(colRuneFactor(player,'attack')*(roleBase + player.equipped_weapon_power + stoneAttackPower + wingAttack + Math.random() * 7) * multipliers[ability] * skillGrowth * settings.skill_damage_scale * (critical ? colCriticalMultiplier491(settings.critical_damage_multiplier,player) : 1)));
						const elemental = rolledHit465?.elemental ?? [...firePercent ? [{
							kind: "fire",
							damage: Math.max(1, Math.round(directDamage * firePercent / 100))
						}] : [], ...icePercent ? [{
							kind: "ice",
							damage: Math.max(1, Math.round(directDamage * icePercent / 100))
						}] : []];
						const rolled = rolledHit465?.rolled ?? Math.max(1, Math.floor((directDamage + elemental.reduce((sum, entry) => sum + entry.damage, 0)) * regionMultiplier(target)));
						const respawn = isAdventureArea(target.area)?0:target.area==='event'?0:now + (target.area==='rune_v2'?globalThis.__colRuneV2.monster(target).respawnSeconds:target.area==='rune'?globalThis.__colRunes.monster(target).respawnSeconds:target.id === "dragon-world-1" ? dragonService()?.settings().config.interval ?? 10800 : isBlackStoneBoss476(target.id) ? settings.black_stone_boss_respawn_seconds : isFrozenBossId(target.id) ? settings.frozen_boss_respawn_seconds : target.id === "ancient-boss-1" ? settings.ancient_boss_respawn_seconds : isFrozenWaterId(target.id) ? settings.frozen_water_respawn_seconds : target.is_boss ? settings.boss_respawn_seconds : target.is_stone ? settings.sinsi_stone_respawn_seconds : target.summoned ? 2 : target.area === "ancient" ? settings.ancient_monster_respawn_seconds : target.area === "forest" ? colLabNormalRespawnSecondsR10(target, settings.forest_monster_respawn_seconds) : target.area === "frozen" ? settings.frozen_monster_respawn_seconds : target.area === "black" ? settings.black_monster_respawn_seconds : target.area === "afk" ? settings.afk_island_respawn_seconds : 18);
						const hitStatements = [...targetIndex === 0 ? [database.prepare("INSERT INTO combat_events (player_id, target_id, role, ability, created_at) VALUES (?, ?, ?, ?, ?)").bind(playerId, monster.id, player.role, ability, nowMs)] : [], (isDragonRankBoss498(target.id)?dragonParticipant498(database,playerId,now,rolled,nowMs,target.id,target.spawn_round):isRuneV2Boss(target.id)?runeV2Participant483(database,playerId,now,rolled,nowMs,target.id,target.spawn_round):isBlackStoneBoss476(target.id)?database.prepare(STONE_PARTICIPANT_SQL476).bind(playerId,now,rolled,nowMs,target.id,target.spawn_round):database.prepare(`INSERT INTO monster_participants (monster_id, spawn_round, player_id, created_at)
             SELECT id, spawn_round, ?, ? FROM monsters WHERE id = ? AND hp > 0 AND spawn_round = ?
             ON CONFLICT(monster_id, spawn_round, player_id) DO UPDATE SET created_at = excluded.created_at`).bind(playerId, now, target.id, target.spawn_round))];
						if (target.is_boss) {
							hitStatements.push(database.prepare(`INSERT INTO boss_participants (boss_round, player_id, hit_count, total_damage, created_at)
             SELECT spawn_round, ?, 1, MIN(hp, ?), ? FROM monsters
             WHERE id = ? AND is_boss = 1 AND hp > 0 AND spawn_round = ?
             ON CONFLICT(boss_round, player_id) DO UPDATE SET
               hit_count = boss_participants.hit_count + 1,
               total_damage = boss_participants.total_damage + excluded.total_damage`).bind(playerId, rolled, now, target.id, target.spawn_round));
						}
                        const loadlabRewardStart = hitStatements.length;
                        let xpResultIndex = -1;
                        if(includeRewards465 && ports.skipNonlethalRewardsR56?.(target,rolled)!==true){
						const xpReward = target.area === "afk" ? settings.afk_island_xp_reward : bonusAmount(monsterXpReward(target, settings), eventRates.xp);
						const essenceRoll = normalEssenceRoll(target);
						const lootSnapshot = defaultLootSnapshot(target, settings);
						if(target.is_boss){
							hitStatements.push(database.prepare(`INSERT OR IGNORE INTO boss_defeats
               (boss_round, defeated_at, x, y, xp_reward, loot_source_key, loot_profile_revision, loot_profile_json, events_snapshot)
             SELECT spawn_round, ?, x, y, ?, ?,
               COALESCE((
                 SELECT version.revision FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), 0),
               COALESCE((
                 SELECT version.profile_json FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), ?), ?
             FROM monsters
             WHERE id = ? AND is_boss = 1 AND hp > 0 AND hp <= ? AND spawn_round = ?`).bind(now, xpReward, lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootProfileJson ?? "", JSON.stringify(eventRates), target.id, rolled, target.spawn_round));
						} else if (target.is_stone) hitStatements.push(database.prepare(`INSERT OR IGNORE INTO sinsi_defeats
               (monster_id, spawn_round, defeated_at, x, y, xp_reward,
                loot_source_key, loot_profile_revision, loot_profile_json, events_snapshot)
             SELECT id, spawn_round, ?, x, y, ?, ?,
               COALESCE((
                 SELECT version.revision FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), 0),
               COALESCE((
                 SELECT version.profile_json FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), ?), ?
             FROM monsters
             WHERE id = ? AND is_stone = 1 AND hp > 0 AND hp <= ? AND spawn_round = ?`).bind(now, xpReward, lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootProfileJson ?? "", JSON.stringify(eventRates), target.id, rolled, target.spawn_round));
						else hitStatements.push(database.prepare(`INSERT OR IGNORE INTO normal_defeats
               (monster_id, spawn_round, defeated_at, x, y, xp_reward, essence_min, essence_span,
                loot_source_key, loot_profile_revision, loot_profile_json, events_snapshot)
             SELECT id, spawn_round, ?, x, y, ?, ?, ?, ?,
               COALESCE((
                 SELECT version.revision FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), 0),
               COALESCE((
                 SELECT version.profile_json FROM loot_profiles pointer JOIN loot_profile_versions version
                   ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
                 WHERE pointer.source_key = ? AND pointer.active_revision > 0
               ), ?), ?
             FROM monsters
             WHERE id = ? AND is_boss = 0 AND hp > 0 AND hp <= ? AND spawn_round = ?`).bind(now, xpReward, essenceRoll.min, essenceRoll.span, lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootSourceKey ?? "", lootSnapshot?.lootProfileJson ?? "", JSON.stringify(eventRates), target.id, rolled, target.spawn_round));
						hitStatements.push(...prepareRuneV2Winner483(database,target,rolled,nowMs));const cauldronXpStatements488=prepareMonsterXp(database,settings,now,target.id,target.spawn_round,xpReward,rolled,true,target);const cauldronXpOffset488=hitStatements.length;hitStatements.push(...cauldronXpStatements488);
						xpResultIndex = cauldronXpOffset488 + 2;
						hitStatements.push(database.prepare(GUILD_MONSTER_KILL_SQL).bind(playerId, target.id, target.spawn_round, rolled));
						hitStatements.push(database.prepare(WEAPON_KILL_SQL).bind(player.equipped_weapon_id, playerId, target.id, target.spawn_round, rolled));
                        }
						colLabTagReward(hitStatements.slice(loadlabRewardStart),target,"inline");
                        const beforeHealthIndex = hitStatements.length;
						hitStatements.push(database.prepare("SELECT hp FROM monsters WHERE id=? AND hp>0 AND spawn_round=?").bind(target.id, target.spawn_round));
						hitStatements.push(database.prepare(`UPDATE monsters SET hp = MAX(0, hp - ?), last_damaged_at_ms = ?,
             wave_stage = CASE WHEN is_stone = 0 THEN wave_stage
               WHEN hp - ? <= 0 THEN 3
               WHEN hp - ? <= max_hp / 2 THEN MAX(wave_stage, 2)
               ELSE MAX(wave_stage, 1) END,
             respawn_at = CASE WHEN hp - ? <= 0 THEN ? ELSE respawn_at END,
             despawn_at = CASE WHEN hp - ? <= 0 AND is_boss = 1 THEN 0 ELSE despawn_at END
           WHERE id = ? AND hp > 0 AND spawn_round = ? RETURNING hp, wave_stage`).bind(rolled, nowMs, rolled, rolled, rolled, respawn, rolled, target.id, target.spawn_round));
						const healthResultIndex = hitStatements.length - 1;
						if (targets.length === 1) {
							hitStatements.push(database.prepare(`DELETE FROM pve_engagements WHERE player_id = ? AND monster_id = ? AND spawn_round = ? AND NOT EXISTS (SELECT 1 FROM json_each(pve_engagements.attackers489) multi489 JOIN monsters live489 ON live489.id=multi489.key AND live489.spawn_round=json_extract(multi489.value,'$.spawn_round') WHERE live489.hp>0 AND live489.id<>pve_engagements.monster_id)
             AND EXISTS (SELECT 1 FROM monsters WHERE id = ? AND spawn_round = ? AND hp <= 0)`).bind(playerId, target.id, target.spawn_round, target.id, target.spawn_round));
							hitStatements.push(...preparePveEngagement(database, attackingPlayer, target, nowMs));
						}
						const plan465 = {
							target,
							rolled,
							elemental,
							hitStatements,
							xpResultIndex,
							beforeHealthIndex,
							healthResultIndex
						};
                        if(!includeRewards465)plan465.prepareDurable=()=>{const complete=prepareMonsterHit(target,targetIndex,{directDamage,elemental,rolled},true);delete plan465.prepareDurable;Object.assign(plan465,complete);};
                        return plan465;
					};return plan.plans.map(p=>prepareMonsterHit(p.target,p.targetIndex,p,true));}
 function readPendingBoss511(database, settings, now, preferredBossRound, requiredParticipantId) {
	const roundClause = preferredBossRound === void 0 ? "" : "AND bp.boss_round = ?";
	const playerClause = requiredParticipantId ? "AND bp.player_id = ?" : "";
	const pendingStatement = database.prepare(`SELECT bp.boss_round, defeat.x, defeat.y, defeat.xp_reward,
       defeat.events_snapshot, defeat.loot_source_key, defeat.loot_profile_revision, defeat.loot_profile_json,
       ${env.CORE_RUNTIME === "vds" ? "defeat.pearls_retired" : "0 AS pearls_retired"}
     FROM boss_participants bp
     JOIN boss_defeats defeat ON defeat.boss_round = bp.boss_round
     JOIN players p ON p.id = bp.player_id
     LEFT JOIN boss_reward_claims claim ON claim.boss_round = bp.boss_round AND claim.player_id = bp.player_id
     WHERE bp.total_damage > 0 AND claim.player_id IS NULL ${roundClause} ${playerClause}
     ORDER BY bp.boss_round LIMIT 1`);
	const pending = preferredBossRound !== void 0 && requiredParticipantId ? pendingStatement.bind(preferredBossRound, requiredParticipantId).first() : preferredBossRound !== void 0 ? pendingStatement.bind(preferredBossRound).first() : requiredParticipantId ? pendingStatement.bind(requiredParticipantId).first() : pendingStatement.first();
	return pending;}
 function readPendingNormal511(database, settings, now, preferred, requiredParticipantId) {
	const preferredClause = preferred ? "AND defeat.monster_id = ? AND defeat.spawn_round = ?" : "";
	const playerClause = requiredParticipantId ? "AND mp.player_id = ?" : "";
	const pendingClause = env.CORE_RUNTIME === "vds" ? "AND defeat.rewards_completed_at = 0" : "";
	const pendingStatement = database.prepare(`SELECT defeat.monster_id, defeat.spawn_round, defeat.x, defeat.y, defeat.xp_reward,
       defeat.essence_min, defeat.essence_span,
       defeat.events_snapshot, defeat.loot_source_key, defeat.loot_profile_revision, defeat.loot_profile_json,
       ${env.CORE_RUNTIME === "vds" ? "defeat.pearls_retired" : "0 AS pearls_retired"},
       monster.name AS monster_name, monster.area AS monster_area, monster.variant AS monster_variant,
       monster.is_boss AS monster_is_boss, monster.is_stone AS monster_is_stone, monster.summoned AS monster_summoned
     FROM normal_defeats defeat
     JOIN monster_participants mp ON mp.monster_id = defeat.monster_id AND mp.spawn_round = defeat.spawn_round
     JOIN players p ON p.id = mp.player_id
     LEFT JOIN monsters monster ON monster.id = defeat.monster_id
     LEFT JOIN normal_reward_claims claim
       ON claim.monster_id = mp.monster_id AND claim.spawn_round = mp.spawn_round AND claim.player_id = mp.player_id
     WHERE claim.player_id IS NULL ${preferredClause} ${playerClause} ${pendingClause}
     ORDER BY defeat.defeated_at, defeat.monster_id LIMIT 1`);
	const pending = preferred && requiredParticipantId ? pendingStatement.bind(preferred.id, preferred.spawn_round, requiredParticipantId).first() : preferred ? pendingStatement.bind(preferred.id, preferred.spawn_round).first() : requiredParticipantId ? pendingStatement.bind(requiredParticipantId).first() : pendingStatement.first();
	return pending;}
 function readPendingSinsi511(database, settings, now, preferred) {
	const preferredClause = preferred ? "AND defeat.monster_id = ? AND defeat.spawn_round = ?" : "";
	const pendingStatement = database.prepare(`SELECT pending507.monster_id, pending507.spawn_round, pending507.x, pending507.y, pending507.xp_reward,
       pending507.events_snapshot, pending507.loot_source_key, pending507.loot_profile_revision, pending507.loot_profile_json,
       ${env.CORE_RUNTIME === "vds" ? "pending507.pearls_retired" : "0 AS pearls_retired"}
     FROM sinsi_defeats pending507
     WHERE (pending507.monster_id,pending507.spawn_round)=(
       SELECT defeat.monster_id,defeat.spawn_round FROM sinsi_defeats defeat
       WHERE EXISTS(SELECT 1 FROM monster_participants participant
         WHERE participant.monster_id=defeat.monster_id AND participant.spawn_round=defeat.spawn_round
         AND NOT EXISTS(SELECT 1 FROM sinsi_reward_claims claim
           WHERE claim.monster_id=participant.monster_id AND claim.spawn_round=participant.spawn_round AND claim.player_id=participant.player_id))
       ${preferredClause} ORDER BY defeat.defeated_at,defeat.monster_id LIMIT 1)`);
	const pending = preferred ? pendingStatement.bind(preferred.id, preferred.spawn_round).first() : pendingStatement.first();
	return pending;}
 function readPendingDrops511(database, settings, scope) {
	const scoped = scope ? " AND owner_id = ?" + (scope.dropId ? " AND id = ?" : " AND monster_id IN (SELECT value FROM json_each(?))") : "";
	const binds = scope ? [scope.ownerId, scope.dropId ?? JSON.stringify(scope.monsterIds ?? [])] : [];
	const rows = database.prepare(`SELECT id, kind, item_name, rarity, role, enchantments FROM world_drops
     WHERE enchantments IN ('__pending__','__profile_pending__') AND kind IN ('weapon','armor','helmet','shoes','necklace')${scoped}
     ORDER BY expires_at LIMIT 64`).bind(...binds).all();
	return rows.results;}
 function readArenaSelection511(database, mode, channel, settings, worldCycle, nowMs, roomId) {
	const rule = ARENA_RULES[mode];
	const candidates = (database.prepare(`SELECT q.player_id, q.team_name, q.queue_group498, q.group_size498, q.party_id498, p.name, p.area
     FROM arena_queue q JOIN players p ON p.id = q.player_id
     WHERE q.mode = ? AND q.channel = ? AND q.last_seen_ms >= ? AND q.room_id = ?
       AND p.channel = q.channel AND p.area != 'arena'
       AND p.hp > 0 AND p.level >= 10 AND p.arena_match_id = '' AND p.combat_lock_until_ms <= ?
       AND NOT EXISTS (SELECT 1 FROM pve_engagements engagement WHERE engagement.player_id = p.id)
       AND (SELECT COUNT(*) FROM arena_match_players ap JOIN arena_matches am ON am.id=ap.match_id WHERE ap.player_id=p.id AND ap.joined_at_ms>=CAST((${nowMs}+10800000)/86400000 AS INTEGER)*86400000-10800000 AND am.id NOT LIKE 'guild-%' AND am.mode=q.mode) < CASE q.mode WHEN '1v1' THEN 5 WHEN '2v2' THEN 3 WHEN '3v3' THEN 2 WHEN '5v5' THEN 1 ELSE 0 END
 AND p.last_seen >= ?
     ORDER BY q.queued_at_ms, q.player_id LIMIT ?`).bind(mode, channel, nowMs - ARENA_QUEUE_TTL_MS, roomId, nowMs, Math.floor(nowMs / 1e3) - 30, rule.totalPlayers).all()).results;
	if (candidates.length < rule.totalPlayers) return null;
	const selected = selectArenaTeams498(candidates, rule.teamSize);
	if (!selected) return null;
	return selected;}
return Object.freeze({mixedNative,mixedMemory,nativeAttack,nativeAction,memoryAttack,nativePvp,memoryPvp,nativeContinuity,memoryContinuity,hydratePvp,hydrateCombatTarget,planMemory,prepareHits,hydrateAttack,applyGuardianImpact,colTrapImpact456,guardianMemory,trapMemory,dashGuardian,dashMemory,dashActionMemory,colSupportCast456,supportMemory,guardianCastVisual,lifeStealAmount,restoreStolenLife,preparePveEngagement,prepareRuneV2Winner483,questMonsterEligible438,dungeonService,eventBossProfile444,eventKind444,runeMonsterKey,runeV2MonsterKey,prepareRuneDrops,awardProfileNormalRewards,awardProfileBossRewards,awardProfileSinsiStoneRewards,awardPendingNormalRewards,awardPendingBossRewards,awardPendingSinsiStoneRewards,tryCreateArenaMatch,tryFinishArenaForfeit,settleArenaMatch,tryAwardPendingSinsiStoneRewards,tryFinalizePendingDropEnchantments,isArenaMode,colLabIsPlayer,readPendingBoss511,readPendingNormal511,readPendingSinsi511,readPendingDrops511,readArenaSelection511});
}
