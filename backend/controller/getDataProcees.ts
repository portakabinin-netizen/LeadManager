import api_url from "@/backend/routes/base_url";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

/* ============================================================
   🔹 GET TOKEN FROM STORAGE (HARDENED)
   ============================================================ */
const getValidToken = async () => {
  try {
    const sessionStr = await AsyncStorage.getItem("userSession");

    if (!sessionStr) {
      console.error("❌ No userSession found in AsyncStorage");
      return null;
    }

    const session = JSON.parse(sessionStr);

    if (!session?.token) {
      console.error("❌ Token missing inside userSession");
      return null;
    }

    let token = session.token.trim();
    token = token.replace(/^"+|"+$/g, ""); // remove accidental quotes

    if (token.split(".").length !== 3) {
      console.error("❌ Malformed token:", token);
      return null;
    }

    console.log("🔑 Token loaded OK");
    return token;
  } catch (err) {
    console.error("❌ Failed to read token:", err);
    return null;
  }
};

/* ============================================================
   🔹 SAFE FETCH (TI / IM URLs)
   ============================================================ */
const safeFetch = async (url: string): Promise<any[]> => {
  if (!url) return [];

  try {
    console.log("🌐 Fetching:", url);
    const resp = await axios.get(url);

    if (Array.isArray(resp.data)) return resp.data;
    if (Array.isArray(resp.data?.records)) return resp.data.records;

    return [];
  } catch (err: any) {
    console.error("❌ Fetch failed:", err?.response?.status, err?.message);
    return [];
  }
};

/* ============================================================
   🔹 SAFE DATE PARSER
   ============================================================ */
const parseDateSafe = (dateStr?: string, epoch?: number) => {
  try {
    if (epoch) return new Date(epoch < 1e10 ? epoch * 1000 : epoch);
    if (!dateStr) return new Date();

    const cleaned = dateStr.replace(/\.\d+/, "");
    const d = new Date(cleaned);

    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
};

/* ============================================================
   🔹 PREPARE A SINGLE LEAD (FINAL-CORRECT VERSION)
   ============================================================ */
const prepareLead = (
  item: any,
  leadNo: number,
  userId: string,
  corpAdminId: string,
  corporateId: string
) => {
  const now = new Date();

  return {
    lead_no: leadNo,

    product_name: item.product_name || item.query_product || "Unknown Product",

    sender_name: item.sender_name || item.name || "Unknown",
    sender_city: item.sender_city || item.city || "Unknown",
    sender_state: item.sender_state || item.state || "Unknown",

    sender_mobile:
      item.sender_mobile ||
      item.mobile ||
      item.phone ||
      item.landline_number ||
      "",

    sender_email: item.sender_email || item.email || "",

    source: item.source || "Unknown",
    source_id: String(item.source_id || item.rfi_id || Date.now()),

    adminLink: corpAdminId,
    corpLink: corporateId,

    link2Corporate: [corporateId],

    status: "Unread",

    generated_date: parseDateSafe(item.generated_date, item.generated),

    /* -------------------------
       FIXED: Always include activity
       ------------------------- */
    activity: [
      {
        date: now,
        action: "Fetched",
        byUser: userId,
      },
    ],

    /* -------------------------
       FIXED: These were missing
       ------------------------- */
    finance: item.finance || [],
    billInfo: item.billInfo || [],
  };
};

/* ============================================================
   🔹 FETCH + NORMALIZE DATA FROM BOTH SOURCES
   ============================================================ */
export const getDataProcess = async (
  url1: string,
  url2: string,
  userId: string,
  corpAdminId: string,
  corporateId: string
) => {
  console.log("🚀 getDataProcess()");

  const ti = await safeFetch(url1);
  const im = await safeFetch(url2);

  const combined = [
    ...ti.map((x) => ({ ...x, source: "TradeIndia" })),
    ...im.map((x) => ({ ...x, source: "IndiaMart" })),
  ];

  console.log("📌 Combined leads:", combined.length);

  return combined.map((item, i) =>
    prepareLead(item, i + 1, userId, corpAdminId, corporateId)
  );
};

/* ============================================================
   🔹 SEND TO BACKEND (FINAL WORKING VERSION)
   ============================================================ */
export const sendLeadsToBackend = async (
  url1: string,
  url2: string,
  userId: string,
  corpAdminId: string,
  corporateId: string
) => {
  console.log("🚀 Sending leads to backend ...");

  const leads = await getDataProcess(url1, url2, userId, corpAdminId, corporateId);

  if (leads.length === 0) {
    console.warn("⚠️ No leads to upload");
    return;
  }

  const token = await getValidToken();
  if (!token) return console.error("❌ No valid token — cannot upload");

  const BATCH_SIZE = 50;

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const batchNo = i / BATCH_SIZE + 1;

    console.log(`📤 Uploading batch ${batchNo} (${batch.length} leads)`);

    try {
      await axios.post(`${api_url}/service/addmany`, batch, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`✅ Batch ${batchNo} saved`);
    } catch (err: any) {
      console.error("❌ Batch upload failed:", err?.response?.data);

      if (err?.response?.status === 403) {
        console.error("⛔ Token expired — upload cancelled");
        break;
      }
    }
  }
};
