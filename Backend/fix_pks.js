const Database = require('better-sqlite3');
const db = new Database('../apaxsaas.db');

function fixTable(tableName, newCreateSql, dedupCols = null) {
    console.log(`Fixing table: ${tableName}`);
    db.exec(`PRAGMA foreign_keys=OFF;`);
    try {
        db.exec(`BEGIN TRANSACTION;`);
        
        const oldExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(`${tableName}_old`);
        if (oldExists) {
            db.exec(`DROP TABLE "${tableName}_old";`);
        }

        db.exec(`ALTER TABLE "${tableName}" RENAME TO "${tableName}_old";`);
        db.exec(newCreateSql);
        
        const oldCols = db.prepare(`PRAGMA table_info("${tableName}_old")`).all().map(c => c.name);
        const newCols = db.prepare(`PRAGMA table_info("${tableName}")`).all().map(c => c.name);
        
        const commonCols = oldCols.filter(c => newCols.includes(c));
        const colString = commonCols.map(c => `"${c}"`).join(', ');
        
        if (commonCols.length > 0) {
            let selectSql = `SELECT ${colString} FROM "${tableName}_old"`;
            if (dedupCols) {
                selectSql += ` GROUP BY ${dedupCols.map(c => `"${c}"`).join(', ')}`;
            }
            
            console.log(`Copying columns: ${colString}${dedupCols ? ` (dedup on ${dedupCols.join(',')})` : ''}`);
            db.exec(`INSERT OR IGNORE INTO "${tableName}" (${colString}) ${selectSql};`);
        } else {
            console.log(`No common columns for ${tableName}, skipping data copy.`);
        }

        db.exec(`DROP TABLE "${tableName}_old";`);
        db.exec(`COMMIT;`);
        console.log(`Successfully fixed ${tableName}`);
    } catch (err) {
        if (db.inTransaction) db.exec(`ROLLBACK;`);
        console.error(`Failed to fix ${tableName}:`, err.message);
    }
}

// 1. Categories
fixTable('categories', `
CREATE TABLE "categories" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "title" varchar(100) DEFAULT NULL,
  "is_enabled" tinyint(1) NOT NULL DEFAULT '1',
  "tenant_id" int(11) DEFAULT NULL
);
`);

// 2. Customers
fixTable('customers', `
CREATE TABLE "customers" (
  "phone" varchar(20) NOT NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) DEFAULT NULL,
  "birth_date" TEXT DEFAULT NULL,
  "gender" TEXT DEFAULT NULL,
  "is_member" tinyint(1) DEFAULT '0',
  "created_at" TEXT DEFAULT "datetime('now')",
  "update_at" TEXT DEFAULT "datetime('now')",
  "tenant_id" int(11) NOT NULL,
  PRIMARY KEY ("phone", "tenant_id")
);
`, ['phone', 'tenant_id']);

// 3. Invoices
fixTable('invoices', `
CREATE TABLE "invoices" (
  "id" int(11) NOT NULL,
  "sub_total" decimal(10,2) DEFAULT NULL,
  "tax_total" decimal(10,2) DEFAULT NULL,
  "service_charge_total" decimal(10,2) DEFAULT NULL,
  "total" decimal(10,2) DEFAULT NULL,
  "created_at" datetime DEFAULT CURRENT_TIMESTAMP,
  "payment_type_id" int(11) DEFAULT NULL,
  "tenant_id" int(11) NOT NULL,
  PRIMARY KEY ("id", "tenant_id")
);
`, ['id', 'tenant_id']);

// 4. Invoice Sequences
fixTable('invoice_sequences', `
CREATE TABLE "invoice_sequences" (
  "sequence_no" int(11) DEFAULT '0',
  "tenant_id" int(11) NOT NULL,
  PRIMARY KEY ("tenant_id")
);
`);

// 5. Token Sequences
fixTable('token_sequences', `
CREATE TABLE "token_sequences" (
  "sequence_no" int(11) DEFAULT '0',
  "last_updated" datetime DEFAULT CURRENT_TIMESTAMP,
  "tenant_id" int(11) NOT NULL,
  PRIMARY KEY ("tenant_id")
);
`);

// 6. Reset Password Tokens
fixTable('reset_password_tokens', `
CREATE TABLE "reset_password_tokens" (
  "username" varchar(255) NOT NULL,
  "reset_token" varchar(255) NOT NULL,
  "expires_at" datetime NOT NULL,
  PRIMARY KEY ("username")
);
`);

// 7. Subscription Offer Settings
fixTable('subscription_offer_settings', `
CREATE TABLE "subscription_offer_settings" (
  "id" INTEGER PRIMARY KEY,
  "stripe_price_id_monthly" varchar(255) DEFAULT NULL,
  "stripe_price_id_yearly" varchar(255) DEFAULT NULL,
  "display_amount_monthly" decimal(10,2) DEFAULT NULL,
  "display_amount_yearly" decimal(10,2) DEFAULT NULL,
  "currency_symbol" varchar(8) NOT NULL DEFAULT '$',
  "updated_at" datetime DEFAULT CURRENT_TIMESTAMP
);
`, ['id']);
