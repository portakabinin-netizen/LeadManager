const mongoose = require("mongoose");
const { Schema } = mongoose;

// ------------------------
// Vendor Subschema
// ------------------------

const VendorSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  vendorName: { type: String, required: true },
  mobileNo: { type: String, required: true },
  vendorAddress: { type: String, required: false },
  vendorGST: { type: String, required: false },
  contactPerson: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// ------------------------
// Product Subschema
// ------------------------
const ProductSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  productName: { type: String, required: true },
  description: { type: String, required: true },
  specification: { type: String, required: false },
  UoM: { type: String, default: "SQF" },
  margin: { type: Number, default: 10 },
  createdAt: { type: Date, default: Date.now }
});

// ------------------------
// Category Subschema
// ------------------------
const CategorySchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  categoryName: { type: String, required: true },
  products: [ProductSchema],
  createdAt: { type: Date, default: Date.now }
});

// ------------------------
// PriceTag Subschema
// ------------------------
const PriceProductSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, required: true },   // link to product._id
  buyRate: { type: Number, required: true },
  saleRate: { type: Number, required: true },
  UoM: { type: String, required: false }
});

const PriceCategorySchema = new Schema({
  categoryId: { type: Schema.Types.ObjectId, required: true },  // link to category._id
  products: [PriceProductSchema]                                // list of products under category
});

const PriceTagSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },

  vendorId: { type: Schema.Types.ObjectId, required: true },     // link to vendor._id

  categories: [PriceCategorySchema],                             // ← multiple categories under vendor

  createdAt: { type: Date, default: Date.now }
});

// ------------------------
// Main Purchase Schema
// ------------------------
const PurchaseSchema = new Schema({
  vendors: [VendorSchema],
  categories: [CategorySchema],
  priceTags: [PriceTagSchema],   // updated nested structure
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Purchase", PurchaseSchema);
