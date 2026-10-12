const { Router } = require("express");
const { isLoggedIn, isAuthenticated, isSubscriptionActive, authorize } = require("../middlewares/auth.middleware");
const { SCOPES } = require("../config/user.config");
const branch = require("../controllers/branch.controller");

const router = Router();
const authed = [isLoggedIn, isAuthenticated, isSubscriptionActive];

router.get("/", ...authed, authorize([SCOPES.SETTINGS]), branch.list);
router.post("/", ...authed, authorize([SCOPES.SETTINGS]), branch.create);
router.patch("/:id", ...authed, authorize([SCOPES.SETTINGS]), branch.update);
router.delete("/:id", ...authed, authorize([SCOPES.SETTINGS]), branch.remove);

module.exports = router;
