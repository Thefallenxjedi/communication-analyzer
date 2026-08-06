import { isValidLeadEmail } from "@/lib/email";

export const LEAD_STORAGE_KEY = "ca_lead";

export type LeadPayload = {
  name?: string;
  email?: string;
  source?: "kartra" | "namegate" | string;
  at?: number;
};

export function saveLead(lead: LeadPayload): void {
  try {
    sessionStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(lead));
  } catch {
    // ignore
  }
}

/** Mark lead collected after Kartra redirect back to the app. */
export function saveKartraLead(): LeadPayload {
  const lead: LeadPayload = { source: "kartra", at: Date.now() };
  saveLead(lead);
  return lead;
}

export function readLead(): LeadPayload | null {
  try {
    const raw = sessionStorage.getItem(LEAD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeadPayload;
    if (parsed?.source === "kartra") return parsed;
    if (
      parsed?.name &&
      typeof parsed.email === "string" &&
      isValidLeadEmail(parsed.email)
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}
