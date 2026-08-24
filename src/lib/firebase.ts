/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Firebase & Firestore Realtime Integration for IronPulse Gym Operations
 * With ultra-resilient localStorage fallback to handle Firebase security rule restrictions during development.
 */

import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot,
  deleteDoc,
  updateDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { Member, CheckIn, MembershipPlan, WelcomeMessage, SecurityConfig, Feedback } from '../types';
import { MEMBERSHIP_PLANS, INITIAL_MEMBERS, INITIAL_CHECKINS } from '../data/initialData';

import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore utilizing the applet-provisioned custom database instance with long-polling
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "ai-studio-669e8d42-b003-4eb8-be22-e3fd2726c847");

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ---------------------------------------------------------
// FIREBASE AUTH HELPER ACTIONS
// ---------------------------------------------------------

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("[FirebaseAuth] Google Sign-In Error:", error);
    throw error;
  }
}

export async function signInWithEmail(email: string, pass: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/operation-not-allowed') {
      console.warn("[FirebaseAuth] Email/Password provider not enabled in Firebase project. Continuing with static credentials verification.");
    } else {
      console.warn("[FirebaseAuth] Email Sign-In Notice:", error?.message || error);
    }
    throw error;
  }
}

export async function firebaseSignOut() {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error("[FirebaseAuth] Sign-Out Error:", error);
    throw error;
  }
}

export function subscribeToAuth(onUserChanged: (user: User | null) => void) {
  return onAuthStateChanged(auth, onUserChanged);
}

// ---------------------------------------------------------
// LOW-MEMORY FORMAT OPTIMIZATION UTILITIES (Ensures compact DB/client payload footprint)
// ---------------------------------------------------------

/**
 * Optimizes a member record into a low-memory, lightweight schema.
 * Replaces bulky Base64 image strings with lightweight seed avatars or high-efficiency URLs,
 * and restricts text fields (like notes) to absolute bare minimums.
 */
