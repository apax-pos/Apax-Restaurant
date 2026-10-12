const {
  getStaffDB,
  addStaffDB,
  updateStaffDB,
  deleteStaffDB,
  checkInDB,
  checkOutDB,
  getAttendanceDB,
  getSalaryRecordsDB,
  generateMonthlySalaryDB,
  markSalaryPaidDB,
} = require("../services/staff.service");
const { ensureExtendedSchemaIfNeeded } = require("../utils/schemaGuard");

exports.list = async (req, res) => {
  try {
    if (!(await ensureExtendedSchemaIfNeeded())) {
      return res.status(503).json({
        success: false,
        message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
      });
    }
    const staff = await getStaffDB(req.user.tenant_id);
    return res.status(200).json({ success: true, staff });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, phone, designation, baseSalary } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    const id = await addStaffDB(req.user.tenant_id, { name, phone, designation, baseSalary });
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.update = async (req, res) => {
  try {
    await updateStaffDB(req.user.tenant_id, req.params.id, req.body);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.remove = async (req, res) => {
  try {
    await deleteStaffDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const { staffId, branchId, notes } = req.body;
    await checkInDB(req.user.tenant_id, staffId, branchId, notes);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "ALREADY_CHECKED_IN") {
      return res.status(400).json({ success: false, message: "Already checked in" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.checkOut = async (req, res) => {
  try {
    await checkOutDB(req.user.tenant_id, req.body.staffId);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "NOT_CHECKED_IN") {
      return res.status(400).json({ success: false, message: "Not checked in" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.attendance = async (req, res) => {
  try {
    if (!(await ensureExtendedSchemaIfNeeded())) {
      return res.status(503).json({
        success: false,
        message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
      });
    }
    const rows = await getAttendanceDB(
      req.user.tenant_id,
      req.query.from,
      req.query.to
    );
    return res.status(200).json({ success: true, attendance: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.salaryList = async (req, res) => {
  try {
    if (!(await ensureExtendedSchemaIfNeeded())) {
      return res.status(503).json({
        success: false,
        message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
      });
    }
    const monthYear = req.query.month || new Date().toISOString().slice(0, 7);
    const records = await getSalaryRecordsDB(req.user.tenant_id, monthYear);
    return res.status(200).json({ success: true, records, monthYear });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.generateSalary = async (req, res) => {
  try {
    const monthYear = req.body.monthYear || new Date().toISOString().slice(0, 7);
    await generateMonthlySalaryDB(req.user.tenant_id, monthYear);
    const records = await getSalaryRecordsDB(req.user.tenant_id, monthYear);
    return res.status(200).json({ success: true, records, monthYear });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.markPaid = async (req, res) => {
  try {
    await markSalaryPaidDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};
