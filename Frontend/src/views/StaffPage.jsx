import React, { useEffect, useState } from "react";
import Page from "../components/Page";
import toast from "react-hot-toast";
import {
  getStaff,
  addStaff,
  deleteStaff,
  checkIn,
  checkOut,
  getAttendance,
  getSalary,
  generateSalary,
  markSalaryPaid,
} from "../controllers/staff.controller";
import { apaxInput, apaxBtnPrimary, apaxCard, apaxPageTitle } from "../config/apaxTheme";

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [salary, setSalary] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [baseSalary, setBaseSalary] = useState("");

  const load = async () => {
    const [s, a, sal] = await Promise.all([
      getStaff(),
      getAttendance(),
      getSalary(month),
    ]);
    setStaff(s.data.staff || []);
    setAttendance(a.data.attendance || []);
    setSalary(sal.data.records || []);
  };

  useEffect(() => {
    load();
  }, [month]);

  const onAdd = async () => {
    if (!name.trim()) return toast.error("Name required");
    await addStaff({ name, phone, designation, baseSalary: Number(baseSalary) || 0 });
    toast.success("Staff added");
    setName("");
    setPhone("");
    setDesignation("");
    setBaseSalary("");
    load();
  };

  const printSlip = (r) => {
    const st = staff.find((x) => String(x.id) === String(r.staff_id)) || {};
    const esc = (v) =>
      String(v == null ? "" : v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const row = (k, v) =>
      "<tr><td class='k'>" + esc(k) + "</td><td class='v'>" + esc(v) + "</td></tr>";
    const paidOn = r.paid_at ? String(r.paid_at).slice(0, 10) : "-";
    const html =
      "<!doctype html><html><head><meta charset='utf-8'><title>Salary Slip</title>" +
      "<style>" +
      "body{font-family:Arial,sans-serif;max-width:420px;margin:20px auto;color:#000}" +
      "h2{text-align:center;margin:0 0 4px}" +
      "p.sub{text-align:center;margin:0 0 14px;font-size:12px}" +
      "table{width:100%;border-collapse:collapse}" +
      "td{padding:6px 4px;border-bottom:1px dashed #999;font-size:14px}" +
      "td.k{color:#444;width:45%}" +
      "td.v{text-align:right;font-weight:bold}" +
      ".tot td{font-size:18px;border-top:2px solid #000;border-bottom:2px solid #000}" +
      ".sig{display:flex;justify-content:space-between;margin-top:46px;font-size:12px}" +
      ".sig div{border-top:1px solid #000;width:44%;text-align:center;padding-top:4px}" +
      "</style></head><body>" +
      "<h2>SALARY SLIP</h2><p class='sub'>" + esc(r.month_year) + "</p>" +
      "<table>" +
      row("Name", r.staff_name) +
      row("Designation", st.designation || "Staff") +
      row("Phone", st.phone || "-") +
      row("Month", r.month_year) +
      row("Status", r.status) +
      row("Paid date", paidOn) +
      "<tr class='tot'><td class='k'>Net salary</td><td class='v'>" + esc(Number(r.amount || 0).toFixed(2)) + "</td></tr>" +
      "</table>" +
      "<div class='sig'><div>Employee</div><div>Authorized</div></div>" +
      "</body></html>";
    const w = window.open("", "_blank", "width=520,height=720");
    if (!w) {
      toast.error("Popup blocked - please allow popups to print the slip");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Page>
      <h3 className={apaxPageTitle}>Staff — attendance & salary</h3>
      <div className={`${apaxCard} mt-6 grid gap-3 md:grid-cols-2`}>
        <input className={apaxInput} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={apaxInput} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className={apaxInput} placeholder="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
        <input className={apaxInput} type="number" placeholder="Base salary" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} />
        <button type="button" className={apaxBtnPrimary} onClick={onAdd}>
          Add staff
        </button>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className={apaxCard}>
          <h4 className="font-semibold mb-3">Staff</h4>
          {staff.map((s) => (
            <div key={s.id} className="border-b py-2 flex justify-between gap-2 text-sm">
              <span>
                {s.name} — {s.designation || "Staff"} — {s.base_salary}
              </span>
              <span className="flex gap-1">
                <button type="button" className="btn btn-xs" onClick={() => checkIn({ staffId: s.id }).then(load)}>
                  In
                </button>
                <button type="button" className="btn btn-xs" onClick={() => checkOut({ staffId: s.id }).then(load)}>
                  Out
                </button>
                <button type="button" className="btn btn-xs btn-error" onClick={() => deleteStaff(s.id).then(load)}>
                  Del
                </button>
              </span>
            </div>
          ))}
        </div>
        <div className={apaxCard}>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">Salary — {month}</h4>
            <button type="button" className="btn btn-sm" onClick={() => generateSalary(month).then(load)}>
              Generate
            </button>
          </div>
          <input type="month" className={apaxInput} value={month} onChange={(e) => setMonth(e.target.value)} />
          {salary.map((r) => (
            <div key={r.id} className="flex justify-between py-2 text-sm border-b">
              <span>
                {r.staff_name}: {r.amount} ({r.status})
              </span>
              <span className="flex gap-1">
                <button type="button" className="btn btn-xs" onClick={() => printSlip(r)}>
                  Slip
                </button>
                {r.status === "pending" && (
                  <button type="button" className="btn btn-xs btn-success" onClick={() => markSalaryPaid(r.id).then(load)}>
                    Mark paid
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className={`${apaxCard} mt-6`}>
        <h4 className="font-semibold mb-2">Recent attendance</h4>
        {attendance.slice(0, 20).map((a) => (
          <p key={a.id} className="text-sm">
            {a.staff_name}: {a.check_in} — {a.check_out || "open"}
          </p>
        ))}
      </div>
    </Page>
  );
}
