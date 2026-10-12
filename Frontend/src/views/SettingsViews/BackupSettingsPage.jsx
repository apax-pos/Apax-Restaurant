import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import Page from "../../components/Page";
import { IconDatabaseExport, IconDatabaseImport } from "@tabler/icons-react";
import { iconStroke } from "../../config/config";
import {
  downloadTenantBackup,
  importTenantBackup,
} from "../../controllers/backup.controller";
import toast from "react-hot-toast";

export default function BackupSettingsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(false);
  const importInputRef = useRef(null);

  const handleDownload = async () => {
    try {
      setLoading(true);
      toast.loading(t("backup.please_wait"));
      await downloadTenantBackup();
      toast.dismiss();
      toast.success(t("backup.download_success"));
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error(
        error?.response?.data?.message || t("backup.download_error")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }

    if (!window.confirm(t("backup.import_confirm"))) {
      return;
    }

    try {
      setLoading(true);
      toast.loading(t("backup.import_wait"));
      const res = await importTenantBackup(file);
      toast.dismiss();
      toast.success(res.data?.message || t("backup.import_success"));
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error(error?.response?.data?.message || t("backup.import_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page className="px-8 py-6">
      <h3 className="text-3xl font-light">{t("backup.title")}</h3>
      <p className="mt-2 text-sm text-gray-500 max-w-2xl">{t("backup.description")}</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2 max-w-4xl">
        <div className="rounded-xl border border-apax-border-green bg-apax-gray p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-apax-green/10 text-apax-green">
              <IconDatabaseExport size={28} stroke={iconStroke} />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-apax-text">{t("backup.json_export")}</h4>
              <p className="mt-1 text-sm text-gray-500">{t("backup.json_export_hint")}</p>
              <button
                type="button"
                disabled={loading}
                onClick={handleDownload}
                className="mt-4 text-white transition active:scale-95 rounded-xl px-4 py-2 bg-apax-green hover:bg-apax-green-button-hover disabled:opacity-60"
              >
                {loading ? t("backup.please_wait") : t("backup.download_button")}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-apax-border-green bg-apax-gray p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
              <IconDatabaseImport size={28} stroke={iconStroke} />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-apax-text">{t("backup.json_import")}</h4>
              <p className="mt-1 text-sm text-gray-500">{t("backup.json_import_hint")}</p>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImport}
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => importInputRef.current?.click()}
                className="mt-4 text-white transition active:scale-95 rounded-xl px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
              >
                {loading ? t("backup.import_wait") : t("backup.import_button")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400 max-w-2xl">{t("backup.security_note")}</p>
    </Page>
  );
}
