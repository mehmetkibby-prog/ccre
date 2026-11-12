ALTER TABLE `combat_settings` ADD `frozen_zone_enabled` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_boss_enabled` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_boss_hp` integer DEFAULT 26000 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_boss_damage_scale` real DEFAULT 0.42 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_boss_respawn_seconds` integer DEFAULT 600 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_boss_xp_reward` integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_boss_reward_gems` integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_boss_item_drop_chance` real DEFAULT 0.75 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_boss_item_drop_count` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_water_enabled` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_water_hp` integer DEFAULT 9000 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_water_damage_scale` real DEFAULT 0.28 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_water_respawn_seconds` integer DEFAULT 180 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_water_xp_reward` integer DEFAULT 180 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_water_reward_gems` integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_water_item_drop_chance` real DEFAULT 0.35 NOT NULL;--> statement-breakpoint
ALTER TABLE `combat_settings` ADD `frozen_water_item_drop_count` integer DEFAULT 1 NOT NULL;