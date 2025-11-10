// hooks/interface.ts
import { MaterialIcons } from "@expo/vector-icons";

export interface UserSession {
  token: string;
}

export interface DecodedToken {
  name?: string;
  role?: string;
  userId?: string;
  corporateId?: string;
  profileImage?: string;
  exp?: number;
}

export interface CurrentUser {
  name: string;
  role: string;
  userId: string;
  corpId: string;
  profileImage: string;
  token: string;
}

export interface MenuItem {
  id: string;
  name: string;
  screen: string;
  icon: keyof typeof MaterialIcons.glyphMap; // ensures MaterialIcons icon names
  role: string;
}
export interface Leads {
  _id?: string;
  source_id?: string;
  lead_no?: number;
  sender_name?: string;
  product_name?: string;
  sender_mobile?: string;
  sender_email?: string;
  sender_city?: string;
  sender_state?: string;
  source?: string;
  status?: "Fresh" | "Recent" | "Engaged" | "Accepted" | "Restore" | "Recycle";
  activity?: Activity[];
  ledger?: EmbeddedLedger[];
  createdAt?: string;
  updatedAt?: string;
  note?: string;
}

export interface EmbeddedLedger {
  ledger_id: string;
  date: string;
  narration: string;
  amount: number;
  type: "Dr" | "Cr";
  account_title: string;
  account_id?: string;
}
export interface Activity {
  date: Date;
  byUser: string;
  action: string;
}