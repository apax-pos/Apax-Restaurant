const Database = require('better-sqlite3');
const db = new Database('e:/Apex/codecanyon-52806377-restropro-saas-pos-software-for-restaurant-cafe-hotel-food-truck/main_files/code/apaxsaas.db');
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
    console.log(`--- ${t.name} ---`);
    console.log(t.sql);
}
