/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Member {
  id: string; // e.g. "MEM-1001"
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  status: 'Active' | 'Paused' | 'Expired';
  plan: string;
  joinDate: string;
  expiryDate: string;
  photoUrl?: string;
  avatarUrl?: string;
  gender?: string;
  notes?: string;
  totalCheckIns: number;
  lastCheckIn: string | null;
  reminderSentDate?: string; // Track when WhatsApp renewal alerts were sent
  birthdayGreetingSentDate?: string; // Track when birthday greeting was sent
  dob?: string; // Birthdate YYYY-MM-DD
  autoRenew?: boolean; // Enable automatic subscription renewal
  shiftTiming?: 'Morning' | 'Evening'; // Member shift slot (Morning / Evening)
  advanceBalance?: number; // Total unapplied advance payment balance
  advancePayments?: AdvancePaymentRecord[]; // List of historical advance payment transactions
}

export interface AdvancePaymentRecord {
  id: string;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Credit/Debit Card' | 'Net Banking' | 'Cheque' | 'Bank Transfer';
  purpose: string;
  date: string; // ISO string
  referenceNo?: string;
  notes?: string;
  extendedExpiryDate?: string;
  receiptNo?: string;
}

export type MembershipPlanName = string;

export interface MembershipPlan {
  name: string;
  price: number;
  durationDays: number;
  features: string[];
}

export interface CheckIn {
  id: string;
  memberId: string;
  memberName: string;
  timestamp: string; // ISO String
  planType: string;
  method: 'Self QR Scan' | 'Front Desk Scan' | 'Manual Select';
  status: 'Granted' | 'Expired Plan' | 'No Active Plan';
}

export interface DailyStat {
  date: string; // "YYYY-MM-DD"
  checkIns: number;
  newMembers: number;
}

export interface WelcomeMessage {
  id: string; // e.g. "MSG-12345"
  type: 'Welcome' | 'CheckIn';
  memberId: string;
  memberName: string;
  phone: string;
  messageText: string;
  timestamp: string; // ISO String
  method?: string; // For CheckIn
  plan?: string;    // For Welcome/CheckIn
  status: 'Pending' | 'Sent';
}

export interface SecurityConfig {
  id: string;
  ownerEmail: string;
  ownerPassword: string;
  adminEmail: string;
  adminPassword: string;
}

export interface Feedback {
  id: string;
  memberName?: string;
  memberEmail?: string;
  rating: number; // 1 to 5
  category: 'Facilities' | 'Equipment' | 'Trainers' | 'Cleanliness' | 'Classes' | 'Other';
  suggestion: string;
  timestamp: string; // ISO String
  status: 'Pending' | 'Reviewed' | 'Addressed';
}

