import type { CaptureMethod } from "@/lib/capture-method";

export type StoredFailureState = {
  message: string;
  lastYoutubeUrl: string | null;
  lastDurationSec: number | null;
  lastCaptureMethod: CaptureMethod;
  retryWaitSec: number;
  savedAt: number;
};

const FAILURE_STORAGE_KEY = "ca_failure";

export function storeFailure(state: Omit<StoredFailureState, "savedAt">): void {
  try {
    sessionStorage.setItem(
      FAILURE_STORAGE_KEY,
      JSON.stringify({ ...state, savedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function readFailure(): StoredFailureState | null {
  try {
    const raw = sessionStorage.getItem(FAILURE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFailureState;
    if (!parsed?.message) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearFailure(): void {
  try {
    sessionStorage.removeItem(FAILURE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
