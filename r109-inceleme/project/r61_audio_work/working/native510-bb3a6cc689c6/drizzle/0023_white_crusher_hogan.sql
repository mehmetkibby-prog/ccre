ALTER TABLE `payment_orders` ADD `terms_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_orders` ADD `terms_hash` text DEFAULT '' NOT NULL;
