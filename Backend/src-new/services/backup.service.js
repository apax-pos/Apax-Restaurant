const fs = require("fs");
const path = require("path");
const { CONFIG } = require("../config");
const { getMySqlPromiseConnection } = require("../config/mysql.db");

const BACKUP_VERSION = "1.0";

/** Tables exported for a single tenant (must have tenant_id unless noted). */
const TENANT_SCOPED_TABLES = [
  "store_details",
  "print_settings",
  "categories",
  "taxes",
  "payment_types",
  "store_tables",
  "menu_items",
  "menu_item_variants",
  "menu_item_addons",
  "menu_item_recipes",
  "inventory_items",
  "inventory_logs",
  "customers",
  "orders",
  "order_items",
  "invoices",
  "invoice_sequences",
  "token_sequences",
  "qr_orders",
  "qr_order_items",
  "reservations",
  "feedbacks",
  "subscription_history",
  "users",
  "refresh_tokens",
];

/** Only redact values that cannot be restored; user passwords stay as bcrypt hashes. */
const REDACT_FIELDS = {
  superadmins: ["password"],
  refresh_tokens: ["refresh_token"],
  reset_password_tokens: ["token"],
};

/** Delete children before parents */
const TENANT_DELETE_ORDER = [
  "order_items",
  "orders",
  "qr_order_items",
  "qr_orders",
  "feedbacks",
  "inventory_logs",
  "reservations",
  "refresh_tokens",
  "menu_item_recipes",
  "menu_item_addons",
  "menu_item_variants",
  "menu_items",
  "invoices",
  "invoice_sequences",
  "token_sequences",
  "customers",
  "inventory_items",
  "categories",
  "taxes",
  "payment_types",
  "store_tables",
  "store_details",
  "print_settings",
  "subscription_history",
  "users",
];

/** Insert parents before children */
const TENANT_INSERT_ORDER = [
  "store_details",
  "print_settings",
  "users",
  "categories",
  "taxes",
  "payment_types",
  "store_tables",
  "menu_items",
  "menu_item_variants",
  "menu_item_addons",
  "menu_item_recipes",
  "inventory_items",
  "customers",
  "invoice_sequences",
  "token_sequences",
  "invoices",
  "orders",
  "order_items",
  "qr_orders",
  "qr_order_items",
  "reservations",
  "feedbacks",
  "inventory_logs",
  "refresh_tokens",
  "subscription_history",
];

const FULL_DELETE_ORDER = [
  "order_items",
  "orders",
  "qr_order_items",
  "qr_orders",
  "feedbacks",
  "inventory_logs",
  "reservations",
  "refresh_tokens",
  "reset_password_tokens",
  "menu_item_recipes",
  "menu_item_addons",
  "menu_item_variants",
  "menu_items",
  "invoices",
  "invoice_sequences",
  "token_sequences",
  "customers",
  "inventory_items",
  "categories",
  "taxes",
  "payment_types",
  "store_tables",
  "store_details",
  "print_settings",
  "subscription_history",
  "users",
  "tenants",
  "superadmins",
  "subscription_offer_settings",
  "exchange_rates",
];

const FULL_INSERT_ORDER = [
  "exchange_rates",
  "subscription_offer_settings",
  "superadmins",
  "tenants",
  "users",
  "store_details",
  "print_settings",
  "categories",
  "taxes",
  "payment_types",
  "store_tables",
  "menu_items",
  "menu_item_variants",
  "menu_item_addons",
  "menu_item_recipes",
  "inventory_items",
  "customers",
  "invoice_sequences",
  "token_sequences",
  "invoices",
  "orders",
  "order_items",
  "qr_orders",
  "qr_order_items",
  "reservations",
  "feedbacks",
  "inventory_logs",
  "refresh_tokens",
  "subscription_history",
  "reset_password_tokens",
];

