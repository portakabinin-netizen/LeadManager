// backend/routes/whatsappRoute.js
const express = require("express");
const axios = require("axios");

const router = express.Router();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_URL =  process.env.WHATSAPP_URL;

// Warn if missing credentials
if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
  console.error("❌ Missing WhatsApp API credentials. Check .env file!");
}

router.post("/send-whatsapp", async (req, res) => {
  try {
    const { phone, message, imageUrl } = req.body;

    if (!phone || !message) {
      return res
        .status(400)
        .json({ success: false, error: "Phone and message are required." });
    }

    // ✅ Build payload (image with caption)
    const payload = {
      messaging_product: "whatsapp",
      to: phone.replace(/\+/g, ""), // remove "+" if present
      type: "image",
      image: {
        link: imageUrl || "https://via.placeholder.com/300", // fallback if missing
        caption: message,
      },
    };

    // ✅ WhatsApp API URL
    const waMsgUrl = `${WHATSAPP_URL}/${PHONE_NUMBER_ID}/messages`;

    // ✅ Headers
    const config = {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    };

    // ✅ Send WhatsApp Message
    const response = await axios.post(waMsgUrl, payload, config);

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("❌ WhatsApp Send Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;