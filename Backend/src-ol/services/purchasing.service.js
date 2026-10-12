const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");

exports.getSuppliersDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM suppliers WHERE tenant_id = ? ORDER BY name ASC`,
      [tenantId]
    );
    return rows;
  } finally {
    conn.release();
  }
};

exports.addSupplierDB = async (tenantId, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const id = await allocateNextId(conn, "suppliers");
    await conn.query(
      `INSERT INTO suppliers (id, tenant_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, tenantId, data.name, data.phone || null, data.email || null, data.address || null]
    );
    return id;
  } finally {
    conn.release();
  }
};

exports.getPurchasesDB = async (tenantId, limit = 100) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT p.*, s.name AS supplier_name
       FROM purchases p
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.tenant_id = ?
       ORDER BY p.purchase_date DESC
       LIMIT ?`,
      [tenantId, limit]
    );
    return rows;
  } finally {
    conn.release();
  }
};

exports.createPurchaseDB = async (tenantId, payload, username) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.beginTransaction();
    const { supplierId, referenceNo, notes, items, purchaseDate } = payload;
    if (!items?.length) throw new Error("NO_ITEMS");

    let totalAmount = 0;
    for (const line of items) {
      totalAmount += Number(line.quantity) * Number(line.unitCost);
    }

    const purchaseId = await allocateNextId(conn, "purchases");
    await conn.query(
      `INSERT INTO purchases (id, tenant_id, supplier_id, purchase_date, reference_no, total_amount, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseId,
        tenantId,
        supplierId || null,
        purchaseDate || new Date().toISOString().slice(0, 19).replace("T", " "),
        referenceNo || null,
        totalAmount,
        notes || null,
        username || null,
      ]
    );

    for (const line of items) {
      const lineTotal = Number(line.quantity) * Number(line.unitCost);
      const itemId = await allocateNextId(conn, "purchase_items");
      await conn.query(
        `INSERT INTO purchase_items (id, purchase_id, inventory_item_id, quantity, unit_cost, line_total, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, purchaseId, line.inventoryItemId, line.quantity, line.unitCost, lineTotal, tenantId]
      );

      const [invRows] = await conn.query(
        `SELECT quantity, min_quantity_threshold FROM inventory_items WHERE id = ? AND tenant_id = ?`,
        [line.inventoryItemId, tenantId]
      );
      if (!invRows[0]) continue;
      const prev = parseFloat(invRows[0].quantity);
      const minTh = parseFloat(invRows[0].min_quantity_threshold);
      const newQty = prev + parseFloat(line.quantity);
      let status = "out";
      if (newQty > minTh) status = "in";
      else if (newQty > 0) status = "low";

      await conn.query(
        `UPDATE inventory_items SET quantity = ?, status = ? WHERE id = ? AND tenant_id = ?`,
        [newQty, status, line.inventoryItemId, tenantId]
      );

      const logId = await allocateNextId(conn, "inventory_logs");
      await conn.query(
        `INSERT INTO inventory_logs (id, tenant_id, inventory_item_id, type, quantity_change, previous_quantity, new_quantity, note, created_by)
         VALUES (?, ?, ?, 'IN', ?, ?, ?, ?, ?)`,
        [
          logId,
          tenantId,
          line.inventoryItemId,
          Math.abs(parseFloat(line.quantity)),
          prev,
          newQty,
          `Purchase #${purchaseId} @ ${line.unitCost}`,
          username || null,
        ]
      );
    }

    await conn.commit();
    return purchaseId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};
