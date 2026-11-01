ALTER TABLE `arena_queue` ADD `room_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_arena_queue_room` ON `arena_queue` (`room_id`,`channel`,`last_seen_ms`);