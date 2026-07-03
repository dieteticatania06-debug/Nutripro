CREATE TABLE IF NOT EXISTS `weekly_checkins` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `week_label` text NOT NULL,
  `diet_adherence` integer NOT NULL,
  `energy_level` integer NOT NULL,
  `hunger_level` integer,
  `mood` integer,
  `notes` text,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS `checkins_user_id_idx` ON `weekly_checkins` (`user_id`);
CREATE INDEX IF NOT EXISTS `checkins_week_idx` ON `weekly_checkins` (`week_label`);
CREATE UNIQUE INDEX IF NOT EXISTS `checkins_user_week_idx` ON `weekly_checkins` (`user_id`, `week_label`);
