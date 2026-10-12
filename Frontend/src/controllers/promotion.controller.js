import ApiClient from "../helpers/ApiClient";

export async function getPromotions(status) {
  const q = status ? `?status=${status}` : "";
  return ApiClient.get(`/promotions${q}`);
}

export async function createPromotion(data) {
  return ApiClient.post("/promotions", data);
}

export async function updatePromotion(id, data) {
  return ApiClient.put(`/promotions/${id}`, data);
}

export async function togglePromotion(id, enabled) {
  return ApiClient.patch(`/promotions/${id}/toggle`, { enabled });
}

export async function deletePromotion(id) {
  return ApiClient.delete(`/promotions/${id}`);
}

export async function setPromotionStackRule(stackRule) {
  return ApiClient.post("/promotions/stack-rule", { stackRule });
}

export async function getPromotionReport(from, to) {
  return ApiClient.get(`/promotions/report?from=${from}&to=${to}`);
}
