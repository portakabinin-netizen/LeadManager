import React from "react";
import { StyleSheet, View } from "react-native";
import LoginScreen from "../myscript/LoginScreen";

export default function IndexPage() {
  return (
    <View style={styles.container}>
      <LoginScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
});