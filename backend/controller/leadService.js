const Lead = require("../models/AllCollectionSchema");

/**
 * Create a new Lead
 */
exports.create = async (data) => {
  const lead = new Lead(data);
  return await lead.save();
};

/**
 * List all Leads (supports optional filters)
 */
exports.list = async (filters = {}) => {
  return await Lead.find(filters).sort({ createdAt: -1 });
};

/**
 * Get a single Lead by ID
 */
exports.getById = async (id) => {
  return await Lead.findById(id);
};

/**
 * Update a Lead by ID
 */
exports.update = async (id, data) => {
  return await Lead.findByIdAndUpdate(id, data, { new: true });
};

/**
 * Delete a Lead by ID
 */
exports.remove = async (id) => {
  return await Lead.findByIdAndDelete(id);
};
