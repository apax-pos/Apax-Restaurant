import React, { useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { Link } from "react-router-dom";
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconChevronRight,
  IconFilter,
  IconShoppingCart,
  IconReceipt,
  IconUsers,
  IconWallet,
  IconChartLine,
  IconPackage,
  IconAlertTriangle,
  IconReportAnalytics,
} from "@tabler/icons-react";
import Page from "../components/Page";
import { useDashboard } from "../controllers/dashboard.controller";
import { CURRENCIES } from "../config/currencies.config";
import { useTranslation } from "react-i18next";
import { getImageURL } from "../helpers/ImageHelper";
import { iconStroke } from "../config/config";

const RANGE_OPTIONS = [
  { key: "today", labelKey: "dashboard.range_today" },
  { key: "yesterday", labelKey: "dashboard.range_yesterday" },
  { key: "last_7days", labelKey: "dashboard.range_last_7days" },
  { key: "this_month", labelKey: "dashboard.range_this_month" },
];

const DASHBOARD_TEXT = {
  "dashboard.title": "Dashboard",
  "dashboard.subtitle": "Overview of your business performance",
  "dashboard.filters": "Filters",
  "dashboard.range_today": "Today",
  "dashboard.range_yesterday": "Yesterday",
  "dashboard.range_last_7days": "Last 7 days",
  "dashboard.range_this_month": "This month",
  "dashboard.total_sales": "Total Sales Today",
  "dashboard.net_profit": "Net Profit",
  "dashboard.total_expenses": "Total Expenses",
  "dashboard.orders": "Orders",
  "dashboard.customers": "Customers",
  "dashboard.vs_yesterday": "vs yesterday",
  "dashboard.financial_overview": "Financial Overview",
  "dashboard.revenue": "Revenue (Sales)",
  "dashboard.expenses": "Expenses",
  "dashboard.profit_margin": "Profit Margin",
  "dashboard.sales_last_7_days": "Sales Last 7 Days",
  "dashboard.revenue_vs_expenses": "Revenue vs Expenses",
  "dashboard.top_selling_items": "Top Selling Items",
  "dashboard.no_top_selling_items": "No bestsellers for this period.",
  "dashboard.payments_by_method": "Payments by Methods",
  "dashboard.no_payments": "No payments recorded yet.",
  "dashboard.quick_actions": "Quick Actions",
  "dashboard.quick_new_order": "New Order",
  "dashboard.quick_add_expense": "Add Expense",
  "dashboard.quick_add_customer": "Add Customer",
  "dashboard.quick_add_item": "Add Item",
  "dashboard.quick_view_reports": "View Reports",
  "dashboard.recent_orders": "Recent Orders",
  "dashboard.view_all": "View all",
  "dashboard.order_id": "Order ID",
  "dashboard.table": "Table",
  "dashboard.amount": "Amount",
  "dashboard.status": "Status",
  "dashboard.time": "Time",
  "dashboard.no_orders": "No orders yet.",
  "dashboard.low_stock_alerts": "Low Stock Alerts",
  "dashboard.view_inventory": "View inventory",
  "dashboard.low_stock": "Low Stock",
  "dashboard.left": "left",
  "dashboard.no_low_stock": "All stock levels look good.",
  "dashboard.rights": "All rights reserved.",
  "dashboard.error": "Error loading details!",
};

