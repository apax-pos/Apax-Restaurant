import ApiClient from "../helpers/ApiClient";

export async function getActiveShift() {
  return ApiClient.get("/shifts/active");
}

export async function getShifts() {
  return ApiClient.get("/shifts");
}

export async function getShift(id) {
  return ApiClient.get(`/shifts/${id}`);
}

export async function openShift(payloadOrInchargeName, openingCash) {
  const payload =
    typeof payloadOrInchargeName === "object"
      ? payloadOrInchargeName
      : { inchargeName: payloadOrInchargeName, openingCash };
  return ApiClient.post("/shifts/open", payload);
}

export async function closeShift(shiftId, closingCash, notes) {
  return ApiClient.post("/shifts/close", { shiftId, closingCash, notes });
}

export async function updateShift(id, payload) {
  return ApiClient.patch(`/shifts/${id}`, payload);
}

export async function deleteShift(id) {
  return ApiClient.delete(`/shifts/${id}`);
}
