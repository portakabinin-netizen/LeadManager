const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Users } = require("../models/LeadSchema"); 
require("dotenv").config();

module.exports = (io) => {
  const router = express.Router();

  /* =====================================================
     🟢 REGISTER USER
  ===================================================== */
  router.post("/register", async (req, res) => {
    try {
      const { role, name, mobile, password, email } = req.body;

      if (!role || !name || !mobile || !password) {
        return res
          .status(400)
          .json({ success: false, message: "All required fields must be filled" });
      }

      const existingUser = await Users.findOne({ mobile });
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, message: "User already exists with this mobile" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new Users({
        role,
        name,
        mobile,
        email,
        password: hashedPassword,
        defaultMenu: [],
        companyMenu: [],
      });

      const savedUser = await newUser.save();
      io.emit("user:registered", savedUser);

      res.status(201).json({
        success: true,
        message: "✅ User registered successfully",
        data: savedUser,
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  /* =====================================================
     🔵 LOGIN USER
  ===================================================== */
  router.post("/login", async (req, res) => {
    try {
      const { mobile, password } = req.body;
      if (!mobile || !password)
        return res
          .status(400)
          .json({ success: false, message: "Mobile and password required" });

      const user = await Users.findOne({ mobile });
      if (!user)
        return res.status(404).json({ success: false, message: "User not found" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ success: false, message: "Invalid credentials" });

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      io.emit("user:login", { userId: user._id, name: user.name });

      res.json({
        success: true,
        message: "✅ Login successful",
        token,
        data: {
          _id: user._id,
          name: user.name,
          role: user.role,
          mobile: user.mobile,
          email: user.email,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  /* =====================================================
     🛡️ VERIFY TOKEN MIDDLEWARE
  ===================================================== */
  const verifyToken = (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token)
        return res
          .status(401)
          .json({ success: false, message: "Access denied. Unauthorised user." });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      console.error("Token verification error:", err);
      res.status(401).json({ success: false, message: "seasion expired" });
    }
  };

  /* =====================================================
     🟠 GET ALL USERS
  ===================================================== */
  router.get("/users", verifyToken, async (req, res) => {
    try {
      const allUsers = await Users.find().select("-password");
      res.json({ success: true, count: allUsers.length, data: allUsers });
    } catch (err) {
      console.error("Get users error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  /* =====================================================
     🔴 DELETE USER
  ===================================================== */
  router.delete("/users/:id", verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await Users.findByIdAndDelete(id);
      if (!deleted)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      io.emit("user:deleted", { id });

      res.json({ success: true, message: "🗑️ User deleted successfully" });
    } catch (err) {
      console.error("Delete user error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  /* =====================================================
     🟣 UPDATE USER ACCESS (ROLE BASED)
  ===================================================== */
  router.put("/users/:id/access", verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { companyMenu, defaultMenu } = req.body;

      const updated = await Users.findByIdAndUpdate(
        id,
        { $set: { companyMenu, defaultMenu } },
        { new: true }
      );

      io.emit("user:updated", updated);

      res.json({ success: true, message: "✅ Access updated", data: updated });
    } catch (err) {
      console.error("Access update error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  return router;
};
