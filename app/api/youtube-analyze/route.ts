import { after } from "next/server";
import { NextResponse } from "next/server";
import { POST as analyzePost } from "@/app/api/analyze/route";
import { insertFailedAnalysis } from "@/lib/analyses";
import { isValidLeadEmail } from "@/lib/email";
import { isYouTubeShortsUrl, parseYouTubeVideoId } from "@/lib/youtube";
import { fetchYoutubeTranscript } from "@/lib/youtube-transcript-ai";
import {
  estimateMp3DurationSec,
  fetchYoutubeMp3,
  isYoutubeMp3Configured,
} from "@/lib/youtube-mp3-rapidapi";
import {
  MAX_YOUTUBE_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
} from "@/lib/validate-media";

export const runtime = "nodejs";
export const maxDuration = 300;

function formatDurationLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function logYoutubeFailure(input: {
  anonymousId: string;
  firstName?: string;
  email?: string;
  durationSec?: number | null;
  failureReason: string;
  analysisDurationMs?: number;
}) {
  const anonymousId =
    input.anonymousId.trim().slice(0, 128) ||
    `anon_yt_${Date.now().toString(36)}`;
  const payload = {
    anonymousId,
    durationSec: input.durationSec ?? null,
    source: "youtube",
    captureMethod: "youtube" as const,
    firstName: input.firstName,
    email: input.email,
    failureReason: input.failureReason.slice(0, 240),
    analysisDurationMs: input.analysisDurationMs,
  };
  after(async () => {
    try {
      await insertFailedAnalysis(payload);
    } catch (err) {
      console.error("[youtube-analyze] failed-attempt log error", err);
    }
  });
}

export async function POST(request: Request) {
  const pipelineStartedAt = Date.now();
  const elapsedMs = () => Date.now() - pipelineStartedAt;
  let anonymousId = "";
  let firstName = "";
  let email = "";
  let videoHint = "";

  try {
    const body = (await request.json()) as {
      url?: string;
      anonymousId?: string;
      firstName?: string;
      email?: string;
      promptQuestion?: string;
    };

    const url = String(body.url || "").trim();
    anonymousId = String(body.anonymousId || "").trim().slice(0, 128);
    firstName = String(body.firstName || "")
      .trim()
      .split(/\s+/)[0]
      .slice(0, 80);
    const emailRaw = String(body.email || "").trim().toLowerCase();
    email = isValidLeadEmail(emailRaw) ? emailRaw : "";
    const promptQuestion = String(body.promptQuestion || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    if (!url) {
      return NextResponse.json(
        { error: "Paste a YouTube link first." },
        { status: 400 },
      );
    }

    const videoId = parseYouTubeVideoId(url);
    videoHint = videoId ? ` (${videoId})` : "";
    const isShorts = isYouTubeShortsUrl(url);

    if (!videoId) {
      logYoutubeFailure({
        anonymousId,
        firstName: firstName || undefined,
        email: email || undefined,
        failureReason: "YouTube: invalid link",
      });
      return NextResponse.json(
        { error: "Please paste a valid YouTube link." },
        { status: 400 },
      );
    }

    if (!isYoutubeMp3Configured()) {
      return NextResponse.json(
        {
          error:
            "YouTube full analysis is not configured yet. Add RAPIDAPI_KEY on Vercel.",
        },
        { status: 503 },
      );
    }

    const [transcriptResult, mp3Result] = await Promise.all([
      fetchYoutubeTranscript(url).catch((err) => {
        console.warn(
          "[youtube-analyze] Transcript unavailable:",
          err instanceof Error ? err.message : err,
        );
        return null;
      }),
      fetchYoutubeMp3(url).catch((err) => {
        console.warn(
          "[youtube-analyze] MP3 download failed:",
          err instanceof Error ? err.message : err,
        );
        return null;
      }),
    ]);

    if (!transcriptResult && !mp3Result) {
      throw new Error(
        isShorts
          ? "That Short has no captions and we couldn't download its audio. Try record or upload instead."
          : "We couldn't get captions or audio from that video. It may be private or blocked. Try record or upload instead.",
      );
    }

    if (!transcriptResult && mp3Result) {
      console.info("[youtube-analyze] Audio-only path (Gemini transcribe)", {
        videoId,
        isShorts,
      });
    } else if (transcriptResult && !mp3Result) {
      console.info("[youtube-analyze] Transcript-only fallback", { videoId });
    }

    const duration =
      transcriptResult?.durationSec ??
      (mp3Result ? estimateMp3DurationSec(mp3Result.sizeBytes) : null);

    if (duration != null && duration < MIN_DURATION_SECONDS) {
      const reason = `YouTube: too short (${formatDurationLabel(duration)})${videoHint}`;
      logYoutubeFailure({
        anonymousId,
        firstName: firstName || undefined,
        email: email || undefined,
        durationSec: duration,
        failureReason: reason,
      });
      return NextResponse.json(
        { error: "That video is too short. Use a clip of at least 10 seconds." },
        { status: 400 },
      );
    }

    if (duration != null && duration > MAX_YOUTUBE_DURATION_SECONDS) {
      const reason = `YouTube: longer than 20 min (${formatDurationLabel(duration)})${videoHint}`;
      logYoutubeFailure({
        anonymousId,
        firstName: firstName || undefined,
        email: email || undefined,
        durationSec: duration,
        failureReason: reason,
      });
      return NextResponse.json(
        {
          error:
            "That video is longer than 20 minutes. Please use a shorter public clip.",
        },
        { status: 400 },
      );
    }

    const formData = new FormData();
    if (transcriptResult?.transcript) {
      formData.append("transcript", transcriptResult.transcript);
    }
    if (mp3Result) {
      formData.append(
        "audio",
        new Blob([Buffer.from(mp3Result.bytes)], {
          type: mp3Result.mediaType,
        }),
        "youtube-audio.mp3",
      );
    }
    formData.append("anonymousId", anonymousId || `anon_yt_${Date.now().toString(36)}`);
    formData.append("captureMethod", "youtube");
    formData.append("source", "youtube");
    if (duration != null) {
      formData.append("durationSec", String(Math.round(duration)));
    }
    if (email) formData.append("email", email);
    if (firstName) formData.append("firstName", firstName);
    if (promptQuestion) formData.append("promptQuestion", promptQuestion);
    formData.append("pipelineStartedAt", String(pipelineStartedAt));

    const analyzeRequest = new Request(new URL("/api/analyze", request.url), {
      method: "POST",
      body: formData,
    });

    return analyzePost(analyzeRequest);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not analyze that YouTube video.";
    logYoutubeFailure({
      anonymousId,
      firstName: firstName || undefined,
      email: email || undefined,
      failureReason: `YouTube: ${message}${videoHint}`.slice(0, 240),
      analysisDurationMs: elapsedMs(),
    });
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
