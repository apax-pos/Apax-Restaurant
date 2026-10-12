import { getUnsyncedOrders, markOrderSynced } from "../db/localDb";
import ApiClient from "../helpers/ApiClient";
import toast from "react-hot-toast";

/** Strip Dexie metadata and build API body for create-order endpoints. */
function buildSyncPayload(record) {
  const type = record.type;
  const base = {
    cart: record.cart,
    deliveryType: record.deliveryType ?? "",
    customerType: record.customerType ?? "WALKIN",
    customerId: record.customerId ?? null,
    tableId: record.tableId ?? null,
    selectedQrOrderItem: record.selectedQrOrderItem ?? null,
  };

  if (type === "order_and_invoice") {
    return {
      ...base,
      selectedPaymentType: record.selectedPaymentType,
      discountType: record.discountType ?? "none",
      discountValue: record.discountValue ?? 0,
    };
  }

  return base;
}

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.init();
  }

  init() {
    window.addEventListener("online", () => {
      console.log("🌐 Internet is back! Starting background sync...");
      this.syncData();
    });

    setInterval(() => {
      if (window.navigator.onLine) {
        this.syncData();
      }
    }, 2 * 60 * 1000);
  }

  async syncData() {
    if (this.isSyncing) return;

    const unsynced = await getUnsyncedOrders();
    if (unsynced.length === 0) return;

    this.isSyncing = true;
    console.log(`📤 Syncing ${unsynced.length} offline orders to cloud...`);

    const toastId = toast.loading(`Syncing ${unsynced.length} offline orders...`);
    let syncedCount = 0;

    try {
      for (const item of unsynced) {
        if (!item.cart?.length) {
          await markOrderSynced(item.id);
          continue;
        }

        const endpoint =
          item.type === "order_and_invoice"
            ? "/pos/create-order-and-invoice"
            : "/pos/create-order";

        try {
          await ApiClient.post(endpoint, buildSyncPayload(item));
          await markOrderSynced(item.id);
          syncedCount += 1;
          console.log(`✅ Synced item #${item.id}`);
        } catch (err) {
          console.error(`❌ Failed to sync item #${item.id}:`, err.message);
        }
      }

      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} offline order(s) to cloud!`, { id: toastId });
      } else {
        toast.error("Could not sync offline orders. Open Shifts, then retry from POS.", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error("Sync process failed:", error);
      toast.error("Sync failed. Will try again later.", { id: toastId });
    } finally {
      this.isSyncing = false;
    }
  }
}

export default new SyncService();
