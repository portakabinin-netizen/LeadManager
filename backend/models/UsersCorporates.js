const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { regex } = require("../shared/validationRules");

/* 🧱 Embedded Corporate Schema — For CorpAdmin */
const embeddedCorporateSchema = new mongoose.Schema({
  corporateName: { type: String, trim: true, match: regex.name },
  corporateEmail: { type: String, trim: true, lowercase: true, match: regex.email },
  corporateAddress: { type: String, trim: true },
  corporateCity: { type: String, trim: true },
  corporateDistrict: { type: String, trim: true },
  corporateState: { type: String, trim: true },
  corporatePin: { type: String, trim: true, match: regex.pin },
  corporatePAN: { type: String, trim: true, uppercase: true, match: regex.pan },
  corporateGST: { type: String, trim: true, uppercase: true, match: regex.gst },
  corporateActive: { type: Boolean, default: true },
}, { _id: true, timestamps: false });

/* 🧱 Access Corporate Schema — For Sales/Project */
const accessCorporateSchema = new mongoose.Schema({
  corpAdminId: { type: String, default: "" },
  corporateId: { type: String, default: "" },
  accessAllow: { type: Boolean, default: false },
}, { _id: false });

/* 🧱 Main User Schema */
const userSchema = new mongoose.Schema({
  userDisplayName: { type: String, required: true, trim: true, match: regex.name },
  userEmail: { type: String, trim: true, lowercase: true, match: regex.email },
  userMobile: { type: String, required: true, unique: true, trim: true, match: regex.mobile },
  userPassword: { type: String, required: true, minlength: 6 },
  userRole: { type: String, enum: ["CorpAdmin", "Sales", "Project"], required: true },
  userAadhar: { type: String, trim: true, match: regex.aadhar },

  /* 🎂 Date of Birth — stored as Date, formatted as dd-mm-yyyy when returned */
  userDoB: {
    type: Date,
    trim: true,
    get: (date) => {
      if (!date) return null;
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    },
  },

  linkedCorporate: {
    type: embeddedCorporateSchema,
    default: function () {
      return this.userRole === "CorpAdmin" ? {} : undefined;
    },
  },
  accessCorporate: {
    type: accessCorporateSchema,
    default: function () {
      return ["Sales", "Project"].includes(this.userRole)
        ? { corpAdminId: "", corporateId: "", accessAllow: false }
        : undefined;
    },
  },
  userActive: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { getters: true },   // 👈 enable formatted output when sending JSON
  toObject: { getters: true }, // 👈 enable formatted output when converting to Object
});

/* 🔒 Password Hash */
userSchema.pre("save", async function (next) {
  if (!this.isModified("userPassword")) return next();
  const salt = await bcrypt.genSalt(10);
  this.userPassword = await bcrypt.hash(this.userPassword, salt);
  next();
});

const Users = mongoose.models.Users || mongoose.model("Users", userSchema);
module.exports = { Users };
