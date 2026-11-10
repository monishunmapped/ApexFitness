import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, doc, setDoc, getDocs, onSnapshot, writeBatch, WriteBatch } from 'firebase/firestore';
import { Member, CheckIn, MembershipPlan, WelcomeMessage, SecurityConfig, Feedback } from '../types';
import { MEMBERSHIP_PLANS, INITIAL_MEMBERS, INITIAL_CHECKINS } from '../data/initialData';
import firebaseConfig from '../../firebase-applet-config.json';

export const db = initializeFirestore(
  initializeApp(firebaseConfig),
  { experimentalForceLongPolling: true, ignoreUndefinedProperties: true },
  firebaseConfig.firestoreDatabaseId
);

const warn = (ctx: string) => (err: unknown) => console.warn(`[Firestore] ${ctx}:`, err instanceof Error ? err.message : err);

function readLocal<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

async function commitAll(ops: ((b: WriteBatch) => void)[]) {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    ops.slice(i, i + 450).forEach(op => op(batch));
    await batch.commit();
  }
}

const newestFirst = (a: { timestamp: string }, b: { timestamp: string }) => Date.parse(b.timestamp) - Date.parse(a.timestamp);

function createStore<T extends object>(col: string, localName: string, fallback: T[], idOf: (x: T) => string, sort?: (a: T, b: T) => number) {
  const key = `ironpulse_local_${localName}`;
  const listeners = new Set<(list: T[]) => void>();
  const ref = (id: string) => doc(db, col, id);
  const get = () => readLocal<T[]>(key, fallback);
  const set = (list: T[]) => {
    if (sort) list.sort(sort);
    localStorage.setItem(key, JSON.stringify(list));
    listeners.forEach(fn => fn(list));
  };

  window.addEventListener('storage', e => e.key === key && listeners.forEach(fn => fn(get())));

  return {
    get,
    subscribe(fn: (list: T[]) => void) {
      listeners.add(fn);
      fn(get());
      const unsub = onSnapshot(collection(db, col), snap => set(snap.docs.map(d => d.data() as T)), warn(`subscribe ${col}`));
      return () => {
        listeners.delete(fn);
        unsub();
      };
    },
    async seed() {
      if (!localStorage.getItem(key)) set([...fallback]);
      const snap = await getDocs(collection(db, col));
      if (snap.empty && fallback.length) await commitAll(fallback.map(x => b => b.set(ref(idOf(x)), x)));
    },
    async put(...items: T[]) {
      const ids = new Set(items.map(idOf));
      set([...items, ...get().filter(x => !ids.has(idOf(x)))]);
      await commitAll(items.map(x => b => b.set(ref(idOf(x)), x))).catch(warn(`put ${col}`));
    },
    async patch(id: string, updates: Partial<T>) {
      set(get().map(x => (idOf(x) === id ? { ...x, ...updates } : x)));
      await setDoc(ref(id), updates, { merge: true }).catch(warn(`patch ${col}`));
    },
    async patchAll(updates: Partial<T>) {
      const list = get();
      set(list.map(x => ({ ...x, ...updates })));
      await commitAll(list.map(x => b => b.set(ref(idOf(x)), updates, { merge: true }))).catch(warn(`patchAll ${col}`));
    },
    async remove(...ids: string[]) {
      set(get().filter(x => !ids.includes(idOf(x))));
      await commitAll(ids.map(id => b => b.delete(ref(id)))).catch(warn(`remove ${col}`));
    },
    async clear() {
      set([]);
      try {
        const snap = await getDocs(collection(db, col));
        await commitAll(snap.docs.map(d => b => b.delete(d.ref)));
      } catch (err) {
        warn(`clear ${col}`)(err);
      }
    },
  };
}

export const membersDb = createStore<Member>('members', 'members', INITIAL_MEMBERS, m => m.id);
export const plansDb = createStore<MembershipPlan>('membership_plans', 'plans', MEMBERSHIP_PLANS, p => p.name);
export const checkInsDb = createStore<CheckIn>('checkins', 'checkins', INITIAL_CHECKINS, c => c.id, newestFirst);
export const messagesDb = createStore<WelcomeMessage>('welcome_messages', 'welcome_messages', [], m => m.id, newestFirst);
export const feedbacksDb = createStore<Feedback>('feedbacks', 'feedbacks', [], f => f.id, newestFirst);

export async function deleteMember(id: string) {
  await Promise.all([
    membersDb.remove(id),
    checkInsDb.remove(...checkInsDb.get().filter(c => c.memberId === id).map(c => c.id)),
  ]);
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  id: 'security',
  ownerEmail: 'owner@apex.com',
  ownerPassword: 'apexowner2026',
  adminEmail: 'admin@apex.com',
  adminPassword: 'apexadmin2026',
};

const SECURITY_KEY = 'ironpulse_local_security';
const securityRef = doc(db, 'settings', 'security');

export const getLocalSecurityConfig = (): SecurityConfig => ({ ...DEFAULT_SECURITY_CONFIG, ...readLocal(SECURITY_KEY, {}) });

export function subscribeToSecurityConfig(fn: (config: SecurityConfig) => void) {
  return onSnapshot(securityRef, snap => {
    if (!snap.exists()) {
      setDoc(securityRef, getLocalSecurityConfig()).catch(warn('seed security'));
      return;
    }
    const config = { ...DEFAULT_SECURITY_CONFIG, ...(snap.data() as SecurityConfig) };
    localStorage.setItem(SECURITY_KEY, JSON.stringify(config));
    fn(config);
  }, warn('subscribe security'));
}

export async function updateSecurityConfig(config: SecurityConfig) {
  localStorage.setItem(SECURITY_KEY, JSON.stringify(config));
  await setDoc(securityRef, config).catch(warn('update security'));
}

export async function seedDatabaseIfEmpty() {
  await Promise.all([membersDb.seed(), plansDb.seed(), checkInsDb.seed()]).catch(warn('seed'));
}

export async function factoryReset() {
  await Promise.all([messagesDb.clear(), checkInsDb.clear()]);
  await Promise.all([plansDb.put(...MEMBERSHIP_PLANS), membersDb.put(...INITIAL_MEMBERS), checkInsDb.put(...INITIAL_CHECKINS)]);
}
