const { Router } = require("express");
const { isLoggedIn, isAuthenticated, isSubscriptionActive, authorize } = require("../middlewares/auth.middleware");
const { SCOPES } = require("../config/user.config");
const rider = require("../controllers/rider.controller");

const router = Router();
const authed = [isLoggedIn, isAuthenticated, isSubscriptionActive];

router.get("/riders", ...authed, authorize([SCOPES.SETTINGS, SCOPES.POS]), rider.listRiders);
router.get("/riders/:id", ...authed, authorize([SCOPES.SETTINGS, SCOPES.POS]), rider.getRider);
router.post("/riders", ...authed, authorize([SCOPES.SETTINGS]), rider.createRider);
router.patch("/riders/:id", ...authed, authorize([SCOPES.SETTINGS]), rider.updateRider);
router.delete("/riders/:id", ...authed, authorize([SCOPES.SETTINGS]), rider.removeRider);
router.get("/zones", ...authed, authorize([SCOPES.SETTINGS, SCOPES.POS]), rider.listZones);
router.get("/zones/:id", ...authed, authorize([SCOPES.SETTINGS, SCOPES.POS]), rider.getZone);
router.post("/zones", ...authed, authorize([SCOPES.SETTINGS]), rider.createZone);
router.patch("/zones/:id", ...authed, authorize([SCOPES.SETTINGS]), rider.updateZone);
router.delete("/zones/:id", ...authed, authorize([SCOPES.SETTINGS]), rider.removeZone);
router.post("/assign-order", ...authed, authorize([SCOPES.POS, SCOPES.ORDERS]), rider.assignRider);

module.exports = router;
