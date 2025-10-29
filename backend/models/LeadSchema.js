const mongoose = require("mongoose");

//
// 🧾 Activity Schema
//
const activitySchema = new mongoose.Schema(
  {
    date: { type: Date, default: () => new Date(), required: true },
    action: { type: String, required: true, trim: true },
  },
  { _id: true }
);

//
// 💰 Ledger Schema
//
const ledgerSchema = new mongoose.Schema(
  {
    lead_id: { // Link to lead
      type: mongoose.Schema.Types.ObjectId,
      ref: "Leads",
      required: true,
      index: true,
    },
    date: { type: Date, default: Date.now, required: true },
    narration: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["Dr", "Cr"], required: true },
    account_title: { type: String, required: true, trim: true },
    account_id: { // Optional reference to Accounts
      type: mongoose.Schema.Types.ObjectId,
      ref: "Accounts",
    },
  },
  { timestamps: true }
);

//
// Embedded Ledger Schema (stores only reference to main ledger)
//
const embeddedLedgerSchema = new mongoose.Schema(
  {
    ledger_id: { // Link to main Ledger collection
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ledgers",
      required: false,
    },
    date: { type: Date, required: true },
    narration: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["Dr", "Cr"], required: true },
    account_title: { type: String, required: false },
    account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Accounts",
    },
  },
  { _id: true }
);

//
// 📋 Main Lead Schema
//
const leadSchema = new mongoose.Schema({
  lead_no: { type: Number, required: false, unique: true },
  product_name: String,
  sender_name: String,
  sender_city: String,
  sender_state: String,
  sender_mobile: String,
  sender_email: String,
  source: String,
  source_id: String,
  status: { type: String, default: "Unread" },
  generated_date: { type: Date, default: Date.now },
  activity: { type: Array, default: [] },
  ledger: { type: Array, default: [] },
});

// ✅ Auto-increment logic before saving a new lead
leadSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastLead = await mongoose.model("Lead").findOne().sort({ lead_no: -1 }).select("lead_no");
    this.lead_no = lastLead ? lastLead.lead_no + 1 : 1;
  }
  next();
});

//
// Ledger account for income,expenses,vendor, customer 
const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Customer", "Supplier", "Bank", "Expense", "Other"], default: "Customer" },
    balance: { type: Number, default: 0 },
    contact_no: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

const UrlinfoSchema = new mongoose.Schema(
  {
    // 🔹 TradeIndia / Lead API Configuration
    urlapi: { type: String, required: true, trim: true },
    urlinbox: { type: String, required: true, trim: true },
    userid: { type: String, required: true, trim: true },
    profile_id: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true },
    limit: { type: Number, default: 50, trim: true },
    page_no: { type: Number, default: 1, trim: true },

     },
  { timestamps: true } // adds createdAt and updatedAt
);

module.exports = mongoose.model("Urlinfo", UrlinfoSchema);


//
const Leads = mongoose.model("Leads", leadSchema);
const Ledgers = mongoose.model("Ledgers", ledgerSchema);
const Accounts = mongoose.model("Accounts", accountSchema);
const Urlinfo = mongoose.model("urlinfo", UrlinfoSchema);

module.exports = { Leads, Ledgers, Accounts, Urlinfo };
module.exports.default = Leads;
