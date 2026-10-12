import React, { useEffect, useState } from "react";
import Page from "../components/Page";
import { toast } from "react-hot-toast";
import {
  closeShift,
  deleteShift,
  getActiveShift,
  getShift,
  getShifts,
  openShift,
  updateShift,
} from "../controllers/shift.controller";
import { getBranches } from "../controllers/branch.controller";
import { Link } from "react-router-dom";
import { IconClock } from "@tabler/icons-react";
import { iconStroke } from "../config/config";
import {
  apaxInput,
  apaxSelect,
  apaxTextarea,
  apaxBtnPrimary,
  apaxBtnSecondary,
  apaxBtnDanger,
  apaxCard,
  apaxPageTitle,
} from "../config/apaxTheme";
import { useTranslation } from "react-i18next";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function ShiftsPage() {
  const { t } = useTranslation();
  const [activeShift, setActiveShift] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [inchargeName, setInchargeName] = useState("");
  const [openingCash, setOpeningCash] = useState(0);
  const [branchId, setBranchId] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editClosingCash, setEditClosingCash] = useState("");
  const [closingCash, setClosingCash] = useState(0);
  const [closeNotes, setCloseNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [activeRes, listRes, branchRes] = await Promise.all([
        getActiveShift(),
        getShifts(),
        getBranches().catch(() => ({ data: { branches: [] } })),
      ]);
      setActiveShift(activeRes.data.shift);
      setShifts(listRes.data.shifts || []);
      setBranches((branchRes.data.branches || []).filter((b) => Number(b.is_active) !== 0));
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Could not load shifts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setInchargeName("");
    setOpeningCash(0);
    setBranchId("");
    setShiftNotes("");
    setEditStatus("");
    setEditClosingCash("");
  };

  const onSave = async () => {
    if (!inchargeName.trim()) {
      toast.error("Enter shift in-charge name");
      return;
    }
    try {
      setSaving(true);
      toast.loading(editingId ? "Updating shift..." : "Opening shift...");
      const payload = {
        inchargeName: inchargeName.trim(),
        openingCash,
        branchId: branchId ? Number(branchId) : null,
        notes: shiftNotes || null,
      };
      if (editingId && editStatus === "closed") {
        payload.closingCash = editClosingCash;
      }
      const res = editingId ? await updateShift(editingId, payload) : await openShift(payload);
      toast.dismiss();
      toast.success(res.data.message || (editingId ? "Shift updated" : "Shift opened"));
      resetForm();
      await load();
    } catch (e) {
      toast.dismiss();
      toast.error(e?.response?.data?.message || (editingId ? "Failed to update shift" : "Failed to open shift"));
    } finally {
      setSaving(false);
    }
  };

  const onClose = async () => {
    if (!activeShift?.id) return;
    try {
      toast.loading("Closing shift...");
      const res = await closeShift(activeShift.id, closingCash, closeNotes);
      toast.dismiss();
      toast.success(
        `Shift closed. Expected cash: ${Number(res.data.expected_cash || 0).toFixed(2)}`
      );
      setClosingCash(0);
      setCloseNotes("");
      load();
    } catch (e) {
      toast.dismiss();
      toast.error(e?.response?.data?.message || "Failed to close shift");
    }
  };

  const onEdit = async (shiftId) => {
    try {
      const res = await getShift(shiftId);
      const shift = res.data.shift;
      setEditingId(shift.id);
      setInchargeName(shift.incharge_name || "");
      setOpeningCash(Number(shift.opening_cash || 0));
      setBranchId(shift.branch_id ? String(shift.branch_id) : "");
      setShiftNotes(shift.notes || "");
      setEditStatus(shift.status || "");
      setEditClosingCash(shift.closing_cash != null ? String(shift.closing_cash) : "");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not load shift");
    }
  };

  const onDelete = async (shiftId) => {
    if (!window.confirm("Delete this shift? Shifts with orders cannot be deleted.")) return;
    try {
      await deleteShift(shiftId);
      toast.success("Shift deleted");
      if (editingId === shiftId) resetForm();
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not delete shift");
    }
  };

  if (loading) {
    return <Page className="text-apax-text">{t("superadmin_reports.loading_message")}</Page>;
  }

  return (
    <Page>
      <div className="flex items-center gap-2 mb-2">
        <IconClock stroke={iconStroke} className="text-apax-green" />
        <h1 className={apaxPageTitle}>Shift management</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className={`${apaxCard}`}>
          <h2 className="font-semibold text-lg mb-4 text-apax-text">
            {editingId ? `Edit shift #${editingId}` : "Open shift"}
          </h2>
          <p className="text-sm text-apax-text opacity-70 mb-4">
            POS orders require an open shift. Enter the person in charge, branch, and opening cash.
          </p>
          <label className="block mb-2 text-sm text-apax-text">In-charge name *</label>
          <input
            className={`${apaxInput} mb-3`}
            value={inchargeName}
            onChange={(e) => setInchargeName(e.target.value)}
            placeholder="e.g. Ahmed Khan"
          />
          <label className="block mb-2 text-sm text-apax-text">Branch</label>
          <select
            className={`${apaxSelect} mb-3`}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Default branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <label className="block mb-2 text-sm text-apax-text">Opening cash</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={`${apaxInput} mb-4`}
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
          />
          {editingId && editStatus === "closed" && (
            <>
              <label className="block mb-2 text-sm text-apax-text">Closing cash</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${apaxInput} mb-3`}
                value={editClosingCash}
                onChange={(e) => setEditClosingCash(e.target.value)}
              />
            </>
          )}
          <label className="block mb-2 text-sm text-apax-text">Notes</label>
          <textarea
            className={`${apaxTextarea} mb-4`}
            rows={2}
            value={shiftNotes}
            onChange={(e) => setShiftNotes(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={apaxBtnPrimary} onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update shift" : "Open shift"}
            </button>
            {editingId && (
              <button type="button" className={apaxBtnSecondary} onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </div>

        {activeShift ? (
          <div className={`${apaxCard}`}>
            <h2 className="font-semibold text-lg mb-2 text-apax-text">Active shift</h2>
            <p className="text-sm text-apax-text">
              <strong>In-charge:</strong> {activeShift.incharge_name}
            </p>
            <p className="text-sm text-apax-text">
              <strong>Branch:</strong> {activeShift.branch_name || "Default"}
            </p>
            <p className="text-sm text-apax-text">
              <strong>Opened:</strong> {formatDate(activeShift.opened_at)} by {activeShift.opened_by || "—"}
            </p>
            <p className="text-sm mb-4 text-apax-text">
              <strong>Opening cash:</strong> {Number(activeShift.opening_cash || 0).toFixed(2)}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <Link to="/dashboard/pos" className={`${apaxBtnSecondary} inline-block text-sm`}>
                Go to POS
              </Link>
              <button type="button" className={`${apaxBtnSecondary} text-sm`} onClick={() => onEdit(activeShift.id)}>
                Edit active shift
              </button>
            </div>
            <hr className="my-4 border-apax-border-green" />
            <h3 className="font-medium mb-2 text-apax-text">Close shift</h3>
            <label className="block mb-2 text-sm text-apax-text">Closing cash counted</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`${apaxInput} mb-3`}
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
            />
            <label className="block mb-2 text-sm text-apax-text">Notes</label>
            <textarea
              className={`${apaxTextarea} mb-4`}
              rows={2}
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
            />
            <button type="button" className={apaxBtnDanger} onClick={onClose}>
              Close shift
            </button>
          </div>
        ) : (
          <div className={`${apaxCard}`}>
            <h2 className="font-semibold text-lg mb-2 text-apax-text">No active shift</h2>
            <p className="text-sm text-apax-text opacity-70">
              Open a shift to start taking POS orders.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-semibold mb-3 text-apax-text">Recent shifts</h2>
        <div className="overflow-x-auto rounded-xl border border-apax-border-green bg-apax-card-bg">
          <table className="table w-full text-apax-text">
            <thead>
              <tr>
                <th>In-charge</th>
                <th>Branch</th>
                <th>Opened</th>
                <th>Closed</th>
                <th>Status</th>
                <th>Opening</th>
                <th>Closing</th>
                <th>Expected</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td>{s.incharge_name}</td>
                  <td>{s.branch_name || "Default"}</td>
                  <td className="text-xs">{formatDate(s.opened_at)}</td>
                  <td className="text-xs">{formatDate(s.closed_at)}</td>
                  <td>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                        s.status === "open"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-apax-gray text-apax-text"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>{Number(s.opening_cash || 0).toFixed(2)}</td>
                  <td>{s.closing_cash != null ? Number(s.closing_cash).toFixed(2) : "—"}</td>
                  <td>{s.expected_cash != null ? Number(s.expected_cash).toFixed(2) : "—"}</td>
                  <td className="flex gap-2">
                    <button type="button" className="btn btn-xs" onClick={() => onEdit(s.id)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-xs btn-error" onClick={() => onDelete(s.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-gray-500 py-6">
                    No shifts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}
