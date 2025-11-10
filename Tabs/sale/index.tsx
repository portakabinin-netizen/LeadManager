import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Divider, Menu, Provider } from "react-native-paper";
import Toast from "react-native-toast-message";
import menuItems from "./menuItem.json";

export default function HomeScreen() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const router = useRouter();

  //
  // 🔐 Verify stored session on mount
  //
  useEffect(() => {
    const verifySession = async () => {
      try {
        const sessionStr = await AsyncStorage.getItem("userSession");

        if (!sessionStr) {
          router.replace("../myscript/LoginScreen");
          return;
        }

        const session = JSON.parse(sessionStr);
        const token = session.token;

        if (!token) {
          await AsyncStorage.removeItem("userSession");
          router.replace("../myscript/LoginScreen");
          return;
        }

        const decoded: any = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp && decoded.exp < currentTime) {
          await AsyncStorage.removeItem("userSession");
          Toast.show({
            type: "info",
            text1: "Session Expired",
            text2: "Please login again.",
            position: "top",
          });
          router.replace("../myscript/LoginScreen");
          return;
        }

        // ✅ Set user data from decoded token
        setUser({
          name: decoded.name || "Guest",
          role: decoded.role || "Visitor",
          userId: decoded.userId,
        });
      } catch (error) {
        console.error("Token verification failed:", error);
        await AsyncStorage.removeItem("userSession");
        router.replace("../myscript/LoginScreen");
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  //
  // 🍔 Menu Handlers
  //
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleMenuSelect = async (action: string) => {
    closeMenu();
    if (action === "logout") {
      await AsyncStorage.removeItem("userSession");
      Toast.show({
        type: "success",
        text1: "Logged Out",
        text2: "You have been logged out successfully.",
        position: "top",
      });
      router.replace("../myscript/LoginScreen");
    } else if (action === "update") {
      router.push("/update-profile");
    } else if (action === "settings") {
      router.push("/settings");
    }
  };

  //
  // ⏳ Loading indicator while verifying session
  //
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: "#444" }}>Verifying user...</Text>
      </View>
    );
  }

  if (!user) return null;

  //
  // 🧭 Bottom Tab Renderer (✅ Using MaterialIcons)
  //
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.tabItem,
            activeTab === item.screen && styles.activeTabItem,
          ]}
          onPress={() => setActiveTab(item.screen)}
        >
          <MaterialIcons
            name={item.icon}
            size={22}
            color={activeTab === item.screen ? "#2563eb" : "#777"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === item.screen && styles.activeTabText,
            ]}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  //
  // 🏠 Main Home UI
  //
  return (
    <Provider>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
              }}
              style={styles.profileImage}
            />
            <View>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.subtitle}>{user.role}</Text>
            </View>
          </View>

          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <TouchableOpacity onPress={openMenu}>
                <MaterialIcons name="more-vert" size={24} color="#333" />
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => handleMenuSelect("update")}
              title="Update Profile"
              leadingIcon="edit"
            />
            <Divider />
            <Menu.Item
              onPress={() => handleMenuSelect("settings")}
              title="Settings"
              leadingIcon="settings"
            />
            <Menu.Item
              onPress={() => handleMenuSelect("logout")}
              title="Logout"
              leadingIcon="logout"
            />
          </Menu>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.welcomeText}>Welcome, {user.name}! 👋</Text>
          <Text style={styles.description}>
            You're viewing the{" "}
            <Text style={{ fontWeight: "bold" }}>{activeTab}</Text> screen.
          </Text>
        </View>

        {/* Dynamic Tab Bar */}
        <View style={styles.tabBarContainer}>
        {renderTabBar()}
        </View>

        <Toast />
      </View>
    </Provider>
  );
}

//
// 🎨 Styles
//
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", paddingTop: 50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  profileSection: { flexDirection: "row", alignItems: "center" },
  profileImage: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  name: { fontSize: 18, fontWeight: "bold", color: "#222" },
  subtitle: { fontSize: 14, color: "#666" },
  body: { flex: 1, justifyContent: "center", alignItems: "center" },
  welcomeText: { fontSize: 20, fontWeight: "bold", marginBottom: 5 },
  description: { fontSize: 14, color: "#666" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  tabBarContainer: {
    backgroundColor: "#fff",
    paddingBottom: 20, // 👈 Adds space above the mobile nav bar
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 12,
    paddingBottom: 10,
  },
  tabItem: { alignItems: "center", flex: 1 },
  activeTabItem: { borderTopWidth: 2, borderTopColor: "#2563eb" },
  tabText: { fontSize: 12, color: "#777", marginTop: 3 },
  activeTabText: { color: "#2563eb", fontWeight: "bold" },
});