export function optimizeMemberForLowMemory(member: Member): Member {
  if (!member) return member;
  
  // Bulky base64 photo extraction check to prevent "OutOfMemory" in browser or massive DB payloads
  let photoUrl = member.photoUrl || '';
  if (photoUrl.startsWith('data:image') && photoUrl.length > 2000) {
    // Replace with a high-efficiency avatar URL based on gender or name to save ~95% memory
    const genderSeed = member.gender === 'Female' ? 'women' : 'men';
    const idNum = Math.abs(member.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 50;
    photoUrl = `https://randomuser.me/api/portraits/thumb/${genderSeed}/${idNum}.jpg`;
    console.log(`[LowMemoryFormat] Compacted high-volume photoUrl for Member ${member.name} to lightweight seed URL`);
  }

  // Restrict notes size to avoid bloating
  const notes = member.notes ? member.notes.trim().slice(0, 300) : '';

  return {
    ...member,
    id: member.id.trim(),
    name: member.name.trim().slice(0, 100),
    email: member.email.trim().toLowerCase(),
    phone: member.phone.trim(),
    status: member.status || 'Active',
    plan: member.plan || 'Monthly Core',
    notes,
    photoUrl,
    totalCheckIns: Number(member.totalCheckIns || 0),
    lastCheckIn: member.lastCheckIn || null
  };
}

/**
 * Optimizes feedback payload to reduce overall Firestore index and data memory usage.
 */
export function optimizeFeedbackForLowMemory(feedback: Feedback): Feedback {
  if (!feedback) return feedback;
  return {
    ...feedback,
    id: feedback.id.trim(),
    memberName: feedback.memberName ? feedback.memberName.trim().slice(0, 100) : 'Anonymous Member',
    memberEmail: feedback.memberEmail ? feedback.memberEmail.trim().toLowerCase() : '',
    suggestion: feedback.suggestion ? feedback.suggestion.trim().slice(0, 500) : '',
    category: feedback.category || 'Other',
    rating: Number(feedback.rating || 5),
    status: feedback.status || 'Pending'
  };
}

/**
 * Measures estimated memory footprint of an object in bytes.
 */
export function estimateObjectMemorySize(obj: any): number {
  const str = JSON.stringify(obj);
  return str ? str.length * 2 : 0; // 2 bytes per char in UTF-16
}

// Define Collection references
const MEMBERS_COLLECTION = 'members';
const PLANS_COLLECTION = 'membership_plans';
const CHECKINS_COLLECTION = 'checkins';
const WELCOME_MESSAGES_COLLECTION = 'welcome_messages';
const SETTINGS_COLLECTION = 'settings';
const FEEDBACKS_COLLECTION = 'feedbacks';

// ---------------------------------------------------------
// LOCALSTORAGE FALLBACK ENGINE
// ---------------------------------------------------------

function getLocalMembers(): Member[] {
  const saved = localStorage.getItem('ironpulse_local_members');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return INITIAL_MEMBERS;
}

function saveLocalMembers(list: Member[]) {
  localStorage.setItem('ironpulse_local_members', JSON.stringify(list));
}

function getLocalPlans(): MembershipPlan[] {
  const saved = localStorage.getItem('ironpulse_local_plans');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return MEMBERSHIP_PLANS;
}

function saveLocalPlans(list: MembershipPlan[]) {
  localStorage.setItem('ironpulse_local_plans', JSON.stringify(list));
}

function getLocalCheckins(): CheckIn[] {
  const saved = localStorage.getItem('ironpulse_local_checkins');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return INITIAL_CHECKINS;
}

function saveLocalCheckins(list: CheckIn[]) {
  localStorage.setItem('ironpulse_local_checkins', JSON.stringify(list));
}

function getLocalWelcomeMessages(): WelcomeMessage[] {
  const saved = localStorage.getItem('ironpulse_local_welcome_messages');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return [];
}

function saveLocalWelcomeMessages(list: WelcomeMessage[]) {
  localStorage.setItem('ironpulse_local_welcome_messages', JSON.stringify(list));
}

function getLocalFeedbacks(): Feedback[] {
  const saved = localStorage.getItem('ironpulse_local_feedbacks');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return [];
}

function saveLocalFeedbacks(list: Feedback[]) {
  localStorage.setItem('ironpulse_local_feedbacks', JSON.stringify(list));
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  id: 'security',
  ownerEmail: 'owner@apex.com',
  ownerPassword: 'apexowner2026',
  adminEmail: 'admin@apex.com',
  adminPassword: 'apexadmin2026'
};

export function getLocalSecurityConfig(): SecurityConfig {
  const saved = localStorage.getItem('ironpulse_local_security');
  if (saved) {
    try { 
      const parsed = JSON.parse(saved); 
      return { ...DEFAULT_SECURITY_CONFIG, ...parsed };
    } catch (e) {}
  }
  return DEFAULT_SECURITY_CONFIG;
}

export function saveLocalSecurityConfig(data: SecurityConfig) {
  localStorage.setItem('ironpulse_local_security', JSON.stringify(data));
}

// Memory listener pools to ensure real-time UI propagation 
const membersListeners = new Set<(members: Member[]) => void>();
const plansListeners = new Set<(plans: MembershipPlan[]) => void>();
const checkinsListeners = new Set<(checkins: CheckIn[]) => void>();
const welcomeMessagesListeners = new Set<(messages: WelcomeMessage[]) => void>();
const securityConfigListeners = new Set<(config: SecurityConfig) => void>();
const feedbacksListeners = new Set<(feedbacks: Feedback[]) => void>();

function notifyMembers(members: Member[]) {
  membersListeners.forEach(fn => fn(members));
}

function notifyPlans(plans: MembershipPlan[]) {
  plansListeners.forEach(fn => fn(plans));
}

function notifyCheckins(checkIns: CheckIn[]) {
  checkinsListeners.forEach(fn => fn(checkIns));
}

function notifyWelcomeMessages(messages: WelcomeMessage[]) {
  welcomeMessagesListeners.forEach(fn => fn(messages));
}

function notifySecurityConfig(config: SecurityConfig) {
  securityConfigListeners.forEach(fn => fn(config));
}

function notifyFeedbacks(feedbacks: Feedback[]) {
  feedbacksListeners.forEach(fn => fn(feedbacks));
}

// Listen to local storage sync events across tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'ironpulse_local_members') {
    notifyMembers(getLocalMembers());
  } else if (e.key === 'ironpulse_local_plans') {
    notifyPlans(getLocalPlans());
  } else if (e.key === 'ironpulse_local_checkins') {
    notifyCheckins(getLocalCheckins());
  } else if (e.key === 'ironpulse_local_welcome_messages') {
    notifyWelcomeMessages(getLocalWelcomeMessages());
  } else if (e.key === 'ironpulse_local_security') {
    notifySecurityConfig(getLocalSecurityConfig());
  } else if (e.key === 'ironpulse_local_feedbacks') {
    notifyFeedbacks(getLocalFeedbacks());
  }
});

