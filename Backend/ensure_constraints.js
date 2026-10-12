const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../apaxsaas.db');
const db = new Database(dbPath, { verbose: console.log });

console.log("Fixing constraints...");

const tablesToFix = [
    {
        name: 'store_details',
        unique: ['tenant_id'],
        schema: `CREATE TABLE store_details_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_name TEXT,
            address TEXT,
            phone TEXT,
            email TEXT,
            currency TEXT,
            store_image TEXT,
            unique_id TEXT,
            tenant_id INTEGER UNIQUE,
            is_qr_menu_enabled INTEGER DEFAULT 0,
            unique_qr_code TEXT,
            is_qr_order_enabled INTEGER,
            is_feedback_enabled INTEGER DEFAULT 0,
            service_charge REAL
        )`
    },
    {
        name: 'print_settings',
        unique: ['tenant_id'],
        schema: `CREATE TABLE print_settings_new (
            tenant_id INTEGER PRIMARY KEY,
            page_format TEXT,
            header TEXT,
            footer TEXT,
            show_notes INTEGER,
            is_enable_print INTEGER,
            show_store_details INTEGER,
            show_customer_details INTEGER,
            print_token INTEGER
        )`
    },
    {
        name: 'superadmins',
        unique: ['email'],
        schema: `CREATE TABLE superadmins_new (
            email TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            name TEXT
        )`
    },
    {
        name: 'users',
        unique: ['username', 'tenant_id'],
        schema: `CREATE TABLE users_new (
            username TEXT,
            password TEXT NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'user',
            photo TEXT,
            designation TEXT,
            phone TEXT,
            email TEXT,
            scope TEXT,
            tenant_id INTEGER,
            PRIMARY KEY (username, tenant_id)
        )`
    }
];

// Also create sequences table if it doesn't exist
db.prepare(`CREATE TABLE IF NOT EXISTS sequences (
    tenant_id INTEGER,
    table_name TEXT,
    current_value INTEGER,
    PRIMARY KEY (tenant_id, table_name)
)`).run();

for (const table of tablesToFix) {
    try {
        console.log(`Processing ${table.name}...`);
        
        // Check if unique index already exists
        const indexes = db.prepare(`PRAGMA index_list(${table.name})`).all();
        const hasUnique = indexes.some(idx => idx.unique === 1);
        
        if (hasUnique) {
            console.log(`${table.name} already has a unique index.`);
            continue;
        }

        db.transaction(() => {
            db.prepare(table.schema).run();
            
            // Get columns of original table to copy
            const columns = db.prepare(`PRAGMA table_info(${table.name})`).all().map(c => c.name);
            const columnsNew = db.prepare(`PRAGMA table_info(${table.name}_new)`).all().map(c => c.name);
            
            const commonColumns = columns.filter(c => columnsNew.includes(c));
            const colList = commonColumns.join(', ');
            
            db.prepare(`INSERT INTO ${table.name}_new (${colList}) SELECT ${colList} FROM ${table.name}`).run();
            
            db.prepare(`DROP TABLE ${table.name}`).run();
            db.prepare(`ALTER TABLE ${table.name}_new RENAME TO ${table.name}`).run();
        })();
        
        console.log(`Successfully fixed ${table.name}`);
    } catch (err) {
        console.error(`Failed to fix ${table.name}:`, err.message);
    }
}

console.log("Constraints check complete.");
db.close();
