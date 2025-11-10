import axios from "axios";
import api_url from "../../../../backend/routes/base_url";
import { getDataProcess } from "./getDataProcees";
import type { DashboardData, FinanceAnalytics, Lead } from "./TileFormat";
import { UrlInfo, UrlResult } from "./TileFormat";

//-------------------- Call API for fetched leads from external server--------------------

/* Get URL information start date from database  */

export const getUrlInfo = async (): Promise<UrlResult> => {
  const res = await axios.get(`${api_url}/url`);

  if (res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
    const urlInfo: UrlInfo = res.data.data[0];

    // Format dates as yyyy-mm-dd
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const fromDate = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const toDate = formatDate(new Date());

    const params = {
      userid: urlInfo.userid,
      profile_id: urlInfo.profile_id,
      key: urlInfo.key,
      from_date: fromDate,
      to_date: toDate,
      limit: urlInfo.limit || 50,
      page_no: urlInfo.page_no || 1,
    };

    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const apiUrl = `${urlInfo.urlapi}?${query}`;
    const emailUrl = `${urlInfo.urlinbox}`;
    const waMsgUrl = `${urlInfo.waMsgUrl}`;

    return { apiUrl, emailUrl, waMsgUrl };
  }

  throw new Error("No URL info found in collection");
};

export const buildUrls = (urlInfo: UrlInfo): UrlResult => {
  console.log("🔹 Building TradeIndia URLs...");

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

  const apiUrl = `${urlInfo.urlapi}?${query}`;
  const emailUrl = '${urlInfo.urlinbox}';
  const waMsgUrl = '${urlInfo.waMsgUrl}';
  
   return { apiUrl, emailUrl , waMsgUrl};
};


// ------------------- LEAD SERVICE -------------------

// Fetch leads by status or other query params
export const getLeadsByStatus = async (status?: string) => {
 
  const { data } = await axios.get(status ? `${api_url}/retrieve?status=${encodeURIComponent(status)}` : `${api_url}/retrieve`);
  return data;
};

// Fetch lead by status and sources and count total leads 

export const countLeadsByStatus = async (status :any) => {
  try {
    const { data } = await axios.get(`${api_url}/retrieve?status=${encodeURIComponent(status)}&count=true` );
    return data; // expect { count: number }
  } catch (error) {
    console.error("Lead count fetch failed:", error);
    return { count: 0 };
  }
}; 

// Fetch leadh by period getLeadsByPeriod
export const getLeadsByPeriod = async (
  start: string, // YYYY-MM-DD
  end: string,   // YYYY-MM-DD
  status?: string
): Promise<Lead[]> => {
  try {
    const params: Record<string, string> = { from: start, to: end };
    if (status) params.status = status;

    const query = new URLSearchParams(params).toString();
    const url = `${api_url}/retrieve?${query}`;
    console.log("Fetching leads by period:", url);

    const response = await axios.get(url);

    // ✅ Your backend sends { totalRecords, data: [...] }
    const leads = Array.isArray(response.data)
      ? response.data // if backend someday returns array directly
      : response.data?.data || [];

    console.log(`✅ Leads fetched: ${leads.length}`);
    return leads;
  } catch (error: any) {
    console.error("❌ getLeadsByPeriod fetch failed:", error.message || error);
    return [];
  }
};


// Add / Create new lead(s)

export const addLeads = async (leads: Lead[] | Lead) => {
  const payload = Array.isArray(leads) ? leads : [leads];
  const { data } = await axios.post(`${api_url}/add`, payload);
  return data;
};

// Update existing lead(s)

export const saveOrUpdateLeads = async (leads: Lead[] | Lead) => {
  const list = Array.isArray(leads) ? leads : [leads];
  const results = [];

  for (const lead of list) {
    if (!lead._id) throw new Error("Lead ID is required for update");

    const { _id, ...payload } = lead; // remove _id from payload
    const url = `${api_url}/update/id/${_id}`; // matches backend route

    const { data } = await axios.put(url, payload);
    results.push(data);
  }

  return results;
};


// Delete lead by ID
export const deleteLead = async (id: string) => {
  const { data } = await axios.delete(`${api_url}/delete/${id}`);
  return data;
};

// Update lead status with optional note
export const updateLeadStatus = async (id: string, status: string, note?: string) => {
  const { data } = await axios.put(`${api_url}/update/status/${id}`, { status, note });
  console.log('Final Data:', {data});
  return data;
};

// Add mupltiple leads in database, fetched from External server using API

