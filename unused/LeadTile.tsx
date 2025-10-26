import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LeadService from "../myscript/leadservices";
import { Activity, EmbeddedLedger, Lead } from "../myscript/TileFormat";

interface LeadTileProps {
  lead: Lead;
  status: string;
  serialNo: number;
  fetchLeads: () => void;
}

const LeadTile: React.FC<LeadTileProps> = ({ lead, status, serialNo, fetchLeads }) => {
  const [tileData, setTileData] = useState<Lead>({ ...lead });
  const [isEditing, setIsEditing] = useState(false);
  const [commentVisible, setCommentVisible] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [financeVisible, setFinanceVisible] = useState(false);
  const [finance, setFinance] = useState({ amount: "", narration: "", type: "" as "Dr" | "Cr" });
  const [ledgerModalVisible, setLedgerModalVisible] = useState(false);

  // Helper: return ddmmyyyy (no separators) as requested
  const formatDateDDMMYYYY = (d?: string | Date | null) => {
    if (!d) return "";
    const dt = typeof d === "string" ? new Date(d) : new Date(d);
    if (isNaN(dt.getTime())) return "";
    const dd = dt.getDate().toString().padStart(2, "0");
    const mm = (dt.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = dt.getFullYear().toString();
    return `${dd}/${mm}/${yyyy}`; // dd/mm/yyyy
  };

  // Helper: date+time for last activity but date still ddmmyyyy part
  const formatDateTimeDDMMYYYY = (d?: string | Date | null) => {
    if (!d) return "";
    const dt = typeof d === "string" ? new Date(d) : new Date(d);
    if (isNaN(dt.getTime())) return "";
    const datePart = formatDateDDMMYYYY(dt);
    const hh = dt.getHours().toString().padStart(2, "0");
    const mi = dt.getMinutes().toString().padStart(2, "0");
    return `${datePart} ${hh}:${mi}`; // e.g. 18072025 14:05
  };

  // status color map for serial circle
  const getStatusColor = (st?: string) => {
    const s = (st || status || "").toLowerCase();
    switch (s) {
      case "recent":
        return "#ffdf5a"; // yellow
      case "engaged":
        return "#ffb86b"; // orange
      case "accepted":
        return "#7ed321"; // green
      case "restore":
        return "#ffb3b3"; // light red / notification-like
      case "recycle":
        return "#ff5252"; // red
      default:
        return "#e0e0e0"; // gray
    }
  };

  const mobile = tileData.sender_mobile ? `+91${tileData.sender_mobile.replace(/^(\+91)/, "")}` : "";

  const lastActivity: Activity | null = tileData.activity?.length
    ? tileData.activity[tileData.activity.length - 1]
    : null;

  /** Small runtime checks for LeadService methods so missing routes are caught early */
  const serviceAvailable = (fnName: keyof typeof LeadService) => {
    if (!LeadService || typeof (LeadService as any)[fnName] !== "function") {
      Toast.show({ type: "error", text1: `Service method ${fnName} not available` });
      return false;
    }
    return true;
  };

  /** Inline save edit */
  const saveInlineEdit = async () => {
    if (!tileData._id) return;
    if (!serviceAvailable("saveOrUpdateLeads")) return;
    try {
      await LeadService.saveOrUpdateLeads(tileData);
      setIsEditing(false);
      fetchLeads();
      Toast.show({ type: "success", text1: "Lead updated successfully" });
    } catch (err: any) {
      Toast.show({ type: "error", text1: err.message || "Update failed" });
    }
  };

  /** Cancel edit */
  const cancelEdit = () => {
    setTileData({ ...lead });
    setIsEditing(false);
  };

  /** Communication actions */
  const handleCall = () => mobile && Linking.openURL(`tel:${mobile}`);
  const handleSMS = () => mobile && Linking.openURL(`sms:${mobile}`);
  const handleWhatsApp = () =>
    mobile && Linking.openURL(`whatsapp://send?phone=${mobile}`);
  const handleEmail = () => {
    if (tileData.sender_email) Linking.openURL(`mailto:${tileData.sender_email}`);
    else Toast.show({ type: "info", text1: "No email found" });
  };

  /** Status buttons */
  const getButtons = () => {
    if (status === "Recent") return [{ label: "Engaged", action: "Engaged" }, { label: "Recycle", action: "Recycle" }];
    if (status === "Engaged") return [{ label: "Accepted", action: "Accepted" }, { label: "Recycle", action: "Recycle" }];
    if (status === "Accepted") return [
      { label: "Payment", action: "Dr" },
      { label: "Receipt", action: "Cr" },
      { label: "Ledger", action: "Ledger" },
    ];
    if (status === "Restore") return [{ label: "Accepted", action: "Accepted" }, { label: "Recycle", action: "Recycle" }];
    if (status === "Recycle") return [{ label: "Restore", action: "Restore" }, { label: "Delete", action: "Delete" }];
    return [];
  };

  /** Status click */
  const handleStatusClick = async (btn: { label: string; action: string }) => {
    if (btn.action === "Dr" || btn.action === "Cr") {
      setFinanceVisible(true);
      setFinance({ amount: "", narration: "", type: btn.action as "Dr" | "Cr" });
    } else if (btn.action === "Ledger") {
      setLedgerModalVisible(true);
    } else {
      setCommentVisible(true);
      setCommentText("");
      setTileData((p) => ({ ...p, status: btn.action }));
    }
  };

  /** Save Status with comment */
  const saveStatusUpdate = async () => {
    if (!tileData._id) return;
    if (!serviceAvailable("updateLeadStatus")) return;
    try {
      await LeadService.updateLeadStatus(tileData._id, tileData.status || "", commentText);
      setCommentVisible(false);
      fetchLeads();
      Toast.show({ type: "success", text1: "Status updated" });
    } catch (err: any) {
      Toast.show({ type: "error", text1: err.message || "Failed" });
    }
  };

  /** Save Finance */
  const saveFinanceUpdate = async () => {
    if (!tileData._id || !finance.amount || !finance.type) {
      Toast.show({ type: "info", text1: "Fill all fields" });
      return;
    }
    if (!serviceAvailable("addLedgerEntry") || !serviceAvailable("addEmbeddedLedger")) return;

    try {
      const ledgerEntry: EmbeddedLedger = {
        ledger_id: new Date().getTime().toString(),
        date: new Date(),
        narration: finance.narration,
        amount: Number(finance.amount),
        type: finance.type,
        account_title: finance.type === "Dr" ? "Payment" : "Receipt",
      };

      await LeadService.addLedgerEntry(tileData._id, {
        date: ledgerEntry.date,
        narration: ledgerEntry.narration,
        amount: ledgerEntry.amount,
        type: ledgerEntry.type,
        account_title: ledgerEntry.account_title,
      });

      await LeadService.addEmbeddedLedger(tileData._id, ledgerEntry);

      setFinanceVisible(false);
      fetchLeads();
      Toast.show({ type: "success", text1: "Ledger updated" });
    } catch (err: any) {
      Toast.show({ type: "error", text1: err.message || "Ledger update failed" });
    }
  };

  /** Ledger Modal render */
  const renderLedgerModal = () => {
    if (!tileData.ledger) return null;

    let balance = 0;
    const rows = tileData.ledger.map((l) => {
      if (l.type === "Cr") balance += l.amount;
      else balance -= l.amount;
      return { ...l, balance: balance, balanceType: balance >= 0 ? "Cr" : "Dr" };
    });

    return (
      <Modal visible={ledgerModalVisible} animationType="slide">
        <View style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 12 }}>
            Ledger - {tileData.sender_name}-{tileData.sender_mobile}
          </Text>
          <ScrollView>
            {rows.map((r, idx) => (
              <View key={idx} style={{ flexDirection: "row", borderBottomWidth: 1, paddingVertical: 6 }}>
                <Text style={{ flex: 1, fontSize: 12 }}>{formatDateDDMMYYYY(r.date)}</Text>
                <Text style={{ flex: 1, fontSize: 12 }}>{r.narration}</Text>
                <Text style={{ flex: 1, fontSize: 12 }}>{r.amount}</Text>
                <Text style={{ flex: 0.5, fontSize: 12 }}>{r.type}</Text>
                <Text style={{ flex: 1, fontSize: 12 }}>{Math.abs(r.balance)}</Text>
                <Text style={{ flex: 0.5, fontSize: 12 }}>{r.balanceType}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => Print.printAsync({ html: "<h1>Ledger</h1>" })}
              style={{ backgroundColor: "#1e90ff", padding: 8, borderRadius: 6 }}
            >
              <Text style={{ color: "#fff" }}>Print</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLedgerModalVisible(false)} style={{ backgroundColor: "red", padding: 8, borderRadius: 6 }}>
              <Text style={{ color: "#fff" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.tile}>
          {/* Top-right edit/save/cancel buttons */}
          <View style={styles.topRightButtons}>
            {isEditing ? (
              <>
                <TouchableOpacity onPress={saveInlineEdit} style={{ marginRight: 8 }}>
                  <Ionicons name="save-outline" size={28} color="green" />
                </TouchableOpacity>
                <TouchableOpacity onPress={cancelEdit}>
                  <Ionicons name="close-outline" size={28} color="red" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil-outline" size={22} color="#555" />
              </TouchableOpacity>
            )}
          </View>

          {/* Serial - color depends on status */}
          <View style={[styles.serialCircle, { backgroundColor: getStatusColor(tileData.status || status) }]}>
            <Text style={styles.serialText}>{serialNo}</Text>
          </View>

          {/* Name */}
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={tileData.sender_name} onChangeText={(t) => setTileData({ ...tileData, sender_name: t })} />
            ) : (
              <Text style={styles.value}>{tileData.sender_name}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={tileData.sender_email} onChangeText={(t) => setTileData({ ...tileData, sender_email: t })} />
            ) : (
              <Text style={styles.value}>{tileData.sender_email}</Text>
            )}
            <TouchableOpacity onPress={handleEmail} style={{ marginLeft: 6 }}>
              <Ionicons name="mail-outline" size={20} color="#ff9800" />
            </TouchableOpacity>
          </View>

          {/* Mobile */}
          <View style={styles.row}>
            <Text style={styles.label}>Mobile:</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={tileData.sender_mobile} onChangeText={(t) => setTileData({ ...tileData, sender_mobile: t })} />
            ) : (
              <Text style={styles.value}>{tileData.sender_mobile}</Text>
            )}
            <View style={{ flexDirection: "row", marginLeft: 6 }}>
              <TouchableOpacity onPress={handleCall} style={{ marginRight: 6 }}>
                <Ionicons name="call-outline" size={20} color="#007bff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSMS} style={{ marginRight: 6 }}>
                <Ionicons name="chatbox-outline" size={20} color="#28a745" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Product */}
          <View style={styles.row}>
            <Text style={styles.label}>Product:</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={tileData.product_name} onChangeText={(t) => setTileData({ ...tileData, product_name: t })} />
            ) : (
              <Text style={styles.value}>{tileData.product_name}</Text>
            )}
          </View>

          {/* Location */}
          <View style={styles.row}>
            <Text style={styles.label}>Location:</Text>
            {isEditing ? (
              <>
                <TextInput style={[styles.input, { minWidth: 80 }]} value={tileData.sender_city} onChangeText={(t) => setTileData({ ...tileData, sender_city: t })} />
                <TextInput style={[styles.input, { minWidth: 80, marginLeft: 4 }]} value={tileData.sender_state} onChangeText={(t) => setTileData({ ...tileData, sender_state: t })} />
              </>
            ) : (
              <>
                <Text style={styles.value}>{tileData.sender_city}</Text>
                <Text style={[styles.value, { marginLeft: 4 }]}>{tileData.sender_state}</Text>
              </>
            )}
          </View>

          {/* Source */}
          <View style={styles.row}>
            <Text style={styles.label}>Source:</Text>
            <Text style={[styles.value, { fontWeight: "bold" }]}>{tileData.source || "-"}</Text>
          </View>

          {/* Last Activity */}
          <View style={styles.row}>
            <Text style={styles.label}>Last Activity:</Text>
            <Text style={styles.value}>
              {lastActivity ? `${formatDateTimeDDMMYYYY(lastActivity.date!)} - ${lastActivity.action}` : "-"}
            </Text>
          </View>

          {/* Status buttons - centered */}
          <View style={styles.buttonRow}>
            {getButtons().map((btn) => (
              <View key={btn.label} style={{ alignItems: "center", marginHorizontal: 6 }}>
                <TouchableOpacity style={styles.button} onPress={() => handleStatusClick(btn)}>
                  <Text style={styles.buttonText}>{btn.label}</Text>
                </TouchableOpacity>

                {/* If this is a Restore button — show badge (0 if none) */}
                {btn.action === "Restore" && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tileData.restore_count ?? 0}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Comment */}
          {commentVisible && (
            <View style={[styles.row, { marginTop: 12 }]}>
              <TextInput placeholder="Enter comment..." style={[styles.input, { flex: 1 }]} value={commentText} onChangeText={setCommentText} />
              <TouchableOpacity onPress={saveStatusUpdate} style={{ marginLeft: 8 }}>
                <Ionicons name="save-outline" size={28} color="green" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCommentVisible(false)} style={{ marginLeft: 8 }}>
                <Ionicons name="close-outline" size={28} color="red" />
              </TouchableOpacity>
            </View>
          )}

          {/* Finance */}
          {financeVisible && (
            <View style={styles.financeBox}>
            <View><Text style={{ fontWeight: "bold" }}>Type: {finance.type}</Text><View><Text style={{ fontWeight: "bold" }}>Date: {}</Text></View></View>             
              <TextInput placeholder="Amount" keyboardType="numeric" style={[styles.input, { marginTop: 6 }]} value={finance.amount} onChangeText={(t) => setFinance({ ...finance, amount: t })} />
              <TextInput placeholder="Narration" style={[styles.input, { marginTop: 6 }]} value={finance.narration} onChangeText={(t) => setFinance({ ...finance, narration: t })} />
              <View style={{ flexDirection: "row", marginTop: 8 }}>
                <TouchableOpacity onPress={saveFinanceUpdate} style={{ marginRight: 8 }}>
                  <Ionicons name="save-outline" size={28} color="green" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFinanceVisible(false)}>
                  <Ionicons name="close-outline" size={28} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Ledger Modal */}
          {renderLedgerModal()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LeadTile;

const styles = StyleSheet.create({
  tile: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 3 },
  topRightButtons: { position: "absolute", top: 12, right: 12, flexDirection: "row" },
  serialCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center", zIndex: 2, marginBottom: 6 },
  serialText: { color: "#360303ff", fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 6 },
  label: { fontWeight: "600", fontSize: 13, color: "#555", marginRight: 4 },
  value: { fontWeight: "500", fontSize: 14, color: "#222", marginLeft: 4 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 6, minWidth: 200 },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, justifyContent: "center", alignItems: "center" },
  button: { backgroundColor: "#1e90ff", padding: 8, borderRadius: 6, minWidth: 80, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  financeBox: { marginTop: 12, padding: 12, borderWidth: 1, borderColor: "#ccc", borderRadius: 6 },
  badge: { position: "absolute", top: -8, right: -8, backgroundColor: "#ff3b30", borderRadius: 10, minWidth: 20, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
