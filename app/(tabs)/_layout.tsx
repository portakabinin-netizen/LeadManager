import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import Icon from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { OpaqueColorValue, Text, TouchableOpacity, View } from "react-native";
import { getSocket } from "../../hooks/Socket";
import styles from "../../scripts/styles";
import leadservices, * as leadService from "../myscript/leadservices";
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const socket = getSocket();

  // ✅ Define tabs array outside JSX to use in loops
  const TABS = [
    { name: "Dashboard", icon: "dashboard" },
    { name: "Recent", icon: "mark-email-unread" },
    { name: "Engaged", icon: "support-agent" },
    { name: "Accepted", icon: "check-circle-outline" },
    { name: "Restore", icon: "restore" },
    { name: "Recycle", icon: "delete" },
  ];

  const [counts, setCounts] = useState({
    Recent: 0,
    Engaged: 0,
    Accepted: 0,
    Recycle: 0,
    Restore: 0,
  });

  type LeadCounts = {
  Recent: number;
  Engaged: number;
  Accepted: number;
  Recycle: number;
  Restore: number;
};

  // ✅ Fetch lead counts per tab
  const fetchLeadCounts = async () => {
  try {
    // ✅ Declare a typed record so TypeScript knows we’re using string keys and number values
    const newCounts: LeadCounts = { ...counts };

    for (const tab of TABS) {
     const res = await leadService.countLeadsByStatus(tab.name);
     newCounts[tab.name as keyof LeadCounts] = res?.count ?? 0;
    }

    setCounts(newCounts);
  } catch (error) {
    console.error("Error fetching tab lead counts:", error);
  }
};


  // ✅ Total count for header badge
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  // ✅ Fetch once on mount + refresh every 30s
  useEffect(() => {
    fetchLeadCounts();
    const interval = setInterval(fetchLeadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Instant refresh whenever the tab layout regains focus
  useFocusEffect(
    React.useCallback(() => {
      fetchLeadCounts();
    }, [])
  );

  const handleSync = async () => {
    //const result = await fetchAndSyncLeads();
   const { apiUrl, emailUrl } = await leadService.getUrlInfo();
   const fetchResult = await leadservices.getAndSaveLeads(apiUrl,emailUrl);    
  };

  const renderIconWithBadge = (name: string | undefined, color: string | OpaqueColorValue | undefined, count: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined) => (
    <View>
      <Icon name={name} size={30} color={color} />
      <View
        style={{
          position: "absolute",
          right: -6,
          top: -4,
          backgroundColor: count > 0 ? "darkgreen" : "red",
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
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 🔔 Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>portakabin.in</Text>
        <TouchableOpacity
          onPress={handleSync}
          style={{ marginLeft: 10 }}
        >
          <View>
            <Icon name="file-download" size={28} color="#007AFF" />
            <View
              style={{
                position: "absolute",
                right: -6,
                top: -4,
                backgroundColor: totalCount > 0 ? "red" : "gray",
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
                {totalCount}
              </Text>
            </View>
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
                const count = counts[tab.name as keyof typeof counts] ?? 0;
                // Show badge only if tab is not "Dashboard"
                return tab.name === "Dashboard"
                  ? <Icon name={tab.icon} size={24} color={color} />
                  : renderIconWithBadge(tab.icon, color, count);
              },
            }}
                      />
          ))}
        </Tabs>
      </View>
    </View>
  );
}
