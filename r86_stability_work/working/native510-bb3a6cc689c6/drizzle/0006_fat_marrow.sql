CREATE TABLE `combat_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`target_id` text NOT NULL,
	`role` text NOT NULL,
	`ability` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_combat_events_created_at` ON `combat_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `monster_participants` (
	`monster_id` text NOT NULL,
	`spawn_round` integer NOT NULL,
	`player_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_monster_participants_unique` ON `monster_participants` (`monster_id`,`spawn_round`,`player_id`);--> statement-breakpoint
CREATE INDEX `idx_monster_participants_monster` ON `monster_participants` (`monster_id`,`spawn_round`);--> statement-breakpoint
CREATE TABLE `parties` (
	`id` text PRIMARY KEY NOT NULL,
	`leader_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `party_invites` (
	`recipient_id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_party_invites_sender` ON `party_invites` (`sender_id`);--> statement-breakpoint
CREATE TABLE `party_members` (
	`player_id` text PRIMARY KEY NOT NULL,
	`party_id` text NOT NULL,
	`joined_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_party_members_party` ON `party_members` (`party_id`,`joined_at`);--> statement-breakpoint
ALTER TABLE `market_shops` ADD `name` text DEFAULT 'Gezgin Tezgâhı' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `recipient_id` text;--> statement-breakpoint
CREATE INDEX `idx_messages_recipient` ON `messages` (`recipient_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `players` ADD `attack_one_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `attack_two_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `attack_three_at` integer DEFAULT 0 NOT NULL;