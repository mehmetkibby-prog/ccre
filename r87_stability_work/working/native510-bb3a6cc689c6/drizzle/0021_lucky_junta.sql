ALTER TABLE `payment_orders` ADD `provider_checkout_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_orders_provider_checkout` ON `payment_orders` (`provider`,`provider_checkout_id`);--> statement-breakpoint
PRAGMA optimize;
