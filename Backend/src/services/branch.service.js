const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");

exports.getBranchesDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM branches WHERE tenant_id = ? ORDER BY is_default DESC, name ASC`,
      [tenantId]
    );
    return rows || [];
  } finally {
    conn.release();
  }
};

exports.addBranchDB = async (tenantId, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const id = await allocateNextId(conn, "branches");
    const isDefault = data.isDefault ? 1 : 0;
    if (isDefault) {
      await conn.query(`UPDATE branches SET is_default = 0 WHERE tenant_id = ?`, [tenantId]);
    }
    await conn.query(
      `INSERT INTO branches (id, tenant_id, name, address, phone, is_default, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [id, tenantId, data.name, data.address || null, data.phone || null, isDefault]
    );
    return id;
  } finally {
    conn.release();
  }
};

exports.updateBranchDB = async (tenantId, id, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    if (data.isDefault) {
      await conn.query(`UPDATE branches SET is_default = 0 WHERE tenant_id = ?`, [tenantId]);
    }
    await conn.query(
      `UPDATE branches SET name = ?, address = ?, phone = ?, is_default = ?, is_active = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        data.name,
        data.address || null,
        data.phone || null,
        data.isDefault ? 1 : 0,
        data.isActive !== false ? 1 : 0,
        id,
        tenantId,
      ]
    );
  } finally {
    conn.release();
  }
};

exports.deleteBranchDB = async (tenantId, id) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(`DELETE FROM branches WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  } finally {
    conn.release();
  }
};

exports.getDefaultBranchIdDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id FROM branches WHERE tenant_id = ? AND is_active = 1 ORDER BY is_default DESC, id ASC LIMIT 1`,
      [tenantId]
    );
    return rows?.[0]?.id || null;
  } finally {
    conn.release();
  }
};
