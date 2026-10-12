const { getMySqlPromiseConnection } = require("../config/mysql.db");

function getFilterCondition(field, type, from, to) {
  const params = [];
  let filter = "";
  switch (type) {
    case "custom":
      params.push(from, to);
      filter = `DATE(${field}) >= ? AND DATE(${field}) <= ?`;
      break;
    case "today":
      filter = `DATE(${field}) = date('now')`;
      break;
    case "yesterday":
      filter = `DATE(${field}) = date('now', '-1 day')`;
      break;
    case "last_7days":
      filter = `DATE(${field}) >= date('now', '-6 days') AND DATE(${field}) <= date('now')`;
      break;
    case "this_month":
      filter = `strftime('%Y', ${field}) = strftime('%Y', 'now') AND strftime('%m', ${field}) = strftime('%m', 'now')`;
      break;
    default:
      filter = `DATE(${field}) = date('now')`;
  }
  return { params, filter };
}

function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
}

async function sumRevenue(conn, tenantId, type, from, to) {
  const { filter, params } = getFilterCondition("created_at", type, from, to);
  const [rows] = await conn.query(
    `SELECT COALESCE(SUM(total), 0) AS v FROM invoices WHERE tenant_id = ? AND ${filter}`,
    [tenantId, ...params]
  );
  return Number(rows[0]?.v) || 0;
}

async function sumExpenses(conn, tenantId, type, from, to) {
  const { filter, params } = getFilterCondition("expense_date", type, from, to);
  const [rows] = await conn.query(
    `SELECT COALESCE(SUM(amount), 0) AS v FROM expenses WHERE tenant_id = ? AND ${filter}`,
    [tenantId, ...params]
  );
  return Number(rows[0]?.v) || 0;
}

async function countOrders(conn, tenantId, type, from, to) {
  const { filter, params } = getFilterCondition("date", type, from, to);
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS v FROM orders WHERE tenant_id = ? AND ${filter}`,
    [tenantId, ...params]
  );
  return Number(rows[0]?.v) || 0;
}

async function countNewCustomers(conn, tenantId, type, from, to) {
  const { filter, params } = getFilterCondition("created_at", type, from, to);
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS v FROM customers WHERE tenant_id = ? AND ${filter}`,
    [tenantId, ...params]
  );
  return Number(rows[0]?.v) || 0;
}

