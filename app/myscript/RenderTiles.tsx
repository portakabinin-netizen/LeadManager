import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import LeadService from "./leadservices";
import LeadTile from "./LeadTileViews";
import { Lead } from "./TileFormat";

interface Props {
  status: "Recent" | "Engaged" | "Accepted" | "Restore" | "Recycle";
}

const LeadTiles = forwardRef(({ status }: Props, ref) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = async () => {
  try {
    setRefreshing(true);
    const response = await LeadService.getLeadsByStatus(status);

    // If backend returns { success: true, data: [...] }
    const leadsArray = response?.data || response || [];

    setLeads(leadsArray);
  } catch (err: any) {
    Toast.show({ type: "error", text1: err.message || "Failed to fetch leads" });
  } finally {
    setRefreshing(false);
  }
};


  useEffect(() => {
    fetchLeads();
  }, [status]);

  useImperativeHandle(ref, () => ({ fetchLeads }));

  return (
    <ScrollView
      style={{ flex: 1, padding: 10, backgroundColor: "#f8f9fa" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLeads} />}
    >
      {leads.length > 0 ? (
        leads.map((lead, index) => (
          <LeadTile
            key={lead._id || index.toString()}
            lead={lead}
            status={status}
            serialNo={index + 1}
            fetchLeads={fetchLeads}
          />
        ))
      ) : (
        <View style={{ alignItems: "center", marginTop: 50 }}>
          <Text style={{ color: "#666", fontSize: 16 }}>Nothing to show</Text>
        </View>
      )}
      <Toast />
    </ScrollView>
  );
});

export default LeadTiles;
