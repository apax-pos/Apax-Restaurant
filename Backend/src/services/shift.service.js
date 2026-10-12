const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");
const { tableHasColumn } = require("../utils/sqliteSchema.util");

async function getShiftSalesSummary(conn, tenantId, shiftId) {
  const [salesRows] = await conn.query(
    `SELECT COALESCE(SUM(i.total), 0) AS paid_sales
     FROM orders o
     INNER JOIN invoices i ON o.invoice_id = i.id AND i.tenant_id = o.tenant_id
     WHERE o.tenant_id = ? AND o.shift_id = ? AND o.payment_status = 'paid' AND o.status != 'cancelled'`,
    [tenantId, shiftId]
  );
  return Number(salesRows[0]?.paid_sales || 0);
}

exports.getActiveShiftDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT sh.*, b.name AS branch_name
       FROM shifts sh
       LEFT JOIN branches b ON b.id = sh.branch_id AND b.tenant_id = sh.tenant_id
       WHERE sh.tenant_id = ? AND sh.status = 'open'
       ORDER BY sh.opened_at DESC
       LIMIT 1`,
      [tenantId]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
};

exports.getShiftByIdDB = async (tenantId, shiftId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT sh.*, b.name AS branch_name
       FROM shifts sh
       LEFT JOIN branches b ON b.id = sh.branch_id AND b.tenant_id = sh.tenant_id
       WHERE sh.id = ? AND sh.tenant_id = ?
       LIMIT 1`,
      [shiftId, tenantId]
    );
    const shift = rows[0] || null;
    if (!shift) throw new Error("SHIFT_NOT_FOUND");
    const paidSales = await getShiftSalesSummary(conn, tenantId, shiftId);
    return {
      ...shift,
      paid_sales: paidSales,
      expected_cash_live: Number(shift.opening_cash || 0) + paidSales,
    };
  } finally {
    conn.release();
  }
};

exports.openShiftDB = async (tenantId, data, openedBy) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [activeRows] = await conn.query(
      `SELECT * FROM shifts WHERE tenant_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1`,
      [tenantId]
    );
    const active = activeRows[0] || null;
    if (active) {
      throw new Error("SHIFT_ALREADY_OPEN");
    }
    const id = await allocateNextId(conn, "shifts");
    const cols = ["id", "tenant_id", "incharge_name", "opened_by", "opening_cash", "status"];
    const values = [id, tenantId, data.inchargeName, openedBy || null, Number(data.openingCash) || 0, "open"];
    if (await tableHasColumn(conn, "shifts", "branch_id")) {
      cols.push("branch_id");
      values.push(data.branchId || null);
    }
    if (data.notes != null) {
      cols.push("notes");
      values.push(data.notes || null);
    }
    await conn.query(
      `INSERT INTO shifts (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      values
    );
    return id;
  } finally {
    conn.release();
  }
};

exports.closeShiftDB = async (tenantId, shiftId, closingCash, notes, closedBy) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [shiftRows] = await conn.query(
      `SELECT * FROM shifts WHERE id = ? AND tenant_id = ? AND status = 'open' LIMIT 1`,
      [shiftId, tenantId]
    );
    if (!shiftRows[0]) throw new Error("SHIFT_NOT_FOUND");

    const cashSales = await getShiftSalesSummary(conn, tenantId, shiftId);
    const opening = Number(shiftRows[0].opening_cash || 0);
    const expected = opening + cashSales;

    await conn.query(
      `UPDATE shifts SET status = 'closed', closing_cash = ?, expected_cash = ?,
       closed_by = ?, closed_at = datetime('now'), notes = ?
       WHERE id = ? AND tenant_id = ?`,
      [Number(closingCash) || 0, expected, closedBy || null, notes || null, shiftId, tenantId]
    );

    return { expected_cash: expected, cash_sales: cashSales };
  } finally {
    conn.release();
  }
};

exports.getShiftsDB = async (tenantId, limit = 50) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT sh.*, b.name AS branch_name
       FROM shifts sh
       LEFT JOIN branches b ON b.id = sh.branch_id AND b.tenant_id = sh.tenant_id
       WHERE sh.tenant_id = ?
       ORDER BY sh.opened_at DESC
       LIMIT ?`,
      [tenantId, limit]
    );
    return rows;
  } finally {
    conn.release();
  }
};

exports.updateShiftDB = async (tenantId, shiftId, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM shifts WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [shiftId, tenantId]
    );
    const shift = rows[0];
    if (!shift) throw new Error("SHIFT_NOT_FOUND");

    const inchargeName = data.inchargeName || shift.incharge_name;
    const openingCash = data.openingCash != null ? Number(data.openingCash) : Number(shift.opening_cash || 0);
    const notes = data.notes != null ? data.notes : shift.notes;
    const branchId = data.branchId !== undefined ? data.branchId || null : shift.branch_id || null;
    const closingCash =
      data.closingCash !== undefined ? Number(data.closingCash || 0) : shift.closing_cash;
    const paidSales = await getShiftSalesSummary(conn, tenantId, shiftId);
    const expected = openingCash + paidSales;

    await conn.query(
      `UPDATE shifts
       SET incharge_name = ?, opening_cash = ?, branch_id = ?, notes = ?,
           closing_cash = CASE WHEN status = 'closed' THEN ? ELSE closing_cash END,
           expected_cash = CASE WHEN status = 'closed' THEN ? ELSE expected_cash END
       WHERE id = ? AND tenant_id = ?`,
      [inchargeName, openingCash, branchId, notes || null, closingCash, expected, shiftId, tenantId]
    );
    return { expected_cash: expected, paid_sales: paidSales };
  } finally {
    conn.release();
  }
};

exports.deleteShiftDB = async (tenantId, shiftId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM shifts WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [shiftId, tenantId]
    );
    const shift = rows[0];
    if (!shift) throw new Error("SHIFT_NOT_FOUND");

    const [orderRows] = await conn.query(
      `SELECT COUNT(*) AS count FROM orders WHERE tenant_id = ? AND shift_id = ?`,
      [tenantId, shiftId]
    );
    if (Number(orderRows[0]?.count || 0) > 0) {
      throw new Error("SHIFT_HAS_ORDERS");
    }
    await conn.query(`DELETE FROM shifts WHERE id = ? AND tenant_id = ?`, [shiftId, tenantId]);
  } finally {
    conn.release();
  }
};
