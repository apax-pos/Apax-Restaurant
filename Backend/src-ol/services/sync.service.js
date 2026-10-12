const axios = require('axios');
const { getMySqlPromiseConnection } = require('../config/mysql.db');

class SyncService {
    constructor() {
        this.cloudApiUrl = process.env.CLOUD_API_URL || 'https://api.your-saas-cloud.com';
        this.isSyncing = false;
    }

    /**
     * Start the synchronization process
     */
    async startSync() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        console.log("☁️ Starting Cloud Synchronization...");

        try {
            await this.syncOrders();
            await this.syncCustomers();
            // Add more sync tasks here
        } catch (error) {
            console.error("❌ Sync Error:", error.message);
        } finally {
            this.isSyncing = false;
        }
    }

    async syncOrders() {
        const conn = await getMySqlPromiseConnection();
        // Find orders created locally but not yet on cloud
        const [unsynced] = await conn.query("SELECT * FROM orders WHERE is_synced = 0 LIMIT 50");

        if (unsynced.length === 0) return;

        console.log(`📤 Pushing ${unsynced.length} orders to cloud...`);

        try {
            // Mock API call - you would replace this with your real Cloud endpoint
            // await axios.post(`${this.cloudApiUrl}/sync/orders`, { orders: unsynced });

            // Mark as synced locally
            const ids = unsynced.map(o => o.id);
            const placeholders = ids.map(() => '?').join(',');
            await conn.query(`UPDATE orders SET is_synced = 1 WHERE id IN (${placeholders})`, ids);
            
            console.log(`✅ Synced ${unsynced.length} orders.`);
        } catch (error) {
            throw new Error(`Order Sync Failed: ${error.message}`);
        }
    }

    async syncCustomers() {
        const conn = await getMySqlPromiseConnection();
        const [unsynced] = await conn.query("SELECT * FROM customers WHERE is_synced = 0 LIMIT 50");

        if (unsynced.length === 0) return;

        try {
            // Mark as synced
            const ids = unsynced.map(c => c.id);
            const placeholders = ids.map(() => '?').join(',');
            await conn.query(`UPDATE customers SET is_synced = 1 WHERE id IN (${placeholders})`, ids);
            console.log(`✅ Synced ${unsynced.length} customers.`);
        } catch (error) {
            throw new Error(`Customer Sync Failed: ${error.message}`);
        }
    }
}

module.exports = new SyncService();
