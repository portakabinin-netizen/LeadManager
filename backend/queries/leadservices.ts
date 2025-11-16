// backend/queries/LeadsService.js
import api_url from "@/backend/routes/base_url";
import axios from "axios";
import Toast from "react-native-toast-message";

class LeadsService {
  constructor(token) {
    this.token = token;
    this.client = axios.create({
      baseURL: api_url,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  // 🔹 Fetch leads by mobile number
  async findLeadByMobile(mobile) {
    if (!mobile) {
      Toast.show({ type: "info", text1: "Please enter a mobile number" });
      return [];
    }

    try {
      const { data } = await this.client.get(`/leads/search/${mobile}`);
      if (data.length === 0) {
        Toast.show({ type: "info", text1: "No leads found for this number" });
      } else {
        Toast.show({ type: "success", text1: `${data.length} Lead(s) found` });
      }
      return data;
    } catch (err) {
      console.error("❌ findLeadByMobile Error:", err);
      Toast.show({ type: "error", text1: "Search failed" });
      return [];
    }
  }

  // 📥 Download leads report (CSV / Excel / PDF endpoint)
  async downloadLeads(corpId) {
    try {
      const response = await this.client.get(`/leads/download/${corpId}`, {
        responseType: "blob",
      });

      Toast.show({ type: "success", text1: "Download started" });

      // Handle file saving logic based on your platform (Web/Native)
      return response.data;
    } catch (err) {
      console.error("❌ downloadLeads Error:", err);
      Toast.show({ type: "error", text1: "Download failed" });
    }
  }
}

export default LeadsService;
