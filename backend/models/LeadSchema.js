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
const leadSchema = new mongoose.Schema(
  {
    source_id: { type: String, required: true, unique: true, index: true },
    lead_no: { type: Number, required: true },
    sender_name: { type: String, default: "Unknown" },
    sender_mobile: { type: String, default: "", index: true },
    sender_email: { type: String, default: "", index: true },
    sender_city: { type: String, default: "Unknown" },
    sender_state: { type: String, default: "Unknown" },
    product_name: { type: String, default: "No Product" },
    generated_date: { type: String, default: "Non" },
    source: {
      type: String,
      enum: ["IndiaMart", "TradeIndia", "Other"],
      default: "Other",
      index: true,
    },
    status: {
      type: String,
      enum: ["Unread", "Recent", "Engaged", "Accepted", "Recycle"],
      default: "Unread",
      index: true,
    },
    activity: { type: [activitySchema], default: [] },
    ledger: { type: [embeddedLedgerSchema], default: [] }, // embedded ledger
  },
  { timestamps: true, strict: true }
);

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
    urlapi: { type: String, required: true , trim:true },
    urlinbox: { type: String, required: true , trim:true },
    userid: { type: String, required: true , trim:true },
    profile_id: { type: String, required: true , trim:true },
    key: { type: String, required: true , trim:true },
    limit: { type: Number, default: 50 , trim:true },
    page_no: { type: Number, default: 1 , trim:true },
  },
  { timestamps: true } // adds createdAt and updatedAt
);

//
const Leads = mongoose.model("Leads", leadSchema);
const Ledgers = mongoose.model("Ledgers", ledgerSchema);
const Accounts = mongoose.model("Accounts", accountSchema);
const Urlinfo = mongoose.model("urlinfo", UrlinfoSchema);

module.exports = { Leads, Ledgers, Accounts, Urlinfo };
module.exports.default = Leads;
