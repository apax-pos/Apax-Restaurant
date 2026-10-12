const { getCurrencyDB } = require("../services/settings.service");
const { getDashboardAnalyticsDB } = require("../services/dashboardAnalytics.service");

exports.getDashboardData = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const rangeType = req.query.range || req.query.type || "today";
    const from = req.query.from || null;
    const to = req.query.to || null;

    const [analytics, currency] = await Promise.all([
      getDashboardAnalyticsDB(tenantId, rangeType, from, to),
      getCurrencyDB(tenantId),
    ]);

    return res.status(200).json({
      ...analytics,
      currency,
    });
  } catch (error) {
    console.error("getDashboardData:", error);
    return res.status(500).json({
      success: false,
      message: req.__("something_went_wrong_try_later"),
    });
  }
};
