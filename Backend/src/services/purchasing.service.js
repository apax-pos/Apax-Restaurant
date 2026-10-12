const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");
const {
  recordLedgerEntryDB,
  deleteLedgerEntriesByReferenceDB,
} = require("./supplierLedger.service");

function calculateInventoryStatus(quantity, minThreshold) {
  const qty = Number(quantity) || 0;
  const min = Number(minThreshold) || 0;
  if (qty <= 0) return "out";
  if (qty <= min) return "low";
  return "in";
}

async function updateInventoryQuantity(conn, tenantId, inventoryItemId, quantityDelta, note, username) {
  const [rows] = await conn.query(
    `SELECT quantity, min_quantity_threshold FROM inventory_items WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [inventoryItemId, tenantId]
  );
  const item = rows?.[0];
  if (!item) throw new Error("INVENTORY_ITEM_NOT_FOUND");
  const previous = Number(item.quantity) || 0;
  const next = previous + Number(quantityDelta);
  if (next < 0) throw new Error("INSUFFICIENT_STOCK_TO_REVERSE_PURCHASE");
  const status = calculateInventoryStatus(next, item.min_quantity_threshold);

  await conn.query(
    `UPDATE inventory_items SET quantity = ?, status = ? WHERE id = ? AND tenant_id = ?`,
    [next, status, inventoryItemId, tenantId]
  );

  const logId = await allocateNextId(conn, "inventory_logs");
  await conn.query(
    `INSERT INTO inventory_logs (id, tenant_id, inventory_item_id, type, quantity_change, previous_quantity, new_quantity, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      logId,
      tenantId,
      inventoryItemId,
      Number(quantityDelta) >= 0 ? "IN" : "OUT",
      Math.abs(Number(quantityDelta)),
      previous,
      next,
      note,
      username || null,
    ]
  );
}

async function applyPurchaseItems(conn, tenantId, purchaseId, items, username) {
  for (const line of items) {
    const quantity = Number(line.quantity);
    const unitCost = Number(line.unitCost);
    if (!line.inventoryItemId || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("INVALID_PURCHASE_ITEM");
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new Error("INVALID_PURCHASE_ITEM");
    }

    const lineTotal = quantity * unitCost;
    const itemId = await allocateNextId(conn, "purchase_items");
    await conn.query(
      `INSERT INTO purchase_items (id, purchase_id, inventory_item_id, quantity, unit_cost, line_total, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [itemId, purchaseId, line.inventoryItemId, quantity, unitCost, lineTotal, tenantId]
    );

    await updateInventoryQuantity(
      conn,
      tenantId,
      line.inventoryItemId,
      quantity,
      `Purchase #${purchaseId} @ ${unitCost}`,
      username
    );
  }
}

async function reversePurchaseItems(conn, tenantId, purchaseId, username) {
  const [items] = await conn.query(
    `SELECT * FROM purchase_items WHERE purchase_id = ? AND tenant_id = ?`,
    [purchaseId, tenantId]
  );
  for (const line of items || []) {
    await updateInventoryQuantity(
      conn,
      tenantId,
      line.inventory_item_id,
      -Math.abs(Number(line.quantity)),
      `Reverse purchase #${purchaseId}`,
      username
    );
  }
  await conn.query(`DELETE FROM purchase_items WHERE purchase_id = ? AND tenant_id = ?`, [
    purchaseId,
    tenantId,
  ]);
}

function purchaseTotal(items) {
  return (items || []).reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unitCost || 0),
    0
  );
}

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

exports.updateSupplierDB = async (tenantId, supplierId, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(
      `UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ? AND tenant_id = ?`,
      [
        data.name,
        data.phone || null,
        data.email || null,
        data.address || null,
        supplierId,
        tenantId,
      ]
    );
  } finally {
    conn.release();
  }
};

