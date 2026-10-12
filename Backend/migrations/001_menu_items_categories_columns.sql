-- Align DB with Backend (fixes "Error loading details" on /dashboard/settings/menu-items).
-- Safe to run once; if a column already exists, skip that line or ignore the error.

ALTER TABLE `categories`
  ADD COLUMN `is_enabled` tinyint(1) NOT NULL DEFAULT 1 AFTER `title`;

ALTER TABLE `menu_items`
  ADD COLUMN `description` mediumtext AFTER `title`,
  ADD COLUMN `is_enabled` tinyint(1) NOT NULL DEFAULT 1 AFTER `category`;
