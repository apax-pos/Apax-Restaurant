const { getMySqlPromiseConnection } = require("../config/mysql.db");
const {
  getAllMenuItemsDB,
  getAllAddonsDB,
  getAllVariantsDB,
  getAllRecipeItemsDB,
} = require("./menu_item.service");
const { getServiceChargeDB } = require("./settings.service");
const { toSafeIdList } = require("../utils/validateIds");
const { getCombosDB } = require("./combo.service");
const { applyPromotionsToCart } = require("./promotion.service");

const MAX_QTY = 999;
const MAX_UNIT_PRICE = 1_000_000;

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function computeDiscountAmount(payableBeforeDiscount, discountType, discountValue) {
  const base = Math.max(0, Number(payableBeforeDiscount) || 0);
  const v = Number(discountValue) || 0;
  let amount = 0;
  if (discountType === "percent") {
    amount = (base * v) / 100;
  } else if (discountType === "fixed") {
    amount = v;
  }
  return roundMoney(Math.min(Math.max(amount, 0), base));
}

function computeTotalsFromLines(lines, serviceChargePercent) {
  let itemsTotal = 0;
  let taxTotal = 0;
  let serviceChargeTotal = 0;
  let payableTotal = 0;

  for (const line of lines) {
    const taxRate = Number(line.tax_rate) || 0;
    const taxType = line.tax_type;
    const itemPrice = Number(line.unit_price) * Number(line.quantity);

    if (taxType === "exclusive") {
      const tax = (itemPrice * taxRate) / 100;
      taxTotal += tax;
      itemsTotal += itemPrice;
      payableTotal += itemPrice + tax;
    } else if (taxType === "inclusive") {
      const tax = itemPrice - itemPrice * (100 / (100 + taxRate));
      taxTotal += tax;
      itemsTotal += itemPrice - tax;
      payableTotal += itemPrice;
    } else {
      itemsTotal += itemPrice;
      payableTotal += itemPrice;
    }
  }

  const scPct = Number(serviceChargePercent) || 0;
  if (scPct > 0) {
    serviceChargeTotal = (itemsTotal * scPct) / 100;
    payableTotal += serviceChargeTotal;
  }

  return {
    netTotal: roundMoney(itemsTotal),
    taxTotal: roundMoney(taxTotal),
    serviceChargeTotal: roundMoney(serviceChargeTotal),
    payableBeforeDiscount: roundMoney(payableTotal),
  };
}

/**
 * Resolve cart against tenant menu; recalculate line prices/taxes server-side.
 * Client unit price is kept when valid (staff override), bounded to [0, MAX_UNIT_PRICE].
 */
