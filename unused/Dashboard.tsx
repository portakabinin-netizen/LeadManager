import Icon from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { getSocket } from "../../hooks/Socket";
import LeadService, { Lead } from "../myscript/leadservices";

export default function LeadAnalyticsDashboard() {
  const socket = getSocket();
  const screenWidth = Dimensions.get("window").width;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [financePerSource, setFinancePerSource] = useState<
    { source: string; totalDr: number; totalCr: number; balance: number }[]
  >([]);
  const [period, setPeriod] = useState<{ start: Date; end: Date }>({
    start: getMonday(new Date()),
    end: getSunday(new Date()),
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [perSourceData, setPerSourceData] = useState<
    { source: string; total: number; data: any[] }[]
  >([]);

  // Helper Functions
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

  // ✅ Fetch Leads
  const fetchLeads = async (start = period.start, end = period.end) => {
    try {
      const data = await LeadService.getLeadsByPeriod(
        formatDate(start),
        formatDate(end)
      );

      if (!Array.isArray(data)) {
        console.warn("LeadService.getLeadsByPeriod returned invalid data", data);
        setLeads([]);
        return;
      }

      setLeads(data);

      // ---- Lead Analytics ----
      const agg: Record<
        string,
        { total: number; fresh: number; recent: number; engaged: number; accepted: number }
      > = {};

      data.forEach((lead: Lead) => {
        const src = lead.source || "Unknown";
        if (!agg[src])
          agg[src] = { total: 0, fresh: 0, recent: 0, engaged: 0, accepted: 0 };
        agg[src].total++;
        const status = (lead.status || "").toLowerCase();
        if (status === "fresh") agg[src].fresh++;
        else if (status === "recent") agg[src].recent++;
        else if (status === "engaged") agg[src].engaged++;
        else if (status === "accepted") agg[src].accepted++;
      });

      const colors = ["#FFA726", "#4CAF50", "#1E88E5", "#E91E63"];
      const perSource: { source: string; total: number; data: any[] }[] = [];

      Object.keys(agg).forEach((src) => {
        const item = agg[src];
        const dataItems = [
          { name: "Fresh", population: item.fresh, color: colors[0] },
          { name: "Recent", population: item.recent, color: colors[1] },
          { name: "Engaged", population: item.engaged, color: colors[2] },
          { name: "Accepted", population: item.accepted, color: colors[3] },
        ];
        perSource.push({ source: src, total: item.total, data: dataItems });
      });

      setPerSourceData(perSource);

      // Fetch Finance Data
      await fetchFinance();
    } catch (err: any) {
      console.error("Lead fetch failed:", err.message);
      setPerSourceData([]);
      setFinancePerSource([]);
    }
  };

  // ✅ Fetch Finance Analytics
  
  const fetchFinance = async () => {
    try {
      const financeData = await LeadService.getFinanceAnalytics();

      if (!Array.isArray(financeData)) {
        console.warn("Finance data invalid:", financeData);
        setFinancePerSource([]);
        return;
      }

      const financeAgg: Record<
        string,
        { totalDr: number; totalCr: number; balance: number }
      > = {};

      financeData.forEach((item: FinanceAnalytics) => {
        const src = item.source || "Unknown";
        financeAgg[src] = {
          totalDr: (financeAgg[src]?.totalDr || 0) + (item.totalDr || 0),
          totalCr: (financeAgg[src]?.totalCr || 0) + (item.totalCr || 0),
          balance: (financeAgg[src]?.balance || 0) + (item.balance || 0),
        };
      });

      const financeArray = Object.keys(financeAgg).map((src) => ({
        source: src,
        ...financeAgg[src],
      }));

      setFinancePerSource(financeArray);
    } catch (e) {
      console.error("Finance fetch failed:", e);
      setFinancePerSource([]);
    }
  };
 
  const refreshDashboard = () => fetchLeads(period.start, period.end);

  // ✅ Initial Mount + Socket Refresh
  useEffect(() => {
    refreshDashboard();
    socket.on("lead:refresh", refreshDashboard);
    return () => socket.off("lead:refresh", refreshDashboard);
  }, []);

  // ✅ Menu Selection
  const handleMenuSelect = (option: string) => {
    setMenuVisible(false);
    const today = new Date();

    if (option === "This Week") {
      const start = getMonday(today);
      const end = getSunday(today);
      setPeriod({ start, end });
      fetchLeads(start, end);
    } else if (option === "Last Week") {
      const lastMonday = getMonday(new Date(today.setDate(today.getDate() - 7)));
      const lastSunday = getSunday(lastMonday);
      setPeriod({ start: lastMonday, end: lastSunday });
      fetchLeads(lastMonday, lastSunday);
    } else if (option === "Custom Period") {
      setShowStartPicker(true);
    }
  };

  const maxColumns = 2;
  const totalSpacing = 12 * (maxColumns + 1);
  const columnWidth = (screenWidth - totalSpacing) / maxColumns;

  // ✅ UI Render
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff", padding: 12 }}>
      {/* Top bar */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
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
      <Text style={{ fontSize: 18, fontWeight: "bold", marginVertical: 8 }}>
        Lead Analytics
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {perSourceData.map((item, idx) => (
          <View
            key={idx}
            style={{ width: columnWidth, alignItems: "center", marginVertical: 6 }}
          >
            <Text
              style={{
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {item.source} ({item.total})
            </Text>
            <PieChart
              data={item.data.map((d) => ({ ...d, population: d.population || 0 }))}
              width={columnWidth - 1}
              height={100}
              chartConfig={{ backgroundColor: "transparent", color: () => "#000" }}
              accessor="population"
              backgroundColor="transparent"
              absolute
              hasLegend
            />
          </View>
        ))}
      </View>

      {/* Finance Analytics */}
      <Text style={{ fontSize: 18, fontWeight: "bold", marginVertical: 12 }}>
        Finance Analytics
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {financePerSource.map((f, idx) => {
          const data = [
            { name: "Debit", population: f.totalDr, color: "#4CAF50" },
            { name: "Credit", population: f.totalCr, color: "#F44336" },
          ];
          return (
            <View
              key={idx}
              style={{ width: columnWidth, alignItems: "center", marginVertical: 6 }}
            >
              <Text
                style={{
                  fontWeight: "600",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {f.source} (Bal: {f.balance})
              </Text>
              <PieChart
                data={data}
                width={columnWidth - 12}
                height={100}
                chartConfig={{ backgroundColor: "transparent", color: () => "#000" }}
                accessor="population"
                backgroundColor="transparent"
                absolute
                hasLegend
              />
            </View>
          );
        })}
      </View>

      {/* Menu Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)" }}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={{
              position: "absolute",
              top: 50,
              right: 15,
              backgroundColor: "#fff",
              borderRadius: 8,
              elevation: 5,
              padding: 8,
              width: 160,
            }}
          >
            {["This Week", "Last Week", "Custom Period"].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={{
                  paddingVertical: 8,
                  borderBottomWidth: opt === "Custom Period" ? 0 : 0.5,
                  borderColor: "#ddd",
                }}
                onPress={() => handleMenuSelect(opt)}
              >
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
              fetchLeads(newPeriod.start, newPeriod.end);
            }
          }}
        />
      )}
    </ScrollView>
  );
}
