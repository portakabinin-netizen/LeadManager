import axios from "axios";
import { getApiPath } from "../../constants/config";

export interface Lead {
  _id?: string;
  sender_name?: string;
  sender_mobile?: string;
  sender_email?: string;
  sender_city?: string;
  sender_state?: string;
  product_name?: string;
  source?: string;
  status?: string;
  activity?: Activity[];
}

export interface Activity {
  date?: string;
  action?: string;
}

export interface FinanceAnalytics {
  source: string;
  totalDr: number;
  totalCr: number;
  balance: number;
}

const BASE_URL = `${getApiPath()}`;

const LeadService = {
 
 // 

 // Add Documents in collection for Ledger.
 
 
  // ✅ Get leads by period
  getLeadsByPeriod: async (startDate: string, endDate: string): Promise<Lead[]> => {
    try {
      const res = await axios.get(`${BASE_URL}/period`, {
        params: { startDate, endDate },
      });
      return res.data;
    } catch (err: any) {
      console.error("Failed to fetch leads by period:", err.message);
      return [];
    }
  },

  // ✅ Get finance analytics

  getFinanceAnalytics: async (): Promise<FinanceAnalytics[]> => {
    try {
      return await Ledgers.find({ lead_id: leadId }).sort({ date: 1 });
      //const res = await axios.get(`${BASE_URL}/analytics`);
      //return res.data;
    } catch (err: any) {
      console.error("Failed to fetch finance analytics:", err?.response?.data || err.message);
      return [];
    }
  },

  // ✅ Get leads by status
  async getLeadsByStatus(status: string): Promise<Lead[]> {
    try {
      const res = await axios.get(`${BASE_URL}`, { params: { status } });
      const leads: Lead[] = res.data || [];
      return status ? leads.filter(l => l.status === status) : leads;
    } catch (err: any) {
      console.error("❌ Failed to fetch leads:", err?.response?.data || err.message);
      return [];
    }
  },

  // ✅ Save or update leads (updated endpoint)
  saveOrUpdateLeads: async (leads: Partial<Lead>[]): Promise<any> => {
    try {
      // Backend expects `data` field in POST body
      const res = await axios.post(`${BASE_URL}/save`, { data: leads });
      return res.data;
    } catch (err: any) {
      console.error("Failed to save/update leads:", err?.response?.data || err.message);
      return null;
    }
  },

  // ✅ Get lead counts (updated endpoint)
  getLeadCounts: async (): Promise<{ [status: string]: number }> => {
    try {
      const res = await axios.get(`${BASE_URL}/count`);
      return res.data;
    } catch (err: any) {
      console.error("Failed to fetch lead counts:", err?.response?.data || err.message);
      return {};
    }
  },
};

// Delete or Updated ledger record
async function deleteLedgerEntry(ledgerId) {
  // Remove from main ledger
  const deleted = await Ledgers.findByIdAndDelete(ledgerId);
  if (!deleted) return null;

  // Remove from embedded array
  await Leads.updateOne(
    { "ledger.ledger_id": ledgerId },
    { $pull: { ledger: { ledger_id: ledgerId } } }
  );

  return deleted;
}

async function updateLedgerEntry(ledgerId, newData) {
  const updated = await Ledgers.findByIdAndUpdate(ledgerId, newData, { new: true });

  if (updated) {
    await Leads.updateOne(
      { "ledger.ledger_id": ledgerId },
      {
        $set: {
          "ledger.$.narration": updated.narration,
          "ledger.$.amount": updated.amount,
          "ledger.$.type": updated.type,
          "ledger.$.account_title": updated.account_title,
        },
      }
    );
  }

  return updated;
}


export default LeadService;
