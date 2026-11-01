CREATE TABLE `character_names` (
	`normalized_name` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_presence` (
	`account_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`instance_id` text NOT NULL,
	`expires_at_ms` integer NOT NULL,
	`chat_after_id` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER `sessions_release_game_presence` AFTER DELETE ON `auth_sessions`
BEGIN
  DELETE FROM `game_presence` WHERE `token_hash` = OLD.`token_hash`;
END;
