CREATE TABLE `payment_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider` text NOT NULL,
	`event_token` text NOT NULL,
	`payload_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_events_token` ON `payment_events` (`event_token`);--> statement-breakpoint
CREATE INDEX `idx_payment_events_order` ON `payment_events` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `payment_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`player_id` text NOT NULL,
	`provider` text NOT NULL,
	`product_code` text NOT NULL,
	`amount_kurus` integer NOT NULL,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider_payment_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`paid_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_payment_orders_account` ON `payment_orders` (`account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_payment_orders_status` ON `payment_orders` (`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_orders_provider_payment` ON `payment_orders` (`provider`,`provider_payment_id`);--> statement-breakpoint
CREATE TABLE `support_pack_grants` (
	`order_id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`grant_token` text NOT NULL,
	`product_code` text NOT NULL,
	`granted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_support_pack_grants_token` ON `support_pack_grants` (`grant_token`);--> statement-breakpoint
CREATE INDEX `idx_support_pack_grants_player` ON `support_pack_grants` (`player_id`,`granted_at`);--> statement-breakpoint
ALTER TABLE `game_settings` ADD `regular_item_drop_chance` real DEFAULT 0.71 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `regular_armor_chance` real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_settings` ADD `boss_armor_chance` real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `xp_ring_until` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `drop_charm_until` integer DEFAULT 0 NOT NULL;