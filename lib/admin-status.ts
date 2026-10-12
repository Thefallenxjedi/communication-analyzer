import type { ConvexHttpClient } from "convex/browser";
import {
  analysesApi,
  formatConvexError,
  getConvexHttpClient,
  isConvexConfigured,
} from "@/lib/convex-server";
import { isKartraConfigured } from "@/lib/kartra";
import { DEFAULT_MODEL_ID } from "@/lib/gemini";
import { isYoutubeMp3Configured } from "@/lib/youtube-mp3-rapidapi";

export type ServiceStatus =
  | "operational"
  | "not_configured"
  | "error";

export type ServiceQuotaItem = {
  label: string;
  value: string;
};

/** Plan allowance shown on the status page. Static when the vendor has no usage API. */
export type ServiceQuota = {
  plan: string;
  price: string;
  items: ServiceQuotaItem[];
};

export type ServiceCheck = {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: ServiceStatus;
  latencyMs: number | null;
  detail: string;
  quota?: ServiceQuota;
};

export type SystemStatusReport = {
  checkedAt: string;
  overall: "operational" | "degraded" | "partial";
  headline: string;
  services: ServiceCheck[];
};

const CHECK_TIMEOUT_MS = 10_000;

async function withTimeout<T>(
  promise: Promise<T>,
  ms = CHECK_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Health check timed out")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function timed<T>(
  run: () => Promise<T>,
): Promise<{ ok: true; value: T; ms: number } | { ok: false; error: string; ms: number }> {
  const started = Date.now();
  try {
    const value = await withTimeout(run());
    return { ok: true, value, ms: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - started,
    };
  }
}

async function checkGemini(): Promise<ServiceCheck> {
  const base: Omit<ServiceCheck, "status" | "latencyMs" | "detail"> = {
    id: "gemini",
    name: "Gemini AI",
    description: "Transcription + diagnosis (Google Generative AI)",
    required: true,
  };
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || "";
  if (!key) {
    return {
      ...base,
      status: "not_configured",
      latencyMs: null,
      detail: "GOOGLE_GENERATIVE_AI_API_KEY is missing on Vercel.",
    };
  }

  const result = await timed(async () => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL_ID}?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const text = await res.text();
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(text) as { error?: { message?: string } };
        if (json.error?.message) message = json.error.message;
      } catch {
        if (text.trim()) message = text.slice(0, 160);
      }
      throw new Error(message);
    }
    return true;
  });

  if (!result.ok) {
    return {
      ...base,
      status: "error",
      latencyMs: result.ms,
      detail: result.error.slice(0, 200),
    };
  }
  return {
    ...base,
    status: "operational",
    latencyMs: result.ms,
    detail: `Model ${DEFAULT_MODEL_ID} reachable.`,
  };
}

async function checkConvex(authed?: ConvexHttpClient | null): Promise<ServiceCheck> {
  const base: Omit<ServiceCheck, "status" | "latencyMs" | "detail"> = {
    id: "convex",
    name: "Convex",
    description: "Analyses, reports, surveys, prompts",
    required: true,
  };
  if (!isConvexConfigured()) {
    return {
      ...base,
      status: "not_configured",
      latencyMs: null,
      detail: "NEXT_PUBLIC_CONVEX_URL is missing.",
    };
  }

  const result = await timed(async () => {
    const client = authed ?? getConvexHttpClient();
    if (!client) throw new Error("Convex client unavailable.");
    await client.query(analysesApi.getStats, {});
    return true;
  });

  if (!result.ok) {
    return {
      ...base,
      status: "error",
      latencyMs: result.ms,
      detail: formatConvexError(result.error).slice(0, 200),
    };
  }
  return {
    ...base,
    status: "operational",
    latencyMs: result.ms,
    detail: "Database query succeeded.",
  };
}

