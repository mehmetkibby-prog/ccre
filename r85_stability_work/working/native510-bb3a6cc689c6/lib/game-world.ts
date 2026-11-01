import {ENCHANT_TIER_DEFAULTS,ENCHANT_TIER_KEYS} from './enchantment-tiers.mjs';
import {dragonService} from './dragon-runtime';
import {expandHuntingWorld} from './world-expansion-v248';
import {levelCosts,levelStart,LEVEL_CAP} from "./level-progression.mjs";
import {EVOLUTION_DEFAULTS,EVOLUTION_KEYS} from "./weapon-evolution";
import { EXPANDED_FOREST_SPAWNS, FOREST_SPAWN_UPSERT_SQL } from "@/lib/forest-expansion";
import { env } from "cloudflare:workers";
import {ANCIENT_BOSS_SPAWN} from "@/lib/ancient-core.mjs";
import { BAZAAR_SPAWN, COMMON_WORLD, FROZEN_BOSS_SPAWN, FROZEN_UNLOCK_LEVEL, FROZEN_WATER_SPAWN } from "@/lib/world-layout";
import { ensureMonsterBalanceInitialized, monsterBalanceKeyFor } from "@/lib/monster-balance";

export { ATTACK_SPEED_ENCHANT_VALUES, BASIC_ATTACK_CADENCE_MS, BASIC_ATTACK_NETWORK_JITTER_ALLOWANCE_MS, attackIsBlocked, effectiveAttackCooldownMs, effectivePlayerMaxHp, enchantmentFitsItem, createEnchantmentTotals, enchantmentTotal, isGearKind, parseEnchantments } from "@/lib/combat-stats";
export type { Enchantment, EnchantmentKind, GearKind } from "@/lib/combat-stats";

export const WORLD = { ...COMMON_WORLD, coreX: 1200, coreY: 750 } as const;
export const BOSS_SPAWN = { x: 1200, y: 690 } as const;
export const BOSS_SANCTUM_ENTRY = { x: 1200, y: 1230 } as const;
export const SINSI_STONE_ENTRY = { x: 1200, y: 1320 } as const;
export const WAR_ENTRY = { x: 1800, y: 996 } as const;
export const BOSS_RESPAWN_SECONDS = 600;
export const CHANNEL_COUNT = 3;
export const PVP_REWARD_COOLDOWN_MS = 30 * 60 * 1000;
export const FROZEN_BOSS_ID = "frozen-boss-1";
export const ANCIENT_BOSS_ID = "ancient-boss-1";
export const FROZEN_WATER_ID_PREFIX = "frozen-water-c";

export function isFrozenBossId(id: string | null | undefined) { return id === FROZEN_BOSS_ID; }
export function isAncientBossId(id: string | null | undefined) { return id === ANCIENT_BOSS_ID; }
export function isFrozenWaterId(id: string | null | undefined) { return typeof id === "string" && id.startsWith(FROZEN_WATER_ID_PREFIX); }
export function isFrozenEliteId(id: string | null | undefined) { return isFrozenBossId(id) || isAncientBossId(id) || isFrozenWaterId(id); }

export type GameSettings = import("./weapon-evolution").EvolutionSettings & Record<`enchant_${string}_tier_${"one" | "two" | "three" | "four" | "five"}`, number> & {
  expansion65_enabled:number; expansion65_preview_player_id:string; expansion65_revision:number;
  ancient_golge_xp_reward:number; ancient_curuk_xp_reward:number; ancient_yutan_xp_reward:number; ancient_monster_respawn_seconds:number;
  ancient_boss_enabled:number; ancient_boss_hp:number; ancient_boss_damage_scale:number;
  ancient_boss_respawn_seconds:number; ancient_boss_xp_reward:number; ancient_boss_reward_gems:number; ancient_boss_purple_chance:number; ancient_normal_purple_chance:number; world_boss_purple_chance:number;
  forest_after_level?:number;forest_reduction_percent?:number;
  beta_starts_at: number; beta_ends_at: number; events_json?: string;
  health_decay_per_second: number; donation_health_per_essence: number;
  boss_hp: number; boss_respawn_seconds: number; boss_duration_seconds: number;
  regular_monster_damage_scale: number; normal_variant_damage_scale: number;
  aggressive_variant_damage_scale: number; killer_variant_damage_scale: number; boss_damage_scale: number;
  shadow_wolf_hp: number; rotten_guardian_hp: number; essence_devourer_hp: number;
  aggressive_variant_hp_scale: number; killer_variant_hp_scale: number;
  guardian_reward_gems: number; guardian_reward_seconds: number;
  potion_essence_cost: number; exchange_essence_cost: number; exchange_gem_reward: number;
  skill_upgrade_gem_cost: number; xp_per_level: number;
  shadow_wolf_xp_reward: number; rotten_guardian_xp_reward: number; essence_devourer_xp_reward: number;
  aggressive_variant_xp_reward: number; killer_variant_xp_reward: number;
  frozen_shadow_wolf_xp_reward: number; frozen_rotten_guardian_xp_reward: number; frozen_essence_devourer_xp_reward: number;
  frozen_aggressive_variant_xp_reward: number; frozen_killer_variant_xp_reward: number; black_monster_xp_reward: number;
  afk_island_enabled:number; afk_island_xp_reward:number; afk_island_respawn_seconds:number;
  sinsi_shadow_wolf_xp_reward: number; sinsi_guardian_xp_reward: number; sinsi_devourer_xp_reward: number;
  sinsi_stone_xp_reward: number; boss_xp_reward: number;
  xp_curve_json?: string;
  xp_base_cost: number; xp_growth_per_level: number; skill_two_unlock_level: number;
  skill_three_unlock_level: number; skill_two_cooldown_ms: number;
  skill_three_cooldown_ms: number; skill_damage_scale: number; skill_one_multiplier: number;
  skill_two_multiplier: number; skill_three_multiplier: number; skill_upgrade_damage_per_level: number;
  starter_weapon_power: number; guardian_base_attack: number; hunter_base_attack: number; arcanist_base_attack: number;
  base_critical_chance: number; third_skill_critical_bonus: number; critical_damage_multiplier: number;
  wing_gem_cost: number; wing_attack_bonus: number; wing_defense_bonus: number; wing_critical_chance: number;
  boss_guaranteed_white_drops: number; regular_blue_chance: number; regular_orange_chance: number; regular_red_chance: number;
  regular_item_drop_chance: number; regular_armor_chance: number;
  boss_blue_chance: number; boss_orange_chance: number; boss_red_chance: number; boss_armor_chance: number; item_sale_white: number;
  item_sale_blue: number; item_sale_orange: number; item_sale_red: number; new_year_mode: number; halloween_mode: number; seasonal_themes_json: string;
  white_weapon_power_min: number; white_weapon_power_max: number; white_armor_power_min: number; white_armor_power_max: number;
  blue_weapon_power_min: number; blue_weapon_power_max: number; blue_armor_power_min: number; blue_armor_power_max: number;
  orange_weapon_power_min: number; orange_weapon_power_max: number; orange_armor_power_min: number; orange_armor_power_max: number;
  red_weapon_power_min: number; red_weapon_power_max: number; red_armor_power_min: number; red_armor_power_max: number;
  fishing_rod_cost: number; fish_sokan_value: number; fish_levrek_value: number; fish_zargana_value: number;
  fish_sokan_weight: number; fish_levrek_weight: number; fish_zargana_weight: number; fishing_pearl_chance: number; fishing_talisman_chance?:number;
  blacksmith_dust_cost: number; blacksmith_pearl_cost: number; blacksmith_gem_cost: number;
  guild_create_level:number; guild_create_gems:number;
  stone_art_dust_cost: number; stone_art_book_cost: number; stone_art_gem_cost: number;
  unique_weapon_power: number; unique_armor_power: number;
  channel_capacity: number; sinsi_stone_unlock_level: number; sinsi_stone_hp: number;
  sinsi_stone_respawn_seconds: number; sinsi_stone_wave_count: number; sinsi_stone_summon_hp: number;
  sinsi_stone_summon_damage_scale: number; sinsi_stone_essence_min: number; sinsi_stone_essence_max: number;
  sinsi_stone_gear_drops: number; sinsi_stone_dust_reward: number; sinsi_stone_armor_chance: number;
  sinsi_stone_blue_chance: number; sinsi_stone_orange_chance: number; sinsi_stone_red_chance: number;
  enchant_item_chance: number; enchant_one_chance: number; enchant_two_chance: number; enchant_three_chance: number; enchant_four_chance: number;
  enchant_forest_power_weight: number; enchant_frozen_power_weight: number;
  enchant_fire_weight: number; enchant_ice_weight: number; enchant_sword_defense_weight: number;
  enchant_arrow_defense_weight: number; enchant_magic_defense_weight: number; enchant_strong_players_weight: number;
  enchant_resistant_players_weight: number; enchant_critical_weight: number; enchant_attack_speed_weight: number; enchant_cast_speed_weight: number;
  enchant_life_steal_weight: number; enchant_life_steal_min: number; enchant_life_steal_max: number;
  enchant_attack_block_weight: number; enchant_attack_block_min: number; enchant_attack_block_max: number;
  enchant_hp_weight: number; enchant_hp_tier_one: number; enchant_hp_tier_two: number; enchant_hp_tier_three: number;
  enchant_fire_min: number; enchant_fire_max: number; enchant_ice_min: number; enchant_ice_max: number;
  enchant_sword_defense_min: number; enchant_sword_defense_max: number;
  enchant_arrow_defense_min: number; enchant_arrow_defense_max: number;
  enchant_magic_defense_min: number; enchant_magic_defense_max: number;
  enchant_strong_players_min: number; enchant_strong_players_max: number;
  enchant_resistant_players_min: number; enchant_resistant_players_max: number;
  enchant_critical_min: number; enchant_critical_max: number; enchant_attack_speed_min: number; enchant_attack_speed_max: number;
  boss_fire_interval_seconds: number; boss_fire_damage_multiplier: number;
  forest_monster_respawn_seconds: number; frozen_monster_respawn_seconds: number; black_monster_respawn_seconds: number; player_max_hp: number; rest_regen_percent: number; rest_regen_combat_delay_seconds: number; rest_regen_still_seconds: number; monster_rest_regen_percent: number; monster_rest_regen_combat_delay_seconds: number;
  elemental_tick_count: number; elemental_tick_interval_ms: number;
  pvp_kill_reward_gems: number; pvp_death_loss_gems: number; pvp_respawn_seconds: number;
  arena_1v1_reward_gems: number; arena_2v2_reward_gems: number; arena_3v3_reward_gems: number; arena_5v5_reward_gems: number;
  frozen_zone_enabled: number;
  frozen_boss_enabled: number; frozen_boss_hp: number; frozen_boss_damage_scale: number;
  frozen_boss_respawn_seconds: number; frozen_boss_xp_reward: number; frozen_boss_reward_gems: number;
  frozen_boss_item_drop_chance: number; frozen_boss_item_drop_count: number;
  world_boss_stone_book_chance: number; world_boss_stone_book_min: number; world_boss_stone_book_max: number;
  world_boss_evolution_scroll_chance: number; world_boss_evolution_scroll_min: number; world_boss_evolution_scroll_max: number;
  frozen_boss_stone_book_chance: number; frozen_boss_stone_book_min: number; frozen_boss_stone_book_max: number;
  frozen_boss_evolution_scroll_chance: number; frozen_boss_evolution_scroll_min: number; frozen_boss_evolution_scroll_max: number;
  frozen_water_stone_book_chance: number; frozen_water_stone_book_min: number; frozen_water_stone_book_max: number;
  frozen_water_evolution_scroll_chance: number; frozen_water_evolution_scroll_min: number; frozen_water_evolution_scroll_max: number;
  frozen_water_enabled: number; frozen_water_hp: number; frozen_water_damage_scale: number;
  frozen_water_respawn_seconds: number; frozen_water_xp_reward: number; frozen_water_reward_gems: number;
  frozen_water_item_drop_chance: number; frozen_water_item_drop_count: number;
};

