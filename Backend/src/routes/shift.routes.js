const { Router } = require("express");
const {
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize,
} = require("../middlewares/auth.middleware");

const authed = [
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
];
const { SCOPES } = require("../config/user.config");
const {
  getActiveShift,
  getShift,
  getShifts,
  openShift,
  closeShift,
  updateShift,
  deleteShift,
} = require("../controllers/shift.controller");

const router = Router();

router.get(
  "/active",
  ...authed,
  authorize([SCOPES.POS, SCOPES.ORDERS, SCOPES.REPORTS, SCOPES.SETTINGS]),
  getActiveShift
);

router.get(
  "/",
  ...authed,
  authorize([SCOPES.POS, SCOPES.ORDERS, SCOPES.REPORTS, SCOPES.SETTINGS]),
  getShifts
);

router.get(
  "/:id",
  ...authed,
  authorize([SCOPES.POS, SCOPES.ORDERS, SCOPES.REPORTS, SCOPES.SETTINGS]),
  getShift
);

router.post(
  "/open",
  ...authed,
  authorize([SCOPES.POS, SCOPES.SETTINGS]),
  openShift
);

router.post(
  "/close",
  ...authed,
  authorize([SCOPES.POS, SCOPES.SETTINGS]),
  closeShift
);

router.patch(
  "/:id",
  ...authed,
  authorize([SCOPES.POS, SCOPES.SETTINGS]),
  updateShift
);

router.delete(
  "/:id",
  ...authed,
  authorize([SCOPES.POS, SCOPES.SETTINGS]),
  deleteShift
);

module.exports = router;
