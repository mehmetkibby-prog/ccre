CREATE TABLE `boss_participants` (
	`boss_round` integer NOT NULL,
	`player_id` text NOT NULL,
	`hit_count` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_boss_participants_round` ON `boss_participants` (`boss_round`);--> statement-breakpoint
CREATE INDEX `idx_boss_participants_player` ON `boss_participants` (`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_boss_participants_unique` ON `boss_participants` (`boss_round`,`player_id`);--> statement-breakpoint
CREATE TABLE `market_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`kind` text NOT NULL,
	`item_id` text,
	`item_name` text NOT NULL,
	`rarity` text DEFAULT 'white' NOT NULL,
	`power` integer DEFAULT 0 NOT NULL,
	`role` text,
	`amount` integer DEFAULT 1 NOT NULL,
	`price_gems` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_market_listings_shop` ON `market_listings` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_market_listings_seller` ON `market_listings` (`seller_id`);--> statement-breakpoint
CREATE TABLE `market_shops` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`owner_name` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`channel` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_market_shops_owner` ON `market_shops` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_market_shops_channel` ON `market_shops` (`channel`,`active`);--> statement-breakpoint
ALTER TABLE `monsters` ADD `despawn_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `monsters` ADD `spawn_round` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `gems` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `potions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `skill_one` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `skill_two` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `skill_three` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `area` text DEFAULT 'forest' NOT NULL;