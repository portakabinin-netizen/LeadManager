const express = require("express");
const axios = require("axios");
const { Leads, Ledgers, Urlinfo } = require("../models/LeadSchema");
require("dotenv").config();

module.exports = (io) => {
  const router = express.Router();

  /* =====================================================
     🟢 LEADS CRUD ROUTES
  ===================================================== */

  // ➕ Add Single Lead
  router.post("/add", async (req, res) => {
    try {
      const lead = new Leads(req.body);
      const saved = await lead.save();
      io.emit("lead:added", saved);
      res.status(201).json({ message: "✅ Lead added", data: saved });
    } catch (err) {
      console.error("Lead add error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ➕ Add Multiple Leads (skip duplicates)
  router.post("/addmany", async (req, res) => {
    try {
      const leads = req.body;
      if (!Array.isArray(leads) || !leads.length)
        return res.status(400).json({ success: false, message: "No leads provided." });

      const result = await Leads.insertMany(leads, { ordered: false });
      res.json({ success: true, insertedCount: result.length, message: `${result.length} leads inserted.` });
    } catch (err) {
      if (err.writeErrors) {
        const inserted = err.result?.result?.nInserted || 0;
        return res.json({ success: true, insertedCount: inserted, message: `⚠️ Some duplicates skipped.` });
      }
      console.error("Lead insertMany error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /* =====================================================
     🟠 URL BUILDER SECTION (from .env)
  ===================================================== */
  router.post("/lead/urlinfo/build", async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const {
        TRADEINDIA_BASE_URL,
        TRADEINDIA_USERID,
        TRADEINDIA_PROFILEID,
        TRADEINDIA_KEY,
        EXPORTERSINDIA_BASE_URL,
        EXPORTERSINDIA_USERID,
        EXPORTERSINDIA_PROFILEID,
        EXPORTERSINDIA_KEY,
      } = process.env;

      if (!TRADEINDIA_BASE_URL || !EXPORTERSINDIA_BASE_URL)
        return res.status(400).json({ success: false, message: "Missing .env configuration" });

      const tradeindia = `${TRADEINDIA_BASE_URL}?userid=${TRADEINDIA_USERID}&profile_id=${TRADEINDIA_PROFILEID}&key=${TRADEINDIA_KEY}&from_date=${today}&to_date=${today}&limit=100`;
      const exportersindia = `${EXPORTERSINDIA_BASE_URL}?userid=${EXPORTERSINDIA_USERID}&profile_id=${EXPORTERSINDIA_PROFILEID}&key=${EXPORTERSINDIA_KEY}&from_date=${today}&to_date=${today}&limit=100`;

      const urls = new Urlinfo({
        tradeindia_url: tradeindia,
        exportersindia_url: exportersindia,
        createdAt: new Date(),
      });

      await urls.save();
      io.emit("urlinfo:created", urls);
      res.json({ success: true, message: "✅ URLs generated and saved", data: urls });
    } catch (err) {
      console.error("URL Build error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 🔹 Return latest URLs
  router.get("/lead/urlinfo/get", async (req, res) => {
    try {
      const urls = await Urlinfo.findOne().sort({ createdAt: -1 });
      if (!urls) return res.status(404).json({ success: false, message: "No URLs found" });
      res.json({ success: true, urls });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  /* =====================================================
     🔵 SYNC LEADS FROM FRONTEND
  ===================================================== */
  router.post("/lead/sync", async (req, res) => {
    try {
      const { leads } = req.body;
      if (!Array.isArray(leads) || leads.length === 0)
        return res.status(400).json({ success: false, message: "No leads received" });

      let insertedCount = 0;
      let duplicateCount = 0;

      for (const lead of leads) {
        const result = await Leads.updateOne(
          { sender_mobile: lead.sender_mobile, subject: lead.subject },
          { $setOnInsert: lead },
          { upsert: true }
        );
        if (result.upsertedCount > 0) insertedCount++;
        else duplicateCount++;
      }

      io.emit("lead:imported", { insertedCount, duplicateCount });
      res.json({ success: true, message: `✅ ${insertedCount} new, ${duplicateCount} duplicate leads.` });
    } catch (err) {
      console.error("Lead sync error:", err);
      res.status(500).json({ success: false, message: "Failed to sync leads" });
    }
  });

  /* =====================================================
     🟣 WHATSAPP MESSAGE TRIGGER
  ===================================================== */
  router.post("/lead/send-whatsapp", async (req, res) => {
    try {
      const { phone, message, imageUrl } = req.body;
      if (!phone || !message)
        return res.status(400).json({ success: false, message: "Phone and message required" });

      const { WHATSAPP_PHONE_ID, WHATSAPP_TOKEN } = process.env;
      if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN)
        return res.status(400).json({ success: false, message: "WhatsApp credentials missing" });

      const payload = {
        messaging_product: "whatsapp",
        to: phone,
        type: imageUrl ? "image" : "text",
        [imageUrl ? "image" : "text"]: imageUrl
          ? { link: imageUrl, caption: message }
          : { body: message },
      };

      await axios.post(
        `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`,
        payload,
        { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
      );

      io.emit("lead:whatsappSent", { phone, message });
      res.json({ success: true, message: "✅ WhatsApp message sent" });
    } catch (err) {
      console.error("WhatsApp send error:", err.response?.data || err.message);
      res.status(500).json({ success: false, message: "Failed to send message" });
    }
  });

  return router;
};
