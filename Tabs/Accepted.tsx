import { useFocusEffect } from "@react-navigation/native";
import React, { useRef } from "react";
import LeadTiles from "../../../../TileView/RenderTiles";

export default function RenderLeadScreen() {
  const leadRef = useRef<any>(null);

  // Auto-refresh when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      leadRef.current?.fetchLeads();
    }, [])
  );

  return <LeadTiles ref={leadRef} status="Accepted" />;
}
