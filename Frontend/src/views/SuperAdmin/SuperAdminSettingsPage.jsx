import React, { useEffect, useState } from "react";
import Page from "../../components/Page";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { mutate } from "swr";
import { IconUser, IconLock } from "@tabler/icons-react";
import { iconStroke } from "../../config/config";
import {
  useSuperAdminProfile,
  patchSuperAdminProfile,
} from "../../controllers/superadmin.controller";
import {
  getUserDetailsInLocalStorage,
  saveUserDetailsInLocalStorage,
} from "../../helpers/UserDetails";
import { setAccessToken } from "../../helpers/accessToken";

export default function SuperAdminSettingsPage() {
  const { t } = useTranslation();
  const { data, error, isLoading, APIURL } = useSuperAdminProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const row = data?.data;
    if (!row) return;
    setName(row.name || "");
    setEmail(row.email || row.username || "");
  }, [data]);

  async function onSave(e) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t("superadmin_settings.name_required"));
      return;
    }
    if (!email.trim()) {
      toast.error(t("superadmin_settings.email_required"));
      return;
    }

    const changingPassword = newPassword.length > 0 || confirmPassword.length > 0;
    if (changingPassword) {
      if (!currentPassword) {
        toast.error(t("superadmin_settings.current_password_required"));
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error(t("superadmin_settings.passwords_mismatch"));
        return;
      }
      if (newPassword.length < 6) {
        toast.error(t("superadmin_settings.password_too_short"));
        return;
      }
    }

    try {
      toast.loading(t("superadmin_settings.saving"));
      const res = await patchSuperAdminProfile({
        name: name.trim(),
        email: email.trim(),
        currentPassword: changingPassword ? currentPassword : undefined,
        newPassword: changingPassword ? newPassword : undefined,
        confirmPassword: changingPassword ? confirmPassword : undefined,
      });
      toast.dismiss();

      if (res.status === 200) {
        toast.success(
          res.data?.message || t("superadmin_settings.saved")
        );
        const user = res.data.user || {
          ...getUserDetailsInLocalStorage(),
          name: name.trim(),
          username: email.trim(),
          role: "superadmin",
        };
        saveUserDetailsInLocalStorage(user);
        if (res.data.accessToken) {
          setAccessToken(res.data.accessToken);
        }
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        await mutate(APIURL);
      }
    } catch (err) {
      toast.dismiss();
      const msg =
        err?.response?.data?.message ||
        t("superadmin_settings.save_failed");
      toast.error(msg);
    }
  }

  if (isLoading) {
    return <Page>{t("superadmin_settings.loading")}</Page>;
  }

  if (error) {
    console.error(error);
    return <Page>{t("superadmin_settings.load_error")}</Page>;
  }

  return (
    <Page className="max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-sm text-gray-500">
          <Link to="/superadmin/dashboard/home" className="hover:underline">
            {t("superadmin_settings.breadcrumb_home")}
          </Link>
          {" / "}
          <span>{t("superadmin_settings.breadcrumb_current")}</span>
        </p>
        <h2 className="text-2xl font-bold mt-2">
          {t("superadmin_settings.title")}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t("superadmin_settings.subtitle")}
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-6">
        <section className="rounded-2xl border border-apax-border-green p-5 bg-white dark:bg-apax-card-bg">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <IconUser size={20} stroke={iconStroke} />
            {t("superadmin_settings.account_section")}
          </h3>

          <label className="block mb-4">
            <span className="text-sm text-gray-500">
              {t("superadmin_settings.name_label")}
            </span>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-apax-border-green px-3 py-2 bg-transparent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-500">
              {t("superadmin_settings.email_label")}
            </span>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-apax-border-green px-3 py-2 bg-transparent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t("superadmin_settings.email_hint")}
            </p>
          </label>
        </section>

        <section className="rounded-2xl border border-apax-border-green p-5 bg-white dark:bg-apax-card-bg">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <IconLock size={20} stroke={iconStroke} />
            {t("superadmin_settings.password_section")}
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            {t("superadmin_settings.password_hint")}
          </p>

          <label className="block mb-4">
            <span className="text-sm text-gray-500">
              {t("superadmin_settings.current_password")}
            </span>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-apax-border-green px-3 py-2 bg-transparent"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-gray-500">
              {t("superadmin_settings.new_password")}
            </span>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-apax-border-green px-3 py-2 bg-transparent"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-500">
              {t("superadmin_settings.confirm_password")}
            </span>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-apax-border-green px-3 py-2 bg-transparent"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        </section>

        <button
          type="submit"
          className="w-full rounded-full py-3 bg-apax-green text-white font-medium hover:opacity-90 transition"
        >
          {t("superadmin_settings.save")}
        </button>
      </form>
    </Page>
  );
}
