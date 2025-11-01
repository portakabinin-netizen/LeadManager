import Constants from "expo-constants";

const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
const api_url = `http://${expoHost}:5000/api`;

export default api_url;
