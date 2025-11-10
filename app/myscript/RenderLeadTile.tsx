// RenderLeadTile.tsx
import api_url from "@/backend/routes/base_url";
import { Leads } from "@/hooks/interface";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import React, { useState } from "react";
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

interface LeadTileProps {
  item: Leads;
  token: string;
  onStatusChange?: () => void;
  currentUser?: string;
}

const LeadTile: React.FC<LeadTileProps> = ({
  item,
  token,
  onStatusChange,
  currentUser = "System",
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [lastTap, setLastTap] = useState<number>(0);
  const [statusModal, setStatusModal] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // Ledger fields
  const [ledgerData, setLedgerData] = useState({
    date: new Date().toISOString().split("T")[0],
    narration: "",
    amount: "",
    type: "Dr",
    account_title: "",
    byUser: currentUser,
  });

  const [isReceived, setIsReceived] = useState(false); // toggle for Cr/Dr

  const handleLedgerChange = (field: string, value: string) => {
    setLedgerData((prev) => ({ ...prev, [field]: value }));
  };

  const saveLedgerEntry = async () => {
    try {
      const payload = {
        ...ledgerData,
        type: isReceived ? "Cr" : "Dr",
        lead_id: item._id,
        amount: Number(ledgerData.amount),
      };
      await axios.post(`${api_url}/service/ledger`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Toast.show({ type: "success", text1: "Ledger entry saved!" });
      setShowLedgerModal(false);
      setLedgerData({
        date: new Date().toISOString().split("T")[0],
        narration: "",
        amount: "",
        type: "Dr",
        account_title: "",
        byUser: currentUser,
      });
      setIsReceived(false);
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to save ledger entry!" });
    }
  };

  const handleDoubleTap = (field: keyof Leads, value: string) => {
    const now = Date.now();
    if (now - lastTap < 300) handleEdit(field, value);
    setLastTap(now);
  };

  const handleEdit = (field: keyof Leads, value: string) => {
    if (field === "source" || field === "status") return;
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    try {
      await axios.put(
        `${api_url}/service/leads/${item._id}`,
        { [editingField]: editValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Toast.show({ type: "success", text1: "Updated successfully!" });
      setEditingField(null);
      onStatusChange?.();
    } catch {
      Toast.show({ type: "error", text1: "Update failed!" });
    }
  };

  const handleCall = () => Linking.openURL(`tel:${item.sender_mobile}`);
  const handleWhatsApp = () =>
    Linking.openURL(`https://wa.me/${item.sender_mobile}`);
  const handleSMS = () => Linking.openURL(`sms:${item.sender_mobile}`);
  const handleEmail = () =>
    item.sender_email && Linking.openURL(`mailto:${item.sender_email}`);

  const statusOptions: Record<string, string[]> = {
    Recent: ["Engaged", "Recycle"],
    Engaged: ["Accepted", "Recycle"],
    Accepted: ["Restore"],
    Restore: ["Engaged", "Recycle"],
    Recycle: ["Restore"],
  };
  const availableStatus = statusOptions[item.status] || [];

  const updateStatus = async (newStatus: string) => {
    try {
      await axios.put(
        `${api_url}/service/leads/${item._id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Create ledger when accepted
      if (newStatus === "Accepted") {
        const ledgerPayload = {
          lead_id: item._id,
          date: new Date(),
          byUser: currentUser,
          narration: "Opening balance created automatically",
          amount: 0,
          type: "Dr",
          account_title: item.sender_name,
        };
        await axios.post(`${api_url}/service/ledger`, ledgerPayload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      Toast.show({ type: "success", text1: `Status changed to ${newStatus}` });
      setStatusModal(false);
      onStatusChange?.();
    } catch {
      Toast.show({ type: "error", text1: "Failed to change status!" });
    }
  };

  const activities = Array.isArray(item.activity) ? item.activity : [];
  const lastActivity =
    activities.length > 0 ? activities[activities.length - 1] : null;

  return (
    <View style={styles.tile}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.leadNo}>Lead #{item.lead_no}</Text>

        {/* Accepted leads show Project */}
        {item.status === "Accepted" ? (
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: "#007AFF" }]}
            onPress={() => setShowLedgerModal(true)}
          >
            <Text style={[styles.statusText, { color: "#fff" }]}>Project</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.statusBadge}
            onPress={() => setStatusModal(true)}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Buyer */}
      <TouchableOpacity
        onPress={() => handleDoubleTap("sender_name", item.sender_name)}
      >
        {editingField === "sender_name" ? (
          <TextInput
            value={editValue}
            onChangeText={setEditValue}
            onBlur={saveEdit}
            style={styles.inputEdit}
            autoFocus
          />
        ) : (
          <Text style={styles.label}>
            Buyer: <Text style={styles.value}>{item.sender_name}</Text>
          </Text>
        )}
      </TouchableOpacity>

      {/* Location */}
      <Text style={styles.label}>
        Location:{" "}
        <Text style={styles.value}>
          {item.sender_city}, {item.sender_state}
        </Text>
      </Text>

      {/* Product */}
      <Text style={styles.label}>
        Product: <Text style={styles.value}>{item.product_name}</Text>
      </Text>

      {/* Contact */}
      <View style={styles.inlineRow}>
        <Text style={styles.label}>
          Contact: <Text style={styles.value}>{item.sender_mobile}</Text>
        </Text>
        <View style={styles.iconGroup}>
          <TouchableOpacity onPress={handleCall}>
            <MaterialIcons name="call" size={18} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleWhatsApp}>
            <FontAwesome name="whatsapp" size={18} color="#25D366" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSMS}>
            <MaterialIcons name="sms" size={18} color="#FF9800" />
          </TouchableOpacity>
          {item.sender_email && (
            <TouchableOpacity onPress={handleEmail}>
              <MaterialIcons name="email" size={18} color="#E53935" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Source */}
      <Text style={styles.label}>
        Source: <Text style={styles.value}>{item.source}</Text>
      </Text>

      {/* Activity */}
      {activities.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => setShowAllActivities(!showAllActivities)}
          >
            <Text style={styles.label}>
              Activity:{" "}
              <Text style={styles.value}>
                {showAllActivities
                  ? "Tap to collapse"
                  : lastActivity
                  ? `${new Date(lastActivity.date).toLocaleDateString()} - ${
                      lastActivity.action
                    } by ${lastActivity.byUser}`
                  : ""}
              </Text>
            </Text>
          </TouchableOpacity>

          {showAllActivities && (
            <View style={styles.activityList}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {activities.map((act: any, i: number) => (
                  <View key={i} style={styles.activityItem}>
                    <Text style={styles.activityRow}>
                      Date:{" "}
                      <Text style={styles.value}>
                        {new Date(act.date).toLocaleDateString()}
                      </Text>
                    </Text>
                    <Text style={styles.activityRow}>
                      Action: <Text style={styles.value}>{act.action}</Text>
                    </Text>
                    <Text style={styles.activityRow}>
                      By: <Text style={styles.value}>{act.byUser}</Text>
                    </Text>
                    {i < activities.length - 1 && (
                      <View style={styles.activityDivider} />
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Ledger Modal */}
      <Modal visible={showLedgerModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Ledger Entry</Text>

            {/* Toggle */}
            <View style={styles.toggleRow}>
              <Text style={{ color: isReceived ? "#4CAF50" : "#E53935" }}>
                {isReceived ? "Received (Cr)" : "Payment (Dr)"}
              </Text>
              <Switch
                value={isReceived}
                onValueChange={setIsReceived}
                trackColor={{ false: "#E53935", true: "#4CAF50" }}
                thumbColor="#fff"
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Date"
              value={ledgerData.date}
              onChangeText={(v) => handleLedgerChange("date", v)}
            />
            <TextInput
              style={styles.input}
              placeholder="Narration"
              value={ledgerData.narration}
              onChangeText={(v) => handleLedgerChange("narration", v)}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount"
              keyboardType="numeric"
              value={ledgerData.amount}
              onChangeText={(v) => handleLedgerChange("amount", v)}
            />
            <TextInput
              style={styles.input}
              placeholder="Account Title"
              value={ledgerData.account_title}
              onChangeText={(v) => handleLedgerChange("account_title", v)}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={saveLedgerEntry}>
                <FontAwesome name="save" size={22} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowLedgerModal(false)}>
                <MaterialIcons name="cancel" size={24} color="#E53935" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal visible={statusModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Change Status</Text>
            {availableStatus.map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.statusOption}
                onPress={() => updateStatus(status)}
              >
                <Text style={styles.optionText}>{status}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setStatusModal(false)}
              style={styles.closeBtn}
            >
              <Text style={{ color: "#007AFF" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LeadTile;

const styles = StyleSheet.create({
  tile: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginVertical: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  leadNo: { fontWeight: "bold", color: "#007AFF" },
  statusBadge: {
    backgroundColor: "#E8F0FE",
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusText: { color: "#007AFF", fontSize: 12 },
  label: { color: "#333", fontSize: 14, marginTop: 4 },
  value: { fontWeight: "600", color: "#000" },
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  iconGroup: { flexDirection: "row", gap: 10 },
  inputEdit: {
    borderBottomWidth: 1,
    borderBottomColor: "#007AFF",
    paddingVertical: 2,
    fontSize: 16,
  },
  activityList: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    marginTop: 6,
    padding: 8,
  },
  activityItem: { marginBottom: 5 },
  activityRow: { fontSize: 13, color: "#444" },
  activityDivider: { height: 1, backgroundColor: "#DDD", marginVertical: 4 },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    width: "80%",
  },
  modalTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    marginTop: 10,
  },
  statusOption: { paddingVertical: 5 },
  optionText: { fontSize: 15, color: "#333" },
  closeBtn: { alignSelf: "flex-end", marginTop: 10 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
});
