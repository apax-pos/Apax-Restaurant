const { getMySqlPromiseConnection } = require("../config/mysql.db");
const { ensureColumn, ensurePosSchema } = require("../utils/sqliteSchema.util");

async function ensureOperationalTables() {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(`
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  incharge_name TEXT NOT NULL,
  opened_by TEXT,
  closed_by TEXT,
  opening_cash REAL DEFAULT 0,
  closing_cash REAL DEFAULT NULL,
  expected_cash REAL DEFAULT NULL,
  status TEXT DEFAULT 'open',
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME DEFAULT NULL,
  notes TEXT
)`);

    await conn.query(`
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    await conn.query(`
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  supplier_id INTEGER,
  purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  reference_no TEXT,
  total_amount REAL DEFAULT 0,
  notes TEXT,
  created_by TEXT
)`);

    await conn.query(`
CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER NOT NULL PRIMARY KEY,
  purchase_id INTEGER NOT NULL,
  inventory_item_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL,
  line_total REAL NOT NULL,
  tenant_id INTEGER NOT NULL
)`);

    await conn.query(`
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_by TEXT
)`);

    await ensurePosSchema(conn);
    await ensureColumn(conn, "orders", "cancel_reason", "TEXT");
    await ensureColumn(conn, "orders", "cancelled_by", "TEXT");
    await ensureColumn(conn, "orders", "cancelled_at", "DATETIME");
    await ensureColumn(conn, "shifts", "branch_id", "INTEGER");
    await ensureColumn(conn, "shifts", "closed_by", "TEXT");

    console.log("operational tables: OK");
  } finally {
    conn.release();
  }
}

module.exports = { ensureOperationalTables };
