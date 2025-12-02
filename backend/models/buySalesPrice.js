const mongoose = require("mongoose");
const { regex } = require("../shared/validationRules"); 

// -----------------------------------------------------------------------------
// 1. Vendor Schema
// -----------------------------------------------------------------------------
const vendorSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    mobileNo: { type: String, required: true }
  },
  { timestamps: true }
);


// -----------------------------------------------------------------------------
// 2. Product Category Schema
// -----------------------------------------------------------------------------
const categorySchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, unique: true, trim: true }
  },
  { timestamps: true }
);


// -----------------------------------------------------------------------------
// 3. Product Schema
// -----------------------------------------------------------------------------
const productSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categories",
      required: true
    },

    productName: { type: String, required: true, trim: true },

    // Description SHOULD NOT be globally unique
    description: { type: String, required: true, trim: true },

    uom: {
      type: String,
      enum: ["SQM", "SQF", "KG", "RFT", "PCS", "BOX", "BOTTLE"],
      required: true
    },

    margin: { type: Number, default: 10 }
  },
  { timestamps: true }
);


// -----------------------------------------------------------------------------
// 4. Price List Schema (Vendor ↔ Product Pricing)
// -----------------------------------------------------------------------------
const priceListSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendors",
      required: true
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
      required: true
    },

    purchasePrice: { type: Number, required: true },

    salesPriceSQM: Number,
    salesPriceSQF: Number
  },
  { timestamps: true }
);

// Prevent duplication vendor + product
priceListSchema.index({ vendorId: 1, productId: 1 }, { unique: true });


// -----------------------------------------------------------------------------
// Auto-calc sales prices BEFORE SAVE
// -----------------------------------------------------------------------------
priceListSchema.pre("save", async function (next) {
  try {
    const product = await mongoose
      .model("Products")
      .findById(this.productId)
      .lean();

    if (!product) return next();

    const margin = product.margin ?? 10;

    // Sales Price SQM = Purchase + Margin%
    const salesSQM = this.purchasePrice + (this.purchasePrice * margin) / 100;

    this.salesPriceSQM = Number(salesSQM.toFixed(2));

    // Convert SQM → SQF
    this.salesPriceSQF = Number((salesSQM * 10.7639).toFixed(2));

    next();
  } catch (err) {
    next(err);
  }
});


// -----------------------------------------------------------------------------
// EXPORT MODELS (Safe recompile for hot reload environments)
// -----------------------------------------------------------------------------
const Vendors =
  mongoose.models.Vendors || mongoose.model("Vendors", vendorSchema);

const Categories =
  mongoose.models.Categories || mongoose.model("Categories", categorySchema);

const Products =
  mongoose.models.Products || mongoose.model("Products", productSchema);

const PriceList =
  mongoose.models.PriceList || mongoose.model("PriceList", priceListSchema);


module.exports = { Vendors, Categories, Products, PriceList };
