const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

//
// 🧩 Access Subschema (Menu Permissions)
//
const accessSchema = new mongoose.Schema(
  {
    menuId: { type: String, required: true, trim: true },
    menuName: { type: String, required: true, trim: true },
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

//
// 🏢 Corporate Schema (Embedded inside Admin user)
//
const corporateSchema = new mongoose.Schema(
  {
    corporateId: { type: String, trim: true, unique: true, sparse: true },

    // 🏛️ Basic Details
    companyName: { type: String, required: true, trim: true },
    companyType: {
      type: String,
      required: true,
      enum: ["Sole Proprietor", "Partnership", "Private Limited", "LLP", "Other"],
      trim: true,
    },

    // 🧾 Legal Identifiers
    companyPan: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    },
    companyGst: {
      type: String,
      trim: true,
      default: "",
    },

    // 📍 Address Info
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: {
      type: String,
      required: true,
      match: /^[1-9][0-9]{5}$/,
      trim: true,
    },

    // 🖼️ Logo or Profile Image
    profileImage: { type: String, default: "" },

    // 👥 Linked Users (for Admin-created corporate)
    linkedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
      },
    ],
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
      enum: ["Admin", "Sale", "Operation"],
      trim: true,
    },

    email: { type: String, trim: true, default: "" },

    mobile: {
      type: String,
      required: true,
      unique: true,
      match: /^[6-9]\d{9}$/,
      trim: true,
    },

    password: { type: String, required: true, minlength: 6 },

    // 🧾 Personal Identifiers
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      default: "",
    },

    // 🏢 Corporate Info (only for Admin)
    corporateInfo: {
      type: corporateSchema,
      required: function () {
        return this.role === "Admin";
      },
    },

    // 🔗 Corporate linkage (all users must have this)
    corporateId: {
      type: String,
      required: function () {
        return this.role !== "Admin";
      },
      trim: true,
      index: true,
    },

    // 🌐 Role-based Access
    defaultMenu: { type: [accessSchema], default: [] },
    companyMenu: { type: [accessSchema], default: [] },

    // 🧭 Tracking
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },

    // ⚙️ Status
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

//
// 🧾 Auto-generate Corporate ID for Admins
//
userSchema.pre("save", async function (next) {
  try {
    // Only for Admin creation
    if (this.isNew && this.role === "Admin") {
      if (!this.corporateInfo || !this.corporateInfo.companyName) {
        throw new Error("Corporate information is required for Admin user.");
      }

      const currentYear = new Date().getFullYear();
      const prefix = this.corporateInfo.companyName
        .replace(/[^A-Za-z0-9]/g, "")
        .substring(0, 4)
        .toUpperCase();

      const countForYear = await mongoose.model("Users").countDocuments({
        role: "Admin",
        "corporateInfo.corporateId": { $regex: `-${currentYear}-` },
      });

      const serial = String(countForYear + 1).padStart(4, "0");
      const corporateId = `${prefix}-${currentYear}-${serial}`;

      this.corporateInfo.corporateId = corporateId;
      this.corporateId = corporateId; // Admin owns this corporate
    }

    // For Sale/Operation users — must have corporateId
    if (this.role !== "Admin" && !this.corporateId) {
      throw new Error("Corporate ID is required for non-admin users.");
    }

    next();
  } catch (err) {
    next(err);
  }
});

// --- 🔐 Hash Password ---
userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

//
// 🧾 Activity Schema
//
const activitySchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now, required: true },
    byUser: { type: String, required: true, trim: true },
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
    byUser: { type: String, required: true, trim: true },
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
  },
  { timestamps: true }
);

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
// 🏦 Account Schema
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
