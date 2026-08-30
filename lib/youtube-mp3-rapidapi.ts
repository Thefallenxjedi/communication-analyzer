import { parseYouTubeVideoId, youtubeWatchUrl } from "@/lib/youtube";
import { MAX_FILE_SIZE_BYTES } from "@/lib/validate-media";

export type YoutubeMp3Result = {
  bytes: Uint8Array;
  mediaType: string;
  sizeBytes: number;
};

/** RapidAPI "YouTube MP3" — GET /download/mp3?url=… → { downloadUrl } */
const DEFAULT_HOST = "youtube-mp310.p.rapidapi.com";

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
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
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
      return v.trim();
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadAudioBytes(
  downloadUrl: string,
  maxAttempts = 14,
  delayMs = 5000,
): Promise<Uint8Array> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(downloadUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });
    lastStatus = res.status;
    if (res.ok) {
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength > 2048) return buf;
    }
    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }
  throw new Error(
    `YouTube audio file was not ready (HTTP ${lastStatus}). Try again in a minute.`,
  );
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

  const downloadUrl = await rapidGetDownloadUrl(host, watchUrl);
  if (!downloadUrl) {
    throw new Error(
      "Could not get a download link for that YouTube video. The clip may be restricted or unavailable.",
    );
  }

  const bytes = await downloadAudioBytes(downloadUrl);
  if (bytes.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      "That YouTube audio file is too large. Please use a shorter clip (under 20 minutes).",
    );
  }

  return {
    bytes,
    mediaType: "audio/mpeg",
    sizeBytes: bytes.byteLength,
  };
}
