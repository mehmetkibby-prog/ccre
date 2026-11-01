import {feature510} from '../../../vds-server/src/features510.mjs';
import {channelCapacity510,channelCapacitySql510} from '../../../vds-server/src/channel-capacity510.mjs';
import {feature504 as channelFeature504} from '../../../vds-server/src/features504.mjs';
import {selectEntry504,channelBalanceView504,channelOccupancy504} from '../../../vds-server/src/channel-balance504.mjs';
import {normalizeEventQueue499,eventOccurrence499,eventDisplay499,appendEvent499,stopEvent499,retainEventQueues499} from '../../../lib/event-queue499.mjs';
import {browseTradeGlass499,tradeGlassExpectedPrice499} from '../../../lib/trade-glass499.mjs';
import {materialLevelPolicy498,materialLevelItem498} from '../../../lib/material-level498.mjs';
import {runeLoot498,runeLootSnapshot498,runeSettings498} from '../../../lib/rune-material498.mjs';
import {dragonParticipant498,dragonMixedParticipant498,isDragonRankBoss498} from '../../../lib/dragon-ranking498.mjs';
import {optimizeR18} from '../../../vds-server/src/perf-r18-features.mjs';
import {equipmentTotalsR18,ownedEngagementR18,retaliationFrameR18} from '../../../vds-server/src/perf-r18-pure.mjs';
import {forgeDropSnapshot491,forgeDropStatements491} from '../../../lib/forge-material491.mjs';
function colTransferLevel491(item){if(!item||!["weapon","armor","helmet","shoes","necklace","earring","bracelet"].includes(item.kind))return 0;const match=/^\+([0-5]) /.exec(String(item.item_name??''));return match?Number(match[1]):0;}
function colTransferBonus491(item){return (item?.kind==='weapon'?[0,3,8,15,25,40]:[0,2,6,11,18,28])[colTransferLevel491(item)];}
import {readFriendRequests490} from '../../../lib/friends490.mjs';
import {pveEntries489,pvePath489,pveArmSql489,PVE_HEAD_SQL489,clearPveEntry489} from '../../../vds-server/src/pve-multi489.mjs';
import {cauldronDropSnapshot488,cauldronDropStatements488} from '../../../lib/cauldron488.mjs';
import {balanceFromSettings487,balanceFromSnapshot487,balanceSnapshot487,balanceArea487,balanceFactor487,balanceXpSql487,scaleLootGroups487,validateBalance487,defaultBalance487,catalogMultiplier487} from '../../../lib/level-balance487.mjs';
import {friendAction487,readFriends487,friendsView487,resolvePeer487} from '../../../lib/friends487.mjs';
import {partyView486} from '../../../lib/party-view486.mjs';
import {enforceCraftRate485,CRAFT_ACTIONS485} from '../../../vds-server/src/crafting-rate485.mjs';
import {tickRuneV2Boss484} from '../../../vds-server/src/rune-v2-combat484.mjs';

async function colTickRuneV2Boss484(database,settings){
 return tickRuneV2Boss484(database,{settings,position:monsterCombatPosition,cadence:pveAttackCadenceMs,damage:(boss,player,items,raw,settings)=>{
  if(raw===0)return {amount:0,raw:0,blocked:0,attackBlocked:false};
  const totals=createEnchantmentTotals(items),armor=items.reduce((sum,item)=>sum+Math.max(0,Number(item.power)||0),0)+totals('stone_defense');
  const calculated=pveDamage({...boss,runeDamageOverride484:raw},armor+serverRankBonuses(player.id).defense,player,settings),blocked=attackIsBlocked(totals('attack_block')+totals('stone_block'));
  return blocked?{amount:0,raw:calculated.raw,blocked:calculated.raw,attackBlocked:true}:{...calculated,attackBlocked:false};
 },publish:event=>deliverRealtime(publishRealtimeRoomEvent(event.cycle,event.channel,event.area,event))});
}
import {runeV2Participant483,runeV2MixedParticipant483,prepareRuneV2Winner483} from '../../../lib/rune-v2-ranking.mjs';
import {runeV2MonsterKey,isRuneV2Boss,RUNE_V2_BOSS_SPAWN} from '../../../lib/rune-v2.mjs';
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
import {safeLoadLabAuthCodeR12} from '../../../vds-server/src/loadlab/auth-preparation-r12.mjs';
import {clearStalePveEngagement477} from '../../../vds-server/src/pve-engagement-cleanup477.mjs';
import {actionTiming477,perfStage477} from '../../../vds-server/src/request-performance477.mjs';
import {colLabHttpAuth} from '../../../vds-server/src/loadlab/http-auth.mjs';
import {colLabNormalRespawnSecondsR10,colLabIsPlayer,colLabIsMonster,colLabPlayerRun,colLabMayAffectPlayer,colLabSamePlayerCohort,colLabMayAffectMonster,colLabAssertAction,colLabAssertPlans,colLabCanSeeMonster,colLabCanSeeCombat,colLabEventAudience,colLabTagReward,colLabRewardDatabase,colLabBossMonster,colLabTagWarReward,colLabMonsterActive,colLabMonsterSource,colLabFailureResponse} from '../../../vds-server/src/loadlab-gameplay.mjs';
import {BOSS_LEADERS_SQL476,STONE_PARTICIPANT_SQL476,STONE_MIXED_PARTICIPANT_SQL476,STONE_WINNER_GEMS_SQL476,STONE_PARTICIPANT_EXPIRY_GUARD476,STONE_DEFEAT_EXPIRY_GUARD476,stoneBossFields476} from '../../../lib/stone-boss-ranking476.mjs';
import {readSpecialistSkills459,validateSpecialistSkills459,defaultSpecialistSkills459} from '../../../lib/specialist-skills459.mjs';
async function openHalloweenPumpkin456(database, playerId, requestId, reward, now) {
	const previous = await database.prepare("SELECT reward_json FROM crystal_chest_openings WHERE id=? AND player_id=?").bind(requestId, playerId).first();
	if (previous) return JSON.parse(previous.reward_json);
	const token = crypto.randomUUID();
	const gate = "EXISTS(SELECT 1 FROM crystal_chest_openings WHERE id=? AND player_id=? AND claim_token=?)";
	const statements = [database.prepare(`INSERT OR IGNORE INTO crystal_chest_openings(id,player_id,reward_json,claim_token,created_at)
 SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM dungeon_materials WHERE player_id=? AND kind='halloween_pumpkin' AND amount>0)`).bind(requestId, playerId, JSON.stringify(reward), token, now, playerId)];
	if (reward.item) {
		const i = reward.item;
		statements.push(database.prepare(`INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at)
 SELECT ?,?,?,?,?,?,?,?,0,? WHERE ${gate}`).bind(i.id, playerId, i.kind, i.item_name, i.rarity, i.power, i.role, i.enchantments, now, requestId, playerId, token));
	} else if (reward.material) statements.push(database.prepare(`INSERT INTO dungeon_materials(player_id,kind,amount)
 SELECT ?,?,? WHERE ${gate} ON CONFLICT(player_id,kind) DO UPDATE SET amount=dungeon_materials.amount+excluded.amount`).bind(playerId, reward.material, reward.amount, requestId, playerId, token));
	else if (reward.stone) statements.push(database.prepare(`INSERT INTO player_stones(player_id,kind,amount)
 SELECT ?,?,? WHERE ${gate} ON CONFLICT(player_id,kind) DO UPDATE SET amount=player_stones.amount+excluded.amount`).bind(playerId, reward.stone, reward.amount, requestId, playerId, token));
	else if (reward.column && [
		"essence",
		"potions",
		"stone_dust",
		"gems",
		"pearls", "red_pearls",
		"fifth_enchant_scrolls"
	].includes(reward.column)) statements.push(database.prepare(`UPDATE players SET ${reward.column}=${reward.column}+? WHERE id=? AND ${gate}`).bind(reward.amount, playerId, requestId, playerId, token));
	else throw new Error("Geçersiz Bal Kabağı ödülü.");
 if(reward.wand===1)statements.push(database.prepare(`INSERT INTO dungeon_materials(player_id,kind,amount) SELECT ?,'witch_wand',1 WHERE ${gate} ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount`).bind(playerId,requestId,playerId,token));
	statements.push(database.prepare(`UPDATE dungeon_materials SET amount=amount-1 WHERE player_id=? AND kind='halloween_pumpkin' AND amount>0 AND ${gate}`).bind(playerId, requestId, playerId, token));
	await database.batch(statements);
	const receipt = await database.prepare("SELECT reward_json FROM crystal_chest_openings WHERE id=? AND player_id=?").bind(requestId, playerId).first();
	return receipt ? JSON.parse(receipt.reward_json) : null;
}
function halloweenEventView456(raw){const c=readEventsConfig(raw),e=eventDisplay499(c.events.halloween);return {enabled:e.enabled,start:e.start,end:e.end,percent:e.percent,wandChance:c.halloweenWandChance};}
import {specialization456 as colSpec456,skillFourGrowth456 as colSkillGrowth456} from '../../../lib/expansion456.mjs';

async function colSupportCast456(database,player,settings,payload,receivedAt){
 const branch=colSpec456(player.role,player.specialization,settings),time=Date.now();
 const areas=['forest','frozen','sanctum','dragon','sinsi','black','war','arena','ancient','afk','event','rune','rune_v2'];
 if(!branch||!['heal','guard'].includes(branch.effect)||player.level<30||player.hp<=0||player.rod_equipped||!areas.includes(player.area))return Response.json({error:'Bu uzmanlık becerisi kullanılamıyor.'},{status:409});
 if(globalThis.__colDungeon?.locked(player.id))return Response.json({error:'Beceriyi zindan kontrollerinden kullanmalısın.'},{status:409});
 const gear=equippedEnchantItems(player),cooldown=effectiveSkillCooldown444(branch.cooldown,Math.min(50,enchantmentTotal(gear,'cast_speed')+(player.jewelry_cast_speed||0))),until=receivedAt+cooldown;
 const arenaGuard=player.area==='arena'?" AND EXISTS(SELECT 1 FROM arena_matches m WHERE m.id=players.arena_match_id AND m.status IN ('countdown','active') AND m.starts_at_ms<=? AND (m.id NOT LIKE 'guild-%' OR m.starts_at_ms+600000>?))":'';
 const reserve=database.prepare('UPDATE players SET attack_four_at=MAX(attack_four_at,?)+?,special_guard_until_ms=?,combat_lock_until_ms=MAX(combat_lock_until_ms,?) WHERE id=? AND hp>0 AND level>=30 AND rod_equipped=0 AND stun_until_ms<=? AND attack_four_at<=? AND specialization=? AND role=? AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=?'+arenaGuard+' RETURNING attack_four_at AS reserved_until,special_guard_until_ms').bind(receivedAt,cooldown,branch.effect==='guard'?time+branch.guardMs:0,time+5000,player.id,time,receivedAt,branch.id,player.role,player.area,player.channel,player.arena_match_id,player.realtime_scope_version,...(player.area==='arena'?[time,time]:[]));
 const friendly=player.area==='arena'?"p.arena_match_id=? AND EXISTS(SELECT 1 FROM arena_match_players mine JOIN arena_match_players peer ON peer.match_id=mine.match_id AND peer.team=mine.team WHERE mine.player_id=? AND peer.player_id=p.id AND mine.match_id=p.arena_match_id AND EXISTS(SELECT 1 FROM party_members pm505 JOIN party_members pp505 ON pp505.party_id=pm505.party_id WHERE pm505.player_id=mine.player_id AND pp505.player_id=peer.player_id))":"p.arena_match_id='' AND EXISTS(SELECT 1 FROM party_members mine JOIN party_members peer ON peer.party_id=mine.party_id WHERE mine.player_id=? AND peer.player_id=p.id)";
 const friendlyParams=player.area==='arena'?[player.arena_match_id,player.id]:[player.id];
 let targets=[player];
 if(branch.effect==='heal'){
  // Filtering reach before LIMIT prevents remote teammates occupying the bounded slots.
  const rows=await database.prepare('SELECT p.id,p.hp,p.max_hp,p.x,p.y,p.realtime_scope_version FROM players p JOIN players caster ON caster.id=? WHERE p.hp>0 AND p.loadlab_run_id=caster.loadlab_run_id AND (length(p.loadlab_run_id)=0 OR p.loadlab_team=caster.loadlab_team) AND p.channel=? AND p.area=? AND p.arena_match_id=? AND (p.id=? OR (p.last_seen>=? AND p.hp<p.max_hp)) AND (p.x-caster.x)*(p.x-caster.x)+(p.y-caster.y)*(p.y-caster.y)<=102400 AND (p.id=? OR ('+friendly+')) ORDER BY p.id=? DESC,(p.x-caster.x)*(p.x-caster.x)+(p.y-caster.y)*(p.y-caster.y),p.id LIMIT 5').bind(player.id,player.channel,player.area,player.arena_match_id,player.id,Math.floor(time/1000)-30,player.id,...friendlyParams,player.id).all();
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
 const result=await database.guardedBatch(reserve,healStatements),reserved=result.guard.results[0];
 if(!reserved)return Response.json({error:'Yetenek henüz hazır değil veya savaş durumun değişti.'},{status:409});
 const healed=result.results.flatMap(r=>r.results??[]),own=healed.find(p=>p.id===player.id),effect={type:'specialization_effect',eventId:'spec456:'+player.id+':'+until,actorId:player.id,specialization:branch.id,kind:branch.effect,x:player.x,y:player.y,targets:healed,serverAt:time,until:time+850};
 // Existing player_state keeps both clients and the realtime room HP current.
 const updates=healed.map(p=>publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'player_state',eventId:'spec456-hp:'+until+':'+p.id,targetId:p.id,hp:p.hp,maxHp:p.max_hp,hpRevision:p.hp_revision,serverAt:time},player.arena_match_id||undefined));
 updates.push(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,effect,player.arena_match_id||undefined));
 await deliverRealtime(Promise.all(updates));
 return Response.json({ok:true,specialEffect:effect,cooldownRemainingMs:cooldown,reservedUntilMs:Number(reserved.reserved_until),...(own?{hp:own.hp,maxHp:own.max_hp,hpRevision:own.hp_revision}:{}),special_guard_until_ms:Number(reserved.special_guard_until_ms)});
}
async function colTrapImpact456(database,attacker,target,kind,branch,now,intentId){
 if(!(kind==='player'?colLabMayAffectPlayer(attacker,target):colLabMayAffectMonster(attacker,target)))return null;
 if(kind==='monster'&&(isBlackStoneBoss476(target.id)||isRuneV2Boss(target.id)))return null;
 if(branch?.effect!=='root'||attacker.role!=='avci'||!(branch.rootMs>0))return null;
 const until=now+Math.max(0,Math.min(2000,Number(branch.rootMs)||0));
 let controlled;
 if(kind==='player')controlled=await database.prepare('UPDATE players SET root_until_ms=MAX(root_until_ms,?),hp_revision=hp_revision+1 WHERE id=? AND hp>0 AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=? AND EXISTS(SELECT 1 FROM players caster WHERE caster.id=? AND caster.hp>0 AND caster.specialization=? AND caster.loadlab_run_id=players.loadlab_run_id AND caster.area=players.area AND caster.channel=players.channel AND caster.arena_match_id=players.arena_match_id AND caster.realtime_scope_version=?) RETURNING x,y,hp,hp_revision,position_revision,root_until_ms,stun_until_ms').bind(until,target.id,attacker.area,attacker.channel,attacker.arena_match_id,target.realtime_scope_version,attacker.id,branch.id,attacker.realtime_scope_version).first();
 else controlled=await database.prepare('UPDATE monsters SET root_until_ms=MAX(root_until_ms,?),control_x=?,control_y=? WHERE id=? AND hp>0 AND spawn_round=? AND area=? AND channel=? AND is_boss=0 AND is_stone=0 RETURNING root_until_ms,stun_until_ms').bind(until,target.x,target.y,target.id,target.spawn_round,attacker.area,attacker.channel).first();
 if(!controlled)return null;
 return {type:'guardian_control',eventId:'trap456:'+attacker.id+':'+(intentId??now),intentId,attackerId:attacker.id,actorId:attacker.id,targetId:target.id,targetKind:kind,ability:3,casterPoint:{x:attacker.x,y:attacker.y},from:{x:target.x,y:target.y},to:{x:target.x,y:target.y},moved:null,controlled,targetPoint:{x:target.x,y:target.y},serverAt:now,area:attacker.area,channel:attacker.channel,...(kind==='monster'?{spawnRound:target.spawn_round}:{})};
}

function colJewelry456(items){let attack=0,defense=0,castSpeed=0,strongPlayers=0,resistantPlayers=0;for(const i of items){if(i.equipped!==1)continue;if(i.kind==='earring'){attack+=20;castSpeed+=10;strongPlayers+=5;defense+=colTransferBonus491(i);}else if(i.kind==='bracelet'){attack+=20;defense+=50;resistantPlayers+=5;defense+=colTransferBonus491(i);}}return {attack,defense,castSpeed,strongPlayers,resistantPlayers};}
// V453: bounded static decoration configuration. No new simulation work.
const colDecor453 = (function createSeasonalDecorServer453() {
  const areas = ['forest','frozen','black','bazaar','fishing','sanctum','sinsi','war','arena',"ancient","afk","dragon","event","rune","rune_v2",'guild_arena'];
  const themes = ['new_year','halloween','ramadan','first_light'];
  const acceptedThemes = ['none', ...themes];
  const cache = new Map();
  const readSql = 'SELECT seasonal_themes_json,new_year_mode,halloween_mode FROM game_settings WHERE id=1';
  const writeSql = 'UPDATE game_settings SET seasonal_themes_json=? WHERE id=1 AND seasonal_themes_json=? AND new_year_mode=? AND halloween_mode=?';
  let parseCount = 0;
  const plain = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const n = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  const round = value => Math.round(value * 1e5) / 1e5;
  const validRevision = revision => Number.isSafeInteger(revision) && revision >= 0;
  const error = (status, message) => ({ok:false,status,error:message});
  function validateLayout(theme, props, lights) {
    if (!themes.includes(theme) || !Array.isArray(props) || props.length > 32 || !Array.isArray(lights) || lights.length > 8) return null;
    const normalizedProps = [], normalizedLights = [];
    for (const prop of props) {
      if (!Array.isArray(prop) || prop.length < 4 || prop.length > 5 || !Number.isInteger(prop[0]) || prop[0] < 0 || prop[0] > ((theme === "new_year" || theme === "halloween") ? 11 : 5) ||
          !n(prop[1],0,1) || !n(prop[2],0,1) || !n(prop[3],60,320) || (prop.length === 5 && typeof prop[4] !== 'boolean')) return null;
      normalizedProps.push(prop.length === 5 ? [prop[0],round(prop[1]),round(prop[2]),round(prop[3]),prop[4]] : [prop[0],round(prop[1]),round(prop[2]),round(prop[3])]);
    }
    for (const light of lights) {
      if (!Array.isArray(light) || light.length !== 5 || !n(light[0],0,1) || !n(light[1],0,1) || !n(light[2],0,1) || !n(light[3],0,1) || !n(light[4],0,.08)) return null;
      normalizedLights.push(light.map(round));
    }
    return {props:normalizedProps,lights:normalizedLights};
  }
  function parse(raw) {
    raw = typeof raw === 'string' && raw.length <= 196608 ? raw : '{}';
    if (cache.has(raw)) return cache.get(raw);
    parseCount++;
    let map;
    try { map = JSON.parse(raw); } catch { map = {}; }
    if (!plain(map)) map = {};
    const publicThemes = {};
    for (const area of areas.slice(0,-1)) if (Object.hasOwn(map,area) && acceptedThemes.includes(map[area])) publicThemes[area] = map[area];
    const layouts = {};
    if (map.__decor?.version === 1 && plain(map.__decor.layouts)) for (const theme of themes) for (const area of areas) {
      const key = theme + ':' + area;
      const value = map.__decor.layouts[key];
      if (!plain(value) || !validRevision(value.revision) || typeof value.custom !== 'boolean') continue;
      const layout = validateLayout(theme,value.props,value.lights);
      if (!layout) continue;
      const item = {revision:value.revision,custom:value.custom,...(value.custom ? layout : {props:[],lights:[]})};
      for (const tuple of item.props) Object.freeze(tuple);
      for (const tuple of item.lights) Object.freeze(tuple);
      Object.freeze(item.props); Object.freeze(item.lights); Object.freeze(item);
      layouts[key] = item;
    }
    const config = Object.freeze({themes:Object.freeze(publicThemes),layouts:Object.freeze(layouts),publicJson:JSON.stringify(publicThemes)});
    if (cache.size >= 4) cache.delete(cache.keys().next().value);
    cache.set(raw,config);
    return config;
  }
  function theme(settings, area) {
    if (!areas.includes(area)) return 'none';
    const themeArea = area === 'guild_arena' ? 'arena' : area;
    const config = parse(settings?.seasonal_themes_json);
    return Object.hasOwn(config.themes,themeArea) ? config.themes[themeArea] : Number(settings?.new_year_mode) === 1 ? 'new_year' : Number(settings?.halloween_mode) === 1 ? 'halloween' : 'none';
  }
  function layout(settings, area, selectedTheme) {
    if (!areas.includes(area) || !themes.includes(selectedTheme)) return null;
    return parse(settings?.seasonal_themes_json).layouts[selectedTheme + ':' + area] ?? null;
  }
  function projectSettings(settings, area, arenaMatchId = '') {
    const raw = settings?.seasonal_themes_json;
    // The baseline has no custom records. Preserve the exact original object,
    // shape and bytes until an administrator creates a decoration revision.
    if (typeof raw !== 'string' || !raw.includes('__decor')) return settings;
    // Guild matches persist player.area='arena'. Their existing match ID
    // already identifies the courtyard; no new viewer query is necessary.
    if (area === 'arena' && typeof arenaMatchId === 'string' && arenaMatchId.startsWith('guild-')) area = 'guild_arena';
    const config = parse(raw);
    const result = {...settings,seasonal_themes_json:config.publicJson};
    delete result.seasonal_decor_current;
    const selectedTheme = theme(settings,area);
    const selected = selectedTheme === 'none' ? null : config.layouts[selectedTheme + ':' + area];
    if (selected) result.seasonal_decor_current = {area,theme:selectedTheme,...selected};
    return result;
  }
  function pack(config, publicThemes = config.themes, layouts = config.layouts) {
    return JSON.stringify({...publicThemes,...(Object.keys(layouts).length ? {__decor:{version:1,layouts}} : {})});
  }
  async function save(database, payload) {
    if (!areas.includes(payload.area) || !themes.includes(payload.theme) || !validRevision(payload.expectedRevision) || payload.expectedRevision === Number.MAX_SAFE_INTEGER) return error(400,'Harita, tema veya yerleşim sürümü geçersiz.');
    const resetting = payload.action === 'reset_decor_layout';
    if (!resetting && payload.action !== 'set_decor_layout') return error(400,'Süsleme işlemi geçersiz.');
    const nextLayout = resetting ? {props:[],lights:[]} : validateLayout(payload.theme,payload.props,payload.lights);
    if (!nextLayout) return error(400,'En fazla 32 süs ve 8 ışık dizisi kullanılabilir. Süs türü, boyutu veya konumu geçersiz.');
    const current = await database.prepare(readSql).first();
    if (!current) return error(409,'Dünya ayarı bulunamadı. Paneli yenile.');
    const config = parse(current.seasonal_themes_json);
    const key = payload.theme + ':' + payload.area;
    if ((config.layouts[key]?.revision ?? 0) !== payload.expectedRevision) return error(409,'Bu yerleşim başka pencerede değişti. Paneli yenile.');
    const revision = payload.expectedRevision + 1;
    const layouts = {...config.layouts,[key]:{revision,custom:!resetting,...nextLayout}};
    const saved = await database.prepare(writeSql).bind(pack(config,config.themes,layouts),current.seasonal_themes_json,current.new_year_mode,current.halloween_mode).run();
    if (!saved.meta?.changes) return error(409,'Süsler veya temalar başka pencerede değişti. Paneli yenile.');
    cache.clear();
    return {ok:true,revision};
  }
  async function setMapTheme(database,payload) {
    if (!areas.slice(0,-1).includes(payload.area) || !acceptedThemes.includes(payload.theme)) return error(400,'Harita veya tema geçersiz. Zindanda tema kullanılamaz.');
    const current = await database.prepare(readSql).first();
    if (!current || theme(current,payload.area) !== payload.expectedTheme) return error(409,'Bu haritanın teması değişmiş. Paneli yenileyip tekrar dene.');
    const config = parse(current.seasonal_themes_json);
    const map = Object.fromEntries(areas.slice(0,-1).map(area=>[area,theme(current,area)]));
    map[payload.area] = payload.theme;
    const saved = await database.prepare(writeSql).bind(pack(config,map),current.seasonal_themes_json,current.new_year_mode,current.halloween_mode).run();
    if (!saved.meta?.changes) return error(409,'Temalar başka pencerede değişti. Paneli yenile.');
    cache.clear();
    return {ok:true};
  }
  async function setGlobalTheme(database,payload) {
    if (typeof payload.enabled !== 'boolean' || !['set_new_year_mode','set_halloween_mode'].includes(payload.action)) return error(400,'Tema durumu geçersiz.');
    const current = await database.prepare(readSql).first();
    if (!current) return error(409,'Dünya ayarı bulunamadı. Paneli yenile.');
    const config = parse(current.seasonal_themes_json);
    const winter = payload.action === 'set_new_year_mode';
    const newYear = winter ? (payload.enabled ? 1 : 0) : payload.enabled ? 0 : current.new_year_mode;
    const halloween = winter ? payload.enabled ? 0 : current.halloween_mode : (payload.enabled ? 1 : 0);
    const saved = await database.prepare('UPDATE game_settings SET seasonal_themes_json=?,new_year_mode=?,halloween_mode=? WHERE id=1 AND seasonal_themes_json=? AND new_year_mode=? AND halloween_mode=?').bind(pack(config,{}),newYear,halloween,current.seasonal_themes_json,current.new_year_mode,current.halloween_mode).run();
    if (!saved.meta?.changes) return error(409,'Temalar başka pencerede değişti. Paneli yenile.');
    cache.clear();
    return {ok:true};
  }
  return Object.freeze({projectSettings,save,setMapTheme,setGlobalTheme,layout,theme,validateLayout,cacheState:()=>({size:cache.size,parseCount})});
})();
function effectiveSkillCooldown444(baseMs,speedPercent=0){const raw=Number(baseMs),base=Number.isFinite(raw)?Math.max(500,Math.round(raw)):10000;const speed=Number(speedPercent),safe=Number.isFinite(speed)?Math.max(0,Math.min(50,speed)):0;return Math.max(500,Math.round(base/(1+safe/100)));}
import {EVENT_WORLD444,EVENT_SPAWN444,eventWalkable444,eventSegment444,eventKind444,EVENT_BOSSES444} from '../../../lib/event-island444.mjs';
async function colUpgradeEmerald502(database,playerId,itemId,now,haso,range){
 const token=crypto.randomUUID(), marker='emerald502:'+itemId;
 const level="COALESCE((SELECT e.level FROM item_enhancements491 e WHERE e.item_id=item.id),0)";
 const bonus="(CASE item.kind WHEN 'weapon' THEN CASE "+level+" WHEN 1 THEN 3 WHEN 2 THEN 8 WHEN 3 THEN 15 WHEN 4 THEN 25 WHEN 5 THEN 40 ELSE 0 END ELSE CASE "+level+" WHEN 1 THEN 2 WHEN 2 THEN 6 WHEN 3 THEN 11 WHEN 4 THEN 18 WHEN 5 THEN 28 ELSE 0 END END)";
 const baseName="CASE item.kind WHEN 'weapon' THEN CASE item.role WHEN 'muhafiz' THEN 'Kadim Zümrüt Hükümkılıcı' WHEN 'avci' THEN 'Kadim Zümrüt Ufuk Yayı' WHEN 'arkanist' THEN 'Kadim Zümrüt Öz Asası' END WHEN 'armor' THEN 'Kadim Zümrüt Zırhı' WHEN 'helmet' THEN 'Kadim Zümrüt Tacı' WHEN 'shoes' THEN 'Kadim Zümrüt Çizmeleri' WHEN 'necklace' THEN 'Kadim Zümrüt Kalbi' END";
 const materials=['strong_branch','strong_crystal','desert_plant','master_scroll'];
 const claim="EXISTS(SELECT 1 FROM blacksmith_upgrades WHERE item_id=? AND claim_token=? AND player_id=?)";
 const results=await database.batch([
  database.prepare(`INSERT OR IGNORE INTO blacksmith_upgrades(item_id,player_id,claim_token,prior_power,upgraded_power,upgraded_at)
   SELECT ?,item.player_id,?,item.power,CASE item.kind WHEN 'weapon' THEN 420 ELSE CAST(round((item.power-${bonus})*1.2) AS INTEGER) END+${bonus},?
   FROM player_items item JOIN players owner ON owner.id=item.player_id
   WHERE item.id=? AND item.player_id=? AND item.rarity='emerald'
   AND item.kind IN ('weapon','armor','helmet','shoes','necklace') AND item.role IN ('muhafiz','avci','arkanist')
   AND typeof(item.power)='integer' AND item.power-${bonus} BETWEEN 1 AND 833333000
   AND (item.kind!='weapon' OR item.power-${bonus}<=420)
   AND ${level} BETWEEN 0 AND 5
   AND (item.item_name='+'||${level}||' '||(${baseName}) OR (${level}=0 AND item.item_name=(${baseName})))
   AND owner.hp>0 AND owner.area='bazaar' AND COALESCE(owner.arena_match_id,'')=''
   AND COALESCE(owner.combat_lock_until_ms,0)<=? AND (owner.x-?)*(owner.x-?)+(owner.y-?)*(owner.y-?)<=?
   AND NOT EXISTS(SELECT 1 FROM player_trade_locks WHERE player_id=owner.id)
   AND NOT EXISTS(SELECT 1 FROM dungeon_members WHERE player_id=owner.id)
   AND NOT EXISTS(SELECT 1 FROM pve_engagements WHERE player_id=owner.id)
   AND owner.gems>=25000 AND owner.pearls>=100
   AND (SELECT COUNT(*) FROM dungeon_materials WHERE player_id=owner.id AND kind IN ('strong_branch','strong_crystal','desert_plant','master_scroll') AND amount>=50)=4
   AND EXISTS(SELECT 1 FROM player_stones WHERE player_id=owner.id AND kind='evolution_scroll' AND amount>=50)`)
   .bind(marker,token,now,itemId,playerId,now*1000,haso.x,haso.x,haso.y,haso.y,range*range),
  database.prepare(`UPDATE players SET gems=gems-25000,pearls=pearls-100,last_seen=? WHERE id=? AND gems>=25000 AND pearls>=100 AND changes()=1 AND ${claim} RETURNING gems,pearls,stone_dust`).bind(now,playerId,marker,token,playerId),
  ...materials.map(kind=>database.prepare(`UPDATE dungeon_materials SET amount=amount-50 WHERE player_id=? AND kind=? AND amount>=50 AND changes()=1 AND ${claim} RETURNING kind,amount`).bind(playerId,kind,marker,token,playerId)),
  database.prepare(`UPDATE player_stones SET amount=amount-50 WHERE player_id=? AND kind='evolution_scroll' AND amount>=50 AND changes()=1 AND ${claim} RETURNING kind,amount`).bind(playerId,marker,token,playerId),
  database.prepare(`UPDATE player_items AS item SET power=(SELECT upgraded_power FROM blacksmith_upgrades WHERE item_id=? AND claim_token=?),item_name='+'||${level}||' Eşsiz '||(${baseName})
   WHERE item.id=? AND item.player_id=? AND item.rarity='emerald' AND changes()=1 AND ${claim}
   RETURNING id,kind,item_name,rarity,power,role,enchantments,equipped,sale_locked499`).bind(marker,token,itemId,playerId,marker,token,playerId),
  database.prepare(`SELECT CASE WHEN ${claim} AND changes()<>1 THEN abs(-9223372036854775808) ELSE 1 END AS complete`).bind(marker,token,playerId)
 ]);
 const item=results[7]?.results?.[0],wallet=results[1]?.results?.[0];
 if(item&&wallet){await globalThis.__colPremium?.refreshHp(playerId);return Response.json({ok:true,item,gems:wallet.gems,pearls:wallet.pearls,stoneDust:wallet.stone_dust,message:item.item_name+' dövüldü · artı seviyesi, efsunlar ve set özellikleri korundu.'});}
 const existing=await database.prepare(`SELECT item.id,item.kind,item.item_name,item.rarity,item.power,item.role,item.enchantments,item.equipped,item.sale_locked499 FROM player_items item JOIN blacksmith_upgrades upgraded ON upgraded.item_id=? WHERE item.id=? AND item.player_id=? AND item.rarity='emerald'`).bind(marker,itemId,playerId).first();
 if(existing)return Response.json({ok:true,alreadyUpgraded:true,item:existing,message:'Bu Kadim Zümrüt eşya zaten Eşsiz seviyeye dönüştürülmüş.'});
 return Response.json({error:'Dönüşüm için Demirci Haso yanında, savaş ve ticaret dışında olmalısın. Uygun Kadim Zümrüt eşya, 100 Beyaz İnci, 25.000 Mücevher ve 50’şer Güçlü Dal, Güçlü Kristal, Çöl Bitkisi, Usta Parşömeni, Evrim Parşömeni gerekir.'},{status:400});
}
const EMERALD_SET444=Object.freeze({name:'Kadim Zümrüt Seti',slots:['weapon','armor','helmet','shoes','necklace'],bonuses:{hp:1000,pve:10,pvp:10,resistance:0,speed:12,attack:50}});
function emeraldName444(kind,role){return kind==='weapon'?({muhafiz:'Kadim Zümrüt Hükümkılıcı',avci:'Kadim Zümrüt Ufuk Yayı',arkanist:'Kadim Zümrüt Öz Asası'}[role]??'Kadim Zümrüt Hükümkılıcı'):({armor:'Kadim Zümrüt Zırhı',helmet:'Kadim Zümrüt Tacı',necklace:'Kadim Zümrüt Kalbi',shoes:'Kadim Zümrüt Çizmeleri'}[kind]??'Kadim Zümrüt');}
function emeraldPower444(kind,settings={}){if(kind==='weapon')return 350;if(kind==='armor')return 300;const unique=Math.max(1,Number(settings[kind==='weapon'?'unique_weapon_power':'unique_armor_power'])||(kind==='weapon'?180:150));const percent=Number.isFinite(Number(settings.infinite_power_percent))?Math.max(0,Number(settings.infinite_power_percent)):30;const weaponBase=Math.max(1,Number(settings.infinite_weapon_power)||230);const infinite=globalThis.__colDragonBoss?.infinitePower?.({kind,power:unique})??(kind==='weapon'&&unique<=180?Math.max(unique,weaponBase):kind==='weapon'?Math.max(unique,Math.round(unique*(1+percent/100)),weaponBase):Math.round(unique*(1+percent/100)));return Math.min(100000,Math.ceil(infinite*1.15));}
const EMERALD_CATALOG444=['muhafiz','avci','arkanist'].flatMap(role=>['weapon','armor','helmet','necklace','shoes'].map(kind=>({id:`gear:${role}:${kind}:emerald`,name:emeraldName444(kind,role),type:'gear',kind,role,rarity:'emerald',group:'Kadim Zümrüt'})));
function emeraldIconStyle444(kind,role){if(kind==='armor')return {display:'inline-block',flexShrink:0,backgroundImage:'url(/game/emerald-armor-v445.webp)',backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat'};const col=kind==='weapon'?Math.max(0,['muhafiz','avci','arkanist'].indexOf(role)):Math.max(0,['helmet','necklace','shoes'].indexOf(kind));return {display:'inline-block',flexShrink:0,backgroundImage:'url(/game/emerald-set-v444.webp)',backgroundSize:'300% 200%',backgroundPosition:`${col*50}% ${kind==='weapon'?0:100}%`,backgroundRepeat:'no-repeat'};}
function emeraldGroundArt444(drop){if(drop.kind==='armor')return {src:'/game/emerald-armor-v445.webp',columns:1,rows:1,col:0,row:0,glyph:'◆',label:drop.item_name??emeraldName444('armor',drop.role),color:'#39c889',rarity:'emerald'};return {src:'/game/emerald-set-v444.webp',columns:3,rows:2,col:drop.kind==='weapon'?Math.max(0,['muhafiz','avci','arkanist'].indexOf(drop.role)):Math.max(0,['helmet','necklace','shoes'].indexOf(drop.kind)),row:drop.kind==='weapon'?0:1,glyph:'◆',label:drop.item_name??emeraldName444(drop.kind,drop.role),color:'#39c889',rarity:'emerald'};}
function emeraldGrantFields444(current,change){const next={...current,...change};if(next.rarity!=='emerald')return next;return {...next,itemName:emeraldName444(next.kind,next.role),power:emeraldPower444(next.kind)};}

import {questKillSql438,questMonsterEligible438} from '../../../lib/quests438.mjs';
import {battlePassXpSql} from '../../../lib/battle-pass.mjs';
async function colRepairRuneAccess(database,playerId){
 const current = await database.prepare("SELECT id,(level<65 OR rank_tier<1) AS underqualified FROM players WHERE id=? AND area='rune'").bind(playerId).first();
 const enabled = globalThis.__colRunes?.settings().config.enabled ? 1 : 0;
 if (!current || (!current.underqualified && enabled)) return null;
return database.prepare(`UPDATE players SET area='bazaar',arena_match_id='',x=?,y=?,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0 WHERE id=? AND area='rune' AND (level<65 OR rank_tier<1 OR ?=0) RETURNING id`).bind(BAZAAR_SPAWN.x,BAZAAR_SPAWN.y,Date.now(),playerId,globalThis.__colRunes?.settings().config.enabled?1:0).first();}

async function colRepairRuneV2Access(database,playerId){
 const current = await database.prepare("SELECT id,(level<65 OR rank_tier<1) AS underqualified FROM players WHERE id=? AND area='rune_v2' AND hp>0").bind(playerId).first();
 const enabled = globalThis.__colRuneV2?.settings().config.enabled ? 1 : 0;
 if (!current || (!current.underqualified && enabled)) return null;
return database.prepare(`UPDATE players SET area='bazaar',arena_match_id='',x=?,y=?,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0 WHERE id=? AND area='rune_v2' AND (level<65 OR rank_tier<1 OR ?=0) RETURNING id`).bind(BAZAAR_SPAWN.x,BAZAAR_SPAWN.y,Date.now(),playerId,globalThis.__colRuneV2?.settings().config.enabled?1:0).first();}

import {RUNE_TYPES,RUNE_LOOT_LABELS,RUNE_WORLD,RUNE_SPAWN,RUNE_GATE_MESSAGE,runeEligible,runeWalkable,runeWalkableSegment,runeMonsterKey} from '../../../lib/runes.mjs';
import {prepareRuneDrops} from '../../../lib/rune-drops.mjs';
function colRuneFactor(p,stat){return globalThis.__colRunes?.factor(p,stat)??1;}
import { DatabaseSync, backup } from "node:sqlite";
import { open, stat } from "node:fs/promises";
import { posix } from "node:path";
import { createHash, createPrivateKey, sign } from "node:crypto";
import { closeSync, existsSync, fsyncSync, openSync } from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { performance as performance$1 } from "node:perf_hooks";
import { availableParallelism, cpus } from "node:os";
import http from "node:http";
import { getRequestExecutionContext } from "vinext/shims/request-context";
import "next/headers.js";
import "next/navigation.js";
//#endregion
//#region lib/action-diagnostics.mjs
var names$1 = new Set(`answer_broken_core464 dismiss_broken_core464 buy_specialization_reset463 use_specialization_reset463 open_halloween_pumpkin456 cast_support456 craft_jewelry456 choose_specialization456 upgrade_specialization456 exchange_wands456 use_halloween_candy456 open_crystal_chest open_moonlight_chest join move heartbeat claim_rewards attack collect donate hurt respawn equip unequip exchange_essence buy_potion use_potion sell_item sell_rarity upgrade_skill upgrade_unique craft_stone socket_stone evolve_weapon buy_wings equip_wings unequip_wings buy_pet toggle_pet rename_pet travel_rune_v2 travel_rune travel_dragon travel_ancient travel_afk travel_market travel_forest travel_frozen travel_sanctum create_shop create_listing cancel_listing buy_listing storage_deposit storage_withdraw travel_fishing buy_rod equip_rod start_fishing fishing_input finish_fishing cancel_fishing sell_fish invite_party accept_party reject_party leave_party select_channel travel_sinsi travel_war travel_black pvp_attack arena_join_queue arena_cancel_queue arena_ack_result guardian_dash`.split(" "));
var diagnosticAction = (value) => typeof value === "string" && names$1.has(value) ? value : "unknown";
var gameplayRejections = new Set(`answer_broken_core464 dismiss_broken_core464 buy_specialization_reset463 use_specialization_reset463 open_halloween_pumpkin456 cast_support456 craft_jewelry456 choose_specialization456 upgrade_specialization456 exchange_wands456 use_halloween_candy456 open_crystal_chest open_moonlight_chest unequip exchange_essence buy_potion sell_item sell_rarity upgrade_skill upgrade_unique craft_stone socket_stone evolve_weapon buy_wings equip_wings unequip_wings buy_pet toggle_pet rename_pet travel_rune_v2 travel_rune travel_dragon travel_ancient travel_afk travel_market travel_forest travel_frozen travel_sanctum create_shop create_listing cancel_listing buy_listing storage_deposit storage_withdraw travel_fishing buy_rod equip_rod start_fishing fishing_input finish_fishing cancel_fishing sell_fish invite_party accept_party reject_party leave_party select_channel travel_sinsi travel_war travel_black arena_join_queue arena_cancel_queue arena_ack_result`.split(" "));
function expectedActionRejection(action, status, failure) {
	if (failure) return failure === "channel_full" && status === 409;
	if (![
		400,
		403,
		404,
		409,
		422
	].includes(status)) return false;
	if (gameplayRejections.has(action)) return true;
	return (action === "equip" || action === "join" || action === "donate") && [400, 404].includes(status);
}
//#endregion
//#region lib/request-failure.mjs
var known = new Set([
	"authentication_required",
	"invalid_credentials",
	"game_instance_expired",
	"realtime_scope_changed",
	"invalid_csrf",
	"invalid_origin",
	"account_suspended",
	"bot_check_required",
	"launch_locked",
	"rate_limited",
	"invalid_json",
	"payload_too_large",
	"unsupported_media_type",
	"channel_full"
]);
function requestFailureReason(error, status) {
	if (known.has(error?.code)) return error.code;
	const message = String(error?.message ?? "");
	if (/SQLITE_BUSY|database is locked/i.test(message)) return "sqlite_busy";
	if (/SQLITE_CONSTRAINT|constraint failed/i.test(message)) return "sqlite_constraint";
	if (/SQLITE_FULL|database or disk is full/i.test(message)) return "storage_full";
	if (/fsync|WAL.*sync|disk I\/O error/i.test(message)) return "storage_sync";
	return status === 401 ? "session" : status === 403 ? "forbidden" : status === 409 ? "scope_or_conflict" : status === 429 ? "rate_limited" : status >= 500 ? "server_error" : status >= 400 ? "client_error" : "ok";
}
function safeFailureReason(reason, status) {
	return known.has(reason) || [
		"sqlite_busy",
		"sqlite_constraint",
		"storage_full",
		"storage_sync",
		"session",
		"forbidden",
		"scope_or_conflict",
		"server_error",
		"client_error",
		"ok"
	].includes(reason) ? reason : requestFailureReason(null, status);
}
//#endregion
//#region lib/progression-materials.mjs
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
Object.freeze(Object.fromEntries(UPGRADE_MATERIAL_KINDS.map((kind) => [kind, Object.freeze({
	chance: 1,
	min: 1,
	max: 1
})])));
function progressionMaterial(kind) {
	return typeof kind === "string" && Object.hasOwn(PROGRESSION_MATERIALS, kind) ? PROGRESSION_MATERIALS[kind] : null;
}
function materialForSource(source) {
	const area = String(source).split(".")[0];
	return UPGRADE_MATERIAL_KINDS.find((kind) => PROGRESSION_MATERIALS[kind].area === area);
}
//#endregion
//#region lib/monster-loot.ts
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
/** These remain the only materials editable in the per-monster loot editor. */
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
/**
* Every value is an absolute per-kill chance in parts per million. These seven
* mutually exclusive buckets add up to the one and only equipment roll.
*/
var FOREST_SIMPLE_LOOT_CHANCES = {
	red_all: 1e4,
	orange_main: 5e4,
	orange_accessory: 3e4,
	blue_main: 15e4,
	blue_accessory: 5e4,
	white_main: 35e4,
	white_accessory: 8e4
};
/** Donmuş Çam uses the North Forest table with a modest 10% increase. */
var FROZEN_SIMPLE_LOOT_CHANCES = {
	red_all: 11e3,
	orange_main: 55e3,
	orange_accessory: 33e3,
	blue_main: 165e3,
	blue_accessory: 55e3,
	white_main: 385e3,
	white_accessory: 88e3
};
/** Kadim Kök's normal monsters retain the 20% equipment gate. Their default
* color distribution is just above Frozen, instead of falling back to the
* legacy regular table that made almost every awarded item white. */
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
/** Convert only the active normal-monster table. Historical kill snapshots keep
* their recorded odds and the boss's three guaranteed rewards stay untouched. */
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
/** White equipment fills the remaining distribution; rare colors never change the gate. */
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
/** One-time interpretation of legacy live tables. Stored revisions are never deleted.
* Initial equipment chance is at most 20%; existing lower/disabled gates survive.
* Old color percentages become conditional percentages, with red capped at 0.6%.
* A saved new-model table carries its own gate and is never converted again. */
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
/** Taş Sanatı Kitabı is configured through global combat settings, not the
* per-monster editor. It is valid only on the three actual boss profiles. */
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
/** Historical kill snapshots may be sparse, but they must still be incapable
* of granting multiple equipment items or losing the guaranteed Essence. */
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
/** Overlay the separately managed material rules once while loading a profile.
* Defeat receipts freeze this same profile, so preview and delivery agree. */
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
//#endregion
//#region lib/equipment-sets.mjs
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
Object.freeze({
	hp: "Can",
	pve: "Canavarlara karşı güç",
	pvp: "Oyunculara karşı güç",
	resistance: "Oyunculara karşı savunma",
	speed: "Saldırı hızı"
,attack:"Saldırı"});
Object.freeze({
	weapon: "Silah",
	armor: "Zırh",
	helmet: "Kask",
	shoes: "Çizme",
	necklace: "Kolye"
});
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

Object.freeze([
	390,
	680,
	520
]);
function effectiveAttackCooldownMs(baseCooldownMs, attackSpeedPercent) {
	const base = Math.max(1, Math.round(Number(baseCooldownMs) || 1));
	const speed = Math.max(0, Math.min(80, Number(attackSpeedPercent) || 0));
	return Math.max(120, Math.round(base / (1 + speed / 100)));
}
//#endregion
//#region lib/combat-stats.ts
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
// Pure item-only derivation. The durable upgrade writer owns the canonical name.
// No cache, polling, sidecar lookup, or mutation of persisted enchantments.
function colEnhancementBonuses491(item) {
 const result={strongPlayers:0,resistantPlayers:0,criticalDamage:0};
 if(typeof item?.item_name!=='string'||!item.item_name.startsWith('+5 '))return result;
 if(item.kind==='weapon')result.strongPlayers=5;
 else if(item.kind==='shoes')result.strongPlayers=3;
 else if(item.kind==='armor')result.resistantPlayers=5;
 else if(item.kind==='necklace')result.resistantPlayers=3;
 else if(item.kind==='helmet')result.criticalDamage=10;
 return result;
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
 const jewelry456=colJewelry456(equipped);
	const weaponPower = equipped.filter((item) => item.kind === "weapon").reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + total("stone_attack") + jewelry456.attack;
	const armorPower = equipped.filter((item) => item.kind !== "weapon" && item.kind !== "earring" && item.kind !== "bracelet").reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + total("stone_defense") + jewelry456.defense;
	const hpBonus = total("hp") + set.hp;
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
		strongPlayers: total("strong_players") + jewelry456.strongPlayers + rank.pvp + set.pvp,
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
function canEquipGear(item, role) {
	return isGearKind(item.kind) && (item.kind === "shoes" || item.kind === "necklace" || item.kind === "earring" || item.kind === "bracelet" || item.role === role);
}
var GEAR_REQUIRED_LEVELS = {
	white: 1,
	blue: 7,
	orange: 20,
	red: 30,
	purple: 60,
	unique: 50,
	infinite: 50
,emerald:65};
function requiredGearLevel(rarity) {
	return typeof rarity === "string" && rarity in GEAR_REQUIRED_LEVELS ? GEAR_REQUIRED_LEVELS[rarity] : 1;
}
function meetsGearLevel(item, level) {
	return Number.isFinite(level) && Number(level) >= requiredGearLevel(item.rarity);
}
//#endregion
//#region lib/enchantment-tiers.mjs
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
var ENCHANT_TIER_DEFAULTS = Object.fromEntries(ENCHANT_TIERS.flatMap(([kind,,values])=>tierKeys(kind).map((key,i)=>[key,values[i]])));
var ENCHANT_TIER_KEYS = Object.keys(ENCHANT_TIER_DEFAULTS);
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
//#endregion
//#region lib/gear-enchantments.ts
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
//#endregion
//#region lib/equipment-set-runtime.mjs
function setHpSql() {
	return globalThis.__colEquipmentSets ? "COALESCE(players.set_hp,0)" : "0";
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
//#endregion
//#region lib/reward-delivery-single-flight.ts
function createRewardDeliverySingleFlight() {
	const owners = /* @__PURE__ */ new WeakMap();
	return function run(owner, death, task) {
		let pending = owners.get(owner);
		if (!pending) {
			pending = /* @__PURE__ */ new Map();
			owners.set(owner, pending);
		}
		const previous = pending.get(death);
		if (previous) return previous;
		const entries = pending;
		const result = Promise.resolve().then(task).finally(() => {
			if (entries.get(death) === result) entries.delete(death);
		});
		entries.set(death, result);
		return result;
	};
}
//#endregion
//#region lib/starter-character-grant.ts
var STARTER_CHARACTER_GRANT_SQL = `INSERT OR IGNORE INTO prereg_rewards(account_id,player_id,granted_at_ms)
  SELECT account_id,id,? FROM players WHERE id=? AND account_id=?`;
//#endregion
//#region lib/delivery-timing.ts
var actionNames = new Set([
	"attack",
	"pvp_attack",
	"heartbeat",
	"move",
	"collect",
	"claim_rewards",
	"join",
	"hurt"
]);
function deliveryAction(value) {
	return typeof value === "string" && actionNames.has(value) ? value : "other";
}
//#endregion
//#region lib/maintenance-single-flight.ts
function createMaintenanceSingleFlight(intervalMs = 1e3, clock = Date.now) {
	const states = /* @__PURE__ */ new WeakMap();
	return function run(owner, task) {
		let state = states.get(owner);
		if (!state) {
			state = {
				running: null,
				nextAt: 0
			};
			states.set(owner, state);
		}
		if (state.running) return state.running;
		if (clock() < state.nextAt) return Promise.resolve();
		const entry = state;
		entry.nextAt = clock() + intervalMs;
		entry.running = Promise.resolve().then(task).catch((error) => {
			entry.nextAt = 0;
			throw error;
		}).finally(() => {
			entry.running = null;
		});
		return entry.running;
	};
}
//#endregion
//#region lib/fishing-event-reward.ts
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
//#endregion
//#region lib/premium-extra-runtime.mjs
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
function premiumHpSql(alias = "players") {
	return extraService() ? `((CASE WHEN ${alias}.ration_until>unixepoch()*1000 THEN 200 ELSE 0 END)+(CASE WHEN ${alias}.pumpkin_enabled499=1 AND ${alias}.pumpkin_until499>CAST(ROUND((julianday('now')-2440587.5)*86400000) AS INTEGER) THEN 1000 ELSE 0 END))` : "0";
}
function premiumXpSql(alias = "p") {
	return `(CASE WHEN ${alias}.halloween_candy_until>unixepoch()*1000 THEN 1.25 ELSE 1 END)*` + `(CASE WHEN ${alias}.arena_exp_until>unixepoch()*1000 THEN 1.2 ELSE 1 END)*`+(extraService() ? `(CASE WHEN ${alias}.pumpkin_enabled499=1 AND ${alias}.pumpkin_until499>CAST(ROUND((julianday('now')-2440587.5)*86400000) AS INTEGER) THEN 1.25 WHEN ${alias}.radiant_enabled=1 AND ${alias}.radiant_until>unixepoch()*1000 THEN 1.2 WHEN EXISTS(SELECT 1 FROM player_items WHERE player_id=${alias}.id AND kind='costume' AND equipped=1) THEN 1.2 ELSE 1 END)` : `(CASE WHEN EXISTS(SELECT 1 FROM player_items WHERE player_id=${alias}.id AND kind='costume' AND equipped=1) THEN 1.2 ELSE 1 END)`);
}
function wisdomSql() {
	return extraService() ? "(CASE WHEN players.wisdom_until>unixepoch()*1000 THEN 1.25 ELSE 1 END)" : "1";
}
Object.freeze([
	{
		level: 1,
		cost: 2e4,
		attack: 10,
		hp: 250,
		xp: 5
	},
	{
		level: 2,
		cost: 4e4,
		attack: 15,
		hp: 350,
		xp: 7
	},
	{
		level: 3,
		cost: 1e5,
		attack: 20,
		hp: 500,
		xp: 15
	}
]);
var EMPTY_GUILD_BUFF = Object.freeze({
	attack: 0,
	hp: 0,
	xp: 0,
	until: 0,
	level: 0
});
//#endregion
//#region lib/guild-skill-runtime.mjs
function guildSkillService() {
	return globalThis.__colGuildSkill;
}
function guildBuff(id) {
	return guildSkillService()?.bonuses(id) ?? EMPTY_GUILD_BUFF;
}
function guildHpSql() {
	return guildSkillService() ? `COALESCE((SELECT CASE s.active_level WHEN 1 THEN 250 WHEN 2 THEN 350 WHEN 3 THEN 500 ELSE 0 END FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=players.id AND s.active_until>unixepoch()*1000),0)` : "0";
}
function guildXpSql(alias = "p") {
	return guildSkillService() ? `(1+COALESCE((SELECT CASE s.active_level WHEN 1 THEN .05 WHEN 2 THEN .07 WHEN 3 THEN .15 ELSE 0 END FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=${alias}.id AND s.active_until>unixepoch()*1000),0))` : "1";
}
var EXTRA_PRODUCTS = {"fishing_guide":{"name":"Balıkçılık Kılavuzu","price":372,"image":"/game/fishing-bait-v374.webp","stock":"fishing_guides","timer":"fishing_guide_until","seconds":3600,"description":"1 saat boyunca her başarılı avın balık, inci, tılsım taşı ve etkinlik ödülü 2 katına çıkar. Çantadan kullanınca başlar; çevrimdışıyken süre ilerler. Bereketli Olta Yemi ile birlikte aktifken normal balık miktarı en fazla 2 kat olur; her başarılı gerçek balık avı 1 yem hakkı tüketir. Görev ilerlemesi değişmez."},"boss_reminder":{"name":"Boss Takip","price":75,"image":"/game/boss-tracker-v480.webp","stock":"boss_reminders","timer":"boss_reminder_until","seconds":604800,"description":"Bossların resimlerini, konumlarını ve yeniden doğma sürelerini gösterir. Satın alınca çantana gelir; çantadan kullandığında 7 günlük süre başlar. Çevrimdışıyken süre azalır."},
	mastery_seal492:{"name":"Ustalık Mührü","price":47,"image":"/game/ustalik-muhru-v492.webp","stock":"mastery_seals492","description":"Haso → Artı Basma’da seçildiğinde bir denemenin mevcut başarı şansını %30 artırır: %20 → %26. En fazla %100. Başarıda veya başarısızlıkta 1 adet tüketilir; artı düşmesini önlemez."},protection_seal: {
		name: "Demircinin Koruma Mührü",
		price: 75,
		image: "/game/protection-seal-v374.webp",
		stock: "protection_seals",
		description: "Sonraki başarısız Taş Sanatı üretiminde her malzemenin yarısını geri verir (küsurat aşağı yuvarlanır). Garantili dönüşümlerde tüketilmez."
	},
	battle_ration: {
		name: "Savaşçının Kumanyası",
		price: 50,
		image: "/game/battle-ration-v374.webp",
		stock: "battle_rations",
		timer: "ration_until",
		seconds: 3600,
		description: "60 dakika +15 saldırı ve +200 can. Ölümde kaybolmaz. Aktifken yeniden kullanılamaz."
	},
	fishing_bait: {
		name: "Bereketli Olta Yemi",
		price: 150,
		image: "/game/fishing-bait-v374.webp",
		stock: "fishing_baits",
		description: "30 başarılı balık avında çift balık. Balıkçılık Kılavuzu ile birleşmez; birlikte etkinse normal balık miktarı en fazla 2 kat olur ve her başarılı gerçek balık avı 1 yem hakkı tüketir. İnci ve Tılsım Taşı çoğalmaz; yem hakkı tüketmez."
	},
	rank_scroll: {
		name: "Kadim Bilgelik Parşömeni",
		price: 100,
		image: "/game/rank-scroll-v374.webp",
		stock: "rank_scrolls",
		timer: "wisdom_until",
		seconds: 7200,
		description: "2 saat %25 ek rütbe tecrübesi. Rütbesi açılmış oyuncular kullanabilir; Savaşçının Yolu görevini atlatmaz."
	},
	xp_costume: {
		name: "Kadim Işığın Giysisi",
		price: 150,
		image: "/game/radiant-costume-icon-v374.webp",
		stock: "radiant_costumes",
		timer: "radiant_until",
		seconds: 7 * 864e5 / 1e3,
		description: "7 gün %20 fazla canavar tecrübesi. Sınıfına özel ışıklı görünüm. Eski giysiyle aynı anda kuşanılmaz."
	},
	essence_charm: {
		name: "Öz Toplayıcı Tılsım",
		price: 150,
		image: "/game/essence-charm-v374.webp",
		stock: "essence_charms",
		timer: "essence_until",
		seconds: 259200,
		description: "3 gün canavarlardan %20 fazla öz. Ticaret, bağış ve sandık ödüllerini artırmaz."
	}
};
[...Object.values(EXTRA_PRODUCTS).map((x) => x.stock), ...Object.values(EXTRA_PRODUCTS).map((x) => x.timer).filter(Boolean)];
//#endregion
//#region lib/premium-catalog.mjs
var PREMIUM_ITEMS = {trade_glass499:{"name":"Ticaret Camı","price":100,"image":"/game/trade-glass499.webp","shopOnly499":true},pumpkin_knight499:{"name":"Bal Kabağı Şövalyesi Seti","price":250,"shopOnly499":true,"image":"/game/pumpkin-knight-icon499.webp","description":"7 günlük zırh ve sınıfa uygun silah görünümü. Toplam +1000 Can, +20 saldırı, canavarlara karşı %10 güç ve %25 canavar tecrübesi. Süre satın alınca başlar; çevrimdışıyken de ilerler. Çantadan kuşanılır."},"cp_coupon_100":{"name":"100 ÇP Kuponu","price":110,"faceValue":100,"image":"/game/cp-coupon-100-v483.svg"},"cp_coupon_200":{"name":"200 ÇP Kuponu","price":220,"faceValue":200,"image":"/game/cp-coupon-200-v483.svg"},"cp_coupon_500":{"name":"500 ÇP Kuponu","price":550,"faceValue":500,"image":"/game/cp-coupon-500-v483.svg"},
	...EXTRA_PRODUCTS,
	afk_ticket: {
		name: "Oto Av +2 Saat",
		price: 200,
		image: "/game/afk-ticket-v350.webp"
	},
	enchant_add: {
		name: "Efsun Artırma Nesnesi",
		price: 35,
		image: "/game/enchant-add-v262.webp"
	},
	wings: {
		name: "Kızıl Çekirdek Kanatları",
		price: 500
	},
	xp_ring: {
		name: "Tecrübe Yüzüğü",
		price: 150
	},
	drop_charm: {
		name: "Ganimet Tılsımı",
		price: 150
	},
	item_link: {
		name: "Eşya Yansıtma",
		price: 1,
		image: "/game/item-reflection-v250.webp"
	},
	enchant_scroll: {
		name: "Efsun Değiştirme Parşömeni",
		price: 25,
		image: "/game/enchant-change.webp"
	},
	auto_potion: {
		name: "Oto Kırmızı İksir",
		price: 100,
		image: "/game/auto-red-potion.webp"
	},
	costume: {
		name: "Sınıf Giysisi",
		price: 200
	},
	stall_skin: {
		name: "Zümrüt Pazar Tezgâhı",
		price: 75,
		image: "/game/premium-stall.webp"
	},
	teleport_skin: {
		name: "Zümrüt Geçidi",
		price: 75,
		image: "/game/teleport-seal-v250.webp"
	},
	weapon_skin: {
		name: "Zümrüt Hükümran Silahı",
		price: 150,
		image: "/game/premium-weapons.webp"
	},
	storage_page: {
		name: "Ek Depo Sayfası",
		price: 100
	},
	rename_scroll: {
		name: "İsim Değiştirme",
		price: 50,
		image: "/game/rename-scroll-v250.webp"
	}
};
//#endregion
//#region lib/dragon-gear-names.mjs
var DRAGON_GEAR_NAMES = {
	"muhafiz": {
		"weapon": {
			"white": "Kül Çeliği",
			"blue": "Safir Nöbet",
			"orange": "Güneş Yaran",
			"red": "Kızıl Kıyamet",
			"purple": "Mor Kök Kılıcı",
			"sinsi": "Sinsi Kaya Kılıcı"
		},
		"armor": {
			"white": "Demir Nöbet Zırhı",
			"blue": "Safir Muhafız Zırhı",
			"orange": "Kor Tahtı Zırhı",
			"red": "Kan Tahtı Zırhı",
			"purple": "Mor Kök Zırhı",
			"sinsi": "Sinsi Taş Zırhı"
		},
		"helmet": {
			"white": "Demir Nöbet Miğferi",
			"blue": "Safir Nöbet Miğferi",
			"orange": "Kor Tahtı Miğferi",
			"red": "Kan Tahtı Miğferi",
			"purple": "Mor Kök Miğferi"
		},
		"shoes": {
			"white": "Kül Muhafız Çizmeleri",
			"blue": "Safir Muhafız Çizmeleri",
			"orange": "Kor Muhafız Çizmeleri",
			"red": "Kızıl Muhafız Çizmeleri",
			"purple": "Mor Kök Çizmeleri"
		},
		"necklace": {
			"white": "Kül Muhafız Kolyesi",
			"blue": "Safir Muhafız Kolyesi",
			"orange": "Kor Muhafız Kolyesi",
			"red": "Kızıl Muhafız Kolyesi",
			"purple": "Mor Kök Kolyesi"
		}
	},
	"avci": {
		"weapon": {
			"white": "Sis Kirişli Yay",
			"blue": "Ayaz Dişi Yayı",
			"orange": "Kor Anka Yayı",
			"red": "Kızıl Ejder Yayı",
			"purple": "Alacakaranlık Yayı",
			"sinsi": "Sinsi Kaya Yayı"
		},
		"armor": {
			"white": "Sınır Derisi",
			"blue": "Mavi Gölge Postu",
			"orange": "Anka Avcı Zırhı",
			"red": "Alev Avcısı Zırhı",
			"purple": "Alacakaranlık Zırhı",
			"sinsi": "Sinsi İzci Zırhı"
		},
		"helmet": {
			"white": "Sınır Avcı Başlığı",
			"blue": "Mavi Gölge Başlığı",
			"orange": "Anka Avcı Başlığı",
			"red": "Alev Avcısı Başlığı",
			"purple": "Alacakaranlık Başlığı"
		},
		"shoes": {
			"white": "Kül Avcı Çizmeleri",
			"blue": "Safir Avcı Çizmeleri",
			"orange": "Kor Avcı Çizmeleri",
			"red": "Kızıl Avcı Çizmeleri",
			"purple": "Alacakaranlık Çizmeleri"
		},
		"necklace": {
			"white": "Kül Avcı Kolyesi",
			"blue": "Safir Avcı Kolyesi",
			"orange": "Kor Avcı Kolyesi",
			"red": "Kızıl Avcı Kolyesi",
			"purple": "Alacakaranlık Kolyesi"
		}
	},
	"arkanist": {
		"weapon": {
			"white": "Kül Asası",
			"blue": "Rün Çağrısı",
			"orange": "Yıldız Kıran",
			"red": "Kızıl Hiçlik",
			"purple": "Kadim Menekşe Asası",
			"sinsi": "Sinsi Kaya Asası"
		},
		"armor": {
			"white": "Soluk Cübbe",
			"blue": "Safir Rün Cübbesi",
			"orange": "Güneş Dokuması",
			"red": "Kan Rünü Cübbesi",
			"purple": "Kadim Menekşe Cübbesi",
			"sinsi": "Sinsi Rün Cübbesi"
		},
		"helmet": {
			"white": "Soluk Rün Tacı",
			"blue": "Safir Rün Tacı",
			"orange": "Güneş Tacı",
			"red": "Kan Rünü Tacı",
			"purple": "Kadim Menekşe Tacı"
		},
		"shoes": {
			"white": "Kül Rün Çizmeleri",
			"blue": "Safir Rün Çizmeleri",
			"orange": "Kor Rün Çizmeleri",
			"red": "Kızıl Rün Çizmeleri",
			"purple": "Kadim Menekşe Çizmeleri"
		},
		"necklace": {
			"white": "Kül Rün Kolyesi",
			"blue": "Safir Rün Kolyesi",
			"orange": "Kor Rün Kolyesi",
			"red": "Kızıl Rün Kolyesi",
			"purple": "Kadim Menekşe Kolyesi"
		}
	}
};
//#endregion
//#region lib/ranks.mjs
var RANK_REWARDS = [
	{
		id: "hunter_weapon",
		name: "Öz Avcısı silah görünümü",
		slot: "weapon",
		bonuses: {
			hp: 100,
			defense: 0,
			pve: 3,
			pvp: 0
		}
	},
	{
		id: "fedai_cape",
		name: "Fedai pelerini",
		slot: "cape",
		bonuses: {
			hp: 150,
			defense: 0,
			pve: 4,
			pvp: 0
		}
	},
	{
		id: "guardian_companion",
		name: "Çekirdek yoldaşı görünümü",
		slot: "companion",
		bonuses: {
			hp: 200,
			defense: 0,
			pve: 5,
			pvp: 0
		}
	},
	{
		id: "executioner_weapon",
		name: "Cellat silah görünümü",
		slot: "weapon",
		bonuses: {
			hp: 250,
			defense: 0,
			pve: 6,
			pvp: 0
		}
	},
	{
		id: "sovereign_wings",
		name: "Hükümdar kanatları",
		slot: "wings",
		bonuses: {
			hp: 300,
			defense: 0,
			pve: 7,
			pvp: 0
		}
	},
	{
		id: "legend_costume",
		name: "Efsane kostümü ve profil çerçevesi",
		slot: "costume",
		bonuses: {
			hp: 400,
			defense: 0,
			pve: 8,
			pvp: 0
		}
	}
];
var EMPTY_RANK_BONUSES = Object.freeze({
	hp: 0,
	defense: 0,
	pve: 0,
	pvp: 0
});
function rankRewardHpSql() {
	return `(CASE WHEN players.level>=65 AND players.rank_tier>0 THEN ${RANK_REWARDS.map((r) => `CASE WHEN json_extract(players.rank_cosmetics,'$.${r.slot}')='${r.id}' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='${r.id}') THEN ${r.bonuses.hp} ELSE 0 END`).join("+")} ELSE 0 END)`;
}
var DRAGON_WORLD = Object.freeze({
	width: 3e3,
	height: 1875
});
Object.freeze({
	x: 1500,
	y: 900
});
var DRAGON_ENTRY = Object.freeze({
	x: 1500,
	y: 1510
});
var roles$1 = {
	muhafiz: "Muhafız",
	avci: "Avcı",
	arkanist: "Arkanist"
}, kinds = {
	weapon: "Silah",
	armor: "Zırh",
	helmet: "Kask",
	shoes: "Çizme",
	necklace: "Kolye"
}, rarities = {
	white: "Beyaz",
	blue: "Mavi",
	orange: "Turuncu",
	red: "Kırmızı",
	purple: "Mor Kök",
	unique: "Eşsiz",
	infinite: "Sonsuz"
};
var DRAGON_CATALOG = [
	...Object.entries(roles$1).flatMap(([role, label]) => Object.entries(kinds).flatMap(([kind, name]) => Object.entries(rarities).map(([rarity, color]) => ({
		id: `gear:${role}:${kind}:${rarity}`,
		name: DRAGON_GEAR_NAMES[role][kind][rarity] ?? `${color} ${label} ${name}`,
		type: "gear",
		kind,
		role,
		rarity,
		group: "Ekipman"
	})))),
	...Object.entries(roles$1).flatMap(([role]) => ["weapon", "armor"].flatMap((kind) => [
		"white",
		"blue",
		"orange",
		"red"
	].map((rarity) => ({
		id: `gear:sinsi:${role}:${kind}:${rarity}`,
		name: `${rarities[rarity]} ${DRAGON_GEAR_NAMES[role][kind].sinsi}`,
		type: "gear",
		family: "sinsi",
		kind,
		role,
		rarity,
		group: "Sinsi Ekipman"
	})))),
	...Object.entries({
		essence: "Yaşam Özü",
		gems: "Mücevher",
		potions: "Kırmızı İksir",
		pearls: "Beyaz İnci",
		stone_dust: "Taş Tozu",
		fish_sokan: "Sokan Balığı",
		fish_levrek: "Levrek",
		fish_zargana: "Zargana",
		fifth_enchant_scrolls: "Beşinci Efsun Nesnesi"
	}).map(([column, name]) => ({
		id: `resource:${column}`,
		name,
		type: "resource",
		column,
		group: "Malzemeler"
	})),
	...Object.entries({
		wing: "Kanat Parçası",
		infinite: "Sonsuz Taşı Parçası",
		pet: "Ejderha Parçası"
	}).map(([kind, name]) => ({
		id: `material:${kind}`,
		name,
		type: "material",
		kind,
		group: "Zindan"
	})),
	...Object.entries({
		critical: ["Kritik Şansı Taşı", [
			7,
			8,
			9,
			10
		]],
		attack: ["Saldırı Gücü Taşı", [
			20,
			25,
			30
		]],
		defense: ["Savunma Taşı", [
			30,
			40,
			50
		]],
		block: ["Bloklama Taşı", [
			6,
			7,
			8
		]]
	}).flatMap(([kind, [name, values]]) => values.map((value) => ({
		id: `stone:${kind}:${value}`,
		name: `${name} +${value}`,
		type: "stone",
		kind: `${kind}:${value}`,
		group: "Taşlar"
	}))),
	...Object.entries({
		book: "Taş Sanatı Kitabı",
		evolution_scroll: "Evrim Parşömeni"
	}).map(([kind, name]) => ({
		id: `stone:${kind}`,
		name,
		type: "stone",
		kind,
		group: "Malzemeler"
	})),
	{
		id: "special:starter_chest",
		name: "Başlangıç Sandığı",
		type: "special",
		kind: "starter_chest",
		group: "Sandıklar"
	},
	...["crystal_chest", "moonlight_chest"].map((kind, i) => ({
		id: `stone:${kind}`,
		name: ["Kristal Sandığı", "Ayışığı Sandığı"][i],
		type: "stone",
		kind,
		group: "Sandıklar"
	})),
	...Object.entries(PREMIUM_ITEMS).filter(([,item])=>!item.shopOnly499).map(([kind, item]) => ({
		id: `premium:${kind}`,
		name: item.name,
		type: "premium",
		kind,
		group: "Nesne Market"
	})),
	...Object.entries({
		bird: "Kuş Peti",
		monkey: "Maymun Peti",
		dog: "Köpek Peti",
		dragon: "Ejderha Peti",
		starter: "Başlangıç Tilkisi"
	}).map(([kind, name]) => ({
		id: `pet:${kind}`,
		name,
		type: "pet",
		kind,
		group: "Petler"
	})),
	{
		id: "special:rod",
		name: "Olta",
		type: "special",
		kind: "rod",
		group: "Diğer"
	},
	{
		id: "special:core_wings",
		name: "Çekirdek Kanatları · Kalıcı",
		type: "special",
		kind: "core_wings",
		group: "Zindan"
	},
	...RANK_REWARDS.map((r) => ({
		id: `rank:${r.id}`,
		name: r.name,
		type: "rank",
		kind: r.id,
		group: "Rütbe Görünümleri"
	}))
,{"id":"material:halloween_pumpkin","name":"Bal Kabağı","type":"material","kind":"halloween_pumpkin","group":"Cadılar Bayramı"},{"id":"material:witch_wand","name":"Cadının Sihirli Değneği","type":"material","kind":"witch_wand","group":"Cadılar Bayramı"},{"id":"material:halloween_candy","name":"Cadı Şekeri","type":"material","kind":"halloween_candy","group":"Cadılar Bayramı"},...EMERALD_CATALOG444];
new Map(DRAGON_CATALOG.map((i) => [i.id, i]));
//#endregion
//#region lib/dragon-runtime.ts
function dragonService() {
	return globalThis.__colDragonBoss ?? null;
}
//#endregion
//#region lib/rank-runtime.ts
function rankService() {
	return globalThis.__colRanks;
}
function serverRankBonuses(id) {
	return rankService()?.bonuses(id) ?? EMPTY_RANK_BONUSES;
}
function withRankPlayers(rows, ownerId) {
	const ranked = rankService()?.project(rows, ownerId) ?? rows;
	const guilded = guildSkillService()?.project(ranked) ?? ranked;
	return globalThis.__colPremium?.project(guilded, ownerId) ?? guilded;
}
function rankHpSql() {
	return rankService() ? `(${rankRewardHpSql()}+COALESCE((SELECT SUM(CAST(json_extract(value,'$.hp') AS INTEGER)) FROM json_each((SELECT config_json FROM rank_settings WHERE id=1),'$.tiers') WHERE CAST(key AS INTEGER)<players.rank_tier AND players.level>=65),0))` : "0";
}
//#endregion
//#region lib/expansion65.mjs
var ANCIENT_WORLD = Object.freeze({
	width: 3600,
	height: 3600
});
var ANCIENT_SPAWN = Object.freeze({
	x: 1740,
	y: 2940
});
var ANCIENT_FAMILIES = Object.freeze([
	{
		family: "golge",
		name: "Kızıl Pençe",
		hp: 4e3,
		damage: 80,
		xp: 400
	},
	{
		family: "curuk",
		name: "Kök Muhafızı",
		hp: 7e3,
		damage: 110,
		xp: 600
	},
	{
		family: "yutan",
		name: "Kül Kâhini",
		hp: 1e4,
		damage: 150,
		xp: 800
	}
]);
function expansion65Available(settings, player) {
	return Number(settings?.expansion65_enabled) === 1 || !!(player?.id && Number(player.is_gm) === 1 && player.id === settings?.expansion65_preview_player_id);
}
function canEnterAncient(settings, player) {
	return expansion65Available(settings, player) && Number(player?.level) >= 50;
}
[
	[560, 510],
	[1070, 640],
	[1630, 470],
	[2210, 600],
	[2790, 490],
	[3180, 840],
	[700, 1130],
	[1360, 1030],
	[1910, 1160],
	[2540, 1040],
	[3080, 1310],
	[480, 1650],
	[990, 1510],
	[1490, 1480],
	[2220, 1580],
	[2800, 1740],
	[3220, 1950],
	[630, 2140],
	[1140, 1980],
	[1570, 2240],
	[2370, 2130],
	[2920, 2320],
	[480, 2700],
	[1050, 2610],
	[1430, 2820],
	[2320, 2750],
	[2990, 2910]
].map(([x, y], index) => ({
	...ANCIENT_FAMILIES[(index + Math.floor(index / 9)) % 3],
	x,
	y,
	slot: index + 1
}));
function levelCapSql(alias = "players") {
	if (!/^[a-z_]+$/.test(alias)) throw new Error("Invalid SQL alias");
	return `(CASE WHEN (SELECT expansion65_enabled FROM game_settings WHERE id=1)=1 OR (${alias}.is_gm=1 AND ${alias}.id=(SELECT expansion65_preview_player_id FROM game_settings WHERE id=1)) THEN 65 ELSE 50 END)`;
}
Object.freeze({
	pearls: 20,
	gems: 1e4,
	essence: 2e3
});
var GUILD_VILLAGE_WORLD = Object.freeze({
	width: 3600,
	height: 2400
});
var GUILD_HALL_WORLD = Object.freeze({
	width: 2400,
	height: 1600
});
Object.freeze({
	x: 1800,
	y: 1320
});
Object.freeze({
	x: 1200,
	y: 1260
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
Object.freeze([
	{
		level: 1,
		name: "Sancaklı Avlu",
		essence: 1e3,
		description: "Şato tabelasında lonca sancağı ve avlu unvanı."
	},
	{
		level: 2,
		name: "Altın Taht",
		essence: 2500,
		description: "Salon ve şato tabelasında altın çerçeve ve taç."
	},
	{
		level: 3,
		name: "Kadim Şato",
		essence: 5e3,
		description: "Salon ve şato tabelasında kadim mühür ve zafer süslemesi."
	}
]);
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
//#endregion
//#region lib/afk-island.mjs
var AFK_WORLD = Object.freeze({
	width: 5400,
	height: 3600
});
var AFK_SPAWN = Object.freeze({
	x: 1180,
	y: 2340
});
var AFK_FREE_MS = 7200 * 1e3;
var AFK_FAMILIES = Object.freeze([
	{
		family: "golge",
		name: "Yosun Boynuz",
		hp: 460,
		damage: 8
	},
	{
		family: "curuk",
		name: "Kristal Kabuk",
		hp: 650,
		damage: 12
	},
	{
		family: "yutan",
		name: "Yaprak Ruhu",
		hp: 540,
		damage: 10
	}
]);
Object.freeze([
	[1440, 2410],
	[1930, 2510],
	[2490, 2390],
	[3040, 2560],
	[3590, 2390],
	[4130, 2500],
	[1600, 2100],
	[2160, 2220],
	[2700, 2070],
	[3250, 2190],
	[3800, 2040],
	[4230, 2130],
	[1410, 1750],
	[1970, 1870],
	[2520, 1720],
	[3090, 1830],
	[3640, 1710],
	[4120, 1850],
	[1580, 1430],
	[2120, 1530],
	[2660, 1370],
	[3220, 1510],
	[3770, 1360],
	[4210, 1490],
	[1450, 1100],
	[1980, 1180],
	[2540, 1050],
	[3070, 1190],
	[3630, 1030],
	[4140, 1160]
].map(([x, y], index) => ({
	slot: index + 1,
	x,
	y,
	...AFK_FAMILIES[index % 3]
})));
function afkDay(nowMs) {
	return Math.floor((nowMs + 3 * 36e5) / 864e5);
}
function afkRemaining(state, nowMs) {
	if (!state || state.day !== afkDay(nowMs)) return AFK_FREE_MS;
	const elapsed = state.active ? Math.min(15e3, Math.max(0, nowMs - state.tick_at_ms)) : 0;
	return Math.max(0, AFK_FREE_MS + state.bonus_ms - state.used_ms - elapsed);
}
//#endregion
//#region realtime-server/src/forest-core.mjs
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
Object.freeze({
	x: 1800,
	y: 1800
});
var ANCIENT_BOSS_SPAWN = Object.freeze({
	x: 1800,
	y: 1650
});
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
//#endregion
//#region lib/frozen-water-position.mjs
var FROZEN_WATER_SPAWN = Object.freeze({
	x: 4095,
	y: 1110
});
Object.freeze({
	x: 4095,
	y: 847.5
});
//#endregion
//#region lib/world-layout.ts
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
var FOREST_CORE = {
	x: 2700,
	y: 1687.5
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
var FROZEN_BOSS_SPAWN = {
	x: 2400,
	y: 1500
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
function areaWorld(area) {if(area==='event')return EVENT_WORLD444;
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
function isAreaWalkablePosition(area, x, y) {if(area==='event')return eventWalkable444(x,y);
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
function isAreaWalkableSegment(area, fromX, fromY, toX, toY) {if(area==='event')return eventSegment444(fromX,fromY,toX,toY);
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
//#endregion
//#region lib/expansion65-access.ts
async function repairAncientAccess(database, playerId) {
 const needsRepair = await database.prepare(`SELECT id FROM players WHERE id=? AND area='ancient' AND (level<50 OR NOT EXISTS(SELECT 1 FROM game_settings s WHERE s.id=1 AND
 (s.expansion65_enabled=1 OR (players.is_gm=1 AND players.id=s.expansion65_preview_player_id))))`).bind(playerId).first();
 if (!needsRepair) return null;

	return database.prepare(`UPDATE players SET area='bazaar',arena_match_id='',x=?,y=?,
 movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,
 position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0
 WHERE id=? AND area='ancient' AND (level<50 OR NOT EXISTS(SELECT 1 FROM game_settings s WHERE s.id=1 AND
 (s.expansion65_enabled=1 OR (players.is_gm=1 AND players.id=s.expansion65_preview_player_id)))) RETURNING id`).bind(BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, Date.now(), playerId).first();
}
//#endregion
//#region vds-server/src/sqlite-backup.mjs
var backupInOneStep = (sqlite, destination) => backup(sqlite, destination, { rate: -1 });
//#endregion
//#region vds-server/src/host-resources.mjs
var maxDepth = 16, configurationMs = 6e4, maxCpuCount = 65536, maxInteger = Number.MAX_SAFE_INTEGER;
var integer = (value) => /^\d{1,16}$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
var rounded = (value) => Number.isFinite(value) && value >= 0 && value <= maxInteger ? Math.min(maxInteger, Math.round(value * 1e3) / 1e3) : null;
var safeCount = (value) => Number.isInteger(value) && value > 0 && value <= maxCpuCount ? value : null;
var empty$1 = () => ({
	protocol: "native-host-capacity-v1",
	sampledAtMs: null,
	logicalCpuCount: null,
	availableCpuCount: null,
	cpuCapacityCeilingCores: null,
	cgroup: {
		scope: "visible-ancestors-only",
		status: "unavailable",
		limitsSampledAtMs: null,
		cpuQuotaStatus: "unavailable",
		cpuQuotaCores: null,
		memoryMaxStatus: "unavailable",
		memoryMaxMb: null,
		memoryCurrentMb: null,
		cpu: {
			scope: null,
			intervalMs: null,
			usedCores: null,
			periods: null,
			throttledPeriods: null,
			throttledMs: null,
			throttledPeriodsPercent: null,
			pressureSomeAvg10Percent: null,
			pressureFullAvg10Percent: null
		},
		memoryPressure: {
			scope: "current-cgroup",
			someAvg10Percent: null,
			fullAvg10Percent: null
		}
	},
	host: {
		scope: "host-wide-not-process",
		intervalMs: null,
		stealPercent: null
	}
});
async function readKernelText(file, maxBytes, prefix = false) {
	let handle;
	try {
		handle = await open(file, "r");
		const buffer = Buffer.alloc(maxBytes + 1);
		let offset = 0;
		while (offset < buffer.length) {
			const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, null);
			if (!bytesRead) break;
			offset += bytesRead;
			if (prefix) break;
		}
		if (offset > maxBytes && !prefix) return null;
		return buffer.subarray(0, Math.min(offset, maxBytes)).toString("utf8");
	} catch (error) {
		return error?.code === "ENOENT" ? void 0 : null;
	} finally {
		if (handle) await handle.close().catch(() => {});
	}
}
var cleanPath = (value) => typeof value === "string" && value.startsWith("/") && !value.includes("\0") && posix.normalize(value) === value ? value : null;
var decodePath = (value) => value.replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
function membership(cgroup, mountinfo) {
	if (typeof cgroup !== "string" || typeof mountinfo !== "string") return null;
	const path = cleanPath(cgroup.split("\n").find((line) => line.startsWith("0::"))?.slice(3));
	if (!path) return null;
	for (const line of mountinfo.split("\n")) {
		const [left, right] = line.split(" - ");
		if (!right?.startsWith("cgroup2 ")) continue;
		const fields = left.split(" "), root = cleanPath(decodePath(fields[3] || "")), mount = cleanPath(decodePath(fields[4] || ""));
		if (!root || !mount || mount !== "/sys/fs/cgroup" && !mount.startsWith("/sys/fs/cgroup/")) continue;
		if (root !== "/" && path !== root && !path.startsWith(`${root}/`)) continue;
		const relative = root === "/" ? path : path.slice(root.length), current = posix.join(mount, relative);
		if (current !== mount && !current.startsWith(`${mount}/`)) continue;
		const paths = [];
		let ancestor = current;
		while (paths.length < maxDepth) {
			paths.push(ancestor);
			if (ancestor === mount) break;
			ancestor = posix.dirname(ancestor);
		}
		return {
			current,
			paths,
			complete: paths.at(-1) === mount,
			identity: `${root}\0${mount}\0${path}`
		};
	}
	return null;
}
function cpuLimit(text) {
	if (text === void 0) return {
		valid: true,
		cores: null
	};
	if (typeof text !== "string") return {
		valid: false,
		cores: null
	};
	const match = /^(max|\d+)\s+(\d+)\s*$/.exec(text), period = integer(match?.[2]);
	if (!match || period === null || period === 0) return {
		valid: false,
		cores: null
	};
	if (match[1] === "max") return {
		valid: true,
		cores: null
	};
	const quota = integer(match[1]), cores = quota === null ? null : quota / period;
	return {
		valid: cores !== null && cores > 0 && cores <= maxCpuCount,
		cores
	};
}
function memoryLimit(text) {
	if (text === void 0 || text?.trim() === "max") return {
		valid: true,
		bytes: null
	};
	const bytes = typeof text === "string" ? integer(text.trim()) : null;
	return {
		valid: bytes !== null,
		bytes
	};
}
function counters$1(text) {
	if (typeof text !== "string") return null;
	const result = {};
	for (const line of text.trim().split("\n")) {
		const [name, value, ...extra] = line.trim().split(/\s+/);
		if ([
			"usage_usec",
			"nr_periods",
			"nr_throttled",
			"throttled_usec"
		].includes(name) && extra.length === 0) result[name] = integer(value);
	}
	return Object.values(result).some((value) => value !== null) ? result : null;
}
function pressure(text) {
	const result = {
		some: null,
		full: null
	};
	if (typeof text !== "string") return result;
	for (const name of ["some", "full"]) {
		const value = new RegExp(`^${name} avg10=(\\d+(?:\\.\\d+)?)\\s`, "m").exec(text)?.[1];
		const number = value === void 0 ? null : Number(value);
		if (number !== null && Number.isFinite(number) && number >= 0 && number <= 100) result[name] = rounded(number);
	}
	return result;
}
function hostCpu(text) {
	if (typeof text !== "string") return null;
	const values = /^cpu\s+([^\n]+)\n?/.exec(text)?.[1]?.trim().split(/\s+/).slice(0, 8).map(integer);
	return values?.length === 8 && values.every((value) => value !== null) ? values : null;
}
function difference(current, previous) {
	return current !== null && previous !== null && current !== void 0 && previous !== void 0 && current >= previous ? current - previous : null;
}
function createHostResourceSampler({ readText = readKernelText, platform = process.platform, logicalCpuCount = () => cpus().length, availableCpuCount = availableParallelism, now = Date.now, monotonic = () => performance$1.now() } = {}) {
	let latest = empty$1(), pending = null, previousCpu = null, previousHost = null, configuration = null;
	const read = async (path, limit = 4096, prefix = false) => {
		try {
			return await readText(path, limit, prefix);
		} catch {
			return null;
		}
	};
	async function collect() {
		const next = empty$1(), started = monotonic();
		const refreshCounts = !configuration || started - configuration.at >= configurationMs;
		next.logicalCpuCount = latest.logicalCpuCount;
		next.availableCpuCount = latest.availableCpuCount;
		if (refreshCounts) {
			try {
				next.logicalCpuCount = safeCount(logicalCpuCount());
			} catch {
				next.logicalCpuCount = null;
			}
			try {
				next.availableCpuCount = safeCount(availableCpuCount());
			} catch {
				next.availableCpuCount = null;
			}
		}
		next.cpuCapacityCeilingCores = next.availableCpuCount ?? next.logicalCpuCount;
		if (platform === "linux") {
			const [groupText, statText] = await Promise.all([read("/proc/self/cgroup"), read("/proc/stat", 4096, true)]);
			const stat = hostCpu(statText), hostAt = monotonic();
			if (stat && previousHost && hostAt > previousHost.at) {
				const deltas = stat.map((value, index) => difference(value, previousHost.values[index]));
				const total = deltas.every((value) => value !== null) ? deltas.reduce((sum, value) => sum + value, 0) : 0;
				if (Number.isSafeInteger(total) && total > 0) {
					next.host.intervalMs = rounded(hostAt - previousHost.at);
					next.host.stealPercent = rounded(100 * deltas[7] / total);
				}
			}
			previousHost = stat ? {
				at: hostAt,
				values: stat
			} : null;
			if (!configuration || groupText !== configuration.groupText || started - configuration.at >= configurationMs) {
				if (!refreshCounts) {
					try {
						next.logicalCpuCount = safeCount(logicalCpuCount());
					} catch {
						next.logicalCpuCount = null;
					}
					try {
						next.availableCpuCount = safeCount(availableCpuCount());
					} catch {
						next.availableCpuCount = null;
					}
					next.cpuCapacityCeilingCores = next.availableCpuCount ?? next.logicalCpuCount;
				}
				const group = membership(groupText, await read("/proc/self/mountinfo", 65536));
				configuration = {
					at: started,
					groupText,
					group,
					limitsSampledAtMs: rounded(now()),
					cpuComplete: group?.complete ?? false,
					memoryComplete: group?.complete ?? false,
					quota: null,
					maxMemory: null,
					cpuPath: group?.current
				};
				let cpuObserved = false, memoryObserved = false;
				for (const path of group?.paths ?? []) {
					const [cpuText, memoryText] = await Promise.all([read(`${path}/cpu.max`), read(`${path}/memory.max`)]);
					const cpu = cpuLimit(cpuText), memory = memoryLimit(memoryText);
					configuration.cpuComplete &&= cpu.valid;
					configuration.memoryComplete &&= memory.valid;
					cpuObserved ||= typeof cpuText === "string" && cpu.valid;
					memoryObserved ||= typeof memoryText === "string" && memory.valid;
					if (cpu.valid && cpu.cores !== null && (configuration.quota === null || cpu.cores <= configuration.quota)) {
						configuration.quota = cpu.cores;
						configuration.cpuPath = path;
					}
					if (memory.valid && memory.bytes !== null && (configuration.maxMemory === null || memory.bytes < configuration.maxMemory)) configuration.maxMemory = memory.bytes;
				}
				configuration.cpuComplete &&= cpuObserved;
				configuration.memoryComplete &&= memoryObserved;
			}
			const { group, cpuComplete, memoryComplete, quota, maxMemory, cpuPath } = configuration;
			if (group) {
				next.cgroup.status = cpuComplete && memoryComplete ? "ready" : "partial";
				next.cgroup.limitsSampledAtMs = configuration.limitsSampledAtMs;
				next.cgroup.cpuQuotaStatus = cpuComplete ? quota === null ? "unlimited" : "finite" : "unavailable";
				next.cgroup.cpuQuotaCores = quota === null ? null : rounded(quota);
				next.cgroup.memoryMaxStatus = memoryComplete ? maxMemory === null ? "unlimited" : "finite" : "unavailable";
				next.cgroup.memoryMaxMb = maxMemory === null ? null : rounded(maxMemory / 1048576);
				if (quota !== null) next.cpuCapacityCeilingCores = rounded(Math.min(next.cpuCapacityCeilingCores ?? quota, quota));
				const [cpuText, cpuPressureText, memoryText, memoryPressureText] = await Promise.all([
					read(`${cpuPath}/cpu.stat`),
					read(`${cpuPath}/cpu.pressure`),
					read(`${group.current}/memory.current`),
					read(`${group.current}/memory.pressure`)
				]);
				const cpu = counters$1(cpuText), cpuAt = monotonic(), cpuPressure = pressure(cpuPressureText), memoryPressure = pressure(memoryPressureText);
				const cpuIdentity = `${group.identity}\0${cpuPath}`;
				next.cgroup.cpu.scope = cpuPath === group.current ? "current-cgroup" : "quota-ancestor-including-siblings";
				next.cgroup.cpu.pressureSomeAvg10Percent = cpuPressure.some;
				next.cgroup.cpu.pressureFullAvg10Percent = cpuPressure.full;
				const memoryCurrent = typeof memoryText === "string" ? integer(memoryText.trim()) : null;
				next.cgroup.memoryCurrentMb = memoryCurrent === null ? null : rounded(memoryCurrent / 1048576);
				next.cgroup.memoryPressure.someAvg10Percent = memoryPressure.some;
				next.cgroup.memoryPressure.fullAvg10Percent = memoryPressure.full;
				if (cpu && previousCpu?.identity === cpuIdentity && cpuAt > previousCpu.at) {
					const elapsed = cpuAt - previousCpu.at, used = difference(cpu.usage_usec, previousCpu.values.usage_usec), periods = difference(cpu.nr_periods, previousCpu.values.nr_periods), throttled = difference(cpu.nr_throttled, previousCpu.values.nr_throttled), throttledUs = difference(cpu.throttled_usec, previousCpu.values.throttled_usec);
					if (!Object.keys(cpu).some((name) => cpu[name] !== null && previousCpu.values[name] !== null && cpu[name] < previousCpu.values[name])) {
						next.cgroup.cpu.intervalMs = rounded(elapsed);
						next.cgroup.cpu.usedCores = used === null ? null : rounded(used / (elapsed * 1e3));
						next.cgroup.cpu.periods = periods;
						next.cgroup.cpu.throttledPeriods = throttled;
						next.cgroup.cpu.throttledMs = throttledUs === null ? null : rounded(throttledUs / 1e3);
						if (periods > 0 && throttled !== null && throttled <= periods) next.cgroup.cpu.throttledPeriodsPercent = rounded(100 * throttled / periods);
					}
				}
				previousCpu = cpu ? {
					identity: cpuIdentity,
					at: cpuAt,
					values: cpu
				} : null;
			} else previousCpu = null;
		} else {
			previousCpu = null;
			previousHost = null;
		}
		next.sampledAtMs = rounded(now());
		latest = next;
	}
	return {
		sample() {
			if (!pending) pending = collect().catch(() => {
				previousCpu = null;
				previousHost = null;
			}).finally(() => {
				pending = null;
			});
			return pending;
		},
		snapshot() {
			return {
				...latest,
				cgroup: {
					...latest.cgroup,
					cpu: { ...latest.cgroup.cpu },
					memoryPressure: { ...latest.cgroup.memoryPressure }
				},
				host: { ...latest.host }
			};
		}
	};
}
//#endregion
//#region vds-server/src/runtime-performance.mjs
var key$1 = Symbol.for("coreoflife.runtimePerformance"), windowMs = 3e5;
var round = (value) => Math.round(value * 10) / 10;
var workNames = new Set([
	"combat_memory_hit",
	"combat_projection",
	"position_flush",
	"main_commit",
	"main_write_group",
	"dungeon_tick",
	"dungeon_save",
	"dungeon_serialize",
	"dungeon_commit",
	"dungeon_reward",
	"dungeon_finish",
	"dungeon_checkpoint",
	"dungeon_member_refresh",
	"world_cleanup",
	"bot_deadline",
	"gc_minor",
	"gc_major",
	"gc_incremental",
	"gc_weakcb",
	"gc_other"
]);
var sqlTables = new Set([
	"players",
	"monsters",
	"accounts",
	"auth_sessions",
	"game_presence",
	"player_items",
	"world_state",
	"world_drops",
	"messages",
	"monster_participants",
	"normal_defeats",
	"normal_reward_claims",
	"sinsi_defeats",
	"sinsi_reward_claims",
	"boss_participants",
	"boss_defeats",
	"boss_reward_claims",
	"combat_events",
	"party_invites",
	"fishing_sessions",
	"arena_queue",
	"arena_announcements",
	"arena_kill_claims",
	"war_kill_claims",
	"arena_reward_claims",
	"guardian_reward_claims",
	"pve_engagements",
	"other"
]);
for (const name of [
	"world_loop_tick",
	"world_cleanup",
	"world_upkeep",
	"world_regen",
	"world_flush",
	"world_premium",
	"world_guild_buff",
	"world_voice",
	"world_guild_clock",
	"world_launch_email"
]) workNames.add(name);
for (const verb of [
	"select",
	"update",
	"insert",
	"delete",
	"replace",
	"with",
	"other"
]) for (const table of sqlTables) workNames.add(`sql_${verb}_${table}`);
for(const name507 of ["reward_xp_claim","reward_xp_update","reward_batch_claim","forge_material","cauldron_material","world_drop","equipment_upgrade","friend_accept"])workNames.add('sql_'+name507+'507');
function sqlWorkName(sql) {
 const family507=/^\s*WITH\s+(RECURSIVE\s+)?([a-z_0-9]+)/i.exec(sql);
 if(family507){const names507={reward_input:family507[1]?'reward_xp_update':'reward_xp_claim',reward_batch:'reward_batch_claim',forge_earned491:'forge_material',earned:'cauldron_material',drops:'world_drop',upgrade:'equipment_upgrade',eligible:'friend_accept'};const named507=names507[family507[2].toLowerCase()];if(named507)return 'sql_'+named507+'507';}

	const verb = /^\s*(SELECT|UPDATE|INSERT|DELETE|REPLACE|WITH)\b/i.exec(sql)?.[1]?.toLowerCase() || "other";
	const table = /\b(?:FROM|INTO|UPDATE)\s+["`\[]?([a-z_]+)\b/i.exec(sql)?.[1]?.toLowerCase();
	return `sql_${verb}_${sqlTables.has(table) ? table : "other"}`;
}
function createRuntimePerformance({ now = Date.now } = {}) {
	const samples = [], workBuckets = /* @__PURE__ */ new Map(), slowWork = [];
	const hostResources = createHostResourceSampler({ now });
	let prunedEpoch = -Infinity;
	const pruneWork = (at) => {
		const epoch = Math.floor(at / 1e4);
		if (epoch !== prunedEpoch) {
			for (const key of workBuckets.keys()) if (key <= epoch - 30) workBuckets.delete(key);
			for (let i = slowWork.length - 1; i >= 0; i--) if (slowWork[i].endedAtMs <= at - windowMs) slowWork.splice(i, 1);
			prunedEpoch = epoch;
		}
	};
	return {
		sampleHostResources() {
			return hostResources.sample();
		},
		work(name, durationMs, startedAtMs, bytes) {
			if (!workNames.has(name) || !Number.isFinite(durationMs) || durationMs < 0) return;
			const at = now();
			pruneWork(at);
			const start = Number.isFinite(startedAtMs) ? startedAtMs : at - durationMs;
			if (start + durationMs <= at - windowMs) return;
			const epoch = Math.floor(at / 1e4);
			let bucket = workBuckets.get(epoch);
			if (!bucket) workBuckets.set(epoch, bucket = /* @__PURE__ */ new Map());
			let row = bucket.get(name);
			if (!row) bucket.set(name, row = {
				count: 0,
				totalMs: 0,
				maxMs: 0,
				over20: 0
			});
			if (name === "dungeon_save" && Number.isSafeInteger(bytes) && bytes >= 0) {
				row.byteCount = (row.byteCount || 0) + 1;
				row.totalBytes = (row.totalBytes || 0) + bytes;
				row.maxBytes = Math.max(row.maxBytes || 0, bytes);
			}
			row.count++;
			row.totalMs += durationMs;
			row.maxMs = Math.max(row.maxMs, durationMs);
			row.over20 += Number(durationMs > 20);
			if (durationMs >= 20) {
				slowWork.push({
					name,
					startedAtMs: Math.round(start),
					endedAtMs: Math.round(start + durationMs),
					durationMs: round(durationMs),
					...name === "dungeon_save" && Number.isSafeInteger(bytes) && bytes >= 0 ? { bytes } : {}
				});
				if (slowWork.length > 64) slowWork.shift();
			}
		},
		record(sample) {
			const at = now();
			samples.push({
				at,
				loopExcessMs: Math.max(0, sample.loopExcessMs || 0),
				cpuCores: Math.max(0, sample.cpuCores || 0),
				loopUtilization: Math.max(0, Math.min(1, sample.loopUtilization || 0))
			});
			while (samples.length > 60 || samples[0]?.at <= at - windowMs) samples.shift();
		},
		snapshot() {
			const at = now();
			while (samples[0]?.at <= at - windowMs) samples.shift();
			pruneWork(at);
			const memory = process.memoryUsage();
			const work = {};
			for (const bucket of workBuckets.values()) for (const [name, row] of bucket) {
				const target = work[name] ??= {
					count: 0,
					totalMs: 0,
					maxMs: 0,
					over20: 0
				};
				target.count += row.count;
				target.totalMs += row.totalMs;
				target.maxMs = Math.max(target.maxMs, row.maxMs);
				target.over20 += row.over20;
				if (row.byteCount) {
					target.byteCount = (target.byteCount || 0) + row.byteCount;
					target.totalBytes = (target.totalBytes || 0) + row.totalBytes;
					target.maxBytes = Math.max(target.maxBytes || 0, row.maxBytes);
				}
			}
			return {
				protocol: "native-runtime-timing-v1",
				scope: "process-only-not-player-rtt",
				sqliteVersion: process.versions.sqlite,
				measuredAtMs: at,
				windowSeconds: 300,
				sampleSeconds: 5,
				samples: samples.length,
				eventLoopExcessMaxMs: round(Math.max(0, ...samples.map((s) => s.loopExcessMs))),
				cpuCoresMean: round(samples.reduce((n, s) => n + s.cpuCores, 0) / Math.max(1, samples.length)),
				cpuCoresMax: round(Math.max(0, ...samples.map((s) => s.cpuCores))),
				eventLoopUtilizationMax: Math.round(Math.max(0, ...samples.map((s) => s.loopUtilization)) * 1e3) / 1e3,
				recentStalls: samples.filter((s) => s.loopExcessMs >= 50).slice(-12).map((s) => ({
					sampleEndedAtMs: s.at,
					sampleSeconds: 5,
					eventLoopExcessMs: round(s.loopExcessMs),
					cpuCores: round(s.cpuCores),
					loopUtilization: Math.round(s.loopUtilization * 1e3) / 1e3
				})),
				work: Object.fromEntries(Object.entries(work).map(([name, row]) => [name, {
					count: row.count,
					meanMs: round(row.totalMs / row.count),
					maxMs: round(row.maxMs),
					over20: row.over20,
					...row.byteCount ? {
						meanBytes: Math.round(row.totalBytes / row.byteCount),
						maxBytes: row.maxBytes,
						totalBytes: row.totalBytes
					} : {}
				}])),
				recentSlowWork: slowWork.map((row) => ({ ...row })),
				memoryMb: {
					rss: round(memory.rss / 1048576),
					heapUsed: round(memory.heapUsed / 1048576),
					heapTotal: round(memory.heapTotal / 1048576),
					external: round(memory.external / 1048576)
				},
				hostResources: hostResources.snapshot()
			};
		}
	};
}
var runtimePerformance = () => globalThis[key$1] ??= createRuntimePerformance();
var reportRuntimeWork = (name, durationMs, startedAtMs, bytes) => {
	try {
		runtimePerformance().work(name, durationMs, startedAtMs, bytes);
	} catch {}
};
//#endregion
//#region vds-server/src/wal-sync.mjs
var WalSync = class {
	constructor(walPath, { onFailure = () => {} } = {}) {
		this.walPath = walPath;
		this.onFailure = onFailure;
		this.handle = null;
		this.inode = null;
		this.checkedAt = -Infinity;
		this.waiting = [];
		this.running = null;
		this.failed = null;
		this.closed = false;
		this.stats = {
			protocol: "async-wal-fsync-v1",
			syncs: 0,
			waiters: 0,
			totalMs: 0,
			maxMs: 0,
			errors: 0,
			reopened: 0
		};
	}
	durable() {
		if (this.failed) return Promise.reject(this.failed);
		if (this.closed) return Promise.reject(/* @__PURE__ */ new Error("Database closed"));
		return new Promise((resolve, reject) => {
			this.waiting.push({
				resolve,
				reject
			});
			this.pump();
		});
	}
	pump() {
		if (this.closed || this.running || !this.waiting.length) return;
		const batch = this.waiting.splice(0);
		this.stats.waiters += batch.length;
		this.running = this.flush().then(() => {
			for (const waiter of batch) waiter.resolve();
		}, (error) => {
			this.stats.errors++;
			this.failed ??= error;
			for (const waiter of batch) waiter.reject(error);
			for (const waiter of this.waiting.splice(0)) waiter.reject(error);
			try {
				this.onFailure(error);
			} catch {}
		}).finally(() => {
			this.running = null;
			if (!this.failed) this.pump();
		});
	}
	async flush() {
		const started = performance.now();
		if (!this.handle || started - this.checkedAt >= 1e3) {
			const current = await stat(this.walPath);
			if (!this.handle || current.ino !== this.inode) {
				if (this.handle) {
					this.stats.reopened++;
					await this.handle.close().catch(() => {});
				}
				this.handle = await open(this.walPath, "r+");
				this.inode = (await this.handle.stat()).ino;
				if (this.inode !== current.ino) throw new Error("WAL file changed while opening the flush handle");
			}
			this.checkedAt = started;
		}
		await this.handle.sync();
		const elapsed = performance.now() - started;
		this.stats.syncs++;
		this.stats.totalMs += elapsed;
		this.stats.maxMs = Math.max(this.stats.maxMs, elapsed);
	}
	snapshot() {
		return {
			...this.stats,
			ready: !this.failed && !this.closed,
			fallback: this.failed ? String(this.failed.message || this.failed) : null,
			meanMs: this.stats.syncs ? Math.round(this.stats.totalMs / this.stats.syncs * 100) / 100 : 0,
			maxMs: Math.round(this.stats.maxMs * 100) / 100,
			totalMs: Math.round(this.stats.totalMs)
		};
	}
	close() {
		if (this.closed) return;
		this.closed = true;
		const waiters = this.waiting.splice(0);
		let flushed = false;
		if (waiters.length && !this.failed) try {
			const fd = openSync(this.walPath, "r+");
			try {
				fsyncSync(fd);
				flushed = true;
			} finally {
				closeSync(fd);
			}
		} catch {}
		for (const waiter of waiters) flushed ? waiter.resolve() : waiter.reject(/* @__PURE__ */ new Error("Database closed"));
		const handle = this.handle;
		this.handle = null;
		Promise.resolve(this.running).catch(() => {}).finally(() => handle?.close().catch(() => {}));
	}
};
//#endregion
//#region vds-server/src/database.mjs
var combatContextKey = Symbol.for("coreoflife.databaseCombatContext");
var combatContext = globalThis[combatContextKey] ??= new AsyncLocalStorage();
var withCombatDatabasePriority = (task) => combatContext.run(true, task);
var deferDatabaseBackgroundTask = (task) => new Promise((resolve, reject) => {
	setImmediate(() => combatContext.run(false, () => Promise.resolve().then(task).then(resolve, reject)));
});
var LocalDatabase = class {
	constructor(path, { create = false, groupWrites = false, asyncDurable = false, readOnly = false } = {}) {
		if (!create && (!path || !existsSync(path))) throw new Error("Imported game database is missing; refusing to create an empty world.");
		this.sqlite = new DatabaseSync(path, { readOnly });
		this.readOnly = readOnly;
		this.sqlite.exec(readOnly ? "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA cache_size=-16384;" : "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA cache_size=-65536;");
		this.walSync = null;
		if (!readOnly && asyncDurable && path && path !== ":memory:" && this.sqlite.prepare("PRAGMA journal_mode").get().journal_mode === "wal") {
			this.walSync = new WalSync(`${path}-wal`, { onFailure: (error) => this.restoreFullDurability(error) });
			this.sqlite.exec("PRAGMA synchronous=NORMAL");
		}
		const autocheckpoint = Number(process.env.CORE_WAL_AUTOCHECKPOINT_PAGES ?? 4e3);
		if (!readOnly && Number.isInteger(autocheckpoint) && autocheckpoint >= 1e3 && autocheckpoint <= 2e4) this.sqlite.exec(`PRAGMA wal_autocheckpoint=${autocheckpoint}`);
		this.turnDeadline = performance.now() + 6;
		this.nextTurn = null;
		this.combatDeadline = 0;
		this.statementCache = /* @__PURE__ */ new Map();
		this.statementCacheBytes = 0;
		this.statementWorkNames = /* @__PURE__ */ new Map();
		this.schemaVersionStatement = this.sqlite.prepare("PRAGMA schema_version");
		this.schemaVersion = this.schemaVersionStatement.get().schema_version;
		this.batchSchemaChecked = false;
		this.groupWrites = groupWrites;
		this.writeQueue = [];
		this.writeDrain = null;
		this.writeStats = {
			memoryFlush: {
				count: 0,
				lastMs: 0,
				maxMs: 0,
				lastDurableMs: 0,
				maxDurableMs: 0
			},
			commits: 0,
			commitErrors: 0,
			totalCommitMs: 0,
			maxCommitMs: 0,
			groupedJobs: 0,
			singletonWrites: 0,
			guardedJobs: 0,
			guardedRejected: 0
		};
		this.closed = false;
		this.metadataStatement = this.sqlite.prepare("SELECT changes() AS changes, last_insert_rowid() AS last_row_id");
	}
	checkSchema() {
		const schemaVersion = this.schemaVersionStatement.get().schema_version;
		if (schemaVersion !== this.schemaVersion) {
			this.clearStatements();
			this.schemaVersion = schemaVersion;
		}
	}
	compiled(sql) {
		if (!this.batchSchemaChecked) this.checkSchema();
		const cached = this.statementCache.get(sql);
		if (cached) {
			this.statementCache.delete(sql);
			this.statementCache.set(sql, cached);
			return cached;
		}
		const prepared = this.sqlite.prepare(sql), bytes = sql.length * 2;
		if (bytes > 131072) return prepared;
		while (this.statementCache.size >= 128 || this.statementCacheBytes + bytes > 524288) {
			const oldest = this.statementCache.keys().next().value;
			this.statementCache.delete(oldest);
			this.statementWorkNames.delete(oldest);
			this.statementCacheBytes -= oldest.length * 2;
		}
		this.statementCache.set(sql, prepared);
		this.statementWorkNames.set(sql, sqlWorkName(sql));
		this.statementCacheBytes += bytes;
		return prepared;
	}
	restoreFullDurability(error) {
		console.error("wal_sync_fallback", String(error?.message || error));
		this.durabilityFallback = String(error?.message || error);
		try {
			if (!this.closed && !this.sqlite.isTransaction) this.sqlite.exec("PRAGMA synchronous=FULL");
		} catch (pragmaError) {
			console.error("wal_sync_restore_failed", String(pragmaError?.message || pragmaError));
		}
	}
	totalChanges() {
		return (this.totalChangesStatement ??= this.sqlite.prepare("SELECT total_changes() AS n")).get().n;
	}
	durableAfterCommit() {
		const durable = this.walSync && !this.walSync.failed ? this.walSync.durable() : null;
		this.sqlite.worldPushLayer?.confirmDurable(durable);
		this.sqlite.positionLayer?.confirmDurable(durable);
		this.sqlite.combatLayer?.confirmDurable(durable);
		return durable;
	}
	clearStatements() {
		this.statementCache.clear();
		this.statementWorkNames.clear();
		this.statementCacheBytes = 0;
	}
	assertAvailable() {
		if (this.closed) throw new Error("Database closed");
		if (this.maintenance) throw new Error("Beta sıfırlaması tamamlandı; sunucu yeniden başlıyor.");
	}
	prepare(sql) {
		this.assertAvailable();
		return new LocalStatement(this, sql, []);
	}
	yieldForIO() {
		this.assertAvailable();
		const now = performance.now();
		if (this.sqlite.isTransaction || now < this.turnDeadline) return null;
		if (combatContext.getStore() === true) {
			if (!this.combatDeadline) this.combatDeadline = now + 3;
			if (now < this.combatDeadline) return null;
		}
		return this.nextTurn ??= new Promise((resolve) => setImmediate(() => {
			this.turnDeadline = performance.now() + 6;
			this.combatDeadline = 0;
			this.nextTurn = null;
			resolve();
		}));
	}
	flushMemory() {
		if (this.memoryFlush) return this.memoryFlush;
		const job = Promise.resolve().then(() => this.batch([])).finally(() => {
			if (this.memoryFlush === job) this.memoryFlush = null;
		});
		return this.memoryFlush = job;
	}
	async positionCheckpoint(statement) {
		if (!this.positions?.enabled) return statement.first();
		let pause;
		while (pause = this.yieldForIO()) await pause;
		if (this.combat?.enabled && !this.positions.doubleBuffer) {
			const overdue = () => {
				const e = this.positions.entries.get(statement.params[7]);
				return e?.dirtyAt !== void 0 && this.positions.now() - e.dirtyAt >= 1e3;
			};
			while (overdue()) await this.flushMemory();
		}
		if (this.channelCompute) return this.channelCompute.position(statement);
		return this.positions.checkpoint(this.sqlite, statement);
	}
	async executeAsync(statement) {
		if (this.groupWrites && !this.sqlite.isTransaction && statement instanceof LocalStatement && statement.database === this && /^\s*(?:INSERT|UPDATE|DELETE|REPLACE)\b/i.test(statement.sql)) {
			this.writeStats.singletonWrites++;
			return (await this.batch([statement]))[0];
		}
		let pause;
		while (pause = this.yieldForIO()) await pause;
		const checkChanges = this.walSync && !this.sqlite.isTransaction && !/^\s*SELECT\b/i.test(statement.sql);
		const before = checkChanges ? this.totalChanges() : 0;
		const result = this.execute(statement);
		if (checkChanges && !this.sqlite.isTransaction && (this.totalChanges() !== before || /^\s*(?:CREATE|ALTER|DROP)\b/i.test(statement.sql))) {
			const durable = this.durableAfterCommit();
			if (durable) await durable;
		}
		return result;
	}
	execute(statement) {
		this.assertAvailable();
		if (!(statement instanceof LocalStatement) || statement.database !== this) throw new Error("Invalid database statement");
		const started = performance.now();
		try {
			const prepared = this.compiled(statement.sql);
			const rows = prepared.all(...statement.params).map((row) => {
				for (const key in row) if (row[key] instanceof Uint8Array) row[key] = Array.from(row[key]);
				return Object.setPrototypeOf(row, Object.prototype);
			});
			const metadata = this.metadataStatement.get();
			return {
				results: rows,
				success: true,
				meta: {
					...metadata,
					duration: performance.now() - started,
					served_by: "vds-sqlite",
					rows_read: rows.length,
					rows_written: prepared.columns().length ? 0 : metadata.changes,
					changed_db: metadata.changes > 0,
					size_after: 0
				}
			};
		} finally {
			reportRuntimeWork(this.statementWorkNames.get(statement.sql) ?? sqlWorkName(statement.sql), performance.now() - started, performance.timeOrigin + started);
		}
	}
	async batch(statements) {
		this.assertAvailable();
		if (this.groupWrites && statements.length && statements.every((statement) => statement instanceof LocalStatement && statement.database === this && /^\s*(?:SELECT|INSERT|UPDATE|DELETE|REPLACE|WITH)\b/i.test(statement.sql)) && !statements.every((statement) => /^\s*SELECT\b/i.test(statement.sql))) {
			const owned = statements.map((statement) => new LocalStatement(this, statement.sql, statement.params.map((value) => value instanceof Uint8Array ? value.slice() : value)));
			return new Promise((resolve, reject) => {
				this.writeQueue.push({
					statements: owned,
					resolve,
					reject
				});
				this.scheduleWriteDrain();
			});
		}
		let pause;
		while (pause = this.yieldForIO()) await pause;
		const readOnly = statements.length > 0 && statements.every((statement) => statement instanceof LocalStatement && statement.database === this && /^\s*SELECT\b/i.test(statement.sql));
		const stableSchema = statements.length > 0 && statements.every((statement) => statement instanceof LocalStatement && statement.database === this && /^\s*(?:SELECT|INSERT|UPDATE|DELETE|REPLACE)\b/i.test(statement.sql));
		const memoryFlushAt = statements.length === 0 ? performance.now() : null;
		this.sqlite.exec(readOnly ? "BEGIN DEFERRED" : "BEGIN IMMEDIATE");
		let durable = null, results;
		try {
			if (stableSchema) {
				this.checkSchema();
				this.batchSchemaChecked = true;
			}
			results = statements.map((statement) => this.execute(statement));
			if (readOnly) {
				this.sqlite.exec("COMMIT");
				return results;
			}
			this.commitWrites();
			if (memoryFlushAt !== null) {
				const m = this.writeStats.memoryFlush;
				m.count++;
				m.lastMs = performance.now() - memoryFlushAt;
				m.maxMs = Math.max(m.maxMs, m.lastMs);
			}
			durable = this.durableAfterCommit();
			if (!durable) {
				if (memoryFlushAt !== null) {
					const m = this.writeStats.memoryFlush;
					m.lastDurableMs = performance.now() - memoryFlushAt;
					m.maxDurableMs = Math.max(m.maxDurableMs, m.lastDurableMs);
				}
				return results;
			}
		} catch (error) {
			this.sqlite.exec("ROLLBACK");
			throw error;
		} finally {
			this.batchSchemaChecked = false;
		}
		await durable;
		if (memoryFlushAt !== null) {
			const m = this.writeStats.memoryFlush;
			m.lastDurableMs = performance.now() - memoryFlushAt;
			m.maxDurableMs = Math.max(m.maxDurableMs, m.lastDurableMs);
		}
		return results;
	}
	async guardedBatch(guard, statements, after) {
		this.assertAvailable();
		const ownedStatement = (statement) => {
			if (!(statement instanceof LocalStatement) || statement.database !== this || !/^\s*(?:SELECT|INSERT|UPDATE|DELETE|REPLACE|WITH)\b/i.test(statement.sql)) throw new Error("Invalid guarded database statement");
			return new LocalStatement(this, statement.sql, statement.params.map((value) => value instanceof Uint8Array ? Uint8Array.from(value) : value));
		};
		if (!(guard instanceof LocalStatement) || guard.database !== this || !/^\s*UPDATE\b/i.test(guard.sql) || !/\bRETURNING\b/i.test(guard.sql) || !Array.isArray(statements)) throw new Error("Guard must be an owned UPDATE ... RETURNING statement");
		const job = {
			guard: ownedStatement(guard),
			statements: statements.map(ownedStatement),
			after
		};
		if (this.groupWrites) return new Promise((resolve, reject) => {
			this.writeQueue.push({
				...job,
				resolve,
				reject
			});
			this.scheduleWriteDrain();
		});
		let pause;
		while (pause = this.yieldForIO()) await pause;
		this.sqlite.exec("BEGIN IMMEDIATE");
		let result, durable = null;
		try {
			this.checkSchema();
			this.batchSchemaChecked = true;
			this.sqlite.exec("SAVEPOINT request_batch");
			result = this.executeGuardedJob(job);
			this.sqlite.exec(job.guardedRejected ? "ROLLBACK TO request_batch; RELEASE request_batch" : "RELEASE request_batch");
			this.commitWrites();
			this.writeStats.guardedJobs++;
			if (job.guardedRejected) this.writeStats.guardedRejected++;
			durable = this.durableAfterCommit();
		} catch (error) {
			if (this.sqlite.isTransaction) this.sqlite.exec("ROLLBACK");
			throw error;
		} finally {
			this.batchSchemaChecked = false;
		}
		if (durable) await durable;
		return result;
	}
	executeGuardedJob(job) {
		if (!this.compiled(job.guard.sql).columns().length) throw new Error("Guard must return rows");
		const guard = this.execute(job.guard);
		job.guardedRejected = guard.results.length === 0;
		const results = job.guardedRejected ? [] : job.statements.map((statement) => this.execute(statement));
		if (!job.guardedRejected && job.after) {
			const value = job.after(results);
			if (value && typeof value.then === "function") throw Error("Atomic combat completion must be synchronous");
		}
		return {
			guard,
			results
		};
	}
	async combatHit(guard, plans, {durableCast473=false}={}) {
		let statements = plans.flatMap((p) => p.hitStatements); const store = this.combat;
		const memory = durableCast473 ? null : this.channelCompute ? await this.channelCompute.combat(guard, plans) : store?.tryBatch(statements, {
			guard,
			hitPlans: plans
		});
		if (memory) return memory;
        for(const plan of plans)plan.prepareDurable?.();
        statements=plans.flatMap(p=>p.hitStatements);
		if (!store?.enabled) return this.guardedBatch(guard, statements);
		const locked = plans.map((p) => p.target.id);
		for (const id of locked) store.locks.set(id, (store.locks.get(id) ?? 0) + 1);
		const started = performance.now();
		let kills = 0, pending;
		try {
			pending = this.guardedBatch(guard, statements, (results) => {
				let offset = 0;
				for (const plan of plans) {
					const row = results[offset + plan.healthResultIndex]?.results[0];
					if (row && row.hp <= 0) kills++;
					offset += plan.hitStatements.length;
				}
			});
			for (const id of locked) {
				let waits = store.barriers.get(id);
				if (!waits) store.barriers.set(id, waits = /* @__PURE__ */ new Set());
				waits.add(pending);
			}
			const result = await pending;
			if (result.guard.results.length) {
				store.stats.hits += plans.length;
				store.stats.kills += kills;
			} else store.stats.rejected++;
			if (kills) store.stats.killCommitMaxMs = Math.max(store.stats.killCommitMaxMs, performance.now() - started);
			return result;
		} catch (error) {
			store.stats.errors++;
			throw error;
		} finally {
			for (const id of locked) {
				const waits = store.barriers.get(id);
				waits?.delete(pending);
				if (!waits?.size) store.barriers.delete(id);
				const n = store.locks.get(id) - 1;
				if (n) store.locks.set(id, n);
				else store.locks.delete(id);
			}
		}
	}
	async combatBatch(statements, playerId) {
		if (this.combat?.enabled && playerId) {
			this.combat.syncEntity("players", playerId);
			this.combat.syncEntity("pve_engagements", playerId);
		}
		return (this.channelCompute && playerId ? await this.channelCompute.combatBatch(statements, playerId) : this.combat?.tryBatch(statements)) ?? this.batch(statements);
	}
	scheduleWriteDrain() {
		if (this.writeDrain || !this.writeQueue.length) return;
		this.writeDrain = setImmediate(() => combatContext.run(false, () => this.drainWrites()));
	}
	atomic(task) {
		this.assertAvailable();
		if (typeof task !== "function" || task.constructor?.name === "AsyncFunction") return Promise.reject(/* @__PURE__ */ new TypeError("Synchronous atomic callback required"));
		return new Promise((resolve, reject) => {
			this.writeQueue.push({
				atomic: task,
				resolve,
				reject
			});
			this.scheduleWriteDrain();
		});
	}
	commitWrites() {
		const started = performance.now();
		try {
			this.sqlite.exec("COMMIT");
			this.writeStats.commits++;
			if (this.positions?.doubleBuffer) this.memoryFlush = null;
		} catch (error) {
			this.writeStats.commitErrors++;
			throw error;
		} finally {
			const elapsed = performance.now() - started;
			this.writeStats.totalCommitMs += elapsed;
			this.writeStats.maxCommitMs = Math.max(this.writeStats.maxCommitMs, elapsed);
			reportRuntimeWork("main_commit", elapsed, performance.timeOrigin + started);
		}
	}
	drainWrites() {
		const started = performance.now();
		this.writeDrain = null;
		const settled = [];
		let transaction = false, durable = null;
		try {
			this.assertAvailable();
			this.sqlite.exec("BEGIN IMMEDIATE");
			transaction = true;
			this.checkSchema();
			this.batchSchemaChecked = true;
			const deadline = performance.now() + 3;
			do {
				const job = this.writeQueue.shift();
				settled.push(job);
				this.sqlite.exec("SAVEPOINT request_batch");
				try {
					job.results = job.atomic ? job.atomic(this.sqlite) : job.guard ? this.executeGuardedJob(job) : job.statements.map((statement) => this.execute(statement));
					if (job.results && typeof job.results.then === "function") throw new Error("Atomic callback must be synchronous");
					this.sqlite.exec(job.guardedRejected ? "ROLLBACK TO request_batch; RELEASE request_batch" : "RELEASE request_batch");
				} catch (error) {
					job.error = error;
					if (!this.sqlite.isTransaction) throw error;
					this.sqlite.exec("ROLLBACK TO request_batch; RELEASE request_batch");
				}
			} while (this.writeQueue.length && settled.length < 8 && performance.now() < deadline);
			this.commitWrites();
			transaction = false;
			durable = this.durableAfterCommit();
			this.writeStats.groupedJobs += settled.length;
			for (const job of settled) if (job.guard && !job.error) {
				this.writeStats.guardedJobs++;
				if (job.guardedRejected) this.writeStats.guardedRejected++;
			}
		} catch (error) {
			if (transaction && this.sqlite.isTransaction) try {
				this.sqlite.exec("ROLLBACK");
			} catch {}
			for (const job of settled) job.error = error;
			if (this.closed || this.maintenance || !settled.length) for (const job of this.writeQueue.splice(0)) settled.push({
				...job,
				error
			});
		} finally {
			this.batchSchemaChecked = false;
			reportRuntimeWork("main_write_group", performance.now() - started, performance.timeOrigin + started);
		}
		const settle = () => {
			for (const job of settled) job.error ? job.reject(job.error) : job.resolve(job.results);
		};
		if (durable) durable.then(settle, (error) => {
			for (const job of settled) job.reject(error);
		});
		else settle();
		this.scheduleWriteDrain();
	}
	async readWorldSnapshot(statements, options) {
		this.assertAvailable();
		if (!this.sqlite.isTransaction && statements.length > 0 && statements.every((statement) => statement instanceof LocalStatement && statement.database === this && /^\s*SELECT\b/i.test(statement.sql)) && this.worldReadPool) {
			const pending = this.worldReadPool.read(statements.map((statement) => ({
				sql: statement.sql,
				params: statement.params
			})), options);
			if (pending !== null) {
				const results = await pending;
				this.assertAvailable();
				return results;
			}
		}
		return this.batch(statements);
	}
	async exec(sql) {
		let pause;
		while (pause = this.yieldForIO()) await pause;
		const started = performance.now();
		this.sqlite.exec(sql);
		this.clearStatements();
		if (!this.sqlite.isTransaction) {
			const durable = this.durableAfterCommit();
			if (durable) await durable;
		}
		return {
			count: 1,
			duration: performance.now() - started
		};
	}
	async backup(path) {
		await backupInOneStep(this.sqlite, path);
	}
	close() {
		this.closed = true;
		if (this.writeDrain) clearImmediate(this.writeDrain);
		this.writeDrain = null;
		for (const job of this.writeQueue.splice(0)) job.reject(/* @__PURE__ */ new Error("Database closed"));
		this.worldReadPool?.close();
		this.walSync?.close();
		this.clearStatements();
		this.sqlite.close();
	}
};
var LocalStatement = class LocalStatement {
	constructor(database, sql, params) {
		this.database = database;
		this.sql = sql;
		this.params = params;
	}
	bind(...params) {
		const bound = params.map((value) => {
			if (value === null || typeof value === "string" || typeof value === "number") return value;
			if (value instanceof ArrayBuffer) return new Uint8Array(value);
			if (value instanceof Uint8Array) return value;
			if (Array.isArray(value) && value.every((v) => Number.isInteger(v) && v >= 0 && v <= 255)) return new Uint8Array(value);
			throw new Error("Unsupported SQLite bind value");
		});
		return new LocalStatement(this.database, this.sql, bound);
	}
	async all() {
		return this.database.executeAsync(this);
	}
	async run() {
		return this.database.executeAsync(this);
	}
	async first(column) {
		const row = (await this.database.executeAsync(this)).results[0];
		if (!row) return null;
		if (column === void 0) return row;
		if (!Object.hasOwn(row, column)) throw new Error("Unknown result column");
		return row[column];
	}
	async raw(options = {}) {
		let pause;
		while (pause = this.database.yieldForIO()) await pause;
		const statement = this.database.compiled(this.sql);
		const result = statement.all(...this.params);
		const names = statement.columns().map((column) => column.name);
		const rows = result.map((row) => names.map((name) => row[name]));
		return options.columnNames ? [names, ...rows] : rows;
	}
};
//#endregion
//#region vds-server/src/performance-metrics.mjs
var key = Symbol.for("coreoflife.nativePerformance");
var routes = new Set([
	"world_full",
	"world_owner",
	"world_compact",
	"world_combat",
	...new Set([
		"attack",
		"pvp_attack",
		"heartbeat",
		"claim_rewards",
		"move",
		"fishing_input",
		"start_fishing",
		"finish_fishing",
		"collect",
		"hurt",
		"use_potion"
	]),
	"other_action"
]);
var limits = [
	1,
	2,
	5,
	10,
	15,
	20,
	25,
	30,
	40,
	50,
	60,
	75,
	100,
	150,
	200,
	300,
	500,
	750,
	1e3,
	2e3,
	5e3,
	1e4,
	3e4,
	Infinity
];
var intervalMs = 1e4, intervals = 30;
var empty = () => ({
	count: 0,
	sum: 0,
	max: 0,
	over50: 0,
	over100: 0,
	bins: new Array(limits.length).fill(0)
});
var add = (data, value) => {
	data.count++;
	data.sum += value;
	data.max = Math.max(data.max, value);
	data.over50 += Number(value > 50);
	data.over100 += Number(value > 100);
	data.bins[limits.findIndex((limit) => value <= limit)]++;
};
var summarize = (data) => {
	const percentile = (q) => {
		let n = 0;
		for (let i = 0; i < limits.length; i++) {
			n += data.bins[i];
			if (n >= Math.ceil(data.count * q)) return Number.isFinite(limits[i]) ? limits[i] : null;
		}
		return null;
	};
	return {
		count: data.count,
		meanMs: Math.round(data.sum / data.count * 10) / 10,
		maxMs: Math.round(data.max * 10) / 10,
		p50UpperMs: percentile(.5),
		p95UpperMs: percentile(.95),
		over50: data.over50,
		over100: data.over100
	};
};
var businessReasons = new Set([
	"client_error",
	"forbidden",
	"scope_or_conflict"
]);
var counts = () => ({
	requests: 0,
	errors: 0,
	clientErrors: 0,
	serverErrors: 0,
	rejections: 0,
	byStatus: {},
	byReason: {}
});
function countRequest(row, status, reason, rejected, diagnostic) {
	row.requests++;
	row.rejections += Number(rejected);
	row.errors += Number(status >= 400 && !rejected);
	row.clientErrors += Number(status >= 400 && status < 500 && !rejected);
	row.serverErrors += Number(status >= 500 && status < 600);
	if (diagnostic) {
		const code = Number.isInteger(status) && status >= 100 && status <= 599 ? String(status) : "unknown";
		row.byStatus[code] = (row.byStatus[code] ?? 0) + 1;
		if (status >= 400) {
			const label = rejected ? "user_rejection" : safeFailureReason(reason, status);
			row.byReason[label] = (row.byReason[label] ?? 0) + 1;
		}
	}
}
function mergeCounts(out, row) {
	for (const key of [
		"requests",
		"errors",
		"clientErrors",
		"serverErrors",
		"rejections"
	]) out[key] += row[key];
	for (const key of ["byStatus", "byReason"]) for (const [label, count] of Object.entries(row[key])) out[key][label] = (out[key][label] ?? 0) + count;
}
function createPerformanceMetrics({ now = Date.now } = {}) {
	const startedAtMs = now(), buckets = /* @__PURE__ */ new Map();
	const prune = (epoch) => {
		for (const time of buckets.keys()) if (time <= epoch - intervals) buckets.delete(time);
	};
	return {
		record(route, values, status, reason, action, result) {
			if (!routes.has(route)) return;
			const epoch = Math.floor(now() / intervalMs);
			prune(epoch);
			let bucket = buckets.get(epoch);
			if (!bucket) buckets.set(epoch, bucket = /* @__PURE__ */ new Map());
			let row = bucket.get(route);
			if (!row) bucket.set(route, row = {
				...counts(),
				series: {},
				byAction: {}
			});
			const label = diagnosticAction(action), rejected = route === "other_action" && result === "user_rejection" && expectedActionRejection(label, status, reason && !businessReasons.has(reason) ? reason : void 0);
			countRequest(row, status, reason, rejected, route === "heartbeat" || route === "other_action");
			if (route === "other_action") countRequest(row.byAction[label] ??= counts(), status, reason, rejected, true);
			for (const name of [
				"nativeMs",
				"handlerMs",
				"ingressMs"
			]) {
				const value = values[name];
				if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
				add(row.series[name] ??= empty(), value);
			}
		},
		snapshot() {
			const at = now();
			prune(Math.floor(at / intervalMs));
			const combined = {};
			for (const bucket of buckets.values()) for (const [route, row] of bucket) {
				const out = combined[route] ??= {
					...counts(),
					series: {},
					byAction: {}
				};
				mergeCounts(out, row);
				for (const [action, data] of Object.entries(row.byAction)) mergeCounts(out.byAction[action] ??= counts(), data);
				for (const [name, data] of Object.entries(row.series)) {
					const target = out.series[name] ??= empty();
					target.count += data.count;
					target.sum += data.sum;
					target.max = Math.max(target.max, data.max);
					target.over50 += data.over50;
					target.over100 += data.over100;
					for (let i = 0; i < limits.length; i++) target.bins[i] += data.bins[i];
				}
			}
			return {
				protocol: "native-game-timing-v1",
				startedAtMs,
				measuredAtMs: at,
				windowSeconds: 300,
				resolutionSeconds: 10,
				scope: "server-only-not-player-rtt",
				routes: Object.fromEntries(Object.entries(combined).map(([route, row]) => [route, {
					requests: row.requests,
					errors: row.errors,
					clientErrors: row.clientErrors,
					serverErrors: row.serverErrors,
					...["heartbeat", "other_action"].includes(route) ? {
						byStatus: row.byStatus,
						byReason: row.byReason
					} : {},
					...route === "other_action" ? {
						rejections: row.rejections,
						byAction: row.byAction
					} : {},
					...Object.fromEntries(Object.entries(row.series).map(([name, data]) => [name, summarize(data)]))
				}]))
			};
		}
	};
}
var nativePerformance = () => globalThis[key] ??= createPerformanceMetrics();
//#endregion
//#region vds-server/src/world-cleanup.mjs
var DROP_READY = "enchantments NOT IN ('__pending__','__profile_pending__')";
var withoutBossParticipant = "NOT EXISTS (SELECT 1 FROM boss_participants p WHERE p.boss_round=boss_reward_claims.boss_round AND p.player_id=boss_reward_claims.player_id)";
var withoutParticipant = (table) => `NOT EXISTS (SELECT 1 FROM monster_participants p WHERE p.monster_id=${table}.monster_id AND p.spawn_round=${table}.spawn_round AND p.player_id=${table}.player_id)`;
var WORLD_CLEANUP_TABLES = [
	[
		"solo_entry_receipts",
		"created_at",
		604800,
		"NOT EXISTS (SELECT 1 FROM dungeon_members m WHERE m.run_id=solo_entry_receipts.run_id)"
	],
	[
		"solo_key_crafts",
		"created_at",
		2592e3
	],
	[
		"boss_defeats",
		"defeated_at",
		86400
	],
	[
		"normal_defeats",
		"defeated_at",
		86400,STONE_DEFEAT_EXPIRY_GUARD476
	],
	[
		"sinsi_defeats",
		"defeated_at",
		86400
	],
	[
		"boss_participants",
		"created_at",
		86400
	],
	[
		"monster_participants",
		"created_at",
		86400,STONE_PARTICIPANT_EXPIRY_GUARD476
	],
	[
		"boss_reward_claims",
		"awarded_at",
		86400,
		withoutBossParticipant
	],
	[
		"normal_reward_claims",
		"awarded_at",
		86400,
		withoutParticipant("normal_reward_claims")
	],
	[
		"sinsi_reward_claims",
		"awarded_at",
		86400,
		withoutParticipant("sinsi_reward_claims")
	],
	[
		"messages",
		"created_at",
		86400
	],
	[
		"world_drops",
		"expires_at",
		0,
		DROP_READY
	],
	[
		"combat_events",
		"created_at",
		5e3,
		"",
		true
	],
	[
		"party_invites",
		"created_at",
		120
	],
	[
		"fishing_sessions",
		"expires_at_ms",
		0,
		"",
		true
	],
	[
		"arena_queue",
		"last_seen_ms",
		45e3,
		"",
		true
	],
	[
		"arena_announcements",
		"expires_at_ms",
		3e4,
		"",
		true
	],
	[
		"arena_kill_claims",
		"created_at_ms",
		6048e5,
		"",
		true
	],
	[
		"war_kill_claims",
		"created_at_ms",
		6048e5,
		"",
		true
	],
	[
		"arena_reward_claims",
		"awarded_at_ms",
		2592e6,
		"",
		true
	],
	[
		"guardian_reward_claims",
		"awarded_at",
		604800
	]
];
function worldCleanupSql([table, column, , guard]) {
	return `DELETE FROM ${table} WHERE rowid IN (SELECT rowid FROM ${table} WHERE ${column} < ?${guard ? ` AND ${guard}` : ""} ORDER BY ${column},rowid LIMIT ?)`;
}
var active = /* @__PURE__ */ new WeakMap();
var cursors = /* @__PURE__ */ new WeakMap();
function cleanupWorldHistory(database, nowMs, { defer = deferDatabaseBackgroundTask, batchSize = 32, maxBatchesPerTable = 128 } = {}) {
	if (active.has(database)) return active.get(database);
	if (!Number.isSafeInteger(nowMs) || nowMs <= 0) return Promise.reject(/* @__PURE__ */ new Error("Invalid world cleanup time"));
	if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 256 || !Number.isInteger(maxBatchesPerTable) || maxBatchesPerTable < 1 || maxBatchesPerTable > 128) return Promise.reject(/* @__PURE__ */ new Error("Invalid world cleanup budget"));
	const job = (async () => {
		let progress = cursors.get(database);
		if (!progress) cursors.set(database, progress = /* @__PURE__ */ new Map());
		if (process.env.CORE_WORLD_LOOP !== "0") {
			const table = "dragon_drop_payloads";
			if (await database.prepare("SELECT 1 FROM sqlite_schema WHERE name='dragon_drop_payloads'").first()) {
				let cursor = progress.get(table) ?? 0;
				for (let batch = 0; batch < maxBatchesPerTable; batch++) if (await defer(async () => {
					const { results } = await database.prepare("SELECT rowid AS rid FROM dragon_drop_payloads WHERE rowid>? ORDER BY rowid LIMIT ?").bind(cursor, batchSize).all();
					if (!results.length) return 0;
					cursor = results.at(-1).rid;
					progress.set(table, cursor);
					await database.batch([database.prepare(`DELETE FROM dragon_drop_payloads WHERE rowid IN (${results.map(() => "?").join(",")}) AND NOT EXISTS(SELECT 1 FROM world_drops d WHERE d.id=dragon_drop_payloads.drop_id)`).bind(...results.map((r) => r.rid))]);
					return results.length;
				}) < batchSize) {
					progress.delete(table);
					break;
				}
			}
		}
		for (const entry of WORLD_CLEANUP_TABLES) {
			const cutoff = (entry[4] ? nowMs : Math.floor(nowMs / 1e3)) - entry[2];
			const sql = worldCleanupSql(entry);
			let cursor = progress.get(entry[0]) ?? [-Number.MAX_SAFE_INTEGER, 0];
			for (let batch = 0; batch < maxBatchesPerTable; batch++) {
				let candidates = null;
				const removed = await defer(async () => {
					if (process.env.CORE_WORLD_LOOP !== "0") {
						const [table, column, , guard] = entry;
						const rows = await database.prepare(`SELECT rowid AS rid,${column} AS stamp FROM main.${table} WHERE ${column}<? AND (${column},rowid)>(?,?) ORDER BY ${column},rowid LIMIT ?`).bind(cutoff, ...cursor, batchSize).all();
						candidates = rows.results.length;
						if (!candidates) {
							progress.delete(table);
							return 0;
						}
						const last = rows.results.at(-1);
						cursor = [last.stamp, last.rid];
						progress.set(table, cursor);
						const [result] = await database.batch([database.prepare(`DELETE FROM ${table} WHERE rowid IN (${rows.results.map(() => "?").join(",")}) AND ${column}<?${guard ? ` AND ${guard}` : ""}`).bind(...rows.results.map((r) => r.rid), cutoff)]);
						return Number(result.meta.changes);
					}
					const [result] = await database.batch([database.prepare(sql).bind(cutoff, batchSize)]);
					return Number(result.meta.changes);
				});
				if ((candidates ?? removed) < batchSize) {
					progress.delete(entry[0]);
					break;
				}
			}
		}
	})();
	active.set(database, job);
	job.finally(() => {
		if (active.get(database) === job) active.delete(database);
	}).catch(() => {});
	return job;
}
//#endregion
//#region vds-server/src/realtime-transport.mjs
var cachedKey = null, cachedEncoded = null;
function privateKey() {
	const encoded = String(process.env.REALTIME_SIGNING_PRIVATE_KEY || "").replace(/\s+/g, "");
	if (!encoded) throw new Error("REALTIME_SIGNING_PRIVATE_KEY is not configured.");
	if (encoded !== cachedEncoded) {
		if (encoded.length > 8192 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("Realtime signing key is malformed.");
		const key = createPrivateKey({
			key: Buffer.from(encoded, "base64"),
			format: "der",
			type: "pkcs8"
		});
		if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1") throw new Error("Realtime signing key is not ECDSA P-256.");
		cachedKey = key;
		cachedEncoded = encoded;
	}
	return cachedKey;
}
var realtimeCrypto = {
	sign(value) {
		return sign("sha256", Buffer.from(value, "utf8"), {
			key: privateKey(),
			dsaEncoding: "ieee-p1363"
		}).toString("base64url");
	},
	digest(body) {
		return createHash("sha256").update(body, "utf8").digest("base64url");
	}
};
var agent = new http.Agent({
	keepAlive: true,
	maxSockets: 16,
	maxFreeSockets: 16,
	timeout: 4e3,
	scheduling: "lifo"
});
var RESPONSE_LIMIT = 65536;
function postLoopback(origin, pathname, headers, body, timeoutMs = 1500) {
	const url = new URL(origin);
	if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.pathname !== "/" || url.search) return null;
	return new Promise((resolve, reject) => {
		let settled = false;
		const finish = (value) => {
			if (!settled) {
				settled = true;
				clearTimeout(timer);
				resolve(value);
			}
		};
		const fail = (error) => {
			if (!settled) {
				settled = true;
				clearTimeout(timer);
				reject(error);
			}
		};
		const payload = Buffer.from(body, "utf8");
		const request = http.request({
			host: "127.0.0.1",
			port: Number(url.port) || 80,
			path: pathname,
			method: "POST",
			agent,
			headers: {
				...headers,
				"content-type": "application/json",
				"content-length": payload.length
			}
		}, (response) => {
			const chunks = [];
			let length = 0;
			response.on("data", (chunk) => {
				length += chunk.length;
				if (length <= RESPONSE_LIMIT) chunks.push(chunk);
			});
			response.on("end", () => {
				const status = response.statusCode || 0, text = length <= RESPONSE_LIMIT ? Buffer.concat(chunks).toString("utf8") : "";
				finish({
					ok: status >= 200 && status < 300,
					status,
					json: async () => JSON.parse(text)
				});
			});
			response.on("error", fail);
			response.on("aborted", () => fail(/* @__PURE__ */ new Error("Realtime response aborted")));
		});
		const timer = setTimeout(() => {
			request.destroy(/* @__PURE__ */ new Error("Realtime delivery timed out"));
		}, timeoutMs);
		timer.unref?.();
		request.on("error", fail);
		request.end(payload);
	});
}
var BATCH_KINDS = {
	"/internal/broadcast": "room",
	"/internal/broadcast-world": "world",
	"/internal/broadcast-players": "players"
};
var SINGLE_BODY_LIMIT = 24e3;
function createRealtimeBatcher({ post = postLoopback, windowMs = 2, maxItems = 32, maxBytes = 196608, retryProbeMs = 6e4, now = Date.now } = {}) {
	let queue = [], bytes = 0, timer = null, unsupportedUntil = 0;
	const stats = {
		batches: 0,
		events: 0,
		fallbacks: 0,
		maxBatch: 0
	};
	function flush(origin, signHeaders) {
		clearTimeout(timer);
		timer = null;
		const items = queue;
		queue = [];
		bytes = 0;
		if (!items.length) return;
		const body = `{"v":1,"items":[${items.map((item) => `{"k":"${item.kind}","p":${item.body}}`).join(",")}]}`;
		stats.batches++;
		stats.events += items.length;
		stats.maxBatch = Math.max(stats.maxBatch, items.length);
		(async () => {
			const response = await post(origin, "/internal/broadcast-batch", await signHeaders("/internal/broadcast-batch", body), body, 1500);
			if (!response) throw new Error("Realtime batch origin is not loopback");
			if (response.status === 404) {
				unsupportedUntil = now() + retryProbeMs;
				stats.fallbacks += items.length;
				for (const item of items) item.resolve(null);
				return;
			}
			if (response.ok) {
				const parsed = await response.json();
				const results = Array.isArray(parsed?.results) && parsed.results.length === items.length ? parsed.results : null;
				items.forEach((item, index) => {
					const result = results?.[index];
					const ok = Boolean(result && result.ok !== false);
					item.resolve({
						ok,
						status: ok ? 200 : 400,
						json: async () => result ?? {}
					});
				});
				return;
			}
			for (const item of items) item.resolve({
				ok: false,
				status: response.status,
				json: async () => ({})
			});
		})().catch((error) => {
			for (const item of items) item.reject(error);
		});
	}
	return {
		stats,
		send(origin, pathname, body, signHeaders) {
			const kind = BATCH_KINDS[pathname];
			if (!kind || typeof body !== "string" || body.length > SINGLE_BODY_LIMIT || now() < unsupportedUntil) return null;
			const size = Buffer.byteLength(body, "utf8");
			if (bytes + size + 16 > maxBytes) flush(origin, signHeaders);
			const result = new Promise((resolve, reject) => {
				queue.push({
					kind,
					body,
					resolve,
					reject
				});
			});
			bytes += size + 16;
			if (queue.length >= maxItems) flush(origin, signHeaders);
			else if (!timer) {
				timer = setTimeout(() => flush(origin, signHeaders), windowMs);
				timer.unref?.();
			}
			return result;
		}
	};
}
var realtimeBatcher = createRealtimeBatcher();
//#endregion
//#region vds-server/src/environment.mjs
var nativeSha256 = (bytes) => createHash("sha256").update(bytes).digest("base64url");
var databaseKey = Symbol.for("coreoflife.localDatabase");
var env = new Proxy({}, { get(_target, key) {
	if (key === "DB") return globalThis[databaseKey] ??= new LocalDatabase(process.env.CORE_DATABASE_PATH, {
		groupWrites: process.env.CORE_GROUP_WRITES !== "0",
		asyncDurable: process.env.CORE_GROUP_WRITES !== "0" && process.env.CORE_ASYNC_WAL_SYNC !== "0"
	});
	if (key === "CORE_COMBAT_TASK") return withCombatDatabasePriority;
	if (key === "CORE_DEFER_TASK") return deferDatabaseBackgroundTask;
	if (key === "CORE_WORLD_CLEANUP") return (nowMs) => cleanupWorldHistory(env.DB, nowMs);
	if (key === "CORE_ATTACK_REQUESTS") return globalThis[Symbol.for("coreoflife.combatRequests")];
	if (key === "CORE_ATTACK_BRIDGE") return globalThis[Symbol.for("coreoflife.combatBridge")];
	if (key === "CORE_MOVEMENT") return globalThis[Symbol.for("coreoflife.movementBridge")];
	if (key === "CORE_RUNTIME") return "vds";
	if (key === "CORE_SHA256") return nativeSha256;
	if (key === "CORE_REALTIME_CRYPTO") return process.env.CORE_NATIVE_REALTIME === "0" ? void 0 : realtimeCrypto;
	if (key === "CORE_REALTIME_POST") return process.env.CORE_NATIVE_REALTIME === "0" ? void 0 : postLoopback;
	if (key === "CORE_REALTIME_BATCH") return process.env.CORE_NATIVE_REALTIME === "0" || process.env.CORE_REALTIME_BATCH === "0" ? void 0 : realtimeBatcher;
	if (key === "CORE_PERFORMANCE_SNAPSHOT") return () => nativePerformance().snapshot();
	if (key === "CORE_RUNTIME_SNAPSHOT") return () => runtimePerformance().snapshot();
	if (key === "GAME_ROOMS" || key === "ASSETS" || key === "IMAGES") return void 0;
	return typeof key === "string" ? process.env[key] : void 0;
} });
//#endregion
//#region lib/realtime-signing.ts
var encoder$1 = new TextEncoder();
var KEY_ID = "coreoflife-p256-2026-09";
var signingKeyPromise = null;
function environment() {
	return env;
}
function bytesToBase64Url$1(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function base64ToBytes(value) {
	const compact = value.replace(/\s+/g, "");
	if (!compact || compact.length > 8192 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) throw new Error("Realtime signing key is malformed.");
	const binary = atob(compact);
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function signingKey() {
	if (signingKeyPromise) return signingKeyPromise;
	const encoded = environment().REALTIME_SIGNING_PRIVATE_KEY;
	if (!encoded) throw new Error("REALTIME_SIGNING_PRIVATE_KEY is not configured.");
	signingKeyPromise = crypto.subtle.importKey("pkcs8", base64ToBytes(encoded), {
		name: "ECDSA",
		namedCurve: "P-256"
	}, false, ["sign"]);
	return signingKeyPromise;
}
function nativeCrypto() {
	return env.CORE_REALTIME_CRYPTO;
}
async function sign$1(value) {
	const native = nativeCrypto();
	if (native) return native.sign(value);
	const signature = await crypto.subtle.sign({
		name: "ECDSA",
		hash: "SHA-256"
	}, await signingKey(), encoder$1.encode(value));
	return bytesToBase64Url$1(new Uint8Array(signature));
}
function hasRealtimeSigningKey() {
	return Boolean(environment().REALTIME_SIGNING_PRIVATE_KEY);
}
function realtimeSocketUrl() {
	const configured = environment().REALTIME_SOCKET_URL?.trim();
	if (configured && /^wss:\/\/[A-Za-z0-9.-]+(?::\d+)?\/ws$/.test(configured)) return configured;
	return "wss://realtime.coreoflife.net/ws";
}
function realtimeHttpOrigin() {
	const configured = environment().REALTIME_HTTP_ORIGIN?.trim();
	if (environment().CORE_RUNTIME === "vds" && configured && /^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(configured) && Number(configured.slice(configured.lastIndexOf(":") + 1)) <= 65535) return configured;
	if (configured && /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(configured)) return configured;
	return "https://realtime.coreoflife.net";
}
async function createRealtimeTicket(payload) {
	const serialized = JSON.stringify(payload);
	const encoded = bytesToBase64Url$1(encoder$1.encode(serialized));
	return `v1.${encoded}.${await sign$1(`COL-TICKET-V1.${encoded}`)}`;
}
async function signedRealtimeRequest(pathname, serializedBody) {
	if (!/^\/[A-Za-z0-9/_-]{1,120}$/.test(pathname)) throw new Error("Invalid realtime request path.");
	const timestamp = String(Math.floor(Date.now() / 1e3));
	const nonce = crypto.randomUUID();
	const native = nativeCrypto();
	return {
		"x-col-key-id": KEY_ID,
		"x-col-timestamp": timestamp,
		"x-col-nonce": nonce,
		"x-col-signature": await sign$1(`COL-REQUEST-V1\n${KEY_ID}\n${timestamp}\n${nonce}\nPOST\n${pathname}\n${native ? native.digest(serializedBody) : bytesToBase64Url$1(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder$1.encode(serializedBody))))}`)
	};
}
function hasDurableRealtimeTransport() {
	return Boolean(env.GAME_ROOMS);
}
function safeArenaMatchId(value) {
	return typeof value === "string" && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : "";
}
function realtimeRoomName(cycle, channel, area, arenaMatchId) {
	const safeCycle = Math.max(1, Math.floor(Number(cycle) || 1));
	const safeChannel = Math.max(1, Math.floor(Number(channel) || 1));
	const safeArea = /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(area) ? area : "forest";
	return `cycle:${safeCycle}:channel:${safeChannel}:area:${safeArea}${safeArea === "arena" ? `:match:${safeArenaMatchId(arenaMatchId) || "invalid"}` : ""}`;
}
async function publishDurableRoomEvent(cycle, channel, area, event, arenaMatchId) {
	const namespace = env.GAME_ROOMS;
	if (!namespace) return false;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 350);
	try {
		if (area === "arena" && !safeArenaMatchId(arenaMatchId)) return false;
		const id = namespace.idFromName(realtimeRoomName(cycle, channel, area, arenaMatchId));
		return (await namespace.get(id).fetch("https://game-room.internal/broadcast", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				...event,
				serverAt: Number(event.serverAt) || Date.now()
			}),
			signal: controller.signal
		})).ok;
	} catch (error) {
		console.warn("Realtime room broadcast failed; HTTP reconciliation remains active.", error);
		return false;
	} finally {
		clearTimeout(timeout);
	}
}
async function deliverDedicatedEvent(pathname, body, retry, requireVisibility = false) {
	for (let attempt = 0; attempt < (retry ? 2 : 1); attempt += 1) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 1500);
		try {
			const native = env;
			const response = (native.CORE_REALTIME_BATCH ? await native.CORE_REALTIME_BATCH.send(realtimeHttpOrigin(), pathname, body, signedRealtimeRequest) : null) ?? await (async () => {
				const headers = await signedRealtimeRequest(pathname, body);
				return native.CORE_REALTIME_POST && await native.CORE_REALTIME_POST(realtimeHttpOrigin(), pathname, headers, body, 1500) || await fetch(`${realtimeHttpOrigin()}${pathname}`, {
					method: "POST",
					headers: {
						"content-type": "application/json",
						...headers
					},
					body,
					signal: controller.signal
				});
			})();
			if (response.ok) return !requireVisibility || (await response.json()).visibilityProtocol === "gm-visibility-v1";
			if (response.status < 500 && response.status !== 429) {
				console.warn("Dedicated realtime delivery rejected", response.status);
				return false;
			}
		} catch {} finally {
			clearTimeout(timeout);
		}
	}
	console.warn("Dedicated realtime event delivery failed after bounded attempts.");
	return false;
}
async function publishDedicatedRoomEvent(cycle, channel, area, event, arenaMatchId, combatAudit) {
	if (!hasRealtimeSigningKey()) return false;
	return deliverDedicatedEvent("/internal/broadcast", JSON.stringify({
		v: 1,
		...combatAudit ? { combatAudit } : {},
		room: {
			cycle: Math.max(1, Math.floor(Number(cycle) || 1)),
			channel: Math.max(1, Math.floor(Number(channel) || 1)),
			area: /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(area) ? area : "forest",
			...area === "arena" ? { arenaMatchId: safeArenaMatchId(arenaMatchId) } : {}
		},
		event: {
			...event,
			serverAt: Number(event.serverAt) || Date.now()
		}
	}), event.type !== "move", event.type === "gm_visibility");
}
async function publishDedicatedWorldEvent(cycle, event) {
	if (!hasRealtimeSigningKey()) return false;
	const pathname = "/internal/broadcast-world";
	const safeCycle = Math.max(1, Math.floor(Number(cycle) || 1));
	return deliverDedicatedEvent(pathname, JSON.stringify({
		v: 1,
		cycle: safeCycle,
		event: {
			...event,
			serverAt: Number(event.serverAt) || Date.now()
		}
	}), true);
}
async function publishRealtimeRoomEvent(cycle, channel, area, event, arenaMatchId) {
    const labAudience=colLabEventAudience(event,channel,area);
    if(labAudience)return colLabPublishAudience(cycle,channel,area,event,arenaMatchId,labAudience);
	if (area === "arena" && !safeArenaMatchId(arenaMatchId)) return false;
	const { __combatAudit: combatAudit, ...publicEvent } = event;
	const [durable, dedicated] = await Promise.all([publishDurableRoomEvent(cycle, channel, area, publicEvent, arenaMatchId), publishDedicatedRoomEvent(cycle, channel, area, publicEvent, arenaMatchId, combatAudit)]);
	return durable || dedicated;
}
async function publishRealtimeWorldEvent(cycle, rooms, event) {
	const safeCycle = Math.max(1, Math.floor(Number(cycle) || 1));
	const uniqueRooms = /* @__PURE__ */ new Map();
	for (const room of rooms) {
		const area = /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(room.area) ? room.area : "";
		const channel = Math.max(1, Math.floor(Number(room.channel) || 1));
		const arenaMatchId = area === "arena" ? safeArenaMatchId(room.arenaMatchId) : "";
		if (!area || area === "arena" && !arenaMatchId) continue;
		uniqueRooms.set(`${channel}:${area}:${arenaMatchId}`, {
			channel,
			area,
			...arenaMatchId ? { arenaMatchId } : {}
		});
	}
	return (await Promise.all([...[...uniqueRooms.values()].map((room) => publishDurableRoomEvent(safeCycle, room.channel, room.area, event, room.arenaMatchId)), publishDedicatedWorldEvent(safeCycle, event)])).some(Boolean);
}
async function publishRealtimeRoomEventToChannels(cycle, channels, area, event, dedicatedChannel) {
    if(colLabEventAudience(event,0,area))return (await Promise.all([...new Set(channels)].map(channel=>colLabPublishAudience(cycle,channel,area,event,undefined,colLabEventAudience(event,channel,area),dedicatedChannel!==undefined&&Number(dedicatedChannel)===Number(channel))))).some(Boolean);
	const uniqueChannels = [...new Set([...channels].map((channel) => Math.max(1, Math.floor(Number(channel) || 1))))];
	if (!uniqueChannels.length) return false;
	const safeDedicatedChannel = dedicatedChannel === void 0 ? null : Math.max(1, Math.floor(Number(dedicatedChannel) || 1));
	return (await Promise.all([...uniqueChannels.map((channel) => publishDurableRoomEvent(cycle, channel, area, event)), ...safeDedicatedChannel !== null && uniqueChannels.includes(safeDedicatedChannel) ? [publishDedicatedRoomEvent(cycle, safeDedicatedChannel, area, event)] : []])).some(Boolean);
}
//#endregion
//#region lib/community-live-server.ts
var service = () => globalThis.__colCommunityEvent;
function readCommunityProgress(accountId) {
	try {
		return service()?.progress(accountId) ?? null;
	} catch (error) {
		console.warn("Community progress read failed; calendar reconciliation remains active.", error);
		return null;
	}
}
var pending = null;
var dirty = false;
function publishCommunityProgress() {
	dirty = true;
	if (pending) return pending;
	pending = new Promise((resolve) => {
		setTimeout(() => {
			dirty = false;
			(async () => {
				const current = service();
				if (!current) return;
				const progress = current.progress();
				if (!progress) return;
				const { cycle, rooms } = current.occupiedRooms();
				const event = {
					type: "community_progress",
					eventId: crypto.randomUUID(),
					progress,
					serverAt: Date.now()
				};
				await Promise.all(rooms.map((room) => publishRealtimeRoomEvent(cycle, room.channel, room.area, event, room.arenaMatchId)));
			})().catch((error) => console.warn("Community broadcast failed; calendar reconciliation remains active.", error)).finally(() => {
				pending = null;
				if (dirty) publishCommunityProgress();
				resolve();
			});
		}, 75);
	});
	return pending;
}
//#endregion
//#region lib/pvp-commit-gate.ts
function createPvpCommitGate(maxPerTarget = 64, maxTargets = 512, waitMs = 1500) {
	const targets = /* @__PURE__ */ new Map();
	function owner(key, entry) {
		let released = false;
		return () => {
			if (released) return;
			released = true;
			const next = entry.waiting.shift();
			if (next) {
				clearTimeout(next.timer);
				next.resolve(owner(key, entry));
			} else if (targets.get(key) === entry) targets.delete(key);
		};
	}
	async function acquire(key) {
		let entry = targets.get(key);
		if (!entry) {
			if (targets.size >= maxTargets) return null;
			entry = { waiting: [] };
			targets.set(key, entry);
			return owner(key, entry);
		}
		if (entry.waiting.length >= maxPerTarget - 1) return null;
		const queue = entry;
		return new Promise((resolve) => {
			const waiter = {
				resolve,
				timer: setTimeout(() => {
					const index = queue.waiting.indexOf(waiter);
					if (index >= 0) {
						queue.waiting.splice(index, 1);
						resolve(null);
					}
				}, waitMs)
			};
			queue.waiting.push(waiter);
		});
	}
	return {
		acquire,
		size: () => targets.size
	};
}
var pvpCommitGate = createPvpCommitGate();
function samePvpActorScope(original, current) {
	return Boolean(original && current && original.hp > 0 && current.hp > 0 && original.id === current.id && original.area === current.area && original.channel === current.channel && original.arena_match_id === current.arena_match_id && original.realtime_scope_version === current.realtime_scope_version);
}
//#endregion
//#region lib/armor-mitigation.mjs
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
//#endregion
//#region lib/forest-loot.mjs
function forestLootMultiplier(sourceKey,level,policy={}){
 const source=String(sourceKey),playerLevel=Number(level);
 const after=Number.isInteger(policy.forest_after_level)?policy.forest_after_level:30;
 const reduction=Number.isFinite(policy.forest_reduction_percent)?Math.max(0,Math.min(100,policy.forest_reduction_percent)):30;
 const reduced=source.startsWith('forest.')?playerLevel>after:source.startsWith('frozen.')?playerLevel>=40:source.startsWith('black.')?playerLevel>=50:false;
 return reduced?1-reduction/100:1;
}
//#endregion
//#region lib/profanity.mjs
var DEFAULT_BLOCKED_WORDS = [
	"amk",
	"aq",
	"amq",
	"amina",
	"aminakoyim",
	"aminakoyayim",
	"amcik",
	"sik",
	"sikerim",
	"sikeyim",
	"siktir",
	"sikis",
	"sikik",
	"sikim",
	"sikiyim",
	"orospu",
	"orospucocugu",
	"oc",
	"pic",
	"yarrak",
	"yarak",
	"got",
	"gotveren",
	"ibne",
	"pezevenk",
	"kahpe",
	"kaltak",
	"dalyarak",
	"dallama",
	"gavat",
	"fuck",
	"fucking",
	"fucker",
	"motherfucker",
	"bitch",
	"asshole",
	"bastard",
	"shit",
	"dick",
	"cunt"
];
var aliases = {
	"ı": "i",
	"0": "o",
	"1": "i",
	"3": "e",
	"4": "a",
	"5": "s",
	"7": "t",
	"@": "a",
	"$": "s",
	"!": "i",
	"а": "a",
	"е": "e",
	"о": "o",
	"с": "c",
	"і": "i"
};
function fold(char) {
	return [...char.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")].map((c) => aliases[c] ?? c).join("");
}
function normalizeBlockedWord(value) {
	return [...value].map(fold).join("").replace(/[^a-z]/g, "");
}
function maskProfanity(value, customWords = []) {
	let normalized = "";
	const positions = [];
	let offset = 0;
	for (const char of value) {
		for (const c of fold(char)) {
			normalized += c;
			positions.push({
				start: offset,
				end: offset + char.length
			});
		}
		offset += char.length;
	}
	const masked = /* @__PURE__ */ new Set();
	for (const word of new Set([...DEFAULT_BLOCKED_WORDS, ...customWords].map(normalizeBlockedWord))) {
		if (word.length < 2 || word.length > 40) continue;
		const letters = [...word.replace(/(.)\1+/g, "$1")].map((c) => `${c}+`).join("[^a-z0-9]{0,6}");
		const expression = new RegExp(`(?<![a-z0-9])${letters}(?:lar|ler|larin|lerin|sin|siniz|lik|ligi|im|in|ini|iniz|um|un|unu|unuz|tir|dir)?(?![a-z0-9])`, "g");
		for (const match of normalized.matchAll(expression)) {
			const start = positions[match.index]?.start;
			const end = positions[match.index + match[0].length - 1]?.end;
			if (start === void 0 || end === void 0) continue;
			for (let i = start; i < end; i++) masked.add(i);
		}
	}
	return value.split("").map((char, i) => masked.has(i) ? "*" : char).join("");
}
function hasForbiddenCharacterName(value, customWords = []) {
	if (maskProfanity(value, customWords) !== value) return true;
	const compact = normalizeBlockedWord(value).replace(/(.)\1+/g, "$1");
	return [
		...DEFAULT_BLOCKED_WORDS.filter((w) => w.length >= 4),
		"siken",
		"sikici",
		"sikmis",
		"sikti",
		"sikmek",
		"sikilir",
		"siktim",
		"picoglu",
		"picler",
		"sikkafa",
		"sikbas",
		"siksurat",
		"sikbeyin",
		"sikagiz",
		"sikburun",
		"sikyuz",
		"siksok",
		"sikmerak",
		"siksever",
		"sikyala",
		"sikoglu",
		"gotkafa",
		"gotbas",
		"gotsurat",
		"gotoglu",
		"gotlale",
		"amk",
		"amq",
		...customWords.filter((w) => normalizeBlockedWord(w).length >= 4)
	].some((word) => {
		const folded = normalizeBlockedWord(word).replace(/(.)\1+/g, "$1");
		return folded.length >= 3 && compact.includes(folded);
	});
}
//#endregion
//#region lib/world-expansion-v248.ts
var HUNTING_COUNTS = {
	forest: 72,
	frozen: 45,
	black: 64
};
function huntingPositions(area) {
	const world = areaWorld(area), points = [];
	const protectedPoints = area === "forest" ? [FOREST_CORE, FOREST_SPAWN] : area === "frozen" ? [
		FROZEN_SPAWN,
		FROZEN_BOSS_SPAWN,
		FROZEN_WATER_SPAWN
	] : [BLACK_SPAWN];
	for (let row = 0; row < 9; row++) for (let col = 0; col < 11; col++) {
		const x = Math.round(240 + col * (world.width - 480) / 10 + (row % 2 ? 45 : -45)), y = Math.round(200 + row * (world.height - 420) / 8);
		if (isAreaWalkablePosition(area, x, y) && protectedPoints.every((p) => Math.hypot(x - p.x, y - p.y) > 420)) points.push({
			x,
			y
		});
	}
	return points.map((p, i) => ({
		...p,
		order: i * 37 % points.length
	})).sort((a, b) => a.order - b.order).slice(0, HUNTING_COUNTS[area]);
}
async function expandHuntingWorld(database) {
	const gate = "EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<23)";
	const writes = [
		database.prepare(`UPDATE players SET x=x*1.5,y=y*1.5,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0 WHERE area IN ('forest','frozen','black') AND ${gate}`),
		database.prepare(`UPDATE monsters SET x=x*1.5,y=y*1.5 WHERE area IN ('forest','frozen','black') AND id NOT LIKE 'frozen-%' AND id NOT IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND ${gate}`),
		database.prepare(`UPDATE monsters SET x=?,y=? WHERE id='frozen-boss-1' AND ${gate}`).bind(FROZEN_BOSS_SPAWN.x, FROZEN_BOSS_SPAWN.y),
		database.prepare(`UPDATE monsters SET x=?,y=? WHERE id LIKE 'frozen-water-c%' AND ${gate}`).bind(FROZEN_WATER_SPAWN.x, FROZEN_WATER_SPAWN.y)
	];
	for (const area of [
		"forest",
		"frozen",
		"black"
	]) for (let channel = 1; channel <= 3; channel++) {
		const rows = (await database.prepare("SELECT id,name,hp,max_hp,variant FROM monsters WHERE area=? AND channel=? AND is_boss=0 AND is_stone=0 AND summoned=0 AND id NOT LIKE 'frozen-%' AND id NOT IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') ORDER BY id").bind(area, channel).all()).results;
		if (!rows.length) throw new Error("Av alanı kaynakları bulunamadı.");
		const positions = huntingPositions(area);
		for (let i = 0; i < positions.length; i++) {
			const source = rows[i % rows.length], { x, y } = positions[i];
			if (i < rows.length) writes.push(database.prepare(`UPDATE monsters SET x=?,y=? WHERE id=? AND ${gate}`).bind(x, y, source.id));
			else {
				const family = source.id.split("-")[0], suffix = area === "black" ? `-black-c${channel}-${source.id.match(/-([1-8])$/)?.[1] ?? 1}` : area === "frozen" ? `-frozen-c${channel}-${i + 100}` : `-c${channel}-${i + 100}`;
				const id = area === "black" ? `${family}-expanded${i}${suffix}` : `${family}${suffix}`;
				writes.push(database.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,is_stone,summoned,area,channel,spawn_round)
    SELECT ?,name,?,?,max_hp,max_hp,0,variant,0,0,0,area,channel,1 FROM monsters WHERE id=? AND ${gate}`).bind(id, x, y, source.id));
			}
		}
	}
	writes.push(database.prepare("UPDATE world_state SET layout_version=23 WHERE id=1 AND layout_version<23"));
	await database.batch(writes);
}
//#endregion
//#region lib/weapon-evolution.ts
var EVOLUTION_DEFAULTS = {
	evolution_1_kills: 100,
	evolution_1_gems: 100,
	evolution_1_scrolls: 5,
	evolution_1_attack: 20,
	evolution_1_critical: 3,
	evolution_1_players: 5,
	evolution_2_kills: 350,
	evolution_2_gems: 250,
	evolution_2_scrolls: 25,
	evolution_2_attack: 50,
	evolution_2_critical: 5,
	evolution_2_players: 8,
	evolution_3_kills: 500,
	evolution_3_gems: 500,
	evolution_3_scrolls: 50,
	evolution_3_attack: 80,
	evolution_3_critical: 7,
	evolution_3_players: 12
};
function evolutionStage(level, settings = {}) {
	const stage = Math.max(1, Math.min(3, Math.floor(level)));
	const value = (field) => {
		const key = `evolution_${stage}_${field}`;
		return Math.max(0, Math.floor(Number(settings[key] ?? EVOLUTION_DEFAULTS[key])));
	};
	return {
		stage,
		kills: value("kills"),
		gems: value("gems"),
		scrolls: stage === 1 ? 0 : value("scrolls"),
		pearls: stage === 1 ? 5 : 0,
		attack: value("attack"),
		critical: value("critical"),
		players: value("players")
	};
}
function weaponEvolution(raw) {
	let entries = [];
	try {
		const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
		if (Array.isArray(parsed)) entries = parsed;
	} catch {}
	const value = (key, max) => Math.max(0, Math.min(max, Math.floor(Number(entries.find((e) => e.kind === "evolution_" + key)?.value) || 0)));
	return {
		level: value("level", 3),
		kills: value("kills", 1e9),
		attack: value("attack", 1e5),
		critical: value("critical", 80),
		players: value("players", 80)
	};
}
function evolveEnchantments(raw, stage) {
	const entries = JSON.parse(raw);
	return JSON.stringify([
		...entries.filter((e) => !e.kind.startsWith("evolution_") || e.kind === "evolution_kills"),
		{
			kind: "evolution_level",
			value: stage.stage
		},
		{
			kind: "evolution_attack",
			value: stage.attack
		},
		{
			kind: "evolution_critical",
			value: stage.critical
		},
		{
			kind: "evolution_players",
			value: stage.players
		}
	]);
}
var WEAPON_KILL_SQL = `UPDATE player_items SET enchantments=CASE
  WHEN EXISTS(SELECT 1 FROM json_each(enchantments) WHERE json_extract(value,'$.kind')='evolution_kills')
  THEN json_set(enchantments,(SELECT '$['||key||'].value' FROM json_each(enchantments) WHERE json_extract(value,'$.kind')='evolution_kills' LIMIT 1),
    MIN(1000000000,COALESCE((SELECT json_extract(value,'$.value') FROM json_each(enchantments) WHERE json_extract(value,'$.kind')='evolution_kills' LIMIT 1),0)+1))
  ELSE json_insert(enchantments,'$[#]',json_object('kind','evolution_kills','value',1)) END
  WHERE id=? AND player_id=? AND kind='weapon' AND equipped=1
  AND EXISTS(SELECT 1 FROM monsters WHERE id=? AND spawn_round=? AND hp>0 AND hp<=? AND is_stone=0)`;
//#endregion
//#region lib/forest-expansion.ts
var families = [
	"golge",
	"curuk",
	"yutan"
];
var names = {
	golge: "Gölge Kurdu",
	curuk: "Çürük Muhafız",
	yutan: "Öz Yutan"
};
var counters = {
	golge: 0,
	curuk: 0,
	yutan: 0
};
var EXPANDED_FOREST_SPAWNS = [
	300,
	650,
	1e3,
	1350,
	1700,
	2050
].flatMap((y) => [
	360,
	920,
	1480,
	2040,
	2600,
	3160
].filter((x) => !(x >= 1480 && x <= 2040 && y >= 650 && y <= 1350)).map((x) => ({
	x,
	y
}))).map((position, index) => {
	const family = families[index % families.length];
	const number = ++counters[family];
	const variant = number === 10 ? "katil" : number >= 7 ? "agresif" : "normal";
	return {
		...position,
		family,
		number,
		variant,
		name: names[family],
		profileKey: `forest.${family}.${variant}`,
		fallbackHp: family === "golge" ? 220 : family === "curuk" ? 340 : 480
	};
});
var FOREST_SPAWN_UPSERT_SQL = `INSERT INTO monsters
  (id,name,x,y,hp,max_hp,variant,area,channel,respawn_at,is_boss,is_stone,summoned)
  SELECT ?,?,?,?,COALESCE((SELECT max_hp FROM monster_combat_profiles WHERE profile_key=?),?),
    COALESCE((SELECT max_hp FROM monster_combat_profiles WHERE profile_key=?),?),?,'forest',?,0,0,0,0
  WHERE EXISTS (SELECT 1 FROM world_state WHERE id=1 AND layout_version<20)
  ON CONFLICT(id) DO UPDATE SET x=excluded.x,y=excluded.y
  WHERE monsters.area='forest' AND monsters.is_boss=0 AND monsters.is_stone=0 AND monsters.summoned=0
    AND EXISTS (SELECT 1 FROM world_state WHERE id=1 AND layout_version<20)`;
var MONSTER_BALANCE_HP_MAX = 1e7;
var MONSTER_BALANCE_DAMAGE_MAX = 1e6;
var AREAS = ["forest", "frozen"];
var FAMILIES = [
	"golge",
	"curuk",
	"yutan"
];
var VARIANTS = [
	"normal",
	"agresif",
	"katil"
];
var FAMILY_LABELS = {
	forest: {
		golge: "Gölge Kurdu",
		curuk: "Çürük Muhafız",
		yutan: "Öz Yutan"
	},
	frozen: {
		golge: "Kırağı Vaşağı",
		curuk: "Buzkök Golemi",
		yutan: "Tipi Kâhini"
	}
};
var VARIANT_LABELS = {
	normal: "Normal",
	agresif: "Agresif",
	katil: "Katil"
};
var FOREST_DEFAULTS = {
	golge: {
		normal: [220, 3],
		agresif: [374, 5],
		katil: [583, 6]
	},
	curuk: {
		normal: [340, 6],
		agresif: [578, 9],
		katil: [901, 13]
	},
	yutan: {
		normal: [480, 8],
		agresif: [816, 12],
		katil: [1272, 16]
	}
};
var FROZEN_DEFAULTS = FOREST_DEFAULTS;
var REGULAR_BALANCE_DEFINITIONS = AREAS.flatMap((area) => FAMILIES.flatMap((family) => VARIANTS.map((variant) => {
	const defaults = area === "forest" ? FOREST_DEFAULTS[family][variant] : FROZEN_DEFAULTS[family][variant];
	return {
		key: `${area}.${family}.${variant}`,
		area,
		family,
		variant,
		label: `${FAMILY_LABELS[area][family]} · ${VARIANT_LABELS[variant]}`,
		maxHp: defaults[0],
		hitDamage: defaults[1],
		updatedAt: 0
	};
})));
var BLACK_FAMILIES = [
	"golge",
	"curuk",
	"yutan",
	"golge",
	"curuk",
	"yutan",
	"golge",
	"curuk"
];
var BLACK_NAMES = [
	"Obsidyen Akrep",
	"Kumtaşı Golemi",
	"Mezar Muhafızı",
	"Kül Çakalı"
];
var MONSTER_BALANCE_DEFINITIONS = [
	...REGULAR_BALANCE_DEFINITIONS,
	...[
		[
			"golge",
			"Yosun Boynuz",
			460,
			8
		],
		[
			"curuk",
			"Kristal Kabuk",
			650,
			12
		],
		[
			"yutan",
			"Yaprak Ruhu",
			540,
			10
		]
	].map(([family, label, maxHp, hitDamage]) => ({
		key: `afk.${family}.normal`,
		area: "afk",
		family,
		variant: "normal",
		label,
		maxHp,
		hitDamage,
		updatedAt: 0
	})),
	...ANCIENT_FAMILIES.map((m) => ({
		key: `ancient.${m.family}.normal`,
		area: "ancient",
		family: m.family,
		variant: "normal",
		label: m.name,
		maxHp: m.hp,
		hitDamage: m.damage,
		updatedAt: 0
	})),
	...BLACK_FAMILIES.map((family, index) => ({
		key: `black.slot${index + 1}.katil`,
		area: "black",
		family: `slot${index + 1}`,
		variant: "katil",
		label: `${index + 1}. ${BLACK_NAMES[index % 4]} · Katil`,
		maxHp: 750,
		hitDamage: FOREST_DEFAULTS[family].katil[1],
		updatedAt: 0
	}))
];
var DEFINITION_BY_KEY = new Map(MONSTER_BALANCE_DEFINITIONS.map((profile) => [profile.key, profile]));
var LEGACY_DAMAGE_DEFAULTS = {
	golge: 7,
	curuk: 14,
	yutan: 18
};
var LEGACY_HP_SETTING = {
	golge: "shadow_wolf_hp",
	curuk: "rotten_guardian_hp",
	yutan: "essence_devourer_hp"
};
var LEGACY_HP_SCALE_SETTING = {
	agresif: "aggressive_variant_hp_scale",
	katil: "killer_variant_hp_scale"
};
var LEGACY_DAMAGE_SCALE_SETTING = {
	normal: "normal_variant_damage_scale",
	agresif: "aggressive_variant_damage_scale",
	katil: "killer_variant_damage_scale"
};
var LEGACY_SETTING_DEFAULTS = {
	shadow_wolf_hp: 220,
	rotten_guardian_hp: 340,
	essence_devourer_hp: 480,
	aggressive_variant_hp_scale: 1.7,
	killer_variant_hp_scale: 2.65,
	regular_monster_damage_scale: .45,
	normal_variant_damage_scale: 1,
	aggressive_variant_damage_scale: 1.45,
	killer_variant_damage_scale: 2
};
function legacySetting(settings, key) {
	const value = Number(settings?.[key]);
	return Number.isFinite(value) ? value : LEGACY_SETTING_DEFAULTS[key];
}
function legacyProfileValues(settings, definition) {
	if (definition.area === "ancient" || definition.area === "afk") return {
		maxHp: definition.maxHp,
		hitDamage: definition.hitDamage
	};
	const family = definition.area === "black" ? BLACK_FAMILIES[Number(definition.family.slice(4)) - 1] : definition.family;
	const hpBase = legacySetting(settings, LEGACY_HP_SETTING[family]);
	const hpScale = definition.variant === "normal" ? 1 : legacySetting(settings, LEGACY_HP_SCALE_SETTING[definition.variant]);
	const variantDamageScale = legacySetting(settings, LEGACY_DAMAGE_SCALE_SETTING[definition.variant]);
	const regularDamageScale = legacySetting(settings, "regular_monster_damage_scale");
	return {
		maxHp: Math.min(MONSTER_BALANCE_HP_MAX, Math.max(1, definition.area === "black" ? 750 : Math.round(hpBase * hpScale))),
		hitDamage: Math.min(MONSTER_BALANCE_DAMAGE_MAX, Math.max(1, Math.round(Math.round(LEGACY_DAMAGE_DEFAULTS[family] * variantDamageScale) * regularDamageScale)))
	};
}
var balanceInitialized = false;
async function ensureMonsterBalanceInitialized() {
	if (balanceInitialized) return;
	const database = env.DB;
	if (!database) return;
	await (async () => {
		const [configResult, profileResult] = await database.batch([database.prepare("SELECT id FROM monster_combat_config WHERE id = 1"), database.prepare("SELECT profile_key FROM all_monster_combat_profiles")]);
		const storedKeys = new Set(profileResult.results.flatMap((row) => isMonsterBalanceKey(row.profile_key) ? [row.profile_key] : []));
		const hasConfig = Boolean(configResult.results[0]);
		const missing = MONSTER_BALANCE_DEFINITIONS.filter((definition) => !storedKeys.has(definition.key));
		if (!hasConfig || missing.length) {
			const settings = missing.length ? await database.prepare(`SELECT shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp,
                aggressive_variant_hp_scale, killer_variant_hp_scale,
                regular_monster_damage_scale, normal_variant_damage_scale,
                aggressive_variant_damage_scale, killer_variant_damage_scale
         FROM game_settings WHERE id = 1`).first() : null;
			await database.batch([database.prepare("INSERT OR IGNORE INTO monster_combat_config (id, revision, update_token, updated_at) VALUES (1, 0, '', 0)"), ...missing.map((definition) => {
				const values = legacyProfileValues(settings, definition);
				return database.prepare(`INSERT OR IGNORE INTO ${definition.area === "afk" ? "afk_monster_combat_profiles" : definition.area === "ancient" ? "ancient_monster_combat_profiles" : "monster_combat_profiles"}
               (profile_key, area, family, variant, max_hp, hit_damage, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 0)`).bind(definition.key, definition.area, definition.family, definition.variant, values.maxHp, values.hitDamage);
			})]);
		}
		balanceInitialized = true;
	})();
}
function isMonsterBalanceKey(value) {
	return typeof value === "string" && DEFINITION_BY_KEY.has(value);
}
function monsterBalanceKeyFor(monster) {
	if (monster.summoned || monster.is_boss || monster.is_stone) return null;
	if (monster.area === "black") {
		const slot = /^(?:golge|curuk|yutan)(?:-pack[23])?-black-c[1-3]-([1-8])$/.exec(monster.id)?.[1];
		return slot && monster.variant === "katil" ? `black.slot${slot}.katil` : null;
	}
	if (monster.area !== "ancient" && monster.area !== "afk" && monster.area !== "forest" && monster.area !== "frozen") return null;
	const family = monster.id.startsWith("golge-") ? "golge" : monster.id.startsWith("curuk-") ? "curuk" : monster.id.startsWith("yutan-") ? "yutan" : null;
	const variant = monster.variant === "normal" || monster.variant === "agresif" || monster.variant === "katil" ? monster.variant : null;
	if (monster.area === "ancient") return family && variant === "normal" ? `ancient.${family}.normal` : null;
	if (monster.area === "afk") return family && variant === "normal" ? `afk.${family}.normal` : null;
	return family && variant ? `${monster.area}.${family}.${variant}` : null;
}
({ ...COMMON_WORLD });
var BOSS_SPAWN = {
	x: 1200,
	y: 690
};
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
function isBlackStoneBoss476(id){return id==='stone-boss-black-c1'||id==='stone-boss-black-c2'||id==='stone-boss-black-c3';}
var FROZEN_BOSS_ID = "frozen-boss-1";
var ANCIENT_BOSS_ID = "ancient-boss-1";
var FROZEN_WATER_ID_PREFIX = "frozen-water-c";
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
var DEFAULT_SETTINGS = {
	...ENCHANT_TIER_DEFAULTS,
	expansion65_enabled: 0,
	expansion65_preview_player_id: "",
	expansion65_revision: 0,
	ancient_golge_xp_reward: 400,
	ancient_curuk_xp_reward: 600,
	ancient_yutan_xp_reward: 800,
	ancient_monster_respawn_seconds: 25,
	beta_starts_at: 0,
	beta_ends_at: 0,
	...EVOLUTION_DEFAULTS,
	health_decay_per_second: .003,
	donation_health_per_essence: .02,
	boss_hp: 18e3,
	boss_respawn_seconds: 600,
	boss_duration_seconds: 300,
	regular_monster_damage_scale: .45,
	normal_variant_damage_scale: 1,
	aggressive_variant_damage_scale: 1.45,
	killer_variant_damage_scale: 2,
	boss_damage_scale: .3,
	shadow_wolf_hp: 220,
	rotten_guardian_hp: 340,
	essence_devourer_hp: 480,
	aggressive_variant_hp_scale: 1.7,
	killer_variant_hp_scale: 2.65,
	guardian_reward_gems: 20,
	guardian_reward_seconds: 3600,
	potion_essence_cost: 15,
	exchange_essence_cost: 100,
	exchange_gem_reward: 20,
	skill_upgrade_gem_cost: 5,
	xp_per_level: 125,
	shadow_wolf_xp_reward: 34,
	rotten_guardian_xp_reward: 46,
	essence_devourer_xp_reward: 58,
	aggressive_variant_xp_reward: 62,
	killer_variant_xp_reward: 95,
	frozen_shadow_wolf_xp_reward: 34,
	frozen_rotten_guardian_xp_reward: 46,
	frozen_essence_devourer_xp_reward: 58,
	frozen_aggressive_variant_xp_reward: 62,
	frozen_killer_variant_xp_reward: 95,
	black_monster_xp_reward: 95,
	afk_island_enabled: 0,
	afk_island_xp_reward: 10,
	afk_island_respawn_seconds: 12,
	sinsi_shadow_wolf_xp_reward: 62,
	sinsi_guardian_xp_reward: 62,
	sinsi_devourer_xp_reward: 95,
	sinsi_stone_xp_reward: 0,
	boss_xp_reward: 300,
	xp_base_cost: 50,
	xp_growth_per_level: 10,
	skill_two_unlock_level: 5,
	skill_three_unlock_level: 30,
	skill_two_cooldown_ms: 1e4,
	skill_three_cooldown_ms: 12e3,
	skill_damage_scale: .72,
	skill_one_multiplier: 1,
	skill_two_multiplier: 1.3,
	skill_three_multiplier: 1.75,
	skill_upgrade_damage_per_level: .04,
	boss_guaranteed_white_drops: 0,
	starter_weapon_power: 5,
	guardian_base_attack: 24,
	hunter_base_attack: 25,
	arcanist_base_attack: 27,
	base_critical_chance: .11,
	third_skill_critical_bonus: .11,
	critical_damage_multiplier: 1.45,
	wing_gem_cost: 100000,
	wing_attack_bonus: 30,
	wing_defense_bonus: 50,
	wing_critical_chance: .15,
	regular_blue_chance: .15,
	regular_orange_chance: .01,
	regular_red_chance: .001,
	regular_item_drop_chance: .71,
	regular_armor_chance: .5,
	boss_blue_chance: .2,
	boss_orange_chance: .03,
	boss_red_chance: .01,
	boss_armor_chance: .5,
	item_sale_white: 2,
	item_sale_blue: 8,
	item_sale_orange: 30,
	item_sale_red: 100,
	new_year_mode: 1,
	halloween_mode: 0,
	seasonal_themes_json: "{}",
	white_weapon_power_min: 5,
	white_weapon_power_max: 12,
	white_armor_power_min: 5,
	white_armor_power_max: 12,
	blue_weapon_power_min: 15,
	blue_weapon_power_max: 25,
	blue_armor_power_min: 15,
	blue_armor_power_max: 25,
	orange_weapon_power_min: 30,
	orange_weapon_power_max: 45,
	orange_armor_power_min: 30,
	orange_armor_power_max: 45,
	red_weapon_power_min: 60,
	red_weapon_power_max: 85,
	red_armor_power_min: 60,
	red_armor_power_max: 85,
	fishing_rod_cost: 100,
	fish_sokan_value: 1,
	fish_levrek_value: 3,
	fish_zargana_value: 5,
	fish_sokan_weight: 55,
	fish_levrek_weight: 30,
	fish_zargana_weight: 15,
	fishing_pearl_chance: .03,
	blacksmith_dust_cost: 250,
	blacksmith_pearl_cost: 25,
	blacksmith_gem_cost: 5e3,
	guild_create_level: 30,
	guild_create_gems: 500,
	stone_art_dust_cost: 20,
	stone_art_book_cost: 5,
	stone_art_gem_cost: 100,
	unique_weapon_power: 180,
	unique_armor_power: 150,
	channel_capacity: 25,
	sinsi_stone_unlock_level: 50,
	sinsi_stone_hp: 12e3,
	sinsi_stone_respawn_seconds: 180,
	sinsi_stone_wave_count: 3,
	sinsi_stone_summon_hp: 650,
	sinsi_stone_summon_damage_scale: .8,
	sinsi_stone_essence_min: 18,
	sinsi_stone_essence_max: 32,
	sinsi_stone_gear_drops: 1,
	sinsi_stone_dust_reward: 3,
	sinsi_stone_armor_chance: .5,
	sinsi_stone_blue_chance: .32,
	sinsi_stone_orange_chance: .06,
	sinsi_stone_red_chance: .01,
	enchant_item_chance: .72,
	enchant_one_chance: .15,
	enchant_two_chance: .45,
	enchant_three_chance: .36,
	enchant_four_chance: .04,
	enchant_forest_power_weight: 1,
	enchant_frozen_power_weight: 1,
	enchant_fire_weight: 1,
	enchant_ice_weight: 1,
	enchant_sword_defense_weight: 1,
	enchant_arrow_defense_weight: 1,
	enchant_magic_defense_weight: 1,
	enchant_strong_players_weight: .7,
	enchant_resistant_players_weight: .7,
	enchant_critical_weight: .8,
	enchant_attack_speed_weight: .8,enchant_cast_speed_weight: .8,
	enchant_life_steal_weight: .8,
	enchant_life_steal_min: 1,
	enchant_life_steal_max: 15,
	enchant_attack_block_weight: .7,
	enchant_attack_block_min: 1,
	enchant_attack_block_max: 15,
	enchant_hp_weight: 1,
	enchant_hp_tier_one: 60,
	enchant_hp_tier_two: 120,
	enchant_hp_tier_three: 180,
	enchant_fire_min: 5,
	enchant_fire_max: 10,
	enchant_ice_min: 5,
	enchant_ice_max: 10,
	enchant_sword_defense_min: 4,
	enchant_sword_defense_max: 12,
	enchant_arrow_defense_min: 4,
	enchant_arrow_defense_max: 12,
	enchant_magic_defense_min: 4,
	enchant_magic_defense_max: 12,
	enchant_strong_players_min: 4,
	enchant_strong_players_max: 12,
	enchant_resistant_players_min: 4,
	enchant_resistant_players_max: 12,
	enchant_critical_min: 2,
	enchant_critical_max: 6,
	enchant_attack_speed_min: 5,
	enchant_attack_speed_max: 7,
	boss_fire_interval_seconds: 7,
	boss_fire_damage_multiplier: 1.2,
	forest_monster_respawn_seconds: 18,
	frozen_monster_respawn_seconds: 18,
	black_monster_respawn_seconds: 18,
	player_max_hp: 100,
	rest_regen_percent: 4,
	rest_regen_combat_delay_seconds: 5,
	rest_regen_still_seconds: 2,
	monster_rest_regen_percent: 3,
	monster_rest_regen_combat_delay_seconds: 5,
	elemental_tick_count: 4,
	elemental_tick_interval_ms: 320,
	pvp_kill_reward_gems: 3,
	pvp_death_loss_gems: 1,
	pvp_respawn_seconds: 3,
	arena_1v1_reward_gems: 25,
	arena_2v2_reward_gems: 35,
	arena_3v3_reward_gems: 50,
	arena_5v5_reward_gems: 75,
	frozen_zone_enabled: 1,
	black_stone_boss_enabled:1,black_stone_boss_hp:26000,black_stone_boss_damage_scale:.42,black_stone_boss_respawn_seconds:600,black_stone_boss_xp_reward:500,black_stone_boss_reward_gems:12,
	frozen_boss_enabled: 1,
	frozen_boss_hp: 26e3,
	frozen_boss_damage_scale: .42,
	frozen_boss_respawn_seconds: 600,
	frozen_boss_xp_reward: 500,
	frozen_boss_reward_gems: 12,
	ancient_boss_enabled: 1,
	ancient_boss_hp: 26e3,
	ancient_boss_damage_scale: .42,
	ancient_boss_respawn_seconds: 2400,
	ancient_boss_xp_reward: 500,
	ancient_boss_reward_gems: 12,
	ancient_boss_purple_chance: .001,
	ancient_normal_purple_chance: .001,
	world_boss_purple_chance: 5e-4,
	frozen_boss_item_drop_chance: .75,
	frozen_boss_item_drop_count: 1,
	world_boss_stone_book_chance: .4,
	world_boss_stone_book_min: 1,
	world_boss_stone_book_max: 1,
	world_boss_evolution_scroll_chance: .4,
	world_boss_evolution_scroll_min: 1,
	world_boss_evolution_scroll_max: 1,
	frozen_boss_stone_book_chance: .3,
	frozen_boss_stone_book_min: 1,
	frozen_boss_stone_book_max: 1,
	frozen_boss_evolution_scroll_chance: .3,
	frozen_boss_evolution_scroll_min: 1,
	frozen_boss_evolution_scroll_max: 1,
	frozen_water_stone_book_chance: .15,
	frozen_water_stone_book_min: 1,
	frozen_water_stone_book_max: 1,
	frozen_water_evolution_scroll_chance: .15,
	frozen_water_evolution_scroll_min: 1,
	frozen_water_evolution_scroll_max: 1,
	frozen_water_enabled: 1,
	frozen_water_hp: 9e3,
	frozen_water_damage_scale: .28,
	frozen_water_respawn_seconds: 180,
	frozen_water_xp_reward: 180,
	frozen_water_reward_gems: 4,
	frozen_water_item_drop_chance: .35,
	frozen_water_item_drop_count: 1
};
var GAME_SETTINGS_SQL = `SELECT expansion65_enabled, expansion65_preview_player_id, expansion65_revision, events_json, beta_starts_at, beta_ends_at, health_decay_per_second, donation_health_per_essence, boss_hp, boss_respawn_seconds,
  boss_duration_seconds, regular_monster_damage_scale, normal_variant_damage_scale,
  aggressive_variant_damage_scale, killer_variant_damage_scale, boss_damage_scale,
  shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp, aggressive_variant_hp_scale, killer_variant_hp_scale,
  guardian_reward_gems, guardian_reward_seconds,
  potion_essence_cost, exchange_essence_cost, exchange_gem_reward,
  skill_upgrade_gem_cost, xp_per_level,
  xp_curve_json, xp_base_cost, xp_growth_per_level, skill_two_unlock_level, skill_three_unlock_level,
  skill_two_cooldown_ms, skill_three_cooldown_ms, skill_damage_scale,
  skill_one_multiplier, skill_two_multiplier, skill_three_multiplier, skill_upgrade_damage_per_level,
  starter_weapon_power, guardian_base_attack, hunter_base_attack, arcanist_base_attack,
  base_critical_chance, third_skill_critical_bonus, critical_damage_multiplier,
  wing_gem_cost, wing_attack_bonus, wing_defense_bonus, wing_critical_chance,
  boss_guaranteed_white_drops, regular_blue_chance, regular_orange_chance, regular_red_chance,
  regular_item_drop_chance, regular_armor_chance, boss_blue_chance,
  boss_orange_chance, boss_red_chance, boss_armor_chance, item_sale_white, item_sale_blue, item_sale_orange, item_sale_red,
  white_weapon_power_min, white_weapon_power_max, white_armor_power_min, white_armor_power_max,
  blue_weapon_power_min, blue_weapon_power_max, blue_armor_power_min, blue_armor_power_max,
  orange_weapon_power_min, orange_weapon_power_max, orange_armor_power_min, orange_armor_power_max,
  red_weapon_power_min, red_weapon_power_max, red_armor_power_min, red_armor_power_max,
  new_year_mode, halloween_mode, seasonal_themes_json,
  fishing_rod_cost, fish_sokan_value, fish_levrek_value, fish_zargana_value,
  fish_sokan_weight, fish_levrek_weight, fish_zargana_weight,
  channel_capacity, sinsi_stone_unlock_level, sinsi_stone_hp, sinsi_stone_respawn_seconds,
  sinsi_stone_wave_count, sinsi_stone_summon_hp, sinsi_stone_summon_damage_scale,
  sinsi_stone_essence_min, sinsi_stone_essence_max, sinsi_stone_gear_drops, sinsi_stone_dust_reward,
  sinsi_stone_armor_chance, sinsi_stone_blue_chance, sinsi_stone_orange_chance,
  sinsi_stone_red_chance FROM game_settings WHERE id = 1`;
var ECONOMY_SETTINGS_SQL = `SELECT * FROM economy_settings WHERE id = 1`;
var COMBAT_SETTINGS_SQL = `SELECT ${ENCHANT_TIER_KEYS.filter((key) => !key.startsWith("enchant_hp_")).join(", ")}, afk_island_enabled,afk_island_xp_reward,afk_island_respawn_seconds,ancient_golge_xp_reward,ancient_curuk_xp_reward,ancient_yutan_xp_reward,ancient_monster_respawn_seconds,ancient_boss_enabled,ancient_boss_hp,ancient_boss_damage_scale,ancient_boss_respawn_seconds,ancient_boss_xp_reward,ancient_boss_reward_gems,black_stone_boss_enabled,black_stone_boss_hp,black_stone_boss_damage_scale,black_stone_boss_respawn_seconds,black_stone_boss_xp_reward,black_stone_boss_reward_gems,ancient_boss_purple_chance,ancient_normal_purple_chance,world_boss_purple_chance, boss_fire_interval_seconds, boss_fire_damage_multiplier, forest_monster_respawn_seconds, frozen_monster_respawn_seconds, black_monster_respawn_seconds, player_max_hp, rest_regen_percent, rest_regen_combat_delay_seconds, rest_regen_still_seconds, monster_rest_regen_percent, monster_rest_regen_combat_delay_seconds,
  shadow_wolf_xp_reward, rotten_guardian_xp_reward, essence_devourer_xp_reward,
  aggressive_variant_xp_reward, killer_variant_xp_reward,
  frozen_shadow_wolf_xp_reward, frozen_rotten_guardian_xp_reward, frozen_essence_devourer_xp_reward,
  frozen_aggressive_variant_xp_reward, frozen_killer_variant_xp_reward, black_monster_xp_reward,
  sinsi_shadow_wolf_xp_reward, sinsi_guardian_xp_reward, sinsi_devourer_xp_reward,
  sinsi_stone_xp_reward, boss_xp_reward,
  frozen_zone_enabled, frozen_boss_enabled, frozen_boss_hp, frozen_boss_damage_scale,
  frozen_boss_respawn_seconds, frozen_boss_xp_reward, frozen_boss_reward_gems,
  frozen_boss_item_drop_chance, frozen_boss_item_drop_count,
  world_boss_stone_book_chance, world_boss_stone_book_min, world_boss_stone_book_max,
  world_boss_evolution_scroll_chance, world_boss_evolution_scroll_min, world_boss_evolution_scroll_max,
  frozen_boss_stone_book_chance, frozen_boss_stone_book_min, frozen_boss_stone_book_max,
  frozen_boss_evolution_scroll_chance, frozen_boss_evolution_scroll_min, frozen_boss_evolution_scroll_max,
  frozen_water_stone_book_chance, frozen_water_stone_book_min, frozen_water_stone_book_max,
  frozen_water_evolution_scroll_chance, frozen_water_evolution_scroll_min, frozen_water_evolution_scroll_max,
  frozen_water_enabled, frozen_water_hp, frozen_water_damage_scale, frozen_water_respawn_seconds,
  frozen_water_xp_reward, frozen_water_reward_gems, frozen_water_item_drop_chance, frozen_water_item_drop_count,
  enchant_forest_power_weight, enchant_frozen_power_weight,
  enchant_item_chance, enchant_one_chance, enchant_two_chance, enchant_three_chance, enchant_four_chance, enchant_fire_weight, enchant_ice_weight,
  enchant_sword_defense_weight, enchant_arrow_defense_weight, enchant_magic_defense_weight,
  enchant_strong_players_weight, enchant_resistant_players_weight, enchant_critical_weight, enchant_attack_speed_weight, enchant_cast_speed_weight,
  enchant_life_steal_weight, enchant_life_steal_min, enchant_life_steal_max,
  enchant_attack_block_weight, enchant_attack_block_min, enchant_attack_block_max,
  enchant_hp_weight, enchant_hp_tier_one, enchant_hp_tier_two, enchant_hp_tier_three, enchant_hp_tier_four, enchant_hp_tier_five,
  enchant_fire_min, enchant_fire_max, enchant_ice_min, enchant_ice_max,
  enchant_sword_defense_min, enchant_sword_defense_max, enchant_arrow_defense_min, enchant_arrow_defense_max,
  enchant_magic_defense_min, enchant_magic_defense_max, enchant_strong_players_min, enchant_strong_players_max,
  enchant_resistant_players_min, enchant_resistant_players_max, enchant_critical_min, enchant_critical_max,
  enchant_attack_speed_min, enchant_attack_speed_max,
  elemental_tick_count, elemental_tick_interval_ms, pvp_kill_reward_gems, pvp_death_loss_gems,
  pvp_respawn_seconds, arena_1v1_reward_gems, arena_2v2_reward_gems, arena_3v3_reward_gems, arena_5v5_reward_gems
  FROM combat_settings WHERE id = 1`;
function db() {
	if (!env.DB) throw new Error("Dünya veritabanı bağlı değil.");
	return env.DB;
}
async function repairFrozenLevelInvariant(database, playerId, accountId, access, nowMs = Date.now()) {
	if (!playerId || access?.area !== "frozen" || access.level >= 20) return false;
	const repaired = await database.prepare(`UPDATE players SET area = 'bazaar', arena_match_id = '', x = ?, y = ?,
       movement_checked_at_ms = ?, movement_debt_ms = 0,
       motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1,
       realtime_scope_version = realtime_scope_version + 1, combat_lock_until_ms = 0
     WHERE id = ? AND account_id = ? AND area = 'frozen' AND level < ?
     RETURNING id`).bind(BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, nowMs, playerId, accountId, 20).first();
	return Boolean(repaired);
}
function nowSeconds$1() {
	return Math.floor(Date.now() / 1e3);
}
function clamp$1(value, min, max) {
	return Math.max(min, Math.min(max, value));
}
var GAME_SETTINGS_CACHE_MS = 5e3;
var gameSettingsCache = null;
var gameSettingsCacheGeneration = 0;
var nativeSettingsReads = /* @__PURE__ */ new WeakMap();
function invalidateGameSettingsCache() {
	gameSettingsCache = null;
	gameSettingsCacheGeneration += 1;
}
async function readGameSettings(database) {
	const [game, economy, combat] = await Promise.all([
		database.prepare(GAME_SETTINGS_SQL).first(),
		database.prepare(ECONOMY_SETTINGS_SQL).first(),
		database.prepare(COMBAT_SETTINGS_SQL).first()
	]);
	const value = {
		...DEFAULT_SETTINGS,
		...game ?? {},
		...economy ?? {},
		...combat ?? {},
		...globalThis.__colPremium?.forestPolicy?.() ?? {
			forest_after_level: 30,
			forest_reduction_percent: 30
		}
	};
	value.channel_capacity = Math.max(1, Math.min(30, Math.round(Number(value.channel_capacity) || 15)));
	return value;
}
async function getGameSettings() {
	const now = Date.now();
	const generation = gameSettingsCacheGeneration;
	if (env.CORE_RUNTIME === "vds") {
		const database = db();
		const current = nativeSettingsReads.get(database);
		if (current?.generation === generation) {
			if (current.value && current.expiresAt > now) return current.value;
			if (current.promise) return await current.promise;
		}
		const read = {
			generation,
			expiresAt: 0
		};
		nativeSettingsReads.set(database, read);
		read.promise = readGameSettings(database).then((value) => {
			if (gameSettingsCacheGeneration === generation && nativeSettingsReads.get(database) === read) {
				read.value = value;
				read.expiresAt = Date.now() + GAME_SETTINGS_CACHE_MS;
			}
			return value;
		}).finally(() => {
			if (nativeSettingsReads.get(database) === read) {
				read.promise = void 0;
				if (!read.value) nativeSettingsReads.delete(database);
			}
		});
		return await read.promise;
	}
	if (gameSettingsCache && gameSettingsCache.expiresAt > now) return gameSettingsCache.value;
	const value = await readGameSettings(db());
	if (gameSettingsCacheGeneration === generation) gameSettingsCache = {
		value,
		expiresAt: Date.now() + GAME_SETTINGS_CACHE_MS
	};
	return value;
}
var seeds = [
	[
		"golge-1",
		"Gölge Kurdu",
		460,
		700,
		220
	],
	[
		"golge-2",
		"Gölge Kurdu",
		1940,
		700,
		220
	],
	[
		"golge-3",
		"Gölge Kurdu",
		420,
		1060,
		220
	],
	[
		"golge-4",
		"Gölge Kurdu",
		1980,
		1060,
		220
	],
	[
		"curuk-1",
		"Çürük Muhafız",
		760,
		820,
		340
	],
	[
		"curuk-2",
		"Çürük Muhafız",
		1640,
		820,
		340
	],
	[
		"curuk-3",
		"Çürük Muhafız",
		700,
		1250,
		340
	],
	[
		"curuk-4",
		"Çürük Muhafız",
		1700,
		1250,
		340
	],
	[
		"yutan-1",
		"Öz Yutan",
		1040,
		1280,
		480
	],
	[
		"yutan-2",
		"Öz Yutan",
		1360,
		1280,
		480
	]
];
var forestSpawnSeeds = [
	...[
		[460, 700],
		[1940, 700],
		[420, 1060],
		[1980, 1060]
	].map(([x, y], index) => ({
		prefix: "golge",
		name: "Gölge Kurdu",
		x,
		y,
		hp: 220,
		index: index + 1
	})),
	...[
		[760, 820],
		[1640, 820],
		[700, 1250],
		[1700, 1250]
	].map(([x, y], index) => ({
		prefix: "curuk",
		name: "Çürük Muhafız",
		x,
		y,
		hp: 340,
		index: index + 1
	})),
	...[[1040, 1280], [1360, 1280]].map(([x, y], index) => ({
		prefix: "yutan",
		name: "Öz Yutan",
		x,
		y,
		hp: 480,
		index: index + 1
	}))
];
var frozenSpawnSeeds = [
	...[
		[300, 250],
		[850, 250],
		[1400, 240],
		[1980, 260],
		[420, 720],
		[980, 690],
		[2210, 740],
		[3050, 840]
	].map(([x, y], index) => ({
		prefix: "golge",
		name: "Kırağı Vaşağı",
		x,
		y,
		index: index + 1
	})),
	...[
		[280, 1200],
		[800, 1170],
		[2150, 1220],
		[2720, 1190],
		[3100, 1320],
		[430, 1670]
	].map(([x, y], index) => ({
		prefix: "curuk",
		name: "Buzkök Golemi",
		x,
		y,
		index: index + 1
	})),
	...[
		[980, 1600],
		[2050, 1640],
		[2600, 1640],
		[3060, 1770]
	].map(([x, y], index) => ({
		prefix: "yutan",
		name: "Tipi Kâhini",
		x,
		y,
		index: index + 1
	}))
];
var sinsiStoneSeeds = [
	[650, 315],
	[1190, 330],
	[1775, 340],
	[320, 670],
	[1060, 720],
	[1980, 690],
	[410, 1070],
	[1830, 1115]
];
var worldSeeded = false;
var worldSeedJob = null;
async function seedWorld() {
	const database = db();
	const now = nowSeconds$1();
	let existingState = await database.prepare(`SELECT layout_version, guardian_reward_at,
       COALESCE((SELECT guardian_reward_seconds FROM game_settings WHERE id = 1), ?) AS guardian_reward_seconds
     FROM world_state WHERE id = 1`).bind(DEFAULT_SETTINGS.guardian_reward_seconds).first();
	if (existingState && !await database.prepare("SELECT id FROM monsters LIMIT 1").first()) {
		await database.prepare("UPDATE world_state SET layout_version=0 WHERE id=1 AND NOT EXISTS(SELECT 1 FROM monsters)").run();
		existingState = {
			...existingState,
			...await database.prepare("SELECT layout_version FROM world_state WHERE id=1").first()
		};
	}
	if ((existingState?.layout_version ?? 0) >= 24) {
		if (Number(existingState?.guardian_reward_at ?? 0) <= 0) await database.prepare("UPDATE world_state SET guardian_reward_at = ? WHERE id = 1 AND guardian_reward_at <= 0").bind(now + (existingState?.guardian_reward_seconds ?? DEFAULT_SETTINGS.guardian_reward_seconds)).run();
		return;
	}
	const statements = [
		database.prepare("INSERT OR IGNORE INTO world_state (id, health, updated_at, layout_version, guardian_reward_at) VALUES (1, 64, ?, 3, ?)").bind(now, now + DEFAULT_SETTINGS.guardian_reward_seconds),
		...existingState && existingState.layout_version >= 11 ? [] : seeds.map(([id, name, x, y, hp]) => database.prepare(`INSERT OR IGNORE INTO monsters (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss)
       SELECT ?, ?, ?, ?, ?, ?, 0, 'normal', 0
       WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 11)`).bind(id, name, x, y, hp, hp)),
		database.prepare("INSERT OR IGNORE INTO monsters (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round) VALUES ('dunya-bosu-1', 'Çürümenin Kadimi', ?, ?, 0, 18000, ?, 'boss', 1, 0, 0)").bind(BOSS_SPAWN.x, BOSS_SPAWN.y, now + 600)
	];
	await database.batch(statements);
	const state = existingState ?? await database.prepare("SELECT layout_version FROM world_state WHERE id = 1").first();
	if ((state?.layout_version ?? 1) < 2) await database.batch([
		...seeds.map(([id, , x, y]) => database.prepare("UPDATE monsters SET x = ?, y = ? WHERE id = ?").bind(x, y, id)),
		database.prepare("UPDATE players SET x = 1200, y = 900 WHERE x < 100 OR x > 2300 OR y < 100 OR y > 1400"),
		database.prepare("UPDATE world_state SET layout_version = 2 WHERE id = 1")
	]);
	if ((state?.layout_version ?? 1) < 3) await database.batch([database.prepare("UPDATE monsters SET hp = 0, max_hp = 18000, respawn_at = ?, despawn_at = 0 WHERE is_boss = 1 AND loadlab_run_id=''").bind(now + 30), database.prepare("UPDATE world_state SET layout_version = 3 WHERE id = 1")]);
	if ((state?.layout_version ?? 1) < 4) await database.batch([
		...seeds.map(([id, , , , hp]) => database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, spawn_round = spawn_round + 1 WHERE id = ? AND is_boss = 0").bind(hp, hp, id)),
		database.prepare("DELETE FROM monster_participants"),
		database.prepare("UPDATE world_state SET layout_version = 4 WHERE id = 1")
	]);
	if ((state?.layout_version ?? 1) < 5) await database.batch([
		...seeds.map(([id, , x, y]) => database.prepare("UPDATE monsters SET x = ?, y = ?, spawn_round = spawn_round + 1 WHERE id = ? AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 5)").bind(x, y, id)),
		database.prepare("UPDATE monsters SET x = 1900, y = 900, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND loadlab_run_id='' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 5)"),
		database.prepare("DELETE FROM monster_participants WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 5)"),
		database.prepare("UPDATE world_state SET layout_version = 5 WHERE id = 1")
	]);
	if ((state?.layout_version ?? 1) < 6) {
		const cleanBossRespawn = nowSeconds$1() + 10;
		await database.batch([
			database.prepare("UPDATE monsters SET x = ?, y = ?, hp = 0, respawn_at = ?, despawn_at = 0, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND loadlab_run_id='' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 6)").bind(BOSS_SPAWN.x, BOSS_SPAWN.y, cleanBossRespawn),
			database.prepare("DELETE FROM boss_participants WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 6)"),
			database.prepare("DELETE FROM monster_participants WHERE monster_id = 'dunya-bosu-1' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 6)"),
			database.prepare("UPDATE world_state SET layout_version = 6 WHERE id = 1")
		]);
	}
	if ((state?.layout_version ?? 1) < 7) {
		const sanctumBossRespawn = nowSeconds$1() + 10;
		await database.batch([
			database.prepare("UPDATE monsters SET x = ?, y = ?, hp = 0, respawn_at = ?, despawn_at = 0, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND loadlab_run_id='' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 7)").bind(BOSS_SPAWN.x, BOSS_SPAWN.y, sanctumBossRespawn),
			database.prepare("DELETE FROM boss_participants WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 7)"),
			database.prepare("DELETE FROM monster_participants WHERE monster_id = 'dunya-bosu-1' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 7)"),
			database.prepare("UPDATE world_state SET layout_version = 7 WHERE id = 1")
		]);
	}
	if ((state?.layout_version ?? 1) < 8) {
		const stoneHp = (await database.prepare("SELECT sinsi_stone_hp FROM game_settings WHERE id = 1").first())?.sinsi_stone_hp ?? DEFAULT_SETTINGS.sinsi_stone_hp;
		await database.batch([
			database.prepare("UPDATE monsters SET area = CASE WHEN is_boss = 1 THEN 'sanctum' ELSE 'forest' END, channel = 0 WHERE area NOT IN ('ancient','afk','rune') AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 8)"),
			...Array.from({ length: 3 }, (_, channelIndex) => sinsiStoneSeeds.map(([x, y], stoneIndex) => database.prepare(`INSERT OR IGNORE INTO monsters
            (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
           VALUES (?, ?, ?, ?, ?, ?, 0, 'stone', 0, 0, 1, 'sinsi', ?, 1, 0, 0)`).bind(`sinsi-tasi-c${channelIndex + 1}-${stoneIndex + 1}`, `Sinsi Taş ${stoneIndex + 1}`, x, y, stoneHp, stoneHp, channelIndex + 1))).flat(),
			database.prepare("UPDATE world_state SET layout_version = 8 WHERE id = 1")
		]);
	}
	if ((state?.layout_version ?? 1) < 9) {
		const stoneHp = (await database.prepare("SELECT sinsi_stone_hp FROM game_settings WHERE id = 1").first())?.sinsi_stone_hp ?? DEFAULT_SETTINGS.sinsi_stone_hp;
		await database.batch([...Array.from({ length: 3 }, (_, channelIndex) => sinsiStoneSeeds.map(([x, y], stoneIndex) => database.prepare(`INSERT INTO monsters
            (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
           VALUES (?, ?, ?, ?, ?, ?, 0, 'stone', 0, 0, 1, 'sinsi', ?, 1, 0, 0)
           ON CONFLICT(id) DO UPDATE SET x=excluded.x, y=excluded.y`).bind(`sinsi-tasi-c${channelIndex + 1}-${stoneIndex + 1}`, `Sinsi Taş ${stoneIndex + 1}`, x, y, stoneHp, stoneHp, channelIndex + 1))).flat(), database.prepare("UPDATE world_state SET layout_version = 9 WHERE id = 1")]);
	}
	if ((state?.layout_version ?? 1) < 10) await database.batch([
		database.prepare("DELETE FROM monsters WHERE summoned = 1 AND area = 'sinsi'"),
		database.prepare("DELETE FROM monster_participants WHERE monster_id LIKE 'sinsi-tasi-%' OR monster_id LIKE '%-sinsi-%'"),
		...Array.from({ length: 3 }, (_, channelIndex) => sinsiStoneSeeds.map(([x, y], stoneIndex) => database.prepare(`UPDATE monsters SET x = ?, y = ?, spawn_round = spawn_round + 1
           WHERE id = ? AND is_stone = 1 AND channel = ?`).bind(x, y, `sinsi-tasi-c${channelIndex + 1}-${stoneIndex + 1}`, channelIndex + 1))).flat(),
		database.prepare("UPDATE world_state SET layout_version = 10 WHERE id = 1")
	]);
	if ((state?.layout_version ?? 1) < 11) {
		const configuredHp = await database.prepare("SELECT shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp FROM game_settings WHERE id = 1").first();
		const forestHp = {
			golge: configuredHp?.shadow_wolf_hp ?? DEFAULT_SETTINGS.shadow_wolf_hp,
			curuk: configuredHp?.rotten_guardian_hp ?? DEFAULT_SETTINGS.rotten_guardian_hp,
			yutan: configuredHp?.essence_devourer_hp ?? DEFAULT_SETTINGS.essence_devourer_hp
		};
		await database.batch([
			database.prepare("DELETE FROM monsters WHERE area = 'forest' AND is_boss = 0 AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 11)"),
			...Array.from({ length: 3 }, (_, channelIndex) => forestSpawnSeeds.map((seed) => database.prepare(`INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         SELECT ?, ?, ?, ?, ?, ?, 0, 'normal', 0, 0, 1, 'forest', ?, 0, 0, 0
         WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 11)`).bind(`${seed.prefix}-c${channelIndex + 1}-${seed.index}`, seed.name, seed.x, seed.y, forestHp[seed.prefix], forestHp[seed.prefix], channelIndex + 1))).flat(),
			database.prepare("UPDATE world_state SET layout_version = 11 WHERE id = 1 AND layout_version < 11")
		]);
	}
	if ((state?.layout_version ?? 1) < 12) {
		const forestIdList = (ids) => ids.map((id) => `'${id}'`).join(", ");
		const legacyForestIds = seeds.map(([monsterId]) => monsterId);
		const retainedForestGroups = forestSpawnSeeds.map((seed) => ({
			seed,
			ids: Array.from({ length: 3 }, (_, channelIndex) => `${seed.prefix}-c${channelIndex + 1}-${seed.index}`)
		}));
		const retainedForestIds = retainedForestGroups.flatMap(({ ids }) => ids);
		const retiredForestIds = Array.from({ length: 3 }, (_, channelIndex) => [
			"golge",
			"curuk",
			"yutan"
		].flatMap((prefix) => [
			7,
			8,
			9
		].map((index) => `${prefix}-c${channelIndex + 1}-${index}`))).flat();
		await database.batch([
			database.prepare(`DELETE FROM monsters
         WHERE id IN (${forestIdList(legacyForestIds)})
           AND area = 'forest' AND is_boss = 0 AND channel = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 12)`),
			database.prepare(`UPDATE monsters
         SET x = CASE
           ${retainedForestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.x}`).join("\n           ")}
           ELSE x END,
             y = CASE
           ${retainedForestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.y}`).join("\n           ")}
           ELSE y END,
             spawn_round = spawn_round + 1
         WHERE id IN (${forestIdList(retainedForestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 12)`),
			database.prepare(`DELETE FROM monsters
         WHERE id IN (${forestIdList(retiredForestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 12)`),
			database.prepare("UPDATE world_state SET layout_version = 12 WHERE id = 1 AND layout_version < 12")
		]);
	}
	if ((state?.layout_version ?? 1) < 13) {
		const forestIdList = (ids) => ids.map((id) => `'${id}'`).join(", ");
		const forestGroups = forestSpawnSeeds.map((seed) => ({
			seed,
			ids: Array.from({ length: 3 }, (_, channelIndex) => `${seed.prefix}-c${channelIndex + 1}-${seed.index}`)
		}));
		const forestIds = forestGroups.flatMap(({ ids }) => ids);
		await database.batch([database.prepare(`UPDATE monsters
         SET x = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.x}`).join("\n           ")}
           ELSE x END,
             y = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.y}`).join("\n           ")}
           ELSE y END
         WHERE id IN (${forestIdList(forestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 13)`), database.prepare("UPDATE world_state SET layout_version = 13 WHERE id = 1 AND layout_version < 13")]);
	}
	if ((state?.layout_version ?? 1) < 14) {
		const forestIdList = (ids) => ids.map((id) => `'${id}'`).join(", ");
		const forestGroups = forestSpawnSeeds.map((seed) => ({
			seed,
			ids: Array.from({ length: 3 }, (_, channelIndex) => `${seed.prefix}-c${channelIndex + 1}-${seed.index}`)
		}));
		const forestIds = forestGroups.flatMap(({ ids }) => ids);
		await database.batch([database.prepare(`UPDATE monsters
         SET x = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.x}`).join("\n           ")}
           ELSE x END,
             y = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.y}`).join("\n           ")}
           ELSE y END
         WHERE id IN (${forestIdList(forestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 14)`), database.prepare("UPDATE world_state SET layout_version = 14 WHERE id = 1 AND layout_version < 14")]);
	}
	if ((state?.layout_version ?? 1) < 15) {
		const configuredHp = await database.prepare("SELECT shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp FROM game_settings WHERE id = 1").first();
		const forestHp = {
			golge: configuredHp?.shadow_wolf_hp ?? DEFAULT_SETTINGS.shadow_wolf_hp,
			curuk: configuredHp?.rotten_guardian_hp ?? DEFAULT_SETTINGS.rotten_guardian_hp,
			yutan: configuredHp?.essence_devourer_hp ?? DEFAULT_SETTINGS.essence_devourer_hp
		};
		const forestIdList = (ids) => ids.map((id) => `'${id}'`).join(", ");
		const legacyForestIds = seeds.map(([monsterId]) => monsterId);
		const retiredForestIds = Array.from({ length: 3 }, (_, channelIndex) => [
			...[5, 6].map((index) => `golge-c${channelIndex + 1}-${index}`),
			...[5, 6].map((index) => `curuk-c${channelIndex + 1}-${index}`),
			...[
				3,
				4,
				5,
				6
			].map((index) => `yutan-c${channelIndex + 1}-${index}`)
		]).flat();
		await database.batch([
			database.prepare(`DELETE FROM monsters
         WHERE id IN (${forestIdList([...legacyForestIds, ...retiredForestIds])})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 15)`),
			...Array.from({ length: 3 }, (_, channelIndex) => forestSpawnSeeds.map((seed) => database.prepare(`INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'normal', 0, 0, 1, 'forest', ?, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, area='forest', channel=excluded.channel,
           is_boss=0, is_stone=0, summoned=0`).bind(`${seed.prefix}-c${channelIndex + 1}-${seed.index}`, seed.name, seed.x, seed.y, forestHp[seed.prefix], forestHp[seed.prefix], channelIndex + 1))).flat(),
			database.prepare("UPDATE players SET x = 1200, y = 900 WHERE area = 'forest' AND (x < 55 OR x > 2345 OR y < 80 OR y > 1420) AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 15)"),
			database.prepare("UPDATE world_state SET layout_version = 15 WHERE id = 1 AND layout_version < 15")
		]);
	}
	if ((state?.layout_version ?? 1) < 16) {
		const [configuredHp, frozenSettings] = await Promise.all([database.prepare("SELECT shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp FROM game_settings WHERE id = 1").first(), database.prepare(`SELECT frozen_zone_enabled, frozen_boss_enabled, frozen_boss_hp,
                frozen_water_enabled, frozen_water_hp
         FROM combat_settings WHERE id = 1`).first()]);
		const normalHp = {
			golge: configuredHp?.shadow_wolf_hp ?? DEFAULT_SETTINGS.shadow_wolf_hp,
			curuk: configuredHp?.rotten_guardian_hp ?? DEFAULT_SETTINGS.rotten_guardian_hp,
			yutan: configuredHp?.essence_devourer_hp ?? DEFAULT_SETTINGS.essence_devourer_hp
		};
		const zoneEnabled = (frozenSettings?.frozen_zone_enabled ?? DEFAULT_SETTINGS.frozen_zone_enabled) === 1;
		const bossHp = frozenSettings?.frozen_boss_hp ?? DEFAULT_SETTINGS.frozen_boss_hp;
		const waterHp = frozenSettings?.frozen_water_hp ?? DEFAULT_SETTINGS.frozen_water_hp;
		const bossActive = zoneEnabled && (frozenSettings?.frozen_boss_enabled ?? DEFAULT_SETTINGS.frozen_boss_enabled) === 1;
		const waterActive = zoneEnabled && (frozenSettings?.frozen_water_enabled ?? DEFAULT_SETTINGS.frozen_water_enabled) === 1;
		await database.batch([
			...Array.from({ length: 3 }, (_, channelIndex) => frozenSpawnSeeds.map((seed) => database.prepare(`INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'normal', 0, 0, 1, 'frozen', ?, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, area='frozen', channel=excluded.channel,
           is_boss=0, is_stone=0, summoned=0`).bind(`${seed.prefix}-frozen-c${channelIndex + 1}-${seed.index}`, seed.name, seed.x, seed.y, normalHp[seed.prefix], normalHp[seed.prefix], channelIndex + 1))).flat(),
			database.prepare(`INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, 'Ayaz Tahtının Bekçisi', ?, ?, ?, ?, 0, 'frost_boss', 0, 0, 1, 'frozen', 0, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, max_hp=excluded.max_hp,
           hp=MIN(hp, excluded.max_hp), variant='frost_boss', area='frozen', channel=0,
           is_boss=0, is_stone=0, summoned=0`).bind(FROZEN_BOSS_ID, FROZEN_BOSS_SPAWN.x, FROZEN_BOSS_SPAWN.y, bossActive ? bossHp : 0, bossHp),
			...Array.from({ length: 3 }, (_, channelIndex) => database.prepare(`INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, 'Buzgölü Semenderi', ?, ?, ?, ?, 0, 'frost_water', 0, 0, 1, 'frozen', ?, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, max_hp=excluded.max_hp,
           hp=MIN(hp, excluded.max_hp), variant='frost_water', area='frozen', channel=excluded.channel,
           is_boss=0, is_stone=0, summoned=0`).bind(`${FROZEN_WATER_ID_PREFIX}${channelIndex + 1}`, FROZEN_WATER_SPAWN.x, FROZEN_WATER_SPAWN.y, waterActive ? waterHp : 0, waterHp, channelIndex + 1)),
			database.prepare("UPDATE world_state SET layout_version = 16 WHERE id = 1 AND layout_version < 16")
		]);
	}
	if ((state?.layout_version ?? 1) < 17) await database.batch([
		database.prepare("UPDATE monsters SET name = 'Kırağı Vaşağı' WHERE area = 'frozen' AND id LIKE 'golge-frozen-%' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 17)"),
		database.prepare("UPDATE monsters SET name = 'Buzkök Golemi' WHERE area = 'frozen' AND id LIKE 'curuk-frozen-%' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 17)"),
		database.prepare("UPDATE monsters SET name = 'Tipi Kâhini' WHERE area = 'frozen' AND id LIKE 'yutan-frozen-%' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 17)"),
		database.prepare("UPDATE world_state SET layout_version = 17 WHERE id = 1 AND layout_version < 17")
	]);
	if ((state?.layout_version ?? 1) < 18) {
		const slots = [
			[
				"golge",
				500,
				400
			],
			[
				"curuk",
				950,
				350
			],
			[
				"yutan",
				1450,
				350
			],
			[
				"golge",
				1900,
				450
			],
			[
				"curuk",
				450,
				950
			],
			[
				"yutan",
				950,
				1050
			],
			[
				"golge",
				1500,
				1e3
			],
			[
				"curuk",
				1950,
				950
			]
		];
		await database.batch([...Array.from({ length: 3 }, (_, channel) => slots.map(([species, x, y], slot) => database.prepare(`INSERT OR IGNORE INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, area, channel)
          VALUES (?, ?, ?, ?, 750, 750, 0, 'katil', 0, 'black', ?)`).bind(`${species}-black-c${channel + 1}-${slot + 1}`, `Kara Muhafız ${slot + 1}`, x, y, channel + 1))).flat(), database.prepare("UPDATE world_state SET layout_version = 18 WHERE id = 1 AND layout_version < 18")]);
	}
	if ((state?.layout_version ?? 1) < 19) await database.batch([database.prepare(`UPDATE monsters SET name = CASE ((CAST(substr(id, -1) AS INTEGER) - 1) % 4)
        WHEN 0 THEN 'Obsidyen Akrep' WHEN 1 THEN 'Kumtaşı Golemi'
        WHEN 2 THEN 'Mezar Muhafızı' ELSE 'Kül Çakalı' END
        WHERE area = 'black' AND id NOT IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 19)`), database.prepare("UPDATE world_state SET layout_version = 19 WHERE id = 1 AND layout_version < 19")]);
	if ((state?.layout_version ?? 1) < 20) await database.batch([...Array.from({ length: 3 }, (_, i) => EXPANDED_FOREST_SPAWNS.map((seed) => database.prepare(FOREST_SPAWN_UPSERT_SQL).bind(`${seed.family}-c${i + 1}-${seed.number}`, seed.name, seed.x, seed.y, seed.profileKey, seed.fallbackHp, seed.profileKey, seed.fallbackHp, seed.variant, i + 1))).flat(), database.prepare("UPDATE world_state SET layout_version=20 WHERE id=1 AND layout_version<20")]);
	if ((state?.layout_version ?? 1) < 21) await database.batch([database.prepare("UPDATE monsters SET x=x*1.5,y=y*1.5 WHERE area='black' AND id NOT IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND EXISTS (SELECT 1 FROM world_state WHERE id=1 AND layout_version<21)"), database.prepare("UPDATE world_state SET layout_version=21 WHERE id=1 AND layout_version<21")]);
	if ((state?.layout_version ?? 1) < 22) {
		const families = [
			"golge",
			"curuk",
			"yutan",
			"golge",
			"curuk",
			"yutan",
			"golge",
			"curuk"
		];
		const writes = [];
		for (let channel = 1; channel <= 3; channel++) for (let i = 0; i < 24; i++) {
			const slot = i % 8 + 1, pack = Math.floor(i / 8), family = families[slot - 1];
			const angle = i * 7 % 24 * Math.PI * 2 / 24;
			const x = Math.round(1800 + Math.cos(angle) * (1250 + i % 3 * 55));
			const y = Math.round(1100 + Math.sin(angle) * (710 + i % 2 * 70));
			const sourceId = `${family}-black-c${channel}-${slot}`;
			if (pack === 0) writes.push(database.prepare("UPDATE monsters SET x=?,y=? WHERE id=? AND EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<22)").bind(x, y, sourceId));
			else writes.push(database.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,area,channel)
        SELECT ?,name,?,?,max_hp,max_hp,0,variant,0,'black',channel FROM monsters WHERE id=?
        AND EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<22)`).bind(`${family}-pack${pack + 1}-black-c${channel}-${slot}`, x, y, sourceId));
		}
		await database.batch([...writes, database.prepare("UPDATE world_state SET layout_version=22 WHERE id=1 AND layout_version<22")]);
	}
	if ((state?.layout_version ?? 1) < 23) await expandHuntingWorld(database);
	if ((state?.layout_version ?? 1) < 24) await database.batch([database.prepare(`UPDATE players SET
      x=CASE WHEN ((x-1500)/500.0)*((x-1500)/500.0)+((y-830)/380.0)*((y-830)/380.0)<=1 THEN (x-1500)*.9+1800 ELSE x*1.2 END,
      y=CASE WHEN ((x-1500)/500.0)*((x-1500)/500.0)+((y-830)/380.0)*((y-830)/380.0)<=1 THEN (y-830)*.9+996 ELSE y*1.2 END,
      position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0
      WHERE area='war' AND EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<24)`), database.prepare("UPDATE world_state SET layout_version=24 WHERE id=1 AND layout_version<24")]);
}
async function ensureWorldSeed() {
	await ensureMonsterBalanceInitialized();
	if (worldSeeded) return;
	if (!worldSeedJob) worldSeedJob = seedWorld().then(() => {
		worldSeeded = true;
	}).finally(() => {
		worldSeedJob = null;
	});
	await worldSeedJob;
}
function randomVariant() {
	const roll = Math.random();
	if (roll < .1) return "katil";
	if (roll < .4) return "agresif";
	return "normal";
}
var nextTickAt = 0;
async function runWorldTick() {
	const database = db();
	const loop = database.worldLoop;
	const memory = loop?.enabled;
	const channel = Number(database.channel || 0), globalOwner = !channel || channel === 1;
	const ownedRepair = (statements) => !channel ? statements : statements.filter((s) => globalOwner || !/^UPDATE market_shops/i.test(s.sql.trim())).map((s) => /^(UPDATE|DELETE FROM) monsters/i.test(s.sql.trim()) ? database.prepare(s.sql + ` AND (channel=${channel}${globalOwner ? " OR channel=0" : ""})`).bind(...s.params) : s);
	if (globalOwner && (!memory || await loop.dragonDue())) await dragonService()?.tick(memory ? { cleanup: false } : void 0);
	const now = nowSeconds$1();
	const nativeSettings = memory ? loop.settings(DEFAULT_SETTINGS) : null;
	if (!memory || await loop.needsRepair(nativeSettings)) await database.batch(ownedRepair([
		database.prepare(`DELETE FROM monsters
       WHERE summoned = 1 AND hp <= 0 AND respawn_at <= 0
         AND EXISTS (
           SELECT 1 FROM monsters parent
           WHERE parent.id = monsters.parent_stone_id
             AND parent.spawn_round > monsters.spawn_round
         )`),
		database.prepare(`UPDATE market_shops SET active = 0
       WHERE active = 1 AND created_at <= ?
         AND (created_at <= ? OR (NOT EXISTS (SELECT 1 FROM market_listings WHERE shop_id = market_shops.id) AND NOT EXISTS(SELECT 1 FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))))`).bind(now - 120,now - 172800),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = ? + CASE WHEN area = 'forest' THEN COALESCE((SELECT forest_monster_respawn_seconds FROM combat_settings WHERE id=1),18) WHEN area = 'frozen' THEN COALESCE((SELECT frozen_monster_respawn_seconds FROM combat_settings WHERE id=1),18) WHEN area = 'ancient' THEN COALESCE((SELECT ancient_monster_respawn_seconds FROM combat_settings WHERE id=1),25) WHEN area = 'black' THEN COALESCE((SELECT black_monster_respawn_seconds FROM combat_settings WHERE id=1),18) WHEN area = 'afk' THEN COALESCE((SELECT afk_island_respawn_seconds FROM combat_settings WHERE id=1),12) ELSE 18 END
       WHERE area!='event' AND summoned = 0 AND hp <= 0 AND respawn_at <= 0 AND is_boss = 0 AND is_stone = 0
         AND id != ? AND id != ? AND id NOT LIKE ? AND id != 'dragon-world-1' AND id NOT IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3')`).bind(now, FROZEN_BOSS_ID, ANCIENT_BOSS_ID, `${FROZEN_WATER_ID_PREFIX}%`),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE(
         (SELECT frozen_boss_respawn_seconds FROM combat_settings WHERE id = 1), ?)
       WHERE id = ? AND hp <= 0 AND respawn_at <= 0
         AND COALESCE((SELECT frozen_zone_enabled FROM combat_settings WHERE id = 1), 1) = 1
         AND COALESCE((SELECT frozen_boss_enabled FROM combat_settings WHERE id = 1), 1) = 1`).bind(now, DEFAULT_SETTINGS.frozen_boss_respawn_seconds, FROZEN_BOSS_ID),
		database.prepare(`UPDATE monsters SET hp=0,respawn_at=?+COALESCE((SELECT black_stone_boss_respawn_seconds FROM combat_settings WHERE id=1),600) WHERE id IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND hp<=0 AND respawn_at<=0 AND COALESCE((SELECT black_stone_boss_enabled FROM combat_settings WHERE id=1),1)=1`).bind(now),
		database.prepare(`UPDATE monsters SET hp=0,respawn_at=0 WHERE id IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND COALESCE((SELECT black_stone_boss_enabled FROM combat_settings WHERE id=1),1)=0`),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE(
         (SELECT ancient_boss_respawn_seconds FROM combat_settings WHERE id = 1), ?)
       WHERE id = ? AND hp <= 0 AND respawn_at <= 0
         AND COALESCE((SELECT ancient_boss_enabled FROM combat_settings WHERE id = 1), 1) = 1`).bind(now, DEFAULT_SETTINGS.ancient_boss_respawn_seconds, ANCIENT_BOSS_ID),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = 0 WHERE id = ?
         AND COALESCE((SELECT ancient_boss_enabled FROM combat_settings WHERE id = 1), 1) = 0`).bind(ANCIENT_BOSS_ID),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE(
         (SELECT frozen_water_respawn_seconds FROM combat_settings WHERE id = 1), ?)
       WHERE id LIKE ? AND hp <= 0 AND respawn_at <= 0
         AND COALESCE((SELECT frozen_zone_enabled FROM combat_settings WHERE id = 1), 1) = 1
         AND COALESCE((SELECT frozen_water_enabled FROM combat_settings WHERE id = 1), 1) = 1`).bind(now, DEFAULT_SETTINGS.frozen_water_respawn_seconds, `${FROZEN_WATER_ID_PREFIX}%`),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = 0
       WHERE (id = ? OR id LIKE ?)
         AND (COALESCE((SELECT frozen_zone_enabled FROM combat_settings WHERE id = 1), 1) = 0
           OR (id = ? AND COALESCE((SELECT frozen_boss_enabled FROM combat_settings WHERE id = 1), 1) = 0)
           OR (id LIKE ? AND COALESCE((SELECT frozen_water_enabled FROM combat_settings WHERE id = 1), 1) = 0))`).bind(FROZEN_BOSS_ID, `${FROZEN_WATER_ID_PREFIX}%`, FROZEN_BOSS_ID, `${FROZEN_WATER_ID_PREFIX}%`),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE((SELECT sinsi_stone_respawn_seconds FROM game_settings WHERE id = 1), ?)
       WHERE hp <= 0 AND respawn_at <= 0 AND is_stone = 1`).bind(now, DEFAULT_SETTINGS.sinsi_stone_respawn_seconds)
	]));
	const [settingsResult, economySettingsResult, combatSettingsResult, due] = memory ? [
		{ results: [nativeSettings] },
		{ results: [] },
		{ results: [] },
		{ results: await loop.due(now) }
	] : await database.batch([
		database.prepare(GAME_SETTINGS_SQL),
		database.prepare(ECONOMY_SETTINGS_SQL),
		database.prepare(COMBAT_SETTINGS_SQL),
		database.prepare("SELECT id, area, max_hp, is_boss, is_stone, summoned, spawn_round, respawn_at FROM monsters WHERE area!='event' AND id!='dragon-world-1' AND hp <= 0 AND respawn_at > 0 AND respawn_at <= ?").bind(now)
	]);
	const settings = {
		...DEFAULT_SETTINGS,
		...settingsResult.results[0] ?? {},
		...economySettingsResult.results[0] ?? {},
		...combatSettingsResult.results[0] ?? {}
	};
	const respawns = due.results.filter(monster=>colLabMonsterActive(monster)).map((monster) => {
 if(colLabIsMonster(monster.id))return database.prepare("UPDATE monsters SET hp=max_hp,respawn_at=0,despawn_at=0,spawn_round=spawn_round+1 WHERE id=? AND loadlab_run_id<>'' AND hp<=0 AND spawn_round=? AND respawn_at=? AND respawn_at<=? RETURNING id").bind(monster.id,monster.spawn_round,monster.respawn_at,now);
 if(monster.area==='rune_v2'){const cfg=globalThis.__colRuneV2?.monster(monster);if(!cfg)throw Error('Karanlık Rün Sahili canavarı ayarı bulunamadı.');const boss484=isRuneV2Boss(monster.id);return database.prepare("UPDATE monsters SET name=?,hp=?,max_hp=?,variant=?,x=CASE WHEN ? THEN ? ELSE x END,y=CASE WHEN ? THEN ? ELSE y END,respawn_at=0,spawn_round=spawn_round+1 WHERE id=? AND area='rune_v2' AND loadlab_run_id='' AND hp<=0 AND spawn_round=? AND respawn_at=? AND respawn_at<=?").bind(cfg.name,cfg.hp,cfg.hp,boss484?'rune_v2_boss':'normal',boss484?1:0,RUNE_V2_BOSS_SPAWN.x,boss484?1:0,RUNE_V2_BOSS_SPAWN.y,monster.id,monster.spawn_round,monster.respawn_at,now);}if(monster.area==='rune'){const cfg=globalThis.__colRunes?.monster(monster);if(!cfg)throw Error('Rün canavarı ayarı bulunamadı.');return database.prepare("UPDATE monsters SET hp=?,max_hp=?,variant='normal',respawn_at=0,spawn_round=spawn_round+1 WHERE id=? AND hp<=0 AND spawn_round=? AND respawn_at=? AND respawn_at<=?").bind(cfg.hp,cfg.hp,monster.id,monster.spawn_round,monster.respawn_at,now);}
		if (monster.summoned) return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND summoned = 1 AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(monster.id, monster.spawn_round, monster.respawn_at, now);
		if (monster.is_stone) return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, wave_stage = 0, respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.sinsi_stone_hp, settings.sinsi_stone_hp, monster.id, monster.spawn_round, monster.respawn_at, now);
		if (monster.is_boss) return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, despawn_at = ?, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.boss_hp, settings.boss_hp, BOSS_SPAWN.x, BOSS_SPAWN.y, now + settings.boss_duration_seconds, monster.id, monster.spawn_round, monster.respawn_at, now);
		if(isBlackStoneBoss476(monster.id)){
   if(!settings.black_stone_boss_enabled)return database.prepare("UPDATE monsters SET respawn_at=0 WHERE id=? AND hp<=0 AND spawn_round=? AND respawn_at=?").bind(monster.id,monster.spawn_round,monster.respawn_at);
   return database.prepare("UPDATE monsters SET hp=?,max_hp=?,x=2700,y=1688,variant='stone_boss',respawn_at=0,spawn_round=spawn_round+1 WHERE id=? AND hp<=0 AND spawn_round=? AND respawn_at=? AND respawn_at<=?").bind(settings.black_stone_boss_hp,settings.black_stone_boss_hp,monster.id,monster.spawn_round,monster.respawn_at,now);
  }
  if (isFrozenBossId(monster.id)) {
			if (!settings.frozen_zone_enabled || !settings.frozen_boss_enabled) return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ?").bind(monster.id, monster.spawn_round, monster.respawn_at);
			return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, variant = 'frost_boss', respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.frozen_boss_hp, settings.frozen_boss_hp, FROZEN_BOSS_SPAWN.x, FROZEN_BOSS_SPAWN.y, monster.id, monster.spawn_round, monster.respawn_at, now);
		}
		if (isAncientBossId(monster.id)) {
			if (!settings.ancient_boss_enabled) return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ?").bind(monster.id, monster.spawn_round, monster.respawn_at);
			return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, variant = 'ancient_boss', respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.ancient_boss_hp, settings.ancient_boss_hp, ANCIENT_BOSS_SPAWN.x, ANCIENT_BOSS_SPAWN.y, monster.id, monster.spawn_round, monster.respawn_at, now);
		}
		if (isFrozenWaterId(monster.id)) {
			if (!settings.frozen_zone_enabled || !settings.frozen_water_enabled) return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ?").bind(monster.id, monster.spawn_round, monster.respawn_at);
			return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, variant = 'frost_water', respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.frozen_water_hp, settings.frozen_water_hp, FROZEN_WATER_SPAWN.x, FROZEN_WATER_SPAWN.y, monster.id, monster.spawn_round, monster.respawn_at, now);
		}
		const variant = monster.area === "ancient" || monster.area === "afk" ? "normal" : monster.area === "black" ? "katil" : randomVariant();
		const profileKey = monsterBalanceKeyFor({
			...monster,
			variant
		});
		const legacyBase = monster.id.startsWith("golge") ? settings.shadow_wolf_hp : monster.id.startsWith("curuk") ? settings.rotten_guardian_hp : settings.essence_devourer_hp;
		const legacyMultiplier = variant === "katil" ? settings.killer_variant_hp_scale : variant === "agresif" ? settings.aggressive_variant_hp_scale : 1;
		const legacyHp = monster.area === "black" ? 750 : Math.round(legacyBase * legacyMultiplier);
		if (!profileKey) return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, variant = ?, respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(legacyHp, legacyHp, variant, monster.id, monster.spawn_round, monster.respawn_at, now);
		return database.prepare(`UPDATE monsters SET
         hp = COALESCE((SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?), ?),
         max_hp = COALESCE((SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?), ?),
         variant = ?, respawn_at = 0, spawn_round = spawn_round + 1
       WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?`).bind(profileKey, legacyHp, profileKey, legacyHp, variant, monster.id, monster.spawn_round, monster.respawn_at, now);
	});
	const tickResults = await database.batch([
		...globalOwner ? [database.prepare("UPDATE world_state SET health = MAX(0, health - MAX(0, ? - updated_at) * ?), updated_at = ? WHERE id = 1 AND reset_at = 0 AND updated_at < ?").bind(now, settings.health_decay_per_second, now, now)] : [],
		...respawns,
		...globalOwner && (!memory || await loop.needsDespawn(now)) ? [database.prepare("UPDATE monsters SET hp = 0, respawn_at = ?, despawn_at = 0 WHERE is_boss = 1 AND loadlab_run_id='' AND hp > 0 AND despawn_at > 0 AND despawn_at <= ?").bind(now + settings.boss_respawn_seconds, now)] : [],
		...memory && globalOwner ? [database.prepare("UPDATE market_shops SET active=0 WHERE active=1 AND created_at<=? AND (created_at<=? OR (NOT EXISTS(SELECT 1 FROM market_listings WHERE shop_id=market_shops.id) AND NOT EXISTS(SELECT 1 FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))))").bind(now - 120,now - 172800)] : [],
		...globalOwner ? [database.prepare("UPDATE world_state SET reset_at = ? WHERE id = 1 AND health <= 0 AND reset_at = 0").bind(now + 8), database.prepare("SELECT reset_at, cycle, guardian_reward_at FROM world_state WHERE id = 1")] : []
	]);
	if (!globalOwner) return;
	const state = tickResults[tickResults.length - 1].results[0];
	if (state?.reset_at && state.reset_at <= now) {
		const claimedResetAt = now + 30;
		const stateCycle = state.cycle ?? 0;
		const resetGate = "EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND cycle = ? AND reset_at = ?)";
		await database.batch([
			database.prepare("UPDATE world_state SET reset_at = ? WHERE id = 1 AND reset_at = ? AND cycle = ? RETURNING cycle").bind(claimedResetAt, state.reset_at, stateCycle),
			database.prepare(`UPDATE arena_matches SET status = 'cancelled', updated_at_ms = ?
        WHERE (status IN ('waiting','countdown','active') OR (status = 'finished' AND settlement_token = ''))
          AND ${resetGate}`).bind(Date.now(), stateCycle, claimedResetAt),
			database.prepare(`UPDATE players SET hp = ?, max_hp = ?, hp_revision = hp_revision + 1, respawn_at_ms = 0, essence = MIN(essence,wheel_paid_essence), contribution = 0, xp = 0, level = 1, gems = MIN(gems,wheel_paid_gems), potions = MIN(potions,wheel_paid_potions), fifth_enchant_scrolls = 0, has_rod = 0, rod_equipped = 0, fish_sokan = 0, fish_levrek = 0, fish_zargana = 0, pearls = MIN(pearls,wheel_paid_pearls), stone_dust = 0, has_wings = CASE WHEN EXISTS(SELECT 1 FROM premium_receipts WHERE player_id=players.id AND ((action='buy' AND product='wings:1') OR (action='wheel_spin' AND json_extract(result,'$.wheel.rewardId')='wings_3d'))) OR EXISTS(SELECT 1 FROM support_pack_grants WHERE player_id=players.id) OR EXISTS(SELECT 1 FROM epin_codes WHERE redeemed_by_player_id=players.id AND status='redeemed' AND product_code NOT LIKE 'core-coins-%') THEN has_wings ELSE 0 END, wings_equipped=0, skill_one = 1, skill_two = 1, skill_three = 1, area = 'bazaar', arena_match_id = '', x = ?, y = ?, movement_checked_at_ms = CASE WHEN MAX(last_seen, CAST(movement_checked_at_ms / 1000 AS INTEGER), CAST(last_monster_hit_at / 1000 AS INTEGER)) >= CAST(strftime('%s','now') AS INTEGER) - 30 THEN CAST(strftime('%s','now') AS INTEGER) * 1000 ELSE movement_checked_at_ms END, movement_debt_ms = 0, motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1, realtime_scope_version = realtime_scope_version + 1, combat_lock_until_ms = 0 WHERE ${resetGate}`).bind(settings.player_max_hp, settings.player_max_hp, BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM player_items WHERE premium_origin=0 AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`UPDATE player_items SET equipped=0 WHERE premium_origin=1 AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`UPDATE player_storage_items SET amount=json_extract(payload,'$.paid') WHERE storage_type='counter' AND premium_origin=1 AND json_type(payload,'$.paid') IS NOT NULL AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM player_storage_items WHERE premium_origin=0 AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM player_pets WHERE kind IN ('dragon','starter') AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM player_stones WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM dungeon_materials WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM dungeon_wings WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM black_loot_chests WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM black_loot_attempts WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`INSERT INTO player_items (id, player_id, kind, item_name, rarity, power, role, equipped, created_at)
        SELECT 'starter-' || id, id, 'weapon',
          CASE role WHEN 'avci' THEN 'Acemi Yayı' WHEN 'arkanist' THEN 'Acemi Asası' ELSE 'Acemi Kılıcı' END,
          'white', ?, role, 1, ? FROM players WHERE ${resetGate}`).bind(settings.starter_weapon_power, now, stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM world_drops WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM pve_engagements WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM messages WHERE recipient_id IS NULL AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM monsters WHERE summoned = 1 AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			...["forest","frozen","ancient","afk","event","rune","rune_v2"].flatMap((area) => [
				"golge",
				"curuk",
				"yutan"
			].map((family) => {
				const profileKey = `${area}.${family}.normal`;
				return database.prepare(`UPDATE monsters SET
             hp = (SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?),
             max_hp = (SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?),
             respawn_at = 0, variant = 'normal', spawn_round = spawn_round + 1
           WHERE area = ? AND id LIKE ? AND is_boss = 0 AND is_stone = 0 AND summoned = 0
             AND EXISTS (SELECT 1 FROM all_monster_combat_profiles WHERE profile_key = ?) AND ${resetGate}`).bind(profileKey, profileKey, area, `${family}-%`, profileKey, stateCycle, claimedResetAt);
			})),
			database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, variant = 'frost_boss', spawn_round = spawn_round + 1 WHERE id = ? AND ${resetGate}`).bind(settings.frozen_zone_enabled && settings.frozen_boss_enabled ? settings.frozen_boss_hp : 0, settings.frozen_boss_hp, FROZEN_BOSS_SPAWN.x, FROZEN_BOSS_SPAWN.y, FROZEN_BOSS_ID, stateCycle, claimedResetAt),
			database.prepare(`UPDATE monsters SET hp=?,max_hp=?,x=2700,y=1688,respawn_at=0,variant='stone_boss',spawn_round=spawn_round+1 WHERE id IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND ${resetGate}`).bind(settings.black_stone_boss_enabled?settings.black_stone_boss_hp:0,settings.black_stone_boss_hp,stateCycle,claimedResetAt),
			database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, variant = 'ancient_boss', spawn_round = spawn_round + 1 WHERE id = ? AND ${resetGate}`).bind(settings.ancient_boss_enabled ? settings.ancient_boss_hp : 0, settings.ancient_boss_hp, ANCIENT_BOSS_SPAWN.x, ANCIENT_BOSS_SPAWN.y, ANCIENT_BOSS_ID, stateCycle, claimedResetAt),
			database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, variant = 'frost_water', spawn_round = spawn_round + 1 WHERE id LIKE ? AND ${resetGate}`).bind(settings.frozen_zone_enabled && settings.frozen_water_enabled ? settings.frozen_water_hp : 0, settings.frozen_water_hp, FROZEN_WATER_SPAWN.x, FROZEN_WATER_SPAWN.y, `${FROZEN_WATER_ID_PREFIX}%`, stateCycle, claimedResetAt),
			database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, wave_stage = 0, respawn_at = 0, spawn_round = spawn_round + 1 WHERE is_stone = 1 AND ${resetGate}`).bind(settings.sinsi_stone_hp, settings.sinsi_stone_hp, stateCycle, claimedResetAt),
			database.prepare(`UPDATE monsters SET hp = 0, max_hp = ?, x = ?, y = ?, respawn_at = ?, despawn_at = 0, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND loadlab_run_id='' AND ${resetGate}`).bind(settings.boss_hp, BOSS_SPAWN.x, BOSS_SPAWN.y, now + settings.boss_respawn_seconds, stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM boss_participants WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM monster_xp_claims WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM boss_reward_claims WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM boss_defeats WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM normal_reward_claims WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM normal_defeats WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM sinsi_reward_claims WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM sinsi_defeats WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM blacksmith_upgrades WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM monster_participants WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM combat_events WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM party_invites WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM party_members WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM parties WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM market_listings WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM market_shops WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM fishing_sessions WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM arena_queue WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM arena_announcements WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM guardian_reward_claims WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare("UPDATE world_state SET health = 50, updated_at = ?, cycle = cycle + 1, reset_at = 0, guardian_reward_at = ? WHERE id = 1 AND cycle = ? AND reset_at = ?").bind(now, now + settings.guardian_reward_seconds, stateCycle, claimedResetAt)
		]);
		return;
	}
	let rewardAt = Number(state?.guardian_reward_at ?? 0);
	if (rewardAt <= 0) {
		const initializedAt = now + settings.guardian_reward_seconds;
		await database.prepare("UPDATE world_state SET guardian_reward_at = ? WHERE id = 1 AND guardian_reward_at <= 0 AND reset_at = 0").bind(initializedAt).run();
		rewardAt = initializedAt;
	}
	if (rewardAt <= now && !state?.reset_at) {
		const winner = await database.prepare("SELECT id FROM players WHERE loadlab_run_id = '' AND contribution > 0 ORDER BY contribution DESC, name ASC LIMIT 1").first();
		const nextRewardAt = now + settings.guardian_reward_seconds;
		if (!winner) {
			await database.prepare("UPDATE world_state SET guardian_reward_at = ? WHERE id = 1 AND guardian_reward_at = ? AND reset_at = 0").bind(nextRewardAt, rewardAt).run();
			return;
		}
		const claimToken = crypto.randomUUID();
		await database.batch([
			database.prepare(`INSERT INTO guardian_reward_claims (period_at, winner_id, gems, claim_token, awarded_at)
         SELECT ?, ?, ?, ?, ? WHERE EXISTS (
           SELECT 1 FROM world_state WHERE id = 1 AND guardian_reward_at = ? AND guardian_reward_at <= ? AND reset_at = 0
         ) ON CONFLICT(period_at) DO NOTHING`).bind(rewardAt, winner.id, settings.guardian_reward_gems, claimToken, now, rewardAt, now),
			database.prepare("UPDATE players SET gems = gems + ? WHERE id = ? AND EXISTS (SELECT 1 FROM guardian_reward_claims WHERE claim_token = ?)").bind(settings.guardian_reward_gems, winner.id, claimToken),
			database.prepare("UPDATE players SET contribution = 0 WHERE EXISTS (SELECT 1 FROM guardian_reward_claims WHERE claim_token = ?)").bind(claimToken),
			database.prepare("UPDATE world_state SET guardian_reward_at = ? WHERE id = 1 AND guardian_reward_at = ? AND EXISTS (SELECT 1 FROM guardian_reward_claims WHERE claim_token = ?)").bind(nextRewardAt, rewardAt, claimToken)
		]);
	}
}
async function tickWorld() {
	const database = db();
	if (database.coordinatorOnly) return;
	const loop = database.worldLoop;
	if (loop?.enabled) {
		if (!loop.jobs.has("world_upkeep")) {
			loop.register("world_upkeep", 1e3, () => loop.flushed(async () => {
				if (!worldSeeded) await ensureWorldSeed();
				if (database.sharedCombat && database.channel === 1) await database.sharedCombat.run(() => runWorldTick());
				else await runWorldTick();
			}));
			if (!database.channel || database.channel === 1) loop.register("world_cleanup", 3e4, () => runCleanupWorld());
			loop.register("world_regen", 1e3, () => worldSeeded && (database.sharedCombat && database.channel === 1 ? database.sharedCombat.run(() => loop.regenerate(loop.settings(DEFAULT_SETTINGS))) : loop.regenerate(loop.settings(DEFAULT_SETTINGS))));
			loop.register("rune_v2_boss484",200,()=>worldSeeded&&colTickRuneV2Boss484(database,loop.settings(DEFAULT_SETTINGS)));
		}
		return;
	}
	const now = Date.now();
	if (now < nextTickAt) return;
	nextTickAt = now + 1e3;
	try {
		await runWorldTick();
		await colTickRuneV2Boss484(database,await getGameSettings());
	} catch (error) {
		nextTickAt = 0;
		throw error;
	}
}
var nextCleanupAt = 0;
async function cleanupWorld() {
	if (db().worldLoop?.enabled) {
		await tickWorld();
		return;
	}
	return runCleanupWorld();
}
async function runCleanupWorld() {
	const nowMs = Date.now();
	if (nowMs < nextCleanupAt) return;
	nextCleanupAt = nowMs + 3e4;
	const nativeCleanup = env.CORE_WORLD_CLEANUP;
	if (nativeCleanup) {
		try {
			await nativeCleanup(nowMs);
		} catch (error) {
			nextCleanupAt = 0;
			throw error;
		}
		return;
	}
	const database = db();
	const now = nowSeconds$1();
	const cleanup = database.batch([
		database.prepare("DELETE FROM messages WHERE created_at < ? AND id NOT IN (SELECT id FROM messages WHERE recipient_id IS NULL AND scope = 'world' AND announcement_expires_at_ms = 0 ORDER BY id DESC LIMIT 20)").bind(now - 86400),
		database.prepare("DELETE FROM world_drops WHERE expires_at < ? AND enchantments NOT IN ('__pending__','__profile_pending__')").bind(now),
		database.prepare("DELETE FROM boss_participants WHERE created_at < ?").bind(now - 86400),
		database.prepare("DELETE FROM boss_reward_claims WHERE awarded_at < ?").bind(now - 86400),
		database.prepare("DELETE FROM boss_defeats WHERE defeated_at < ?").bind(now - 86400),
		database.prepare("DELETE FROM normal_reward_claims WHERE awarded_at < ?").bind(now - 86400),
		database.prepare(`DELETE FROM normal_defeats WHERE defeated_at < ? AND ${STONE_DEFEAT_EXPIRY_GUARD476}`).bind(now - 86400),
		database.prepare("DELETE FROM sinsi_defeats WHERE defeated_at < ?").bind(now - 86400),
		database.prepare("DELETE FROM sinsi_reward_claims WHERE awarded_at < ?").bind(now - 86400),
		database.prepare(`DELETE FROM monster_participants WHERE created_at < ? AND ${STONE_PARTICIPANT_EXPIRY_GUARD476}`).bind(now - 86400),
		database.prepare("DELETE FROM combat_events WHERE created_at < ?").bind(nowMs - 5e3),
		database.prepare("DELETE FROM party_invites WHERE created_at < ?").bind(now - 120),
		database.prepare("DELETE FROM fishing_sessions WHERE expires_at_ms < ?").bind(nowMs),
		database.prepare("DELETE FROM arena_queue WHERE last_seen_ms < ?").bind(nowMs - 45e3),
		database.prepare("DELETE FROM arena_announcements WHERE expires_at_ms < ?").bind(nowMs - 3e4),
		database.prepare("DELETE FROM arena_kill_claims WHERE created_at_ms < ?").bind(nowMs - 6048e5),
		database.prepare("DELETE FROM war_kill_claims WHERE created_at_ms < ?").bind(nowMs - 6048e5),
		database.prepare("DELETE FROM arena_reward_claims WHERE awarded_at_ms < ?").bind(nowMs - 2592e6),
		database.prepare("DELETE FROM guardian_reward_claims WHERE awarded_at < ?").bind(now - 604800)
	]).then(() => void 0);
	try {
		await cleanup;
	} catch (error) {
		nextCleanupAt = 0;
		throw error;
	}
}
function distance(a, b) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}
function safeName(value) {
	return typeof value === "string" ? value.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 18) : "";
}
function safeId(value) {
	return typeof value === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(value) ? value : "";
}
function errorResponse(error) {
	const message = error instanceof Error ? error.message : "Beklenmeyen dünya hatası.";
	if (message.includes("channel_full")) return Response.json({
		code: "channel_full",
		error: "Kanal dolu. Boş bir kanal seç veya yer açılmasını bekle."
	}, { status: 409 });
	return Response.json({ error: message }, { status: 500 });
}
if (env.CORE_RUNTIME === "vds" && db().worldLoop?.enabled) tickWorld();
//#endregion
//#region lib/profanity-storage.ts
async function loadBlockedWords() {
	return (await db().prepare("SELECT word FROM blocked_words ORDER BY word LIMIT 500").all()).results.map((row) => row.word);
}
//#endregion
//#region lib/market-prices.mjs
var MARKET_PRODUCTS = {
	...Object.fromEntries(Object.entries(PREMIUM_ITEMS).map(([k, v]) => [k, {
		name: v.name,
		price: v.price,
		currency: "ÇP"
	}])),
	pet_bird: {
		name: "Kuş Peti",
		price: 200,
		currency: "ÇP"
	},
	pet_monkey: {
		name: "Maymun Peti",
		price: 200,
		currency: "ÇP"
	},
	pet_dog: {
		name: "Köpek Peti",
		price: 200,
		currency: "ÇP"
	},
	coins_200: {
		name: "200 ÇP E-PIN",
		price: 150,
		currency: "TL"
	},
	coins_1000: {
		name: "1000 ÇP E-PIN",
		price: 550,
		currency: "TL"
	},coins_3000:{name:"3000 ÇP E-PIN",price:1500,currency:"TL"},
	coins_500: {
		name: "500 ÇP E-PIN",
		price: 300,
		currency: "TL"
	},
	support: {
		name: "Destek Paketi",
		price: 400,
		currency: "TL"
	}
};
function parseMarketPrices(raw) {
	let value = {};
	try {
		value = typeof raw === "string" ? JSON.parse(raw) : raw ?? {};
	} catch {}
	return Object.fromEntries(Object.entries(MARKET_PRODUCTS).map(([key, item]) => {
		const row = value[key];
		return [key, {
			base: Number.isSafeInteger(row?.base) && row.base >= 1 && row.base <= 1e6 ? row.base : item.price,
			discount: !key.startsWith("coins_") && Number.isInteger(row?.discount) && row.discount >= 0 && row.discount <= 90 ? row.discount : 0
		}];
	}));
}
function marketPrice(raw, key) {
	const row = parseMarketPrices(raw)[key];
	if (!row) throw new Error("Ürün bulunamadı.");
	return {
		...row,
		amount: Math.max(({cp_coupon_100:100,cp_coupon_200:200,cp_coupon_500:500})[key]??1,Math.round(row.base * (100 - row.discount) / 100)),
		currency: MARKET_PRODUCTS[key].currency
	};
}
async function readMarketPrices(db) {
	return parseMarketPrices((await db.prepare("SELECT prices_json FROM premium_shop_settings WHERE id=1").first())?.prices_json);
}
//#endregion
//#region lib/crystal-chest.ts
async function openCrystalChest(database, playerId, requestId, reward, now) {
	const previous = await database.prepare("SELECT reward_json FROM crystal_chest_openings WHERE id=? AND player_id=?").bind(requestId, playerId).first();
	if (previous) return JSON.parse(previous.reward_json);
	const token = crypto.randomUUID();
	const gate = "EXISTS(SELECT 1 FROM crystal_chest_openings WHERE id=? AND player_id=? AND claim_token=?)";
	const statements = [database.prepare(`INSERT OR IGNORE INTO crystal_chest_openings(id,player_id,reward_json,claim_token,created_at)
 SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM player_stones WHERE player_id=? AND kind='crystal_chest' AND amount>0)`).bind(requestId, playerId, JSON.stringify(reward), token, now, playerId)];
	if (reward.item) {
		const i = reward.item;
		statements.push(database.prepare(`INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at) SELECT ?,?,?,?,?,?,?,?,0,? WHERE ${gate}`).bind(i.id, playerId, i.kind, i.item_name, i.rarity, i.power, i.role, i.enchantments, now, requestId, playerId, token));
	} else {
		const column = reward.column;
		if (!column || ![
			"pearls", "red_pearls",
			"potions",
			"essence",
			"fish_sokan",
			"fifth_enchant_scrolls"
		].includes(column)) throw new Error("Geçersiz sandık ödülü.");
		statements.push(database.prepare(`UPDATE players SET ${column}=${column}+? WHERE id=? AND ${gate}`).bind(reward.amount, playerId, requestId, playerId, token));
	}
	statements.push(database.prepare(`UPDATE player_stones SET amount=amount-1 WHERE player_id=? AND kind='crystal_chest' AND amount>0 AND ${gate}`).bind(playerId, requestId, playerId, token));
	await database.batch(statements);
	const receipt = await database.prepare("SELECT reward_json FROM crystal_chest_openings WHERE id=? AND player_id=?").bind(requestId, playerId).first();
	return receipt ? JSON.parse(receipt.reward_json) : null;
}
//#endregion
//#region lib/moonlight-chest.ts
async function openMoonlightChest(database, playerId, requestId, reward, now) {
	const previous = await database.prepare("SELECT reward_json FROM crystal_chest_openings WHERE id=? AND player_id=?").bind(requestId, playerId).first();
	if (previous) return JSON.parse(previous.reward_json);
	const token = crypto.randomUUID();
	const gate = "EXISTS(SELECT 1 FROM crystal_chest_openings WHERE id=? AND player_id=? AND claim_token=?)";
	const statements = [database.prepare(`INSERT OR IGNORE INTO crystal_chest_openings(id,player_id,reward_json,claim_token,created_at)
 SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM player_stones WHERE player_id=? AND kind='moonlight_chest' AND amount>0)`).bind(requestId, playerId, JSON.stringify(reward), token, now, playerId)];
	if (reward.item) {
		const i = reward.item;
		statements.push(database.prepare(`INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at)
 SELECT ?,?,?,?,?,?,?,?,0,? WHERE ${gate}`).bind(i.id, playerId, i.kind, i.item_name, i.rarity, i.power, i.role, i.enchantments, now, requestId, playerId, token));
	} else if (reward.material) statements.push(database.prepare(`INSERT INTO dungeon_materials(player_id,kind,amount)
 SELECT ?,?,? WHERE ${gate} ON CONFLICT(player_id,kind) DO UPDATE SET amount=dungeon_materials.amount+excluded.amount`).bind(playerId, reward.material, reward.amount, requestId, playerId, token));
	else if (reward.stone) statements.push(database.prepare(`INSERT INTO player_stones(player_id,kind,amount)
 SELECT ?,?,? WHERE ${gate} ON CONFLICT(player_id,kind) DO UPDATE SET amount=player_stones.amount+excluded.amount`).bind(playerId, reward.stone, reward.amount, requestId, playerId, token));
	else if (reward.column && [
		"essence",
		"potions",
		"stone_dust",
		"gems",
		"pearls", "red_pearls",
		"fifth_enchant_scrolls"
	].includes(reward.column)) statements.push(database.prepare(`UPDATE players SET ${reward.column}=${reward.column}+? WHERE id=? AND ${gate}`).bind(reward.amount, playerId, requestId, playerId, token));
	else throw new Error("Geçersiz Ayışığı Sandığı ödülü.");
	statements.push(database.prepare(`UPDATE player_stones SET amount=amount-1 WHERE player_id=? AND kind='moonlight_chest' AND amount>0 AND ${gate}`).bind(playerId, requestId, playerId, token));
	await database.batch(statements);
	const receipt = await database.prepare("SELECT reward_json FROM crystal_chest_openings WHERE id=? AND player_id=?").bind(requestId, playerId).first();
	return receipt ? JSON.parse(receipt.reward_json) : null;
}
//#endregion
//#region lib/game-events.mjs
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
// Read-only hot path (combat/fishing/chest rolls): the same events_json string is
// parsed and fully validated on every attack. Reuse the validated result while
// the exact string is unchanged. The returned object is frozen; callers that
// need a mutable copy (admin editing) must keep using parseEvents().
let cachedEventsRaw,cachedEventsConfig;
const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;};
function readEventsConfig(raw){
 if(typeof raw!=='string')return parseEvents(raw);
 if(raw!==cachedEventsRaw){cachedEventsConfig=deepFreeze(parseEvents(raw));cachedEventsRaw=raw;}
 return cachedEventsConfig;
}
function eventActive(event,now=Date.now()/1000){return !!eventOccurrence499(event,now);}
function eventBonus(config,kind,now=Date.now()/1000){return eventOccurrence499(config.events[kind],now)?.percent??0;}
// Stochastic rounding preserves small rewards: +20% of 1 is really +20% on average.
function bonusAmount(amount,percent,random=Math.random){const value=Math.max(0,amount)*(1+Math.max(0,percent)/100),base=Math.floor(value);return base+(random()<value-base?1:0);}
function pickChestPrize(config,random=Math.random){const total=CHEST_PRIZES.reduce((n,p)=>n+config.weights[p.id],0);let roll=Math.max(0,Math.min(1-Number.EPSILON,random()))*total;for(const p of CHEST_PRIZES){roll-=config.weights[p.id];if(roll<0)return p;}return CHEST_PRIZES.findLast(p=>config.weights[p.id]>0);}
function pickMoonlightPrize(config,random=Math.random){const total=MOONLIGHT_PRIZES.reduce((n,p)=>n+config.moonlightWeights[p.id],0);let roll=Math.max(0,Math.min(1-Number.EPSILON,random()))*total;for(const p of MOONLIGHT_PRIZES){roll-=config.moonlightWeights[p.id];if(roll<0)return p;}return MOONLIGHT_PRIZES.findLast(p=>config.moonlightWeights[p.id]>0);}
function eventRemaining(seconds){const n=Math.max(0,Math.ceil(seconds));return `${Math.floor(n/86400)}g ${String(Math.floor(n/3600)%24).padStart(2,'0')}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}

// One extra reward per completed cast; fishing bait never multiplies this draw.
function rollFishingEventReward(config,now=Date.now()/1000,random=Math.random){
 const chance=eventBonus(config,'fishing',now);if(chance<=0||random()*100>=chance)return null;
 const total=FISHING_EVENT_PRIZES.reduce((sum,p)=>sum+config.fishingWeights[p.id],0);
 let roll=Math.max(0,Math.min(1-Number.EPSILON,random()))*total;
 for(const prize of FISHING_EVENT_PRIZES){roll-=config.fishingWeights[prize.id];if(roll<0)return prize;}
 return null;
}

function pickHalloweenPrize(config,random=Math.random){return pickMoonlightPrize({moonlightWeights:config.halloweenWeights},random);}

//#endregion
//#region lib/life-steal.ts
/** Read and heal in the same transaction; report only HP actually restored. */
async function restoreStolenLife(database, playerId, amount, memoryCombat = false) {
	if (!Number.isSafeInteger(amount) || amount <= 0) return null;
	const commit = (statements) => memoryCombat && database.combat?.enabled ? database.combatBatch(statements, playerId) : database.batch(statements);
	const rows = await commit([database.prepare("SELECT hp FROM players WHERE id=?").bind(playerId), database.prepare("UPDATE players SET hp=MIN(max_hp,hp+?),hp_revision=hp_revision+1 WHERE id=? AND hp>0 AND hp<max_hp RETURNING hp,hp_revision,max_hp").bind(amount, playerId)]);
	const healed = rows[1].results[0];
	return healed ? {
		...healed,
		healed: Math.max(0, healed.hp - Number(rows[0].results[0].hp))
	} : null;
}
//#endregion
//#region lib/wing-bonus.ts
function hasWingBonus(player) {
	return player?.wings_equipped === 1 || player?.core_wings === 1;
}
//#endregion
//#region lib/dungeon-materials.ts
var DUNGEON_MATERIALS = {"rune_defense":{label:"Safir Siper Parçası",image:"rune-defense-v422-shard"},"rune_attack":{label:"Kızıl Kudret Parçası",image:"rune-attack-v422-shard"},"rune_hp":{label:"Zümrüt Yaşam Parçası",image:"rune-hp-v422-shard"},
	wing: {
		label: "Kanat Parçası",
		image: "wing-fragment-v244"
	},
	infinite: {
		label: "Sonsuz Taşı Parçası",
		image: "infinite-fragment-v244"
	},
	pet: {
		label: "Ejderha Parçası",
		image: "dragon-fragment-v244"
	},
	...PROGRESSION_MATERIALS
,...{"halloween_pumpkin":{"label":"Bal Kabağı","image":"../game/halloween-pumpkin-v456"},"witch_wand":{"label":"Cadının Sihirli Değneği","image":"../game/witch-wand-v456"},"halloween_candy":{"label":"Cadı Şekeri","image":"../game/halloween-candy-v456"}}};
function parseDungeonMaterial(value) {
	if (typeof value !== "string" || !Object.hasOwn(DUNGEON_MATERIALS, value)) return null;
	const kind = value;
	return {
		...DUNGEON_MATERIALS[kind],
		key: kind,
		kind,
		value: 0,
		percent: false
	};
}
//#endregion
//#region lib/stone-art.ts
var STONE_DEFINITIONS = {
	critical: {
		inventory: "critical",
		enchantment: "stone_critical",
		value: 7,
		values: [
			7,
			8,
			9,
			10
		],
		itemKind: "weapon",
		label: "Kritik Şansı Taşı",
		percent: true
	},
	attack: {
		inventory: "attack",
		enchantment: "stone_attack",
		value: 25,
		values: [
			20,
			25,
			30
		],
		itemKind: "weapon",
		label: "Saldırı Gücü Taşı",
		percent: false
	},
	defense: {
		inventory: "defense",
		enchantment: "stone_defense",
		value: 50,
		values: [
			30,
			40,
			50
		],
		itemKind: "armor",
		label: "Savunma Taşı",
		percent: false
	},
	block: {
		inventory: "block",
		enchantment: "stone_block",
		value: 8,
		values: [
			6,
			7,
			8
		],
		itemKind: "armor",
		label: "Bloklama Taşı",
		percent: true
	}
};
function parseStone(key) {
	if (typeof key !== "string") return null;
	const match = /^(critical|attack|defense|block)(?::(\d+))?$/.exec(key);
	if (!match) return null;
	const kind = match[1], definition = STONE_DEFINITIONS[kind];
	const value = match[2] === void 0 ? definition.value : Number(match[2]);
	if (!definition.values.includes(value)) return null;
	if (match[2] !== void 0 && key !== `${kind}:${value}`) return null;
	return {
		...definition,
		kind,
		value,
		key
	};
}
function rollStone(kind, roll = Math.random()) {
	const values = STONE_DEFINITIONS[kind].values;
	const value = values[Math.min(values.length - 1, Math.max(0, Math.floor(roll * values.length)))];
	return parseStone(`${kind}:${value}`);
}
function stoneEffect(stone) {
	return stone.percent ? `%${stone.value}` : `+${stone.value}`;
}
//#endregion
//#region lib/infinite-power.mjs
function infiniteEquipmentPower(item,settings){const bonus=colTransferBonus491(item);const power=Math.max(0,Number(item.power)||0)-bonus;const percent=Math.max(0,Number(settings.infinite_power_percent)||0);const weaponBase=Math.max(1,Math.round(Number(settings.infinite_weapon_power)||230));if(item.kind==='weapon'&&power<=180)return Math.max(power,weaponBase)+bonus;const scaled=Math.round(power*(1+percent/100));return (item.kind==='weapon'?Math.max(power,scaled,weaponBase):scaled)+bonus;}
//#endregion
//#region lib/dungeon-service.ts
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
function dungeonLocked(id) {
	return globalThis.__colDungeon?.locked(id) ?? false;
}
//#endregion
//#region lib/group-entry-rules.mjs
var NORMAL_GROUP_RULES = Object.freeze({
	dungeonMin: 3,
	dungeonMax: 5,
	guildMin: 3,
	guildTeamSize: 10,
	guildLeadersOnly: false
});
Object.freeze({
	...NORMAL_GROUP_RULES,
	dungeonMin: 2
});
Object.freeze({
	x: 1910,
	y: 660
});
//#endregion
//#region lib/guilds.ts
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
async function applyGuardianImpact(database, attacker, ability, target, kind, now, retry = 0) {
 if(!(kind==='player'?colLabMayAffectPlayer(attacker,target):colLabMayAffectMonster(attacker,target)))return null;
 if(kind==="monster"&&ability===1&&(isBlackStoneBoss476(target.id)||isRuneV2Boss(target.id)))return null;
	if (attacker.role !== "muhafiz" || (ability !== 1 && ability !== 2)) return null;
	const own = await database.prepare("SELECT x,y,hp,position_revision,root_until_ms,stun_until_ms FROM players WHERE id=? AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=?").bind(attacker.id, attacker.area, attacker.channel, attacker.arena_match_id, attacker.realtime_scope_version).first();
	if (!own || own.hp <= 0 || own.stun_until_ms > now || ability === 2 && own.root_until_ms > now) return null;
	const hitTarget = target;
	if (kind === "player") {
		const live = await database.prepare(`SELECT x,y,realtime_scope_version FROM players
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
		moved = await database.prepare(`UPDATE players SET x=?,y=?,position_revision=position_revision+1,
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
	if (kind === "player" && ability === 2 && Math.hypot(to.x - target.x, to.y - target.y) <= 100) controlled = await database.prepare(`UPDATE players SET root_until_ms=MAX(root_until_ms,?),stun_until_ms=MAX(stun_until_ms,?),hp_revision=hp_revision+1
      WHERE id=? AND hp>0 AND area=? AND channel=? AND arena_match_id=? AND x=? AND y=?
      RETURNING x,y,position_revision,hp,hp_revision,root_until_ms,stun_until_ms`).bind(until, until, target.id, attacker.area, attacker.channel, attacker.arena_match_id, target.x, target.y).first();
	else if (kind === "monster" && !isBlackStoneBoss476(target.id) && !isRuneV2Boss(target.id)) {
		const endpoint = ability === 1 ? to : target;
		controlled = await database.prepare(`UPDATE monsters SET control_x=?,control_y=?,root_until_ms=MAX(root_until_ms,?),stun_until_ms=MAX(stun_until_ms,?)
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
async function dashGuardian(database, player, direction, now, cooldown, retry = 0) {
	const own = await database.prepare("SELECT x,y FROM players WHERE id=?").bind(player.id).first();
	const length = Math.hypot(direction.x, direction.y);
	if (!own || !Number.isFinite(length) || length < .01) return null;
	const to = guardianEndpoint(player.area, own, {
		x: own.x + direction.x / length * 600,
		y: own.y + direction.y / length * 600
	}, 600);
	const moved = await database.prepare(`UPDATE players SET x=?,y=?,attack_three_at=?+?,position_revision=position_revision+1,
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
//#endregion
//#region lib/skill-progression.ts
/** Initial 1/10 in each slot uses the first three points of the 30-point cap. */
function skillProgression(level, skills) {
	const total = skills.reduce((sum, value) => sum + Math.max(1, Math.min(10, Math.floor(value))), 0);
	const limit = Math.max(3, Math.min(30, Math.floor(level)));
	return {
		total,
		limit,
		available: Math.max(0, limit - total),
		nextLevel: Math.min(30, total + 1)
	};
}
//#endregion
//#region lib/fishing-proof.ts
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
/** Replay bounded timestamped controls together, never one HTTP round trip per tap. */
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
//#endregion
//#region lib/rest-regeneration.ts
var restStart = `MAX(last_regen_at, last_movement_at_ms + ?5 * 1000,
  MAX(last_monster_hit_at, attack_one_at, attack_two_at, attack_three_at, attack_four_at) + ?4 * 1000)`;
var eligible = `hp > 0 AND hp < max_hp AND ?3 > 0 AND last_seen >= CAST(?1 / 1000 AS INTEGER) - 15
  AND last_movement_at_ms <= ?1 - ?5 * 1000
  AND MAX(last_monster_hit_at, attack_one_at, attack_two_at, attack_three_at, attack_four_at) <= ?1 - ?4 * 1000
  AND ${restStart} <= ?1 - 1000`;
var REST_REGEN_SQL = `UPDATE players SET last_seen = CAST(?1 / 1000 AS INTEGER),
  hp = CASE WHEN ${eligible} THEN MIN(max_hp, hp + ${`MAX(1, CAST(ROUND(max_hp * ?3 / 100.0 * MIN(5000, MAX(0, ?1 - ${restStart})) / 1000.0) AS INTEGER))`}) ELSE hp END,
  hp_revision = hp_revision + CASE WHEN ${eligible} THEN 1 ELSE 0 END,
  last_regen_at = ?1
  WHERE id = ?2 RETURNING hp, max_hp, hp_revision, respawn_at_ms, area, channel, arena_match_id`;
//#endregion
//#region lib/monster-rest-regeneration.ts
var MONSTER_REST_REGEN_SQL = `UPDATE monsters SET
  hp = CASE WHEN hp > 0 AND hp < max_hp AND ?2 > 0
      AND last_damaged_at_ms <= ?1 - ?3 * 1000
      AND last_regen_at_ms <= ?1 - 1000
      AND NOT EXISTS (SELECT 1 FROM pve_engagements engagement
        WHERE engagement.monster_id = monsters.id
          AND engagement.spawn_round = monsters.spawn_round
          AND engagement.expires_at_ms >= ?1)
    THEN MIN(max_hp, hp + MAX(1, CAST(ROUND(max_hp * ?2 / 100.0 * MIN(5000, MAX(0, ?1 - MAX(last_regen_at_ms, last_damaged_at_ms + ?3 * 1000))) / 1000.0) AS INTEGER)))
    ELSE hp END,
  last_regen_at_ms = ?1
  WHERE hp > 0 AND last_regen_at_ms <= ?1 - 1000`;
function readGameInstance(request) {
	const value = request.headers.get("x-game-instance") ?? new URL(request.url).searchParams.get("instance") ?? "";
	return /^[a-f0-9-]{36}$/.test(value) ? value : "";
}
function isGameApi(path) {
	return [
		"/api/guild-skill",
		"/api/guild-chat",
		"/api/guild-voice",
		"/api/guild-village",
		"/api/ranks",
		"/api/community-event",
		"/api/guild",
		"/api/dungeon",
		"/api/premium",
		"/api/quests"
	].includes(path) || path === "/api/trade" || path === "/api/connection-diagnostics" || path === "/api/starter-reward" || path === "/api/bot-check" || path === "/api/action" || path === "/api/world" || path === "/api/chat" || path.startsWith("/api/realtime/") || path.startsWith("/api/black-zone/");
}
//#endregion
//#region lib/game-auth.ts
var SESSION_COOKIE_NAME = "__Host-yasam-session";
var CSRF_COOKIE_NAME = "__Host-yasam-csrf";
var LOCAL_SESSION_COOKIE_NAME = "yasam-session-local";
var LOCAL_CSRF_COOKIE_NAME = "yasam-csrf-local";
var SESSION_TOUCH_INTERVAL_SECONDS = 300;
var encoder = new TextEncoder();
var AuthRequestError = class extends Error {
	constructor(status, code, message, retryAfter) {
		super(message);
		this.name = "AuthRequestError";
		this.status = status;
		this.code = code;
		this.retryAfter = retryAfter;
	}
};
var realmRuntime = () => globalThis.__colRealm;
function authDatabase() {
	if (!env.DB) throw new Error("Cloudflare D1 `DB` bağlaması bulunamadı.");
	return env.DB;
}
function nowSeconds() {
	return Math.floor(Date.now() / 1e3);
}
function bytesToBase64Url(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(value) {
	const bytes = encoder.encode(value);
	const runtime = env;
	if (bytes.byteLength <= 4096 && runtime.CORE_RUNTIME === "vds") {
		const nativeDigest = runtime.CORE_SHA256;
		if (typeof nativeDigest === "function") return nativeDigest(bytes);
	}
	return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}
function timingSafeEqual(left, right) {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
	return difference === 0;
}
function assertSameOrigin(request) {
	const origin = request.headers.get("Origin");
	let expectedOrigin;
	try {
		expectedOrigin = new URL(request.url).origin;
	} catch {
		throw new AuthRequestError(403, "invalid_origin", "İstek kaynağı doğrulanamadı.");
	}
	if (!origin || origin !== expectedOrigin) throw new AuthRequestError(403, "invalid_origin", "İstek kaynağı doğrulanamadı.");
}
async function readJsonObject(request, maxBytes = 16384) {
	if (request.headers.has("x-col-lab-proof")) try { await colLabHttpAuth.captureBody(request); } catch (errorR12) { throw new AuthRequestError(403, safeLoadLabAuthCodeR12(errorR12), "Test bağlantısı doğrulanamadı."); }
	if (!Number.isSafeInteger(maxBytes) || maxBytes < 256 || maxBytes > 65536) throw new Error("Geçersiz istek boyutu sınırı.");
	if (!(request.headers.get("Content-Type")?.toLowerCase() ?? "").startsWith("application/json")) throw new AuthRequestError(415, "unsupported_media_type", "İstek JSON biçiminde olmalı.");
	const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
	if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new AuthRequestError(413, "payload_too_large", "İstek çok büyük.");
	if (!request.body) throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
	const reader = request.body.getReader();
	const decoder = new TextDecoder("utf-8", { fatal: true });
	let byteLength = 0;
	let serialized = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			byteLength += value.byteLength;
			if (byteLength > maxBytes) {
				await reader.cancel();
				throw new AuthRequestError(413, "payload_too_large", "İstek çok büyük.");
			}
			serialized += decoder.decode(value, { stream: true });
		}
		serialized += decoder.decode();
	} catch {
		if (byteLength > maxBytes) throw new AuthRequestError(413, "payload_too_large", "İstek çok büyük.");
		throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
	}
	let payload;
	try {
		payload = JSON.parse(serialized);
	} catch {
		throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
	}
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
	return payload;
}
function cookieValue(request, name) {
	const header = request.headers.get("Cookie") ?? "";
	for (const part of header.split(";")) {
		const separator = part.indexOf("=");
		if (separator < 0) continue;
		if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
	}
	return null;
}
function requestUsesSecureCookies(request) {
	try {
		return new URL(request.url).protocol === "https:";
	} catch {
		return true;
	}
}
function authCookieNames(request) {
	return requestUsesSecureCookies(request) ? {
		session: SESSION_COOKIE_NAME,
		csrf: CSRF_COOKIE_NAME,
		secure: true
	} : {
		session: LOCAL_SESSION_COOKIE_NAME,
		csrf: LOCAL_CSRF_COOKIE_NAME,
		secure: false
	};
}
function validOpaqueToken(value) {
	return Boolean(value && value.length >= 32 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value));
}
function csrfTokenFromRequest(request) {
	const token = cookieValue(request, authCookieNames(request).csrf);
	return validOpaqueToken(token) ? token : null;
}
// V465: reuse only the immutable token digest, never authorization or presence.
const requestSessionHashes465 = new WeakMap();
async function getGameSession(request, onLookup) {
	const sessionToken = cookieValue(request, authCookieNames(request).session);
	if (!validOpaqueToken(sessionToken) || !sessionToken) return null;
	let digest = requestSessionHashes465.get(request);
	if (!digest || digest.token !== sessionToken) {
		digest = {token: sessionToken, hash: sha256(sessionToken)};
		requestSessionHashes465.set(request, digest);
	}
	const tokenHash = await digest.hash;
	onLookup?.(tokenHash);
	return getGameSessionByHash(tokenHash, request);
}
async function getGameSessionByHash(tokenHash, request, trustedRealtime = false) {
	const now = nowSeconds();
	const record = await authDatabase().prepare(realmRuntime()?.role === "accounts" ? `SELECT s.token_hash,s.account_id,s.csrf_hash,s.expires_at,s.last_seen_at,
      s.security_version,a.security_version AS account_security_version,a.suspended_until_ms,a.permanently_banned,a.ban_reason,a.username,a.email,
      NULL AS player_id,NULL AS player_name,NULL AS player_role,NULL AS player_area,NULL AS player_level,
      NULL AS instance_id,NULL AS presence_token_hash,NULL AS presence_expires_at_ms,NULL AS chat_after_id
      FROM auth_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1` : `SELECT s.token_hash, s.account_id, s.csrf_hash, s.expires_at, s.last_seen_at,
      s.security_version, a.security_version AS account_security_version,
      a.suspended_until_ms, a.permanently_banned, a.ban_reason,
      a.username, a.email, p.id AS player_id, p.name AS player_name, p.role AS player_role,
      p.area AS player_area, p.level AS player_level,
      presence.instance_id, presence.token_hash AS presence_token_hash, presence.expires_at_ms AS presence_expires_at_ms, presence.chat_after_id
     FROM auth_sessions s
     JOIN accounts a ON a.id = s.account_id
     LEFT JOIN players p ON p.account_id = a.id
     LEFT JOIN game_presence presence ON presence.account_id = a.id
     WHERE s.token_hash = ? AND s.expires_at > ?
     LIMIT 1`).bind(tokenHash, now).first();
	if (!record) return null;
	if (record.security_version !== record.account_security_version) return null;
	if (record.permanently_banned || record.suspended_until_ms > Date.now()) throw new AuthRequestError(423, "account_suspended", record.ban_reason || "Hesabın güvenlik nedeniyle geçici olarak askıya alındı.");
	const session = {
		tokenHash: record.token_hash,
		gamePresence: record.instance_id ? {
			instanceId: record.instance_id,
			tokenHash: record.presence_token_hash ?? "",
			expiresAtMs: record.presence_expires_at_ms ?? 0,
			chatAfterId: record.chat_after_id ?? 0
		} : void 0,
		account: {
			id: record.account_id,
			username: record.username,
			email: record.email
		},
		player: record.player_id && record.player_name && record.player_role ? {
			id: record.player_id,
			name: record.player_name,
			role: record.player_role
		} : null,
		playerAccess: record.player_id && record.player_area !== null && record.player_level !== null ? {
			area: record.player_area,
			level: record.player_level
		} : null,
		csrfHash: record.csrf_hash,
		expiresAt: record.expires_at,
		lastSeenAt: record.last_seen_at,
		securityVersion: record.security_version
	};
	try { const pending = colLabHttpAuth.beforeSessionTouch(request, session, trustedRealtime); if (pending) await pending; } catch (errorR12) { throw new AuthRequestError(403, safeLoadLabAuthCodeR12(errorR12), "Test bağlantısı doğrulanamadı."); }
	if (record.last_seen_at <= now - SESSION_TOUCH_INTERVAL_SECONDS) await authDatabase().prepare("UPDATE auth_sessions SET last_seen_at = ? WHERE token_hash = ? AND last_seen_at <= ?").bind(now, tokenHash, now - SESSION_TOUCH_INTERVAL_SECONDS).run();
	return session;
}
async function requireGameSession(request, onLookup) {
	return validateGameSession(request, await getGameSession(request, onLookup));
}
async function requireRealtimeGameSession(request, tokenHash) {
	if (env.CORE_RUNTIME !== "vds") throw new AuthRequestError(403, "invalid_movement_transport", "Hareket bağlantısı doğrulanamadı.");
	return validateGameSession(request, await getGameSessionByHash(tokenHash, request, true));
}
async function validateGameSession(request, session) {
	if (!session) throw new AuthRequestError(401, "authentication_required", "Oturum açmalısın.");
	const realm = realmRuntime(), path = new URL(request.url).pathname;
 if(realm?.maintenance&&!realm.maintenance.allows(session.account.id))throw new AuthRequestError(403,'game_maintenance','Oyun şu an bakımda.');
	if (realm?.role === "accounts") throw new AuthRequestError(403, "realm_required", "Önce sunucu seçmelisin.");
	if (realm?.role === "game") {
		if (realm.realm.status !== "open" || realm.policy?.status && realm.policy.status !== "open") throw new AuthRequestError(503, "realm_closed", "Sunucu kapalı.");
		const decision = realm.security.authorize(session.account.id, session.securityVersion);
		const allowed = typeof decision === "boolean" ? decision : await decision;
		if (realm.policy?.status !== "open") throw new AuthRequestError(503, "realm_closed", "Sunucu kapalı.");
		if (!allowed&&realm.policy?.launch?.phase==="maintenance") throw new AuthRequestError(403,"game_maintenance","Oyun şu an bakımda.");
 if (!allowed) throw new AuthRequestError(401, "security_verification_required", "Oturumunu yeniden doğrula.");
	}
	const launch = globalThis.__colLaunch;
	if (realm?.role !== "game" && launch && !launch.status(session.account.id).canPlay) throw new AuthRequestError(403, "launch_locked", "Oyun henüz erişime açık değil. Açılış ekranına dön.");
	if (isGameApi(new URL(request.url).pathname)) {
		const presence = session.gamePresence;
		if (!presence || presence.instanceId !== readGameInstance(request) || presence.tokenHash !== session.tokenHash || presence.expiresAtMs <= Date.now()) throw new AuthRequestError(409, "game_instance_expired", "Bu oyun penceresinin oturumu açık değil. Yeniden bağlan.");
	}
	const pathname = new URL(request.url).pathname;
	const bot = globalThis.__colBotCheck;
	const mustCheckBot465 = bot && session.player && ![
		"/api/bot-check", "/api/game-presence", "/api/auth/logout", "/api/support"
	].includes(pathname) && (request.method !== "GET" || pathname.startsWith("/api/realtime/"));
	let botRequired465 = false;
	if (mustCheckBot465 && bot.requiredPrepared) {
		const result = bot.requiredPrepared(session.account.id);
		botRequired465 = typeof result === "boolean" ? result : await result;
	} else {
		if (bot?.prepare && session.player) {
			const pending = bot.prepare(session.account.id);
			if (pending) await pending;
		}
		if (mustCheckBot465) botRequired465 = bot.required(session.account.id);
	}
	if (botRequired465) throw new AuthRequestError(403, "bot_check_required", "Devam etmek için bot doğrulamasını tamamla.");
	if (session.player && session.playerAccess?.area?.startsWith("guild_")) {
		const { guildVillageService, publishGuildEjections } = await import("./assets/guild-village-runtime-Dke_G6YB.js");
		const repair = guildVillageService()?.repair(session.player.id);
		if (repair) {
			session.playerAccess.area = repair.area;
			await publishGuildEjections([repair]);
		}
	}
	return session;
}
async function assertCsrf(request, session) {
	assertSameOrigin(request);
	const cookieToken = csrfTokenFromRequest(request);
	const headerToken = request.headers.get("X-CSRF-Token");
	if (!validOpaqueToken(cookieToken) || !validOpaqueToken(headerToken) || !cookieToken || !headerToken) throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
	if (!timingSafeEqual(encoder.encode(cookieToken), encoder.encode(headerToken))) throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
	const submittedHash = await sha256(headerToken);
	if (!timingSafeEqual(encoder.encode(submittedHash), encoder.encode(session.csrfHash))) throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
}
function noStoreHeaders(initial) {
	const headers = new Headers(initial);
	headers.set("Cache-Control", "no-store, max-age=0");
	headers.set("Pragma", "no-cache");
	return headers;
}
var nextRateLimitCleanupAt = 0;
async function enforceRateLimit(scope, identifier, { limit, windowSeconds, blockSeconds }, loadlabRateContext = null) {
	const now = nowSeconds();
	const cutoff = now - windowSeconds;
	const key = await sha256(`${scope}:${identifier}`);
	const database = authDatabase();
	const cleanupDue = !loadlabRateContext && now >= nextRateLimitCleanupAt;
	if (cleanupDue) nextRateLimitCleanupAt = now + 3600;
	const statements = [...cleanupDue ? [database.prepare("DELETE FROM auth_rate_limits WHERE blocked_until <= ? AND window_started_at <= ?").bind(now, now - 1440 * 60)] : [], database.prepare(`INSERT INTO auth_rate_limits (key, attempts, window_started_at, blocked_until)
     VALUES (?, 1, ?, 0)
     ON CONFLICT(key) DO UPDATE SET
       attempts = CASE
         WHEN auth_rate_limits.blocked_until > ? THEN auth_rate_limits.attempts
         WHEN auth_rate_limits.window_started_at <= ? THEN 1
         ELSE auth_rate_limits.attempts + 1
       END,
       window_started_at = CASE
         WHEN auth_rate_limits.window_started_at <= ? THEN ?
         ELSE auth_rate_limits.window_started_at
       END,
       blocked_until = CASE
         WHEN auth_rate_limits.blocked_until > ? THEN auth_rate_limits.blocked_until
         WHEN auth_rate_limits.window_started_at > ? AND auth_rate_limits.attempts + 1 > ? THEN ?
         ELSE 0
       END
     RETURNING attempts, blocked_until`).bind(key, now, now, cutoff, cutoff, now, now, cutoff, limit, now + blockSeconds)];
	if (loadlabRateContext) colLabHttpAuth.tagRateLimit(loadlabRateContext, statements[statements.length - 1], {scope,identifier,key,limit,windowSeconds,blockSeconds});
	const responses = await database.batch(statements);
	const result = responses[responses.length - 1].results[0];
	if (!result || result.blocked_until > now || result.attempts > limit) throw new AuthRequestError(429, "rate_limited", "Çok fazla deneme yaptın. Bir süre sonra tekrar dene.", Math.max(1, (result?.blocked_until ?? now + blockSeconds) - now));
}
function authErrorResponse(error, fallback = "İşlem şu anda tamamlanamadı.") {
	if (error instanceof Error && error.message.includes("channel_full")) return Response.json({
		code: "channel_full",
		error: "Kanal dolu. Boş bir kanal seç veya yer açılmasını bekle."
	}, {
		status: 409,
		headers: noStoreHeaders()
	});
	if (error instanceof AuthRequestError) {
		const headers = noStoreHeaders();
		if (error.retryAfter) headers.set("Retry-After", String(error.retryAfter));
		return Response.json({
			error: error.message,
			code: error.code,
			...(error.code==='game_maintenance'&&globalThis.__colRealm?.maintenance?{maintenance438:globalThis.__colRealm.maintenance.view(),maintenanceRevision491:globalThis.__colRealm.maintenance.policy?.revision??0,snapshotAtMs:Date.now()}:{})
		}, {
			status: error.status,
			headers
		});
	}
	console.error("Auth operation failed", error instanceof Error ? error.message : "unknown error");
	return Response.json({ error: fallback }, {
		status: 500,
		headers: noStoreHeaders()
	});
}
//#endregion
//#region lib/anti-cheat.ts
var localWindows = /* @__PURE__ */ new Map();
var nextLocalCleanupAtMs = 0;
/**
* Fast abuse shedder. Canonical gameplay checks still live in D1; this map only
* prevents one isolate from spending unlimited CPU/D1 work on an obvious flood.
*/
function enforceLocalActionRate(accountId, action) {
	const nowMs = Date.now();
	const category = (action === "upgrade_unique" || action === "evolve_weapon") ? "crafting485" : action === "move" ? "move" : action === "heartbeat" ? "heartbeat" : action === "attack" || action === "pvp_attack" || action === "hurt" ? "combat" : action === "collect" ? "loot" : action === "claim_rewards" ? "rewards" : action === "fishing_input" ? "fishing" : /listing|shop|fish|buy_|sell_|exchange|upgrade|epin/.test(action) ? "economy" : "other";
	const limits = {
		global: {
			intervalMs: 6e4,
			limit: 720
		},
		move: {
			intervalMs: 6e4,
			limit: 360
		},
		heartbeat: {
			intervalMs: 6e4,
			limit: 30
		},
		combat: {
			intervalMs: 6e4,
			limit: 240
		},
		loot: {
			intervalMs: 6e4,
			limit: 360
		},
		rewards: {
			intervalMs: 6e4,
			limit: 180
		},
		fishing: {
			intervalMs: 6e4,
			limit: 480
		},
		crafting485: { intervalMs: 6e4, limit: 240 },
		economy: {
			intervalMs: 6e4,
			limit: 45
		},
		other: {
			intervalMs: 6e4,
			limit: 120
		}
	};
	for (const scope of ["global", category]) {
		const limit = limits[scope];
		const key = `${accountId}:${scope}`;
		const previous = localWindows.get(key);
		const next = !previous || nowMs - previous.startedAtMs >= limit.intervalMs ? {
			startedAtMs: nowMs,
			count: 1
		} : {
			startedAtMs: previous.startedAtMs,
			count: previous.count + 1
		};
		localWindows.set(key, next);
		if (next.count > limit.limit) return Math.max(1, Math.ceil((next.startedAtMs + limit.intervalMs - nowMs) / 1e3));
	}
	if (nowMs >= nextLocalCleanupAtMs) {
		nextLocalCleanupAtMs = nowMs + 6e4;
		for (const [key, window] of localWindows) if (nowMs - window.startedAtMs > 12e4) localWindows.delete(key);
	}
	return 0;
}
async function recordSecurityEvent(_request, _session, _event) {}
//#endregion
//#region lib/movement-policy.ts
function movementSpeedForRole(role) {
	return (role === "avci" ? 265 : 239) * 1.07;
}
function evaluateMovementBudget(role, distance, nowMs, checkedAtMs, debtMs) {
	const speed = movementSpeedForRole(role);
	const elapsedMs = checkedAtMs > 0 ? Math.max(0, Math.min(1600, nowMs - checkedAtMs)) : 520;
	const travelMs = Math.ceil(Math.max(0, distance) / speed * 1e3);
	const nextDebtMs = Math.max(0, Math.max(0, debtMs) + travelMs - elapsedMs);
	const maxSingleDistance = speed * 1.84;
	const maxJitterDebtMs = 1e3;
	return {
		speed,
		elapsedMs,
		travelMs,
		nextDebtMs,
		maxSingleDistance,
		allowed: distance <= maxSingleDistance && nextDebtMs <= maxJitterDebtMs,
		severe: distance > maxSingleDistance * 1.5 || nextDebtMs > maxJitterDebtMs * 2
	};
}
function movementPathDistance(from, to, raw, walkable) {
	if (raw === void 0) return walkable(from.x, from.y, to.x, to.y) ? Math.hypot(to.x - from.x, to.y - from.y) : null;
	if (!Array.isArray(raw) || !raw.length || raw.length > 64) return null;
	if (!raw.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n)))) return null;
	const path = raw;
	const end = path.at(-1);
	if (end[0] !== to.x || end[1] !== to.y) return null;
	const resumeAt = path.findLastIndex((p) => p[0] === from.x && p[1] === from.y);
	let start = Math.max(0, resumeAt + 1);
	if (resumeAt < 0) for (let i = 1; i < path.length; i++) {
		const [ax, ay] = path[i - 1], [bx, by] = path[i];
		const dx = bx - ax, dy = by - ay, lengthSquared = dx * dx + dy * dy;
		const ratio = lengthSquared ? ((from.x - ax) * dx + (from.y - ay) * dy) / lengthSquared : -1;
		if (ratio >= 0 && ratio <= 1 && Math.hypot(from.x - ax - ratio * dx, from.y - ay - ratio * dy) < 1e-6) start = i;
	}
	let previous = from, distance = 0;
	for (const point of path.slice(start)) {
		if (!walkable(previous.x, previous.y, point[0], point[1])) return null;
		distance += Math.hypot(point[0] - previous.x, point[1] - previous.y);
		previous = {
			x: point[0],
			y: point[1]
		};
	}
	return distance;
}
//#endregion
//#region lib/movement-security.ts
function validArea(area) {
	return typeof area === "string" && /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(area);
}
async function readAuthoritativeMovement(database, playerId, accountId, nowMs) {
	return database.prepare(`SELECT id, role, x, y, hp, hp_revision, area, channel, arena_match_id,
       COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) AS world_cycle,
       movement_checked_at_ms, movement_debt_ms, position_revision, root_until_ms, realtime_scope_version,
       EXISTS (SELECT 1 FROM pve_engagements engagement
         WHERE engagement.player_id = players.id AND engagement.next_hit_at_ms <= ?) AS pve_hit_due
     FROM players WHERE id = ? AND account_id = ? LIMIT 1`).bind(nowMs, playerId, accountId).first();
}
async function applyAuthoritativeMove(request, session, database, payload, nowMs = Date.now(), initialRow, scope) {
	const playerId = session.player?.id ?? "";
	const targetX = Number(payload.x);
	const targetY = Number(payload.y);
	if (!playerId || !Number.isFinite(targetX) || !Number.isFinite(targetY) || payload.area !== void 0 && !validArea(payload.area)) return {
		ok: false,
		status: 400,
		code: "invalid_movement",
		message: "Hareket verisi geçersiz."
	};
	for (let attempt = 0; attempt < 2; attempt += 1) {
		const row = attempt === 0 && initialRow?.id === playerId ? initialRow : await readAuthoritativeMovement(database, playerId, session.account.id, nowMs);
		if (!row) return {
			ok: false,
			status: 409,
			code: "movement_state_missing",
			message: "Hareket durumu bulunamadı."
		};
		const authoritative = {
			x: row.x,
			y: row.y,
			area: row.area,
			positionRevision: row.position_revision
		};
		if (scope && (scope.scopeVersion !== row.realtime_scope_version || scope.cycle !== row.world_cycle || scope.channel !== row.channel || scope.area !== row.area || scope.arenaMatchId !== row.arena_match_id)) return {
			ok: false,
			status: 409,
			code: "realtime_scope_changed",
			message: "Harita bağlantısını yenile.",
			...authoritative
		};
		if (row.hp <= 0 || payload.area !== void 0 && payload.area !== row.area) return {
			ok: false,
			status: 409,
			code: "movement_state_changed",
			message: "Konumun sunucuyla eşitleniyor.",
			...authoritative
		};
		if (row.root_until_ms > nowMs) return {
			ok: false,
			status: 409,
			code: "movement_rooted",
			message: "Kısa süreliğine sabitlendin.",
			untilMs: row.root_until_ms,
			...authoritative
		};
		if (payload.basePositionRevision !== void 0 && (!Number.isSafeInteger(payload.basePositionRevision) || payload.basePositionRevision !== row.position_revision)) return {
			ok: false,
			status: 409,
			code: "movement_checkpoint_stale",
			message: "Hareket kontrol noktası yenileniyor.",
			...authoritative
		};
		const distance = movementPathDistance(row, {
			x: targetX,
			y: targetY
		}, payload.path, (fromX, fromY, toX, toY) => isAreaWalkableSegment(row.area, fromX, fromY, toX, toY));
		if (distance === null) {
			await recordSecurityEvent(request, session, {
				code: "invalid_path",
				surface: "action",
				actionName: "move",
				confidence: 75,
				scoreDelta: 8,
				evidence: {
					distance: Math.hypot(targetX - row.x, targetY - row.y),
					area: row.area
				}
			});
			return {
				ok: false,
				status: 409,
				code: "movement_path_rejected",
				message: "Bu yönde ilerleyemezsin.",
				...authoritative
			};
		}
		const movement = evaluateMovementBudget(row.role, distance, nowMs, row.movement_checked_at_ms, row.movement_debt_ms);
		if (!movement.allowed) {
			await recordSecurityEvent(request, session, {
				code: movement.severe ? "teleport_attempt" : "speed_violation",
				surface: "action",
				actionName: "move",
				confidence: movement.severe ? 98 : 78,
				scoreDelta: movement.severe ? 35 : 10,
				evidence: {
					distance,
					elapsedMs: movement.elapsedMs,
					debtMs: movement.nextDebtMs,
					speed: movement.speed,
					area: row.area
				}
			});
			return {
				ok: false,
				status: 409,
				code: "movement_speed_rejected",
				message: "Hareket hızın sunucuyla eşitleniyor.",
				...authoritative
			};
		}
		const validMotion = typeof payload.motionStreamId === "string" && /^[A-Za-z0-9-]{16,80}$/.test(payload.motionStreamId) && Number.isSafeInteger(payload.motionSequence) && Number(payload.motionSequence) >= 1;
		const checkpoint = database.prepare(`UPDATE players SET x = ?, y = ?, movement_checked_at_ms = ?, movement_debt_ms = ?,
         position_revision = position_revision + 1, motion_stream_id = ?, motion_sequence = ?, last_seen = ?
       WHERE id = ? AND account_id = ? AND hp > 0 AND area = ?
         AND position_revision = ? AND movement_checked_at_ms = ? AND movement_debt_ms = ?
         AND realtime_scope_version = ? AND channel = ? AND arena_match_id = ?
         AND COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) = ?
         AND x = ? AND y = ? AND root_until_ms <= ?
         AND COALESCE((SELECT reset_at FROM world_state WHERE id = 1), 0) <= ?
         AND NOT EXISTS (SELECT 1 FROM fishing_sessions WHERE player_id = players.id AND expires_at_ms >= ?)
       RETURNING x, y, position_revision`).bind(targetX, targetY, nowMs, movement.nextDebtMs, validMotion ? payload.motionStreamId : "", validMotion ? payload.motionSequence : 0, Math.floor(nowMs / 1e3), playerId, session.account.id, row.area, row.position_revision, row.movement_checked_at_ms, row.movement_debt_ms, row.realtime_scope_version, row.channel, row.arena_match_id, row.world_cycle, row.x, row.y, nowMs, Math.floor(nowMs / 1e3), nowMs);
		const native = database;
		const moved = native.positionCheckpoint ? await native.positionCheckpoint(checkpoint) : await checkpoint.first();
		if (moved) return {
			ok: true,
			x: moved.x,
			y: moved.y,
			area: row.area,
			channel: row.channel,
			arenaMatchId: row.arena_match_id,
			worldCycle: row.world_cycle,
			positionRevision: moved.position_revision
		};
	}
	const current = await readAuthoritativeMovement(database, playerId, session.account.id, nowMs);
	return {
		ok: false,
		status: 409,
		code: "movement_conflict",
		message: "Konumun sunucuyla eşitleniyor.",
		...current ? {
			x: current.x,
			y: current.y,
			area: current.area,
			positionRevision: current.position_revision
		} : {}
	};
}
//#endregion
//#region lib/arena.ts
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
//#endregion
//#region lib/character-name.ts
function characterNameKey(name) {
	return name.normalize("NFKC").toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/\s+/gu, "");
}
//#endregion
//#region lib/area-skill-position.ts
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
//#endregion
//#region lib/pets.ts
var PET_DEFINITIONS = {
	starter: {
		name: "Başlangıç Tilkisi",
		price: 0,
		attack: 10,
		experienceMultiplier: 1
	},
	dragon: {
		name: "Çekirdek Ejderhası",
		price: 0,
		attack: 45,
		experienceMultiplier: 1
	},
	bird: {
		name: "Işık Kanadı",
		price: 200,
		attack: 20,
		experienceMultiplier: 1.1
	},
	monkey: {
		name: "Minik Usta",
		price: 200,
		attack: 20,
		experienceMultiplier: 1.1
	},
	dog: {
		name: "Orman Bekçisi",
		price: 200,
		attack: 0,
		experienceMultiplier: 1.2
	}
};
function isPetKind(value) {
	return typeof value === "string" && value in PET_DEFINITIONS;
}
function validPetName(value) {
	if (typeof value !== "string") return null;
	const name = value.normalize("NFC").trim().replace(/\s+/g, " ");
	return /^[\p{L}\p{N}][\p{L}\p{N} '’-]{1,17}$/u.test(name) ? name : null;
}
//#endregion
//#region app/api/action/route.ts
var runRewardDelivery = createRewardDeliverySingleFlight();
var runRewardMaintenance = createMaintenanceSingleFlight();
var roles = new Set([
	"muhafiz",
	"avci",
	"arkanist"
]);
var DROP_COLLECTION_RANGE = 280;
var FISHERMAN = {
	x: 1770,
	y: 970
};
var BLACKSMITH_HASO = {
	x: 1200,
	y: 390
};
var STORAGE_KEEPER = {
	x: 1790,
	y: 1110
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
var BLACKSMITH_INTERACTION_RANGE = 245;
var PENDING_DROP_ENCHANTMENTS = "__pending__";
var PROFILE_PENDING_DROP_ENCHANTMENTS = "__profile_pending__";
var WORLD_BOSS_TOP_DAMAGE_GEMS = 30;
async function announceRareDrop(database, player, itemName, dropId, rarity, now) {
	const expiresAtMs = Date.now() + 7e3;
	const requestId = `${rarity}-drop-${dropId}`.slice(0, 80);
	const inserted = await database.prepare(`INSERT INTO messages
    (player_id, player_name, recipient_id, scope, area, channel, body, created_at, announcement_expires_at_ms, announcement_request_id)
    VALUES (?, 'GANİMET', NULL, 'world', NULL, 1, ?, ?, ?, ?)
    ON CONFLICT(player_id, announcement_request_id) DO NOTHING
    RETURNING id, player_id, player_name, recipient_id, scope, area, channel, body, created_at, announcement_expires_at_ms`).bind(player.id, rarity === "purple" ? `${player.name}, ${itemName} kazandı!` : `${itemName} · ${player.name} kazanmıştır!`, now, expiresAtMs, requestId).first();
	if (!inserted) return;
	await broadcastAnnouncement(database, inserted, now);
}
async function broadcastAnnouncement(database, inserted, now) {
	const [world, rooms] = await Promise.all([database.prepare("SELECT cycle FROM world_state WHERE id = 1").first(), database.prepare("SELECT DISTINCT channel, area, arena_match_id FROM players WHERE last_seen >= ?").bind(now - 30).all()]);
	if (!world) return;
	await publishRealtimeWorldEvent(world.cycle, rooms.results.map((room) => ({
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
async function deliverRealtime(task) {
	const guarded = task.then(() => void 0).catch((error) => {
		console.warn("Deferred realtime delivery failed; HTTP reconciliation remains active.", error);
	});
	const context = getRequestExecutionContext();
	if (context) {
		context.waitUntil(guarded);
		return;
	}
	if (env.CORE_RUNTIME === "vds") return;
	await guarded;
}
function startBackgroundTask(task) {
	const defer = env.CORE_DEFER_TASK;
	return defer ? defer(task) : task();
}
function scheduleRequestTask(task, label) {
	const context = getRequestExecutionContext();
	if (!context && env.CORE_RUNTIME !== "vds") return false;
	const guarded = task.catch((error) => {
		console.warn(`${label} failed; the next heartbeat will retry recoverable work.`, error);
	});
	if (context) context.waitUntil(guarded);
	return true;
}
function monsterCombatPosition(monster, player) {
	if (Number(monster.root_until_ms) > Date.now()) return {
		ok: true,
		supplied: true,
		x: Number(monster.control_x),
		y: Number(monster.control_y)
	};
	if (monster.is_stone || isFrozenWaterId(monster.id)) return {
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
var effectiveMaxHpSql = `MAX(1,
  COALESCE((SELECT player_max_hp FROM combat_settings WHERE id = 1), 100)
  + MIN(3000000, MAX(0, COALESCE((
  SELECT SUM(MIN(1000000, MAX(0, CAST(json_extract(
    CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '\$.value'
  ) AS INTEGER))))
  FROM player_items hp_item,
    json_each(CASE WHEN json_valid(hp_item.enchantments) THEN hp_item.enchantments ELSE '[]' END) effect
  WHERE hp_item.player_id = players.id AND hp_item.equipped = 1
    AND hp_item.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume')
    AND json_extract(CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '\$.kind') = 'hp'
), 0))) + ${setHpSql()} + ${rankHpSql()} + ${guildHpSql()} + ${premiumHpSql()}
  + CASE WHEN EXISTS(SELECT 1 FROM player_pets WHERE player_id=players.id AND kind='starter' AND equipped=1 AND acquired_at+259200>unixepoch()) THEN 350 ELSE 0 END
)`;
effectiveMaxHpSql='MAX(1,CAST(ROUND(('+effectiveMaxHpSql+')*'+"(1+CASE WHEN players.level>=65 AND players.rank_tier>0 THEN players.rune_hp_level*COALESCE((SELECT json_extract(config_json,'$.bonusPerLevel') FROM rune_settings WHERE id=1),0.2)/100.0 ELSE 0 END + CASE WHEN COALESCE((SELECT json_extract(config_json,'$.enabled') FROM status_settings WHERE id=1),1)=1 THEN players.stat_hp*MIN(1.0,MAX(0,MIN(65,players.level)-1)*3.0/MAX(1,players.stat_attack+players.stat_defense+players.stat_hp))*COALESCE((SELECT json_extract(config_json,'$.hp') FROM status_settings WHERE id=1),12)/6400.0 ELSE 0 END)"+') AS INTEGER))';
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
async function finalizePendingDropEnchantments(database, settings, scope) {
	const scoped = scope ? " AND owner_id = ?" + (scope.dropId ? " AND id = ?" : " AND monster_id IN (SELECT value FROM json_each(?))") : "";
	const binds = scope ? [scope.ownerId, scope.dropId ?? JSON.stringify(scope.monsterIds ?? [])] : [];
	const rows = await database.prepare(`SELECT id, kind, item_name, rarity, role, enchantments FROM world_drops
     WHERE enchantments IN ('__pending__','__profile_pending__') AND kind IN ('weapon','armor','helmet','shoes','necklace')${scoped}
     ORDER BY expires_at LIMIT 64`).bind(...binds).all();
	if (!rows.results.length) return;
	await database.batch(rows.results.map((row) => {
		const kind = row.enchantments === PROFILE_PENDING_DROP_ENCHANTMENTS && isGearKind(row.kind) ? row.kind : droppedGearKind(row.kind);
		return database.prepare("UPDATE world_drops SET kind = ?, item_name = ?, enchantments = ?, expires_at = MAX(expires_at, CAST(strftime('%s','now') AS INTEGER) + 120) WHERE id = ? AND enchantments = ?").bind(kind, droppedGearName(kind, row.role, row.rarity, row.item_name), JSON.stringify(rollEnchantments(settings, kind)), row.id, row.enchantments);
	}));
}
async function tryFinalizePendingDropEnchantments(database, settings, scope) {
	try {
		await finalizePendingDropEnchantments(database, settings, scope);
	} catch (error) {
		console.error("Bekleyen ganimet efsunları tamamlanamadı; sonraki istekte yeniden denenecek.", error);
	}
}
function profileFromDefeat(defeat, fallbackKey, settings) {
 if(String(fallbackKey).startsWith('rune.')||String(fallbackKey).startsWith('rune_v2.')){const saved=JSON.parse(defeat.loot_profile_json);if(saved?.version!==1||saved.key!==fallbackKey||!saved.runeLoot)throw Error('Rün ganimeti kaydı geçersiz.');return saved;}
	return parseLiveLootProfileSnapshot(defeat, directLootProfile(buildDefaultLootProfile(fallbackKey, settings)));
}
function prepareProfileDrops(profile, participants, monsterId, center, settings, now, eventSnapshot, pearlsRetired = false) {
 // Only this frozen boss profile grants independent existing rolls to each
 // authoritative participant. Old pending deaths and ordinary rune mobs keep
 // their original single-owner distribution; no ranking reward is duplicated.
 if(profile.runeBossPersonal502===true&&profile.key==='rune_v2.boss'&&/^rune-v2-boss-c[1-3]-1$/.test(colLabMonsterSource(monsterId))){
  const personal502={...profile,runeBossPersonal502:false};
  return participants.flatMap(participant=>prepareProfileDrops(personal502,[participant],monsterId,center,settings,now,eventSnapshot,pearlsRetired));
 }

 if(profile.runeLoot){const rates487=JSON.parse(eventSnapshot||'{}'),policy487=balanceFromSnapshot487(rates487),area487=balanceArea487({...center,id:monsterId},profile.key);let owner487;
 const rows=prepareRuneDrops(profile,participants,monsterId,center,settings,now,{role:rollLootRole,name:resolveLootItemName,power:rollLootPower,enchants:rollEnchantments,onOwner487:o=>{owner487=o;},balance487:(kind,owner)=>catalogMultiplier487(kind,balanceFactor487(policy487,area487,owner.level),materialLevelPolicy498(rates487))});
 const rate=(Number(rates487.halloween)||0)*(policy487?.enabled?balanceFactor487(policy487,area487,owner487?.level):1);
 if(rate>0&&participants.length&&Math.random()*100<rate){const owner=policy487?.enabled?owner487.player_id:rows[0]?.[1]??participants[Math.min(participants.length-1,Math.floor(Math.random()*participants.length))].player_id;rows.push([crypto.randomUUID(),owner,monsterId,'halloween_pumpkin','Bal Kabağı','orange',0,1,null,'[]',center.x+20,center.y+22,now+120,now+5]);}return rows;}
	const rates = JSON.parse(eventSnapshot || "{}");
 const balance487=balanceFromSnapshot487(rates),balanceArea=balanceArea487({...center,id:monsterId},profile.key);
	if (rates.materials) profile = withUpgradeMaterialDrops(profile, rates.materials);
	const expiresAt = now + 120;
	const collectibleAt = now + 5;
	const prepared = [];
	const personalBossLoot = profile.key.startsWith("boss.");
	const lootOwnerIndex = participants.length ? Math.floor(Math.random() * participants.length) : -1;
	participants.forEach((participant, participantIndex) => {
		const ownsItems = personalBossLoot || participantIndex === lootOwnerIndex;
		const levelBalanceMultiplier487=balanceFactor487(balance487,balanceArea,participant.level);
		const itemMultiplier = balance487?.enabled?1:forestLootMultiplier(profile.key, participant.level, settings);
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
function defaultLootSnapshot(target, settings) {if(target.area==='event'){const p=globalThis.__colEventIsland444?.profile(target);if(p?.loot)return p.loot;}
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
	const snapshot = createLootProfileSnapshot({
		sourceKey,
		revision: 0,
		customized: false,
		updatedAt: 0,
		profile: directLootProfile(buildDefaultLootProfile(sourceKey, settings))
	});
	settingsCache.set(sourceKey, snapshot);
	return snapshot;
}
async function ensureStarterWeapon(database, playerId, power, now) {
	const starterId = `starter-${crypto.randomUUID()}`;
	await database.batch([database.prepare(`INSERT OR IGNORE INTO player_items
        (id, player_id, kind, item_name, rarity, power, role, equipped, created_at)
       SELECT ?, id, 'weapon',
         CASE role WHEN 'avci' THEN 'Acemi Yayı' WHEN 'arkanist' THEN 'Acemi Asası' ELSE 'Acemi Kılıcı' END,
         'white', ?, role,
         CASE WHEN rod_equipped = 0 AND NOT EXISTS (
           SELECT 1 FROM player_items equipped_weapon
           WHERE equipped_weapon.player_id = players.id AND equipped_weapon.kind = 'weapon' AND equipped_weapon.equipped = 1
         ) THEN 1 ELSE 0 END,
         ?
       FROM players WHERE id = ? AND NOT EXISTS (
         SELECT 1 FROM player_items owned WHERE owned.player_id = players.id AND owned.kind = 'weapon'
       )`).bind(starterId, power, now, playerId), database.prepare(`UPDATE player_items SET equipped = 1
       WHERE id = ? AND player_id = ?
         AND EXISTS (SELECT 1 FROM players WHERE id = ? AND rod_equipped = 0)
         AND NOT EXISTS (
           SELECT 1 FROM player_items equipped_weapon
           WHERE equipped_weapon.player_id = ? AND equipped_weapon.kind = 'weapon' AND equipped_weapon.equipped = 1
         )`).bind(starterId, playerId, playerId, playerId)]);
}
function prepareMonsterXp(database, settings, now, monsterId, spawnRound, reward, lethalDamage, includeBefore = false, questMonster438 = null) {
	const token = crypto.randomUUID(), xp = Math.max(0, Math.floor(reward));
 const balanceXpFactor487=balanceXpSql487(settings,questMonster438,monsterId),balanceXpPrefix487=balanceXpFactor487==='1'?'':balanceXpFactor487+'*';
	const peers = `peers AS (
    SELECT source.id AS source_id,ally.id AS ally_id FROM sources source
    JOIN party_members mine ON mine.player_id=source.id
    JOIN party_members team ON team.party_id=mine.party_id AND team.player_id<>source.id
    JOIN players ally ON ally.id=team.player_id
    WHERE source.hp>0 AND MAX(source.last_seen,CAST(source.movement_checked_at_ms/1000 AS INTEGER),CAST(source.last_monster_hit_at/1000 AS INTEGER))>=(SELECT seen_since FROM reward_input) AND ally.hp>0 AND MAX(ally.last_seen,CAST(ally.movement_checked_at_ms/1000 AS INTEGER),CAST(ally.last_monster_hit_at/1000 AS INTEGER))>=(SELECT seen_since FROM reward_input)
    AND ally.area=source.area AND ally.channel=source.channel AND ally.arena_match_id=source.arena_match_id
    AND (ally.x-source.x)*(ally.x-source.x)+(ally.y-source.y)*(ally.y-source.y)<=5760000)`;
	const historical = `AND NOT EXISTS(SELECT 1 FROM normal_reward_claims r WHERE r.monster_id=mp.monster_id AND r.spawn_round=mp.spawn_round AND r.player_id=mp.player_id)
    AND NOT EXISTS(SELECT 1 FROM sinsi_reward_claims r WHERE r.monster_id=mp.monster_id AND r.spawn_round=mp.spawn_round AND r.player_id=mp.player_id)
    AND NOT EXISTS(SELECT 1 FROM boss_reward_claims r WHERE (mp.monster_id='dunya-bosu-1' OR EXISTS(SELECT 1 FROM loadlab_boss_rounds_v1 lab_round WHERE lab_round.monster_id=mp.monster_id AND lab_round.boss_round=mp.spawn_round)) AND r.boss_round=mp.spawn_round AND r.player_id=mp.player_id)`;
	return [
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
}
async function awardProfileBossRewards(database, settings, now, pending) {
	return runRewardDelivery(database, `boss:${pending.boss_round}`, async () => {
        const loadlabBoss=colLabBossMonster(pending.boss_round);
        const rewardMonsterId=loadlabBoss?.id??"dunya-bosu-1";
        database=colLabRewardDatabase(database,{monster_id:rewardMonsterId,spawn_round:pending.boss_round});
		const bossRound = pending.boss_round;
		const claimToken = crypto.randomUUID();
		const bossXp = Math.max(0, Math.floor(pending.xp_reward));
		const profile = profileFromDefeat(pending, "boss.world", settings);
		const participants = (await database.prepare(`SELECT bp.player_id, p.role, p.level, p.drop_charm_until
     FROM boss_participants bp JOIN players p ON p.id = bp.player_id
     WHERE bp.boss_round = ? AND bp.total_damage > 0
     ORDER BY bp.created_at, bp.player_id`).bind(bossRound).all()).results;
		const drops = prepareProfileDrops(profile, participants, rewardMonsterId, pending, settings, now, pending.events_snapshot, pending.pearls_retired === 1);
		const xpStatements488=prepareMonsterXp(database, settings, now, rewardMonsterId, bossRound, bossXp, null, false, {...pending,monster_id:rewardMonsterId,monster_area:"sanctum"});
		const rewardBatch = await database.batch([
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
async function awardPendingBossRewards(database, settings, now, preferredBossRound, requiredParticipantId) {
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
	const pending = preferredBossRound !== void 0 && requiredParticipantId ? await pendingStatement.bind(preferredBossRound, requiredParticipantId).first() : preferredBossRound !== void 0 ? await pendingStatement.bind(preferredBossRound).first() : requiredParticipantId ? await pendingStatement.bind(requiredParticipantId).first() : await pendingStatement.first();
	if (!pending) return null;
	return awardProfileBossRewards(database, settings, now, pending);
}
function monsterXpReward(target, settings) {if(isBlackStoneBoss476(target.id))return settings.black_stone_boss_xp_reward;if(target.area==='event')return globalThis.__colEventIsland444?.profile(target)?.xp??0;
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
function normalEssenceRoll(target) {if(target.area==='event')return {min:0,span:0};
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
function pveAggroRange(monster) {if(monster.area==='event')return 320;
	return isBlackStoneBoss476(monster.id) || (isFrozenBossId(monster.id)||isRuneV2Boss(monster.id)) || monster.id === "ancient-boss-1" ? 370 : isFrozenWaterId(monster.id) ? 330 : monster.is_boss || monster.id === "dragon-world-1" ? 320 : monster.id.startsWith("yutan") ? 300 : 230;
}
function pveAttackCadenceMs(monster) {if(monster.area==='event')return globalThis.__colEventIsland444?.profile(monster)?.cadence??2100;
	const base = isFrozenWaterId(monster.id) ? 2850 : isBlackStoneBoss476(monster.id) || (isFrozenBossId(monster.id)||isRuneV2Boss(monster.id)) || monster.id === "ancient-boss-1" ? 2250 : monster.is_boss || monster.id === "dragon-world-1" ? 2100 : monster.variant === "katil" ? 800 : monster.variant === "agresif" || monster.summoned ? 950 : 1100;
	const jitter = [...monster.id].reduce((sum, character) => sum * 33 + character.charCodeAt(0) >>> 0, 0) % 221;
	return base + (monster.is_boss || monster.id === "dragon-world-1" || isBlackStoneBoss476(monster.id) || (isFrozenBossId(monster.id)||isRuneV2Boss(monster.id)) || monster.id === "ancient-boss-1" || isFrozenWaterId(monster.id) ? jitter : jitter % 81);
}
function pveDamage(monster, armorPower, player, settings) {
 if(monster.area==='rune_v2'){const raw484=isRuneV2Boss(monster.id)&&Number.isSafeInteger(monster.runeDamageOverride484)&&monster.runeDamageOverride484>=0&&monster.runeDamageOverride484<=1000000?monster.runeDamageOverride484:globalThis.__colRuneV2?.monster(monster)?.damage??0;if(raw484===0)return {raw:0,amount:0,blocked:0};monster={...monster,exact_hit_damage:raw484};}if(monster.area==='rune'&&globalThis.__colRunes?.monster(monster)?.damage===0)return {raw:0,amount:0,blocked:0};
 if(monster.area==='rune')monster={...monster,exact_hit_damage:globalThis.__colRunes?.monster(monster)?.damage??0};
	if (monster.area === "afk") return {
		raw: 0,
		amount: 0,
		blocked: 0
	};
	const exactHitDamage = Number(monster.area==='event'?(globalThis.__colEventIsland444?.profile(monster)?.damage??1):monster.exact_hit_damage);
	const baseDamage = monster.id.startsWith("golge") ? 7 : monster.id.startsWith("curuk") ? 14 : 18;
	const variantDamage = Math.round(baseDamage * (monster.variant === "katil" ? settings.killer_variant_damage_scale : monster.variant === "agresif" ? settings.aggressive_variant_damage_scale : settings.normal_variant_damage_scale));
	const eliteBaseDamage = isBlackStoneBoss476(monster.id) || isFrozenBossId(monster.id) || monster.id === "ancient-boss-1" ? 48 : isFrozenWaterId(monster.id) ? 32 : monster.is_boss || monster.id === "dragon-world-1" ? 48 : variantDamage;
	const eliteDamageScale = isBlackStoneBoss476(monster.id) ? settings.black_stone_boss_damage_scale : isFrozenBossId(monster.id) ? settings.frozen_boss_damage_scale : monster.id === "ancient-boss-1" ? settings.ancient_boss_damage_scale : isFrozenWaterId(monster.id) ? settings.frozen_water_damage_scale : monster.is_boss || monster.id === "dragon-world-1" ? settings.boss_damage_scale : settings.regular_monster_damage_scale;
	const unscaledRaw479 = Number.isSafeInteger(exactHitDamage) && exactHitDamage >= 1 && exactHitDamage <= 1e6 ? exactHitDamage : Math.max(1, Math.round(eliteBaseDamage * eliteDamageScale * (monster.summoned ? settings.sinsi_stone_summon_damage_scale : 1)));
	const raw = monster.id === "dragon-world-1" && monster.area === "dragon" ? Math.round(unscaledRaw479 * 1.5) : unscaledRaw479;
	const reduction = armorDamageReduction((armorPower + (Number(player.jewelry_defense)||0) + (player.role==='muhafiz'?10:0) + (hasWingBonus(player) ? settings.wing_defense_bonus : 0))*colRuneFactor(player,'defense'), "pve");
	const amount = Math.max(1, Math.round(raw * (1 - reduction) * (player.special_guard_until_ms>Date.now()?1-(colSpec456(player.role,player.specialization,settings)?.guard??0):1)));
	if(monster.id==='dragon-world-1'&&monster.area==='dragon')return {raw:raw*4,amount:amount*4,blocked:(raw-amount)*4};
	return {
		raw,
		amount,
		blocked: raw - amount
	};
}
async function armPveEngagement(database, player, monster, nowMs) {
	const statements = preparePveEngagement(database, player, monster, nowMs);
	if (!statements.length) return;
	if (database.combat?.enabled && !database.channelCompute) {
		// A newly approached monster is not yet in the private combat store.
		// Resident channels return immediately for an already loaded monster.
		database.combat.syncEntity('monsters', monster.id);
		await database.combatBatch(statements, player.id);
	} else {
		// Legacy compute frames include existing engagements, not new candidates.
		// Keep acquisition in the existing writer lane; later hits are unchanged.
		await database.batch(statements);
	}
}
function preparePveEngagement(database, player, monster, nowMs) {
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
async function armNearbyPveEngagement(database, playerId, nowMs) {
	const loop = database.worldLoop;
	if (loop?.enabled) {
		const nearby = await loop.nearby(playerId, nowMs,true);
		for(const entry of (Array.isArray(nearby)?nearby:nearby?[nearby]:[]))await armPveEngagement(database,entry.player,entry.monster,nowMs);
		return;
	}
	const [candidates, peers] = await database.batch([database.prepare(`SELECT monster.id, monster.area, monster.spawn_round, monster.hp, monster.is_stone, monster.variant,
       monster.is_boss, monster.summoned, viewer.area AS player_area,
       viewer.channel AS player_channel, viewer.arena_match_id, viewer.realtime_scope_version,
       monster.x AS monster_x, monster.y AS monster_y,
       (monster.x - viewer.x) * (monster.x - viewer.x) + (monster.y - viewer.y) * (monster.y - viewer.y) AS distance_sq
     FROM players viewer JOIN monsters monster ON monster.loadlab_run_id=viewer.loadlab_run_id AND monster.area = viewer.area
       AND (monster.channel = 0 OR monster.channel = viewer.channel)
     WHERE viewer.id = ? AND viewer.hp > 0 AND monster.hp > 0 AND monster.is_stone = 0 AND monster.id NOT IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1')
       AND viewer.area IN ('forest','frozen','sanctum','dragon','sinsi','black','ancient','event','rune','rune_v2')
       AND NOT EXISTS (SELECT 1 FROM pve_engagements existing WHERE existing.player_id = viewer.id AND json_extract(existing.attackers489,'$.'||json_quote(monster.id)||'.spawn_round')=monster.spawn_round)
       AND (monster.x - viewer.x) * (monster.x - viewer.x) + (monster.y - viewer.y) * (monster.y - viewer.y)
         <= CASE WHEN monster.id IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') THEN 370 * 370 WHEN monster.id = 'frozen-boss-1' OR monster.id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1') THEN 370 * 370
           WHEN monster.id LIKE 'frozen-water-c%' THEN 330 * 330
           WHEN monster.is_boss = 1 OR monster.id='dragon-world-1' OR monster.area='event' THEN 320 * 320
           WHEN monster.id LIKE 'yutan%' THEN 300 * 300 ELSE 230 * 230 END
     ORDER BY distance_sq, monster.id`).bind(playerId), database.prepare(`SELECT closer.x, closer.y FROM players viewer
       JOIN players closer ON closer.loadlab_run_id=viewer.loadlab_run_id AND closer.area = viewer.area AND closer.channel = viewer.channel
       WHERE viewer.id = ? AND closer.id != viewer.id AND closer.hp > 0 AND closer.last_seen >= ?`).bind(playerId, Math.floor(nowMs / 1e3) - 30)]);
	const nearbyEntries489 = candidates.results.filter((monster) => !peers.results.some((peer) => {
		const dx = monster.monster_x - peer.x;
		const dy = monster.monster_y - peer.y;
		return dx * dx + dy * dy < monster.distance_sq;
	}));
	for(const nearby of nearbyEntries489.slice(0,32)){
	await armPveEngagement(database, {
		id: playerId,
		area: nearby.player_area,
		channel: nearby.player_channel,
		arena_match_id: nearby.arena_match_id,
		realtime_scope_version: nearby.realtime_scope_version
	}, nearby, nowMs);}
}
async function settlePveEngagement(database,playerId,settings,nowMs,discoverNearby=false){
 if(discoverNearby)await armNearbyPveEngagement(database,playerId,nowMs);
 const residentR18=optimizeR18?ownedEngagementR18(database,playerId):undefined;
 const row489=residentR18!==undefined?residentR18:await database.prepare('SELECT * FROM pve_engagements WHERE player_id=? LIMIT 1').bind(playerId).first();
 if(!row489||row489.next_hit_at_ms>nowMs)return null;
 const entries489=pveEntries489(row489);
 	const frameStatementsR18=[
		database.prepare(`SELECT role,specialization,special_guard_until_ms,jewelry_defense,stat_attack,stat_defense,stat_hp,level,rank_tier,rune_defense_level,id, x, y, hp, max_hp, hp_revision, respawn_at_ms, area, channel, arena_match_id, realtime_scope_version,loadlab_run_id,
        CASE WHEN area='rune_v2' THEN (length(loadlab_run_id)>0
          OR EXISTS(SELECT 1 FROM loadlab_entities_v1 e WHERE e.id=players.id OR e.account_id=players.account_id)
          OR EXISTS(SELECT 1 FROM loadlab_admissions_v1 a WHERE a.account_id=players.account_id)) ELSE 0 END AS rune_v2_test483, wings_equipped, (SELECT equipped FROM dungeon_wings WHERE player_id=players.id) AS core_wings,
        COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) AS world_cycle
       FROM players WHERE id = ? LIMIT 1`).bind(playerId),
		database.prepare(`SELECT monster.id, monster.name, monster.x, monster.y, monster.hp, monster.max_hp,
        monster.respawn_at, monster.variant, monster.is_boss, monster.despawn_at, monster.spawn_round,
        monster.area, monster.channel, monster.is_stone,monster.loadlab_run_id,monster.stun_until_ms, monster.wave_stage, monster.summoned,
        monster.parent_stone_id, profile.hit_damage AS exact_hit_damage,
        EXISTS (SELECT 1 FROM monster_participants participant WHERE participant.player_id = ?
          AND participant.monster_id = monster.id AND participant.spawn_round = monster.spawn_round) AS provoked
       FROM monsters monster
       LEFT JOIN all_monster_combat_profiles profile
         ON monster.area IN ('forest', 'frozen', 'black', 'ancient')
        AND monster.variant IN ('normal', 'agresif', 'katil')
        AND monster.summoned = 0 AND monster.is_boss = 0 AND monster.is_stone = 0
        AND profile.area = monster.area AND profile.variant = monster.variant
        AND profile.family = CASE
          WHEN monster.area = 'black' THEN 'slot' || substr(monster.id, -1)
          WHEN monster.id LIKE 'golge-%' THEN 'golge'
          WHEN monster.id LIKE 'curuk-%' THEN 'curuk'
          WHEN monster.id LIKE 'yutan-%' THEN 'yutan'
          ELSE NULL END
       WHERE monster.id IN (SELECT value FROM json_each(?))`).bind(playerId,JSON.stringify(entries489.map(e=>e.monster_id))),
		database.prepare("SELECT kind, item_name, power, enchantments, equipped FROM player_items WHERE player_id = ? AND kind IN ('armor','helmet','shoes','necklace','costume') AND equipped = 1").bind(playerId)
	];
 const [player,monsters489,armorItems]=optimizeR18?await retaliationFrameR18(database,frameStatementsR18):await Promise.all([frameStatementsR18[0].first(),frameStatementsR18[1].all(),frameStatementsR18[2].all()]);
 const byId489=new Map(monsters489.results.map(m=>[m.id,m]));let result489=null;
 for(const entry489 of entries489){if(entry489.next_hit_at_ms>nowMs)continue;const monster489=byId489.get(entry489.monster_id);
  if(monster489&&database.combat?.enabled&&!database.channelCompute)database.combat.syncEntity('monsters',monster489.id);
  const next489=await settlePveOne489(database,playerId,settings,nowMs,{...row489,...entry489},{player,monster:monster489,armorItems});
  if(next489)result489=next489;if(next489?.dead)break;
 }
 return result489;
}
async function settlePveOne489(database,playerId,settings,nowMs,engagement,{player,monster,armorItems}) {

	if (!player || !monster || isRuneV2Boss(monster.id) || !colLabMayAffectMonster(player,monster) || player.area === "afk" || monster.area === "afk" || player.hp <= 0 || monster.hp <= 0 || monster.is_stone || monster.spawn_round !== engagement.spawn_round || !monsterIsInPlayerWorld(monster, player)) {
		await clearPveEntry489(database,playerId,engagement);
		return null;
	}
	const monsterPosition = monster.provoked ? monsterCombatPosition(monster, player) : monster;
	const enemyRange = !monster.provoked ? pveAggroRange(monster) : isRuneV2Boss(monster.id) || isBlackStoneBoss476(monster.id) || isFrozenBossId(monster.id) || monster.id === "ancient-boss-1" ? 350 : isFrozenWaterId(monster.id) ? 300 : monster.is_boss || monster.id === "dragon-world-1" ? 320 : 260;
	if (Math.hypot(player.x - monsterPosition.x, player.y - monsterPosition.y) > enemyRange) {
		await clearPveEntry489(database,playerId,engagement);
		return null;
	}
	if(monster.stun_until_ms>nowMs)return null;
	const equippedDefense = armorItems.results;
	let enchantmentTotals473_equippedDefense;
	const armorPower = equippedDefense.reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + (enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("stone_defense");
	const attackBlocked = attackIsBlocked((enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("attack_block") + (enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("stone_block"));
	const baseDamage = pveDamage(monster, armorPower + serverRankBonuses(player.id).defense, player, settings);
	const cadenceMs = pveAttackCadenceMs(monster);
	const fireBoss = colLabMonsterSource(monster.id) === "dunya-bosu-1" && monster.area === "sanctum" || monster.id === "dragon-world-1" && monster.area === "dragon";
	const fireIntervalMs = Math.max(1, Math.min(60, settings.boss_fire_interval_seconds ?? 7)) * 1e3;
	const lastSkillAt = engagement.last_skill_at_ms || engagement.next_hit_at_ms - cadenceMs;
	const fireSkill = fireBoss && nowMs >= lastSkillAt + fireIntervalMs;
	const multiplier = fireSkill ? Math.max(1, Math.min(5, settings.boss_fire_damage_multiplier ?? 1.2)) : 1;
	const calculatedDamage = fireSkill ? {
		amount: Math.max(1, Math.round(baseDamage.amount * multiplier)),
		raw: Math.round(baseDamage.raw * multiplier),
		blocked: Math.round(baseDamage.raw * multiplier) - Math.max(1, Math.round(baseDamage.amount * multiplier))
	} : baseDamage;
	const damage = attackBlocked ? {
		amount: 0,
		raw: calculatedDamage.raw,
		blocked: calculatedDamage.raw
	} : calculatedDamage;
	const nextSkillAt = fireSkill ? nowMs : lastSkillAt;
	const nextHitAtMs = fireBoss ? Math.min(nowMs + cadenceMs, nextSkillAt + fireIntervalMs) : nowMs + cadenceMs;
	const runeV2DeathPenalty483=player.area==='rune_v2'&&player.rune_v2_test483===0;
	const commitPve = (statements) => database.combat?.enabled ? database.combatBatch(statements, playerId) : database.batch(statements);
	const result = (await commitPve([
		database.prepare(`UPDATE players SET hp = MAX(0, hp - ?), hp_revision = hp_revision + 1,${runeV2DeathPenalty483 ? "\n         gems=CASE WHEN hp<=? AND loadlab_run_id='' THEN MAX(0,gems-CAST(gems/20 AS INTEGER)) ELSE gems END," : ""}
         respawn_at_ms = CASE WHEN hp - ? <= 0 THEN ? ELSE 0 END,
         last_monster_hit_at = ?, last_seen = ?, combat_lock_until_ms = MAX(combat_lock_until_ms, ?)
       WHERE id = ? AND hp > 0 AND area = ? AND channel = ? AND realtime_scope_version = ?
         AND EXISTS (SELECT 1 FROM pve_engagements e WHERE e.player_id = players.id
           AND json_extract(e.attackers489,?)=? AND json_extract(e.attackers489,?)=? AND ?<=?)
         AND EXISTS (SELECT 1 FROM monsters m WHERE m.id = ? AND m.hp > 0 AND m.spawn_round = ? AND m.stun_until_ms <= ?)
       RETURNING hp, max_hp, hp_revision, respawn_at_ms${runeV2DeathPenalty483 ? ",gems" : ""}`).bind(damage.amount, ...(runeV2DeathPenalty483?[damage.amount]:[]), damage.amount, nowMs + 2600, nowMs, Math.floor(nowMs / 1e3), nowMs + 5e3, playerId, player.area, player.channel,player.realtime_scope_version,pvePath489(monster.id)+'.spawn_round',monster.spawn_round,pvePath489(monster.id)+'.next_hit_at_ms',engagement.next_hit_at_ms,engagement.next_hit_at_ms,nowMs,monster.id,monster.spawn_round,nowMs),
		database.prepare(`UPDATE pve_engagements SET attackers489=json_set(attackers489,?,json(?)),hit_sequence=hit_sequence+1,updated_at_ms=?,expires_at_ms=MAX(expires_at_ms,?),last_skill_at_ms=? WHERE player_id=? AND json_extract(attackers489,?)=? AND changes()>0`).bind(pvePath489(monster.id),JSON.stringify({monster_id:monster.id,spawn_round:monster.spawn_round,next_hit_at_ms:nextHitAtMs,last_skill_at_ms:nextSkillAt}),nowMs,nowMs+8000,nextSkillAt,playerId,pvePath489(monster.id)+'.next_hit_at_ms',engagement.next_hit_at_ms),
        database.prepare(PVE_HEAD_SQL489).bind(playerId),
		database.prepare(`DELETE FROM pve_engagements WHERE player_id = ?
       AND EXISTS (SELECT 1 FROM players WHERE id = ? AND hp <= 0)`).bind(playerId, playerId)
	]))[0].results[0];
	if (!result) return null;
	const pveHit = {
		type: "player_hit",
		eventId: `pve:${playerId}:${result.hp_revision}`,
		cycle: player.world_cycle,
		area: player.area,
		channel: player.channel,
		spawnRound: monster.spawn_round,
		nextHitAtMs,
		ability: fireSkill ? "boss_fire" : "basic",
		targetId: playerId,
		monsterId: monster.id,
		damage: damage.amount,
		blocked: damage.blocked,
		attackBlocked,
		hp: result.hp,
		maxHp: result.max_hp,
		hpRevision: result.hp_revision,
		respawnAtMs: result.respawn_at_ms,
		dead: result.hp <= 0,
		serverAt: nowMs
	};
	await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, pveHit, player.arena_match_id || void 0));
	return {
		...result,
		damage: damage.amount,
		blocked: damage.blocked,
		attackBlocked,
		dead: result.hp <= 0,
		monsterId: monster.id,
		pveHit
	};
}
async function spawnSinsiStoneWaves(database, stone, fromStage, toStage, settings) {
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
	if (statements.length) await database.batch(statements);
	return statements.length;
}
async function awardProfileSinsiStoneRewards(database, settings, now, pending) {
	return runRewardDelivery(database, `sinsi:${pending.monster_id}:${pending.spawn_round}`, async () => {
		const claimToken = crypto.randomUUID();
		const stoneXp = Math.max(0, Math.floor(pending.xp_reward));
		const profile = profileFromDefeat(pending, "sinsi.stone", settings);
		const participants = (await database.prepare(`SELECT participant.player_id, p.role, p.level, p.drop_charm_until
     FROM monster_participants participant JOIN players p ON p.id = participant.player_id
     WHERE participant.monster_id = ? AND participant.spawn_round = ?
     ORDER BY participant.created_at, participant.player_id`).bind(pending.monster_id, pending.spawn_round).all()).results;
		const drops = prepareProfileDrops(profile, participants, pending.monster_id, pending, settings, now, pending.events_snapshot, pending.pearls_retired === 1);
		const xpStatements488=prepareMonsterXp(database, settings, now, pending.monster_id, pending.spawn_round, stoneXp, null, false, {...pending,monster_area:"sinsi"});
		const rewardBatch = await database.batch([
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
async function awardPendingSinsiStoneRewards(database, settings, now, preferred) {
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
	const pending = preferred ? await pendingStatement.bind(preferred.id, preferred.spawn_round).first() : await pendingStatement.first();
	if (!pending) return null;
	return awardProfileSinsiStoneRewards(database, settings, now, pending);
}
async function tryAwardPendingSinsiStoneRewards(database, settings, now, preferred) {
	try {
		return await awardPendingSinsiStoneRewards(database, settings, now, preferred);
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
async function awardProfileNormalRewards(database, settings, now, pending) {
	return runRewardDelivery(database, `normal:${pending.monster_id}:${pending.spawn_round}`, async () => {
        database=colLabRewardDatabase(database,pending);
		if(eventKind444(pending.monster_id)&&pending.loot_source_key==='event.catalog') {
			await database.batch(prepareMonsterXp(database, settings, now, pending.monster_id, pending.spawn_round, pending.xp_reward, null, false, pending));
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
			await database.batch(prepareMonsterXp(database, settings, now, pending.monster_id, pending.spawn_round, pending.xp_reward, null, false, pending));
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
			const outcome = await database.batch([
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
		const participants = (await database.prepare(`SELECT mp.player_id, p.role, p.level, p.drop_charm_until
     FROM monster_participants mp JOIN players p ON p.id = mp.player_id
     WHERE mp.monster_id = ? AND mp.spawn_round = ?
     ORDER BY mp.created_at, mp.player_id`).bind(pending.monster_id, pending.spawn_round).all()).results;
		const drops = prepareProfileDrops(profile, participants, pending.monster_id, pending, settings, now, pending.events_snapshot, pending.pearls_retired === 1);
		const xpStatements488=prepareMonsterXp(database, settings, now, pending.monster_id, pending.spawn_round, pending.xp_reward, null, false, pending);
		const rewardBatch = await database.batch([
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
			const owner = await database.prepare("SELECT id, name FROM players WHERE id = ?").bind(drop[1]).first();
			if (owner) await announceRareDrop(database, owner, drop[4] ?? "Mor Kök ekipmanı", drop[0], "purple", now);
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
async function awardPendingNormalRewards(database, settings, now, preferred, requiredParticipantId) {
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
	const pending = preferred && requiredParticipantId ? await pendingStatement.bind(preferred.id, preferred.spawn_round, requiredParticipantId).first() : preferred ? await pendingStatement.bind(preferred.id, preferred.spawn_round).first() : requiredParticipantId ? await pendingStatement.bind(requiredParticipantId).first() : await pendingStatement.first();
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
async function queueArenaGroup498(database, {playerId, mode, teamName, channel, nowMs, roomId, requestedRoom, teamSize, capacity}) {
  // Party reads guide the UI error; INSERT revalidates the entire membership and
  // every eligibility condition under the ordinary authoritative writer commit.
  const membership=teamSize>1?await database.prepare(`SELECT party.id,party.leader_id FROM party_members member JOIN parties party ON party.id=member.party_id WHERE member.player_id=?`).bind(playerId).first():null;
  const members=membership?(await database.prepare(`SELECT player_id FROM party_members WHERE party_id=? ORDER BY joined_at,player_id`).bind(membership.id).all()).results:[];
  const grouped=members.length>1;
  if(grouped&&membership.leader_id!==playerId)return {error:'Arena sırasına grubu yalnızca grup lideri alabilir.'};
  if(grouped&&members.length!==teamSize)return {error:`${mode} için grubunda tam ${teamSize} oyuncu olmalı. Tek başına da sıraya girebilirsin.`};
  const ids=grouped?members.map(row=>row.player_id):[playerId];
  const partyId=grouped?membership.id:'';
  const queueGroup=crypto.randomUUID();
  const results=await database.batch([
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
async function acceptArenaSafeParty498(database,{playerId,senderId,partyId,now,senderMembership}) {
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
async function tryCreateArenaMatch(database, mode, channel, settings, worldCycle, nowMs, roomId) {
	const rule = ARENA_RULES[mode];
	const candidates = (await database.prepare(`SELECT q.player_id, q.team_name, q.queue_group498, q.group_size498, q.party_id498, p.name, p.area
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
	if (!(await database.batch(writes))[0].results[0]) return null;
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
	await Promise.all([...new Set(selected.map((entry) => entry.area))].filter((area) => /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(area)).map((area) => publishRealtimeRoomEvent(worldCycle, channel, area, matchFoundEvent)));
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
async function tryFinishArenaForfeit(database, matchId, nowMs) {
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
async function settleArenaMatch(database, match, nowMs) {
	if (match.id.startsWith("guild-")) return Boolean(await database.prepare("SELECT id FROM arena_matches WHERE id=? AND status='finished' AND settlement_token=?").bind(match.id, "guild-settled:" + match.id).first());
	if (match.status !== "finished" || !match.winner_team || match.settlement_token) return false;
	const settlementToken = crypto.randomUUID();
	const winnerName = match.winner_team === 1 ? match.team_a_name : match.team_b_name;
	const message = `${winnerName}, ${ARENA_RULES[match.mode].label} Arena savaşını ${match.team_a_score}-${match.team_b_score} kazandı!`;
	const results = await database.batch([
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
		const rooms = (await database.prepare(`SELECT DISTINCT channel, area, arena_match_id FROM players
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
		await Promise.all(rooms.map((room) => publishRealtimeRoomEvent(match.world_cycle, room.channel, room.area, {
			type: "arena_announcement",
			eventId: `arena-announcement:${match.id}`,
			announcement,
			serverAt: nowMs
		}, room.area === "arena" ? room.arena_match_id : void 0)));
	}
	return settled;
}
async function readActionSnapshot(database, payload, identity, bySession = false) {
	const now = nowSeconds$1();
	const identitySql = bySession ? "(SELECT owner.id FROM players owner JOIN auth_sessions session ON session.account_id = owner.account_id WHERE session.token_hash = ? LIMIT 1)" : "?";
	const settingsPromise = getGameSettings();
	const attackTargetId = payload.action === "attack" && typeof payload.targetId === "string" ? payload.targetId : "";
	const attackMonsterPromise = attackTargetId ? database.prepare("SELECT id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned, parent_stone_id,root_until_ms,stun_until_ms,control_x,control_y FROM monsters WHERE id = ?").bind(attackTargetId).first() : Promise.resolve(null);
	const playerPromise = database.prepare(payload.action === "collect" ? `SELECT id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms,
        essence, level, rank_tier, area, channel, arena_match_id, last_seen,
        combat_lock_until_ms, realtime_scope_version,
        COALESCE((SELECT reset_at FROM world_state WHERE id = 1), 0) AS reset_at,
        COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) AS world_cycle
       FROM players WHERE id = ${identitySql}` : `SELECT stat_attack,stat_defense,stat_hp,stat_revision,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms, essence, contribution, xp, level, gems, potions, ${setSelectSql()},
        specialization,skill_four,attack_four_at,special_guard_until_ms,jewelry_attack,jewelry_defense,jewelry_cast_speed,jewelry_pvp,jewelry_resist,jewelry_earring_enchantments,jewelry_bracelet_enchantments,halloween_candy_until,skill_one, skill_two, skill_three, has_rod, rod_equipped, fish_sokan, fish_levrek, fish_zargana, pearls, stone_dust,
        xp_ring_until, drop_charm_until, (SELECT equipped FROM player_items WHERE player_id=players.id AND kind='costume' LIMIT 1) AS costume_equipped, has_wings, wings_equipped, (SELECT equipped FROM dungeon_wings WHERE player_id=players.id) AS core_wings, area, channel, arena_match_id, last_seen,
        combat_lock_until_ms, realtime_scope_version, weapon_skin_enabled,
        COALESCE((SELECT reset_at FROM world_state WHERE id = 1), 0) AS reset_at,
        COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) AS world_cycle,
        COALESCE((SELECT power FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), 0) + CASE WHEN players.weapon_skin_enabled=1 THEN 20 ELSE 0 END + players.jewelry_attack AS equipped_weapon_power,
        (SELECT id FROM player_items WHERE player_id=players.id AND kind='weapon' AND equipped=1 LIMIT 1) AS equipped_weapon_id,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), '[]') AS equipped_weapon_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'armor' AND equipped = 1 LIMIT 1), '[]') AS equipped_armor_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'helmet' AND equipped = 1 LIMIT 1), '[]') AS equipped_helmet_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'shoes' AND equipped = 1 LIMIT 1), '[]') AS equipped_shoes_enchantments,
        COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'necklace' AND equipped = 1 LIMIT 1), '[]') AS equipped_necklace_enchantments
       FROM players WHERE id = ${identitySql}`).bind(identity).first();
	const pvpTargetId = payload.action === "pvp_attack" ? safeId(payload.targetPlayerId) : "";
	const pvpTargetPromise = pvpTargetId ? database.prepare(`SELECT stat_attack,stat_defense,stat_hp,stat_revision,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms, essence, contribution, xp, level, gems, potions, ${setSelectSql()},
          specialization,skill_four,attack_four_at,special_guard_until_ms,jewelry_attack,jewelry_defense,jewelry_cast_speed,jewelry_pvp,jewelry_resist,jewelry_earring_enchantments,jewelry_bracelet_enchantments,halloween_candy_until,skill_one, skill_two, skill_three, has_rod, rod_equipped, fish_sokan, fish_levrek, fish_zargana, pearls, stone_dust,
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
             AND (viewer.area != 'arena' OR (players.arena_match_id != '' AND players.arena_match_id = viewer.arena_match_id)))`).bind(pvpTargetId, now - 30, identity).first() : Promise.resolve(null);
	const pvpArenaPromise = pvpTargetId ? database.prepare(`SELECT m.*, attacker.team AS attacker_team, defender.team AS target_team
       FROM players viewer
       JOIN arena_matches m ON m.id = viewer.arena_match_id
       JOIN arena_match_players attacker ON attacker.match_id = m.id AND attacker.player_id = viewer.id
       JOIN arena_match_players defender ON defender.match_id = m.id AND defender.player_id = ?
       WHERE viewer.id = ${identitySql} AND viewer.area = 'arena' LIMIT 1`).bind(pvpTargetId, identity).first() : Promise.resolve(null);
	const [player, settings, preloadedPvpTarget, preloadedAttackMonster, preloadedPvpArena] = await Promise.all([
		playerPromise,
		settingsPromise,
		pvpTargetPromise,
		attackMonsterPromise,
		pvpArenaPromise
	]);
	return {
		player,
		settings,
		preloadedPvpTarget,
		preloadedAttackMonster,
		preloadedPvpArena,
		pvpTargetId,
		attackTargetId
	};
}
var lastCombatTimingLogAt = -Infinity;
async function POST(request) {
	const started = performance.now();
	let previous = started;
	const stages = [];
	const timing = {
		action: "",
		mark(stage) {
			const now = performance.now();
			stages.push({
				stage,
				ms: Math.round(now - previous)
			});
			previous = now;
		}
	};
	const response = await runTimedAction(request, timing);
	timing.mark("finish");
	const totalMs = Math.round(performance.now() - started);
	response.headers.set("Server-Timing", [...stages.map(({ stage, ms }) => `${stage};dur=${ms}`), `total;dur=${totalMs}`].join(", "));
	response.headers.set("X-Col-Action", deliveryAction(timing.action));
	response.headers.set("X-Col-Action-Name", diagnosticAction(timing.action));
	response.headers.set("X-Col-Failure", timing.failure ?? requestFailureReason(null, response.status));
	if (expectedActionRejection(timing.action, response.status, timing.failure)) response.headers.set("X-Col-Result", "user_rejection");
	if ((timing.action === "attack" || timing.action === "pvp_attack") && (totalMs >= 200 || performance.now() - lastCombatTimingLogAt >= 5e3)) {
		lastCombatTimingLogAt = performance.now();
		console.info("combat_timing", JSON.stringify({
			action: timing.action,
			status: response.status,
			totalMs,
			stages
		}));
	}
	return response;
}
async function runTimedAction(request, timing, realtime) {
	const requestReceivedAtMs = realtime?.receivedAtMs ?? Date.now();
	let releasePvpCommit = () => {};
	try {
		const payload = realtime?.payload ?? await readJsonObject(request, 4096);
		timing.action = diagnosticAction(payload.action);
		timing.mark("body");
		const runCombatTask = env.CORE_COMBAT_TASK;
		const combatTask = payload.action === "attack" || payload.action === "pvp_attack";
		const executeAction = async () => {
			if (payload.action === "attack" && typeof payload.targetId === "string") {
				const barrier = db().combat?.waitForTarget(payload.targetId);
				if (barrier) await barrier;
			}
			let combatSnapshot = null;
			const combatAction = payload.action === "attack" || payload.action === "pvp_attack";
			const auth = realtime ? await requireRealtimeGameSession(request, realtime.tokenHash) : await requireGameSession(request, combatAction ? (tokenHash) => {
				combatSnapshot = readActionSnapshot(db(), payload, tokenHash, true).catch(() => null);
			} : void 0);
			timing.mark("session");
			if (realtime) {
				const scope = realtime.scope;
				if (!(["attack", "pvp_attack", "guardian_dash"].includes(payload.action)) || auth.player?.id !== scope.playerId || auth.securityVersion !== scope.securityVersion) throw new AuthRequestError(409, "game_instance_expired", "Oyun oturumunu yenile.");
				const current = await readAuthoritativeMovement(db(), scope.playerId, auth.account.id, requestReceivedAtMs);
				if (!current || current.realtime_scope_version !== scope.scopeVersion || current.world_cycle !== scope.cycle || current.area !== scope.area || current.channel !== scope.channel || current.arena_match_id !== scope.arenaMatchId) throw new AuthRequestError(409, "realtime_scope_changed", "Harita bağlantısını yenile.");
			} else await assertCsrf(request, auth);
			timing.mark("csrf");
			const combatStore = db().combat;
			if (payload.action === "attack" && combatStore) combatStore.stats[realtime ? "wsAttacks" : "httpAttacks"]++;
			const executeAuthorized = async () => {
				const actionName = typeof payload.action === "string" ? payload.action : "";
                colLabAssertAction(auth,payload);
				timing.action = actionName;
				const retryAfter = enforceLocalActionRate(auth.account.id, actionName);
				if (retryAfter) {
					await recordSecurityEvent(request, auth, {
						code: "action_flood",
						surface: "action",
						actionName,
						confidence: 65,
						scoreDelta: 4,
						evidence: { retryAfter }
					});
					throw new AuthRequestError(429, "rate_limited", "Çok fazla işlem gönderildi. Kısa bir süre bekle.", retryAfter);
				}
				if (auth.player && dungeonLocked(auth.player.id) && !["join", "heartbeat", "friend_add", "friend_remove", "friend_accept", "friend_reject", "friend_cancel"].includes(payload.action ?? "")) return Response.json({ error: "Önce zindan koşundan ayrıl." }, { status: 409 });
				await ensureWorldSeed();
				timing.mark("seed");
				const database = db();
				if(auth.playerAccess?.area==='rune_v2')await colRepairRuneV2Access(database,auth.player.id);if(auth.playerAccess?.area==='rune')await colRepairRuneAccess(database,auth.player.id);
if (auth.playerAccess?.area === "ancient" && auth.player) await repairAncientAccess(database, auth.player.id);
				const now = nowSeconds$1();
				if (auth.player && typeof payload.itemId === "string" && await database.prepare("SELECT 1 FROM player_items WHERE id=? AND player_id=? AND kind='costume'").bind(payload.itemId, auth.player.id).first()) return Response.json({ error: "Giysileri Nesne Market veya çantadaki Giysi bölümünden kuşanabilirsin; Pazarım → Nesne Market Ürünleri bölümünde satılır; dönüştürülemez." }, { status: 409 });
				if (payload.action === "join") {
					const realm = globalThis.__colRealm;
					if (realm?.role === "game" && !auth.player && realm.policy?.registrationOpen === false) return Response.json({ error: "Bu sunucu yeni karakter kaydına kapalı." }, { status: 403 });
					const joinSettings = await getGameSettings();
					let requestedChannel = clamp$1(Math.floor(Number(payload.channel) || 1), 1, 3);
                    const automatic504=payload.channelChoice504==='auto',labAccount504=Boolean(globalThis.__colLoadLab?.accountRun(auth.account.id));
                    if(!auth.player)requestedChannel=await selectEntry504({database,player:null,nowMs:requestReceivedAtMs,requestedChannel,automatic:automatic504,isLab:labAccount504});
					if (auth.player) {
						const existing = await database.prepare("SELECT id, channel, area, arena_match_id, x, y, hp, max_hp, hp_revision, respawn_at_ms, combat_lock_until_ms, level, is_gm, last_seen FROM players WHERE id = ? AND account_id = ?").bind(auth.player.id, auth.account.id).first();
						if (!existing) return Response.json({ error: "Hesabına bağlı karakter bulunamadı." }, { status: 409 });
                        requestedChannel=await selectEntry504({database,player:existing,nowMs:requestReceivedAtMs,requestedChannel,automatic:automatic504,isLab:labAccount504||colLabIsPlayer(existing.id)});
                        if(colLabIsPlayer(existing.id)&&requestedChannel!==existing.channel)return Response.json({code:"loadlab_channel_fixed",error:"Test kanalı oturum boyunca sabittir."},{status:403});
						if (existing.area === "afk" && (existing.level < 30 || !joinSettings.afk_island_enabled && !existing.is_gm)) {
							await database.prepare(`UPDATE players SET area='bazaar',x=?,y=?,position_revision=position_revision+1,
            realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0
            WHERE id=? AND area='afk'`).bind(BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, existing.id).run();
							Object.assign(existing, {
								area: "bazaar",
								x: BAZAAR_SPAWN.x,
								y: BAZAAR_SPAWN.y
							});
						}
						if (existing.area === "frozen" && (!joinSettings.frozen_zone_enabled || existing.level < 20)) {
							await database.prepare(`UPDATE players SET area = 'bazaar', arena_match_id = '', x = ?, y = ?, movement_checked_at_ms = ?,
            movement_debt_ms = 0, motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1,
            realtime_scope_version = realtime_scope_version + 1, combat_lock_until_ms = 0 WHERE id = ? AND area = 'frozen'`).bind(BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, Date.now(), existing.id).run();
							existing.area = "bazaar";
							existing.arena_match_id = "";
							existing.combat_lock_until_ms = 0;
							existing.x = BAZAAR_SPAWN.x;
							existing.y = BAZAAR_SPAWN.y;
						}
						if ((existing.area === "arena" || existing.arena_match_id) && requestedChannel !== existing.channel) return Response.json({ error: "Arena maçı sürerken kanal değiştirilemez." }, { status: 409 });
						if (requestedChannel !== existing.channel) {
							if ((await settlePveEngagement(database, existing.id, joinSettings, requestReceivedAtMs))?.dead) return Response.json({ error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun." }, { status: 409 });
							if (existing.combat_lock_until_ms > requestReceivedAtMs) return Response.json({ error: "Savaş sürerken kanal değiştiremezsin." }, { status: 409 });
						}
						if (!isAreaWalkablePosition(existing.area, existing.x, existing.y)) {
							const safeSpawn = existing.area === "frozen" ? FROZEN_SPAWN : existing.area === "forest" ? FOREST_SPAWN : BAZAAR_SPAWN;
							await database.prepare(`UPDATE players SET x = ?, y = ?, movement_checked_at_ms = ?, movement_debt_ms = 0,
            motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1 WHERE id = ? AND area = ?`).bind(safeSpawn.x, safeSpawn.y, Date.now(), existing.id, existing.area).run();
							existing.x = safeSpawn.x;
							existing.y = safeSpawn.y;
						}
						const joinStatement = database.prepare(`UPDATE players SET channel = ?, last_seen = ?,
             realtime_scope_version = realtime_scope_version + CASE WHEN channel != ? THEN 1 ELSE 0 END
           WHERE id = ? AND account_id = ?
           AND (channel = ? OR combat_lock_until_ms <= ?)
           AND ((channel = ? AND last_seen >= ?) OR (SELECT COUNT(*) FROM players WHERE channel = ? AND id != ? AND last_seen >= ?) < ?)
           RETURNING channel`).bind(requestedChannel, now, requestedChannel, existing.id, auth.account.id, requestedChannel, requestReceivedAtMs, requestedChannel, now - 30, requestedChannel, existing.id, now - 30, channelCapacity510(requestedChannel,joinSettings.channel_capacity));
						const residentTransfer = requestedChannel !== existing.channel && typeof database.transferPlayer === "function";
						if (residentTransfer) await ensureStarterWeapon(database, existing.id, joinSettings.starter_weapon_power, now);
						const joinedChannel = residentTransfer ? await database.transferPlayer(existing.id, requestedChannel, joinStatement, [database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(existing.id)]) : await joinStatement.first();
						if (!joinedChannel) return Response.json({
							code: "channel_full",
							error: `Kanal ${requestedChannel} dolu. Başka bir kanal seç.`
						}, { status: 409 });
						if (requestedChannel !== existing.channel && !residentTransfer) await database.batch([database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(existing.id)]);
						if (!residentTransfer) await ensureStarterWeapon(database, existing.id, joinSettings.starter_weapon_power, now);
						return Response.json({
							ok: true,
							playerId: existing.id,
							channel: joinedChannel.channel,
							hp: existing.hp,
							maxHp: existing.max_hp,
							hpRevision: existing.hp_revision,
							respawnAtMs: existing.respawn_at_ms,
							message: `${existing.area === "bazaar" ? "Pazar Alanı" : existing.area === "forest" ? "Kuzey Ormanı" : existing.area === "frozen" ? "Donmuş Çam Geçidi" : "Kaldığın bölge"} · Kanal ${joinedChannel.channel}'e yeniden katıldın.`
						});
					}
					const name = safeName(payload.name);
					if (hasForbiddenCharacterName(name, await loadBlockedWords())) return Response.json({ error: "Karakter adı küfür veya uygunsuz sözcük içeremez." }, { status: 400 });
					const nameKey = characterNameKey(name);
					const role = roles.has(payload.role ?? "") ? payload.role : "muhafiz";
					if (name.length < 2) return Response.json({ error: "Karakter adı en az 2 harf olmalı." }, { status: 400 });
					const channel = requestedChannel;
					const proposedPlayerId = crypto.randomUUID();
					const legacyNames = await database.prepare("SELECT id, name FROM players WHERE id NOT IN (SELECT player_id FROM character_names)").all();
					for (let offset = 0; offset < legacyNames.results.length; offset += 50) await database.batch(legacyNames.results.slice(offset, offset + 50).map((entry) => database.prepare("INSERT OR IGNORE INTO character_names (normalized_name, player_id) VALUES (?, ?)").bind(characterNameKey(entry.name), entry.id)));
					try {
						await database.batch([
							database.prepare(`INSERT INTO players (id, account_id, name, role, x, y, hp, max_hp, essence, contribution, xp, level, area, channel, last_seen, created_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, 'bazaar', ?, ?, ?
         WHERE (SELECT COUNT(*) FROM players WHERE channel = ? AND last_seen >= ?) < ?
           AND NOT EXISTS (SELECT 1 FROM character_names WHERE normalized_name = ?)
         ON CONFLICT(account_id) DO NOTHING`).bind(proposedPlayerId, auth.account.id, name, role, BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, joinSettings.player_max_hp, joinSettings.player_max_hp, channel, now, now, channel, now - 30, channelCapacity510(channel,joinSettings.channel_capacity), nameKey),
							database.prepare("INSERT INTO character_names (normalized_name, player_id) SELECT ?, id FROM players WHERE id = ?").bind(nameKey, proposedPlayerId),
							...env.CORE_RUNTIME === "vds" ? [database.prepare(STARTER_CHARACTER_GRANT_SQL).bind(requestReceivedAtMs, proposedPlayerId, auth.account.id)] : []
						]);
					} catch (error) {
						if (await database.prepare("SELECT player_id FROM character_names WHERE normalized_name = ?").bind(nameKey).first()) return Response.json({
							error: "Bu karakter adı daha önce alınmış. Başka bir ad seç.",
							code: "character_name_taken"
						}, { status: 409 });
						throw error;
					}
					const created = await database.prepare("SELECT id, channel, hp, max_hp, hp_revision, respawn_at_ms FROM players WHERE account_id = ? LIMIT 1").bind(auth.account.id).first();
					if (!created) {
						const taken = await database.prepare("SELECT player_id FROM character_names WHERE normalized_name = ?").bind(nameKey).first();
						return Response.json({
							error: taken ? "Bu karakter adı daha önce alınmış. Başka bir ad seç." : "Kanal dolu; başka bir kanal seç.",
							code: taken ? "character_name_taken" : "channel_full"
						}, { status: 409 });
					}
					await ensureStarterWeapon(database, created.id, joinSettings.starter_weapon_power, now);
					return Response.json({
						ok: true,
						playerId: created.id,
						channel: created.channel,
						hp: created.hp,
						maxHp: created.max_hp,
						hpRevision: created.hp_revision,
						respawnAtMs: created.respawn_at_ms,
						message: `Pazar Alanı · Kanal ${created.channel}'e katıldın.`
					});
				}
				const playerId = auth.player?.id ?? "";
				if (!playerId) return Response.json({ error: "Önce karakterini oluştur." }, { status: 404 });
				if (["friend_add","friend_remove","friend_accept","friend_reject","friend_cancel"].includes(payload.action)) {
          const targetPlayerId=safeId(payload.targetPlayerId);
          if(colLabIsPlayer(playerId)||colLabIsPlayer(targetPlayerId))return Response.json({error:"Test hesapları arkadaş işlemlerine katılamaz."},{status:403});
          const result=await friendAction487(database,{playerId,accountId:auth.account.id,action:payload.action,targetPlayerId,now});
          const {status,...body}=result;
          return Response.json(status===200?{...body,friends:friendsView487(await readFriends487(database,playerId),now),friendRequests:await readFriendRequests490(database,playerId)}:body,{status});
        }
        await repairFrozenLevelInvariant(database, playerId, auth.account.id, auth.playerAccess, requestReceivedAtMs);
				if (auth.playerAccess?.area === "frozen" && auth.playerAccess.level < 20) combatSnapshot = null;
				if (payload.action === "heartbeat") {
					const heartbeatNowMs = Date.now();
					const heartbeatSettingsPromise = getGameSettings();
					const heartbeatCyclePromise = database.prepare("SELECT COALESCE(cycle, 1) AS cycle FROM world_state WHERE id = 1").first();
					const pendingRetaliation = await settlePveEngagement(database, playerId, await heartbeatSettingsPromise, heartbeatNowMs, true);
					timing.mark("heartbeat_retaliation");
					const regenSettings = await heartbeatSettingsPromise;
					const heartbeat = (await database.batch([
						database.prepare(`UPDATE player_items SET equipped = 0 WHERE player_id = ? AND equipped = 1
          AND kind IN ('weapon','armor','helmet','shoes','necklace') AND
          (SELECT level FROM players WHERE id = player_items.player_id) < CASE rarity WHEN 'blue' THEN 7 WHEN 'orange' THEN 20 WHEN 'red' THEN 30 WHEN 'purple' THEN 60 WHEN 'unique' THEN 50 WHEN 'emerald' THEN 65 WHEN 'infinite' THEN 50 ELSE 1 END`).bind(playerId),
						database.prepare(REST_REGEN_SQL).bind(heartbeatNowMs, playerId, regenSettings.rest_regen_percent, regenSettings.rest_regen_combat_delay_seconds, regenSettings.rest_regen_still_seconds),
						database.prepare("UPDATE arena_queue SET last_seen_ms = ?, channel = COALESCE((SELECT channel FROM players WHERE id = ?), 1) WHERE player_id = ?").bind(heartbeatNowMs, playerId, playerId),
						...database.worldLoop?.enabled && database.combat?.enabled ? [] : [database.prepare(MONSTER_REST_REGEN_SQL).bind(heartbeatNowMs, regenSettings.monster_rest_regen_percent, regenSettings.monster_rest_regen_combat_delay_seconds)]
					]))[1].results[0];
					timing.mark("heartbeat_commit");
					const settledHeartbeat = { current: null };
					const maintenanceTask = startBackgroundTask(async () => {
						const heartbeatCycle = await heartbeatCyclePromise;
						if (heartbeat) await deliverRealtime(publishRealtimeRoomEvent(heartbeatCycle?.cycle ?? 1, heartbeat.channel, heartbeat.area, {
							type: "player_state",
							eventId: `heartbeat:${heartbeatNowMs}:${playerId}:${heartbeat.hp_revision}`,
							targetId: playerId,
							hp: heartbeat.hp,
							maxHp: heartbeat.max_hp,
							hpRevision: heartbeat.hp_revision,
							respawnAtMs: heartbeat.respawn_at_ms,
							serverAt: heartbeatNowMs
						}, heartbeat.arena_match_id || void 0));
						if(colLabIsPlayer(playerId))return;
                        let recoveredArena = false;
						if (heartbeat?.arena_match_id) {
							const unfinishedSettlement = await tryFinishArenaForfeit(database, heartbeat.arena_match_id, heartbeatNowMs) ?? await database.prepare("SELECT * FROM arena_matches WHERE id = ? AND status = 'finished' AND settlement_token = '' LIMIT 1").bind(heartbeat.arena_match_id).first();
							if (unfinishedSettlement) {
								recoveredArena = await settleArenaMatch(database, unfinishedSettlement, heartbeatNowMs);
								if (recoveredArena) await deliverRealtime(publishRealtimeRoomEvent(unfinishedSettlement.world_cycle, unfinishedSettlement.channel, "arena", {
									type: "arena_match_finished",
									eventId: `arena-finished:${unfinishedSettlement.id}`,
									matchId: unfinishedSettlement.id,
									mode: unfinishedSettlement.mode,
									winnerTeam: unfinishedSettlement.winner_team,
									teamAName: unfinishedSettlement.team_a_name,
									teamBName: unfinishedSettlement.team_b_name,
									teamAScore: unfinishedSettlement.team_a_score,
									teamBScore: unfinishedSettlement.team_b_score,
									rewardGems: unfinishedSettlement.reward_gems,
									serverAt: heartbeatNowMs
								}, unfinishedSettlement.id));
							}
						}
						await tickWorld();
						const heartbeatSettings = await heartbeatSettingsPromise;
						if (heartbeat && !heartbeat.arena_match_id && heartbeat.area !== "arena") {
							const queued = await database.prepare("SELECT mode, channel, room_id FROM arena_queue WHERE player_id = ? LIMIT 1").bind(playerId).first();
							if (queued && isArenaMode(queued.mode)) {
								for (let group = 0; group < 3; group += 1) if (!await tryCreateArenaMatch(database, queued.mode, queued.channel, heartbeatSettings, heartbeatCycle?.cycle ?? 1, heartbeatNowMs, queued.room_id)) break;
							}
						}
						await runRewardMaintenance(database, async () => {
							await awardPendingBossRewards(database, heartbeatSettings, now);
							for (let reward = 0; reward < 4; reward += 1) if (!(await tryAwardPendingSinsiStoneRewards(database, heartbeatSettings, now))?.awarded) break;
							for (let reward = 0; reward < 6; reward += 1) if (!await awardPendingNormalRewards(database, heartbeatSettings, now)) break;
							await tryFinalizePendingDropEnchantments(database, heartbeatSettings);
							await cleanupWorld();
						});
						if (recoveredArena) settledHeartbeat.current = await database.prepare("SELECT hp, max_hp, hp_revision FROM players WHERE id = ?").bind(playerId).first();
					});
					if (!scheduleRequestTask(maintenanceTask, "Heartbeat maintenance")) await maintenanceTask;
					timing.mark("heartbeat_maintenance");
					return Response.json({
						ok: true,
						pveHit: pendingRetaliation?.pveHit,
						hp: settledHeartbeat.current?.hp ?? heartbeat?.hp,
						maxHp: settledHeartbeat.current?.max_hp ?? heartbeat?.max_hp,
						hpRevision: settledHeartbeat.current?.hp_revision ?? heartbeat?.hp_revision
					});
				}
				if (payload.action === "claim_rewards") {
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
					await enforceRateLimit("claim-rewards", auth.account.id, {
						limit: 120,
						windowSeconds: 60,
						blockSeconds: 10
					}, colLabHttpAuth.rateLimitContext(request, auth, "claim-rewards"));
					const rewardSettings = await getGameSettings();
					timing.mark("reward_limits");
					let processed = 0;
					for (const target of rewardTargets) {
						if (target.id === "dunya-bosu-1" || colLabBossMonster(target.spawn_round)?.id===target.id) {
							if ((await awardPendingBossRewards(database, rewardSettings, now, target.spawn_round, playerId))?.awarded) processed += 1;
							continue;
						}
						if ((target.id.startsWith("sinsi-tasi-") ? await tryAwardPendingSinsiStoneRewards(database, rewardSettings, now, target) : await awardPendingNormalRewards(database, rewardSettings, now, target, playerId))?.awarded) processed += 1;
					}
					timing.mark("reward_delivery");
					if (!processed) await tryFinalizePendingDropEnchantments(database, rewardSettings, {
						ownerId: playerId,
						monsterIds: rewardTargets.map((target) => target.id)
					});
					timing.mark("reward_repair");
					const targetIds = [...new Set(rewardTargets.map((target) => target.id))];
					const freshDrops = targetIds.length ? (await database.prepare(`SELECT id, owner_id, monster_id, kind, item_name, rarity, power, amount, role, enchantments, x, y, expires_at, collectible_at
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
				if(payload.action==='trade_glass_browse'){try{return Response.json(await browseTradeGlass499(database,playerId,payload));}catch(error){return Response.json({error:error.message,code:error.code??'trade_glass_error499'},{status:error.status??409});}}
				if (payload.action === "move") {
					const result = await executeMovementAction(request, auth, database, payload, requestReceivedAtMs);
					return Response.json(result.data, { status: result.status });
				}
				timing.mark("pre_reads");
				const prefetched = combatSnapshot ? await combatSnapshot : null;
				if (payload.action === "pvp_attack" && safeId(payload.targetPlayerId)) {
					const release = await pvpCommitGate.acquire(safeId(payload.targetPlayerId));
					if (!release) return Response.json({
						error: "Savaş işlemleri yoğun; yeniden dene.",
						code: "combat_busy"
					}, {
						status: 429,
						headers: { "Retry-After": "1" }
					});
					releasePvpCommit = release;
				}
				const actionSnapshot = payload.action === "pvp_attack" ? await readActionSnapshot(database, payload, playerId) : prefetched ?? await readActionSnapshot(database, payload, playerId);
				const originalPvpSnapshot = prefetched ?? actionSnapshot;
				const pvpContinuity = async (candidate) => {
					const original = originalPvpSnapshot;
					if (!samePvpActorScope(original.player, candidate.player) || !samePvpActorScope(original.preloadedPvpTarget, candidate.preloadedPvpTarget) || original.player?.world_cycle !== candidate.player?.world_cycle) return false;
					if (original.player.area === "arena" && (original.player.hp_revision !== candidate.player.hp_revision || original.preloadedPvpTarget.hp_revision !== candidate.preloadedPvpTarget.hp_revision)) {
						if (await database.prepare(`SELECT 1 AS changed FROM arena_kill_claims WHERE match_id=? AND
          ((victim_id=? AND victim_hp_revision>?) OR (victim_id=? AND victim_hp_revision>?)) LIMIT 1`).bind(original.player.arena_match_id, original.player.id, original.player.hp_revision, original.preloadedPvpTarget.id, original.preloadedPvpTarget.hp_revision).first()) return false;
					}
					return true;
				};
				const { player, settings, preloadedPvpTarget, preloadedAttackMonster, preloadedPvpArena, pvpTargetId, attackTargetId } = actionSnapshot;
				if (!player) return Response.json({ error: "Önce karakterini oluştur." }, { status: 404 });
				if(player.area==='rune_v2'&&!(payload.action==='respawn'&&player.hp<=0)&&(!runeEligible(player)||!globalThis.__colRuneV2?.settings().config.enabled))return Response.json({error:'Karanlık Rün Sahili şu anda kapalı veya 65. seviye ve rütbe gerekiyor.'},{status:403});if(player.area==='rune'&&(!runeEligible(player)||!globalThis.__colRunes?.settings().config.enabled))return Response.json({error:RUNE_GATE_MESSAGE},{status:403});
 if (player.area === "ancient" && !canEnterAncient(settings, player)) return Response.json({ error: "Bu bölgeye erişimin değişti; dünya bilgilerini yenile." }, { status: 403 });
				if (combatAction) try {
					player.pet_kind = (await database.prepare("SELECT kind FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped=1 LIMIT 1").bind(player.id).first())?.kind ?? null;
				} catch {
					player.pet_kind = null;
				}
				if (player.reset_at > now) return Response.json({ error: "Yaşam Çekirdeği parçalanıyor. Dünya yeniden doğmayı bekliyor." }, { status: 423 });
				timing.mark("reads");
				if (payload.action === "arena_join_queue") {
					await enforceRateLimit("arena-queue", auth.account.id, {
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
                    const queued498=await queueArenaGroup498(database,{playerId,mode:payload.arenaMode,teamName,channel:player.channel,nowMs:queueNowMs,roomId,requestedRoom,teamSize:ARENA_RULES[payload.arenaMode].teamSize,capacity});
                    if(!queued498.ok)return Response.json({error:queued498.error},{status:409});
					const created = await tryCreateArenaMatch(database, payload.arenaMode, player.channel, settings, player.world_cycle, queueNowMs, roomId);
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
					const waiting = await database.prepare("SELECT COUNT(*) AS count FROM arena_queue WHERE room_id = ? AND channel = ?").bind(roomId, player.channel).first();
					return Response.json({
						ok: true,
						queued: true,
						queuedCount: Number(waiting?.count ?? 1),
						needed: ARENA_RULES[payload.arenaMode].totalPlayers,
						message: requestedRoom ? "Odaya katıldın. Oda dolunca maç başlayacak." : "Odan oluşturuldu ve oyunculara listelendi."
					});
				}
				if (payload.action === "arena_cancel_queue") {
					const cancelled = await database.prepare("DELETE FROM arena_queue WHERE player_id = ? RETURNING player_id").bind(playerId).first();
					return Response.json({
						ok: true,
						cancelled: Boolean(cancelled),
						message: cancelled ? "Arena sırasından ayrıldın." : "Aktif Arena kaydın yok."
					});
				}
				if (payload.action === "arena_ack_result") {
					const matchId = safeId(payload.matchId);
					if (!matchId) return Response.json({ error: "Arena sonucu geçersiz." }, { status: 400 });
					await database.prepare(`UPDATE arena_match_players SET result_seen_at_ms = ?
         WHERE player_id = ? AND match_id = ? AND result_seen_at_ms = 0
           AND EXISTS (SELECT 1 FROM arena_matches WHERE id = ? AND status = 'finished')`).bind(Date.now(), playerId, matchId, matchId).run();
					return Response.json({ ok: true });
				}
				if (payload.action === "select_channel") {
					if (player.area === "arena" || player.arena_match_id) return Response.json({ error: "Arena maçı sürerken kanal değiştirilemez." }, { status: 409 });
					if (player.hp <= 0) return Response.json({ error: "Karakterin yeniden doğmayı bekliyor." }, { status: 409 });
					if ((await settlePveEngagement(database, playerId, settings, requestReceivedAtMs))?.dead) return Response.json({ error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun." }, { status: 409 });
					if (player.combat_lock_until_ms > requestReceivedAtMs) return Response.json({ error: "Savaş sürerken kanal değiştiremezsin." }, { status: 409 });
					const targetChannel = clamp$1(Math.floor(Number(payload.channel) || 0), 1, 3);
					if (targetChannel === player.channel) return Response.json({
						ok: true,
						channel: player.channel,
						message: `Zaten Kanal ${player.channel}'desin.`
					});
					if (typeof database.transferPlayer === "function") {
  // The ownership handoff commits the capacity guard and scope cleanup together.
  // No old-owner writes are permitted after transferPlayer returns.
  const membership = await database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first();
  const cleanupStatements = [
    database.prepare("DELETE FROM party_invites WHERE sender_id = ? OR recipient_id = ?").bind(playerId, playerId),
    database.prepare("DELETE FROM party_members WHERE player_id = ?").bind(playerId),
    database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(playerId),
    database.prepare("UPDATE market_shops SET channel = ? WHERE owner_id = ? AND EXISTS (SELECT 1 FROM players WHERE id = ? AND area = 'bazaar')").bind(targetChannel, playerId, playerId),
  ];
  if (membership) {
    cleanupStatements.push(
      database.prepare("UPDATE parties SET leader_id = (SELECT player_id FROM party_members WHERE party_id = ? ORDER BY joined_at LIMIT 1) WHERE id = ? AND EXISTS (SELECT 1 FROM party_members WHERE party_id = ?)").bind(membership.party_id, membership.party_id, membership.party_id),
      database.prepare("DELETE FROM parties WHERE id = ? AND NOT EXISTS (SELECT 1 FROM party_members WHERE party_id = ?)").bind(membership.party_id, membership.party_id),
    );
  }
  const switchStatement = database.prepare(`UPDATE players SET channel = ?, last_seen = ?, realtime_scope_version = realtime_scope_version + 1 WHERE id = ?
    AND combat_lock_until_ms <= ?
    AND (SELECT COUNT(*) FROM players WHERE channel = ? AND id != ? AND last_seen >= ?) < ?
    RETURNING channel`).bind(targetChannel, now, playerId, requestReceivedAtMs, targetChannel, playerId, now - 30, channelCapacity510(targetChannel,settings.channel_capacity));
  const transferred = await database.transferPlayer(playerId, targetChannel, switchStatement, cleanupStatements);
  if (!transferred) return Response.json({ error: `Kanal ${targetChannel} dolu. En fazla ${channelCapacity510(targetChannel,settings.channel_capacity)} oyuncu girebilir.` }, { status: 409 });
  return Response.json({ ok: true, channel: transferred.channel, message: `Kanal ${transferred.channel}'e geçtin.` });
}
const switched = await database.prepare(`UPDATE players SET channel = ?, last_seen = ?, realtime_scope_version = realtime_scope_version + 1 WHERE id = ?
         AND combat_lock_until_ms <= ?
         AND (SELECT COUNT(*) FROM players WHERE channel = ? AND id != ? AND last_seen >= ?) < ?
         RETURNING channel`).bind(targetChannel, now, playerId, requestReceivedAtMs, targetChannel, playerId, now - 30, channelCapacity510(targetChannel,settings.channel_capacity)).first();
					if (!switched) return Response.json({ error: `Kanal ${targetChannel} dolu. En fazla ${channelCapacity510(targetChannel,settings.channel_capacity)} oyuncu girebilir.` }, { status: 409 });
					const membership = await database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first();
					await database.batch([
						database.prepare("DELETE FROM party_invites WHERE sender_id = ? OR recipient_id = ?").bind(playerId, playerId),
						database.prepare("DELETE FROM party_members WHERE player_id = ?").bind(playerId),
						database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(playerId),
						database.prepare("UPDATE market_shops SET channel = ? WHERE owner_id = ? AND EXISTS (SELECT 1 FROM players WHERE id = ? AND area = 'bazaar')").bind(targetChannel, playerId, playerId)
					]);
					if (membership) {
						const remaining = await database.prepare("SELECT player_id FROM party_members WHERE party_id = ? ORDER BY joined_at LIMIT 1").bind(membership.party_id).first();
						if (remaining) await database.prepare("UPDATE parties SET leader_id = ? WHERE id = ?").bind(remaining.player_id, membership.party_id).run();
						else await database.prepare("DELETE FROM parties WHERE id = ?").bind(membership.party_id).run();
					}
					return Response.json({
						ok: true,
						channel: switched.channel,
						message: `Kanal ${switched.channel}'e geçtin.`
					});
				}
				if (player.hp <= 0 && payload.action !== "respawn") return Response.json({
					error: "Karakterin yeniden doğmayı bekliyor.",
					hp: player.hp,
					hpRevision: player.hp_revision,
					respawnAtMs: player.respawn_at_ms
				}, { status: 409 });
				if (payload.action === "travel_event" || payload.action === "travel_dragon" || payload.action === "travel_rune_v2" || payload.action === "travel_rune" || payload.action === "travel_ancient" || payload.action === "travel_afk" || payload.action === "travel_market" || payload.action === "travel_forest" || payload.action === "travel_frozen" || payload.action === "travel_fishing" || payload.action === "travel_sanctum" || payload.action === "travel_sinsi" || payload.action === "travel_war" || payload.action === "travel_black") {
					if (player.area === "arena" || player.arena_match_id) return Response.json({ error: "Arena maçı bitmeden bölgeden ayrılamazsın." }, { status: 409 });
					if ((await settlePveEngagement(database, playerId, settings, requestReceivedAtMs))?.dead) return Response.json({ error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun." }, { status: 409 });
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
					if (!await database.prepare(`UPDATE players SET red_pearls=red_pearls-(CASE WHEN ?='dragon' AND area!='dragon' THEN 1 ELSE 0 END),gems=gems-100*(CASE WHEN ?='dragon' AND area!='dragon' THEN 1 ELSE 0 END),essence=essence-200*(CASE WHEN ?='dragon' AND area!='dragon' THEN 1 ELSE 0 END),area = ?, x = ?, y = ?, last_seen = ?,
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
				}
				if (payload.action === "buy_rod") {
					if (player.area !== "fishing" || distance(player, FISHERMAN) > FISHERMAN_INTERACTION_RANGE) return Response.json({ error: "Olta almak için Balıkçı Hasan'ın yanına gelmelisin." }, { status: 400 });
					if (player.has_rod) return Response.json({
						ok: true,
						hasRod: 1,
						gems: player.gems,
						message: "Oltan zaten çantanda."
					});
					const result = await database.prepare("UPDATE players SET gems = gems - ?, has_rod = 1, last_seen = ? WHERE id = ? AND hp > 0 AND has_rod = 0 AND gems >= ? RETURNING gems, has_rod").bind(settings.fishing_rod_cost, now, playerId, settings.fishing_rod_cost).first();
					if (!result) return Response.json({ error: `Olta için ${settings.fishing_rod_cost} Mücevher gerekiyor.` }, { status: 400 });
					return Response.json({
						ok: true,
						...result,
						hasRod: result.has_rod,
						message: "Balıkçı oltası çantana eklendi."
					});
				}
				if (payload.action === "equip_rod") {
					if (!player.has_rod) return Response.json({ error: "Önce Balıkçı Hasan'dan bir olta almalısın." }, { status: 400 });
					await database.batch([database.prepare("UPDATE player_items SET equipped = 0 WHERE player_id = ? AND kind = 'weapon'").bind(playerId), database.prepare(`UPDATE players SET rod_equipped = 1, hp_revision=hp_revision+CASE WHEN max_hp!=${effectiveMaxHpSql} OR hp>${effectiveMaxHpSql} THEN 1 ELSE 0 END, hp=MIN(hp,${effectiveMaxHpSql}),max_hp=${effectiveMaxHpSql},last_seen = ? WHERE id = ? AND hp > 0`).bind(now, playerId)]);
					return Response.json({
						ok: true,
						rodEquipped: 1,
						message: "Olta kuşanıldı; silahın güvenle çantana kaldırıldı."
					});
				}
				if (payload.action === "start_fishing") {
					await enforceRateLimit("fishing", auth.account.id, {
						limit: 20,
						windowSeconds: 60,
						blockSeconds: 30
					});
					if (player.area !== "fishing") return Response.json({ error: "Balık yalnızca Şelale Gölü'nde tutulabilir." }, { status: 400 });
					if (!player.has_rod || !player.rod_equipped) return Response.json({ error: "Balık tutmak için oltanı kuşanmalısın." }, { status: 400 });
					if (!canFishAt(player)) return Response.json({ error: "Oltanı atmak için göle biraz yaklaşman yeterli." }, { status: 400 });
					const liveChances = await database.prepare(`SELECT g.events_json,g.fish_sokan_weight,g.fish_levrek_weight,g.fish_zargana_weight,e.fishing_pearl_chance${globalThis.__colPremium ? ",e.fishing_talisman_chance" : ""}
        FROM game_settings g JOIN economy_settings e ON e.id=g.id WHERE g.id=1`).first();
					const fish = rollFish({
						...settings,
						...liveChances
					});
					const nonce = crypto.randomUUID();
					const startedAtMs = Date.now();
					const proofSeed = crypto.getRandomValues(new Uint32Array(1))[0] & 2147483647;
					const biteAtMs = startedAtMs + 900 + proofSeed % 901;
					const created = (await database.batch([database.prepare(`UPDATE players SET last_seen = ?
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
					const active = created ?? await database.prepare(`SELECT fishing_sessions.nonce, fishing_sessions.fish_kind, fishing_sessions.started_at_ms,
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
				if (payload.action === "fishing_input") {
					await enforceRateLimit("fishing-input", auth.account.id, {
						limit: 480,
						windowSeconds: 60,
						blockSeconds: 15
					});
					const nonce = typeof payload.fishingNonce === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(payload.fishingNonce) ? payload.fishingNonce : "";
					const inputSequence = Math.floor(Number(payload.inputSequence));
					if (!nonce || !Number.isSafeInteger(inputSequence) || inputSequence < 1 || typeof payload.holding !== "boolean") return Response.json({ error: "Balık kontrolü geçersiz." }, { status: 400 });
					const inputAtMs = Date.now();
					const proof = await database.prepare(`SELECT fish_kind, started_at_ms, bite_at_ms, earliest_finish_at_ms, expires_at_ms,
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
					const updated = await database.prepare(`UPDATE fishing_sessions SET proof_updated_at_ms = ?, proof_sequence = ?, proof_bar = ?,
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
				if (payload.action === "finish_fishing") {
					const nonce = typeof payload.fishingNonce === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(payload.fishingNonce) ? payload.fishingNonce : "";
					const nowMs = Date.now();
					const attempt = nonce ? await database.prepare(`SELECT fish_kind, started_at_ms, bite_at_ms, earliest_finish_at_ms, expires_at_ms,
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
					const result = (await database.batch([
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
				if (payload.action === "cancel_fishing") {
					const nonce = typeof payload.fishingNonce === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(payload.fishingNonce) ? payload.fishingNonce : "";
					if (!nonce) return Response.json({ error: "Balık avı kimliği geçersiz." }, { status: 400 });
					await database.batch([database.prepare(`UPDATE players SET fishing_cooldown_until_ms = MAX(fishing_cooldown_until_ms,
             COALESCE((SELECT earliest_finish_at_ms FROM fishing_sessions WHERE player_id = ? AND nonce = ?), 0))
           WHERE id = ?`).bind(playerId, nonce, playerId), database.prepare("DELETE FROM fishing_sessions WHERE player_id = ? AND nonce = ?").bind(playerId, nonce)]);
					return Response.json({
						ok: true,
						message: "Oltanı sudan çektin."
					});
				}
				if (payload.action === "sell_fish") {
					if (player.area !== "fishing" || distance(player, FISHERMAN) > FISHERMAN_INTERACTION_RANGE) return Response.json({ error: "Balığı satmak için Balıkçı Hasan'ın yanına gelmelisin." }, { status: 400 });
					if (payload.fishKind === "all") {
      const sold479=await database.prepare(`UPDATE players SET gems=gems+fish_sokan*?+fish_levrek*?+fish_zargana*?,fish_sokan=0,fish_levrek=0,fish_zargana=0,last_seen=?
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
					const result = await database.prepare(`UPDATE players SET ${column} = ${column} - 1, gems = gems + ?, last_seen = ? WHERE id = ? AND hp > 0 AND area = 'fishing' AND ${column} > 0 RETURNING gems, fish_sokan, fish_levrek, fish_zargana`).bind(value, now, playerId).first();
					if (!result) return Response.json({ error: `Çantanda satılacak ${label} yok.` }, { status: 400 });
					return Response.json({
						ok: true,
						...result,
						message: `${label} satıldı · +${value} Mücevher`
					});
				}
				if (payload.action === "exchange_essence") {
					const result = await database.prepare("UPDATE players SET essence = essence - ?, gems = gems + ?, last_seen = ? WHERE id = ? AND hp > 0 AND essence >= ? RETURNING essence, gems").bind(settings.exchange_essence_cost, settings.exchange_gem_reward, now, playerId, settings.exchange_essence_cost).first();
					if (!result) return Response.json({ error: `Bu takas için ${settings.exchange_essence_cost} Yaşam Özü gerekiyor.` }, { status: 400 });
					return Response.json({
						ok: true,
						...result,
						message: `${settings.exchange_essence_cost} Yaşam Özü karşılığında ${settings.exchange_gem_reward} Mücevher aldın.`
					});
				}
				if (payload.action === "buy_potion") {
					const result = await database.prepare("UPDATE players SET essence = essence - ?, potions = potions + 1, last_seen = ? WHERE id = ? AND hp > 0 AND essence >= ? RETURNING gems, essence, potions").bind(settings.potion_essence_cost, now, playerId, settings.potion_essence_cost).first();
					if (!result) return Response.json({ error: `İksir için ${settings.potion_essence_cost} Yaşam Özü gerekiyor.` }, { status: 400 });
					return Response.json({
						ok: true,
						...result,
						message: "Kırmızı Can İksiri çantana eklendi."
					});
				}
				if (payload.action === "buy_wings") {
					if (player.has_wings) return Response.json({
						ok: true,
						hasWings: 1,
						wingsEquipped: player.wings_equipped,
						gems: player.gems,
						message: "Kızıl Çekirdek Kanatları zaten sende."
					});
					const result = await database.prepare(`UPDATE players SET gems = gems - ?, has_wings = 1, wings_equipped = 1, last_seen = ?
         WHERE id = ? AND hp > 0 AND has_wings = 0 AND gems >= ?
         RETURNING gems, has_wings, wings_equipped`).bind(settings.wing_gem_cost, now, playerId, settings.wing_gem_cost).first();
					if (!result) return Response.json({ error: `Kanatlar için ${settings.wing_gem_cost} Mücevher gerekiyor.` }, { status: 400 });
					return Response.json({
						ok: true,
						...result,
						hasWings: result.has_wings,
						wingsEquipped: result.wings_equipped,
						message: "Kızıl Çekirdek Kanatları alındı ve kuşanıldı."
					});
				}
				if (payload.action === "rename_pet") {
					const name = validPetName(payload.name);
					if (!isPetKind(payload.petKind) || !name) return Response.json({ error: "Pet ismi 2–18 harf/rakam olmalı." }, { status: 400 });
					await enforceRateLimit("pet-rename", auth.account.id, {
						limit: 12,
						windowSeconds: 60,
						blockSeconds: 10
					});
					const pet = await database.prepare("UPDATE player_pets SET name=? WHERE player_id=? AND kind=? RETURNING kind,name").bind(name, playerId, payload.petKind).first();
					if (!pet) return Response.json({ error: "Bu pet sana ait değil." }, { status: 404 });
					return Response.json({
						ok: true,
						pet,
						message: `Petinin adı ${name} oldu.`
					});
				}
				if (payload.action === "buy_pet") {
					if (payload.petKind === "starter") return Response.json({ error: "Başlangıç peti yalnız ön kayıt sandığından alınır." }, { status: 409 });
					if (payload.petKind === "dragon") return Response.json({ error: "Ejderha yalnız Zindan Bekçisi’nde üretilir." }, { status: 409 });
					if (!isPetKind(payload.petKind)) return Response.json({ error: "Pet seçimi geçersiz." }, { status: 400 });
					const pet = {
						...PET_DEFINITIONS[payload.petKind],
						price: marketPrice(await readMarketPrices(database), `pet_${payload.petKind}`).amount
					};
					if (payload.expectedPrice !== void 0 && payload.expectedPrice !== pet.price) return Response.json({ error: "Fiyat değişti. Marketi yenileyip tekrar dene." }, { status: 409 });
					if (await database.prepare("SELECT equipped FROM player_pets WHERE player_id=? AND kind=? AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch()").bind(playerId, payload.petKind).first()) return Response.json({
						ok: true,
						message: `${pet.name} zaten sende.`
					});
					const purchase = await database.batch([
						database.prepare(`INSERT INTO player_pets(player_id,kind,equipped,acquired_at)
          SELECT id,?,1,? FROM players WHERE id=? AND core_coins>=?
          ON CONFLICT(player_id,kind) DO UPDATE SET equipped=1,acquired_at=excluded.acquired_at
          WHERE player_pets.acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)<=? RETURNING kind`).bind(payload.petKind, now, playerId, pet.price, now),
						database.prepare("UPDATE players SET core_coins=core_coins-?,last_seen=? WHERE id=? AND changes()>0 RETURNING core_coins").bind(pet.price, now, playerId),
						database.prepare("UPDATE player_pets SET equipped=0 WHERE player_id=? AND kind!=? AND changes()>0").bind(playerId, payload.petKind)
					]);
					if (!purchase[0]?.results.length) return Response.json({ error: `Pet zaten aktif veya ${pet.price} ÇP bakiyen yetersiz.` }, { status: 409 });
					await globalThis.__colPremium?.refreshHp(playerId);
					return Response.json({
						ok: true,
						core_coins: purchase[1].results[0].core_coins,
						petKind: payload.petKind,
						message: `${pet.name} 7 günlüğüne yanına geldi. Süre çevrimdışıyken de ilerler.`
					});
				}
				if (payload.action === "toggle_pet") {
					if (!isPetKind(payload.petKind)) return Response.json({ error: "Pet seçimi geçersiz." }, { status: 400 });
					const owned = await database.prepare("SELECT equipped FROM player_pets WHERE player_id=? AND kind=? AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch()").bind(playerId, payload.petKind).first();
					if (!owned) return Response.json({ error: "Bu pet envanterinde bulunmuyor." }, { status: 404 });
					if (owned.equipped) {
						await database.prepare("UPDATE player_pets SET equipped=0 WHERE player_id=? AND kind=?").bind(playerId, payload.petKind).run();
						await globalThis.__colPremium?.refreshHp(playerId);
						return Response.json({
							ok: true,
							petKind: null,
							message: `${PET_DEFINITIONS[payload.petKind].name} dinlenmeye gönderildi.`
						});
					}
					await database.batch([database.prepare("UPDATE player_pets SET equipped=0 WHERE player_id=?").bind(playerId), database.prepare("UPDATE player_pets SET equipped=1 WHERE player_id=? AND kind=?").bind(playerId, payload.petKind)]);
					await globalThis.__colPremium?.refreshHp(playerId);
					return Response.json({
						ok: true,
						petKind: payload.petKind,
						message: `${PET_DEFINITIONS[payload.petKind].name} yanına geldi.`
					});
				}
				if (payload.action === "equip_wings" || payload.action === "unequip_wings") {
					const equipped = payload.action === "equip_wings" ? 1 : 0;
					const result = await database.prepare("UPDATE players SET wings_equipped = ?, last_seen = ? WHERE id = ? AND has_wings = 1 RETURNING has_wings, wings_equipped").bind(equipped, now, playerId).first();
					if (!result) return Response.json({ error: "Bu kanatlar karakterinde bulunmuyor." }, { status: 404 });
					return Response.json({
						ok: true,
						hasWings: result.has_wings,
						wingsEquipped: result.wings_equipped,
						message: equipped ? "Kızıl Çekirdek Kanatları kuşanıldı." : "Kanatlar çıkarıldı."
					});
				}
				if (payload.action === "use_potion") {
					if (player.area === "war" || player.area === "arena" || player.arena_match_id) return Response.json({ error: "Savaş Meydanı, Arena ve lonca savaşında can iksiri kullanılamaz." }, { status: 409 });
					if (payload.automatic === true) {
						if (!await database.prepare("SELECT 1 FROM players WHERE id=? AND auto_potion_owned=1 AND auto_potion_enabled=1 AND auto_potion_at_ms<=? AND hp>0 AND hp<=max_hp*.5").bind(playerId, requestReceivedAtMs - 2e3).first()) return Response.json({
							ok: true,
							message: ""
						});
					}
					const pendingRetaliation = await settlePveEngagement(database, playerId, settings, requestReceivedAtMs);
					if (pendingRetaliation?.dead) return Response.json({
						error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun.",
						hp: pendingRetaliation.hp,
						maxHp: pendingRetaliation.max_hp,
						hpRevision: pendingRetaliation.hp_revision,
						respawnAtMs: pendingRetaliation.respawn_at_ms
					}, { status: 409 });
					const result = payload.automatic === true ? await database.prepare("UPDATE players SET hp=hp+MIN(max_hp-hp,auto_potion_remaining),auto_potion_remaining=MAX(0,auto_potion_remaining-(max_hp-hp)),auto_potion_owned=CASE WHEN auto_potion_remaining<=max_hp-hp THEN 0 ELSE 1 END,auto_potion_enabled=CASE WHEN auto_potion_remaining<=max_hp-hp THEN 0 ELSE auto_potion_enabled END,hp_revision=hp_revision+1,auto_potion_at_ms=?,last_seen=? WHERE id=? AND hp>0 AND hp<=max_hp*.5 AND area NOT IN ('war','arena') AND COALESCE(arena_match_id,'')='' AND auto_potion_owned=1 AND auto_potion_remaining>0 AND auto_potion_enabled=1 AND auto_potion_at_ms<=? RETURNING hp,max_hp,hp_revision,potions").bind(requestReceivedAtMs, now, playerId, requestReceivedAtMs - 2e3).first() : await database.prepare("UPDATE players SET hp = MIN(max_hp,hp+MAX(1,CAST(max_hp*.2 AS INTEGER))), hp_revision = hp_revision + 1, respawn_at_ms = 0, potions = potions - 1, last_seen = ? WHERE id = ? AND area NOT IN ('war','arena') AND COALESCE(arena_match_id,'')='' AND potions > 0 AND hp > 0 AND hp < max_hp RETURNING hp, max_hp, hp_revision, potions").bind(now, playerId).first();
					if (!result) return Response.json({ error: player.hp >= player.max_hp ? "Canın zaten dolu." : "Can iksirin yok." }, { status: 400 });
					await publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
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
				if (payload.action === "evolve_weapon") {
					await colEnforceCraftRate485(auth.account.id);
					if (player.hp <= 0 || player.area !== "bazaar" || Math.hypot(player.x - BLACKSMITH_HASO.x, player.y - BLACKSMITH_HASO.y) > 280) return Response.json({ error: "Evrim için canlı olarak Demirci Haso'nun yanına yaklaş." }, { status: 400 });
					const itemId = safeId(payload.itemId);
					const item = await database.prepare("SELECT id,kind,item_name,enchantments FROM player_items WHERE id=? AND player_id=? AND kind='weapon'").bind(itemId, playerId).first();
					if (!item) return Response.json({ error: "Kendi silahını seç." }, { status: 400 });
					const current = weaponEvolution(item.enchantments);
					if (current.level >= 3) return Response.json({ error: "Silah son evrimde." }, { status: 400 });
					const stage = evolutionStage(current.level + 1, settings);
					if (current.kills < stage.kills) return Response.json({ error: `Bu evrim için bu silahla toplam ${stage.kills} canavar öldürmelisin.` }, { status: 400 });
					await database.prepare("INSERT OR IGNORE INTO player_stones(player_id,kind,amount) VALUES(?,'evolution_scroll',0)").bind(playerId).run();
					const announcement = `${player.name}, ${item.item_name} silahını ${stage.stage}. Evrime yükseltti!`;
					const results = await database.batch([
						database.prepare(`UPDATE player_items SET enchantments=? WHERE id=? AND player_id=? AND kind='weapon' AND enchantments=?
          AND EXISTS(SELECT 1 FROM players WHERE id=? AND hp>0 AND area='bazaar' AND gems>=? AND pearls>=? AND (x-1200)*(x-1200)+(y-390)*(y-390)<=78400)
          AND EXISTS(SELECT 1 FROM player_stones WHERE player_id=? AND kind='evolution_scroll' AND amount>=?)
          RETURNING id,kind,item_name,rarity,power,role,enchantments,equipped,created_at`).bind(evolveEnchantments(item.enchantments, stage), item.id, playerId, item.enchantments, playerId, stage.gems, stage.pearls, playerId, stage.scrolls),
						database.prepare("UPDATE players SET gems=gems-?,pearls=pearls-? WHERE id=? AND changes()>0 RETURNING gems").bind(stage.gems, stage.pearls, playerId),
						database.prepare("UPDATE player_stones SET amount=amount-? WHERE player_id=? AND kind='evolution_scroll' AND changes()>0 RETURNING amount").bind(stage.scrolls, playerId),
						database.prepare(`INSERT INTO messages(player_id,player_name,recipient_id,scope,area,channel,body,created_at,announcement_expires_at_ms,announcement_request_id)
          SELECT ?,'EVRİM',NULL,'world',NULL,1,?,?,?,? WHERE changes()>0
          ON CONFLICT(player_id,announcement_request_id) DO NOTHING
          RETURNING id,player_id,player_name,recipient_id,scope,area,channel,body,created_at,announcement_expires_at_ms`).bind(playerId, announcement.slice(0, 140), now, Date.now() + 7e3, `evolution-${item.id}-${stage.stage}`)
					]);
					const updated = results[0]?.results[0];
					if (!updated) return Response.json({ error: `${stage.gems} mücevher ve ${stage.pearls ? `${stage.pearls} İnci` : `${stage.scrolls} Evrim Parşomeni`} gerekli; silah değiştiyse yeniden seç.` }, { status: 409 });
					const message = results[3]?.results[0];
					if (message) await broadcastAnnouncement(database, message, now).catch((error) => console.error("evolution announcement broadcast", error));
					return Response.json({
						ok: true,
						item: updated,
						gems: (results[1]?.results[0]).gems,
						message: announcement
					});
				}
				if (payload.action === "craft_stone") {
					await enforceRateLimit("stone-art-craft", auth.account.id, {
						limit: 20,
						windowSeconds: 60,
						blockSeconds: 10
					});
					const definition = parseStone(payload.stoneKind);
					if (!definition) return Response.json({ error: "Geçerli bir taş seç." }, { status: 400 });
					if (player.area !== "bazaar" || Math.hypot(player.x - BLACKSMITH_HASO.x, player.y - BLACKSMITH_HASO.y) > 280) return Response.json({ error: "Taş Sanatı için Demirci Haso'nun yanına yaklaş." }, { status: 400 });
					const dustCost = Math.max(0, Math.round(settings.stone_art_dust_cost));
					const bookCost = Math.max(0, Math.round(settings.stone_art_book_cost));
					const gemCost = Math.max(0, Math.round(settings.stone_art_gem_cost));
					const useProtection = payload.useProtection === true && !!globalThis.__colPremium;
					const success = Math.random() < .7;
					const protectedFailure = useProtection && !success;
					const rolled = rollStone(definition.kind);
					await database.prepare("INSERT OR IGNORE INTO player_stones (player_id,kind,amount) VALUES (?,'book',0)").bind(playerId).run();
					const results = await database.batch([
						database.prepare(`UPDATE players SET stone_dust=stone_dust-?,gems=gems-?,last_seen=?${protectedFailure ? ",protection_seals=protection_seals-1" : ""}
          WHERE id=? AND stone_dust>=? AND gems>=? ${useProtection ? "AND protection_seals>0" : ""}
          AND COALESCE((SELECT amount FROM player_stones WHERE player_id=? AND kind='book'),0)>=?
          RETURNING stone_dust,gems`).bind(protectedFailure ? dustCost - Math.floor(dustCost / 2) : dustCost, protectedFailure ? gemCost - Math.floor(gemCost / 2) : gemCost, now, playerId, dustCost, gemCost, playerId, bookCost),
						database.prepare("UPDATE player_stones SET amount=amount-? WHERE player_id=? AND kind='book' AND changes()>0 RETURNING amount").bind(protectedFailure ? bookCost - Math.floor(bookCost / 2) : bookCost, playerId),
						database.prepare("INSERT INTO player_stones(player_id,kind,amount) SELECT ?,?,1 WHERE changes()>0 AND ?=1 ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+1 RETURNING amount").bind(playerId, rolled.key, success ? 1 : 0)
					]);
					const wallet = results[0]?.results[0];
					const books = results[1]?.results[0];
					const crafted = results[2]?.results[0];
					if (!wallet || !books) return Response.json({ error: `Bu taş için ${dustCost} Taş Tozu, ${bookCost} Taş Sanatı Kitabı ve ${gemCost} Mücevher gerekiyor.` }, { status: 400 });
					return Response.json({
						ok: true,
						success,
						stoneDust: wallet.stone_dust,
						gems: wallet.gems,
						books: books.amount,
						stoneKind: rolled.key,
						stoneValue: success ? rolled.value : null,
						stoneAmount: crafted?.amount ?? 0,
						message: success ? `${definition.label} ${stoneEffect(rolled)} başarıyla üretildi.` : protectedFailure ? "Üretim başarısız; Koruma Mührü tüketildi, her malzemenin yarısı (aşağı yuvarlanarak) korundu." : "Taş üretimi başarısız oldu; malzemeler kullanıldı."
					});
				}
				if (payload.action === "socket_stone") {
					await enforceRateLimit("stone-art-socket", auth.account.id, {
						limit: 30,
						windowSeconds: 60,
						blockSeconds: 10
					});
					const definition = parseStone(payload.stoneKind);
					const itemId = safeId(payload.itemId);
					if (!definition || !itemId) return Response.json({ error: "Taş ve eşya seçimi eksik." }, { status: 400 });
					if (player.hp <= 0) return Response.json({ error: "Yerdeyken taş takamazsın." }, { status: 400 });
					const item = await database.prepare("SELECT id,kind,item_name,enchantments FROM player_items WHERE id=? AND player_id=?").bind(itemId, playerId).first();
					if (!item || item.kind !== definition.itemKind) return Response.json({ error: definition.itemKind === "weapon" ? "Bu taş yalnız silaha takılır." : "Bu taş yalnız zırha takılır." }, { status: 400 });
					const enchantments = parseEnchantments(item.enchantments, item.kind);
					if (enchantments.some((entry) => entry.kind === definition.enchantment)) return Response.json({ error: "Bu eşya aynı taşı zaten taşıyor." }, { status: 400 });
					const nextEnchantments = JSON.stringify([...enchantments, {
						kind: definition.enchantment,
						value: definition.value
					}]);
					const results = await database.batch([database.prepare(`UPDATE player_items SET enchantments=? WHERE id=? AND player_id=? AND enchantments=?
          AND EXISTS(SELECT 1 FROM player_stones WHERE player_id=? AND kind=? AND amount>0)
          RETURNING id,kind,item_name,rarity,power,role,enchantments,equipped,created_at`).bind(nextEnchantments, itemId, playerId, item.enchantments, playerId, definition.key), database.prepare("UPDATE player_stones SET amount=amount-1 WHERE player_id=? AND kind=? AND amount>0 AND changes()>0 RETURNING amount").bind(playerId, definition.key)]);
					const updated = results[0]?.results[0];
					const balance = results[1]?.results[0];
					if (!updated || !balance) return Response.json({ error: `Çantanda ${definition.label} yok.` }, { status: 400 });
					return Response.json({
						ok: true,
						item: updated,
						stoneKind: definition.key,
						stoneAmount: balance.amount,
						message: `${definition.label} ${stoneEffect(definition)}, ${item.item_name} üzerine işlendi.`
					});
				}
				if (payload.action === "upgrade_unique") {
					if (player.area !== "bazaar") return Response.json({ error: "Demirci Haso yalnızca Pazar Köyü'nde çalışır." }, { status: 400 });
					const itemId = safeId(payload.itemId);
					if (!itemId) return Response.json({ error: "Yükseltilecek eşya geçersiz." }, { status: 400 });
					if (distance(player, BLACKSMITH_HASO) > BLACKSMITH_INTERACTION_RANGE) return Response.json({ error: "Dönüşüm için Demirci Haso'nun yanına yaklaşmalısın." }, { status: 400 });
					await colEnforceCraftRate485(auth.account.id);
                    if(payload.emerald502===true)return colUpgradeEmerald502(database,playerId,itemId,now,BLACKSMITH_HASO,BLACKSMITH_INTERACTION_RANGE);
					const gemCost = Math.max(0, Math.round(settings.blacksmith_gem_cost));
					const pearlCost = Math.max(0, Math.round(settings.blacksmith_pearl_cost));
					const dustCost = Math.max(0, Math.round(settings.blacksmith_dust_cost));
					const uniqueWeaponPower = Math.max(1, Math.round(settings.unique_weapon_power));
					const uniqueArmorPower = Math.max(1, Math.round(settings.unique_armor_power));
					const claimToken = crypto.randomUUID();
					const upgradeResults = await database.batch([
						database.prepare(`INSERT OR IGNORE INTO blacksmith_upgrades
             (item_id, player_id, claim_token, prior_power, upgraded_power, upgraded_at)
           SELECT item.id, item.player_id, ?, item.power,
             CASE WHEN item.kind = 'weapon' THEN MAX(item.power-(CASE item.kind WHEN 'weapon' THEN CASE COALESCE((SELECT e.level FROM item_enhancements491 e WHERE e.item_id=item.id),0) WHEN 1 THEN 3 WHEN 2 THEN 8 WHEN 3 THEN 15 WHEN 4 THEN 25 WHEN 5 THEN 40 ELSE 0 END ELSE CASE COALESCE((SELECT e.level FROM item_enhancements491 e WHERE e.item_id=item.id),0) WHEN 1 THEN 2 WHEN 2 THEN 6 WHEN 3 THEN 11 WHEN 4 THEN 18 WHEN 5 THEN 28 ELSE 0 END END), ?) ELSE MAX(item.power-(CASE item.kind WHEN 'weapon' THEN CASE COALESCE((SELECT e.level FROM item_enhancements491 e WHERE e.item_id=item.id),0) WHEN 1 THEN 3 WHEN 2 THEN 8 WHEN 3 THEN 15 WHEN 4 THEN 25 WHEN 5 THEN 40 ELSE 0 END ELSE CASE COALESCE((SELECT e.level FROM item_enhancements491 e WHERE e.item_id=item.id),0) WHEN 1 THEN 2 WHEN 2 THEN 6 WHEN 3 THEN 11 WHEN 4 THEN 18 WHEN 5 THEN 28 ELSE 0 END END), ?) END+(CASE item.kind WHEN 'weapon' THEN CASE COALESCE((SELECT e.level FROM item_enhancements491 e WHERE e.item_id=item.id),0) WHEN 1 THEN 3 WHEN 2 THEN 8 WHEN 3 THEN 15 WHEN 4 THEN 25 WHEN 5 THEN 40 ELSE 0 END ELSE CASE COALESCE((SELECT e.level FROM item_enhancements491 e WHERE e.item_id=item.id),0) WHEN 1 THEN 2 WHEN 2 THEN 6 WHEN 3 THEN 11 WHEN 4 THEN 18 WHEN 5 THEN 28 ELSE 0 END END), ?
           FROM player_items item JOIN players owner ON owner.id = item.player_id
           WHERE item.id = ? AND item.player_id = ? AND item.rarity = 'red'
             AND item.kind IN ('weapon','armor','helmet','shoes','necklace') AND owner.hp > 0 AND owner.area = 'bazaar'
             AND ((substr(item.item_name,1,3)='+'||COALESCE((SELECT e.level FROM item_enhancements491 e WHERE e.item_id=item.id),0)||' ') OR (COALESCE((SELECT e.level FROM item_enhancements491 e WHERE e.item_id=item.id),0)=0 AND substr(item.item_name,1,1)!='+'))
             AND owner.gems >= ? AND owner.pearls >= ? AND owner.stone_dust >= ?`).bind(claimToken, uniqueWeaponPower, uniqueArmorPower, now, itemId, playerId, gemCost, pearlCost, dustCost),
						database.prepare(`UPDATE players SET gems = gems - ?, pearls = pearls - ?, stone_dust = stone_dust - ?,
             last_seen = ?
           WHERE id = ? AND changes() > 0
             AND EXISTS (SELECT 1 FROM blacksmith_upgrades WHERE claim_token = ? AND player_id = ?)
           RETURNING gems, pearls, stone_dust`).bind(gemCost, pearlCost, dustCost, now, playerId, claimToken, playerId),
						database.prepare(`WITH upgrade AS (
             SELECT upgraded_power FROM blacksmith_upgrades
             WHERE claim_token = ? AND player_id = ? AND item_id = ?
           )
           UPDATE player_items SET rarity = 'unique', power = (SELECT upgraded_power FROM upgrade),
             equipped = CASE WHEN (SELECT level FROM players WHERE id = player_items.player_id) >= 50 THEN equipped ELSE 0 END,
             item_name = '+'||COALESCE((SELECT e.level FROM item_enhancements491 e WHERE e.item_id=player_items.id),0)||' '||CASE kind WHEN 'weapon' THEN CASE role
               WHEN 'avci' THEN 'Eşsiz Platin Yay'
               WHEN 'arkanist' THEN 'Eşsiz Platin Asa'
               ELSE 'Eşsiz Platin Kılıç' END
             WHEN 'helmet' THEN 'Eşsiz Platin Kask' WHEN 'shoes' THEN 'Eşsiz Platin Çizme' WHEN 'necklace' THEN 'Eşsiz Platin Kolye'
             ELSE CASE role
               WHEN 'avci' THEN 'Eşsiz Platin Avcı Zırhı'
               WHEN 'arkanist' THEN 'Eşsiz Platin Rün Cübbesi'
               ELSE 'Eşsiz Platin Muhafız Zırhı' END END
           WHERE id = ? AND player_id = ? AND rarity = 'red' AND kind IN ('weapon','armor','helmet','shoes','necklace')
             AND changes() > 0 AND EXISTS (SELECT 1 FROM upgrade)
           RETURNING id, kind, item_name, rarity, power, role, enchantments, equipped, sale_locked499`).bind(claimToken, playerId, itemId, itemId, playerId)
					]);
					const wallet = upgradeResults[1]?.results[0];
					const item = upgradeResults[2]?.results[0];
					if (wallet && item) {
						await globalThis.__colPremium?.refreshHp(playerId);
						return Response.json({
							ok: true,
							gems: wallet.gems,
							pearls: wallet.pearls,
							stoneDust: wallet.stone_dust,
							item,
							message: `${item.item_name} dövüldü · efsunların korundu.`
						});
					}
					const [existingItem, currentWallet] = await Promise.all([database.prepare(`SELECT item.id, item.kind, item.item_name, item.rarity, item.power, item.role, item.enchantments, item.equipped, item.sale_locked499
           FROM player_items item JOIN blacksmith_upgrades upgrade ON upgrade.item_id = item.id
           WHERE item.id = ? AND item.player_id = ? AND item.rarity = 'unique'`).bind(itemId, playerId).first(), database.prepare("SELECT gems, pearls, stone_dust FROM players WHERE id = ?").bind(playerId).first()]);
					if (existingItem && currentWallet) return Response.json({
						ok: true,
						alreadyUpgraded: true,
						gems: currentWallet.gems,
						pearls: currentWallet.pearls,
						stoneDust: currentWallet.stone_dust,
						item: existingItem,
						message: `${existingItem.item_name} zaten Eşsiz seviyede.`
					});
					const candidate = await database.prepare("SELECT kind, rarity FROM player_items WHERE id = ? AND player_id = ?").bind(itemId, playerId).first();
					if (!candidate || candidate.rarity !== "red" || candidate.kind !== "weapon" && candidate.kind !== "armor") return Response.json({ error: "Haso yalnızca en üst kırmızı silahları ve zırhları Eşsiz seviyeye dönüştürür." }, { status: 400 });
					return Response.json({ error: `Dönüşüm için ${dustCost} Taş Tozu, ${pearlCost} İnci ve ${gemCost} Mücevher gerekiyor.` }, { status: 400 });
				}
				if (payload.action === "sell_rarity") {
					await enforceRateLimit("npc-bulk-sale", auth.account.id, {
						limit: 12,
						windowSeconds: 60,
						blockSeconds: 30
					});
					const rarity = String(payload.rarity ?? "");
					if (rarity !== "white" && rarity !== "blue" && rarity !== "orange") return Response.json({ error: "Yalnız beyaz, mavi veya turuncu eşyalar toplu satılabilir." }, { status: 400 });
					const requestId = safeId(payload.requestId);
					if (!requestId) return Response.json({ error: "İşlem kimliği gerekli." }, { status: 400 });
					const price = rarity === "orange" ? settings.item_sale_orange : rarity === "blue" ? settings.item_sale_blue : settings.item_sale_white;
					const result = await database.batch([
						database.prepare(`INSERT OR IGNORE INTO market_settlements
          (id, listing_id, settlement_type, buyer_id, seller_id, kind, item_id, item_name, rarity, power,
           role, enchantments, amount, price_gems, created_at_ms, applied_at_ms)
          SELECT ? || ':' || item.id, 'bulk:' || ? || ':' || item.id, 'npc_bulk_sale', '', item.player_id,
            item.kind, item.id, item.item_name, item.rarity, item.power, item.role, item.enchantments,
            1, ?, ?, 0 FROM player_items item
          WHERE item.player_id = ? AND item.rarity = ? AND item.equipped = 0 AND item.sale_locked499 = 0
            AND item.kind IN ('weapon','armor','helmet','shoes','necklace')
            AND NOT EXISTS (SELECT 1 FROM market_settlements prior WHERE prior.id = ? || ':' || item.id)`).bind(requestId, requestId, price, Date.now(), playerId, rarity, requestId),
						database.prepare(`UPDATE market_settlements SET applied_at_ms = -1
          WHERE settlement_type = 'npc_bulk_sale' AND seller_id = ? AND id >= ? AND id < ? AND applied_at_ms = 0`).bind(playerId, `${requestId}:`, `${requestId};`),
						database.prepare(`DELETE FROM player_items WHERE player_id = ? AND rarity = ? AND equipped = 0
          AND kind IN ('weapon','armor','helmet','shoes','necklace')
          AND EXISTS (SELECT 1 FROM market_settlements sale WHERE sale.id = ? || ':' || player_items.id
            AND sale.seller_id = ? AND sale.applied_at_ms = -1)`).bind(playerId, rarity, requestId, playerId),
						database.prepare(`UPDATE players SET gems = gems + (SELECT COALESCE(SUM(price_gems),0)
            FROM market_settlements WHERE settlement_type='npc_bulk_sale' AND seller_id = ? AND id >= ? AND id < ? AND applied_at_ms=-1)
          WHERE id = ? AND changes() >= 0 RETURNING gems`).bind(playerId, `${requestId}:`, `${requestId};`, playerId),
						database.prepare(`UPDATE market_settlements SET applied_at_ms = ?
          WHERE settlement_type='npc_bulk_sale' AND seller_id = ? AND id >= ? AND id < ? AND applied_at_ms=-1`).bind(Date.now(), playerId, `${requestId}:`, `${requestId};`)
					]);
					const soldRows=await database.prepare("SELECT item_id,price_gems FROM market_settlements WHERE id>=? AND id<? AND settlement_type='npc_bulk_sale' AND seller_id=? AND applied_at_ms>0").bind(requestId+':',requestId+';',playerId).all();const receipt={count:soldRows.results.length,total:soldRows.results.reduce((sum,row)=>sum+row.price_gems,0)};
return Response.json({
						ok: true,
						soldItemIds:soldRows.results.map(row=>row.item_id),sold: receipt?.count ?? 0,
						earned: receipt?.total ?? 0,
						gems: Number(result[3]?.results[0]?.gems ?? player.gems),
						message: `${receipt?.count ?? 0} ${{
							white: "beyaz",
							blue: "mavi",
							orange: "turuncu"
						}[rarity]} eşya satıldı · +${receipt?.total ?? 0} Mücevher`
					});
				}
				if (payload.action === "sell_item") {
					await enforceRateLimit("npc-item-sale", auth.account.id, {
						limit: 30,
						windowSeconds: 60,
						blockSeconds: 30
					});
					const itemId = safeId(payload.itemId);
					const settlementId = safeId(payload.requestId) || crypto.randomUUID();
					if (!itemId) return Response.json({ error: "Eşya kimliği geçersiz." }, { status: 400 });
					await database.batch([
						database.prepare(`INSERT OR IGNORE INTO market_settlements
           (id, listing_id, settlement_type, buyer_id, seller_id, kind, item_id, item_name, rarity, power,
            role, enchantments, amount, price_gems, created_at_ms, applied_at_ms)
           SELECT ?, 'npc:' || item.id, 'npc_sale', '', item.player_id, item.kind, item.id, item.item_name,
             item.rarity, item.power, item.role, item.enchantments, 1,
             CASE item.rarity WHEN 'red' THEN ? WHEN 'orange' THEN ? WHEN 'blue' THEN ? ELSE ? END, ?, 0
           FROM player_items item WHERE item.id = ? AND item.player_id = ? AND item.equipped = 0 AND item.sale_locked499 = 0 AND item.kind NOT IN ('rune_attack','rune_defense','rune_hp','earring','bracelet') AND item.rarity NOT IN ('purple','unique','infinite','emerald')
           RETURNING id`).bind(settlementId, settings.item_sale_red, settings.item_sale_orange, settings.item_sale_blue, settings.item_sale_white, Date.now(), itemId, playerId),
						database.prepare("UPDATE market_settlements SET applied_at_ms = -1 WHERE id = ? AND applied_at_ms = 0 AND changes() > 0").bind(settlementId),
						database.prepare("DELETE FROM player_items WHERE id = ? AND player_id = ? AND EXISTS (SELECT 1 FROM market_settlements WHERE id = ? AND applied_at_ms = -1)").bind(itemId, playerId, settlementId),
						database.prepare("UPDATE market_settlements SET applied_at_ms = -2 WHERE id = ? AND applied_at_ms = -1 AND changes() > 0").bind(settlementId),
						database.prepare(`UPDATE players SET gems = gems + (SELECT price_gems FROM market_settlements WHERE id = ? AND applied_at_ms = -2), last_seen = ?
           WHERE id = ? AND EXISTS (SELECT 1 FROM market_settlements WHERE id = ? AND applied_at_ms = -2)`).bind(settlementId, now, playerId, settlementId),
						database.prepare("UPDATE market_settlements SET applied_at_ms = ? WHERE id = ? AND applied_at_ms = -2").bind(Date.now(), settlementId)
					]);
					const sale = await database.prepare("SELECT item_name, price_gems, applied_at_ms FROM market_settlements WHERE listing_id = ? AND seller_id = ? AND settlement_type = 'npc_sale' LIMIT 1").bind(`npc:${itemId}`, playerId).first();
					const balance = sale?.applied_at_ms && sale.applied_at_ms > 0 ? await database.prepare("SELECT gems FROM players WHERE id = ?").bind(playerId).first() : null;
					if (!sale || sale.applied_at_ms <= 0 || !balance) return Response.json({ error: "Kilitli, kuşanılmış, Eşsiz veya bulunamayan eşya hızlı satılamaz." }, { status: 400 });
					return Response.json({
						ok: true,
						gems: balance.gems,
						message: `${sale.item_name} satıldı · +${sale.price_gems} Mücevher`
					});
				}
                if(['answer_broken_core464','dismiss_broken_core464'].includes(payload.action)){if(typeof database.nativeOperation!=='function')return Response.json({error:'Çekirdek yalnız etkin kanal sunucusunda kullanılabilir.'},{status:409});try{return Response.json(await database.nativeOperation({name:'brokenCore464.act',playerId,accountId:auth.account.id,input:payload}));}catch(error){if(error.code)throw error;return Response.json({error:error.message},{status:409});}}
				if (["craft_jewelry456","choose_specialization456","upgrade_specialization456","exchange_wands456","use_halloween_candy456","buy_specialization_reset463","use_specialization_reset463"].includes(payload.action)) {
 try {const result=await database.nativeOperation({name:'expansion456.act',playerId,accountId:auth.account.id,input:payload});return Response.json(result);}catch(error){if(error.code)throw error;return Response.json({error:error.message},{status:409});}
 }
 if (payload.action === "upgrade_skill") {
					const slot = clamp$1(Math.floor(Number(payload.slot) || 1), 1, 3);
					const upgradeLabel = slot === 1 ? "Temel saldırı" : "Yetenek";
					const requiredLevel = slot === 1 ? 1 : slot === 2 ? settings.skill_two_unlock_level : settings.skill_three_unlock_level;
					if (player.level < requiredLevel) return Response.json({ error: `${upgradeLabel} ${requiredLevel}. seviyede açılır.` }, { status: 400 });
					const column = slot === 1 ? "skill_one" : slot === 2 ? "skill_two" : "skill_three";
					const progression = skillProgression(player.level, [
						player.skill_one,
						player.skill_two,
						player.skill_three
					]);
					if (progression.available === 0) return Response.json({ error: progression.total >= 30 ? "Tüm yetenekler en yüksek güçte." : `Yeni geliştirme hakkı ${progression.nextLevel}. seviyede açılır. Kullanılmayan haklar birikir.` }, { status: 400 });
					const currentSkillLevel = player[column];
					const upgradeCost = Math.max(1, Math.round(settings.skill_upgrade_gem_cost)) * currentSkillLevel;
					const result = await database.prepare(`UPDATE players SET gems = gems - ?, ${column} = ${column} + 1, last_seen = ? WHERE id = ? AND gems >= ? AND ${column} < 10 AND level >= ? AND skill_one + skill_two + skill_three < MIN(30, MAX(3, level)) RETURNING gems, ${column} AS skill_level`).bind(upgradeCost, now, playerId, upgradeCost, requiredLevel).first();
					if (!result) return Response.json({ error: currentSkillLevel >= 10 ? `${upgradeLabel} en yüksek güçte.` : `${upgradeLabel} yükseltmek için kullanılabilir seviye hakkı ve ${upgradeCost} Mücevher gerekiyor.` }, { status: 400 });
					return Response.json({
						ok: true,
						...result,
						upgradeCost,
						message: `${upgradeLabel} ${result.skill_level}. güç seviyesine yükseldi · ${upgradeCost} Mücevher.`
					});
				}
				if (payload.action === "invite_party") {
					const targetPlayerId = safeId(payload.targetPlayerId);
					if (!targetPlayerId || targetPlayerId === playerId) return Response.json({ error: "Geçerli bir oyuncu seçmelisin." }, { status: 400 });
					const target = await database.prepare("SELECT name FROM players WHERE id = ? AND last_seen >= ? AND channel = ? AND area = ?").bind(targetPlayerId, now - 30, player.channel, player.area).first();
					if (!target) return Response.json({ error: "Oyuncu artık yanında değil." }, { status: 404 });
					const invited494=await database.prepare(`INSERT INTO party_invites (recipient_id, sender_id, created_at) SELECT ?, ?, ? WHERE NOT EXISTS(SELECT 1 FROM party_members WHERE player_id=?)
         ON CONFLICT(recipient_id) DO UPDATE SET sender_id = excluded.sender_id, created_at = excluded.created_at WHERE NOT EXISTS(SELECT 1 FROM party_members WHERE player_id=excluded.recipient_id) RETURNING recipient_id`).bind(targetPlayerId,playerId,now,targetPlayerId).first();
          if(!invited494)return Response.json({error:"Oyuncu zaten bir partide."},{status:409});
					await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
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
				if(payload.action === "reject_party") {
          const sender494=safeId(payload.targetPlayerId),stamp494=Number(payload.createdAt);
          if(!sender494||!Number.isSafeInteger(stamp494)||stamp494<1)return Response.json({error:"Parti daveti geçersiz."},{status:400});
          await database.prepare("DELETE FROM party_invites WHERE recipient_id=? AND sender_id=? AND created_at=?").bind(playerId,sender494,stamp494).run();
          return Response.json({ok:true,message:"Parti daveti reddedildi."});
        }
        if (payload.action === "accept_party") {
					const senderId = safeId(payload.targetPlayerId);
					if (!(senderId ? await database.prepare("SELECT sender_id FROM party_invites WHERE recipient_id = ? AND sender_id = ? AND created_at >= ?").bind(playerId, senderId, now - 120).first() : null)) return Response.json({ error: "Parti davetinin süresi dolmuş." }, { status: 404 });
					if (await database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first()) return Response.json({ error: "Zaten bir partidesin." }, { status: 400 });
					const senderMembership = await database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(senderId).first();
					const partyId = senderMembership?.party_id ?? crypto.randomUUID();
					if (((senderMembership ? await database.prepare("SELECT COUNT(*) AS count FROM party_members WHERE party_id = ?").bind(partyId).first() : { count: 1 })?.count ?? 0) >= 5) return Response.json({ error: "Bu parti dolu." }, { status: 409 });
                    const joinedParty = await acceptArenaSafeParty498(database,{playerId,senderId,partyId,now,senderMembership});
					if (!joinedParty[joinedParty.length - 2]?.results.length) return Response.json({ error: "Grup dolmuş veya üyelerden biri Arena maçında olabilir. Maç bitince daveti yeniden dene." }, { status: 409 });
					return Response.json({
						ok: true,
						message: "Gruba katıldın. Yakındaki canlı ve aktif üyeler tam EXP ve %2–8 grup bonusu alır. Öz paylaşımı da aktiftir."
					});
				}
				if (payload.action === "kick_party") {
          const targetPlayerId = safeId(payload.targetPlayerId);
          if (!targetPlayerId || targetPlayerId === playerId) return Response.json({error:"Başka bir grup üyesi seçmelisin."},{status:400});
          const removed = await database.prepare("DELETE FROM party_members WHERE player_id = ? AND player_id <> ?\n        AND party_id IN (SELECT party.id FROM parties party JOIN party_members leader ON leader.party_id=party.id\n          WHERE party.leader_id=? AND leader.player_id=party.leader_id)\n        RETURNING player_id").bind(targetPlayerId,playerId,playerId).first();
          if (!removed) return Response.json({error:"Yalnız grup başkanı kendi grubundan oyuncu çıkarabilir."},{status:403});
          return Response.json({ok:true,message:"Oyuncu gruptan çıkarıldı."});
        }
        if (payload.action === "leave_party") {
					const membership = await database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first();
					if (!membership) return Response.json({ error: "Bir partide değilsin." }, { status: 400 });
					await database.prepare("DELETE FROM party_members WHERE player_id = ?").bind(playerId).run();
					const remaining = await database.prepare("SELECT player_id FROM party_members WHERE party_id = ? ORDER BY joined_at LIMIT 1").bind(membership.party_id).first();
					if (remaining) await database.prepare("UPDATE parties SET leader_id = CASE WHEN leader_id = ? THEN ? ELSE leader_id END WHERE id = ?").bind(playerId, remaining.player_id, membership.party_id).run();
					else await database.prepare("DELETE FROM parties WHERE id = ?").bind(membership.party_id).run();
					return Response.json({
						ok: true,
						message: "Partiden ayrıldın."
					});
				}
				if (payload.action === "create_shop" || payload.action === "create_listing" || payload.action === "cancel_listing" || payload.action === "buy_listing") await enforceRateLimit("market-economy", auth.account.id, {
					limit: 30,
					windowSeconds: 60,
					blockSeconds: 30
				});
				if (payload.action === "storage_deposit" || payload.action === "storage_withdraw") {
					await enforceRateLimit("storage-economy", auth.account.id, {
						limit: 40,
						windowSeconds: 60,
						blockSeconds: 20
					});
					if (player.area !== "bazaar") return Response.json({ error: "Depocu yalnızca Pazar Köyü'nde kullanılabilir." }, { status: 400 });
					if (Math.hypot(player.x - STORAGE_KEEPER.x, player.y - STORAGE_KEEPER.y) > 280) return Response.json({ error: "Depocu'yu kullanmak için yanına yaklaşmalısın." }, { status: 400 });
					const service = globalThis.__colStorage;
					if (!service) return Response.json({ error: "Depo için sunucu güncellemesi gerekli." }, { status: 503 });
					try {
						return Response.json(await service.act(playerId, {
							...payload,
							requestId: crypto.randomUUID()
						}));
					} catch (error) {
						const message = error instanceof Error ? error.message : "Depo işlemi tamamlanamadı.";
						return Response.json({ error: /(SQLITE|constraint|column|table|bind)/i.test(message) ? "Depo işlemi tamamlanamadı; eşyan korunuyor." : message }, { status: 409 });
					}
				}
				if (payload.action === "create_shop") {
					if (player.area !== "bazaar") return Response.json({ error: "Tezgâh yalnızca Pazar Köyü'nde kurulabilir." }, { status: 400 });
					const shopId = `shop-${playerId}`;
					const shopName = (typeof payload.shopName === "string" ? payload.shopName.replace(/[^\p{L}\p{N} _'’.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 48) : "") || `${player.name} Tezgâhı`;
					if (!await database.prepare(`INSERT INTO market_shops (id, owner_id, owner_name, name, x, y, channel, active, created_at)
         SELECT ?, current_player.id, current_player.name, ?, current_player.x, current_player.y,
           current_player.channel, 1, ? FROM players current_player
         WHERE current_player.id = ? AND current_player.hp > 0 AND current_player.area = 'bazaar'
         ON CONFLICT(owner_id) DO UPDATE SET x = excluded.x, y = excluded.y, channel = excluded.channel,
           active = 1, owner_name = excluded.owner_name, name = excluded.name, created_at = excluded.created_at
         RETURNING id`).bind(shopId, shopName, now, playerId).first()) return Response.json({ error: "Tezgâh kurulurken konumun değişti; Pazar Köyü'nde tekrar dene." }, { status: 409 });
					return Response.json({
						ok: true,
						shopId,
						shopName,
						message: `${shopName} bu konuma kuruldu.`
					});
				}
				if (payload.action === "create_listing") {
					if (player.area !== "bazaar") return Response.json({ error: "Pazara ürün koymak için Pazar Köyü'nde olmalısın." }, { status: 400 });
					const price = clamp$1(Math.floor(Number(payload.price) || 0), 1, 99999);
					const requestId = safeId(payload.requestId) || crypto.randomUUID();
					const listingId = crypto.randomUUID();
					const receiptId = crypto.randomUUID();
					const existingReceipt = await database.prepare(`SELECT listing_id FROM market_listing_receipts WHERE seller_id = ? AND request_id = ? LIMIT 1`).bind(playerId, requestId).first();
					if (existingReceipt) {
						const existing = await database.prepare("SELECT id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments, amount, price_gems, created_at FROM market_listings WHERE id = ? LIMIT 1").bind(existingReceipt.listing_id).first();
						return Response.json({
							ok: true,
							listingId: existingReceipt.listing_id,
							listing: existing ?? null,
							alreadyProcessed: true,
							message: existing ? "Ürün zaten pazar tezgâhında." : "Bu ilan oluşturma isteği daha önce işlendi."
						});
					}
					let creationResults;
					if (payload.listingKind === "crafted_stone" || payload.listingKind === "dungeon_material" || payload.listingKind === "crystal_chest" || payload.listingKind === "stone_book" || payload.listingKind === "evolution_scroll") {
						const isMaterial = payload.listingKind === "dungeon_material", isChest = payload.listingKind === "crystal_chest";
						const isBook = payload.listingKind === "stone_book" || payload.listingKind === "evolution_scroll";
						const resourceTable = isMaterial ? "dungeon_materials" : "player_stones";
						const listingKind = isBook ? payload.listingKind : isMaterial ? "dungeon_material" : isChest ? "crystal_chest" : "crafted_stone";
						const stone = isBook ? {
							key: payload.listingKind === "stone_book" ? "book" : "evolution_scroll",
							label: payload.listingKind === "stone_book" ? "Taş Sanatı Kitabı" : "Evrim Parşomeni",
							value: 0,
							kind: payload.listingKind
						} : isChest ? {
							key: "crystal_chest",
							label: "Kristal Sandığı",
							value: 0,
							kind: "crystal_chest"
						} : isMaterial ? parseDungeonMaterial(payload.materialKind) : parseStone(payload.stoneKind), amount = Number(payload.amount);
						if (!stone || !Number.isSafeInteger(amount) || amount < 1 || amount > 9999 || !Number.isSafeInteger(Number(payload.price)) || Number(payload.price) < 1 || Number(payload.price) > 99999) return Response.json({ error: "Geçerli ürün, miktar (1–9999) ve toplam fiyat (1–99999) seç." }, { status: 400 });
						creationResults = await database.batch([
							database.prepare(`INSERT OR IGNORE INTO market_listing_receipts
            (id,seller_id,request_id,listing_id,shop_id,kind,item_id,item_name,rarity,power,role,enchantments,amount,price_gems,created_at_ms)
            SELECT ?,seller.id,?,?,shop.id,'${listingKind}',?,?,'${isChest ? "blue" : "orange"}',?,?,'[]',?,?,?
            FROM players seller JOIN market_shops shop ON shop.owner_id=seller.id
            WHERE seller.id=? AND seller.area='bazaar' AND seller.channel=shop.channel AND seller.hp>0 AND shop.active=1 AND shop.created_at>CAST(strftime('%s','now') AS INTEGER)-172800
            AND COALESCE((SELECT amount FROM ${resourceTable} WHERE player_id=seller.id AND kind=?),0)>=?
            AND (SELECT COUNT(*) FROM market_listings WHERE seller_id=seller.id)<24 RETURNING id`).bind(receiptId, requestId, listingId, stone.key, isMaterial || isChest || isBook ? stone.label : `${stone.label} ${stoneEffect(stone)}`, stone.value, stone.kind, amount, price, now, playerId, stone.key, amount),
							database.prepare(`INSERT INTO market_listings
            (id,shop_id,seller_id,kind,item_id,item_name,rarity,power,role,enchantments,amount,price_gems,request_id,created_at)
            SELECT listing_id,shop_id,seller_id,kind,item_id,item_name,rarity,power,role,enchantments,amount,price_gems,request_id,created_at_ms
            FROM market_listing_receipts WHERE id=? AND changes()>0 RETURNING id`).bind(receiptId),
							database.prepare(`UPDATE ${resourceTable} SET amount=amount-? WHERE player_id=? AND kind=? AND amount>=? AND changes()>0`).bind(amount, playerId, stone.key, amount)
						]);
					} else if (payload.listingKind === "essence") {
						const amount = clamp$1(Math.floor(Number(payload.amount) || 0), 1, 9999);
						creationResults = await database.batch([
							database.prepare(`INSERT OR IGNORE INTO market_listing_receipts
             (id, seller_id, request_id, listing_id, shop_id, kind, item_id, item_name, rarity, power,
              role, enchantments, amount, price_gems, created_at_ms)
             SELECT ?, seller.id, ?, ?, shop.id, 'essence', NULL, 'Yaşam Özü', 'white', 0, NULL, '[]', ?, ?, ?
             FROM players seller JOIN market_shops shop ON shop.owner_id = seller.id
             WHERE seller.id = ? AND seller.area = 'bazaar' AND seller.channel = shop.channel
               AND seller.hp > 0 AND seller.essence >= ? AND shop.active = 1 AND shop.created_at>CAST(strftime('%s','now') AS INTEGER)-172800
               AND (SELECT COUNT(*) FROM market_listings WHERE seller_id = seller.id) < 24
             RETURNING id`).bind(receiptId, requestId, listingId, amount, price, now, playerId, amount),
							database.prepare(`INSERT INTO market_listings
             (id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments,
              amount, price_gems, request_id, created_at)
             SELECT listing_id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role,
               enchantments, amount, price_gems, request_id, created_at_ms
             FROM market_listing_receipts WHERE id = ? AND changes() > 0 RETURNING id`).bind(receiptId),
							database.prepare("UPDATE players SET essence = essence - ? WHERE id = ? AND essence >= ? AND changes() > 0").bind(amount, playerId, amount)
						]);
					} else if (payload.listingKind === "stone_dust") {
						const amount = clamp$1(Math.floor(Number(payload.amount) || 0), 1, 9999);
						creationResults = await database.batch([
							database.prepare(`INSERT OR IGNORE INTO market_listing_receipts
             (id, seller_id, request_id, listing_id, shop_id, kind, item_id, item_name, rarity, power,
              role, enchantments, amount, price_gems, created_at_ms)
             SELECT ?, seller.id, ?, ?, shop.id, 'stone_dust', NULL, 'Taş Tozu', 'orange', 0, NULL, '[]', ?, ?, ?
             FROM players seller JOIN market_shops shop ON shop.owner_id = seller.id
             WHERE seller.id = ? AND seller.area = 'bazaar' AND seller.channel = shop.channel
               AND seller.hp > 0 AND seller.stone_dust >= ? AND shop.active = 1 AND shop.created_at>CAST(strftime('%s','now') AS INTEGER)-172800
               AND (SELECT COUNT(*) FROM market_listings WHERE seller_id = seller.id) < 24
             RETURNING id`).bind(receiptId, requestId, listingId, amount, price, now, playerId, amount),
							database.prepare(`INSERT INTO market_listings
             (id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments,
              amount, price_gems, request_id, created_at)
             SELECT listing_id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role,
               enchantments, amount, price_gems, request_id, created_at_ms
             FROM market_listing_receipts WHERE id = ? AND changes() > 0 RETURNING id`).bind(receiptId),
							database.prepare("UPDATE players SET stone_dust = stone_dust - ? WHERE id = ? AND stone_dust >= ? AND changes() > 0").bind(amount, playerId, amount)
						]);
					} else if (payload.listingKind === "talisman_stone") {
						const amount = Number(payload.amount);
						if (!Number.isSafeInteger(amount) || amount < 1 || amount > 9999 || !Number.isSafeInteger(Number(payload.price)) || Number(payload.price) < 1 || Number(payload.price) > 99999) return Response.json({ error: "Tılsım Taşı miktarı 1–9999, toplam fiyat 1–99999 arasında tam sayı olmalı." }, { status: 400 });
						creationResults = await database.batch([
							database.prepare(`INSERT OR IGNORE INTO market_listing_receipts
             (id, seller_id, request_id, listing_id, shop_id, kind, item_id, item_name, rarity, power,
              role, enchantments, amount, price_gems, created_at_ms)
             SELECT ?, seller.id, ?, ?, shop.id, 'talisman_stone', NULL, 'Tılsım Taşı', 'unique', 0, NULL, '[]', ?, ?, ?
             FROM players seller JOIN market_shops shop ON shop.owner_id = seller.id
             WHERE seller.id = ? AND seller.area = 'bazaar' AND seller.channel = shop.channel
               AND seller.hp > 0 AND seller.talisman_stones >= ? AND shop.active = 1 AND shop.created_at>CAST(strftime('%s','now') AS INTEGER)-172800
               AND (SELECT COUNT(*) FROM market_listings WHERE seller_id = seller.id) < 24
             RETURNING id`).bind(receiptId, requestId, listingId, amount, price, now, playerId, amount),
							database.prepare(`INSERT INTO market_listings
             (id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments,
              amount, price_gems, request_id, created_at)
             SELECT listing_id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role,
               enchantments, amount, price_gems, request_id, created_at_ms
             FROM market_listing_receipts WHERE id = ? AND changes() > 0 RETURNING id`).bind(receiptId),
							database.prepare("UPDATE players SET talisman_stones = talisman_stones - ? WHERE id = ? AND talisman_stones >= ? AND changes() > 0").bind(amount, playerId, amount)
						]);
					} else if (payload.listingKind === "pearl") {
						const amount = Number(payload.amount);
						if (!Number.isSafeInteger(amount) || amount < 1 || amount > 9999 || !Number.isSafeInteger(Number(payload.price)) || Number(payload.price) < 1 || Number(payload.price) > 99999) return Response.json({ error: "İnci miktarı 1–9999, toplam fiyat 1–99999 arasında tam sayı olmalı." }, { status: 400 });
						creationResults = await database.batch([
							database.prepare(`INSERT OR IGNORE INTO market_listing_receipts
             (id, seller_id, request_id, listing_id, shop_id, kind, item_id, item_name, rarity, power,
              role, enchantments, amount, price_gems, created_at_ms)
             SELECT ?, seller.id, ?, ?, shop.id, 'pearl', NULL, 'İnci', 'unique', 0, NULL, '[]', ?, ?, ?
             FROM players seller JOIN market_shops shop ON shop.owner_id = seller.id
             WHERE seller.id = ? AND seller.area = 'bazaar' AND seller.channel = shop.channel
               AND seller.hp > 0 AND seller.pearls >= ? AND shop.active = 1 AND shop.created_at>CAST(strftime('%s','now') AS INTEGER)-172800
               AND (SELECT COUNT(*) FROM market_listings WHERE seller_id = seller.id) < 24
             RETURNING id`).bind(receiptId, requestId, listingId, amount, price, now, playerId, amount),
							database.prepare(`INSERT INTO market_listings
             (id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments,
              amount, price_gems, request_id, created_at)
             SELECT listing_id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role,
               enchantments, amount, price_gems, request_id, created_at_ms
             FROM market_listing_receipts WHERE id = ? AND changes() > 0 RETURNING id`).bind(receiptId),
							database.prepare("UPDATE players SET pearls = pearls - ? WHERE id = ? AND pearls >= ? AND changes() > 0").bind(amount, playerId, amount)
						]);
					} else if (payload.listingKind === "red_pearl") {
						const amount = Number(payload.amount);
						if (!Number.isSafeInteger(amount) || amount < 1 || amount > 9999 || !Number.isSafeInteger(Number(payload.price)) || Number(payload.price) < 1 || Number(payload.price) > 99999) return Response.json({ error: "Kırmızı İnci miktarı 1–9999, toplam fiyat 1–99999 arasında tam sayı olmalı." }, { status: 400 });
						creationResults = await database.batch([
							database.prepare(`INSERT OR IGNORE INTO market_listing_receipts
             (id, seller_id, request_id, listing_id, shop_id, kind, item_id, item_name, rarity, power,
              role, enchantments, amount, price_gems, created_at_ms)
             SELECT ?, seller.id, ?, ?, shop.id, 'red_pearl', NULL, 'Kırmızı İnci', 'unique', 0, NULL, '[]', ?, ?, ?
             FROM players seller JOIN market_shops shop ON shop.owner_id = seller.id
             WHERE seller.id = ? AND seller.area = 'bazaar' AND seller.channel = shop.channel
               AND seller.hp > 0 AND seller.red_pearls >= ? AND shop.active = 1 AND shop.created_at>CAST(strftime('%s','now') AS INTEGER)-172800
               AND (SELECT COUNT(*) FROM market_listings WHERE seller_id = seller.id) < 24
             RETURNING id`).bind(receiptId, requestId, listingId, amount, price, now, playerId, amount),
							database.prepare(`INSERT INTO market_listings
             (id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments,
              amount, price_gems, request_id, created_at)
             SELECT listing_id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role,
               enchantments, amount, price_gems, request_id, created_at_ms
             FROM market_listing_receipts WHERE id = ? AND changes() > 0 RETURNING id`).bind(receiptId),
							database.prepare("UPDATE players SET red_pearls = red_pearls - ? WHERE id = ? AND red_pearls >= ? AND changes() > 0").bind(amount, playerId, amount)
						]);
					} else {
						const itemId = typeof payload.itemId === "string" ? payload.itemId : "";
						creationResults = await database.batch([
							database.prepare(`INSERT OR IGNORE INTO market_listing_receipts
             (id, seller_id, request_id, listing_id, shop_id, kind, item_id, item_name, rarity, power,
              role, enchantments, amount, price_gems, created_at_ms)
             SELECT ?, seller.id, ?, ?, shop.id, item.kind, item.id, item.item_name, item.rarity,
               item.power, item.role, item.enchantments, 1, ?, ?
             FROM players seller JOIN market_shops shop ON shop.owner_id = seller.id
             JOIN player_items item ON item.player_id = seller.id
             WHERE seller.id = ? AND item.id = ? AND item.equipped = 0 AND item.sale_locked499 = 0 AND item.kind NOT IN ('cp_coupon_100','cp_coupon_200','cp_coupon_500') AND seller.area = 'bazaar'
               AND seller.channel = shop.channel AND seller.hp > 0 AND shop.active = 1 AND shop.created_at>CAST(strftime('%s','now') AS INTEGER)-172800
               AND (SELECT COUNT(*) FROM market_listings WHERE seller_id = seller.id) < 24
             RETURNING id`).bind(receiptId, requestId, listingId, price, now, playerId, itemId),
							database.prepare(`INSERT INTO market_listings
             (id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments,
              amount, price_gems, request_id, created_at)
             SELECT listing_id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role,
               enchantments, amount, price_gems, request_id, created_at_ms
             FROM market_listing_receipts WHERE id = ? AND changes() > 0 RETURNING id`).bind(receiptId),
							database.prepare("DELETE FROM player_items WHERE id = ? AND player_id = ? AND equipped = 0 AND changes() > 0").bind(itemId, playerId)
						]);
					}
					const listing = await database.prepare("SELECT id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments, amount, price_gems, created_at FROM market_listings WHERE id = ?").bind(listingId).first();
					if (!creationResults[1].results[0] || !listing) {
						const replayReceipt = await database.prepare("SELECT listing_id FROM market_listing_receipts WHERE seller_id = ? AND request_id = ? LIMIT 1").bind(playerId, requestId).first();
						if (replayReceipt) {
							const replayed = await database.prepare("SELECT id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments, amount, price_gems, created_at FROM market_listings WHERE id = ? LIMIT 1").bind(replayReceipt.listing_id).first();
							return Response.json({
								ok: true,
								listingId: replayReceipt.listing_id,
								listing: replayed ?? null,
								alreadyProcessed: true,
								message: replayed ? "Ürün zaten pazar tezgâhında." : "Bu ilan oluşturma isteği daha önce işlendi."
							});
						}
						return Response.json({ error: "İlan oluşturulamadı; kaynak, eşya, tezgâh veya 24 ilan sınırını kontrol et." }, { status: 409 });
					}
					return Response.json({
						ok: true,
						listingId,
						listing,
						message: "Ürün pazar tezgâhına eklendi."
					});
				}
				if (payload.action === "cancel_listing") {
					const listingId = safeId(payload.listingId);
					const settlementId = safeId(payload.requestId) || crypto.randomUUID();
					if (!listingId) return Response.json({ error: "Pazar ilanı geçersiz." }, { status: 400 });
					const results = await database.batch([
						database.prepare(`INSERT OR IGNORE INTO market_settlements
           (id, listing_id, settlement_type, buyer_id, seller_id, kind, item_id, item_name, rarity, power, role,
            enchantments, amount, price_gems, created_at_ms, applied_at_ms)
           SELECT ?, id, 'cancel', '', seller_id, kind, item_id, item_name, rarity, power, role,
             enchantments, amount, price_gems, ?, 0 FROM market_listings
           WHERE id = ? AND seller_id = ? RETURNING id`).bind(settlementId, Date.now(), listingId, playerId),
						database.prepare("UPDATE market_settlements SET applied_at_ms = -1 WHERE id = ? AND applied_at_ms = 0 AND changes() > 0").bind(settlementId),
						database.prepare(`UPDATE players SET
             essence = essence + COALESCE((SELECT CASE WHEN kind = 'essence' THEN amount ELSE 0 END FROM market_settlements WHERE id = ? AND applied_at_ms = -1), 0),
             stone_dust = stone_dust + COALESCE((SELECT CASE WHEN kind = 'stone_dust' THEN amount ELSE 0 END FROM market_settlements WHERE id = ? AND applied_at_ms = -1), 0),
             pearls = pearls + COALESCE((SELECT CASE WHEN kind = 'pearl' THEN amount ELSE 0 END FROM market_settlements WHERE id = ? AND applied_at_ms = -1), 0),
             red_pearls = red_pearls + COALESCE((SELECT CASE WHEN kind = 'red_pearl' THEN amount ELSE 0 END FROM market_settlements WHERE id = ? AND applied_at_ms = -1), 0),
             talisman_stones = talisman_stones + COALESCE((SELECT CASE WHEN kind = 'talisman_stone' THEN amount ELSE 0 END FROM market_settlements WHERE id = ? AND applied_at_ms = -1), 0)
           WHERE id = ? AND EXISTS (SELECT 1 FROM market_settlements WHERE id = ? AND applied_at_ms = -1)`).bind(settlementId, settlementId, settlementId, settlementId, settlementId, playerId, settlementId),
						database.prepare(`INSERT OR IGNORE INTO player_items (id, player_id, kind, item_name, rarity, power, role, enchantments, equipped, created_at)
           SELECT item_id, ?, kind, item_name, rarity, power, COALESCE(role, 'muhafiz'), enchantments, 0, ?
           FROM market_settlements WHERE id = ? AND applied_at_ms = -1 AND kind NOT IN ('talisman_stone','essence','stone_dust','pearl','red_pearl','crafted_stone','dungeon_material','crystal_chest','stone_book','evolution_scroll')`).bind(playerId, now, settlementId),
						database.prepare(`INSERT INTO player_stones(player_id,kind,amount)
          SELECT ?,item_id,amount FROM market_settlements WHERE id=? AND applied_at_ms=-1 AND kind IN ('crafted_stone','crystal_chest','stone_book','evolution_scroll')
          ON CONFLICT(player_id,kind) DO UPDATE SET amount=player_stones.amount+excluded.amount`).bind(playerId, settlementId),
						database.prepare(`INSERT INTO dungeon_materials(player_id,kind,amount)
          SELECT ?,item_id,amount FROM market_settlements WHERE id=? AND applied_at_ms=-1 AND kind='dungeon_material'
          ON CONFLICT(player_id,kind) DO UPDATE SET amount=dungeon_materials.amount+excluded.amount`).bind(playerId, settlementId),
						database.prepare(`UPDATE market_shops SET active = 0 WHERE id = (SELECT shop_id FROM market_listings WHERE id = ?)
           AND EXISTS (SELECT 1 FROM market_settlements WHERE id = ? AND applied_at_ms = -1)
           AND NOT EXISTS (SELECT 1 FROM market_listings other
             WHERE other.shop_id = market_shops.id AND other.id != ?)
           AND NOT EXISTS(SELECT 1 FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))`).bind(listingId, settlementId, listingId),
						database.prepare("DELETE FROM market_listings WHERE id = ? AND EXISTS (SELECT 1 FROM market_settlements WHERE id = ? AND applied_at_ms = -1)").bind(listingId, settlementId),
						database.prepare("UPDATE market_settlements SET applied_at_ms = ? WHERE id = ? AND applied_at_ms = -1").bind(Date.now(), settlementId)
					]);
					const settlement = await database.prepare("SELECT id, settlement_type, seller_id, applied_at_ms FROM market_settlements WHERE listing_id = ? LIMIT 1").bind(listingId).first();
					if (!settlement || settlement.settlement_type !== "cancel" || settlement.seller_id !== playerId || settlement.applied_at_ms <= 0) return Response.json({ error: "İlan satılmış veya başka bir işlemle kapatılmış." }, { status: 409 });
					const shopClosed = Boolean(results[6].meta.changes);
					return Response.json({
						ok: true,
						shopClosed,
						message: shopClosed ? "Son ürün geri alındı; boş tezgâh otomatik kapandı." : "İlan kaldırıldı, ürün çantana döndü."
					});
				}
				if (payload.action === "buy_listing") {
 const glass499=payload.tradeGlass499===true?1:0;let glassPrice499=null;try{glassPrice499=tradeGlassExpectedPrice499(payload);}catch(error){return Response.json({error:error.message,code:error.code},{status:400});}
					const listingId = safeId(payload.listingId);
					const settlementId = safeId(payload.requestId) || crypto.randomUUID();
					if (!listingId) return Response.json({ error: "Pazar ilanı geçersiz." }, { status: 400 });
					await database.batch([
						database.prepare(`INSERT OR IGNORE INTO market_settlements
           (id, listing_id, settlement_type, buyer_id, seller_id, kind, item_id, item_name, rarity, power, role,
            enchantments, amount, price_gems, created_at_ms, applied_at_ms)
           SELECT ?, listing.id, 'sale', buyer.id, listing.seller_id, listing.kind, listing.item_id,
             listing.item_name, listing.rarity, listing.power, listing.role, listing.enchantments,
             listing.amount, listing.price_gems, ?, 0
           FROM market_listings listing
           JOIN market_shops shop ON shop.id = listing.shop_id
           JOIN players buyer ON buyer.id = ?
           WHERE listing.id = ? AND listing.seller_id != buyer.id AND buyer.hp > 0
             AND buyer.area = 'bazaar' AND shop.active = 1 AND shop.created_at>CAST(strftime('%s','now') AS INTEGER)-172800 AND shop.channel = buyer.channel
             AND ((?=0 AND ((buyer.x - shop.x) * (buyer.x - shop.x) + (buyer.y - shop.y) * (buyer.y - shop.y)) <= 129600) OR (?=1 AND buyer.trade_glass_until_ms>CAST(ROUND((julianday('now')-2440587.5)*86400000) AS INTEGER) AND buyer.combat_lock_until_ms<=CAST(ROUND((julianday('now')-2440587.5)*86400000) AS INTEGER) AND COALESCE(buyer.arena_match_id,'')=''))
             AND (?=0 OR (listing.price_gems=? AND shop.owner_id=listing.seller_id AND EXISTS(SELECT 1 FROM players glass_seller499 WHERE glass_seller499.id=listing.seller_id) AND (listing.kind IN ('talisman_stone','essence','stone_dust','pearl','red_pearl','crafted_stone','dungeon_material','crystal_chest','stone_book','evolution_scroll') OR (NOT EXISTS(SELECT 1 FROM player_items collision499 WHERE collision499.id=listing.item_id) AND NOT EXISTS(SELECT 1 FROM player_storage_items collision499 WHERE collision499.id=listing.item_id)))))
             AND EXISTS(SELECT 1 FROM players seller505 WHERE seller505.id=listing.seller_id AND typeof(seller505.gems)='integer' AND seller505.gems>=0 AND seller505.gems<=9000000000000-listing.price_gems)
             AND (listing.kind IN ('talisman_stone','essence','stone_dust','pearl','red_pearl','crafted_stone','dungeon_material','crystal_chest','stone_book','evolution_scroll') OR
               (NOT EXISTS(SELECT 1 FROM player_items collision506 WHERE collision506.id=listing.item_id)
                AND NOT EXISTS(SELECT 1 FROM player_storage_items collision506 WHERE collision506.id=listing.item_id)))
             AND buyer.gems >= listing.price_gems
           RETURNING id`).bind(settlementId, Date.now(), playerId, listingId,glass499,glass499,glass499,glassPrice499),
						database.prepare(`UPDATE players SET gems = gems - (SELECT price_gems FROM market_settlements WHERE id = ?), last_seen = ?
           WHERE id = ? AND gems >= (SELECT price_gems FROM market_settlements WHERE id = ?)
             AND EXISTS (SELECT 1 FROM market_settlements WHERE id = ? AND applied_at_ms = 0) AND changes() > 0`).bind(settlementId, now, playerId, settlementId, settlementId),
						database.prepare("UPDATE market_settlements SET applied_at_ms = -1 WHERE id = ? AND applied_at_ms = 0 AND changes() > 0").bind(settlementId),
						database.prepare(`UPDATE players SET gems = gems + (SELECT price_gems FROM market_settlements WHERE id = ? AND applied_at_ms = -1)
           WHERE id = (SELECT seller_id FROM market_settlements WHERE id = ? AND applied_at_ms = -1)`).bind(settlementId, settlementId),
						database.prepare(`UPDATE players SET
             essence = essence + COALESCE((SELECT CASE WHEN kind = 'essence' THEN amount ELSE 0 END FROM market_settlements WHERE id = ? AND applied_at_ms = -1), 0),
             stone_dust = stone_dust + COALESCE((SELECT CASE WHEN kind = 'stone_dust' THEN amount ELSE 0 END FROM market_settlements WHERE id = ? AND applied_at_ms = -1), 0),
             pearls = pearls + COALESCE((SELECT CASE WHEN kind = 'pearl' THEN amount ELSE 0 END FROM market_settlements WHERE id = ? AND applied_at_ms = -1), 0),
             red_pearls = red_pearls + COALESCE((SELECT CASE WHEN kind = 'red_pearl' THEN amount ELSE 0 END FROM market_settlements WHERE id = ? AND applied_at_ms = -1), 0),
             talisman_stones = talisman_stones + COALESCE((SELECT CASE WHEN kind = 'talisman_stone' THEN amount ELSE 0 END FROM market_settlements WHERE id = ? AND applied_at_ms = -1), 0)
           WHERE id = ? AND EXISTS (SELECT 1 FROM market_settlements WHERE id = ? AND applied_at_ms = -1)`).bind(settlementId, settlementId, settlementId, settlementId, settlementId, playerId, settlementId),
						database.prepare(`INSERT INTO player_items (id, player_id, kind, item_name, rarity, power, role, enchantments, equipped, created_at)
           SELECT COALESCE(item_id, ?), ?, kind, item_name, rarity, power, COALESCE(role, 'muhafiz'), enchantments, 0, ?
           FROM market_settlements WHERE id = ? AND applied_at_ms = -1 AND kind NOT IN ('talisman_stone','essence','stone_dust','pearl','red_pearl','crafted_stone','dungeon_material','crystal_chest','stone_book','evolution_scroll')`).bind(crypto.randomUUID(), playerId, now, settlementId),
						database.prepare(`INSERT INTO player_stones(player_id,kind,amount)
          SELECT ?,item_id,amount FROM market_settlements WHERE id=? AND applied_at_ms=-1 AND kind IN ('crafted_stone','crystal_chest','stone_book','evolution_scroll')
          ON CONFLICT(player_id,kind) DO UPDATE SET amount=player_stones.amount+excluded.amount`).bind(playerId, settlementId),
						database.prepare(`INSERT INTO dungeon_materials(player_id,kind,amount)
          SELECT ?,item_id,amount FROM market_settlements WHERE id=? AND applied_at_ms=-1 AND kind='dungeon_material'
          ON CONFLICT(player_id,kind) DO UPDATE SET amount=dungeon_materials.amount+excluded.amount`).bind(playerId, settlementId),
						database.prepare(`UPDATE market_shops SET active = 0 WHERE id = (SELECT shop_id FROM market_listings WHERE id = ?)
           AND EXISTS (SELECT 1 FROM market_settlements WHERE id = ? AND applied_at_ms = -1)
           AND NOT EXISTS (SELECT 1 FROM market_listings other
             WHERE other.shop_id = market_shops.id AND other.id != ?)
           AND NOT EXISTS(SELECT 1 FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))`).bind(listingId, settlementId, listingId),
						database.prepare("DELETE FROM market_listings WHERE id = ? AND EXISTS (SELECT 1 FROM market_settlements WHERE id = ? AND applied_at_ms = -1)").bind(listingId, settlementId),
						database.prepare("UPDATE market_settlements SET applied_at_ms = ? WHERE id = ? AND applied_at_ms = -1").bind(Date.now(), settlementId)
					]);
					const settlement = await database.prepare("SELECT id, settlement_type, buyer_id, item_name, applied_at_ms FROM market_settlements WHERE listing_id = ? LIMIT 1").bind(listingId).first();
					if (!settlement || settlement.settlement_type !== "sale" || settlement.buyer_id !== playerId || settlement.applied_at_ms <= 0) {
						const distanceCheck = await database.prepare(`SELECT ((buyer.x-shop.x)*(buyer.x-shop.x)+(buyer.y-shop.y)*(buyer.y-shop.y)) AS distance_squared FROM market_listings listing JOIN market_shops shop ON shop.id=listing.shop_id JOIN players buyer ON buyer.id=? WHERE listing.id=? AND shop.active=1 AND shop.created_at>CAST(strftime('%s','now') AS INTEGER)-172800 AND buyer.area='bazaar' AND shop.channel=buyer.channel`).bind(playerId, listingId).first();
						if (!glass499 && distanceCheck && distanceCheck.distance_squared > 129600) return Response.json({
							error: "Bu eşyayı almak için tezgâha biraz daha yaklaş.",
							code: "market_too_far"
						}, { status: 409 });
						return Response.json({ error: "Ürün artık satışta değil veya bakiyen yetersiz." }, { status: 409 });
					}
					return Response.json({
						ok: true,
						settlementId: settlement.id,
						message: `${settlement.item_name} satın alındı.`
					});
				}
				if (payload.action === "hurt") {
					const settled = await settlePveEngagement(database, playerId, settings, Date.now(), true);
					if (settled) return Response.json({
						ok: true,
						hp: settled.hp,
						maxHp: settled.max_hp,
						hpRevision: settled.hp_revision,
						respawnAtMs: settled.respawn_at_ms,
						damage: settled.damage,
						blocked: settled.blocked,
						dead: settled.dead,
						pveHit: settled.pveHit,
						nextHitInMs: Math.max(0, settled.pveHit.nextHitAtMs - Date.now())
					});
					const current = await database.prepare(`SELECT hp, max_hp, hp_revision, respawn_at_ms,
        (SELECT MAX(e.next_hit_at_ms,COALESCE(m.stun_until_ms,0)) FROM pve_engagements e LEFT JOIN monsters m ON m.id=e.monster_id AND m.spawn_round=e.spawn_round WHERE e.player_id = players.id) AS next_hit_at_ms
        FROM players WHERE id = ?`).bind(playerId).first();
					return Response.json({
						ok: true,
						ignored: true,
						nextHitInMs: current?.next_hit_at_ms ? Math.max(0, current.next_hit_at_ms - Date.now()) : 800,
						hp: current?.hp ?? player.hp,
						maxHp: current?.max_hp ?? player.max_hp,
						hpRevision: current?.hp_revision ?? player.hp_revision,
						respawnAtMs: current?.respawn_at_ms ?? player.respawn_at_ms,
						damage: 0,
						blocked: 0,
						dead: (current?.hp ?? player.hp) <= 0
					});
				}
				if (payload.action === "respawn") {
					if (player.area === "arena" && player.arena_match_id) {
						const arenaRespawn = await database.prepare(`SELECT m.id, m.status, m.team_size, mp.team, mp.slot
           FROM arena_matches m JOIN arena_match_players mp ON mp.match_id = m.id
           WHERE m.id = ? AND mp.player_id = ? LIMIT 1`).bind(player.arena_match_id, playerId).first();
						if (!arenaRespawn || arenaRespawn.status !== "countdown" && arenaRespawn.status !== "active") return Response.json({ error: "Arena sonucu eşitleniyor." }, { status: 409 });
                        if(!arenaRespawn.id.startsWith("guild-")&&arenaRespawn.team_size>1)return Response.json({code:"arena_waiting_for_round498",error:"Takım raundu bitene kadar bekle. Tüm rakipler düşünce yeni raund başlayacak."},{status:409});
						const arenaPoint = arenaSpawn(arenaRespawn.team === 2 ? 2 : 1, arenaRespawn.slot, arenaRespawn.team_size);
						const arenaResult = await database.prepare(`UPDATE players SET hp = max_hp, hp_revision = hp_revision + 1, respawn_at_ms = 0,
            x = ?, y = ?, last_seen = ?, movement_checked_at_ms = ?, movement_debt_ms = 0,
            motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1, combat_lock_until_ms = 0
           WHERE id = ? AND area = 'arena' AND arena_match_id = ? AND hp <= 0
             AND respawn_at_ms > 0 AND respawn_at_ms <= ?
             AND NOT EXISTS(SELECT 1 FROM arena_matches blocked498 WHERE blocked498.id=players.arena_match_id AND blocked498.id NOT LIKE 'guild-%' AND blocked498.mode IN ('2v2','3v3','5v5') AND blocked498.status IN ('active','countdown'))
           RETURNING hp, max_hp, hp_revision, area, x, y`).bind(arenaPoint.x, arenaPoint.y, now, Date.now(), playerId, arenaRespawn.id, Date.now()).first();
						if (!arenaResult) return Response.json({ error: "Yeniden doğuş henüz hazır değil." }, { status: 409 });
						await database.prepare("DELETE FROM pve_engagements WHERE player_id = ?").bind(playerId).run();
						await publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
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
					const respawnArea = player.area==='rune_v2'?'bazaar':player.area==='event'&&globalThis.__colEventIsland444?.settings().config.enabled?'event':player.area==='rune'&&runeEligible(player)?'rune':player.area === "dragon" ? "dragon" : player.area === "ancient" ? "ancient" : player.area === "black" ? "black" : player.area === "war" ? "war" : player.area === "frozen" ? "frozen" : player.area === "sanctum" ? "sanctum" : "forest";
					const respawnPoint = respawnArea==='event'?EVENT_SPAWN444:respawnArea==='bazaar'?BAZAAR_SPAWN:respawnArea==='rune'?RUNE_SPAWN:respawnArea === "dragon" ? DRAGON_ENTRY : respawnArea === "ancient" ? ANCIENT_SPAWN : respawnArea === "black" ? BLACK_SPAWN : respawnArea === "war" ? WAR_ENTRY : respawnArea === "frozen" ? FROZEN_SPAWN : respawnArea === "sanctum" ? BOSS_SANCTUM_ENTRY : FOREST_SPAWN;
					const result = await database.prepare(`UPDATE players SET hp = max_hp, hp_revision = hp_revision + 1, respawn_at_ms = 0,
          area = ?, arena_match_id = '', x = ?, y = ?, last_seen = ?, movement_checked_at_ms = ?, movement_debt_ms = 0,
          motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1, realtime_scope_version = realtime_scope_version + 1,
          combat_lock_until_ms = 0
          WHERE id = ? AND hp <= 0 AND respawn_at_ms > 0 AND respawn_at_ms <= ?
          AND NOT EXISTS(SELECT 1 FROM arena_matches blocked498 WHERE blocked498.id=players.arena_match_id AND blocked498.id NOT LIKE 'guild-%' AND blocked498.mode IN ('2v2','3v3','5v5') AND blocked498.status IN ('active','countdown'))
         RETURNING hp, max_hp, hp_revision, area, x, y`).bind(respawnArea, respawnPoint.x, respawnPoint.y, now, Date.now(), playerId, Date.now()).first();
					if (!result) return Response.json({ error: "Yeniden doğuş henüz hazır değil." }, { status: 409 });
					await database.prepare("DELETE FROM pve_engagements WHERE player_id = ?").bind(playerId).run();
					await publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
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
				if (payload.action === "guardian_dash") {
					if (player.role !== "muhafiz" || player.level < settings.skill_three_unlock_level || !["forest","frozen","sanctum","dragon","sinsi","black","war","arena","ancient","afk","event","rune","rune_v2"].includes(player.area)) return Response.json({ error: "Bu hamle şu anda kullanılamaz." }, { status: 400 });
					if (player.area === "arena") {
						const match = await database.prepare("SELECT starts_at_ms,status FROM arena_matches WHERE id=?").bind(player.arena_match_id).first();
						if (!match || Date.now() < match.starts_at_ms || !["active", "countdown"].includes(match.status)) return Response.json({ error: "Arena geri sayımını bekle." }, { status: 409 });
					}
					const guardianCooldown444 = effectiveSkillCooldown444(settings.skill_three_cooldown_ms, Math.min(50,enchantmentTotal(equippedEnchantItems(player), "cast_speed")+(player.jewelry_cast_speed||0)));
const guardianEffect = await dashGuardian(database, player, {
						x: Number(payload.directionX),
						y: Number(payload.directionY)
					}, Date.now(), guardianCooldown444);
					if (!guardianEffect) return Response.json({ error: "Hamle henüz hazır değil veya sabitlendin." }, { status: 409 });
					await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, guardianEffect, player.arena_match_id || void 0));
					return Response.json({
						ok: true,
						guardianEffect,
						cooldownRemainingMs: guardianCooldown444
					});
				}
				if(payload.action==='cast_support456')return colSupportCast456(database,player,settings,payload,requestReceivedAtMs);
 // V473 internal plan committer. The route supplies server-generated plans.
// All arguments below are server-created plans after primary-target validation.
// This helper does not accept a client damage value or execute another attack.
const wallNowSql473="CAST(unixepoch('subsec')*1000 AS INTEGER)";
const failure=code=>Object.assign(new Error(code),{code});
async function commitMixedBlack473(database,{player,center,playerPlans,monsterPlans,cooldownAtMs,cooldownMs,nowMs,respawnSeconds}){
 colLabAssertPlans(player,playerPlans.map(p=>p.target),monsterPlans.map(p=>p.target));
 if(!['black','rune_v2'].includes(player.area)||player.arena_match_id||!['avci','arkanist'].includes(player.role)||!playerPlans.length||!monsterPlans.length)throw failure('mixed_cast_internal_scope');
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
   ${hasLethalGems479 ? "gems=CASE WHEN players.loadlab_run_id='' AND players.hp<=CAST(json_extract(hit.value,'$.damage') AS INTEGER) THEN (SELECT before_gems FROM before_gems479 WHERE id=players.id)-CAST((SELECT before_gems FROM before_gems479 WHERE id=players.id)/20 AS INTEGER) ELSE players.gems END," : ""}
   respawn_at_ms=CASE WHEN players.hp-CAST(json_extract(hit.value,'$.damage') AS INTEGER)<=0 THEN ? ELSE 0 END,
   last_monster_hit_at=?,combat_lock_until_ms=MAX(players.combat_lock_until_ms,?) FROM json_each(?) hit
  WHERE players.id=json_extract(hit.value,'$.id') AND players.hp_revision=json_extract(hit.value,'$.revision') AND players.realtime_scope_version=json_extract(hit.value,'$.scope')
   AND EXISTS(SELECT 1 WHERE players.area=? AND players.channel=? AND players.arena_match_id='')
  RETURNING id,hp,hp_revision,respawn_at_ms,gems${hasLethalGems479 ? ",CASE WHEN loadlab_run_id='' THEN (SELECT before_gems FROM before_gems479 WHERE id=players.id)-gems ELSE NULL END AS pvp_gems_lost479" : ""}`).bind(...(hasLethalGems479?[players]:[]),nowMs+respawnSeconds*1000,nowMs,nowMs+5000,players,player.area,player.channel);
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
 const committed=await database.combatHit(guard,plans,{durableCast473:true});
 if(!committed.guard.results.length)return{accepted:false,guard:committed.guard,playerRows:[],monsterResults:new Map(),plans};
 const playerRows=committed.results[0].results,finalPlayerRows=committed.results.at(-1).results,monsterResults=new Map();let offset=0;
 for(let i=0;i<plans.length;i++){
  const p=plans[i],rows=committed.results.slice(offset+(i===0?3:0),offset+p.hitStatements.length);
  monsterResults.set(p.target.id,rows);offset+=p.hitStatements.length;
 }
 return{accepted:true,guard:committed.guard,playerRows,finalPlayerRows,monsterResults,plans:monsterPlans};
}

async function selectMixedMonsters473(player,center473,primaryMonster473,payload,nowMs){
 const all473=(await database.prepare('SELECT id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,despawn_at,spawn_round,area,channel,is_stone,wave_stage,summoned,parent_stone_id,root_until_ms,control_x,control_y FROM monsters WHERE hp>0 AND area=? AND (channel=0 OR channel=?)').bind(player.area,player.channel).all()).results;
 const hints473=readAreaSkillHints(payload.areaTargets),provoked473=new Set();
 if(hints473.size){const recent473=await database.prepare('SELECT target_id FROM combat_events WHERE created_at>=? AND player_id=?').bind(nowMs-8000,player.id).all();for(const row of recent473.results)if(hints473.has(row.target_id))provoked473.add(row.target_id);}
 return all473.filter(target=>monsterIsInPlayerWorld(target,player)&&distance(center473,areaSkillPoint(target,player,hints473.get(target.id),nowMs,target.id===primaryMonster473?.id,provoked473.has(target.id)))<=300).sort((a,b)=>Number(b.id===primaryMonster473?.id)-Number(a.id===primaryMonster473?.id)||a.id.localeCompare(b.id));
 }

async function prepareMixedPlayers473(player,settings,center472,nowMs,pvpRolls){
  const playerId=player.id,arenaMatchId='',target={id:'',...center472},ability=2,branch456=null;
  const attackerGear=equippedEnchantItems(player);
  let enchantmentTotals473_attackerGear;
  const rows473 = (await database.prepare(`SELECT stat_attack,stat_defense,stat_hp,stat_revision,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms, essence, contribution, xp, level, gems, potions, ${setSelectSql()},
          specialization,skill_four,attack_four_at,special_guard_until_ms,jewelry_attack,jewelry_defense,jewelry_cast_speed,jewelry_pvp,jewelry_resist,jewelry_earring_enchantments,jewelry_bracelet_enchantments,halloween_candy_until,skill_one, skill_two, skill_three, has_rod, rod_equipped, fish_sokan, fish_levrek, fish_zargana, pearls, stone_dust,
          xp_ring_until, drop_charm_until, (SELECT equipped FROM player_items WHERE player_id=players.id AND kind='costume' LIMIT 1) AS costume_equipped, has_wings, wings_equipped, (SELECT equipped FROM dungeon_wings WHERE player_id=players.id) AS core_wings, area, channel, arena_match_id, last_seen,
          combat_lock_until_ms, realtime_scope_version, weapon_skin_enabled,
          COALESCE((SELECT SUM(power) FROM player_items WHERE player_id = players.id AND kind IN ('armor','helmet','shoes','necklace','costume') AND equipped = 1), 0) AS equipped_armor_power,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), '[]') AS equipped_weapon_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'armor' AND equipped = 1 LIMIT 1), '[]') AS equipped_armor_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'helmet' AND equipped = 1 LIMIT 1), '[]') AS equipped_helmet_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'shoes' AND equipped = 1 LIMIT 1), '[]') AS equipped_shoes_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'necklace' AND equipped = 1 LIMIT 1), '[]') AS equipped_necklace_enchantments, EXISTS(SELECT 1 FROM player_pets WHERE player_id=players.id AND kind='dragon' AND acquired_at+604800>unixepoch() AND equipped=1) AS defender_dragon

    FROM players WHERE id != ? AND NOT EXISTS(SELECT 1 FROM party_members party_actor497 JOIN party_members party_peer497 ON party_peer497.party_id=party_actor497.party_id WHERE party_actor497.player_id=?1 AND party_peer497.player_id=players.id) AND hp > 0 AND last_seen >= ? AND loadlab_run_id=(SELECT actor.loadlab_run_id FROM players actor WHERE actor.id=?1) AND (loadlab_run_id='' OR (loadlab_team>0 AND loadlab_team!=(SELECT actor.loadlab_team FROM players actor WHERE actor.id=?1)))
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
                                const strongPlayers = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("strong_players") + (player.jewelry_pvp || 0) + (player.pet_kind === "dragon" ? 10 : 0) + (castRanks472.get(player.id)?.pvp ?? 0) + (player.set_pvp ?? 0);
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

async function runMixedBlack473(context473){
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
                        const respawn = target.area === 'event' ? 0 : now + (target.area === 'rune_v2' ? globalThis.__colRuneV2.monster(target).respawnSeconds : target.area === 'rune' ? globalThis.__colRunes.monster(target).respawnSeconds : target.id === "dragon-world-1" ? dragonService()?.settings().config.interval ?? 10800 : isBlackStoneBoss476(target.id) ? settings.black_stone_boss_respawn_seconds : isFrozenBossId(target.id) ? settings.frozen_boss_respawn_seconds : target.id === "ancient-boss-1" ? settings.ancient_boss_respawn_seconds : isFrozenWaterId(target.id) ? settings.frozen_water_respawn_seconds : target.is_boss ? settings.boss_respawn_seconds : target.is_stone ? settings.sinsi_stone_respawn_seconds : target.summoned ? 2 : target.area === "ancient" ? settings.ancient_monster_respawn_seconds : target.area === "forest" ? colLabNormalRespawnSecondsR10(target, settings.forest_monster_respawn_seconds) : target.area === "frozen" ? settings.frozen_monster_respawn_seconds : target.area === "black" ? settings.black_monster_respawn_seconds : target.area === "afk" ? settings.afk_island_respawn_seconds : 18);
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
  const retaliation473=await settlePveEngagement(database,playerId,settings,nowMs);
  if(retaliation473){player.hp=retaliation473.hp;player.hp_revision=retaliation473.hp_revision;player.respawn_at_ms=retaliation473.respawn_at_ms;if(retaliation473.dead)return reject473('Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun.',409);}
 }
 const plans473=targets.map((target,index)=>prepareMonsterHit(target,index,null,false));
 let mixed473;
 try{mixed473=await commitMixedBlack473(database,{player,center:center473,playerPlans:playerPlans473,monsterPlans:plans473,cooldownAtMs,cooldownMs,nowMs,respawnSeconds:settings.pvp_respawn_seconds});}
 catch(error){if(error?.code==='mixed_cast_plan_limit')return reject473('Bu alan vuruşu çok fazla yaratık sonucu içeriyor; hedefleri ayırarak tekrar dene.',409);throw error;}
 if(!mixed473.accepted)return reject473('Hedef veya yetenek durumu değişti; yeniden dene.',409);
 releasePvpCommit();
 const hpById473=new Map(mixed473.playerRows.map(row=>[row.id,row])),finalHp473=new Map(mixed473.finalPlayerRows.map(row=>[row.id,row]));
 for(const row479 of mixed473.playerRows)await colNotifyPvpGemLoss479(player,row479,row479.id,row479.hp_revision,nowMs);
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
 if(targets.length>1){const retaliating=targets.find(target=>!target.is_stone&&hits.some(hit=>hit.id===target.id&&!hit.killed));if(retaliating)await armPveEngagement(database,attackingPlayer,retaliating,nowMs);else await database.prepare('DELETE FROM pve_engagements WHERE player_id=? AND monster_id IN(SELECT value FROM json_each(?)) AND NOT EXISTS (SELECT 1 FROM json_each(pve_engagements.attackers489) multi489 JOIN monsters live489 ON live489.id=multi489.key AND live489.spawn_round=json_extract(multi489.value,\'$.spawn_round\') WHERE live489.hp>0 AND live489.id<>pve_engagements.monster_id)').bind(playerId,JSON.stringify(targets.map(t=>t.id))).run();}
 const lifeSteal=await restoreStolenLife(database,playerId,lifeStealAmount(actualDamageDealt,enchantmentTotals('life_steal')));
 const correlation473={primaryTargetType:center473.kind,primaryTargetId:center473.id,...center473.kind==='monster'?{primarySpawnRound:monster.spawn_round}:{}};
 const publishes473=pvpHits473.map((hit,index)=>{const p=playerPlans473[index];return publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'pvp_result',eventId:`pvp:${nowMs}:${playerId}:${hit.targetId}`,intentId,...correlation473,attackerId:playerId,ability,...hit,attackerGems:player.gems,
 __combatAudit:intentId&&!p.attackBlocked?{v:1,intentId,attacker:{id:playerId,hp:player.hp,revision:player.hp_revision,scopeVersion:player.realtime_scope_version},target:{id:p.target.id,hp:p.target.hp,revision:p.target.hp_revision,scopeVersion:p.target.realtime_scope_version},rolls:{critical:p.criticalRoll,spread:p.spreadRoll},rules:{roleBase:p.roleBase,weaponPower:p.weaponPower,wingAttack:hasWingBonus(player)?settings.wing_attack_bonus:0,multiplier:p.multiplier,skillGrowth:1+(p.skillLevel-1)*settings.skill_upgrade_damage_per_level,scale:settings.skill_damage_scale,criticalChance:p.criticalChance,criticalMultiplier:colCriticalMultiplier491(settings.critical_damage_multiplier,player),strongPlayers:p.strongPlayers,armorReduction:p.armorReduction,classDefense:p.classDefense,resistantPlayers:p.resistantPlayers,firePercent:p.firePercent,icePercent:p.icePercent}}:undefined,serverAt:nowMs});});
 const targetChannels473=new Map(targets.map(t=>[t.id,t.channel]));
 for(const channel of [1,2,3]){const roomHits=hits.filter(hit=>channel===player.channel||targetChannels473.get(hit.id)===0),roomStates=states.filter(state=>channel===player.channel||targetChannels473.get(state.id)===0);if(roomHits.length)publishes473.push(publishRealtimeRoomEventToChannels(player.world_cycle,[channel],player.area,{type:'monster_result',eventId:`monster:${intentId??crypto.randomUUID()}:${nowMs}:mixed:${channel}`,intentId,...correlation473,attackerId:playerId,targetId:monster.id,ability,hits:roomHits,states:roomStates,serverAt:nowMs},channel===player.channel?channel:undefined));}
 if(lifeSteal)publishes473.push(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'player_state',eventId:crypto.randomUUID(),targetId:playerId,hp:lifeSteal.hp,hpRevision:lifeSteal.hp_revision,maxHp:lifeSteal.max_hp,serverAt:nowMs}));
 await deliverRealtime(Promise.all(publishes473));
 if(tasks473.length){const followup=startBackgroundTask(async()=>{for(const task of tasks473)await task();});if(!scheduleRequestTask(followup,'Mixed monster combat follow-up'))await followup;}
 const common473={ok:true,...correlation473,pveHit:attackPveHit,lifeSteal,progression,xp:ownXpGain,groundDrops:0,rewardPending:hits.some(hit=>hit.killed),cooldownRemainingMs:Math.max(0,Number(mixed473.guard.results[0].reserved_until)-Date.now()),tickCount:settings.elemental_tick_count,tickIntervalMs:settings.elemental_tick_interval_ms,message:`${pvpHits473.length} oyuncu ve ${hits.length} yaratığa alan saldırısı.`};
 return Response.json(center473.kind==='player'?{...common473,...pvpHits473[0],hits:pvpHits473,monsterHits:hits,monsterStates:states,attackerGems:player.gems}:{...common473,hits,states,pvpHits:pvpHits473});
}

if (payload.action === "pvp_attack") {
					let currentPvpSnapshot = actionSnapshot;
					const pvpRolls = {
						critical: Math.random(),
						spread: Math.random(),
						block: Math.random()
					};
					for (let attempt = 0; attempt < 3; attempt++) {
						const { player, settings, preloadedPvpTarget, preloadedPvpArena, pvpTargetId } = currentPvpSnapshot;
						if (!player) return Response.json({ error: "Karakter artık mevcut değil." }, { status: 409 });
						const control = await database.prepare("SELECT stun_until_ms,root_until_ms, EXISTS(SELECT 1 FROM party_members mine497 JOIN party_members peer497 ON peer497.party_id=mine497.party_id WHERE mine497.player_id=players.id AND peer497.player_id=?) AS same_party497 FROM players WHERE id=?").bind(pvpTargetId,playerId).first();
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
						const publishPvpAttackRejection = async () => {
							releasePvpCommit();
							if (!intentId || !targetPlayerId) return;
							const rejectedAt = Date.now();
							await publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
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
						const rejectPvpAttack = async (error, status) => {
							await deliverRealtime(publishPvpAttackRejection());
							return Response.json({ error }, { status });
						};
						if (control?.same_party497) return rejectPvpAttack("Parti arkadaşına saldıramazsın.", 400);
if (!await pvpContinuity(currentPvpSnapshot)) return rejectPvpAttack("Savaş alanı veya hedefin durumu değişti; hedefi yeniden seç.", 409);
						if (player.area !== "war" && player.area !== "black" && player.area !== "rune_v2" && !isArena) return rejectPvpAttack("Oyuncularla Savaş Meydanı, Kara Bölge veya Arena'da savaşabilirsin.", 400);
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
  const areaRows472 = (await database.prepare(`SELECT stat_attack,stat_defense,stat_hp,stat_revision,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,id, name, role, is_gm, x, y, hp, max_hp, hp_revision, respawn_at_ms, essence, contribution, xp, level, gems, potions, ${setSelectSql()},
          specialization,skill_four,attack_four_at,special_guard_until_ms,jewelry_attack,jewelry_defense,jewelry_cast_speed,jewelry_pvp,jewelry_resist,jewelry_earring_enchantments,jewelry_bracelet_enchantments,halloween_candy_until,skill_one, skill_two, skill_three, has_rod, rod_equipped, fish_sokan, fish_levrek, fish_zargana, pearls, stone_dust,
          xp_ring_until, drop_charm_until, (SELECT equipped FROM player_items WHERE player_id=players.id AND kind='costume' LIMIT 1) AS costume_equipped, has_wings, wings_equipped, (SELECT equipped FROM dungeon_wings WHERE player_id=players.id) AS core_wings, area, channel, arena_match_id, last_seen,
          combat_lock_until_ms, realtime_scope_version, weapon_skin_enabled,
          COALESCE((SELECT SUM(power) FROM player_items WHERE player_id = players.id AND kind IN ('armor','helmet','shoes','necklace','costume') AND equipped = 1), 0) AS equipped_armor_power,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'weapon' AND equipped = 1 LIMIT 1), '[]') AS equipped_weapon_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'armor' AND equipped = 1 LIMIT 1), '[]') AS equipped_armor_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'helmet' AND equipped = 1 LIMIT 1), '[]') AS equipped_helmet_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'shoes' AND equipped = 1 LIMIT 1), '[]') AS equipped_shoes_enchantments,
          COALESCE((SELECT CASE WHEN substr(item_name,1,3)='+5 ' AND kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(enchantments) AND json_type(enchantments)='array' THEN enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE enchantments END FROM player_items WHERE player_id = players.id AND kind = 'necklace' AND equipped = 1 LIMIT 1), '[]') AS equipped_necklace_enchantments, EXISTS(SELECT 1 FROM player_pets WHERE player_id=players.id AND kind='dragon' AND acquired_at+604800>unixepoch() AND equipped=1) AS defender_dragon

    FROM players WHERE id != ? AND NOT EXISTS(SELECT 1 FROM party_members party_actor497 JOIN party_members party_peer497 ON party_peer497.party_id=party_actor497.party_id WHERE party_actor497.player_id=?1 AND party_peer497.player_id=players.id) AND hp > 0 AND last_seen >= ? AND loadlab_run_id=(SELECT actor.loadlab_run_id FROM players actor WHERE actor.id=?1) AND (loadlab_run_id='' OR (loadlab_team>0 AND loadlab_team!=(SELECT actor.loadlab_team FROM players actor WHERE actor.id=?1)))
      AND area = ? AND channel = ? AND arena_match_id = ?
      AND (x-?)*(x-?)+(y-?)*(y-?) <= 90000
      AND (area != 'war' OR (x-1800)*(x-1800)/202500.0+(y-996)*(y-996)/116964.0>1)
      AND (area != 'arena' OR EXISTS (
        SELECT 1 FROM arena_match_players attacker JOIN arena_match_players defender ON defender.match_id=attacker.match_id
        WHERE attacker.player_id=? AND defender.player_id=players.id AND attacker.match_id=? AND attacker.team!=defender.team))
    ORDER BY CASE WHEN id=? THEN 0 ELSE 1 END, (x-?)*(x-?)+(y-?)*(y-?), id LIMIT 29`)
    .bind(playerId, Math.floor(nowMs/1000)-30, player.area, player.channel, arenaMatchId,
      center472.x,center472.x,center472.y,center472.y,playerId,arenaMatchId,target.id,
      center472.x,center472.x,center472.y,center472.y).all()).results;
  const rejectArea472=async(error, code)=>{
    const response=await rejectPvpAttack(error,409);
    return Response.json({...(await response.json()),code},{status:409,headers:response.headers});
  };
  if (!areaRows472.length || areaRows472[0].id !== target.id) return rejectArea472("Hedefin durumu değişti; hedefi yeniden seç.", "pvp_area_primary_unavailable");
  const primary472=areaRows472[0];
  if (!samePvpActorScope(target,primary472)) return rejectArea472("Hedefin savaş alanı değişti; hedefi yeniden seç.", "pvp_area_primary_scope_changed");
  if (primary472.hp_revision !== target.hp_revision && !await pvpContinuity({...currentPvpSnapshot,preloadedPvpTarget:primary472})) return rejectArea472("Hedefin yaşamı değişti; hedefi yeniden seç.", "pvp_area_primary_life_changed");
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
						const strongPlayers = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("strong_players") + (player.jewelry_pvp||0) + (player.pet_kind === "dragon" ? 10 : 0) + (castRanks472.get(player.id)?.pvp??0) + (player.set_pvp ?? 0);
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
if(player.area==='black'||player.area==='rune_v2'){
  const mixedCenter473={kind:'player',id:target.id,x:center472.x,y:center472.y};
  const mixedTargets473=await selectMixedMonsters473(player,mixedCenter473,null,payload,nowMs);
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
   ${hasLethalGems479 ? "gems=CASE WHEN players.loadlab_run_id='' AND players.hp<=CAST(json_extract(hit.value,'$.damage') AS INTEGER) THEN (SELECT before_gems FROM before_gems479 WHERE id=players.id)-CAST((SELECT before_gems FROM before_gems479 WHERE id=players.id)/20 AS INTEGER) ELSE players.gems END," : ""}
      respawn_at_ms=CASE WHEN players.hp-CAST(json_extract(hit.value,'$.damage') AS INTEGER)<=0 THEN ? ELSE 0 END,
      last_monster_hit_at=?, combat_lock_until_ms=MAX(players.combat_lock_until_ms,?)
    FROM json_each(?) AS hit
    WHERE players.id=json_extract(hit.value,'$.id') AND players.id!=? AND players.hp>0
      AND players.hp_revision=json_extract(hit.value,'$.revision') AND players.realtime_scope_version=json_extract(hit.value,'$.scope')
      AND EXISTS(SELECT 1 WHERE players.area=? AND players.channel=? AND players.arena_match_id=?)
    RETURNING players.id AS id, hp, hp_revision, respawn_at_ms, gems${hasLethalGems479 ? ",CASE WHEN loadlab_run_id='' THEN (SELECT before_gems FROM before_gems479 WHERE id=players.id)-gems ELSE NULL END AS pvp_gems_lost479" : ""}`)
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
  const committed472=await database.guardedBatch(areaGuard472,statements472);
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
  if(scoredMatch472?.status==='finished')matchFinished472=await settleArenaMatch(database,scoredMatch472,nowMs);
  if(scoredMatch472){
    scoredMatch472=await database.prepare('SELECT * FROM arena_matches WHERE id=?').bind(arenaMatchId).first();
    const ids472=JSON.stringify([playerId,...hits472.map(h=>h.targetId)]);
    const resetRows472=(await database.prepare('SELECT id,hp,max_hp,hp_revision,respawn_at_ms,gems FROM players WHERE arena_match_id=? OR id IN (SELECT value FROM json_each(?))').bind(arenaMatchId,ids472).all()).results;
    for(const row of resetRows472){
      if(row.id===playerId)attackerGems472=row.gems;
      const hit=hits472.find(h=>h.targetId===row.id);if(hit)Object.assign(hit,{hp:row.hp,hpRevision:row.hp_revision,respawnAtMs:row.respawn_at_ms,targetGems:row.gems});
      if(!matchFinished472&&!arenaMatchId.startsWith('guild-'))await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,'arena',
        {type:'player_state',eventId:crypto.randomUUID(),targetId:row.id,hp:row.hp,hpRevision:row.hp_revision,maxHp:row.max_hp,serverAt:nowMs},arenaMatchId));
    }
  }
  const lifeSteal472=await restoreStolenLife(database,playerId,lifeStealAmount(plans472.reduce((sum,p)=>sum+Math.min(p.totalDamage,p.target.hp),0),(enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))('life_steal')));
  if(lifeSteal472)await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'player_state',eventId:crypto.randomUUID(),targetId:playerId,hp:lifeSteal472.hp,hpRevision:lifeSteal472.hp_revision,maxHp:lifeSteal472.max_hp,serverAt:nowMs},arenaMatchId||void 0));
  if(!matchFinished472)for(let index=0;index<hits472.length;index++){
    const hit=hits472[index],p=plans472[index];
    await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,player.area,{type:'pvp_result',eventId:`pvp:${nowMs}:${playerId}:${hit.targetId}`,intentId,primaryTargetId:target.id,attackerId:playerId,ability,...hit,attackerGems:attackerGems472,
      __combatAudit:intentId&&!p.attackBlocked?{v:1,intentId,attacker:{id:playerId,hp:player.hp,revision:player.hp_revision,scopeVersion:player.realtime_scope_version},
        target:{id:p.target.id,hp:p.target.hp,revision:p.target.hp_revision,scopeVersion:p.target.realtime_scope_version},rolls:{critical:p.criticalRoll,spread:p.spreadRoll},
        rules:{roleBase:p.roleBase,weaponPower:p.weaponPower,wingAttack:hasWingBonus(player)?settings.wing_attack_bonus:0,multiplier:p.multiplier,
          skillGrowth:1+(p.skillLevel-1)*settings.skill_upgrade_damage_per_level,scale:settings.skill_damage_scale,criticalChance:p.criticalChance,
          criticalMultiplier:colCriticalMultiplier491(settings.critical_damage_multiplier,player),strongPlayers:p.strongPlayers,armorReduction:p.armorReduction,classDefense:p.classDefense,
          resistantPlayers:p.resistantPlayers,firePercent:p.firePercent,icePercent:p.icePercent}}:void 0,
      ...(scoredMatch472?{arenaMatchId,teamAScore:scoredMatch472.team_a_score,teamBScore:scoredMatch472.team_b_score,killTarget:scoredMatch472.kill_target}:{}),serverAt:nowMs},arenaMatchId||void 0));
  }
  if(matchFinished472&&scoredMatch472)await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,'arena',{type:'arena_match_finished',eventId:`arena-finished:${arenaMatchId}`,matchId:arenaMatchId,mode:scoredMatch472.mode,winnerTeam:scoredMatch472.winner_team,teamAName:scoredMatch472.team_a_name,teamBName:scoredMatch472.team_b_name,teamAScore:scoredMatch472.team_a_score,teamBScore:scoredMatch472.team_b_score,rewardGems:scoredMatch472.reward_gems,serverAt:nowMs},arenaMatchId));
  for(const row479 of updatedById472.values())await colNotifyPvpGemLoss479(player,row479,row479.id,row479.hp_revision,nowMs);
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
						const strongPlayers = (enchantmentTotals473_attackerGear ??= createEnchantmentTotals(attackerGear))("strong_players") + (player.jewelry_pvp||0) + (player.pet_kind === "dragon" ? 10 : 0) + serverRankBonuses(player.id).pvp + (player.set_pvp ?? 0);
						const defenderDragon = await database.prepare("SELECT 1 AS active FROM player_pets WHERE player_id=? AND kind='dragon' AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped=1").bind(target.id).first();
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
						let pvpCooldownAccepted = wouldKill ? await pvpCooldownStatement.first() : null;
						if (wouldKill && !pvpCooldownAccepted) {
							if (ability === 0) {
								await deliverRealtime(publishPvpAttackRejection());
								return rejectBasicAttackCadence(cooldownMs);
							}
							return rejectPvpAttack("Yetenek henüz hazır değil.", 429);
						}
						timing.mark("pvp_validation");
						const targetUpdate = isArena ? database.prepare(`${wouldKill ? "WITH before_gems479 AS MATERIALIZED (SELECT gems AS before_gems FROM players WHERE id=?) " : ""}UPDATE players SET ${wouldKill ? "gems=CASE WHEN loadlab_run_id='' THEN (SELECT before_gems FROM before_gems479)-CAST((SELECT before_gems FROM before_gems479)/20 AS INTEGER) ELSE gems END," : ""}hp = MAX(0, hp - ?), hp_revision = hp_revision + 1,
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
           RETURNING hp, hp_revision, respawn_at_ms, gems${wouldKill ? ",CASE WHEN loadlab_run_id='' THEN (SELECT before_gems FROM before_gems479)-gems ELSE NULL END AS pvp_gems_lost479" : ""}`).bind(...(wouldKill?[target.id]:[]),totalDamage, totalDamage, nowMs + settings.pvp_respawn_seconds * 1e3, nowMs, nowMs + 5e3, target.id, target.hp_revision, arenaMatchId, target.realtime_scope_version, playerId, player.channel, arenaMatchId, player.realtime_scope_version, playerId, target.id, arenaMatchId, nowMs) : database.prepare(`${wouldKill ? "WITH before_gems479 AS MATERIALIZED (SELECT gems AS before_gems FROM players WHERE id=?) " : ""}UPDATE players SET ${wouldKill ? "gems=CASE WHEN loadlab_run_id='' THEN (SELECT before_gems FROM before_gems479)-CAST((SELECT before_gems FROM before_gems479)/20 AS INTEGER) ELSE gems END," : ""}hp = MAX(0, hp - ?), hp_revision = hp_revision + 1,
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
           RETURNING hp, hp_revision, respawn_at_ms, gems${wouldKill ? ",CASE WHEN loadlab_run_id='' THEN (SELECT before_gems FROM before_gems479)-gems ELSE NULL END AS pvp_gems_lost479" : ""}`).bind(...(wouldKill?[target.id]:[]),totalDamage, totalDamage, nowMs + settings.pvp_respawn_seconds * 1e3, nowMs, nowMs + 5e3, target.id, target.hp_revision, player.area, player.channel, target.realtime_scope_version, playerId, player.area, player.channel, player.realtime_scope_version);
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
						const batchWrites = await database.batch(wouldKill ? mutationStatements : [pvpCooldownStatement, ...mutationStatements]);
						const attackWrites = wouldKill ? batchWrites : batchWrites.slice(1);
						if (!wouldKill) {
							pvpCooldownAccepted = batchWrites[0].results[0] ?? null;
							if (!pvpCooldownAccepted) {
								if (ability === 0) {
									await deliverRealtime(publishPvpAttackRejection());
									return rejectBasicAttackCadence(cooldownMs);
								}
								return rejectPvpAttack("Yetenek henüz hazır değil.", 429);
							}
						}
						const reservedUntilMs = Number(pvpCooldownAccepted.reserved_until);
						timing.mark("pvp_commit");
						const updated = attackWrites[0].results[0];
						if (!updated) {
							await database.prepare(`UPDATE players SET ${attackColumn} = ? WHERE id = ? AND ${attackColumn} = ?`).bind(reservedUntilMs - cooldownMs, playerId, reservedUntilMs).run();
							if (attempt < 2) {
								const fresh = await readActionSnapshot(database, payload, playerId);
								if (await pvpContinuity(fresh)) {
									if (fresh.player) fresh.player.pet_kind = (await database.prepare("SELECT kind FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped=1 LIMIT 1").bind(playerId).first())?.kind ?? null;
									currentPvpSnapshot = fresh;
									continue;
								}
							}
							return rejectPvpAttack("Hedefin durumu değişti; hedefi yeniden seç.", 409);
						}
						releasePvpCommit();
						const impactAtMs = Date.now();
						const guardianEffect = (attackBlocked ? null : ability===3&&branch456?.effect==='root'?await colTrapImpact456(database,player,target,'player',branch456,impactAtMs,intentId):await applyGuardianImpact(database, player, ability, target, "player", impactAtMs)) ?? guardianCastVisual({
							...player,
							x: attacker.x,
							y: attacker.y
						}, ability, target, "player", impactAtMs);
						if (guardianEffect && intentId) Object.assign(guardianEffect, { intentId });
						if (guardianEffect) await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, guardianEffect, arenaMatchId || void 0));
						const lifeSteal = await restoreStolenLife(database, playerId, lifeStealAmount(Math.min(totalDamage, target.hp), enchantmentTotal(equippedEnchantItems(player), "life_steal")));
						if (lifeSteal) await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
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
if(scoredMatch&&scoredMatch.status!=="finished"&&!arenaMatchId.startsWith("guild-")){scoredMatch=await database.prepare("SELECT * FROM arena_matches WHERE id=?").bind(arenaMatchId).first();const resetRows=(await database.prepare("SELECT id,hp,max_hp,hp_revision,respawn_at_ms FROM players WHERE arena_match_id=?").bind(arenaMatchId).all()).results;for(const reset of resetRows){if(reset.id===target.id){responseHp=reset.hp;responseHpRevision=reset.hp_revision;responseRespawnAtMs=0;}await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle,player.channel,"arena",{type:"player_state",eventId:crypto.randomUUID(),targetId:reset.id,hp:reset.hp,hpRevision:reset.hp_revision,maxHp:reset.max_hp,serverAt:nowMs},arenaMatchId));}}
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
								matchFinished = await settleArenaMatch(database, scoredMatch, nowMs);
								if (matchFinished) {
									const balances = await database.batch([database.prepare("SELECT gems FROM players WHERE id = ?").bind(playerId), database.prepare("SELECT gems, hp, hp_revision, respawn_at_ms FROM players WHERE id = ?").bind(target.id)]);
									attackerGems = Number(balances[0].results[0]?.gems ?? attackerGems);
									const settledTarget = balances[1].results[0];
									targetGems = Number(settledTarget?.gems ?? targetGems);
									responseHp = Number(settledTarget?.hp ?? responseHp);
									responseHpRevision = Number(settledTarget?.hp_revision ?? responseHpRevision);
									responseRespawnAtMs = Number(settledTarget?.respawn_at_ms ?? 0);
								}
							}
						}
						if (!matchFinished) await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
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
						if (matchFinished && scoredMatch) await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, "arena", {
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
						await colNotifyPvpGemLoss479(player,updated,target.id,updated.hp_revision,nowMs);
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
							message: attackBlocked ? `${target.name} saldırını blokladı!` : (player.area === "black" || player.area === "rune_v2") && killed ? `${target.name} yenildi.` : isArena ? matchFinished && scoredMatch ? `${scoredMatch.winner_team === 1 ? scoredMatch.team_a_name : scoredMatch.team_b_name} Arena savaşını kazandı!` : killed ? arenaScoreMessage : `${target.name}: ${totalDamage} hasar.` : killed ? settings.pvp_kill_reward_gems <= 0 ? `${target.name} yenildi · Savaş Meydanı ödülü yönetici tarafından kapalı` : warRewardGranted ? `${target.name} yenildi · +${settings.pvp_kill_reward_gems} Mücevher · yeni ödül 30 dakika sonra` : `${target.name} yenildi · savaş devam ediyor · ödül hakkına ${Math.max(1, Math.ceil((warRewardAvailableAtMs - nowMs) / 6e4))} dakika kaldı` : `${target.name}: ${totalDamage} hasar${classDefense ? ` · %${classDefense} ${defenseKind === "arrow_defense" ? "ok" : defenseKind === "magic_defense" ? "büyü" : "kılıç"} savunması` : ""}${resistantPlayers ? ` · %${resistantPlayers} oyuncu savunması` : ""}.`
						});
					}
					return Response.json({ error: "Hedefin durumu değişti; yeniden dene." }, { status: 409 });
				}
				if (payload.action === "attack") {
					const control = await database.prepare("SELECT stun_until_ms,root_until_ms FROM players WHERE id=?").bind(playerId).first();
					if (player.role === "muhafiz" && Number(payload.ability) === 2 && Number(control?.root_until_ms) > Date.now()) return Response.json({ error: "Sabitlenmişken hamle yapamazsın." }, { status: 409 });
					if (Number(control?.stun_until_ms) > Date.now()) return Response.json({
						error: "Sersemletildin; kısa süre sonra saldırabilirsin.",
						code: "combat_stunned"
					}, { status: 409 });
					const intentId = typeof payload.intentId === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(payload.intentId) ? payload.intentId : void 0;
					const targetId = typeof payload.targetId === "string" ? payload.targetId : "";
					const requestedSpawnRound = Number(payload.spawnRound);
					const publishMonsterAttackRejection = async () => {
						if (intentId && targetId && Number.isSafeInteger(requestedSpawnRound) && requestedSpawnRound >= 0) await publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
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
					const rejectMonsterAttack = async (error, status) => {
						await deliverRealtime(publishMonsterAttackRejection());
						return Response.json({
							pveHit: attackPveHit,
							error
						}, { status });
					};
					if (player.area !== "event" && player.area !== "rune_v2" && player.area !== "rune" && player.area !== "ancient" && player.area !== "forest" && player.area !== "frozen" && player.area !== "sanctum" && player.area !== "dragon" && player.area !== "sinsi" && player.area !== "black" && player.area !== "afk") return rejectMonsterAttack("Bu bölgede savaşılmaz.", 400);
					if (player.area === "afk") {
						if (!settings.afk_island_enabled && !player.is_gm) return rejectMonsterAttack("Ada oyunculara henüz açık değil.", 403);
						const hunt = await database.prepare("SELECT day,used_ms,bonus_ms,active,tick_at_ms FROM afk_hunt_state WHERE player_id=?").bind(playerId).first();
						if (!hunt?.active || hunt.day !== afkDay(Date.now()) || Date.now() - hunt.tick_at_ms > 15e3 || afkRemaining(hunt, Date.now()) <= 0) return rejectMonsterAttack("Oto av kapalı veya bugünkü süren doldu.", 403);
					}
					if (player.rod_equipped) return rejectMonsterAttack("Savaşmak için çantandan bir silah kuşanmalısın.", 400);
					const pendingRetaliation = await settlePveEngagement(database, playerId, settings, Date.now());
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
					const publishCurrentMonsterState = async () => {
						const channels = monster.channel === 0 ? Array.from({ length: 3 }, (_, channelIndex) => channelIndex + 1) : [monster.channel];
						await publishRealtimeRoomEventToChannels(player.world_cycle, channels, player.area, {
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
						await deliverRealtime(publishCurrentMonsterState());
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
						await deliverRealtime(publishCurrentMonsterState());
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
if((player.area==='black'||player.area==='rune_v2')&&ability===2&&player.role!=='muhafiz'){
  const mixedPoint473=areaSkillPoint(monster,attackingPlayer,readAreaSkillHints(payload.areaTargets).get(monster.id),nowMs,true,false);
  const mixedPlayers473=await prepareMixedPlayers473(player,settings,mixedPoint473,nowMs,null);
  if(mixedPlayers473.length){
   if(typeof database.combatHit!=='function')return rejectMonsterAttack('Alan saldırısı için oyun sunucusuna yeniden bağlan.',503);
   const mixedCenter473={kind:'monster',id:monster.id,spawnRound:monster.spawn_round,x:mixedPoint473.x,y:mixedPoint473.y,rangeX:combatMonster.x,rangeY:combatMonster.y,rangeLeeway:chaseLeeway};
   const mixedTargets473=await selectMixedMonsters473(player,mixedCenter473,monster,payload,nowMs);
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
					const cooldownAccepted = nativeGuardedBatch || memoryCombat ? null : await cooldownStatement.first();
					if (!nativeGuardedBatch && !memoryCombat && !cooldownAccepted) {
						if (ability === 0) {
							await deliverRealtime(publishMonsterAttackRejection());
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
					const all = ability === 2 && player.role !== "muhafiz" ? (await database.prepare("SELECT id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned, parent_stone_id, root_until_ms, control_x, control_y FROM monsters WHERE hp > 0 AND area = ? AND (channel = 0 OR channel = ?)").bind(player.area, player.channel).all()).results : [monster];
					const areaHints = ability === 2 && player.role !== "muhafiz" ? readAreaSkillHints(payload.areaTargets) : /* @__PURE__ */ new Map();
					const recentlyProvoked = /* @__PURE__ */ new Set();
					if (areaHints.size > 0) {
						const attacks = await database.prepare("SELECT target_id FROM combat_events WHERE created_at >= ? AND player_id = ?").bind(nowMs - 8e3, playerId).all();
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
					const foreignRealtimeChannels = Array.from({ length: 3 }, (_, channelIndex) => channelIndex + 1).filter((channel) => channel !== player.channel);
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
						const respawn = target.area==='event'?0:now + (target.area==='rune_v2'?globalThis.__colRuneV2.monster(target).respawnSeconds:target.area==='rune'?globalThis.__colRunes.monster(target).respawnSeconds:target.id === "dragon-world-1" ? dragonService()?.settings().config.interval ?? 10800 : isBlackStoneBoss476(target.id) ? settings.black_stone_boss_respawn_seconds : isFrozenBossId(target.id) ? settings.frozen_boss_respawn_seconds : target.id === "ancient-boss-1" ? settings.ancient_boss_respawn_seconds : isFrozenWaterId(target.id) ? settings.frozen_water_respawn_seconds : target.is_boss ? settings.boss_respawn_seconds : target.is_stone ? settings.sinsi_stone_respawn_seconds : target.summoned ? 2 : target.area === "ancient" ? settings.ancient_monster_respawn_seconds : target.area === "forest" ? colLabNormalRespawnSecondsR10(target, settings.forest_monster_respawn_seconds) : target.area === "frozen" ? settings.frozen_monster_respawn_seconds : target.area === "black" ? settings.black_monster_respawn_seconds : target.area === "afk" ? settings.afk_island_respawn_seconds : 18);
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
                        if(includeRewards465){
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
						const outcome = await memoryCombat(cooldownStatement, memoryPlans, {onPendingR13:typeof realtime?.onPendingR13==='function'? provisional => realtime.onPendingR13({...provisional,intentId,cycle:player.world_cycle,channel:player.channel,area:player.area,serverAt:Date.now()}):undefined});
						if (!outcome.guard.results[0]) {
							await deliverRealtime(publishMonsterAttackRejection());
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
						const queuedResults = (!memoryCombat && hitGroupSize > 1 ? await Promise.allSettled(hitPlans.map((plan) => database.batch(plan.hitStatements))) : null)?.map((outcome) => {
							if (outcome.status === "rejected") throw outcome.reason;
							return outcome.value;
						});
						for (const [planIndex, plan] of hitPlans.entries()) {
							const { target, rolled, elemental, hitStatements, xpResultIndex, beforeHealthIndex, healthResultIndex } = plan;
							const queuedHitResults = queuedResults?.[planIndex];
							const guardedHit = nativeGuardedBatch ? await nativeGuardedBatch(cooldownStatement, hitStatements) : null;
							if (guardedHit) {
								const accepted = guardedHit.guard.results[0];
								if (!accepted) {
									await deliverRealtime(publishMonsterAttackRejection());
									return rejectBasicAttackCadence(cooldownMs, attackPveHit);
								}
								reservedUntilMs = Number(accepted.reserved_until);
								publishMonsterPreviews();
							}
							const hitResults = memoryResults.get(target.id) ?? queuedHitResults ?? (guardedHit ? guardedHit.results : await database.batch(hitStatements));
							progression.push(...hitResults[xpResultIndex]?.results ?? []);
							const updated = hitResults[healthResultIndex]?.results[0];
							if (!updated) {
								const current = await database.prepare("SELECT hp, spawn_round FROM monsters WHERE id = ?").bind(target.id).first();
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
								guardianEffect = ability===3&&branch456?.effect==='root'?await colTrapImpact456(database,player,{...target,x:combatMonster.x,y:combatMonster.y},'monster',branch456,impactAtMs,intentId):await applyGuardianImpact(database, player, ability, {
									...target,
									x: combatMonster.x,
									y: combatMonster.y
								}, "monster", impactAtMs) ?? guardianCastVisual(player, ability, {
									...target,
									x: combatMonster.x,
									y: combatMonster.y
								}, "monster", impactAtMs);
								if (guardianEffect && intentId) Object.assign(guardianEffect, { intentId });
								if (guardianEffect) await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, guardianEffect));
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
						if (retaliatingMonster) await armPveEngagement(database, attackingPlayer, retaliatingMonster, nowMs);
						else if (primaryHit?.killed) await database.prepare("DELETE FROM pve_engagements WHERE player_id = ? AND monster_id = ? AND spawn_round = ? AND NOT EXISTS (SELECT 1 FROM json_each(pve_engagements.attackers489) multi489 JOIN monsters live489 ON live489.id=multi489.key AND live489.spawn_round=json_extract(multi489.value,'$.spawn_round') WHERE live489.hp>0 AND live489.id<>pve_engagements.monster_id)").bind(playerId, monster.id, monster.spawn_round).run();
					}
					await deliverRealtime(Promise.all([...previewPublishes, ...resultPublishes]));
					if (!hits.length) {
						await database.batch([database.prepare(`UPDATE players SET ${attackColumn} = ? WHERE id = ? AND ${attackColumn} = ?`).bind(reservedUntilMs - cooldownMs, playerId, reservedUntilMs), database.prepare("DELETE FROM combat_events WHERE player_id = ? AND target_id = ? AND ability = ? AND created_at = ?").bind(playerId, monster.id, ability, nowMs)]);
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
					const lifeSteal = await restoreStolenLife(database, playerId, lifeStealAmount(actualDamageDealt, enchantmentTotals("life_steal")), true);
					if (lifeSteal) await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
						type: "player_state",
						eventId: crypto.randomUUID(),
						targetId: playerId,
						hp: lifeSteal.hp,
						hpRevision: lifeSteal.hp_revision,
						maxHp: lifeSteal.max_hp,
						serverAt: nowMs
					}));
					if (postPublishTasks.length) {
						const followUp = startBackgroundTask(async () => {
							for (const task of postPublishTasks) await task();
						});
						if (!scheduleRequestTask(followUp, "Monster combat follow-up")) await followUp;
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
				if (payload.action === "open_crystal_chest") {
					if (typeof payload.requestId !== "string" || !/^chest-[a-zA-Z0-9-]{16,64}$/.test(payload.requestId)) return Response.json({ error: "Sandık işlemi geçersiz." }, { status: 400 });
					const prize = pickChestPrize(readEventsConfig(settings.events_json));
					const gear = prize.id === "weapon" || prize.id === "armor" ? {
						type: "gear",
						family: "generic",
						kind: prize.id,
						rarity: "orange"
					} : null;
					const item = gear ? {
						id: crypto.randomUUID(),
						kind: gear.kind,
						item_name: resolveLootItemName(gear, player.role),
						rarity: "orange",
						power: rollLootPower(gear, settings),
						role: player.role,
						enchantments: JSON.stringify(rollEnchantments(settings, gear.kind))
					} : void 0;
					const column = prize.id === "red_pearl" ? "red_pearls" : prize.id === "fifth_enchant" ? "fifth_enchant_scrolls" : prize.id === "pearl" ? "pearls" : prize.id === "potion" ? "potions" : prize.id === "sokan" ? "fish_sokan" : "essence";
					const amount = prize.id.startsWith("essence") ? Number(prize.id.slice(7)) : 1;
					const reward = await openCrystalChest(database, playerId, payload.requestId, {
						id: prize.id,
						label: item?.item_name ?? prize.label,
						column,
						amount,
						item
					}, now);
					if (!reward) return Response.json({ error: "Açılacak Kristal Sandığın yok." }, { status: 409 });
					return Response.json({
						ok: true,
						chestReward: reward,
						message: `Kristal Sandığı: ${reward.label} kazandın!`
					});
				}
				if (payload.action === "open_moonlight_chest") {
					if (typeof payload.requestId !== "string" || !/^moon-[a-zA-Z0-9-]{16,64}$/.test(payload.requestId)) return Response.json({ error: "Sandık işlemi geçersiz." }, { status: 400 });
					const prize = pickMoonlightPrize(readEventsConfig(settings.events_json));
					const gear = prize.id === "necklace" ? {
						type: "gear",
						family: "generic",
						kind: "necklace",
						rarity: "red"
					} : null;
					const item = gear ? {
						id: crypto.randomUUID(),
						kind: gear.kind,
						item_name: resolveLootItemName(gear, player.role),
						rarity: gear.rarity,
						power: rollLootPower(gear, settings),
						role: player.role,
						enchantments: JSON.stringify(rollEnchantments({
							...settings,
							enchant_item_chance: 1
						}, gear.kind))
					} : void 0;
					const column = {
						essence20: "essence",
						potions5: "potions",
						dust5: "stone_dust",
						gems20: "gems",
						pearl: "pearls",
						red_pearl: "red_pearls",
						fifth_enchant: "fifth_enchant_scrolls"
					}[prize.id];
					const amount = {
						essence20: 20,
						potions5: 5,
						dust5: 5,
						gems20: 20
					}[prize.id] ?? 1;
					const reward = {
						id: prize.id,
						label: item?.item_name ?? prize.label,
						amount,
						...column ? { column } : {},
						...item ? { item } : {},
						...prize.id === "wing" ? { material: "wing" } : prize.id === "dragon" ? { material: "pet" } : {},
						...prize.id === "attack_stone" ? { stone: rollStone("attack").key } : prize.id === "evolution_scroll" ? { stone: "evolution_scroll" } : {}
					};
					const granted = await openMoonlightChest(database, playerId, payload.requestId, reward, now);
					if (!granted) return Response.json({ error: "Açılacak Ayışığı Sandığın yok." }, { status: 409 });
					return Response.json({
						ok: true,
						chestReward: granted,
						message: `Ayışığı Sandığı: ${granted.label} kazandın!`
					});
				}
				if (payload.action === "open_halloween_pumpkin456") {
					if (typeof payload.requestId !== "string" || !/^halloween-[a-zA-Z0-9-]{16,64}$/.test(payload.requestId)) return Response.json({ error: "Sandık işlemi geçersiz." }, { status: 400 });
					const prize = pickHalloweenPrize(readEventsConfig(settings.events_json));
					const gear = prize.id === "necklace" ? {
						type: "gear",
						family: "generic",
						kind: "necklace",
						rarity: "red"
					} : null;
					const item = gear ? {
						id: crypto.randomUUID(),
						kind: gear.kind,
						item_name: resolveLootItemName(gear, player.role),
						rarity: gear.rarity,
						power: rollLootPower(gear, settings),
						role: player.role,
						enchantments: JSON.stringify(rollEnchantments({
							...settings,
							enchant_item_chance: 1
						}, gear.kind))
					} : void 0;
					const column = {
						essence20: "essence",
						potions5: "potions",
						dust5: "stone_dust",
						gems20: "gems",
						pearl: "pearls",
						red_pearl: "red_pearls",
						fifth_enchant: "fifth_enchant_scrolls"
					}[prize.id];
					const amount = {
						essence20: 20,
						potions5: 5,
						dust5: 5,
						gems20: 20
					}[prize.id] ?? 1;
					const reward = {
 wand: Math.random()*100<readEventsConfig(settings.events_json).halloweenWandChance?1:0,
						id: prize.id,
						label: item?.item_name ?? prize.label,
						amount,
						...column ? { column } : {},
						...item ? { item } : {},
						...prize.id === "wing" ? { material: "wing" } : prize.id === "dragon" ? { material: "pet" } : {},
						...prize.id === "attack_stone" ? { stone: rollStone("attack").key } : prize.id === "evolution_scroll" ? { stone: "evolution_scroll" } : {}
					};
					const granted = await openHalloweenPumpkin456(database, playerId, payload.requestId, reward, now);
					if (!granted) return Response.json({ error: "Açılacak Bal Kabağın yok." }, { status: 409 });
					return Response.json({
						ok: true,
						chestReward: granted,
						message: `Bal Kabağı: ${granted.label} kazandın!${granted.wand===1?" Ayrıca Cadının Sihirli Değneği çıktı!":""}`
					});
				}
				if (payload.action === "collect") {
 let lootAmount473;const lootResponse473=(value,options)=>{if(value?.ok!==true)return Response.json(value,options);const amount=Number(lootAmount473??drop?.amount);return Response.json(Number.isSafeInteger(amount)&&amount>0?{...value,lootReceipts473:[{id:drop.id,ownerId:playerId,label:drop.item_name,amount}]}:value,options);};

					if (player.area !== "bazaar" && player.area !== "event" && player.area !== "rune_v2" && player.area !== "rune" && player.area !== "ancient" && player.area !== "forest" && player.area !== "frozen" && player.area !== "sanctum" && player.area !== "dragon" && player.area !== "sinsi" && player.area !== "black") return lootResponse473({ error: "Bu bölgede ganimet toplanamaz." }, { status: 400 });
					const targetId = typeof payload.targetId === "string" ? payload.targetId : "";
					let drop = await database.prepare("SELECT id, owner_id, monster_id, kind, item_name, rarity, power, amount, role, enchantments, x, y, expires_at, collectible_at FROM world_drops WHERE id = ? AND owner_id = ?").bind(targetId, playerId).first();
					if (drop?.enchantments === PENDING_DROP_ENCHANTMENTS || drop?.enchantments === PROFILE_PENDING_DROP_ENCHANTMENTS) {
						await tryFinalizePendingDropEnchantments(database, settings, {
							ownerId: playerId,
							dropId: targetId
						});
						drop = await database.prepare("SELECT id, owner_id, monster_id, kind, item_name, rarity, power, amount, role, enchantments, x, y, expires_at, collectible_at FROM world_drops WHERE id = ? AND owner_id = ?").bind(targetId, playerId).first();
					}
					if (!drop || drop.expires_at < now) return lootResponse473({ error: "Ganimet artık burada değil." }, { status: 404 });
					if (drop.enchantments === PENDING_DROP_ENCHANTMENTS || drop.enchantments === PROFILE_PENDING_DROP_ENCHANTMENTS) return lootResponse473({ error: "Eşyanın efsunları hazırlanıyor; bir an sonra tekrar dene." }, { status: 409 });
					if (payload.automatic === true && drop.collectible_at > now) return lootResponse473({ error: "Ganimet henüz yerde görünüyor." }, { status: 409 });
					if ((drop.monster_id.startsWith('event-')?(globalThis.__colEventIsland444.settings().config.enabled?'event':'bazaar'):drop.monster_id.startsWith('rune-v2-')?'rune_v2':drop.monster_id.startsWith('rune-')?'rune':drop.monster_id === "dragon-world-1" ? "dragon" : drop.monster_id === "dunya-bosu-1" ? "sanctum" : drop.monster_id.includes("-ancient-") || drop.monster_id === "ancient-boss-1" ? "ancient" : drop.monster_id.includes("-black-") ? "black" : drop.monster_id.startsWith("frozen-") || drop.monster_id.includes("-frozen-") ? "frozen" : drop.monster_id.startsWith("sinsi-tasi-") || drop.monster_id.includes("-sinsi-") ? "sinsi" : "forest") !== player.area) return lootResponse473({ error: "Bu ganimet başka bir bölgede." }, { status: 409 });
					if (drop.collectible_at > now && distance(player, drop) > DROP_COLLECTION_RANGE) return lootResponse473({ error: "Ganimete biraz daha yaklaşmalısın." }, { status: 400 });
					if(eventKind444(drop.monster_id)&&['dragon','solo','dungeon'].includes(eventKind444(drop.monster_id)))return lootResponse473(await globalThis.__colEventIsland444.collect(playerId,drop.id));
 if (drop.monster_id === "dragon-world-1") return lootResponse473(await dragonService().collect(playerId, drop.id));
					if ((UPGRADE_MATERIAL_KINDS.includes(drop.kind)||Object.hasOwn(RUNE_TYPES,drop.kind)||['weathered_iron','wing','infinite','pet','halloween_pumpkin','witch_wand','halloween_candy'].includes(drop.kind))) {
						if (!(await database.batch([database.prepare(`INSERT INTO dungeon_materials(player_id,kind,amount) SELECT ?,kind,amount FROM world_drops WHERE id=? AND owner_id=? AND kind=? AND expires_at>=?
            ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount RETURNING amount`).bind(playerId, drop.id, playerId, drop.kind, now), database.prepare("DELETE FROM world_drops WHERE id=? AND owner_id=? AND kind=? AND expires_at>=?").bind(drop.id, playerId, drop.kind, now)]))[0].results[0]) return lootResponse473({ error: "Ganimet az önce toplandı." }, { status: 409 });
						return lootResponse473({
							ok: true,
							message: `${drop.item_name} çantana eklendi.`
						});
					}
					if (drop.kind === "crystal_chest") {
						if (!(await database.batch([database.prepare(`INSERT INTO player_stones(player_id,kind,amount) SELECT ?,'crystal_chest',amount FROM world_drops WHERE id=? AND owner_id=? AND kind='crystal_chest' AND expires_at>=?
            ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount RETURNING amount`).bind(playerId, drop.id, playerId, now), database.prepare("DELETE FROM world_drops WHERE id=? AND owner_id=? AND kind='crystal_chest' AND expires_at>=?").bind(drop.id, playerId, now)]))[0].results[0]) return lootResponse473({ error: "Sandık az önce toplandı." }, { status: 409 });
						return lootResponse473({
							ok: true,
							message: "Kristal Sandığı çantana eklendi. Çantandan açabilirsin."
						});
					}
					if (drop.kind === "moonlight_chest") {
						if (!(await database.batch([database.prepare(`INSERT INTO player_stones(player_id,kind,amount) SELECT ?,'moonlight_chest',amount FROM world_drops WHERE id=? AND owner_id=? AND kind='moonlight_chest' AND expires_at>=?
            ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount RETURNING amount`).bind(playerId, drop.id, playerId, now), database.prepare("DELETE FROM world_drops WHERE id=? AND owner_id=? AND kind='moonlight_chest' AND expires_at>=?").bind(drop.id, playerId, now)]))[0].results[0]) return lootResponse473({ error: "Sandık az önce toplandı." }, { status: 409 });
						return lootResponse473({
							ok: true,
							message: "Ayışığı Sandığı çantana eklendi. Çantandan açabilirsin."
						});
					}
					if(drop.kind==='gems'||drop.kind==='potions'){
 const col=drop.kind;const result=await database.batch([database.prepare(`UPDATE players SET ${col}=${col}+(SELECT amount FROM world_drops WHERE id=? AND owner_id=? AND kind=? AND expires_at>=?) WHERE id=? AND area IN ('rune','rune_v2') AND EXISTS(SELECT 1 FROM world_drops WHERE id=? AND owner_id=? AND kind=? AND expires_at>=?) RETURNING ${col}`).bind(drop.id,playerId,col,now,playerId,drop.id,playerId,col,now),database.prepare("DELETE FROM world_drops WHERE id=? AND owner_id=? AND kind=? AND expires_at>=? AND changes()>0").bind(drop.id,playerId,col,now)]);
 if(!result[0].results[0])return lootResponse473({error:'Ganimet az önce toplandı.'},{status:409});return lootResponse473({ok:true,...result[0].results[0],message:drop.item_name+' topladın.'});}
 if (drop.kind === "pearl") {
						const results = await database.batch([database.prepare(`UPDATE players SET pearls = pearls + ?, last_seen = ? WHERE id = ? AND EXISTS (
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
						const results = await database.batch([database.prepare(`UPDATE players SET stone_dust = stone_dust + ?, last_seen = ? WHERE id = ? AND EXISTS (
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
						const balance = (await database.batch([database.prepare(`INSERT INTO player_stones(player_id,kind,amount)
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
						const balance = (await database.batch([database.prepare(`INSERT INTO player_stones(player_id,kind,amount)
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
						const party = await database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first();
						const members = party ? (await database.prepare(`SELECT pm.player_id FROM party_members pm JOIN players p ON p.id = pm.player_id
               WHERE pm.party_id = ? AND p.last_seen >= ? ORDER BY pm.joined_at`).bind(party.party_id, now - 30).all()).results : [{ player_id: playerId }];
						const recipients = members.length ? members : [{ player_id: playerId }];
						const share = Math.floor(drop.amount / recipients.length);
						const remainder = drop.amount - share * recipients.length;
						const results = await database.batch([...recipients.flatMap((member, index) => {
							const amount = share + (index < remainder ? 1 : 0);
							return [database.prepare(`INSERT INTO guild_essence_rewards(id,player_id,amount,created_at)
           SELECT ?,p.id,${amount}${globalThis.__colPremium ? `+CASE WHEN p.essence_until>unixepoch()*1000 THEN CAST((${amount}+p.essence_bonus_remainder)/5 AS INTEGER) ELSE 0 END` : ""},? FROM players p WHERE p.id=? AND EXISTS(SELECT 1 FROM world_drops WHERE id=? AND owner_id=? AND kind='essence' AND expires_at>=?
           AND EXISTS(SELECT 1 FROM players owner WHERE owner.id=? AND owner.area=?)) ON CONFLICT(id) DO NOTHING RETURNING amount`).bind(drop.id + ":" + member.player_id, now, member.player_id, drop.id, playerId, now, playerId, player.area), ...globalThis.__colPremium ? [database.prepare(`UPDATE players SET essence_bonus_remainder=CASE WHEN essence_until>unixepoch()*1000 THEN (essence_bonus_remainder+${amount})%5 ELSE essence_bonus_remainder END WHERE id=? AND changes()>0`).bind(member.player_id)] : []];
						}), database.prepare(`DELETE FROM world_drops WHERE id = ? AND owner_id = ? AND kind = 'essence' AND expires_at >= ?
             AND EXISTS (SELECT 1 FROM players owner WHERE owner.id = ? AND owner.area = ?)`).bind(drop.id, playerId, now, playerId, player.area)]);
						if (!(Number(results.at(-1)?.meta?.changes ?? 0) > 0)) return lootResponse473({ error: "Ganimet az önce toplandı." }, { status: 409 });
						const balance = await database.prepare("SELECT essence FROM players WHERE id = ?").bind(playerId).first();
 lootAmount473=Number(results[recipients.findIndex(member=>member.player_id===playerId)*(globalThis.__colPremium?2:1)]?.results?.[0]?.amount??0);
						return lootResponse473({
							ok: true,
							essence: balance?.essence ?? player.essence,
							shared: recipients.length,
							message: recipients.length > 1 ? `+${drop.amount} Yaşam Özü partide eşit paylaşıldı.` : `+${drop.amount} Yaşam Özü topladın.`
						});
					}
					const results = await database.batch([database.prepare(`INSERT INTO player_items (id, player_id, kind, item_name, rarity, power, role, enchantments, equipped, created_at)
           SELECT id, owner_id, kind, item_name, rarity, power, role, enchantments, 0, ?
           FROM world_drops
           WHERE id = ? AND owner_id = ? AND kind != 'essence' AND enchantments NOT IN (?, ?) AND expires_at >= ?
             AND EXISTS (SELECT 1 FROM players owner WHERE owner.id = ? AND owner.area = ?)`).bind(now, drop.id, playerId, PENDING_DROP_ENCHANTMENTS, PROFILE_PENDING_DROP_ENCHANTMENTS, now, playerId, player.area), database.prepare(`DELETE FROM world_drops WHERE id = ? AND owner_id = ? AND kind != 'essence' AND enchantments NOT IN (?, ?) AND expires_at >= ?
           AND EXISTS (SELECT 1 FROM players owner WHERE owner.id = ? AND owner.area = ?)`).bind(drop.id, playerId, PENDING_DROP_ENCHANTMENTS, PROFILE_PENDING_DROP_ENCHANTMENTS, now, playerId, player.area)]);
					if (!(Number(results.at(-1)?.meta?.changes ?? 0) > 0)) return lootResponse473({ error: "Ganimet az önce toplandı." }, { status: 409 });
					if (drop.rarity === "red" || drop.rarity === "purple") try {
						await announceRareDrop(database, player, drop.item_name, drop.id, drop.rarity, now);
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
				if (payload.action === "unequip") {
					const itemId = typeof payload.itemId === "string" ? payload.itemId : "";
					const item = await database.prepare("SELECT id, item_name, kind, equipped FROM player_items WHERE id = ? AND player_id = ?").bind(itemId, playerId).first();
					if (!item || !isGearKind(item.kind)) return Response.json({ error: "Eşya üzerinde bulunamadı." }, { status: 404 });
					if (!item.equipped) return Response.json({
						ok: true,
						message: `${item.item_name} zaten çantanda.`
					});
					if (!await database.prepare("UPDATE player_items SET equipped = 0 WHERE id = ? AND player_id = ? AND equipped = 1 RETURNING id").bind(itemId, playerId).first()) return Response.json({ error: "Eşya aynı anda değişti; tekrar dene." }, { status: 409 });
					const health = await database.prepare(`UPDATE players SET
        hp_revision = hp_revision + CASE WHEN max_hp != ${effectiveMaxHpSql} OR hp > ${effectiveMaxHpSql} THEN 1 ELSE 0 END,
        hp = MIN(hp, ${effectiveMaxHpSql}), max_hp = ${effectiveMaxHpSql}, last_seen = ?
        WHERE id = ? RETURNING hp, max_hp, hp_revision`).bind(now, playerId).first();
					if (health) await publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
						type: "player_state",
						eventId: `unequip:${Date.now()}:${playerId}:${health.hp_revision}`,
						targetId: playerId,
						hp: health.hp,
						maxHp: health.max_hp,
						hpRevision: health.hp_revision,
						respawnAtMs: player.respawn_at_ms
					}, player.area === "arena" ? player.arena_match_id : void 0);
					return Response.json({
						ok: true,
						hp: health?.hp,
						maxHp: health?.max_hp,
						hpRevision: health?.hp_revision,
						message: `${item.item_name} çıkarıldı ve çantana alındı.`
					});
				}
				if (payload.action === "equip") {
					const itemId = typeof payload.itemId === "string" ? payload.itemId : "";
					const item = await database.prepare("SELECT id, player_id, kind, item_name, rarity, power, role, enchantments, equipped, created_at FROM player_items WHERE id = ? AND player_id = ?").bind(itemId, playerId).first();
					if (!item) return Response.json({ error: "Eşya çantanda bulunamadı." }, { status: 404 });
					if (!isGearKind(item.kind)) return Response.json({ error: "Bu eşya kuşanılamaz." }, { status: 400 });
					if (!canEquipGear(item, player.role)) return Response.json({ error: "Bu eşya sınıfına uygun değil." }, { status: 400 });
					if (!meetsGearLevel(item, player.level)) return Response.json({
						error: `Bu eşyayı kuşanmak için ${requiredGearLevel(item.rarity)}. seviye olmalısın.`,
						code: "gear_level_required",
						requiredLevel: requiredGearLevel(item.rarity)
					}, { status: 400 });
					const equipResults = await database.batch([
						database.prepare(`UPDATE player_items SET equipped = 0 WHERE player_id = ? AND kind = ?
           AND EXISTS (
             SELECT 1 FROM player_items target JOIN players owner ON owner.id = target.player_id
             WHERE target.id = ? AND target.player_id = ? AND target.kind = ? AND (target.kind IN ('shoes', 'necklace', 'earring', 'bracelet') OR target.role = owner.role) AND owner.level >= CASE target.rarity WHEN 'blue' THEN 7 WHEN 'orange' THEN 20 WHEN 'red' THEN 30 WHEN 'purple' THEN 60 WHEN 'unique' THEN 50 WHEN 'emerald' THEN 65 WHEN 'infinite' THEN 50 ELSE 1 END
           )`).bind(playerId, item.kind, itemId, playerId, item.kind),
						database.prepare(`UPDATE player_items SET equipped = 1 WHERE id = ? AND player_id = ? AND kind = ? AND (kind IN ('shoes', 'necklace', 'earring', 'bracelet') OR role = ?)
           AND (SELECT level FROM players WHERE id = player_items.player_id) >= CASE rarity WHEN 'blue' THEN 7 WHEN 'orange' THEN 20 WHEN 'red' THEN 30 WHEN 'purple' THEN 60 WHEN 'unique' THEN 50 WHEN 'emerald' THEN 65 WHEN 'infinite' THEN 50 ELSE 1 END
           RETURNING id`).bind(itemId, playerId, item.kind, player.role),
						database.prepare(`UPDATE players SET
             hp_revision = hp_revision + CASE WHEN max_hp != ${effectiveMaxHpSql} OR hp > ${effectiveMaxHpSql} THEN 1 ELSE 0 END,
             hp = MIN(hp, ${effectiveMaxHpSql}),
             max_hp = ${effectiveMaxHpSql},
             rod_equipped = CASE WHEN ? = 'weapon' THEN 0 ELSE rod_equipped END, last_seen = ?
           WHERE id = ? AND EXISTS (
             SELECT 1 FROM player_items target
             WHERE target.id = ? AND target.player_id = players.id AND target.kind = ? AND target.equipped = 1
           ) RETURNING hp, max_hp, hp_revision`).bind(item.kind, now, playerId, itemId, item.kind)
					]);
					if (!equipResults[1].results[0]) return Response.json({ error: "Eşya aynı anda değişti; çantanı yenileyip tekrar dene." }, { status: 409 });
					const health = equipResults[2].results[0];
					if (!health) return Response.json({ error: "Ekipman can değeri yenilenemedi; tekrar dene." }, { status: 409 });
					await publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, {
						type: "player_state",
						eventId: `equip:${Date.now()}:${playerId}:${health.hp_revision}`,
						targetId: playerId,
						hp: health.hp,
						maxHp: health.max_hp,
						hpRevision: health.hp_revision,
						respawnAtMs: player.respawn_at_ms
					}, player.area === "arena" ? player.arena_match_id : void 0);
					return Response.json({
						ok: true,
						hp: health?.hp,
						maxHp: health?.max_hp,
						hpRevision: health?.hp_revision,
						message: `${item.item_name} kuşanıldı.`
					});
				}
				if (payload.action === "donate") {
					const amount = Number(payload.amount);
                    if(!Number.isSafeInteger(amount)||amount<1||amount>player.essence)return Response.json({error:'Bağışlamak istediğin Öz miktarını 1 ile bakiyen arasında seç.'},{status:400});
					if (amount < 1) return Response.json({ error: "Bağışlayacak Yaşam Özün yok." }, { status: 400 });
					const decayedHealth = "MAX(0, health - MAX(0, ? - updated_at) * ?)";
					const donationResults = await database.batch([database.prepare("UPDATE players SET essence = essence - ?, contribution = contribution + ?, last_seen = ? WHERE id = ? AND hp > 0 AND essence >= ? RETURNING essence, contribution").bind(amount, amount, now, playerId, amount), database.prepare(`UPDATE world_state SET health = MIN(100, ${decayedHealth} + ? * MAX(.15, (100 - ${decayedHealth}) / 100.0)), updated_at = ?
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
				return Response.json({ error: "Bilinmeyen işlem." }, { status: 400 });
			};
			const executeLoadLabScoped=()=>executeAuthorized().catch(error=>{const rejected=colLabFailureResponse(error);if(rejected)return rejected;throw error;});
            const shared = db().sharedCombat;
			const executeScoped = shared?.needs(payload, auth.player) ? () => shared.run(() => {
				combatSnapshot = null;
				return executeLoadLabScoped();
			}) : executeLoadLabScoped;
			const requests = env.CORE_ATTACK_REQUESTS;
			if (requests && ["attack", "pvp_attack", "guardian_dash"].includes(payload.action) && typeof payload.intentId === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(payload.intentId)) {
				const key = [
					auth.tokenHash,
					auth.securityVersion,
					auth.gamePresence?.instanceId,
					auth.player?.id,
					payload.action === "attack" ? payload.intentId : payload.action + ":" + payload.intentId
				].join(":");
				return requests.run(key, executeScoped);
			}
			return executeScoped();
		};
		return await (combatTask && typeof runCombatTask === "function" ? runCombatTask(executeAction) : executeAction());
	} catch (error) {
		const response = error instanceof AuthRequestError ? authErrorResponse(error) : errorResponse(error);
		timing.failure = requestFailureReason(error, response.status);
		return response;
	} finally {
		releasePvpCommit();
	}
}
async function executeMovementAction(request, auth, database, payload, requestReceivedAtMs, scope) {
	const playerId = auth.player.id;
	const movementState = await readAuthoritativeMovement(database, playerId, auth.account.id, requestReceivedAtMs);
	const pendingRetaliation = movementState?.pve_hit_due ? await settlePveEngagement(database, playerId, await getGameSettings(), requestReceivedAtMs) : null;
	if (pendingRetaliation?.dead) return {
		status: 409,
		data: {
			error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun.",
            code: "movement_retaliation_dead",
			pveHit: pendingRetaliation.pveHit,
			hp: pendingRetaliation.hp,
			maxHp: pendingRetaliation.max_hp,
			hpRevision: pendingRetaliation.hp_revision,
			respawnAtMs: pendingRetaliation.respawn_at_ms
		}
	};
	const moved = await applyAuthoritativeMove(request, auth, database, payload, requestReceivedAtMs, movementState, scope);
	if (!moved.ok) return {
		status: moved.status,
		data: {
			error: moved.message,
			code: moved.code,
			untilMs: moved.untilMs,
			...moved.x === void 0 ? {} : {
				x: moved.x,
				y: moved.y,
				area: moved.area,
				positionRevision: moved.positionRevision
			}
		}
	};
	await deliverRealtime(publishRealtimeRoomEvent(moved.worldCycle, moved.channel, moved.area, {
		type: "move",
		eventId: `move:${playerId}:${moved.positionRevision}`,
		cycle: moved.worldCycle,
		channel: moved.channel,
		area: moved.area,
		arenaMatchId: moved.arenaMatchId,
		playerId,
		x: moved.x,
		y: moved.y,
		sequence: moved.positionRevision,
		authoritative: true,
		...typeof payload.motionStreamId === "string" && /^[A-Za-z0-9-]{16,80}$/.test(payload.motionStreamId) && Number.isSafeInteger(payload.motionSequence) && Number(payload.motionSequence) >= 1 ? {
			motionStreamId: payload.motionStreamId,
			motionSequence: payload.motionSequence
		} : {},
		serverAt: requestReceivedAtMs
	}, moved.arenaMatchId || void 0));
	return {
		status: 200,
		data: {
			ok: true,
			pveHit: pendingRetaliation?.pveHit,
			x: moved.x,
			y: moved.y,
			area: moved.area,
			positionRevision: moved.positionRevision
		}
	};
}
async function runRealtimeMovement(request, tokenHash, scope, payload, receivedAtMs) {
 const perfStarted477=performance.now(),perfTiming477=actionTiming477();
	try {
		const auth = await requireRealtimeGameSession(request, tokenHash);
  perfTiming477.mark("session");
		if (auth.player?.id !== scope.playerId || auth.securityVersion !== scope.securityVersion) throw new AuthRequestError(409, "game_instance_expired", "Oyun oturumunu yenile.");
		const retryAfter = enforceLocalActionRate(auth.account.id, "move");
		if (retryAfter) {
			await recordSecurityEvent(request, auth, {
				code: "action_flood",
				surface: "action",
				actionName: "move",
				confidence: 65,
				scoreDelta: 4,
				evidence: { retryAfter }
			});
			throw new AuthRequestError(429, "rate_limited", "Çok fazla işlem gönderildi. Kısa bir süre bekle.", retryAfter);
		}
		if (dungeonLocked(auth.player.id)) return {
			status: 409,
			data: { error: "Önce zindan koşundan ayrıl.", code: "movement_dungeon_locked" }
		};
		await ensureWorldSeed();
		const database = db();
		if(auth.playerAccess?.area==='rune_v2')await colRepairRuneV2Access(database,auth.player.id);if(auth.playerAccess?.area==='rune')await colRepairRuneAccess(database,auth.player.id);
if (auth.playerAccess?.area === "ancient") await repairAncientAccess(database, auth.player.id);
		await repairFrozenLevelInvariant(database, auth.player.id, auth.account.id, auth.playerAccess, receivedAtMs);
		perfTiming477.mark("prepare");
  const result477=await executeMovementAction(request, auth, database, payload, receivedAtMs, scope);
  perfTiming477.mark("move");return result477;
	} catch (error) {
		if (error instanceof AuthRequestError) return {
			status: error.status,
			data: {
				error: error.message,
				code: error.code,
				retryAfter: error.retryAfter
			}
		};
		throw error;
	}finally{perfTiming477.mark("response");perfStage477("server_total",performance.now()-perfStarted477);}
}
async function runRealtimeAttack(request, tokenHash, scope, payload, receivedAtMs, onPendingR13) {
	const started = performance.now();
	const perfTiming477=actionTiming477();perfTiming477.action="attack";
 const response = await runTimedAction(request, perfTiming477, {
		tokenHash,
		scope,
		payload,
		receivedAtMs,
    onPendingR13
	});
	const data477=await response.json();perfTiming477.mark("finish");
 const elapsed477=performance.now()-started;perfStage477("server_total",elapsed477);
 return {status:response.status,data:data477,serverMs:elapsed477};
}
//#endregion
//#region lib/world-shared-queries.mjs
var WORLD_CHAT_SQL = "SELECT * FROM (SELECT id, player_id, player_name, item_snapshot, body, created_at, scope, area, channel FROM messages WHERE recipient_id IS NULL AND scope = 'world' AND announcement_expires_at_ms = 0 ORDER BY id DESC LIMIT 20)\nUNION ALL SELECT * FROM (SELECT id, player_id, player_name, item_snapshot, body, created_at, scope, area, channel FROM messages WHERE recipient_id IS NULL AND scope = 'trade' AND announcement_expires_at_ms = 0 ORDER BY id DESC LIMIT 60)\nUNION ALL SELECT * FROM (SELECT id, player_id, player_name, item_snapshot, body, created_at, scope, area, channel FROM messages WHERE recipient_id IS NULL AND scope = 'regional' AND area = ? AND channel = ? AND announcement_expires_at_ms = 0 AND id > ? ORDER BY id DESC LIMIT 30)\nORDER BY id DESC";
var REGIONAL_CHAT_SQL = "SELECT id, player_id, player_name, item_snapshot, body, created_at FROM messages WHERE scope = 'regional' AND area = ? AND channel = ? AND created_at >= ? AND id > ? ORDER BY id DESC LIMIT 30";
var MARKET_LISTINGS_SQL = "SELECT id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments, amount, price_gems, created_at FROM market_listings ORDER BY created_at DESC LIMIT 250";
var SHARED_SHOPS_SQL = `SELECT id, owner_id, owner_name, name, x, y, channel, active, created_at,
 (SELECT stall_skin_enabled FROM players WHERE players.id=market_shops.owner_id) AS stall_skin_enabled,
 ((SELECT COUNT(*) FROM market_listings WHERE shop_id=market_shops.id)+(SELECT COUNT(*) FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))) AS hasListings
 FROM market_shops WHERE active=1 AND created_at>CAST(strftime('%s','now') AS INTEGER)-172800 ORDER BY created_at`;
//#endregion
//#region lib/game-master.ts
var ACTIVE_GM_ANNOUNCEMENT_SQL = `SELECT id, player_name, body, announcement_expires_at_ms
  FROM messages WHERE announcement_expires_at_ms > ? AND created_at<=unixepoch() ORDER BY id ASC LIMIT 1`;
//#endregion
//#region app/api/world/route.ts
var ACTIVE_PLAYERS_SQL = `SELECT * FROM (WITH visible_players AS MATERIALIZED (
 SELECT p.id, p.name, p.role, p.is_gm, p.gm_invisible, p.gm_visibility_revision, p.x, p.y, p.position_revision, p.motion_stream_id,
  p.motion_sequence, p.hp, p.max_hp, p.hp_revision, p.respawn_at_ms, p.essence, p.contribution, p.xp, p.level, p.gems,
  p.core_coins, p.item_link_orbs, p.afk_tickets, p.enchant_scrolls, p.enchant_add_scrolls, p.fifth_enchant_scrolls, p.auto_potion_owned, p.auto_potion_enabled, p.auto_potion_remaining, p.auto_potion_total,
  p.stall_skin_owned, p.stall_skin_enabled, p.teleport_skin_owned, p.teleport_skin_enabled, p.teleport_skin_expires_at_ms, p.weapon_skin_owned, p.weapon_skin_enabled, p.weapon_skin_expires_at_ms, p.storage_pages, p.rename_scrolls,
  p.jewelry_attack, p.jewelry_defense, p.jewelry_cast_speed, p.jewelry_pvp, p.jewelry_resist, p.potions, p.specialization, p.skill_four, p.skill_one, p.skill_two, p.skill_three, p.has_rod, p.rod_equipped, p.fish_sokan, p.fish_levrek, p.fish_zargana, p.pearls,
  p.stone_dust, p.xp_ring_until, p.drop_charm_until, p.has_wings, p.wings_equipped, p.wings_expires_at_ms, p.area, p.channel, p.arena_match_id, p.last_seen FROM players p WHERE (p.last_seen >= ? OR p.id = ?) AND p.channel = ? AND p.area = ?
 AND (p.is_gm != 1 OR p.gm_invisible != 1 OR p.id = ?)
 AND (p.area != 'arena' OR (p.arena_match_id != '' AND p.arena_match_id = (SELECT arena_match_id FROM players WHERE id = ?)))
 ORDER BY p.last_seen DESC LIMIT 80), equipped_items AS MATERIALIZED (
 SELECT i.player_id,i.kind,i.role,i.rarity,i.power,CASE WHEN substr(i.item_name,1,3)='+5 ' AND i.kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(i.enchantments) AND json_type(i.enchantments)='array' THEN i.enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE i.kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE i.kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE i.enchantments END AS enchantments
 FROM visible_players vp JOIN player_items i ON i.player_id=vp.id AND i.equipped=1
), equipment_summary AS MATERIALIZED (
 SELECT player_id,
 MAX(CASE WHEN kind='costume' THEN role END) AS costume_role,
 MAX(CASE WHEN kind='armor' THEN rarity END) AS armor_rarity,
 MAX(CASE WHEN kind='helmet' THEN rarity END) AS helmet_rarity,
 MAX(CASE WHEN kind='weapon' THEN rarity END) AS weapon_rarity,
 MAX(CASE WHEN kind='weapon' THEN (SELECT json_extract(e.value,'$.value') FROM json_each(enchantments) e WHERE json_extract(e.value,'$.kind')='evolution_level' LIMIT 1) END) AS weapon_evolution,
 SUM(CASE WHEN kind='weapon' THEN power ELSE 0 END) AS weapon_power,
 SUM(CASE WHEN kind IN ('armor','helmet','shoes','necklace','costume') THEN power ELSE 0 END) AS armor_power
 FROM equipped_items GROUP BY player_id
), equipment_effects AS MATERIALIZED (
 SELECT i.player_id,i.kind,
 json_extract(CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.kind') AS effect_kind,
 CAST(json_extract(CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.value') AS INTEGER) AS effect_value
 FROM equipped_items i,
 json_each(CASE WHEN json_valid(i.enchantments) THEN i.enchantments ELSE '[]' END) effect
), enchantment_totals AS MATERIALIZED (SELECT i.player_id,
MIN(50,MAX(0,COALESCE(SUM(CASE WHEN i.effect_kind='cast_speed' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value>0 THEN MIN(50,MAX(1,i.effect_value)) ELSE 0 END),0))) AS cast_speed,
MIN(10, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='forest_power' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value BETWEEN 1 AND 10 THEN i.effect_value ELSE 0 END),0))) AS forest_power,
MIN(10, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='frozen_power' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value BETWEEN 1 AND 10 THEN i.effect_value ELSE 0 END),0))) AS frozen_power,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='fire' AND i.kind IN ('weapon') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS fire_damage,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='ice' AND i.kind IN ('weapon') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS ice_damage,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='strong_players' AND i.kind IN ('weapon','armor','helmet','shoes','necklace','earring','bracelet') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS strong_players,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='sword_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS sword_defense,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='arrow_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS arrow_defense,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='magic_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS magic_defense,
MIN(90, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='resistant_players' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS resistant_players
 FROM equipment_effects i GROUP BY i.player_id)
SELECT p.id, p.name, p.role, p.is_gm, p.gm_invisible, p.gm_visibility_revision, p.x, p.y, p.position_revision, p.motion_stream_id, p.motion_sequence, p.hp, p.max_hp, p.hp_revision, p.respawn_at_ms, p.essence, p.contribution, p.xp, p.level, p.gems, p.core_coins, p.item_link_orbs, p.afk_tickets, p.enchant_scrolls, p.enchant_add_scrolls, p.fifth_enchant_scrolls, p.auto_potion_owned, p.auto_potion_enabled, p.auto_potion_remaining,p.auto_potion_total, p.stall_skin_owned, p.stall_skin_enabled, p.teleport_skin_owned, p.teleport_skin_enabled, p.teleport_skin_expires_at_ms, p.weapon_skin_owned, p.weapon_skin_enabled,p.weapon_skin_expires_at_ms, p.storage_pages, p.rename_scrolls, p.potions,
  (SELECT g.name FROM guild_members gm JOIN guilds g ON g.id=gm.guild_id WHERE gm.player_id=p.id) AS guild_name,
  p.specialization, p.skill_four, p.skill_one, p.skill_two, p.skill_three, p.has_rod, p.rod_equipped,
  p.fish_sokan, p.fish_levrek, p.fish_zargana, p.pearls, p.stone_dust, p.xp_ring_until, p.drop_charm_until,
  es.costume_role AS costume_role,
  p.has_wings, p.wings_equipped, p.wings_expires_at_ms, p.area, p.channel, p.arena_match_id, p.last_seen,
  (SELECT equipped FROM dungeon_wings WHERE player_id=p.id) AS core_wings,
  (SELECT name FROM player_pets WHERE player_id = p.id AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped = 1 LIMIT 1) AS pet_name,
  (SELECT kind FROM player_pets WHERE player_id = p.id AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped = 1 LIMIT 1) AS pet_kind,
  COALESCE((SELECT team FROM arena_match_players WHERE match_id = p.arena_match_id AND player_id = p.id LIMIT 1), 0) AS arena_team,
  es.armor_rarity AS armor_rarity,
  es.helmet_rarity AS helmet_rarity,
  es.weapon_rarity AS weapon_rarity,
  COALESCE(es.weapon_evolution,0) AS weapon_evolution,
  COALESCE(es.weapon_power,0) + CASE WHEN p.weapon_skin_enabled=1 THEN 20 ELSE 0 END + p.jewelry_attack AS equipped_weapon_power,
  COALESCE(es.armor_power,0) + p.jewelry_defense + CASE WHEN p.role='muhafiz' THEN 10 ELSE 0 END AS equipped_armor_power,
  COALESCE(et.forest_power,0) AS forest_power,
  COALESCE(et.frozen_power,0) AS frozen_power,
  MIN(50,COALESCE(et.cast_speed,0) + p.jewelry_cast_speed) AS cast_speed,
  COALESCE(et.fire_damage,0) AS fire_damage,
  COALESCE(et.ice_damage,0) AS ice_damage,
  COALESCE(et.strong_players,0) + p.jewelry_pvp AS strong_players,
  COALESCE(et.sword_defense,0) AS sword_defense,
  COALESCE(et.arrow_defense,0) AS arrow_defense,
  COALESCE(et.magic_defense,0) AS magic_defense,
  MIN(90,COALESCE(et.resistant_players,0) + p.jewelry_resist) AS resistant_players
 FROM visible_players p LEFT JOIN equipment_summary es ON es.player_id=p.id LEFT JOIN enchantment_totals et ON et.player_id=p.id ORDER BY p.last_seen DESC LIMIT 80)`;
var OWNER_PLAYER_SQL = ACTIVE_PLAYERS_SQL.replace("WHERE (p.last_seen >= ? OR p.id = ?)", "WHERE p.id = ? AND (p.last_seen >= ? OR p.id = ?)").replaceAll("p.specialization, p.skill_four,", "p.specialization, p.skill_four, p.attack_four_at, p.special_guard_until_ms,").replaceAll("p.attack_four_at, p.special_guard_until_ms,", "p.attack_four_at, p.special_guard_until_ms, p.realtime_scope_version,").replace("SELECT p.id, p.name, p.role, p.is_gm, p.gm_invisible, p.gm_visibility_revision, p.x, p.y, p.position_revision, p.motion_stream_id, p.motion_sequence","SELECT COALESCE((SELECT json_object('id',s.puzzle_id,'area',s.area,'channel',s.channel,'template',s.template,'choices',json_array(json_object('id','a','shape',(s.template+3-s.correct_slot)%3),json_object('id','b','shape',(s.template+4-s.correct_slot)%3),json_object('id','c','shape',(s.template+5-s.correct_slot)%3)),'expiresAt',s.expires_at,'test',json(CASE WHEN s.test=1 THEN 'true' ELSE 'false' END),'xp',s.xp,'essence',s.essence) FROM broken_core_state464 s JOIN broken_core_settings464 c ON c.id=1 WHERE s.player_id=p.id AND s.puzzle_id<>'' AND s.expires_at>unixepoch()*1000 AND s.area=p.area AND s.channel=p.channel AND s.scope_version=p.realtime_scope_version AND p.hp>0 AND p.arena_match_id='' AND NOT EXISTS(SELECT 1 FROM dungeon_members WHERE player_id=p.id) AND NOT EXISTS(SELECT 1 FROM pve_engagements e JOIN monsters b ON b.id=e.monster_id WHERE e.player_id=p.id AND (b.is_boss=1 OR b.id='frozen-boss-1' OR b.id='ancient-boss-1' OR b.id='dragon-world-1' OR b.id LIKE 'frozen-water-c%' OR b.id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1')) AND b.hp>0) AND s.config_revision=c.revision AND NOT EXISTS(SELECT 1 FROM guild_members gm JOIN guild_war_locks gl ON gl.guild_id=gm.guild_id WHERE gm.player_id=p.id) AND (s.test=1 OR c.enabled=1)),'') AS broken_core464, p.id, p.name, p.role, p.is_gm, p.gm_invisible, p.gm_visibility_revision, p.x, p.y, p.position_revision, p.motion_stream_id, p.motion_sequence");
var MONSTERS_SQL = `SELECT id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned, parent_stone_id
  FROM monsters
  WHERE ((area = ? AND (channel = 0 OR channel = ?)) OR (is_boss = 1 AND loadlab_run_id='') OR id='dragon-world-1')
    AND (summoned = 0 OR hp > 0)
  ORDER BY is_boss, is_stone, id`;
var DROPS_SQL = `SELECT id, owner_id, monster_id, kind, item_name, rarity, power, amount, role, enchantments, x, y, expires_at, collectible_at
  FROM world_drops WHERE owner_id = ? AND expires_at >= ? AND enchantments NOT IN ('__pending__','__profile_pending__')
  AND monster_id NOT LIKE '%-afk-%'
  AND ((? = CASE WHEN monster_id LIKE 'event-%' THEN CASE WHEN json_extract((SELECT config_json FROM event_island_settings444 WHERE id=1),'$.enabled')=1 THEN 'event' ELSE 'bazaar' END WHEN monster_id LIKE 'rune-v2-%' THEN 'rune_v2' WHEN monster_id LIKE 'rune-%' THEN 'rune' WHEN monster_id='dragon-world-1' THEN 'dragon' WHEN monster_id LIKE '%-ancient-%' OR monster_id = 'ancient-boss-1' THEN 'ancient' ELSE 'forest' END AND monster_id != 'dunya-bosu-1' AND monster_id NOT LIKE 'sinsi-tasi-%' AND monster_id NOT LIKE '%-sinsi-%' AND monster_id NOT LIKE 'frozen-%' AND (monster_id LIKE 'event-%' OR monster_id NOT LIKE '%-frozen-%') AND monster_id NOT LIKE '%-black-%')
    OR (? = 'black' AND monster_id LIKE '%-black-%')
    OR (? = 'sanctum' AND monster_id = 'dunya-bosu-1')
    OR (? = 'sinsi' AND (monster_id LIKE 'sinsi-tasi-%' OR monster_id LIKE '%-sinsi-%'))
    OR (? = 'frozen' AND monster_id NOT LIKE 'event-%' AND (monster_id LIKE 'frozen-%' OR monster_id LIKE '%-frozen-%')))
  ORDER BY expires_at`;
var COMBAT_EVENTS_SQL = `SELECT e.id, e.player_id, e.target_id, e.role, e.ability, e.created_at
  FROM combat_events e JOIN players attacker ON attacker.id = e.player_id JOIN players viewer ON viewer.id = ?
  WHERE e.created_at >= ? AND attacker.channel = viewer.channel AND attacker.area = viewer.area
    AND (attacker.loadlab_run_id = '' OR attacker.loadlab_run_id = viewer.loadlab_run_id)
    AND (attacker.is_gm != 1 OR attacker.gm_invisible != 1 OR attacker.id = viewer.id)
    AND NOT EXISTS (SELECT 1 FROM players target WHERE target.id = e.target_id AND target.is_gm = 1 AND target.gm_invisible = 1 AND target.id != viewer.id)
    AND (viewer.area != 'arena' OR (viewer.arena_match_id != '' AND attacker.arena_match_id = viewer.arena_match_id))
  ORDER BY e.created_at DESC, e.id DESC LIMIT 512`;
var REALTIME_PLAYERS_SQL = `SELECT p.id, p.is_gm, p.gm_invisible, p.gm_visibility_revision, p.x, p.y, p.position_revision, p.motion_stream_id, p.motion_sequence, p.hp, p.max_hp, p.hp_revision, p.respawn_at_ms, p.last_seen,
  (SELECT equipped FROM dungeon_wings WHERE player_id=p.id) AS core_wings,
  (SELECT name FROM player_pets WHERE player_id = p.id AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped = 1 LIMIT 1) AS pet_name,
  (SELECT kind FROM player_pets WHERE player_id = p.id AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped = 1 LIMIT 1) AS pet_kind
  FROM players p JOIN players viewer ON viewer.id = ?
  WHERE (p.last_seen >= ? OR p.id = ?) AND p.channel = viewer.channel AND p.area = viewer.area
    AND (p.is_gm != 1 OR p.gm_invisible != 1 OR p.id = viewer.id)
    AND (viewer.area != 'arena' OR (viewer.arena_match_id != '' AND p.arena_match_id = viewer.arena_match_id))
  ORDER BY p.last_seen DESC LIMIT 80`;
var REALTIME_MONSTERS_SQL = `SELECT monster.id, monster.x, monster.y, monster.hp, monster.max_hp, monster.respawn_at,
    monster.despawn_at, monster.spawn_round, monster.wave_stage
  FROM monsters monster JOIN players viewer ON viewer.id = ?
  WHERE monster.area = viewer.area AND (monster.channel = 0 OR monster.channel = viewer.channel)
  ORDER BY monster.is_boss, monster.is_stone, monster.id`;
var BOSS_LEADERS_SQL = BOSS_LEADERS_SQL476;
function arenaStatements(database, playerId, nowMs) {
	return [
		database.prepare(`SELECT q.mode AS queue_mode, q.team_name AS queue_team_name, q.queued_at_ms,
        CASE WHEN q.player_id IS NULL THEN 0 ELSE (SELECT COUNT(*) FROM arena_queue q2 WHERE q2.room_id = q.room_id AND q2.mode = q.mode AND q2.channel = p.channel AND q2.last_seen_ms >= ?) END AS queue_count,
        CASE WHEN q.player_id IS NULL THEN 0 ELSE 1 + (SELECT COUNT(*) FROM arena_queue q3 WHERE q3.room_id = q.room_id AND q3.mode = q.mode AND q3.channel = p.channel AND q3.last_seen_ms >= ? AND (q3.queued_at_ms < q.queued_at_ms OR (q3.queued_at_ms = q.queued_at_ms AND q3.player_id < q.player_id))) END AS queue_position,
        m.id AS match_id, m.mode, m.status, m.starts_at_ms, m.kill_target, m.team_a_name, m.team_b_name,
        m.team_a_score, m.team_b_score, m.reward_gems, mp.team AS my_team, p.realtime_scope_version AS owner_scope_version
       FROM players p
       LEFT JOIN arena_queue q ON q.player_id = p.id
       LEFT JOIN arena_matches m ON m.id = p.arena_match_id AND m.status IN ('countdown','active')
       LEFT JOIN arena_match_players mp ON mp.match_id = m.id AND mp.player_id = p.id
       WHERE p.id = ? LIMIT 1`).bind(nowMs - ARENA_QUEUE_TTL_MS, nowMs - ARENA_QUEUE_TTL_MS, playerId),
		database.prepare(`SELECT mp.player_id AS id, p.name, p.role, mp.team, mp.slot, mp.kills, mp.deaths
       FROM players viewer
       JOIN arena_match_players mp ON mp.match_id = viewer.arena_match_id
       JOIN players p ON p.id = mp.player_id
       WHERE viewer.id = ? AND viewer.area = 'arena' AND viewer.arena_match_id != ''
       ORDER BY mp.team, mp.slot`).bind(playerId),
		database.prepare(`SELECT m.id AS match_id, m.mode, m.team_a_name, m.team_b_name, m.team_a_score, m.team_b_score,
        m.kill_target, m.winner_team, m.reward_gems, m.finished_at_ms, mp.team AS my_team,
        COALESCE(my_reward.gems, 0) AS my_reward_gems,
        COALESCE(cooldown.last_awarded_at_ms + ?, 0) AS reward_available_at_ms
       FROM arena_match_players mp JOIN arena_matches m ON m.id = mp.match_id
       LEFT JOIN arena_reward_claims my_reward ON my_reward.match_id = m.id AND my_reward.player_id = mp.player_id
       LEFT JOIN pvp_reward_cooldowns cooldown ON cooldown.player_id = mp.player_id AND cooldown.reward_scope = 'arena_win'
       WHERE mp.player_id = ? AND mp.result_seen_at_ms = 0 AND m.status = 'finished' AND m.settlement_token != ''
       ORDER BY m.finished_at_ms DESC LIMIT 1`).bind(PVP_REWARD_COOLDOWN_MS, playerId),
		database.prepare(`SELECT match_id, mode, team_name, message, created_at_ms, expires_at_ms
       FROM arena_announcements WHERE expires_at_ms > ? ORDER BY created_at_ms DESC LIMIT 1`).bind(nowMs),
		database.prepare(ACTIVE_GM_ANNOUNCEMENT_SQL).bind(nowMs),
		database.prepare(`SELECT p.id AS playerId, (p.is_gm = 1 AND p.gm_invisible = 1) AS invisible,
      p.gm_visibility_revision AS visibilityRevision FROM players p JOIN players viewer ON viewer.id = ?
      WHERE p.gm_visibility_revision > 0 AND p.channel = viewer.channel AND p.area = viewer.area
        AND (viewer.area != 'arena' OR p.arena_match_id = viewer.arena_match_id)`).bind(playerId)
	];
}
function arenaPayloadFromResults(results, nowMs) {
	const [contextResult, membersResult, resultResult, announcementResult, gmAnnouncementResult, visibilityResult] = results;
	const context = contextResult.results[0];
	const result = resultResult.results[0];
	return {
		arenaQueue: context?.queue_mode ? {
			mode: context.queue_mode,
			teamName: context.queue_team_name ?? "",
			queuedAtMs: Number(context.queued_at_ms ?? 0),
			queuedCount: Number(context.queue_count ?? 0),
			position: Number(context.queue_position ?? 0)
		} : null,
		arenaMatch: context?.match_id ? {
			id: context.match_id,
			mode: context.mode,
			status: context.status === "countdown" && Number(context.starts_at_ms) <= nowMs ? "active" : context.status,
			startsAtMs: Number(context.starts_at_ms ?? 0),
			killTarget: Number(context.kill_target ?? 0),
			teamAName: context.team_a_name ?? "Takım A",
			teamBName: context.team_b_name ?? "Takım B",
			teamAScore: Number(context.team_a_score ?? 0),
			teamBScore: Number(context.team_b_score ?? 0),
			rewardGems: Number(context.reward_gems ?? 0),
			myTeam: Number(context.my_team ?? 0),
      ownerScopeVersion: Number(context.owner_scope_version ?? 0),
			members: membersResult.results
		} : null,
		arenaResult: result ? {
			matchId: String(result.match_id ?? ""),
			mode: String(result.mode ?? "1v1"),
			teamAName: String(result.team_a_name ?? "Takım A"),
			teamBName: String(result.team_b_name ?? "Takım B"),
			teamAScore: Number(result.team_a_score ?? 0),
			teamBScore: Number(result.team_b_score ?? 0),
			killTarget: Number(result.kill_target ?? 0),
			winnerTeam: Number(result.winner_team ?? 0),
			myTeam: Number(result.my_team ?? 0),
			rewardEnabled: Number(result.reward_gems ?? 0) > 0,
			rewardGems: Number(result.winner_team) === Number(result.my_team) ? Number(result.my_reward_gems ?? 0) : 0,
			rewardGranted: Number(result.winner_team) === Number(result.my_team) && Number(result.my_reward_gems ?? 0) > 0,
			rewardAvailableAtMs: Number(result.winner_team) === Number(result.my_team) ? Number(result.reward_available_at_ms ?? 0) : 0,
			finishedAtMs: Number(result.finished_at_ms ?? 0)
		} : null,
		globalAnnouncement: announcementResult.results[0] ?? null,
		gmAnnouncement: gmAnnouncementResult.results[0] ?? null,
		playerVisibility: visibilityResult.results
	};
}
async function worldBatch(database, playerId, nowMs, statements, projectPlayers = false, roomRoster = false) {
	const snapshotStartedAtMs = Date.now();
	const queries = [...statements, ...arenaStatements(database, playerId, nowMs)];
	const native = database;
	const results = await (native.readWorldSnapshot ? native.readWorldSnapshot(queries, projectPlayers ? { projection: {
		playersIndex: 1,
		ownerId: playerId,
		roomRoster
	} } : void 0) : database.batch(queries));
	return {
		playersProjected: results.playersProjected === true,
		snapshotAtMs: results.snapshotAtMs ?? snapshotStartedAtMs,
		snapshot: results.slice(0, statements.length),
		arenaPayload: arenaPayloadFromResults(results.slice(statements.length), nowMs)
	};
}
async function readSharedWorld(database, topic, scope) {
	const read = async (statements) => {
		const native = database;
		return native.readWorldSnapshot ? native.readWorldSnapshot(statements) : database.batch(statements);
	};
	if (topic === "chat") {
		const regionalArea = scope.area === "arena" ? `arena:${scope.arenaMatchId}` : scope.area;
		const [chat, regional] = await read([database.prepare(WORLD_CHAT_SQL).bind(regionalArea, scope.channel, 0), database.prepare(REGIONAL_CHAT_SQL).bind(regionalArea, scope.channel, Math.floor(Date.now() / 1e3) - 5, 0)]);
		return {
			chat: [...chat.results].reverse(),
			regionalMessages: regional.results
		};
	}
	if (topic === "market") {
		const [listings, shops] = await read([database.prepare(MARKET_LISTINGS_SQL), database.prepare(SHARED_SHOPS_SQL)]);
		return {
			listings: listings.results,
			shops: shops.results
		};
	}
	if (topic === "settings") {
		const [game, economy, combat, prices] = await read([
			database.prepare(GAME_SETTINGS_SQL),
			database.prepare(ECONOMY_SETTINGS_SQL),
			database.prepare(COMBAT_SETTINGS_SQL),
			database.prepare("SELECT prices_json FROM premium_shop_settings WHERE id=1")
		]);
		return {
			settings: colDecor453.projectSettings({...DEFAULT_SETTINGS,...game.results[0],...economy.results[0],...combat.results[0]},scope.area,scope.arenaMatchId),
            projectSettings502:(area502,arena502)=>colDecor453.projectSettings({...DEFAULT_SETTINGS,...game.results[0],...economy.results[0],...combat.results[0]},area502,arena502),
			halloweenEvent456:halloweenEventView456(game.results[0]?.events_json),premiumPrices: parseMarketPrices(prices.results[0]?.prices_json),
			eventIsland:globalThis.__colEventIsland444?.public(scope.channel)??{enabled:false,activeKinds:[]},
 runeBonusPerLevel:globalThis.__colRunes?.settings().config.bonusPerLevel??.2,runeV2:{enabled:globalThis.__colRuneV2?.settings().config.enabled===true,revision:globalThis.__colRuneV2?.settings().revision??0},
 ranks: rankService()?.settings() ?? null,
			dragon: dragonService()?.settings() ?? null
		};
	}
	throw Error("Unknown shared world topic");
}
var lastSlowWorldLogAt = -Infinity;
async function GET$1(request) {
	const started = performance.now();
	let previous = started;
	const stages = [];
	const mark = (stage) => {
		const now = performance.now();
		stages.push({
			stage,
			ms: Math.round(now - previous)
		});
		previous = now;
	};
	const mode = new URL(request.url).searchParams;
	db().worldPush?.read(mode.has("combat") ? "combat" : mode.has("compact") ? "compact" : mode.has("owner") ? "owner" : "full");
	const response = await readWorld(request, mark, null, false, (stage, ms) => stages.push({stage, ms: Math.round(ms * 1000) / 1000}));
	mark("response");
	const totalMs = Math.round(performance.now() - started);
	response.headers.set("Server-Timing", [...stages.map((s) => `${s.stage};dur=${s.ms}`), `total;dur=${totalMs}`].join(", "));
	if (totalMs >= 200 && performance.now() - lastSlowWorldLogAt >= 5e3) {
		lastSlowWorldLogAt = performance.now();
		const params = new URL(request.url).searchParams;
		console.info("world_timing", JSON.stringify({
			mode: params.get("combat") === "1" ? "combat" : params.get("compact") === "1" ? "compact" : "full",
			status: response.status,
			totalMs,
			stages
		}));
	}
	return response;
}
async function readOwnerFields441(database, playerId, now, nowMs, channel, area, tables) {
 const allowed=new Set(['player_cauldron488','players','world_drops','player_items','player_storage_items','player_stones','player_pets','dungeon_materials','dungeon_wings','normal_reward_claims']);
 if(area==='arena'||!Array.isArray(tables)||!tables.length||tables.some(table=>!allowed.has(table)))return null;
 const dirty=new Set(tables),names=['world','players'];
 const queries=[
  database.prepare("SELECT health, updated_at, layout_version, cycle, reset_at, guardian_reward_at FROM world_state WHERE id = 1"),
  database.prepare(OWNER_PLAYER_SQL).bind(playerId, now - 30, playerId, channel, area, playerId, playerId)
 ];
 const add=(table,name,sql,args=[playerId])=>{if(dirty.has(table)){names.push(name);queries.push(database.prepare(sql).bind(...args));}};
 add('player_items','inventory',"SELECT id, player_id, kind, item_name, rarity, power, role, enchantments, equipped, created_at, expires_at_ms, sale_locked499 FROM player_items WHERE player_id = ? ORDER BY equipped DESC, CASE rarity WHEN 'emerald' THEN 7 WHEN 'infinite' THEN 6 WHEN 'unique' THEN 5 WHEN 'purple' THEN 4 WHEN 'red' THEN 3 WHEN 'orange' THEN 2 WHEN 'blue' THEN 1 ELSE 0 END DESC, created_at DESC");
 add('player_storage_items','storageItems',"SELECT id, player_id, slot, kind, item_name, rarity, power, role, enchantments, created_at FROM player_storage_items WHERE player_id = ? ORDER BY slot");
 add('player_stones','stones',"SELECT kind,amount FROM player_stones WHERE player_id=? ORDER BY kind");
 add('player_pets','pets',"SELECT kind,name,equipped,acquired_at FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() ORDER BY acquired_at");
 add('dungeon_materials','dungeonMaterials',"SELECT kind,amount FROM dungeon_materials WHERE player_id=?");
 add('dungeon_wings','dungeonWings',"SELECT equipped FROM dungeon_wings WHERE player_id=?");
 add('world_drops','drops',DROPS_SQL,[playerId,now,area,area,area,area,area]);
 const started=Date.now();
 const results=await (database.readWorldSnapshot?database.readWorldSnapshot(queries,{projection:{playersIndex:1,ownerId:playerId,roomRoster:false}}):database.batch(queries));
 const fields={ownerOnly:true,partial:false,serverTime:now,snapshotAtMs:results.snapshotAtMs??started,channel,area};
 for(let index=0;index<names.length;index++){
  const name=names[index],rows=results[index].results;
  fields[name]=name==='world'?rows[0]:name==='players'?(results.playersProjected?rows:withRankPlayers(rows,playerId)):name==='dungeonWings'?(rows[0]??null):name==='drops'?(dragonService()?.describeDrops?.(rows)??rows):rows;
 }
 if(dirty.has('player_cauldron488'))fields.cauldron488=globalThis.__colCauldron488.compact(playerId);
 return fields;
}
async function readMarketShop506(database,playerId,requested){
 if(!playerId)return Response.json({error:'Oyuncu oturumu gerekli.'},{status:403});
 if(requested!=='own'&&!/^[A-Za-z0-9_-]{1,128}$/.test(requested))return Response.json({error:'Pazar bulunamadı.'},{status:400});
 const selected=requested==='own'?'':requested;
 const fields='id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments, amount, price_gems, created_at';
 const visible="s.active=1 AND s.created_at>CAST(strftime('%s','now') AS INTEGER)-172800 AND v.area='bazaar' AND s.channel=v.channel";
 const queries=[
  database.prepare('SELECT id,channel,area,realtime_scope_version FROM players WHERE id=?').bind(playerId),
  database.prepare('SELECT '+fields+' FROM market_listings WHERE seller_id=? ORDER BY created_at DESC,id LIMIT 24').bind(playerId),
  database.prepare('SELECT s.id,s.owner_id,s.owner_name,s.name,s.channel,s.active,s.created_at FROM market_shops s JOIN players v ON v.id=? WHERE s.id=? AND '+visible+' LIMIT 1').bind(playerId,selected),
  database.prepare('SELECT '+fields.split(', ').map(f=>'l.'+f).join(', ')+' FROM market_listings l JOIN market_shops s ON s.id=l.shop_id JOIN players v ON v.id=? WHERE s.id=? AND '+visible+' ORDER BY l.created_at DESC,l.id LIMIT 24').bind(playerId,selected)
 ];
 const rows=await(database.readWorldSnapshot?database.readWorldSnapshot(queries):database.batch(queries));
 if(database.worldReadFenceEnabledR13?.())await database.worldReadDurableR13();
 const viewer=rows[0].results[0];
 if(!viewer)return Response.json({error:'Oyuncu oturumu gerekli.'},{status:403});
 if(selected&&!rows[2].results[0])return Response.json({error:'Pazar kapandı veya bu kanalda erişilemiyor.'},{status:404,headers:{'Cache-Control':'no-store'}});
 return Response.json({marketShop506:true,playerId:viewer.id,channel:viewer.channel,area:viewer.area,scopeVersion:Number(viewer.realtime_scope_version??0),shopId:selected,shop:rows[2].results[0]??null,ownListings:rows[1].results,listings:rows[3].results},{headers:{'Cache-Control':'no-store'}});
}
async function readWorld(request, mark, ownerTables441 = null, internal465 = false, observeR15 = () => {}) {
	const requestStartedAtMs = Date.now();
	try {
		const auth = await requireGameSession(request);
		mark("session");
		const requestUrl = new URL(request.url);
		const compact = requestUrl.searchParams.get("compact") === "1";
		const combat = requestUrl.searchParams.get("combat") === "1";
		const ownerOnly = !compact && !combat && requestUrl.searchParams.get("owner") === "1";
		await ensureWorldSeed();
		const database = db();
		const now = nowSeconds$1();
		const nowMs = Date.now();
		const playerId = auth.player?.id ?? "";
  if(requestUrl.searchParams.has("marketShop506"))return await readMarketShop506(database,playerId,requestUrl.searchParams.get("marketShop506"));
		const respond = async (data) => {
   let friends487=null;
   if(!compact&&!combat&&!ownerOnly&&playerId)data={...data,cauldron488:globalThis.__colCauldron488.compact(playerId,data.settings)};
   if(!compact&&!combat&&!ownerOnly&&playerId){friends487=await readFriends487(database,playerId);data={...data,friends:friendsView487(friends487,now),friendRequests:await readFriendRequests490(database,playerId)};if(internal465&&database.worldPush?.subscribers.has(playerId))database.worldPush.seedFriends487(playerId,friends487);}
   const decorateStartedR15 = performance.now();
   // V502: last 20 durable public world messages survive entry; other scopes retain their existing entry fences.
   if(Array.isArray(data.chat))data={...data,chat:data.chat.filter(message=>message.scope==='world'||message.id>(auth.gamePresence?.chatAfterId??0))};
      if(data.area==='arena'&&data.arenaMatch&&Number.isSafeInteger(data.arenaMatch.ownerScopeVersion)&&Array.isArray(data.players))data={...data,players:data.players.map(p=>p.id===playerId?{...p,realtime_scope_version:data.arenaMatch.ownerScopeVersion}:p)};
   if(!combat&&!ownerOnly&&playerId&&Array.isArray(data.players)){const ownCore464=await database.prepare("SELECT COALESCE((SELECT json_object('id',s.puzzle_id,'area',s.area,'channel',s.channel,'template',s.template,'choices',json_array(json_object('id','a','shape',(s.template+3-s.correct_slot)%3),json_object('id','b','shape',(s.template+4-s.correct_slot)%3),json_object('id','c','shape',(s.template+5-s.correct_slot)%3)),'expiresAt',s.expires_at,'test',json(CASE WHEN s.test=1 THEN 'true' ELSE 'false' END),'xp',s.xp,'essence',s.essence) FROM broken_core_state464 s JOIN broken_core_settings464 c ON c.id=1 WHERE s.player_id=p.id AND s.puzzle_id<>'' AND s.expires_at>unixepoch()*1000 AND s.area=p.area AND s.channel=p.channel AND s.scope_version=p.realtime_scope_version AND p.hp>0 AND p.arena_match_id='' AND NOT EXISTS(SELECT 1 FROM dungeon_members WHERE player_id=p.id) AND NOT EXISTS(SELECT 1 FROM pve_engagements e JOIN monsters b ON b.id=e.monster_id WHERE e.player_id=p.id AND (b.is_boss=1 OR b.id='frozen-boss-1' OR b.id='ancient-boss-1' OR b.id='dragon-world-1' OR b.id LIKE 'frozen-water-c%' OR b.id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1')) AND b.hp>0) AND s.config_revision=c.revision AND NOT EXISTS(SELECT 1 FROM guild_members gm JOIN guild_war_locks gl ON gl.guild_id=gm.guild_id WHERE gm.player_id=p.id) AND (s.test=1 OR c.enabled=1)),'') AS broken_core464 FROM players p WHERE p.id=?").bind(playerId).first();data={...data,players:data.players.map(p=>p.id===playerId?{...p,broken_core464:ownCore464?.broken_core464??""}:p)};}
   data={...data,maintenance438:globalThis.__colRealm?.maintenance?.view(auth.account.id)??null,maintenanceRevision491:globalThis.__colRealm?.maintenance?.policy?.revision??0};
   if (data.settings) data = {...data,halloweenEvent456:halloweenEventView456(data.settings.events_json),settings:colDecor453.projectSettings(data.settings,data.area,data.arenaMatch?.id)};
   observeR15("world_decorate", performance.now() - decorateStartedR15);
   const subscribeStartedR15 = performance.now();
			if (requestUrl.searchParams.get("push") === "1" && !compact && !combat && !ownerOnly) {
				const push = database.worldPush;
				if (push) {
					const url = new URL(request.url);
					url.search = "";
					const auditRequest = new Request(url, { headers: request.headers });
					colLabHttpAuth.trustWorldRequest(request, auditRequest, auth);
					const ownerUrl = new URL(url);
					ownerUrl.searchParams.set("owner", "1");
					const ownerRequest = new Request(ownerUrl, { headers: request.headers });
					colLabHttpAuth.trustWorldRequest(request, ownerRequest, auth);
					data = await push.subscribe({
            friends487,
						auth,
						request,
						data,
						readShared: (topic, scope) => readSharedWorld(database, topic, scope),
						readBossLeaders: async () => (await database.prepare(BOSS_LEADERS_SQL).all()).results,
						// Internal callbacks keep all fresh authorization and owner SQL guards.
						// Only the redundant HTTP JSON encode/decode is omitted.
						readOwner: (tables) => readWorld(ownerRequest, () => {}, tables, true),
						read: () => readWorld(auditRequest, () => {}, null, true)
					});
				} else data = {
					...data,
					worldPush: { enabled: false }
				};
			}
   observeR15("world_subscribe", performance.now() - subscribeStartedR15);
   const durableStartedR15 = performance.now();
      if(database.worldReadFenceEnabledR13?.())await database.worldReadDurableR13();
   observeR15("world_durable_fence", performance.now() - durableStartedR15);
   const encodeStartedR15 = performance.now();
			const resultR15 = internal465 ? data : Response.json(data);
   observeR15("world_encode", performance.now() - encodeStartedR15);
   return resultR15;
		};
		if(auth.playerAccess?.area==='rune_v2')await colRepairRuneV2Access(database,playerId);if(auth.playerAccess?.area==='rune')await colRepairRuneAccess(database,playerId);
if (auth.playerAccess?.area === "ancient") await repairAncientAccess(database, playerId);
		await repairFrozenLevelInvariant(database, playerId, auth.account.id, auth.playerAccess, nowMs);
		mark("prepare");
		if (combat) {
			const { snapshot: [snapshotMeta, players, monsters, combatEvents], arenaPayload, snapshotAtMs, playersProjected } = await worldBatch(database, playerId, nowMs, [
				database.prepare(`SELECT world.cycle, player.channel, player.area FROM world_state world
           LEFT JOIN players player ON player.id = ? WHERE world.id = 1`).bind(playerId),
				database.prepare(REALTIME_PLAYERS_SQL).bind(playerId, now - 30, playerId),
				database.prepare(REALTIME_MONSTERS_SQL).bind(playerId),
				database.prepare(COMBAT_EVENTS_SQL).bind(playerId, requestStartedAtMs - 2200)
			]);
			const meta = snapshotMeta.results[0];
			mark("snapshot");
			return respond({
				serverTime: now,
				snapshotAtMs,
				cycle: Number(meta?.cycle ?? 0),
				channel: Number(meta?.channel ?? 1),
				area: String(meta?.area ?? "bazaar"),
				players: players.results,
				monsters: monsters.results.filter(m=>colLabCanSeeMonster(playerId,m)),
				combatEvents: combatEvents.results.filter(e=>colLabCanSeeCombat(playerId,e)).reverse(),
				...arenaPayload
			});
		}
		const viewer = playerId ? await database.prepare("SELECT p.channel, p.area, p.arena_match_id, pm.party_id FROM players p LEFT JOIN party_members pm ON pm.player_id = p.id WHERE p.id = ?").bind(playerId).first() : null;
		const channel = viewer?.channel ?? 1;
		const area = viewer?.area ?? "bazaar";
		const regionalArea = area === "arena" && viewer?.arena_match_id ? `arena:${viewer.arena_match_id}` : area;
		if (ownerOnly) {
   const selected441=await readOwnerFields441(database,playerId,now,nowMs,channel,area,ownerTables441);
   if(selected441){mark("snapshot");return respond(selected441);}
			const { snapshot: [world, players, inventory, storageItems, stones, pets, dungeonMaterials, dungeonWings, drops], arenaPayload, snapshotAtMs, playersProjected } = await worldBatch(database, playerId, nowMs, [
				database.prepare("SELECT health, updated_at, layout_version, cycle, reset_at, guardian_reward_at FROM world_state WHERE id = 1"),
				database.prepare(OWNER_PLAYER_SQL).bind(playerId, now - 30, playerId, channel, area, playerId, playerId),
				database.prepare("SELECT id, player_id, kind, item_name, rarity, power, role, enchantments, equipped, created_at, expires_at_ms, sale_locked499 FROM player_items WHERE player_id = ? ORDER BY equipped DESC, CASE rarity WHEN 'emerald' THEN 7 WHEN 'infinite' THEN 6 WHEN 'unique' THEN 5 WHEN 'purple' THEN 4 WHEN 'red' THEN 3 WHEN 'orange' THEN 2 WHEN 'blue' THEN 1 ELSE 0 END DESC, created_at DESC").bind(playerId),
				database.prepare("SELECT id, player_id, slot, kind, item_name, rarity, power, role, enchantments, created_at FROM player_storage_items WHERE player_id = ? ORDER BY slot").bind(playerId),
				database.prepare("SELECT kind,amount FROM player_stones WHERE player_id=? ORDER BY kind").bind(playerId),
				database.prepare("SELECT kind,name,equipped,acquired_at FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() ORDER BY acquired_at").bind(playerId),
				database.prepare("SELECT kind,amount FROM dungeon_materials WHERE player_id=?").bind(playerId),
				database.prepare("SELECT equipped FROM dungeon_wings WHERE player_id=?").bind(playerId),
				database.prepare(DROPS_SQL).bind(playerId, now, area, area, area, area, area)
			], true);
			mark("snapshot");
			return respond({
				ownerOnly: true,
				partial: false,
				serverTime: now,
				snapshotAtMs,
				world: world.results[0],
				channel,
				area,
				players: playersProjected ? players.results : withRankPlayers(players.results, playerId),
				inventory: inventory.results,
				storageItems: storageItems.results,
				stones: stones.results,
				pets: pets.results,
				dungeonMaterials: dungeonMaterials.results,
				dungeonWings: dungeonWings.results[0] ?? null,
				drops: dragonService()?.describeDrops?.(drops.results) ?? drops.results,
				...arenaPayload
			});
		}
		if (compact) {
			const { snapshot: [world, players, monsters, drops, combatEvents, online, settingsResult, economySettingsResult, combatSettingsResult, bossLeaders, regionalMessages, chat], arenaPayload, snapshotAtMs, playersProjected } = await worldBatch(database, playerId, nowMs, [
				database.prepare("SELECT health, updated_at, layout_version, cycle, reset_at, guardian_reward_at FROM world_state WHERE id = 1"),
				database.prepare(ACTIVE_PLAYERS_SQL).bind(now - 30, playerId, channel, area, playerId, playerId),
				database.prepare(MONSTERS_SQL).bind(area, channel),
				database.prepare(DROPS_SQL).bind(playerId, now, area, area, area, area, area),
				database.prepare(COMBAT_EVENTS_SQL).bind(playerId, requestStartedAtMs - 2200),
				database.prepare("SELECT COUNT(*) AS count FROM players WHERE last_seen >= ?").bind(now - 30),
				database.prepare(GAME_SETTINGS_SQL),
				database.prepare(ECONOMY_SETTINGS_SQL),
				database.prepare(COMBAT_SETTINGS_SQL),
				database.prepare(BOSS_LEADERS_SQL),
				database.prepare(REGIONAL_CHAT_SQL).bind(regionalArea, channel, now - 5, auth.gamePresence?.chatAfterId ?? 0),
				database.prepare(WORLD_CHAT_SQL).bind(regionalArea, channel, auth.gamePresence?.chatAfterId ?? 0)
			], true, true);
			const worldRow = world.results[0];
			const onlineRow = online.results[0];
			const boss = monsters.results.find((entry) => Number(entry.is_boss) === 1 && !colLabIsMonster(entry.id));
			mark("snapshot");
			return respond({
				serverTime: now,
				snapshotAtMs,
				world: worldRow ?? {
					health: 64,
					updated_at: now,
					layout_version: 17,
					cycle: 1,
					reset_at: 0,
					guardian_reward_at: now + 3600
				},
				players: playersProjected ? players.results : withRankPlayers(players.results, playerId),
				eventIsland:globalThis.__colEventIsland444?.public(channel)??{enabled:false,activeKinds:[]},
 runeBonusPerLevel:globalThis.__colRunes?.settings().config.bonusPerLevel??.2,runeV2:{enabled:globalThis.__colRuneV2?.settings().config.enabled===true,revision:globalThis.__colRuneV2?.settings().revision??0},
 ranks: rankService()?.settings() ?? null,
				dragon: dragonService()?.settings() ?? null,
				monsters: monsters.results.filter(m=>colLabCanSeeMonster(playerId,m)),
				drops: dragonService()?.describeDrops?.(drops.results) ?? drops.results,
				combatEvents: combatEvents.results.filter(e=>colLabCanSeeCombat(playerId,e)).reverse(),
				channel,
				area,
				totalOnline: onlineRow?.count ?? players.results.length,
				bossNextAt: boss && Number(boss.hp) <= 0 ? Number(boss.respawn_at) : 0,
				bossEndsAt: boss && Number(boss.hp) > 0 ? Number(boss.despawn_at) : 0,
				settings: {
					...DEFAULT_SETTINGS,
					...settingsResult.results[0] ?? {},
					...economySettingsResult.results[0] ?? {},
					...combatSettingsResult.results[0] ?? {}
				},
				...stoneBossFields476(bossLeaders.results,area,channel,monsters.results,playerId),
				regionalMessages: regionalMessages.results,
				chat: [...chat.results].reverse(),
				...arenaPayload,
				partial: true
			});
		}
		const membership = viewer?.party_id ? { party_id: viewer.party_id } : null;
		const playerQuery = database.prepare(ownerOnly ? OWNER_PLAYER_SQL : ACTIVE_PLAYERS_SQL).bind(...ownerOnly ? [playerId] : [], now - 30, playerId, channel, area, playerId, playerId);
		const { snapshot: [world, players, monsters, leaders, chat, directMessages, drops, inventory, storageItems, stones, pets, dungeonMaterials, dungeonWings, online, shops, listings, partyMembers, partyInvite, combatEvents, settingsResult, economySettingsResult, combatSettingsResult, bossLeaders, regionalMessages, marketPricesResult], arenaPayload, snapshotAtMs, playersProjected } = await worldBatch(database, playerId, nowMs, [
			database.prepare("SELECT health, updated_at, layout_version, cycle, reset_at, guardian_reward_at FROM world_state WHERE id = 1"),
			playerQuery,
			database.prepare(MONSTERS_SQL).bind(area, channel),
			database.prepare(area === "war" ? "SELECT p.name,p.role,COUNT(*) AS contribution FROM war_kill_claims k JOIN players p ON p.id=k.killer_id WHERE p.loadlab_run_id = '' AND k.created_at_ms >= (CAST(strftime('%s','now','+3 hours','start of day','-3 hours') AS INTEGER)*1000) GROUP BY p.id ORDER BY contribution DESC,p.name ASC LIMIT 5" : "SELECT name, role, contribution FROM players WHERE loadlab_run_id = '' AND contribution > 0 ORDER BY contribution DESC, name ASC LIMIT 5"),
			database.prepare(WORLD_CHAT_SQL).bind(regionalArea, channel, auth.gamePresence?.chatAfterId ?? 0),
			database.prepare(`SELECT m.id, m.player_id, m.player_name, m.recipient_id, m.item_snapshot, m.body, m.created_at,
          COALESCE(recipient.name, '') AS recipient_name FROM messages m
          LEFT JOIN players recipient ON recipient.id = m.recipient_id
          LEFT JOIN direct_message_dismissals dismissal
            ON dismissal.player_id = ?
           AND dismissal.peer_id = CASE WHEN m.player_id = ? THEN m.recipient_id ELSE m.player_id END
         WHERE m.recipient_id IS NOT NULL AND (m.player_id = ? OR m.recipient_id = ?)
           AND m.id > COALESCE(dismissal.dismissed_through_id, 0) AND m.id > ?
         ORDER BY m.id DESC LIMIT 40`).bind(playerId, playerId, playerId, playerId, auth.gamePresence?.chatAfterId ?? 0),
			database.prepare(DROPS_SQL).bind(playerId, now, area, area, area, area, area),
			database.prepare("SELECT id, player_id, kind, item_name, rarity, power, role, enchantments, equipped, created_at, expires_at_ms, sale_locked499 FROM player_items WHERE player_id = ? ORDER BY equipped DESC, CASE rarity WHEN 'emerald' THEN 7 WHEN 'infinite' THEN 6 WHEN 'unique' THEN 5 WHEN 'purple' THEN 4 WHEN 'red' THEN 3 WHEN 'orange' THEN 2 WHEN 'blue' THEN 1 ELSE 0 END DESC, created_at DESC").bind(playerId),
			database.prepare("SELECT id, player_id, slot, kind, item_name, rarity, power, role, enchantments, created_at FROM player_storage_items WHERE player_id = ? ORDER BY slot").bind(playerId),
			database.prepare("SELECT kind,amount FROM player_stones WHERE player_id=? ORDER BY kind").bind(playerId),
			database.prepare("SELECT kind,name,equipped,acquired_at FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() ORDER BY acquired_at").bind(playerId),
			database.prepare("SELECT kind,amount FROM dungeon_materials WHERE player_id=?").bind(playerId),
			database.prepare("SELECT equipped FROM dungeon_wings WHERE player_id=?").bind(playerId),
			database.prepare("SELECT COUNT(*) AS count FROM players WHERE last_seen >= ?").bind(now - 30),
			database.prepare(`SELECT id, owner_id, owner_name, name, x, y, channel, active, created_at, (SELECT stall_skin_enabled FROM players WHERE players.id=market_shops.owner_id) AS stall_skin_enabled, ((SELECT COUNT(*) FROM market_listings WHERE shop_id=market_shops.id)+(SELECT COUNT(*) FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))) AS stock_count502
         FROM market_shops
         WHERE channel = ? AND active = 1 AND created_at>CAST(strftime('%s','now') AS INTEGER)-172800
           AND (owner_id = ? OR EXISTS (SELECT 1 FROM market_listings WHERE shop_id = market_shops.id) OR EXISTS(SELECT 1 FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER))))
         ORDER BY created_at`).bind(channel, playerId),
			database.prepare(MARKET_LISTINGS_SQL),
			database.prepare(`SELECT p.id, p.name, p.role, p.hp, p.max_hp, p.level, p.area, p.channel, p.last_seen, p.x, p.y, p.arena_match_id, p.movement_checked_at_ms, p.last_monster_hit_at, party.leader_id
         FROM party_members pm JOIN players p ON p.id = pm.player_id JOIN parties party ON party.id = pm.party_id
         WHERE pm.party_id = ? ORDER BY pm.joined_at`).bind(membership?.party_id ?? ""),
			database.prepare(`SELECT pi.sender_id, p.name AS sender_name, pi.created_at FROM party_invites pi
         JOIN players p ON p.id = pi.sender_id WHERE pi.recipient_id = ? AND pi.created_at >= ?`).bind(playerId, now - 120),
			database.prepare(COMBAT_EVENTS_SQL).bind(playerId, requestStartedAtMs - 2200),
			database.prepare(GAME_SETTINGS_SQL),
			database.prepare(ECONOMY_SETTINGS_SQL),
			database.prepare(COMBAT_SETTINGS_SQL),
			database.prepare(BOSS_LEADERS_SQL),
			database.prepare(REGIONAL_CHAT_SQL).bind(regionalArea, channel, now - 5, auth.gamePresence?.chatAfterId ?? 0),
			database.prepare("SELECT prices_json FROM premium_shop_settings WHERE id=1")
		], true, !ownerOnly);
		const worldRow = world.results[0];
		const onlineRow = online.results[0];
		const settings = {
			...DEFAULT_SETTINGS,
			...settingsResult.results[0] ?? {},
			...economySettingsResult.results[0] ?? {},
			...combatSettingsResult.results[0] ?? {}
		};
		const boss = monsters.results.find((entry) => Number(entry.is_boss) === 1 && !colLabIsMonster(entry.id));
		mark("snapshot");
		return respond({
			serverTime: now,
			snapshotAtMs,
			world: worldRow ?? {
				health: 64,
				updated_at: now,
				layout_version: 17,
				cycle: 1,
				reset_at: 0,
				guardian_reward_at: now + 3600
			},
			players: playersProjected ? players.results : withRankPlayers(players.results, playerId),
			eventIsland:globalThis.__colEventIsland444?.public(channel)??{enabled:false,activeKinds:[]},
 runeBonusPerLevel:globalThis.__colRunes?.settings().config.bonusPerLevel??.2,runeV2:{enabled:globalThis.__colRuneV2?.settings().config.enabled===true,revision:globalThis.__colRuneV2?.settings().revision??0},
 ranks: rankService()?.settings() ?? null,
			dragon: dragonService()?.settings() ?? null,
			monsters: monsters.results.filter(m=>colLabCanSeeMonster(playerId,m)),
			drops: dragonService()?.describeDrops?.(drops.results) ?? drops.results,
			premiumPrices: parseMarketPrices(marketPricesResult.results[0]?.prices_json),
			inventory: inventory.results,
			storageItems: storageItems.results,
			stones: stones.results,
			pets: pets.results,
			starterReward: playerId ? await globalThis.__colStarterReward?.grant(auth.account.id, playerId) ?? null : null,
			dungeonMaterials: dungeonMaterials.results,
			dungeonWings: dungeonWings.results[0] ?? null,
			shops: shops.results,
			listings: listings.results,
			leaders: leaders.results,
			...stoneBossFields476(bossLeaders.results,area,channel,monsters.results,playerId),
			regionalMessages: regionalMessages.results,
			chat: [...chat.results].reverse(),
			directMessages: [...directMessages.results].reverse(),
			party: partyView486(membership?.party_id,partyMembers.results,playerId,now),
			partyInvite: partyInvite.results[0] ?? null,
			combatEvents: combatEvents.results.filter(e=>colLabCanSeeCombat(playerId,e)).reverse(),
			channel,
			area,
			totalOnline: onlineRow?.count ?? players.results.length,
			bossNextAt: boss && Number(boss.hp) <= 0 ? Number(boss.respawn_at) : 0,
			bossEndsAt: boss && Number(boss.hp) > 0 ? Number(boss.despawn_at) : 0,
			...arenaPayload,
			partial: false,
			ownerOnly,
			settings
		});
	} catch (error) {
		const response = error instanceof AuthRequestError ? authErrorResponse(error) : errorResponse(error);
		return internal465 ? null : response;
	}
}
//#endregion
//#region app/api/realtime/ticket/route.ts
async function POST$2(request) {
	try {
		const session = await requireGameSession(request);
		await assertCsrf(request, session);
		const body = await request.json().catch(() => ({}));
		await enforceRateLimit("realtime-ticket", session.account.id, {
			limit: 30,
			windowSeconds: 60,
			blockSeconds: 60
		}, colLabHttpAuth.rateLimitContext(request, session));
		if (!session.player) return Response.json({ error: "Önce karakterini oluşturmalısın." }, {
			status: 404,
			headers: noStoreHeaders()
		});
		const fallbackAvailable = hasDurableRealtimeTransport();
		if (!hasRealtimeSigningKey() && !fallbackAvailable) return Response.json({ error: "Dedicated gerçek-zaman sunucusu henüz etkin değil." }, {
			status: 503,
			headers: noStoreHeaders()
		});
		if (!hasRealtimeSigningKey()) return Response.json({
			dedicatedAvailable: false,
			fallbackAvailable
		}, { headers: noStoreHeaders() });
		await ensureWorldSeed();
		const database = db();
		if(session.playerAccess?.area==='rune_v2')await colRepairRuneV2Access(database,session.player.id);if(session.playerAccess?.area==='rune')await colRepairRuneAccess(database,session.player.id);
if (session.playerAccess?.area === "ancient") await repairAncientAccess(database, session.player.id);
		const loadCurrentPlayer = () => database.prepare(`SELECT p.id, p.name, p.role, p.is_gm, p.gm_invisible, p.gm_visibility_revision, p.x, p.y, p.hp, p.max_hp, p.hp_revision, p.respawn_at_ms,p.root_until_ms,p.stun_until_ms,
        p.area, p.channel, p.level, p.arena_match_id, COALESCE(w.cycle, 1) AS cycle,
        COALESCE(mp.team, 0) AS arena_team, COALESCE(m.starts_at_ms, 0) AS arena_starts_at_ms,
        COALESCE(m.status, '') AS arena_status, p.realtime_scope_version, p.position_revision,
        s.expires_at AS session_expires_at, presence.expires_at_ms AS presence_expires_at_ms
       FROM players p
       JOIN auth_sessions s ON s.account_id = p.account_id AND s.token_hash = ?
       JOIN accounts a ON a.id = p.account_id
       JOIN game_presence presence ON presence.account_id = a.id AND presence.token_hash = s.token_hash
       CROSS JOIN world_state w
       LEFT JOIN arena_match_players mp ON mp.match_id = p.arena_match_id AND mp.player_id = p.id
       LEFT JOIN arena_matches m ON m.id = p.arena_match_id
       WHERE p.id = ? AND p.account_id = ? AND w.id = 1
         AND s.security_version = ? AND s.security_version = a.security_version
         AND s.expires_at > ? AND a.permanently_banned = 0 AND a.suspended_until_ms <= ?
         AND presence.instance_id = ? AND presence.expires_at_ms > ?
       LIMIT 1`).bind(session.tokenHash, session.player.id, session.account.id, session.securityVersion, Math.floor(Date.now() / 1e3), Date.now(), session.gamePresence.instanceId, Date.now()).first();
		let player = await loadCurrentPlayer();
		if (!player) return Response.json({ error: "Karakter oturumu doğrulanamadı." }, {
			status: 409,
			headers: noStoreHeaders()
		});
		if (!/^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(player.area)) return Response.json({ error: "Karakter bölgesi geçersiz." }, {
			status: 409,
			headers: noStoreHeaders()
		});
		if (player.area === "frozen" && player.level < 20) return Response.json({ error: `Donmuş Çam Geçidi 20. seviyede açılır.` }, {
			status: 403,
			headers: noStoreHeaders()
		});
		if (player.area === "arena" && (!/^[A-Za-z0-9-]{8,64}$/.test(player.arena_match_id) || ![1, 2].includes(Number(player.arena_team)) || !["countdown", "active"].includes(player.arena_status))) return Response.json({ error: "Arena odası henüz hazır değil." }, {
			status: 409,
			headers: noStoreHeaders()
		});
		const checkedArea = player.area;
		player = await loadCurrentPlayer();
		if (!player || player.area !== checkedArea) return Response.json({
			error: "Gerçek-zaman kapsamı değişti; bağlantıyı yenile.",
			code: "realtime_scope_changed"
		}, {
			status: 409,
			headers: noStoreHeaders()
		});
		if (body && body.area !== void 0 && (body.area !== player.area || body.channel !== player.channel || body.cycle !== player.cycle || player.area === "arena" && body.arenaMatchId !== player.arena_match_id)) return Response.json({
			error: "Harita değişti; bağlantı yeni bölgeye kurulacak.",
			code: "realtime_scope_changed"
		}, {
			status: 409,
			headers: noStoreHeaders()
		});
		if (player.area === "frozen" && player.level < 20) return Response.json({ error: `Donmuş Çam Geçidi 20. seviyede açılır.` }, {
			status: 403,
			headers: noStoreHeaders()
		});
		if (player.area === "arena" && (!/^[A-Za-z0-9-]{8,64}$/.test(player.arena_match_id) || ![1, 2].includes(Number(player.arena_team)) || !["countdown", "active"].includes(player.arena_status))) return Response.json({ error: "Arena odası artık geçerli değil." }, {
			status: 409,
			headers: noStoreHeaders()
		});
		try { const ticketPreparationR12 = colLabHttpAuth.prepareTicketR12(request, session, realmRuntime()); if (ticketPreparationR12) await ticketPreparationR12; }
    catch (errorR12) { throw new AuthRequestError(403, safeLoadLabAuthCodeR12(errorR12), "Test hesabı doğrulanamadı."); }
		const issuedAtMs = Date.now();
		const issuedAt = Math.floor(issuedAtMs / 1e3);
		const launchDeadline = globalThis.__colLaunch?.deadline(session.account.id) ?? Infinity;
		const botCheckAtMs = globalThis.__colBotCheck?.deadline(session.account.id,true) ?? 0;
		if (botCheckAtMs && botCheckAtMs <= issuedAtMs + 1e3) return Response.json({
			error: "Oyuncu doğrulaması gerekli.",
			code: "bot_check_required"
		}, {
			status: 403,
			headers: noStoreHeaders()
		});
		const guildDeadline = globalThis.__colGuildVillage?.deadline(player.id, player.area) ?? Infinity;
		const hallDeadline = player.area.startsWith("guild_hall_") ? Math.min(issuedAtMs + 3e4, guildDeadline) : Infinity;
		const expiresAt = Math.min(Math.floor(hallDeadline / 1e3), issuedAt + 30, player.session_expires_at, Math.floor(launchDeadline / 1e3), Math.floor((globalThis.__colBotCheck?.deadline(session.account.id) ?? Infinity) / 1e3));
		const leaseExpiresAt = Math.min(hallDeadline, issuedAtMs + 45e3, player.session_expires_at * 1e3, player.presence_expires_at_ms, launchDeadline);
		if (expiresAt <= issuedAt || leaseExpiresAt <= issuedAtMs) return Response.json({ error: "Oturum süresi doldu." }, {
			status: 401,
			headers: noStoreHeaders()
		});
		const movementGrant = env.CORE_MOVEMENT?.issue(request, session, {
			scopeVersion: player.realtime_scope_version,
			cycle: player.cycle,
			channel: player.channel,
			area: player.area,
			arenaMatchId: player.arena_match_id || ""
		}, runRealtimeMovement);
		const combatGrant = env.CORE_ATTACK_BRIDGE?.issue(request, session, {
			scopeVersion: player.realtime_scope_version,
			cycle: player.cycle,
			channel: player.channel,
			area: player.area,
			arenaMatchId: player.arena_match_id || ""
		}, runRealtimeAttack);
		const ticket = await createRealtimeTicket({
			...colLabHttpAuth.ticketClaims(session),
			...combatGrant ? { combatGrant } : {},
			...movementGrant ? { movementGrant } : {},
			v: 1,
			iss: "coreoflife.net",
			aud: "coreoflife-realtime",
			iat: issuedAt,
			exp: expiresAt,
			jti: crypto.randomUUID(),
			issuedAtMs,
			instanceId: session.gamePresence.instanceId,
			securityVersion: session.securityVersion,
			scopeVersion: Math.max(1, Math.floor(Number(player.realtime_scope_version))),
			positionRevision: Math.max(0, Math.floor(Number(player.position_revision))),
			maintenanceGm492: player.is_gm === 1,
			gmInvisible: player.is_gm === 1 && player.gm_invisible === 1,
			visibilityRevision: Math.max(0, Number(player.gm_visibility_revision) || 0),
			botCheckAtMs,
			leaseExpiresAt,
			playerId: player.id,
			name: player.name,
			role: player.role,
			x: Number(player.x),
			y: Number(player.y),
			hp: Math.max(0, Number(player.hp)),
			maxHp: Math.max(1, Number(player.max_hp)),
			rootUntilMs: Math.max(0, Number(player.root_until_ms)),
			stunUntilMs: Math.max(0, Number(player.stun_until_ms)),
			hpRevision: Math.max(0, Math.floor(Number(player.hp_revision))),
			respawnAtMs: Math.max(0, Math.floor(Number(player.respawn_at_ms))),
			area: player.area,
			channel: Math.max(1, Math.floor(Number(player.channel))),
			cycle: Math.max(1, Math.floor(Number(player.cycle))),
			...player.area === "arena" ? {
				arenaMatchId: player.arena_match_id,
				arenaTeam: Number(player.arena_team),
				arenaStartsAtMs: Number(player.arena_starts_at_ms)
			} : {}
		});
		return Response.json({
			ticket,
			socketUrl: realtimeSocketUrl(),
			expiresAt: expiresAt * 1e3,
			leaseExpiresAt,
			leaseRemainingMs: Math.max(0, leaseExpiresAt - Date.now()),
			dedicatedAvailable: true,
			fallbackAvailable
		}, { headers: noStoreHeaders() });
	} catch (error) {
		return authErrorResponse(error, "Gerçek-zaman bağlantı bileti üretilemedi.");
	}
}
//#endregion
//#region app/api/dungeon/route.ts
var rates = /* @__PURE__ */ new Map();
function rate(id) {
	const now = Date.now(), r = rates.get(id);
	if (!r || now - r.at >= 1e3) {
		rates.set(id, {
			at: now,
			count: 1
		});
		if (rates.size > 1e4) {
			for (const [k, v] of rates) if (now - v.at > 6e4) rates.delete(k);
		}
		return false;
	}
	return ++r.count > 25;
}
async function GET(request) {
	try {
		const auth = await requireGameSession(request);
		if (!auth.player) return Response.json({ error: "Karakter gerekli." }, { status: 409 });
		return Response.json(dungeonService().snapshot(auth.player.id), { headers: noStoreHeaders() });
	} catch (error) {
		if (error instanceof AuthRequestError) return authErrorResponse(error);
		return Response.json({ error: "Zindan bilgisi alınamadı." }, {
			status: 503,
			headers: noStoreHeaders()
		});
	}
}
async function POST$1(request) {
	try {
		const auth = await requireGameSession(request);
		await assertCsrf(request, auth);
		if (!auth.player) return Response.json({ error: "Karakter gerekli." }, { status: 409 });
		if (rate(auth.player.id)) return Response.json({ error: "Biraz bekle." }, { status: 429 });
		const input = await readJsonObject(request, 2048);
		if (input.action === "stream") {
			if (!auth.gamePresence || auth.gamePresence.instanceId !== readGameInstance(request) || auth.gamePresence.tokenHash !== auth.tokenHash || auth.gamePresence.expiresAtMs <= Date.now()) throw new AuthRequestError(409, "game_instance_expired", "Oyun oturumunu yeniden aç.");
			const stream = globalThis.__colDungeonStream;
			if (!stream) throw new Error("Anlık zindan bağlantısı hazır değil.");
			dungeonService();
			const url = new URL(process.env.REALTIME_SOCKET_URL || "wss://realtime.coreoflife.net/ws");
			url.pathname = "/dungeon-ws";
			url.search = process.env.CORE_CHANNEL_ID ? "channel=" + process.env.CORE_CHANNEL_ID : "";
			return Response.json({
				ticket: stream.issue(auth),
				url: url.toString()
			}, { headers: noStoreHeaders() });
		}
		const service = dungeonService(), result = await service.command(auth.player.id, input);
		return Response.json("run" in result ? result : {
			...result,
			...service.snapshot(auth.player.id)
		}, { headers: noStoreHeaders() });
	} catch (error) {
		if (error instanceof AuthRequestError) return authErrorResponse(error);
		const message = error instanceof Error ? error.message : "";
		return Response.json({ error: /(SQLITE|constraint|column|table|bind)/i.test(message) ? "İşlem tamamlanamadı; tekrar dene." : message || "İşlem yapılamadı." }, {
			status: 409,
			headers: noStoreHeaders()
		});
	}
}
//#endregion
export { POST as action, assertCsrf, authErrorResponse, GET as dungeonGet, POST$1 as dungeonPost, ensureWorldSeed, getGameSettings, invalidateGameSettingsCache, requireGameSession, requireRealtimeGameSession, runRealtimeAttack, runRealtimeMovement, tickWorld, POST$2 as ticket, GET$1 as world };

async function colLabPublishAudience(cycle,channel,area,event,arenaMatchId,audience,dedicated=true){
 if(!audience?.length)return false;
 const {__combatAudit:combatAudit,...publicEvent}=event;
 const scopedEvent={...publicEvent,__colLabAudience:{runId:colLabPlayerRun(audience[0]),playerIds:audience}};
 const outcomes=await Promise.all([publishDurableRoomEvent(cycle,channel,area,scopedEvent,arenaMatchId),dedicated?publishDedicatedRoomEvent(cycle,channel,area,scopedEvent,arenaMatchId,combatAudit):false]);
 return outcomes.some(Boolean);
}

// V479 death notice follows the durable HP/gem write, including final arena rounds.
async function colNotifyPvpGemLoss479(player,hit,targetId,hpRevision,nowMs){
 if(!hit||hit.hp>0||!Number.isSafeInteger(hit.pvp_gems_lost479)||hit.pvp_gems_lost479<0)return;
 const loss=hit.pvp_gems_lost479;
 await deliverRealtime(publishRealtimePlayerEvent(player.world_cycle,player.channel,player.area,[targetId],{type:'pvp_gem_loss479',eventId:'pvp-gems479:'+targetId+':'+hpRevision,targetId,hpRevision,pvpGemsLost479:loss,message:`PvP'de yenildin. Mücevherlerinin %5'i (${loss} Mücevher) azaldı.`,serverAt:nowMs},player.arena_match_id||void 0));
}

async function publishRealtimePlayerEvent(cycle,channel,area,audiencePlayerIds,event,arenaMatchId){
 const audience=[...new Set(audiencePlayerIds.filter(id=>/^[A-Za-z0-9_-]{1,80}$/.test(id)))];if(!audience.length)return false;
 const [durable,dedicated]=await Promise.all([publishDurableRoomEvent(cycle,channel,area,{...event,audiencePlayerIds:audience},arenaMatchId),hasRealtimeSigningKey()?deliverDedicatedEvent('/internal/broadcast-players',JSON.stringify({v:1,cycle,audiencePlayerIds:audience,event}),true):false]);return durable||dedicated;
}

async function colEnforceCraftRate485(accountId){const result=await enforceCraftRate485(authDatabase(),await sha256('crafting485:'+accountId));if(!result.allowed)throw new AuthRequestError(429,'craft_rate_limited','İşlem sürüyor; kısa bir an sonra tekrar dene.',Math.max(1,Math.ceil(result.retryAfterMs/1000)));}
