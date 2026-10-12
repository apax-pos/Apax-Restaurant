const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const { getMySqlPromiseConnection } = require("../config/mysql.db")
const { doUserExistDB } = require("../services/user.service");
const { deleteTenantData } = require("./backup.service");
const { CONFIG } = require("../config");
const { syncTenantSubscriptionStatusDB } = require("./auth.service");
const {
  normDateForStorage,
  isSubscriptionEndValid,
  SQL_TODAY,
} = require("../utils/subscription.util");

/** When superadmin re-activates a tenant, extend expired/missing subscription_end so login is not blocked. */
async function extendSubscriptionIfActivating(conn, tenantId, isActive) {
  const active =
    isActive === 1 || isActive === true || isActive === "1";
  if (!active) return;
  await conn.query(
    `UPDATE tenants SET
      subscription_start = COALESCE(subscription_start, datetime('now', 'localtime')),
      subscription_end = CASE
        WHEN subscription_end IS NULL OR TRIM(subscription_end) = ''
          OR date(subscription_end) < ${SQL_TODAY}
        THEN datetime('now', 'localtime', '+1 year')
        ELSE subscription_end
      END
    WHERE id = ?`,
    [tenantId]
  );
}

exports.signInDB = async (username, password) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
        email, password, name
        FROM superadmins
        WHERE email = ?
        LIMIT 1;
        `;

        const [result] = await conn.query(sql, [username]);
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
exports.getAdminUserDB = async (username) => {

    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
        email, password, name
        FROM superadmins
        WHERE email = ?
        LIMIT 1;
        `;

        const [result] = await conn.query(sql, [username]);
        const user = result[0];
        return user;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.updateSuperAdminProfileDB = async (
  currentEmail,
  { name, email, currentPassword, newPassword }
) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT email, password, name FROM superadmins WHERE email = ? LIMIT 1`,
      [currentEmail]
    );
    const admin = rows && rows[0];
    if (!admin) {
      throw new Error("not_found");
    }

    const wantsPasswordChange =
      newPassword !== undefined &&
      newPassword !== null &&
      String(newPassword).length > 0;

    if (wantsPasswordChange) {
      if (!currentPassword) {
        throw new Error("current_password_required");
      }
      const ok = await bcrypt.compare(String(currentPassword), admin.password);
      if (!ok) {
        throw new Error("invalid_current_password");
      }
    }

    const nextEmail = (email != null ? String(email).trim() : admin.email).toLowerCase();
    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      throw new Error("invalid_email");
    }

    if (nextEmail !== currentEmail) {
      const [taken] = await conn.query(
        `SELECT email FROM superadmins WHERE email = ? LIMIT 1`,
        [nextEmail]
      );
      if (taken?.length) {
        throw new Error("email_exists");
      }
    }

    let passwordHash = admin.password;
    if (wantsPasswordChange) {
      passwordHash = await bcrypt.hash(
        String(newPassword),
        Number.isFinite(CONFIG.PASSWORD_SALT) ? CONFIG.PASSWORD_SALT : 10
      );
    }

    const nextName =
      name !== undefined && name !== null ? String(name).trim() : admin.name;

    await conn.query(
      `UPDATE superadmins SET email = ?, name = ?, password = ? WHERE email = ?`,
      [nextEmail, nextName, passwordHash, currentEmail]
    );

    await conn.query(
      `UPDATE refresh_tokens SET username = ? WHERE username = ? AND tenant_id IS NULL`,
      [nextEmail, currentEmail]
    );

    await conn.commit();

    return {
      email: nextEmail,
      name: nextName,
    };
  } catch (error) {
    try {
      await conn.rollback();
    } catch (_) {}
    throw error;
  } finally {
    conn.release();
  }
};

exports.getOrdersProcessedTodayDB = async() => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            COUNT(*) AS todays_orders
        FROM
            orders
        WHERE
            DATE(\`date\`) = date('now')
        `;

        const [result] = await conn.query(sql, []);

        return result[0]?.todays_orders || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getSalesVolumeTodayDB = async() => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            IFNULL(SUM(i.total * er.rate_to_usd),0) AS sales_volume_today
        FROM
            invoices i
            LEFT JOIN store_details sd ON i.tenant_id = sd.tenant_id
            LEFT JOIN exchange_rates er ON sd.currency = er.currency_code
        WHERE
            date(i.created_at) = date('now')
        `;

        const [result] = await conn.query(sql, []);

        return result[0]?.sales_volume_today || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getMRRValueDB = async() => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            count(*) AS active_tenants
        FROM
            tenants
        WHERE
            is_active = 1
        `;

        const [result] = await conn.query(sql, []);

        return result[0]?.active_tenants || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getARRValueDB = async() => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            count(*) AS active_tenants
        FROM
            tenants
        WHERE
            is_active = 1
        `;

        const [result] = await conn.query(sql, []);

        return result[0]?.active_tenants || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getActiveTenantsDB = async() => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            count(*) AS active_tenants
        FROM
            tenants
        WHERE
            is_active = 1
        `;

        const [result] = await conn.query(sql, []);
        return result[0]?.active_tenants || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}


