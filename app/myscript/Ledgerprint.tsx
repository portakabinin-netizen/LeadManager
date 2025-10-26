import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Lead } from "../myscript/TileFormat";

interface LedgerModuleProps {
  tileData: Lead;
  visible: boolean;
  onClose: () => void;
}

const LedgerPrint: React.FC<LedgerModuleProps> = ({ tileData, visible, onClose }) => {
  if (!tileData.ledger) return null;

  let balance = 0;
  const rows = tileData.ledger.map((l) => {
    if (l.type === "Cr") balance += l.amount;
    else balance -= l.amount;
    return { ...l, balance: balance, balanceType: balance >= 0 ? "Cr" : "Dr" };
  });

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, padding: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: "bold", textAlign: "center", marginBottom: 12 }}>Ledger</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 12 }}>{tileData.sender_name}({tileData.sender_mobile})</Text>
        <ScrollView>
          {rows.map((r, idx) => (
            <View key={idx} style={{ flexDirection: "row", borderBottomWidth: 1, paddingVertical: 6 }}>
              <Text style={{ flex: 1, fontSize: 12 }}>{r.date ? new Date(r.date).toLocaleDateString() : "-"}</Text>
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
            <Ionicons name="print-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ backgroundColor: "red", padding: 8, borderRadius: 6 }}>
            <Ionicons name="close-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default LedgerPrint;
