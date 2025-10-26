import { Ionicons } from "@expo/vector-icons";
import React, { Component } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LeadService from "../myscript/leadservices";
import { EmbeddedLedger, Lead } from "../myscript/TileFormat";

// --------------------------------------------
// ✅ Common Props
// --------------------------------------------
interface CommonProps {
  tileData: Lead;
  fetchLeads: () => void;
  setCommentVisible: (v: boolean) => void;
}

// --------------------------------------------
// ✅ Finance Module Props
// --------------------------------------------
interface FinanceModuleProps extends CommonProps {
  financeType?: "Dr" | "Cr";
  setFinanceVisible: (v: boolean) => void;
}

// --------------------------------------------
// ✅ Comment Module Class Component
// --------------------------------------------
export class CommentModule extends Component<
  Omit<CommonProps, "setFinanceVisible">
> {
  state = {
    comment: "",
  };

  saveComment = async () => {
    const { tileData, fetchLeads, setCommentVisible } = this.props;
    const { comment } = this.state;

    if (!comment.trim()) {
      Toast.show({ type: "info", text1: "Enter a comment" });
      return;
    }

    try {
      await LeadService.updateLeadStatus(
        tileData._id!,
        tileData.status || "",
        comment
      );
      Toast.show({ type: "success", text1: "Comment added" });
      setCommentVisible(false);
      fetchLeads();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: err.message || "Failed to add comment",
      });
    }
  };

  render() {
    const { setCommentVisible, tileData } = this.props;
    const { comment } = this.state;

    return (
      <View style={styles.modal}>
        <Text style={styles.title}>
          Add Comment - {tileData.sender_name}
        </Text>

        <TextInput
          placeholder="Type comment..."
          value={comment}
          onChangeText={(text) => this.setState({ comment: text })}
          multiline
          style={styles.input}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={this.saveComment}>
            <Ionicons name="save-outline" size={28} color="green" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCommentVisible(false)}>
            <Ionicons name="close-outline" size={28} color="red" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

// --------------------------------------------
// ✅ Finance Module Class Component
// --------------------------------------------
export class FinanceModule extends Component<FinanceModuleProps> {
  state = {
    amount: "",
    voucherDate: "",
    narration: "",
    type: this.props.financeType || "Dr",
    editingDate: false,
  };

  componentDidMount() {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, "0");
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const y = today.getFullYear();
    this.setState({ voucherDate: `${d}-${m}-${y}`, editingDate: false });
  }

  saveFinance = async () => {
    const { tileData, fetchLeads, setFinanceVisible } = this.props;
    const { amount, narration, voucherDate, type } = this.state;

    if (!amount) {
      Toast.show({ type: "info", text1: "Enter amount" });
      return;
    }

    try {
      const [dd, mm, yyyy] = voucherDate.split("-");
      const ledgerEntry: EmbeddedLedger = {
        ledger_id: new Date().getTime().toString(),
        date: new Date(`${yyyy}-${mm}-${dd}`).toISOString(),
        amount: Number(amount),
        narration: narration || "Finance Entry",
        type,
        account_title: type === "Dr" ? "Payment" : "Receipt",
      };

      await LeadService.addLedgerEntry(tileData._id!, ledgerEntry);
      await LeadService.addEmbeddedLedger(tileData._id!, ledgerEntry);

      Toast.show({ type: "success", text1: "Ledger updated" });
      setFinanceVisible(false);
      fetchLeads();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: err.message || "Ledger update failed",
      });
    }
  };

  render() {
    const { setFinanceVisible, tileData } = this.props;
    const { amount, narration, voucherDate, type, editingDate } = this.state;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.modal}>
          {/* Title with sender_name */}
          <Text style={styles.title}>
            {type === "Dr" ? "Payment Entry" : "Receipt Entry"} - {tileData.sender_name}
          </Text>

          {/* Type & Date Row */}
          <View style={[styles.row, { justifyContent: "space-between", alignItems: "center" }]}>
            <Text style={[styles.label, { flex: 1, textAlign: "right" }]}>
              Type: <Text style={styles.value}>{type}</Text>
            </Text>

            {editingDate ? (
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                value={voucherDate}
                placeholder="DD-MM-YYYY"
                onChangeText={(text) => this.setState({ voucherDate: text })}
                onBlur={() => this.setState({ editingDate: false })}
              />
            ) : (
              <Text
                style={[styles.value, { flex: 1, marginLeft: 10 }]}
                onPress={() => this.setState({ editingDate: true })}
              >
                {voucherDate}
              </Text>
            )}
          </View>

          {/* Narration */}
          <Text style={styles.label}>Narration:</Text>
          <TextInput
            style={styles.input}
            value={narration}
            onChangeText={(text) => this.setState({ narration: text })}
          />

          {/* Amount */}
          <Text style={styles.label}>Amount:</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={(text) => this.setState({ amount: text })}
            placeholder="Enter amount"
            keyboardType="numeric"
          />

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={this.saveFinance}>
              <Ionicons name="save-outline" size={28} color="green" />
            </TouchableOpacity>
           <TouchableOpacity
              onPress={() => this.props.setFinanceVisible(false)}
              activeOpacity={0.7}  // ✅ improves touch response
            >
              <Ionicons name="close-outline" size={28} color="red" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }
}

// --------------------------------------------
// ✅ Shared Styles
// --------------------------------------------
const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center", marginTop: 8 },
  modal: {
    width: "95%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 5,
  },
  title: { fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 8, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  label: { fontWeight: "500", marginRight: 8 },
  value: { fontWeight: "700" },
  buttonRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 8 },
});
