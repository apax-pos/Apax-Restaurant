const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");
const {
  ensurePosSchema,
  resolveInventoryLogCreatedBy,
  tableHasColumn,
} = require("../utils/sqliteSchema.util");

function normalizeVariantId(variantId) {
  const n = parseInt(variantId, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function insertOrderRow(conn, tenantId, orderFields) {
  const cols = [
    "id",
    "delivery_type",
    "customer_type",
    "customer_id",
    "table_id",
    "token_no",
    "payment_status",
    "invoice_id",
    "tenant_id",
  ];
  const vals = [
    orderFields.orderId,
    orderFields.deliveryType || "",
    orderFields.customerType || "WALKIN",
    orderFields.customerId,
    orderFields.tableId,
    orderFields.tokenNo,
    orderFields.paymentStatus || "pending",
    orderFields.invoiceId || null,
    tenantId,
  ];

  if (await tableHasColumn(conn, "orders", "status")) {
    cols.push("status");
    vals.push("created");
  }
  if (await tableHasColumn(conn, "orders", "date")) {
    cols.push("date");
    vals.push(
      new Date().toISOString().slice(0, 19).replace("T", " ")
    );
  }
  if (await tableHasColumn(conn, "orders", "shift_id")) {
    cols.push("shift_id");
    vals.push(
      orderFields.shiftId != null ? Number(orderFields.shiftId) : null
    );
  }
  if (await tableHasColumn(conn, "orders", "branch_id")) {
    cols.push("branch_id");
    vals.push(orderFields.branchId != null ? Number(orderFields.branchId) : null);
  }
  if (await tableHasColumn(conn, "orders", "delivery_zone_id")) {
    cols.push("delivery_zone_id");
    vals.push(
      orderFields.deliveryZoneId != null ? Number(orderFields.deliveryZoneId) : null
    );
  }
  if (await tableHasColumn(conn, "orders", "rider_id")) {
    cols.push("rider_id");
    vals.push(orderFields.riderId != null ? Number(orderFields.riderId) : null);
  }
  if (await tableHasColumn(conn, "orders", "delivery_charge")) {
    cols.push("delivery_charge");
    vals.push(Number(orderFields.deliveryCharge) || 0);
  }

  const placeholders = cols.map(() => "?").join(", ");
  await conn.query(
    `INSERT INTO orders (${cols.join(", ")}) VALUES (${placeholders})`,
    vals
  );
}

async function insertOrderItems(conn, tenantId, orderId, cartItems) {
  const hasStatus = await tableHasColumn(conn, "order_items", "status");
  const hasDate = await tableHasColumn(conn, "order_items", "date");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  for (const item of cartItems) {
    const itemId = parseInt(item.id, 10);
    if (!Number.isFinite(itemId)) {
      throw new Error(`INVALID_MENU_ITEM_ID:${item.id}`);
    }

    const orderItemId = await allocateNextId(conn, "order_items");
    const cols = [
      "id",
      "order_id",
      "item_id",
      "variant_id",
      "price",
      "quantity",
      "notes",
      "addons",
      "tenant_id",
    ];
    const vals = [
      orderItemId,
      orderId,
      itemId,
      normalizeVariantId(item.variant_id),
      Number(item.price) || 0,
      parseInt(item.quantity, 10) || 1,
      item.notes || null,
      item?.addons_ids?.length > 0 ? JSON.stringify(item.addons_ids) : null,
      tenantId,
    ];

    if (hasStatus) {
      cols.push("status");
      vals.push("created");
    }
    if (hasDate) {
      cols.push("date");
      vals.push(now);
    }
    if (await tableHasColumn(conn, "order_items", "combo_id")) {
      cols.push("combo_id");
      vals.push(item.combo_id ? Number(item.combo_id) : null);
    }

    const placeholders = cols.map(() => "?").join(", ");
    await conn.query(
      `INSERT INTO order_items (${cols.join(", ")}) VALUES (${placeholders})`,
      vals
    );
  }
}

async function deductInventoryForOrder(conn, tenantId, cartItems, invoiceId, username) {
  const inventoryUsage = {};

  cartItems.forEach((item) => {
    (item.recipeItems || []).forEach((recipe) => {
      const { inventory_item_id, recipe_quantity, variant_id, addon_id } = recipe;
      if (variant_id && variant_id != item.variant_id) return;
      if (addon_id && !item.addons_ids?.map(String).includes(String(addon_id))) return;

      const invId = inventory_item_id;
      const qtyNeeded = parseFloat(recipe_quantity) * (parseInt(item.quantity, 10) || 1);
      if (!invId || !Number.isFinite(qtyNeeded)) return;

      if (!inventoryUsage[invId]) {
        inventoryUsage[invId] = { total_quantity: 0 };
      }
      inventoryUsage[invId].total_quantity += qtyNeeded;
    });
  });

  if (Object.keys(inventoryUsage).length === 0) return;

  const logCreatedBy = await resolveInventoryLogCreatedBy(conn, tenantId, username);
  const logsHaveId = await tableHasColumn(conn, "inventory_logs", "id");

  for (const [inventoryItemId, usage] of Object.entries(inventoryUsage)) {
    const invId = parseInt(inventoryItemId, 10);
    const qtyUsed = parseFloat(usage.total_quantity);

    const [itemRows] = await conn.query(
      "SELECT quantity, min_quantity_threshold FROM inventory_items WHERE id = ? AND tenant_id = ?",
      [invId, tenantId]
    );
    const currentItem = itemRows && itemRows[0];
    if (!currentItem) continue;

    const previousQty = parseFloat(currentItem.quantity || 0);
    const newQty = previousQty - qtyUsed;
    const minQuantityThreshold = parseFloat(currentItem.min_quantity_threshold || 0);

    if (logsHaveId) {
      const logId = await allocateNextId(conn, "inventory_logs");
      await conn.query(
        `INSERT INTO inventory_logs
        (id, tenant_id, inventory_item_id, type, quantity_change, previous_quantity, new_quantity, note, created_by)
        VALUES (?, ?, ?, 'OUT', ?, ?, ?, ?, ?)`,
        [
          logId,
          tenantId,
          invId,
          qtyUsed,
          previousQty,
          newQty,
          invoiceId
            ? `Auto deduction for recipe usage in invoice #${invoiceId}`
            : "Auto deduction for recipe usage in order",
          logCreatedBy,
        ]
      );
    } else {
      await conn.query(
        `INSERT INTO inventory_logs
        (tenant_id, inventory_item_id, type, quantity_change, previous_quantity, new_quantity, note, created_by)
        VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?)`,
        [
          tenantId,
          invId,
          qtyUsed,
          previousQty,
          newQty,
          invoiceId
            ? `Auto deduction for recipe usage in invoice #${invoiceId}`
            : "Auto deduction for recipe usage in order",
          logCreatedBy,
        ]
      );
    }

    let status = "out";
    if (newQty > 0 && newQty <= minQuantityThreshold) status = "low";
    else if (newQty > minQuantityThreshold) status = "in";

    await conn.query(
      `UPDATE inventory_items SET quantity = ?, status = ? WHERE id = ? AND tenant_id = ?`,
      [newQty, status, invId, tenantId]
    );
  }
}

async function upsertTokenSequence(conn, tokenNo, tenantId) {
    const [rows] = await conn.query(
        "SELECT tenant_id FROM token_sequences WHERE tenant_id = ? LIMIT 1",
        [tenantId]
    );
    if (rows && rows[0]) {
        await conn.query(
            "UPDATE token_sequences SET sequence_no = ?, last_updated = datetime('now') WHERE tenant_id = ?",
            [tokenNo, tenantId]
        );
    } else {
        await conn.query(
            "INSERT INTO token_sequences (sequence_no, last_updated, tenant_id) VALUES (?, datetime('now'), ?)",
            [tokenNo, tenantId]
        );
    }
}

exports.createOrderDB = async (
  tenantId,
  cartItems,
  deliveryType,
  customerType,
  customerId,
  tableId,
  paymentStatus = "pending",
  invoiceId = null,
  username = null,
  shiftId = null,
  orderMeta = {}
) => {
  const conn = await getMySqlPromiseConnection();

  let inTxn = false;
  try {
    await ensurePosSchema(conn);

    // start transaction
    await conn.beginTransaction();
    inTxn = true;

    // step 1: get current token no. from table token_sequences
    // if no data found give 0
    let tokenNo = 0;

    const [tokenSequence] = await conn.query(
      "SELECT sequence_no, date(last_updated) AS last_updated, date('now') AS todays_date FROM token_sequences WHERE tenant_id = ? LIMIT 1",
      [tenantId]
    );
    tokenNo = tokenSequence[0]?.sequence_no || 0;
    const tokenLastUpdated = tokenSequence[0]?.last_updated ? new Date(tokenSequence[0]?.last_updated).toISOString().substring(0, 10) : new Date().toISOString().substring(0,10);

    const today = new Date(tokenSequence[0]?.todays_date || Date.now()).toISOString().substring(0,10);

    console.log(tokenLastUpdated, today);



    if(tokenLastUpdated != today) {
      tokenNo = 0;
    }

    // step 2: increase the token no. by +1
    tokenNo += 1;

    // step 3: save data to orders table (explicit id for SQLite)
    const orderId = await allocateNextId(conn, "orders", "tenant_id = ?", [tenantId]);
    const tableIdVal =
      tableId != null && tableId !== "" ? parseInt(tableId, 10) || null : null;

    await insertOrderRow(conn, tenantId, {
      orderId,
      deliveryType,
      customerType,
      customerId,
      tableId: tableIdVal,
      tokenNo,
      paymentStatus,
      invoiceId,
      shiftId,
      branchId: orderMeta.branchId,
      deliveryZoneId: orderMeta.deliveryZoneId,
      riderId: orderMeta.riderId,
      deliveryCharge: orderMeta.deliveryCharge,
    });

    // step 4: save data to order_items
    await insertOrderItems(conn, tenantId, orderId, cartItems);

    // step 6: Save updated token no. to table token_sequences
    await upsertTokenSequence(conn, tokenNo, tenantId);

    // step 7: commit transaction / if any exception occurs then rollback
    await conn.commit();
    inTxn = false;

    try {
      await deductInventoryForOrder(conn, tenantId, cartItems, invoiceId, username);
    } catch (invErr) {
      console.error("Inventory deduction skipped (order saved):", invErr?.message || invErr);
    }

    return {
      tokenNo,
      orderId
    }
  } catch (error) {
    console.error("createOrderDB failed:", error?.message || error);
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
};

exports.getPOSQROrdersCountDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();

    try {
      const sql = `
        SELECT COUNT(*) AS total_orders FROM qr_orders
        WHERE tenant_id = ? AND status NOT IN('completed', 'cancelled');
      `;

      const [result] = await conn.query(sql, [tenantId]);
      return result[0].total_orders ?? 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.getPOSQROrdersDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();

    try {
      const sql = `
       SELECT
        o.id,
        o.date,
        o.delivery_type,
        o.customer_type,
        o.customer_id,
        c.name AS customer_name,
        o.table_id,
        st.table_title,
        st.floor,
        o.status,
        o.payment_status
      FROM
        qr_orders o
        LEFT JOIN customers c ON o.customer_id = c.phone AND c.tenant_id = o.tenant_id
        LEFT JOIN store_tables st ON o.table_id = st.id
      WHERE
        o.status NOT IN('completed', 'cancelled')
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
            mi.tax_id,
            t.title as tax_title,
            t.rate as tax_rate,
            t.type as tax_type,
            oi.variant_id,
            miv.title AS variant_title,
            miv.price AS variant_price,
            oi.price,
            oi.quantity,
            oi.status,
            oi.date,
            oi.addons,
            oi.notes
          FROM
            qr_order_items oi
            LEFT JOIN menu_items mi ON oi.item_id = mi.id
            LEFT JOIN taxes t ON t.id = mi.tax_id
            LEFT JOIN menu_item_variants miv ON oi.item_id = miv.item_id
            AND oi.variant_id = miv.id
          WHERE
            oi.order_id IN (${orderIds})
        `
        const [kitchenOrdersItemsResult] = await conn.query(sql2);
        kitchenOrdersItems = kitchenOrdersItemsResult;

        const addonIds = [...new Set([...kitchenOrdersItems.flatMap((o)=>o.addons?JSON.parse(o?.addons):[])])].join(",");
        const [addonsResult] = addonIds ? await conn.query(`SELECT id, item_id, title FROM menu_item_addons WHERE id IN (${addonIds});`):[]
        addons = addonsResult;
      }

      // Get recipe items for all menu items
      const recipeSql = `
        SELECT
          mir.id,
          mir.menu_item_id,
          mir.variant_id,
          mir.addon_id,
          mir.inventory_item_id,
          mi.title AS menu_item_title,
          v.title AS variant_title,
          a.title AS addon_title,
          ii.title AS ingredient_title,
          ii.unit,
          ii.quantity as current_quantity,
          ii.min_quantity_threshold,
          mir.quantity as recipe_quantity
        FROM
          menu_item_recipes mir
        LEFT JOIN menu_items mi ON mir.menu_item_id = mi.id
        LEFT JOIN menu_item_variants v ON mir.variant_id = v.id
        LEFT JOIN menu_item_addons a ON mir.addon_id = a.id
        LEFT JOIN inventory_items ii ON mir.inventory_item_id = ii.id
        WHERE mir.tenant_id = ?
      `;

      const [recipeItemsResult] = await conn.query(recipeSql, [tenantId]);
      recipeItems = recipeItemsResult;

      // Attach recipeItems to each kitchenOrderItem
      kitchenOrdersItems = kitchenOrdersItems.map(oi => {
        const relevantRecipeItems = recipeItems.filter(ri =>
          ri.menu_item_id === oi.item_id &&
          (ri.variant_id == 0 || ri.variant_id === oi.variant_id) &&
          (ri.addon_id === 0 || oi.addons?.includes(ri.addon_id))
        );
        return {
          ...oi,
          recipeItems: relevantRecipeItems
        };
      });

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

exports.updateQROrderStatusDB = async (tenantId, orderId, status) => {
  const conn = await getMySqlPromiseConnection();

  try {
    const sql = `
      UPDATE qr_orders
      SET status = ?
      WHERE tenant_id = ? AND id = ?;
    `;

    const [result] = await conn.query(sql, [status, tenantId, orderId]);
    return
  } catch (error) {
      console.error(error);
      throw error;
  } finally {
      conn.release();
  }
};


exports.cancelAllQROrdersDB = async (tenantId, status) => {
  const conn = await getMySqlPromiseConnection();

  try {
    const sql = `
      UPDATE qr_orders
      SET status = ?
      WHERE tenant_id = ?;
    `;

    const [result] = await conn.query(sql, [status, tenantId]);
    return;
  } catch (error) {
      console.error(error);
      throw error;
  } finally {
      conn.release();
  }
};
