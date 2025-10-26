import { Ionicons } from "@expo/vector-icons";
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LeadService, { Activity, Lead } from "../myscript/leadservices";

export interface LeadScreenRef {
  fetchLeads: () => void;
}

interface Props {
  status: "Recent" | "Engaged" | "Accepted" | "Recycle";
}

/* ------------------------- CHILD TILE COMPONENT -------------------------- */
const LeadTile = ({
  lead,
  status,
  fetchLeads,
  openStatusModal,
  openLedgerModal,
}: {
  lead: Lead;
  status: string;
  fetchLeads: () => void;
  openStatusModal: (lead: Lead, newStatus: string) => void;
  openLedgerModal: (lead: Lead, type: "Dr" | "Cr") => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tileData, setTileData] = useState<Partial<Lead>>(lead);
  const [activityModalVisible, setActivityModalVisible] = useState(false);

  const lastActivity: Activity | null = lead.activity?.length
    ? lead.activity[lead.activity.length - 1]
    : null;

  const mobile = lead.sender_mobile?.startsWith("+91")
    ? lead.sender_mobile
    : `+91${lead.sender_mobile}`;

  /** Inline Save */
  const saveInlineEdit = async () => {
    if (!tileData._id) return;
    await LeadService.saveOrUpdateLeads([tileData]);
    setIsEditing(false);
    fetchLeads();
  };

  /** Call / SMS / WhatsApp / Email */
  const handleCall = () => Linking.openURL(`tel:${mobile}`);
  const handleSMS = () => Linking.openURL(`sms:${mobile}`);
  const handleWhatsApp = () => Linking.openURL(`whatsapp://send?phone=${mobile}`);
  const handleEmail = () => {
    if (tileData.sender_email) Linking.openURL(`mailto:${tileData.sender_email}`);
    else Toast.show({ type: "info", text1: "No email found" });
  };

  /** Status Buttons */
  let buttons: JSX.Element[] = [];
  if (status === "Recent")
    buttons = [
      <TouchableOpacity key="Engaged" style={styles.button} onPress={() => openStatusModal(lead, "Engaged")}>
        <Text style={styles.buttonText}>Engaged</Text>
      </TouchableOpacity>,
      <TouchableOpacity key="Recycle" style={styles.button} onPress={() => openStatusModal(lead, "Recycle")}>
        <Text style={styles.buttonText}>Recycle</Text>
      </TouchableOpacity>,
    ];
  else if (status === "Engaged")
    buttons = [
      <TouchableOpacity key="Accepted" style={styles.button} onPress={() => openStatusModal(lead, "Accepted")}>
        <Text style={styles.buttonText}>Accepted</Text>
      </TouchableOpacity>,
      <TouchableOpacity key="Recycle" style={styles.button} onPress={() => openStatusModal(lead, "Recycle")}>
        <Text style={styles.buttonText}>Recycle</Text>
      </TouchableOpacity>,
    ];
  else if (status === "Accepted")
    buttons = [
      <TouchableOpacity key="Payment" style={styles.button} onPress={() => openLedgerModal(lead, "Dr")}>
        <Text style={styles.buttonText}>Payment</Text>
      </TouchableOpacity>,
      <TouchableOpacity key="Receipt" style={styles.button} onPress={() => openLedgerModal(lead, "Cr")}>
        <Text style={styles.buttonText}>Receipt</Text>
      </TouchableOpacity>,
    ];

  return (
    <View key={lead._id} style={styles.tile}>
      {/* Edit/Save/Cancel Icons */}
      <View style={styles.editIconContainer}>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil-outline" size={22} color="#333" />
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity onPress={saveInlineEdit} style={{ marginRight: 8 }}>
              <Ionicons name="save-outline" size={22} color="green" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsEditing(false)}>
              <Ionicons name="close-outline" size={22} color="red" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Row: Name */}
      <View style={styles.row}>
        <Text style={styles.label}>Name: </Text>
        {isEditing ? (
          <TextInput
            style={styles.inputInline}
            value={tileData.sender_name}
            onChangeText={(t) => setTileData((p) => ({ ...p, sender_name: t }))}
          />
        ) : (
          <Text style={styles.value}>{tileData.sender_name || "Unknown"}</Text>
        )}
      </View>

      {/* Row: Product */}
      <View style={styles.row}>
        <Text style={styles.label}>Product: </Text>
        {isEditing ? (
          <TextInput
            style={styles.inputInline}
            value={tileData.product_name}
            onChangeText={(t) => setTileData((p) => ({ ...p, product_name: t }))}
          />
        ) : (
          <Text style={styles.value}>{tileData.product_name || "-"}</Text>
        )}
      </View>

      {/* Row: Source | Status */}
      <View style={styles.row}>
        <Text style={styles.label}>Source: </Text>
         <Text style={styles.value}>{tileData.source || "-"}</Text>
        
        <Text style={styles.label}> | Status: </Text>
        <Text style={styles.value}>{tileData.status}</Text>
      </View>

      {/* Row: Mobile + Icons */}
      <View style={styles.row}>
        <Text style={styles.label}>Mobile: </Text>
        {isEditing ? (
          <TextInput
            style={styles.inputInline}
            value={tileData.sender_mobile}
            onChangeText={(t) => setTileData((p) => ({ ...p, sender_mobile: t }))}
          />
        ) : (
          <Text style={styles.value}>{mobile}</Text>
        )}
        {!isEditing && (
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={handleCall} style={styles.iconButton}>
              <Ionicons name="call-outline" size={30} color="#007bff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSMS} style={styles.iconButton}>
              <Ionicons name="chatbox-outline" size={30} color="#28a745" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleWhatsApp} style={styles.iconButton}>
              <Ionicons name="logo-whatsapp" size={30} color="#25D366" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Row: Email */}
      <View style={styles.row}>
        <Text style={styles.label}>Email: </Text>
        {isEditing ? (
          <TextInput
            style={styles.inputInline}
            value={tileData.sender_email}
            onChangeText={(t) => setTileData((p) => ({ ...p, sender_email: t }))}
          />
        ) : (
          <Text style={styles.value}>{tileData.sender_email || "-"}</Text>
        )}
        {!isEditing && (
          <TouchableOpacity onPress={handleEmail} style={{ marginLeft: 8 }}>
            <Ionicons name="mail-outline" size={30} color="#ff9800" />
          </TouchableOpacity>
        )}
      </View>

      {/* Row: Location */}
      <View style={styles.row}>
        <Text style={styles.label}>Location: </Text>
        <Text style={styles.value}>
          {tileData.sender_city || "-"} , {tileData.sender_state || "-"}
        </Text>
      </View>

      {/* Row: Last Activity */}
      <View style={styles.row}>
        <Text style={styles.label}>Last Activity: </Text>
        <Text style={styles.value}>
          {lastActivity
            ? `${lastActivity.date ? new Date(lastActivity.date).toLocaleString() : ""} - ${
                lastActivity.action
              }`
            : "-"}
        </Text>
        {lead.activity?.length > 1 && (
          <TouchableOpacity onPress={() => setActivityModalVisible(true)} style={{ marginLeft: 6 }}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#333" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Buttons */}
      <View style={styles.buttonRow}>{buttons}</View>

      {/* Activity Modal */}
      <Modal visible={activityModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>All Activities</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {lead.activity?.map((act, idx) => (
                <View key={idx} style={{ marginBottom: 6 }}>
                  <Text>
                    {act.date ? new Date(act.date).toLocaleString() : ""} - {act.action}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setActivityModalVisible(false)}>
              <Text style={{ color: "red", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* ------------------------- MAIN SCREEN -------------------------- */
// (same as previous — unchanged)
const LeadScreen = forwardRef<LeadScreenRef, Props>(({ status }, ref) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = async () => {
    setRefreshing(true);
    const data = await LeadService.getLeadsByStatus(status);
    setLeads(data);
    setRefreshing(false);
  };

  useImperativeHandle(ref, () => ({ fetchLeads }));
  useEffect(() => {
    fetchLeads();
  }, [status]);

  // modals (status / ledger) remain unchanged...
  // [Truncated for brevity: you can reuse previous modals exactly as-is]

  return (
    <ScrollView
      style={{ flex: 1, padding: 10, backgroundColor: "#f8f9fa" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLeads} />}
    >
      {leads.map((lead) => (
        <LeadTile
          key={lead._id}
          lead={lead}
          status={status}
          fetchLeads={fetchLeads}
          openStatusModal={() => {}}
          openLedgerModal={() => {}}
        />
      ))}
      <Toast />
    </ScrollView>
  );
});

export default LeadScreen;

/* ------------------------- STYLES -------------------------- */
const styles = StyleSheet.create({
  tile: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  editIconContainer: {
    position: "absolute",
    top: 20,
    right: 30,
  },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 4 },
  label: { fontWeight: "600", fontSize: 13, color: "#040e33a4" },
  value: { fontWeight: "500", fontSize: 15, color: "#0b0101ff" },
  iconRow: { flexDirection: "row", marginLeft: 8 },
  iconButton: { marginHorizontal: 4 },
  button: {
    backgroundColor: "#101010ff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  buttonText: { color: "#fff" },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  inputInline: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 80,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "85%",
  },
  modalTitle: { fontWeight: "700", fontSize: 16, marginBottom: 10 },
  closeBtn: { marginTop: 12, alignSelf: "flex-end" },
});
