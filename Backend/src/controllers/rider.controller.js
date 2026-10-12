const {
  getRidersDB,
  getRiderByIdDB,
  addRiderDB,
  updateRiderDB,
  deleteRiderDB,
  getDeliveryZonesDB,
  getDeliveryZoneByIdDB,
  addDeliveryZoneDB,
  updateDeliveryZoneDB,
  deleteDeliveryZoneDB,
  assignRiderToOrderDB,
} = require("../services/rider.service");
const { ensureExtendedSchemaIfNeeded } = require("../utils/schemaGuard");

async function ensureRidersReady(res) {
  if (await ensureExtendedSchemaIfNeeded()) return true;
  res.status(503).json({
    success: false,
    message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
  });
  return false;
}

exports.listRiders = async (req, res) => {
  try {
    if (!(await ensureRidersReady(res))) return;
    const activeOnly = req.query.active === "1";
    const riders = await getRidersDB(req.user.tenant_id, activeOnly);
    return res.status(200).json({ success: true, riders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.getRider = async (req, res) => {
  try {
    if (!(await ensureRidersReady(res))) return;
    const rider = await getRiderByIdDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true, rider });
  } catch (error) {
    if (error.message === "RIDER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.createRider = async (req, res) => {
  try {
    if (!(await ensureRidersReady(res))) return;
    const { name, phone, isActive } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    const id = await addRiderDB(req.user.tenant_id, {
      name: name.trim(),
      phone: phone ? String(phone).trim() : null,
      isActive,
    });
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.updateRider = async (req, res) => {
  try {
    if (!(await ensureRidersReady(res))) return;
    const { name, phone, isActive } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    await updateRiderDB(req.user.tenant_id, req.params.id, {
      name: name.trim(),
      phone: phone ? String(phone).trim() : null,
      isActive,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "RIDER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.removeRider = async (req, res) => {
  try {
    if (!(await ensureRidersReady(res))) return;
    await deleteRiderDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "RIDER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }
    if (error.message === "RIDER_HAS_ORDERS") {
      return res.status(400).json({
        success: false,
        message: "This rider has orders and cannot be deleted. Mark the rider inactive instead.",
      });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.listZones = async (req, res) => {
  try {
    if (!(await ensureRidersReady(res))) return;
    const activeOnly = req.query.active === "1";
    const zones = await getDeliveryZonesDB(req.user.tenant_id, activeOnly);
    return res.status(200).json({ success: true, zones });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.getZone = async (req, res) => {
  try {
    if (!(await ensureRidersReady(res))) return;
    const zone = await getDeliveryZoneByIdDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true, zone });
  } catch (error) {
    if (error.message === "ZONE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Delivery zone not found" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.createZone = async (req, res) => {
  try {
    if (!(await ensureRidersReady(res))) return;
    const { name, deliveryCharge, isActive } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    const charge = Number(deliveryCharge) || 0;
    if (charge < 0) {
      return res.status(400).json({ success: false, message: "Delivery charge cannot be negative" });
    }
    const id = await addDeliveryZoneDB(req.user.tenant_id, {
      name: name.trim(),
      deliveryCharge: charge,
      isActive,
    });
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.updateZone = async (req, res) => {
  try {
    if (!(await ensureRidersReady(res))) return;
    const { name, deliveryCharge, isActive } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    const charge = Number(deliveryCharge) || 0;
    if (charge < 0) {
      return res.status(400).json({ success: false, message: "Delivery charge cannot be negative" });
    }
    await updateDeliveryZoneDB(req.user.tenant_id, req.params.id, {
      name: name.trim(),
      deliveryCharge: charge,
      isActive,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "ZONE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Delivery zone not found" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.removeZone = async (req, res) => {
  try {
    if (!(await ensureRidersReady(res))) return;
    await deleteDeliveryZoneDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "ZONE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Delivery zone not found" });
    }
    if (error.message === "ZONE_HAS_ORDERS") {
      return res.status(400).json({
        success: false,
        message: "This zone has orders and cannot be deleted. Mark the zone inactive instead.",
      });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.assignRider = async (req, res) => {
  try {
    if (!(await ensureRidersReady(res))) return;
    const { orderId, riderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    await assignRiderToOrderDB(req.user.tenant_id, orderId, riderId);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (error.message === "RIDER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Rider not found or inactive" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};
