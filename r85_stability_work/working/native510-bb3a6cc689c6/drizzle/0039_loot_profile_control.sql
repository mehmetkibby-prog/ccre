CREATE TABLE `loot_profile_versions` (
	`source_key` text NOT NULL,
	`revision` integer NOT NULL,
	`profile_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_loot_profile_versions_unique` ON `loot_profile_versions` (`source_key`,`revision`);--> statement-breakpoint
CREATE INDEX `idx_loot_profile_versions_created` ON `loot_profile_versions` (`created_at`);--> statement-breakpoint
CREATE TABLE `loot_profiles` (
	`source_key` text PRIMARY KEY NOT NULL,
	`active_revision` integer DEFAULT 0 NOT NULL,
	`latest_revision` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_loot_profiles_active` ON `loot_profiles` (`active_revision`);--> statement-breakpoint
ALTER TABLE `boss_defeats` ADD `loot_source_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `boss_defeats` ADD `loot_profile_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `boss_defeats` ADD `loot_profile_json` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_boss_defeats_loot_snapshot` ON `boss_defeats` (`loot_source_key`,`loot_profile_revision`);--> statement-breakpoint
ALTER TABLE `normal_defeats` ADD `loot_source_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `normal_defeats` ADD `loot_profile_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `normal_defeats` ADD `loot_profile_json` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_normal_defeats_loot_snapshot` ON `normal_defeats` (`loot_source_key`,`loot_profile_revision`);--> statement-breakpoint
ALTER TABLE `sinsi_defeats` ADD `loot_source_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sinsi_defeats` ADD `loot_profile_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sinsi_defeats` ADD `loot_profile_json` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_sinsi_defeats_loot_snapshot` ON `sinsi_defeats` (`loot_source_key`,`loot_profile_revision`);