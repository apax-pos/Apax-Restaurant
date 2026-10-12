const { getMySqlPromiseConnection } = require("../config/mysql.db");
const { ensureExtendedModules } = require("../bootstrap/ensureExtendedModules");

const EXTENDED_TABLES = [
  "branches",
  "combos",
  "combo_items",
  "supplier_ledger_entries",
  "staff_profiles",
  "staff_attendance",
  "staff_salary_records",
  "riders",
  "delivery_zones",
  "promotions",
  "promotion_redemptions",
];

async function tableExists(conn, tableName) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`,
    [tableName]
  );
  return Boolean(rows?.[0]);
}

async function extendedTablesPresent() {
  const conn = await getMySqlPromiseConnection();
  try {
    for (const name of EXTENDED_TABLES) {
      if (!(await tableExists(conn, name))) return false;
    }
    return true;
  } finally {
    conn.release();
  }
}

/** Create extended module tables if missing (idempotent, never throws). */
async function ensureExtendedSchemaIfNeeded() {
  try {
    if (await extendedTablesPresent()) return true;
    await ensureExtendedModules();
    return await extendedTablesPresent();
  } catch (err) {
    console.error("ensureExtendedSchemaIfNeeded:", err.message);
    return false;
  }
}

module.exports = {
  EXTENDED_TABLES,
  tableExists,
  extendedTablesPresent,
  ensureExtendedSchemaIfNeeded,
};
