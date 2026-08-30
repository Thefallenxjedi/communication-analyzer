/** How the user submitted their sample for analysis. */
export const CAPTURE_METHODS = ["realtime", "upload", "youtube"] as const;

export type CaptureMethod = (typeof CAPTURE_METHODS)[number];

export function normalizeCaptureMethod(
  raw?: string | null,
): CaptureMethod | undefined {
  const v = raw?.trim().toLowerCase();
  if (v === "realtime" || v === "real-time" || v === "live") return "realtime";
  if (v === "upload" || v === "recording" || v === "file") return "upload";
  if (v === "youtube" || v === "yt") return "youtube";
  return undefined;
}

/** Admin label for capture method; infers YouTube from legacy source when needed. */
export function formatCaptureMethodLabel(
  captureMethod?: string | null,
  source?: string | null,
): string {
  const method =
    normalizeCaptureMethod(captureMethod) ||
    (source?.trim().toLowerCase() === "youtube" ? "youtube" : undefined);

  switch (method) {
    case "realtime":
      return "Real-time";
    case "upload":
      return "Recording";
    case "youtube":
      return "YouTube";
    default:
      return "—";
  }
}

export function captureMethodBadgeClass(method?: CaptureMethod): string {
  switch (method) {
    case "realtime":
      return "bg-blue-100 text-blue-900";
    case "upload":
      return "bg-violet-100 text-violet-900";
    case "youtube":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-track text-muted";
  }
}
