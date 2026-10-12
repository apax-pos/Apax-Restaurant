import ApiClient from "../helpers/ApiClient";

export const getBranches = () => ApiClient.get("/branches");
export const addBranch = (payload) => ApiClient.post("/branches", payload);
export const updateBranch = (id, payload) => ApiClient.patch(`/branches/${id}`, payload);
export const deleteBranch = (id) => ApiClient.delete(`/branches/${id}`);
