import React, { useEffect, useRef, useState } from "react";
import Page from "../components/Page";
import { toast } from "react-hot-toast";
import {
  addExpense,
  deleteExpense,
  getExpenses,
  getProfitLoss,
} from "../controllers/expense.controller";
import { IconChartLine } from "@tabler/icons-react";
import { iconStroke } from "../config/config";
import { CURRENCIES } from "../config/currencies.config";
import { useTranslation } from "react-i18next";
import { getUserDetailsInLocalStorage } from "../helpers/UserDetails";
import {
  apaxInput,
  apaxBtnPrimary,
  apaxBtnSecondary,
  apaxCard,
  apaxPageTitle,
} from "../config/apaxTheme";

const FILTERS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last_7days", label: "Last 7 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Custom" },
];

export default function ProfitLossPage() {
  const { t } = useTranslation();
  const user = getUserDetailsInLocalStorage();
  const fromRef = useRef();
  const toRef = useRef();

  const [filter, setFilter] = useState("this_month");
  const [pl, setPl] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("");

  const currencySymbol =
    CURRENCIES.find((c) => c.cc === user?.currency || c.cc === "USD")?.symbol || "$";

  const loadPl = async () => {
    try {
      const from = filter === "custom" ? fromRef.current?.value : null;
      const to = filter === "custom" ? toRef.current?.value : null;
      if (filter === "custom" && (!from || !to)) return;
      const res = await getProfitLoss(filter, from, to);
      setPl(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadExpenses = async () => {
    try {
      const from = filter === "custom" ? fromRef.current?.value : null;
      const to = filter === "custom" ? toRef.current?.value : null;
      const res = await getExpenses(filter, from, to);
      setExpenses(res.data.expenses || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadPl();
    loadExpenses();
  }, [filter]);

  const onAddExpense = async () => {
    if (!expTitle.trim() || expAmount === "") {
      toast.error("Title and amount required");
      return;
    }
    try {
      await addExpense({
        title: expTitle.trim(),
        amount: Number(expAmount),
        category: expCategory || null,
      });
      toast.success("Expense added");
      setExpTitle("");
      setExpAmount("");
      setExpCategory("");
      loadPl();
      loadExpenses();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const onDeleteExpense = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id);
      loadPl();
      loadExpenses();
    } catch (e) {
      toast.error("Failed");
    }
  };

  return (
    <Page>
      <div className="flex items-center gap-2 mb-4">
        <IconChartLine stroke={iconStroke} />
        <h1 className={apaxPageTitle}>Profit &amp; loss</h1>
      </div>
      <p className="text-sm text-apax-text opacity-70 mb-4">
        Revenue = paid invoices in period. COGS = sum of purchases. Net = gross profit minus operating
        expenses you enter below.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`text-sm px-3 py-1.5 rounded-lg border transition ${
              filter === f.key
                ? "bg-apax-green text-white border-apax-border-green"
                : "bg-apax-gray text-apax-text border-apax-border-green hover:bg-apax-button-hover"
            }`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === "custom" && (
        <div className="flex gap-2 mb-4">
          <input ref={fromRef} type="date" className={apaxInput} />
          <input ref={toRef} type="date" className={apaxInput} />
          <button type="button" className={apaxBtnPrimary} onClick={() => { loadPl(); loadExpenses(); }}>
            Apply
          </button>
        </div>
      )}

      {pl && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            ["Revenue (sales)", pl.revenue],
            ["Purchases (COGS)", pl.cogs],
            ["Gross profit", pl.grossProfit],
            ["Operating expenses", pl.expenses],
            ["Net profit / loss", pl.netProfit],
          ].map(([label, val]) => (
            <div key={label} className={`${apaxCard} !p-4`}>
              <p className="text-sm text-apax-text opacity-70">{label}</p>
              <p className={`text-xl font-bold ${val < 0 ? "text-red-500" : ""}`}>
                {currencySymbol}
                {Number(val || 0).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className={`${apaxCard} mb-8`}>
        <h2 className="font-semibold mb-4 text-apax-text">Add operating expense</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className={`${apaxInput} flex-1 min-w-[140px]`}
            placeholder="Title (e.g. Rent)"
            value={expTitle}
            onChange={(e) => setExpTitle(e.target.value)}
          />
          <input
            type="number"
            className={`${apaxInput} w-32`}
            placeholder="Amount"
            value={expAmount}
            onChange={(e) => setExpAmount(e.target.value)}
          />
          <input
            className={`${apaxInput} w-40`}
            placeholder="Category"
            value={expCategory}
            onChange={(e) => setExpCategory(e.target.value)}
          />
          <button type="button" className={apaxBtnPrimary} onClick={onAddExpense}>
            Add
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-apax-border-green overflow-hidden">
        <h2 className="font-semibold p-4 bg-apax-gray">Expenses in period</h2>
        <table className="table w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Category</th>
              <th>Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className="text-xs">{e.expense_date}</td>
                <td>{e.title}</td>
                <td>{e.category || "—"}</td>
                <td>
                  {currencySymbol}
                  {Number(e.amount).toFixed(2)}
                </td>
                <td>
                  <button type="button" className={`${apaxBtnSecondary} text-xs`} onClick={() => onDeleteExpense(e.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
