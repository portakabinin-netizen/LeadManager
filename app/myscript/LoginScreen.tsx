import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api_url from "../../backend/routes/base_url";
import { DecodedToken } from "../../hooks/interface";

  const LoginScreen: React.FC = () => {
  const router = useRouter();

  // fields + ui state
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ mobile?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  // forgot flow
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotValue, setForgotValue] = useState("");
  const [forgotRole, setForgotRole] = useState<"Admin" | "User">("User");
  const [forgotLoading, setForgotLoading] = useState(false);

  // validation (onBlur)
  const validateField = (field: "mobile" | "password", value: string) => {
    let error = "";

    if (field === "mobile") {
      if (!value.trim()) error = "Mobile number is required";
      else if (!/^[6-9]\d{9}$/.test(value)) error = "Enter a valid 10-digit mobile number";
    }

    if (field === "password") {
      if (!value.trim()) error = "Password is required";
      else if (value.length < 4) error = "Password must be at least 4 characters";
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
      Toast.show({ type: "error", text1: "Invalid Field", text2: error, position: "top" });
    } else {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // clear errors while typing
  const handleInputChange = (field: "mobile" | "password", value: string) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
    if (field === "mobile") setMobile(value);
    else setPassword(value);
  };

  // login
  const handleLogin = async () => {
    if (!mobile || !password) {
      Toast.show({ type: "error", text1: "Missing Fields", text2: "Please enter both mobile and password.", position: "top" });
      return;
    }
    if (errors.mobile || errors.password) return;

    setLoading(true);
    try {
         const res = await axios.post(`${api_url}/auth/login`, { mobile, password }, { headers: { "Content-Type": "application/json" } });

      if (!res.data.success) throw new Error(res.data.message || "Login failed");

      const { token } = res.data;
          
      const decoded = jwtDecode<DecodedToken>(token);
      
      // ✅ store session object as JSON
            const userSession = {
              token,
              userId: decoded.userId,
              username: decoded.name,
              role: decoded.role,
            };
        await AsyncStorage.setItem("userSession", JSON.stringify(userSession));

      Toast.show({ type: "success", text1: "Login Successful", text2: `Welcome, ${decoded.name}!`, position: "top" });
     
      //let rolePath = `/roles/${decoded.role.toLowerCase()}`;
     const rolePath ="/myscript";
                   
        router.replace(rolePath as any);
      
      } catch (error: any) {
      Toast.show({ type: "error", text1: "Login Error", text2: error.response?.data?.message || "Invalid credentials or network error.", position: "top" });
    } finally {
      setLoading(false);
    }
  };

  // forgot password
  const handleForgotPassword = async () => {
    if (!forgotValue.trim()) {
      Toast.show({ type: "error", text1: "Missing Field", text2: `Enter your ${forgotRole === "Admin" ? "PAN number" : "Aadhaar number"}.`, position: "top" });
      return;
    }

    setForgotLoading(true);
    try {
      const endpoint = forgotRole === "Admin"
        ? `${api_url}/auth/forgot-password/pan`
        : `${api_url}/auth/forgot-password/aadhaar`;

      const payload = forgotRole === "Admin" ? { pan: forgotValue.toUpperCase() } : { aadhaar: forgotValue };

      const res = await axios.post(endpoint, payload, { headers: { "Content-Type": "application/json" } });

      if (res.data.success) {
        Toast.show({ type: "success", text1: "Password Reset", text2: res.data.message, position: "top" });
        setForgotMode(false);
        setForgotValue("");
      } else {
        Toast.show({ type: "error", text1: "Error", text2: res.data.message, position: "top" });
      }
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Network Error", text2: err.response?.data?.message || "Try again later.", position: "top" });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRegister = () => router.push("../myscript/userRegistration");
  const handleExit = () => BackHandler.exitApp();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* HEADER */}
          <View style={styles.header}>
            <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
            <Text style={styles.headerTitle}>Lead Manager</Text>
            <Text style={styles.headerSubtitle}>Management Information Reports(MIS)</Text>
          </View>

          {/* BODY */}
          <View style={styles.middleContainer}>
            {!forgotMode ? (
              <>
                <Text style={styles.title}>User Login</Text>

                <TextInput
                  style={[styles.input, errors.mobile ? { borderColor: "#ef4444" } : {}]}
                  placeholder="Mobile Number"
                  keyboardType="number-pad"
                  value={mobile}
                  maxLength={10}
                  onChangeText={(text) => handleInputChange("mobile", text)}
                  onBlur={() => validateField("mobile", mobile)}
                />
                {errors.mobile ? <Text style={styles.errorText}>{errors.mobile}</Text> : null}

                <TextInput
                  style={[styles.input, errors.password ? { borderColor: "#ef4444" } : {}]}
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={(text) => handleInputChange("password", text)}
                  onBlur={() => validateField("password", password)}
                />
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
                </TouchableOpacity>

                {/* ICON ROW: Forgot, New User, Exit */}
                <View style={styles.iconRow}>
                  <TouchableOpacity style={styles.iconButton} onPress={() => setForgotMode(true)}>
                    <Ionicons name="key-outline" size={18} color="#2563eb" />
                    <Text style={styles.iconButtonText}>Forgot</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.iconButton} onPress={handleRegister}>
                    <Ionicons name="person-add-outline" size={18} color="#2563eb" />
                    <Text style={styles.iconButtonText}>New User</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.iconButton} onPress={handleExit}>
                    <Ionicons name="exit-outline" size={18} color="#ef4444" />
                    <Text style={[styles.iconButtonText, { color: "#ef4444" }]}>Exit</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>Forgot Password</Text>

                {/* Role toggle */}
                <View style={styles.roleSwitchContainer}>
                  <TouchableOpacity
                    style={[styles.roleButton, forgotRole === "Admin" && styles.roleButtonActive]}
                    onPress={() => setForgotRole("Admin")}
                  >
                    <Text style={[styles.roleButtonText, forgotRole === "Admin" && styles.roleButtonTextActive]}>Admin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleButton, forgotRole === "User" && styles.roleButtonActive]}
                    onPress={() => setForgotRole("User")}
                  >
                    <Text style={[styles.roleButtonText, forgotRole === "User" && styles.roleButtonTextActive]}>User</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  placeholder={forgotRole === "Admin" ? "Enter PAN Number" : "Enter Aadhaar Number"}
                  value={forgotValue}
                  onChangeText={setForgotValue}
                  maxLength={forgotRole === "Admin" ? 10 : 12}
                />

                <TouchableOpacity style={styles.button} onPress={handleForgotPassword} disabled={forgotLoading}>
                  {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={() => setForgotMode(false)}>
                  <Text style={styles.secondaryText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 Lead Manager by Hiresh iSearch</Text>
            <Text style={styles.footerSubText}>Version 1.0.0</Text>
          </View>

          <Toast />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

//
// Styles
//
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "space-between", // keeps header, body, footer spaced
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 28,
    backgroundColor: "#f9fafb",
  },

  header: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  logo: { width: 70, height: 70, marginBottom: 10, borderRadius: 15 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#1e3a8a" },
  headerSubtitle: { fontSize: 14, color: "#6b7280" },

  middleContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12, 
  },
  title: { fontSize: 26, fontWeight: "700", color: "#111827", marginBottom: 20 },

  input: {
    width: "98%",
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 8,
    borderColor: "#d1d5db",
    borderWidth: 1,
  },
  errorText: { alignSelf: "flex-start", color: "#ef4444", marginLeft: "4%", marginBottom: 6 },

  button: {
    width: "98%",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },

  iconRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 36,
  },
  iconButton: { alignItems: "center" },
  iconButtonText: { color: "#2563eb", fontSize: 14, marginTop: 4, fontWeight: "500" },

  footer: { alignItems: "center", marginTop: 12, paddingBottom: 8 },
  footerText: { fontSize: 12, color: "#6b7280" },
  footerSubText: { fontSize: 11, color: "#9ca3af" },

  // forgot role toggle
  roleSwitchContainer: { flexDirection: "row", justifyContent: "center", marginBottom: 12 },
  roleButton: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1, borderColor: "#2563eb", marginHorizontal: 6 },
  roleButtonActive: { backgroundColor: "#2563eb" },
  roleButtonText: { color: "#2563eb", fontSize: 15, fontWeight: "600" },
  roleButtonTextActive: { color: "#fff" },

  secondaryButton: { marginTop: 10 },
  secondaryText: { color: "#2563eb", fontSize: 16, fontWeight: "500" },
});