export const DEFAULT_SETTINGS: GameSettings = {
  ...ENCHANT_TIER_DEFAULTS,
  expansion65_enabled:0, expansion65_preview_player_id:"", expansion65_revision:0,
  ancient_golge_xp_reward:400,ancient_curuk_xp_reward:600,ancient_yutan_xp_reward:800,ancient_monster_respawn_seconds:25,
  beta_starts_at: 0, beta_ends_at: 0,
  ...EVOLUTION_DEFAULTS,
  health_decay_per_second: .003, donation_health_per_essence: .02,
  boss_hp: 18000, boss_respawn_seconds: 600, boss_duration_seconds: 300,
  regular_monster_damage_scale: .45, normal_variant_damage_scale: 1,
  aggressive_variant_damage_scale: 1.45, killer_variant_damage_scale: 2, boss_damage_scale: .3,
  shadow_wolf_hp: 220, rotten_guardian_hp: 340, essence_devourer_hp: 480,
  aggressive_variant_hp_scale: 1.7, killer_variant_hp_scale: 2.65,
  guardian_reward_gems: 20, guardian_reward_seconds: 3600,
  potion_essence_cost: 15, exchange_essence_cost: 100, exchange_gem_reward: 20,
  skill_upgrade_gem_cost: 5, xp_per_level: 125,
  shadow_wolf_xp_reward: 34, rotten_guardian_xp_reward: 46, essence_devourer_xp_reward: 58,
  aggressive_variant_xp_reward: 62, killer_variant_xp_reward: 95,
  frozen_shadow_wolf_xp_reward: 34, frozen_rotten_guardian_xp_reward: 46, frozen_essence_devourer_xp_reward: 58,
  frozen_aggressive_variant_xp_reward: 62, frozen_killer_variant_xp_reward: 95, black_monster_xp_reward: 95,
  afk_island_enabled:0,afk_island_xp_reward:10,afk_island_respawn_seconds:12,
  sinsi_shadow_wolf_xp_reward: 62, sinsi_guardian_xp_reward: 62, sinsi_devourer_xp_reward: 95,
  sinsi_stone_xp_reward: 0, boss_xp_reward: 300,
  xp_base_cost: 50, xp_growth_per_level: 10, skill_two_unlock_level: 5, skill_three_unlock_level: 30,
  skill_two_cooldown_ms: 10000, skill_three_cooldown_ms: 12000,
  skill_damage_scale: .72, skill_one_multiplier: 1, skill_two_multiplier: 1.3,
  skill_three_multiplier: 1.75, skill_upgrade_damage_per_level: .04, boss_guaranteed_white_drops: 0,
  starter_weapon_power: 5, guardian_base_attack: 24, hunter_base_attack: 25, arcanist_base_attack: 27,
  base_critical_chance: .11, third_skill_critical_bonus: .11, critical_damage_multiplier: 1.45,
  wing_gem_cost: 5000, wing_attack_bonus: 30, wing_defense_bonus: 50, wing_critical_chance: .15,
  regular_blue_chance: .15, regular_orange_chance: .01, regular_red_chance: .001,
  regular_item_drop_chance: .71, regular_armor_chance: .50,
  boss_blue_chance: .20, boss_orange_chance: .03, boss_red_chance: .01, boss_armor_chance: .50, item_sale_white: 2,
  item_sale_blue: 8, item_sale_orange: 30, item_sale_red: 100, new_year_mode: 1, halloween_mode: 0, seasonal_themes_json: "{}",
  white_weapon_power_min: 5, white_weapon_power_max: 12, white_armor_power_min: 5, white_armor_power_max: 12,
  blue_weapon_power_min: 15, blue_weapon_power_max: 25, blue_armor_power_min: 15, blue_armor_power_max: 25,
  orange_weapon_power_min: 30, orange_weapon_power_max: 45, orange_armor_power_min: 30, orange_armor_power_max: 45,
  red_weapon_power_min: 60, red_weapon_power_max: 85, red_armor_power_min: 60, red_armor_power_max: 85,
  fishing_rod_cost: 100, fish_sokan_value: 1, fish_levrek_value: 3, fish_zargana_value: 5,
  fish_sokan_weight: 55, fish_levrek_weight: 30, fish_zargana_weight: 15, fishing_pearl_chance: .03,
  blacksmith_dust_cost: 250, blacksmith_pearl_cost: 25, blacksmith_gem_cost: 5000,
  guild_create_level:30,guild_create_gems:500,
  stone_art_dust_cost: 20, stone_art_book_cost: 5, stone_art_gem_cost: 100,
  unique_weapon_power: 180, unique_armor_power: 150,
  channel_capacity: 15, sinsi_stone_unlock_level: 50, sinsi_stone_hp: 12000,
  sinsi_stone_respawn_seconds: 180, sinsi_stone_wave_count: 3, sinsi_stone_summon_hp: 650,
  sinsi_stone_summon_damage_scale: .8, sinsi_stone_essence_min: 18, sinsi_stone_essence_max: 32,
  sinsi_stone_gear_drops: 1, sinsi_stone_dust_reward: 3, sinsi_stone_armor_chance: .5,
  sinsi_stone_blue_chance: .32, sinsi_stone_orange_chance: .06, sinsi_stone_red_chance: .01,
  enchant_item_chance: .72, enchant_one_chance: .15, enchant_two_chance: .45, enchant_three_chance: .36, enchant_four_chance: .04,
  enchant_forest_power_weight: 1, enchant_frozen_power_weight: 1,
  enchant_fire_weight: 1, enchant_ice_weight: 1, enchant_sword_defense_weight: 1,
  enchant_arrow_defense_weight: 1, enchant_magic_defense_weight: 1, enchant_strong_players_weight: .7,
  enchant_resistant_players_weight: .7, enchant_critical_weight: .8, enchant_attack_speed_weight: .8, enchant_cast_speed_weight: .8,
  enchant_life_steal_weight: .8, enchant_life_steal_min: 1, enchant_life_steal_max: 15,
  enchant_attack_block_weight: .7, enchant_attack_block_min: 1, enchant_attack_block_max: 15,
  enchant_hp_weight: 1, enchant_hp_tier_one: 60, enchant_hp_tier_two: 120, enchant_hp_tier_three: 180,
  enchant_fire_min: 5, enchant_fire_max: 10, enchant_ice_min: 5, enchant_ice_max: 10,
  enchant_sword_defense_min: 4, enchant_sword_defense_max: 12,
  enchant_arrow_defense_min: 4, enchant_arrow_defense_max: 12,
  enchant_magic_defense_min: 4, enchant_magic_defense_max: 12,
  enchant_strong_players_min: 4, enchant_strong_players_max: 12,
  enchant_resistant_players_min: 4, enchant_resistant_players_max: 12,
  enchant_critical_min: 2, enchant_critical_max: 6, enchant_attack_speed_min: 5, enchant_attack_speed_max: 7,
  boss_fire_interval_seconds: 7, boss_fire_damage_multiplier: 1.2,
  forest_monster_respawn_seconds: 18, frozen_monster_respawn_seconds: 18, black_monster_respawn_seconds: 18, player_max_hp: 100, rest_regen_percent: 4, rest_regen_combat_delay_seconds: 5, rest_regen_still_seconds: 2, monster_rest_regen_percent: 3, monster_rest_regen_combat_delay_seconds: 5,
  elemental_tick_count: 4, elemental_tick_interval_ms: 320,
  pvp_kill_reward_gems: 3, pvp_death_loss_gems: 1, pvp_respawn_seconds: 3,
  arena_1v1_reward_gems: 25, arena_2v2_reward_gems: 35, arena_3v3_reward_gems: 50, arena_5v5_reward_gems: 75,
  frozen_zone_enabled: 1,
  frozen_boss_enabled: 1, frozen_boss_hp: 26000, frozen_boss_damage_scale: .42,
  frozen_boss_respawn_seconds: 600, frozen_boss_xp_reward: 500, frozen_boss_reward_gems: 12,
  ancient_boss_enabled:1, ancient_boss_hp:26000, ancient_boss_damage_scale:.42,
  ancient_boss_respawn_seconds:2400, ancient_boss_xp_reward:500, ancient_boss_reward_gems:12, ancient_boss_purple_chance:.001, ancient_normal_purple_chance:.001, world_boss_purple_chance:.0005,
  frozen_boss_item_drop_chance: .75, frozen_boss_item_drop_count: 1,
  world_boss_stone_book_chance: .4, world_boss_stone_book_min: 1, world_boss_stone_book_max: 1,
  world_boss_evolution_scroll_chance: .4, world_boss_evolution_scroll_min: 1, world_boss_evolution_scroll_max: 1,
  frozen_boss_stone_book_chance: .3, frozen_boss_stone_book_min: 1, frozen_boss_stone_book_max: 1,
  frozen_boss_evolution_scroll_chance: .3, frozen_boss_evolution_scroll_min: 1, frozen_boss_evolution_scroll_max: 1,
  frozen_water_stone_book_chance: .15, frozen_water_stone_book_min: 1, frozen_water_stone_book_max: 1,
  frozen_water_evolution_scroll_chance: .15, frozen_water_evolution_scroll_min: 1, frozen_water_evolution_scroll_max: 1,
  frozen_water_enabled: 1, frozen_water_hp: 9000, frozen_water_damage_scale: .28,
  frozen_water_respawn_seconds: 180, frozen_water_xp_reward: 180, frozen_water_reward_gems: 4,
  frozen_water_item_drop_chance: .35, frozen_water_item_drop_count: 1,
};

