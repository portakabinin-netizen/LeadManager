import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import Icon from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { Tabs } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import { getSocket } from "../../hooks/Socket";
import styles from "../../scripts/styles";
import {
  refreshLeadCounts as fetchLeadCounts,
  handleSync,
  LeadCounts,
  sendWhatsAppMessageWithImage,
} from "../myscript/appFunctions";

type MaterialIconName = keyof typeof Icon.glyphMap;

interface TabItem {
  name: Exclude<keyof LeadCounts, "Unread"> | "Dashboard";
  icon?: MaterialIconName;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const socket = getSocket();

  const TABS: TabItem[] = [
    { name: "Dashboard", icon: "dashboard" },
    { name: "Recent", icon: "mark-email-unread" },
    { name: "Engaged", icon: "support-agent" },
    { name: "Accepted", icon: "check-circle-outline" },
    { name: "Restore", icon: "restore" },
    { name: "Recycle", icon: "delete" },
  ];

  const [counts, setCounts] = useState<LeadCounts>({
    Unread: 0,
    Recent: 0,
    Engaged: 0,
    Accepted: 0,
    Recycle: 0,
    Restore: 0,
  });

  const [loading, setLoading] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const unreadCount = counts.Unread || 0;

  // Refresh lead counts from backend
  const refreshLeadCounts = useCallback(async () => {
    const newCounts = await fetchLeadCounts();
    setCounts(newCounts);
  }, []);

  useEffect(() => {
    refreshLeadCounts();
    const interval = setInterval(refreshLeadCounts, 30000);
    return () => clearInterval(interval);
  }, [refreshLeadCounts]);

  useFocusEffect(
    useCallback(() => {
      refreshLeadCounts();
    }, [refreshLeadCounts])
  );

  // Handle WhatsApp message sending
const handleWhatsAppSend = async () => {
  try {
    setSendingWhatsApp(true);

    const phone = "+919212790790";
    const message = "Welcome to portakabin.in, We received your enquiry from";
    const imageUrl = "https://www.portakabin.in/company-profile.html";

    // Get the actual response message
    const result = await sendWhatsAppMessageWithImage(phone, message, imageUrl);

    Toast.show({
      type: result.success ? "success" : "error",
      text1: result.message,
      position: "top",
    });
  } catch (error) {
    Toast.show({
      type: "error",
      text1: "Something went wrong",
      text2: error instanceof Error ? error.message : String(error),
      position: "top",
    });
  } finally {
    setSendingWhatsApp(false);
  }
};


  // Render icon with badge
  const renderIconWithBadge = (
    name: MaterialIconName | undefined,
    color: string | undefined,
    count: number
  ) => (
    <View>
      {name && <Icon name={name} size={30} color={color} />}
      {count > 0 && (
        <View
          style={{
            position: "absolute",
            right: -6,
            top: -4,
            backgroundColor: "darkgreen",
            borderRadius: 10,
            paddingHorizontal: 5,
            minWidth: 20,
            height: 18,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 🔹 Header */}
      <View style={[styles.header, { flexDirection: "row", alignItems: "center" }]}>
        <Text style={styles.headerTitle}>portakabin.in</Text>

        {/* Icons group */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* 🔔 Notifications (now sends WhatsApp) */}
          <TouchableOpacity
            onPress={handleWhatsAppSend}
            style={{ marginHorizontal: 10 }}
            disabled={sendingWhatsApp}
          >
            {sendingWhatsApp ? (
              <ActivityIndicator size={24} color="#25D366" />
            ) : (
              <View>
                <Icon name="handshake" size={28} color="#25D366" />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      right: -6,
                      top: -4,
                      borderRadius: 10,
                      paddingHorizontal: 5,
                      minWidth: 18,
                      height: 18,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ color: "white", fontSize: 10, fontWeight: "bold" }}
                    >
                  </Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* ⬇️ Download (sync leads) */}
          <TouchableOpacity
            onPress={() => handleSync(setLoading, refreshLeadCounts)}
            style={{ marginLeft: 10 }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size={24} color="#007AFF" />
            ) : (
              <View>
                <Icon name="file-download" size={28} color="#007AFF" />
                <View
                  style={{
                    position: "absolute",
                    right: -6,
                    top: -4,
                    backgroundColor: unreadCount > 0 ? "red" : "gray",
                    borderRadius: 10,
                    paddingHorizontal: 5,
                    minWidth: 18,
                    height: 18,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 10, fontWeight: "bold" }}
                  >
                    {unreadCount}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 🧭 Tabs */}
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[colorScheme ?? "dark"].tint,
            headerShown: false,
            tabBarButton: HapticTab,
          }}
        >
          {TABS.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.name,
                tabBarIcon: ({ color }) => {
                  const count =
                    counts[tab.name as keyof Omit<LeadCounts, "Unread">] ?? 0;
                  return tab.name === "Dashboard"
                    ? (
                      <Icon name={tab.icon!} size={24} color={color} />
                    ) : (
                      renderIconWithBadge(tab.icon, color, count)
                    );
                },
              }}
            />
          ))}
        </Tabs>
      </View>

      <Toast />
    </View>
  );
}
