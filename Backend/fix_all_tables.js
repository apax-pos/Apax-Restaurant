const Database = require('better-sqlite3');
const db = new Database('e:/Apex/codecanyon-52806377-restropro-saas-pos-software-for-restaurant-cafe-hotel-food-truck/main_files/code/apaxsaas.db');

const tablesToFix = [
    'feedbacks',
    'inventory_items',
    'inventory_logs',
    'menu_items',
    'menu_item_addons',
    'menu_item_recipes',
    'menu_item_variants',
    'orders',
    'order_items',
    'payment_types',
    'qr_orders',
    'qr_order_items',
    'reservations',
    'store_tables',
    'subscription_history',
    'taxes',
    'tenants'
];

db.transaction(() => {
    for (const tableName of tablesToFix) {
        console.log(`Fixing table: ${tableName}...`);
        
        // 1. Get original schema to see columns
        const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
        const columns = tableInfo.map(c => c.name);
        
        // Check if 'id' exists
        if (!columns.includes('id')) {
            console.log(`  Skipping ${tableName}: No 'id' column found.`);
            continue;
        }

        // 2. Rename old table
        db.prepare(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`).run();

        // 3. Create new table with PRIMARY KEY
        const columnDefs = tableInfo.map(c => {
            let type = c.type.toUpperCase();
            // Sanitize types for SQLite
            if (type.startsWith('REAL') || type.startsWith('DECIMAL') || type.startsWith('DOUBLE') || type.startsWith('FLOAT')) {
                type = 'REAL';
            } else if (type.startsWith('INT') || type.startsWith('TINYINT') || type.startsWith('SMALLINT') || type.startsWith('BIGINT')) {
                type = 'INTEGER';
            } else if (type.startsWith('VARCHAR') || type.startsWith('CHAR') || type.startsWith('TEXT')) {
                type = 'TEXT';
            }

            let def = `\`${c.name}\` ${type}`;
            if (c.name === 'id' || c.name === 'device_id') {
                def = `\`${c.name}\` INTEGER PRIMARY KEY AUTOINCREMENT`;
            } else {
                if (c.notnull) def += ' NOT NULL';
                if (c.dflt_value !== null && c.dflt_value !== 'NULL') {
                    // If it's an expression (has parens or is a keyword), wrap it in parens if not already
                    if (c.dflt_value.includes('(') && !c.dflt_value.startsWith('(')) {
                        def += ` DEFAULT (${c.dflt_value})`;
                    } else {
                        def += ` DEFAULT ${c.dflt_value}`;
                    }
                }
            }
            return def;
        }).join(', ');

        const createSql = `CREATE TABLE ${tableName} (${columnDefs})`;
        console.log(`  Running: ${createSql}`);
        db.prepare(createSql).run();

        // 4. Copy data
        const colsStr = columns.map(c => `\`${c}\``).join(', ');
        db.prepare(`INSERT INTO ${tableName} (${colsStr}) SELECT ${colsStr} FROM ${tableName}_old`).run();

        // 5. Drop old table
        db.prepare(`DROP TABLE ${tableName}_old`).run();
        
        console.log(`  Table ${tableName} fixed.`);
    }
})();

console.log("All specified tables fixed with PRIMARY KEY AUTOINCREMENT.");
