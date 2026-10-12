const Database = require('better-sqlite3');
const db = new Database('e:/Apex/codecanyon-52806377-restropro-saas-pos-software-for-restaurant-cafe-hotel-food-truck/main_files/code/apaxsaas.db');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='refresh_tokens'").get();
console.log(schema.sql);
