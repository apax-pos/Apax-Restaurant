const {
  getCategoriesDB,
  getPaymentTypesDB,
  getPrintSettingDB,
  getStoreSettingDB,
  getStoreTablesDB,
  getServiceChargeDB,
} = require("../services/settings.service");
const {
  getAllMenuItemsDB,
  getAllAddonsDB,
  getAllVariantsDB,
  getAllRecipeItemsDB,
} = require("../services/menu_item.service");
const { createOrderDB, getPOSQROrdersCountDB, getPOSQROrdersDB, updateQROrderStatusDB, cancelAllQROrdersDB } = require("../services/pos.service");
const { createInvoiceDB } = require("../services/orders.service");
const { getActiveShiftDB } = require("../services/shift.service");
const { resolveCartAndTotals } = require("../services/posTotals.service");
const { getBranchesDB, getDefaultBranchIdDB } = require("../services/branch.service");
const { getCombosDB } = require("../services/combo.service");
const { getRidersDB, getDeliveryZonesDB, getDeliveryZoneChargeDB } = require("../services/rider.service");
const { ensureSchemaReady } = require("../bootstrap/ensureSchemaReady");
const { buildPromotionDisplayMap } = require("../services/promotion.service");
const { recordPromotionRedemptionsDB } = require("../services/promotion.service");

async function loadExtendedPosData(tenantId) {
  try {
    const [branches, combos, riders, deliveryZones] = await Promise.all([
      getBranchesDB(tenantId),
      getCombosDB(tenantId, true),
      getRidersDB(tenantId, true),
      getDeliveryZonesDB(tenantId, true),
    ]);
    return { branches, combos, riders, deliveryZones };
  } catch (err) {
    console.error("POS extended modules load failed:", err.message);
    return { branches: [], combos: [], riders: [], deliveryZones: [] };
  }
}

async function buildOrderMeta(tenantId, body) {
  let deliveryCharge = 0;
  let branchId = body.branchId;
  try {
    if (body.deliveryZoneId) {
      deliveryCharge = await getDeliveryZoneChargeDB(tenantId, body.deliveryZoneId);
    }
    if (!branchId) {
      branchId = await getDefaultBranchIdDB(tenantId);
    }
  } catch (err) {
    console.error("buildOrderMeta:", err.message);
  }
  return {
    branchId: branchId || null,
    deliveryZoneId: body.deliveryZoneId || null,
    riderId: body.riderId || null,
    deliveryCharge,
  };
}

async function requireOpenShift(tenantId) {
  const shift = await getActiveShiftDB(tenantId);
  if (!shift) {
    const err = new Error("NO_OPEN_SHIFT");
    throw err;
  }
  return shift;
}

function resolveCustomerPhone(customerId) {
  if (customerId == null || customerId === "") return null;
  if (typeof customerId === "string") return customerId;
  if (typeof customerId === "object" && customerId.phone) return customerId.phone;
  return null;
}

