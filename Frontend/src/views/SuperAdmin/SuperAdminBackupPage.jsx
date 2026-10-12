import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import Page from "../../components/Page";
import {
  IconDatabase,
  IconDatabaseExport,
  IconDatabaseImport,
  IconDownload,
} from "@tabler/icons-react";
import { iconStroke } from "../../config/config";
import {
  downloadSuperAdminDatabaseFile,
  downloadSuperAdminFullBackup,
  importSuperAdminFullBackup,
} from "../../controllers/backup.controller";
import toast from "react-hot-toast";

export default function SuperAdminBackupPage() {
  const { t } = useTranslation();
  const [loadingKey, setLoadingKey] = React.useState(null);
  const fullImportRef = useRef(null);

  const runDownload = async (key, fn) => {
    try {
      setLoadingKey(key);
      toast.loading(t("backup.please_wait"));
      await fn();
      toast.dismiss();
      toast.success(t("backup.download_success"));
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error(error?.response?.data?.message || t("backup.download_error"));
    } finally {
      setLoadingKey(null);
    }
  };

  const handleFullImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }

    if (!window.confirm(t("backup.full_import_confirm"))) {
      return;
    }

    try {
      setLoadingKey("import");
      toast.loading(t("backup.import_wait"));
      const res = await importSuperAdminFullBackup(file);
      toast.dismiss();
      toast.success(res.data?.message || t("backup.import_success"));
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error(error?.response?.data?.message || t("backup.import_error"));
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <Page className="px-6 py-6 md:px-8">
      <h3 className="text-3xl font-light">{t("backup.superadmin_title")}</h3>
      <p className="mt-2 text-sm text-gray-500 max-w-3xl">
        {t("backup.superadmin_description")}
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2 max-w-4xl">
        <div className="rounded-xl border border-apax-border-green bg-apax-card-bg p-6">
          <IconDatabaseExport stroke={iconStroke} className="text-apax-green" />
          <h4 className="mt-3 font-medium">{t("backup.full_json")}</h4>
          <p className="mt-1 text-sm text-gray-500">{t("backup.full_json_hint")}</p>
          <button
            type="button"
            disabled={!!loadingKey}
            onClick={() => runDownload("full", downloadSuperAdminFullBackup)}
            className="mt-4 flex items-center gap-2 text-white rounded-xl px-4 py-2 bg-apax-green hover:bg-apax-green-button-hover disabled:opacity-60"
          >
            <IconDownload size={18} stroke={iconStroke} />
            {loadingKey === "full" ? t("backup.please_wait") : t("backup.download_full")}
          </button>
        </div>

        <div className="rounded-xl border border-apax-border-green bg-apax-card-bg p-6">
          <IconDatabase stroke={iconStroke} className="text-apax-green" />
          <h4 className="mt-3 font-medium">{t("backup.database_file")}</h4>
          <p className="mt-1 text-sm text-gray-500">{t("backup.database_file_hint")}</p>
          <button
            type="button"
            disabled={!!loadingKey}
            onClick={() => runDownload("db", downloadSuperAdminDatabaseFile)}
            className="mt-4 flex items-center gap-2 text-white rounded-xl px-4 py-2 bg-apax-green hover:bg-apax-green-button-hover disabled:opacity-60"
          >
            <IconDownload size={18} stroke={iconStroke} />
            {loadingKey === "db" ? t("backup.please_wait") : t("backup.download_database")}
          </button>
        </div>

        <div className="rounded-xl border border-amber-500/40 bg-apax-card-bg p-6 md:col-span-2">
          <IconDatabaseImport stroke={iconStroke} className="text-amber-600" />
          <h4 className="mt-3 font-medium">{t("backup.full_json_import")}</h4>
          <p className="mt-1 text-sm text-gray-500">{t("backup.full_json_import_hint")}</p>
          <input
            ref={fullImportRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFullImport}
          />
          <button
            type="button"
            disabled={!!loadingKey}
            onClick={() => fullImportRef.current?.click()}
            className="mt-4 flex items-center gap-2 text-white rounded-xl px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
          >
            <IconDatabaseImport size={18} stroke={iconStroke} />
            {loadingKey === "import" ? t("backup.import_wait") : t("backup.import_full_button")}
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400 max-w-3xl">{t("backup.per_tenant_hint")}</p>
    </Page>
  );
}
