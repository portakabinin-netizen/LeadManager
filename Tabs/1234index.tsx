import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import Icon from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, useRouter } from "expo-router";
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
import { Menu, Provider } from "react-native-paper";
import Toast from "react-native-toast-message";
import RenderTiles from "./(Tabs)/RenderTiles";
import menuItems from "./menuItem.json";

type MaterialIconName = keyof typeof Icon.glyphMap;

export default function SaleHome() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState("Dashboard");

  // 🔐 Verify stored session
  useEffect(() => {
    const verifySession = async () => {
      try {
        const sessionStr = await AsyncStorage.getItem("userSession");
        if (!sessionStr) {
          router.replace("../../myscript/LoginScreen");
          return;
        }

        const session = JSON.parse(sessionStr);
        const token = session?.token;
        if (!token) {
          await AsyncStorage.removeItem("userSession");
          router.replace("../../myscript/LoginScreen");
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
          router.replace("../../myscript/LoginScreen");
          return;
        }

        setUser({
          name: decoded.name || decoded.email || "Guest",
          role: decoded.role || "Visitor",
          userId: decoded.id,
        });
      } catch (error) {
        console.error("Token verification failed:", error);
        await AsyncStorage.removeItem("userSession");
        router.replace("../../myscript/LoginScreen");
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, []);

  // 🍔 Menu actions
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);
  const handleMenuSelect = async (action: string) => {
    closeMenu();
    if (action === "logout") {
      await AsyncStorage.removeItem("userSession");
      Toast.show({
        type: "success",
        text1: "Logged Out",
        position: "top",
      });
      router.replace("../../myscript/LoginScreen");
    }
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text>Verifying user...</Text>
      </View>
    );

  if (!user) return null;

  // 🔹 Tab icon renderer
  const renderIcon = (name: MaterialIconName | undefined, color: string | undefined) =>
    name ? <Icon name={name} size={26} color={color} /> : null;

  return (
    <Provider>
      <View style={styles.container}>
        {/* 🧭 Header */}
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
                <Ionicons name="ellipsis-vertical" size={24} color="#333" />
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => handleMenuSelect("logout")}
              title="Logout"
              leadingIcon="logout"
            />
          </Menu>
        </View>

        {/* 🧱 Body (Tiles Render) */}
        <View style={styles.bodyContainer}>
          <RenderTiles selectedStatus={selectedTab} />
        </View>

        {/* 🧭 Tabs (Above bottom bar) */}
        <View style={styles.footerTabs}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: Colors.light.tint,
              tabBarButton: HapticTab,
              tabBarStyle: {
                height: 70,
                paddingBottom: 10,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                backgroundColor: "#fff",
              },
            }}
            onTabPress={({ route }) => setSelectedTab(route.name)}
          >
            {menuItems.map((item) => (
              <Tabs.Screen
                key={item.id}
                name={item.name}
                options={{
                  title: item.name,
                  tabBarIcon: ({ color }) =>
                    renderIcon(item.icon as MaterialIconName, color),
                }}
              />
            ))}
          </Tabs>
        </View>

        <Toast />
      </View>
    </Provider>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  profileSection: { flexDirection: "row", alignItems: "center" },
  profileImage: { width: 48, height: 48, borderRadius: 24, marginRight: 10 },
  name: { fontSize: 18, fontWeight: "bold", color: "#222" },
  subtitle: { fontSize: 14, color: "#666" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  bodyContainer: { flex: 1 },
  footerTabs: {
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
});
