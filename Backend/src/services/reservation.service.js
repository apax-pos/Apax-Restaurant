const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db")

exports.addReservationDB = async (customerId, date, tableId, status, notes, peopleCount, uniqueCode, tenantId) => {
    const conn = await getMySqlPromiseConnection();
    try {

        const reservationId = await allocateNextId(conn, "reservations");
        const sql = `
        INSERT INTO reservations
        (id, customer_id, date, table_id, status, notes, people_count, unique_code, tenant_id)
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;

        const utcDateTime = new Date(date).toISOString().slice(0, 19).replace("T", " ");
        await conn.query(sql, [reservationId, customerId, utcDateTime, tableId, status, notes, peopleCount, uniqueCode, tenantId]);

        return reservationId;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
      }
};

exports.updateReservationDB = async (reservationId, date, tableId, status, notes, peopleCount, tenantId) => {
    const conn = await getMySqlPromiseConnection();
    try {

        const sql = `
        UPDATE reservations
        SET
        date = ?, table_id = ?, status = ?, notes = ?, people_count = ?, updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?;
        `;
        const utcDateTime = new Date(date).toISOString().slice(0, 19).replace("T", " ");
        await conn.query(sql, [utcDateTime, tableId, status, notes, peopleCount, reservationId, tenantId]);

        return;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
      }
};

exports.cancelReservationDB = async (reservationId, status, tenantId) => {
    const conn = await getMySqlPromiseConnection();
    try {

        const sql = `
        UPDATE reservations
        SET
        status = ?
        WHERE id = ? AND tenant_id = ?;
        `;

        await conn.query(sql, [status, reservationId, tenantId]);

        return;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
      }
};

exports.deleteReservationDB = async (reservationId, tenantId) => {
    const conn = await getMySqlPromiseConnection();
    try {

        const sql = `
        DELETE FROM reservations
        WHERE id = ? AND tenant_id = ?;
        `;

        await conn.query(sql, [reservationId, tenantId]);

        return;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
      }
};

exports.searchReservationsDB = async (search, tenant_id) => {
    const conn = await getMySqlPromiseConnection();
    try {

        const sql = `
        SELECT r.id, customer_id, c.name as customer_name, r.date, table_id, st.table_title, status, notes, people_count, unique_code, r.created_at, r.updated_at
        FROM reservations r
        INNER JOIN customers c ON r.customer_id = c.phone AND r.tenant_id = c.tenant_id
        LEFT JOIN store_tables st
        ON r.table_id = st.id
        WHERE r.tenant_id = ? AND (r.id = ? OR customer_id = ? OR unique_code = ?)
        ORDER BY r.created_at DESC
        LIMIT 20;
        `;

        const [results] = await conn.query(sql, [tenant_id, search, search, search]);

        return results;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
      }
};

exports.getReservationsDB = async (type, from, to, tenantId) => {
    const conn = await getMySqlPromiseConnection();
    try {

        const {filter, params} = getFilterConditionForReservationSearch(type, from, to, tenantId);

        const sql = `
        SELECT r.id, customer_id, c.name as customer_name, r.date, 
        table_id, st.table_title, status, notes, people_count, unique_code, r.created_at, r.updated_at
        FROM reservations r
        INNER JOIN customers c ON r.customer_id = c.phone AND r.tenant_id = c.tenant_id
        LEFT JOIN store_tables st
        ON r.table_id = st.id
        WHERE ${filter}
        `;



        const [results] = await conn.query(sql, params);

        return results;
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        conn.release();
      }
};

const getFilterConditionForReservationSearch = (type, from, to, tenantId) => {
    const params = [];
    let filter = '';

    switch (type) {
        case 'custom': {
            params.push(from, to, tenantId);
            filter = `(DATE(r.date) >= ? AND DATE(r.date) <= ?) AND r.tenant_id = ?`;
            break;
        }
        case 'today': {
            params.push(tenantId);
            filter = `DATE(r.date) = date('now') AND r.tenant_id = ?`;
            break;
        }
        case 'this_month': {
            params.push(tenantId);
            filter = `strftime('%Y', r.date) = strftime('%Y', datetime('now')) AND strftime('%m', r.date) = strftime('%m', datetime('now')) AND r.tenant_id = ?`;
            break;
        }
        case 'last_month': {
            params.push(tenantId);
            filter = `DATE(r.date) >= date(date('now'), '-1 month') AND DATE(r.date) <= date('now') AND r.tenant_id = ?`;
            break;
        }
        case 'last_7days': {
            params.push(tenantId);
            filter = `DATE(r.date) >= date(date('now'), '-7 days') AND DATE(r.date) <= date('now') AND r.tenant_id = ?`;
            break;
        }
        case 'yesterday': {
            params.push(tenantId);
            filter = `DATE(r.date) = date(date('now'), '-1 day') AND r.tenant_id = ?`;
            break;
        }
        case 'tomorrow': {
            params.push(tenantId);
            filter = `DATE(r.date) = date(date('now'), '+1 day') AND r.tenant_id = ?`;
            break;
        }
        default: {
            params.push(tenantId);
            filter = 'r.tenant_id = ?';
        }
    }

    return { params, filter };
}
