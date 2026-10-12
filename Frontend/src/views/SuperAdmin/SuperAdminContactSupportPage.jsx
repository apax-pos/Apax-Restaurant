import React from "react";
import { IconCopy, IconMail, IconPhone } from "@tabler/icons-react";
import { iconStroke, supportEmail, supportPhone, supportPhoneTel } from "../../config/config";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function SuperAdminContactSupportPage() {
  const { t } = useTranslation();

  const copy = (value) => {
    navigator.clipboard.writeText(value);
    toast.success(t("superadmin_contact_support.copied_to_clipboard"));
  };

  return (
    <div className="w-full">
      <h3>{t("superadmin_contact_support.title")}</h3>
      <p className="mt-2 text-apax-text opacity-80 max-w-xl">
        {t("superadmin_contact_support.subtitle")}
      </p>

      <div className="mt-8 grid gap-4 w-full lg:max-w-lg">
        <div className="rounded-2xl border border-apax-border-green bg-apax-gray p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-apax-green/15 p-3 text-apax-green">
              <IconMail stroke={iconStroke} size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm opacity-70">{t("superadmin_contact_support.email_label")}</p>
              <a
                href={`mailto:${supportEmail}`}
                className="text-lg font-semibold text-apax-green break-all hover:underline"
              >
                {supportEmail}
              </a>
              <button
                type="button"
                onClick={() => copy(supportEmail)}
                className="btn btn-sm mt-3 rounded-full"
              >
                <IconCopy size={18} stroke={iconStroke} />
                {t("superadmin_contact_support.copy")}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-apax-border-green bg-apax-gray p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-apax-green/15 p-3 text-apax-green">
              <IconPhone stroke={iconStroke} size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm opacity-70">{t("superadmin_contact_support.phone_label")}</p>
              <a
                href={`tel:${supportPhoneTel}`}
                className="text-lg font-semibold text-apax-green hover:underline"
              >
                {supportPhone}
              </a>
              <button
                type="button"
                onClick={() => copy(supportPhone)}
                className="btn btn-sm mt-3 rounded-full"
              >
                <IconCopy size={18} stroke={iconStroke} />
                {t("superadmin_contact_support.copy")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




