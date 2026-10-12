const Database = require('better-sqlite3');
const db = new Database('../apaxsaas.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

for (const table of tables) {
    const tableName = table.name;
    const info = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    
    const idCol = info.find(c => c.name.toLowerCase() === 'id');
    if (idCol) {
        if (idCol.pk === 0) {
            console.log(`Table '${tableName}' has 'id' column but NO PRIMARY KEY!`);
        }
    } else {
        // Check if there is ANY primary key
        if (!info.some(c => c.pk > 0)) {
            console.log(`Table '${tableName}' has NO PRIMARY KEY!`);
        }
    }
}
