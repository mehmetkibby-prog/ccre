CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`player_name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_messages_created_at` ON `messages` (`created_at`);--> statement-breakpoint
CREATE TABLE `monsters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`hp` integer NOT NULL,
	`max_hp` integer NOT NULL,
	`respawn_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'muhafiz' NOT NULL,
	`x` real DEFAULT 800 NOT NULL,
	`y` real DEFAULT 540 NOT NULL,
	`hp` integer DEFAULT 100 NOT NULL,
	`essence` integer DEFAULT 0 NOT NULL,
	`contribution` integer DEFAULT 0 NOT NULL,
	`last_seen` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_players_last_seen` ON `players` (`last_seen`);--> statement-breakpoint
CREATE INDEX `idx_players_contribution` ON `players` (`contribution`);--> statement-breakpoint
CREATE TABLE `resource_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`available_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `world_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`health` real DEFAULT 64 NOT NULL,
	`updated_at` integer NOT NULL
);
