// Offline schema preparation for a NEW EMPTY realm only. Source SHA256 859ab446ed36428b5d44005159fb3a57b3c8a0ed6ab2e612b2e835c8b2ea4d77
import path from 'node:path';
import {ensureEnhancementSchema491} from "../../../../native510-bb3a6cc689c6/vds-server/src/enhancement-engine491.mjs";
import {ensureEnhancementJewelry491} from "../../../../native510-bb3a6cc689c6/vds-server/src/enhancement-jewelry491.mjs";
import {ensureFriendsConsent490} from "../../../../native510-bb3a6cc689c6/vds-server/src/../../lib/friends490.mjs";
import {ensurePveMultiSchema489} from "../../../../native510-bb3a6cc689c6/vds-server/src/pve-multi489.mjs";
import {ensureCauldronSchema488} from "../../../../native510-bb3a6cc689c6/vds-server/src/cauldron-engine488.mjs";
import {ensureFriendsSchema487} from "../../../../native510-bb3a6cc689c6/vds-server/src/../../lib/friends487.mjs";
import {ensureRuneV2Schema} from "../../../../native510-bb3a6cc689c6/vds-server/src/rune-v2.mjs";
import {ensureRealmLabSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/realm-control.mjs";
import {scopeLoadLabDailyRewardTriggers} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-writer.mjs";
import {ensureStoneBoss476} from "../../../../native510-bb3a6cc689c6/vds-server/src/stone-boss476.mjs";
import {ensureExpansion456Schema} from "../../../../native510-bb3a6cc689c6/vds-server/src/expansion456-schema.mjs";
import {ensureEmeraldStats449} from "../../../../native510-bb3a6cc689c6/vds-server/src/emerald-stats449.mjs";
import {ensureEventIsland444} from "../../../../native510-bb3a6cc689c6/vds-server/src/event-island444.mjs";
import {ensureQuests438Schema} from "../../../../native510-bb3a6cc689c6/vds-server/src/quests438.mjs";
import {ensureBattlePassSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/battle-pass.mjs";
import {ensureStatusSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/status.mjs";
import {ensureGameplay425Schema} from "../../../../native510-bb3a6cc689c6/vds-server/src/gameplay425.mjs";
import {ensureArenaMarketSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/arena-market.mjs";
import {ensureRuneSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/runes.mjs";
import {ensurePearlReset} from "../../../../native510-bb3a6cc689c6/vds-server/src/pearl-reset.mjs";
import {ensureWorldCleanupIndexes} from "../../../../native510-bb3a6cc689c6/vds-server/src/world-cleanup.mjs";
import {ensureEnchantmentTierSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/enchantment-tier-schema.mjs";
import {ensureDragonSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/dragon-boss.mjs";
import {ensureRankSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/ranks.mjs";
import {ensureFrozenWaterReach} from "../../../../native510-bb3a6cc689c6/vds-server/src/frozen-water-position.mjs";
import {ensureStorageSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/storage.mjs";
import {ensureWeaponPowerUpgrade} from "../../../../native510-bb3a6cc689c6/vds-server/src/weapon-power-upgrade.mjs";
import {ensureCommunitySchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/community-event.mjs";
import {retireDiagnosticStorage} from "../../../../native510-bb3a6cc689c6/vds-server/src/retire-diagnostics.mjs";
import {ensureTradeSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/player-trade.mjs";
import {ensureV283World} from "../../../../native510-bb3a6cc689c6/vds-server/src/v283-world.mjs";
import {ensureEvolutionQuestSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/first-evolution-quest.mjs";
import {ensureOnboardingSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/onboarding.mjs";
import {ensureLevelNotices} from "../../../../native510-bb3a6cc689c6/vds-server/src/level-notices.mjs";
import {ensureLaunchSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/launch-service.mjs";
import {ensureLaunchEmailSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/launch-email.mjs";
import {ensureLevelRankingSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/level-ranking.mjs";
import {ensureChannelCapacitySchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/channel-capacity.mjs";
import {ensureNormalRewardQueue} from "../../../../native510-bb3a6cc689c6/vds-server/src/normal-reward-schema.mjs";
import {ensureMonsterRespawnSettings} from "../../../../native510-bb3a6cc689c6/vds-server/src/monster-respawn-schema.mjs";
import {ensurePremiumSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/premium-schema.mjs";
import {ensureEventSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/event-schema.mjs";
import {env} from "../../../../native510-bb3a6cc689c6/vds-server/src/environment.mjs";
import {ensureExpansion65} from "../../../../native510-bb3a6cc689c6/vds-server/src/expansion65-schema.mjs";
import {ensureAfkIsland} from "../../../../native510-bb3a6cc689c6/vds-server/src/afk-island-schema.mjs";
import {ensurePurpleGearLevel} from "../../../../native510-bb3a6cc689c6/vds-server/src/purple-gear-level.mjs";
import {ensureLevelCurve} from "../../../../native510-bb3a6cc689c6/vds-server/src/level-schema.mjs";
import {ensureDungeonSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/dungeon-schema.mjs";
import {ensureEquipmentSetsSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/equipment-sets-schema.mjs";
import {ensureProgressionSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/progression-settings.mjs";
import {ensureGuildSkillSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/guild-skill.mjs";
import {ensureGuildVillageSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/guild-village.mjs";
import {ensureGuildSchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/guild-schema.mjs";
import {ensurePetNameColumn} from "../../../../native510-bb3a6cc689c6/vds-server/src/pet-schema.mjs";
import {ensureGmVisibilitySchema} from "../../../../native510-bb3a6cc689c6/vds-server/src/gm-visibility-schema.mjs";
import {ensureMovementColumns} from "../../../../native510-bb3a6cc689c6/vds-server/src/movement-schema.mjs";
import {retireBlackLoot} from "../../../../native510-bb3a6cc689c6/vds-server/src/retire-black-loot.mjs";
import {ensureBrokenCore464} from "../../../../native510-bb3a6cc689c6/vds-server/src/broken-core464.mjs";
export async function prepareNewRealmSchemaR101(migrationDb,config){
const process={env:{...globalThis.process.env,CORE_DATA_ROOT:path.dirname(config.database)}};
for(const table of ['accounts','players','player_items'])if(migrationDb.prepare('SELECT COUNT(*) n FROM '+table).get().n)throw Error('r101_new_realm_not_empty');

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

}
