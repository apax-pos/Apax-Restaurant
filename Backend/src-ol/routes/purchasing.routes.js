const { Router } = require("express");
const {
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize,
} = require("../middlewares/auth.middleware");
const { SCOPES } = require("../config/user.config");
const {
  getSuppliers,
  addSupplier,
  getPurchases,
  createPurchase,
} = require("../controllers/purchasing.controller");

const router = Router();

router.get(
  "/suppliers",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.INVENTORY, SCOPES.SETTINGS]),
  getSuppliers
);

router.post(
  "/suppliers",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]),
  addSupplier
);

router.get(
  "/",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.INVENTORY, SCOPES.SETTINGS]),
  getPurchases
);

router.post(
  "/",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]),
  createPurchase
);

module.exports = router;
