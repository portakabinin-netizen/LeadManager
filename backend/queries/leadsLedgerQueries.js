const { leads } = require("../models/leads");

/**
 * ===============================================
 * 🧱 LeadsLedgers Queries
 * ===============================================
 */

/**
 * ✅ Create a new Lead
 */
exports.createLead = async (leadData) => {
  try {
    const newLead = new LeadsLedgers(leadData);
    const savedLead = await newLead.save();
    return savedLead;
  } catch (error) {
    throw new Error(`Error creating lead: ${error.message}`);
  }
};

/**
 * 📋 Get all leads (optional filters)
 */
exports.getAllLeads = async (filters = {}, projection = null, sort = { createdAt: -1 }) => {
  try {
    return await LeadsLedgers.find(filters, projection).sort(sort);
  } catch (error) {
    throw new Error(`Error fetching leads: ${error.message}`);
  }
};

/**
 * 🔍 Get a lead by ID
 */
exports.getLeadById = async (leadId) => {
  try {
    return await LeadsLedgers.findById(leadId);
  } catch (error) {
    throw new Error(`Error fetching lead: ${error.message}`);
  }
};

/**
 * ✏️ Update a lead
 */
exports.updateLead = async (leadId, updateData) => {
  try {
    const updatedLead = await LeadsLedgers.findByIdAndUpdate(leadId, updateData, {
      new: true,
      runValidators: true,
    });
    return updatedLead;
  } catch (error) {
    throw new Error(`Error updating lead: ${error.message}`);
  }
};

/**
 * 🗑️ Delete a lead
 */
exports.deleteLead = async (leadId) => {
  try {
    return await LeadsLedgers.findByIdAndDelete(leadId);
  } catch (error) {
    throw new Error(`Error deleting lead: ${error.message}`);
  }
};

/**
 * ➕ Add activity to a lead
 */
exports.addActivity = async (leadId, activityData) => {
  try {
    const lead = await LeadsLedgers.findById(leadId);
    if (!lead) throw new Error("Lead not found");

    lead.activity.push(activityData);
    await lead.save();

    return lead;
  } catch (error) {
    throw new Error(`Error adding activity: ${error.message}`);
  }
};

/**
 * 💵 Add finance transaction to a lead
 */
exports.addFinanceEntry = async (leadId, transactionData) => {
  try {
    const lead = await LeadsLedgers.findById(leadId);
    if (!lead) throw new Error("Lead not found");

    lead.finance.push(transactionData);
    await lead.save();

    return lead;
  } catch (error) {
    throw new Error(`Error adding finance entry: ${error.message}`);
  }
};
