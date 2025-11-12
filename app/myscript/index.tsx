import { CurrentUser, DecodedToken, MenuItem, UserSession } from "@/hooks/interface";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Divider, Menu, Provider } from "react-native-paper";
import Toast from "react-native-toast-message";
import LeadByStatusScreen from "./LeadByStatusScreen";
import menuItems from "./menuItem.json";

export default function HomeScreen() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [filteredMenu, setFilteredMenu] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("Recent");
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const verifySession = async () => {
      try {
        const sessionStr = await AsyncStorage.getItem("userSession");
        if (!sessionStr) {
          Toast.show({ type: "info", text1: "Session missing" });
          router.replace("../myscript/LoginScreen");
          return;
        }

        const session: UserSession = JSON.parse(sessionStr);
        const token = session?.token;
        if (!token) {
          await AsyncStorage.removeItem("userSession");
          router.replace("../myscript/LoginScreen");
          return;
        }

        // ✅ decode the token safely
        let decoded: DecodedToken;
        try {
          decoded = jwtDecode<DecodedToken>(token);
          console.log("🔹 Decoded Token:", decoded);
        } catch (e) {
          Toast.show({ type: "error", text1: "Invalid token", text2: "Please login again." });
          await AsyncStorage.removeItem("userSession");
          router.replace("../myscript/LoginScreen");
          return;
        }

        // ✅ check expiry
        const now = Date.now() / 1000;
        if (decoded.exp && decoded.exp < now) {
          await AsyncStorage.removeItem("userSession");
          Toast.show({ type: "info", text1: "Session expired", text2: "Login again" });
          router.replace("../myscript/LoginScreen");
          return;
        }

        // ✅ Build CurrentUser from JWT fields that actually exist
        const currentUser: CurrentUser = {
          name: decoded.userDisplayName || "Guest",
          email: decoded.userEmail || "",
          mobile: decoded.userMobile || "",
          role: decoded.userRole || "Visitor",
          userId: decoded.userId || "",
          corpId: decoded.corporateId || "",
          corpName: decoded.corporateName || "",
          corpEmail: decoded.corporateEmail || "",
          corpAdminId: decoded.corpAdminId || "",
          profileImage:
            decoded.profileImage || "https://cdn-icons-png.flaticon.com/512/3135/3135718.png",
          token,
        };

        setUser(currentUser);

        // ✅ Filter menu items by role
        const filtered = (menuItems as MenuItem[]).filter(
          (item) => item.role.toLowerCase() === currentUser.role.toLowerCase()
        );

        setFilteredMenu(filtered);
        if (filtered.length > 0) setActiveTab(filtered[0].screen);
      } catch (err) {
        console.error("Session Error:", err);
        Toast.show({ type: "error", text1: "Session Error", text2: String(err) });
        await AsyncStorage.removeItem("userSession");
        router.replace("../myscript/LoginScreen");
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleMenuSelect = async (action: string) => {
    closeMenu();
    try {
      if (action === "logout") {
        await AsyncStorage.removeItem("userSession");
        Toast.show({ type: "success", text1: "Logged Out" });
        router.replace("../myscript/LoginScreen");
      } else if (action === "update") router.push("/update-profile");
      else if (action === "settings") router.push("/settings");
    } catch (err) {
      Toast.show({ type: "error", text1: "Error", text2: String(err) });
    }
  };

  const handleTabPress = (screen: string) => {
    setActiveTab(screen);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const renderTabBar = () => (
    <View style={styles.tabBarContainer}>
      {filteredMenu.length > 0 ? (
        filteredMenu.map((item) => {
          const isActive = activeTab === item.screen;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.tabItem, isActive && styles.activeTabItem]}
              onPress={() => handleTabPress(item.screen)}
              activeOpacity={0.9}
            >
              <Animated.View
                style={{
                  transform: [{ scale: isActive ? scaleAnim : 1 }],
                  alignItems: "center",
                }}
              >
                <MaterialIcons
                  name={item.icon}
                  size={isActive ? 26 : 22}
                  color={isActive ? "#fff" : "#444"}
                />
                <Text style={[styles.tabText, isActive && styles.activeTabText]} numberOfLines={1}>
                  {item.name}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })
      ) : (
        <Text style={styles.noMenuText}>No menu available</Text>
      )}
    </View>
  );

  const renderBody = () => {
    if (!user) return null;

    if (!user.corpId) {
      return (
        <View style={styles.centerBody}>
          <Text style={styles.warningText}>User not linked with any corporate.</Text>
        </View>
      );
    }

    return (
      <LeadByStatusScreen
        token={user.token}
        status={activeTab}
        corpId={user.corpId}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: "#444" }}>Verifying user...</Text>
      </View>
    );
  }

  return (
    <Provider>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Image source={{ uri: user?.profileImage }} style={styles.profileImage} />
            <View>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.subtitle}>
                {user?.corpName ? `${user.corpName}` : "Guest"} ({user?.role})
              </Text>
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
              leadingIcon={() => <MaterialIcons name="person-outline" size={22} color="#333" />}
            />
            <Divider />
            <Menu.Item
              onPress={() => handleMenuSelect("settings")}
              title="Settings"
              leadingIcon={() => <MaterialIcons name="settings" size={22} color="#333" />}
            />
            <Menu.Item
              onPress={() => handleMenuSelect("logout")}
              title="Logout"
              leadingIcon={() => <MaterialIcons name="logout" size={22} color="#d32f2f" />}
            />
          </Menu>
        </View>

        <View style={{ flex: 1 }}>{renderBody()}</View>
        {renderTabBar()}
        <Toast />
      </View>
    </Provider>
  );
}

//
// 🎨 Styles
//
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  name: { fontSize: 18, fontWeight: "bold", color: "#222" },
  subtitle: { fontSize: 14, color: "#666" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  centerBody: { flex: 1, justifyContent: "center", alignItems: "center" },
  warningText: { color: "#ff4d4d", fontSize: 16, fontWeight: "700", textAlign: "center" },
  tabBarContainer: {
    position: "absolute",
    bottom: 20,
    left: 1,
    right: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 25,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 1,
    elevation: 1,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", marginHorizontal: 5 },
  activeTabItem: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabText: { fontSize: 12, color: "#777", marginTop: 3 },
  activeTabText: { color: "#fff", fontWeight: "700" },
  noMenuText: { textAlign: "center", color: "#888", fontSize: 13, fontStyle: "italic" },
});
