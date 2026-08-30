/** Heuristic server generation time (ms) when wall-clock was not recorded. */
export function estimateAnalysisDurationMs(row: {
  durationSec?: number | null;
  captureMethod?: string | null;
  source?: string | null;
  status?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
}): number {
  const isYoutube =
    row.captureMethod === "youtube" ||
    (row.source || "").trim().toLowerCase() === "youtube";
  const isFailed = row.status === "failed";
  const clipSec = Math.max(0, row.durationSec ?? (isYoutube ? 90 : 45));
  const tokens = Math.max(0, (row.inputTokens ?? 0) + (row.outputTokens ?? 0));

  if (isFailed) {
    if (isYoutube) {
      return Math.round(18_000 + Math.min(clipSec, 180) * 220);
    }
    return Math.round(10_000 + Math.min(clipSec, 300) * 180);
  }

  if (tokens > 0) {
    const tokenMs = tokens * 0.045;
    const clipMs = Math.min(clipSec, 600) * (isYoutube ? 380 : 520);
    return Math.round(16_000 + tokenMs + clipMs);
  }

  if (typeof row.costUsd === "number" && row.costUsd > 0) {
    return Math.round(20_000 + row.costUsd * 120_000);
  }

  if (isYoutube) {
    return Math.round(42_000 + Math.min(clipSec, 600) * 320);
  }

  return Math.round(22_000 + Math.min(clipSec, 300) * 650);
}
