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
  updateSupplier,
  deleteSupplier,
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
} = require("../controllers/purchasing.controller");

const router = Router();

const authed = [isLoggedIn, isAuthenticated, isSubscriptionActive];

router.get(
  "/suppliers",
  ...authed,
  authorize([SCOPES.INVENTORY, SCOPES.SETTINGS]),
  getSuppliers
);

router.post(
  "/suppliers",
  ...authed,
  authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]),
  addSupplier
);

router.patch(
  "/suppliers/:id",
  ...authed,
  authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]),
  updateSupplier
);

router.delete(
  "/suppliers/:id",
  ...authed,
  authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]),
  deleteSupplier
);

router.get(
  "/",
  ...authed,
  authorize([SCOPES.INVENTORY, SCOPES.SETTINGS]),
  getPurchases
);

router.get(
  "/:id",
  ...authed,
  authorize([SCOPES.INVENTORY, SCOPES.SETTINGS]),
  getPurchase
);

router.post(
  "/",
  ...authed,
  authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]),
  createPurchase
);

router.patch(
  "/:id",
  ...authed,
  authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]),
  updatePurchase
);

router.delete(
  "/:id",
  ...authed,
  authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]),
  deletePurchase
);

module.exports = router;