exports.getPOSInitData = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    await ensureSchemaReady();

    const [categories, paymentTypes, printSettings, storeSettings, storeTables, serviceCharge, activeShift, extended] =
      await Promise.all([
        getCategoriesDB(tenantId),
        getPaymentTypesDB(true, tenantId),
        getPrintSettingDB(tenantId),
        getStoreSettingDB(tenantId),
        getStoreTablesDB(tenantId),
        getServiceChargeDB(tenantId),
        getActiveShiftDB(tenantId),
        loadExtendedPosData(tenantId),
      ]);

    const { branches, combos, riders, deliveryZones } = extended;

    const [menuItems, addons, variants, recipeItems] = await Promise.all([
      getAllMenuItemsDB(tenantId),
      getAllAddonsDB(tenantId),
      getAllVariantsDB(tenantId),
      getAllRecipeItemsDB(tenantId)
    ]);

    const formattedMenuItems = menuItems.map((item) => {
      const itemAddons = addons.filter((addon) => addon.item_id == item.id);
      const itemVariants = variants.filter(
        (variant) => variant.item_id == item.id
      );
      const itemRecipeItems = recipeItems.filter(
        (recipeItem) => recipeItem.menu_item_id == item.id
      );

      return {
        ...item,
        addons: [...itemAddons],
        variants: [...itemVariants],
        recipeItems: [...itemRecipeItems]
      };
    });

    let promotionDisplay = {};
    try {
      promotionDisplay = await buildPromotionDisplayMap(tenantId, formattedMenuItems);
    } catch (err) {
      console.error("POS promotion display load failed:", err.message);
    }

    return res.status(200).json({
      categories,
      paymentTypes,
      printSettings,
      storeSettings,
      storeTables,
      menuItems: formattedMenuItems,
      serviceCharge,
      activeShift,
      branches,
      combos,
      riders,
      deliveryZones,
      promotionDisplay,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: req.__("something_went_wrong_try_later"), // Translate message
    });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const username = req.user.username;
    const {cart, deliveryType, customerType, customerId, tableId, selectedQrOrderItem, deliveryZoneId, branchId, riderId, promoCode} = req.body;

    if(cart?.length == 0) {
      return res.status(400).json({
        success: false,
        message: req.__("cart_is_empty") // Translate message
      });
    }

    const shift = await requireOpenShift(tenantId);
    const orderMeta = await buildOrderMeta(tenantId, { deliveryZoneId, branchId, riderId });
    let safeCart = cart;
    try {
      const resolved = await resolveCartAndTotals(tenantId, cart, "none", 0, orderMeta.deliveryCharge, {
        branchId: orderMeta.branchId,
        customerType,
        promoCode,
      });
      safeCart = resolved.cart;
    } catch (e) {
      if (
        e.message === "INVALID_MENU_ITEM" ||
        e.message === "INVALID_VARIANT" ||
        e.message === "INVALID_ADDON" ||
        e.message === "INVALID_COMBO"
      ) {
        return res.status(400).json({ success: false, message: req.__("invalid_request") });
      }
      throw e;
    }
    const shiftId = shift?.id != null ? Number(shift.id) : null;
    let result;
    try {
      result = await createOrderDB(
        tenantId,
        safeCart,
        deliveryType,
        customerType,
        resolveCustomerPhone(customerId),
        tableId || null,
        "pending",
        null,
        username,
        shiftId,
        orderMeta
      );
    } catch (e) {
      if (String(e.message || "").startsWith("INVALID_MENU_ITEM_ID")) {
        return res.status(400).json({ success: false, message: req.__("invalid_request") });
      }
      throw e;
    }

    if(selectedQrOrderItem) {
      await updateQROrderStatusDB(tenantId, selectedQrOrderItem, "completed");
    }

    return res.status(200).json({
      success: true,
      message: req.__("order_created_token", { token: result.tokenNo }), // Translate message
      tokenNo: result.tokenNo,
      orderId: result.orderId,
    });

  } catch (error) {
    if (error.message === "NO_OPEN_SHIFT") {
      return res.status(400).json({ success: false, message: "Open a shift before taking orders (Shifts page)." });
    }
    console.error("createOrder failed:", error?.message || error);
    const detail =
      (error && typeof error.message === "string" && error.message.trim()) || "";
    return res.status(500).json({
      success: false,
      message: detail || req.__("error_processing_request_try_later"),
    });
  }
};


function canPrepareMenuItem(menuItem, quantity = 1) {
  const selectedVariantId = parseInt(menuItem.variant_id);
  const selectedAddonIds = (menuItem.addons_ids || []).map(String);

  const relevantRecipeItems = (menuItem.recipeItems || []).filter((recipe) => {
    if (recipe.variant_id === 0 && recipe.addon_id === 0) return true;
    if (recipe.variant_id > 0 && recipe.variant_id == selectedVariantId) return true;
    if (recipe.addon_id > 0 && selectedAddonIds.includes(String(recipe.addon_id))) return true;
    return false;
  });

  const insufficientIngredients = [];

  for (const recipe of relevantRecipeItems) {
    const currentQty = parseFloat(recipe.current_quantity);
    const requiredQty = parseFloat(recipe.recipe_quantity) * quantity;
    if (currentQty < requiredQty) {
      insufficientIngredients.push({
        itemTitle: menuItem.title,
        variantTitle: menuItem.variant?.title || '',
        addonTitle: recipe.addon_title || '',
        ingredientTitle: recipe.ingredient_title,
        requiredQty,
        currentQty,
      });
    }
  }

  return insufficientIngredients;
}

