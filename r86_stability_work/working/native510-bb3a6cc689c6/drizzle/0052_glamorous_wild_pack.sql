CREATE TABLE `black_loot_attempts` (
	`player_id` text PRIMARY KEY NOT NULL,
	`chest_id` text NOT NULL,
	`token` text NOT NULL,
	`started_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `black_loot_chests` (
	`id` text PRIMARY KEY NOT NULL,
	`victim_id` text NOT NULL,
	`victim_name` text NOT NULL,
	`killer_id` text NOT NULL,
	`victim_hp_revision` integer NOT NULL,
	`channel` integer NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`created_at_ms` integer NOT NULL,
	`claimed_by` text DEFAULT '' NOT NULL,
	`last_claim_token` text DEFAULT '' NOT NULL,
	`take_rod` integer DEFAULT 0 NOT NULL,
	`take_wings` integer DEFAULT 0 NOT NULL,
	`essence` integer DEFAULT 0 NOT NULL,
	`potions` integer DEFAULT 0 NOT NULL,
	`fish_sokan` integer DEFAULT 0 NOT NULL,
	`fish_levrek` integer DEFAULT 0 NOT NULL,
	`fish_zargana` integer DEFAULT 0 NOT NULL,
	`pearls` integer DEFAULT 0 NOT NULL,
	`stone_dust` integer DEFAULT 0 NOT NULL,
	`has_rod` integer DEFAULT 0 NOT NULL,
	`has_wings` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_black_chest_death` ON `black_loot_chests` (`victim_id`,`victim_hp_revision`);--> statement-breakpoint
CREATE INDEX `idx_black_chest_channel` ON `black_loot_chests` (`channel`,`created_at_ms`);