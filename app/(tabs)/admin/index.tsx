import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { DecodedToken } from "../../../hooks/interface";


export const useUserSession = () => {
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem("jwtToken");
        if (!token) {
          router.replace("/myscript/LoginScreen");
          return;
        }

        const decoded: DecodedToken = jwtDecode(token);
        if (!decoded?.role) {
          throw new Error("Invalid token");
        }

        // Optional: check expiry
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          await AsyncStorage.removeItem("jwtToken");
          router.replace("/myscript/LoginScreen");
          return;
        }

        setUser(decoded);
      } catch (err) {
        console.error("Session Error:", err);
        router.replace("/myscript/LoginScreen");
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  const logout = async () => {
    await AsyncStorage.removeItem("jwtToken");
    setUser(null);
  };

  return { user, loading, logout };
};
