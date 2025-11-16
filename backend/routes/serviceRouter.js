const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// Import modular services
const leadService = require("../controller/leadService");
const corporateService = require("../controller/corporateService");
const ledgerService = require("../controller/ledgerService");
const userService = require("../controller/userService");

// Service Mapping
const serviceMap = {
  leads: leadService,
  corporate: corporateService,
  ledger: ledgerService,
  user: userService,
};


// ----------------------------------------------------
// 🔐 Apply JWT authentication to ALL routes below
// ----------------------------------------------------
router.use(authMiddleware);

/**
 * CREATE (POST)
 */
router.post("/:type/create", async (req, res) => {
  const { type } = req.params;
  const service = serviceMap[type];

  if (!service || !service.create) {
    return res.status(400).json({
      success: false,
      message: "Invalid service type",
    });
  }

  try {
    const payload = { ...req.body };

    // Attach corporateId for non-admin users
    if (req.user.role !== "Admin" && req.user.corporateId) {
      payload.corporateId = req.user.corporateId;
    }

    const result = await service.create(payload);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error creating record:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * LIST (GET)
 */
router.get("/:type/list", async (req, res) => {
  const { type } = req.params;
  const service = serviceMap[type];

  if (!service || !service.list) {
    return res.status(400).json({
      success: false,
      message: "Invalid service type",
    });
  }

  try {
    const filters = {};
    if (req.user.role !== "Admin" && req.user.corporateId) {
      filters.corporateId = req.user.corporateId;
    }

    const result = await service.list(filters);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error listing records:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET BY ID
 */
router.get("/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const service = serviceMap[type];

  if (!service || !service.getById) {
    return res.status(400).json({
      success: false,
      message: "Invalid service type",
    });
  }

  try {
    const result = await service.getById(id);
    if (!result)
      return res.status(404).json({
        success: false,
        message: "Not found",
      });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error fetching record:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * UPDATE
 */
router.put("/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const service = serviceMap[type];

  if (!service || !service.update) {
    return res.status(400).json({
      success: false,
      message: "Invalid service type",
    });
  }

  try {
    const result = await service.update(id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error updating record:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE
 */
router.delete("/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const service = serviceMap[type];

  if (!service || !service.remove) {
    return res.status(400).json({
      success: false,
      message: "Invalid service type",
    });
  }

  try {
    await service.remove(id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting record:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * LEADS BY STATUS
 */
router.get("/leads/status/:status", async (req, res, next) => {
  try {
    const { status } = req.params;
    const { corporateId } = req.query;

    const leads = await leadService.getLeadsByStatus(status, corporateId);
    res.json({ success: true, data: leads });
  } catch (err) {
    console.error("Error in /leads/status route:", err);
    next(err);
  }
});

router.post("/addmany", async (req, res) => {
  try {
    const leadsData = req.body;

    if (!Array.isArray(leadsData) || leadsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No leads provided",
      });
    }

    // Auto-assign corporateId for non-admin users
    let finalPayload = leadsData.map((lead) => ({
      ...lead,
      corporateId:
        req.user.role === "Admin"
          ? lead.corporateId || null
          : req.user.corporateId,
    }));

    // Insert using LeadService
    const result = await leadService.insertMany(finalPayload);

    res.json({
      success: true,
      message: `${result.length} leads inserted successfully.`,
    });
  } catch (err) {
    // Duplicate key errors
    if (err.writeErrors) {
      const inserted = err.result?.result?.nInserted || 0;
      return res.json({
        success: true,
        message: `⚠️ Some duplicates skipped. Inserted ${inserted} leads.`,
      });
    }

    console.error("Lead insertMany error:", err);
    res.status(500).json({
      success: false,
      message: "Error inserting multiple leads",
    });
  }
});

module.exports = router;
