const {
  getActiveShiftDB,
  openShiftDB,
  closeShiftDB,
  getShiftsDB,
} = require("../services/shift.service");

exports.getActiveShift = async (req, res) => {
  try {
    const shift = await getActiveShiftDB(req.user.tenant_id);
    return res.status(200).json({ shift });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.getShifts = async (req, res) => {
  try {
    const shifts = await getShiftsDB(req.user.tenant_id);
    return res.status(200).json({ shifts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.openShift = async (req, res) => {
  try {
    const { inchargeName, openingCash } = req.body;
    if (!inchargeName?.trim()) {
      return res.status(400).json({ success: false, message: "Shift in-charge name is required" });
    }
    const id = await openShiftDB(
      req.user.tenant_id,
      inchargeName.trim(),
      openingCash,
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
