CREATE TABLE `player_items` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`kind` text NOT NULL,
	`item_name` text NOT NULL,
	`rarity` text NOT NULL,
	`power` integer NOT NULL,
	`role` text NOT NULL,
	`equipped` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_player_items_player` ON `player_items` (`player_id`,`kind`);--> statement-breakpoint
CREATE TABLE `world_drops` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`monster_id` text NOT NULL,
	`kind` text NOT NULL,
	`item_name` text,
	`rarity` text DEFAULT 'white' NOT NULL,
	`power` integer DEFAULT 0 NOT NULL,
	`amount` integer DEFAULT 1 NOT NULL,
	`role` text,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_world_drops_owner` ON `world_drops` (`owner_id`,`expires_at`);--> statement-breakpoint
ALTER TABLE `monsters` ADD `variant` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `monsters` ADD `is_boss` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `channel` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `world_state` ADD `layout_version` integer DEFAULT 1 NOT NULL;