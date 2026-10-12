const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");

exports.getActiveShiftDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM shifts WHERE tenant_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1`,
      [tenantId]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
};

exports.openShiftDB = async (tenantId, inchargeName, openingCash, openedBy) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const active = await exports.getActiveShiftDB(tenantId);
    if (active) {
      throw new Error("SHIFT_ALREADY_OPEN");
    }
    const id = await allocateNextId(conn, "shifts");
    await conn.query(
      `INSERT INTO shifts (id, tenant_id, incharge_name, opened_by, opening_cash, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [id, tenantId, inchargeName, openedBy || null, Number(openingCash) || 0]
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

    const [salesRows] = await conn.query(
      `SELECT COALESCE(SUM(i.total), 0) AS cash_sales
       FROM orders o
       INNER JOIN invoices i ON o.invoice_id = i.id AND i.tenant_id = o.tenant_id
       WHERE o.tenant_id = ? AND o.shift_id = ? AND o.payment_status = 'paid' AND o.status != 'cancelled'`,
      [tenantId, shiftId]
    );
    const cashSales = Number(salesRows[0]?.cash_sales || 0);
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
      `SELECT * FROM shifts WHERE tenant_id = ? ORDER BY opened_at DESC LIMIT ?`,
      [tenantId, limit]
    );
    return rows;
  } finally {
    conn.release();
  }
};
