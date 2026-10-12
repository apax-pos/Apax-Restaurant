import React, { useEffect, useState } from "react";
import Page from "../components/Page";
import toast from "react-hot-toast";
import {
  getRiders,
  addRider,
  updateRider,
  deleteRider,
  getZones,
  addZone,
  updateZone,
  deleteZone,
} from "../controllers/rider.controller";
import { apaxInput, apaxBtnPrimary, apaxCard, apaxPageTitle } from "../config/apaxTheme";

const activeLabel = (value) => (Number(value) === 0 ? "Inactive" : "Active");

export default function RidersPage() {
  const [riders, setRiders] = useState([]);
  const [zones, setZones] = useState([]);

  const [editingRiderId, setEditingRiderId] = useState(null);
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [riderActive, setRiderActive] = useState(true);

  const [editingZoneId, setEditingZoneId] = useState(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneCharge, setZoneCharge] = useState("");
  const [zoneActive, setZoneActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [savingRider, setSavingRider] = useState(false);
  const [savingZone, setSavingZone] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [r, z] = await Promise.all([getRiders(), getZones()]);
      setRiders(r.data.riders || []);
      setZones(z.data.zones || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load riders and zones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetRiderForm = () => {
    setEditingRiderId(null);
    setRiderName("");
    setRiderPhone("");
    setRiderActive(true);
  };

  const resetZoneForm = () => {
    setEditingZoneId(null);
    setZoneName("");
    setZoneCharge("");
    setZoneActive(true);
  };

  const onSaveRider = async () => {
    if (!riderName.trim()) return toast.error("Rider name required");
    try {
      setSavingRider(true);
      const payload = {
        name: riderName.trim(),
        phone: riderPhone.trim(),
        isActive: riderActive,
      };
      if (editingRiderId) {
        await updateRider(editingRiderId, payload);
        toast.success("Rider updated");
      } else {
        await addRider(payload);
        toast.success("Rider added");
      }
      resetRiderForm();
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save rider");
    } finally {
      setSavingRider(false);
    }
  };

  const onEditRider = (rider) => {
    setEditingRiderId(rider.id);
    setRiderName(rider.name || "");
    setRiderPhone(rider.phone || "");
    setRiderActive(Number(rider.is_active) !== 0);
  };

  const onDeleteRider = async (id) => {
    if (!window.confirm("Delete this rider?")) return;
    try {
      await deleteRider(id);
      toast.success("Rider deleted");
      if (editingRiderId === id) resetRiderForm();
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not delete rider");
    }
  };

  const onSaveZone = async () => {
    if (!zoneName.trim()) return toast.error("Zone name required");
    const deliveryCharge = Number(zoneCharge) || 0;
    if (deliveryCharge < 0) return toast.error("Delivery charge cannot be negative");
    try {
      setSavingZone(true);
      const payload = {
        name: zoneName.trim(),
        deliveryCharge,
        isActive: zoneActive,
      };
      if (editingZoneId) {
        await updateZone(editingZoneId, payload);
        toast.success("Zone updated");
      } else {
        await addZone(payload);
        toast.success("Zone added");
      }
      resetZoneForm();
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save zone");
    } finally {
      setSavingZone(false);
    }
  };

  const onEditZone = (zone) => {
    setEditingZoneId(zone.id);
    setZoneName(zone.name || "");
    setZoneCharge(String(Number(zone.delivery_charge) || 0));
    setZoneActive(Number(zone.is_active) !== 0);
  };

  const onDeleteZone = async (id) => {
    if (!window.confirm("Delete this delivery zone?")) return;
    try {
      await deleteZone(id);
      toast.success("Zone deleted");
      if (editingZoneId === id) resetZoneForm();
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not delete zone");
    }
  };

  return (
    <Page>
      <h3 className={apaxPageTitle}>Riders & delivery zones</h3>
      <p className="mt-2 text-sm text-gray-500">
        Manage delivery staff and zone-wise delivery charges used on POS delivery orders.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className={apaxCard}>
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold">Riders</h4>
            {editingRiderId && (
              <button type="button" className="btn btn-sm rounded-xl" onClick={resetRiderForm}>
                Cancel edit
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            <input className={apaxInput} placeholder="Rider name" value={riderName} onChange={(e) => setRiderName(e.target.value)} />
            <input className={apaxInput} placeholder="Phone" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={riderActive} onChange={(e) => setRiderActive(e.target.checked)} />
              Active rider
            </label>
            <button type="button" className={apaxBtnPrimary} onClick={onSaveRider} disabled={savingRider}>
              {savingRider ? "Saving..." : editingRiderId ? "Update rider" : "Add rider"}
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4}>Loading riders...</td>
                  </tr>
                )}
                {!loading && riders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      No riders found.
                    </td>
                  </tr>
                )}
                {riders.map((rider) => (
                  <tr key={rider.id}>
                    <td>{rider.name}</td>
                    <td>{rider.phone || "-"}</td>
                    <td>{activeLabel(rider.is_active)}</td>
                    <td className="flex gap-2">
                      <button type="button" className="btn btn-sm" onClick={() => onEditRider(rider)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-sm btn-error" onClick={() => onDeleteRider(rider.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={apaxCard}>
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold">Delivery zones</h4>
            {editingZoneId && (
              <button type="button" className="btn btn-sm rounded-xl" onClick={resetZoneForm}>
                Cancel edit
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            <input className={apaxInput} placeholder="Zone name" value={zoneName} onChange={(e) => setZoneName(e.target.value)} />
            <input
              className={apaxInput}
              type="number"
              min="0"
              step="0.01"
              placeholder="Delivery charge"
              value={zoneCharge}
              onChange={(e) => setZoneCharge(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={zoneActive} onChange={(e) => setZoneActive(e.target.checked)} />
              Active zone
            </label>
            <button type="button" className={apaxBtnPrimary} onClick={onSaveZone} disabled={savingZone}>
              {savingZone ? "Saving..." : editingZoneId ? "Update zone" : "Add zone"}
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Charge</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4}>Loading zones...</td>
                  </tr>
                )}
                {!loading && zones.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      No delivery zones found.
                    </td>
                  </tr>
                )}
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td>{zone.name}</td>
                    <td>{Number(zone.delivery_charge || 0).toFixed(2)}</td>
                    <td>{activeLabel(zone.is_active)}</td>
                    <td className="flex gap-2">
                      <button type="button" className="btn btn-sm" onClick={() => onEditZone(zone)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-sm btn-error" onClick={() => onDeleteZone(zone.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Page>
  );
}
