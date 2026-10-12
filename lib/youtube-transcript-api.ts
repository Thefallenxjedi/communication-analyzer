import { parseYouTubeVideoId } from "@/lib/youtube";

export type YoutubeTranscriptResult = {
  transcript: string;
  durationSec: number | null;
  title?: string;
};

/** SerpAPI YouTube Video Transcript — https://serpapi.com/youtube-video-transcript */
const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";

const MAX_TRANSCRIPT_CHARS = 20_000;

type TranscriptSnippet = {
  snippet?: unknown;
  end_ms?: unknown;
};

function serpApiKey(): string {
  return (
    process.env.SERPAPI_API_KEY?.trim() ||
    process.env.SERPAPI_KEY?.trim() ||
    ""
  );
}

/** Reject empty text and the Next.js flight payload a previous host returned. */
export function usableTranscriptText(raw: string): string | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length < 40) return null;
  if (text.includes("$@") || text.includes('"a":')) return null;
  const letters = text.replace(/[^A-Za-z]/g, "").length;
  if (letters < 30) return null;
  return text.slice(0, MAX_TRANSCRIPT_CHARS);
}

function readError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" ? error.trim() : "";
}

function readSnippets(payload: unknown): TranscriptSnippet[] {
  if (!payload || typeof payload !== "object") return [];
  const transcript = (payload as { transcript?: unknown }).transcript;
  return Array.isArray(transcript) ? (transcript as TranscriptSnippet[]) : [];
}

function joinSnippets(snippets: TranscriptSnippet[]): {
  text: string;
  durationSec: number | null;
} {
  const parts: string[] = [];
  let lastEndMs = 0;
  for (const row of snippets) {
    if (typeof row.snippet === "string" && row.snippet.trim()) {
      parts.push(row.snippet.trim());
    }
    if (typeof row.end_ms === "number" && row.end_ms > lastEndMs) {
      lastEndMs = row.end_ms;
    }
  }
  return {
    text: parts.join(" "),
    durationSec: lastEndMs > 0 ? Math.round(lastEndMs / 1000) : null,
  };
}

export async function fetchYoutubeTranscript(
  rawUrl: string,
): Promise<YoutubeTranscriptResult> {
  const videoId = parseYouTubeVideoId(rawUrl);
  if (!videoId) {
    throw new Error("Please paste a valid YouTube link.");
  }

  const key = serpApiKey();
  if (!key) {
    throw new Error(
      "YouTube transcript is not configured yet. Add SERPAPI_API_KEY on Vercel.",
    );
  }

  const url = new URL(SERPAPI_ENDPOINT);
  url.searchParams.set("engine", "youtube_video_transcript");
  url.searchParams.set("v", videoId);
  url.searchParams.set("api_key", key);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Could not reach the YouTube transcript service. Please try again in a moment.",
    );
  }

  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    payload = null;
  }

  const error = readError(payload);
  const status =
    payload && typeof payload === "object"
      ? (payload as { search_metadata?: { status?: unknown } }).search_metadata
          ?.status
      : undefined;

  if (!res.ok || status === "Error" || error) {
    throw new Error(
      res.status === 429
        ? "YouTube transcript lookup is busy. Please wait a minute and try again."
        : error ||
            "We could not pull a transcript from that YouTube video. It may have no captions, or the link may be private.",
    );
  }

  const joined = joinSnippets(readSnippets(payload));
  const transcript = usableTranscriptText(joined.text);
  if (!transcript) {
    throw new Error(
      "That video has no usable captions. Try another public video, or upload audio instead.",
    );
  }

  return { transcript, durationSec: joined.durationSec };
}
