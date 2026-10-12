-- Fixes HTTP 500 on: /settings/store-setting/service-charge, /pos/init, etc.
-- Run once on existing DBs. Skip lines that error if already applied.

ALTER TABLE `store_details`
  ADD COLUMN `service_charge` decimal(10,2) DEFAULT NULL AFTER `is_feedback_enabled`;

CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `quantity` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `unit` varchar(50) NOT NULL DEFAULT 'unit',
  `min_quantity_threshold` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `status` enum('in','low','out') NOT NULL DEFAULT 'out',
  `tenant_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `inventory_items_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `inventory_item_id` int NOT NULL,
  `type` varchar(20) NOT NULL,
  `quantity_change` decimal(12,4) NOT NULL,
  `previous_quantity` decimal(12,4) DEFAULT NULL,
  `new_quantity` decimal(12,4) DEFAULT NULL,
  `note` varchar(500) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `inventory_item_id` (`inventory_item_id`),
  CONSTRAINT `inventory_logs_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inventory_logs_ibfk_2` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `menu_item_recipes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `menu_item_id` int NOT NULL,
  `variant_id` int NOT NULL DEFAULT 0,
  `addon_id` int NOT NULL DEFAULT 0,
  `inventory_item_id` int NOT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `tenant_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `menu_item_id` (`menu_item_id`),
  CONSTRAINT `menu_item_recipes_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `menu_item_recipes_ibfk_2` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `menu_item_recipes_ibfk_3` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
