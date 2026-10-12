const { ensureSubscriptionOfferSettingsTable } = require("./ensureSubscriptionOfferSettings");
const { ensureOperationalTables } = require("./ensureOperationalTables");
const { ensureExtendedModules } = require("./ensureExtendedModules");
const { extendedTablesPresent } = require("../utils/schemaGuard");

let ready = false;
let pending = null;

async function runStep(label, fn) {
  try {
    await fn();
    console.log(`schema ${label}: OK`);
    return true;
  } catch (err) {
    console.error(`schema ${label} failed:`, err.message);
    return false;
  }
}

/**
 * Idempotent schema bootstrap (SQLite tables/columns).
 * Never throws — logs failures so API handlers can still run core features.
 */
async function ensureSchemaReady() {
  if (ready) return;

  if (!pending) {
    pending = (async () => {
      await runStep("subscription", ensureSubscriptionOfferSettingsTable);
      await runStep("operational", ensureOperationalTables);
      await runStep("extended", ensureExtendedModules);

      const extendedOk = await extendedTablesPresent();
      if (!extendedOk) {
        console.error(
          "schema: extended tables still missing — check SQLite file permissions and recycle IIS app pool"
        );
      }
      ready = true;
    })().finally(() => {
      pending = null;
    });
  }

  return pending;
}

function isSchemaReady() {
  return ready;
}

function resetSchemaReadyCache() {
  ready = false;
  pending = null;
}

module.exports = { ensureSchemaReady, isSchemaReady, resetSchemaReadyCache };
