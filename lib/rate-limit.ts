/**
 * Soft in-memory rate limit for free shared API usage.
 * Best-effort on serverless (per-instance); still reduces casual abuse.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const DEFAULT_DAILY_LIMIT = 20;
export const DEFAULT_DAILY_AUDIO_LIMIT = 10;
export const DEFAULT_DAILY_YOUTUBE_LIMIT = 5;

export type AnalyzeRateKind = "audio" | "youtube";

export function parseEnvDailyLimit(
  raw: string | undefined,
  fallback: number,
): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

export function dailyLimitForKind(kind: AnalyzeRateKind): number {
  if (kind === "youtube") {
    return parseEnvDailyLimit(
      process.env.ANALYZE_DAILY_YOUTUBE_LIMIT,
      DEFAULT_DAILY_YOUTUBE_LIMIT,
    );
  }
  return parseEnvDailyLimit(
    process.env.ANALYZE_DAILY_AUDIO_LIMIT,
    DEFAULT_DAILY_AUDIO_LIMIT,
  );
}

export function checkAnalyzeRateLimit(ip: string, kind: AnalyzeRateKind) {
  return checkRateLimit(`analyze:${kind}:${ip}`, dailyLimitForKind(kind));
}

export function analyzeLimitErrorMessage(
  kind: AnalyzeRateKind,
  retryAfterSec: number,
): string {
  const hours = Math.max(1, Math.ceil(retryAfterSec / 3600));
  const limit = dailyLimitForKind(kind);
  if (kind === "youtube") {
    return `Daily YouTube limit reached (${limit} per day). Try again in ~${hours} hours.`;
  }
  return `Daily audio limit reached (${limit} per day). Try again in ~${hours} hours.`;
}

export function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export function checkRateLimit(
  key: string,
  limit = DEFAULT_DAILY_LIMIT,
): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + dayMs };
    buckets.set(key, bucket);
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count };
}
