const { getMySqlPromiseConnection } = require("../config/mysql.db");
const { ensureColumn } = require("../utils/sqliteSchema.util");

async function ensurePromotions(conn) {
  await conn.query(`
CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  promotion_type TEXT NOT NULL DEFAULT 'percentage',
  target_type TEXT NOT NULL DEFAULT 'all',
  target_ids TEXT,
  discount_value REAL DEFAULT 0,
  flat_price REAL,
  stack_priority INTEGER DEFAULT 0,
  branch_ids TEXT,
  customer_types TEXT,
  days_of_week TEXT,
  start_date TEXT,
  end_date TEXT,
  start_time TEXT,
  end_time TEXT,
  badge_label TEXT,
  is_enabled INTEGER DEFAULT 1,
  show_on_card INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

  await conn.query(`
CREATE TABLE IF NOT EXISTS promotion_redemptions (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  promotion_id INTEGER NOT NULL,
  order_id INTEGER,
  invoice_id INTEGER,
  discount_amount REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

  const invoiceCols = [
    ["promotion_discount", "REAL DEFAULT 0"],
    ["promotion_id", "INTEGER"],
    ["promotion_title", "TEXT"],
    ["applied_promotions", "TEXT"],
  ];
  for (const [col, def] of invoiceCols) {
    try {
      await ensureColumn(conn, "invoices", col, def);
    } catch (err) {
      console.error(`schema invoices.${col}:`, err.message);
    }
  }

  try {
    await ensureColumn(conn, "store_settings", "promotion_stack_rule", "TEXT DEFAULT 'highest'");
  } catch (err) {
    /* store_settings row may use different layout */
  }
}

async function ensurePromotionsTables() {
  const conn = await getMySqlPromiseConnection();
  try {
    await ensurePromotions(conn);
    console.log("promotions tables: OK");
  } finally {
    conn.release();
  }
}

module.exports = { ensurePromotionsTables, ensurePromotions };
