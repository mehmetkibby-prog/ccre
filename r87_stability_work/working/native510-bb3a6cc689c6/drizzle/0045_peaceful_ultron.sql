CREATE TABLE `loot_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`groups_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "loot_templates_revision_check" CHECK("loot_templates"."revision" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_loot_templates_name_key` ON `loot_templates` (`name_key`);--> statement-breakpoint
CREATE INDEX `idx_loot_templates_updated` ON `loot_templates` (`updated_at`);--> statement-breakpoint
CREATE TABLE `monster_combat_config` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`update_token` text DEFAULT '' NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
		CONSTRAINT "monster_combat_config_singleton_check" CHECK("monster_combat_config"."id" = 1),
		CONSTRAINT "monster_combat_config_revision_check" CHECK("monster_combat_config"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE `monster_combat_profiles` (
	`profile_key` text PRIMARY KEY NOT NULL,
	`area` text NOT NULL,
	`family` text NOT NULL,
	`variant` text NOT NULL,
	`max_hp` integer NOT NULL,
	`hit_damage` integer NOT NULL,
	`updated_at` integer NOT NULL,
		CONSTRAINT "monster_combat_area_check" CHECK("monster_combat_profiles"."area" in ('forest', 'frozen')),
		CONSTRAINT "monster_combat_family_check" CHECK("monster_combat_profiles"."family" in ('golge', 'curuk', 'yutan')),
		CONSTRAINT "monster_combat_variant_check" CHECK("monster_combat_profiles"."variant" in ('normal', 'agresif', 'katil')),
		CONSTRAINT "monster_combat_key_check" CHECK("monster_combat_profiles"."profile_key" = "monster_combat_profiles"."area" || '.' || "monster_combat_profiles"."family" || '.' || "monster_combat_profiles"."variant"),
		CONSTRAINT "monster_combat_hp_check" CHECK("monster_combat_profiles"."max_hp" between 1 and 10000000),
	CONSTRAINT "monster_combat_damage_check" CHECK("monster_combat_profiles"."hit_damage" between 1 and 1000000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_monster_combat_scope` ON `monster_combat_profiles` (`area`,`family`,`variant`);--> statement-breakpoint
