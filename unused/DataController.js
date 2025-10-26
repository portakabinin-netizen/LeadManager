const express = require("express");
const router = express.Router();
const { Leads, Ledgers } = require("../models/LeadSchema"); 

module.exports = (io) => {

  // 🔍 Live search for sender_name
  router.get("/search", async (req, res) => {
    try {
      const q = req.query.q || "";
      const results = await Leads.find(
        { sender_name: { $regex: q, $options: "i" } },
        { sender_name: 1, _id: 0 }
      ).limit(10);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 📊 Fetch ledger records for a client
  router.get("/records", async (req, res) => {
    try {
      const client = req.query.client;
      if (!client) return res.status(400).json({ error: "Missing client parameter" });

      const entries = await Leads.find({ sender_name: client }, { ledger: 1, _id: 0 });
      res.json(entries);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 📅 Fetch leads by period
  router.get("/period", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate)
        return res.status(400).json({ error: "startDate and endDate required" });

      const leads = await Leads.find({generated_date: { $gte: new Date(startDate), $lte: new Date(endDate)},}).sort({ createdAt: -1 });
      res.json(leads);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 💾 Save or update leads
  router.post("/save", async (req, res) => {
    try {
      const { data } = req.body;
      if (!data) return res.status(400).json({ error: "No data provided" });

      const items = Array.isArray(data) ? data : [data];
      const bulkOps = items.map(item => ({
        updateOne: {
          filter: { source_id: item.source_id },
          update: { $set: item },
          upsert: true,
        },
      }));

      const result = await Leads.bulkWrite(bulkOps);

      const affectedRecords = await Leads.find({
        source_id: { $in: items.map(i => i.source_id) },
      });

      affectedRecords.forEach(record => io.emit("lead:updated", record));
      io.emit("lead:refresh");

      res.json({ message: "✅ Save completed", affectedRecords });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 📋 Fetch all leads or by status
  router.get("/", async (req, res) => {
  try {
    const filter = {}; 
    if (req.query.status) filter.status = req.query.status;

    const records = await Leads.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  // 🔎 Read lead by source_id
  router.get("/:source_id", async (req, res) => {
    try {
      const source_id = req.params.source_id;
      const record = await Leads.findOne({ source_id });
      if (!record) return res.status(404).json({ error: "Not found" });
      res.json(record);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ✏️ Update leads
  router.put("/update", async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: "No data provided" });

    const items = Array.isArray(data) ? data : [data];
    const updatedRecords = []; // ❌ Removed ": any[]"

    for (const item of items) {
      const updated = await Leads.findOneAndUpdate(
        { source_id: item.source_id },
        { $set: item },
        { new: true }
      );

      if (updated) {
        updatedRecords.push(updated);
        io.emit("lead:updated", updated);
      }
    }

    io.emit("lead:refresh");
    res.json({ message: "✅ Update successful", updated: updatedRecords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  // 🗑️ Delete leads
  router.delete("/delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids) return res.status(400).json({ error: "No ids provided" });

      const idArray = Array.isArray(ids) ? ids : [ids];
      const result = await Leads.deleteMany({ source_id: { $in: idArray } });

      io.emit("lead:deleted", idArray);
      io.emit("lead:refresh");

      res.json({ message: "🗑️ Deleted", deletedCount: result.deletedCount });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 🔢 Count leads by status
 router.get("/count", async (req, res) => {
  try {
    const counts = await Leads.aggregate([
      { $project: { status: { $ifNull: ["$status", "Unknown"] } } },
      { $group: { _id: "$status", total: { $sum: 1 } } }
    ]);

    const result = {};
    counts.forEach(c => (result[c._id] = c.total));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



  // 💹 Finance analytics

  router.get("/finance-analytics", async (req, res) => {
  try {
    const data = await getFinanceAnalytics();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New Added routers 

// POST /ledger/add
router.post("/ledger/add", async (req, res) => {
  const { leadId, ledgerData } = req.body;
  const ledgerEntry = await Ledgers.create({ lead_id: leadId, ...ledgerData });
  await Leads.findByIdAndUpdate(leadId, {
    $push: {
      ledger: {
        ledger_id: ledgerEntry._id,
        ...ledgerData,
      },
    },
  });
  res.json(ledgerEntry);
});

// GET /analytics
router.get("/analytics", async (req, res) => {
  const analytics = await Ledgers.aggregate([
    {
      $group: {
        _id: "$source",
        totalDr: { $sum: { $cond: [{ $eq: ["$type", "Dr"] }, "$amount", 0] } },
        totalCr: { $sum: { $cond: [{ $eq: ["$type", "Cr"] }, "$amount", 0] } },
      },
    },
    {
      $project: {
        source: "$_id",
        totalDr: 1,
        totalCr: 1,
        balance: { $subtract: ["$totalDr", "$totalCr"] },
        _id: 0,
      },
    },
  ]);
  res.json(analytics);
});


  return router;
};
