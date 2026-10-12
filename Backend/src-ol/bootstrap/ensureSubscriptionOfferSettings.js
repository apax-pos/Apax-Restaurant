const { getMySqlPromiseConnection } = require("../config/mysql.db");

/**
 * Ensures `subscription_offer_settings` exists (row id=1) so superadmin pricing works
 * without a manual re-import of the full SQL dump.
 */
async function ensureSubscriptionOfferSettingsTable() {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(`
CREATE TABLE IF NOT EXISTS \`subscription_offer_settings\` (
  \`id\` INTEGER NOT NULL DEFAULT 1,
  \`stripe_price_id_monthly\` varchar(255) DEFAULT NULL,
  \`stripe_price_id_yearly\` varchar(255) DEFAULT NULL,
  \`display_amount_monthly\` decimal(10,2) DEFAULT NULL,
  \`display_amount_yearly\` decimal(10,2) DEFAULT NULL,
  \`currency_symbol\` varchar(8) NOT NULL DEFAULT '$',
  \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
)
`);
    // SQLite uses INSERT OR IGNORE, MySQL uses INSERT IGNORE.
    // My shim can handle some basic conversion or we just use OR IGNORE which SQLite likes.
    await conn.query(
      "INSERT OR IGNORE INTO `subscription_offer_settings` (`id`) VALUES (1)"
    );
    console.log("subscription_offer_settings: OK");
  } finally {
    conn.release();
  }
}

module.exports = { ensureSubscriptionOfferSettingsTable };
