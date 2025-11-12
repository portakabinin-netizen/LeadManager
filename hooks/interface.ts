import { MaterialIcons } from "@expo/vector-icons";

/**
 * ============================================
 * 🧱 SESSION INTERFACES
 * ============================================
 */

// 🔐 Saved session in AsyncStorage
export interface UserSession {
  token: string;
  loginTime?: string;
}

/**
 * ============================================
 * 🧱 JWT TOKEN STRUCTURE (Decoded Payload)
 * ============================================
 */
export interface DecodedToken {
  userId?: string;
  name?: string;
  userEmail?: string;
  userMobile?: string;
  role?: string;
  corpAdminId?: string;
  corporateId?: string;
  corporateName?: string;
  corporateEmail?: string;
  profileImage?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * ============================================
 * 🧱 CURRENT USER (Mapped from Decoded Token)
 * ============================================
 */
export interface CurrentUser {
  name: string;
  role: string;
  userId: string;
  userMobile?: string;
  userEmail?: string;
  corpAdminId?: string;
  corpId: string;
  corporateName?: string;
  corporateEmail?: string;
  profileImage: string;
  token: string;
}

/**
 * ============================================
 * 🧱 MENU ITEMS (menuItem.json)
 * ============================================
 */
export interface MenuItem {
  id: string;
  name: string;
  screen: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  role: string;
}

/**
 * ============================================
 * 🧱 ACTIVITY STRUCTURE
 * ============================================
 */
export interface Activity {
  date: string; // ISO string from MongoDB
  byUser: string;
  action: string;
}

/**
 * ============================================
 * 💰 TRANSACTION / FINANCE STRUCTURE
 * ============================================
 */
export interface FinanceEntry {
  voucherDate: string; // ISO string
  paymentType: "Dr" | "Cr";
  voucherAmount: {
    value: number; // Decimal128 converted to number in frontend
    currency: "INR" | "USD" | "EUR";
  };
  voucherNarration?: string;
  paymentFromTo: "Admin" | "Client" | "Materials" | "Labour";
}

/**
 * ============================================
 * 🧱 LEADS STRUCTURE (Aligned with LeadsLedger Schema)
 * ============================================
 */
export interface Leads {
  _id?: string;
  lead_no?: number;
  product_name?: string;
  sender_name?: string;
  sender_city?: string;
  sender_state?: string;
  sender_mobile?: string;
  sender_email?: string;
  source?: string;
  source_id?: string;
  adminLink?: string;
  corpLink?: string;
  status?: "Unread" | "Contacted" | "Closed" | "Lost";
  generated_date?: string;
  activity?: Activity[];
  finance?: FinanceEntry[];
  createdAt?: string;
  updatedAt?: string;
}