function formatMoney(amount, currency) {
  const sym = currency?.symbol || "$";
  const val = Number(amount) || 0;
  return `${sym}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(n) {
  const v = Number(n) || 0;
  return `${v > 0 ? "+" : ""}${v}%`;
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatOrderTime(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(dateStr));
}

function ChangeBadge({ value }) {
  const n = Number(value) || 0;
  const up = n >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}
      {formatPct(n)}
    </span>
  );
}

function KpiCard({ icon: Icon, iconBg, label, value, change, vsLabel }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={20} stroke={iconStroke} />
      </div>
      <p className="text-sm text-gray-500 mt-4">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        <ChangeBadge value={change} />
        <span className="text-xs text-gray-400">{vsLabel}</span>
      </div>
    </div>
  );
}

function Sparkline({ series, color }) {
  const options = {
    chart: { sparkline: { enabled: true }, animations: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: [color],
    tooltip: { enabled: false },
  };
  return (
    <ReactApexChart
      options={options}
      series={[{ name: "v", data: series.length ? series : [0] }]}
      type="area"
      height={48}
      width="100%"
    />
  );
}

function StatusBadge({ status, paymentStatus }) {
  const done =
    String(status).toLowerCase() === "completed" || String(paymentStatus).toLowerCase() === "paid";
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
        done
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      }`}
    >
      {done ? "Completed" : status || "Pending"}
    </span>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const dt = (key) => t(key, { defaultValue: DASHBOARD_TEXT[key] || key });
  const [range, setRange] = useState("today");
  const [showFilters, setShowFilters] = useState(false);
  const { data, error, isLoading } = useDashboard(range);

  const currency = useMemo(
    () => CURRENCIES.find((c) => c.cc === data?.currency),
    [data?.currency]
  );
  const fmt = (n) => formatMoney(n, currency);

  if (isLoading) {
    return (
      <Page className="px-4 py-6 max-w-[1600px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
            ))}
          </div>
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <p className="text-red-500">{dt("dashboard.error")}</p>
      </Page>
    );
  }

  const kpis = data?.kpis || {};
  const financial = data?.financial || {};
  const last7 = data?.salesLast7Days || [];
  const categories = last7.map((d) => formatDayLabel(d.date));
  const salesSeries = last7.map((d) => d.revenue);
  const revSeries = last7.map((d) => d.revenue);
  const expSeries = last7.map((d) => d.expenses);

  const lineChartOptions = {
    chart: { toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: "smooth", width: 3 },
    colors: ["#22C55E"],
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05 },
    },
    dataLabels: { enabled: false },
    xaxis: { categories, labels: { style: { colors: "#9CA3AF", fontSize: "11px" } } },
    yaxis: {
      labels: {
        formatter: (v) => fmt(v),
        style: { colors: "#9CA3AF", fontSize: "11px" },
      },
    },
    grid: { borderColor: "#F3F4F6", strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };

  const barChartOptions = {
    chart: { toolbar: { show: false }, stacked: false },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "55%" } },
    colors: ["#22C55E", "#EF4444"],
    dataLabels: { enabled: false },
    xaxis: { categories, labels: { style: { colors: "#9CA3AF", fontSize: "11px" } } },
    yaxis: {
      labels: {
        formatter: (v) => fmt(v),
        style: { colors: "#9CA3AF", fontSize: "11px" },
      },
    },
    legend: { position: "top", horizontalAlign: "right" },
    grid: { borderColor: "#F3F4F6", strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };

  const payments = data?.paymentsByMethod || [];
  const payTotal = payments.reduce((s, p) => s + Number(p.total), 0) || 1;
  const donutOptions = {
    chart: { type: "donut" },
    labels: payments.map((p) => p.title),
    colors: ["#22C55E", "#3B82F6", "#A855F7", "#F59E0B", "#64748B"],
    legend: { show: false },
    dataLabels: { enabled: true, formatter: (val) => `${Math.round(val)}%` },
    plotOptions: {
      pie: {
        donut: { size: "68%", labels: { show: false } },
      },
    },
  };

  const vsYesterday = dt("dashboard.vs_yesterday");

  const rangeLabel =
    range === "today"
      ? `${dt("dashboard.range_today")} (${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })})`
      : dt(RANGE_OPTIONS.find((r) => r.key === range)?.labelKey || "dashboard.range_today");

  const quickActions = [
    { label: dt("dashboard.quick_new_order"), to: "/dashboard/pos", icon: IconShoppingCart },
    { label: dt("dashboard.quick_add_expense"), to: "/dashboard/profit-loss", icon: IconReceipt },
    { label: dt("dashboard.quick_add_customer"), to: "/dashboard/customers", icon: IconUsers },
    { label: dt("dashboard.quick_add_item"), to: "/dashboard/settings/menu-items", icon: IconPackage },
    { label: dt("dashboard.quick_view_reports"), to: "/dashboard/reports", icon: IconReportAnalytics },
  ];

  return (
    <Page className="px-4 py-5 md:px-6 max-w-[1600px] mx-auto bg-[#F9FAFB] dark:bg-gray-950 min-h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{dt("dashboard.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{dt("dashboard.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 shadow-sm"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {dt(opt.labelKey)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="inline-flex items-center gap-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <IconFilter size={18} stroke={iconStroke} />
            {dt("dashboard.filters")}
          </button>
        </div>
      </div>

      {showFilters && (
        <p className="text-xs text-gray-500 mb-4 -mt-2">{rangeLabel}</p>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <KpiCard
          icon={IconChartLine}
          iconBg="bg-emerald-50 text-emerald-600"
          label={dt("dashboard.total_sales")}
          value={fmt(kpis.totalSales)}
          change={kpis.totalSalesChange}
          vsLabel={vsYesterday}
        />
        <KpiCard
          icon={IconWallet}
          iconBg="bg-blue-50 text-blue-600"
          label={dt("dashboard.net_profit")}
          value={fmt(kpis.netProfit)}
          change={kpis.netProfitChange}
          vsLabel={vsYesterday}
        />
        <KpiCard
          icon={IconReceipt}
          iconBg="bg-orange-50 text-orange-600"
          label={dt("dashboard.total_expenses")}
          value={fmt(kpis.totalExpenses)}
          change={kpis.totalExpensesChange}
          vsLabel={vsYesterday}
        />
        <KpiCard
          icon={IconShoppingCart}
          iconBg="bg-violet-50 text-violet-600"
          label={dt("dashboard.orders")}
          value={String(kpis.orders ?? 0)}
          change={kpis.ordersChange}
          vsLabel={vsYesterday}
        />
        <KpiCard
          icon={IconUsers}
          iconBg="bg-cyan-50 text-cyan-600"
          label={dt("dashboard.customers")}
          value={String(kpis.customers ?? 0)}
          change={kpis.customersChange}
          vsLabel={vsYesterday}
        />
      </div>

      {/* Financial overview */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white">{dt("dashboard.financial_overview")}</h2>
          <span className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-lg">{rangeLabel}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">{dt("dashboard.revenue")}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{fmt(financial.revenue)}</p>
            <div className="mt-2 h-12">
              <Sparkline series={financial.sparklineRevenue || []} color="#22C55E" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">{dt("dashboard.expenses")}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{fmt(financial.expenses)}</p>
            <div className="mt-2 h-12">
              <Sparkline series={financial.sparklineExpenses || []} color="#EF4444" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">{dt("dashboard.net_profit")}</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{fmt(financial.netProfit)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {dt("dashboard.profit_margin")}: <span className="font-semibold text-gray-700 dark:text-gray-300">{financial.profitMargin ?? 0}%</span>
            </p>
            <div className="mt-2 h-12">
              <Sparkline series={financial.sparklineProfit || []} color="#22C55E" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{dt("dashboard.sales_last_7_days")}</h2>
          <ReactApexChart
            options={lineChartOptions}
            series={[{ name: dt("dashboard.revenue"), data: salesSeries }]}
            type="area"
            height={280}
          />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{dt("dashboard.revenue_vs_expenses")}</h2>
          <ReactApexChart
            options={barChartOptions}
            series={[
              { name: dt("dashboard.revenue"), data: revSeries },
              { name: dt("dashboard.expenses"), data: expSeries },
            ]}
            type="bar"
            height={280}
          />
        </div>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Top selling */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{dt("dashboard.top_selling_items")}</h2>
          {(data?.topSellingItems || []).length === 0 ? (
            <p className="text-sm text-gray-500">{dt("dashboard.no_top_selling_items")}</p>
          ) : (
            <ul className="space-y-4">
              {(data.topSellingItems || []).map((item, idx) => {
                const img = item.image ? getImageURL(item.image) : null;
                return (
                  <li key={item.id} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-5">{idx + 1}</span>
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">—</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        Qty {item.orders_count} · {fmt(item.total_amount || item.price * item.orders_count)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Payments */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{dt("dashboard.payments_by_method")}</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">{dt("dashboard.no_payments")}</p>
          ) : (
            <>
              <ReactApexChart
                options={donutOptions}
                series={payments.map((p) => Number(p.total))}
                type="donut"
                height={220}
              />
              <ul className="mt-2 space-y-2">
                {payments.map((p, i) => {
                  const pct = Math.round((Number(p.total) / payTotal) * 100);
                  return (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{p.title}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {pct}% · {fmt(p.total)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{dt("dashboard.quick_actions")}</h2>
          <ul className="space-y-2">
            {quickActions.map((action) => (
              <li key={action.to}>
                <Link
                  to={action.to}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                    <action.icon size={18} stroke={iconStroke} className="text-emerald-600" />
                    {action.label}
                  </span>
                  <IconChevronRight size={18} className="text-gray-400 group-hover:text-emerald-600" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">{dt("dashboard.recent_orders")}</h2>
            <Link to="/dashboard/orders" className="text-sm text-emerald-600 hover:underline">
              {dt("dashboard.view_all")}
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3 font-medium">{dt("dashboard.order_id")}</th>
                <th className="pb-3 font-medium">{dt("dashboard.table")}</th>
                <th className="pb-3 font-medium">{dt("dashboard.amount")}</th>
                <th className="pb-3 font-medium">{dt("dashboard.status")}</th>
                <th className="pb-3 font-medium text-right">{dt("dashboard.time")}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentOrders || []).map((o) => (
                <tr key={o.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                  <td className="py-3 font-medium text-gray-900 dark:text-white">#{o.token_no || o.id}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{o.table_title || "—"}</td>
                  <td className="py-3 font-medium">{fmt(o.total)}</td>
                  <td className="py-3">
                    <StatusBadge status={o.status} paymentStatus={o.payment_status} />
                  </td>
                  <td className="py-3 text-right text-gray-500">{formatOrderTime(o.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data?.recentOrders || []).length === 0 && (
            <p className="text-sm text-gray-500 py-6 text-center">{dt("dashboard.no_orders")}</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">{dt("dashboard.low_stock_alerts")}</h2>
            <Link to="/dashboard/inventory/dashboard" className="text-sm text-emerald-600 hover:underline">
              {dt("dashboard.view_inventory")}
            </Link>
          </div>
          {(data?.lowStockItems || []).length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">{dt("dashboard.no_low_stock")}</p>
          ) : (
            <ul className="space-y-4">
              {data.lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                      <IconAlertTriangle size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} {item.unit || ""} {dt("dashboard.left")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 whitespace-nowrap">
                    {dt("dashboard.low_stock")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">© {new Date().getFullYear()} ApaxPOS. {dt("dashboard.rights")}</p>
    </Page>
  );
}
