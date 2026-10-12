import ApiClient from "../helpers/ApiClient";

export const getStaff = () => ApiClient.get("/staff");
export const addStaff = (payload) => ApiClient.post("/staff", payload);
export const updateStaff = (id, payload) => ApiClient.patch(`/staff/${id}`, payload);
export const deleteStaff = (id) => ApiClient.delete(`/staff/${id}`);
export const checkIn = (payload) => ApiClient.post("/staff/check-in", payload);
export const checkOut = (payload) => ApiClient.post("/staff/check-out", payload);
export const getAttendance = (from, to) =>
  ApiClient.get(`/staff/attendance/list?from=${from || ""}&to=${to || ""}`);
export const getSalary = (month) =>
  ApiClient.get(`/staff/salary/list?month=${month || ""}`);
export const generateSalary = (monthYear) =>
  ApiClient.post("/staff/salary/generate", { monthYear });
export const markSalaryPaid = (id) => ApiClient.post(`/staff/salary/${id}/paid`);
