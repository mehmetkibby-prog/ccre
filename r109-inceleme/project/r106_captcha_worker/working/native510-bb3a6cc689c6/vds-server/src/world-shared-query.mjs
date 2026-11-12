import {BOSS_LEADERS_SQL476} from '../../lib/stone-boss-ranking476.mjs';
// Only these exact deterministic world query shapes may reuse rows. Unknown
// SQL, time functions, private queries and queries with different bindings fall
// through unchanged. The caller owns the map only until its current WAL COMMIT.
import {ENCHANT_TIER_KEYS} from '../../lib/enchantment-tiers.mjs';

const MONSTERS_SQL = `SELECT id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned, parent_stone_id
  FROM monsters
  WHERE ((area = ? AND (channel = 0 OR channel = ?)) OR (is_boss = 1 AND loadlab_run_id='') OR id='dragon-world-1')
    AND (summoned = 0 OR hp > 0)
  ORDER BY is_boss, is_stone, id`;

const BOSS_LEADERS_SQL = BOSS_LEADERS_SQL476;

const GAME_SETTINGS_SQL = `SELECT expansion65_enabled, expansion65_preview_player_id, expansion65_revision, events_json, beta_starts_at, beta_ends_at, health_decay_per_second, donation_health_per_essence, boss_hp, boss_respawn_seconds,
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

const ECONOMY_SETTINGS_SQL = `SELECT * FROM economy_settings WHERE id = 1`;

const COMBAT_SETTINGS_SQL = `SELECT ${ENCHANT_TIER_KEYS.filter(key=>!key.startsWith("enchant_hp_")).join(", ")}, afk_island_enabled,afk_island_xp_reward,afk_island_respawn_seconds,ancient_golge_xp_reward,ancient_curuk_xp_reward,ancient_yutan_xp_reward,ancient_monster_respawn_seconds,ancient_boss_enabled,ancient_boss_hp,ancient_boss_damage_scale,ancient_boss_respawn_seconds,ancient_boss_xp_reward,ancient_boss_reward_gems,black_stone_boss_enabled,black_stone_boss_hp,black_stone_boss_damage_scale,black_stone_boss_respawn_seconds,black_stone_boss_xp_reward,black_stone_boss_reward_gems,ancient_boss_purple_chance,ancient_normal_purple_chance,world_boss_purple_chance, boss_fire_interval_seconds, boss_fire_damage_multiplier, forest_monster_respawn_seconds, frozen_monster_respawn_seconds, black_monster_respawn_seconds, player_max_hp, rest_regen_percent, rest_regen_combat_delay_seconds, rest_regen_still_seconds, monster_rest_regen_percent, monster_rest_regen_combat_delay_seconds,
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

const shared = new Set([
  MONSTERS_SQL,
  BOSS_LEADERS_SQL,
  GAME_SETTINGS_SQL,
  ECONOMY_SETTINGS_SQL,
  COMBAT_SETTINGS_SQL,
  "SELECT health, updated_at, layout_version, cycle, reset_at, guardian_reward_at FROM world_state WHERE id = 1",
  "SELECT COUNT(*) AS count FROM players WHERE last_seen >= ?",
  "SELECT prices_json FROM premium_shop_settings WHERE id=1",
  "SELECT name, role, contribution FROM players WHERE loadlab_run_id = '' AND contribution > 0 ORDER BY contribution DESC, name ASC LIMIT 5",
  "SELECT id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments, amount, price_gems, created_at FROM market_listings ORDER BY created_at DESC LIMIT 250"
]);
export function isSnapshotSharedQuery(sql) { return shared.has(sql); }
