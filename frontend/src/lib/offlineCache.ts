// IndexedDB-backed offline cache for workout sessions and sets.
// When offline, log sets locally; when back online, sync to backend.

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

interface PendingSet {
  id: string;            // local UUID
  session_id: number;
  exercise_id: number;
  plan_exercise_id: number | null;
  set_index: number;
  reps: number;
  weight: number;
  rpe: number | null;
  completed: boolean;
  created_at: number;    // local timestamp (ms)
  attempts: number;      // sync retry count
}

interface PendingSession {
  id: string;            // local UUID
  plan_id: number | null;
  session_date: string;
  started_at: number;
  notes: string | null;
  server_id: number | null;  // mapped after sync
  attempts: number;
}

interface CachedSession {
  id: number;            // server id (once known)
  plan_id: number | null;
  session_date: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  plan: unknown;
  sets: unknown[];
  total_volume?: number;
}

interface GymDB extends DBSchema {
  pending_sessions: {
    key: string;
    value: PendingSession;
  };
  pending_sets: {
    key: string;
    value: PendingSet;
    indexes: { 'by-session': string };
  };
  cached_sessions: {
    key: number;
    value: CachedSession;
  };
}

const DB_NAME = 'gym-tracker';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GymDB>> | null = null;

function getDB(): Promise<IDBPDatabase<GymDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GymDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending_sessions')) {
          db.createObjectStore('pending_sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending_sets')) {
          const setStore = db.createObjectStore('pending_sets', { keyPath: 'id' });
          setStore.createIndex('by-session', 'session_id');
        }
        if (!db.objectStoreNames.contains('cached_sessions')) {
          db.createObjectStore('cached_sessions', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ===== Pending sessions =====

export async function queueSession(input: {
  plan_id: number | null;
  session_date: string;
  notes?: string | null;
}): Promise<{ localId: string; serverId: number | null }> {
  const db = await getDB();
  const localId = genId();
  const record: PendingSession = {
    id: localId,
    plan_id: input.plan_id,
    session_date: input.session_date,
    started_at: Date.now(),
    notes: input.notes ?? null,
    server_id: null,
    attempts: 0,
  };
  await db.put('pending_sessions', record);
  return { localId, serverId: null };
}

export async function listPendingSessions(): Promise<PendingSession[]> {
  const db = await getDB();
  return db.getAll('pending_sessions');
}

export async function attachServerId(localId: string, serverId: number): Promise<void> {
  const db = await getDB();
  const session = await db.get('pending_sessions', localId);
  if (session) {
    session.server_id = serverId;
    await db.put('pending_sessions', session);
  }
}

export async function removePendingSession(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete('pending_sessions', localId);
}

export async function getPendingSessionByLocalId(
  localId: string,
): Promise<PendingSession | undefined> {
  const db = await getDB();
  return db.get('pending_sessions', localId);
}

// ===== Pending sets =====

export async function queueSet(input: {
  sessionLocalId: string; // local session UUID; will be resolved to server id at sync
  exercise_id: number;
  plan_exercise_id: number | null;
  set_index: number;
  reps: number;
  weight: number;
  rpe: number | null;
  completed: boolean;
}): Promise<string> {
  const db = await getDB();
  const id = genId();
  const record: PendingSet = {
    id,
    session_id: input.sessionLocalId as unknown as number, // store local id here, resolve later
    exercise_id: input.exercise_id,
    plan_exercise_id: input.plan_exercise_id,
    set_index: input.set_index,
    reps: input.reps,
    weight: input.weight,
    rpe: input.rpe,
    completed: input.completed,
    created_at: Date.now(),
    attempts: 0,
  };
  await db.put('pending_sets', record);
  return id;
}

export async function listPendingSetsBySession(
  sessionLocalId: string,
): Promise<PendingSet[]> {
  const db = await getDB();
  const all = await db.getAll('pending_sets');
  return all.filter((s) => s.session_id === (sessionLocalId as unknown as number));
}

export async function listAllPendingSets(): Promise<PendingSet[]> {
  const db = await getDB();
  return db.getAll('pending_sets');
}

export async function removePendingSet(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pending_sets', id);
}

export async function countPending(): Promise<{ sessions: number; sets: number }> {
  const db = await getDB();
  const [s, set] = await Promise.all([
    db.count('pending_sessions'),
    db.count('pending_sets'),
  ]);
  return { sessions: s, sets: set };
}

// ===== Cached sessions (for offline read) =====

export async function cacheSession(session: CachedSession): Promise<void> {
  const db = await getDB();
  await db.put('cached_sessions', session);
}

export async function getCachedSession(id: number): Promise<CachedSession | undefined> {
  const db = await getDB();
  return db.get('cached_sessions', id);
}

export async function listCachedSessions(): Promise<CachedSession[]> {
  const db = await getDB();
  const all = await db.getAll('cached_sessions');
  return all.sort((a, b) => (b.started_at > a.started_at ? 1 : -1));
}

// ===== Online/offline detection =====

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function onConnectivityChange(handler: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onUp = () => handler(true);
  const onDown = () => handler(false);
  window.addEventListener('online', onUp);
  window.addEventListener('offline', onDown);
  return () => {
    window.removeEventListener('online', onUp);
    window.removeEventListener('offline', onDown);
  };
}
