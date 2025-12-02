const express = require("express");
const router = express.Router();
const Purchase = require("../models/purchase");

// Helper – Ensure a Purchase document exists
async function getPurchaseDoc() {
  let doc = await Purchase.findOne();
  if (!doc) doc = await Purchase.create({});
  return doc;
}

/* ==============================
   VENDORS
============================== */

// Add Vendor
router.post("/vendor/add", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    purchase.vendors.push(req.body);
    await purchase.save();
    res.status(201).json(purchase.vendors.at(-1));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all Vendors
router.get("/vendor", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    res.json(purchase.vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Vendor
router.put("/vendor/:id", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    const vendor = purchase.vendors.id(req.params.id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    Object.assign(vendor, req.body);
    await purchase.save();
    res.json(vendor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Vendor
router.delete("/vendor/:id", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    purchase.vendors.id(req.params.id)?.deleteOne();
    await purchase.save();
    res.json({ message: "Vendor removed" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ==============================
   CATEGORIES
============================== */

// Add Category
router.post("/category/add", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    purchase.categories.push(req.body);
    await purchase.save();
    res.status(201).json(purchase.categories.at(-1));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all Categories
router.get("/category", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    res.json(purchase.categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Category
router.put("/category/:id", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    const category = purchase.categories.id(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });

    category.categoryName = req.body.categoryName || category.categoryName;
    await purchase.save();
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Category
router.delete("/category/:id", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    purchase.categories.id(req.params.id)?.deleteOne();
    await purchase.save();
    res.json({ message: "Category removed" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ==============================
   PRODUCTS (inside categories)
============================== */

// Add Product
router.post("/product/add", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    const category = purchase.categories.id(req.body.categoryId);
    if (!category) return res.status(404).json({ error: "Category not found" });

    category.products.push(req.body);
    await purchase.save();
    res.status(201).json(category.products.at(-1));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Product
router.put("/:categoryId/:productId", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    const category = purchase.categories.id(req.params.categoryId);
    if (!category) return res.status(404).json({ error: "Category not found" });

    const product = category.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    Object.assign(product, req.body);
    await purchase.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Product
router.delete("/:categoryId/:productId", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    const category = purchase.categories.id(req.params.categoryId);
    category.products.id(req.params.productId)?.deleteOne();
    await purchase.save();
    res.json({ message: "Product removed" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ==============================
   PRICE TAGS (vendor rates)
============================== */

// Save multiple rates
router.post("/pricetags/save", async (req, res) => {
  try {
    const { vendorId, categoryId, items } = req.body;
    if (!vendorId || !categoryId || !items?.length) return res.status(400).json({ error: "Invalid payload" });

    const purchase = await getPurchaseDoc();

    items.forEach((i) => {
      const exists = purchase.priceTags.find(
        (t) =>
          t.vendorId.toString() === vendorId &&
          t.categoryId.toString() === categoryId &&
          t.productId.toString() === i.productId
      );

      if (exists) {
        exists.buyRate = i.buyRate;
        exists.saleRate = i.saleRate;
        exists.UoM = i.UoM || "SQF";
      } else {
        purchase.priceTags.push({
          vendorId,
          categoryId,
          productId: i.productId,
          buyRate: i.buyRate,
          saleRate: i.saleRate,
          UoM: i.UoM || "SQF",
        });
      }
    });

    await purchase.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update single rate
router.put("/vendor/rates/:rateId", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    const rate = purchase.priceTags.id(req.params.rateId);
    if (!rate) return res.status(404).json({ error: "Rate not found" });

    Object.assign(rate, req.body);
    await purchase.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete single rate
router.delete("/vendor/rates/:rateId", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    purchase.priceTags = purchase.priceTags.filter((t) => t._id.toString() !== req.params.rateId);
    await purchase.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==============================
   VENDOR DETAILS (categories + products + rates)
============================== */

router.get("/vendor/:vendorId/details", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const purchase = await Purchase.findOne().lean();
    if (!purchase) return res.status(404).json({ error: "Data not found" });

    const vendor = purchase.vendors.find((v) => v._id.toString() === vendorId);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorPriceTags = purchase.priceTags.filter((t) => t.vendorId.toString() === vendorId);
    const categoryMap = {};

    vendorPriceTags.forEach((tag) => {
      if (!categoryMap[tag.categoryId]) {
        const cat = purchase.categories.find((c) => c._id.toString() === tag.categoryId);
        categoryMap[tag.categoryId] = {
          categoryId: tag.categoryId,
          categoryName: cat?.categoryName || "",
          products: [],
        };
      }

      const category = purchase.categories.find((c) => c._id.toString() === tag.categoryId);
      const product = category?.products.find((p) => p._id.toString() === tag.productId);

      categoryMap[tag.categoryId].products.push({
        productId: tag.productId,
        productName: product?.productName || "",
        description: product?.description || "",
        buyRate: tag.buyRate,
        saleRate: tag.saleRate,
        UoM: tag.UoM,
        rateId: tag._id,
      });
    });

    res.json({
      vendorId: vendor._id,
      vendorName: vendor.vendorName,
      categories: Object.values(categoryMap),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==============================
   PRICE TAGS SUMMARY
============================== */

router.get("/pricetags/summary", async (req, res) => {
  try {
    const purchase = await Purchase.findOne().lean();
    if (!purchase) return res.json([]);

    const { vendors, categories, priceTags } = purchase;

    const result = vendors.map((vendor) => {
      const vendorTags = priceTags.filter((t) => t.vendorId.toString() === vendor._id.toString());
      const categoryMap = {};
      vendorTags.forEach((t) => {
        if (!categoryMap[t.categoryId]) {
          const cat = categories.find((c) => c._id.toString() === t.categoryId.toString());
          categoryMap[t.categoryId] = { categoryId: t.categoryId, categoryName: cat?.categoryName || "", productCount: 0 };
        }
        categoryMap[t.categoryId].productCount++;
      });

      return {
        vendorId: vendor._id,
        vendorName: vendor.vendorName,
        totalCategories: Object.keys(categoryMap).length,
        totalProducts: vendorTags.length,
        categories: Object.values(categoryMap),
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
