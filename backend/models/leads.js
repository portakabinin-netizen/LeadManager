const mongoose = require("mongoose");
const { regex } = require("../shared/validationRules");

/* =====================================================
   📄 ACTIVITY SCHEMA
===================================================== */
const activitySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, required: true },
  action: { type: String, required: true, trim: true },
  byUser: { type: String, required: true, trim: true },
});

/* =====================================================
   🧾 CLIENT BILLING INFO SCHEMA
===================================================== */
const clientBillInfoSchema = new mongoose.Schema({
  billTo: { type: String, default: " ", trim: true },
  contactPerson: { type: String, default: " ", trim: true },
  b2bGSTR: {
    type: String,
    default: " ",
    trim: true,
    match: regex?.gst || /.*/,
  },
  billAddress: { type: String, default: "", trim: true },
  billCity: { type: String, default: "", trim: true },
  billState: { type: String, default: "", trim: true },
  billPIN: { type: String, default: "", trim: true, match: regex?.pin || /.*/ },
  shipAddress: { type: String, default: "", trim: true },
  shipCity: { type: String, default: "", trim: true },
  shipState: { type: String, default: "", trim: true },
  shipPIN: { type: String, default: "", trim: true, match: regex?.pin || /.*/ },
});

/* =====================================================
   💰 TRANSACTION SCHEMA
===================================================== */
const transactionSchema = new mongoose.Schema({
  voucherDate: { type: Date, default: Date.now, required: true },
  paymentType: { type: String, enum: ["Dr", "Cr"], required: true },
  voucherAmount: {
    value: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    currency: { type: String, enum: ["INR", "USD", "EUR"], default: "INR" },
  },
  voucherNarration: { type: String, trim: true },
  paymentFromTo: {
    type: String,
    enum: ["Admin", "Client", "Materials", "Labour", "Freight & Cartage"],
    required: true,
  },
});

/* =====================================================
   🧱 LEAD SCHEMA
===================================================== */
const leadsSchema = new mongoose.Schema(
  {
    lead_no: { type: Number, unique: true },
    product_name: { type: String, trim: true },
    sender_name: { type: String, trim: true },
    sender_city: { type: String, trim: true },
    sender_state: { type: String, trim: true },
    sender_mobile: {
      type: String,
      trim: true,
      match: regex?.mobile || /^[0-9]{10}$/,
    },
    sender_email: {
      type: String,
      trim: true,
      lowercase: true,
      match: regex?.email || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
    },
    source: String,
    source_id: String,
    adminLink: String,
    corpLink: String,
    status: {
      type: String,
      default: "Unread",
      enum: ["Unread", "Recent", "Engaged", "Accepted", "Restore", "Recycle"],
    },
    link2Corporate: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length >= 1 && arr.length <= 2,
        message: "link2Corporate must have 1 or 2 elements.",
      },
    },
    generated_date: { type: Date, default: Date.now },
    activity: { type: [activitySchema], default: [] },
    finance: { type: [transactionSchema], default: [] },
    billInfo: { type: [clientBillInfoSchema], default: [] },
  },
  { timestamps: true, toJSON: { getters: true } }
);

/* =====================================================
   🔁 AUTO-INCREMENT LEAD NUMBER
===================================================== */
leadsSchema.pre("save", async function (next) {
  if (this.isNew) {
    const last = await mongoose.model("leads").findOne().sort({ lead_no: -1 }).select("lead_no");
    this.lead_no = last ? last.lead_no + 1 : 1;
  }
  next();
});

/* =====================================================
   📦 EXPORT MODEL (✅ FIXED EXPORT)
===================================================== */
const leads = mongoose.models.leads || mongoose.model("leads", leadsSchema);
module.exports = { leads };
