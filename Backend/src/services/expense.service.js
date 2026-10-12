const { getMySqlPromiseConnection, allocateNextId } = require("../config/mysql.db");

exports.getExpensesDB = async (tenantId, type, from, to) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const { filter, params } = getDateFilter("expense_date", type, from, to, tenantId);
    const [rows] = await conn.query(
      `SELECT * FROM expenses WHERE tenant_id = ? AND ${filter} ORDER BY expense_date DESC`,
      params
    );
    return rows;
  } finally {
    conn.release();
  }
};

exports.addExpenseDB = async (tenantId, data, username) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const id = await allocateNextId(conn, "expenses");
    await conn.query(
      `INSERT INTO expenses (id, tenant_id, title, amount, category, expense_date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tenantId,
        data.title,
        Number(data.amount),
        data.category || null,
        data.expenseDate || new Date().toISOString().slice(0, 19).replace("T", " "),
        data.notes || null,
        username || null,
      ]
    );
    return id;
  } finally {
    conn.release();
  }
};

exports.deleteExpenseDB = async (tenantId, expenseId) => {
  const conn = await getMySqlPromiseConnection();
  try {
    await conn.query(`DELETE FROM expenses WHERE id = ? AND tenant_id = ?`, [expenseId, tenantId]);
  } finally {
    conn.release();
  }
};

exports.getProfitLossDB = async (tenantId, type, from, to) => {
  const conn = await getMySqlPromiseConnection();
  try {
    const invFilter = getDateFilter("i.created_at", type, from, to, tenantId);
    const purFilter = getDateFilter("p.purchase_date", type, from, to, tenantId);
    const expFilter = getDateFilter("e.expense_date", type, from, to, tenantId);

    const [revRows] = await conn.query(
      `SELECT COALESCE(SUM(i.total), 0) AS revenue
       FROM invoices i
       WHERE i.tenant_id = ? AND ${invFilter.filter}`,
      invFilter.params
    );

    const [cogsRows] = await conn.query(
      `SELECT COALESCE(SUM(p.total_amount), 0) AS cogs
       FROM purchases p
       WHERE p.tenant_id = ? AND ${purFilter.filter}`,
      purFilter.params
    );

    const [expRows] = await conn.query(
      `SELECT COALESCE(SUM(e.amount), 0) AS expenses
       FROM expenses e
       WHERE e.tenant_id = ? AND ${expFilter.filter}`,
      expFilter.params
    );

    const revenue = Number(revRows[0]?.revenue || 0);
    const cogs = Number(cogsRows[0]?.cogs || 0);
    const expenses = Number(expRows[0]?.expenses || 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;

    return { revenue, cogs, expenses, grossProfit, netProfit };
  } finally {
    conn.release();
  }
};

function getDateFilter(column, type, from, to, tenantId) {
  const params = [tenantId];
  let filter = "1=1";
  switch (type) {
    case "custom":
      filter = `DATE(${column}) >= ? AND DATE(${column}) <= ?`;
      params.push(from, to);
      break;
    case "yesterday":
      filter = `DATE(${column}) = date(date('now'), '-1 day')`;
      break;
    case "last_7days":
      filter = `DATE(${column}) >= date(date('now'), '-7 days') AND DATE(${column}) <= date('now')`;
      break;
    case "last_month":
      filter = `DATE(${column}) >= date(date('now'), '-1 month') AND DATE(${column}) <= date('now')`;
      break;
    case "this_month":
      filter = `strftime('%Y', ${column}) = strftime('%Y', datetime('now')) AND strftime('%m', ${column}) = strftime('%m', datetime('now'))`;
      break;
    case "today":
    default:
      filter = `DATE(${column}) = date('now')`;
      break;
  }
  return { filter, params };
}

module.exports.getDateFilter = getDateFilter;