async function checkKartra(): Promise<ServiceCheck> {
  const base: Omit<ServiceCheck, "status" | "latencyMs" | "detail"> = {
    id: "kartra",
    name: "Kartra",
    description: "Lead sync after diagnosis",
    required: false,
  };
  if (!isKartraConfigured()) {
    return {
      ...base,
      status: "not_configured",
      latencyMs: null,
      detail: "KARTRA_APP_ID / API_KEY / API_PASSWORD not set.",
    };
  }

  const result = await timed(async () => {
    const params = new URLSearchParams();
    params.set("app_id", process.env.KARTRA_APP_ID!.trim());
    params.set("api_key", process.env.KARTRA_API_KEY!.trim());
    params.set("api_password", process.env.KARTRA_API_PASSWORD!.trim());
    // Lightweight auth probe — retrieve a non-existent lead.
    params.set("lead[email]", "healthcheck-does-not-exist@elitespeak.invalid");
    params.set("actions[0][cmd]", "retrieve_lead");

    const res = await fetch("https://app.kartra.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      cache: "no-store",
    });
    const text = await res.text();
    let json: { status?: string; message?: string; type?: string | number } = {};
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      throw new Error(`Non-JSON response (HTTP ${res.status})`);
    }

    const status = String(json.status || "").toLowerCase();
    const message = String(json.message || "");
    // Auth failures usually Error + invalid credentials wording.
    if (
      status === "error" &&
      /invalid|password|api_key|unauthorized|denied|credential/i.test(message)
    ) {
      throw new Error(message || "Kartra rejected credentials.");
    }
    // Success, or "lead not found" still means API + auth work.
    return message || status || "ok";
  });

  if (!result.ok) {
    return {
      ...base,
      status: "error",
      latencyMs: result.ms,
      detail: result.error.slice(0, 200),
    };
  }
  return {
    ...base,
    status: "operational",
    latencyMs: result.ms,
    detail: "API credentials accepted.",
  };
}

async function checkResend(): Promise<ServiceCheck> {
  const base: Omit<ServiceCheck, "status" | "latencyMs" | "detail"> = {
    id: "resend",
    name: "Resend API",
    description: "Client invitations and session-update automations",
    required: false,
  };
  const key = process.env.RESEND_API_KEY?.trim() || "";
  if (!key) {
    return {
      ...base,
      status: "not_configured",
      latencyMs: null,
      detail: "RESEND_API_KEY is missing on Vercel.",
    };
  }

  const result = await timed(async () => {
    const welcomeEvent =
      process.env.RESEND_EVENT_NAME?.trim() || "user_registered";
    const eventNames = [...new Set([welcomeEvent, "session_completed"])];
    const checks = await Promise.all(
      eventNames.map(async (eventName) => {
        const res = await fetch(
          `https://api.resend.com/events/${encodeURIComponent(eventName)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${key}`,
              Accept: "application/json",
            },
            cache: "no-store",
          },
        );
        const text = await res.text();
        if (!res.ok) {
          let message = `HTTP ${res.status}`;
          try {
            const json = JSON.parse(text) as { message?: string };
            if (json.message) message = json.message;
          } catch {
            if (text.trim()) message = text.slice(0, 160);
          }
          throw new Error(`${eventName}: ${message}`);
        }
        return eventName;
      }),
    );
    return checks;
  });

  if (!result.ok) {
    return {
      ...base,
      status: "error",
      latencyMs: result.ms,
      detail: result.error.slice(0, 200),
    };
  }
  return {
    ...base,
    status: "operational",
    latencyMs: result.ms,
    detail: `API key accepted. Events reachable: ${result.value.join(", ")}.`,
  };
}

/** SerpAPI free plan: 250 successful searches per month. Account API calls are free. */
const SERPAPI_FREE_MONTHLY_CREDITS = 250;

