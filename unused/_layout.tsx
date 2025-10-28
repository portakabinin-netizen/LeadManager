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
import leadservices, * as leadService from "../myscript/leadservices";

type MaterialIconName = keyof typeof Icon.glyphMap;

type LeadCounts = {
  Unread: number;
  Recent: number;
  Engaged: number;
  Accepted: number;
  Recycle: number;
  Restore: number;
};

interface TabItem {
  name: Exclude<keyof LeadCounts, "Unread"> | "Dashboard";
  icon?: MaterialIconName;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const socket = getSocket();

  // ✅ Tabs to show (Unread is not part of navigation)
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

  const [loading, setLoading] = useState(false); // ✅ Loading spinner state
  const unreadCount = counts.Unread || 0;

  // ✅ Unified refresh function (used everywhere)
  const refreshLeadCounts = useCallback(async () => {
    try {
      const statuses: (keyof LeadCounts)[] = [
        "Unread",
        "Recent",
        "Engaged",
        "Accepted",
        "Recycle",
        "Restore",
      ];

      const results = await Promise.all(
        statuses.map(async (status) => {
          try {
            const res = await leadService.countLeadsByStatus(status);
            return { status, count: res?.count ?? 0 };
          } catch {
            return { status, count: 0 };
          }
        })
      );

      const newCounts = results.reduce(
        (acc, { status, count }) => ({ ...acc, [status]: count }),
        {} as LeadCounts
      );

      setCounts(newCounts);
      
    } catch (error) {
      console.error("❌ Error refreshing lead counts:", error);
    }
  }, []);

  // ✅ Refresh on mount + every 30 seconds
  useEffect(() => {
    refreshLeadCounts();
    const interval = setInterval(refreshLeadCounts, 30000);
    return () => clearInterval(interval);
  }, [refreshLeadCounts]);

  // ✅ Refresh when screen refocuses
  useFocusEffect(
    useCallback(() => {
      refreshLeadCounts();
    }, [refreshLeadCounts])
  );

   // ✅ Send welcome message to new clients
  const sendWelcomeMsg = async (): Promise<void> => {
    if (loading) return; // prevent double tap
    setLoading(true);

    try {
      Toast.show({
        type: "info",
        text1: "🔄 Sync in progress...",
        text2: "Fetching new leads from backend",
        position: "bottom",
      });

      
      Toast.show({
        type: "success",
        text1: "Welcome Message Sent.",
        position: "top",
      });
    } catch (error: any) {
      console.error("❌ Sync error:", error);
      Toast.show({
        type: "error",
        text1: "Sync failed",
        text2: error?.message || "Something went wrong. Try again later.",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Sync handler (shows spinner and toasts)
  const handleSync = async (): Promise<void> => {
    if (loading) return; // prevent double tap
    setLoading(true);

    try {
      Toast.show({
        type: "info",
        text1: "🔄 Sync in progress...",
        text2: "Fetching new leads from backend",
        position: "bottom",
      });

      const { apiUrl, emailUrl } = await leadService.getUrlInfo();
      const result: { count?: number; message?: string } =
        await leadservices.getAndSaveLeads(apiUrl, emailUrl);

      await refreshLeadCounts();

      Toast.show({
        type: "success",
        text1: "✅ Sync complete!",
        text2: `${result?.count ?? 0} new leads received.`,
        position: "top",
      });
    } catch (error: any) {
      console.error("❌ Sync error:", error);
      Toast.show({
        type: "error",
        text1: "Sync failed",
        text2: error?.message || "Something went wrong. Try again later.",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Badge + Icon Renderer
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>portakabin.in</Text>
        
        {/*Send Welcome message to new leads*/}

        <TouchableOpacity
          onPress={sendWelcomeMsg}
          style={{ marginLeft: 10 }}
          disabled={loading}
        >
          <View>
            {loading ? (
              <ActivityIndicator size={24} color="#007AFF" />
            ) : (
              <>
                <Icon name="notifications" size={28} color="#341de2ff" />
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
                    style={{
                      color: "white",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {unreadCount}
                  </Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/*Fected and save leads to collection */}
        <TouchableOpacity
          onPress={handleSync}
          style={{ marginLeft: 10 }}
          disabled={loading}
        >
          <View>
            {loading ? (
              <ActivityIndicator size={24} color="#007AFF" />
            ) : (
              <>
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
                    style={{
                      color: "white",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {unreadCount}
                  </Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
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
                    ? <Icon name={tab.icon!} size={24} color={color} />
                    : renderIconWithBadge(tab.icon, color, count);
                },
              }}
            />
          ))}
        </Tabs>
      </View>

      {/* ✅ Toast container */}
      <Toast />
    </View>
  );
}
