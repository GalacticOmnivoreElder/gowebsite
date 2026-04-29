/** In-memory TTL cache so navigating between /admin/* pages does not refetch everything. */

const store = new Map();

export function getAdminCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > entry.ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setAdminCache(key, data, ttlMs = 45_000) {
  store.set(key, { at: Date.now(), ttlMs, data });
}

export function clearAdminCache(keyOrPrefix) {
  if (keyOrPrefix == null || keyOrPrefix === "") {
    store.clear();
    return;
  }
  for (const k of store.keys()) {
    if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
      store.delete(k);
    }
  }
}
