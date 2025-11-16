import api_url from "@/backend/routes/base_url";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { sendLeadsToBackend } from "./getDataProcees";
/**
 * 🔍 Fetch leads by mobile number
 * @param {string} mobile
 * @param {string} token
 * @returns {Promise<Array>}
 */
export const fetchLeadsByMobile = async (mobile, token) => {
  try {
    const res = await axios.get(`${api_url}/leads/search?mobile=${mobile}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data || [];
  } catch (err) {
    console.error("❌ Error fetching leads:", err);
    throw err;
  }
};


export const downloadLeads = async (token, sDate, eDate) => {
  if (!token) return console.log("Token missing");

  try {
    const decoded = jwtDecode(token);

    const urlTI = decoded?.apiURLs?.urlTI;
    const urlMI = decoded?.apiURLs?.urlMI;
    const corpAdminId = decoded?.corpAdminId;
    const corporateId = decoded?.corporateId;
    const userId = decoded?.userId;

    const TIurl = urlTI
      .replace("sDate", sDate)
      .replace("eDate", eDate);

    sendLeadsToBackend(TIurl,urlMI,userId,corpAdminId,corporateId);
    
  } catch (err) {
    console.error("Download Error:", err);
  }
};
