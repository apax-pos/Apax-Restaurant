import Dexie from 'dexie';

export const db = new Dexie('ApaxPosLocalDB');

// Define the database schema
db.version(2).stores({
    orders: '++id, customerId, tableId, status, is_synced, created_at',
    invoices: '++id, orderId, total, is_synced, created_at',
    sync_queue: '++id, type, data, created_at',
    cache: 'key, data, updated_at'
});

/**
 * Save an order to local database when offline
 */
export async function saveOrderOffline(orderData) {
    try {
        const id = await db.orders.add({
            ...orderData,
            is_synced: 0,
            created_at: new Date().toISOString()
        });
        return id;
    } catch (error) {
        console.error("Failed to save order offline:", error);
        throw error;
    }
}

/**
 * Get all unsynced orders
 */
export async function getUnsyncedOrders() {
    return await db.orders.where('is_synced').equals(0).toArray();
}

/**
 * Mark order as synced
 */
export async function markOrderSynced(localId) {
    return await db.orders.update(localId, { is_synced: 1 });
}

/**
 * Cache POS init data
 */
export async function cachePosData(data) {
    return await db.cache.put({
        key: 'pos_init',
        data: data,
        updated_at: new Date().toISOString()
    });
}

/**
 * Get cached POS data
 */
export async function getCachedPosData() {
    const record = await db.cache.get('pos_init');
    return record ? record.data : null;
}
