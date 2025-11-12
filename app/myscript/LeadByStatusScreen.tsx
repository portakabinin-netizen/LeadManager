// LeadByStatusScreen.tsx
import api_url from "@/backend/routes/base_url";
import { Leads } from "@/hooks/interface";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LeadTile from "./RenderLeadTile";

interface LeadByStatusScreenProps {
  token: string;
  status: string;
  cropId: string;
}

const LeadByStatusScreen: React.FC<LeadByStatusScreenProps> = ({
  token,
  status,
  cropId,
}) => {
  const [leads, setLeads] = useState<Leads[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadsByStatus();
  }, [status]);

  const fetchLeadsByStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${api_url}/service/leads/status/${status}?corporateId=${cropId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(
        "🟩 Query for getLeadsByStatus:",
        `${api_url}/service/leads/status/${status}?corporateId=${cropId}`
      );

      if (res.data.success) {
        setLeads(res.data.data);
      } else {
        Toast.show({
          type: "error",
          text1: "Failed to load leads",
          text2: res.data.message || "Please try again later.",
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error fetching leads",
        text2: error.response?.data?.message || "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ color: "#666", marginTop: 8 }}>Loading leads...</Text>
      </View>
    );
  }

  if (leads.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: "#777" }}>No leads found for "{status}"</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={leads}
      keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
      renderItem={({ item }) => (
        <LeadTile
          item={item}
          token={token}
          onStatusChange={fetchLeadsByStatus}
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
    />
  );
};

export default LeadByStatusScreen;

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
  },
});