exports.deleteSupplierDB = async (tenantId, supplierId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [refs] = await conn.query(
      `SELECT
         (SELECT COUNT(*) FROM purchases WHERE tenant_id = ? AND supplier_id = ?) AS purchases_count,
         (SELECT COUNT(*) FROM supplier_ledger_entries WHERE tenant_id = ? AND supplier_id = ?) AS ledger_count`,
      [tenantId, supplierId, tenantId, supplierId]
    );
    if (Number(refs?.[0]?.purchases_count || 0) > 0 || Number(refs?.[0]?.ledger_count || 0) > 0) {
      throw new Error("SUPPLIER_IN_USE");
    }
    await conn.query(`DELETE FROM suppliers WHERE id = ? AND tenant_id = ?`, [supplierId, tenantId]);
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

exports.getPurchaseByIdDB = async (tenantId, purchaseId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [purchases] = await conn.query(
      `SELECT p.*, s.name AS supplier_name
       FROM purchases p
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.tenant_id = ? AND p.id = ?
       LIMIT 1`,
      [tenantId, purchaseId]
    );
    const purchase = purchases?.[0];
    if (!purchase) throw new Error("PURCHASE_NOT_FOUND");
    const [items] = await conn.query(
      `SELECT pi.*, ii.title AS inventory_item_title, ii.unit AS inventory_item_unit
       FROM purchase_items pi
       LEFT JOIN inventory_items ii ON pi.inventory_item_id = ii.id AND ii.tenant_id = pi.tenant_id
       WHERE pi.purchase_id = ? AND pi.tenant_id = ?
       ORDER BY pi.id ASC`,
      [purchaseId, tenantId]
    );
    return { purchase, items: items || [] };
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

    let totalAmount = purchaseTotal(items);

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

    await applyPurchaseItems(conn, tenantId, purchaseId, items, username);

    if (supplierId) {
      await recordLedgerEntryDB(
        tenantId,
        supplierId,
        "purchase",
        totalAmount,
        "purchase",
        purchaseId,
        notes || referenceNo || null,
        username,
        conn
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

exports.updatePurchaseDB = async (tenantId, purchaseId, payload, username) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.beginTransaction();
    const { supplierId, referenceNo, notes, items, purchaseDate } = payload;
    if (!items?.length) throw new Error("NO_ITEMS");

    const [existingRows] = await conn.query(
      `SELECT * FROM purchases WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [purchaseId, tenantId]
    );
    const existing = existingRows?.[0];
    if (!existing) throw new Error("PURCHASE_NOT_FOUND");

    await reversePurchaseItems(conn, tenantId, purchaseId, username);
    await deleteLedgerEntriesByReferenceDB(tenantId, "purchase", purchaseId, conn);

    const totalAmount = purchaseTotal(items);
    await conn.query(
      `UPDATE purchases
       SET supplier_id = ?, purchase_date = ?, reference_no = ?, total_amount = ?, notes = ?, created_by = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        supplierId || null,
        purchaseDate || existing.purchase_date || new Date().toISOString().slice(0, 19).replace("T", " "),
        referenceNo || null,
        totalAmount,
        notes || null,
        username || existing.created_by || null,
        purchaseId,
        tenantId,
      ]
    );

    await applyPurchaseItems(conn, tenantId, purchaseId, items, username);

    if (supplierId) {
      await recordLedgerEntryDB(
        tenantId,
        supplierId,
        "purchase",
        totalAmount,
        "purchase",
        purchaseId,
        notes || referenceNo || null,
        username,
        conn
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

exports.deletePurchaseDB = async (tenantId, purchaseId, username) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.beginTransaction();
    const [existingRows] = await conn.query(
      `SELECT * FROM purchases WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [purchaseId, tenantId]
    );
    if (!existingRows?.[0]) throw new Error("PURCHASE_NOT_FOUND");

    await reversePurchaseItems(conn, tenantId, purchaseId, username);
    await deleteLedgerEntriesByReferenceDB(tenantId, "purchase", purchaseId, conn);
    await conn.query(`DELETE FROM purchases WHERE id = ? AND tenant_id = ?`, [purchaseId, tenantId]);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};
