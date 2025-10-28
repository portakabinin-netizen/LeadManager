// app/myscript/leadActions.ts
import axios from "axios";
import Toast from "react-native-toast-message";
import { waMsg_URL } from "./base_url";
import leadservices, * as leadService from "./leadservices";

export type LeadCounts = {
  Unread: number;
  Recent: number;
  Engaged: number;
  Accepted: number;
  Recycle: number;
  Restore: number;
};

/**
 * ✅ Refresh all lead counts from backend
 */
export const refreshLeadCounts = async (): Promise<LeadCounts> => {
  try {
    const statuses: (keyof LeadCounts)[] = [
      "Unread",
      "Recent",
      "Engaged",
      "Accepted",
      "Recycle",
      "Restore",
    ];

    const results = await Promise.all(
      statuses.map(async (status) => {
        try {
          const res = await leadService.countLeadsByStatus(status);
          return { status, count: res?.count ?? 0 };
        } catch {
          return { status, count: 0 };
        }
      })
    );

    const newCounts = results.reduce(
      (acc, { status, count }) => ({ ...acc, [status]: count }),
      {} as LeadCounts
    );

    return newCounts;
  } catch (error) {
    console.error("❌ Error refreshing lead counts:", error);
    throw error;
  }
};

/**
 * ✅ Fetch new leads and update database
 */
export const handleSync = async (setLoading: (v: boolean) => void, refreshLeadCountsFn: () => Promise<void>) => {
  setLoading(true);
  try {
    Toast.show({
      type: "info",
      text1: "🔄 Sync in progress...",
      text2: "Fetching new leads from backend",
      position: "bottom",
    });

    const { apiUrl, emailUrl } = await leadService.getUrlInfo();
    const result: { count?: number; message?: string } =
      await leadservices.getAndSaveLeads(apiUrl, emailUrl);

    await refreshLeadCountsFn();

    Toast.show({
      type: "success",
      text1: "✅ Sync complete!",
      text2: `${result?.count ?? 0} new leads received.`,
      position: "top",
    });
  } catch (error: any) {
    console.error("❌ Sync error:", error);
    Toast.show({
      type: "error",
      text1: "Sync failed",
      text2: error?.message || "Something went wrong. Try again later.",
      position: "top",
    });
  } finally {
    setLoading(false);
  }
};

/**
 * ✅ Send welcome message to new clients
 */
export const sendWhatsAppMessageWithImage = async (
  phone: string,
  message: string,
  imageUrl: string
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("📤 Sending WhatsApp message to:", phone);
    console.log("🔗 API Endpoint:", `${waMsg_URL}/send-whatsapp`);

    const response = await axios.post(`${waMsg_URL}/send-whatsapp`, {
      phone,
      message,
      imageUrl,
    });

    console.log("✅ WhatsApp API Response:", response.data);

    if (response.data?.success) {
      return {
        success: true,
        message: response.data?.message || "WhatsApp message sent successfully!",
      };
    } else {
      console.error("⚠️ WhatsApp API returned failure:", response.data);
      throw new Error(response.data?.error || "Failed to send WhatsApp message.");
    }
  } catch (error: any) {
    const errMsg =
      error?.response?.data?.error?.message ||
      error?.message ||
      "Unknown error while sending WhatsApp message.";

    console.error("❌ WhatsApp message failed:", errMsg);

    return { success: false, message: errMsg };
  }
};