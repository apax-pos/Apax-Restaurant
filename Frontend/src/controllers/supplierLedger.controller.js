import ApiClient from "../helpers/ApiClient";

export const getSuppliersWithBalance = () => ApiClient.get("/supplier-ledger/suppliers");
export const getSupplierLedger = (supplierId) =>
  ApiClient.get(`/supplier-ledger/${supplierId}`);
export const recordSupplierPayment = (payload) =>
  ApiClient.post("/supplier-ledger/payment", payload);
export const recordSupplierLedgerEntry = (payload) =>
  ApiClient.post("/supplier-ledger/entry", payload);
export const updateSupplierLedgerEntry = (id, payload) =>
  ApiClient.patch(`/supplier-ledger/entry/${id}`, payload);
export const deleteSupplierLedgerEntry = (id) =>
  ApiClient.delete(`/supplier-ledger/entry/${id}`);