export const GAME_SETTINGS_SQL = `SELECT expansion65_enabled, expansion65_preview_player_id, expansion65_revision, events_json, beta_starts_at, beta_ends_at, health_decay_per_second, donation_health_per_essence, boss_hp, boss_respawn_seconds,
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

export const ECONOMY_SETTINGS_SQL = `SELECT * FROM economy_settings WHERE id = 1`;

export const COMBAT_SETTINGS_SQL = `SELECT ${ENCHANT_TIER_KEYS.filter(key=>!key.startsWith("enchant_hp_")).join(", ")}, afk_island_enabled,afk_island_xp_reward,afk_island_respawn_seconds,ancient_golge_xp_reward,ancient_curuk_xp_reward,ancient_yutan_xp_reward,ancient_monster_respawn_seconds,ancient_boss_enabled,ancient_boss_hp,ancient_boss_damage_scale,ancient_boss_respawn_seconds,ancient_boss_xp_reward,ancient_boss_reward_gems,ancient_boss_purple_chance,ancient_normal_purple_chance,world_boss_purple_chance, boss_fire_interval_seconds, boss_fire_damage_multiplier, forest_monster_respawn_seconds, frozen_monster_respawn_seconds, black_monster_respawn_seconds, player_max_hp, rest_regen_percent, rest_regen_combat_delay_seconds, rest_regen_still_seconds, monster_rest_regen_percent, monster_rest_regen_combat_delay_seconds,
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

export type WorldPlayer = {
  is_gm?:number; weapon_skin_enabled?:number; costume_equipped?:number;
  id: string; name: string; role: string; x: number; y: number; hp: number; max_hp: number; hp_revision: number; respawn_at_ms: number;
  essence: number; contribution: number; xp: number; level: number; gems: number; core_coins: number; potions: number;
  skill_one: number; skill_two: number; skill_three: number; area: string; channel: number; arena_match_id: string; last_seen: number;
  has_rod: number; rod_equipped: number; fish_sokan: number; fish_levrek: number; fish_zargana: number; pearls: number; stone_dust: number;
  xp_ring_until: number; drop_charm_until: number;
  has_wings: number; wings_equipped: number; wings_expires_at_ms?: number; core_wings?: number;
  pet_kind: "bird" | "monkey" | "dog" | "dragon" | "starter" | null;
  combat_lock_until_ms: number;
};

export type WorldMonster = {
  id: string; name: string; x: number; y: number; hp: number; max_hp: number;
  respawn_at: number; variant: string; is_boss: number; despawn_at: number; spawn_round: number;
  area: string; channel: number; is_stone: number; wave_stage: number; summoned: number; parent_stone_id: string | null;
};

export type WorldDrop = {
  id: string; owner_id: string; monster_id: string; kind: string; item_name: string | null;
  rarity: string; power: number; amount: number; role: string | null; enchantments: string; x: number; y: number; expires_at: number; collectible_at: number;
};

export type PlayerItem = {
  id: string; player_id: string; kind: string; item_name: string; rarity: string;
  power: number; role: string; enchantments: string; equipped: number; created_at: number;
};

export function db() {
  if (!env.DB) throw new Error("Dünya veritabanı bağlı değil.");
  return env.DB;
}

// Oturum sorgusu oyuncunun alan ve seviyesini zaten okur. Böylece sıcak dünya,
// heartbeat ve hareket yollarına fazladan bir D1 okuması eklemeden yalnız bozuk
// eski satırı onarırız. WHERE koşulu eşzamanlı bir seviye artışını ezmez.
export async function repairFrozenLevelInvariant(
  database: ReturnType<typeof db>,
  playerId: string,
  accountId: string,
  access: { area: string; level: number } | null,
  nowMs = Date.now(),
) {
  if (!playerId || access?.area !== "frozen" || access.level >= FROZEN_UNLOCK_LEVEL) return false;
  const repaired = await database.prepare(
    `UPDATE players SET area = 'bazaar', arena_match_id = '', x = ?, y = ?,
       movement_checked_at_ms = ?, movement_debt_ms = 0,
       motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1,
       realtime_scope_version = realtime_scope_version + 1, combat_lock_until_ms = 0
     WHERE id = ? AND account_id = ? AND area = 'frozen' AND level < ?
     RETURNING id`,
  ).bind(
    BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, nowMs,
    playerId, accountId, FROZEN_UNLOCK_LEVEL,
  ).first<{ id: string }>();
  return Boolean(repaired);
}

export function nowSeconds() { return Math.floor(Date.now() / 1000); }
export function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
type XpSettings = Pick<GameSettings, "xp_base_cost" | "xp_growth_per_level" | "xp_curve_json">;
export function xpCostForLevel(level: number, settings: XpSettings) { return level >= LEVEL_CAP ? 0 : levelCosts(settings)[Math.max(0,level-1)]; }
export function totalXpForLevel(level: number, settings: XpSettings) { return levelStart(level,levelCosts(settings)); }
export function levelFromXp(xp: number, settings: XpSettings) {
 const costs=levelCosts(settings);let level=1,total=0;
 while(level<LEVEL_CAP && xp>=total+costs[level-1]){total+=costs[level-1];level++;}return level;
}

// A basic attack lands every 607-650 ms. A sub-second cache caused nearly
// every other hit to reopen the three settings tables under load. Five
// seconds is still short enough for admin changes to propagate quickly, while
// invalidation keeps the current isolate immediate.
const GAME_SETTINGS_CACHE_MS = 5_000;
let gameSettingsCache: { value: GameSettings; expiresAt: number } | null = null;
let gameSettingsCacheGeneration = 0;
type NativeSettingsRead = {
  generation: number;
  expiresAt: number;
  value?: GameSettings;
  promise?: Promise<GameSettings>;
};
// The native SQLite handle is process-owned. D1 promises are request-owned and
// must never be shared; that runtime retains its completed-value cache only.
const nativeSettingsReads = new WeakMap<object, NativeSettingsRead>();

export function invalidateGameSettingsCache() {
  gameSettingsCache = null;
  gameSettingsCacheGeneration += 1;
}

async function readGameSettings(database: ReturnType<typeof db>): Promise<GameSettings> {
  const [game, economy, combat] = await Promise.all([
    database.prepare(GAME_SETTINGS_SQL).first<Partial<GameSettings>>(),
    database.prepare(ECONOMY_SETTINGS_SQL).first<Partial<GameSettings>>(),
    database.prepare(COMBAT_SETTINGS_SQL).first<Partial<GameSettings>>(),
  ]);
  const value = { ...DEFAULT_SETTINGS, ...(game ?? {}), ...(economy ?? {}), ...(combat ?? {}), ...((globalThis as any).__colPremium?.forestPolicy?.()??{forest_after_level:30,forest_reduction_percent:30}) };
  value.channel_capacity = Math.max(1, Math.min(30, Math.round(Number(value.channel_capacity) || 15)));
  return value;
}

export async function getGameSettings(): Promise<GameSettings> {
  const now = Date.now();
  const generation = gameSettingsCacheGeneration;
  if ((env as unknown as { CORE_RUNTIME?: string }).CORE_RUNTIME === "vds") {
    const database = db();
    const current = nativeSettingsReads.get(database);
    if (current?.generation === generation) {
      if (current.value && current.expiresAt > now) return current.value;
      if (current.promise) return await current.promise;
    }
    const read: NativeSettingsRead = { generation, expiresAt: 0 };
    nativeSettingsReads.set(database, read);
    read.promise = readGameSettings(database).then(value => {
      if (gameSettingsCacheGeneration === generation && nativeSettingsReads.get(database) === read) {
        read.value = value;
        read.expiresAt = Date.now() + GAME_SETTINGS_CACHE_MS;
      }
      return value;
    }).finally(() => {
      // An old completion must not clear a newer read started after invalidation.
      if (nativeSettingsReads.get(database) === read) {
        read.promise = undefined;
        if (!read.value) nativeSettingsReads.delete(database);
      }
    });
    return await read.promise;
  }
  if (gameSettingsCache && gameSettingsCache.expiresAt > now) return gameSettingsCache.value;
  const value = await readGameSettings(db());
  if (gameSettingsCacheGeneration === generation) {
    gameSettingsCache = { value, expiresAt: Date.now() + GAME_SETTINGS_CACHE_MS };
  }
  return value;
}

const seeds = [
  ["golge-1", "Gölge Kurdu", 460, 700, 220], ["golge-2", "Gölge Kurdu", 1940, 700, 220],
  ["golge-3", "Gölge Kurdu", 420, 1060, 220], ["golge-4", "Gölge Kurdu", 1980, 1060, 220],
  ["curuk-1", "Çürük Muhafız", 760, 820, 340], ["curuk-2", "Çürük Muhafız", 1640, 820, 340],
  ["curuk-3", "Çürük Muhafız", 700, 1250, 340], ["curuk-4", "Çürük Muhafız", 1700, 1250, 340],
  ["yutan-1", "Öz Yutan", 1040, 1280, 480], ["yutan-2", "Öz Yutan", 1360, 1280, 480],
] as const;

const forestSpawnSeeds = [
  ...[[460, 700], [1940, 700], [420, 1060], [1980, 1060]].map(([x, y], index) => ({ prefix: "golge" as const, name: "Gölge Kurdu", x, y, hp: 220, index: index + 1 })),
  ...[[760, 820], [1640, 820], [700, 1250], [1700, 1250]].map(([x, y], index) => ({ prefix: "curuk" as const, name: "Çürük Muhafız", x, y, hp: 340, index: index + 1 })),
  ...[[1040, 1280], [1360, 1280]].map(([x, y], index) => ({ prefix: "yutan" as const, name: "Öz Yutan", x, y, hp: 480, index: index + 1 })),
] as const;

