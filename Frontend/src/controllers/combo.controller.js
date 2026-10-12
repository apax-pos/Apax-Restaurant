import ApiClient from "../helpers/ApiClient";

export const getCombos = (enabledOnly = false) =>
  ApiClient.get(`/combos${enabledOnly ? "?enabled=1" : ""}`);
export const addCombo = (payload) => ApiClient.post("/combos", payload);
export const updateCombo = (id, payload) => ApiClient.patch(`/combos/${id}`, payload);
export const deleteCombo = (id) => ApiClient.delete(`/combos/${id}`);
