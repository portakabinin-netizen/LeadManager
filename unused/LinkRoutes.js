import axios from "axios";
import express from "express";
import Lead from "../models/Lead.js";

const router = express.Router();

// Read environment variables (ensure .env loaded in server.js)
const {
  TRADEINDIA_BASE,
  PYTHON_PROCESS_URL,
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  WHATSAPP_URL,
} = process.env;

/**
 * Helper: Format YYYY-MM-DD
 */
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * GET /api/urlinfo
 * Build and return the external API URLs the frontend should call.
 * Only non-secret information is returned here.
 */
router.get("/apiLink", async (req, res) => {
  try {
    // Example date range: yesterday -> today
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const from_date = formatDate(yesterday);
    const to_date = formatDate(today);

    // Build a TradeIndia link (example query params, adapt to your DB stored values)
    const tradeIndiaUrl = `${TRADEINDIA_BASE}?from_date=${from_date}&to_date=${to_date}&limit=100`;

    // Return both URLs to frontend — note: do NOT include any secret tokens here
    return res.json({
      success: true,
      urls: {
        tradeIndia: tradeIndiaUrl,
        pythonProcess: PYTHON_PROCESS_URL,
      },
      message: "URLs built successfully",
    });
  } catch (err) {
    console.error("❌ /api/urlinfo error:", err);
    return res.status(500).json({ success: false, message: "Failed to build URLs" });
  }
});

/**
 * POST /api/leads
 * Body: { leads: Array<NormalizedLead> }
 * Backend enforces uniqueness by sender_email or sender_mobile, inserts only new leads.
 */
router.post("/GetInsertData", async (req, res) => {
  try {
    const leads = Array.isArray(req.body.leads) ? req.body.leads : [];
    if (!leads.length) {
      return res.status(400).json({ success: false, message: "No leads provided" });
    }

    let inserted = 0;
    let skipped = 0;
    const errors = [];

    // Use session if you want transactions (optional)
    for (const l of leads) {
      try {
        // Normalize mobile: remove non-digits and ensure country code (e.g. 91)
        const mobileRaw = (l.sender_mobile || "").toString().replace(/\D/g, "");
        const mobile = mobileRaw.startsWith("91") ? mobileRaw : mobileRaw ? `91${mobileRaw}` : "";

        const email = (l.sender_email || "").toLowerCase().trim();

        // Build search criteria: consider email OR mobile (if provided)
        const or = [];
        if (email) or.push({ sender_email: email });
        if (mobile) or.push({ sender_mobile: mobile });

        if (!or.length) {
          // No reliable unique identifier — skip to avoid dupes
          skipped++;
          continue;
        }

        const exists = await Lead.findOne({ $or: or }).lean();
        if (exists) {
          skipped++;
          continue;
        }

        const leadDoc = new Lead({
          product_name: l.product_name || l.product || "N/A",
          sender_name: l.sender_name || l.name || "Unknown",
          sender_city: l.sender_city || l.city || "",
          sender_state: l.sender_state || l.state || "",
          sender_mobile: mobile,
          sender_email: email,
          source: l.source || "Unknown",
          source_id: l.source_id || l.id || "",
          status: "Unread",
          generated_date: l.generated_date ? new Date(l.generated_date) : new Date(),
          activity: [{ date: new Date(), action: "Fetched / inserted via frontend sync" }],
          ledger: [{
            date: new Date(),
            narration: "Opening Balance",
            amount: 0,
            type: "Dr",
          }],
        });

        await leadDoc.save();
        inserted++;
      } catch (leErr) {
        console.error("❌ error inserting lead:", leErr);
        errors.push({ lead: l, error: leErr.message });
      }
    }

    return res.json({
      success: true,
      inserted,
      skipped,
      errors,
      message: `${inserted} leads inserted, ${skipped} skipped.`,
    });
  } catch (err) {
    console.error("❌ POST /api/leads error:", err);
    return res.status(500).json({ success: false, message: "Failed to insert leads" });
  }
});

/**
 * POST /api/send-whatsapp
 * Body: { leadId: string, message: string }
 * This endpoint actually calls WhatsApp API using secure token on backend.
 */
router.post("/welcomeMsgSent", async (req, res) => {
  try {
    const { leadId, message } = req.body;
    if (!leadId || !message) {
      return res.status(400).json({ success: false, message: "leadId and message required" });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const phone = (lead.sender_mobile || "").replace(/\D/g, "");
    if (!phone) return res.status(400).json({ success: false, message: "Lead has no phone" });

    // Build WhatsApp API payload
    const apiUrl = `${WHATSAPP_URL}/${PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: message },
    };

    const headers = {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    };

    // Send
    const waRes = await axios.post(apiUrl, payload, { headers });
    const success = !!waRes.data?.messages;

    // Update lead activity & status
    if (success) {
      lead.status = "Recent";
      lead.activity.push({ date: new Date(), action: "WA message sent" });
      await lead.save();
    }

    return res.json({
      success,
      data: waRes.data,
      message: success ? "WhatsApp sent" : "WhatsApp API returned no messages",
    });
  } catch (err) {
    console.error("❌ /api/send-whatsapp error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send WhatsApp message",
      detail: err.response?.data || err.message,
    });
  }
});

export default router;