// ---------------------------------------------------------
// DATABASE OPERATIONS & STATUS DETECTION
// ---------------------------------------------------------

export let isFirestoreAvailable = true;

// Helper to disable firestore operations and warn gracefully on permission or network block
function handleFirestoreError(err: any, context: string) {
  console.warn(`[Firestore] ${context} error. Ensuring local storage backup stays active. Details:`, err.message || err);
}

/**
 * Seeding method: runs once when the app mounts.
 * If data collections are empty, seeds Firestore (or local disk if restricted).
 */
export async function seedDatabaseIfEmpty() {
  // Always seed locally if storage was empty
  if (!localStorage.getItem('ironpulse_local_members')) {
    saveLocalMembers(INITIAL_MEMBERS);
  }
  if (!localStorage.getItem('ironpulse_local_plans')) {
    saveLocalPlans(MEMBERSHIP_PLANS);
  }
  if (!localStorage.getItem('ironpulse_local_checkins')) {
    saveLocalCheckins(INITIAL_CHECKINS);
  }
  if (!localStorage.getItem('ironpulse_local_security')) {
    saveLocalSecurityConfig(DEFAULT_SECURITY_CONFIG);
  }

  if (!isFirestoreAvailable) {
    return;
  }

  try {
    // Check settings configurations
    const settingsRef = collection(db, SETTINGS_COLLECTION);
    const settingsSnap = await getDocs(settingsRef);
    if (settingsSnap.empty) {
      console.log('Seeding security settings config into Firestore...');
      await setDoc(doc(db, SETTINGS_COLLECTION, 'security'), DEFAULT_SECURITY_CONFIG);
    }

    // Check members
    const membersRef = collection(db, MEMBERS_COLLECTION);
    const membersSnap = await getDocs(membersRef);
    if (membersSnap.empty) {
      console.log('Seeding initial members into Firestore...');
      for (const m of INITIAL_MEMBERS) {
        await setDoc(doc(db, MEMBERS_COLLECTION, m.id), m);
      }
    }

    // Check plans
    const plansRef = collection(db, PLANS_COLLECTION);
    const plansSnap = await getDocs(plansRef);
    if (plansSnap.empty) {
      console.log('Seeding plans into Firestore...');
      for (const plan of MEMBERSHIP_PLANS) {
        await setDoc(doc(db, PLANS_COLLECTION, plan.name), plan);
      }
    }

    // Check checkins
    const checkinsRef = collection(db, CHECKINS_COLLECTION);
    const checkinsSnap = await getDocs(checkinsRef);
    if (checkinsSnap.empty) {
      console.log('Seeding initial check-in history into Firestore...');
      for (const c of INITIAL_CHECKINS) {
        await setDoc(doc(db, CHECKINS_COLLECTION, c.id), c);
      }
    }
  } catch (error) {
    handleFirestoreError(error, 'seedDatabaseIfEmpty');
  }
}

/**
 * Realtime listeners with resilient offline localStorage callbacks
 */
