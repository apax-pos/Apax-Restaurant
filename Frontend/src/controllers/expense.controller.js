import ApiClient from "../helpers/ApiClient";

export async function getProfitLoss(type, from, to) {
  const params = new URLSearchParams({ type });
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  return ApiClient.get(`/expenses/profit-loss?${params}`);
}

export async function getExpenses(type, from, to) {
  const params = new URLSearchParams({ type: type || "this_month" });
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  return ApiClient.get(`/expenses?${params}`);
}

export async function addExpense(payload) {
  return ApiClient.post("/expenses", payload);
}

export async function deleteExpense(id) {
  return ApiClient.delete(`/expenses/${id}`);
}
