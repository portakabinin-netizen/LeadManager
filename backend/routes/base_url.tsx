import Constants from "expo-constants";

// Get Expo development host (e.g., "192.168.1.5")
const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];

// Set your production (Railway) backend URL
const productionURL = "https://leadmanager-backend-production.up.railway.app";

// Detect environment
const devMode = __DEV__; // true when running locally in Expo Go

// Build final API base URL
const api_url = devMode
  ? `http://${expoHost}:5000/api` // Local backend port (adjust if needed)
  : `${productionURL}/api`; // Production backend (Railway)

export default api_url;

