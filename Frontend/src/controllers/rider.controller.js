import ApiClient from "../helpers/ApiClient";

export const getRiders = () => ApiClient.get("/riders/riders");
export const getRider = (id) => ApiClient.get(`/riders/riders/${id}`);
export const addRider = (payload) => ApiClient.post("/riders/riders", payload);
export const updateRider = (id, payload) => ApiClient.patch(`/riders/riders/${id}`, payload);
export const deleteRider = (id) => ApiClient.delete(`/riders/riders/${id}`);
export const getZones = () => ApiClient.get("/riders/zones");
export const getZone = (id) => ApiClient.get(`/riders/zones/${id}`);
export const addZone = (payload) => ApiClient.post("/riders/zones", payload);
export const updateZone = (id, payload) => ApiClient.patch(`/riders/zones/${id}`, payload);
export const deleteZone = (id) => ApiClient.delete(`/riders/zones/${id}`);
