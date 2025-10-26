import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import io from "socket.io-client";
import styles from "../../scripts/styles";
import { CommentModule, FinanceModule } from "./CommentFinanceModule";
import LeadService from "./leadservices";
import LedgerPrint from "./Ledgerprint";
import { Activity, Lead } from "./TileFormat";

const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
const socket = io(`${expoHost}`, { transports: ["websocket"] });

interface LeadTileProps {
  lead: Lead;
  status: string;
  serialNo: number;
  fetchLeads: () => void;
}

const LeadTile: React.FC<LeadTileProps> = ({ lead, status, serialNo, fetchLeads }) => {
  const [tileData, setTileData] = useState<Lead>({ ...lead });
  const [isEditing, setIsEditing] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [ledgerModalVisible, setLedgerModalVisible] = useState(false);
  const [financeType, setFinanceType] = useState<"Dr" | "Cr">("Dr");

  useEffect(() => {
    socket.on("lead:updated", fetchLeads);
    socket.on("ledger:added", fetchLeads);
    return () => {
      socket.off("lead:updated");
      socket.off("ledger:added");
    };
  }, []);

  const getStatusColor = (st?: string) => {
    const s = (st || status).toLowerCase();
    switch (s) {
      case "recent":
        return "#ffdf5a";
      case "engaged":
        return "#7ed321";
      case "accepted":
        return "#00bfff";
      case "recycle":
        return "#ff5252";
      case "restore":
        return "#ffb3b3";
      default:
        return "#e0e0e0";
    }
  };

  const mobile = tileData.sender_mobile
    ? `+91${tileData.sender_mobile.replace(/^(\+91)/, "")}`
    : "";
  const lastActivity: Activity | null = tileData.activity?.length
    ? tileData.activity[tileData.activity.length - 1]
    : null;

  const formatDateTime = (d?: string | Date) => {
    if (!d) return "-";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "-";
    return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${dt.getFullYear()} ${dt.getHours().toString().padStart(2, "0")}:${dt
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const saveInlineEdit = async () => {
  if (!tileData._id) {
    Toast.show({ type: "error", text1: "Lead ID missing, cannot update" });
    return;
  }

  // Prepare payload strictly for fields that are editable
  const payload = {
    _id: tileData._id,
    sender_name: tileData.sender_name,
    sender_email: tileData.sender_email,
    sender_mobile: tileData.sender_mobile,
    product_name: tileData.product_name,
    sender_city: tileData.sender_city,
    sender_state: tileData.sender_state,
  };

  try {
    await LeadService.saveOrUpdateLeads(payload); 
    setIsEditing(false);
    fetchLeads(); // refresh parent
    Toast.show({ type: "success", text1: "Lead updated successfully" });
  } catch (err: any) {
    Toast.show({ type: "error", text1: err.message || "Failed to update lead" });
  }
};


  const deleteLead = async () => {
    try {
      await LeadService.deleteLead(tileData._id!);
      Toast.show({ type: "success", text1: "Lead deleted" });
      fetchLeads();
    } catch (err: any) {
      Toast.show({ type: "error", text1: err.message || "Failed to delete lead" });
    }
  };

  const handleAction = (action: string) => {
    if (action === "Ledger") return setLedgerModalVisible(true);
    if (action === "Dr" || action === "Cr") {
      setFinanceType(action);
      return setFinanceModalVisible(true);
    }
    if (action === "Delete") return deleteLead();
    setCommentModalVisible(true);
    setTileData({ ...tileData, status: action });
  };

  const getButtons = () => {
    switch (status.toLowerCase()) {
      case "recent":
        return [{ label: "Engaged" }, { label: "Recycle" }];
      case "engaged":
        return [{ label: "Accepted" }, { label: "Recycle" }];
      case "accepted":
        return [
          { label: "Payment", action: "Dr" },
          { label: "Receipt", action: "Cr" },
          { label: "Ledger" },
        ];
      case "restore":
        return [{ label: "Accepted" }, { label: "Recycle" }];
      case "recycle":
        return [{ label: "Restore" }, { label: "Delete" }];
      default:
        return [];
    }
  };

  const handleContact = (type: string) => {
    if (!mobile) return;
    const actions: any = {
      call: `tel:${mobile}`,
      sms: `sms:${mobile}`,
      whatsapp: `whatsapp://send?phone=${mobile}`,
      email: tileData.sender_email ? `mailto:${tileData.sender_email}` : null,
    };
    if (actions[type]) Linking.openURL(actions[type]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.tile}>
          {/* Edit Controls */}
          <View style={styles.topRightButtons}>
            {isEditing ? (
              <>
                <TouchableOpacity onPress={saveInlineEdit} style={{ marginRight: 8 }}>
                  <Ionicons name="save-outline" size={28} color="green" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditing(false)}>
                  <Ionicons name="close-outline" size={28} color="red" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil-outline" size={22} color="#555" />
              </TouchableOpacity>
            )}
          </View>

          {/* Serial No */}
          <View style={[styles.serialCircle, { backgroundColor: getStatusColor(tileData.status) }]}>
            <Text style={styles.serialText}>{serialNo}</Text>
          </View>

          {/* Editable Fields */}
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={tileData.sender_name}
                onChangeText={(t) => setTileData({ ...tileData, sender_name: t })}
              />
            ) : (
              <Text style={styles.value}>{tileData.sender_name}</Text>
            )}
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={tileData.sender_email}
                onChangeText={(t) => setTileData({ ...tileData, sender_email: t })}
              />
            ) : (
              <Text style={styles.value}>{tileData.sender_email || "-"}</Text>
            )}
            {!isEditing && (
              <TouchableOpacity onPress={() => handleContact("email")} style={{ marginLeft: 6 }}>
                <Ionicons name="mail-outline" size={20} color="#ff9800" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Mobile:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={tileData.sender_mobile}
                onChangeText={(t) => setTileData({ ...tileData, sender_mobile: t })}
              />
            ) : (
              <Text style={styles.value}>{tileData.sender_mobile || "-"}</Text>
            )}
            {!isEditing && (
              <View style={{ flexDirection: "row", marginLeft: 6 }}>
                <TouchableOpacity onPress={() => handleContact("call")} style={{ marginRight: 6 }}>
                  <Ionicons name="call-outline" size={20} color="#007bff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleContact("sms")} style={{ marginRight: 6 }}>
                  <Ionicons name="chatbox-outline" size={20} color="#28a745" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleContact("whatsapp")}>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Product:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={tileData.product_name}
                onChangeText={(t) => setTileData({ ...tileData, product_name: t })}
              />
            ) : (
              <Text style={styles.value}>{tileData.product_name || "-"}</Text>
            )}
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Location:</Text>
            {isEditing ? (
              <View style={{ flexDirection: "row", flex: 1 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 4 }]}
                  value={tileData.sender_city}
                  placeholder="City"
                  onChangeText={(t) => setTileData({ ...tileData, sender_city: t })}
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 4 }]}
                  value={tileData.sender_state}
                  placeholder="State"
                  onChangeText={(t) => setTileData({ ...tileData, sender_state: t })}
                />
              </View>
            ) : (
              <Text style={styles.value}>
                {tileData.sender_city}, {tileData.sender_state}
              </Text>
            )}
          </View>

          {/* Read-only Fields */}
          <View style={styles.row}>
            <Text style={styles.label}>Source, Status:</Text>
            <Text style={[styles.value, { fontWeight: "bold" }]}>
              {tileData.source || "-"}, {tileData.status}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Last Activity:</Text>
            <Text style={styles.value}>
              {lastActivity ? `${lastActivity.action} (${formatDateTime(lastActivity.date)})` : "-"}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {getButtons().map((btn) => (
              <TouchableOpacity
                key={btn.label}
                style={styles.button}
                onPress={() => handleAction(btn.action || btn.label)}
              >
                <Text style={styles.buttonText}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Modals */}
        <Modal transparent visible={commentModalVisible} animationType="fade">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.centeredModal}
          >
            <CommentModule
              tileData={tileData}
              fetchLeads={fetchLeads}
              setCommentVisible={setCommentModalVisible}
            />
          </KeyboardAvoidingView>
        </Modal>

        <Modal transparent visible={financeModalVisible} animationType="fade">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.centeredModal}
          >
            <FinanceModule
              tileData={tileData}
              type={financeType}
              fetchLeads={fetchLeads}
              setFinanceVisible={setFinanceModalVisible}
            />
          </KeyboardAvoidingView>
        </Modal>

        <LedgerPrint
          tileData={tileData}
          visible={ledgerModalVisible}
          onClose={() => setLedgerModalVisible(false)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LeadTile;
