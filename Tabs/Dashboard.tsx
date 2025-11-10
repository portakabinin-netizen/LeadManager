import Icon from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { getSocket } from "../../../../hooks/Socket";
import LeadService from "./leadservices";

const screenWidth = Dimensions.get("window").width;

export default function LeadAnalyticsDashboard() {
  const socket = getSocket();
  const [dashboardData, setDashboardData] = useState<any>({ leads: { grouped: [] } });
  const [period, setPeriod] = useState<{ start: Date; end: Date }>({ start: getMonday(new Date()), end: getSunday(new Date()) });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  function getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }
  function getSunday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + 7;
    return new Date(date.setDate(diff));
  }
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const fetchDashboard = async (start = period.start, end = period.end) => {
    try {
      const data = await LeadService.getDashboardData(formatDate(start), formatDate(end));
      if (!data?.leads?.grouped) data.leads.grouped = [];

      if (data.leads.grouped.length && data.leads.groupBy === "source,status") {
        const reshaped = Object.values(
          data.leads.grouped.reduce((acc: any, item: any) => {
            const source = item._id.source || "Unknown";
            const status = item._id.status || "Unknown";
            if (!acc[source]) acc[source] = { _id: source, statusBreakdown: [] };
            acc[source].statusBreakdown.push({ status, count: item.total || 0 });
            return acc;
          }, {})
        );
        data.leads.grouped = reshaped;
      }
      setDashboardData(data);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setDashboardData({ leads: { grouped: [] } });
    }
  };

  const refreshDashboard = () => fetchDashboard(period.start, period.end);

  useEffect(() => {
    refreshDashboard();
    socket.on("lead:refresh", refreshDashboard);
    return () => socket.off("lead:refresh", refreshDashboard);
  }, []);

  const handleMenuSelect = (option: string) => {
    setMenuVisible(false);
    const today = new Date();
    if (option === "This Week") {
      const start = getMonday(today);
      const end = getSunday(today);
      setPeriod({ start, end });
      fetchDashboard(start, end);
    } else if (option === "Last Week") {
      const lastMonday = getMonday(new Date(today.setDate(today.getDate() - 7)));
      const lastSunday = getSunday(lastMonday);
      setPeriod({ start: lastMonday, end: lastSunday });
      fetchDashboard(lastMonday, lastSunday);
    } else if (option === "Custom Period") {
      setShowStartPicker(true);
    }
  };

  const statusColors: Record<string, string> = {
    Recent: "#4CAF50",
    Engaged: "#1E88E5",
    Accepted: "#E91E63",
    Default: "#607D8B",
  };
  const displayStatuses = ["Recent", "Engaged", "Accepted"];

  const prepareLeadData = () => {
    const leadsGrouped = dashboardData?.leads?.grouped || [];
    if (!leadsGrouped.length) return { sources: [], dataMatrix: [], maxValue: 1 };

    const sources = leadsGrouped.map((g) => g._id);
    const dataMatrix = displayStatuses.map((status) =>
      sources.map((_, colIdx) => {
        const g = leadsGrouped[colIdx];
        const found = g?.statusBreakdown?.find((s) => s.status === status);
        return found?.count ?? 0;
      })
    );
    const maxValue = Math.max(...dataMatrix.flat(), 1);
    return { sources, dataMatrix, maxValue };
  };

  const leadChartData = prepareLeadData();

  return (
    <ScrollView style={{ flex: 1, padding: 12, backgroundColor: "#fff" }}>
      {/* Top Bar */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>Period</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity onPress={refreshDashboard}>
            <Icon name="refresh" size={26} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <Icon name="more-vert" size={26} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={{ fontSize: 14, color: "#666", marginVertical: 4 }}>
        {formatDate(period.start)} → {formatDate(period.end)}
      </Text>

      {/* Lead Analytics */}
      <Text style={{ fontSize: 18, fontWeight: "bold", marginVertical: 8 }}>Lead Analytics</Text>

      {leadChartData.sources.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", paddingBottom: 20 }}>
            {leadChartData.sources.map((source, colIdx) => (
              <View key={`source-${source}-${colIdx}`} style={{ marginRight: 16, alignItems: "center" }}>
                {displayStatuses.map((status, rowIdx) => {
                  const value = leadChartData.dataMatrix[rowIdx][colIdx];
                  const barHeight = (value / leadChartData.maxValue) * 220;
                  return (
                    <View
                      key={`bar-${source}-${status}-${rowIdx}`}
                      style={{
                        width: 30,
                        height: barHeight,
                        backgroundColor: statusColors[status] || statusColors.Default,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {value > 0 && <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>{value}</Text>}
                    </View>
                  );
                })}
                <Text style={{ marginTop: 4, fontSize: 12, textAlign: "center" }}>{source}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <Text style={{ textAlign: "center", color: "#999", marginTop: 20 }}>No lead data available</Text>
      )}

      {/* Legend */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
        {displayStatuses.map((status) => (
          <View key={`legend-${status}`} style={{ flexDirection: "row", alignItems: "center", marginRight: 12, marginBottom: 4 }}>
            <View style={{ width: 16, height: 16, backgroundColor: statusColors[status] || statusColors.Default, marginRight: 4, borderRadius: 2 }} />
            <Text style={{ fontSize: 12 }}>{status}</Text>
          </View>
        ))}
      </View>

      {/* Menu Modal */}
      <Modal transparent animationType="fade" visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)" }} onPress={() => setMenuVisible(false)}>
          <View style={{ position: "absolute", top: 50, right: 15, backgroundColor: "#fff", borderRadius: 8, padding: 8, width: 160 }}>
            {["This Week", "Last Week", "Custom Period"].map((opt) => (
              <TouchableOpacity key={`menu-${opt}`} style={{ paddingVertical: 8, borderBottomWidth: opt === "Custom Period" ? 0 : 0.5, borderColor: "#ddd" }} onPress={() => handleMenuSelect(opt)}>
                <Text style={{ fontSize: 15 }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={period.start}
          mode="date"
          display="calendar"
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) {
              setPeriod((prev) => ({ ...prev, start: selectedDate }));
              setShowEndPicker(true);
            }
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={period.end}
          mode="date"
          display="calendar"
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) {
              const newPeriod = { ...period, end: selectedDate };
              setPeriod(newPeriod);
              fetchDashboard(newPeriod.start, newPeriod.end);
            }
          }}
        />
      )}
    </ScrollView>
  );
}
