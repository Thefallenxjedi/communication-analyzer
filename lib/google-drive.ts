import { parseYouTubeVideoId, youtubeWatchUrl } from "@/lib/youtube";

const URL_MAX = 500;

export type VideoShareKind = "drive" | "youtube";

function hostOf(url: URL): string {
  return url.hostname.replace(/^www\./i, "").toLowerCase();
}

export function videoShareKind(raw: string): VideoShareKind | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (parseYouTubeVideoId(trimmed)) return "youtube";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    if (hostOf(parsed) === "drive.google.com") return "drive";
  } catch {
    return null;
  }
  return null;
}

export function normalizeVideoShareUrl(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim().slice(0, URL_MAX);
  if (!trimmed) {
    throw new Error("Paste a Google Drive or YouTube link.");
  }

  const youtubeId = parseYouTubeVideoId(trimmed);
  if (youtubeId) return youtubeWatchUrl(youtubeId);

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Paste a full Google Drive or YouTube link, starting with https://");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Use an https link.");
  }
  if (hostOf(parsed) === "drive.google.com") {
    return parsed.toString();
  }
  throw new Error("Use a Google Drive or YouTube link.");
}

export function normalizeGoogleDriveUrl(raw: string): string {
  return normalizeVideoShareUrl(raw);
}
