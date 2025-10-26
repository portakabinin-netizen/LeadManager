// backend/routes/LeadController.js
const express = require('express');
const router = express.Router();
const LeadTable = require('../models/LeadSchema');
const DatabaseServices = require('../controller/LeadDB');
const LeadsTable = new DatabaseServices(LeadTable);

// Utility function to validate required lead fields

function validateLead(data) {
  const requiredFields = ['source_id', 'sender_name', 'product_name', 'generated_date', 'source', 'status'];
  const missingFields = requiredFields.filter(f => !data[f]);
  return missingFields;
}

// ----------------- Add New Lead -----------------

router.post('/', async (req, res) => {
  try {
    const missingFields = validateLead(req.body);
    if (missingFields.length) {
      return res.status(400).json({ success: false, message: `Missing required fields: ${missingFields.join(', ')}` });
    }

    // Check duplicate by source_id

    const exists = await LeadsTable.get({ source_id: req.body.source_id });
    if (exists.length) return res.status(400).json({ success: false, message: 'Duplicate lead' });

    const result = await LeadsTable.create(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------- Get All Leads -----------------

router.get('/', async (req, res) => {
  try {
    const result = await LeadsTable.get();
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------- Update Lead by ID -----------------

router.put('/:id', async (req, res) => {
  try {
    const missingFields = validateLead(req.body);
    if (missingFields.length) {
      return res.status(400).json({ success: false, message: `Missing required fields: ${missingFields.join(', ')}` });
    }

    const result = await LeadsTable.update(req.params.id, req.body);
    if (!result) return res.status(404).json({ success: false, message: 'Lead not found' });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------- Delete Lead by ID -----------------

router.delete('/:id', async (req, res) => {
  try {
    const result = await LeadsTable.delete(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Lead not found' });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------- Fetch Leads by Query -----------------

// Example: /fetch?status=Unread&source=TradeIndia

router.get('/fetch', async (req, res) => {
  try {
    const filters = { ...req.query };
    if (!Object.keys(filters).length) {
      return res.status(400).json({ success: false, message: 'Please provide query parameters' });
    }

    const results = await LeadsTable.get(filters);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------- Sync Leads from External APIs -----------------

router.get('/sync', async (req, res) => {
  try {
    const savedLeads = await LeadFetcher.syncLeads();
    res.json({ success: true, data: savedLeads });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