// Donmuş Çam Geçidi geniştir; slotlar merkez boss alanını, giriş yolunu ve
// sağ üst gölü boş bırakacak biçimde sabit av açıklıklarına dağıtılır.
const frozenSpawnSeeds = [
  ...[[300, 250], [850, 250], [1400, 240], [1980, 260], [420, 720], [980, 690], [2210, 740], [3050, 840]]
    .map(([x, y], index) => ({ prefix: "golge" as const, name: "Kırağı Vaşağı", x, y, index: index + 1 })),
  ...[[280, 1200], [800, 1170], [2150, 1220], [2720, 1190], [3100, 1320], [430, 1670]]
    .map(([x, y], index) => ({ prefix: "curuk" as const, name: "Buzkök Golemi", x, y, index: index + 1 })),
  ...[[980, 1600], [2050, 1640], [2600, 1640], [3060, 1770]]
    .map(([x, y], index) => ({ prefix: "yutan" as const, name: "Tipi Kâhini", x, y, index: index + 1 })),
] as const;

const sinsiStoneSeeds = [
  [650, 315], [1190, 330], [1775, 340],
  [320, 670], [1060, 720], [1980, 690],
  [410, 1070], [1830, 1115],
] as const;

let worldSeeded = false;
let worldSeedJob: Promise<void> | null = null;


