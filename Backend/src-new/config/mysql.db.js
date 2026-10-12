const { CONFIG } = require("./index");
const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");

let dbPath = CONFIG.DATABASE_URL;
if (typeof dbPath === "string") {
  dbPath = dbPath.trim();
  if (
    (dbPath.startsWith("'") && dbPath.endsWith("'")) ||
    (dbPath.startsWith('"') && dbPath.endsWith('"'))
  ) {
    dbPath = dbPath.slice(1, -1);
  }
}

// Ensure the path is absolute or relative to the right place
// If it's a relative path in .env, we might need to resolve it
if (!path.isAbsolute(dbPath)) {
    dbPath = path.resolve(process.cwd(), dbPath);
}

const db = new Database(dbPath, { verbose: console.log, timeout: 5000 });
db.pragma('journal_mode = WAL'); // Better concurrency
db.pragma('foreign_keys = ON');

// Add MySQL-compatible functions
db.function('NOW', () => new Date().toISOString().slice(0, 19).replace('T', ' '));
db.function('IFNULL', (val, fallback) => (val === null || val === undefined) ? fallback : val);
db.function('AES_ENCRYPT', (data, key) => {
    if (data === null) return null;
    const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(key).slice(0, 16).toString().padEnd(16, '\0'), null);
    return Buffer.concat([cipher.update(String(data)), cipher.final()]);
});
db.function('AES_DECRYPT', (data, key) => {
    if (data === null) return null;
    try {
        const decipher = crypto.createDecipheriv('aes-128-ecb', Buffer.from(key).slice(0, 16).toString().padEnd(16, '\0'), null);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString();
    } catch (e) {
        return null;
    }
});

console.log(`SQLite Database Connected: ${dbPath}`);

class SQLiteConnection {
    constructor(db) {
        this.db = db;
        this.config = {}; // Mock config object for compatibility
        /** Serialize all DB ops: shared better-sqlite3 handle + async handlers must not interleave BEGIN/INSERT/COMMIT. */
        this._queue = Promise.resolve();
    }

    _enqueue(op) {
        const p = this._queue.then(() => op());
        this._queue = p.catch(() => {});
        return p;
    }

    async query(sql, params = []) {
        return this._enqueue(() => this._queryImpl(sql, params));
    }

    async _queryImpl(sql, params = []) {
        console.log("SQLite Executing SQL:", sql);
        try {
            // Map parameters: convert Date objects to strings for SQLite compatibility
            const processedParams = params.map(p => {
                if (p instanceof Date) {
                    return p.toISOString().slice(0, 19).replace('T', ' ');
                }
                if (p === undefined) {
                    return null;
                }
                if (typeof p === 'boolean') {
                    return p ? 1 : 0;
                }
                return p;
            });

            // Handle multiple statements (naive implementation)
            const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
            
            if (statements.length > 1) {
                let currentParamIndex = 0;
                let lastResult = null;
                
                // Wrap multiple statements in a transaction for atomicity
                const runMultiple = this.db.transaction((stmts, allParams) => {
                    let results = [];
                    for (const s of stmts) {
                        const paramCount = (s.match(/\?/g) || []).length;
                        const stmtParams = allParams.slice(currentParamIndex, currentParamIndex + paramCount);
                        currentParamIndex += paramCount;
                        
                        const stmt = this.db.prepare(s);
                        if (s.toLowerCase().startsWith('select')) {
                            results.push(stmt.all(stmtParams));
                        } else {
                            results.push(stmt.run(stmtParams));
                        }
                    }
                    return results;
                });
                
                const results = runMultiple(statements, processedParams);
                // Return the result of the last statement to mimic mysql2 behavior for multi-statements
                return [results[results.length - 1], []];
            }

            const stmt = this.db.prepare(sql);
            if (sql.toLowerCase().trim().startsWith('select')) {
                const rows = stmt.all(processedParams);
                return [rows, []];
            } else {
                const result = stmt.run(processedParams);
                // mysql2 returns an object with insertId, affectedRows etc. for DML
                // better-sqlite3 result has .changes and .lastInsertRowid
                const mysqlResult = {
                    insertId: result.lastInsertRowid,
                    affectedRows: result.changes,
                    fieldCount: 0,
                    warningStatus: 0
                };
                return [mysqlResult, []];
            }
        } catch (error) {
            console.error("SQLite Query Error:", error);
            throw error;
        }
    }

    async execute(sql, params = []) {
        return this.query(sql, params);
    }

    async beginTransaction() {
        return this._enqueue(async () => {
            this.db.prepare('BEGIN').run();
        });
    }

    async commit() {
        return this._enqueue(async () => {
            this.db.prepare('COMMIT').run();
        });
    }

    async rollback() {
        return this._enqueue(async () => {
            this.db.prepare('ROLLBACK').run();
        });
    }

    release() {
        // No-op for SQLite
    }
}

const connectionInstance = new SQLiteConnection(db);

exports.getMySqlPromiseConnection = async () => {
    // Return the same instance every time as SQLite (better-sqlite3) is synchronous and manages its own locking
    return connectionInstance;
};

/** Tables allowed for MAX(id)+1 allocation (SQLite without reliable AUTOINCREMENT). */
const SQLITE_ID_TABLES = new Set([
    "categories",
    "feedbacks",
    "inventory_items",
    "inventory_logs",
    "menu_item_addons",
    "menu_item_variants",
    "menu_items",
    "order_items",
    "orders",
    "payment_types",
    "qr_orders",
    "reservations",
    "store_tables",
    "subscription_history",
    "taxes",
]);

/**
 * Allocate next integer primary key for INSERT on SQLite.
 * @param {SQLiteConnection} conn
 * @param {string} tableName
 * @param {string} [whereSql] e.g. "item_id = ?" (no leading WHERE)
 * @param {Array} [whereParams]
 */
exports.allocateNextId = async (conn, tableName, whereSql = "", whereParams = []) => {
    if (!SQLITE_ID_TABLES.has(tableName)) {
        throw new Error(`allocateNextId: unsupported table ${tableName}`);
    }
    const where = whereSql ? ` WHERE ${whereSql}` : "";
    const [rows] = await conn.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM ${tableName}${where}`,
        whereParams
    );
    const row = (rows && rows[0]) || {};
    return Number(row.next_id ?? row.nextId ?? 1) || 1;
};
