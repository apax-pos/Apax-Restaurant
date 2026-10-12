const { Router } = require("express");
const {
  isLoggedIn,
  isAuthenticated,
  authorize,
  isSubscriptionActive,
  isSuperAdmin,
} = require("../middlewares/auth.middleware");
const { SCOPES } = require("../config/user.config");
const {
  downloadTenantBackup,
  importTenantBackup,
  downloadSuperAdminTenantBackup,
  importSuperAdminTenantBackup,
  downloadSuperAdminFullBackup,
  importSuperAdminFullBackup,
  downloadSuperAdminDatabaseFile,
} = require("../controllers/backup.controller");

const router = Router();

router.get(
  "/tenant",
  isLoggedIn,
  isAuthenticated,
  isSubscriptionActive,
  authorize([SCOPES.SETTINGS]),
  downloadTenantBackup
);

router.post(
  "/tenant/import",
  isLoggedIn,
  isAuthenticated,
  authorize([SCOPES.SETTINGS]),
  importTenantBackup
);

router.get(
  "/superadmin/tenant/:tenantId",
  isLoggedIn,
  isAuthenticated,
  isSuperAdmin,
  downloadSuperAdminTenantBackup
);

router.post(
  "/superadmin/tenant/:tenantId/import",
  isLoggedIn,
  isAuthenticated,
  isSuperAdmin,
  importSuperAdminTenantBackup
);

router.get(
  "/superadmin/full",
  isLoggedIn,
  isAuthenticated,
  isSuperAdmin,
  downloadSuperAdminFullBackup
);

router.post(
  "/superadmin/full/import",
  isLoggedIn,
  isAuthenticated,
  isSuperAdmin,
  importSuperAdminFullBackup
);

router.get(
  "/superadmin/database-file",
  isLoggedIn,
  isAuthenticated,
  isSuperAdmin,
  downloadSuperAdminDatabaseFile
);

module.exports = router;
