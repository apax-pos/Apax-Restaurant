const {
  getPromotionsDB,
  addPromotionDB,
  updatePromotionDB,
  deletePromotionDB,
  togglePromotionDB,
  getStackRuleDB,
  setStackRuleDB,
  getPromotionReportDB,
} = require("../services/promotion.service");
const { ensurePromotionsTables } = require("../bootstrap/ensurePromotions");

async function ensurePromoSchema(res, req) {
  try {
    await ensurePromotionsTables();
    return true;
  } catch (err) {
    console.error("ensurePromotionsTables:", err.message);
    res.status(503).json({
      success: false,
      message: "Promotion tables could not be initialized. Recycle IIS app pool.",
    });
    return false;
  }
}

exports.list = async (req, res) => {
  try {
    if (!(await ensurePromoSchema(res, req))) return;
    const status = req.query.status;
    const all = await getPromotionsDB(req.user.tenant_id);
    const now = new Date();
    let promotions = all;
    if (status === "active") {
      const { isActiveNow } = require("../services/promotion.service");
      promotions = all.filter((p) => isActiveNow(p, { now }));
    } else if (status === "expired") {
      promotions = all.filter((p) => p.end_date && new Date(p.end_date) < now);
    } else if (status === "upcoming") {
      promotions = all.filter((p) => p.start_date && new Date(p.start_date) > now);
    }
    const stackRule = await getStackRuleDB(req.user.tenant_id);
    return res.status(200).json({ success: true, promotions, stackRule });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.create = async (req, res) => {
  try {
    if (!(await ensurePromoSchema(res, req))) return;
    const body = req.body;
    if (!body.name?.trim()) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    const id = await addPromotionDB(req.user.tenant_id, body);
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.update = async (req, res) => {
  try {
    if (!(await ensurePromoSchema(res, req))) return;
    await updatePromotionDB(req.user.tenant_id, req.params.id, req.body);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.toggle = async (req, res) => {
  try {
    if (!(await ensurePromoSchema(res, req))) return;
    await togglePromotionDB(req.user.tenant_id, req.params.id, Boolean(req.body.enabled));
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!(await ensurePromoSchema(res, req))) return;
    await deletePromotionDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.setStackRule = async (req, res) => {
  try {
    if (!(await ensurePromoSchema(res, req))) return;
    await setStackRuleDB(req.user.tenant_id, req.body.stackRule);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.report = async (req, res) => {
  try {
    if (!(await ensurePromoSchema(res, req))) return;
    const from = req.query.from || new Date().toISOString().slice(0, 10);
    const to = req.query.to || from;
    const data = await getPromotionReportDB(req.user.tenant_id, from, to);
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};
