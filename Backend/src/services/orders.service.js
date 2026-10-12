const { CONFIG } = require("../config");
const { getMySqlPromiseConnection } = require("../config/mysql.db");
const { toSafeIdList } = require("../utils/validateIds");
const {
  ensurePosSchema,
  tableHasColumn,
} = require("../utils/sqliteSchema.util");

function parseAddonIds(addons) {
  if (!addons) return [];
  try {
    const parsed = JSON.parse(addons);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function resolvePaymentTypeId(conn, tenantId, paymentTypeId) {
  if (paymentTypeId == null || paymentTypeId === "") return null;
  const id = parseInt(paymentTypeId, 10);
  if (!Number.isFinite(id)) return null;
  const [rows] = await conn.query(
    "SELECT id FROM payment_types WHERE id = ? AND tenant_id = ? LIMIT 1",
    [id, tenantId]
  );
  return rows[0] ? id : null;
}

exports.getOrdersDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await ensurePosSchema(conn);

    const sql = `
    SELECT
      o.id,
      o.date,
      o.delivery_type,
      o.customer_type,
      o.customer_id,
      c. \`name\` AS customer_name,
      o.table_id,
      st.table_title,
      st. \`floor\`,
      o.status,
      o.payment_status,
      o.token_no
    FROM
      orders o
      LEFT JOIN customers c ON o.customer_id = c.phone AND c.tenant_id = o.tenant_id
      LEFT JOIN store_tables st ON o.table_id = st.id AND st.tenant_id = o.tenant_id
    WHERE
      date(COALESCE(o.date, datetime('now'))) >= date(datetime('now'), '-1 day')
      AND date(COALESCE(o.date, datetime('now'))) <= date(datetime('now'), '+1 day')
      AND COALESCE(o.status, 'created') NOT IN ('completed', 'cancelled')
      AND o.tenant_id = ?
    `;

    const [kitchenOrders] = await conn.query(sql, [tenantId]);

    let kitchenOrdersItems = [];
    let addons = [];

    if(kitchenOrders.length > 0) {
      const orderIds = kitchenOrders.map(o=>o.id).join(",");
      const sql2 = `
      SELECT
        oi.id,
        oi.order_id,
        oi.item_id,
        mi.title AS item_title,
        oi.variant_id,
        miv.title as variant_title,
        oi.price,
        oi.quantity,
        oi.status,
        oi.date,
        oi.addons,
        oi.notes
      FROM
        order_items oi
        LEFT JOIN menu_items mi ON oi.item_id = mi.id
        LEFT join menu_item_variants miv ON oi.item_id = miv.item_id AND oi.variant_id = miv.id

      WHERE oi.order_id IN (${orderIds}) AND oi.tenant_id = ?
      `
      const [kitchenOrdersItemsResult] = await conn.query(sql2, [tenantId]);
      kitchenOrdersItems = kitchenOrdersItemsResult;

      const addonIdList = [
        ...new Set(kitchenOrdersItems.flatMap((o) => parseAddonIds(o.addons))),
      ]
        .map((id) => parseInt(id, 10))
        .filter((id) => Number.isFinite(id) && id > 0);
      const addonIds = addonIdList.length ? addonIdList.join(",") : "";
      const [addonsResult] = addonIds
        ? await conn.query(
            `SELECT id, item_id, title FROM menu_item_addons WHERE id IN (${addonIds}) AND tenant_id = ?;`,
            [tenantId]
          )
        : [];
      addons = addonsResult;
    }
    return {
      kitchenOrders,
      kitchenOrdersItems,
      addons
    }

  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
}
};

exports.updateOrderItemStatusDB = async (orderItemId, status, tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {

    const sql = `
    UPDATE order_items SET
    status = ?
    WHERE id = ? AND tenant_id = ?;
    `;

    await conn.query(sql, [status, orderItemId, tenantId]);

    return;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
}
};