export function subscribeToMembers(onUpdate: (members: Member[]) => void) {
  membersListeners.add(onUpdate);
  
  // Call initially with cached or fallback values
  onUpdate(getLocalMembers());

  if (!isFirestoreAvailable) {
    return () => {
      membersListeners.delete(onUpdate);
    };
  }

  let unsub = () => {};
  try {
    const q = collection(db, MEMBERS_COLLECTION);
    unsub = onSnapshot(q, (snapshot) => {
      const list: Member[] = [];
      snapshot.forEach((snapDoc) => {
        list.push(snapDoc.data() as Member);
      });
      saveLocalMembers(list);
      notifyMembers(list);
    }, (err) => {
      handleFirestoreError(err, 'Subscription (Members)');
      onUpdate(getLocalMembers());
    });
  } catch (err) {
    handleFirestoreError(err, 'Subscription startup (Members)');
  }

  return () => {
    membersListeners.delete(onUpdate);
    unsub();
  };
}

export function subscribeToPlans(onUpdate: (plans: MembershipPlan[]) => void) {
  plansListeners.add(onUpdate);
  
  // Call initially with cached or fallback values
  onUpdate(getLocalPlans());

  if (!isFirestoreAvailable) {
    return () => {
      plansListeners.delete(onUpdate);
    };
  }

  let unsub = () => {};
  try {
    const q = collection(db, PLANS_COLLECTION);
    unsub = onSnapshot(q, (snapshot) => {
      const list: MembershipPlan[] = [];
      snapshot.forEach((snapDoc) => {
        list.push(snapDoc.data() as MembershipPlan);
      });
      saveLocalPlans(list);
      notifyPlans(list);
    }, (err) => {
      handleFirestoreError(err, 'Subscription (Plans)');
      onUpdate(getLocalPlans());
    });
  } catch (err) {
    handleFirestoreError(err, 'Subscription startup (Plans)');
  }

  return () => {
    plansListeners.delete(onUpdate);
    unsub();
  };
}

export function subscribeToCheckIns(onUpdate: (checkIns: CheckIn[]) => void) {
  checkinsListeners.add(onUpdate);
  
  // Call initially with cached or fallback values
  onUpdate(getLocalCheckins());

  if (!isFirestoreAvailable) {
    return () => {
      checkinsListeners.delete(onUpdate);
    };
  }

  let unsub = () => {};
  try {
    const q = query(collection(db, CHECKINS_COLLECTION), orderBy('timestamp', 'desc'));
    unsub = onSnapshot(q, (snapshot) => {
      const list: CheckIn[] = [];
      snapshot.forEach((snapDoc) => {
        list.push(snapDoc.data() as CheckIn);
      });
      saveLocalCheckins(list);
      notifyCheckins(list);
    }, (err) => {
      // Trying fallback raw listener
      try {
        const fallbackQ = collection(db, CHECKINS_COLLECTION);
        const fbUnsub = onSnapshot(fallbackQ, (fallbackSnapshot) => {
          const fbList: CheckIn[] = [];
          fallbackSnapshot.forEach((fbDoc) => {
            fbList.push(fbDoc.data() as CheckIn);
          });
          fbList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          saveLocalCheckins(fbList);
          notifyCheckins(fbList);
        }, (fallbackErr) => {
          handleFirestoreError(fallbackErr, 'Subscription (Checkins)');
          onUpdate(getLocalCheckins());
        });
        unsub = fbUnsub;
      } catch (innerErr) {
        handleFirestoreError(innerErr, 'Subscription Fallback Startup (Checkins)');
      }
    });
  } catch (err) {
    handleFirestoreError(err, 'Subscription startup (Checkins)');
  }

  return () => {
    checkinsListeners.delete(onUpdate);
    unsub();
  };
}

