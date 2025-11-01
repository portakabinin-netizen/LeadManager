const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Users } = require("../models/AllCollectionSchema");
require("dotenv").config();

/**
 * 🧩 Register User
 */
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      password,
      role,
      panNumber,
      aadhaarNumber,
      corporateId,
      corporateInfo,
    } = req.body;

    // validation
    if (!name || !mobile || !password || !role) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const existing = await Users.findOne({ mobile });
    if (existing) {
      return res.status(400).json({ success: false, message: "Mobile already registered" });
    }

    
    // create user
    const user = new Users({
      name,
      mobile,
      email,
      role,
      password,
      panNumber,
      aadhaarNumber,
      corporateId,
      corporateInfo,
    });

    const savedUser = await user.save();

    return res.json({ success: true, data: savedUser });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 🔑 Login User
 */
router.post("/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password)
      return res.status(400).json({ success: false, message: "Mobile and password required" });

    const user = await Users.findOne({ mobile });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        corporateId: user.corporateId || null,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "60d" }
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        corporateId: user.corporateId,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
