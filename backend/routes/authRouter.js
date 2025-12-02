// routes/authRouter.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { regex } = require("../shared/validationRules");
const cloudinary = require("cloudinary").v2;


// In-memory OTP store for demo. **In production use Redis or DB with TTL.**
const otpStore = {}; // { "<mobile>": { otp, expiresAt, purpose } }

// Utility: generate OTP numeric
function generateOtp(length = 6) {
    const num = crypto.randomInt(0, Math.pow(10, length));
    return String(num).padStart(length, "0");
}

// Placeholder: send OTP via Twilio (SMS or WhatsApp) or any provider.
// Implement using your provider SDK and call from sendOtpToUser.
async function sendOtpToUser({ mobile, otp, channel = "sms" }) {
    // Example: use Twilio REST API (accountSid, authToken environment vars).
    // For WhatsApp, Twilio supports sending to whatsapp:+91XXXXXXXXXX
    // Implement provider-specific code here.
    console.log(`SEND OTP ${otp} to ${mobile} via ${channel}`);
    return true;
}

/**
 * POST /auth/send-otp
 * body: { mobile, purpose: 'register'|'login'|'verify' , channel: 'sms'|'whatsapp' }
 */
router.post("/send-otp", async (req, res) => {
    try {
        const { mobile, purpose = "register", channel = "sms" } = req.body;
        if (!mobile) return res.status(400).json({ error: "mobile required" });

        const otp = generateOtp(6);
        console.log(otp);
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        otpStore[mobile] = { otp, expiresAt, purpose };

        await sendOtpToUser({ mobile, otp, channel });

        return res.json({ success: true, message: "OTP sent" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * POST /auth/verify-otp
 * body: { mobile, otp, purpose }
 */
router.post("/verify-otp", (req, res) => {
    try {
        const { mobile, otp, purpose = "register" } = req.body;
        const record = otpStore[mobile];
        if (!record) return res.status(400).json({ error: "No OTP sent to this number" });
        if (record.purpose !== purpose) return res.status(400).json({ error: "Purpose mismatch" });
        if (Date.now() > record.expiresAt) return res.status(400).json({ error: "OTP expired" });
        if (record.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });

        // success -> remove OTP or mark verified
        delete otpStore[mobile];
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * POST /auth/check-unique
 * body: { mobile?, userAadhar? }
 * Returns { mobileUnique: true/false, aadharUnique: true/false }
 */
router.post("/check-unique", async (req, res) => {
    try {
        const { mobile, userAadhar } = req.body;
        const Users = mongoose.model("Users");

        const result = {};
        if (mobile) {
            const exists = await Users.findOne({ userMobile: mobile }).lean();
            result.mobileUnique = !Boolean(exists);
        }
        if (userAadhar) {
            const exists = await Users.findOne({ userAadhar : userAadhar }).lean();
            result.aadharUnique = !Boolean(exists);
        }
        

        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * POST /auth/register
 * body: user object following Users schema.
 * Pre-requisites: mobile and aadhar already checked unique and OTP verified on client (server also double checks OTP if you saved verified flags)
 */
router.post("/register", async (req, res) => {
    try {
        const Users = mongoose.model("Users");
        const payload = req.body;

        // Basic server validation: mobile & aadhar unique, password rules
        if (!payload.userMobile) return res.status(400).json({ error: "mobile required" });
        if (!payload.userPassword) return res.status(400).json({ error: "password required" });

        // check uniqueness
        const existingMobile = await Users.findOne({ userMobile: payload.userMobile }).lean();
        if (existingMobile) return res.status(400).json({ error: "Mobile already registered" });

        if (payload.userAadhar) {
            const existingAadhar = await Users.findOne({ userAadhar: payload.userAadhar }).lean();
            if (existingAadhar) return res.status(400).json({ error: "Aadhar already registered" });
        }

        // password policy: min 8, 1 uppercase, 1 special
              if (!regex.password.test(payload.userPassword)) {
            return res.status(400).json({ error: "Password must be >=8 chars, 1 uppercase, 1 special char" });
        }

        // create user (pre-save hook will hash password)
        const user = new Users(payload);
        await user.save();
        return res.json({ success: true, id: user._id });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * POST /auth/login
 * body: { mobile, password }
 * If not found -> return code that client can use to show registration flow
 */
router.post("/login", async (req, res) => {
    try {
        const { mobile, password } = req.body;
        const Users = mongoose.model("Users");

        const user = await Users.findOne({ userMobile: mobile }).exec();
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                needRegistration: true,
            });
        }

        const match = await bcrypt.compare(password, user.userPassword);
        if (!match) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                id: user._id,
                mobile: user.userMobile,
                role: user.userRole,
                corporateId : user.corporateId,
                adminUser : user.corpAdmin
            },
            process.env.JWT_SECRET || "portakabin.in_HIPK",
            { expiresIn: "180d" }
        );
        console.log(res);

        return res.json({
            success: true,
            token,
            user: {
                id: user._id,
                userDisplayName: user.userDisplayName,
                userRole: user.userRole,
            },
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* --------------------------------------------------------------------
   GET /api/auth/check-mobile/:mobile
-------------------------------------------------------------------- */

router.get("/check-mobile/:mobile", async (req, res) => {
    try {
        const { mobile } = req.params;
        const Users = mongoose.model("Users");

        if (!mobile || mobile.length !== 10) {
            return res.status(400).json({ success: false, message: "Invalid mobile" });
        }

        const user = await Users.findOne({ userMobile: mobile }).lean();

        if (!user) {
            return res.json({
                success: true,
                exists: false,
                message: "Mobile not registered"
            });
        }

        return res.json({
            success: true,
            exists: true,
            userRole: user.userRole,
            message: "Mobile exists"
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

router.post("/upload", async (req, res) => {
  try {
    const { userId, type, imageBase64 } = req.body;
    const Users = mongoose.model("Users");

    // Validate
    if (!userId || !type || !imageBase64) {
      return res.status(400).json({
        success: false,
        message: "userId, type and imageBase64 are required",
      });
    }

    if (!["user", "corp"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be 'user' or 'corp'",
      });
    }

    // Upload to Cloudinary
    const upload = await cloudinary.uploader.upload(imageBase64, {
      folder: "leadmanager/profile",
    });

    if (!upload.secure_url) {
      return res.status(500).json({
        success: false,
        message: "Cloudinary upload failed",
      });
    }

    let updateData = {};

    // =======================
    // UPDATE USER PROFILE IMAGE
    // =======================
    if (type === "user") {
      updateData.userProfileImage = upload.secure_url;
    }

    // =======================
    // UPDATE CORPORATE PROFILE IMAGE
    // =======================
    if (type === "corp") {
      updateData["linkedCorporate.CorpProfileImage"] = upload.secure_url;
    }

    // Apply update
    const updatedUser = await Users.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    return res.json({
      success: true,
      message: "Image uploaded successfully",
      url: upload.secure_url,
      user: updatedUser,
    });

  } catch (err) {
    console.error("Upload Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Upload failed",
    });
  }
});

module.exports = router;
