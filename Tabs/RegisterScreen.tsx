import api_url from "@/backend/routes/base_url";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { router } from "expo-router";
import React, { Component } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default class RegisterScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      role: "",
      name: "",
      mobile: "",
      email: "",
      password: "",
      adminMobile: "",
      companyName: "",
      isSubmitting: false,
    };
  }

  handleRegister = async () => {
    const {
      name,
      mobile,
      email,
      password,
      role,
      adminMobile,
      companyName,
    } = this.state;

    if (!role) {
      Toast.show({ type: "error", text1: "Please select user type" });
      return;
    }

    if (!name || !mobile || !password) {
      Toast.show({ type: "error", text1: "Please fill all required fields" });
      return;
    }

    // Role-based validation
    if (role === "Admin" && !companyName) {
      Toast.show({ type: "error", text1: "Company name is required for Admin" });
      return;
    }

    if (role !== "Admin" && !adminMobile) {
      Toast.show({
        type: "error",
        text1: "Admin mobile is required for non-admin users",
      });
      return;
    }

    this.setState({ isSubmitting: true });

    try {
      const payload = {
        name,
        mobile,
        email,
        password,
        role,
        adminMobile: role === "Admin" ? null : adminMobile,
        companyName: role === "Admin" ? companyName : null,
      };

      const res = await axios.post(api_url, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.data.success) {
        Toast.show({ type: "success", text1: res.data.message });
        setTimeout(() => router.replace("/loginScreen"), 1500);
      } else {
        Toast.show({ type: "error", text1: res.data.message });
      }
    } catch (error) {
      console.log("Register error:", error?.response?.data || error.message);
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Registration failed",
      });
    } finally {
      this.setState({ isSubmitting: false });
    }
  };

  render() {
    const {
      name,
      mobile,
      email,
      password,
      role,
      adminMobile,
      companyName,
      isSubmitting,
    } = this.state;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <Text style={styles.title}>Register User</Text>

          {/* Role Dropdown */}
          <Text style={styles.label}>Select User Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={role}
              style={styles.picker}
              onValueChange={(value) => this.setState({ role: value })}
            >
              <Picker.Item label="-- Select Role --" value="" />
              <Picker.Item label="Admin" value="Admin" />
              <Picker.Item label="Sales" value="Sales" />
              <Picker.Item label="Project" value="Project" />
            </Picker>
          </View>

          {/* Common Fields */}
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={(text) => this.setState({ name: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Mobile Number"
            keyboardType="phone-pad"
            value={mobile}
            onChangeText={(text) => this.setState({ mobile: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Email (optional)"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => this.setState({ email: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={(text) => this.setState({ password: text })}
          />

          {/* Role-based Conditional Fields */}
          {role === "Admin" && (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Company Name"
                value={companyName}
                onChangeText={(text) => this.setState({ companyName: text })}
              />
            </View>
          )}

          {role && role !== "Admin" && (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Admin Mobile Number"
                keyboardType="phone-pad"
                value={adminMobile}
                onChangeText={(text) => this.setState({ adminMobile: text })}
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              isSubmitting ? { backgroundColor: "#aaa" } : {},
            ]}
            onPress={this.handleRegister}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? "Registering..." : "Register"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  scrollView: { padding: 20, alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginVertical: 20 },
  label: { alignSelf: "flex-start", marginBottom: 5, fontWeight: "600" },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 15,
    width: "100%",
  },
  picker: { height: 50, width: "100%" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    width: "100%",
  },
  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
