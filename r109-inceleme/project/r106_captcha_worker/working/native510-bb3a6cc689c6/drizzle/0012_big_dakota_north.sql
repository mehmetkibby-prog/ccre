CREATE TABLE `fishing_sessions` (
	`player_id` text PRIMARY KEY NOT NULL,
	`nonce` text NOT NULL,
	`fish_kind` text NOT NULL,
	`started_at_ms` integer NOT NULL,
	`earliest_finish_at_ms` integer NOT NULL,
	`expires_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_fishing_sessions_expires` ON `fishing_sessions` (`expires_at_ms`);--> statement-breakpoint
ALTER TABLE `game_settings` ADD `fishing_rod_cost` integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `fish_sokan_value` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `fish_levrek_value` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `fish_zargana_value` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `fish_sokan_weight` integer DEFAULT 55 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `fish_levrek_weight` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `fish_zargana_weight` integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `has_rod` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `rod_equipped` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `fish_sokan` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `fish_levrek` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `fish_zargana` integer DEFAULT 0 NOT NULL;