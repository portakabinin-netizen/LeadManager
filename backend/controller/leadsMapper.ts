// leadsMapper.ts
import axios from "axios";

/**
 * Types (lightweight) - adapt to your TS setup or remove types if using plain JS
 */
type ApiLead = { [k: string]: any }; // incoming object from API
type MappedLead = {
  lead_no?: number;
  product_name?: string;
  sender_name?: string;
  sender_city?: string;
  sender_state?: string;
  sender_mobile?: string;
  sender_email?: string;
  source?: string;
  source_id?: string;
  adminLink?: string;
  corpLink?: string;
  status?: "Unread" | "Contacted" | "Closed" | "Lost";
  generated_date?: string | Date;
  // keep other fields you want as metadata:
  raw?: ApiLead;
};

/* -------------------------
   Utility helpers
   ------------------------- */
const digitsOnly = (s?: string) => (s ? s.replace(/\D+/g, "") : "");

function normalizeMobile(raw?: string): string | undefined {
  if (!raw) return undefined;
  // remove html anchors like <a href="tel:+91...">...< /a >
  const cleaned = raw.replace(/<[^>]*>/g, "");
  const d = digitsOnly(cleaned);
  // if starts with country code like '91' and length > 10, keep last 10
  if (d.length > 10) return d.slice(-10);
  return d.length === 10 ? d : d; // return what we have; backend schema still checks
}

function findEmail(obj: ApiLead): string | undefined {
  // direct field has priority
  if (obj.sender_email && typeof obj.sender_email === "string") {
    return obj.sender_email.trim().toLowerCase();
  }
  // sometimes message or other fields contain emails; quick regex search
  const combined = Object.values(obj).filter(Boolean).join(" ");
  const match = combined.match(/[\w.-]+@[\w.-]+\.\w{2,6}/);
  return match ? match[0].toLowerCase() : undefined;
}

function parseDate(obj: ApiLead): Date {
  // try generated_date field
  if (obj.generated_date) {
    const d = new Date(obj.generated_date);
    if (!isNaN(d.getTime())) return d;
  }
  // try numeric generated
  if (obj.generated && (typeof obj.generated === "number" || /^\d+$/.test(String(obj.generated)))) {
    // `generated` seemed like unix seconds in your example (1761303540). JS wants ms.
    const n = Number(obj.generated);
    // heuristic: if value is 10 digits -> seconds; 13 digits -> ms
    if (n > 1e12) return new Date(n); // already ms
    if (n > 1e9) return new Date(n * 1000); // seconds -> ms
  }
  return new Date();
}

/* -------------------------
   Mapping function
   ------------------------- */
export function mapApiLeadToSchema(item: ApiLead): MappedLead {
  const senderMobile = item.sender_mobile || item.sender_other_mobiles || item.sender_other_mobile || item.sender_mobile_no;
  const mobile = normalizeMobile(senderMobile);
  const email = findEmail(item);

  // choose lead number:
  const leadNo = item.generated ? Number(item.generated) : Date.now();

  // source_id: use rfi_id or product_id as an identifier for source
  const sourceId = item.rfi_id || item.product_id || item.product_id || undefined;

  const mapped: MappedLead = {
    lead_no: leadNo,
    product_name: (item.product_name || item.subject || item.message || "").toString().trim(),
    sender_name: (item.sender_name || item.sender || "").toString().trim(),
    sender_city: (item.sender_city || item.city || "").toString().trim(),
    sender_state: (item.sender_state || item.state || "").toString().trim(),
    sender_mobile: mobile,
    sender_email: email,
    source: item.product_source || item.source || item.source_type || "Unknown",
    source_id: sourceId,
    adminLink: undefined,
    corpLink: undefined,
    status: item.view_status && item.view_status.toUpperCase?.() === "UNREAD" ? "Unread" : "Contacted",
    generated_date: parseDate(item).toISOString(),
    raw: item,
  };

  return mapped;
}

/* -------------------------
   Bulk mapping helper
   ------------------------- */
export function mapApiArray(apiData: ApiLead[] = []): MappedLead[] {
  return apiData.map(mapApiLeadToSchema);
}

/* -------------------------
   Sending helpers
   ------------------------- */

// Base axios instance - adjust baseURL if needed or pass absolute URLs to functions
const api = axios.create({
  // replace with your backend base URL
  baseURL: "https://your-backend.example.com",
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/**
 * sendBulkLeads
 * Tries bulk endpoint first. If 404 or not supported, falls back to per-item POST.
 * Returns { success: MappedLead[], failed: { item, error }[] }
 */
export async function sendBulkLeads(mappedLeads: MappedLead[]) {
  const result = { success: [] as MappedLead[], failed: [] as { item: MappedLead; error: any }[] };

  if (!mappedLeads || mappedLeads.length === 0) return result;

  try {
    // Try bulk endpoint. Adjust path to your actual route.
    const res = await api.post("/api/leads/bulk", { leads: mappedLeads });
    // assume backend returns created leads in res.data.created or res.data
    if (res?.status === 200 || res?.status === 201) {
      // attempt to reconcile created entities; fallback to original mappedLeads
      const created = res.data?.created || res.data || mappedLeads;
      result.success.push(...created);
      return result;
    }
    // otherwise fallthrough to single-item fallback
  } catch (err: any) {
    // if endpoint absent or not allowed, fallback to per-item
    // but if it's a 4xx that's not "not found", maybe stop — here we'll fallback to per-item anyway
    // continue to per-item below
  }

  // Fallback: send items one-by-one
  for (const item of mappedLeads) {
    try {
      const res = await api.post("/api/leads", item);
      if (res.status === 200 || res.status === 201) {
        result.success.push(item);
      } else {
        result.failed.push({ item, error: res.data || res.statusText });
      }
    } catch (error) {
      result.failed.push({ item, error });
    }
  }

  return result;
}

/* -------------------------
   Convenience: map+send in one go
   ------------------------- */
export async function mapAndSendApiResponse(apiArray: ApiLead[]) {
  const mapped = mapApiArray(apiArray);
  const sendResult = await sendBulkLeads(mapped);
  return { mapped, sendResult };
}
