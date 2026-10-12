const { Router } = require("express");
const { isLoggedIn, isAuthenticated, isSubscriptionActive, authorize } = require("../middlewares/auth.middleware");
const { SCOPES } = require("../config/user.config");
const staff = require("../controllers/staff.controller");

const router = Router();
const authed = [isLoggedIn, isAuthenticated, isSubscriptionActive];

router.get("/", ...authed, authorize([SCOPES.SETTINGS]), staff.list);
router.post("/", ...authed, authorize([SCOPES.SETTINGS]), staff.create);
router.patch("/:id", ...authed, authorize([SCOPES.SETTINGS]), staff.update);
router.delete("/:id", ...authed, authorize([SCOPES.SETTINGS]), staff.remove);
router.post("/check-in", ...authed, authorize([SCOPES.SETTINGS, SCOPES.POS]), staff.checkIn);
router.post("/check-out", ...authed, authorize([SCOPES.SETTINGS, SCOPES.POS]), staff.checkOut);
router.get("/attendance/list", ...authed, authorize([SCOPES.SETTINGS]), staff.attendance);
router.get("/salary/list", ...authed, authorize([SCOPES.SETTINGS]), staff.salaryList);
router.post("/salary/generate", ...authed, authorize([SCOPES.SETTINGS]), staff.generateSalary);
router.post("/salary/:id/paid", ...authed, authorize([SCOPES.SETTINGS]), staff.markPaid);

module.exports = router;
