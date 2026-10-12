const { Router } = require("express");
const { isLoggedIn, isAuthenticated, isSubscriptionActive, authorize } = require("../middlewares/auth.middleware");
const { SCOPES } = require("../config/user.config");
const combo = require("../controllers/combo.controller");

const router = Router();
const authed = [isLoggedIn, isAuthenticated, isSubscriptionActive];

router.get("/", ...authed, authorize([SCOPES.POS, SCOPES.SETTINGS]), combo.list);
router.post("/", ...authed, authorize([SCOPES.SETTINGS]), combo.create);
router.patch("/:id", ...authed, authorize([SCOPES.SETTINGS]), combo.update);
router.delete("/:id", ...authed, authorize([SCOPES.SETTINGS]), combo.remove);

module.exports = router;
