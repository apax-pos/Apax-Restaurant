const columnCache = new Map();

function safeTableName(table) {
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
  return table;
}

function normalizeRows(result) {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && result.name != null) return [result];
  return [];
}

async function tableHasColumn(conn, table, column) {
  const key = `${table}.${column}`;
  if (columnCache.has(key)) return columnCache.get(key);
  const safeTable = safeTableName(table);
  const [raw] = await conn.query(`PRAGMA table_info(${safeTable})`);
  const cols = normalizeRows(raw);
  const exists = cols.some((c) => c.name === column);
  columnCache.set(key, exists);
  return exists;
}

async function ensureColumn(conn, table, column, definition) {
  if (await tableHasColumn(conn, table, column)) return false;
  await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  columnCache.set(`${table}.${column}`, true);
  console.log(`schema: ${table}.${column} added`);
  return true;
}

async function ensureOrdersShiftColumn(conn) {
  return ensureColumn(conn, "orders", "shift_id", "INTEGER");
}

async function ensureOrderReadColumns(conn) {
  await ensureColumn(conn, "orders", "date", "DATETIME");
  await ensureColumn(conn, "orders", "status", "TEXT DEFAULT 'created'");
  await ensureColumn(conn, "orders", "payment_status", "TEXT DEFAULT 'pending'");
  await ensureColumn(conn, "orders", "token_no", "INTEGER");
  await ensureColumn(conn, "order_items", "status", "TEXT DEFAULT 'created'");
  await ensureColumn(conn, "order_items", "date", "DATETIME");
  await ensureColumn(conn, "order_items", "notes", "TEXT");
  await ensureColumn(conn, "order_items", "addons", "TEXT");
}

async function ensureInvoiceDiscountColumns(conn) {
  await ensureColumn(conn, "invoices", "discount_type", "TEXT DEFAULT 'none'");
  await ensureColumn(conn, "invoices", "discount_value", "REAL DEFAULT 0");
  await ensureColumn(conn, "invoices", "discount_amount", "REAL DEFAULT 0");
}

/** Run before POS order / invoice writes (safe to call repeatedly). */
async function ensurePosSchema(conn) {
  await ensureOrderReadColumns(conn);
  await ensureOrdersShiftColumn(conn);
  await ensureInvoiceDiscountColumns(conn);
}

async function resolveInventoryLogCreatedBy(conn, tenantId, username) {
  if (!username) return null;
  const [rows] = await conn.query(
    "SELECT username FROM users WHERE username = ? AND tenant_id = ? LIMIT 1",
    [username, tenantId]
  );
  return rows[0] ? username : null;
}

module.exports = {
  tableHasColumn,
  ensureColumn,
  ensureOrdersShiftColumn,
  ensureOrderReadColumns,
  ensureInvoiceDiscountColumns,
  ensurePosSchema,
  resolveInventoryLogCreatedBy,
};
