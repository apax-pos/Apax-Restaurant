import ApiClient from "../helpers/ApiClient";
import { downloadBlob } from "../helpers/downloadBlob";

function filenameFromResponse(res, fallback) {
  const disposition = res.headers?.["content-disposition"];
  if (!disposition) return fallback;
  const match = /filename="?([^";\n]+)"?/i.exec(disposition);
  return match?.[1] || fallback;
}

export async function downloadTenantBackup() {
  const res = await ApiClient.get("/backup/tenant", { responseType: "blob" });
  const name = filenameFromResponse(
    res,
    `apax-tenant-backup-${new Date().toISOString().slice(0, 10)}.json`
  );
  downloadBlob(new Blob([res.data], { type: "application/json" }), name);
}

export async function downloadSuperAdminTenantBackup(tenantId) {
  const res = await ApiClient.get(`/backup/superadmin/tenant/${tenantId}`, {
    responseType: "blob",
  });
  const name = filenameFromResponse(
    res,
    `apax-tenant-backup-${tenantId}-${new Date().toISOString().slice(0, 10)}.json`
  );
  downloadBlob(new Blob([res.data], { type: "application/json" }), name);
}

export async function downloadSuperAdminFullBackup() {
  const res = await ApiClient.get("/backup/superadmin/full", {
    responseType: "blob",
  });
  const name = filenameFromResponse(
    res,
    `apax-full-backup-${new Date().toISOString().slice(0, 10)}.json`
  );
  downloadBlob(new Blob([res.data], { type: "application/json" }), name);
}

export async function downloadSuperAdminDatabaseFile() {
  const res = await ApiClient.get("/backup/superadmin/database-file", {
    responseType: "blob",
  });
  const name = filenameFromResponse(
    res,
    `apax-database-${new Date().toISOString().slice(0, 10)}.sqlite`
  );
  downloadBlob(new Blob([res.data], { type: "application/octet-stream" }), name);
}

export async function importTenantBackup(file) {
  const formData = new FormData();
  formData.append("backup_file", file);
  const res = await ApiClient.post("/backup/tenant/import", formData);
  return res;
}

export async function importSuperAdminTenantBackup(tenantId, file) {
  const formData = new FormData();
  formData.append("backup_file", file);
  const res = await ApiClient.post(
    `/backup/superadmin/tenant/${tenantId}/import`,
    formData
  );
  return res;
}

export async function importSuperAdminFullBackup(file) {
  const formData = new FormData();
  formData.append("backup_file", file);
  formData.append("confirm", "RESTORE_FULL");
  const res = await ApiClient.post("/backup/superadmin/full/import", formData);
  return res;
}