exports.createOrderAndInvoice = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const username = req.user.username;
    const {cart, deliveryType, customerType, customerId, tableId, selectedQrOrderItem, selectedPaymentType, discountType, discountValue, deliveryZoneId, branchId, riderId, promoCode} = req.body;

    if(cart?.length == 0) {
      return res.status(400).json({
        success: false,
        message: req.__("cart_is_empty") // Translate message
      });
    }

    const orderMeta = await buildOrderMeta(tenantId, { deliveryZoneId, branchId, riderId });
    let resolved;
    try {
      resolved = await resolveCartAndTotals(tenantId, cart, discountType, discountValue, orderMeta.deliveryCharge, {
        branchId: orderMeta.branchId,
        customerType,
        promoCode,
      });
    } catch (e) {
      if (e.message === "EMPTY_CART" || e.message === "INVALID_MENU_ITEM" || e.message === "INVALID_VARIANT" || e.message === "INVALID_ADDON" || e.message === "INVALID_COMBO") {
        return res.status(400).json({ success: false, message: req.__("invalid_request") });
      }
      throw e;
    }

    const {
      cart: safeCart,
      netTotal,
      taxTotal,
      serviceChargeTotal,
      total,
      discountAmount,
      promotionDiscount,
      appliedPromotions,
    } = resolved;

    let allInsufficientIngredients = [];

    for (const item of safeCart) {
      const result = canPrepareMenuItem(item, item.quantity);
      if (result.length > 0) {
        allInsufficientIngredients = [...allInsufficientIngredients, ...result];
      }
    }

    if (allInsufficientIngredients.length > 0) {
      const messages = allInsufficientIngredients.map(i =>
        `‘${i.itemTitle} ${i.variantTitle ? `(${i.variantTitle})` : ''}${i.addonTitle ? ` + ${i.addonTitle}` : ''}’ is missing '${i.ingredientTitle}' (need ${i.requiredQty}, have ${i.currentQty})`
      );

      return res.status(400).json({
        success: false,
        message: "Unavailable: Not enough stock." + "\n" + messages.join("; "),
      });
    }

    // create invoice
    const now = new Date();
    const date = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const shift = await requireOpenShift(tenantId);

    const primaryPromo = appliedPromotions?.[0];
    const invoiceId = await createInvoiceDB(
      netTotal,
      taxTotal,
      serviceChargeTotal,
      total,
      date,
      selectedPaymentType,
      tenantId,
      discountType,
      discountValue,
      discountAmount,
      {
        promotionDiscount: promotionDiscount || 0,
        promotionId: primaryPromo?.id || null,
        promotionTitle: appliedPromotions?.map((p) => p.name).join(", ") || null,
        appliedPromotions,
      }
    );

    const shiftId = shift?.id != null ? Number(shift.id) : null;
    const result = await createOrderDB(tenantId, safeCart, deliveryType, customerType, resolveCustomerPhone(customerId), tableId || null, 'paid', invoiceId, username, shiftId, orderMeta);
    const orderId = result.orderId;
    const tokenNo = result.tokenNo;

    try {
      await recordPromotionRedemptionsDB(
        tenantId,
        appliedPromotions || [],
        orderId,
        invoiceId
      );
    } catch (e) {
      console.error("recordPromotionRedemptions:", e.message);
    }

    if(selectedQrOrderItem) {
      await updateQROrderStatusDB(tenantId, selectedQrOrderItem, "completed");
    }

    return res.status(200).json({
      success: true,
      message: req.__("order_created_token", { token: tokenNo }), // Translate message
      tokenNo,
      orderId,
      invoiceId,
      promotionDiscount: promotionDiscount || 0,
      appliedPromotions: appliedPromotions || [],
    });

  } catch (error) {
    if (error.message === "NO_OPEN_SHIFT") {
      return res.status(400).json({ success: false, message: "Open a shift before taking orders (Shifts page)." });
    }
    console.error(error);
    const detail =
      (error && typeof error.message === "string" && error.message.trim()) ||
      "";
    return res.status(500).json({
      success: false,
      message: detail || req.__("error_processing_request_try_later"),
    });
  }
};

exports.getPOSQROrdersCount = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const totalQROrders = await getPOSQROrdersCountDB(tenantId);
    return res.status(200).json({
      status: true,
      totalQROrders: totalQROrders
    })
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: req.__("something_went_wrong_try_later"), // Translate message
    });
  }
};

exports.getPOSQROrders = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const { kitchenOrders, kitchenOrdersItems, addons } = await getPOSQROrdersDB(tenantId);

    const formattedOrders = kitchenOrders.map((order)=>{
      const orderItems = kitchenOrdersItems.filter((oi)=>oi.order_id == order.id);

      orderItems.forEach((oi, index)=>{
        const addonsIds = oi?.addons ? JSON.parse(oi?.addons) : null;

        if(addonsIds) {
          const itemAddons = addonsIds.map((addonId)=>{
            const addon = addons.filter((a)=>a.id == addonId);
            return addon[0];
          });
          orderItems[index].addons = [...itemAddons];
        }
      });

      return {
        ...order,
        items: orderItems
      }
    })

    return res.status(200).json(formattedOrders)
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: req.__("something_went_wrong_try_later"), // Translate message
    });
  }
};

exports.updatePOSQROrderStatus = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const orderId = req.params.id;
    const status = req.body.status;

    if(!status) {
      return res.status(400).json({
        success: false,
        message: req.__("please_provide_required_details") // Translate message
      });
    }

    await updateQROrderStatusDB(tenantId, orderId, status);
    return res.status(200).json({
      status: true,
      message: req.__("qr_order_item_status_updated") // Translate message
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: req.__("something_went_wrong_try_later"), // Translate message
    });
  }
};

exports.cancelAllQROrders = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const status = 'cancelled';

    await cancelAllQROrdersDB(tenantId, status);
    return res.status(200).json({
      status: true,
      message: req.__("all_qr_order_items_cleared") // Translate message
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: req.__("something_went_wrong_try_later"), // Translate message
    });
  }
};