exports.cancelOrderDB = async (orderIds, tenantId, cancelReason, cancelledBy) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const safeIds = toSafeIdList(orderIds);
    if (!safeIds) throw new Error("INVALID_ORDER_IDS");
    const orderIdsText = safeIds.join(",");

    await conn.query(
      `UPDATE orders SET status = 'cancelled', cancel_reason = ?, cancelled_by = ?, cancelled_at = datetime('now')
       WHERE id IN (${orderIdsText}) AND tenant_id = ? AND payment_status = 'pending';`,
      [cancelReason || null, cancelledBy || null, tenantId]
    );

    await conn.query(
      `UPDATE order_items SET status = 'cancelled' WHERE order_id IN (${orderIdsText}) AND tenant_id = ?`,
      [tenantId]
    );

    return;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
  }
};

exports.getOrderForEditDB = async (orderId, tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [orders] = await conn.query(
      `SELECT * FROM orders WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [orderId, tenantId]
    );
    if (!orders[0]) return null;
    if (orders[0].payment_status === "paid" || orders[0].status === "cancelled") {
      throw new Error("ORDER_NOT_EDITABLE");
    }
    const [items] = await conn.query(
      `SELECT oi.*, mi.title AS item_title, miv.title AS variant_title
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.item_id = mi.id
       LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND oi.item_id = miv.item_id
       WHERE oi.order_id = ? AND oi.tenant_id = ?`,
      [orderId, tenantId]
    );
    return { order: orders[0], items };
  } finally {
    conn.release();
  }
};

exports.editOrderDB = async (orderId, tenantId, cartItems, deliveryType, customerType, customerId, tableId) => {
  const { allocateNextId } = require("../config/mysql.db");
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.beginTransaction();
    const [orders] = await conn.query(
      `SELECT * FROM orders WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [orderId, tenantId]
    );
    if (!orders[0]) throw new Error("ORDER_NOT_FOUND");
    if (orders[0].payment_status === "paid" || orders[0].status === "cancelled") {
      throw new Error("ORDER_NOT_EDITABLE");
    }

    await conn.query(
      `UPDATE orders SET delivery_type = ?, customer_type = ?, customer_id = ?, table_id = ? WHERE id = ? AND tenant_id = ?`,
      [deliveryType, customerType, customerId, tableId, orderId, tenantId]
    );

    await conn.query(`DELETE FROM order_items WHERE order_id = ? AND tenant_id = ?`, [orderId, tenantId]);

    for (const item of cartItems) {
      const orderItemId = await allocateNextId(conn, "order_items");
      await conn.query(
        `INSERT INTO order_items (id, order_id, item_id, variant_id, price, quantity, notes, addons, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderItemId,
          orderId,
          item.id,
          item.variant_id || null,
          item.price,
          item.quantity,
          item.notes || null,
          item?.addons_ids?.length > 0 ? JSON.stringify(item.addons_ids) : null,
          tenantId,
        ]
      );
    }

    await conn.commit();
    return orderId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};


exports.completeOrderDB = async (orderIds, tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const safeIds = toSafeIdList(orderIds);
    if (!safeIds) throw new Error("INVALID_ORDER_IDS");
    const orderIdsText = safeIds.join(",");

    const sql = `
    UPDATE orders SET
    status = 'completed'
    WHERE id IN (${orderIdsText}) AND tenant_id = ?;
    `;

    await conn.query(sql, [tenantId]);

    return;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
  }
};

exports.getInvoiceIdFromOrderIdsDB = async (orderIds, tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const safeIds = toSafeIdList(orderIds);
    if (!safeIds) throw new Error("INVALID_ORDER_IDS");
    const orderIdsText = safeIds.join(",");

    const sql = `
    SELECT
      HEX(AES_ENCRYPT(hex(invoice_id), ?)) as invoice_id,
      customer_id
    FROM
      orders o
    WHERE
      id IN (${orderIdsText}) AND tenant_id = ?
    LIMIT
      1
    `;

    const [result] = await conn.query(sql, [CONFIG.ENCRYPTION_KEY, tenantId]);

    return result[0];
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
  }
};

exports.getEncryptedInvoiceIdDB = async (invoiceId, tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {

    const sql = `
    SELECT
      HEX(AES_ENCRYPT(hex(invoice_id), ?)) as invoice_id,
      customer_id
    FROM
      orders o
    WHERE
      invoice_id = ? AND tenant_id = ?
    LIMIT
      1
    `;

    const [result] = await conn.query(sql, [CONFIG.ENCRYPTION_KEY, invoiceId, tenantId]);

    return result[0];
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
  }
};

exports.checkInvoiceIdDB = async (encryptedInvoiceId) => {
  const conn = await getMySqlPromiseConnection();
  try {

    const sql = `
    SELECT
      invoice_id,
      customer_id
    FROM
      orders o
    WHERE
      AES_DECRYPT(UNHEX(?), ?) = HEX(invoice_id)
    LIMIT
      1
    `;

    const [result] = await conn.query(sql, [encryptedInvoiceId, CONFIG.ENCRYPTION_KEY]);

    return result[0];
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
  }
};

exports.getOrdersPaymentSummaryDB = async (orderIds, tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const safeIds = toSafeIdList(orderIds);
    if (!safeIds) throw new Error("INVALID_ORDER_IDS");
    const orderIdsToFindSummary = safeIds.join(",");

    const sql = `
    SELECT
      o.id,
      o.date,
      o.delivery_type,
      o.customer_type,
      o.customer_id,
      c. \`name\` AS customer_name,
      o.table_id,
      st.table_title,
      st. \`floor\`,
      o.status,
      o.payment_status,
      o.token_no
    FROM
      orders o
      LEFT JOIN customers c ON o.customer_id = c.phone AND c.tenant_id = o.tenant_id
      LEFT JOIN store_tables st ON o.table_id = st.id AND st.tenant_id = o.tenant_id
    WHERE
      o.id IN (${orderIdsToFindSummary}) AND o.tenant_id = ?
    `;

    const [kitchenOrders] = await conn.query(sql, [tenantId]);

    let kitchenOrdersItems = [];
    let addons = [];

    if(kitchenOrders.length > 0) {
      const orderIds = kitchenOrders.map(o=>o.id).join(",");
      const sql2 = `
      SELECT
        oi.id,
        oi.order_id,
        oi.item_id,
        mi.title AS item_title,
        oi.variant_id,
        miv.title as variant_title,
        miv.price as variant_price,
        mi.price,
        mi.tax_id,
        t.title as tax_title,
        t.rate as tax_rate,
        t.type as tax_type,
        oi.quantity,
        oi.status,
        oi.date,
        oi.addons,
        oi.notes
      FROM
        order_items oi
        LEFT JOIN menu_items mi ON oi.item_id = mi.id
        LEFT JOIN menu_item_variants miv ON oi.item_id = miv.item_id AND oi.variant_id = miv.id
        LEFT JOIN taxes t ON mi.tax_id = t.id

      WHERE oi.order_id IN (${orderIds}) AND oi.tenant_id = ? AND oi.status NOT IN ('cancelled')
      `
      const [kitchenOrdersItemsResult] = await conn.query(sql2, [tenantId]);
      kitchenOrdersItems = kitchenOrdersItemsResult;

      const rawAddonIds = [...new Set(kitchenOrdersItems.flatMap((o) => {
        try {
          return o.addons ? JSON.parse(o.addons) : [];
        } catch {
          return [];
        }
      }))];
      const addonIdList = rawAddonIds
        .map((id) => parseInt(id, 10))
        .filter((id) => Number.isFinite(id) && id > 0);
      const addonIds = addonIdList.length ? addonIdList.join(",") : "";
      const [addonsResult] = addonIds
        ? await conn.query(
            `SELECT id, item_id, title, price FROM menu_item_addons WHERE id IN (${addonIds}) AND tenant_id = ?;`,
            [tenantId]
          )
        : [];
      addons = addonsResult;
    }


    return {
      kitchenOrders,
      kitchenOrdersItems,
      addons
    }

  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
}
};

exports.createInvoiceDB = async (
  subtotal,
  taxTotal,
  serviceChargeTotal,
  total,
  date,
  selectedPaymentType,
  tenantId,
  discountType = "none",
  discountValue = 0,
  discountAmount = 0,
  promotionMeta = null
) => {
  const conn = await getMySqlPromiseConnection();
  let inTxn = false;
  try {
    await ensurePosSchema(conn);
    await conn.beginTransaction();
    inTxn = true;

    let invoiceId = 0;

    const [invoiceSequence] = await conn.query("SELECT sequence_no FROM invoice_sequences WHERE tenant_id = ? LIMIT 1", [tenantId]);
    invoiceId = invoiceSequence[0]?.sequence_no || 0;

    invoiceId += 1;

    const paymentTypeId = await resolvePaymentTypeId(
      conn,
      tenantId,
      selectedPaymentType
    );

    const baseCols = [
      "id",
      "sub_total",
      "tax_total",
      "service_charge_total",
      "total",
      "created_at",
      "payment_type_id",
      "tenant_id",
    ];
    const baseVals = [
      invoiceId,
      subtotal,
      taxTotal,
      serviceChargeTotal,
      total,
      date,
      paymentTypeId,
      tenantId,
    ];

    const hasDiscountType = await tableHasColumn(conn, "invoices", "discount_type");
    const hasDiscountValue = await tableHasColumn(conn, "invoices", "discount_value");
    const hasDiscountAmount = await tableHasColumn(conn, "invoices", "discount_amount");

    if (hasDiscountType) {
      baseCols.push("discount_type");
      baseVals.push(discountType || "none");
    }
    if (hasDiscountValue) {
      baseCols.push("discount_value");
      baseVals.push(Number(discountValue) || 0);
    }
    if (hasDiscountAmount) {
      baseCols.push("discount_amount");
      baseVals.push(Number(discountAmount) || 0);
    }

    if (promotionMeta && (await tableHasColumn(conn, "invoices", "promotion_discount"))) {
      baseCols.push("promotion_discount");
      baseVals.push(Number(promotionMeta.promotionDiscount) || 0);
    }
    if (promotionMeta && (await tableHasColumn(conn, "invoices", "promotion_id"))) {
      baseCols.push("promotion_id");
      baseVals.push(promotionMeta.promotionId || null);
    }
    if (promotionMeta && (await tableHasColumn(conn, "invoices", "promotion_title"))) {
      baseCols.push("promotion_title");
      baseVals.push(promotionMeta.promotionTitle || null);
    }
    if (promotionMeta && (await tableHasColumn(conn, "invoices", "applied_promotions"))) {
      baseCols.push("applied_promotions");
      baseVals.push(
        promotionMeta.appliedPromotions?.length
          ? JSON.stringify(promotionMeta.appliedPromotions)
          : null
      );
    }

    const placeholders = baseCols.map(() => "?").join(", ");
    await conn.query(
      `INSERT INTO invoices (${baseCols.join(", ")}) VALUES (${placeholders})`,
      baseVals
    );

    const [seqRows] = await conn.query(
      "SELECT tenant_id FROM invoice_sequences WHERE tenant_id = ? LIMIT 1",
      [tenantId]
    );
    if (seqRows && seqRows[0]) {
      await conn.query(
        "UPDATE invoice_sequences SET sequence_no = ? WHERE tenant_id = ?",
        [invoiceId, tenantId]
      );
    } else {
      await conn.query(
        "INSERT INTO invoice_sequences (sequence_no, tenant_id) VALUES (?, ?)",
        [invoiceId, tenantId]
      );
    }

    await conn.commit();
    inTxn = false;

    return invoiceId;
  } catch (error) {
    console.error("createInvoiceDB failed:", error?.message || error);
    if (inTxn) {
      try {
        await conn.rollback();
      } catch (_) {
        /* ignore */
      }
    }
    throw error;
  } finally {
    conn.release();
  }
}

exports.completeOrdersAndSaveInvoiceIdDB = async (orderIds, invoiceId, tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const safeIds = toSafeIdList(orderIds);
    if (!safeIds) throw new Error("INVALID_ORDER_IDS");
    const orderIdsText = safeIds.join(",");

    const sql = `
    UPDATE orders SET
    status = 'completed', payment_status = 'paid', invoice_id = ?
    WHERE id IN (${orderIdsText}) AND tenant_id = ?;
    `;

    await conn.query(sql, [invoiceId, tenantId]);

    return;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
  }
}
