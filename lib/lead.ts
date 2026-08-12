import { isValidLeadEmail } from "@/lib/email";

export const LEAD_STORAGE_KEY = "ca_lead";

export type LeadPayload = {
  name?: string;
  email?: string;
  source?: "kartra" | "namegate" | "homepage" | "pdf" | string;
  at?: number;
};

export function saveLead(lead: LeadPayload): void {
  try {
    sessionStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(lead));
  } catch {
    // ignore
  }
}

/** Legacy: Kartra embed redirect back to /capture. */
export function saveKartraLead(): LeadPayload {
  const existing = readLead();
  if (existing?.email) return existing;
  const lead: LeadPayload = { source: "kartra", at: Date.now() };
  saveLead(lead);
  return lead;
}

export function readLead(): LeadPayload | null {
  try {
    const raw = sessionStorage.getItem(LEAD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeadPayload;
    if (
      parsed?.name &&
      typeof parsed.email === "string" &&
      isValidLeadEmail(parsed.email)
    ) {
      return parsed;
    }
    // Legacy Kartra-only marker (no email yet)
    if (parsed?.source === "kartra") return parsed;
  } catch {
    // ignore
  }
  return null;
}
