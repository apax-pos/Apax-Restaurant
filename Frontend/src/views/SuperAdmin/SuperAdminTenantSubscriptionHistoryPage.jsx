import React, { useEffect, useState } from "react";
import Page from "../../components/Page";
import { Link, useParams } from "react-router-dom";
import {
  useSuperAdminTenantSubscriptionHistory,
  setTenantSubscription,
} from "../../controllers/superadmin.controller";
import { IconCheck, IconCreditCard, IconX } from "@tabler/icons-react";
import { iconStroke, subscriptionPrice } from "../../config/config";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { mutate } from "swr";

/** Parse DB datetime without timezone shift (wall-clock). */
function toDatetimeLocalValue(stored) {
  if (!stored) return "";
  const s = String(stored).trim().replace(" ", "T").slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s;
  const d = new Date(stored);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function datetimeLocalToPayload(localValue) {
  if (!localValue) return null;
  const normalized = localValue.replace("T", " ");
  return normalized.length === 16 ? `${normalized}:00` : normalized.slice(0, 19);
}

export default function SuperAdminTenantSubscriptionHistoryPage() {
  const { t } = useTranslation();
  const params = useParams();
  const tenantId = params.id;
  const { APIURL, data, error, isLoading } =
    useSuperAdminTenantSubscriptionHistory(tenantId);

  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [licenseActive, setLicenseActive] = useState(true);

  useEffect(() => {
    if (!data?.tenantInfo) return;
    const ti = data.tenantInfo;
    setStartLocal(toDatetimeLocalValue(ti.subscription_start));
    setEndLocal(toDatetimeLocalValue(ti.subscription_end));
    setLicenseActive(ti.is_active == 1);
  }, [data]);

  async function saveSubscription(e) {
    e.preventDefault();
    try {
      toast.loading(t("superadmin_tenant_subscription_history.saving"));
      const res = await setTenantSubscription(tenantId, {
        subscriptionStart: datetimeLocalToPayload(startLocal),
        subscriptionEnd: datetimeLocalToPayload(endLocal),
        isActive: licenseActive,
      });
      toast.dismiss();
      if (res.status === 200) {
        const ti = res.data?.tenantInfo;
        if (ti) {
          setStartLocal(toDatetimeLocalValue(ti.subscription_start));
          setEndLocal(toDatetimeLocalValue(ti.subscription_end));
          setLicenseActive(ti.is_active == 1);
        }
        toast.success(
          res.data?.message ||
            t("superadmin_tenant_subscription_history.subscription_saved")
        );
        await mutate(APIURL);
      }
    } catch (err) {
      toast.dismiss();
      const msg =
        err?.response?.data?.message ||
        t("superadmin_tenant_subscription_history.subscription_save_failed");
      toast.error(msg);
    }
  }

  if (isLoading) {
    return <Page>{t("superadmin_reports.loading_message")}</Page>;
  }

  if (error) {
    console.error(error);
    return <Page>{t("superadmin_reports.error_message")}</Page>;
  }

  const {
    tenantInfo,
    storeDetails,
    totalUsers,
    subscriptionHistory = [],
  } = data;

  return (
    <Page>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/superadmin/dashboard/tenants">
              {t("superadmin_tenant_subscription_history.tenants")}
            </Link>
          </li>
          <li>{tenantInfo.name}</li>
          <li>
            {t("superadmin_tenant_subscription_history.subscription_history")}
          </li>
        </ul>
      </div>

      <form
        onSubmit={saveSubscription}
        className="mt-6 border rounded-3xl px-5 py-6 border-apax-border-green"
      >
        <p className="text-xl font-bold mb-4">
          {t("superadmin_tenant_subscription_history.set_subscription")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-apax-text block mb-1">
              {t("superadmin_tenant_subscription_history.starts_on_label")}
            </label>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-apax-text block mb-1">
              {t("superadmin_tenant_subscription_history.expires_on_label")}
            </label>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
            />
          </div>
        </div>
        <label className="label cursor-pointer justify-start gap-3 mt-4">
          <input
            type="checkbox"
            className="checkbox checkbox-success"
            checked={licenseActive}
            onChange={(e) => setLicenseActive(e.target.checked)}
          />
          <span className="label-text">
            {t("superadmin_tenant_subscription_history.tenant_active_label")}
          </span>
        </label>
        <button type="submit" className="btn btn-primary mt-4">
          {t("superadmin_tenant_subscription_history.save_subscription")}
        </button>
      </form>

      <div className="flex flex-col lg:flex-row gap-4 mt-6">
        <div className="w-full lg:w-4/12 border rounded-3xl px-5 py-6 border-apax-border-green ">
          <p className="text-xl font-bold">
            {t("superadmin_tenant_subscription_history.tenant_details")}
          </p>

          <p className="mt-4 text-sm text-apax-text">
            {t("superadmin_tenant_subscription_history.tenant_name")}
          </p>
          <p>{tenantInfo.name}</p>

          <p className="mt-4 text-sm text-apax-text">
            {t("superadmin_tenant_subscription_history.status")}
          </p>
          {tenantInfo.is_active == 1 && (
            <div className="w-fit flex items-center justify-center text-sm rounded-full  text-apax-green-dark">
              <IconCheck className="text-apax-green" stroke={iconStroke} />{" "}
              {t("superadmin_tenant_subscription_history.active")}
            </div>
          )}
          {tenantInfo.is_active == 0 && (
            <div className="w-fit flex items-center justify-center text-sm rounded-full  text-apax-green-dark">
              <IconX className="text-red-500" stroke={iconStroke} />{" "}
              {t("superadmin_tenant_subscription_history.inactive")}
            </div>
          )}

          <p className="mt-4 text-sm text-gray-500">
            {t("superadmin_tenant_subscription_history.users")}
          </p>
          <p>
            {totalUsers} {t("superadmin_tenant_subscription_history.users")}
          </p>

          <p className="mt-4 text-sm text-gray-500">
            {t("superadmin_tenant_subscription_history.address")}
          </p>
          <p>{storeDetails?.address}</p>

          <div className="flex">
            <div className="flex-1">
              <p className="mt-4 text-sm text-gray-500">
                {t("superadmin_tenant_subscription_history.email")}
              </p>
              <p>{storeDetails?.email}</p>
            </div>

            <div className="flex-1">
              <p className="mt-4 text-sm text-gray-500">
                {t("superadmin_tenant_subscription_history.phone")}
              </p>
              <p>{storeDetails?.phone}</p>
            </div>
          </div>

          <div className="flex">
            <div className="flex-1">
              <p className="mt-4 text-sm text-gray-500">
                {t("superadmin_tenant_subscription_history.currency")}
              </p>
              <p>{storeDetails?.currency}</p>
            </div>

            <div className="flex-1">
              <p className="mt-4 text-sm text-gray-500">
                {t("superadmin_tenant_subscription_history.qr_menu")}
              </p>
              <p>
                {storeDetails?.is_qr_menu_enabled
                  ? t("superadmin_tenant_subscription_history.enabled")
                  : t("superadmin_tenant_subscription_history.disabled")}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-8/12 border rounded-3xl px-5 py-6 border-apax-green">
          <p className="text-xl font-bold">
            {t("superadmin_tenant_subscription_history.payment_history")}
          </p>

          <div className="flex flex-col gap-4 mt-4">
            {subscriptionHistory.map((item, i) => {
              const { id, created_at, starts_on, expires_on, status } = item;

              return (
                <div key={id || i} className="flex items-center gap-4 w-full">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center">
                    <IconCreditCard stroke={iconStroke} />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between w-full gap-1">
                      <p className="text-lg">
                        <span className="font-bold">
                          {t(
                            "superadmin_tenant_subscription_history.subscription_price",
                            { price: subscriptionPrice }
                          )}
                        </span>
                      </p>
                      <div
                        className={`text-xs font-semibold py-1 px-3 rounded-full w-20 sm:w-18 text-center ${
                          status === "cancelled"
                            ? "bg-red-100 text-red-500 border border-red-500"
                            : status === "created"
                            ? "bg-green-100 text-green-500 border border-green-500"
                            : "bg-blue-100 text-blue-500 border border-blue-500"
                        }`}
                      >
                        {status === "cancelled"
                          ? t("superadmin_tenant_subscription_history.cancelled")
                          : status === "created"
                          ? t("superadmin_tenant_subscription_history.created")
                          : t("superadmin_tenant_subscription_history.renewed")}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 md:gap-8">
                      <p className="text-xs text-gray-500">
                        {status === "cancelled"
                          ? t(
                              "superadmin_tenant_subscription_history.cancelled_on"
                            )
                          : t("superadmin_tenant_subscription_history.paid_on")}
                        <br />
                        {new Date(created_at).toLocaleString("en", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t(
                          "superadmin_tenant_subscription_history.billing_period"
                        )}{" "}
                        <br />
                        {starts_on
                          ? new Date(starts_on).toLocaleDateString()
                          : "—"}
                        -
                        {expires_on
                          ? new Date(expires_on).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Page>
  );
}
