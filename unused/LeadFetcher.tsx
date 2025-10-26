require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const LeadTable = require("../models/LeadSchema");

class LeadManager {
  constructor(io) {
    this.io = io;
    this.router = express.Router();
    this.initRoutes();
  }

  // ---------------- ROUTES ----------------
  initRoutes() {
    this.router.get("/fetch", this.fetchAndSaveLeads.bind(this));
    this.router.get("/", this.getAllLeads.bind(this));
  }

  // ---------------- BUILD TRADEINDIA URL ----------------
  async buildTradeIndiaUrl() {
    const lastLead = await LeadTable.findOne({ source: "TradeIndia" }).sort({
      generated_date: -1,
    });

    const fromDate = lastLead
      ? new Date(lastLead.generated_date)
      : new Date(new Date().setDate(new Date().getDate() - 1));
    const toDate = new Date();

    const formatDate = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    const params = {
      userid: "23134696",
      profile_id: "102656695",
      key: "abef1268bf0df7863ae259fb1c2b611d",
      from_date: formatDate(fromDate),
      to_date: formatDate(toDate),
      limit: 50,
      page_no: 1,
    };

    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    return `https://www.tradeindia.com/utils/my_inquiry.html?${query}`;
  }

  // ---------------- MAP LEADS ----------------
  static mapFatchedByAPI(item) {
    return {
      source_id: item.rfi_id || `TI-${item.sender_mobile}-${Date.now()}`,
      sender_name: item.sender_name || "Unknown",
      sender_mobile: item.sender_mobile || item.sender_other_mobiles || "",
      sender_email: item.sender_email || "",
      sender_city: item.sender_city || "Unknown",
      sender_state: item.sender_state || "Unknown",
      product_name: item.subject || item.product_name || "No Product",
      generated_date: item.generated_date
        ? new Date(item.generated_date)
        : new Date(),
      source: "TradeIndia",
      status: item.view_status === "New" ? "New" : "In Progress",
      activity: [{ action: "Fetched", date: new Date() }],
      ledger:[{date: new Date(), narration :"Opening Balance" , amount : 0, Type:"Dr"}],
    };
  }

  static mapFatchedByInbox(item) {
    return {
      source_id: item.source_id || `PK-${item.sender_mobile}-${Date.now()}`,
      sender_name: item.sender_name || "Unknown",
      sender_mobile: item.sender_mobile || "",
      sender_email: item.sender_email || "No Email",
      sender_city: item.sender_city || "City",
      sender_state: item.sender_state || "State",
      product_name: item.product_name || "No Product",
      generated_date: item.generated_date
        ? new Date(item.generated_date)
        : new Date(),
      source: item.source || "Portakabin",
      status: item.status === "Unread" ? "Unread" : "In Progress",
      activity: [{ action: "Created", date: new Date() }],
      ledger:[{date: new Date(), narration :"Opening Balance" , amount : 0, Type:"Dr"}],
    };
  }

  // ---------------- FETCH + SAVE LEADS ----------------
  async fetchAndSaveLeads(req, res) {
    try {
      let inboxData = [];
      let apiData = [];

      // ---- Fetch from TradeIndia ----
      try {
        const tradeUrl = await this.buildTradeIndiaUrl();
        const resp = await fetch(tradeUrl, {
          headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0",
          },
        });
        const raw = await resp.text();

        if (!raw.trim().startsWith("<")) {
          const json = JSON.parse(raw);
          apiData = Array.isArray(json) ? json : json.records || [];
        } else {
          console.warn("⚠️ TradeIndia returned HTML instead of JSON");
        }
      } catch (err) {
        console.warn("⚠️ TradeIndia fetch failed:", err.message);
      }

      // ---- Fetch from Email Inbox using python code ----
      try {
        const resp = await fetch(
          "https://portakabin.pythonanywhere.com/api/sales",
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0",
            },
          }
        );
        const json = await resp.json();
        inboxData = json.records || [];
      } catch (err) {
        console.warn("⚠️ Email Inbox read failed:", err.message);
      }

      // ---- Combine + Map ----
      const apiMapped = apiData.map((x) =>
        LeadManager.mapFatchedByAPI(x)
      );
      const inboxMapped = inboxData.map((x) =>
        LeadManager.mapFatchedByInbox(x)
      );
      const combinedData = [...apiMapped, ...inboxMapped];

      if (!combinedData.length) {
        console.log("ℹ️ No new data fetched from sources.");
        return res.json({ message: "No data fetched", total: 0, leads: [] });
      }

      // ---- Filter new leads ----
      const ids = combinedData.map((x) => x.source_id);
      const existing = await LeadTable.find({ source_id: { $in: ids } }).select(
        "source_id"
      );
      const existingIds = new Set(existing.map((x) => x.source_id));

      const newLeads = combinedData.filter(
        (lead) => !existingIds.has(lead.source_id)
      );

      if (!newLeads.length) {
        return res.json({
          message: "No new leads to insert",
          total: 0,
          leads: [],
        });
      }

      // ---- Insert + Emit ----
      const inserted = await LeadTable.insertMany(newLeads, { ordered: false });
      inserted.forEach((lead) => this.io?.emit("newLead", lead));

      res.json({
        message: `${inserted.length} new leads inserted successfully`,
        total: inserted.length,
        leads: inserted,
      });
    } catch (err) {
      console.error("❌ Fetch error:", err);
      res.status(500).json({ message: "Fetch failed", total: 0, leads: [] });
    }
  }

  // ---------------- GET ALL LEADS ----------------
  async getAllLeads(req, res) {
    try {
      const leads = await LeadTable.find().sort({ createdAt: -1 });
      res.json({ total: leads.length, leads });
    } catch (err) {
      console.error("❌ GetAllLeads error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = (io) => new LeadManager(io).router;
