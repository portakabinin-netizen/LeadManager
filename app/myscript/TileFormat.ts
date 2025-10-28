export interface Activity {
  action: string;
  date?: string | Date;
  note?: string;
}

export interface EmbeddedLedger {
  ledger_id: string;
  date: string;
  narration: string;
  amount: number;
  type: "Dr" | "Cr";
  account_title: string;
  account_id?: string;
}

export interface Ledger {
  _id?: string;
  lead_id: string;
  date: string;
  narration: string;
  amount: number;
  type: "Dr" | "Cr";
  account_title: string;
  account_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lead {
  _id?: string;
  source_id?: string;
  lead_no?: number;
  sender_name?: string;
  product_name?: string;
  sender_mobile?: string;
  sender_email?: string;
  sender_city?: string;
  sender_state?: string;
  source?: string;
  status?: "Fresh" | "Recent" | "Engaged" | "Accepted" | "Restore" | "Recycle";
  activity?: Activity[];
  ledger?: EmbeddedLedger[];
  createdAt?: string;
  updatedAt?: string;
  note?: string;
}

export interface LedgerItem {
  _id?: string;
  lead_id?: string;
  source?: string;          // e.g., "Referral", "Website", etc.
  amount: number;           // ledger amount
  type: "Dr" | "Cr";        // Dr = Payment, Cr = Receipt
  date?: string | Date;
  narration?: string;
  account_title?: string;
}

// Aggregated Finance Analytics per source
export interface FinanceAnalytics {
  source: string;           // source name
  totalDr: number;          // total Payments
  totalCr: number;          // total Receipts
  balance: number;          // totalCr - totalDr
}


export interface StatusBreakdown {
  status: string;
  count: number;
}

export interface LeadGroupedItem {
  _id: string; // source
  total: number;
  statusBreakdown: StatusBreakdown[];
}
export interface DashboardData {
  leads: {
    groupBy: string[];
    grouped: LeadGroupedItem[];
  };
  finance: FinanceAnalytics[];
}

export interface UrlInfo {
  userid: string;
  profile_id: string;
  key: string;
  urlapi: string;
  urlinbox: string;
  limit?: number;
  page_no?: number;
}
export interface UrlResult {
  apiUrl: string;
  emailUrl: string;
  waMsgUrl : string;
}