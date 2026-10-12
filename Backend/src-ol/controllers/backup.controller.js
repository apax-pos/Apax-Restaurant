const fs = require("fs");
const path = require("path");
const {
  buildTenantBackup,
  buildFullSystemBackup,
  getDatabaseFilePath,
  restoreTenantBackup,
  restoreFullBackup,
  parseBackupPayload,
} = require("../services/backup.service");

function sendJsonDownload(res, filename, payload) {
  const json = JSON.stringify(payload, null, 2);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(json);
}

function safeFilenamePart(value) {
  return String(value || "export")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 64);
}

function readBackupFromRequest(req) {
  if (req.files && req.files.backup_file) {
    const raw = req.files.backup_file;
    const file = Array.isArray(raw) ? raw[0] : raw;
    if (file.data) {
      return parseBackupPayload(file.data);
    }
    if (file.tempFilePath) {
      return parseBackupPayload(fs.readFileSync(file.tempFilePath, "utf8"));
    }
  }

  if (req.body && req.body.backup) {
    return parseBackupPayload(req.body.backup);
  }

  throw new Error("No backup file provided. Upload a .json backup file.");
}

/** Tenant admin: backup own restaurant data */
exports.downloadTenantBackup = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const backup = await buildTenantBackup(tenantId);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: req.__("tenant_not_found"),
      });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const name = safeFilenamePart(backup.tenantName || `tenant-${tenantId}`);
    sendJsonDownload(res, `apax-tenant-backup-${name}-${stamp}.json`, backup);
  } catch (error) {
    console.error(error);
    const detail =
      (error && typeof error.message === "string" && error.message.trim()) || "";
    return res.status(500).json({
      success: false,
      message: detail || req.__("backup_failed"),
    });
  }
};

/** Tenant admin: restore own restaurant from JSON backup */
exports.importTenantBackup = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const payload = readBackupFromRequest(req);
    const stats = await restoreTenantBackup(tenantId, payload);

    return res.status(200).json({
      success: true,
      message: req.__("backup_import_success"),
      stats,
    });
  } catch (error) {
    console.error(error);
    const detail =
      (error && typeof error.message === "string" && error.message.trim()) || "";
    return res.status(500).json({
      success: false,
      message: detail || req.__("backup_import_failed"),
    });
  }
};

/** Superadmin: backup one tenant */
exports.downloadSuperAdminTenantBackup = async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId || Number.isNaN(tenantId)) {
      return res.status(400).json({
        success: false,
        message: req.__("invalid_request"),
      });
    }

    const backup = await buildTenantBackup(tenantId);
    if (!backup) {
      return res.status(404).json({
        success: false,
        message: req.__("tenant_not_found"),
      });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const name = safeFilenamePart(backup.tenantName || `tenant-${tenantId}`);
    sendJsonDownload(res, `apax-tenant-backup-${name}-${stamp}.json`, backup);
  } catch (error) {
    console.error(error);
    const detail =
      (error && typeof error.message === "string" && error.message.trim()) || "";
    return res.status(500).json({
      success: false,
      message: detail || req.__("backup_failed"),
    });
  }
};

/** Superadmin: restore one tenant from JSON backup */
exports.importSuperAdminTenantBackup = async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId || Number.isNaN(tenantId)) {
      return res.status(400).json({
        success: false,
        message: req.__("invalid_request"),
      });
    }

    const payload = readBackupFromRequest(req);
    const stats = await restoreTenantBackup(tenantId, payload);

    return res.status(200).json({
      success: true,
      message: req.__("backup_import_success"),
      stats,
    });
  } catch (error) {
    console.error(error);
    const detail =
      (error && typeof error.message === "string" && error.message.trim()) || "";
    return res.status(500).json({
      success: false,
      message: detail || req.__("backup_import_failed"),
    });
  }
};

/** Superadmin: backup all tenants and system tables (JSON) */
exports.downloadSuperAdminFullBackup = async (req, res) => {
  try {
    const backup = await buildFullSystemBackup();
    const stamp = new Date().toISOString().slice(0, 10);
    sendJsonDownload(res, `apax-full-backup-${stamp}.json`, backup);
  } catch (error) {
    console.error(error);
    const detail =
      (error && typeof error.message === "string" && error.message.trim()) || "";
    return res.status(500).json({
      success: false,
      message: detail || req.__("backup_failed"),
    });
  }
};

/** Superadmin: restore entire system from full JSON backup */
exports.importSuperAdminFullBackup = async (req, res) => {
  try {
    if (req.body?.confirm !== "RESTORE_FULL") {
      return res.status(400).json({
        success: false,
        message: req.__("backup_full_confirm_required"),
      });
    }

    const payload = readBackupFromRequest(req);
    const stats = await restoreFullBackup(payload);

    return res.status(200).json({
      success: true,
      message: req.__("backup_import_success"),
      stats,
    });
  } catch (error) {
    console.error(error);
    const detail =
      (error && typeof error.message === "string" && error.message.trim()) || "";
    return res.status(500).json({
      success: false,
      message: detail || req.__("backup_import_failed"),
    });
  }
};

/** Superadmin: download raw SQLite database file */
exports.downloadSuperAdminDatabaseFile = async (req, res) => {
  try {
    const dbPath = getDatabaseFilePath();
    if (!dbPath) {
      return res.status(404).json({
        success: false,
        message: req.__("database_file_not_found"),
      });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `apax-database-${stamp}${path.extname(dbPath) || ".sqlite"}`;
    res.download(dbPath, filename);
  } catch (error) {
    console.error(error);
    const detail =
      (error && typeof error.message === "string" && error.message.trim()) || "";
    return res.status(500).json({
      success: false,
      message: detail || req.__("backup_failed"),
    });
  }
};
