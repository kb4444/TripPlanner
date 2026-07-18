CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`destination` text NOT NULL,
	`date_range` text NOT NULL,
	`status` text DEFAULT 'Planning' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`packed` text DEFAULT '{}' NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
