const ANON_KEY = "ca_anonymous_id";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable anonymous browser id for analysis tracking (no login). */
export function getOrCreateAnonymousId(): string {
  try {
    const existing = localStorage.getItem(ANON_KEY)?.trim();
    if (existing) return existing;
    const id = createId();
    localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    return createId();
  }
}