type SerpAccount = {
  accountStatus?: string;
  planName?: string;
  planMonthlyPrice?: number;
  searchesPerMonth?: number;
  planSearchesLeft?: number;
  thisMonthUsage?: number;
  rateLimitPerHour?: number;
};

function serpApiKey(): string {
  return (
    process.env.SERPAPI_API_KEY?.trim() ||
    process.env.SERPAPI_KEY?.trim() ||
    ""
  );
}

function formatMonthlyPrice(amount: number): string {
  return `$${amount.toFixed(2)} / mo`;
}

function readSerpAccount(payload: unknown): SerpAccount | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const num = (key: string): number | undefined =>
    typeof row[key] === "number" && Number.isFinite(row[key])
      ? (row[key] as number)
      : undefined;
  const str = (key: string): string | undefined =>
    typeof row[key] === "string" && row[key].trim()
      ? (row[key] as string).trim()
      : undefined;
  return {
    accountStatus: str("account_status"),
    planName: str("plan_name"),
    planMonthlyPrice: num("plan_monthly_price"),
    searchesPerMonth: num("searches_per_month"),
    planSearchesLeft: num("plan_searches_left"),
    thisMonthUsage: num("this_month_usage"),
    rateLimitPerHour: num("account_rate_limit_per_hour"),
  };
}

function youtubeTranscriptQuota(account?: SerpAccount | null): ServiceQuota {
  const monthly = account?.searchesPerMonth ?? SERPAPI_FREE_MONTHLY_CREDITS;
  const price = account?.planMonthlyPrice ?? 0;
  const free = price === 0;
  const items: ServiceQuotaItem[] = [
    {
      label: "Monthly credits",
      value: free
        ? `${monthly.toLocaleString()} free / month`
        : `${monthly.toLocaleString()} / month`,
    },
  ];
  if (account?.planSearchesLeft != null) {
    items.push({
      label: "Credits left",
      value: account.planSearchesLeft.toLocaleString(),
    });
  }
  if (account?.thisMonthUsage != null) {
    items.push({
      label: "Used this month",
      value: account.thisMonthUsage.toLocaleString(),
    });
  }
  if (account?.rateLimitPerHour != null) {
    items.push({
      label: "Rate limit",
      value: `${account.rateLimitPerHour.toLocaleString()} / hour`,
    });
  }
  return {
    plan: account?.planName || "Free",
    price: formatMonthlyPrice(price),
    items,
  };
}

async function checkYoutubeTranscript(): Promise<ServiceCheck> {
  const base: Omit<ServiceCheck, "status" | "latencyMs" | "detail"> = {
    id: "youtube-transcript",
    name: "YouTube transcript (SerpAPI)",
    description: "Primary caption lookup for YouTube analysis",
    required: false,
    quota: youtubeTranscriptQuota(),
  };
  const key = serpApiKey();
  if (!key) {
    return {
      ...base,
      status: "not_configured",
      latencyMs: null,
      detail:
        "SERPAPI_API_KEY is missing. Free plan includes 250 credits every month.",
    };
  }

  const result = await timed(async () => {
    const url = new URL("https://serpapi.com/account.json");
    url.searchParams.set("api_key", key);
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    let payload: unknown = null;
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
    if (!res.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : `HTTP ${res.status}`;
      throw new Error(message);
    }
    const account = readSerpAccount(payload);
    if (!account) throw new Error("Account API returned an unexpected payload.");
    return account;
  });

  if (!result.ok) {
    return {
      ...base,
      status: "error",
      latencyMs: result.ms,
      detail: result.error.split(key).join("…").slice(0, 200),
    };
  }

  const account = result.value;
  const inactive =
    account.accountStatus &&
    !/active/i.test(account.accountStatus);
  const left = account.planSearchesLeft;
  const monthly = account.searchesPerMonth ?? SERPAPI_FREE_MONTHLY_CREDITS;
  return {
    ...base,
    quota: youtubeTranscriptQuota(account),
    status: inactive ? "error" : "operational",
    latencyMs: result.ms,
    detail: inactive
      ? `Account status: ${account.accountStatus}.`
      : left != null
        ? `${left.toLocaleString()} of ${monthly.toLocaleString()} credits left this month.`
        : `Free plan includes ${monthly.toLocaleString()} credits every month.`,
  };
}

