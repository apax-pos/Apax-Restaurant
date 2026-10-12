import React, { useEffect, useState } from "react";
import Page from "../components/Page";
import toast from "react-hot-toast";
import { getCombos, addCombo, deleteCombo } from "../controllers/combo.controller";
import { useMenuItems } from "../controllers/menu_item.controller";
import { apaxInput, apaxBtnPrimary, apaxCard, apaxPageTitle } from "../config/apaxTheme";

export default function CombosPage() {
  const { data: menuData } = useMenuItems();
  const menuItems = Array.isArray(menuData) ? menuData : menuData?.menuItems || [];

  const [combos, setCombos] = useState([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [menuItemId, setMenuItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState([]);

  const load = async () => {
    const res = await getCombos();
    setCombos(res.data.combos || []);
  };

  useEffect(() => {
    load();
  }, []);

  const addLine = () => {
    if (!menuItemId) return toast.error("Select menu item");
    setItems([...items, { menuItemId: Number(menuItemId), quantity: Number(qty) || 1 }]);
    setMenuItemId("");
    setQty(1);
  };

  const onSave = async () => {
    if (!title.trim() || !price) return toast.error("Title and price required");
    if (!items.length) return toast.error("Add at least one item to combo");
    await addCombo({ title, price: Number(price), items });
    toast.success("Combo created");
    setTitle("");
    setPrice("");
    setItems([]);
    load();
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete combo?")) return;
    await deleteCombo(id);
    load();
  };

  return (
    <Page>
      <h3 className={apaxPageTitle}>Combos & deals</h3>
      <div className={`${apaxCard} mt-6 grid gap-3`}>
        <input className={apaxInput} placeholder="Combo title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={apaxInput} type="number" placeholder="Combo price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          <select className={apaxInput} value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)}>
            <option value="">Menu item</option>
            {(Array.isArray(menuItems) ? menuItems : []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          <input className={`${apaxInput} w-24`} type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          <button type="button" className="btn btn-sm" onClick={addLine}>
            Add item
          </button>
        </div>
        {items.length > 0 && (
          <ul className="text-sm list-disc pl-5">
            {items.map((it, i) => (
              <li key={i}>
                Item #{it.menuItemId} x {it.quantity}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className={apaxBtnPrimary} onClick={onSave}>
          Save combo
        </button>
      </div>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {combos.map((c) => (
          <div key={c.id} className={apaxCard}>
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{c.title}</p>
                <p className="text-sm">Price: {c.price}</p>
                <p className="text-xs opacity-70">{c.items?.length || 0} items</p>
              </div>
              <button type="button" className="btn btn-sm btn-error" onClick={() => onDelete(c.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}
