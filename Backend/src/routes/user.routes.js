const { Router } = require("express");

const { isLoggedIn, isAuthenticated, isSubscriptionActive, authorize } = require("../middlewares/auth.middleware");
const { SCOPES } = require("../config/user.config");
const { getAllUsers, addUser, deleteUser, updateUser, updateUserPassword, getAllScopes } = require("../controllers/user.controller");

const router = Router();

const settingsOnly = [isLoggedIn, isAuthenticated, isSubscriptionActive, authorize([SCOPES.SETTINGS])];

router.get("/", ...settingsOnly, getAllUsers);
router.get("/scopes", ...settingsOnly, getAllScopes);
router.post("/add", ...settingsOnly, addUser);
router.delete("/delete/:id", ...settingsOnly, deleteUser);
router.post("/update/:id", ...settingsOnly, updateUser);
router.post("/update-password/:id", ...settingsOnly, updateUserPassword);

module.exports = router;