/** RapidAPI YouTube MP3 Basic subscription. No usage endpoint, so these are the plan caps. */
const RAPIDAPI_BASIC_QUOTA: ServiceQuota = {
  plan: "Basic",
  price: "$0.00 / mo",
  items: [
    { label: "Requests", value: "220 / day" },
    { label: "Hard limit", value: "220 / day" },
    { label: "Rate limit", value: "1,000 requests / hour" },
  ],
};

async function checkYoutubeMp3(): Promise<ServiceCheck> {
  const base: Omit<ServiceCheck, "status" | "latencyMs" | "detail"> = {
    id: "youtube-mp3",
    name: "YouTube MP3 (RapidAPI)",
    description: "Audio fallback when a video has no usable captions",
    required: false,
    quota: RAPIDAPI_BASIC_QUOTA,
  };
  if (!isYoutubeMp3Configured()) {
    return {
      ...base,
      status: "not_configured",
      latencyMs: null,
      detail: "RAPIDAPI_KEY is missing.",
    };
  }

  const host =
    process.env.RAPIDAPI_YOUTUBE_HOST?.trim() || "youtube-mp310.p.rapidapi.com";
  const key =
    process.env.RAPIDAPI_KEY?.trim() ||
    process.env.RAPIDAPI_YOUTUBE_KEY?.trim() ||
    "";

  const result = await timed(async () => {
    // Invalid URL on purpose — we only care that the key is accepted.
    const res = await fetch(
      `https://${host}/download/mp3?url=${encodeURIComponent("https://invalid.example")}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-rapidapi-host": host,
          "x-rapidapi-key": key,
        },
        cache: "no-store",
      },
    );
    if (res.status === 401 || res.status === 403) {
      const text = await res.text();
      throw new Error(text.slice(0, 160) || `Unauthorized (HTTP ${res.status})`);
    }
    // 200 / 400 / 404 / 422 all mean the gateway accepted the key.
    return res.status;
  });

  if (!result.ok) {
    return {
      ...base,
      status: "error",
      latencyMs: result.ms,
      detail: result.error.slice(0, 200),
    };
  }
  return {
    ...base,
    status: "operational",
    latencyMs: result.ms,
    detail: `RapidAPI host reachable (HTTP ${result.value}).`,
  };
}

function summarize(services: ServiceCheck[]): Pick<
  SystemStatusReport,
  "overall" | "headline"
> {
  const requiredDown = services.filter(
    (s) => s.required && s.status !== "operational",
  );
  const anyError = services.some((s) => s.status === "error");
  const anyMissing = services.some((s) => s.status === "not_configured");

  if (requiredDown.length === 0 && !anyError) {
    if (anyMissing) {
      return {
        overall: "partial",
        headline: "Core services are online — some optional integrations are not configured.",
      };
    }
    return {
      overall: "operational",
      headline: "All services are online",
    };
  }
  if (requiredDown.length > 0) {
    return {
      overall: "degraded",
      headline: "Core services need attention",
    };
  }
  return {
    overall: "degraded",
    headline: "Some services are reporting errors",
  };
}

export async function runSystemStatusChecks(
  convex?: ConvexHttpClient | null,
): Promise<SystemStatusReport> {
  const services = await Promise.all([
    checkGemini(),
    checkConvex(convex),
    checkKartra(),
    checkResend(),
    checkYoutubeTranscript(),
    checkYoutubeMp3(),
  ]);
  const { overall, headline } = summarize(services);
  return {
    checkedAt: new Date().toISOString(),
    overall,
    headline,
    services,
  };
}
