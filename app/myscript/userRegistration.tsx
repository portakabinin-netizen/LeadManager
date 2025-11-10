import { registerCorpAdmin, registerNonAdmin } from "@/backend/queries/userQueries";
import { regex } from "@/backend/shared/validationRules";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

const UserRegistration = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    userDisplayName: "",
    userEmail: "",
    userMobile: "",
    userPassword: "",
    userRole: "",
    userAadhar: "",
    userDoB: "",
    // CorpAdmin fields
    corporateName: "",
    corporateEmail: "",
    corporateAddress: "",
    corporateCity: "",
    corporateDistrict: "",
    corporateState: "",
    corporatePin: "",
    corporatePAN: "",
    corporateGST: "",
    // NonAdmin field
    corporateId: "",
  });

  const handleChange = (key, value) => setFormData({ ...formData, [key]: value });

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split("T")[0]; // yyyy-mm-dd
      handleChange("userDoB", formatted);
    }
  };

  const validateInputs = () => {
    /*
    const nameRegex = /^[A-Za-z.@ ]+$/;
    const mobileRegex = /^[6-9]\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const aadharRegex = /^\d{12}$/; */

    if (!formData.userDisplayName.trim() || !regex.name.test(formData.userDisplayName))
      return "Enter valid full name (letters, dot, or @ allowed)";
    if (!regex.mobile.test(formData.userMobile)) return "Enter valid mobile number";
    if (!regex.email.test(formData.userEmail)) return "Enter valid email address";
    if (!formData.userPassword || formData.userPassword.length < 8)
      return "Password must be at least 8 characters";
    if (!formData.userRole) return "Select user role";
    if (!formData.userDoB) return "Select date of birth";
    if (!regex.aadhar.test(formData.userAadhar)) return "Enter valid Aadhar number";

    if (formData.userRole === "CorpAdmin") {
      if (!formData.corporateName.trim()) return "Enter corporate name";
      if (!regex.email.test(formData.corporateEmail)) return "Enter valid corporate email";
      if (!regex.pan.test(formData.corporatePAN)) return "Enter valid corporate PAN";
      //if (!formData.corporateGST.trim()) return "Enter corporate GST";
    }

    if (["Sales", "Project"].includes(formData.userRole)) {
      if (!formData.corporateId.trim()) return "Enter corporate ID";
    }

    return null;
  };

  const handleRegister = async () => {
    const error = validateInputs();
    if (error) {
      Toast.show({ type: "error", text1: "Validation Error", text2: error, position: "top" });
      return;
    }

    try {
      setLoading(true);
      let result;
      if (formData.userRole === "CorpAdmin") {
        result = await registerCorpAdmin(formData);
      } else {
        result = await registerNonAdmin(formData);
      }

      if (result.success) {
        Toast.show({
          type: "success",
          text1: "Registration Successful",
          text2: `${formData.userRole} registered successfully!`,
          position: "top",
        });
        router.push("./LoginScreen");
      } else {
        Toast.show({
          type: "error",
          text1: "Registration Failed",
          text2: result.message || "Something went wrong",
          position: "top",
        });
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.response?.data?.message || err.message,
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* HEADER */}
          <View style={styles.header}>
            <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
            <Text style={styles.headerTitle}>Lead Manager</Text>
            <Text style={styles.headerSubtitle}>User Registration</Text>
          </View>

          {/* BODY */}
          <View style={styles.body}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={formData.userDisplayName}
              onChangeText={(t) => handleChange("userDisplayName", t)}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
              value={formData.userEmail}
              onChangeText={(t) => handleChange("userEmail", t)}
            />
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              keyboardType="number-pad"
              value={formData.userMobile}
              maxLength={10}
              onChangeText={(t) => handleChange("userMobile", t)}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={formData.userPassword}
              onChangeText={(t) => handleChange("userPassword", t)}
            />

            <Picker
              selectedValue={formData.userRole}
              style={styles.picker}
              onValueChange={(v) => handleChange("userRole", v)}
            >
              <Picker.Item label="Select Role" value="" />
              <Picker.Item label="Corporate Admin" value="CorpAdmin" />
              <Picker.Item label="Sales & Marketing" value="Sales" />
              <Picker.Item label="Project Analysis" value="Project" />
            </Picker>

            <TextInput
              style={styles.input}
              placeholder="Aadhar Number"
              keyboardType="number-pad"
              maxLength={12}
              value={formData.userAadhar}
              onChangeText={(t) => handleChange("userAadhar", t)}
            />

            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: "#555" }}>
                {formData.userDoB ? `DOB: ${formData.userDoB}` : "Select Date of Birth"}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={new Date()}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}

            {/* CorpAdmin Section */}
            {formData.userRole === "CorpAdmin" && (
              <>
                <Text style={styles.sectionTitle}>Corporate Details</Text>
                {[
                  "corporateName",
                  "corporateEmail",
                  "corporateAddress",
                  "corporateCity",
                  "corporateDistrict",
                  "corporateState",
                ].map((f, i) => (
                  <TextInput
                    key={i}
                    style={styles.input}
                    placeholder={f.replace("corporate", "Corporate ")}
                    value={formData[f]}
                    onChangeText={(t) => handleChange(f, t)}
                  />
                ))}
                <TextInput
                  style={styles.input}
                  placeholder="Pin Code"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={formData.corporatePin}
                  onChangeText={(t) => handleChange("corporatePin", t)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="PAN Number"
                  autoCapitalize="characters"
                  maxLength={10}
                  value={formData.corporatePAN}
                  onChangeText={(t) => handleChange("corporatePAN", t)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="GST Number"
                  autoCapitalize="characters"
                  maxLength={15}
                  value={formData.corporateGST}
                  onChangeText={(t) => handleChange("corporateGST", t)}
                />
              </>
            )}

            {/* Sales/Project Section */}
            {["Sales", "Project"].includes(formData.userRole) && (
              <>
                <Text style={styles.sectionTitle}>Corporate Access</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Corporate ID"
                  value={formData.corporateId}
                  onChangeText={(t) => handleChange("corporateId", t)}
                />
              </>
            )}

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("./LoginScreen")}
            >
              <Ionicons name="arrow-back-circle-outline" size={20} color="#2563eb" />
              <Text style={styles.secondaryText}>Back to Login</Text>
            </TouchableOpacity>
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

export default UserRegistration;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 28,
    backgroundColor: "#f9fafb",
  },

  header: { alignItems: "center", marginTop: 8, marginBottom: 12 },
  logo: { width: 70, height: 70, marginBottom: 10, borderRadius: 15 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#1e3a8a" },
  headerSubtitle: { fontSize: 14, color: "#6b7280" },

  body: { width: "100%", alignItems: "center", justifyContent: "center" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 18,
    marginBottom: 10,
  },

  input: {
    width: "98%",
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 10,
    borderColor: "#d1d5db",
    borderWidth: 1,
  },
  picker: {
    width: "98%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  dateButton: {
    width: "98%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },

  button: {
    width: "98%",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },

  secondaryButton: { flexDirection: "row", alignItems: "center", marginTop: 16, gap: 6 },
  secondaryText: { color: "#2563eb", fontSize: 15, fontWeight: "600" },

  footer: { alignItems: "center", marginTop: 18 },
  footerText: { fontSize: 12, color: "#6b7280" },
  footerSubText: { fontSize: 11, color: "#9ca3af" },
});
