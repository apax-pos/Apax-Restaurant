const {
  getCombosDB,
  addComboDB,
  updateComboDB,
  deleteComboDB,
} = require("../services/combo.service");
const { ensureExtendedSchemaIfNeeded } = require("../utils/schemaGuard");

exports.list = async (req, res) => {
  try {
    if (!(await ensureExtendedSchemaIfNeeded())) {
      return res.status(503).json({
        success: false,
        message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
      });
    }
    const enabledOnly = req.query.enabled === "1";
    const combos = await getCombosDB(req.user.tenant_id, enabledOnly);
    return res.status(200).json({ success: true, combos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description, price, isEnabled, items } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    const id = await addComboDB(req.user.tenant_id, {
      title: title.trim(),
      description,
      price,
      isEnabled,
      items: items || [],
    });
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, description, price, isEnabled, items } = req.body;
    await updateComboDB(req.user.tenant_id, req.params.id, {
      title: title?.trim(),
      description,
      price,
      isEnabled,
      items: items || [],
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.remove = async (req, res) => {
  try {
    await deleteComboDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};
