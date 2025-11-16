const { leads } = require("../models/leads");

exports.create = async (data) => new leads(data).save();

exports.list = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.corporateId) query.corporateId = filters.corporateId;
  return leads.find(query).sort({ createdAt: -1 });
};

exports.getById = (id) => leads.findById(id);
exports.update = (id, data) => leads.findByIdAndUpdate(id, data, { new: true });
exports.remove = (id) => leads.findByIdAndDelete(id);
exports.insertMany = async (data) => {
  return await leads.insertMany(data, { ordered: false });
};
exports.getLeadsByStatus = async (status, corporateId) => {
  const query = {};

  if (status) query.status = { $regex: `^${status}$`, $options: "i" };
  if (corporateId) query.corporateId = { $regex: `^${corporateId}$`, $options: "i" };

  const result = await leads.find(query).sort({ createdAt: -1 });

  return result;
};


exports.findOne = async (filter) => {
   const lead = await leads.findOne(filter);
  return lead || null;
};
