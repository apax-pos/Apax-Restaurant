const { Router } = require("express");
const {
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize,
} = require("../middlewares/auth.middleware");
const { SCOPES } = require("../config/user.config");
const {
  getExpenses,
  addExpense,
  deleteExpense,
  getProfitLoss,
} = require("../controllers/expense.controller");

const router = Router();

router.get(
  "/profit-loss",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.REPORTS]),
  getProfitLoss
);

router.get(
  "/",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.REPORTS, SCOPES.SETTINGS]),
  getExpenses
);

router.post(
  "/",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.REPORTS, SCOPES.SETTINGS]),
  addExpense
);

router.delete(
  "/:id",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.REPORTS, SCOPES.SETTINGS]),
  deleteExpense
);

module.exports = router;
