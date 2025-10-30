const mongoose = require("mongoose");

//
// 🧩 Access Subschema (for role-based permissions)
//
const accessSchema = new mongoose.Schema(
  {
    menuId: { type: String, required: true, trim: true }, // e.g., from MenuItems.json
    menuName: { type: String, required: true, trim: true },
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

//
// 👤 User Schema
//
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: ["Admin", "Sale", "Operation"], // Custom roles for your app
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      match: /^[6-9]\d{9}$/,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },

    // 🌐 Role-Based Access Controls
    defaultMenu: { type: [accessSchema], default: [] }, // Default role permissions
    companyMenu: { type: [accessSchema], default: [] }, // Company-specific permissions

    // 🧭 Tracking Info
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

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
    lead_id: {
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
    account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Accounts",
    },
  },
  { timestamps: true }
);

//
// 🧾 Embedded Ledger Schema (reference to main ledger)
//
const embeddedLedgerSchema = new mongoose.Schema(
  {
    ledger_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ledgers",
    },
    date: { type: Date, required: true },
    narration: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["Dr", "Cr"], required: true },
    account_title: { type: String },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: "Accounts" },
  },
  { _id: true }
);

//
// 📋 Lead Schema
//
const leadSchema = new mongoose.Schema(
  {
    lead_no: { type: Number, unique: true },
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
    activity: { type: [activitySchema], default: [] },
    ledger: { type: [embeddedLedgerSchema], default: [] },
  },
  { timestamps: true }
);

// 🔁 Auto-increment lead_no
leadSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastLead = await mongoose
      .model("Leads")
      .findOne()
      .sort({ lead_no: -1 })
      .select("lead_no");
    this.lead_no = lastLead ? lastLead.lead_no + 1 : 1;
  }
  next();
});

//
// 🏦 Account Schema (for income, expenses, vendors, customers)
//
const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Customer", "Supplier", "Bank", "Expense", "Other"],
      default: "Customer",
    },
    balance: { type: Number, default: 0 },
    contact_no: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

//
// 🧱 Model Exports
//
const Users = mongoose.model("Users", userSchema);
const Leads = mongoose.model("Leads", leadSchema);
const Ledgers = mongoose.model("Ledgers", ledgerSchema);
const Accounts = mongoose.model("Accounts", accountSchema);

module.exports = { Users, Leads, Ledgers, Accounts };
