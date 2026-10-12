/**
 * Apply numbered SQL migrations in order (idempotent where possible).
 * Usage: node scripts/apply-migrations.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function runFile(conn, filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const withoutComments = raw
    .split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n");
  const statements = withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      console.log("OK:", path.basename(filePath), stmt.split(/\s+/).slice(0, 5).join(" "));
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME" || e.errno === 1060) {
        console.log("Skip (column exists):", path.basename(filePath));
      } else if (e.code === "ER_TABLE_EXISTS_ERROR" || e.errno === 1050) {
        console.log("Skip (table exists):", path.basename(filePath));
      } else {
        throw e;
      }
    }
  }
}

async function main() {
  const dir = path.join(__dirname, "..", "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  for (const f of files) {
    await runFile(conn, path.join(dir, f));
  }
  await conn.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