function isSafeIdentifier(name) {
  return typeof name === "string" && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

function resolveDatabasePath() {
  let dbPath = CONFIG.DATABASE_URL;
  if (typeof dbPath !== "string") {
    throw new Error("DATABASE_URL is not configured");
  }
  dbPath = dbPath.trim();
  if (
    (dbPath.startsWith("'") && dbPath.endsWith("'")) ||
    (dbPath.startsWith('"') && dbPath.endsWith('"'))
  ) {
    dbPath = dbPath.slice(1, -1);
  }
  if (!path.isAbsolute(dbPath)) {
    dbPath = path.resolve(process.cwd(), dbPath);
  }
  return dbPath;
}

function redactRows(tableName, rows) {
  const fields = REDACT_FIELDS[tableName];
  if (!fields || !Array.isArray(rows)) {
    return rows;
  }
  return rows.map((row) => {
    const copy = { ...row };
    for (const field of fields) {
      if (copy[field] !== undefined && copy[field] !== null) {
        copy[field] = "[REDACTED]";
      }
    }
    return copy;
  });
}

async function fetchTableRows(conn, tableName, whereSql = "", params = []) {
  if (!isSafeIdentifier(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  const where = whereSql ? ` WHERE ${whereSql}` : "";
  const [rows] = await conn.query(`SELECT * FROM ${tableName}${where}`, params);
  return redactRows(tableName, rows || []);
}

async function listSqliteTables(conn) {
  const [rows] = await conn.query(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  );
  return (rows || []).map((r) => r.name).filter(isSafeIdentifier);
}

function listTenantUploadFiles(tenantId) {
  const tenantDir = path.join(__dirname, `../../public/${tenantId}`);
  if (!fs.existsSync(tenantDir)) {
    return [];
  }
  return fs
    .readdirSync(tenantDir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => ({
      filename: e.name,
      publicPath: `/public/${tenantId}/${e.name}`,
    }));
}

exports.buildTenantBackup = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [tenantRows] = await conn.query(`SELECT * FROM tenants WHERE id = ? LIMIT 1`, [tenantId]);
    if (!tenantRows || !tenantRows[0]) {
      return null;
    }

    const data = {
      tenant: tenantRows[0],
    };

    for (const table of TENANT_SCOPED_TABLES) {
      try {
        data[table] = await fetchTableRows(conn, table, "tenant_id = ?", [tenantId]);
      } catch (err) {
        if (String(err.message || "").includes("no such table")) {
          data[table] = [];
          continue;
        }
        throw err;
      }
    }

    return {
      backupVersion: BACKUP_VERSION,
      type: "tenant",
      exportedAt: new Date().toISOString(),
      tenantId: Number(tenantId),
      tenantName: tenantRows[0].name || null,
      data,
      files: listTenantUploadFiles(tenantId),
      notes:
        "Export for Apax Pos restore. Login password hashes are included; refresh tokens are not.",
    };
  } finally {
    conn.release();
  }
};

exports.buildFullSystemBackup = async () => {
  const conn = await getMySqlPromiseConnection();
  try {
    const tableNames = await listSqliteTables(conn);
    const data = {};

    for (const table of tableNames) {
      data[table] = await fetchTableRows(conn, table);
    }

    const publicRoot = path.join(__dirname, "../../public");
    const tenantFolders = fs.existsSync(publicRoot)
      ? fs.readdirSync(publicRoot, { withFileTypes: true }).filter((d) => d.isDirectory())
      : [];

    return {
      backupVersion: BACKUP_VERSION,
      type: "full",
      exportedAt: new Date().toISOString(),
      databasePath: path.basename(resolveDatabasePath()),
      tables: tableNames,
      data,
      publicUploadFolders: tenantFolders.map((d) => d.name),
      notes:
        "Full system export. Sensitive fields are redacted. For a complete file-level backup, use Download database file (.sqlite).",
    };
  } finally {
    conn.release();
  }
};

exports.getDatabaseFilePath = () => {
  const dbPath = resolveDatabasePath();
  if (!fs.existsSync(dbPath)) {
    return null;
  }
  return dbPath;
};

function isRedacted(value) {
  return value === "[REDACTED]";
}

function normalizeRowForImport(tableName, row, targetTenantId) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const copy = { ...row };

  if (targetTenantId != null && Object.prototype.hasOwnProperty.call(copy, "tenant_id")) {
    copy.tenant_id = targetTenantId;
  }

  if (tableName === "users" && isRedacted(copy.password)) {
    delete copy.password;
  }
  if (tableName === "superadmins" && isRedacted(copy.password)) {
    delete copy.password;
  }
  if (tableName === "refresh_tokens" && isRedacted(copy.refresh_token)) {
    return null;
  }
  if (tableName === "reset_password_tokens" && isRedacted(copy.token)) {
    return null;
  }

  return copy;
}

