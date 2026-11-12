CREATE TABLE `__new_monster_combat_profiles` (
	`profile_key` text PRIMARY KEY NOT NULL,
	`area` text NOT NULL,
	`family` text NOT NULL,
	`variant` text NOT NULL,
	`max_hp` integer NOT NULL,
	`hit_damage` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "monster_combat_area_check" CHECK("__new_monster_combat_profiles"."area" in ('forest', 'frozen', 'black')),
	CONSTRAINT "monster_combat_family_check" CHECK(("__new_monster_combat_profiles"."area" != 'black' AND "__new_monster_combat_profiles"."family" in ('golge', 'curuk', 'yutan')) OR ("__new_monster_combat_profiles"."area" = 'black' AND "__new_monster_combat_profiles"."family" in ('slot1','slot2','slot3','slot4','slot5','slot6','slot7','slot8') AND "__new_monster_combat_profiles"."variant" = 'katil')),
	CONSTRAINT "monster_combat_variant_check" CHECK("__new_monster_combat_profiles"."variant" in ('normal', 'agresif', 'katil')),
	CONSTRAINT "monster_combat_key_check" CHECK("__new_monster_combat_profiles"."profile_key" = "__new_monster_combat_profiles"."area" || '.' || "__new_monster_combat_profiles"."family" || '.' || "__new_monster_combat_profiles"."variant"),
	CONSTRAINT "monster_combat_hp_check" CHECK("__new_monster_combat_profiles"."max_hp" between 1 and 10000000),
	CONSTRAINT "monster_combat_damage_check" CHECK("__new_monster_combat_profiles"."hit_damage" between 1 and 1000000)
);
--> statement-breakpoint
INSERT INTO `__new_monster_combat_profiles`("profile_key", "area", "family", "variant", "max_hp", "hit_damage", "updated_at") SELECT "profile_key", "area", "family", "variant", "max_hp", "hit_damage", "updated_at" FROM `monster_combat_profiles`;--> statement-breakpoint
DROP TABLE `monster_combat_profiles`;--> statement-breakpoint
ALTER TABLE `__new_monster_combat_profiles` RENAME TO `monster_combat_profiles`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_monster_combat_scope` ON `monster_combat_profiles` (`area`,`family`,`variant`);