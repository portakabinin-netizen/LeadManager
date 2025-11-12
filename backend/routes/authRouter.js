const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Users } = require("../models/UsersCorporates");
require("dotenv").config();

/* 🔹 User Registration */
router.post("/register", async (req, res) => {
  try {
    const { userMobile, userAadhar } = req.body;

    // check duplicate mobile or aadhar
    const existing = await Users.findOne({
      $or: [{ userMobile }, { userAadhar }]
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const newUser = new Users(req.body);
    await newUser.save();

    res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/* 🔹 Corporate Update */
router.put("/corporate/:id", async (req, res) => {
  try {
    const user = await Users.findById(req.params.id);
    if (!user || user.userRole !== "CorpAdmin") {
      return res.status(404).json({ success: false, message: "Corporate Admin not found" });
    }

    user.linkedCorporate = req.body.linkedCorporate;
    await user.save();

    res.json({ success: true, message: "Corporate updated successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/* 🔹 Login 
 * @route POST /auth/login
 * @desc Login route for both CorpAdmin and Non-Admin (Sales/Project) users
 */

router.post("/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ success: false, message: "Mobile and password required" });
    }

    // 1️⃣ Find user
    const user = await Users.findOne({ userMobile: mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2️⃣ Check password
    const isValidPassword = await bcrypt.compare(password, user.userPassword);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    // 3️⃣ Check active status
    if (!user.userActive) {
      return res.status(403).json({ success: false, message: "User is not active. Contact admin." });
    }

    // 4️⃣ Case 1: CorpAdmin login
    if (user.userRole === "CorpAdmin") {
      const corp = user.linkedCorporate || {};

      const payload = {
        userId: user._id,
        userDisplayName: user.userDisplayName,
        userEmail: user.userEmail,
        userMobile: user.userMobile,
        userRole: user.userRole,
        corpAdminId: user._id,
        corporateId: corp._id || "",
        corporateName: corp.corporateName || "",
        corporateEmail: corp.corporateEmail || "",
        corporateAddress: corp.corporateAddress || "",
        corporateCity: corp.corporateCity || "",
        corporateState: corp.corporateState || "",
        corporatePin: corp.corporatePin || "",
        corporateGST: corp.corporateGST || "",
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        success: true,
        message: "Corporate Admin login successful",
        token,
        user: payload,
      });
    }

    // 5️⃣ Case 2: Non-Admin (Sales / Project / etc.)
    if (user.accessCorporate && user.accessCorporate.corpAdminId) {
      const { corpAdminId, accessAllow } = user.accessCorporate;

      if (!accessAllow) {
        return res.status(403).json({
          success: false,
          message: "User not allowed to access any corporate.",
        });
      }

      // 🔍 Fetch the corporate admin to get corporate data
      const corpAdmin = await Users.findById(corpAdminId);
      if (!corpAdmin || !corpAdmin.linkedCorporate) {
        return res.status(404).json({
          success: false,
          message: "Linked corporate not found for this user.",
        });
      }

      const corp = corpAdmin.linkedCorporate;

      const payload = {
        userId: user._id,
        userDisplayName: user.userDisplayName,
        userEmail: user.userEmail,
        userMobile: user.userMobile,
        userRole: user.userRole,
        corpAdminId,
        corporateId: corp._id || "",
        corporateName: corp.corporateName || "",
        corporateEmail: corp.corporateEmail || "",
        corporateAddress: corp.corporateAddress || "",
        corporateCity: corp.corporateCity || "",
        corporateState: corp.corporateState || "",
        corporatePin: corp.corporatePin || "",
        corporateGST: corp.corporateGST || "",
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        success: true,
        message: "Corporate user login successful",
        token,
        user: payload,
      });
    }

    // 6️⃣ Fallback: Guest (no corporate info)
    const guestPayload = {
      userId: user._id,
      userDisplayName: user.userDisplayName,
      userEmail: user.userEmail,
      userMobile: user.userMobile,
      userRole: user.userRole,
      userType: "Guest",
    };

    const guestToken = jwt.sign(guestPayload, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      guest: true,
      message: "Guest login successful (no corporate access)",
      token: guestToken,
      user: guestPayload,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
