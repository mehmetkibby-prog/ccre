ALTER TABLE `messages` ADD `announcement_expires_at_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `announcement_request_id` text;--> statement-breakpoint
CREATE INDEX `idx_messages_announcement_expiry` ON `messages` (`announcement_expires_at_ms`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_messages_announcement_request` ON `messages` (`player_id`,`announcement_request_id`);--> statement-breakpoint
ALTER TABLE `players` ADD `is_gm` integer DEFAULT 0 NOT NULL;