async function insertRows(conn, tableName, rows, targetTenantId) {
  if (!isSafeIdentifier(tableName) || !Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const prepared = rows
    .map((row) => normalizeRowForImport(tableName, row, targetTenantId))
    .filter(Boolean);

  if (prepared.length === 0) {
    return 0;
  }

  const columns = Object.keys(prepared[0]);
  if (columns.length === 0) {
    return 0;
  }

  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

  let count = 0;
  for (const row of prepared) {
    if (tableName === "users" && !row.password) {
      continue;
    }
    if (tableName === "superadmins" && !row.password) {
      continue;
    }
    const values = columns.map((col) => {
      const val = row[col];
      if (typeof val === "boolean") {
        return val ? 1 : 0;
      }
      return val === undefined ? null : val;
    });
    await conn.query(sql, values);
    count += 1;
  }

  return count;
}

async function deleteTenantData(conn, tenantId) {
  for (const table of TENANT_DELETE_ORDER) {
    try {
      await conn.query(`DELETE FROM ${table} WHERE tenant_id = ?`, [tenantId]);
    } catch (err) {
      if (String(err.message || "").includes("no such table")) {
        continue;
      }
      throw err;
    }
  }
}

async function updateTenantFromBackup(conn, tenantId, tenantRow) {
  if (!tenantRow) {
    return;
  }
  const fields = ["name", "email", "is_active", "subscription_id", "payment_customer_id", "subscription_start", "subscription_end"];
  const updates = [];
  const values = [];
  for (const field of fields) {
    if (tenantRow[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(tenantRow[field]);
    }
  }
  if (updates.length === 0) {
    return;
  }
  values.push(tenantId);
  await conn.query(`UPDATE tenants SET ${updates.join(", ")} WHERE id = ?`, values);
}

function validateTenantBackupPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid backup file");
  }
  if (payload.type && payload.type !== "tenant") {
    throw new Error("This file is a full system backup. Use superadmin import for full restores.");
  }
  if (!payload.data || typeof payload.data !== "object") {
    throw new Error("Backup file is missing data section");
  }
  return payload;
}

function validateFullBackupPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid backup file");
  }
  if (payload.type !== "full") {
    throw new Error("This file is a tenant backup. Use tenant import instead.");
  }
  if (!payload.data || typeof payload.data !== "object") {
    throw new Error("Backup file is missing data section");
  }
  return payload;
}

async function preserveUserPasswords(conn, tenantId, userRows) {
  const map = new Map();
  if (!Array.isArray(userRows)) {
    return map;
  }
  for (const row of userRows) {
    if (!row?.username || !isRedacted(row.password)) {
      continue;
    }
    const [existing] = await conn.query(
      `SELECT password FROM users WHERE username = ? AND tenant_id = ? LIMIT 1`,
      [row.username, tenantId]
    );
    if (existing?.[0]?.password) {
      map.set(`${tenantId}:${row.username}`, existing[0].password);
    }
  }
  return map;
}

