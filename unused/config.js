// constants/config.ts
const sys_ip = "192.168.1.12"; 
const PORT = 5000;

export const API_PATH = `http://${sys_ip}:${PORT}/action/retrieve`;

// Getter function
export const getApiPath = () => API_PATH;

// External APIs
export const TIBaseUrl = "https://www.tradeindia.com/utils/my_inquiry.html";
