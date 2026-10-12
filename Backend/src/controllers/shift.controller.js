const {
  getActiveShiftDB,
  getShiftByIdDB,
  openShiftDB,
  closeShiftDB,
  getShiftsDB,
  updateShiftDB,
  deleteShiftDB,
} = require("../services/shift.service");
const { ensureSchemaReady } = require("../bootstrap/ensureSchemaReady");

async function ensureShiftSchema() {
  await ensureSchemaReady();
}

exports.getActiveShift = async (req, res) => {
  try {
    await ensureShiftSchema();
    const shift = await getActiveShiftDB(req.user.tenant_id);
    return res.status(200).json({ shift });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.getShifts = async (req, res) => {
  try {
    await ensureShiftSchema();
    const shifts = await getShiftsDB(req.user.tenant_id);
    return res.status(200).json({ shifts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.getShift = async (req, res) => {
  try {
    await ensureShiftSchema();
    const shift = await getShiftByIdDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true, shift });
  } catch (error) {
    if (error.message === "SHIFT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Shift not found" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.openShift = async (req, res) => {
  try {
    await ensureShiftSchema();
    const { inchargeName, openingCash, branchId, notes } = req.body;
    if (!inchargeName?.trim()) {
      return res.status(400).json({ success: false, message: "Shift in-charge name is required" });
    }
    const id = await openShiftDB(
      req.user.tenant_id,
      {
        inchargeName: inchargeName.trim(),
        openingCash,
        branchId,
        notes,
      },
      req.user.username
    );
    return res.status(200).json({ success: true, shiftId: id, message: "Shift opened" });
  } catch (error) {
    if (error.message === "SHIFT_ALREADY_OPEN") {
      return res.status(400).json({ success: false, message: "A shift is already open. Close it first." });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.closeShift = async (req, res) => {
  try {
    await ensureShiftSchema();
    const { shiftId, closingCash, notes } = req.body;
    if (!shiftId) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    const summary = await closeShiftDB(
      req.user.tenant_id,
      shiftId,
      closingCash,
      notes,
      req.user.username
    );
    return res.status(200).json({ success: true, message: "Shift closed", ...summary });
  } catch (error) {
    if (error.message === "SHIFT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Shift not found or already closed" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.updateShift = async (req, res) => {
  try {
    await ensureShiftSchema();
    const { inchargeName, openingCash, closingCash, branchId, notes } = req.body;
    if (inchargeName != null && !String(inchargeName).trim()) {
      return res.status(400).json({ success: false, message: "Shift in-charge name is required" });
    }
    const summary = await updateShiftDB(req.user.tenant_id, req.params.id, {
      inchargeName: inchargeName?.trim(),
      openingCash,
      closingCash,
      branchId,
      notes,
    });
    return res.status(200).json({ success: true, message: "Shift updated", ...summary });
  } catch (error) {
    if (error.message === "SHIFT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Shift not found" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.deleteShift = async (req, res) => {
  try {
    await ensureShiftSchema();
    await deleteShiftDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true, message: "Shift deleted" });
  } catch (error) {
    if (error.message === "SHIFT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Shift not found" });
    }
    if (error.message === "SHIFT_HAS_ORDERS") {
      return res.status(400).json({
        success: false,
        message: "This shift has orders and cannot be deleted.",
      });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};