export function subscribeToWelcomeMessages(onUpdate: (messages: WelcomeMessage[]) => void): () => void {
  welcomeMessagesListeners.add(onUpdate);
  onUpdate(getLocalWelcomeMessages());

  let unsub = () => {};

  if (!isFirestoreAvailable) {
    return () => {
      welcomeMessagesListeners.delete(onUpdate);
    };
  }

  try {
    const q = query(collection(db, WELCOME_MESSAGES_COLLECTION), orderBy('timestamp', 'desc'));
    
    unsub = onSnapshot(q, (snapshot) => {
      const list: WelcomeMessage[] = [];
      snapshot.forEach((snapDoc) => {
        list.push(snapDoc.data() as WelcomeMessage);
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      saveLocalWelcomeMessages(list);
      notifyWelcomeMessages(list);
    }, (err) => {
      try {
        const fallbackQ = collection(db, WELCOME_MESSAGES_COLLECTION);
        const fbUnsub = onSnapshot(fallbackQ, (fallbackSnapshot) => {
          const fbList: WelcomeMessage[] = [];
          fallbackSnapshot.forEach((fbDoc) => {
            fbList.push(fbDoc.data() as WelcomeMessage);
          });
          fbList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          saveLocalWelcomeMessages(fbList);
          notifyWelcomeMessages(fbList);
        }, (fallbackErr) => {
          handleFirestoreError(fallbackErr, 'Subscription (WelcomeMessages)');
          onUpdate(getLocalWelcomeMessages());
        });
        unsub = fbUnsub;
      } catch (innerErr) {
        handleFirestoreError(innerErr, 'Subscription Fallback Startup (WelcomeMessages)');
      }
    });
  } catch (err) {
    handleFirestoreError(err, 'Subscription startup (WelcomeMessages)');
  }

  return () => {
    welcomeMessagesListeners.delete(onUpdate);
    unsub();
  };
}

/**
 * Data Mutators (CUD operations) with dual-write and error insulation
 */
export async function dbAddMember(member: Member) {
  if (!member || !member.id || !member.id.trim()) {
    console.warn('[Firestore] dbAddMember skipped: invalid/blank member ID.', member);
    return;
  }
  const optimized = optimizeMemberForLowMemory(member);
  const cleanId = optimized.id;

  // Update local
  const list = getLocalMembers().filter(m => m.id !== cleanId);
  list.push(optimized);
  saveLocalMembers(list);
  notifyMembers(list);

  if (!isFirestoreAvailable) return;

  try {
    await setDoc(doc(db, MEMBERS_COLLECTION, cleanId), optimized);
  } catch (error) {
    handleFirestoreError(error, 'addMember');
  }
}

export async function dbUpdateMember(id: string, updates: Partial<Member>) {
  if (!id || !id.trim()) {
    console.warn('[Firestore] dbUpdateMember skipped: invalid/blank member ID.', id);
    return;
  }
  const cleanId = id.trim();

  // Retrieve current member to optimize fully
  const currentLocal = getLocalMembers().find(m => m.id === cleanId);
  const merged = currentLocal ? { ...currentLocal, ...updates } : updates as Member;
  const optimizedMerged = optimizeMemberForLowMemory(merged);

  // Update local
  const list = getLocalMembers().map(m => m.id === cleanId ? optimizedMerged : m);
  saveLocalMembers(list);
  notifyMembers(list);

  if (!isFirestoreAvailable) return;

  try {
    // Only update fields specified in updates but sanitize key attributes
    const cleanUpdates = { ...updates };
    if (cleanUpdates.photoUrl && cleanUpdates.photoUrl.startsWith('data:image') && cleanUpdates.photoUrl.length > 2000) {
      cleanUpdates.photoUrl = optimizedMerged.photoUrl;
    }
    if (cleanUpdates.notes) {
      cleanUpdates.notes = optimizedMerged.notes;
    }
    await updateDoc(doc(db, MEMBERS_COLLECTION, cleanId), cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, 'updateMember');
  }
}

export async function dbDeleteMember(id: string) {
  if (!id || !id.trim()) {
    console.warn('[Firestore] dbDeleteMember skipped: invalid/blank member ID.', id);
    return;
  }
  const cleanId = id.trim();

  // Update local membership registry
  const list = getLocalMembers().filter(m => m.id !== cleanId);
  saveLocalMembers(list);
  notifyMembers(list);

  // Update local checkins to scrub member history
  const history = getLocalCheckins().filter(c => c.memberId !== cleanId);
  saveLocalCheckins(history);
  notifyCheckins(history);

  if (!isFirestoreAvailable) return;

  try {
    await deleteDoc(doc(db, MEMBERS_COLLECTION, cleanId));
  } catch (error) {
    handleFirestoreError(error, 'deleteMember');
  }
}

export async function dbAddCheckIn(checkIn: CheckIn) {
  if (!checkIn || !checkIn.id || !checkIn.id.trim()) {
    console.warn('[Firestore] dbAddCheckIn skipped: invalid/blank checkIn ID.', checkIn);
    return;
  }
  const cleanId = checkIn.id.trim();
  const cleanCheckIn = { ...checkIn, id: cleanId };

  // Update local
  const list = getLocalCheckins().filter(c => c.id !== cleanId);
  list.unshift(cleanCheckIn);
  saveLocalCheckins(list);
  notifyCheckins(list);

  if (!isFirestoreAvailable) return;

  try {
    await setDoc(doc(db, CHECKINS_COLLECTION, cleanId), cleanCheckIn);
  } catch (error) {
    handleFirestoreError(error, 'addCheckIn');
  }
}

export async function dbAddPlan(plan: MembershipPlan) {
  if (!plan || !plan.name || !plan.name.trim()) {
    console.warn('[Firestore] dbAddPlan skipped: invalid/blank plan name.', plan);
    return;
  }
  const cleanName = plan.name.trim();
  const cleanPlan = { ...plan, name: cleanName };

  // Update local
  const list = getLocalPlans().filter(p => p.name !== cleanName);
  list.push(cleanPlan);
  saveLocalPlans(list);
  notifyPlans(list);

  if (!isFirestoreAvailable) return;

  try {
    await setDoc(doc(db, PLANS_COLLECTION, cleanName), cleanPlan);
  } catch (error) {
    handleFirestoreError(error, 'addPlan');
  }
}

export async function dbDeletePlan(name: string) {
  if (!name || !name.trim()) {
    console.warn('[Firestore] dbDeletePlan skipped: invalid/blank plan name.', name);
    return;
  }
  const cleanName = name.trim();

  // Update local
  const list = getLocalPlans().filter(p => p.name !== cleanName);
  saveLocalPlans(list);
  notifyPlans(list);

  if (!isFirestoreAvailable) return;

  try {
    await deleteDoc(doc(db, PLANS_COLLECTION, cleanName));
  } catch (error) {
    handleFirestoreError(error, 'deletePlan');
  }
}

export async function dbAddWelcomeMessage(msg: WelcomeMessage) {
  if (!msg || !msg.id || !msg.id.trim()) {
    console.warn('[Firestore] dbAddWelcomeMessage skipped: invalid message.', msg);
    return;
  }
  const cleanId = msg.id.trim();
  const cleanMsg = { ...msg, id: cleanId };

  // Update local
  const list = getLocalWelcomeMessages().filter(m => m.id !== cleanId);
  list.unshift(cleanMsg);
  // Keep only the last 100 for storage sanity
  const trimmed = list.slice(0, 100);
  saveLocalWelcomeMessages(trimmed);
  notifyWelcomeMessages(trimmed);

  if (!isFirestoreAvailable) return;

  try {
    await setDoc(doc(db, WELCOME_MESSAGES_COLLECTION, cleanId), cleanMsg);
  } catch (error) {
    handleFirestoreError(error, 'addWelcomeMessage');
  }
}

export async function dbUpdateWelcomeMessage(id: string, updates: Partial<WelcomeMessage>) {
  if (!id || !id.trim()) return;
  const cleanId = id.trim();

  // Update local
  const list = getLocalWelcomeMessages().map(m => {
    if (m.id === cleanId) {
      return { ...m, ...updates };
    }
    return m;
  });
  saveLocalWelcomeMessages(list);
  notifyWelcomeMessages(list);

  if (!isFirestoreAvailable) return;

  try {
    await updateDoc(doc(db, WELCOME_MESSAGES_COLLECTION, cleanId), updates);
  } catch (error) {
    handleFirestoreError(error, 'updateWelcomeMessage');
  }
}

export async function dbDeleteWelcomeMessage(id: string) {
  if (!id || !id.trim()) return;
  const cleanId = id.trim();

  // Update local
  const list = getLocalWelcomeMessages().filter(m => m.id !== cleanId);
  saveLocalWelcomeMessages(list);
  notifyWelcomeMessages(list);

  if (!isFirestoreAvailable) return;

  try {
    await deleteDoc(doc(db, WELCOME_MESSAGES_COLLECTION, cleanId));
  } catch (error) {
    handleFirestoreError(error, 'deleteWelcomeMessage');
  }
}

/**
 * Truncates all check-in entries from Firestore and localStorage (Admin utility)
 */
export async function dbClearCheckIns() {
  saveLocalCheckins([]);
  notifyCheckins([]);
  if (!isFirestoreAvailable) return;
  try {
    const ref = collection(db, CHECKINS_COLLECTION);
    const snaps = await getDocs(ref);
    for (const snapDoc of snaps.docs) {
      await deleteDoc(doc(db, CHECKINS_COLLECTION, snapDoc.id));
    }
  } catch (err) {
    handleFirestoreError(err, 'clearCheckIns');
  }
}

/**
 * Purges all welcome message logs from Firestore and localStorage (Admin utility)
 */
export async function dbClearWelcomeMessages() {
  saveLocalWelcomeMessages([]);
  notifyWelcomeMessages([]);
  if (!isFirestoreAvailable) return;
  try {
    const ref = collection(db, WELCOME_MESSAGES_COLLECTION);
    const snaps = await getDocs(ref);
    for (const snapDoc of snaps.docs) {
      await deleteDoc(doc(db, WELCOME_MESSAGES_COLLECTION, snapDoc.id));
    }
  } catch (err) {
    handleFirestoreError(err, 'clearWelcomeMessages');
  }
}

/**
 * Resets each registered member's check-in stats to zero (Admin utility)
 */
export async function dbResetMemberStats() {
  const current = getLocalMembers();
  const reset = current.map(m => ({
    ...m,
    totalCheckIns: 0,
    lastCheckIn: null
  }));
  saveLocalMembers(reset);
  notifyMembers(reset);
  if (!isFirestoreAvailable) return;
  try {
    const ref = collection(db, MEMBERS_COLLECTION);
    const snaps = await getDocs(ref);
    for (const snapDoc of snaps.docs) {
      await updateDoc(doc(db, MEMBERS_COLLECTION, snapDoc.id), {
        totalCheckIns: 0,
        lastCheckIn: null
      });
    }
  } catch (err) {
    handleFirestoreError(err, 'resetMemberStats');
  }
}

export function subscribeToSecurityConfig(onUpdate: (config: SecurityConfig) => void) {
  securityConfigListeners.add(onUpdate);
  
  // Call initially with cached or fallback values
  onUpdate(getLocalSecurityConfig());

  if (!isFirestoreAvailable) {
    return () => {
      securityConfigListeners.delete(onUpdate);
    };
  }

  let unsub = () => {};
  try {
    const q = collection(db, SETTINGS_COLLECTION);
    unsub = onSnapshot(q, (snapshot) => {
      let config = getLocalSecurityConfig();
      snapshot.forEach((snapDoc) => {
        if (snapDoc.id === 'security') {
          config = snapDoc.data() as SecurityConfig;
        }
      });
      saveLocalSecurityConfig(config);
      notifySecurityConfig(config);
    }, (err) => {
      handleFirestoreError(err, 'Subscription (SecurityConfig)');
      onUpdate(getLocalSecurityConfig());
    });
  } catch (err) {
    handleFirestoreError(err, 'Subscription startup (SecurityConfig)');
  }

  return () => {
    securityConfigListeners.delete(onUpdate);
    unsub();
  };
}

export async function dbUpdateSecurityConfig(config: SecurityConfig) {
  saveLocalSecurityConfig(config);
  notifySecurityConfig(config);

  if (!isFirestoreAvailable) return;

  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, 'security'), config);
  } catch (err) {
    handleFirestoreError(err, 'updateSecurityConfig');
  }
}

