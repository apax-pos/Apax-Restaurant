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

const authed = [isLoggedIn, isAuthenticated, isSubscriptionActive];

router.get(
  "/profit-loss",
  ...authed,
  authorize([SCOPES.REPORTS]),
  getProfitLoss
);

router.get(
  "/",
  ...authed,
  authorize([SCOPES.REPORTS, SCOPES.SETTINGS]),
  getExpenses
);

router.post(
  "/",
  ...authed,
  authorize([SCOPES.REPORTS, SCOPES.SETTINGS]),
  addExpense
);

router.delete(
  "/:id",
  ...authed,
  authorize([SCOPES.REPORTS, SCOPES.SETTINGS]),
  deleteExpense
);

module.exports = router;
