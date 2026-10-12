import React, { useEffect, useState } from "react";
import Page from "../components/Page";
import toast from "react-hot-toast";
import {
  getSuppliersWithBalance,
  getSupplierLedger,
  recordSupplierLedgerEntry,
  updateSupplierLedgerEntry,
  deleteSupplierLedgerEntry,
} from "../controllers/supplierLedger.controller";
import {
  apaxInput,
  apaxSelect,
  apaxBtnPrimary,
  apaxBtnSecondary,
  apaxCard,
  apaxPageTitle,
} from "../config/apaxTheme";
import { CURRENCIES } from "../config/currencies.config";
import { getUserDetailsInLocalStorage } from "../helpers/UserDetails";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function SupplierLedgerPage() {
  const user = getUserDetailsInLocalStorage();
  const currency =
    CURRENCIES.find((c) => c.cc === user?.currency) ||
    CURRENCIES.find((c) => c.cc === "USD");
  const money = (amount) =>
    `${currency?.symbol || ""}${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const [suppliers, setSuppliers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [ledger, setLedger] = useState({ entries: [], balance: 0 });
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [entryType, setEntryType] = useState("payment");
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      setError("");
      const res = await getSuppliersWithBalance();
      const nextSuppliers = res.data.suppliers || [];
      setSuppliers(nextSuppliers);
      if (!selectedId && nextSuppliers.length === 1) {
        setSelectedId(String(nextSuppliers[0].id));
      }
    } catch (e) {
      console.error(e);
      const message =
        e?.response?.data?.message || "Could not load suppliers. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const loadLedger = async (id) => {
    if (!id) return;
    try {
      setLoadingLedger(true);
      setError("");
      const res = await getSupplierLedger(id);
      setLedger({ entries: res.data.entries || [], balance: res.data.balance || 0 });
    } catch (e) {
      console.error(e);
      const message =
        e?.response?.data?.message || "Could not load supplier ledger. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (selectedId) loadLedger(selectedId);
  }, [selectedId]);

  const resetEntryForm = () => {
    setEditingEntryId(null);
    setEntryType("payment");
    setPayAmount("");
    setPayNotes("");
  };

  const onEditEntry = (entry) => {
    if (entry.reference_type === "purchase" || entry.entry_type === "purchase") {
      toast.error("Edit purchase entries from Purchasing.");
      return;
    }
    setEditingEntryId(entry.id);
    setEntryType(entry.entry_type || "payment");
    setPayAmount(String(entry.amount || ""));
    setPayNotes(entry.notes || "");
  };

  const onSaveEntry = async () => {
    const amount = Number(payAmount);
    if (!selectedId) return toast.error("Select supplier");
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid payment amount");

    try {
      setSaving(true);
      if (editingEntryId) {
        await updateSupplierLedgerEntry(editingEntryId, {
          entryType,
          amount,
          notes: payNotes,
        });
        toast.success("Ledger entry updated");
      } else {
        await recordSupplierLedgerEntry({
          supplierId: Number(selectedId),
          entryType,
          amount,
          notes: payNotes,
        });
        toast.success("Ledger entry recorded");
      }
      resetEntryForm();
      await Promise.all([loadSuppliers(), loadLedger(selectedId)]);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Could not save ledger entry");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteEntry = async (entry) => {
    if (entry.reference_type === "purchase" || entry.entry_type === "purchase") {
      toast.error("Delete purchase entries from Purchasing.");
      return;
    }
    if (!window.confirm("Delete this ledger entry?")) return;
    try {
      await deleteSupplierLedgerEntry(entry.id);
      toast.success("Ledger entry deleted");
      if (editingEntryId === entry.id) resetEntryForm();
      await Promise.all([loadSuppliers(), loadLedger(selectedId)]);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not delete ledger entry");
    }
  };

  const selectedSupplier = suppliers.find((s) => String(s.id) === String(selectedId));

  return (
    <Page>
      <div className="flex flex-col gap-1">
        <h3 className={apaxPageTitle}>Supplier ledger (Udhaar)</h3>
        <p className="text-sm text-gray-500">
          Track supplier purchases and payments with a running balance.
        </p>
      </div>

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}

      <div className={`${apaxCard} mt-6`}>
        <div className="grid gap-3 md:grid-cols-5">
          <select
            className={apaxSelect}
            value={selectedId}
            disabled={loadingSuppliers}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">
              {loadingSuppliers ? "Loading suppliers..." : "Select supplier"}
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} - balance: {money(s.balance)}
              </option>
            ))}
          </select>
          <select
            className={apaxSelect}
            value={entryType}
            onChange={(e) => setEntryType(e.target.value)}
          >
            <option value="payment">Payment</option>
            <option value="credit">Credit adjustment</option>
            <option value="debit">Debit adjustment</option>
          </select>
          <input
            className={apaxInput}
            type="number"
            min="0"
            step="0.01"
            placeholder="Payment amount"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <input
            className={apaxInput}
            placeholder="Notes"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
          />
          <button
            type="button"
            className={apaxBtnPrimary}
            onClick={onSaveEntry}
            disabled={saving || !selectedId}
          >
            {saving ? "Saving..." : editingEntryId ? "Update entry" : "Record entry"}
          </button>
        </div>
        {editingEntryId && (
          <button type="button" className={`${apaxBtnSecondary} mt-3 text-sm`} onClick={resetEntryForm}>
            Cancel entry edit
          </button>
        )}

        {suppliers.length === 0 && !loadingSuppliers && (
          <div className="mt-4 rounded-2xl border border-dashed border-apax-border-green p-4 text-sm text-gray-500">
            No suppliers found. Add suppliers from the Purchasing page first.
          </div>
        )}
      </div>

      {selectedId && (
        <div className={`${apaxCard} mt-6`}>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gray-500">Selected supplier</p>
              <p className="font-semibold text-lg text-apax-text">
                {selectedSupplier?.name || "Supplier"}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-gray-500">Current balance</p>
              <p className="font-bold text-2xl text-apax-green">{money(ledger.balance)}</p>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              className={`${apaxBtnSecondary} text-sm`}
              onClick={() => loadLedger(selectedId)}
              disabled={loadingLedger}
            >
              {loadingLedger ? "Refreshing..." : "Refresh ledger"}
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="table w-full text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance</th>
                  <th>Reference</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ledger.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.created_at)}</td>
                    <td>
                      <span
                        className={`badge ${
                          entry.entry_type === "payment" || entry.entry_type === "credit"
                            ? "badge-success"
                            : "badge-warning"
                        }`}
                      >
                        {entry.entry_type}
                      </span>
                    </td>
                    <td>{money(entry.amount)}</td>
                    <td>{money(entry.balance_after)}</td>
                    <td>
                      {entry.reference_type
                        ? `${entry.reference_type}${entry.reference_id ? ` #${entry.reference_id}` : ""}`
                        : "-"}
                    </td>
                    <td>{entry.notes || "-"}</td>
                    <td className="flex gap-2">
                      {entry.reference_type === "purchase" || entry.entry_type === "purchase" ? (
                        <span className="text-xs text-gray-500">Manage in Purchasing</span>
                      ) : (
                        <>
                          <button type="button" className="btn btn-xs" onClick={() => onEditEntry(entry)}>
                            Edit
                          </button>
                          <button type="button" className="btn btn-xs btn-error" onClick={() => onDeleteEntry(entry)}>
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ledger.entries.length === 0 && !loadingLedger && (
              <p className="py-8 text-center text-sm text-gray-500">
                No ledger entries yet. Purchases and payments will appear here.
              </p>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}

