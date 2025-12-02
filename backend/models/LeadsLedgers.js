const mongoose = require("mongoose");
const { regex } = require("../shared/validationRules"); 

/**
 * 📌 Activity Schema
 * Tracks actions performed on a lead
 */
const activitySchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
  },
  byUser: {
    type: String,
    required: true,
    trim: true,
  },
});

/**
 * 💰 Transaction Schema
 * Tracks financial entries for each lead
 */
const transactionSchema = new mongoose.Schema({
  voucherDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  paymentType: {
    type: String,
    enum: ["Dr", "Cr"], // Debit / Credit
    required: true,
  },
  voucherAmount: {
    value: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      get: v => parseFloat(v.toString()), // optional: converts Decimal128 to number when reading
    },
    currency: {
      type: String,
      enum: ["INR", "USD", "EUR"],
      default: "INR",
    },
  },
  voucherNarration: {
    type: String,
    trim: true,
  },
  paymentFromTo: {
    type: String,
    enum: ["Admin", "Client", "Materials", "Labour"],
    required: true,
  },
});

/**
 * 🧱 Lead Schema
 * Stores lead, contact, activity, and finance details
 */
const leadSchema = new mongoose.Schema(
  {
    lead_no: {
      type: Number,
      unique: true,
    },
    product_name: {
      type: String,
      trim: true,
    },
    sender_name: {
      type: String,
      trim: true,
    },
    sender_city: {
      type: String,
      trim: true,
    },
    sender_state: {
      type: String,
      trim: true,
    },
    sender_mobile: {
      type: String,
      trim: true,
      match: regex?.mobile || /^[0-9]{10}$/, // optional validation
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
      enum: ["Unread", "Contacted", "Closed", "Lost"], // optional
    },
    generated_date: {
      type: Date,
      default: Date.now,
    },
    activity: {
      type: [activitySchema],
      default: [],
    },
    finance: {
      type: [transactionSchema],
      default: [],
    },
  },
  { timestamps: true, toJSON: { getters: true } }
);

/**
 * 🔁 Auto-increment lead_no
 */
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

const LeadsLedgers = mongoose.model("Leads", leadSchema);

module.exports = { LeadsLedgers };
