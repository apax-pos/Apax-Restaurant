const {
  getSuppliersDB,
  addSupplierDB,
  getPurchasesDB,
  createPurchaseDB,
} = require("../services/purchasing.service");

exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await getSuppliersDB(req.user.tenant_id);
    return res.status(200).json({ suppliers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.addSupplier = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Supplier name is required" });
    }
    const id = await addSupplierDB(req.user.tenant_id, { name: name.trim(), phone, email, address });
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.getPurchases = async (req, res) => {
  try {
    const purchases = await getPurchasesDB(req.user.tenant_id);
    return res.status(200).json({ purchases });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.createPurchase = async (req, res) => {
  try {
    const id = await createPurchaseDB(req.user.tenant_id, req.body, req.user.username);
    return res.status(200).json({ success: true, id, message: "Purchase recorded" });
  } catch (error) {
    if (error.message === "NO_ITEMS") {
      return res.status(400).json({ success: false, message: "Add at least one item" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};
