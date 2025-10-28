// src/services/leadservices.ts
import axios from "axios";

// -------------------- 🔹 Month mapping for TradeIndia --------------------
const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

// -------------------- 🔹 Parse TradeIndia/ISO date --------------------
const parseTradeIndiaDate = (dateStr?: string, timeStr?: string, epoch?: number): Date => {
  if (epoch) {
    return new Date(Number(epoch) < 1e10 ? Number(epoch) * 1000 : Number(epoch));
  }
  if (dateStr) {
    const m = dateStr.match(/(\d{1,2}) (\w+) (\d{4})/);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = MONTHS[m[2].toLowerCase().slice(0, 3)] ?? 0;
      const year = parseInt(m[3], 10);
      return new Date(year, month, day);
    }
  }
  return new Date(); // fallback
};

// -------------------- 🔹 Prepare Lead Object --------------------
const prepareLead = (item: any, leadNo: number) => {
  const now = new Date();
  return {
    source_id: String(item.source_id || item.rfi_id || Date.now()),
    lead_no: leadNo,
    sender_name: item.sender_name || "Unknown",
    sender_mobile: item.sender_mobile || item.landline_number || "",
    sender_email: item.sender_email || "",
    sender_city: item.sender_city || "Unknown",
    sender_state: item.sender_state || "Unknown",
    product_name: item.product_name || "No Product",
    generated_date: parseTradeIndiaDate(item.generated_date, item.generated_time, item.generated),
    source: item.source === "IndiaMart" || item.source === "TradeIndia" ? item.source : "Other",
    status: "Unread",
    activity: [{ date: now, action: "Fetched" }],
    ledger: [{ date: now, narration: "Opening Balance", amount: 0, type: "Dr" }],
  };
};

// -------------------- 🔹 Fetch & Normalize Leads --------------------
export const getDataProcess = async (url1: string, url2: string) => {
  try {
    const resp1 = await axios.get(url1);
    const data1 = Array.isArray(resp1.data) ? resp1.data : [];
    const normalized1 = data1.map(item => ({
      ...item,
      source: "TradeIndia",
      status: "Unread",
    }));
    
    const resp2 = await axios.get(url2);
    const data2 = resp2.data?.records || [];
    
    const normalized2 = data2.map(item => ({
      ...item,
      source: "IndiaMart",
      status: "Unread",
    }));
    
    const combined = [...normalized1, ...normalized2];
    

    // Prepare for backend (map missing fields, activity, ledger)
    const preparedLeads = combined.map((item, idx) => prepareLead(item, idx + 1));
    
    return preparedLeads;
  } catch (err: any) {
    console.error("❌ Error fetching leads:", err.message || err);
    return [];
  }
};

// -------------------- 🔹 Send Leads to Backend --------------------
export const sendLeadsToBackend = async (url1: string, url2: string, BASE_URL: string) => {
  const leads = await getDataProcess(url1, url2);

  if (!leads.length) {
    console.log("ℹ️ No leads to send to backend");
    return;
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    try {
      const res = await axios.post(`${BASE_URL}/addmany`, batch, {
        headers: { "Content-Type": "application/json" },
      });
      console.log(`✅ Batch saved: ${res.data?.data?.length || batch.length} leads`);
    } catch (error: any) {
      console.error("❌ Error saving batch to backend:", error.message || error.response?.data || error);
    }
  }
};