exports.getDashboardAnalyticsDB = async (tenantId, rangeType = "today", from = null, to = null) => {
  const conn = await getMySqlPromiseConnection();
  const type = rangeType || "today";
  try {
    const [
      salesToday,
      salesYesterday,
      expensesToday,
      expensesYesterday,
      ordersToday,
      ordersYesterday,
      customersToday,
      customersYesterday,
    ] = await Promise.all([
      sumRevenue(conn, tenantId, type, from, to),
      sumRevenue(conn, tenantId, "yesterday"),
      sumExpenses(conn, tenantId, type, from, to),
      sumExpenses(conn, tenantId, "yesterday"),
      countOrders(conn, tenantId, type, from, to),
      countOrders(conn, tenantId, "yesterday"),
      countNewCustomers(conn, tenantId, type, from, to),
      countNewCustomers(conn, tenantId, "yesterday"),
    ]);

    const netProfitToday = salesToday - expensesToday;
    const netProfitYesterday = salesYesterday - expensesYesterday;
    const profitMargin =
      salesToday > 0 ? Math.round((netProfitToday / salesToday) * 1000) / 10 : 0;

    const revFilter = getFilterCondition("created_at", "last_7days");
    const expFilter = getFilterCondition("expense_date", "last_7days");

    const [dailyRevenue] = await conn.query(
      `SELECT DATE(created_at) AS day, COALESCE(SUM(total), 0) AS revenue
       FROM invoices WHERE tenant_id = ? AND ${revFilter.filter}
       GROUP BY DATE(created_at) ORDER BY day ASC`,
      [tenantId, ...revFilter.params]
    );

    const [dailyExpenses] = await conn.query(
      `SELECT DATE(expense_date) AS day, COALESCE(SUM(amount), 0) AS expenses
       FROM expenses WHERE tenant_id = ? AND ${expFilter.filter}
       GROUP BY DATE(expense_date) ORDER BY day ASC`,
      [tenantId, ...expFilter.params]
    );

    const revByDay = new Map(dailyRevenue.map((r) => [String(r.day).slice(0, 10), Number(r.revenue) || 0]));
    const expByDay = new Map(dailyExpenses.map((r) => [String(r.day).slice(0, 10), Number(r.expenses) || 0]));
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = d.toISOString().slice(0, 10);
      const revenue = revByDay.get(day) || 0;
      const expenses = expByDay.get(day) || 0;
      last7Days.push({ date: day, revenue, expenses });
    }

    const topFilter = getFilterCondition("date", type, from, to);
    const [topSellingItems] = await conn.query(
      `SELECT mi.id, mi.title, mi.price, mi.image,
              oi_c.orders_count,
              oi_c.total_amount
       FROM menu_items mi
       INNER JOIN (
         SELECT item_id,
                SUM(quantity) AS orders_count,
                SUM(quantity * price) AS total_amount
         FROM order_items
         WHERE tenant_id = ? AND status <> 'cancelled' AND ${topFilter.filter}
         GROUP BY item_id
         ORDER BY orders_count DESC
         LIMIT 5
       ) oi_c ON mi.id = oi_c.item_id
       WHERE mi.tenant_id = ?
       ORDER BY oi_c.orders_count DESC`,
      [tenantId, ...topFilter.params, tenantId]
    );

    const payFilter = getFilterCondition("created_at", type, from, to);
    const [paymentsByMethod] = await conn.query(
      `SELECT pt.title, COALESCE(SUM(i.total), 0) AS total
       FROM invoices i
       INNER JOIN payment_types pt ON i.payment_type_id = pt.id AND i.tenant_id = pt.tenant_id
       WHERE i.tenant_id = ? AND ${payFilter.filter}
       GROUP BY pt.id, pt.title
       ORDER BY total DESC`,
      [tenantId, ...payFilter.params]
    );

    const [recentOrders] = await conn.query(
      `SELECT o.id, o.token_no, o.status, o.date, o.payment_status,
              st.table_title,
              COALESCE(i.total, 0) AS total
       FROM orders o
       LEFT JOIN invoices i ON o.invoice_id = i.id AND i.tenant_id = o.tenant_id
       LEFT JOIN store_tables st ON o.table_id = st.id
       WHERE o.tenant_id = ?
       ORDER BY o.date DESC
       LIMIT 5`,
      [tenantId]
    );

    let lowStockItems = [];
    try {
      const [rows] = await conn.query(
        `SELECT id, title, quantity, unit, min_quantity_threshold, status
         FROM inventory_items
         WHERE tenant_id = ? AND status IN ('low', 'out')
         ORDER BY quantity ASC
         LIMIT 5`,
        [tenantId]
      );
      lowStockItems = rows || [];
    } catch (invErr) {
      console.warn("dashboard low stock:", invErr.message);
    }

    return {
      rangeType: type,
      kpis: {
        totalSales: salesToday,
        totalSalesChange: pctChange(salesToday, salesYesterday),
        netProfit: netProfitToday,
        netProfitChange: pctChange(netProfitToday, netProfitYesterday),
        totalExpenses: expensesToday,
        totalExpensesChange: pctChange(expensesToday, expensesYesterday),
        orders: ordersToday,
        ordersChange: pctChange(ordersToday, ordersYesterday),
        customers: customersToday,
        customersChange: pctChange(customersToday, customersYesterday),
      },
      financial: {
        revenue: salesToday,
        expenses: expensesToday,
        netProfit: netProfitToday,
        profitMargin,
        sparklineRevenue: last7Days.map((d) => d.revenue),
        sparklineExpenses: last7Days.map((d) => d.expenses),
        sparklineProfit: last7Days.map((d) => d.revenue - d.expenses),
      },
      salesLast7Days: last7Days,
      revenueVsExpenses: last7Days,
      topSellingItems: topSellingItems || [],
      paymentsByMethod: paymentsByMethod || [],
      recentOrders: recentOrders || [],
      lowStockItems: lowStockItems || [],
    };
  } finally {
    conn.release();
  }
};
