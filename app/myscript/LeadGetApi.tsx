import axios from "axios";
import { BASE_URL } from "../myscript/base_url";

// -------------------- 🔹 Types --------------------
interface UrlInfo {
  userid: string;
  profile_id: string;
  key: string;
  urlapi: string;
  urlinbox: string;
  limit?: number;
  page_no?: number;
}

interface RawLead {
  rfi_id?: string;
  source_id?: string;
  sender_name?: string;
  sender_mobile?: string;
  sender_email?: string;
  sender_city?: string;
  sender_state?: string;
  product_name?: string;
  generated_date?: string;
  generated_time?: string;
  generated?: number;
  source?: string;
  view_status?: string;
  sender_other_mobiles?: string;
}

interface Lead {
  key: string;
  source_id: string;
  sender_name: string;
  sender_mobile: string;
  sender_email: string;
  sender_city: string;
  sender_state: string;
  product_name: string;
  generated_date: string; // YYYY-MM-DD
  source: string;
  status: string;
}

// -------------------- 🔹 Date Parser --------------------
const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const parseDateToYYYYMMDD = (dateStr?: string, timeStr?: string, epoch?: number): string => {
  if (epoch && !isNaN(Number(epoch))) {
    const d = new Date(Number(epoch) < 1e10 ? Number(epoch) * 1000 : Number(epoch));
    return d.toISOString().slice(0, 10);
  }

  if (dateStr) {
    const m = dateStr.match(/(\d{1,2}) (\w+) (\d{4})/);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = MONTHS[m[2].toLowerCase().slice(0, 3)] ?? 0;
      const year = parseInt(m[3], 10);
      const d = new Date(year, month, day);
      return d.toISOString().slice(0, 10);
    }
  }

  return new Date().toISOString().slice(0, 10);
};

// -------------------- 🔹 Get URL Info --------------------
const getUrlInfo = async (): Promise<UrlInfo> => {
  console.log("🔹 Fetching URL info from backend...");
  const res = await axios.get(`${BASE_URL}/url`);
  if (res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
    console.log("✅ URL info fetched:", res.data.data[0]);
    return res.data.data[0];
  }
  throw new Error("No URL info found in collection");
};

// -------------------- 🔹 Build TradeIndia URL --------------------
const buildTradeIndiaUrl = (urlInfo: UrlInfo): string => {
  console.log("🔹 Building TradeIndia URL...");
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const toDate = new Date();

  const params = {
    userid: urlInfo.userid,
    profile_id: urlInfo.profile_id,
    key: urlInfo.key,
    from_date: formatDate(fromDate),
    to_date: formatDate(toDate),
    limit: urlInfo.limit || 50,
    page_no: urlInfo.page_no || 1,
  };

  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const url = `${urlInfo.urlapi}${query}`;
  console.log("📦 TradeIndia URL =>", url);
  return url;
};

// -------------------- 🔹 Fetch External Leads --------------------
const fetchExternalLeads = async (): Promise<RawLead[]> => {
  console.log("🔹 Fetching external leads...");
  let tradeLeads: RawLead[] = [];
  let inboxLeads: RawLead[] = [];

  try {
    const urlInfo = await getUrlInfo();
    const tradeResp = await fetch(buildTradeIndiaUrl(urlInfo), {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    });
    const tradeRaw = await tradeResp.text();
    tradeLeads = !tradeRaw.trim().startsWith("<") ? JSON.parse(tradeRaw).records || [] : [];
    const inboxResp = await fetch(urlInfo.urlinbox, { headers: { Accept: "application/json" } });
    const inboxJson = await inboxResp.json();
    inboxLeads = inboxJson.records || [];
  } catch (err) {
    console.error("⚠️ External fetch failed:", err);
  }

  console.log(`✅ TradeIndia Leads: ${tradeLeads.length}, Inbox Leads: ${inboxLeads.length}`);
  return [...tradeLeads, ...inboxLeads];
};

// -------------------- 🔹 Map Leads --------------------
const mapLeads = (rawLeads: RawLead[]): Lead[] => {
  console.log("🔹 Mapping raw leads to structured leads...");

  return rawLeads.map((item, index) => {
    const viewStatus = item.view_status?.toLowerCase() || "";
    let status = "Unread";

    if (viewStatus.includes("engaged")) status = "Engaged";
    else if (viewStatus.includes("accepted")) status = "Accepted";
    else if (viewStatus.includes("recent")) status = "Recent";

    // 🗓️ Ensure date is valid and consistent (YYYY-MM-DD)
    const parsedDate = parseDateToYYYYMMDD(
      item.generated_date,
      item.generated_time,
      item.generated
    );

    // If date is invalid, fallback to current date
    const safeDate =
      parsedDate && !isNaN(new Date(parsedDate).getTime())
        ? parsedDate
        : new Date().toISOString().split("T")[0];

    return {
      key: `${item.rfi_id || index}`,
      source_id:
        item.rfi_id ||
        item.source_id ||
        `${item.source || "TI"}-${item.sender_mobile || Date.now()}`,
      sender_name: item.sender_name?.trim() || "Unknown",
      sender_mobile: item.sender_mobile || item.sender_other_mobiles || "",
      sender_email: item.sender_email || "",
      sender_city: item.sender_city?.trim() || "Unknown",
      sender_state: item.sender_state?.trim() || "Unknown",
      product_name: item.product_name?.trim() || "No Product",
      generated_date: safeDate,
      source: item.source || "TradeIndia",
      status,
      // ❌ Exclude lead_no entirely; backend will auto-generate it
    };
  });
};


// -------------------- 🔹 Fetch & Sync Leads --------------------
export const fetchAndSyncLeads = async (): Promise<void> => {
  console.log("🔹 Starting lead fetch & sync process...");
  try {
    const fetched = await fetchExternalLeads();
    if (!fetched.length) {
      console.log("ℹ️ No leads fetched from sources");
      return;
    }

    const mappedLeads = mapLeads(fetched);
    console.log("🔹 Mapped leads ready to send:", mappedLeads);

    const response = await axios.post(`${BASE_URL}/addmany`, mappedLeads);
    console.log(`✅ ${response.data?.data?.length || 0} leads added successfully`);
  } catch (err: any) {
    console.error("❌ Lead sync failed:", err?.message || err);
  }
};
