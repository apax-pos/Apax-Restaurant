const { getMySqlPromiseConnection } = require("../config/mysql.db")
const { ensurePosSchema } = require("../utils/sqliteSchema.util");

function parseAddonIds(addons) {
  if (!addons) return [];
  try {
    const parsed = JSON.parse(addons);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

exports.getKitchenOrdersDB = async (tenantId) => {
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