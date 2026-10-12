-- Run once on existing databases (phpMyAdmin / mysql CLI).
CREATE TABLE IF NOT EXISTS `subscription_offer_settings` (
  `id` int NOT NULL DEFAULT 1,
  `stripe_price_id_monthly` varchar(255) DEFAULT NULL,
  `stripe_price_id_yearly` varchar(255) DEFAULT NULL,
  `display_amount_monthly` decimal(10,2) DEFAULT NULL,
  `display_amount_yearly` decimal(10,2) DEFAULT NULL,
  `currency_symbol` varchar(8) NOT NULL DEFAULT '$',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `subscription_offer_settings` (`id`) VALUES (1);
