const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");
const { getAllMenuItemsDB } = require("./menu_item.service");

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function parseJson(val, fallback) {
  if (val == null || val === "") return fallback;
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function isActiveNow(promo, ctx) {
  if (Number(promo.is_enabled) === 0) return false;
  const now = ctx.now instanceof Date ? ctx.now : new Date();

  if (promo.start_date) {
    const start = new Date(promo.start_date);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (promo.end_date) {
    const end = new Date(promo.end_date);
    end.setHours(23, 59, 59, 999);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }

  const days = parseJson(promo.days_of_week, null);
  if (days && days.length) {
    if (!days.map(Number).includes(now.getDay())) return false;
  }

  if (promo.start_time && promo.end_time) {
    const [sh, sm] = String(promo.start_time).split(":").map(Number);
    const [eh, em] = String(promo.end_time).split(":").map(Number);
    const mins = now.getHours() * 60 + now.getMinutes();
    const startM = sh * 60 + (sm || 0);
    const endM = eh * 60 + (em || 0);
    if (startM <= endM) {
      if (mins < startM || mins > endM) return false;
    } else if (mins > endM && mins < startM) {
      return false;
    }
  }

  const branches = parseJson(promo.branch_ids, null);
  if (branches && branches.length && ctx.branchId != null && ctx.branchId !== "") {
    if (!branches.map(Number).includes(Number(ctx.branchId))) return false;
  }

  const ctypes = parseJson(promo.customer_types, null);
  if (ctypes && ctypes.length && ctx.customerType) {
    if (!ctypes.includes(ctx.customerType)) return false;
  }

  if (promo.code && String(promo.code).trim()) {
    const code = String(ctx.promoCode || "").trim().toUpperCase();
    if (!code || code !== String(promo.code).trim().toUpperCase()) return false;
  }

  return true;
}

function lineMatchesTarget(line, promo, categoriesByItemId) {
  const targetType = promo.target_type || "all";
  const ids = parseJson(promo.target_ids, []).map(Number);
  const itemId = Number(line.id);
  const catId = line.category_id ?? categoriesByItemId.get(itemId);

  if (targetType === "all") return true;
  if (targetType === "product") return ids.includes(itemId);
  if (targetType === "category") return catId != null && ids.includes(Number(catId));
  return false;
}

function discountForLine(unitPrice, quantity, promo) {
  const p = Number(unitPrice) || 0;
  const q = Math.max(1, Number(quantity) || 1);
  const sub = p * q;
  const type = promo.promotion_type;

  if (type === "percentage") {
    const pct = Math.min(100, Math.max(0, Number(promo.discount_value) || 0));
    return roundMoney((sub * pct) / 100);
  }
  if (type === "fixed") {
    return roundMoney(Math.min(sub, Number(promo.discount_value) || 0));
  }
  if (type === "flat_price") {
    const flatTotal = Number(promo.flat_price) || 0;
    return roundMoney(Math.max(0, sub - flatTotal));
  }
  if (type === "bogo") {
    const freeUnits = Math.floor(q / 2);
    return roundMoney(freeUnits * p);
  }
  return 0;
}

exports.getPromotionsDB = async (tenantId, { activeOnly = false } = {}) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const where = activeOnly ? " AND is_enabled = 1" : "";
    const [rows] = await conn.query(
      `SELECT * FROM promotions WHERE tenant_id = ?${where} ORDER BY stack_priority DESC, name ASC`,
      [tenantId]
    );
    return rows || [];
  } finally {
    conn.release();
  }
};

exports.getStackRuleDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT promotion_stack_rule FROM store_settings WHERE tenant_id = ? LIMIT 1`,
      [tenantId]
    );
    return rows?.[0]?.promotion_stack_rule || "highest";
  } catch {
    return "highest";
  } finally {
    conn.release();
  }
};

exports.setStackRuleDB = async (tenantId, rule) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const safe = ["highest", "combine", "priority"].includes(rule) ? rule : "highest";
    await conn.query(
      `UPDATE store_settings SET promotion_stack_rule = ? WHERE tenant_id = ?`,
      [safe, tenantId]
    );
  } finally {
    conn.release();
  }
};

exports.addPromotionDB = async (tenantId, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const id = await allocateNextId(conn, "promotions");
    await conn.query(
      `INSERT INTO promotions (
        id, tenant_id, name, code, promotion_type, target_type, target_ids,
        discount_value, flat_price, stack_priority, branch_ids, customer_types,
        days_of_week, start_date, end_date, start_time, end_time, badge_label,
        is_enabled, show_on_card
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        tenantId,
        data.name,
        data.code || null,
        data.promotionType || "percentage",
        data.targetType || "all",
        JSON.stringify(data.targetIds || []),
        Number(data.discountValue) || 0,
        data.flatPrice != null ? Number(data.flatPrice) : null,
        Number(data.stackPriority) || 0,
        data.branchIds?.length ? JSON.stringify(data.branchIds) : null,
        data.customerTypes?.length ? JSON.stringify(data.customerTypes) : null,
        data.daysOfWeek?.length ? JSON.stringify(data.daysOfWeek) : null,
        data.startDate || null,
        data.endDate || null,
        data.startTime || null,
        data.endTime || null,
        data.badgeLabel || null,
        data.isEnabled !== false ? 1 : 0,
        data.showOnCard !== false ? 1 : 0,
      ]
    );
    return id;
  } finally {
    conn.release();
  }
};

