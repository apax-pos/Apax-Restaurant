const {
  getExpensesDB,
  addExpenseDB,
  deleteExpenseDB,
  getProfitLossDB,
} = require("../services/expense.service");

exports.getExpenses = async (req, res) => {
  try {
    const { type, from, to } = req.query;
    const expenses = await getExpensesDB(req.user.tenant_id, type || "today", from, to);
    return res.status(200).json({ expenses });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.addExpense = async (req, res) => {
  try {
    const { title, amount, category, expenseDate, notes } = req.body;
    if (!title?.trim() || amount == null) {
      return res.status(400).json({ success: false, message: req.__("invalid_request") });
    }
    const id = await addExpenseDB(
      req.user.tenant_id,
      { title, amount, category, expenseDate, notes },
      req.user.username
    );
    return res.status(200).json({ success: true, id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    await deleteExpenseDB(req.user.tenant_id, req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};

exports.getProfitLoss = async (req, res) => {
  try {
    const { type, from, to } = req.query;
    if (!type) {
      return res.status(400).json({ success: false, message: req.__("please_provide_required_details") });
    }
    const data = await getProfitLossDB(req.user.tenant_id, type, from, to);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: req.__("something_went_wrong_try_later") });
  }
};
