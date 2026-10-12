const {
  getSuppliersDB,
  addSupplierDB,
  updateSupplierDB,
  deleteSupplierDB,
  getPurchasesDB,
  getPurchaseByIdDB,
  createPurchaseDB,
  updatePurchaseDB,
  deletePurchaseDB,
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

exports.updateSupplier = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Supplier name is required" });
    }
    await updateSupplierDB(req.user.tenant_id, req.params.id, {
      name: name.trim(),
      phone,
      email,
      address,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    await deleteSupplierDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "SUPPLIER_IN_USE") {
      return res.status(400).json({
        success: false,
        message: "Supplier has purchases or ledger entries and cannot be deleted.",
      });
    }
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

exports.getPurchase = async (req, res) => {
  try {
    const data = await getPurchaseByIdDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    if (error.message === "PURCHASE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.createPurchase = async (req, res) => {
  try {
    const id = await createPurchaseDB(req.user.tenant_id, req.body, req.user.username);
    return res.status(200).json({ success: true, id, message: "Purchase recorded" });
  } catch (error) {
    if (error.message === "NO_ITEMS" || error.message === "INVALID_PURCHASE_ITEM") {
      return res.status(400).json({ success: false, message: "Add at least one item" });
    }
    if (error.message === "INVENTORY_ITEM_NOT_FOUND") {
      return res.status(400).json({ success: false, message: "Inventory item not found" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.updatePurchase = async (req, res) => {
  try {
    const id = await updatePurchaseDB(req.user.tenant_id, req.params.id, req.body, req.user.username);
    return res.status(200).json({ success: true, id, message: "Purchase updated" });
  } catch (error) {
    if (error.message === "PURCHASE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }
    if (error.message === "NO_ITEMS" || error.message === "INVALID_PURCHASE_ITEM") {
      return res.status(400).json({ success: false, message: "Add at least one item" });
    }
    if (error.message === "INVENTORY_ITEM_NOT_FOUND") {
      return res.status(400).json({ success: false, message: "Inventory item not found" });
    }
    if (error.message === "INSUFFICIENT_STOCK_TO_REVERSE_PURCHASE") {
      return res.status(400).json({
        success: false,
        message: "Cannot update because stock has already been consumed.",
      });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.deletePurchase = async (req, res) => {
  try {
    await deletePurchaseDB(req.user.tenant_id, req.params.id, req.user.username);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "PURCHASE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }
    if (error.message === "INSUFFICIENT_STOCK_TO_REVERSE_PURCHASE") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete because stock has already been consumed.",
      });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};
