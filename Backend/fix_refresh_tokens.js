const Database = require('better-sqlite3');
const db = new Database('e:/Apex/codecanyon-52806377-restropro-saas-pos-software-for-restaurant-cafe-hotel-food-truck/main_files/code/apaxsaas.db');

db.transaction(() => {
    // 1. Rename existing table
    db.prepare("ALTER TABLE refresh_tokens RENAME TO refresh_tokens_old").run();

    // 2. Create new table with AUTOINCREMENT
    db.prepare(`
        CREATE TABLE refresh_tokens (
            device_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username varchar(255) NOT NULL,
            refresh_token varchar(500) NOT NULL,
            device_ip varchar(50) DEFAULT NULL,
            device_name varchar(255) DEFAULT NULL,
            device_location varchar(255) DEFAULT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            expiry TEXT DEFAULT NULL,
            tenant_id int(11) DEFAULT NULL
        )
    `).run();

    // 3. Copy data back
    // We skip device_id to let it auto-generate, or copy it if we want to keep existing IDs
    db.prepare(`
        INSERT INTO refresh_tokens (device_id, username, refresh_token, device_ip, device_name, device_location, created_at, expiry, tenant_id)
        SELECT device_id, username, refresh_token, device_ip, device_name, device_location, created_at, expiry, tenant_id FROM refresh_tokens_old
    `).run();

    // 4. Drop old table
    db.prepare("DROP TABLE refresh_tokens_old").run();
})();

console.log("refresh_tokens table updated with AUTOINCREMENT device_id");
