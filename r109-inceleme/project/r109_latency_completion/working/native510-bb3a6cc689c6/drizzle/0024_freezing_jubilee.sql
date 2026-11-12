CREATE TABLE `epin_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`product_code` text NOT NULL,
	`code_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_epin_batches_created` ON `epin_batches` (`created_at`);--> statement-breakpoint
CREATE TABLE `epin_codes` (
	`code_hash` text PRIMARY KEY NOT NULL,
	`code_hint` text NOT NULL,
	`batch_id` text NOT NULL,
	`product_code` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer DEFAULT 0 NOT NULL,
	`redeemed_at` integer DEFAULT 0 NOT NULL,
	`redeemed_by_account_id` text,
	`redeemed_by_player_id` text,
	`redemption_token` text
);
--> statement-breakpoint
CREATE INDEX `idx_epin_codes_batch_status` ON `epin_codes` (`batch_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_epin_codes_redeemed_player` ON `epin_codes` (`redeemed_by_player_id`,`redeemed_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_epin_codes_redemption_token` ON `epin_codes` (`redemption_token`);