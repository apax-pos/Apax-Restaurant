import Page from "../components/Page";
import {
  BRAND_LOGO_URL,
  stripeProductSubscriptionId,
  subscriptionAmount,
} from "../config/config";
import React from "react";
import {
  getStripeSubscriptionURL,
  useTenantSubscriptionOffer,
} from "../controllers/auth.controller";
import { toast } from "react-hot-toast";
import { getUserDetailsInLocalStorage } from "../helpers/UserDetails";
import AppBarDropdown from "../components/AppBarDropdown";
import { useTranslation } from "react-i18next";

function formatPrice(currencySymbol, amount) {
  const sym = currencySymbol || "$";
  if (amount == null || Number.isNaN(Number(amount))) return `${sym}${subscriptionAmount}`;
  const n = Number(amount);
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
  return `${sym}${shown}`;
}

export default function InActiveSubscriptionPage() {
  const { t } = useTranslation();
  const user = getUserDetailsInLocalStorage();
  const { offer, error: offerError, isLoading: offerLoading } =
    useTenantSubscriptionOffer();

  const monthlyStripeId =
    offer?.monthly?.stripePriceId || stripeProductSubscriptionId || null;
  const yearlyStripeId = offer?.yearly?.stripePriceId || null;
  const sym = offer?.currencySymbol || "$";
  const monthlyDisplay = formatPrice(
    sym,
    offer?.monthly?.displayAmount != null ? offer.monthly.displayAmount : null
  );
  const yearlyDisplay =
    offer?.yearly?.displayAmount != null
      ? formatPrice(sym, offer.yearly.displayAmount)
      : null;

  const subscribe = async (priceId) => {
    if (!priceId) {
      toast.error(t("inactive_subscription.checkout_not_configured"));
      return;
    }
    toast.loading(t("loading_message"));
    try {
      const res = await getStripeSubscriptionURL(priceId);
      toast.dismiss();

      if (res.status == 200) {
        const data = res.data;
        window.location.href = data.url;
      }
    } catch (error) {
      const message = error?.response?.data?.message || t("error_message");
      console.error(error);
      toast.dismiss();
      toast.error(message);
    }
  };

  const featureList = (
    <ul className="text-gray-700 dark:text-white mt-6 flex flex-col gap-2 text-start">
      <li>{t("inactive_subscription.features.unlimited_orders")}</li>
      <li>{t("inactive_subscription.features.monthly_renewals")}</li>
      <li>{t("inactive_subscription.features.unlimited_devices")}</li>
      <li>{t("inactive_subscription.features.live_kitchen_orders")}</li>
    </ul>
  );

  return (
    <Page className="">
      <div className="flex items-center justify-between px-4 py-3 border-b border-apax-gray">
        <img src={BRAND_LOGO_URL} alt="logo" className="h-12 block" />
        <AppBarDropdown />
      </div>

      {user?.role == "admin" ? (
        <>
          <h3 className="mt-4 text-center px-4">
            {t("inactive_subscription.no_active_subscription_admin")}
          </h3>
          {offerLoading ? (
            <p className="text-center mt-10">{t("inactive_subscription.loading_plans")}</p>
          ) : offerError ? (
            <p className="text-center mt-10 text-red-600">
              {t("inactive_subscription.plans_load_error")}
            </p>
          ) : (
            <div className="w-full container mx-auto grid grid-cols-1 lg:grid-cols-2 my-20 gap-10 place-items-center px-6 lg:px-0 max-w-4xl">
              <div className="rounded-2xl px-8 py-6 border border-apax-border-green flex flex-col w-full lg:w-96">
                <h3 className="text-4xl text-green-700 font-bold text-center">
                  {monthlyDisplay}
                </h3>
                <h3 className="font-bold text-2xl text-center">
                  {t("inactive_subscription.price_per_month")}
                </h3>
                {featureList}
                <button
                  type="button"
                  onClick={() => subscribe(monthlyStripeId)}
                  className="rounded-full bg-apax-green text-white px-4 py-3 transition active:scale-95 hover:bg-apax-green-button-hover mt-6"
                >
                  {t("inactive_subscription.subscribe_monthly")}
                </button>
              </div>

              {yearlyStripeId ? (
                <div className="rounded-2xl px-8 py-6 border border-apax-border-green flex flex-col w-full lg:w-96">
                  <h3 className="text-4xl text-green-700 font-bold text-center">
                    {yearlyDisplay || t("inactive_subscription.yearly_plan")}
                  </h3>
                  <h3 className="font-bold text-2xl text-center">
                    {t("inactive_subscription.price_per_year")}
                  </h3>
                  {featureList}
                  <button
                    type="button"
                    onClick={() => subscribe(yearlyStripeId)}
                    className="rounded-full bg-apax-green text-white px-4 py-3 transition active:scale-95 hover:bg-apax-green-button-hover mt-6"
                  >
                    {t("inactive_subscription.subscribe_yearly")}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <div>
          <h3 className="mt-4 text-center">
            {t("inactive_subscription.no_active_subscription_user")}
          </h3>
        </div>
      )}
    </Page>
  );
}
