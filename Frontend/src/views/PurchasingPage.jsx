import React, { useEffect, useState } from "react";
import Page from "../components/Page";
import { toast } from "react-hot-toast";
import {
  addSupplier,
  createPurchase,
  deletePurchase,
  deleteSupplier,
  getPurchase,
  getPurchases,
  getSuppliers,
  updatePurchase,
  updateSupplier,
} from "../controllers/purchasing.controller";
import { useInventoryItems } from "../controllers/inventory.controller";
import { IconShoppingCart } from "@tabler/icons-react";
import { iconStroke } from "../config/config";
import { CURRENCIES } from "../config/currencies.config";
import { getUserDetailsInLocalStorage } from "../helpers/UserDetails";
import {
  apaxInput,
  apaxSelect,
  apaxBtnPrimary,
  apaxBtnSecondary,
  apaxCard,
  apaxPageTitle,
} from "../config/apaxTheme";

export default function PurchasingPage() {
  const user = getUserDetailsInLocalStorage();
  const { data: invData, isLoading: invLoading } = useInventoryItems({ status: "all" });

  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [lines, setLines] = useState([
    { inventoryItemId: "", quantity: 1, unitCost: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);

  const currencySymbol =
    (CURRENCIES.find((c) => c.cc === user?.currency) || CURRENCIES.find((c) => c.cc === "USD"))
      ?.symbol || "";

  const load = async () => {
    try {
      setLoading(true);
      const [supRes, purRes] = await Promise.all([getSuppliers(), getPurchases()]);
      setSuppliers(supRes.data.suppliers || []);
      setPurchases(purRes.data.purchases || []);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Could not load purchasing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addLine = () => {
    setLines([...lines, { inventoryItemId: "", quantity: 1, unitCost: 0 }]);
  };

  const updateLine = (i, field, val) => {
    const next = [...lines];
    next[i] = { ...next[i], [field]: val };
    setLines(next);
  };

  const removeLine = (i) => {
    setLines(lines.filter((_, j) => j !== i));
  };

  const resetSupplierForm = () => {
    setEditingSupplierId(null);
    setSupplierName("");
    setSupplierPhone("");
    setSupplierEmail("");
    setSupplierAddress("");
  };

  const onEditSupplier = (supplier) => {
    setEditingSupplierId(supplier.id);
    setSupplierName(supplier.name || "");
    setSupplierPhone(supplier.phone || "");
    setSupplierEmail(supplier.email || "");
    setSupplierAddress(supplier.address || "");
  };

  const onSaveSupplier = async () => {
    if (!supplierName.trim()) {
      toast.error("Supplier name required");
      return;
    }
    try {
      setSavingSupplier(true);
      const payload = {
        name: supplierName.trim(),
        phone: supplierPhone || null,
        email: supplierEmail || null,
        address: supplierAddress || null,
      };
      if (editingSupplierId) {
        await updateSupplier(editingSupplierId, payload);
        toast.success("Supplier updated");
      } else {
        await addSupplier(payload);
        toast.success("Supplier added");
      }
      resetSupplierForm();
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed");
    } finally {
      setSavingSupplier(false);
    }
  };

  const onDeleteSupplier = async (id) => {
    if (!window.confirm("Delete this supplier?")) return;
    try {
      await deleteSupplier(id);
      toast.success("Supplier deleted");
      if (editingSupplierId === id) resetSupplierForm();
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not delete supplier");
    }
  };

  const resetPurchaseForm = () => {
    setEditingPurchaseId(null);
    setSelectedSupplierId("");
    setReferenceNo("");
    setPurchaseNotes("");
    setLines([{ inventoryItemId: "", quantity: 1, unitCost: 0 }]);
  };

  const onSubmitPurchase = async () => {
    const items = lines
      .filter((l) => l.inventoryItemId)
      .map((l) => ({
        inventoryItemId: Number(l.inventoryItemId),
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
      }));
    if (!items.length) {
      toast.error("Add at least one inventory line");
      return;
    }
    try {
      setSavingPurchase(true);
      toast.loading(editingPurchaseId ? "Updating purchase..." : "Saving purchase...");
      const payload = {
        supplierId: selectedSupplierId ? Number(selectedSupplierId) : null,
        referenceNo: referenceNo || null,
        notes: purchaseNotes || null,
        items,
      };
      if (editingPurchaseId) {
        await updatePurchase(editingPurchaseId, payload);
      } else {
        await createPurchase(payload);
      }
      toast.dismiss();
      toast.success(editingPurchaseId ? "Purchase updated; stock adjusted" : "Purchase recorded; stock updated");
      resetPurchaseForm();
      load();
    } catch (e) {
      toast.dismiss();
      toast.error(e?.response?.data?.message || "Failed");
    } finally {
      setSavingPurchase(false);
    }
  };

  const onEditPurchase = async (purchaseId) => {
    try {
      const res = await getPurchase(purchaseId);
      const purchase = res.data.purchase;
      const items = res.data.items || [];
      setEditingPurchaseId(purchase.id);
      setSelectedSupplierId(purchase.supplier_id ? String(purchase.supplier_id) : "");
      setReferenceNo(purchase.reference_no || "");
      setPurchaseNotes(purchase.notes || "");
      setLines(
        items.length
          ? items.map((item) => ({
              inventoryItemId: String(item.inventory_item_id),
              quantity: Number(item.quantity),
              unitCost: Number(item.unit_cost),
            }))
          : [{ inventoryItemId: "", quantity: 1, unitCost: 0 }]
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not load purchase");
    }
  };

  const onDeletePurchase = async (purchaseId) => {
    if (!window.confirm("Delete this purchase and reverse its stock/ledger effects?")) return;
    try {
      await deletePurchase(purchaseId);
      toast.success("Purchase deleted; stock reversed");
      if (editingPurchaseId === purchaseId) resetPurchaseForm();
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not delete purchase");
    }
  };

  const inventoryItems = invData?.items || [];

  if (invLoading) {
    return <Page>Loading...</Page>;
  }

  return (
    <Page>
      <div className="flex items-center gap-2 mb-6">
        <IconShoppingCart stroke={iconStroke} />
        <h1 className={apaxPageTitle}>Purchasing</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className={apaxCard}>
          <h2 className="font-semibold mb-4 text-apax-text">
            {editingSupplierId ? "Edit supplier" : "New supplier"}
          </h2>
          <input
            className={`${apaxInput} mb-2`}
            placeholder="Supplier name"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />
          <input
            className={`${apaxInput} mb-4`}
            placeholder="Phone (optional)"
            value={supplierPhone}
            onChange={(e) => setSupplierPhone(e.target.value)}
          />
          <input
            className={`${apaxInput} mb-2`}
            placeholder="Email (optional)"
            value={supplierEmail}
            onChange={(e) => setSupplierEmail(e.target.value)}
          />
          <input
            className={`${apaxInput} mb-4`}
            placeholder="Address (optional)"
            value={supplierAddress}
            onChange={(e) => setSupplierAddress(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={apaxBtnPrimary} onClick={onSaveSupplier} disabled={savingSupplier}>
              {savingSupplier ? "Saving..." : editingSupplierId ? "Update supplier" : "Add supplier"}
            </button>
            {editingSupplierId && (
              <button type="button" className={apaxBtnSecondary} onClick={resetSupplierForm}>
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className={apaxCard}>
          <h2 className="font-semibold mb-4 text-apax-text">Suppliers</h2>
          <div className="overflow-x-auto max-h-80">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={3}>Loading...</td>
                  </tr>
                )}
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>{supplier.name}</td>
                    <td>{supplier.phone || "-"}</td>
                    <td className="flex gap-2">
                      <button type="button" className="btn btn-xs" onClick={() => onEditSupplier(supplier)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-xs btn-error" onClick={() => onDeleteSupplier(supplier.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && suppliers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-500 py-4">
                      No suppliers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${apaxCard} lg:col-span-2`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-semibold text-apax-text">
              {editingPurchaseId ? `Edit purchase #${editingPurchaseId}` : "Record purchase (stock IN)"}
            </h2>
            {editingPurchaseId && (
              <button type="button" className={apaxBtnSecondary} onClick={resetPurchaseForm}>
                Cancel edit
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <select
              className={apaxSelect}
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
            >
              <option value="">Supplier (optional)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              className={apaxInput}
              placeholder="Reference #"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
            />
            <input
              className={apaxInput}
              placeholder="Notes"
              value={purchaseNotes}
              onChange={(e) => setPurchaseNotes(e.target.value)}
            />
          </div>

          {lines.map((line, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-end mb-3">
              <select
                className={`${apaxSelect} flex-1 min-w-[200px]`}
                value={line.inventoryItemId}
                onChange={(e) => updateLine(i, "inventoryItemId", e.target.value)}
              >
                <option value="">Inventory item</option>
                {inventoryItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.title} ({it.quantity} {it.unit})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.0001"
                className={`${apaxInput} w-28`}
                placeholder="Qty"
                value={line.quantity}
                onChange={(e) => updateLine(i, "quantity", e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${apaxInput} w-32`}
                placeholder="Unit cost"
                value={line.unitCost}
                onChange={(e) => updateLine(i, "unitCost", e.target.value)}
              />
              <button type="button" className={`${apaxBtnSecondary} text-sm`} onClick={() => removeLine(i)}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className={`${apaxBtnSecondary} mb-4 mr-2`} onClick={addLine}>
            + Line
          </button>
          <button type="button" className={apaxBtnPrimary} onClick={onSubmitPurchase} disabled={savingPurchase}>
            {savingPurchase ? "Saving..." : editingPurchaseId ? "Update purchase" : "Save purchase"}
          </button>
        </div>

        <div className={`${apaxCard} lg:col-span-2`}>
          <h2 className="font-semibold mb-4 text-apax-text">Recent purchases</h2>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Ref</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="text-xs">{p.purchase_date}</td>
                    <td>{p.supplier_name || "—"}</td>
                    <td>{p.reference_no || "—"}</td>
                    <td>
                      {currencySymbol}
                      {Number(p.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="flex gap-2">
                      <button type="button" className="btn btn-xs" onClick={() => onEditPurchase(p.id)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-xs btn-error" onClick={() => onDeletePurchase(p.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && purchases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-500 py-6">
                      No purchases found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Page>
  );
}
