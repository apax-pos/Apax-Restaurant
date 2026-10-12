const { getMySqlPromiseConnection } = require("../config/mysql.db");
const { ensureColumn } = require("../utils/sqliteSchema.util");
const { ensurePromotions } = require("./ensurePromotions");

async function runDDL(conn, label, sql) {
  try {
    await conn.query(sql);
  } catch (err) {
    // Keep bootstrap resilient: one optional module should not block the app.
    console.error(`schema ${label}:`, err.message);
  }
}

async function ensureExtendedModules() {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(`
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    await runDDL(conn, "supplier_ledger_entries", `
CREATE TABLE IF NOT EXISTS supplier_ledger_entries (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  entry_type TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  notes TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    await runDDL(conn, "combos", `
CREATE TABLE IF NOT EXISTS combos (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    await runDDL(conn, "combo_items", `
CREATE TABLE IF NOT EXISTS combo_items (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  combo_id INTEGER NOT NULL,
  menu_item_id INTEGER NOT NULL,
  variant_id INTEGER,
  quantity INTEGER DEFAULT 1
)`);

    await runDDL(conn, "staff_profiles", `
CREATE TABLE IF NOT EXISTS staff_profiles (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  designation TEXT,
  base_salary REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    await runDDL(conn, "staff_attendance", `
CREATE TABLE IF NOT EXISTS staff_attendance (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  branch_id INTEGER,
  check_in DATETIME,
  check_out DATETIME,
  attendance_date TEXT,
  notes TEXT
)`);

    await runDDL(conn, "staff_salary_records", `
CREATE TABLE IF NOT EXISTS staff_salary_records (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  month_year TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_at DATETIME,
  notes TEXT
)`);

    await conn.query(`
CREATE TABLE IF NOT EXISTS riders (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    await runDDL(conn, "delivery_zones", `
CREATE TABLE IF NOT EXISTS delivery_zones (
  id INTEGER NOT NULL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  delivery_charge REAL NOT NULL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    const columnSteps = [
      ["orders", "branch_id", "INTEGER"],
      ["orders", "delivery_zone_id", "INTEGER"],
      ["orders", "rider_id", "INTEGER"],
      ["orders", "delivery_charge", "REAL DEFAULT 0"],
      ["order_items", "combo_id", "INTEGER"],
      ["users", "branch_id", "INTEGER"],
      ["shifts", "branch_id", "INTEGER"],
    ];
    for (const [table, column, def] of columnSteps) {
      try {
        await ensureColumn(conn, table, column, def);
      } catch (err) {
        console.error(`schema: ${table}.${column}:`, err.message);
      }
    }

    try {
      await ensurePromotions(conn);
    } catch (err) {
      console.error("schema promotions:", err.message);
    }

    console.log("extended modules tables: OK");
  } finally {
    conn.release();
  }
}

module.exports = { ensureExtendedModules };
