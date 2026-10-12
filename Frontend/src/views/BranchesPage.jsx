import React, { useEffect, useState } from "react";
import Page from "../components/Page";
import toast from "react-hot-toast";
import { getBranches, addBranch, updateBranch, deleteBranch } from "../controllers/branch.controller";
import { apaxInput, apaxBtnPrimary, apaxCard, apaxPageTitle } from "../config/apaxTheme";

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getBranches();
      setBranches(res.data.branches || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setAddress("");
    setPhone("");
    setIsDefault(false);
    setIsActive(true);
  };

  const onSubmit = async () => {
    if (!name.trim()) return toast.error("Branch name required");
    try {
      setSaving(true);
      const payload = { name: name.trim(), address, phone, isDefault, isActive };
      if (editingId) {
        await updateBranch(editingId, payload);
        toast.success("Branch updated");
      } else {
        await addBranch(payload);
        toast.success("Branch added");
      }
      resetForm();
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save branch");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (branch) => {
    setEditingId(branch.id);
    setName(branch.name || "");
    setAddress(branch.address || "");
    setPhone(branch.phone || "");
    setIsDefault(Number(branch.is_default) === 1);
    setIsActive(Number(branch.is_active) !== 0);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this branch?")) return;
    try {
      await deleteBranch(id);
      toast.success("Deleted");
      if (editingId === id) resetForm();
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not delete branch");
    }
  };

  return (
    <Page>
      <h3 className={apaxPageTitle}>Branches</h3>
      <div className={`${apaxCard} mt-6 grid gap-3 md:grid-cols-2`}>
        <input className={apaxInput} placeholder="Branch name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={apaxInput} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className={`${apaxInput} md:col-span-2`} placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Default branch
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        <button type="button" className={apaxBtnPrimary} onClick={onSubmit} disabled={saving}>
          {saving ? "Saving..." : editingId ? "Update branch" : "Add branch"}
        </button>
        {editingId && (
          <button type="button" className="btn rounded-xl" onClick={resetForm}>
            Cancel edit
          </button>
        )}
      </div>
      <div className="mt-8 overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Default</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>Loading branches...</td>
              </tr>
            )}
            {branches.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.phone || "-"}</td>
                <td>{b.address || "-"}</td>
                <td>{b.is_default ? "Yes" : ""}</td>
                <td>{Number(b.is_active) === 0 ? "Inactive" : "Active"}</td>
                <td className="flex gap-2">
                  <button type="button" className="btn btn-sm" onClick={() => onEdit(b)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-sm btn-error" onClick={() => onDelete(b.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && branches.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-6">
                  No branches found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