exports.getInActiveTenantsDB = async() => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            count(*) AS inactive_tenants
        FROM
            tenants
        WHERE
            is_active = 0
        `;

        const [result] = await conn.query(sql, []);

        return result[0]?.inactive_tenants || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}
exports.getAllTenantsDB = async() => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            count(*) AS all_tenants
        FROM
            tenants
        `;

        const [result] = await conn.query(sql, []);

        return result[0]?.all_tenants || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getTenantSubscriptionHistoryDB = async(tenantId) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            id, tenant_id, created_at, starts_on, expires_on, status
        FROM
            subscription_history
        WHERE
            tenant_id = ?
        ORDER BY created_at DESC;
        `;

        const [result] = await conn.query(sql, [tenantId]);

        return result;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getTenantTotalUsersDB = async(tenantId) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            count(*) as total_users
        FROM
            users
        WHERE
            tenant_id = ?
        `;

        const [result] = await conn.query(sql, [tenantId]);

        return result[0]?.total_users || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getTenantDetailsDB = async(tenantId) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            id, name, is_active, created_at, subscription_id, payment_customer_id,
            subscription_start, subscription_end
        FROM
            tenants
        WHERE
            id = ?
        LIMIT 1
        `;

        const [result] = await conn.query(sql, [tenantId]);

        return result[0];
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getTenantStoreDetailsDB = async(tenantId) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            tenant_id, store_name, address, phone, email, currency, is_qr_menu_enabled, unique_qr_code
        FROM
            store_details
        WHERE
            tenant_id = ?
        LIMIT 1
        `;

        const [result] = await conn.query(sql, [tenantId]);

        return result[0];
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getTenantsDB = async (page, perPage, search, status, type , from , to) => {
    const conn = await getMySqlPromiseConnection();
    try {
        const currentPage = parseInt(page) || 1;
        const limit = parseInt(perPage) || 5;
        const offset = (currentPage - 1) * limit;
        let queryParams = [];

        let query = `
            SELECT t.*, u.username AS email
            FROM tenants t
            LEFT JOIN users u ON t.id = u.tenant_id and u.role = 'admin'
            WHERE 1=1
        `;

        if (status == 'active') {
            query += " AND t.is_active = 1";
        } else if (status == 'inactive') {
            query += " AND t.is_active = 0";
        }

        if (search) {
            const searchParam = `%${search}%`
            query += ` AND (t.name LIKE '${searchParam}' OR u.username LIKE '${searchParam}')`;
        }

        const {filter, params} = getFilterConditionForTenants('created_at' , type, from, to)

        if(filter){
            query += ` AND ${filter}`;
            queryParams.push(params);
        }

        query += ` ORDER BY t.id DESC LIMIT ${limit} OFFSET ${offset}`;

        const [tenants] = await conn.execute(query , params);

        const response = {
            tenants,
            currentPage,
            perPage: limit,
            // totalPages: Math.ceil((tenants.length) / limit),
            // totalTenants : tenants.length
        };

        return response;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

const getFilterConditionForTenants = (field , type, from, to) => {
    const params = [];
    let filter = '';

    switch (type) {
        case 'custom': {
            params.push(from, to);
            filter = `DATE(${field}) >= ? AND DATE(${field}) <= ?`;
            break;
        }
        case 'today': {
            filter = `DATE(${field}) = date('now')`;
            break;
        }
        case 'this_month': {
            filter = `strftime('%Y', ${field}) = strftime('%Y', 'now') AND strftime('%m', ${field}) = strftime('%m', 'now')`;
            break;
        }
        case 'last_month': {
            filter = `strftime('%Y', ${field}) = strftime('%Y', 'now', '-1 month') AND strftime('%m', ${field}) = strftime('%m', 'now', '-1 month')`;
            break;
        }
        case 'last_7days': {
            filter = `DATE(${field}) >= date('now', '-7 days')`;
            break;
        }
        case 'yesterday': {
            filter = `DATE(${field}) = date('now', '-1 day')`;
            break;
        }
        case 'tomorrow': {
            filter = `DATE(${field}) = date('now', '+1 day')`;
            break;
        }
        default: {
            filter = '';
        }
    }

    return { params, filter };
}


exports.addTenantDB = async ({ name, email, password, isAdmin , isActive }) => {
    const conn = await getMySqlPromiseConnection();
    try {
        await conn.beginTransaction();

        const [tidRows] = await conn.query(
            `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM tenants`,
            []
        );
        const tidRow = tidRows && tidRows[0];
        const tenantId = Number(tidRow?.next_id ?? tidRow?.nextId ?? 1) || 1;

        await conn.query(
            `INSERT INTO tenants (id, name, is_active, subscription_start, subscription_end) VALUES (?, ?, ?, datetime('now'), datetime('now', '+1 year'))`,
            [tenantId, name, isActive ? 1 : 0]
        );
        if (!isActive) {
          await conn.query(
            `UPDATE tenants SET subscription_end = datetime('now') WHERE id = ?`,
            [tenantId]
          );
        }

        const adminUsername = String(email || "").trim().toLowerCase();
        const userExist = await doUserExistDB(adminUsername);
        if (userExist) {
            const err = new Error("User already exist! Try Different Email!");
            err.code = "USER_EXISTS";
            throw err;
        }

        const encryptedPassword = await bcrypt.hash(password, CONFIG.PASSWORD_SALT);

        const role = isAdmin ? "admin" : "user";

        await conn.query(
            `INSERT INTO users (username, password, name, role , tenant_id) VALUES (?, ?, ?, ? , ?)`,
            [adminUsername, encryptedPassword, name, role, tenantId]
        );

        await conn.commit();

        return { tenantId, name, isActive , role};
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

exports.getTenantCntByIdDB = async (tenantId) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            COUNT(*) as count
        FROM
            tenants
        WHERE
            id = ?
        `;

        const [result] = await conn.query(sql, [tenantId]);

        return result[0].count || null;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getTenantDetailsByIdDB = async (tenantId) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            t.is_active, u.username
        FROM
            tenants t JOIN users u
        ON
            t.id = u.tenant_id
        WHERE
            t.id = ?
        `;

        const [result] = await conn.query(sql, [tenantId]);

        return result[0] || null;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.setTenantSubscriptionDB = async (
  tenantId,
  subscriptionStart,
  subscriptionEnd,
  isActive
) => {
  const conn = await getMySqlPromiseConnection();
  const wantsActive = !(
    isActive === 0 || isActive === false || isActive === "0"
  );

  try {
    await conn.beginTransaction();

    const [tenantRows] = await conn.query(
      "SELECT id FROM tenants WHERE id = ? LIMIT 1",
      [tenantId]
    );
    const tenant = tenantRows && tenantRows[0];
    if (!tenant) {
      throw new Error("tenant_not_found");
    }

    const updates = [];
    const params = [];

    if (subscriptionStart !== undefined && subscriptionStart !== null) {
      updates.push("subscription_start = ?");
      params.push(normDateForStorage(subscriptionStart));
    }
    if (subscriptionEnd !== undefined && subscriptionEnd !== null) {
      updates.push("subscription_end = ?");
      params.push(normDateForStorage(subscriptionEnd));
    }
    if (isActive !== undefined && isActive !== null && isActive !== "") {
      updates.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }

    if (updates.length) {
      params.push(tenantId);
      await conn.query(
        `UPDATE tenants SET ${updates.join(", ")} WHERE id = ?`,
        params
      );
    }

    if (wantsActive) {
      await extendSubscriptionIfActivating(conn, tenantId, true);
      const [after] = await conn.query(
        `SELECT subscription_end FROM tenants WHERE id = ? LIMIT 1`,
        [tenantId]
      );
      const endVal = after?.[0]?.subscription_end;
      if (!endVal || !isSubscriptionEndValid(endVal)) {
        await conn.query(
          `UPDATE tenants SET subscription_end = datetime('now', 'localtime', '+1 year') WHERE id = ?`,
          [tenantId]
        );
      }
      await conn.query(`UPDATE tenants SET is_active = 1 WHERE id = ?`, [tenantId]);
    } else {
      await conn.query(`UPDATE tenants SET is_active = 0 WHERE id = ?`, [tenantId]);
    }

    const startNorm = normDateForStorage(subscriptionStart);
    const endNorm = normDateForStorage(subscriptionEnd);
    if (startNorm || endNorm) {
      const [hidRows] = await conn.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM subscription_history`,
        []
      );
      const hidRow = (hidRows && hidRows[0]) || {};
      const historyId = Number(hidRow.next_id ?? hidRow.nextId ?? 1) || 1;
      await conn.query(
        `INSERT INTO subscription_history (id, tenant_id, created_at, starts_on, expires_on, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [historyId, tenantId, new Date(), startNorm, endNorm, "updated"]
      );
    }

    await conn.commit();
  } catch (error) {
    try {
      await conn.rollback();
    } catch (_) {}
    console.error(error);
    throw error;
  } finally {
    conn.release();
  }
};

exports.updateTenantDB = async(tenantId , name , email , isActive, existingEmail) => {
    const conn = await getMySqlPromiseConnection();
    try {
        await conn.beginTransaction();

        const updateTenantSQL = `
        UPDATE tenants
        SET is_active = ?, name = ?
        WHERE id = ?;
        `;

        await conn.query(updateTenantSQL, [isActive, name, tenantId]);
        await extendSubscriptionIfActivating(conn, tenantId, isActive);
        if (isActive == 1 || isActive === true || isActive === "1") {
            await syncTenantSubscriptionStatusDB(tenantId, conn);
        }

        const [currentUser] = await conn.query('SELECT name, username FROM users WHERE tenant_id = ? and username = ?', [tenantId, existingEmail]);

        if (currentUser.length === 0) {
            throw new Error('User not found');
        }

        if (currentUser[0].name !== name) {
            const updateNameSql = `
                UPDATE users
                SET name = ?
                WHERE tenant_id = ? AND username = ?;
            `;

            await conn.query(updateNameSql, [name, tenantId, existingEmail]);
        }

        if (currentUser[0].username !== email) {
            const updateUsernameSql = `
                UPDATE users
                SET username = ?
                WHERE tenant_id = ? AND username = ?;
            `;

            await conn.query(updateUsernameSql, [email, tenantId, existingEmail]);
        }
        await conn.commit();
        return;
    } catch (error) {
        await conn.rollback();
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.logoutAllUsersOfTenantDB = async (tenantId) => {
    const conn = await getMySqlPromiseConnection();
    try {
        await conn.query('DELETE FROM refresh_tokens where tenant_id = ?' , [tenantId]);
    } catch (error) {
        console.error('Error logging out all users:', error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.deleteTenantDB = async (tenantId) => {
    const conn = await getMySqlPromiseConnection();
    let inTxn = false;
    try {
        const [tenantRows] = await conn.query(
            `SELECT id FROM tenants WHERE id = ? LIMIT 1`,
            [tenantId]
        );
        if (!tenantRows?.[0]) {
            throw new Error("tenant_not_found");
        }

        await conn.query("PRAGMA foreign_keys = OFF");
        await conn.beginTransaction();
        inTxn = true;

        await deleteTenantData(conn, tenantId);
        await conn.query(`DELETE FROM tenants WHERE id = ?`, [tenantId]);

        await conn.commit();
        inTxn = false;
        await conn.query("PRAGMA foreign_keys = ON");

        const tenantDir = path.join(__dirname, `../../public/${tenantId}`);
        if (fs.existsSync(tenantDir)) {
            fs.rmSync(tenantDir, { recursive: true, force: true });
        }
    } catch (error) {
        if (inTxn) {
            try {
                await conn.rollback();
            } catch (_) {
                /* ignore */
            }
        }
        try {
            await conn.query("PRAGMA foreign_keys = ON");
        } catch (_) {
            /* ignore */
        }
        console.error("Error deleting tenant:", error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.getRestaurantsTotalCustomersDB = async() => {
    const conn = await getMySqlPromiseConnection();

    try {
        const sql = `
        SELECT
            count(*) AS total_customers
        FROM
            customers
        `;

        const [result] = await conn.query(sql, []);

        return result[0]?.total_customers || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getTenantsDataByStatusDB = async (is_active) => {
    const conn = await getMySqlPromiseConnection();

    try {
        let sql = `
            SELECT t.*, u.username AS email
            FROM tenants t
            LEFT JOIN users u ON t.id = u.tenant_id AND u.role = 'admin'
        `;

        const params = [];

        if (is_active != null) {
            sql += ' WHERE t.is_active = ?';
            params.push(is_active);
        }

        const [result] = await conn.query(sql, params);

        return result;
         } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getSuperAdminTopSellingItemsDB = async(type, from, to) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const {filter, params} = getFilterCondition('date', type, from, to);

        const sql = `
        SELECT
            trending_items.tenant_id,
            t.name as tenant_name,
            trending_items.item_id,
            mi.title,
            qty
        FROM (
            SELECT
                tenant_id,
                item_id,
                count(*) AS qty
            FROM
                order_items
            WHERE ${filter}
            GROUP BY
                item_id,
                tenant_id
            ORDER BY
                count(*)
                DESC
        ) AS trending_items
        INNER JOIN menu_items mi ON trending_items.item_id = mi.id
        INNER JOIN tenants t ON trending_items.tenant_id = t.id
        ORDER BY qty DESC
        LIMIT 50
        `;

        const [result] = await conn.query(sql, params);

        return result;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getSuperAdminSalesVolumeDB = async(type, from, to) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const {filter, params} = getFilterCondition('i.created_at', type, from, to);

        const sql = `
        SELECT
            IFNULL(SUM(i.total * er.rate_to_usd),0) AS sales_volume_today
        FROM
            invoices i
            LEFT JOIN store_details sd ON i.tenant_id = sd.tenant_id
            LEFT JOIN exchange_rates er ON sd.currency = er.currency_code
        WHERE
            ${filter}
        `;

        const [result] = await conn.query(sql, params);

        return result[0]?.sales_volume_today || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
}

exports.getSuperAdminOrdersProcessedDB = async(type, from, to) => {
    const conn = await getMySqlPromiseConnection();

    try {
        const {filter, params} = getFilterCondition('date', type, from, to);

        const sql = `
        SELECT
            COUNT(*) AS orders
        FROM
            orders
        WHERE
            ${filter}
        `;

        const [result] = await conn.query(sql, params);

        return result[0]?.orders || 0;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.getSubscriptionOfferSettingsDB = async () => {
    const conn = await getMySqlPromiseConnection();
    try {
        const [rows] = await conn.query(
            `SELECT stripe_price_id_monthly, stripe_price_id_yearly, display_amount_monthly, display_amount_yearly, currency_symbol
             FROM subscription_offer_settings WHERE id = 1 LIMIT 1`
        );
        return rows[0] || null;
    } catch (error) {
        if (error.code === "ER_NO_SUCH_TABLE") {
            return null;
        }
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};

exports.upsertSubscriptionOfferSettingsDB = async (payload) => {
    const conn = await getMySqlPromiseConnection();
    try {
        await conn.query(
            `INSERT INTO subscription_offer_settings (id, stripe_price_id_monthly, stripe_price_id_yearly, display_amount_monthly, display_amount_yearly, currency_symbol)
             VALUES (1, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
             stripe_price_id_monthly = excluded.stripe_price_id_monthly,
             stripe_price_id_yearly = excluded.stripe_price_id_yearly,
             display_amount_monthly = excluded.display_amount_monthly,
             display_amount_yearly = excluded.display_amount_yearly,
             currency_symbol = excluded.currency_symbol`,
            [
                payload.stripe_price_id_monthly || null,
                payload.stripe_price_id_yearly || null,
                payload.display_amount_monthly !== undefined &&
                payload.display_amount_monthly !== "" &&
                payload.display_amount_monthly !== null
                    ? Number(payload.display_amount_monthly)
                    : null,
                payload.display_amount_yearly !== undefined &&
                payload.display_amount_yearly !== "" &&
                payload.display_amount_yearly !== null
                    ? Number(payload.display_amount_yearly)
                    : null,
                (payload.currency_symbol && String(payload.currency_symbol).trim().slice(0, 8)) || "$",
            ]
        );
        const [rows] = await conn.query(
            `SELECT stripe_price_id_monthly, stripe_price_id_yearly, display_amount_monthly, display_amount_yearly, currency_symbol
             FROM subscription_offer_settings WHERE id = 1 LIMIT 1`
        );
        return rows[0] || null;
    } catch (error) {
        if (error.code === "ER_NO_SUCH_TABLE") {
            const e = new Error("subscription_offer_table_missing");
            e.code = "ER_NO_SUCH_TABLE";
            throw e;
        }
        console.error(error);
        throw error;
    } finally {
        conn.release();
    }
};


const getFilterCondition = (field, type, from, to) => {
    const params = [];
    let filter = '';

    switch (type) {
        case 'custom': {
            params.push(from, to);
            filter = `DATE(${field}) >= ? AND DATE(${field}) <= ?`;
            break;
        }
        case 'today': {
            filter = `DATE(${field}) = date('now')`;
            break;
        }
        case 'this_month': {
            filter = `strftime('%Y', ${field}) = strftime('%Y', 'now') AND strftime('%m', ${field}) = strftime('%m', 'now')`;
            break;
        }
        case 'last_month': {
            filter = `strftime('%m', ${field}) = strftime('%m', 'now', '-1 month') AND strftime('%Y', ${field}) = strftime('%Y', 'now', '-1 month')`;
            break;
        }
        case 'last_7days': {
            filter = `DATE(${field}) >= date('now', '-7 days') AND DATE(${field}) <= date('now')`;
            break;
        }
        case 'yesterday': {
            filter = `DATE(${field}) = date('now', '-1 day')`;
            break;
        }
        case 'tomorrow': {
            filter = `DATE(${field}) = date('now', '+1 day')`;
            break;
        }
        default: {
            filter = '';
        }
    }

    return { params, filter };
}
