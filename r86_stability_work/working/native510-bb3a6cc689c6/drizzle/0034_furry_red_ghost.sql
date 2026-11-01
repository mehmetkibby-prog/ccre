PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_combat_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`player_max_hp` integer DEFAULT 100 NOT NULL,
	`enchant_item_chance` real DEFAULT 0.72 NOT NULL,
	`enchant_one_chance` real DEFAULT 0.15 NOT NULL,
	`enchant_two_chance` real DEFAULT 0.45 NOT NULL,
	`enchant_three_chance` real DEFAULT 0.36 NOT NULL,
	`enchant_four_chance` real DEFAULT 0.04 NOT NULL,
	`enchant_fire_weight` real DEFAULT 1 NOT NULL,
	`enchant_ice_weight` real DEFAULT 1 NOT NULL,
	`enchant_sword_defense_weight` real DEFAULT 1 NOT NULL,
	`enchant_arrow_defense_weight` real DEFAULT 1 NOT NULL,
	`enchant_magic_defense_weight` real DEFAULT 1 NOT NULL,
	`enchant_strong_players_weight` real DEFAULT 0.7 NOT NULL,
	`enchant_resistant_players_weight` real DEFAULT 0.7 NOT NULL,
	`enchant_critical_weight` real DEFAULT 0.8 NOT NULL,
	`enchant_attack_speed_weight` real DEFAULT 0.8 NOT NULL,
	`enchant_hp_weight` real DEFAULT 1 NOT NULL,
	`enchant_hp_tier_one` integer DEFAULT 100 NOT NULL,
	`enchant_hp_tier_two` integer DEFAULT 200 NOT NULL,
	`enchant_hp_tier_three` integer DEFAULT 300 NOT NULL,
	`enchant_fire_min` integer DEFAULT 5 NOT NULL,
	`enchant_fire_max` integer DEFAULT 10 NOT NULL,
	`enchant_ice_min` integer DEFAULT 5 NOT NULL,
	`enchant_ice_max` integer DEFAULT 10 NOT NULL,
	`enchant_sword_defense_min` integer DEFAULT 4 NOT NULL,
	`enchant_sword_defense_max` integer DEFAULT 12 NOT NULL,
	`enchant_arrow_defense_min` integer DEFAULT 4 NOT NULL,
	`enchant_arrow_defense_max` integer DEFAULT 12 NOT NULL,
	`enchant_magic_defense_min` integer DEFAULT 4 NOT NULL,
	`enchant_magic_defense_max` integer DEFAULT 12 NOT NULL,
	`enchant_strong_players_min` integer DEFAULT 4 NOT NULL,
	`enchant_strong_players_max` integer DEFAULT 12 NOT NULL,
	`enchant_resistant_players_min` integer DEFAULT 4 NOT NULL,
	`enchant_resistant_players_max` integer DEFAULT 12 NOT NULL,
	`enchant_critical_min` integer DEFAULT 2 NOT NULL,
	`enchant_critical_max` integer DEFAULT 6 NOT NULL,
	`enchant_attack_speed_min` integer DEFAULT 5 NOT NULL,
	`enchant_attack_speed_max` integer DEFAULT 7 NOT NULL,
	`elemental_tick_count` integer DEFAULT 4 NOT NULL,
	`elemental_tick_interval_ms` integer DEFAULT 320 NOT NULL,
	`pvp_kill_reward_gems` integer DEFAULT 3 NOT NULL,
	`pvp_death_loss_gems` integer DEFAULT 1 NOT NULL,
	`pvp_respawn_seconds` integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_combat_settings`("id", "player_max_hp", "enchant_item_chance", "enchant_one_chance", "enchant_two_chance", "enchant_three_chance", "enchant_four_chance", "enchant_fire_weight", "enchant_ice_weight", "enchant_sword_defense_weight", "enchant_arrow_defense_weight", "enchant_magic_defense_weight", "enchant_strong_players_weight", "enchant_resistant_players_weight", "enchant_critical_weight", "enchant_attack_speed_weight", "enchant_hp_weight", "enchant_hp_tier_one", "enchant_hp_tier_two", "enchant_hp_tier_three", "enchant_fire_min", "enchant_fire_max", "enchant_ice_min", "enchant_ice_max", "enchant_sword_defense_min", "enchant_sword_defense_max", "enchant_arrow_defense_min", "enchant_arrow_defense_max", "enchant_magic_defense_min", "enchant_magic_defense_max", "enchant_strong_players_min", "enchant_strong_players_max", "enchant_resistant_players_min", "enchant_resistant_players_max", "enchant_critical_min", "enchant_critical_max", "enchant_attack_speed_min", "enchant_attack_speed_max", "elemental_tick_count", "elemental_tick_interval_ms", "pvp_kill_reward_gems", "pvp_death_loss_gems", "pvp_respawn_seconds") SELECT "id", "player_max_hp", "enchant_item_chance", "enchant_one_chance", "enchant_two_chance", "enchant_three_chance", "enchant_four_chance", "enchant_fire_weight", "enchant_ice_weight", "enchant_sword_defense_weight", "enchant_arrow_defense_weight", "enchant_magic_defense_weight", "enchant_strong_players_weight", "enchant_resistant_players_weight", "enchant_critical_weight", "enchant_attack_speed_weight", "enchant_hp_weight", "enchant_hp_tier_one", "enchant_hp_tier_two", "enchant_hp_tier_three", "enchant_fire_min", "enchant_fire_max", "enchant_ice_min", "enchant_ice_max", "enchant_sword_defense_min", "enchant_sword_defense_max", "enchant_arrow_defense_min", "enchant_arrow_defense_max", "enchant_magic_defense_min", "enchant_magic_defense_max", "enchant_strong_players_min", "enchant_strong_players_max", "enchant_resistant_players_min", "enchant_resistant_players_max", "enchant_critical_min", "enchant_critical_max", "enchant_attack_speed_min", "enchant_attack_speed_max", "elemental_tick_count", "elemental_tick_interval_ms", "pvp_kill_reward_gems", "pvp_death_loss_gems", "pvp_respawn_seconds" FROM `combat_settings`;--> statement-breakpoint
DROP TABLE `combat_settings`;--> statement-breakpoint
ALTER TABLE `__new_combat_settings` RENAME TO `combat_settings`;--> statement-breakpoint
UPDATE `combat_settings` SET `enchant_attack_speed_min` = 5, `enchant_attack_speed_max` = 7;--> statement-breakpoint
PRAGMA foreign_keys=ON;
