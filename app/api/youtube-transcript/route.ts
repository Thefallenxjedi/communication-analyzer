import { after } from "next/server";
import { NextResponse } from "next/server";
import { insertFailedAnalysis } from "@/lib/analyses";
import { isValidLeadEmail } from "@/lib/email";
import { parseYouTubeVideoId } from "@/lib/youtube";
import { fetchYoutubeTranscript } from "@/lib/youtube-transcript-ai";
import {
  MAX_YOUTUBE_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
} from "@/lib/validate-media";

export const runtime = "nodejs";
export const maxDuration = 30;

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
    captureMethod: "youtube",
    firstName: input.firstName,
    email: input.email,
    failureReason: input.failureReason.slice(0, 240),
    analysisDurationMs: input.analysisDurationMs,
  };
  after(async () => {
    try {
      const ok = await insertFailedAnalysis(payload);
      if (!ok) {
        console.error("[youtube-transcript] failed-attempt log returned false", payload);
      }
    } catch (err) {
      console.error("[youtube-transcript] failed-attempt log error", err);
    }
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const elapsedMs = () => Date.now() - startedAt;
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
    };
    const url = String(body.url || "").trim();
    anonymousId = String(body.anonymousId || "").trim().slice(0, 128);
    firstName = String(body.firstName || "")
      .trim()
      .split(/\s+/)[0]
      .slice(0, 80);
    const emailRaw = String(body.email || "").trim().toLowerCase();
    email = isValidLeadEmail(emailRaw) ? emailRaw : "";

    if (!url) {
      logYoutubeFailure({
        anonymousId,
        firstName: firstName || undefined,
        email: email || undefined,
        failureReason: "YouTube: no URL pasted",
      });
      return NextResponse.json(
        { error: "Paste a YouTube link first." },
        { status: 400 },
      );
    }

    const videoId = parseYouTubeVideoId(url);
    videoHint = videoId ? ` (${videoId})` : "";

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

    const result = await fetchYoutubeTranscript(url);
    const duration = result.durationSec;

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

    return NextResponse.json({
      transcript: result.transcript,
      durationSec: duration,
      title: result.title || "",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not read that YouTube video.";
    const reason = `YouTube: ${message}${videoHint}`.slice(0, 240);
    logYoutubeFailure({
      anonymousId,
      firstName: firstName || undefined,
      email: email || undefined,
      failureReason: reason,
      analysisDurationMs: elapsedMs(),
    });
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
