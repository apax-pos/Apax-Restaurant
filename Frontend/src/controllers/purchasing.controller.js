import ApiClient from "../helpers/ApiClient";

export async function getSuppliers() {
  return ApiClient.get("/purchasing/suppliers");
}

export async function addSupplier(payload) {
  return ApiClient.post("/purchasing/suppliers", payload);
}

export async function updateSupplier(id, payload) {
  return ApiClient.patch(`/purchasing/suppliers/${id}`, payload);
}

export async function deleteSupplier(id) {
  return ApiClient.delete(`/purchasing/suppliers/${id}`);
}

export async function getPurchases() {
  return ApiClient.get("/purchasing");
}

export async function getPurchase(id) {
  return ApiClient.get(`/purchasing/${id}`);
}

export async function createPurchase(payload) {
  return ApiClient.post("/purchasing", payload);
}

export async function updatePurchase(id, payload) {
  return ApiClient.patch(`/purchasing/${id}`, payload);
}

export async function deletePurchase(id) {
  return ApiClient.delete(`/purchasing/${id}`);
}
