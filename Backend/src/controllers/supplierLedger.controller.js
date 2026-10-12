const {
  getSuppliersWithBalanceDB,
  getSupplierLedgerDB,
  recordManualEntryDB,
  recordPaymentDB,
  updateLedgerEntryDB,
  deleteLedgerEntryDB,
} = require("../services/supplierLedger.service");
const { ensureExtendedSchemaIfNeeded } = require("../utils/schemaGuard");
const { ensureSchemaReady } = require("../bootstrap/ensureSchemaReady");

async function ensureSupplierLedgerReady() {
  await ensureSchemaReady();
  return ensureExtendedSchemaIfNeeded();
}

exports.listSuppliers = async (req, res) => {
  try {
    if (!(await ensureSupplierLedgerReady())) {
      return res.status(503).json({
        success: false,
        message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
      });
    }
    const suppliers = await getSuppliersWithBalanceDB(req.user.tenant_id);
    return res.status(200).json({ success: true, suppliers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.getLedger = async (req, res) => {
  try {
    if (!(await ensureSupplierLedgerReady())) {
      return res.status(503).json({
        success: false,
        message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
      });
    }
    const data = await getSupplierLedgerDB(req.user.tenant_id, req.params.supplierId);
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.recordPayment = async (req, res) => {
  try {
    if (!(await ensureSupplierLedgerReady())) {
      return res.status(503).json({
        success: false,
        message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
      });
    }
    const { supplierId, amount, notes } = req.body;
    if (!supplierId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    const result = await recordPaymentDB(
      req.user.tenant_id,
      supplierId,
      amount,
      notes,
      req.user.username
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.recordEntry = async (req, res) => {
  try {
    if (!(await ensureSupplierLedgerReady())) {
      return res.status(503).json({
        success: false,
        message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
      });
    }
    const { supplierId, entryType, amount, notes } = req.body;
    if (
      !supplierId ||
      !["payment", "credit", "debit"].includes(entryType) ||
      !amount ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    const result = await recordManualEntryDB(
      req.user.tenant_id,
      supplierId,
      entryType,
      amount,
      notes,
      req.user.username
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.updateEntry = async (req, res) => {
  try {
    if (!(await ensureSupplierLedgerReady())) {
      return res.status(503).json({
        success: false,
        message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
      });
    }
    const result = await updateLedgerEntryDB(req.user.tenant_id, req.params.id, req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.message === "PURCHASE_LEDGER_ENTRY_LOCKED") {
      return res.status(400).json({
        success: false,
        message: "Purchase ledger entries must be changed from Purchasing.",
      });
    }
    if (error.message === "LEDGER_ENTRY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Ledger entry not found" });
    }
    if (error.message === "INVALID_LEDGER_ENTRY_TYPE" || error.message === "INVALID_AMOUNT") {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    if (!(await ensureSupplierLedgerReady())) {
      return res.status(503).json({
        success: false,
        message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
      });
    }
    const result = await deleteLedgerEntryDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.message === "PURCHASE_LEDGER_ENTRY_LOCKED") {
      return res.status(400).json({
        success: false,
        message: "Purchase ledger entries must be deleted from Purchasing.",
      });
    }
    if (error.message === "LEDGER_ENTRY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Ledger entry not found" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};