async function resolveCartAndTotals(
  tenantId,
  cartItems,
  discountType = "none",
  discountValue = 0,
  deliveryCharge = 0,
  promoContext = {}
) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    const err = new Error("EMPTY_CART");
    throw err;
  }

  let combos = [];
  try {
    combos = await getCombosDB(tenantId, true);
  } catch (err) {
    console.error("resolveCartAndTotals getCombosDB:", err.message);
  }

  const [menuItems, variants, addons, serviceChargePercent, allRecipeItems] =
    await Promise.all([
      getAllMenuItemsDB(tenantId),
      getAllVariantsDB(tenantId),
      getAllAddonsDB(tenantId),
      getServiceChargeDB(tenantId),
      getAllRecipeItemsDB(tenantId),
    ]);

  const menuById = new Map(menuItems.map((m) => [Number(m.id), m]));
  const variantsById = new Map(variants.map((v) => [Number(v.id), v]));
  const addonsById = new Map(addons.map((a) => [Number(a.id), a]));
  const comboById = new Map((combos || []).map((c) => [Number(c.id), c]));

  const sanitizedCart = [];
  const lines = [];

  for (const raw of cartItems) {
    const comboId = parseInt(raw.combo_id, 10);
    if (comboId > 0) {
      const combo = comboById.get(comboId);
      if (!combo || Number(combo.is_enabled) === 0) {
        throw new Error("INVALID_COMBO");
      }
      let quantity = parseInt(raw.quantity, 10);
      if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;
      if (quantity > MAX_QTY) quantity = MAX_QTY;
      const unitPrice = Number(combo.price) || 0;
      const recipeItems = [];
      for (const ci of combo.items || []) {
        const mid = Number(ci.menu_item_id);
        recipeItems.push(
          ...(allRecipeItems || []).filter((r) => Number(r.menu_item_id) === mid)
        );
      }
      const firstItemId = combo.items?.[0]?.menu_item_id || comboId;
      sanitizedCart.push({
        ...raw,
        combo_id: comboId,
        id: firstItemId,
        title: combo.title,
        price: unitPrice,
        quantity,
        variant_id: null,
        addons_ids: [],
        tax_id: null,
        tax_rate: 0,
        tax_type: null,
        recipeItems,
      });
      lines.push({ unit_price: unitPrice, quantity, tax_rate: 0, tax_type: null });
      continue;
    }

    const itemId = parseInt(raw.id, 10);
    const menu = menuById.get(itemId);
    if (!menu || Number(menu.is_enabled) === 0) {
      const err = new Error("INVALID_MENU_ITEM");
      err.itemId = itemId;
      throw err;
    }

    const itemRecipeItems = (allRecipeItems || []).filter(
      (r) => Number(r.menu_item_id) === itemId
    );

    const variantId = parseInt(raw.variant_id, 10) || 0;
    let unitPrice = Number(menu.price) || 0;
    if (variantId > 0) {
      const variant = variantsById.get(variantId);
      if (!variant || Number(variant.item_id) !== itemId) {
        throw new Error("INVALID_VARIANT");
      }
      const vp = Number(variant.price);
      unitPrice = Number.isFinite(vp) ? vp : unitPrice;
    }

    const addonIds = Array.isArray(raw.addons_ids)
      ? raw.addons_ids.map((id) => parseInt(id, 10)).filter((id) => id > 0)
      : [];
    for (const addonId of addonIds) {
      const addon = addonsById.get(addonId);
      if (!addon || Number(addon.item_id) !== itemId) {
        throw new Error("INVALID_ADDON");
      }
      unitPrice += Number(addon.price) || 0;
    }

    const clientPrice = Number(raw.price);
    if (Number.isFinite(clientPrice) && clientPrice >= 0 && clientPrice <= MAX_UNIT_PRICE) {
      unitPrice = clientPrice;
    }

    let quantity = parseInt(raw.quantity, 10);
    if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;
    if (quantity > MAX_QTY) quantity = MAX_QTY;

    sanitizedCart.push({
      ...raw,
      id: itemId,
      title: menu.title,
      variant_id: variantId || null,
      addons_ids: addonIds.length ? addonIds : raw.addons_ids,
      price: unitPrice,
      quantity,
      tax_id: menu.tax_id,
      tax_title: menu.tax_title,
      tax_rate: menu.tax_rate,
      tax_type: menu.tax_type,
      recipeItems: itemRecipeItems,
    });

    lines.push({
      unit_price: unitPrice,
      quantity,
      tax_rate: menu.tax_rate,
      tax_type: menu.tax_type,
    });
  }

  let promoResult = { cart: sanitizedCart, promotionDiscount: 0, appliedPromotions: [] };
  try {
    promoResult = await applyPromotionsToCart(tenantId, sanitizedCart, promoContext);
  } catch (err) {
    console.error("applyPromotionsToCart:", err.message);
  }

  const promotedCart = promoResult.cart;
  const promotedLines = promotedCart.map((item) => ({
    unit_price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
    tax_rate: item.tax_rate,
    tax_type: item.tax_type,
  }));

  const base = computeTotalsFromLines(promotedLines, serviceChargePercent);
  const discountAmount = computeDiscountAmount(
    base.payableBeforeDiscount,
    discountType,
    discountValue
  );
  const delivery = roundMoney(Math.max(0, Number(deliveryCharge) || 0));
  const total = roundMoney(
    Math.max(0, base.payableBeforeDiscount - discountAmount + delivery)
  );

  return {
    cart: promotedCart,
    netTotal: base.netTotal,
    taxTotal: base.taxTotal,
    serviceChargeTotal: base.serviceChargeTotal,
    deliveryCharge: delivery,
    total,
    discountType: discountType || "none",
    discountValue: Number(discountValue) || 0,
    discountAmount,
    promotionDiscount: promoResult.promotionDiscount,
    appliedPromotions: promoResult.appliedPromotions,
  };
}

/** Recompute invoice totals from existing unpaid order IDs (orders/pay flow). */
async function computeTotalsFromOrderIds(tenantId, orderIds, discountType = "none", discountValue = 0) {
  const safeIds = toSafeIdList(orderIds);
  if (!safeIds) throw new Error("INVALID_ORDER_IDS");

  const conn = await getMySqlPromiseConnection();
  try {
    const placeholders = safeIds.map(() => "?").join(",");
    const [rows] = await conn.query(
      `
      SELECT
        oi.quantity,
        oi.price AS unit_price,
        t.rate AS tax_rate,
        t.type AS tax_type
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
      LEFT JOIN menu_items mi ON oi.item_id = mi.id
      LEFT JOIN taxes t ON mi.tax_id = t.id
      WHERE oi.order_id IN (${placeholders})
        AND oi.tenant_id = ?
        AND oi.status NOT IN ('cancelled')
        AND o.status NOT IN ('completed', 'cancelled')
      `,
      [...safeIds, tenantId]
    );

    if (!rows.length) throw new Error("NO_ORDER_ITEMS");

    const serviceChargePercent = await getServiceChargeDB(tenantId);
    const base = computeTotalsFromLines(rows, serviceChargePercent);
    const discountAmount = computeDiscountAmount(
      base.payableBeforeDiscount,
      discountType,
      discountValue
    );
    const total = roundMoney(Math.max(0, base.payableBeforeDiscount - discountAmount));

    return {
      netTotal: base.netTotal,
      taxTotal: base.taxTotal,
      serviceChargeTotal: base.serviceChargeTotal,
      total,
      discountType: discountType || "none",
      discountValue: Number(discountValue) || 0,
      discountAmount,
    };
  } finally {
    conn.release();
  }
}

module.exports = {
  resolveCartAndTotals,
  computeTotalsFromOrderIds,
  computeDiscountAmount,
};
