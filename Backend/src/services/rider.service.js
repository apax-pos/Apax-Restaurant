const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");

exports.getRidersDB = async (tenantId, activeOnly = false) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const where = activeOnly ? " AND is_active = 1" : "";
    const [rows] = await conn.query(
      `SELECT * FROM riders WHERE tenant_id = ?${where} ORDER BY name ASC`,
      [tenantId]
    );
    return rows || [];
  } finally {
    conn.release();
  }
};

exports.getRiderByIdDB = async (tenantId, id) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM riders WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId]
    );
    const rider = rows?.[0];
    if (!rider) throw new Error("RIDER_NOT_FOUND");
    return rider;
  } finally {
    conn.release();
  }
};

exports.addRiderDB = async (tenantId, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const id = await allocateNextId(conn, "riders");
    await conn.query(
      `INSERT INTO riders (id, tenant_id, name, phone, is_active) VALUES (?, ?, ?, ?, ?)`,
      [id, tenantId, data.name, data.phone || null, data.isActive === false ? 0 : 1]
    );
    return id;
  } finally {
    conn.release();
  }
};

exports.updateRiderDB = async (tenantId, id, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id FROM riders WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId]
    );
    if (!rows?.[0]) throw new Error("RIDER_NOT_FOUND");

    await conn.query(
      `UPDATE riders SET name = ?, phone = ?, is_active = ? WHERE id = ? AND tenant_id = ?`,
      [data.name, data.phone || null, data.isActive !== false ? 1 : 0, id, tenantId]
    );
  } finally {
    conn.release();
  }
};

exports.deleteRiderDB = async (tenantId, id) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id FROM riders WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId]
    );
    if (!rows?.[0]) throw new Error("RIDER_NOT_FOUND");

    const [orderRows] = await conn.query(
      `SELECT COUNT(*) AS count FROM orders WHERE tenant_id = ? AND rider_id = ?`,
      [tenantId, id]
    );
    if (Number(orderRows?.[0]?.count || 0) > 0) {
      throw new Error("RIDER_HAS_ORDERS");
    }

    await conn.query(`DELETE FROM riders WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  } finally {
    conn.release();
  }
};

exports.getDeliveryZonesDB = async (tenantId, activeOnly = false) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const where = activeOnly ? " AND is_active = 1" : "";
    const [rows] = await conn.query(
      `SELECT * FROM delivery_zones WHERE tenant_id = ?${where} ORDER BY name ASC`,
      [tenantId]
    );
    return rows || [];
  } finally {
    conn.release();
  }
};

exports.getDeliveryZoneByIdDB = async (tenantId, id) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM delivery_zones WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId]
    );
    const zone = rows?.[0];
    if (!zone) throw new Error("ZONE_NOT_FOUND");
    return zone;
  } finally {
    conn.release();
  }
};

exports.addDeliveryZoneDB = async (tenantId, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const id = await allocateNextId(conn, "delivery_zones");
    await conn.query(
      `INSERT INTO delivery_zones (id, tenant_id, name, delivery_charge, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [id, tenantId, data.name, Number(data.deliveryCharge) || 0, data.isActive === false ? 0 : 1]
    );
    return id;
  } finally {
    conn.release();
  }
};

exports.updateDeliveryZoneDB = async (tenantId, id, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id FROM delivery_zones WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId]
    );
    if (!rows?.[0]) throw new Error("ZONE_NOT_FOUND");

    await conn.query(
      `UPDATE delivery_zones SET name = ?, delivery_charge = ?, is_active = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        data.name,
        Number(data.deliveryCharge) || 0,
        data.isActive !== false ? 1 : 0,
        id,
        tenantId,
      ]
    );
  } finally {
    conn.release();
  }
};

exports.deleteDeliveryZoneDB = async (tenantId, id) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id FROM delivery_zones WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId]
    );
    if (!rows?.[0]) throw new Error("ZONE_NOT_FOUND");

    const [orderRows] = await conn.query(
      `SELECT COUNT(*) AS count FROM orders WHERE tenant_id = ? AND delivery_zone_id = ?`,
      [tenantId, id]
    );
    if (Number(orderRows?.[0]?.count || 0) > 0) {
      throw new Error("ZONE_HAS_ORDERS");
    }

    await conn.query(`DELETE FROM delivery_zones WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  } finally {
    conn.release();
  }
};

exports.getDeliveryZoneChargeDB = async (tenantId, zoneId) => {
  if (!zoneId) return 0;
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT delivery_charge FROM delivery_zones WHERE id = ? AND tenant_id = ? AND is_active = 1`,
      [zoneId, tenantId]
    );
    return Number(rows?.[0]?.delivery_charge) || 0;
  } finally {
    conn.release();
  }
};

exports.assignRiderToOrderDB = async (tenantId, orderId, riderId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [orders] = await conn.query(
      `SELECT id FROM orders WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [orderId, tenantId]
    );
    if (!orders?.[0]) throw new Error("ORDER_NOT_FOUND");

    if (riderId) {
      const [riders] = await conn.query(
        `SELECT id FROM riders WHERE id = ? AND tenant_id = ? AND is_active = 1 LIMIT 1`,
        [riderId, tenantId]
      );
      if (!riders?.[0]) throw new Error("RIDER_NOT_FOUND");
    }

    await conn.query(
      `UPDATE orders SET rider_id = ? WHERE id = ? AND tenant_id = ?`,
      [riderId || null, orderId, tenantId]
    );
  } finally {
    conn.release();
  }
};
