const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");

const target = (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");
if (!target || /^mysql:/i.test(target)) {
  console.log("init-db: DATABASE_URL must be a file path, skipping");
  process.exit(0);
}
fs.mkdirSync(path.dirname(target), { recursive: true });
const db = new Database(target);
const has = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='superadmins'").get();
if (has) {
  console.log("init-db: database already initialised");
  process.exit(0);
}

const sql = fs.readFileSync(path.resolve(__dirname, "../restropro_saas.sql"), "utf8");
const re = /CREATE TABLE `(\w+)` \(\r?\n([\s\S]*?)\r?\n\) ENGINE[^;]*;/g;
let m, ok = 0, failed = 0;
db.pragma("foreign_keys = OFF");
while ((m = re.exec(sql))) {
  const name = m[1];
  const cols = [];
  let pk = null, hasAuto = false;
  for (const line of m[2].split(/\r?\n/)) {
    let l = line.trim().replace(/,$/, "");
    if (!l) continue;
    if (/^(KEY|UNIQUE KEY|FULLTEXT KEY|SPATIAL KEY|CONSTRAINT|CHECK)\b/i.test(l)) continue;
    if (/^PRIMARY KEY/i.test(l)) { pk = l; continue; }
    if (/AUTO_INCREMENT/i.test(l)) {
      const cn = l.match(/^`(\w+)`/)[1];
      l = "`" + cn + "` INTEGER PRIMARY KEY AUTOINCREMENT";
      hasAuto = true;
    } else {
      l = l
        .replace(/\s(CHARACTER SET|CHARSET)\s+\w+/gi, "")
        .replace(/\sCOLLATE\s+\w+/gi, "")
        .replace(/\sON UPDATE CURRENT_TIMESTAMP(\(\d*\))?/gi, "")
        .replace(/\sCOMMENT\s+'(?:[^'\\]|\\.|'')*'/gi, "")
        .replace(/\s(unsigned|zerofill)/gi, "")
        .replace(/\b(enum|set)\s*\([^)]*\)/gi, "varchar(255)");
    }
    cols.push(l);
  }
  if (!hasAuto && pk) cols.push(pk);
  try {
    db.exec("CREATE TABLE `" + name + "` (\n" + cols.join(",\n") + "\n)");
    ok++;
  } catch (e) {
    failed++;
    console.log("init-db: FAILED table", name, "-", e.message);
  }
}
console.log("init-db: tables created:", ok, "failed:", failed);

try {
  const hash = bcrypt.hashSync("SuperAdmin@123", 10);
  db.prepare("INSERT INTO superadmins (email, password, name) VALUES (?, ?, ?)")
    .run("superadmin@restropro.local", hash, "Super Admin");
  console.log("init-db: superadmin created");
} catch (e) {
  console.log("init-db: superadmin insert failed -", e.message);
}
db.close();
