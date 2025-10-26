// backend/routes/DataController.js
const express = require("express");
const router = express.Router();
const {ledgerModel} = require("../models/LeadSchema");


module.exports = (io) => {
  /**
   * 🔍 Live search for sender_name (dropdown)
   */
  router.get("/search", async (req, res) => {
    try {
      const q = req.query.q || "";
      const results = await LedgerModel.find(
        { sender_name: { $regex: q, $options: "i" } },
        { sender_name: 1, _id: 0 }
      ).limit(10);
      res.json(results);
    } catch (err) {
      console.error("Search error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * 📒 Fetch ledger records for a given client
   */
  router.get("/records", async (req, res) => {
    try {
      const client = req.query.client;
      if (!client) return res.status(400).json({ error: "Missing client parameter" });

      const entries = await LedgerModel.find({ sender_name: client }).sort({ createdAt: -1 });
      res.json(entries);
    } catch (err) {
      console.error("Ledger fetch error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * ✅ Save or Update (single/multiple) using bulkWrite for efficiency
   */
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

      const result = await LedgerModel.bulkWrite(bulkOps);

      // Fetch updated/inserted records to emit individually
      const affectedRecords = await LedgerModel.find({
        source_id: { $in: items.map(i => i.source_id) },
      });

      affectedRecords.forEach(record => io.emit("lead:updated", record));
      io.emit("lead:refresh");

      res.json({ message: "✅ Save completed", result: result });
    } catch (err) {
      console.error("Save Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * ✅ Generic fetch all or by status
   */
  router.get("/", async (req, res) => {
    try {
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      const records = await LedgerModel.find(filter).sort({ createdAt: -1 });
      res.json(records);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * ✅ Read by source_id
   */
  router.get("/:source_id", async (req, res) => {
    try {
      const record = await LedgerModel.findOne({ source_id: req.params.source_id });
      if (!record) return res.status(404).json({ error: "Not found" });
      res.json(record);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * ✅ Update records (single/multiple)
   */
  router.put("/update", async (req, res) => {
    try {
      const { data } = req.body;
      if (!data) return res.status(400).json({ error: "No data provided" });

      const items = Array.isArray(data) ? data : [data];

      const updatedRecords = [];

      for (const item of items) {
        const updated = await LedgerModel.findOneAndUpdate(
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
      console.error("Update Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * ✅ Delete records (single/multiple)
   */
  router.delete("/delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids) return res.status(400).json({ error: "No ids provided" });

      const idArray = Array.isArray(ids) ? ids : [ids];
      const result = await LedgerModel.deleteMany({ source_id: { $in: idArray } });

      io.emit("lead:deleted", idArray);
      io.emit("lead:refresh");

      res.json({ message: "🗑️ Deleted", deletedCount: result.deletedCount });
    } catch (err) {
      console.error("Delete Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  
  // Count lead by status

router.get('/count', async (req, res) => {
  const counts = await LeadModel.aggregate([
    { $group: { _id: "$status", total: { $sum: 1 } } }
  ]);
  const result = {};
  counts.forEach(c => result[c._id] = c.total);
  res.json(result);
});

  return router;
};
