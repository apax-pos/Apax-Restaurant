import React, { useEffect, useMemo, useState } from "react";
import Page from "../../components/Page";
import { Link } from "react-router-dom";
import {
  useSuperAdminSubscriptionOfferSettings,
  patchSubscriptionOfferSettings,
} from "../../controllers/superadmin.controller";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { mutate } from "swr";
import {
  IconCheck,
  IconInfoCircleFilled,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { iconStroke } from "../../config/config";

function formatPreviewDisplay(sym, raw) {
  const s = (sym || "$").trim() || "$";
  if (raw === "" || raw == null) return `${s}—`;
  const n = Number(raw);
  if (Number.isNaN(n)) return `${s}—`;
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
  return `${s}${shown}`;
}

function stripeReady(id) {
  const x = (id || "").trim();
  return /^price_[a-zA-Z0-9]+$/.test(x);
}

export default function SuperAdminSubscriptionOfferPage() {
  const { t } = useTranslation();
  const { data, error, isLoading, APIURL } =
    useSuperAdminSubscriptionOfferSettings();

  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [displayMonthly, setDisplayMonthly] = useState("");
  const [displayYearly, setDisplayYearly] = useState("");
  const [stripeMonthly, setStripeMonthly] = useState("");
  const [stripeYearly, setStripeYearly] = useState("");

  useEffect(() => {
    const row = data?.data;
    if (!row) return;
    setCurrencySymbol(row.currency_symbol || "$");
    setDisplayMonthly(
      row.display_amount_monthly != null ? String(row.display_amount_monthly) : ""
    );
    setDisplayYearly(
      row.display_amount_yearly != null ? String(row.display_amount_yearly) : ""
    );
    setStripeMonthly(row.stripe_price_id_monthly || "");
    setStripeYearly(row.stripe_price_id_yearly || "");
  }, [data]);

  const monthlyPreview = useMemo(
    () => formatPreviewDisplay(currencySymbol, displayMonthly),
    [currencySymbol, displayMonthly]
  );
  const yearlyPreview = useMemo(
    () => formatPreviewDisplay(currencySymbol, displayYearly),
    [currencySymbol, displayYearly]
  );

  async function onSave(e) {
    e.preventDefault();
    try {
      toast.loading(t("superadmin_subscription_offer.saving"));
      const res = await patchSubscriptionOfferSettings({
        currency_symbol: currencySymbol,
        display_amount_monthly: displayMonthly === "" ? null : displayMonthly,
        display_amount_yearly: displayYearly === "" ? null : displayYearly,
        stripe_price_id_monthly: stripeMonthly.trim() || null,
        stripe_price_id_yearly: stripeYearly.trim() || null,
      });
      toast.dismiss();
      if (res.status === 200) {
        toast.success(
          res.data?.message || t("superadmin_subscription_offer.saved")
        );
        await mutate(APIURL);
      }
    } catch (err) {
      toast.dismiss();
      toast.error(
        err?.response?.data?.message ||
          t("superadmin_subscription_offer.failed")
      );
    }
  }

  if (isLoading) {
    return (
      <Page className="px-4 py-3 overflow-x-hidden min-h-full">
        <p className="mt-6 text-apax-text">
          {t("superadmin_reports.loading_message")}
        </p>
      </Page>
    );
  }

  if (error) {
    console.error(error);
    return (
      <Page className="px-4 py-3 overflow-x-hidden min-h-full">
        <div className="breadcrumbs text-sm">
          <ul>
            <li>
              <Link to="/superadmin/dashboard/home">
                {t("superadmin_subscription_offer.breadcrumb_home")}
              </Link>
            </li>
            <li>{t("superadmin_subscription_offer.breadcrumb_current")}</li>
          </ul>
        </div>
        <div className="mt-8 border border-apax-border-green rounded-3xl px-6 py-8 max-w-xl bg-apax-card-bg">
          <p className="font-bold text-lg text-apax-text">
            {t("superadmin_reports.error_message")}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {error?.response?.data?.message || error?.message}
          </p>
          <Link
            to="/superadmin/dashboard/home"
            className="btn btn-outline btn-sm mt-6 border-apax-border-green"
          >
            {t("superadmin_subscription_offer.breadcrumb_home")}
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page className="px-4 sm:px-6 py-4 md:py-6 overflow-x-hidden min-h-full">
      <div className="max-w-7xl mx-auto w-full pb-12">
        <div className="border-b border-apax-border-green/50 pb-4 mb-1">
          <div className="breadcrumbs text-sm">
            <ul>
              <li>
                <Link
                  to="/superadmin/dashboard/home"
                  className="hover:text-apax-green transition-colors"
                >
                  {t("superadmin_subscription_offer.breadcrumb_home")}
                </Link>
              </li>
              <li className="text-apax-text font-medium">
                {t("superadmin_subscription_offer.breadcrumb_current")}
              </li>
            </ul>
          </div>
        </div>

        <h3 className="text-2xl md:text-3xl mt-5 font-bold text-apax-text tracking-tight">
          {t("superadmin_subscription_offer.title")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-3xl leading-relaxed">
          {t("superadmin_subscription_offer.section_preview_hint")}
        </p>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 mt-8">
        <div className="xl:col-span-5 flex flex-col gap-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-apax-green">
            {t("superadmin_subscription_offer.section_preview")}
          </p>

          <div className="rounded-[42px] border px-6 py-7 md:px-8 md:py-8 border-apax-border-green bg-apax-card-bg flex flex-col gap-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] dark:shadow-none dark:border-apax-border-green">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-apax-text flex items-center gap-1.5">
                <IconCalendarEvent stroke={iconStroke} size={18} />
                {t("inactive_subscription.price_per_month")}
              </span>
              {stripeReady(stripeMonthly) ? (
                <span className="text-xs font-semibold py-1 px-2.5 rounded-full bg-green-100 text-green-700 border border-green-500 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600">
                  {t("superadmin_subscription_offer.stripe_ready")}
                </span>
              ) : (
                <span className="text-xs font-semibold py-1 px-2.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700">
                  {t("superadmin_subscription_offer.stripe_missing")}
                </span>
              )}
            </div>
            <p className="text-5xl font-black text-apax-green leading-tight">
              {monthlyPreview}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("superadmin_subscription_offer.per_month")}
            </p>
          </div>

          <div className="rounded-[42px] border px-6 py-7 md:px-8 md:py-8 border-apax-border-green/40 bg-apax-superadmin-widget-bg flex flex-col gap-4 text-white shadow-[0_8px_30px_-12px_rgba(36,57,34,0.35)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-apax-superadmin-text-green flex items-center gap-1.5">
                <IconCalendarEvent stroke={iconStroke} size={18} />
                {t("inactive_subscription.price_per_year")}
              </span>
              {stripeReady(stripeYearly) ? (
                <span className="text-xs font-semibold py-1 px-2.5 rounded-full bg-white/15 text-white border border-white/30">
                  {t("superadmin_subscription_offer.stripe_ready")}
                </span>
              ) : (
                <span className="text-xs font-semibold py-1 px-2.5 rounded-full bg-black/20 text-apax-superadmin-text-green border border-white/20">
                  {t("superadmin_subscription_offer.stripe_missing")}
                </span>
              )}
            </div>
            <p className="text-5xl font-black text-white leading-tight">
              {yearlyPreview}
            </p>
            <p className="text-sm text-apax-superadmin-text-green">
              {t("superadmin_subscription_offer.per_year")}
            </p>
          </div>
        </div>

        <div className="xl:col-span-7">
          <form
            onSubmit={onSave}
            className="border rounded-3xl px-5 py-6 md:px-8 md:py-9 border-apax-border-green bg-apax-card-bg h-full shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] dark:shadow-none"
          >
            <p className="text-xl font-bold text-apax-text mb-5">
              {t("superadmin_subscription_offer.section_form")}
            </p>

            <div
              role="note"
              className="rounded-2xl border border-apax-border-green/80 bg-apax-border-green-light dark:bg-apax-bg-hover-dark-mode px-4 py-3.5 flex gap-3 mb-7"
            >
              <IconInfoCircleFilled
                className="shrink-0 text-apax-green mt-0.5"
                size={22}
                stroke={iconStroke}
              />
              <p className="text-sm text-apax-text leading-relaxed">
                {t("superadmin_subscription_offer.help_stripe")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="text-sm text-apax-text block mb-1">
                  {t("superadmin_subscription_offer.currency_symbol")}
                </label>
                <input
                  className="input input-bordered w-full max-w-[140px]"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  maxLength={8}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm text-apax-text block mb-1">
                  {t("superadmin_subscription_offer.monthly_display")}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input input-bordered w-full"
                  value={displayMonthly}
                  onChange={(e) => setDisplayMonthly(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                <label className="text-sm text-apax-text block mb-1">
                  {t("superadmin_subscription_offer.yearly_display")}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input input-bordered w-full"
                  value={displayYearly}
                  onChange={(e) => setDisplayYearly(e.target.value)}
                  placeholder="50"
                />
              </div>
            </div>

            <div className="divider my-6 before:bg-apax-border-green after:bg-apax-border-green" />

            <div>
              <label className="text-sm text-apax-text block mb-1">
                {t("superadmin_subscription_offer.monthly_stripe_price_id")}
              </label>
              <input
                className="input input-bordered w-full font-mono text-sm"
                value={stripeMonthly}
                onChange={(e) => setStripeMonthly(e.target.value)}
                placeholder="price_..."
              />
            </div>

            <div className="mt-4">
              <label className="text-sm text-apax-text block mb-1">
                {t("superadmin_subscription_offer.yearly_stripe_price_id")}
              </label>
              <input
                className="input input-bordered w-full font-mono text-sm"
                value={stripeYearly}
                onChange={(e) => setStripeYearly(e.target.value)}
                placeholder="price_..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-9 pt-2 border-t border-apax-border-green/30">
              <button type="submit" className="btn btn-primary rounded-full px-8 min-h-[3rem]">
                <IconCheck stroke={iconStroke} size={20} className="mr-1" />
                {t("superadmin_subscription_offer.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </Page>
  );
}