export const getAndSaveLeads = async (url1: string, url2: string) => {

  try {
    // 🔹 Step 1: Fetch and normalize leads
    const leadsData = await getDataProcess(url1, url2);
    
    if (!leadsData || leadsData.length === 0) {
      const msg = "No new leads found to insert.";
     
      return { count: 0, message: msg };
    }

    // 🔹 Step 2: Send to backend for saving (backend skips duplicates)

    const response = await axios.post(`${api_url}/addmany`, leadsData);

    const insertedCount =
      response.data?.insertedCount ||
      response.data?.data?.length ||
      0;

    const msg =
      insertedCount > 0
        ? `✅ ${insertedCount} new leads added successfully.`
        : "⚠️ All leads are already present, no new leads added.";

       return { count: insertedCount, message: msg };
  } catch (error: any) {
    
    const errMsg =
      error?.response?.data?.message ||
      error?.message ||
      "Something went wrong while syncing leads.";

    return { count: 0, message: errMsg };
  }
};

// ------------------- LEDGER SERVICES -------------------

// Add Ledger entry linked to a lead
export const addLedgerEntry = async (
  leadId: string,
  ledger: {
    date: string | Date;
    narration: string;
    amount: number;
    type: "Dr" | "Cr";
    account_title: string;
  }
) => {
  const { data } = await axios.post(`${api_url}/ledger/add`, { lead_id: leadId, ...ledger });
  return data;
};

// Add Embedded Ledger entry inside a Lead document

export const addEmbeddedLedger = async (
  leadId: string,
  ledger: {
    ledger_id: string;
    date: string | Date;
    narration: string;
    amount: number;
    type: "Dr" | "Cr";
    account_title: string;
  }
) => {
  const { data } = await axios.put(`${api_url}/ledger/add/${leadId}`, { ledger });
  return data;
};

// ------------------- Lead and Finance Analytics -------------------

export const getDashboardData = async (
  fromDate?: string,
  toDate?: string
): Promise<DashboardData> => {
  try {
    // ---------- 1️⃣ Build Lead URL ----------
    const leadParams = new URLSearchParams();
      leadParams.append("groupBy", "source"); // only source
      if (fromDate) leadParams.append("fromDate", fromDate);
      if (toDate) leadParams.append("toDate", toDate);

    const leadUrl = `${api_url}/retrieve?${leadParams.toString()}`;
        //console.log("Lead URL:", leadUrl);

    // ---------- 2️⃣ Fetch Leads ----------
    const leadsRes = await axios.get(leadUrl);
    const leadsPayload = leadsRes?.data ?? {};

    const leadsGrouped: LeadGroupedItem[] = Array.isArray(leadsPayload.grouped)
      ? leadsPayload.grouped.map((g: any) => ({
          _id: g._id ?? "Unknown",
          total: g.total ?? 0,
          statusBreakdown: Array.isArray(g.statusBreakdown)
            ? g.statusBreakdown.map((s: any) => ({
                status: s.status ?? "Unknown",
                count: s.count ?? 0,
              }))
            : [],
        }))
      : [];

    const leads = {
      groupBy: leadsPayload.groupBy ?? [],
      grouped: leadsGrouped,
    };

    // ---------- 3️⃣ Fetch Finance ----------
    
    const financeRes = await axios.get(`${api_url}/ledger/retrieve`);
    const financePayload = financeRes?.data;

    const financeRecords: any[] = Array.isArray(financePayload?.data)
      ? financePayload.data
      : Array.isArray(financePayload)
      ? financePayload
      : [];

    const agg: Record<string, { totalDr: number; totalCr: number }> = {};

    financeRecords.forEach((ledger) => {
      const source = ledger?.source ? String(ledger.source) : "Unknown";
      const type = ledger?.type ? String(ledger.type).toLowerCase() : "";
      const amount = Number(ledger?.amount) || 0;

      if (!agg[source]) agg[source] = { totalDr: 0, totalCr: 0 };

      if (type === "dr") agg[source].totalDr += amount;
      else if (type === "cr") agg[source].totalCr += amount;
    });

    const finance: FinanceAnalytics[] = Object.keys(agg).map((src) => {
      const { totalDr, totalCr } = agg[src];
      return {
        source: src,
        totalDr,
        totalCr,
        balance: totalDr - totalCr,
      };
    });

    // ---------- 4️⃣ Return combined data ----------
    return { leads, finance };
  } catch (err: any) {
    console.error("getDashboardData error:", err?.message ?? err);
    return {
      leads: { groupBy: [], grouped: [] },
      finance: [],
    };
  }
}

// ------------------- EXPORT DEFAULT -------------------
export default {
  getLeadsByStatus,
  getLeadsByPeriod,
  addLeads,
  saveOrUpdateLeads,
  deleteLead,
  updateLeadStatus,
  addLedgerEntry,
  addEmbeddedLedger,
  countLeadsByStatus,
  getDashboardData,
  getUrlInfo,
  buildUrls,
  getAndSaveLeads,

};
