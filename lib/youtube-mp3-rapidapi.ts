import { parseYouTubeVideoId, youtubeWatchUrl } from "@/lib/youtube";
import { MAX_FILE_SIZE_BYTES } from "@/lib/validate-media";

export type YoutubeMp3Result = {
  bytes: Uint8Array;
  mediaType: string;
  sizeBytes: number;
};

/** RapidAPI "YouTube MP3" — GET /download/mp3?url=… → { downloadUrl } */
const DEFAULT_HOST = "youtube-mp310.p.rapidapi.com";
/**
 * Each downloadUrl is single-use. A second GET burns the session (HTTP 400).
 * Ask for a new URL instead of polling the same one.
 */
const MAX_FRESH_DOWNLOADS = 3;

function rapidApiKey(): string {
  return (
    process.env.RAPIDAPI_KEY?.trim() ||
    process.env.RAPIDAPI_YOUTUBE_KEY?.trim() ||
    ""
  );
}

export function isYoutubeMp3Configured(): boolean {
  return Boolean(rapidApiKey());
}

function rapidHeaders(host: string): HeadersInit {
  return {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "x-rapidapi-host": host,
    "x-rapidapi-key": rapidApiKey(),
  };
}

function extractDownloadUrl(payload: unknown): string | null {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return isYoutubePageUrl(trimmed) ? null : trimmed;
    }
    try {
      return extractDownloadUrl(JSON.parse(trimmed) as unknown);
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  for (const key of [
    "downloadUrl",
    "download_url",
    "url",
    "link",
    "file",
    "audio_url",
    "mp3_url",
  ]) {
    const v = o[key];
    if (typeof v === "string" && /^https?:\/\//i.test(v.trim())) {
      const url = v.trim();
      if (!isYoutubePageUrl(url)) return url;
    }
  }
  if (o.data && typeof o.data === "object") {
    return extractDownloadUrl(o.data);
  }
  return null;
}

async function rapidGetDownloadUrl(
  host: string,
  watchUrl: string,
): Promise<string | null> {
  const path = `/download/mp3?url=${encodeURIComponent(watchUrl)}`;
  const res = await fetch(`https://${host}${path}`, {
    method: "GET",
    headers: rapidHeaders(host),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    console.warn(
      `[youtube-mp3] RapidAPI ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`,
    );
    return null;
  }
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    /* plain-text URL */
  }
  return extractDownloadUrl(parsed);
}

function isYoutubePageUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "youtube.com" ||
      host === "youtu.be" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    );
  } catch {
    return false;
  }
}

/** One GET. The link cannot be reused if this fails. */
async function downloadAudioOnce(
  downloadUrl: string,
): Promise<{ bytes: Uint8Array | null; status: number }> {
  const res = await fetch(downloadUrl, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) return { bytes: null, status: res.status };
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength <= 2048) return { bytes: null, status: res.status };
  return { bytes: buf, status: res.status };
}

/** Rough MP3 duration from byte size (~128 kbps). Used when captions omit duration. */
export function estimateMp3DurationSec(sizeBytes: number): number | null {
  if (sizeBytes < 2048) return null;
  return Math.max(1, Math.round(sizeBytes / 16_000));
}

/** Resolve a direct MP3/audio URL via RapidAPI, then download bytes server-side. */
export async function fetchYoutubeMp3(rawUrl: string): Promise<YoutubeMp3Result> {
  const key = rapidApiKey();
  if (!key) {
    throw new Error("YouTube audio download is not configured on the server.");
  }

  const videoId = parseYouTubeVideoId(rawUrl);
  if (!videoId) {
    throw new Error("Please paste a valid YouTube link.");
  }

  const host = process.env.RAPIDAPI_YOUTUBE_HOST?.trim() || DEFAULT_HOST;
  const watchUrl = youtubeWatchUrl(videoId);

  let lastStatus = 0;
  let sawLink = false;

  for (let attempt = 0; attempt < MAX_FRESH_DOWNLOADS; attempt++) {
    const downloadUrl = await rapidGetDownloadUrl(host, watchUrl);
    if (!downloadUrl) continue;
    sawLink = true;

    const downloaded = await downloadAudioOnce(downloadUrl);
    lastStatus = downloaded.status;
    if (!downloaded.bytes) {
      console.warn(
        `[youtube-mp3] Fresh download link failed once (HTTP ${downloaded.status}). Requesting a new link.`,
      );
      continue;
    }

    if (downloaded.bytes.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        "That YouTube audio file is too large. Please use a shorter clip (under 20 minutes).",
      );
    }

    return {
      bytes: downloaded.bytes,
      mediaType: "audio/mpeg",
      sizeBytes: downloaded.bytes.byteLength,
    };
  }

  if (!sawLink) {
    throw new Error(
      "Could not get a download link for that YouTube video. The clip may be restricted or unavailable.",
    );
  }

  throw new Error(
    `YouTube audio file was not ready (HTTP ${lastStatus}). Try again in a minute.`,
  );
}
