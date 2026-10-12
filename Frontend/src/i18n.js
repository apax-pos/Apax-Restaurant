import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLanguage } from "./helpers/LocalizationHelper";

// All locales bundled at build time — avoids PWA / IIS serving stale /locales/*.json
import en from "../public/locales/en/translation.json";
import ar from "../public/locales/ar/translation.json";
import es from "../public/locales/es/translation.json";
import fr from "../public/locales/fr/translation.json";
import hi from "../public/locales/hi/translation.json";
import ja from "../public/locales/ja/translation.json";
import ko from "../public/locales/ko/translation.json";

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  es: { translation: es },
  fr: { translation: fr },
  hi: { translation: hi },
  ja: { translation: ja },
  ko: { translation: ko },
};

const lng = getLanguage() || "en";
const resolvedLng = resources[lng] ? lng : "en";

i18n.use(initReactI18next).init({
  lng: resolvedLng,
  fallbackLng: "en",
  supportedLngs: Object.keys(resources),
  nonExplicitSupportedLngs: true,
  returnEmptyString: false,
  returnNull: false,
  ns: ["translation"],
  defaultNS: "translation",
  resources,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
    bindI18n: "languageChanged loaded",
    bindI18nStore: "added removed",
  },
});

document.documentElement.setAttribute("dir", i18n.dir(i18n.language));

export default i18n;
