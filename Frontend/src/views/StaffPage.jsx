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
              {r.status === "pending" && (
                <button type="button" className="btn btn-xs btn-success" onClick={() => markSalaryPaid(r.id).then(load)}>
                  Mark paid
                </button>
              )}
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