export function subscribeToFeedbacks(onUpdate: (feedbacks: Feedback[]) => void): () => void {
  feedbacksListeners.add(onUpdate);
  onUpdate(getLocalFeedbacks());

  let unsub = () => {};

  if (!isFirestoreAvailable) {
    return () => {
      feedbacksListeners.delete(onUpdate);
    };
  }

  try {
    const q = query(collection(db, FEEDBACKS_COLLECTION), orderBy('timestamp', 'desc'));
    
    unsub = onSnapshot(q, (snapshot) => {
      const list: Feedback[] = [];
      snapshot.forEach((snapDoc) => {
        list.push(snapDoc.data() as Feedback);
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      saveLocalFeedbacks(list);
      notifyFeedbacks(list);
    }, (err) => {
      try {
        const fallbackQ = collection(db, FEEDBACKS_COLLECTION);
        const fbUnsub = onSnapshot(fallbackQ, (fallbackSnapshot) => {
          const fbList: Feedback[] = [];
          fallbackSnapshot.forEach((fbDoc) => {
            fbList.push(fbDoc.data() as Feedback);
          });
          fbList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          saveLocalFeedbacks(fbList);
          notifyFeedbacks(fbList);
        }, (fallbackErr) => {
          handleFirestoreError(fallbackErr, 'Subscription (Feedbacks)');
          onUpdate(getLocalFeedbacks());
        });
        unsub = fbUnsub;
      } catch (innerErr) {
        handleFirestoreError(innerErr, 'Subscription Fallback Startup (Feedbacks)');
      }
    });
  } catch (err) {
    handleFirestoreError(err, 'Subscription startup (Feedbacks)');
  }

  return () => {
    feedbacksListeners.delete(onUpdate);
    unsub();
  };
}

export async function dbAddFeedback(feedback: Feedback) {
  if (!feedback || !feedback.id) return;
  const optimized = optimizeFeedbackForLowMemory(feedback);
  const cleanId = optimized.id;

  // Update local
  const list = getLocalFeedbacks().filter(f => f.id !== cleanId);
  list.unshift(optimized);
  saveLocalFeedbacks(list);
  notifyFeedbacks(list);

  if (!isFirestoreAvailable) return;

  try {
    await setDoc(doc(db, FEEDBACKS_COLLECTION, cleanId), optimized);
  } catch (error) {
    handleFirestoreError(error, 'addFeedback');
  }
}

export async function dbUpdateFeedbackStatus(id: string, status: 'Pending' | 'Reviewed' | 'Addressed') {
  if (!id) return;
  const cleanId = id.trim();

  // Update local
  const list = getLocalFeedbacks().map(f => f.id === cleanId ? { ...f, status } : f);
  saveLocalFeedbacks(list);
  notifyFeedbacks(list);

  if (!isFirestoreAvailable) return;

  try {
    await updateDoc(doc(db, FEEDBACKS_COLLECTION, cleanId), { status });
  } catch (error) {
    handleFirestoreError(error, 'updateFeedbackStatus');
  }
}

export async function dbDeleteFeedback(id: string) {
  if (!id) return;
  const cleanId = id.trim();

  // Update local
  const list = getLocalFeedbacks().filter(f => f.id !== cleanId);
  saveLocalFeedbacks(list);
  notifyFeedbacks(list);

  if (!isFirestoreAvailable) return;

  try {
    await deleteDoc(doc(db, FEEDBACKS_COLLECTION, cleanId));
  } catch (error) {
    handleFirestoreError(error, 'deleteFeedback');
  }
}

export async function dbClearFeedbacks() {
  saveLocalFeedbacks([]);
  notifyFeedbacks([]);
  if (!isFirestoreAvailable) return;
  try {
    const ref = collection(db, FEEDBACKS_COLLECTION);
    const snaps = await getDocs(ref);
    for (const snapDoc of snaps.docs) {
      await deleteDoc(doc(db, FEEDBACKS_COLLECTION, snapDoc.id));
    }
  } catch (err) {
    handleFirestoreError(err, 'clearFeedbacks');
  }
}


