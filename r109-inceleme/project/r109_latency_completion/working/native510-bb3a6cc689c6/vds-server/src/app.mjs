import {ensureEnhancementSchema491,createEnhancement491} from './enhancement-engine491.mjs';
import {ensureEnhancementJewelry491} from './enhancement-jewelry491.mjs';
import {ensureFriendsConsent490} from '../../lib/friends490.mjs';
import {ensurePveMultiSchema489} from './pve-multi489.mjs';
import {ensureCauldronSchema488,createCauldron488} from './cauldron-engine488.mjs';
import {ensureFriendsSchema487} from '../../lib/friends487.mjs';
import {createRuneV2LocalHealthSave485} from './rune-v2-health485.mjs';
import {ensureRuneV2Schema,createRuneV2} from './rune-v2.mjs';
import {ensureRealmLabSchema} from './loadlab/realm-control.mjs';
import {scopeLoadLabDailyRewardTriggers} from './loadlab-writer.mjs';
import {createDailyMonsterReward477} from './daily-monster-reward477.mjs';
import {ensureStoneBoss476} from './stone-boss476.mjs';
import {installSiteVisitRoute457} from './site-visits457.mjs';
import {ensureExpansion456Schema} from './expansion456-schema.mjs';
import {ensureEmeraldStats449} from './emerald-stats449.mjs';
import {ensureEventIsland444,createEventIsland444} from './event-island444.mjs';
import {attachMaintenanceExpiry438} from './maintenance-expiry438.mjs';
import {ensureQuests438Schema,createQuests438} from './quests438.mjs';
import {ensureBattlePassSchema,createBattlePass} from './battle-pass.mjs';
import {ensureStatusSchema,createStatus} from './status.mjs';
import {ensureGameplay425Schema,createMonsterRanking} from './gameplay425.mjs';
import {ensureArenaMarketSchema,createArenaMarket} from './arena-market.mjs';
import {ensureRuneSchema,createRunes} from './runes.mjs';
import {initializeRealmRuntime,installRealmRouteGuard} from './realm-runtime.mjs';
import {WorldPush} from './world-push.mjs';
import {PositionStore,attachPositionStore} from './position-store.mjs';
import {CombatStore,attachCombatStore} from './combat-store.mjs';
import {WorldLoop,attachWorldLoop} from './world-loop.mjs';
import {ensurePearlReset} from './pearl-reset.mjs';
import {ensureWorldCleanupIndexes} from './world-cleanup.mjs';
import {ensureEnchantmentTierSchema} from './enchantment-tier-schema.mjs';
import {ensureDragonSchema,createDragonBoss} from './dragon-boss.mjs';
import {ensureRankSchema,createRanks} from './ranks.mjs';
import {ensureFrozenWaterReach} from './frozen-water-position.mjs';
import {ensureStorageSchema,createStorage} from './storage.mjs';
import {ensureWeaponPowerUpgrade} from './weapon-power-upgrade.mjs';
import {ensureCommunitySchema,createCommunityEvent} from './community-event.mjs';
import {retireDiagnosticStorage} from './retire-diagnostics.mjs';
import {ensureTradeSchema,PlayerTrade} from './player-trade.mjs';
import {ensureV283World} from './v283-world.mjs';
import {ensureEvolutionQuestSchema,createEvolutionQuest} from './first-evolution-quest.mjs';
import {ensureOnboardingSchema,createOnboarding} from './onboarding.mjs';
import {createStarterReward} from './starter-reward.mjs';
import {ItemLinks} from './item-links.mjs';
import {ensureLevelNotices} from './level-notices.mjs';
import {createBotCheck} from './bot-check.mjs';
import {ensureLaunchSchema,createLaunchService} from './launch-service.mjs';
import {ensureLaunchEmailSchema,createLaunchEmailService} from './launch-email.mjs';
import {ensureLevelRankingSchema,createLevelRanking} from './level-ranking.mjs';
import {ensureChannelCapacitySchema} from './channel-capacity.mjs';
import {ensureNormalRewardQueue} from './normal-reward-schema.mjs';
import {ensureMonsterRespawnSettings} from './monster-respawn-schema.mjs';
import {createDungeonStream} from './dungeon-stream.mjs';
import {ensurePremiumSchema} from './premium-schema.mjs';
import {PremiumEngine} from './premium-engine.mjs';
import {ensureEventSchema} from './event-schema.mjs';
import {createBetaResetService} from "./beta-reset.mjs";
import {env} from "./environment.mjs";
import {createCombatBridge} from './combat-bridge.mjs';
import {CombatRequests} from './combat-requests.mjs';
import {createMovementBridge} from "./movement-bridge.mjs";
import {WorldReadPool} from "./world-read-pool.mjs";
import {WalCheckpoint} from "./wal-checkpoint.mjs";
import {cachePreparedStatements} from './prepared-cache.mjs';
import {instrumentNativeHttp} from './http-timing.mjs';
import {startRuntimePerformance,reportRuntimeWork,measureRuntimeWork} from './runtime-performance.mjs';
import {createDungeonMaintenance,createDungeonCheckpointWriter} from './dungeon-maintenance.mjs';
import path from "node:path";
import {ensureExpansion65} from './expansion65-schema.mjs';
import {ensureAfkIsland} from './afk-island-schema.mjs';
import {ensurePurpleGearLevel} from './purple-gear-level.mjs';
import {ensureLevelCurve} from './level-schema.mjs';
import {ensureDungeonSchema} from './dungeon-schema.mjs';
import {DungeonEngine} from './dungeon-engine.mjs';
import {ensureEquipmentSetsSchema} from './equipment-sets-schema.mjs';
import {ensureProgressionSchema,createProgressionSettings} from './progression-settings.mjs';
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { startGuildWarClock } from "./guild-clock.mjs";
import {startGuildVoiceProxy} from './guild-voice-proxy.mjs';
import {createGuildVoice} from './guild-voice.mjs';
import {ensureGuildSkillSchema,createGuildSkill} from './guild-skill.mjs';
import {ensureGuildVillageSchema,createGuildVillage} from './guild-village.mjs';
import { ensureGuildSchema } from "./guild-schema.mjs";
import { ensurePetNameColumn } from "./pet-schema.mjs";
import { ensureGmVisibilitySchema } from "./gm-visibility-schema.mjs";
import { ensureMovementColumns } from "./movement-schema.mjs";
import { retireBlackLoot } from "./retire-black-loot.mjs";
// Loaded before the application bundle is imported. Secrets are runtime-only.
const config = JSON.parse(await readFile(process.env.CORE_CONFIG_FILE, "utf8"));
Object.assign(process.env, config.environment, {
  NODE_ENV: "production", CORE_DATABASE_PATH: config.database,
  VINEXT_TRUST_PROXY: "1", VINEXT_TRUSTED_HOSTS: config.hosts.join(","),
  REALTIME_HTTP_ORIGIN: config.environment?.REALTIME_HTTP_ORIGIN || "http://127.0.0.1:3001",
});
const {v504Features}=await import('./features504.mjs');
const {createRealtimeDiagnostics504}=await import('./realtime-diagnostics504.mjs');
const {perfR15Features}=await import('./perf-r15-features.mjs');
globalThis.__colPerfR15Features=perfR15Features.snapshot;
const {perfR13Features}=await import('./perf-r13-features.mjs');
globalThis.__colPerfR13Features=perfR13Features.snapshot;
const {perfR11Features}=await import('./perf-r11-features.mjs');
globalThis.__colPerfR11Features=perfR11Features.snapshot;
// The active game database lives only on the VDS. Keep its additive schema
// upgrades local so the frozen source database is never written during a
// normal application publish.
if (!config.database || !existsSync(config.database)) throw new Error("Existing game database is missing; refusing to create an empty database.");
// Reject a crossed realm database before any additive startup writes.
if(config.realm) {
  const probe=new DatabaseSync(config.database,{readOnly:true});
  try{const {assertRealmDatabaseIdentity}=await import('./realm-database-identity.mjs');assertRealmDatabaseIdentity(probe,{realmId:config.realm.id,dbIdentity:config.realm.dbIdentity});}finally{probe.close();}
}
if(process.env.CORE_REALM_PREPARE_SCHEMA==='1'){
 if(!config.realm)throw new Error('Offline schema preparation requires a new realm');
 const probe=new DatabaseSync(config.database,{readOnly:true});
 try{for(const table of ['accounts','players','player_items'])if(probe.prepare(`SELECT count(*) n FROM ${table}`).get().n!==0)throw new Error('Offline preparation requires empty realm data');}finally{probe.close();}
}
const migrationDb = new DatabaseSync(config.database);
try {
  // Existing realm base tables are required above. Add ownership markers before
  // any migration can invoke V477 daily hooks, including a restart with bots.
  ensureRealmLabSchema(migrationDb);
  if (migrationDb.prepare("SELECT 1 FROM sqlite_schema WHERE type='trigger' AND name IN ('daily_monster_capture477','daily_monster_rollover477','daily_monster_delete477','daily_monster_ban477','daily_monster_account_delete477') LIMIT 1").get()) scopeLoadLabDailyRewardTriggers(migrationDb);
  const betaColumns = new Set(migrationDb.prepare("PRAGMA table_info(game_settings)").all().map(r=>r.name));
  for (const column of ["beta_starts_at","beta_ends_at"]) if (!betaColumns.has(column)) migrationDb.exec(`ALTER TABLE game_settings ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`);
  if (!betaColumns.has("seasonal_themes_json")) migrationDb.exec("ALTER TABLE game_settings ADD COLUMN seasonal_themes_json TEXT NOT NULL DEFAULT '{}'");
  ensureEventSchema(migrationDb);
  ensureNormalRewardQueue(migrationDb);
  ensureMonsterRespawnSettings(migrationDb);
  ensureV283World(migrationDb);
  ensureMovementColumns(migrationDb);
  ensureGmVisibilitySchema(migrationDb);
  ensureLevelCurve(migrationDb);
  ensureExpansion65(migrationDb);
  ensureAfkIsland(migrationDb);
  const playerColumns = new Set(migrationDb.prepare("PRAGMA table_info(players)").all().map((row) => row.name));
  if (!playerColumns.has("core_coins")) migrationDb.exec("ALTER TABLE players ADD COLUMN core_coins integer DEFAULT 0 NOT NULL");
  migrationDb.exec(`CREATE TABLE IF NOT EXISTS player_pets (
    player_id text NOT NULL, kind text NOT NULL, equipped integer DEFAULT 0 NOT NULL,
    acquired_at integer NOT NULL, UNIQUE(player_id, kind)
  )`);
  migrationDb.exec("CREATE INDEX IF NOT EXISTS idx_player_pets_player ON player_pets (player_id)");
  ensurePetNameColumn(migrationDb);
  const columns = new Set(migrationDb.prepare("PRAGMA table_info(monsters)").all().map((row) => row.name));
  if (!columns.has("last_damaged_at_ms")) migrationDb.exec("ALTER TABLE monsters ADD COLUMN last_damaged_at_ms integer DEFAULT 0 NOT NULL");
  if (!columns.has("last_regen_at_ms")) migrationDb.exec("ALTER TABLE monsters ADD COLUMN last_regen_at_ms integer DEFAULT 0 NOT NULL");
  const settingsColumns = new Set(migrationDb.prepare("PRAGMA table_info(combat_settings)").all().map((row) => row.name));
  for (const key of ["enchant_forest_power_weight", "enchant_frozen_power_weight"]) if (!settingsColumns.has(key)) migrationDb.exec(`ALTER TABLE combat_settings ADD COLUMN ${key} real DEFAULT 1 NOT NULL`);
  if (!settingsColumns.has("monster_rest_regen_percent")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN monster_rest_regen_percent real DEFAULT 3 NOT NULL");
  if (!settingsColumns.has("monster_rest_regen_combat_delay_seconds")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN monster_rest_regen_combat_delay_seconds real DEFAULT 5 NOT NULL");
  if (!settingsColumns.has("enchant_life_steal_weight")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN enchant_life_steal_weight real DEFAULT 0.8 NOT NULL");
  if (!settingsColumns.has("enchant_life_steal_min")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN enchant_life_steal_min integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("enchant_life_steal_max")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN enchant_life_steal_max integer DEFAULT 15 NOT NULL");
  if (!settingsColumns.has("enchant_attack_block_weight")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN enchant_attack_block_weight real DEFAULT 0.7 NOT NULL");
  if (!settingsColumns.has("enchant_attack_block_min")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN enchant_attack_block_min integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("enchant_attack_block_max")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN enchant_attack_block_max integer DEFAULT 15 NOT NULL");
  if (!settingsColumns.has("frozen_shadow_wolf_xp_reward")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_shadow_wolf_xp_reward integer DEFAULT 34 NOT NULL");
  if (!settingsColumns.has("frozen_rotten_guardian_xp_reward")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_rotten_guardian_xp_reward integer DEFAULT 46 NOT NULL");
  if (!settingsColumns.has("frozen_essence_devourer_xp_reward")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_essence_devourer_xp_reward integer DEFAULT 58 NOT NULL");
  if (!settingsColumns.has("frozen_aggressive_variant_xp_reward")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_aggressive_variant_xp_reward integer DEFAULT 62 NOT NULL");
  if (!settingsColumns.has("frozen_killer_variant_xp_reward")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_killer_variant_xp_reward integer DEFAULT 95 NOT NULL");
  if (!settingsColumns.has("black_monster_xp_reward")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN black_monster_xp_reward integer DEFAULT 95 NOT NULL");
  if (!settingsColumns.has("world_boss_stone_book_chance")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN world_boss_stone_book_chance real DEFAULT 0.4 NOT NULL");
  if (!settingsColumns.has("world_boss_evolution_scroll_chance")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN world_boss_evolution_scroll_chance real DEFAULT 0.4 NOT NULL");
  if (!settingsColumns.has("world_boss_stone_book_min")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN world_boss_stone_book_min integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("world_boss_evolution_scroll_min")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN world_boss_evolution_scroll_min integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("world_boss_stone_book_max")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN world_boss_stone_book_max integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("world_boss_evolution_scroll_max")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN world_boss_evolution_scroll_max integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("frozen_boss_stone_book_chance")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_boss_stone_book_chance real DEFAULT 0.3 NOT NULL");
  if (!settingsColumns.has("frozen_boss_evolution_scroll_chance")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_boss_evolution_scroll_chance real DEFAULT 0.3 NOT NULL");
  if (!settingsColumns.has("frozen_boss_stone_book_min")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_boss_stone_book_min integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("frozen_boss_evolution_scroll_min")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_boss_evolution_scroll_min integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("frozen_boss_stone_book_max")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_boss_stone_book_max integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("frozen_boss_evolution_scroll_max")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_boss_evolution_scroll_max integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("frozen_water_stone_book_chance")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_water_stone_book_chance real DEFAULT 0.15 NOT NULL");
  if (!settingsColumns.has("frozen_water_evolution_scroll_chance")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_water_evolution_scroll_chance real DEFAULT 0.15 NOT NULL");
  if (!settingsColumns.has("frozen_water_stone_book_min")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_water_stone_book_min integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("frozen_water_evolution_scroll_min")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_water_evolution_scroll_min integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("frozen_water_stone_book_max")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_water_stone_book_max integer DEFAULT 1 NOT NULL");
  if (!settingsColumns.has("frozen_water_evolution_scroll_max")) migrationDb.exec("ALTER TABLE combat_settings ADD COLUMN frozen_water_evolution_scroll_max integer DEFAULT 1 NOT NULL");
  const economyColumns = new Set(migrationDb.prepare("PRAGMA table_info(economy_settings)").all().map((row) => row.name));
  const evolutionDefaults = {guild_create_level:30,guild_create_gems:500,"evolution_1_kills": 100, "evolution_1_gems": 100, "evolution_1_scrolls": 5, "evolution_1_attack": 20, "evolution_1_critical": 3, "evolution_1_players": 5, "evolution_2_kills": 350, "evolution_2_gems": 250, "evolution_2_scrolls": 25, "evolution_2_attack": 50, "evolution_2_critical": 5, "evolution_2_players": 8, "evolution_3_kills": 500, "evolution_3_gems": 500, "evolution_3_scrolls": 50, "evolution_3_attack": 80, "evolution_3_critical": 7, "evolution_3_players": 12};
  for (const [key,value] of Object.entries(evolutionDefaults)) if (!economyColumns.has(key)) migrationDb.exec(`ALTER TABLE economy_settings ADD COLUMN ${key} integer DEFAULT ${value} NOT NULL`);
  if (!economyColumns.has("stone_art_dust_cost")) migrationDb.exec("ALTER TABLE economy_settings ADD COLUMN stone_art_dust_cost integer DEFAULT 20 NOT NULL");
  if (!economyColumns.has("stone_art_book_cost")) migrationDb.exec("ALTER TABLE economy_settings ADD COLUMN stone_art_book_cost integer DEFAULT 5 NOT NULL");
  if (!economyColumns.has("stone_art_gem_cost")) migrationDb.exec("ALTER TABLE economy_settings ADD COLUMN stone_art_gem_cost integer DEFAULT 100 NOT NULL");
  migrationDb.exec(`CREATE TABLE IF NOT EXISTS player_stones (
    player_id text NOT NULL,
    kind text NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    UNIQUE(player_id, kind)
  )`);
  migrationDb.exec(`CREATE TABLE IF NOT EXISTS player_storage_items (
    id text PRIMARY KEY NOT NULL,
    player_id text NOT NULL,
    slot integer NOT NULL,
    kind text NOT NULL,
    item_name text NOT NULL,
    rarity text DEFAULT 'white' NOT NULL,
    power integer DEFAULT 0 NOT NULL,
    role text DEFAULT 'muhafiz' NOT NULL,
    enchantments text DEFAULT '[]' NOT NULL,
    created_at integer NOT NULL
  )`);
  migrationDb.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_player_storage_slot ON player_storage_items (player_id, slot)");
  migrationDb.exec("CREATE INDEX IF NOT EXISTS idx_player_storage_player ON player_storage_items (player_id)");
  ensurePremiumSchema(migrationDb);
  ensureStorageSchema(migrationDb);
  migrationDb.exec(`CREATE TABLE IF NOT EXISTS app_release_migrations (
    id text PRIMARY KEY NOT NULL,
    applied_at_ms integer NOT NULL
  )`);
  const skillCostMigration = migrationDb.prepare(
    "INSERT OR IGNORE INTO app_release_migrations(id, applied_at_ms) VALUES('v183-progressive-skill-cost', ?) RETURNING id",
  ).get(Date.now());
  if (skillCostMigration) migrationDb.exec("UPDATE game_settings SET skill_upgrade_gem_cost = 5 WHERE id = 1 AND skill_upgrade_gem_cost = 25");
  ensureGuildSchema(migrationDb);
  ensureGuildVillageSchema(migrationDb);
  ensureGuildSkillSchema(migrationDb);
  ensureDungeonSchema(migrationDb);
  ensureWeaponPowerUpgrade(migrationDb);
  ensureLaunchSchema(migrationDb);
  ensureLaunchEmailSchema(migrationDb);
  ensureLevelRankingSchema(migrationDb);
  ensureChannelCapacitySchema(migrationDb);
  ensureLevelNotices(migrationDb);
  ensureOnboardingSchema(migrationDb);
  ensureEvolutionQuestSchema(migrationDb);
  ensureRuneSchema(migrationDb);ensureRuneV2Schema(migrationDb);ensureStatusSchema(migrationDb);ensureBattlePassSchema(migrationDb);ensureQuests438Schema(migrationDb);ensureArenaMarketSchema(migrationDb);ensureGameplay425Schema(migrationDb);ensureFriendsSchema487(migrationDb);ensureFriendsConsent490(migrationDb);ensureCauldronSchema488(migrationDb);ensurePveMultiSchema489(migrationDb);
  migrationDb.exec('CREATE INDEX IF NOT EXISTS idx_market_active_expiry438 ON market_shops(created_at) WHERE active=1');migrationDb.exec("UPDATE game_settings SET channel_capacity=25 WHERE id=1");
  ensureRankSchema(migrationDb);
  ensureStoneBoss476(migrationDb);
  ensureDragonSchema(migrationDb);ensureEventIsland444(migrationDb);
  ensureFrozenWaterReach(migrationDb);
  ensureTradeSchema(migrationDb);
  retireDiagnosticStorage(migrationDb);
  ensureCommunitySchema(migrationDb);
  ensurePurpleGearLevel(migrationDb);
  retireBlackLoot(migrationDb);
  ensureEnchantmentTierSchema(migrationDb);
  ensureWorldCleanupIndexes(migrationDb);
  ensureEquipmentSetsSchema(migrationDb);ensureExpansion456Schema(migrationDb);ensureBrokenCore464(migrationDb);
  ensureEmeraldStats449(migrationDb);
  ensureProgressionSchema(migrationDb);ensureEnhancementSchema491(migrationDb);ensureEnhancementJewelry491(migrationDb);
  const pearlReset = await ensurePearlReset(migrationDb, {
    backupRoot: path.join(process.env.CORE_DATA_ROOT || path.dirname(config.database), "backups"),
  });
  if (pearlReset.applied) console.info("pearl_reset", JSON.stringify(pearlReset));
  // V507: ordered covering keys; full reward/claim rows are never deleted.
  migrationDb.exec('CREATE INDEX IF NOT EXISTS sinsi_pending_order507 ON sinsi_defeats(defeated_at,monster_id,spawn_round)');
} finally { migrationDb.close(); }
if(process.env.CORE_CHANNEL_PROCESSES==="1"&&config.realm?.role!=="accounts")installBrokenCoreTrigger464(env.DB.sqlite);
if(process.env.CORE_REALM_PREPARE_SCHEMA==='1'){console.log("Empty realm schema ready");process.exit(0);}
if(process.env.CORE_CHANNEL_PROCESSES==='1'&&config.realm?.role!=='accounts'){
 const {startChannelMain}=await import('./channel-main-runtime.mjs');
 await startChannelMain(config,env.DB);
}else{
const positions=new PositionStore(env.DB.sqlite);
env.DB.positions=positions;
attachPositionStore(env.DB.sqlite,positions,{externalDurability:Boolean(env.DB.walSync)});
const combat=new CombatStore(env.DB.sqlite,{positions});env.DB.combat=combat;
attachCombatStore(env.DB.sqlite,combat,{externalDurability:Boolean(env.DB.walSync)});
const worldLoop=new WorldLoop(env.DB.sqlite,{positions,combat});env.DB.worldLoop=worldLoop;
attachWorldLoop(env.DB.sqlite,worldLoop);
const worldPush=new WorldPush(env.DB,{positions,combat,worldLoop});env.DB.worldPush=worldPush;worldLoop.worldPush=worldPush;
env.DB.clearStatements();
if(worldLoop.enabled){
 worldLoop.register('world_flush',1000,()=>{
  const unwritten=positions.doubleBuffer?positions.pendingWrites.size:positions.dirty.size;
  if(!unwritten&&![...combat.dirty.values()].some(({e})=>e.generation!==e.written))return;
  if(positions.doubleBuffer)for(const id of positions.pendingWrites.keys())positions.warnStale(id);
  return worldLoop.flushed(()=>env.DB.flushMemory());
 },{overlap:positions.doubleBuffer});
}else{positions.start(()=>env.DB.flushMemory());combat.start(()=>env.DB.flushMemory());}
globalThis.__colEquipmentSets=true;
const dungeonDatabase=new DatabaseSync(config.database);
dungeonDatabase.exec('PRAGMA busy_timeout=1000; PRAGMA foreign_keys=ON;');
attachPositionStore(dungeonDatabase,positions);
attachCombatStore(dungeonDatabase,combat);
attachWorldLoop(dungeonDatabase,worldLoop);
if(process.env.CORE_PREPARED_CACHE!=="0")cachePreparedStatements(dungeonDatabase);
// Same automatic-checkpoint interval as the main connection (database.mjs).
{const pages=Number(process.env.CORE_WAL_AUTOCHECKPOINT_PAGES??4000);if(Number.isInteger(pages)&&pages>=1000&&pages<=20000)dungeonDatabase.exec(`PRAGMA wal_autocheckpoint=${pages}`);}
const walCheckpoint=process.env.CORE_WAL_CHECKPOINT_WORKER==='0'?null:new WalCheckpoint(config.database,{onFallback:reason=>console.warn('wal_checkpoint_fallback',reason)});
if(walCheckpoint){walCheckpoint.register(env.DB.sqlite,{externallyDurable:Boolean(env.DB.walSync)});walCheckpoint.register(dungeonDatabase);env.DB.walCheckpoint=walCheckpoint;}
const realmRuntime=await initializeRealmRuntime(config,env.DB);
const stopMaintenanceExpiry438=attachMaintenanceExpiry438(realmRuntime,env.DB);
globalThis.__colProgression=createProgressionSettings(dungeonDatabase);
globalThis.__colCommunityEvent=createCommunityEvent(dungeonDatabase);
globalThis.__colOnboarding=createOnboarding(dungeonDatabase);
globalThis.__colEvolutionQuest=createEvolutionQuest(dungeonDatabase);
globalThis.__colRanks=createRanks(dungeonDatabase);
globalThis.__colQuests438=createQuests438(dungeonDatabase);globalThis.__colBattlePass=createBattlePass(dungeonDatabase);globalThis.__colCauldron488=createCauldron488(dungeonDatabase);globalThis.__colEnhancement491=createEnhancement491(dungeonDatabase);globalThis.__colStatus=createStatus(dungeonDatabase);globalThis.__colRunes=createRunes(dungeonDatabase);globalThis.__colRuneV2=createRuneV2(dungeonDatabase);globalThis.__colRuneV2HealthSave485=createRuneV2LocalHealthSave485(env.DB,(config,revision)=>globalThis.__colRuneV2.save(config,revision));globalThis.__colEventIsland444=createEventIsland444(dungeonDatabase);globalThis.__colArenaMarket=createArenaMarket(dungeonDatabase);
globalThis.__colDragonBoss=createDragonBoss(dungeonDatabase);
globalThis.__colItemLinks=new ItemLinks(dungeonDatabase);
globalThis.__colPlayerTrade=new PlayerTrade(dungeonDatabase);
globalThis.__colStorage=createStorage(dungeonDatabase);
const botExemptionPlayer=dungeonDatabase.prepare("SELECT area,arena_match_id FROM players WHERE account_id=?");
globalThis.__colBotCheck=createBotCheck(dungeonDatabase,{exempt:id=>{const player476=botExemptionPlayer.get(id);return player476?.area==='afk';}});
globalThis.__colLaunch=createLaunchService(dungeonDatabase);
if(realmRuntime){
 const local=globalThis.__colLaunch;
 const realmCanPlay=accountId=>{const entry=realmRuntime.security.entries.get(accountId);return realmRuntime.policy?.status==='open'&&entry&&realmRuntime.security.allows(accountId,entry.version);};
 globalThis.__colLaunch={...local,status:accountId=>({...local.status(accountId),...realmRuntime.policy?.launch,...(realmRuntime.maintenance?.policy?{phase:realmRuntime.maintenance.policy.phase,maintenanceText:realmRuntime.maintenance.policy.maintenanceText,maintenanceDeadlineMs:realmRuntime.maintenance.policy.deadlineMs}:{}),showLanding:['waiting','ended','maintenance'].includes(realmRuntime.maintenance?.policy?.phase??realmRuntime.policy?.launch?.phase)&&!realmRuntime.maintenance?.isGameMaster(accountId),canPlay:accountId?!!realmCanPlay(accountId):realmRuntime.maintenance?.policy?.phase!=='maintenance'}),
 deadline:accountId=>realmCanPlay(accountId)?realmRuntime.maintenance.deadline(accountId):Date.now()};
}
globalThis.__colLaunchEmail=createLaunchEmailService(dungeonDatabase);
globalThis.__colLevelRanking=createLevelRanking(dungeonDatabase);globalThis.__colMonsterRanking=createMonsterRanking(dungeonDatabase);
let stopLaunchEmail=()=>{};
globalThis.__colStarterReward=createStarterReward(dungeonDatabase);
let dungeonMaintenance;
globalThis.__colDungeon=new DungeonEngine(dungeonDatabase,{periodicSave:run=>dungeonMaintenance.checkpoint(run),settingsSnapshot:worldLoop.enabled?table=>worldLoop.config.get(table):undefined,onWork:(name,ms,...rest)=>{reportRuntimeWork(name,ms,...rest);if(name==='dungeon_tick')worldLoop.recordWork(ms);}});
globalThis.__colGuildVillage=createGuildVillage(dungeonDatabase,{dungeonLocked:id=>globalThis.__colDungeon.locked(id)});
globalThis.__colPremium=new PremiumEngine(dungeonDatabase);
const dailyMonsterReward477=createDailyMonsterReward477(dungeonDatabase);
globalThis.__colGuildVoice=createGuildVoice(dungeonDatabase);
startGuildVoiceProxy(globalThis.__colGuildVoice,{port:Number(process.env.CORE_VOICE_PORT)||3005});
const voiceSweep=()=>globalThis.__colGuildVoice.sweep();
const voiceClock=worldLoop.enabled?null:setInterval(()=>{void voiceSweep().catch(()=>{});},5000);voiceClock?.unref();
if(worldLoop.enabled)worldLoop.register('world_voice',5000,voiceSweep);
globalThis.__colGuildSkill=createGuildSkill(dungeonDatabase,{refreshHp:id=>globalThis.__colPremium.refreshHp(id)});
globalThis.__colPremium.expire();
dungeonDatabase.exec("CREATE INDEX IF NOT EXISTS premium_ration_expiry ON players(ration_until) WHERE ration_until>0");
globalThis.__colDungeonStream=createDungeonStream(globalThis.__colDungeon,{hosts:config.hosts,port:Number(process.env.CORE_DUNGEON_PORT)||3004,deadline:auth=>globalThis.__colBotCheck.deadline(auth.account.id),validate:auth=>{const row=dungeonDatabase.prepare('SELECT s.expires_at,s.security_version,a.security_version AS current_version,a.permanently_banned,a.suspended_until_ms,g.instance_id,g.token_hash AS presence_token,g.expires_at_ms AS presence_expiry FROM auth_sessions s JOIN accounts a ON a.id=s.account_id LEFT JOIN game_presence g ON g.account_id=a.id WHERE s.token_hash=?').get(auth.tokenHash);return !globalThis.__colBotCheck.required(auth.account.id)&&globalThis.__colLaunch.status(auth.account.id).canPlay&&!!row&&row.instance_id===auth.gamePresence?.instanceId&&row.presence_token===auth.tokenHash&&row.presence_expiry>Date.now()&&row.expires_at>Date.now()/1000&&row.security_version===row.current_version&&!row.permanently_banned&&!(row.suspended_until_ms>Date.now());}});
realmRuntime?.maintenance?.subscribe(()=>globalThis.__colDungeonStream.revalidate438());
dungeonMaintenance=createDungeonMaintenance({engine:globalThis.__colDungeon,database:dungeonDatabase,
 premium:globalThis.__colPremium,guildSkill:globalThis.__colGuildSkill,ranks:globalThis.__colRanks,
 persist:worldLoop.enabled?createDungeonCheckpointWriter(globalThis.__colDungeon,env.DB):undefined,
 available:()=>!env.DB.maintenance&&!env.DB.closed,onWork:reportRuntimeWork});
const legacyDungeonTick=()=>{try{
 measureRuntimeWork('dungeon_tick',()=>globalThis.__colDungeon.tick());
 if(Date.now()-(globalThis.__premiumExpiredAt??0)>1000){
  globalThis.__premiumExpiredAt=Date.now();
  const available=()=>!env.DB.maintenance&&!env.DB.closed;
  void globalThis.__colPremium.expireInBackground(available).catch(error=>console.error('Premium maintenance retry',error.message));
  void dailyMonsterReward477.tick(available).catch(error=>console.error('Daily monster reward retry',error.message));
  void globalThis.__colGuildSkill.syncInBackground(available).catch(error=>console.error('Guild buff maintenance retry',error.message));
  dungeonMaintenance.refresh();
 }
}catch(error){console.error('Dungeon clock retry',error.message);}};
const dungeonClock=worldLoop.enabled?null:setInterval(legacyDungeonTick,33);
dungeonClock?.unref();
if(worldLoop.enabled){
 worldLoop.register('dungeon_tick',worldLoop.tickMs,()=>globalThis.__colDungeon.tickScheduled());
 worldLoop.register('world_premium',1000,()=>Promise.all([globalThis.__colPremium.expireInBackground(()=>!env.DB.maintenance&&!env.DB.closed),dailyMonsterReward477.tick(()=>!env.DB.maintenance&&!env.DB.closed)]));
 worldLoop.register('world_guild_buff',1000,()=>globalThis.__colGuildSkill.syncInBackground(()=>!env.DB.maintenance&&!env.DB.closed));
 worldLoop.register('dungeon_member_refresh',1000,()=>dungeonMaintenance.refresh());
}
const stopGuildClock=startGuildWarClock(config.database,{checkpoint:walCheckpoint,positions,combat,worldLoop});
// Register every runtime writer before the worker can disable automatic
// checkpoints. Startup failure simply leaves the durable SQLite defaults active.
if(walCheckpoint)await walCheckpoint.ready;
globalThis.__colBetaReset=createBetaResetService({database:env.DB,backupRoot:path.join(process.env.CORE_DATA_ROOT||"/var/lib/coreoflife-game","backups"),adminEmail:process.env.ADMIN_EMAIL,adminUserId:process.env.ADMIN_USER_ID,onCommitted:()=>{worldLoop.stop();clearInterval(dungeonClock);stopGuildClock();stopLaunchEmail();globalThis.__colDungeon.runs.clear();globalThis.__colDungeon.lastSave.clear();setTimeout(()=>process.exit(0),1500);}});
// Prepare the independent reader before accepting HTTP requests. The primary
// connection retains all authorization and authoritative game writes.
if(process.env.CORE_WORLD_READ_WORKER!=="0"){
 // Extra read-only workers are opt-in after a controlled CPU/load comparison.
 // Authentication, authoritative writes and simulation ownership stay here.
 const workers=Number(process.env.CORE_WORLD_READ_WORKERS??'1');
 const reader=new WorldReadPool(config.database,{pipelineDepth:4,workers,positions,combat});
 await reader.ready;
 env.DB.worldReadPool=reader;
}
const combatBridge=createCombatBridge({enabled:process.env.CORE_WS_COMBAT!=='0'});
globalThis[Symbol.for('coreoflife.combatBridge')]=combatBridge;
globalThis[Symbol.for('coreoflife.combatRequests')]=new CombatRequests();
const movementBridge = createMovementBridge({enabled:process.env.CORE_WS_MOVEMENT !== '0'});
globalThis[Symbol.for('coreoflife.movementBridge')] = movementBridge;
// Children open read-only SQLite handles; the existing writer and native
// durable services stay in this realm process.
const {channelProcessesEnabled}=await import('./channel-protocol.mjs');
let channelCompute=null,channelHealthClock=null;
if(channelProcessesEnabled()){
 const {ChannelCompute}=await import('./channel-compute.mjs');
 channelCompute=await new ChannelCompute(env.DB,config.database,{realmId:config.realm?.id??'local'}).start();
 env.DB.channelCompute=channelCompute;
 worldLoop.nearby=(...args)=>channelCompute.nearby(...args);
 worldLoop.regenerate=settings=>channelCompute.regenerate(settings);
 for(const method of ['due','needsRepair','needsDespawn','dragonDue'])worldLoop[method]=arg=>channelCompute.worldQuery(method,arg);
 const {attachChannelWorldPush}=await import('./channel-world-push.mjs');
 channelCompute.pushController=attachChannelWorldPush(channelCompute,worldPush);
 env.DB.diagnosticsRealtime504=createRealtimeDiagnostics504();
 channelHealthClock=setInterval(()=>{void env.DB.diagnosticsRealtime504.sample();void channelCompute.sample().catch(error=>console.error('channel_health',error.message));},1000);channelHealthClock.unref();
}
const { startProdServer } = await import("vinext/server/prod-server");
const nativeHttp = await startProdServer({ host: "127.0.0.1", port: Number(process.env.CORE_APP_PORT) || 3003, outDir: "dist-vds" });
if(realmRuntime)installRealmRouteGuard(nativeHttp.server,realmRuntime.role);
installSiteVisitRoute457(nativeHttp.server,null,{hosts:config.hosts,writable:false});
// Keep the private gateway's pre-established sockets alive between its 20 s
// health rotations. Per-request timeout and authentication rules are unchanged.
nativeHttp.server.keepAliveTimeout = 65_000;
instrumentNativeHttp(nativeHttp.server);
startRuntimePerformance();
movementBridge.start();combatBridge.start();
stopLaunchEmail=worldLoop.enabled?worldLoop.register('world_launch_email',2000,()=>globalThis.__colLaunchEmail.tick()):globalThis.__colLaunchEmail.start();
if(worldLoop.enabled)worldLoop.register('world_push_tick',100,()=>worldPush.tick());else if(worldPush.enabled){worldPush.timer=setInterval(()=>worldPush.tick(),100);worldPush.timer.unref();}
worldLoop.start();

// Stop accepting checkpoints before draining HTTP. All remaining position data
// is synchronously flushed before process exit/systemctl restart completes.
let stopping=false;
const flushPositionsOnExit=()=>{worldPush.stop();worldLoop.stop();combat.stop();positions.stop();if(worldLoop.enabled)for(const run of globalThis.__colDungeon.runs.values())globalThis.__colDungeon.save(run);positions.flushSync(env.DB.sqlite,`${config.database}-wal`);env.DB.sqlite.combatLayer?.confirmDurable(null);};
process.once('exit',flushPositionsOnExit);
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{
 if(stopping)return;stopping=true;clearInterval(channelHealthClock);
 worldLoop.stop();worldPush.stop();movementBridge.close();combatBridge.close();
 clearInterval(dungeonClock);clearInterval(voiceClock);stopGuildClock();stopLaunchEmail();globalThis.__colDungeonStream.close();
 // Accepted HTTP operations retain their live children until their durable
 // response completes. New connections/checkpoints have already been stopped.
 const drained=new Promise(resolve=>nativeHttp.server.close(resolve));nativeHttp.server.closeIdleConnections();
 try{
  await drained;await dailyMonsterReward477.drain();if(channelCompute)await channelCompute.close();
  while(env.DB.writeQueue.length)env.DB.drainWrites();flushPositionsOnExit();
  process.off('exit',flushPositionsOnExit);process.exit(0);
 }catch(error){console.error('Channel shutdown failed',error.message);process.exitCode=1;}
});

}

import {ensureBrokenCore464,installBrokenCoreTrigger464} from './broken-core464.mjs';
