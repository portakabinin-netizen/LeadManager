import api_url from "@/backend/routes/base_url";
import axios from "axios";

export const fetchLeadsByMobile = async (mobile, token) => {
  const res = await axios.get(`${api_url}/leads/search/${mobile}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
