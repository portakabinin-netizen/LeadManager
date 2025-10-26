import axios from "axios";
import { Lead } from "../myscript/TileFormat";
import { BASE_URL } from "./base_url";

// ------------------- LEAD SERVICE -------------------

// Fetch leads by status or all leads
export const getLeadsByStatus = async (status?: string) => {
  const url = status
    ? `${BASE_URL}/retrieve?status=${encodeURIComponent(status)}`
    : `${BASE_URL}/retrieve`;
  const { data } = await axios.get(url);
  return data;
};

// Fetch lead counts by status
export const countLeadsByStatus = async (status: string) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/retrieve?status=${encodeURIComponent(status)}&count=true`);
    return data; // expect { count: number }
  } catch (error) {
    console.error("Lead count fetch failed:", error);
    return { count: 0 };
  }
};

// ✅ Fetch leads by period with optional status
export const getLeadsByPeriod = async (
  start: string, // YYYY-MM-DD
  end: string,   // YYYY-MM-DD
  status?: string
): Promise<Lead[]> => {
  try {
    const params: Record<string, string> = { from: start, to: end };
    if (status) params.status = status;

    const query = new URLSearchParams(params).toString();
    const { data } = await axios.get(`${BASE_URL}/retrieve?${query}`);

    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error("getLeadsByPeriod fetch failed:", error.message || error);
    return [];
  }
};

// Add / Create new lead(s)
export const addLeads = async (leads: Lead[] | Lead) => {
  const payload = Array.isArray(leads) ? leads : [leads];
  const { data } = await axios.post(`${BASE_URL}/add`, payload);
  return data;
};

// Update existing lead(s)
export const saveOrUpdateLeads = async (leads: Lead[] | Lead) => {
  const list = Array.isArray(leads) ? leads : [leads];
  const results = [];

  for (const lead of list) {
    if (!lead._id) throw new Error("Lead ID is required for update");
    const { _id, ...payload } = lead;
    const { data } = await axios.put(`${BASE_URL}/update/id/${_id}`, payload);
    results.push(data);
  }

  return results;
};

// Delete lead by ID
export const deleteLead = async (id: string) => {
  const { data } = await axios.delete(`${BASE_URL}/delete/${id}`);
  return data;
};

// Update lead status with optional note
export const updateLeadStatus = async (id: string, status: string, note?: string) => {
  const { data } = await axios.put(`${BASE_URL}/update/status/${id}`, { status, note });
  return data;
};

// ------------------- LEDGER SERVICES -------------------

// Add Ledger entry linked to a lead
export const addLedgerEntry = async (
  leadId: string,
  ledger: { date: string | Date; narration: string; amount: number; type: "Dr" | "Cr"; account_title: string }
) => {
  const { data } = await axios.post(`${BASE_URL}/ledger/add`, { lead_id: leadId, ...ledger });
  return data;
};

// Add Embedded Ledger entry inside a Lead document
export const addEmbeddedLedger = async (
  leadId: string,
  ledger: { ledger_id: string; date: string | Date; narration: string; amount: number; type: "Dr" | "Cr"; account_title: string }
) => {
  const { data } = await axios.put(`${BASE_URL}/ledger/add/${leadId}`, { ledger });
  return data;
};

// ------------------- EXPORT DEFAULT -------------------
export default {
  getLeadsByStatus,
  getLeadsByPeriod,      // ✅ Added here
  addLeads,
  saveOrUpdateLeads,
  deleteLead,
  updateLeadStatus,
  addLedgerEntry,
  addEmbeddedLedger,
  countLeadsByStatus,
};
