ALTER TABLE `payment_orders` ADD `consent_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_orders` ADD `terms_version` text DEFAULT '' NOT NULL;
