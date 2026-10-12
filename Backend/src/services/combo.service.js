const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");

exports.getCombosDB = async (tenantId, enabledOnly = false) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const where = enabledOnly ? " AND is_enabled = 1" : "";
    const [combos] = await conn.query(
      `SELECT * FROM combos WHERE tenant_id = ?${where} ORDER BY title ASC`,
      [tenantId]
    );
    const [items] = await conn.query(
      `SELECT * FROM combo_items WHERE tenant_id = ?`,
      [tenantId]
    );
    return (combos || []).map((c) => ({
      ...c,
      items: (items || []).filter((i) => Number(i.combo_id) === Number(c.id)),
    }));
  } finally {
    conn.release();
  }
};

exports.getComboByIdDB = async (tenantId, comboId) => {
  const combos = await exports.getCombosDB(tenantId);
  return combos.find((c) => Number(c.id) === Number(comboId)) || null;
};

exports.addComboDB = async (tenantId, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.beginTransaction();
    const comboId = await allocateNextId(conn, "combos");
    await conn.query(
      `INSERT INTO combos (id, tenant_id, title, description, price, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        comboId,
        tenantId,
        data.title,
        data.description || null,
        Number(data.price) || 0,
        data.isEnabled !== false ? 1 : 0,
      ]
    );
    for (const line of data.items || []) {
      const lineId = await allocateNextId(conn, "combo_items");
      await conn.query(
        `INSERT INTO combo_items (id, tenant_id, combo_id, menu_item_id, variant_id, quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          lineId,
          tenantId,
          comboId,
          line.menuItemId,
          line.variantId || null,
          line.quantity || 1,
        ]
      );
    }
    await conn.commit();
    return comboId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

exports.updateComboDB = async (tenantId, comboId, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE combos SET title = ?, description = ?, price = ?, is_enabled = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        data.title,
        data.description || null,
        Number(data.price) || 0,
        data.isEnabled !== false ? 1 : 0,
        comboId,
        tenantId,
      ]
    );
    await conn.query(`DELETE FROM combo_items WHERE combo_id = ? AND tenant_id = ?`, [
      comboId,
      tenantId,
    ]);
    for (const line of data.items || []) {
      const lineId = await allocateNextId(conn, "combo_items");
      await conn.query(
        `INSERT INTO combo_items (id, tenant_id, combo_id, menu_item_id, variant_id, quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          lineId,
          tenantId,
          comboId,
          line.menuItemId,
          line.variantId || null,
          line.quantity || 1,
        ]
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

exports.deleteComboDB = async (tenantId, comboId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(`DELETE FROM combo_items WHERE combo_id = ? AND tenant_id = ?`, [
      comboId,
      tenantId,
    ]);
    await conn.query(`DELETE FROM combos WHERE id = ? AND tenant_id = ?`, [comboId, tenantId]);
  } finally {
    conn.release();
  }
};
