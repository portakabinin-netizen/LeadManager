import axios from "axios";
import dotenv from "dotenv";
import express from "express";

dotenv.config();
const router = express.Router();

const {
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  WHATSAPP_URL,
  PYTHON_URL,
} = process.env;

/* -------------------------------------------------------------------------- */
/* 🧩 Helper: Date Formatter                                                  */
/* -------------------------------------------------------------------------- */
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/* -------------------------------------------------------------------------- */
/* 🧩 Helper: Send WhatsApp Message                                           */
/* -------------------------------------------------------------------------- */
const sendWhatsAppMessage = async (phone, message) => {
  const apiUrl = `${WHATSAPP_URL}/${PHONE_NUMBER_ID}/messages`;
  try {
    const response = await axios.post(
      apiUrl,
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    return !!response.data.messages;
  } catch (error) {
    console.error("❌ WhatsApp send failed:", error.response?.data || error.message);
    return false;
  }
};

/* -------------------------------------------------------------------------- */
/* 🧩 Route: Fetch, Merge, Save, WhatsApp, Update                             */
/* -------------------------------------------------------------------------- */
router.get("/fetch-leads", async (req, res) => {
  try {
    console.log("🔹 Starting lead fetch process...");

    // 🗓️ Date Range
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const from_date = formatDate(yesterday);
    const to_date = formatDate(today);

    // 🔹 Load URL configuration from DB
    const urlInfo = await Urlinfo.findOne();
    if (!urlInfo) {
      return res.status(404).json({ success: false, message: "No URL info found" });
    }

    // 🌐 Build TradeIndia URL dynamically
    const tradeIndiaUrl = `${urlInfo.urlapi}?userid=${urlInfo.userid}&profile_id=${urlInfo.profile_id}&key=${urlInfo.key}&from_date=${from_date}&to_date=${to_date}&limit=${urlInfo.limit}&page_no=${urlInfo.page_no}`;
    console.log("📡 TradeIndia API URL:", tradeIndiaUrl);

    // 🔁 Fetch from both APIs
    const [tradeRes, pythonRes] = await Promise.allSettled([
      axios.get(tradeIndiaUrl),
      axios.get(`${PYTHON_URL}/process`),
    ]);

    const tradeLeads =
      tradeRes.status === "fulfilled"
        ? tradeRes.value.data?.data || tradeRes.value.data || []
        : [];
    const pythonLeads =
      pythonRes.status === "fulfilled"
        ? pythonRes.value.data?.data || pythonRes.value.data || []
        : [];

    console.log(`✅ TradeIndia Leads: ${tradeLeads.length}, IndiaMart Leads: ${pythonLeads.length}`);

    // 🧩 Merge & assign default sources
    const tradeData = tradeLeads.map((item) => ({
      ...item,
      source: "TradeIndia",
    }));
    const pythonData = pythonLeads.map((item) => ({
      ...item,
      source: "IndiaMart",
    }));

    const allLeads = [...tradeData, ...pythonData];
    if (allLeads.length === 0) {
      return res.json({ success: false, message: "No new leads found" });
    }

    let insertedCount = 0;
    let whatsappSent = 0;

    for (const item of allLeads) {
      const leadData = {
        product_name: item.product_name || item.product || "N/A",
        sender_name: item.sender_name || item.name || "Unknown",
        sender_city: item.sender_city || item.city || "",
        sender_state: item.sender_state || item.state || "",
        sender_mobile: item.sender_mobile || item.mobile || "",
        sender_email: item.sender_email || item.email || "",
        source: item.source,
        source_id: item.id || "",
        status: "Unread",
        generated_date: new Date(),
        activity: [
          { date: new Date(), action: "Fetched data" },
        ],
        ledger: [
          {
            date: new Date(),
            narration: "Opening Balance",
            amount: 0,
            type: "Dr",
          },
        ],
      };

      // 🚫 Skip duplicates
      const duplicate = await Leads.findOne({
        $or: [
          { sender_email: leadData.sender_email },
          { sender_mobile: leadData.sender_mobile },
        ],
      });
      if (duplicate) continue;

      // 💾 Save lead
      const savedLead = await new Leads(leadData).save();
      insertedCount++;

      // 💬 WhatsApp Message
      const phone = leadData.sender_mobile.startsWith("91")
        ? leadData.sender_mobile
        : `91${leadData.sender_mobile}`;
      const message = `Hello ${leadData.sender_name}, thank you for your interest in ${leadData.product_name}. Our team will contact you soon!`;

      const sent = await sendWhatsAppMessage(phone, message);

      if (sent) {
        whatsappSent++;
        await Leads.updateOne(
          { _id: savedLead._id },
          {
            $set: { status: "Recent" },
            $push: { activity: { date: new Date(), action: "WA message sent" } },
          }
        );
      }
    }

    res.status(200).json({
      success: true,
      insertedCount,
      whatsappSent,
      message: `${insertedCount} leads saved, ${whatsappSent} WhatsApp messages sent.`,
    });
  } catch (error) {
    console.error("❌ Lead fetch error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
