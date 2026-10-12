const bcrypt = require("bcrypt");
const { CONFIG } = require("../config/index")
const { getMySqlPromiseConnection } = require("../config/mysql.db")
const {
    isSubscriptionEndValid,
    normDateForStorage,
    SQL_TODAY,
} = require("../utils/subscription.util");
exports.signInDB = async (username, password) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const normalizedUsername = String(username || "").trim().toLowerCase();
        const sql = `
        SELECT username, password, u.name, role, photo, designation, phone, email, scope, tenant_id, t.is_active FROM users u
        LEFT JOIN tenants t
        ON u.tenant_id = t.id
        WHERE LOWER(TRIM(username)) = ?
        LIMIT 1;
        `;

        const [result] = await conn.query(sql, [normalizedUsername]);
        const user = result[0];

        if(!user) {
            return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if(passwordMatch) {
            return user;
        } else {
            return null;
        }

    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.getUserDB = async (username, tenantId) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT username, u.name, role, photo, designation, phone, email, scope, tenant_id, t.is_active FROM users u
        LEFT JOIN tenants t
        ON u.tenant_id = t.id
        WHERE username = ? AND tenant_id = ?
        LIMIT 1;
        `;

        const [result] = await conn.query(sql, [username, tenantId]);
        const user = result[0];

        if(!user) {
            return null;
        }

        return user;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.checkEmailExistsDB = async (email) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT username FROM users
        WHERE username = ?
        LIMIT 1;
        `;

        const [result] = await conn.query(sql, [email]);
        const user = result[0];

        if(!user) {
            return false;
        } else {
            return true;
        }
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.checkEmailExistsSuperadminDB = async (email, tenantId) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT username FROM users
        WHERE username = ? AND tenant_id != ?
        LIMIT 1;
        `;

        const [result] = await conn.query(sql, [email, tenantId]);
        const user = result[0];

        if(!user) {
            return false;
        } else {
            return true;
        }
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.signUpDB = async (bizName, username, password) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const [tidRows] = await conn.query(
            `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM tenants`,
            []
        );
        const tidRow = tidRows && tidRows[0];
        const tenantId = Number(tidRow?.next_id ?? tidRow?.nextId ?? 1) || 1;

        await conn.query(
            `INSERT INTO tenants (id, name, is_active, subscription_id) VALUES (?, ?, 0, null)`,
            [tenantId, bizName]
        );

        const sql = `
        INSERT INTO users (username, password, name, role, tenant_id) VALUES (?, ?, ?, 'admin', ?);
        `;

        await conn.query(sql, [username, password, bizName, tenantId]);
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.addRefreshTokenDB = async (username, refreshToken, expiry, deviceIP, deviceName, deviceLocation, tenantId) => {

    const conn = await getMySqlPromiseConnection();

    try {
        // Some SQLite builds use NOT NULL device_id without reliable AUTOINCREMENT on INSERT omit.
        const [maxRows] = await conn.query(
            `SELECT COALESCE(MAX(device_id), 0) + 1 AS next_id FROM refresh_tokens`,
            []
        );
        const row = (maxRows && maxRows[0]) || {};
        const nextId = Number(row.next_id ?? row.nextId ?? 1) || 1;

        const sql = `
        INSERT INTO refresh_tokens (device_id, username, refresh_token, device_ip, device_name, device_location, expiry, tenant_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `;

        const [result] = await conn.query(sql, [
            nextId,
            username,
            refreshToken,
            deviceIP,
            deviceName,
            deviceLocation,
            expiry,
            tenantId,
        ]);
        return result.insertId || nextId;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.removeRefreshTokenDB = async (username, refreshToken) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        DELETE FROM refresh_tokens
        WHERE username = ? AND refresh_token = ?;
        `;
        // Removed expired token cleanup here to avoid multi-statement issues in shared connection
        await conn.query(sql, [username, refreshToken]);
        return;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.removeRefreshTokenByDeviceIdDB = async (username, deviceId) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        DELETE FROM refresh_tokens
        WHERE username = ? AND device_id = ?;
        DELETE FROM refresh_tokens
        WHERE username = ? AND expiry < date('now');
        `;

        await conn.query(sql, [username, deviceId, username]);
        return;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};


exports.getDevicesDB = async (username) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT device_id, refresh_token, device_ip, device_name, device_location, created_at FROM refresh_tokens
        WHERE username = ?;
        `;

        const [results] = await conn.query(sql, [username]);
        return results;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.verifyRefreshTokenDB = async (refreshToken) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT username, refresh_token FROM refresh_tokens
        WHERE refresh_token = ?
        LIMIT 1;
        `;

        const [result] = await conn.query(sql, [refreshToken]);
        return result[0];
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.forgotPasswordDB = async (email, token, tokenValidity) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        INSERT INTO reset_password_tokens
        (username, reset_token, expires_at)
        VALUES
        (?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
        reset_token = excluded.reset_token,
        expires_at = excluded.expires_at;
        `;

        await conn.query(sql, [email, token, tokenValidity]);
        return;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.deleteForgotPasswordTokenDB = async (token) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        DELETE FROM reset_password_tokens
        WHERE reset_token = ?;
        `;

        await conn.query(sql, [token]);
        return;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.checkForgotPasswordTokenDB = async (token, date) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT rt.username, u.tenant_id, reset_token, expires_at FROM reset_password_tokens rt
        LEFT JOIN users u
        ON rt.username = u.username
        WHERE reset_token = ? AND expires_at > ?
        LIMIT 1;
        `;

        const [result] = await conn.query(sql, [token, date]);
        return result[0];
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.getSubscriptionDetailsDB = async (tenantId) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT id, is_active, subscription_id, payment_customer_id, subscription_start, subscription_end FROM tenants
        WHERE id = ?
        LIMIT 1;
        `;

        const [results] = await conn.query(sql, [tenantId]);
        return results;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.updateTenantSubscriptionAccess = async (email, status, subscriptionId, paymentCustomerId, subscriptionStartTimestamp, subscriptionEndTimestamp) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        UPDATE tenants
        SET is_active = ?, subscription_id = ?, payment_customer_id = ?, subscription_start = ?, subscription_end = ?
        WHERE id = (
            SELECT tenant_id FROM users
            WHERE username = ?
        )
        `;

        await conn.query(sql, [status, subscriptionId, paymentCustomerId, subscriptionStartTimestamp, subscriptionEndTimestamp, email]);
        return;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.updateSubscriptionHistory = async (tenantId, starts_on , expires_on , status) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const [hidRows] = await conn.query(
            `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM subscription_history`,
            []
        );
        const hidRow = (hidRows && hidRows[0]) || {};
        const historyId = Number(hidRow.next_id ?? hidRow.nextId ?? 1) || 1;
        await conn.query(
            `INSERT INTO subscription_history (id, tenant_id, created_at, starts_on, expires_on , status) VALUES (?, ?, datetime('now') , ? , ? , ?)`,
            [historyId, tenantId, starts_on, expires_on, status]
        );

        return;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getTenantIdFromCustomerEmail = async (customerEmail) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT tenant_id from users where username = ?
        `;

        const [results] = await conn.query(sql, [customerEmail]);
        return results[0].tenant_id;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

/**
 * Align tenants.is_active with subscription_end.
 * @param {object} [existingConn] Optional connection (reuse open transaction).
 */
/**
 * After backup restore: keep valid subscriptions; extend expired/missing end by 1 year
 * so the tenant is not locked out by an old backup snapshot.
 */
exports.ensureTenantSubscriptionValidAfterRestoreDB = async (tenantId, existingConn) => {
    const conn = existingConn || (await getMySqlPromiseConnection());
    const shouldRelease = !existingConn;
    try {
        const [rows] = await conn.query(
            `SELECT subscription_start, subscription_end, is_active FROM tenants WHERE id = ? LIMIT 1`,
            [tenantId]
        );
        const t = rows && rows[0];
        if (!t) {
            return;
        }

        if (isSubscriptionEndValid(t.subscription_end)) {
            await conn.query(`UPDATE tenants SET is_active = 1 WHERE id = ?`, [tenantId]);
            return;
        }

        const end = new Date();
        end.setFullYear(end.getFullYear() + 1);
        const subscriptionEnd = normDateForStorage(end);
        const subscriptionStart =
            t.subscription_start && String(t.subscription_start).trim()
                ? t.subscription_start
                : normDateForStorage(new Date());

        await conn.query(
            `UPDATE tenants SET is_active = 1, subscription_start = ?, subscription_end = ? WHERE id = ?`,
            [subscriptionStart, subscriptionEnd, tenantId]
        );
    } finally {
        if (shouldRelease) {
            conn.release();
        }
    }
};

exports.syncTenantSubscriptionStatusDB = async (tenantId, existingConn) => {
    const conn = existingConn || (await getMySqlPromiseConnection());
    const shouldRelease = !existingConn;
    try {
        const [rows] = await conn.query(
            `SELECT is_active, subscription_end FROM tenants WHERE id = ? LIMIT 1`,
            [tenantId]
        );
        const t = rows && rows[0];
        if (!t) return;

        if (!t.subscription_end || String(t.subscription_end).trim() === "") {
            return;
        }

        if (isSubscriptionEndValid(t.subscription_end)) {
            await conn.query(`UPDATE tenants SET is_active = 1 WHERE id = ?`, [tenantId]);
        } else {
            await conn.query(`UPDATE tenants SET is_active = 0 WHERE id = ?`, [tenantId]);
        }
    } finally {
        if (shouldRelease) {
            conn.release();
        }
    }
};

/** Deactivate all tenants whose subscription_end is before now (scheduled sweep). */
exports.deactivateExpiredTenantsDB = async () => {
    const conn = await getMySqlPromiseConnection();
    try {
        const [r] = await conn.query(
            `UPDATE tenants SET is_active = 0
             WHERE is_active = 1
             AND subscription_end IS NOT NULL
             AND TRIM(subscription_end) != ''
             AND date(subscription_end) < ${SQL_TODAY}`
        );
        return r.affectedRows || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

/**
 * If subscription_end has passed for this tenant, set is_active = 0.
 * If subscription_end is now or in the future, ensure is_active = 1.
 * @returns {Promise<boolean>} true if the tenant may use the app.
 */
exports.enforceTenantSubscriptionExpiryDB = async (tenantId) => {
    if (tenantId == null || tenantId === "") {
        return true;
    }
    const conn = await getMySqlPromiseConnection();
    try {
        const [rows] = await conn.query(
            `SELECT is_active, subscription_end FROM tenants WHERE id = ? LIMIT 1`,
            [tenantId]
        );
        const t = rows && rows[0];
        if (!t) {
            return false;
        }

        if (!t.subscription_end || String(t.subscription_end).trim() === "") {
            return t.is_active == 1;
        }

        if (isSubscriptionEndValid(t.subscription_end)) {
            if (t.is_active != 1) {
                await conn.query(
                    `UPDATE tenants SET is_active = 1 WHERE id = ?`,
                    [tenantId]
                );
            }
            return true;
        }

        await conn.query(
            `UPDATE tenants SET is_active = 0 WHERE id = ?`,
            [tenantId]
        );
        return false;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};
