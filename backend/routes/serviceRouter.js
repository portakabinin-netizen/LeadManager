const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// Import your modular services
const leadService = require("../controller/leadService");
const corporateService = require("../controller/corporateService");
const ledgerService = require("../controller/ledgerService");
const userService = require("../controller/userService");

// Service mapping
const serviceMap = {
  lead: leadService,
  corporate: corporateService,
  ledger: ledgerService,
  user: userService,
};

// ✅ Apply JWT verification to all routes below
router.use(authMiddleware);

// ✅ Generic CREATE
router.post("/:type/create", async (req, res) => {
  const { type } = req.params;
  const service = serviceMap[type];

  if (!service || !service.create) {
    return res.status(400).json({ success: false, message: "Invalid service type" });
  }

  try {
    // Example: attach corporate info if user is Admin or corporate user
    const payload = { ...req.body };
    if (req.user.role !== "SuperAdmin" && req.user.corporateId) {
      payload.corporateId = req.user.corporateId;
    }

    const result = await service.create(payload);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Generic LIST
router.get("/:type/list", async (req, res) => {
  const { type } = req.params;
  const service = serviceMap[type];

  if (!service || !service.list) {
    return res.status(400).json({ success: false, message: "Invalid service type" });
  }

  try {
    const filters = {};
    if (req.user.role !== "SuperAdmin" && req.user.corporateId) {
      filters.corporateId = req.user.corporateId;
    }

    const result = await service.list(filters);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Generic GET BY ID
router.get("/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const service = serviceMap[type];

  if (!service || !service.getById) {
    return res.status(400).json({ success: false, message: "Invalid service type" });
  }

  try {
    const result = await service.getById(id);
    if (!result) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Generic UPDATE
router.put("/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const service = serviceMap[type];

  if (!service || !service.update) {
    return res.status(400).json({ success: false, message: "Invalid service type" });
  }

  try {
    const result = await service.update(id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Generic DELETE
router.delete("/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const service = serviceMap[type];

  if (!service || !service.remove) {
    return res.status(400).json({ success: false, message: "Invalid service type" });
  }

  try {
    await service.remove(id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
