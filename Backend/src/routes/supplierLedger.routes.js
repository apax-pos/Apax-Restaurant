const { Router } = require("express");
const { isLoggedIn, isAuthenticated, isSubscriptionActive, authorize } = require("../middlewares/auth.middleware");
const { SCOPES } = require("../config/user.config");
const ledger = require("../controllers/supplierLedger.controller");

const router = Router();
const authed = [isLoggedIn, isAuthenticated, isSubscriptionActive];

router.get("/suppliers", ...authed, authorize([SCOPES.INVENTORY, SCOPES.SETTINGS]), ledger.listSuppliers);
router.post("/entry", ...authed, authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]), ledger.recordEntry);
router.patch("/entry/:id", ...authed, authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]), ledger.updateEntry);
router.delete("/entry/:id", ...authed, authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]), ledger.deleteEntry);
router.post("/payment", ...authed, authorize([SCOPES.INVENTORY, SCOPES.MANAGE_INVENTORY, SCOPES.SETTINGS]), ledger.recordPayment);
router.get("/:supplierId", ...authed, authorize([SCOPES.INVENTORY, SCOPES.SETTINGS]), ledger.getLedger);

module.exports = router;
