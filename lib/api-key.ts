import { DEFAULT_MODEL_ID, resolveModelId } from "@/lib/gemini";

export const API_KEY_STORAGE_KEY = "ca_google_api_key";
export const MODEL_STORAGE_KEY = "ca_google_model";
export const API_KEY_HEADER = "x-google-api-key";
export const MODEL_HEADER = "x-google-model";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setStoredApiKey(key: string): void {
  if (typeof window === "undefined") return;
  const trimmed = key.trim();
  try {
    if (trimmed) {
      localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredApiKey(): void {
  setStoredApiKey("");
}

export function getStoredModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL_ID;
  try {
    return resolveModelId(localStorage.getItem(MODEL_STORAGE_KEY));
  } catch {
    return DEFAULT_MODEL_ID;
  }
}

export function setStoredModel(modelId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, resolveModelId(modelId));
  } catch {
    // ignore
  }
}
