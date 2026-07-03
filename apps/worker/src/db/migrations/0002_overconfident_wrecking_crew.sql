DROP INDEX IF EXISTS `appointments_date_time_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `appointments_date_time_idx` ON `appointments` (`date`,`start_time`) WHERE status != 'cancelled';