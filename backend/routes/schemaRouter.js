const express = require("express");
const router = express.Router();
const Purchase = require("../models/purchase");

// Helper – Ensure a Purchase document exists
async function getPurchaseDoc() {
  let doc = await Purchase.findOne();
  if (!doc) {
    doc = await Purchase.create({});
  }
  return doc;
}

/* ============================================================
   1. VENDOR ROUTES  
   vendors[]
============================================================ */

// ADD Vendor
router.post("/vendor/add", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    purchase.vendors.push(req.body);
    await purchase.save();
    res.status(201).json(purchase.vendors.at(-1)); // return last added
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET All Vendors
router.get("/vendor", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    res.json(purchase.vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Vendor by ID
router.get("/vendor/:id", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    const vendor = purchase.vendors.id(req.params.id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json(vendor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE Vendor
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

// DELETE Vendor
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


/* ============================================================
   2. CATEGORY ROUTES  
   categories[]
============================================================ */

// ADD Category
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

// UPDATE Category
router.put("/category/:id", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();

    // Find category by ID inside categories array
    const category = purchase.categories.id(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (!req.body.categoryName || req.body.categoryName.trim() === "") {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Update field
    category.categoryName = req.body.categoryName;

    await purchase.save();

    res.json({
      message: "Category updated successfully",
      category,
    });

  } catch (err) {
    console.error("UPDATE CATEGORY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});



// GET Categories
router.get("/category", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    res.json(purchase.categories);
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE Category
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


/* ============================================================
   3. PRODUCT ROUTES  
   Inside categories[].products[]
============================================================ */

// ADD Product inside Category
router.post("/add", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    const category = purchase.categories.id(req.body.categoryId);

    if (!category)
      return res.status(404).json({ error: "Category not found" });

    category.products.push(req.body);
    await purchase.save();

    res.status(201).json(category.products.at(-1));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// GET Products by Category
router.get("/category/:categoryId", async (req, res) => {
  try {
    const purchase = await getPurchaseDoc();
    const category = purchase.categories.id(req.params.categoryId);
    if (!category) return res.status(404).json({ error: "Category not found" });

    res.json(category.products);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE Product
router.put("/:categoryId/:productId", async (req, res) => {
  
  try {
    const { categoryId, productId } = req.params;

    const purchase = await getPurchaseDoc();

    // 🔍 Find the category manually
    const category = purchase.categories.find(
      (c) => c._id.toString() === categoryId
    );

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // 🔍 Find the product manually
    const product = category.products.find(
      (p) => p._id.toString() === productId
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // 🔧 Update fields
    Object.assign(product, req.body);

    await purchase.save();

    return res.json({ message: "Product updated", product });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

});


// DELETE Product
router.delete("/product/:categoryId/:productId", async (req, res) => {
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


/* ============================================================
   4. PRICE TAG ROUTES  
   priceTags[]   => vendorId + categoryId + productId
============================================================ */


/* -----------------------------
   1) Get vendor summary from priceTags
------------------------------ */
router.get("/vendors/list", async (req, res) => {
  try {
    const purchase = await Purchase.findOne().lean();
    if (!purchase) return res.json([]);

    const { vendors, categories, priceTags } = purchase;

    const result = vendors.map((vendor) => {
      const vendorTags = priceTags.filter(
        (t) => t.vendorId.toString() === vendor._id.toString()
      );

      // Unique categories with count
      const categoryMap = {};
      vendorTags.forEach((x) => {
        if (!categoryMap[x.categoryId]) {
          const cat = categories.find((c) => c._id.toString() === x.categoryId.toString());
          categoryMap[x.categoryId] = {
            categoryId: x.categoryId,
            categoryName: cat?.categoryName || "",
            productCount: 0,
          };
        }
        categoryMap[x.categoryId].productCount++;
      });

      return {
        vendorId: vendor._id,
        vendorName: vendor.vendorName,
        vendorMobile: vendor.mobileNo,
        totalCategories: Object.keys(categoryMap).length,
        totalProducts: vendorTags.length,
        categories: Object.values(categoryMap),
      };
    });

    res.json(result);
  } catch (err) {
    console.log("Error:", err);
    res.status(500).json({ error: "Failed to load vendors" });
  }
});

/* -----------------------------
   2) Fetch single vendor details (categories + products) from priceTags
------------------------------ */
router.get("/vendor/:vendorId/details", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const purchase = await Purchase.findOne().lean();
    if (!purchase) return res.status(404).json({ error: "Data not found" });

    const vendor = purchase.vendors.find((v) => v._id.toString() === vendorId);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const priceTags = purchase.priceTags.filter((t) => t.vendorId.toString() === vendorId);
    const categoryMap = {};

    priceTags.forEach((tag) => {
      if (!categoryMap[tag.categoryId]) {
        const cat = purchase.categories.find((c) => c._id.toString() === tag.categoryId);
        categoryMap[tag.categoryId] = {
          categoryId: tag.categoryId,
          categoryName: cat?.categoryName || "",
          productCount: 0,
          products: [],
        };
      }

      const category = purchase.categories.find((c) => c._id.toString() === tag.categoryId);
      const product = category?.products.find((p) => p._id.toString() === tag.productId);

      categoryMap[tag.categoryId].productCount++;
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
      vendorName: vendor.vendorName,
      vendorId: vendor._id,
      totalCategories: Object.keys(categoryMap).length,
      totalProducts: priceTags.length,
      categories: Object.values(categoryMap),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to load vendor details" });
  }
});

/* -----------------------------
   3) Add multiple rates (grid save)
   Payload: { vendorId, categoryId, items: [{ productId, buyRate, saleRate, UoM }] }
------------------------------ */
router.post("/product/pricetags/save", async (req, res) => {
  try {
    const { vendorId, categoryId, items } = req.body;
    if (!vendorId || !categoryId || !items?.length) return res.status(400).json({ error: "Invalid payload" });

    let purchase = await Purchase.findOne();
    if (!purchase) purchase = new Purchase();

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
    res.json({ success: true, message: "Rates saved successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to save rates" });
  }
});

/* -----------------------------
   4) Update single rate
------------------------------ */
router.put("/vendor/rates/:rateId", async (req, res) => {
  try {
    const { rateId } = req.params;
    const { buyRate, saleRate, UoM } = req.body;

    const purchase = await Purchase.findOne();
    if (!purchase) return res.status(404).json({ error: "Data not found" });

    const rate = purchase.priceTags.id(rateId);
    if (!rate) return res.status(404).json({ error: "Rate not found" });

    rate.buyRate = buyRate;
    rate.saleRate = saleRate;
    rate.UoM = UoM;

    await purchase.save();
    res.json({ success: true, message: "Rate updated successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to update rate" });
  }
});

/* -----------------------------
   5) Delete single rate
------------------------------ */
router.delete("/vendor/rates/:rateId", async (req, res) => {
  try {
    const { rateId } = req.params;
    const purchase = await Purchase.findOne();
    if (!purchase) return res.status(404).json({ error: "Data not found" });

    purchase.priceTags = purchase.priceTags.filter((t) => t._id.toString() !== rateId);
    await purchase.save();
    res.json({ success: true, message: "Rate deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to delete rate" });
  }
});

/* ===========================================================
   6) PRODUCT / PRICE TAG SUMMARY
   Returns all vendors + categories + product counts from priceTags
=========================================================== */
router.get("/pricetags/summary", async (req, res) => {
  try {
    const purchase = await Purchase.findOne().lean();
    if (!purchase) return res.json([]);

    const { vendors, categories, priceTags } = purchase;

    const result = vendors.map((vendor) => {
      // Get all priceTags for this vendor
      const vendorTags = priceTags.filter(
        (t) => t.vendorId.toString() === vendor._id.toString()
      );

      // Group by category
      const categoryMap = {};
      vendorTags.forEach((t) => {
        if (!categoryMap[t.categoryId]) {
          const cat = categories.find((c) => c._id.toString() === t.categoryId.toString());
          categoryMap[t.categoryId] = {
            categoryId: t.categoryId,
            categoryName: cat?.categoryName || "",
            productCount: 0,
          };
        }
        categoryMap[t.categoryId].productCount++;
      });

      return {
        vendorId: vendor._id,
        vendorName: vendor.vendorName,
        vendorMobile: vendor.mobileNo,
        totalCategories: Object.keys(categoryMap).length,
        totalProducts: vendorTags.length,
        categories: Object.values(categoryMap),
      };
    });

    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch priceTags summary" });
  }
});


module.exports = router;
