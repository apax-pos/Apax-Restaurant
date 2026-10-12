const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");

async function getSupplierBalance(conn, tenantId, supplierId) {
  const [rows] = await conn.query(
    `SELECT balance_after FROM supplier_ledger_entries
     WHERE tenant_id = ? AND supplier_id = ?
     ORDER BY id DESC LIMIT 1`,
    [tenantId, supplierId]
  );
  return Number(rows?.[0]?.balance_after) || 0;
}

function balanceDelta(entryType, amount) {
  const amt = Number(amount) || 0;
  if (entryType === "purchase" || entryType === "debit") return amt;
  if (entryType === "payment" || entryType === "credit") return -amt;
  return 0;
}

async function recomputeSupplierBalance(conn, tenantId, supplierId) {
  if (!supplierId) return 0;
  const [entries] = await conn.query(
    `SELECT id, entry_type, amount FROM supplier_ledger_entries
     WHERE tenant_id = ? AND supplier_id = ?
     ORDER BY id ASC`,
    [tenantId, supplierId]
  );
  let running = 0;
  for (const entry of entries || []) {
    running += balanceDelta(entry.entry_type, entry.amount);
    await conn.query(
      `UPDATE supplier_ledger_entries SET balance_after = ? WHERE id = ? AND tenant_id = ?`,
      [running, entry.id, tenantId]
    );
  }
  return running;
}

exports.recordLedgerEntryDB = async (
  tenantId,
  supplierId,
  entryType,
  amount,
  referenceType,
  referenceId,
  notes,
  createdBy,
  existingConn
) => {
  const conn = existingConn || (await getMySqlPromiseConnection());
  const shouldRelease = !existingConn;
  try {
    const prev = await getSupplierBalance(conn, tenantId, supplierId);
    const amt = Number(amount) || 0;
    const balanceAfter = prev + balanceDelta(entryType, amt);
    const id = await allocateNextId(conn, "supplier_ledger_entries");
    await conn.query(
      `INSERT INTO supplier_ledger_entries
       (id, tenant_id, supplier_id, entry_type, amount, balance_after, reference_type, reference_id, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tenantId,
        supplierId,
        entryType,
        amt,
        balanceAfter,
        referenceType || null,
        referenceId || null,
        notes || null,
        createdBy || null,
      ]
    );
    return { id, balanceAfter };
  } finally {
    if (shouldRelease) conn.release();
  }
};

exports.recomputeSupplierBalanceDB = async (tenantId, supplierId, existingConn) => {
  const conn = existingConn || (await getMySqlPromiseConnection());
  const shouldRelease = !existingConn;
  try {
    return await recomputeSupplierBalance(conn, tenantId, supplierId);
  } finally {
    if (shouldRelease) conn.release();
  }
};

exports.getSuppliersWithBalanceDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [suppliers] = await conn.query(
      `SELECT * FROM suppliers WHERE tenant_id = ? ORDER BY name ASC`,
      [tenantId]
    );
    const result = [];
    for (const s of suppliers || []) {
      const balance = await getSupplierBalance(conn, tenantId, s.id);
      result.push({ ...s, balance });
    }
    return result;
  } finally {
    conn.release();
  }
};

exports.getSupplierLedgerDB = async (tenantId, supplierId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [entries] = await conn.query(
      `SELECT * FROM supplier_ledger_entries
       WHERE tenant_id = ? AND supplier_id = ?
       ORDER BY id DESC LIMIT 200`,
      [tenantId, supplierId]
    );
    const balance = await getSupplierBalance(conn, tenantId, supplierId);
    return { entries: entries || [], balance };
  } finally {
    conn.release();
  }
};

exports.recordManualEntryDB = async (tenantId, supplierId, entryType, amount, notes, createdBy) => {
  return exports.recordLedgerEntryDB(
    tenantId,
    supplierId,
    entryType,
    amount,
    "manual",
    null,
    notes,
    createdBy
  );
};

exports.recordPaymentDB = async (tenantId, supplierId, amount, notes, createdBy) => {
  return exports.recordLedgerEntryDB(
    tenantId,
    supplierId,
    "payment",
    amount,
    "manual",
    null,
    notes,
    createdBy
  );
};

exports.updateLedgerEntryDB = async (tenantId, entryId, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT * FROM supplier_ledger_entries WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [entryId, tenantId]
    );
    const entry = rows?.[0];
    if (!entry) throw new Error("LEDGER_ENTRY_NOT_FOUND");
    if (entry.reference_type === "purchase" || entry.entry_type === "purchase") {
      throw new Error("PURCHASE_LEDGER_ENTRY_LOCKED");
    }

    const entryType = data.entryType || entry.entry_type;
    if (!["payment", "credit", "debit"].includes(entryType)) {
      throw new Error("INVALID_LEDGER_ENTRY_TYPE");
    }
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");

    await conn.query(
      `UPDATE supplier_ledger_entries
       SET entry_type = ?, amount = ?, notes = ?
       WHERE id = ? AND tenant_id = ?`,
      [entryType, amount, data.notes || null, entryId, tenantId]
    );
    const balance = await recomputeSupplierBalance(conn, tenantId, entry.supplier_id);
    await conn.commit();
    return { balance };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

exports.deleteLedgerEntryDB = async (tenantId, entryId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT * FROM supplier_ledger_entries WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [entryId, tenantId]
    );
    const entry = rows?.[0];
    if (!entry) throw new Error("LEDGER_ENTRY_NOT_FOUND");
    if (entry.reference_type === "purchase" || entry.entry_type === "purchase") {
      throw new Error("PURCHASE_LEDGER_ENTRY_LOCKED");
    }
    await conn.query(`DELETE FROM supplier_ledger_entries WHERE id = ? AND tenant_id = ?`, [
      entryId,
      tenantId,
    ]);
    const balance = await recomputeSupplierBalance(conn, tenantId, entry.supplier_id);
    await conn.commit();
    return { balance };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

exports.deleteLedgerEntriesByReferenceDB = async (
  tenantId,
  referenceType,
  referenceId,
  existingConn
) => {
  const conn = existingConn || (await getMySqlPromiseConnection());
  const shouldRelease = !existingConn;
  try {
    const [rows] = await conn.query(
      `SELECT DISTINCT supplier_id FROM supplier_ledger_entries
       WHERE tenant_id = ? AND reference_type = ? AND reference_id = ?`,
      [tenantId, referenceType, referenceId]
    );
    await conn.query(
      `DELETE FROM supplier_ledger_entries
       WHERE tenant_id = ? AND reference_type = ? AND reference_id = ?`,
      [tenantId, referenceType, referenceId]
    );
    for (const row of rows || []) {
      await recomputeSupplierBalance(conn, tenantId, row.supplier_id);
    }
    return rows || [];
  } finally {
    if (shouldRelease) conn.release();
  }
};
