// Sync logic: when online, flush pending sessions/sets to backend.

import {
  attachServerId,
  countPending,
  listAllPendingSets,
  listPendingSessions,
  removePendingSession,
  removePendingSet,
} from './offlineCache';
import { client } from '../api/client';

export interface SyncResult {
  sessionsCreated: number;
  setsSynced: number;
  failedSets: number;
  errors: string[];
}

export async function syncPending(): Promise<SyncResult> {
  const result: SyncResult = {
    sessionsCreated: 0,
    setsSynced: 0,
    failedSets: 0,
    errors: [],
  };

  // 1. Sync pending sessions (create new server session for each)
  const pending = await listPendingSessions();
  const sessionIdMap = new Map<string, number>(); // localId -> serverId

  for (const ps of pending) {
    if (ps.server_id) {
      // Already mapped
      sessionIdMap.set(ps.id, ps.server_id);
      continue;
    }
    try {
      const resp = await client.post<{ data: { id: number } }>('/sessions', {
        plan_id: ps.plan_id,
        session_date: ps.session_date,
        notes: ps.notes,
      });
      const serverId = resp.data.data.id;
      await attachServerId(ps.id, serverId);
      sessionIdMap.set(ps.id, serverId);
      result.sessionsCreated += 1;
    } catch (err) {
      result.errors.push(`session ${ps.id}: ${(err as Error).message}`);
    }
  }

  // 2. Sync pending sets (group by session, send in batch)
  const allSets = await listAllPendingSets();
  const bySession = new Map<string, typeof allSets>();
  for (const s of allSets) {
    const key = s.session_id as unknown as string; // stored as local id
    if (!bySession.has(key)) bySession.set(key, []);
    bySession.get(key)!.push(s);
  }

  for (const [localId, sets] of bySession.entries()) {
    const serverId = sessionIdMap.get(localId);
    if (!serverId) {
      // Session didn't sync — skip its sets
      result.failedSets += sets.length;
      continue;
    }
    try {
      await client.post(`/sessions/${serverId}/sets`, {
        sets: sets.map((s) => ({
          exercise_id: s.exercise_id,
          plan_exercise_id: s.plan_exercise_id,
          set_index: s.set_index,
          reps: s.reps,
          weight: s.weight,
          rpe: s.rpe,
          completed: s.completed,
        })),
      });
      // All sets in this batch synced — remove them
      for (const s of sets) {
        await removePendingSet(s.id);
      }
      result.setsSynced += sets.length;
    } catch (err) {
      result.failedSets += sets.length;
      result.errors.push(`sets for session ${serverId}: ${(err as Error).message}`);
    }
  }

  // 3. Remove sessions that fully synced
  for (const ps of pending) {
    if (sessionIdMap.has(ps.id)) {
      const remaining = (await listAllPendingSets()).filter(
        (s) => s.session_id === (ps.id as unknown as number),
      );
      if (remaining.length === 0) {
        await removePendingSession(ps.id);
      }
    }
  }

  return result;
}

export async function getPendingSummary(): Promise<{ sessions: number; sets: number }> {
  return countPending();
}
