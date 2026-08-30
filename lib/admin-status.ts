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

export type ServiceCheck = {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: ServiceStatus;
  latencyMs: number | null;
  detail: string;
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

async function checkConvex(): Promise<ServiceCheck> {
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
    const client = getConvexHttpClient();
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

async function checkYoutubeMp3(): Promise<ServiceCheck> {
  const base: Omit<ServiceCheck, "status" | "latencyMs" | "detail"> = {
    id: "youtube-mp3",
    name: "YouTube MP3 (RapidAPI)",
    description: "Audio download for YouTube analysis",
    required: false,
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

async function checkYoutubeTranscript(): Promise<ServiceCheck> {
  const base: Omit<ServiceCheck, "status" | "latencyMs" | "detail"> = {
    id: "youtube-transcript",
    name: "YouTube Transcript",
    description: "Captions via youtube-transcript.ai",
    required: false,
  };
  const transcriptBase =
    process.env.YOUTUBE_TRANSCRIPT_AI_BASE?.trim() ||
    "https://youtube-transcript.ai/transcript";

  const result = await timed(async () => {
    // Short public clip with captions (Rick Astley) — cheap reachability probe.
    const endpoint = `${transcriptBase.replace(/\/$/, "")}/dQw4w9WgXcQ.txt`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "text/plain, text/markdown, */*" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const text = await res.text();
    if (text.trim().length < 40) {
      throw new Error("Empty transcript response.");
    }
    return text.length;
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
    detail: "Transcript host responding.",
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

export async function runSystemStatusChecks(): Promise<SystemStatusReport> {
  const services = await Promise.all([
    checkGemini(),
    checkConvex(),
    checkKartra(),
    checkYoutubeMp3(),
    checkYoutubeTranscript(),
  ]);
  const { overall, headline } = summarize(services);
  return {
    checkedAt: new Date().toISOString(),
    overall,
    headline,
    services,
  };
}
