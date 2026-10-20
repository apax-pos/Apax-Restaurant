const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");

exports.getStaffDB = async (tenantId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM staff_profiles WHERE tenant_id = ? ORDER BY name ASC`,
      [tenantId]
    );
    return rows || [];
  } finally {
    conn.release();
  }
};

exports.addStaffDB = async (tenantId, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const id = await allocateNextId(conn, "staff_profiles");
    await conn.query(
      `INSERT INTO staff_profiles (id, tenant_id, name, phone, designation, base_salary, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        tenantId,
        data.name,
        data.phone || null,
        data.designation || null,
        Number(data.baseSalary) || 0,
      ]
    );
    return id;
  } finally {
    conn.release();
  }
};

exports.updateStaffDB = async (tenantId, id, data) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(
      `UPDATE staff_profiles SET name = ?, phone = ?, designation = ?, base_salary = ?, is_active = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        data.name,
        data.phone || null,
        data.designation || null,
        Number(data.baseSalary) || 0,
        data.isActive !== false ? 1 : 0,
        id,
        tenantId,
      ]
    );
  } finally {
    conn.release();
  }
};

exports.deleteStaffDB = async (tenantId, id) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(`DELETE FROM staff_attendance WHERE staff_id = ? AND tenant_id = ?`, [
      id,
      tenantId,
    ]);
    await conn.query(`DELETE FROM staff_salary_records WHERE staff_id = ? AND tenant_id = ?`, [
      id,
      tenantId,
    ]);
    await conn.query(`DELETE FROM staff_profiles WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  } finally {
    conn.release();
  }
};

exports.checkInDB = async (tenantId, staffId, branchId, notes) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [open] = await conn.query(
      `SELECT id FROM staff_attendance WHERE tenant_id = ? AND staff_id = ? AND check_out IS NULL LIMIT 1`,
      [tenantId, staffId]
    );
    if (open?.[0]) {
      throw new Error("ALREADY_CHECKED_IN");
    }
    const id = await allocateNextId(conn, "staff_attendance");
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    await conn.query(
      `INSERT INTO staff_attendance (id, tenant_id, staff_id, branch_id, check_in, attendance_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, staffId, branchId || null, now, today, notes || null]
    );
    return id;
  } finally {
    conn.release();
  }
};

exports.checkOutDB = async (tenantId, staffId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const [r] = await conn.query(
      `UPDATE staff_attendance SET check_out = ?
       WHERE tenant_id = ? AND staff_id = ? AND check_out IS NULL`,
      [now, tenantId, staffId]
    );
    if (!r?.changes && !r?.affectedRows) {
      throw new Error("NOT_CHECKED_IN");
    }
  } finally {
    conn.release();
  }
};

exports.getAttendanceDB = async (tenantId, fromDate, toDate) => {
  const conn = await getMySqlPromiseConnection();
  try {
    let sql = `
      SELECT a.*, s.name AS staff_name
      FROM staff_attendance a
      INNER JOIN staff_profiles s ON s.id = a.staff_id AND s.tenant_id = a.tenant_id
      WHERE a.tenant_id = ?`;
    const params = [tenantId];
    if (fromDate) {
      sql += ` AND a.attendance_date >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      sql += ` AND a.attendance_date <= ?`;
      params.push(toDate);
    }
    sql += ` ORDER BY a.id DESC LIMIT 500`;
    const [rows] = await conn.query(sql, params);
    return rows || [];
  } finally {
    conn.release();
  }
};

exports.getSalaryRecordsDB = async (tenantId, monthYear) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [rows] = await conn.query(
      `SELECT r.*, s.name AS staff_name, s.base_salary
       FROM staff_salary_records r
       INNER JOIN staff_profiles s ON s.id = r.staff_id AND s.tenant_id = r.tenant_id
       WHERE r.tenant_id = ? AND r.month_year = ?
       ORDER BY s.name ASC`,
      [tenantId, monthYear]
    );
    return rows || [];
  } finally {
    conn.release();
  }
};

exports.generateMonthlySalaryDB = async (tenantId, monthYear) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const [staff] = await conn.query(
      `SELECT id, base_salary FROM staff_profiles WHERE tenant_id = ? AND is_active = 1`,
      [tenantId]
    );
    for (const s of staff || []) {
      const [exists] = await conn.query(
        `SELECT id FROM staff_salary_records WHERE tenant_id = ? AND staff_id = ? AND month_year = ?`,
        [tenantId, s.id, monthYear]
      );
      if (exists?.[0]) continue;
      const id = await allocateNextId(conn, "staff_salary_records");
      await conn.query(
        `INSERT INTO staff_salary_records (id, tenant_id, staff_id, month_year, amount, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [id, tenantId, s.id, monthYear, Number(s.base_salary) || 0]
      );
    }
  } finally {
    conn.release();
  }
};

exports.markSalaryPaidDB = async (tenantId, recordId, username) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const [recRows] = await conn.query(
      "SELECT r.id, r.amount, r.month_year, r.status, s.name AS staff_name " +
        "FROM staff_salary_records r " +
        "LEFT JOIN staff_profiles s ON s.id = r.staff_id AND s.tenant_id = r.tenant_id " +
        "WHERE r.id = ? AND r.tenant_id = ?",
      [recordId, tenantId]
    );
    const rec = recRows && recRows[0];
    if (!rec) return;
    if (rec.status === "paid") return;

    await conn.query(
      "UPDATE staff_salary_records SET status = 'paid', paid_at = ? WHERE id = ? AND tenant_id = ?",
      [now, recordId, tenantId]
    );

    // salary_expense_sync: paid salary also becomes an expense (shows in Expenses + net profit)
    const marker = "salary_record:" + recordId;
    const [existing] = await conn.query(
      "SELECT id FROM expenses WHERE tenant_id = ? AND notes = ? LIMIT 1",
      [tenantId, marker]
    );
    if (!(existing && existing[0])) {
      const expId = await allocateNextId(conn, "expenses");
      await conn.query(
        "INSERT INTO expenses (id, tenant_id, title, amount, category, expense_date, notes, created_by) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          expId,
          tenantId,
          "Salary - " + (rec.staff_name || "Staff") + " (" + rec.month_year + ")",
          Number(rec.amount) || 0,
          "Salary",
          now,
          marker,
          username || null,
        ]
      );
    }
  } finally {
    conn.release();
  }
};
