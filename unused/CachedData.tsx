import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, ScrollView, Text, View } from "react-native";
import { Lead } from "../myscript/TileFormat"; // import interfaces

// AsyncStorage keys type
type StorageKey = "AllLeads" | "ByStatus" | "BySources" | "ByPeriod";

// API endpoints type
interface Endpoints {
  AllLeads: string;
  ByStatus: string;
  BySources: string;
  ByPeriod: string;
}

import React from "react";

interface Endpoints {
  [key: string]: string;
}

const MultiDataFetcher: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const BASE_URL = "http://192.168.1.12:5000";

  const endpoints: Endpoints = {
    AllLeads: `${BASE_URL}/action/retrieve`,
    ByStatus: `${BASE_URL}/action/retrieve?status=Recent`,
    BySources: `${BASE_URL}/action/retrieve?sources=TradIndia`,
    ByPeriod: `${BASE_URL}/action/retrieve?fromDate=2025-10-05&toDate=2025-10-05`,
  };

  // Fetch API and store only array of leads
  const fetchAndStore = async (key: string, url: string) => {
    try {
      const response = await axios.get(url);
      const data: Lead[] = Array.isArray(response.data?.data) ? response.data.data : [];

      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ Stored ${key} (${data.length} leads)`);
    } catch (err: any) {
      console.error(`❌ Error fetching ${key}:`, err.message);
    }
  };

  // Fetch all datasets
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all(Object.entries(endpoints).map(([key, url]) => fetchAndStore(key, url)));
      setFetched(true);
      console.log("🎯 All data fetched and stored successfully!");
    } catch (err: any) {
      console.error("❌ Error in fetchAllData:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear all stored data
  const clearAllData = async () => {
    const keys = Object.keys(endpoints);
    await AsyncStorage.multiRemove(keys);
    setFetched(false);
    console.log("🧹 All cached data cleared");
  };

  // Show stored data in console
  const showStoredData = async () => {
    const keys = Object.keys(endpoints);
    const results = await AsyncStorage.multiGet(keys);

    console.log("📦 Stored Data:");
    results.forEach(([key, value]) => {
      if (value) {
        try {
          const parsed: Lead[] = JSON.parse(value);
          console.log(`${key} (${parsed.length} leads):`, parsed);
        } catch {
          console.log(`${key}: Unable to parse JSON`);
        }
      } else {
        console.log(`${key}: No data`);
      }
    });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  if (loading)
    return <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />;

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        Multi-Query Data Fetch Example
      </Text>

      <Button title="Refetch All Data" onPress={fetchAllData} />
      <View style={{ marginVertical: 10 }} />
      <Button title="Show Stored Data (console)" onPress={showStoredData} />
      <View style={{ marginVertical: 10 }} />
      <Button title="Clear All Cache" color="red" onPress={clearAllData} />

      {fetched && (
        <Text style={{ marginTop: 20, color: "green" }}>
          ✅ Data fetched and stored successfully!
        </Text>
      )}
    </ScrollView>
  );
};

export default MultiDataFetcher;