exports.restoreTenantBackup = async (targetTenantId, payload) => {
  const backup = validateTenantBackupPayload(payload);
  const conn = await getMySqlPromiseConnection();

  const stats = { tables: {}, totalRows: 0 };

  try {
    const [tenantRows] = await conn.query(`SELECT id FROM tenants WHERE id = ? LIMIT 1`, [targetTenantId]);
    if (!tenantRows?.[0]) {
      throw new Error("Tenant not found");
    }

    const passwordPreserve = await preserveUserPasswords(
      conn,
      targetTenantId,
      backup.data.users
    );

    await conn.query("PRAGMA foreign_keys = OFF");
    await conn.beginTransaction();

    await deleteTenantData(conn, targetTenantId);
    await updateTenantFromBackup(conn, targetTenantId, backup.data.tenant);

    for (const table of TENANT_INSERT_ORDER) {
      let rows = backup.data[table];
      if (!rows?.length) {
        continue;
      }
      if (table === "users" && passwordPreserve.size > 0) {
        rows = rows.map((row) => {
          const copy = { ...row };
          if (!copy.password || isRedacted(copy.password)) {
            const kept = passwordPreserve.get(`${targetTenantId}:${copy.username}`);
            if (kept) {
              copy.password = kept;
            }
          }
          return copy;
        });
      }
      try {
        const inserted = await insertRows(conn, table, rows, targetTenantId);
        stats.tables[table] = inserted;
        stats.totalRows += inserted;
      } catch (err) {
        if (String(err.message || "").includes("no such table")) {
          continue;
        }
        throw err;
      }
    }

    await conn.commit();
    await conn.query("PRAGMA foreign_keys = ON");

    return stats;
  } catch (error) {
    try {
      await conn.rollback();
    } catch (_) {
      /* ignore */
    }
    await conn.query("PRAGMA foreign_keys = ON");
    throw error;
  } finally {
    conn.release();
  }
};

async function preserveAllUserPasswords(conn) {
  const map = new Map();
  try {
    const [users] = await conn.query(
      `SELECT username, tenant_id, password FROM users`
    );
    for (const u of users || []) {
      if (u?.username != null && u?.password) {
        map.set(`${u.tenant_id}:${u.username}`, u.password);
      }
    }
  } catch (_) {
    /* users table may be empty */
  }
  return map;
}

exports.restoreFullBackup = async (payload) => {
  const backup = validateFullBackupPayload(payload);
  const conn = await getMySqlPromiseConnection();
  const stats = { tables: {}, totalRows: 0 };

  try {
    const passwordPreserve = await preserveAllUserPasswords(conn);

    await conn.query("PRAGMA foreign_keys = OFF");
    await conn.beginTransaction();

    for (const table of FULL_DELETE_ORDER) {
      try {
        await conn.query(`DELETE FROM ${table}`);
      } catch (err) {
        if (String(err.message || "").includes("no such table")) {
          continue;
        }
        throw err;
      }
    }

    const tablesToInsert = backup.tables?.length
      ? FULL_INSERT_ORDER.filter((t) => backup.tables.includes(t))
      : FULL_INSERT_ORDER;

    for (const table of tablesToInsert) {
      let rows = backup.data[table];
      if (!rows?.length) {
        continue;
      }
      if (table === "users" && passwordPreserve.size > 0) {
        rows = rows.map((row) => {
          const copy = { ...row };
          if (!copy.password || isRedacted(copy.password)) {
            const kept = passwordPreserve.get(`${copy.tenant_id}:${copy.username}`);
            if (kept) {
              copy.password = kept;
            }
          }
          return copy;
        });
      }
      try {
        const inserted = await insertRows(conn, table, rows, null);
        stats.tables[table] = inserted;
        stats.totalRows += inserted;
      } catch (err) {
        if (String(err.message || "").includes("no such table")) {
          continue;
        }
        throw err;
      }
    }

    await conn.commit();
    await conn.query("PRAGMA foreign_keys = ON");

    return stats;
  } catch (error) {
    try {
      await conn.rollback();
    } catch (_) {
      /* ignore */
    }
    await conn.query("PRAGMA foreign_keys = ON");
    throw error;
  } finally {
    conn.release();
  }
};

exports.parseBackupPayload = (raw) => {
  if (typeof raw === "string") {
    return JSON.parse(raw);
  }
  if (Buffer.isBuffer(raw)) {
    return JSON.parse(raw.toString("utf8"));
  }
  if (typeof raw === "object" && raw !== null) {
    return raw;
  }
  throw new Error("Invalid backup payload");
};