exports.updatePromotionDB = async (tenantId, id, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(
      `UPDATE promotions SET
        name = ?, code = ?, promotion_type = ?, target_type = ?, target_ids = ?,
        discount_value = ?, flat_price = ?, stack_priority = ?, branch_ids = ?,
        customer_types = ?, days_of_week = ?, start_date = ?, end_date = ?,
        start_time = ?, end_time = ?, badge_label = ?, is_enabled = ?, show_on_card = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        data.name,
        data.code || null,
        data.promotionType,
        data.targetType,
        JSON.stringify(data.targetIds || []),
        Number(data.discountValue) || 0,
        data.flatPrice != null ? Number(data.flatPrice) : null,
        Number(data.stackPriority) || 0,
        data.branchIds?.length ? JSON.stringify(data.branchIds) : null,
        data.customerTypes?.length ? JSON.stringify(data.customerTypes) : null,
        data.daysOfWeek?.length ? JSON.stringify(data.daysOfWeek) : null,
        data.startDate || null,
        data.endDate || null,
        data.startTime || null,
        data.endTime || null,
        data.badgeLabel || null,
        data.isEnabled !== false ? 1 : 0,
        data.showOnCard !== false ? 1 : 0,
        id,
        tenantId,
      ]
    );
  } finally {
    conn.release();
  }
};

exports.togglePromotionDB = async (tenantId, id, enabled) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(
      `UPDATE promotions SET is_enabled = ? WHERE id = ? AND tenant_id = ?`,
      [enabled ? 1 : 0, id, tenantId]
    );
  } finally {
    conn.release();
  }
};

exports.deletePromotionDB = async (tenantId, id) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(`DELETE FROM promotions WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  } finally {
    conn.release();
  }
};

exports.applyPromotionsToCart = async (tenantId, cart, ctx = {}) => {
  if (!cart?.length) {
    return { cart: [], promotionDiscount: 0, appliedPromotions: [] };
  }

  const [promotions, stackRule, menuItems] = await Promise.all([
    exports.getPromotionsDB(tenantId, { activeOnly: true }),
    exports.getStackRuleDB(tenantId),
    getAllMenuItemsDB(tenantId),
  ]);

  const categoriesByItemId = new Map(
    (menuItems || []).map((m) => [Number(m.id), m.category_id])
  );

  const evalCtx = {
    now: ctx.now || new Date(),
    branchId: ctx.branchId,
    customerType: ctx.customerType,
    promoCode: ctx.promoCode,
  };

  const active = promotions.filter((p) => isActiveNow(p, evalCtx));
  const lineDiscounts = cart.map(() => ({ amount: 0, promos: [] }));

  if (stackRule === "combine") {
    for (const promo of active) {
      cart.forEach((line, i) => {
        if (line.combo_id) return;
        if (!lineMatchesTarget(line, promo, categoriesByItemId)) return;
        const d = discountForLine(line.price, line.quantity, promo);
        if (d > 0) {
          lineDiscounts[i].amount += d;
          lineDiscounts[i].promos.push({ id: promo.id, name: promo.name, amount: d });
        }
      });
    }
  } else if (stackRule === "priority") {
    const sorted = [...active].sort(
      (a, b) => Number(b.stack_priority) - Number(a.stack_priority)
    );
    const used = new Set();
    for (const promo of sorted) {
      cart.forEach((line, i) => {
        if (used.has(i) || line.combo_id) return;
        if (!lineMatchesTarget(line, promo, categoriesByItemId)) return;
        const d = discountForLine(line.price, line.quantity, promo);
        if (d > 0) {
          lineDiscounts[i].amount = d;
          lineDiscounts[i].promos = [{ id: promo.id, name: promo.name, amount: d }];
          used.add(i);
        }
      });
    }
  } else {
    cart.forEach((line, i) => {
      if (line.combo_id) return;
      let best = 0;
      let bestPromo = null;
      for (const promo of active) {
        if (!lineMatchesTarget(line, promo, categoriesByItemId)) continue;
        const d = discountForLine(line.price, line.quantity, promo);
        if (d > best) {
          best = d;
          bestPromo = promo;
        }
      }
      if (best > 0 && bestPromo) {
        lineDiscounts[i].amount = best;
        lineDiscounts[i].promos = [{ id: bestPromo.id, name: bestPromo.name, amount: best }];
      }
    });
  }

  const appliedMap = new Map();
  let totalPromo = 0;
  const newCart = cart.map((line, i) => {
    const sub = (Number(line.price) || 0) * (Number(line.quantity) || 1);
    const d = roundMoney(Math.min(lineDiscounts[i].amount, sub));
    totalPromo += d;
    const qty = Number(line.quantity) || 1;
    const newPrice = qty > 0 ? roundMoney((sub - d) / qty) : line.price;

    for (const p of lineDiscounts[i].promos) {
      const prev = appliedMap.get(p.id) || { id: p.id, name: p.name, amount: 0 };
      prev.amount = roundMoney(prev.amount + p.amount);
      appliedMap.set(p.id, prev);
    }

    return {
      ...line,
      original_price: line.original_price ?? line.price,
      price: newPrice,
      promotion_discount: d,
      promotion_titles: lineDiscounts[i].promos.map((p) => p.name).join(", "),
    };
  });

  return {
    cart: newCart,
    promotionDiscount: roundMoney(totalPromo),
    appliedPromotions: [...appliedMap.values()],
  };
};

