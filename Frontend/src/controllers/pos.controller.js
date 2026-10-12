import ApiClient from "../helpers/ApiClient";
import { saveOrderOffline, cachePosData, getCachedPosData } from "../db/localDb";

const DRAFTS_KEY = "APAXPOS__DRAFTS";

export async function initPOS() {
    if (!window.navigator.onLine) {
      console.log("📴 Offline: Loading POS data from cache...");
      const cached = await getCachedPosData();
      if (cached) return { status: 200, data: cached };
    }

    try {
      const response = await ApiClient.get("/pos/init");
      if (response.status === 200) {
        await cachePosData(response.data);
      }
      return response;
    } catch (error) {
      console.error("Init POS failed, checking cache...", error);
      const cached = await getCachedPosData();
      if (cached) return { status: 200, data: cached };
      throw error;
    }
}

export async function createOrder(cart, deliveryType, customerType, customerId, tableId, selectedQrOrderItem, meta = {}) {
  const orderData = { cart, deliveryType, customerType, customerId, tableId, selectedQrOrderItem, ...meta };
  
  if (!window.navigator.onLine) {
    console.log("📴 Offline: Saving order to local database...");
    const localId = await saveOrderOffline({ ...orderData, type: 'order' });
    return { status: 200, data: { message: "Order saved locally (Offline)", localId, offline: true } };
  }

  try {
    const response = await ApiClient.post("/pos/create-order", orderData);
    return response;
  } catch (error) {
    if (!error?.response) {
      console.error("Network error, saving locally...", error);
      const localId = await saveOrderOffline({ ...orderData, type: "order" });
      return {
        status: 200,
        data: { message: "Order saved locally (Network Error)", localId, offline: true },
      };
    }
    throw error;
  }
}

export async function createOrderAndInvoice(
  cart,
  deliveryType,
  customerType,
  customerId,
  tableId,
  netTotal,
  taxTotal,
  serviceChargeTotal,
  total,
  selectedQrOrderItem,
  selectedPaymentType,
  discountType = "none",
  discountValue = 0,
  discountAmount = 0,
  meta = {}
) {
  const orderData = {
    cart,
    deliveryType,
    customerType,
    customerId,
    tableId,
    netTotal,
    taxTotal,
    serviceChargeTotal,
    total,
    selectedQrOrderItem,
    selectedPaymentType,
    discountType,
    discountValue,
    discountAmount,
    ...meta,
  };

  if (!window.navigator.onLine) {
    console.log("📴 Offline: Saving order & invoice to local database...");
    const localId = await saveOrderOffline({ ...orderData, type: 'order_and_invoice' });
    return { status: 200, data: { message: "Order & Invoice saved locally (Offline)", localId, offline: true } };
  }

  try {
    const response = await ApiClient.post("/pos/create-order-and-invoice", orderData);
    return response;
  } catch (error) {
    if (!error?.response) {
      console.error("Network error, saving locally...", error);
      const localId = await saveOrderOffline({ ...orderData, type: "order_and_invoice" });
      return {
        status: 200,
        data: {
          message: "Order & Invoice saved locally (Network Error)",
          localId,
          offline: true,
        },
      };
    }
    throw error;
  }
}

// drafts
/**
 * @returns {Array}
 *  */
export function getDrafts() {
  const draftsString = localStorage.getItem(DRAFTS_KEY);
  const drafts = draftsString ? JSON.parse(draftsString) : [];
  return drafts;
}

/**
 * @param {Array} drafts
 *  */
export function setDrafts(drafts) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}
// drafts

// qr orders
export async function getQROrdersCount() {
  try {
    const response = await ApiClient.get("/pos/qrorders/count");
    return response;
  } catch (error) {
    throw error;
  }
}
export async function getQROrders() {
  try {
    const response = await ApiClient.get("/pos/qrorders");
    return response;
  } catch (error) {
    throw error;
  }
}

export async function cancelAllQROrders() {
  try {
    const response = await ApiClient.post("/pos/qrorders/cancel-all");
    return response;
  } catch (error) {
    throw error;
  }
}

export async function cancelQROrder(orderId) {
  try {
    const response = await ApiClient.post(`/pos/qrorders/update-status/${orderId}`, {
      status: "cancelled"
    });
    return response;
  } catch (error) {
    throw error;
  }
}
// qr orders
