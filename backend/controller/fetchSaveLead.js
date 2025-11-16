require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const { LeadsLedgers } = require("../models/LeadsLedgers"); 

/**
 * =====================================================
 * 📥 saveTradeIndiaLeads(apiUrl)
 * -----------------------------------------------------
 * Fetches leads from TradeIndia API → Cleans → Checks
 * duplicates → Saves into MongoDB LeadsLedgers collection.
 * =====================================================
 */
async function saveTradeIndiaLeads(apiUrl) {
  try {
    console.log("📡 Fetching leads from TradeIndia API...");

    // --- Step 1: Fetch Data ---
    const response = await axios.get(apiUrl, {
      headers: { Accept: "application/json" },
      timeout: 20000,
    });

    const data =
      response.data?.data ||
      response.data?.response ||
      response.data?.results ||
      response.data;

    if (!Array.isArray(data) || !data.length) {
      console.warn("⚠️ No valid leads found in TradeIndia API response.");
      return;
    }

    console.log(`📦 Received ${data.length} raw leads from TradeIndia.`);

    // --- Step 2: Helper Functions ---
    const stripHTML = (html = "") => html.replace(/<[^>]*>/g, "").trim();
    const extractMobile = (text = "") => {
      const match = text.match(/tel:\+?(\d+)/);
      return match ? match[1] : text.replace(/[^0-9]/g, "");
    };

    let savedCount = 0;
    let skippedCount = 0;

    // --- Step 3: Process Each Lead ---
    for (const item of data) {
      try {
        const senderBlock =
          item["Sender Details"] || item.sender_details || item.message || "";

        let sender_name = item.sender_name;
        let sender_mobile = item.sender_mobile;
        let sender_city = item.sender_city;
        let sender_state = item.sender_state;

        if (typeof senderBlock === "string" && senderBlock.includes("NAME")) {
          sender_name =
            sender_name ||
            (senderBlock.match(/NAME\s*:\s*([^\n<]+)/i)?.[1] || "").trim();
          sender_mobile =
            sender_mobile ||
            extractMobile(senderBlock.match(/MOBILE\s*:\s*(.+)/i)?.[1] || "");
          sender_city =
            sender_city ||
            (senderBlock.match(/CITY\s*:\s*([^\n<]+)/i)?.[1] || "").trim();
          sender_state =
            sender_state ||
            (senderBlock.match(/STATE\s*:\s*([^\n<]+)/i)?.[1] || "").trim();
        }

        const cleanMobile = extractMobile(sender_mobile);
        const cleanName = stripHTML(sender_name || "Unknown");
        const cleanCity = stripHTML(sender_city || "Unknown");
        const cleanState = stripHTML(sender_state || "Unknown");

        if (!cleanMobile) {
          console.warn("⏭️ Skipped lead — missing mobile number:", cleanName);
          skippedCount++;
          continue;
        }

        console.log(`🔍 Checking existing lead for mobile: ${cleanMobile}`);

        // ✅ Step 4: Check for duplicate lead
        const existingLead = await LeadsLedgers.findOne({
          $or: [
            { source_id: item.rfi_id },
            { sender_mobile: { $regex: `^${cleanMobile}$`, $options: "i" } },
          ],
        });

        if (existingLead) {
          console.log(`⚠️ Duplicate skipped: ${cleanName} (${cleanMobile})`);
          skippedCount++;
          continue;
        }

        // ✅ Step 5: Create lead document
        const newLead = new LeadsLedgers({
          product_name: item.subject || item.product_name || "No Product",
          sender_name: cleanName,
          sender_city: cleanCity,
          sender_state: cleanState,
          sender_mobile: cleanMobile,
          sender_email: item.sender_email || "",
          source: "TradeIndia",
          source_id: item.rfi_id || `TI-${cleanMobile}-${Date.now()}`,
          adminLink: "System",
          corpLink: item.receiver_co || "Portakabin.in",
          link2Corporate: ["PORTAKABIN-ID", "HIRESH-ID"],
          status:
            item.view_status?.toUpperCase() === "UNREAD" ? "Unread" : "Recent",
          generated_date: new Date(),
          activity: [
            {
              date: new Date(),
              action: "Fetched from TradeIndia",
              byUser: "System",
            },
          ],
          finance: [
            {
              voucherDate: new Date(),
              paymentType: "Dr",
              voucherAmount: { value: 0, currency: "INR" },
              voucherNarration: "Opening Balance",
              paymentFromTo: "Admin",
            },
          ],
          billInfo: [
            {
              billTo: cleanName,
              contactPerson: cleanName,
              billCity: cleanCity,
              billState: cleanState,
            },
          ],
        });

        // 💾 Step 6: Save to MongoDB
        await newLead.save();
        console.log(`✅ Saved new lead: ${cleanName} (${cleanMobile})`);
        savedCount++;
      } catch (innerErr) {
        console.error("❌ Error saving lead:", innerErr.message);
      }
    }

    console.log(
      `🎉 Processing complete — ${savedCount} saved, ${skippedCount} skipped.`
    );
  } catch (error) {
    console.error("❌ Error in saveTradeIndiaLeads:", error.message);
  }
}

module.exports = { saveTradeIndiaLeads };
