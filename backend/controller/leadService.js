const { Users, Corporates } = require("../models/UsersCorporates");

/**
 * ✅ Create a new lead
 */
exports.create = async (data) => {
  const lead = new Leads(data);
  return await lead.save();
};

/**
 * ✅ List all leads (supports filters such as status or corporateId)
 */
exports.list = async (filters = {}) => {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.corporateId) query.corporateId = filters.corporateId;

  return await Leads.find(query).sort({ createdAt: -1 });
};

/**
 * ✅ Get a single lead by ID
 */
exports.getById = async (id) => {
  return await Leads.findById(id);
};

/**
 * ✅ Update an existing lead
 */
exports.update = async (id, data) => {
  return await Leads.findByIdAndUpdate(id, data, { new: true });
};

/**
 * ✅ Delete a lead
 */
exports.remove = async (id) => {
  return await Leads.findByIdAndDelete(id);
};

/* --------------------------------------------------
   📘 Additional Business Logic Functions
-------------------------------------------------- */

/**
 * ✅ Get leads filtered by status
 */
exports.getLeadsByStatus = async (status, corporateId) => {
  try {
    const query = {};
    if (status) query.status = { $regex: `^${status.trim()}$`, $options: "i" };
    if (corporateId) query.corporateId = { $regex: `^${corporateId.trim()}$`, $options: "i" };

    console.log("🟩 Query Used for getLeadsByStatus:", query);

    const leads = await Leads.find(query).sort({ createdAt: -1 });
    console.log("🟦 Leads Found:", leads.length);
    if (leads.length) console.log("🟧 Example Lead:", leads[0]);
    return leads;
  } catch (error) {
    console.error("❌ Error in getLeadsByStatus:", error);
    throw error;
  }
};



/**
 * ✅ Update lead status and optionally add a comment
 */
exports.updateLeadStatus = async (id, status, comment) => {
  const updateData = { status };

  if (comment && comment.trim()) {
    updateData.$push = {
      comments: { text: comment, date: new Date() },
    };
  }

  return await Leads.findByIdAndUpdate(id, updateData, { new: true });
};

/**
 * ✅ Add a ledger entry (finance-related)
 */
exports.addLedgerEntry = async (id, ledgerEntry) => {
  return await Leads.findByIdAndUpdate(
    id,
    { $push: { ledgerEntries: ledgerEntry } },
    { new: true }
  );
};

/**
 * ✅ Add embedded ledger entry (if schema supports embeddedLedgers)
 */
exports.addEmbeddedLedger = async (id, ledgerEntry) => {
  return await Leads.findByIdAndUpdate(
    id,
    { $push: { embeddedLedgers: ledgerEntry } },
    { new: true }
  );
};
