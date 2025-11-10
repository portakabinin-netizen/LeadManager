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

/* 🔹 Login */
router.post("/login", async (req, res) => {
  try {
    const { userMobile, userPassword } = req.body;
    const user = await Users.findOne({ userMobile });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const validPass = await bcrypt.compare(userPassword, user.userPassword);
    if (!validPass) return res.status(401).json({ success: false, message: "Invalid password" });

    const payload = {
      userId: user._id,
      userRole: user.userRole,
      corporateName: user.linkedCorporate?.corporateName || "",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
