import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import Toast from "react-native-toast-message";
import { USER_URL } from "./base_url";

const RegisterScreen = () => {
  const router = useRouter();

  // 🔹 Form state
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Derived state
  const inputsDisabled = !role;

  
  // 🔹 Helpers
  const validateMobile = (number: string) => /^[6-9]\d{9}$/.test(number);

  // 🔹 Registration handler
  const handleRegister = async () => {
    if (!name || !role || !password || !confirmPassword || !mobile) {
      Toast.show({ type: "error", text1: "Please fill all required fields" });
      return;
    }

    if (!validateMobile(mobile)) {
      Toast.show({ type: "error", text1: "Invalid mobile number" });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({ type: "error", text1: "Passwords do not match" });
      return;
    }

    if (role !== "Admin" && !company) {
      Toast.show({
        type: "error",
        text1: "Company name is required for Sale or Operation users",
      });
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        name,
        role,
        email,
        mobile,
        password,
      };

      if (role !== "Admin") payload.company = company;

      //await axios.post(`${USER_URL}/register`, payload);
      const response = await axios.post(`${USER_URL}/register`, payload, {headers: {"Content-Type" : "application/json",},});

      Toast.show({ type: "success", text1: "User registered successfully!" });
      router.replace("/"); // navigate back to login
    } catch (err: any) {
      console.error("Registration error:", err.response?.data || err.message);
      Toast.show({
        type: "error",
        text1: err.response?.data?.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Back button
  const handleBackToLogin = () => {
    router.replace("/");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Register New User</Text>

          {/* 🔸 Role dropdown */}
          <RNPickerSelect
            onValueChange={setRole}
            value={role}
            placeholder={{ label: "Select Role *", value: "" }}
            items={[
              { label: "Admin", value: "Admin" },
              { label: "Sale", value: "Sale" },
              { label: "Operation", value: "Operation" },
            ]}
            style={{
              inputIOS: styles.input,
              inputAndroid: styles.input,
            }}
          />

          {/* 🔸 Conditional company field */}
          {role && role !== "Admin" && (
            <TextInput
              placeholder="Company Name *"
              value={company}
              onChangeText={setCompany}
              style={styles.input}
              editable={!inputsDisabled && !loading}
            />
          )}

          {/* 🔸 Common fields */}
          <TextInput
            placeholder="Full Name *"
            value={name}
            onChangeText={setName}
            style={styles.input}
            editable={!inputsDisabled && !loading}
          />

          <TextInput
            placeholder="Email (optional)"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!inputsDisabled && !loading}
          />

          <TextInput
            placeholder="Mobile Number *"
            value={mobile}
            onChangeText={setMobile}
            style={styles.input}
            keyboardType="phone-pad"
            editable={!inputsDisabled && !loading}
          />

          <TextInput
            placeholder="Password *"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            editable={!inputsDisabled && !loading}
          />

          <TextInput
            placeholder="Confirm Password *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
            secureTextEntry
            editable={!inputsDisabled && !loading}
          />

          {/* 🔹 Register Button */}
          <TouchableOpacity
            style={[
              styles.button,
              (inputsDisabled || loading) && { backgroundColor: "#aaa" },
            ]}
            onPress={handleRegister}
            disabled={inputsDisabled || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          {/* 🔹 Back to login button */}
          <View style={styles.backContainer}>
            <TouchableOpacity onPress={handleBackToLogin}>
              <Text style={styles.backText}>← Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
      <Toast />
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 15,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    alignSelf: "center",
  },
  input: {
    height: 60,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#007bff",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  backContainer: {
    alignItems: "center",
    marginTop: 15,
  },
  backText: {
    color: "#007bff",
    fontSize: 16,
    fontWeight: "600",
  },
});
