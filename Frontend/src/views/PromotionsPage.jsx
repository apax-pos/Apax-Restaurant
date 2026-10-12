import React, { useEffect, useState } from "react";
import Page from "../components/Page";
import toast from "react-hot-toast";
import {
  getPromotions,
  createPromotion,
  togglePromotion,
  deletePromotion,
  setPromotionStackRule,
} from "../controllers/promotion.controller";
import { useMenuItems } from "../controllers/menu_item.controller";
import { useCategories } from "../controllers/settings.controller";
import { apaxInput, apaxSelect, apaxBtnPrimary, apaxCard, apaxPageTitle } from "../config/apaxTheme";

const PROMO_TYPES = [
  { value: "percentage", label: "% OFF" },
  { value: "fixed", label: "Fixed amount off" },
  { value: "flat_price", label: "Flat price" },
  { value: "bogo", label: "Buy 1 Get 1" },
];

const TARGET_TYPES = [
  { value: "all", label: "All products" },
  { value: "product", label: "Selected products" },
  { value: "category", label: "Category" },
];

const STACK_RULES = [
  { value: "highest", label: "Highest discount (recommended)" },
  { value: "combine", label: "Combine discounts" },
  { value: "priority", label: "Priority order" },
];

const DAYS = [
  { v: 0, l: "Sun" },
  { v: 1, l: "Mon" },
  { v: 2, l: "Tue" },
  { v: 3, l: "Wed" },
  { v: 4, l: "Thu" },
  { v: 5, l: "Fri" },
  { v: 6, l: "Sat" },
];

export default function PromotionsPage() {
  const { data: menuData } = useMenuItems();
  const { data: catData } = useCategories();
  const menuItems = Array.isArray(menuData) ? menuData : menuData?.menuItems || [];
  const categories = Array.isArray(catData) ? catData : catData?.categories || [];

  const [promotions, setPromotions] = useState([]);
  const [stackRule, setStackRule] = useState("highest");
  const [filter, setFilter] = useState("all");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [promotionType, setPromotionType] = useState("percentage");
  const [targetType, setTargetType] = useState("all");
  const [targetIds, setTargetIds] = useState([]);
  const [discountValue, setDiscountValue] = useState("");
  const [flatPrice, setFlatPrice] = useState("");
  const [badgeLabel, setBadgeLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState([]);

  const load = async () => {
    const res = await getPromotions(filter === "all" ? "" : filter);
    setPromotions(res.data.promotions || []);
    setStackRule(res.data.stackRule || "highest");
  };

  useEffect(() => {
    load();
  }, [filter]);

  const onSave = async () => {
    if (!name.trim()) return toast.error("Promotion name required");
    await createPromotion({
      name: name.trim(),
      code: code.trim() || null,
      promotionType,
      targetType,
      targetIds: targetType === "all" ? [] : targetIds.map(Number),
      discountValue: Number(discountValue) || 0,
      flatPrice: flatPrice ? Number(flatPrice) : null,
      badgeLabel: badgeLabel.trim() || null,
      startDate: startDate || null,
      endDate: endDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
      daysOfWeek: daysOfWeek.length ? daysOfWeek : null,
      isEnabled: true,
      showOnCard: true,
    });
    toast.success("Promotion created");
    setName("");
    setCode("");
    setDiscountValue("");
    setFlatPrice("");
    setBadgeLabel("");
    load();
  };

  const onStackChange = async (rule) => {
    await setPromotionStackRule(rule);
    setStackRule(rule);
    toast.success("Stack rule updated");
  };

  const toggleDay = (d) => {
    setDaysOfWeek((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  return (
    <Page>
      <h3 className={apaxPageTitle}>Promotions</h3>
      <p className="text-sm opacity-70 mt-1">
        Offers auto-apply on POS product cards and at checkout. Use promo codes for coupon-style deals.
      </p>

      <div className={`${apaxCard} mt-4 flex flex-wrap gap-3 items-end`}>
        <div>
          <label className="text-xs font-medium">When multiple promos match</label>
          <select
            className={apaxSelect}
            value={stackRule}
            onChange={(e) => onStackChange(e.target.value)}
          >
            {STACK_RULES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Filter list</label>
          <select className={apaxSelect} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active now</option>
            <option value="upcoming">Upcoming</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div className={`${apaxCard} mt-6 grid gap-3 md:grid-cols-2`}>
        <input className={apaxInput} placeholder="Promotion name *" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={apaxInput} placeholder="Promo code (optional)" value={code} onChange={(e) => setCode(e.target.value)} />
        <select className={apaxSelect} value={promotionType} onChange={(e) => setPromotionType(e.target.value)}>
          {PROMO_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select className={apaxSelect} value={targetType} onChange={(e) => setTargetType(e.target.value)}>
          {TARGET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {targetType === "product" && (
          <select
            className={apaxSelect}
            multiple
            value={targetIds}
            onChange={(e) =>
              setTargetIds([...e.target.selectedOptions].map((o) => o.value))
            }
          >
            {menuItems.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        )}
        {targetType === "category" && (
          <select
            className={apaxSelect}
            multiple
            value={targetIds}
            onChange={(e) =>
              setTargetIds([...e.target.selectedOptions].map((o) => o.value))
            }
          >
            {(Array.isArray(categories) ? categories : []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}
        <input
          className={apaxInput}
          type="number"
          placeholder={promotionType === "percentage" ? "Discount %" : "Amount"}
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
        />
        {promotionType === "flat_price" && (
          <input
            className={apaxInput}
            type="number"
            placeholder="Flat price"
            value={flatPrice}
            onChange={(e) => setFlatPrice(e.target.value)}
          />
        )}
        <input
          className={apaxInput}
          placeholder='Badge e.g. "10% OFF"'
          value={badgeLabel}
          onChange={(e) => setBadgeLabel(e.target.value)}
        />
        <input className={apaxInput} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input className={apaxInput} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <input className={apaxInput} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <input className={apaxInput} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        <div className="flex flex-wrap gap-2 md:col-span-2">
          {DAYS.map((d) => (
            <button
              key={d.v}
              type="button"
              className={`btn btn-sm ${daysOfWeek.includes(d.v) ? "btn-primary" : ""}`}
              onClick={() => toggleDay(d.v)}
            >
              {d.l}
            </button>
          ))}
        </div>
        <button type="button" className={`${apaxBtnPrimary} md:col-span-2`} onClick={onSave}>
          Create promotion
        </button>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {promotions.map((p) => (
          <div key={p.id} className={apaxCard}>
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs opacity-70">
                  {p.promotion_type} · {p.target_type}
                  {p.code ? ` · Code: ${p.code}` : ""}
                </p>
                {p.badge_label && (
                  <span className="badge badge-sm badge-error mt-1">{p.badge_label}</span>
                )}
                <p className="text-sm mt-1">
                  {p.discount_value}
                  {p.promotion_type === "percentage" ? "%" : ""} off
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={async () => {
                    await togglePromotion(p.id, !p.is_enabled);
                    load();
                  }}
                >
                  {Number(p.is_enabled) ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-error"
                  onClick={async () => {
                    if (!window.confirm("Delete promotion?")) return;
                    await deletePromotion(p.id);
                    load();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}
