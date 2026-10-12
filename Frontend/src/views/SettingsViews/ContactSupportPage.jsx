import React from "react";
import Page from "../../components/Page";
import { IconCopy, IconMail, IconPhone } from "@tabler/icons-react";
import { iconStroke, supportEmail, supportPhone, supportPhoneTel } from "../../config/config";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function ContactSupportPage() {
  const { t } = useTranslation();
  const ct = (key, fallback) => t(key, { defaultValue: fallback });

  const copy = (value) => {
    navigator.clipboard.writeText(value);
    toast.success(ct("contact_support.copied_to_clipboard", "Copied to clipboard!"));
  };

  return (
    <Page>
      <h3>{ct("contact_support.title", "Contact Support")}</h3>
      <p className="mt-2 text-apax-text opacity-80 max-w-xl">
        {ct("contact_support.subtitle", "Reach Apax POS support by email or phone.")}
      </p>

      <div className="mt-8 grid gap-4 w-full lg:max-w-lg">
        <div className="rounded-2xl border border-apax-border-green bg-apax-gray p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-apax-green/15 p-3 text-apax-green">
              <IconMail stroke={iconStroke} size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm opacity-70">{ct("contact_support.email_label", "Email")}</p>
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
                {ct("contact_support.copy", "Copy")}
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
              <p className="text-sm opacity-70">{ct("contact_support.phone_label", "Phone")}</p>
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
                {ct("contact_support.copy", "Copy")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