async function seedWorld() {
  const database = db();
  const now = nowSeconds();
  let existingState = await database.prepare(
    `SELECT layout_version, guardian_reward_at,
       COALESCE((SELECT guardian_reward_seconds FROM game_settings WHERE id = 1), ?) AS guardian_reward_seconds
     FROM world_state WHERE id = 1`,
  ).bind(DEFAULT_SETTINGS.guardian_reward_seconds).first<{ layout_version: number; guardian_reward_at: number; guardian_reward_seconds: number }>();
  // Recover an empty monster registry left by older beta-reset releases.
  // Only the map initialization marker changes; all balance/settings stay intact.
  if (existingState && !(await database.prepare("SELECT id FROM monsters LIMIT 1").first())) {
    await database.prepare("UPDATE world_state SET layout_version=0 WHERE id=1 AND NOT EXISTS(SELECT 1 FROM monsters)").run();
    existingState = { ...existingState, ...(await database.prepare("SELECT layout_version FROM world_state WHERE id=1").first<{layout_version:number}>()) };
  }
  if ((existingState?.layout_version ?? 0) >= 24) {
    if (Number(existingState?.guardian_reward_at ?? 0) <= 0) {
      await database.prepare("UPDATE world_state SET guardian_reward_at = ? WHERE id = 1 AND guardian_reward_at <= 0")
        .bind(now + (existingState?.guardian_reward_seconds ?? DEFAULT_SETTINGS.guardian_reward_seconds)).run();
    }
    return;
  }

  const statements = [
    database.prepare("INSERT OR IGNORE INTO world_state (id, health, updated_at, layout_version, guardian_reward_at) VALUES (1, 64, ?, 3, ?)").bind(now, now + DEFAULT_SETTINGS.guardian_reward_seconds),
    ...(existingState && existingState.layout_version >= 11 ? [] : seeds.map(([id, name, x, y, hp]) => database.prepare(
      `INSERT OR IGNORE INTO monsters (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss)
       SELECT ?, ?, ?, ?, ?, ?, 0, 'normal', 0
       WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 11)`,
    ).bind(id, name, x, y, hp, hp))),
    database.prepare("INSERT OR IGNORE INTO monsters (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round) VALUES ('dunya-bosu-1', 'Çürümenin Kadimi', ?, ?, 0, 18000, ?, 'boss', 1, 0, 0)").bind(BOSS_SPAWN.x, BOSS_SPAWN.y, now + BOSS_RESPAWN_SECONDS),
  ];
  await database.batch(statements);
  const state = existingState ?? await database.prepare("SELECT layout_version FROM world_state WHERE id = 1").first<{ layout_version: number }>();
  if ((state?.layout_version ?? 1) < 2) {
    await database.batch([
      ...seeds.map(([id, , x, y]) => database.prepare("UPDATE monsters SET x = ?, y = ? WHERE id = ?").bind(x, y, id)),
      database.prepare("UPDATE players SET x = 1200, y = 900 WHERE x < 100 OR x > 2300 OR y < 100 OR y > 1400"),
      database.prepare("UPDATE world_state SET layout_version = 2 WHERE id = 1"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 3) {
    await database.batch([
      database.prepare("UPDATE monsters SET hp = 0, max_hp = 18000, respawn_at = ?, despawn_at = 0 WHERE is_boss = 1").bind(now + 30),
      database.prepare("UPDATE world_state SET layout_version = 3 WHERE id = 1"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 4) {
    await database.batch([
      ...seeds.map(([id, , , , hp]) => database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, spawn_round = spawn_round + 1 WHERE id = ? AND is_boss = 0").bind(hp, hp, id)),
      database.prepare("DELETE FROM monster_participants"),
      database.prepare("UPDATE world_state SET layout_version = 4 WHERE id = 1"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 5) {
    await database.batch([
      ...seeds.map(([id, , x, y]) => database.prepare(
        "UPDATE monsters SET x = ?, y = ?, spawn_round = spawn_round + 1 WHERE id = ? AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 5)",
      ).bind(x, y, id)),
      database.prepare(
        "UPDATE monsters SET x = 1900, y = 900, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 5)",
      ),
      database.prepare("DELETE FROM monster_participants WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 5)"),
      database.prepare("UPDATE world_state SET layout_version = 5 WHERE id = 1"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 6) {
    const cleanBossRespawn = nowSeconds() + 10;
    await database.batch([
      database.prepare(
        "UPDATE monsters SET x = ?, y = ?, hp = 0, respawn_at = ?, despawn_at = 0, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 6)",
      ).bind(BOSS_SPAWN.x, BOSS_SPAWN.y, cleanBossRespawn),
      database.prepare("DELETE FROM boss_participants WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 6)"),
      database.prepare("DELETE FROM monster_participants WHERE monster_id = 'dunya-bosu-1' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 6)"),
      database.prepare("UPDATE world_state SET layout_version = 6 WHERE id = 1"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 7) {
    const sanctumBossRespawn = nowSeconds() + 10;
    await database.batch([
      database.prepare(
        "UPDATE monsters SET x = ?, y = ?, hp = 0, respawn_at = ?, despawn_at = 0, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 7)",
      ).bind(BOSS_SPAWN.x, BOSS_SPAWN.y, sanctumBossRespawn),
      database.prepare("DELETE FROM boss_participants WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 7)"),
      database.prepare("DELETE FROM monster_participants WHERE monster_id = 'dunya-bosu-1' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 7)"),
      database.prepare("UPDATE world_state SET layout_version = 7 WHERE id = 1"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 8) {
    const stoneSettings = await database.prepare("SELECT sinsi_stone_hp FROM game_settings WHERE id = 1").first<{ sinsi_stone_hp: number }>();
    const stoneHp = stoneSettings?.sinsi_stone_hp ?? DEFAULT_SETTINGS.sinsi_stone_hp;
    await database.batch([
      database.prepare("UPDATE monsters SET area = CASE WHEN is_boss = 1 THEN 'sanctum' ELSE 'forest' END, channel = 0 WHERE area NOT IN ('ancient','afk') AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 8)"),
      ...Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) =>
        sinsiStoneSeeds.map(([x, y], stoneIndex) => database.prepare(
          `INSERT OR IGNORE INTO monsters
            (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
           VALUES (?, ?, ?, ?, ?, ?, 0, 'stone', 0, 0, 1, 'sinsi', ?, 1, 0, 0)`,
        ).bind(`sinsi-tasi-c${channelIndex + 1}-${stoneIndex + 1}`, `Sinsi Taş ${stoneIndex + 1}`, x, y, stoneHp, stoneHp, channelIndex + 1)),
      ).flat(),
      database.prepare("UPDATE world_state SET layout_version = 8 WHERE id = 1"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 9) {
    const stoneSettings = await database.prepare("SELECT sinsi_stone_hp FROM game_settings WHERE id = 1").first<{ sinsi_stone_hp: number }>();
    const stoneHp = stoneSettings?.sinsi_stone_hp ?? DEFAULT_SETTINGS.sinsi_stone_hp;
    await database.batch([
      ...Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) =>
        sinsiStoneSeeds.map(([x, y], stoneIndex) => database.prepare(
          `INSERT INTO monsters
            (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
           VALUES (?, ?, ?, ?, ?, ?, 0, 'stone', 0, 0, 1, 'sinsi', ?, 1, 0, 0)
           ON CONFLICT(id) DO UPDATE SET x=excluded.x, y=excluded.y`,
        ).bind(`sinsi-tasi-c${channelIndex + 1}-${stoneIndex + 1}`, `Sinsi Taş ${stoneIndex + 1}`, x, y, stoneHp, stoneHp, channelIndex + 1)),
      ).flat(),
      database.prepare("UPDATE world_state SET layout_version = 9 WHERE id = 1"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 10) {
    await database.batch([
      database.prepare("DELETE FROM monsters WHERE summoned = 1 AND area = 'sinsi'"),
      database.prepare("DELETE FROM monster_participants WHERE monster_id LIKE 'sinsi-tasi-%' OR monster_id LIKE '%-sinsi-%'"),
      ...Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) =>
        sinsiStoneSeeds.map(([x, y], stoneIndex) => database.prepare(
          `UPDATE monsters SET x = ?, y = ?, spawn_round = spawn_round + 1
           WHERE id = ? AND is_stone = 1 AND channel = ?`,
        ).bind(x, y, `sinsi-tasi-c${channelIndex + 1}-${stoneIndex + 1}`, channelIndex + 1)),
      ).flat(),
      database.prepare("UPDATE world_state SET layout_version = 10 WHERE id = 1"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 11) {
    const configuredHp = await database.prepare(
      "SELECT shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp FROM game_settings WHERE id = 1",
    ).first<{ shadow_wolf_hp: number; rotten_guardian_hp: number; essence_devourer_hp: number }>();
    const forestHp = {
      golge: configuredHp?.shadow_wolf_hp ?? DEFAULT_SETTINGS.shadow_wolf_hp,
      curuk: configuredHp?.rotten_guardian_hp ?? DEFAULT_SETTINGS.rotten_guardian_hp,
      yutan: configuredHp?.essence_devourer_hp ?? DEFAULT_SETTINGS.essence_devourer_hp,
    } as const;
    await database.batch([
      // Eski katılımcı satırlarını bırak: dağıtım anında henüz teslim edilmemiş
      // ölüm ödülleri bu kayıtlarla tamamlanır, 24 saatlik bakımda temizlenir.
      database.prepare("DELETE FROM monsters WHERE area = 'forest' AND is_boss = 0 AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 11)"),
      ...Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) => forestSpawnSeeds.map((seed) => database.prepare(
        `INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         SELECT ?, ?, ?, ?, ?, ?, 0, 'normal', 0, 0, 1, 'forest', ?, 0, 0, 0
         WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 11)`,
      ).bind(`${seed.prefix}-c${channelIndex + 1}-${seed.index}`, seed.name, seed.x, seed.y, forestHp[seed.prefix], forestHp[seed.prefix], channelIndex + 1))).flat(),
      database.prepare("UPDATE world_state SET layout_version = 11 WHERE id = 1 AND layout_version < 11"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 12) {
    const forestIdList = (ids: readonly string[]) => ids.map((id) => `'${id}'`).join(", ");
    const legacyForestIds = seeds.map(([monsterId]) => monsterId);
    const retainedForestGroups = forestSpawnSeeds.map((seed) => ({
      seed,
      ids: Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) => `${seed.prefix}-c${channelIndex + 1}-${seed.index}`),
    }));
    const retainedForestIds = retainedForestGroups.flatMap(({ ids }) => ids);
    const retiredForestIds = Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) =>
      (["golge", "curuk", "yutan"] as const).flatMap((prefix) => [7, 8, 9].map((index) => `${prefix}-c${channelIndex + 1}-${index}`)),
    ).flat();
    await database.batch([
      // v11 canlı veritabanında eski başlangıç seed'lerinin yeniden eklenmesini
      // önle; önceki merkez yaratıkları hiçbir kanala sızmasın.
      database.prepare(
        `DELETE FROM monsters
         WHERE id IN (${forestIdList(legacyForestIds)})
           AND area = 'forest' AND is_boss = 0 AND channel = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 12)`,
      ),
      // Her kanalı ayrı sorguyla güncellemek D1'in invocation sınırını aşabiliyor.
      // Sabit, kaynak-kontrollü ID'leri tek atomik CASE ifadesinde taşı.
      database.prepare(
        `UPDATE monsters
         SET x = CASE
           ${retainedForestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.x}`).join("\n           ")}
           ELSE x END,
             y = CASE
           ${retainedForestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.y}`).join("\n           ")}
           ELSE y END,
             spawn_round = spawn_round + 1
         WHERE id IN (${forestIdList(retainedForestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 12)`,
      ),
      database.prepare(
        `DELETE FROM monsters
         WHERE id IN (${forestIdList(retiredForestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 12)`,
      ),
      // Katılımcı/ölüm kayıtlarına dokunma: dağıtım öncesi kazanılmış ama henüz
      // teslim alınmamış ödüller eski doğum turu üzerinden alınabilmeye devam eder.
      database.prepare("UPDATE world_state SET layout_version = 12 WHERE id = 1 AND layout_version < 12"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 13) {
    const forestIdList = (ids: readonly string[]) => ids.map((id) => `'${id}'`).join(", ");
    const forestGroups = forestSpawnSeeds.map((seed) => ({
      seed,
      ids: Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) => `${seed.prefix}-c${channelIndex + 1}-${seed.index}`),
    }));
    const forestIds = forestGroups.flatMap(({ ids }) => ids);
    await database.batch([
      // Canlı yaratıkları silmeden aynı kimliklerle dağınık konumlara taşı.
      // Tur numarasını koru; böylece devam eden savaşların katılımcı ve ödül
      // kayıtları yer değişimi sırasında geçerliliğini kaybetmez.
      database.prepare(
        `UPDATE monsters
         SET x = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.x}`).join("\n           ")}
           ELSE x END,
             y = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.y}`).join("\n           ")}
           ELSE y END
         WHERE id IN (${forestIdList(forestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 13)`,
      ),
      database.prepare("UPDATE world_state SET layout_version = 13 WHERE id = 1 AND layout_version < 13"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 14) {
    const forestIdList = (ids: readonly string[]) => ids.map((id) => `'${id}'`).join(", ");
    const forestGroups = forestSpawnSeeds.map((seed) => ({
      seed,
      ids: Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) => `${seed.prefix}-c${channelIndex + 1}-${seed.index}`),
    }));
    const forestIds = forestGroups.flatMap(({ ids }) => ids);
    await database.batch([
      // Kimlik, doğum turu ve mevcut savaş katkıları korunarak yaratıkları
      // görseldeki sabit av açıklıklarının merkezlerine taşı.
      database.prepare(
        `UPDATE monsters
         SET x = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.x}`).join("\n           ")}
           ELSE x END,
             y = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.y}`).join("\n           ")}
           ELSE y END
         WHERE id IN (${forestIdList(forestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 14)`,
      ),
      database.prepare("UPDATE world_state SET layout_version = 14 WHERE id = 1 AND layout_version < 14"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 15) {
    const configuredHp = await database.prepare(
      "SELECT shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp FROM game_settings WHERE id = 1",
    ).first<{ shadow_wolf_hp: number; rotten_guardian_hp: number; essence_devourer_hp: number }>();
    const forestHp = {
      golge: configuredHp?.shadow_wolf_hp ?? DEFAULT_SETTINGS.shadow_wolf_hp,
      curuk: configuredHp?.rotten_guardian_hp ?? DEFAULT_SETTINGS.rotten_guardian_hp,
      yutan: configuredHp?.essence_devourer_hp ?? DEFAULT_SETTINGS.essence_devourer_hp,
    } as const;
    const forestIdList = (ids: readonly string[]) => ids.map((id) => `'${id}'`).join(", ");
    const legacyForestIds = seeds.map(([monsterId]) => monsterId);
    const retiredForestIds = Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) => [
      ...[5, 6].map((index) => `golge-c${channelIndex + 1}-${index}`),
      ...[5, 6].map((index) => `curuk-c${channelIndex + 1}-${index}`),
      ...[3, 4, 5, 6].map((index) => `yutan-c${channelIndex + 1}-${index}`),
    ]).flat();
    await database.batch([
      database.prepare(
        `DELETE FROM monsters
         WHERE id IN (${forestIdList([...legacyForestIds, ...retiredForestIds])})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 15)`,
      ),
      ...Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) => forestSpawnSeeds.map((seed) => database.prepare(
        `INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'normal', 0, 0, 1, 'forest', ?, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, area='forest', channel=excluded.channel,
           is_boss=0, is_stone=0, summoned=0`,
      ).bind(`${seed.prefix}-c${channelIndex + 1}-${seed.index}`, seed.name, seed.x, seed.y, forestHp[seed.prefix], forestHp[seed.prefix], channelIndex + 1))).flat(),
      // Geniş V4 haritasında kalan oyuncular yeni eski harita sınırlarının
      // dışında bir bilet üretmesin; yalnız geçersiz konumları güvenli girişe al.
      database.prepare(
        "UPDATE players SET x = 1200, y = 900 WHERE area = 'forest' AND (x < 55 OR x > 2345 OR y < 80 OR y > 1420) AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 15)",
      ),
      database.prepare("UPDATE world_state SET layout_version = 15 WHERE id = 1 AND layout_version < 15"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 16) {
    const [configuredHp, frozenSettings] = await Promise.all([
      database.prepare(
        "SELECT shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp FROM game_settings WHERE id = 1",
      ).first<{ shadow_wolf_hp: number; rotten_guardian_hp: number; essence_devourer_hp: number }>(),
      database.prepare(
        `SELECT frozen_zone_enabled, frozen_boss_enabled, frozen_boss_hp,
                frozen_water_enabled, frozen_water_hp
         FROM combat_settings WHERE id = 1`,
      ).first<Partial<GameSettings>>(),
    ]);
    const normalHp = {
      golge: configuredHp?.shadow_wolf_hp ?? DEFAULT_SETTINGS.shadow_wolf_hp,
      curuk: configuredHp?.rotten_guardian_hp ?? DEFAULT_SETTINGS.rotten_guardian_hp,
      yutan: configuredHp?.essence_devourer_hp ?? DEFAULT_SETTINGS.essence_devourer_hp,
    } as const;
    const zoneEnabled = (frozenSettings?.frozen_zone_enabled ?? DEFAULT_SETTINGS.frozen_zone_enabled) === 1;
    const bossHp = frozenSettings?.frozen_boss_hp ?? DEFAULT_SETTINGS.frozen_boss_hp;
    const waterHp = frozenSettings?.frozen_water_hp ?? DEFAULT_SETTINGS.frozen_water_hp;
    const bossActive = zoneEnabled && (frozenSettings?.frozen_boss_enabled ?? DEFAULT_SETTINGS.frozen_boss_enabled) === 1;
    const waterActive = zoneEnabled && (frozenSettings?.frozen_water_enabled ?? DEFAULT_SETTINGS.frozen_water_enabled) === 1;
    await database.batch([
      ...Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) => frozenSpawnSeeds.map((seed) => database.prepare(
        `INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'normal', 0, 0, 1, 'frozen', ?, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, area='frozen', channel=excluded.channel,
           is_boss=0, is_stone=0, summoned=0`,
      ).bind(
        `${seed.prefix}-frozen-c${channelIndex + 1}-${seed.index}`,
        seed.name,
        seed.x,
        seed.y,
        normalHp[seed.prefix],
        normalHp[seed.prefix],
        channelIndex + 1,
      ))).flat(),
      database.prepare(
        `INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, 'Ayaz Tahtının Bekçisi', ?, ?, ?, ?, 0, 'frost_boss', 0, 0, 1, 'frozen', 0, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, max_hp=excluded.max_hp,
           hp=MIN(hp, excluded.max_hp), variant='frost_boss', area='frozen', channel=0,
           is_boss=0, is_stone=0, summoned=0`,
      ).bind(FROZEN_BOSS_ID, FROZEN_BOSS_SPAWN.x, FROZEN_BOSS_SPAWN.y, bossActive ? bossHp : 0, bossHp),
      ...Array.from({ length: CHANNEL_COUNT }, (_, channelIndex) => database.prepare(
        `INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, 'Buzgölü Semenderi', ?, ?, ?, ?, 0, 'frost_water', 0, 0, 1, 'frozen', ?, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, max_hp=excluded.max_hp,
           hp=MIN(hp, excluded.max_hp), variant='frost_water', area='frozen', channel=excluded.channel,
           is_boss=0, is_stone=0, summoned=0`,
      ).bind(
        `${FROZEN_WATER_ID_PREFIX}${channelIndex + 1}`,
        FROZEN_WATER_SPAWN.x,
        FROZEN_WATER_SPAWN.y,
        waterActive ? waterHp : 0,
        waterHp,
        channelIndex + 1,
      )),
      database.prepare("UPDATE world_state SET layout_version = 16 WHERE id = 1 AND layout_version < 16"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 17) {
    await database.batch([
      // Only ordinary Frozen IDs are renamed. Both protected elites have
      // is_boss=0, so an is_boss filter alone would be unsafe here.
      database.prepare("UPDATE monsters SET name = 'Kırağı Vaşağı' WHERE area = 'frozen' AND id LIKE 'golge-frozen-%' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 17)"),
      database.prepare("UPDATE monsters SET name = 'Buzkök Golemi' WHERE area = 'frozen' AND id LIKE 'curuk-frozen-%' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 17)"),
      database.prepare("UPDATE monsters SET name = 'Tipi Kâhini' WHERE area = 'frozen' AND id LIKE 'yutan-frozen-%' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 17)"),
      // Do not rescale every live monster during a first request. Keeping this
      // upgrade to four bounded statements avoids many cold isolates competing
      // for a long D1 write. Existing monsters intentionally converge to the
      // selected exact HP profile on the next admin HP edit or ordinary respawn.
      database.prepare("UPDATE world_state SET layout_version = 17 WHERE id = 1 AND layout_version < 17"),
    ]);
  }
  if ((state?.layout_version ?? 1) < 18) {
    const slots = [
      ["golge", 500, 400], ["curuk", 950, 350], ["yutan", 1450, 350], ["golge", 1900, 450],
      ["curuk", 450, 950], ["yutan", 950, 1050], ["golge", 1500, 1000], ["curuk", 1950, 950],
    ] as const;
    await database.batch([
      ...Array.from({ length: CHANNEL_COUNT }, (_, channel) => slots.map(([species, x, y], slot) =>
        database.prepare(`INSERT OR IGNORE INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, area, channel)
          VALUES (?, ?, ?, ?, 750, 750, 0, 'katil', 0, 'black', ?)`)
          .bind(`${species}-black-c${channel + 1}-${slot + 1}`, `Kara Muhafız ${slot + 1}`, x, y, channel + 1),
      )).flat(),
      database.prepare("UPDATE world_state SET layout_version = 18 WHERE id = 1 AND layout_version < 18"),
    ]);
  }

  if ((state?.layout_version ?? 1) < 19) {
    // Cosmetic rename only: retain all IDs, health, rewards and spawn timers.
    await database.batch([
      database.prepare(`UPDATE monsters SET name = CASE ((CAST(substr(id, -1) AS INTEGER) - 1) % 4)
        WHEN 0 THEN 'Obsidyen Akrep' WHEN 1 THEN 'Kumtaşı Golemi'
        WHEN 2 THEN 'Mezar Muhafızı' ELSE 'Kül Çakalı' END
        WHERE area = 'black' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 19)`),
      database.prepare("UPDATE world_state SET layout_version = 19 WHERE id = 1 AND layout_version < 19"),
    ]);
  }

  if ((state?.layout_version ?? 1) < 20) {
    await database.batch([
      ...Array.from({ length: CHANNEL_COUNT }, (_, i) => EXPANDED_FOREST_SPAWNS.map(seed =>
        database.prepare(FOREST_SPAWN_UPSERT_SQL).bind(
          `${seed.family}-c${i + 1}-${seed.number}`, seed.name, seed.x, seed.y,
          seed.profileKey, seed.fallbackHp, seed.profileKey, seed.fallbackHp, seed.variant, i + 1,
        ),
      )).flat(),
      database.prepare("UPDATE world_state SET layout_version=20 WHERE id=1 AND layout_version<20"),
    ]);
  }

  if ((state?.layout_version ?? 1) < 21) {
    await database.batch([
      database.prepare("UPDATE monsters SET x=x*1.5,y=y*1.5 WHERE area='black' AND EXISTS (SELECT 1 FROM world_state WHERE id=1 AND layout_version<21)"),
      database.prepare("UPDATE world_state SET layout_version=21 WHERE id=1 AND layout_version<21"),
    ]);
  }

  if ((state?.layout_version ?? 1) < 22) {
    const families=["golge","curuk","yutan","golge","curuk","yutan","golge","curuk"];
    const writes=[];
    for(let channel=1;channel<=CHANNEL_COUNT;channel++)for(let i=0;i<24;i++){
      const slot=i%8+1,pack=Math.floor(i/8),family=families[slot-1];
      const angle=(i*7%24)*Math.PI*2/24;
      const x=Math.round(1800+Math.cos(angle)*(1250+(i%3)*55));
      const y=Math.round(1100+Math.sin(angle)*(710+(i%2)*70));
      const sourceId=`${family}-black-c${channel}-${slot}`;
      if(pack===0)writes.push(database.prepare("UPDATE monsters SET x=?,y=? WHERE id=? AND EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<22)").bind(x,y,sourceId));
      else writes.push(database.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,area,channel)
        SELECT ?,name,?,?,max_hp,max_hp,0,variant,0,'black',channel FROM monsters WHERE id=?
        AND EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<22)`).bind(`${family}-pack${pack+1}-black-c${channel}-${slot}`,x,y,sourceId));
    }
    await database.batch([...writes,database.prepare("UPDATE world_state SET layout_version=22 WHERE id=1 AND layout_version<22")]);
  }

  if((state?.layout_version??1)<23)await expandHuntingWorld(database);
  if((state?.layout_version??1)<24)await database.batch([
    database.prepare(`UPDATE players SET
      x=CASE WHEN ((x-1500)/500.0)*((x-1500)/500.0)+((y-830)/380.0)*((y-830)/380.0)<=1 THEN (x-1500)*.9+1800 ELSE x*1.2 END,
      y=CASE WHEN ((x-1500)/500.0)*((x-1500)/500.0)+((y-830)/380.0)*((y-830)/380.0)<=1 THEN (y-830)*.9+996 ELSE y*1.2 END,
      position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0
      WHERE area='war' AND EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<24)`),
    database.prepare("UPDATE world_state SET layout_version=24 WHERE id=1 AND layout_version<24"),
  ]);
}

export async function ensureWorldSeed() {
  await ensureMonsterBalanceInitialized();
  if (worldSeeded) return;
  if (!worldSeedJob) worldSeedJob = seedWorld().then(() => { worldSeeded = true; }).finally(() => { worldSeedJob = null; });
  await worldSeedJob;
}

function randomVariant() {
  const roll = Math.random();
  if (roll < .1) return "katil" as const;
  if (roll < .4) return "agresif" as const;
  return "normal" as const;
}

let nextTickAt = 0;


async function runWorldTick() {
  const database = db();
  const loop=(database as any).worldLoop;
  const memory=loop?.enabled;
  const channel=Number((database as any).channel||0),globalOwner=!channel||channel===1;
  const ownedRepair=(statements:any[])=>!channel?statements:statements.filter(s=>globalOwner||!/^UPDATE market_shops/i.test(s.sql.trim())).map(s=>/^(UPDATE|DELETE FROM) monsters/i.test(s.sql.trim())?database.prepare(s.sql+` AND (channel=${channel}${globalOwner?' OR channel=0':''})`).bind(...s.params):s);
  if(globalOwner&&(!memory||await loop.dragonDue()))await dragonService()?.tick(memory?{cleanup:false}:undefined);
  const now = nowSeconds();
  const nativeSettings=memory?loop.settings(DEFAULT_SETTINGS):null;
  // Eski/yarışmış bir istek canı sıfıra indirip yeniden doğma zamanını yazamamışsa
  // yaratığı sahada 0 canla bırakma. Çağrılmış dalga yaratıkları ise tekrar doğmaz.
  if(!memory||await loop.needsRepair(nativeSettings))await database.batch(ownedRepair([
    database.prepare(
      `DELETE FROM monsters
       WHERE summoned = 1 AND hp <= 0 AND respawn_at <= 0
         AND EXISTS (
           SELECT 1 FROM monsters parent
           WHERE parent.id = monsters.parent_stone_id
             AND parent.spawn_round > monsters.spawn_round
         )`,
    ),
    database.prepare(
      `UPDATE market_shops SET active = 0
       WHERE active = 1 AND created_at <= ?
         AND NOT EXISTS (SELECT 1 FROM market_listings WHERE shop_id = market_shops.id)`,
    ).bind(now - 120),
    database.prepare(
      `UPDATE monsters SET hp = 0, respawn_at = ? + CASE WHEN area = 'forest' THEN COALESCE((SELECT forest_monster_respawn_seconds FROM combat_settings WHERE id=1),18) WHEN area = 'frozen' THEN COALESCE((SELECT frozen_monster_respawn_seconds FROM combat_settings WHERE id=1),18) WHEN area = 'ancient' THEN COALESCE((SELECT ancient_monster_respawn_seconds FROM combat_settings WHERE id=1),25) WHEN area = 'black' THEN COALESCE((SELECT black_monster_respawn_seconds FROM combat_settings WHERE id=1),18) WHEN area = 'afk' THEN COALESCE((SELECT afk_island_respawn_seconds FROM combat_settings WHERE id=1),12) ELSE 18 END
       WHERE summoned = 0 AND hp <= 0 AND respawn_at <= 0 AND is_boss = 0 AND is_stone = 0
         AND id != ? AND id != ? AND id NOT LIKE ? AND id != 'dragon-world-1'`,
    ).bind(now, FROZEN_BOSS_ID, ANCIENT_BOSS_ID, `${FROZEN_WATER_ID_PREFIX}%`),
    database.prepare(
      `UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE(
         (SELECT frozen_boss_respawn_seconds FROM combat_settings WHERE id = 1), ?)
       WHERE id = ? AND hp <= 0 AND respawn_at <= 0
         AND COALESCE((SELECT frozen_zone_enabled FROM combat_settings WHERE id = 1), 1) = 1
         AND COALESCE((SELECT frozen_boss_enabled FROM combat_settings WHERE id = 1), 1) = 1`,
    ).bind(now, DEFAULT_SETTINGS.frozen_boss_respawn_seconds, FROZEN_BOSS_ID),
    database.prepare(
      `UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE(
         (SELECT ancient_boss_respawn_seconds FROM combat_settings WHERE id = 1), ?)
       WHERE id = ? AND hp <= 0 AND respawn_at <= 0
         AND COALESCE((SELECT ancient_boss_enabled FROM combat_settings WHERE id = 1), 1) = 1`,
    ).bind(now, DEFAULT_SETTINGS.ancient_boss_respawn_seconds, ANCIENT_BOSS_ID),
    database.prepare(
      `UPDATE monsters SET hp = 0, respawn_at = 0 WHERE id = ?
         AND COALESCE((SELECT ancient_boss_enabled FROM combat_settings WHERE id = 1), 1) = 0`,
    ).bind(ANCIENT_BOSS_ID),
    database.prepare(
      `UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE(
         (SELECT frozen_water_respawn_seconds FROM combat_settings WHERE id = 1), ?)
       WHERE id LIKE ? AND hp <= 0 AND respawn_at <= 0
         AND COALESCE((SELECT frozen_zone_enabled FROM combat_settings WHERE id = 1), 1) = 1
         AND COALESCE((SELECT frozen_water_enabled FROM combat_settings WHERE id = 1), 1) = 1`,
    ).bind(now, DEFAULT_SETTINGS.frozen_water_respawn_seconds, `${FROZEN_WATER_ID_PREFIX}%`),
    database.prepare(
      `UPDATE monsters SET hp = 0, respawn_at = 0
       WHERE (id = ? OR id LIKE ?)
         AND (COALESCE((SELECT frozen_zone_enabled FROM combat_settings WHERE id = 1), 1) = 0
           OR (id = ? AND COALESCE((SELECT frozen_boss_enabled FROM combat_settings WHERE id = 1), 1) = 0)
           OR (id LIKE ? AND COALESCE((SELECT frozen_water_enabled FROM combat_settings WHERE id = 1), 1) = 0))`,
    ).bind(FROZEN_BOSS_ID, `${FROZEN_WATER_ID_PREFIX}%`, FROZEN_BOSS_ID, `${FROZEN_WATER_ID_PREFIX}%`),
    database.prepare(
      `UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE((SELECT sinsi_stone_respawn_seconds FROM game_settings WHERE id = 1), ?)
       WHERE hp <= 0 AND respawn_at <= 0 AND is_stone = 1`,
    ).bind(now, DEFAULT_SETTINGS.sinsi_stone_respawn_seconds),
  ]));
  const [settingsResult, economySettingsResult, combatSettingsResult, due] = memory ? [{results:[nativeSettings]},{results:[]},{results:[]},{results:await loop.due(now)}] : await database.batch([
    database.prepare(GAME_SETTINGS_SQL),
    database.prepare(ECONOMY_SETTINGS_SQL),
    database.prepare(COMBAT_SETTINGS_SQL),
    database.prepare("SELECT id, area, max_hp, is_boss, is_stone, summoned, spawn_round, respawn_at FROM monsters WHERE id!='dragon-world-1' AND hp <= 0 AND respawn_at > 0 AND respawn_at <= ?").bind(now),
  ]);
  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    ...((settingsResult.results[0] as Partial<GameSettings> | undefined) ?? {}),
    ...((economySettingsResult.results[0] as Partial<GameSettings> | undefined) ?? {}),
    ...((combatSettingsResult.results[0] as Partial<GameSettings> | undefined) ?? {}),
  };
  const respawns = due.results.map((monster: { id: string; area: string; max_hp: number; is_boss: number; is_stone: number; summoned: number; spawn_round: number; respawn_at: number }) => {
    if (monster.summoned) return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND summoned = 1 AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(monster.id, monster.spawn_round, monster.respawn_at, now);
    if (monster.is_stone) return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, wave_stage = 0, respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.sinsi_stone_hp, settings.sinsi_stone_hp, monster.id, monster.spawn_round, monster.respawn_at, now);
    if (monster.is_boss) return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, despawn_at = ?, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.boss_hp, settings.boss_hp, BOSS_SPAWN.x, BOSS_SPAWN.y, now + settings.boss_duration_seconds, monster.id, monster.spawn_round, monster.respawn_at, now);
    if (isFrozenBossId(monster.id)) {
      if (!settings.frozen_zone_enabled || !settings.frozen_boss_enabled) {
        return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ?").bind(monster.id, monster.spawn_round, monster.respawn_at);
      }
      return database.prepare(
        "UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, variant = 'frost_boss', respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?",
      ).bind(settings.frozen_boss_hp, settings.frozen_boss_hp, FROZEN_BOSS_SPAWN.x, FROZEN_BOSS_SPAWN.y, monster.id, monster.spawn_round, monster.respawn_at, now);
    }
    if (isAncientBossId(monster.id)) {
      if (!settings.ancient_boss_enabled) {
        return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ?").bind(monster.id, monster.spawn_round, monster.respawn_at);
      }
      return database.prepare(
        "UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, variant = 'ancient_boss', respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?",
      ).bind(settings.ancient_boss_hp, settings.ancient_boss_hp, ANCIENT_BOSS_SPAWN.x, ANCIENT_BOSS_SPAWN.y, monster.id, monster.spawn_round, monster.respawn_at, now);
    }
    if (isFrozenWaterId(monster.id)) {
      if (!settings.frozen_zone_enabled || !settings.frozen_water_enabled) {
        return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ?").bind(monster.id, monster.spawn_round, monster.respawn_at);
      }
      return database.prepare(
        "UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, variant = 'frost_water', respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?",
      ).bind(settings.frozen_water_hp, settings.frozen_water_hp, FROZEN_WATER_SPAWN.x, FROZEN_WATER_SPAWN.y, monster.id, monster.spawn_round, monster.respawn_at, now);
    }
    const variant = monster.area === "ancient" || monster.area === "afk" ? "normal" : monster.area === "black" ? "katil" : randomVariant();
    const profileKey = monsterBalanceKeyFor({ ...monster, variant });
    const legacyBase = monster.id.startsWith("golge") ? settings.shadow_wolf_hp : monster.id.startsWith("curuk") ? settings.rotten_guardian_hp : settings.essence_devourer_hp;
    const legacyMultiplier = variant === "katil" ? settings.killer_variant_hp_scale : variant === "agresif" ? settings.aggressive_variant_hp_scale : 1;
    const legacyHp = monster.area === "black" ? 750 : Math.round(legacyBase * legacyMultiplier);
    if (!profileKey) {
      return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, variant = ?, respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?")
        .bind(legacyHp, legacyHp, variant, monster.id, monster.spawn_round, monster.respawn_at, now);
    }
    return database.prepare(
      `UPDATE monsters SET
         hp = COALESCE((SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?), ?),
         max_hp = COALESCE((SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?), ?),
         variant = ?, respawn_at = 0, spawn_round = spawn_round + 1
       WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?`,
    ).bind(profileKey, legacyHp, profileKey, legacyHp, variant, monster.id, monster.spawn_round, monster.respawn_at, now);
  });
  const tickResults = await database.batch([
    ...(globalOwner?[database.prepare("UPDATE world_state SET health = MAX(0, health - MAX(0, ? - updated_at) * ?), updated_at = ? WHERE id = 1 AND reset_at = 0 AND updated_at < ?").bind(now, settings.health_decay_per_second, now, now)]:[]),
    ...respawns,
    ...(globalOwner&&(!memory||await loop.needsDespawn(now))?[database.prepare("UPDATE monsters SET hp = 0, respawn_at = ?, despawn_at = 0 WHERE is_boss = 1 AND hp > 0 AND despawn_at > 0 AND despawn_at <= ?").bind(now + settings.boss_respawn_seconds, now)]:[]),
    ...(memory&&globalOwner?[database.prepare("UPDATE market_shops SET active=0 WHERE active=1 AND created_at<=? AND NOT EXISTS(SELECT 1 FROM market_listings WHERE shop_id=market_shops.id)").bind(now-120)]:[]),
    ...(globalOwner?[database.prepare("UPDATE world_state SET reset_at = ? WHERE id = 1 AND health <= 0 AND reset_at = 0").bind(now + 8),
    database.prepare("SELECT reset_at, cycle, guardian_reward_at FROM world_state WHERE id = 1")]:[]),
  ]);
  if(!globalOwner)return;
  const stateResult = tickResults[tickResults.length - 1];
  const state = stateResult.results[0] as { reset_at?: number; cycle?: number; guardian_reward_at?: number } | undefined;
  if (state?.reset_at && state.reset_at <= now) {
    // Talep ve bütün yıkıcı sıfırlama adımları aynı D1 batch işlemindedir.
    // Her adım talep edilen cycle/reset_at değerini yeniden doğrular; böylece
    // eşzamanlı bir yönetici iptali veya başka bir Worker kısmi sıfırlama yapamaz.
    const claimedResetAt = now + 30;
    const stateCycle = state.cycle ?? 0;
    const resetGate = "EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND cycle = ? AND reset_at = ?)";
    await database.batch([
      database.prepare(
        "UPDATE world_state SET reset_at = ? WHERE id = 1 AND reset_at = ? AND cycle = ? RETURNING cycle",
      ).bind(claimedResetAt, state.reset_at, stateCycle),
      // Release guild rosters and restore safe channels before clearing player match IDs.
      database.prepare(`UPDATE arena_matches SET status = 'cancelled', updated_at_ms = ?
        WHERE (status IN ('waiting','countdown','active') OR (status = 'finished' AND settlement_token = ''))
          AND ${resetGate}`).bind(Date.now(), stateCycle, claimedResetAt),
      database.prepare(`UPDATE players SET hp = ?, max_hp = ?, hp_revision = hp_revision + 1, respawn_at_ms = 0, essence = MIN(essence,wheel_paid_essence), contribution = 0, xp = 0, level = 1, gems = MIN(gems,wheel_paid_gems), potions = MIN(potions,wheel_paid_potions), fifth_enchant_scrolls = 0, has_rod = 0, rod_equipped = 0, fish_sokan = 0, fish_levrek = 0, fish_zargana = 0, pearls = MIN(pearls,wheel_paid_pearls), stone_dust = 0, has_wings = CASE WHEN EXISTS(SELECT 1 FROM premium_receipts WHERE player_id=players.id AND ((action='buy' AND product='wings:1') OR (action='wheel_spin' AND json_extract(result,'$.wheel.rewardId')='wings_3d'))) OR EXISTS(SELECT 1 FROM support_pack_grants WHERE player_id=players.id) OR EXISTS(SELECT 1 FROM epin_codes WHERE redeemed_by_player_id=players.id AND status='redeemed' AND product_code NOT LIKE 'core-coins-%') THEN has_wings ELSE 0 END, wings_equipped=0, skill_one = 1, skill_two = 1, skill_three = 1, area = 'bazaar', arena_match_id = '', x = ?, y = ?, movement_checked_at_ms = CASE WHEN MAX(last_seen, CAST(movement_checked_at_ms / 1000 AS INTEGER), CAST(last_monster_hit_at / 1000 AS INTEGER)) >= CAST(strftime('%s','now') AS INTEGER) - 30 THEN CAST(strftime('%s','now') AS INTEGER) * 1000 ELSE movement_checked_at_ms END, movement_debt_ms = 0, motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1, realtime_scope_version = realtime_scope_version + 1, combat_lock_until_ms = 0 WHERE ${resetGate}`).bind(settings.player_max_hp, settings.player_max_hp, BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, stateCycle, claimedResetAt),
      database.prepare(`DELETE FROM player_items WHERE premium_origin=0 AND ${resetGate}`).bind(stateCycle, claimedResetAt),
      database.prepare(`UPDATE player_items SET equipped=0 WHERE premium_origin=1 AND ${resetGate}`).bind(stateCycle, claimedResetAt),
      // Mixed earned/paid stacks retain only their unspent paid portion, just like the bag.
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
      ...(["forest", "frozen", "ancient", "afk"] as const).flatMap((area) => (["golge", "curuk", "yutan"] as const).map((family) => {
        const profileKey = `${area}.${family}.normal`;
        return database.prepare(
          `UPDATE monsters SET
             hp = (SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?),
             max_hp = (SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?),
             respawn_at = 0, variant = 'normal', spawn_round = spawn_round + 1
           WHERE area = ? AND id LIKE ? AND is_boss = 0 AND is_stone = 0 AND summoned = 0
             AND EXISTS (SELECT 1 FROM all_monster_combat_profiles WHERE profile_key = ?) AND ${resetGate}`,
        ).bind(profileKey, profileKey, area, `${family}-%`, profileKey, stateCycle, claimedResetAt);
      })),
      database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, variant = 'frost_boss', spawn_round = spawn_round + 1 WHERE id = ? AND ${resetGate}`).bind(settings.frozen_zone_enabled && settings.frozen_boss_enabled ? settings.frozen_boss_hp : 0, settings.frozen_boss_hp, FROZEN_BOSS_SPAWN.x, FROZEN_BOSS_SPAWN.y, FROZEN_BOSS_ID, stateCycle, claimedResetAt),
      database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, variant = 'ancient_boss', spawn_round = spawn_round + 1 WHERE id = ? AND ${resetGate}`).bind(settings.ancient_boss_enabled ? settings.ancient_boss_hp : 0, settings.ancient_boss_hp, ANCIENT_BOSS_SPAWN.x, ANCIENT_BOSS_SPAWN.y, ANCIENT_BOSS_ID, stateCycle, claimedResetAt),
      database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, variant = 'frost_water', spawn_round = spawn_round + 1 WHERE id LIKE ? AND ${resetGate}`).bind(settings.frozen_zone_enabled && settings.frozen_water_enabled ? settings.frozen_water_hp : 0, settings.frozen_water_hp, FROZEN_WATER_SPAWN.x, FROZEN_WATER_SPAWN.y, `${FROZEN_WATER_ID_PREFIX}%`, stateCycle, claimedResetAt),
      database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, wave_stage = 0, respawn_at = 0, spawn_round = spawn_round + 1 WHERE is_stone = 1 AND ${resetGate}`).bind(settings.sinsi_stone_hp, settings.sinsi_stone_hp, stateCycle, claimedResetAt),
      database.prepare(`UPDATE monsters SET hp = 0, max_hp = ?, x = ?, y = ?, respawn_at = ?, despawn_at = 0, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND ${resetGate}`).bind(settings.boss_hp, BOSS_SPAWN.x, BOSS_SPAWN.y, now + settings.boss_respawn_seconds, stateCycle, claimedResetAt),
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
      database.prepare("UPDATE world_state SET health = 50, updated_at = ?, cycle = cycle + 1, reset_at = 0, guardian_reward_at = ? WHERE id = 1 AND cycle = ? AND reset_at = ?").bind(now, now + settings.guardian_reward_seconds, stateCycle, claimedResetAt),
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
    const winner = await database.prepare(
      "SELECT id FROM players WHERE contribution > 0 ORDER BY contribution DESC, name ASC LIMIT 1",
    ).first<{ id: string }>();
    const nextRewardAt = now + settings.guardian_reward_seconds;
    if (!winner) {
      await database.prepare("UPDATE world_state SET guardian_reward_at = ? WHERE id = 1 AND guardian_reward_at = ? AND reset_at = 0").bind(nextRewardAt, rewardAt).run();
      return;
    }
    const claimToken = crypto.randomUUID();
    await database.batch([
      database.prepare(
        `INSERT INTO guardian_reward_claims (period_at, winner_id, gems, claim_token, awarded_at)
         SELECT ?, ?, ?, ?, ? WHERE EXISTS (
           SELECT 1 FROM world_state WHERE id = 1 AND guardian_reward_at = ? AND guardian_reward_at <= ? AND reset_at = 0
         ) ON CONFLICT(period_at) DO NOTHING`,
      ).bind(rewardAt, winner.id, settings.guardian_reward_gems, claimToken, now, rewardAt, now),
      database.prepare(
        "UPDATE players SET gems = gems + ? WHERE id = ? AND EXISTS (SELECT 1 FROM guardian_reward_claims WHERE claim_token = ?)",
      ).bind(settings.guardian_reward_gems, winner.id, claimToken),
      database.prepare(
        "UPDATE players SET contribution = 0 WHERE EXISTS (SELECT 1 FROM guardian_reward_claims WHERE claim_token = ?)",
      ).bind(claimToken),
      database.prepare(
        "UPDATE world_state SET guardian_reward_at = ? WHERE id = 1 AND guardian_reward_at = ? AND EXISTS (SELECT 1 FROM guardian_reward_claims WHERE claim_token = ?)",
      ).bind(nextRewardAt, rewardAt, claimToken),
    ]);
  }
}

export async function tickWorld() {
  const database=db();if((database as any).coordinatorOnly)return;const loop=(database as any).worldLoop;
  if(loop?.enabled){
    if(!loop.jobs.has('world_upkeep')){
      loop.register('world_upkeep',1000,()=>loop.flushed(async()=>{if(!worldSeeded)await ensureWorldSeed();if((database as any).sharedCombat&&(database as any).channel===1)await (database as any).sharedCombat.run(()=>runWorldTick());else await runWorldTick();}));
      if(!(database as any).channel||(database as any).channel===1)loop.register('world_cleanup',30000,()=>runCleanupWorld());
      loop.register('world_regen',1000,()=>worldSeeded&&((database as any).sharedCombat&&(database as any).channel===1?(database as any).sharedCombat.run(()=>loop.regenerate(loop.settings(DEFAULT_SETTINGS))):loop.regenerate(loop.settings(DEFAULT_SETTINGS))));
    }
    return;
  }
  const now = Date.now();
  if (now < nextTickAt) return;
  nextTickAt = now + 1000;
  try { await runWorldTick(); }
  catch (error) { nextTickAt = 0; throw error; }
}

let nextCleanupAt = 0;


export async function cleanupWorld() {
  if((db() as any).worldLoop?.enabled){await tickWorld();return;}
  return runCleanupWorld();
}

async function runCleanupWorld() {
  const nowMs = Date.now();
  if (nowMs < nextCleanupAt) return;
  nextCleanupAt = nowMs + 30000;
  const nativeCleanup = (env as unknown as {CORE_WORLD_CLEANUP?: (nowMs: number) => Promise<void>}).CORE_WORLD_CLEANUP;
  if (nativeCleanup) {
    try { await nativeCleanup(nowMs); }
    catch (error) { nextCleanupAt = 0; throw error; }
    return;
  }
  const database = db();
  const now = nowSeconds();
  const cleanup = database.batch([
    database.prepare("DELETE FROM messages WHERE created_at < ?").bind(now - 86400),
    // Efsun çekilişi tamamlanmamış bir eşya görünmez tutulur ve sonraki
    // isteklerde yeniden denenir; süre temizliği bu teslimatı silemez.
    database.prepare("DELETE FROM world_drops WHERE expires_at < ? AND enchantments NOT IN ('__pending__','__profile_pending__')").bind(now),
    database.prepare("DELETE FROM boss_participants WHERE created_at < ?").bind(now - 86400),
    database.prepare("DELETE FROM boss_reward_claims WHERE awarded_at < ?").bind(now - 86400),
    database.prepare("DELETE FROM boss_defeats WHERE defeated_at < ?").bind(now - 86400),
    database.prepare("DELETE FROM normal_reward_claims WHERE awarded_at < ?").bind(now - 86400),
    database.prepare("DELETE FROM normal_defeats WHERE defeated_at < ?").bind(now - 86400),
    database.prepare("DELETE FROM sinsi_defeats WHERE defeated_at < ?").bind(now - 86400),
    database.prepare("DELETE FROM sinsi_reward_claims WHERE awarded_at < ?").bind(now - 86400),
    database.prepare("DELETE FROM monster_participants WHERE created_at < ?").bind(now - 86400),
    database.prepare("DELETE FROM combat_events WHERE created_at < ?").bind(nowMs - 5000),
    database.prepare("DELETE FROM party_invites WHERE created_at < ?").bind(now - 120),
    database.prepare("DELETE FROM fishing_sessions WHERE expires_at_ms < ?").bind(nowMs),
    database.prepare("DELETE FROM arena_queue WHERE last_seen_ms < ?").bind(nowMs - 45000),
    database.prepare("DELETE FROM arena_announcements WHERE expires_at_ms < ?").bind(nowMs - 30000),
    database.prepare("DELETE FROM arena_kill_claims WHERE created_at_ms < ?").bind(nowMs - 604800000),
    database.prepare("DELETE FROM war_kill_claims WHERE created_at_ms < ?").bind(nowMs - 604800000),
    database.prepare("DELETE FROM arena_reward_claims WHERE awarded_at_ms < ?").bind(nowMs - 2592000000),
    database.prepare("DELETE FROM guardian_reward_claims WHERE awarded_at < ?").bind(now - 604800),
  ]).then(() => undefined);
  try {
    await cleanup;
  } catch (error) { nextCleanupAt = 0; throw error; }
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function safeName(value: unknown) { return typeof value === "string" ? value.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 18) : ""; }
export function safeId(value: unknown) { return typeof value === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(value) ? value : ""; }
export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Beklenmeyen dünya hatası.";
  if (message.includes("channel_full")) return Response.json({code:"channel_full",error:"Kanal dolu. Boş bir kanal seç veya yer açılmasını bekle."},{status:409});
  return Response.json({ error: message }, { status: 500 });
}

// Register the native clock after module initialization, before player traffic.
if ((env as any).CORE_RUNTIME === "vds" && (db() as any).worldLoop?.enabled) void tickWorld();
