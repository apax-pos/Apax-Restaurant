const { CONFIG } = require("../config");
const { getMySqlPromiseConnection } = require("../config/mysql.db")

exports.getOrdersDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {

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
      LEFT JOIN store_tables st ON o.table_id = st.id
    WHERE
      date >= date(datetime('now'), '-1 day')
      AND date <= date(datetime('now'), '+1 day')
      AND o.status NOT IN ('completed', 'cancelled')
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

      WHERE oi.order_id IN (${orderIds})
      `
      const [kitchenOrdersItemsResult] = await conn.query(sql2);
      kitchenOrdersItems = kitchenOrdersItemsResult;

      const addonIds = [...new Set([...kitchenOrdersItems.flatMap((o)=>o.addons?JSON.parse(o?.addons):[])])].join(",");
      const [addonsResult] = addonIds ? await conn.query(`SELECT id, item_id, title FROM menu_item_addons WHERE id IN (${addonIds});`):[]
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
    const orderIdsText = orderIds.join(",");

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

    const orderIdsText = orderIds.join(",");

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

    const orderIdsText = orderIds.join(",");

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

exports.getOrdersPaymentSummaryDB = async (orderIdsToFindSummary, tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {

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
      LEFT JOIN store_tables st ON o.table_id = st.id
    WHERE
      date >= date(datetime('now'), '-1 day')
      AND date <= date(datetime('now'), '+1 day')
      AND o.status NOT IN ('completed', 'cancelled')
      AND o.id IN (${orderIdsToFindSummary}) AND o.tenant_id = ?
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

      WHERE oi.order_id IN (${orderIds}) AND oi.status NOT IN ('cancelled')
      `
      const [kitchenOrdersItemsResult] = await conn.query(sql2);
      kitchenOrdersItems = kitchenOrdersItemsResult;

      const addonIds = [...new Set([...kitchenOrdersItems.flatMap((o)=>o.addons?JSON.parse(o?.addons):[])])].join(",");
      const [addonsResult] = addonIds ? await conn.query(`SELECT id, item_id, title, price FROM menu_item_addons WHERE id IN (${addonIds});`):[]
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
  discountAmount = 0
) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.beginTransaction();

    let invoiceId = 0;

    const [invoiceSequence] = await conn.query("SELECT sequence_no FROM invoice_sequences WHERE tenant_id = ? LIMIT 1", [tenantId]);
    invoiceId = invoiceSequence[0]?.sequence_no || 0;

    invoiceId += 1;

    const sql = `
    INSERT INTO invoices
    (id, sub_total, tax_total, service_charge_total, total, created_at, payment_type_id, tenant_id, discount_type, discount_value, discount_amount)
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await conn.query(sql, [
      invoiceId,
      subtotal,
      taxTotal,
      serviceChargeTotal,
      total,
      date,
      selectedPaymentType,
      tenantId,
      discountType || "none",
      Number(discountValue) || 0,
      Number(discountAmount) || 0,
    ]);

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

    return invoiceId;
  } catch (error) {
    console.error(error);
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

exports.completeOrdersAndSaveInvoiceIdDB = async (orderIds, invoiceId, tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {

    const orderIdsText = orderIds.join(",");

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
