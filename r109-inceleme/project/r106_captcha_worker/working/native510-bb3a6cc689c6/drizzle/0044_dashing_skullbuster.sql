CREATE TABLE `market_listing_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`request_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`shop_id` text NOT NULL,
	`kind` text NOT NULL,
	`item_id` text,
	`item_name` text NOT NULL,
	`rarity` text NOT NULL,
	`power` integer DEFAULT 0 NOT NULL,
	`role` text,
	`enchantments` text DEFAULT '[]' NOT NULL,
	`amount` integer DEFAULT 1 NOT NULL,
	`price_gems` integer NOT NULL,
	`created_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_market_listing_receipts_request` ON `market_listing_receipts` (`seller_id`,`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_market_listing_receipts_listing` ON `market_listing_receipts` (`listing_id`);