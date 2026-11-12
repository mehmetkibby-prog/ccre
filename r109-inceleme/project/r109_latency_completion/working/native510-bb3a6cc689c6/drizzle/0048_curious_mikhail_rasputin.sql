CREATE TABLE `support_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` text NOT NULL,
	`sender_type` text NOT NULL,
	`sender_account_id` text NOT NULL,
	`sender_name` text NOT NULL,
	`client_request_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at_ms` integer NOT NULL,
	CONSTRAINT "support_messages_sender_check" CHECK("support_messages"."sender_type" IN ('player', 'admin'))
);
--> statement-breakpoint
CREATE INDEX `idx_support_messages_ticket_id` ON `support_messages` (`ticket_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_support_messages_request` ON `support_messages` (`ticket_id`,`sender_type`,`client_request_id`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`player_id` text NOT NULL,
	`player_name` text NOT NULL,
	`create_request_id` text NOT NULL,
	`category` text NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`message_count` integer DEFAULT 1 NOT NULL,
	`player_last_read_message_id` integer DEFAULT 0 NOT NULL,
	`admin_last_read_message_id` integer DEFAULT 0 NOT NULL,
	`created_at_ms` integer NOT NULL,
	`updated_at_ms` integer NOT NULL,
	`last_message_at_ms` integer NOT NULL,
	`last_player_message_at_ms` integer NOT NULL,
	`last_admin_message_at_ms` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "support_tickets_category_check" CHECK("support_tickets"."category" IN ('game_bug', 'item_reward', 'payment', 'player_report', 'other')),
	CONSTRAINT "support_tickets_status_check" CHECK("support_tickets"."status" IN ('open', 'resolved')),
	CONSTRAINT "support_tickets_message_count_check" CHECK("support_tickets"."message_count" >= 1)
);
--> statement-breakpoint
CREATE INDEX `idx_support_tickets_account_updated` ON `support_tickets` (`account_id`,`updated_at_ms`,`id`);--> statement-breakpoint
CREATE INDEX `idx_support_tickets_status_updated` ON `support_tickets` (`status`,`updated_at_ms`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_support_tickets_create_request` ON `support_tickets` (`account_id`,`create_request_id`);