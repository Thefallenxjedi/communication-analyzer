import { validateEmail } from "@/lib/email";

const GHL_API = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";
export const GHL_FREE_TOOL_TAG = "Communication_tool";

const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [400, 1200];

export type GhlSyncResult =
  | { ok: true; contactId: string; created: boolean }
  | { ok: false; configured: boolean; reason: string };

type SyncDeps = {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

function env(name: string): string {
  return (process.env[name] || "").trim();
}

export function isGoHighLevelConfigured(): boolean {
  return Boolean(env("GHL_ACCESS_TOKEN") && env("GHL_LOCATION_ID"));
}

/** Full name as entered at signup. Control characters and markup are removed. */
export function sanitizeContactName(raw: string): string | null {
  const name = raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!name || !/[\p{L}\p{N}]/u.test(name)) return null;
  return name;
}

function redact(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .slice(0, 180);
}

function errorMessage(status: number, body: string): string {
  let detail = "";
  try {
    const json = JSON.parse(body) as { message?: unknown; error?: unknown };
    const message = json.message ?? json.error;
    if (typeof message === "string") detail = message;
  } catch {
    detail = body;
  }
  const suffix = detail ? `: ${redact(detail)}` : "";
  return `GoHighLevel request failed (${status})${suffix}`;
}

async function ghlRequest(
  path: string,
  body: Record<string, unknown>,
  deps: Required<Pick<SyncDeps, "fetchImpl" | "sleep">>,
): Promise<{ ok: true; json: unknown } | { ok: false; reason: string }> {
  const token = env("GHL_ACCESS_TOKEN");
  let lastReason = "GoHighLevel request failed";

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const res = await deps.fetchImpl(`${GHL_API}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          Version: GHL_VERSION,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      const text = await res.text();
      if (res.ok) {
        try {
          return { ok: true, json: text ? JSON.parse(text) : {} };
        } catch {
          return { ok: false, reason: "GoHighLevel returned an unreadable response" };
        }
      }
      lastReason = errorMessage(res.status, text);
      if (!RETRY_STATUSES.has(res.status) || attempt === RETRY_DELAYS_MS.length) {
        return { ok: false, reason: lastReason };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "network error";
      lastReason = `GoHighLevel request failed: ${redact(message)}`;
      if (attempt === RETRY_DELAYS_MS.length) {
        return { ok: false, reason: lastReason };
      }
    }
    await deps.sleep(RETRY_DELAYS_MS[attempt] ?? 0);
  }

  return { ok: false, reason: lastReason };
}

function contactIdFrom(json: unknown): string | null {
  const id = (json as { contact?: { id?: unknown } })?.contact?.id;
  if (typeof id !== "string" || !/^[A-Za-z0-9]{8,64}$/.test(id)) return null;
  return id;
}

/**
 * Create or update a free-tool lead, then add the tag without replacing
 * tags the contact already has. Sends only name, email, and the tag.
 */
export async function syncFreeToolContact(
  input: { name: string; email: string },
  deps: SyncDeps = {},
): Promise<GhlSyncResult> {
  if (!isGoHighLevelConfigured()) {
    return { ok: false, configured: false, reason: "not_configured" };
  }

  const name = sanitizeContactName(input.name);
  const emailCheck = validateEmail(input.email);
  if (!emailCheck.ok) {
    return { ok: false, configured: true, reason: "invalid_email" };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleep =
    deps.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const requestDeps = { fetchImpl, sleep };

  const upsert = await ghlRequest(
    "/contacts/upsert",
    {
      locationId: env("GHL_LOCATION_ID"),
      ...(name ? { firstName: name } : {}),
      email: emailCheck.email,
      createNewIfDuplicateAllowed: false,
    },
    requestDeps,
  );
  if (!upsert.ok) {
    return { ok: false, configured: true, reason: upsert.reason };
  }

  const contactId = contactIdFrom(upsert.json);
  if (!contactId) {
    return {
      ok: false,
      configured: true,
      reason: "GoHighLevel did not return a contact id",
    };
  }

  const tagged = await ghlRequest(
    `/contacts/${contactId}/tags`,
    { tags: [GHL_FREE_TOOL_TAG] },
    requestDeps,
  );
  if (!tagged.ok) {
    return { ok: false, configured: true, reason: tagged.reason };
  }

  const tags = (tagged.json as { tags?: unknown }).tags;
  const hasTag =
    Array.isArray(tags) &&
    tags.some((tag) => tag === GHL_FREE_TOOL_TAG);
  if (!hasTag) {
    return {
      ok: false,
      configured: true,
      reason: "GoHighLevel did not confirm the tag",
    };
  }

  const created = (upsert.json as { new?: unknown }).new === true;
  return { ok: true, contactId, created };
}