exports.buildPromotionDisplayMap = async (tenantId, menuItems, ctx = {}) => {
  const promotions = await exports.getPromotionsDB(tenantId, { activeOnly: true });
  const evalCtx = { ...ctx, now: ctx.now || new Date(), promoCode: null };
  const map = {};

  for (const item of menuItems || []) {
    if (Number(item.is_enabled) === 0) continue;
    const line = {
      id: item.id,
      price: item.price,
      quantity: 1,
      category_id: item.category_id,
    };
    let best = null;
    for (const promo of promotions) {
      if (!isActiveNow(promo, evalCtx)) continue;
      if (Number(promo.show_on_card) === 0) continue;
      const catMap = new Map([[Number(item.id), item.category_id]]);
      if (!lineMatchesTarget(line, promo, catMap)) continue;
      const d = discountForLine(item.price, 1, promo);
      if (!best || d > best.discount) {
        const orig = Number(item.price) || 0;
        best = {
          promotionId: promo.id,
          badge:
            promo.badge_label ||
            (promo.promotion_type === "percentage"
              ? `${promo.discount_value}% OFF`
              : "OFFER"),
          originalPrice: orig,
          discountedPrice: roundMoney(Math.max(0, orig - d)),
          endsAt: promo.end_date,
          label: promo.name,
        };
      }
    }
    if (best) map[item.id] = best;
  }
  return map;
};

exports.recordPromotionRedemptionsDB = async (
  tenantId,
  appliedPromotions,
  orderId,
  invoiceId,
  existingConn
) => {
  if (!appliedPromotions?.length) return;
  const conn = existingConn || (await getMySqlPromiseConnection());
  const shouldRelease = !existingConn;
  try {
    for (const p of appliedPromotions) {
      const id = await allocateNextId(conn, "promotion_redemptions");
      await conn.query(
        `INSERT INTO promotion_redemptions (id, tenant_id, promotion_id, order_id, invoice_id, discount_amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, tenantId, p.id, orderId || null, invoiceId || null, Number(p.amount) || 0]
      );
    }
  } finally {
    if (shouldRelease) conn.release();
  }
};

exports.getPromotionReportDB = async (tenantId, from, to) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT
        p.id,
        p.name,
        COUNT(pr.id) AS uses,
        COALESCE(SUM(pr.discount_amount), 0) AS total_discount
       FROM promotions p
       LEFT JOIN promotion_redemptions pr ON pr.promotion_id = p.id AND pr.tenant_id = p.tenant_id
         AND date(pr.created_at) >= date(?) AND date(pr.created_at) <= date(?)
       WHERE p.tenant_id = ?
       GROUP BY p.id, p.name
       ORDER BY total_discount DESC`,
      [from, to, tenantId]
    );
    const [totals] = await conn.query(
      `SELECT COALESCE(SUM(discount_amount), 0) AS total_promotion_discount,
              COUNT(*) AS redemption_count
       FROM promotion_redemptions
       WHERE tenant_id = ?
         AND date(created_at) >= date(?) AND date(created_at) <= date(?)`,
      [tenantId, from, to]
    );
    return {
      byPromotion: rows || [],
      totalPromotionDiscount: Number(totals?.[0]?.total_promotion_discount) || 0,
      redemptionCount: Number(totals?.[0]?.redemption_count) || 0,
    };
  } finally {
    conn.release();
  }
};

module.exports.isActiveNow = isActiveNow;
