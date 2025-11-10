import Constants from "expo-constants";

const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
const api_url = `http://${expoHost}:5000/api`;
//const api_url = 'https://leadmanager-production.up.railway.app/api';
export default api_url;
