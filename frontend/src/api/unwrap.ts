// The API spec says list endpoints may return either a bare array or
// `{ data: T[], total: N }`. Normalize to a plain array.
export function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

// Single-object endpoints return `{ data: T }`. Normalize to T or null.
export function unwrapOne<T>(payload: unknown): T | null {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data: unknown }).data;
    if (data && typeof data === 'object') return data as T;
  }
  if (payload && typeof payload === 'object') return payload as T;
  return null;
}
