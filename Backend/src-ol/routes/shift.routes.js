const { Router } = require("express");
const {
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize,
} = require("../middlewares/auth.middleware");
const { SCOPES } = require("../config/user.config");
const {
  getActiveShift,
  getShifts,
  openShift,
  closeShift,
} = require("../controllers/shift.controller");

const router = Router();

router.get(
  "/active",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.POS, SCOPES.ORDERS, SCOPES.REPORTS, SCOPES.SETTINGS]),
  getActiveShift
);

router.get(
  "/",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.POS, SCOPES.ORDERS, SCOPES.REPORTS, SCOPES.SETTINGS]),
  getShifts
);

router.post(
  "/open",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.POS, SCOPES.SETTINGS]),
  openShift
);

router.post(
  "/close",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.POS, SCOPES.SETTINGS]),
  closeShift
);

module.exports = router;
