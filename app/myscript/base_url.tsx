import Constants from "expo-constants";

const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
console.log(`http://${expoHost}:5000/action`);
export const BASE_URL = `http://${expoHost}:5000/action`;
export const waMsg_URL = `http://${expoHost}:5000/wamsg`;

