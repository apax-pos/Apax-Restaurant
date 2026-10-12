const {
  getBranchesDB,
  addBranchDB,
  updateBranchDB,
  deleteBranchDB,
} = require("../services/branch.service");
const { ensureExtendedSchemaIfNeeded } = require("../utils/schemaGuard");

async function ensureBranchesReady(res) {
  if (await ensureExtendedSchemaIfNeeded()) return true;
  res.status(503).json({
    success: false,
    message: "Database upgrade pending. Recycle the IIS application pool, then try again.",
  });
  return false;
}

exports.list = async (req, res) => {
  try {
    if (!(await ensureBranchesReady(res))) return;
    const branches = await getBranchesDB(req.user.tenant_id);
    return res.status(200).json({ success: true, branches });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.create = async (req, res) => {
  try {
    if (!(await ensureBranchesReady(res))) return;
    const { name, address, phone, isDefault } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    const id = await addBranchDB(req.user.tenant_id, {
      name: name.trim(),
      address,
      phone,
      isDefault: Boolean(isDefault),
    });
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.update = async (req, res) => {
  try {
    if (!(await ensureBranchesReady(res))) return;
    const { name, address, phone, isDefault, isActive } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    await updateBranchDB(req.user.tenant_id, req.params.id, {
      name: name?.trim(),
      address,
      phone,
      isDefault,
      isActive,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!(await ensureBranchesReady(res))) return;
    await deleteBranchDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};
