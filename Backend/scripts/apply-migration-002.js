require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function main() {
  const sqlPath = path.join(__dirname, "..", "migrations", "002_store_service_charge_inventory_recipes.sql");
  const raw = fs.readFileSync(sqlPath, "utf8");
  const withoutComments = raw
    .split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n");
  const statements = withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      console.log("OK:", stmt.split(/\s+/).slice(0, 4).join(" "));
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME" || e.errno === 1060) {
        console.log("Skip (column exists):", stmt.slice(0, 60));
      } else if (e.code === "ER_TABLE_EXISTS_ERROR" || e.errno === 1050) {
        console.log("Skip (table exists):", stmt.slice(0, 60));
      } else {
        throw e;
      }
    }
  }
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
