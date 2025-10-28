const express = require("express");
const router = express.Router();
const { Leads, Ledgers , Urlinfo} = require("../models/LeadSchema");

module.exports = (io) => {

  /* =====================================================
   🟢 LEAD COLLECTION-QUERY ROUTES
  ===================================================== */

  // ➕ Add Single Lead
  router.post("/add", async (req, res) => {
    try {
      const lead = new Leads(req.body);
      const saved = await lead.save();
      io.emit("lead:added", saved);
      res.status(201).json({ message: "✅ Lead added successfully", data: saved });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ➕ Add Multiple Leads
  router.post("/addmany", async (req, res) => {
  try {
    const leads = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No leads provided." });
    }

    // ✅ Insert all leads, skip duplicates automatically
    const result = await Lead.insertMany(leads, { ordered: false });

    return res.json({
      success: true,
      insertedCount: result.length,
      message: `${result.length} new unique leads inserted.`,
    });
  } catch (error) {
    console.error("❌ Lead insertMany error:", error);

    // ✅ Handle duplicate key errors gracefully
    if (error?.code === 11000 || error?.writeErrors) {
      const insertedCount = error.result?.result?.nInserted || 0;

      return res.json({
        success: true,
        insertedCount,
        message: `⚠️ Some duplicates skipped. ${insertedCount} new leads inserted.`,
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


  // 🔍 Retrieve All Leads
  router.get("/retrieve", async (req, res) => {
  try {
    const {
      q, status, city, source, state, fromDate, toDate,
      count, limit = 10, skip = 0, sortBy, order = "desc",
      groupBy, mobile,
    } = req.query;

    let filter = {};

    if (q) {
      filter.$or = [
        { sender_name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { product: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
        { state: { $regex: q, $options: "i" } },
        { source: { $regex: q, $options: "i" } },
        { status: { $regex: q, $options: "i" } },
      ];
    }

    if (status) filter.status = status;
    if (city) filter.sender_city = city;
    if (source) filter.source = source;
    if (state) filter.sender_state = state;

    if (mobile) {
      const sanitized = mobile.replace(/^(\+91|91)/, "");
      filter.sender_mobile = { $regex: sanitized + "$", $options: "i" };
    }

    if (fromDate || toDate) {
      const dateField = "generated_date";
      filter[dateField] = {};
      if (fromDate) filter[dateField].$gte = new Date(fromDate);
      if (toDate) filter[dateField].$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
    }

    if (count === "true" && !groupBy) {
      const total = await Leads.countDocuments(filter);
      return res.json({ count: total });
    }

    const sortField = sortBy || "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;

    // 🧠 Nested grouping logic
    if (groupBy === "source") {
      const grouped = await Leads.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { source: "$source", status: "$status" },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.source",
            total: { $sum: "$count" },
            statusBreakdown: {
              $push: { status: "$_id.status", count: "$count" },
            },
          },
        },
        { $sort: { total: -1 } },
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) },
      ]);

      return res.json({ groupBy: ["source", "status"], grouped });
    }

    // 🧾 Regular single-field grouping
    if (groupBy) {
      const grouped = await Leads.aggregate([
        { $match: filter },
        { $group: { _id: `$${groupBy}`, total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) },
      ]);
      return res.json({ groupBy, grouped });
    }

    // 🧮 Normal list retrieval
    const leads = await Leads.find(filter)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ [sortField]: sortOrder });

    const totalRecords = await Leads.countDocuments(filter);
    res.json({ totalRecords, data: leads });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


  // ✏️ Update Lead
  router.put("/update/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Lead ID is required" });
    if (!req.body || Object.keys(req.body).length === 0)
      return res.status(400).json({ message: "Update data is required" });

    const updated = await Leads.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Lead not found" });

    io.emit("lead:updated", updated);
    res.json({ message: "✅ Lead updated", data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


  // ❌ Delete Lead 
  router.delete("/delete/:id", async (req, res) => {
    try {
      const deleted = await Leads.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Lead not found" });
      io.emit("lead:deleted", deleted);
      res.json({ message: "🗑️ Lead deleted", data: deleted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  /* =====================================================
   🟣 LEDGERS SECTION (NEW INDEPENDENT ROUTES)
  ===================================================== */

  router.post("/ledger/add", async (req, res) => {
    try {
      const ledger = new Ledgers(req.body);
      const saved = await ledger.save();
      io.emit("ledger:added", saved);
      res.status(201).json({ message: "✅ Ledger added", data: saved });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/ledger/retrieve", async (req, res) => {
    try {
      const { q, type, fromDate, toDate, count, limit = 10, skip = 0 } = req.query;
      let filter = {};

      if (q) filter.$or = [{ ledger_name: { $regex: q, $options: "i" } }, { description: { $regex: q, $options: "i" } }];
      if (type) filter.type = type;
      if (fromDate || toDate) {
        filter.createdAt = {};
        if (fromDate) filter.createdAt.$gte = new Date(fromDate);
        if (toDate) filter.createdAt.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
      }
      if (count === "true") {
        const total = await Ledgers.countDocuments(filter);
        return res.json({ count: total });
      }

      const ledgers = await Ledgers.find(filter)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Ledgers.countDocuments(filter);
      res.json({ total, data: ledgers });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put("/ledger/update/:id", async (req, res) => {
    try {
      const updated = await Ledgers.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updated) return res.status(404).json({ message: "Ledger not found" });
      io.emit("ledger:updated", updated);
      res.json({ message: "✅ Ledger updated", data: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete("/ledger/delete/:id", async (req, res) => {
    try {
      const deleted = await Ledgers.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Ledger not found" });
      io.emit("ledger:deleted", deleted);
      res.json({ message: "🗑️ Ledger deleted", data: deleted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  /* =====================================================
   🟤 EMBEDDED LEDGERS SECTION (Inside Lead)
  ===================================================== */

  router.post("/lead/:leadId/ledger/add", async (req, res) => {
    try {
      const { leadId } = req.params;
      const lead = await Leads.findById(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      lead.ledgers.push(req.body);
      await lead.save();

      io.emit("lead:ledgerAdded", { leadId, ledger: req.body });
      res.status(201).json({ message: "✅ Ledger added inside Lead", data: lead });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/lead/leadId/ledger/retrieve", async (req, res) => {
    try {
      const { leadId } = req.params;
      const lead = await Leads.findById(leadId).select("ledger sender_mobile sender_name");
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.json({ leadId, lead_mobile: lead.sender_mobile,lead_name: lead.sender_name, transction: lead.ledger });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete("/lead/:leadId/ledger/delete/:ledgerId", async (req, res) => {
    try {
      const { leadId, ledgerId } = req.params;
      const lead = await Leads.findById(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      lead.ledgers = lead.ledgers.filter((item) => item._id.toString() !== ledgerId);
      await lead.save();

      io.emit("lead:ledgerDeleted", { leadId, ledgerId });
      res.json({ message: "🗑️ Embedded Ledger deleted", data: lead });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/url", async (req,res) => {
  try {
    
    const urls = await Urlinfo.find().sort({ createdAt: -1 });

    if (!urls || urls.length === 0) {
      return res.status(404).json({ success: false, message: "No URL info found" });
    }

    res.json({ success: true, data: urls });
  } catch (err) {
    console.error("❌ Error fetching Urlinfo:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

  return router;
};
