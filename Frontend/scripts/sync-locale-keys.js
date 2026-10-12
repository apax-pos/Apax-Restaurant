/**
 * Merge missing keys from en/translation.json into other locale files.
 * Run: node scripts/sync-locale-keys.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../public/locales");
const en = JSON.parse(
  fs.readFileSync(path.join(localesDir, "en/translation.json"), "utf8")
);

const LANGS = ["ar", "es", "fr", "hi", "ja", "ko"];
const SECTIONS = ["dashboard", "navbar", "contact_support"];

function deepMergeMissing(target, source) {
  if (!source || typeof source !== "object") return target;
  if (!target || typeof target !== "object") target = {};
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      target[key] = deepMergeMissing(target[key], source[key]);
    } else if (target[key] === undefined || target[key] === null || target[key] === "") {
      target[key] = source[key];
    }
  }
  return target;
}

for (const lang of LANGS) {
  const filePath = path.join(localesDir, lang, "translation.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  for (const section of SECTIONS) {
    if (!en[section]) continue;
    data[section] = deepMergeMissing(data[section] || {}, en[section]);
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`Updated ${lang}/translation.json`);
}

console.log("Done.");
