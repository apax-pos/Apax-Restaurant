/**
 * Apax Pos — one-time (or repeat-safe) super admin seed.
 * Usage: node scripts/seed-superadmin.js [email] [password]
 * Defaults: superadmin@restropro.local / SuperAdmin@123 (match SQL dump / first login)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
const { CONFIG } = require("../src/config");

const email = process.argv[2] || "superadmin@restropro.local";
const plainPassword = process.argv[3] || "SuperAdmin@123";
const name = process.argv[4] || "Super Admin";

async function main() {
  const rounds = Number.isFinite(CONFIG.PASSWORD_SALT)
    ? CONFIG.PASSWORD_SALT
    : 10;
  const hash = await bcrypt.hash(plainPassword, rounds);
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  await conn.query(
    `INSERT INTO superadmins (email, password, name) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name)`,
    [email, hash, name]
  );
  await conn.end();
  console.log("Super admin OK:", email);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
