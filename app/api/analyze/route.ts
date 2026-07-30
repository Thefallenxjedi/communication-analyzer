import { generateObject } from "ai";
import { createGoogle } from "@ai-sdk/google";
import {
  eliteSpeakReportSchema,
  transcriptSchema,
  type EliteSpeakReport,
  type MarkerResult,
} from "@/lib/schema";
import { MARKER_IDS } from "@/lib/schema";
import {
  ELITESPEAK_ANALYZE_PROMPT,
  TRANSCRIBE_PROMPT,
  isQuotaError,
  modelFallbackChain,
  resolveModelId,
} from "@/lib/gemini";
import { deriveOverall } from "@/lib/scoring";
import {
  isAudioMime,
  isVideoMime,
  MAX_FILE_SIZE_BYTES,
  parseYouTubeUrl,
} from "@/lib/validate-media";
import { API_KEY_HEADER, MODEL_HEADER } from "@/lib/api-key";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_TRANSCRIPT_CHARS = 40_000;
const MAX_FRAMES = 8;

function normalizeMediaMime(mime: string, filename: string): string {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base && base !== "application/octet-stream") return base;

  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    mpeg: "audio/mpeg",
    wav: "audio/wav",
    webm: "audio/webm",
    m4a: "audio/mp4",
    mp4: "video/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    flac: "audio/flac",
    mov: "video/quicktime",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return (ext && map[ext]) || "application/octet-stream";
}

function resolveApiKey(
  request: Request,
  bodyKey?: string | null,
  formKey?: string | null,
): string {
  const candidates = [
    request.headers.get(API_KEY_HEADER),
    request.headers.get("x-goog-api-key"),
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
    bodyKey,
    formKey,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  ];
  for (const c of candidates) {
    const v = c?.trim();
    if (v) return v;
  }
  return "";
}

function resolvePreferredModel(
  request: Request,
  bodyModel?: string | null,
  formModel?: string | null,
): string {
  return resolveModelId(
    request.headers.get(MODEL_HEADER) ||
      bodyModel ||
      formModel ||
      process.env.GOOGLE_GENERATIVE_AI_MODEL,
  );
}

type GoogleClient = ReturnType<typeof createGoogle>;

type FilePart = {
  type: "file";
  data: Uint8Array | URL;
  mediaType: string;
};

async function withModelFallback<T>(
  google: GoogleClient,
  preferredModel: string,
  run: (modelId: string) => Promise<T>,
): Promise<T> {
  const chain = modelFallbackChain(preferredModel);
  let lastError: unknown;

  for (const modelId of chain) {
    try {
      return await run(modelId);
    } catch (err) {
      lastError = err;
      if (!isQuotaError(err)) throw err;
      console.warn(`[analyze] quota on ${modelId}, trying next…`);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All free-tier models hit quota. Retry later or use your own key.");
}

function normalizeReport(
  report: EliteSpeakReport,
  hasVisual: boolean,
  transcriptFallback: string,
): EliteSpeakReport {
  const byId = new Map(report.markers.map((m) => [m.id, m]));
  const markers: MarkerResult[] = MARKER_IDS.map((id) => {
    const existing = byId.get(id);
    if (existing) return existing;
    return {
      id,
      score: "not_enough_evidence" as const,
      notEnoughEvidenceReason: "Marker missing from model output.",
      rootCauses: [],
      didWell: [],
      fellShort: [],
      pattern: "Insufficient structured output for this marker.",
      coachNotes: "We couldn't fully score this marker — try a clearer recording.",
      improvementSuggestion: {
        name: "Re-record Check",
        howTo: "Upload a clearer 2–4 minute clip with face and voice in frame.",
        reps: "1 take",
        when: "Today",
      },
    };
  });

  const derived = deriveOverall(markers);

  return {
    ...report,
    markers,
    transcript: report.transcript?.trim() || transcriptFallback,
    sentenceTimeline: report.sentenceTimeline?.length
      ? report.sentenceTimeline
      : undefined,
    hasVisualAnalysis: hasVisual || report.hasVisualAnalysis,
    overallScore: derived.overallScore,
    band: report.band || derived.band,
  };
}

async function transcribeMedia(
  google: GoogleClient,
  preferredModel: string,
  parts: FilePart[],
) {
  return withModelFallback(google, preferredModel, async (modelId) => {
    const { object } = await generateObject({
      model: google(modelId),
      schema: transcriptSchema,
      schemaName: "TimestampedTranscript",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: TRANSCRIBE_PROMPT },
            ...parts.map((p) => ({
              type: "file" as const,
              data: p.data,
              mediaType: p.mediaType,
            })),
          ],
        },
      ],
    });
    return {
      transcript: object.transcript?.trim() ?? "",
      segments: object.segments,
      modelUsed: modelId,
    };
  });
}

async function runEliteSpeak(
  google: GoogleClient,
  preferredModel: string,
  transcript: string,
  mediaParts: FilePart[],
  hasVisual: boolean,
) {
  const segmentHint =
    "If you have timing from the media, use MM:SS timestamps in evidence.";

  return withModelFallback(google, preferredModel, async (modelId) => {
    const { object } = await generateObject({
      model: google(modelId),
      schema: eliteSpeakReportSchema,
      schemaName: "EliteSpeakReport",
      schemaDescription: "EliteSpeak Video Rubric v2 communication report",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${ELITESPEAK_ANALYZE_PROMPT}\n\nHas visual media: ${hasVisual}\n${segmentHint}\n\n---\nTRANSCRIPT:\n${transcript}`,
            },
            ...mediaParts.map((p) => ({
              type: "file" as const,
              data: p.data,
              mediaType: p.mediaType,
            })),
          ],
        },
      ],
    });

    return normalizeReport(object, hasVisual, transcript);
  });
}

async function collectImageFrames(formData: FormData): Promise<FilePart[]> {
  const parts: FilePart[] = [];
  let n = 0;
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("frame") || !(value instanceof File)) continue;
    if (n >= MAX_FRAMES) break;
    if (value.size === 0) continue;
    const frameType = normalizeMediaMime(value.type, value.name);
    if (!frameType.startsWith("image/")) continue;
    parts.push({
      type: "file",
      data: new Uint8Array(await value.arrayBuffer()),
      mediaType: frameType,
    });
    n += 1;
  }
  return parts;
}

function gate(request: Request) {
  const ip = clientIp(request);
  const limit = Number(process.env.ANALYZE_DAILY_LIMIT || 20);
  return checkRateLimit(ip, Number.isFinite(limit) ? limit : 20);
}

export async function POST(request: Request) {
  try {
    const rate = gate(request);
    if (!rate.ok) {
      return Response.json(
        {
          error: `Daily free analysis limit reached. Try again in ~${Math.ceil(rate.retryAfterSec / 3600)} hours, or add your own API key in Settings.`,
        },
        { status: 429 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    // JSON: text paste OR YouTube URL
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        transcript?: unknown;
        youtubeUrl?: unknown;
        apiKey?: unknown;
        model?: unknown;
      };

      const apiKey = resolveApiKey(
        request,
        typeof body.apiKey === "string" ? body.apiKey : null,
      );
      if (!apiKey) {
        return Response.json(
          { error: "Missing API key. Configure server key or paste one in Settings." },
          { status: 401 },
        );
      }

      const preferredModel = resolvePreferredModel(
        request,
        typeof body.model === "string" ? body.model : null,
      );
      const google = createGoogle({ apiKey });

      // YouTube path
      if (typeof body.youtubeUrl === "string" && body.youtubeUrl.trim()) {
        const yt = parseYouTubeUrl(body.youtubeUrl);
        if (!yt) {
          return Response.json(
            { error: "Invalid YouTube URL. Use a public watch / Shorts / youtu.be link." },
            { status: 400 },
          );
        }

        const ytPart: FilePart = {
          type: "file",
          data: new URL(yt),
          mediaType: "video/mp4",
        };

        const { transcript, modelUsed } = await transcribeMedia(
          google,
          preferredModel,
          [ytPart],
        );
        if (!transcript) {
          return Response.json(
            {
              error:
                "Could not transcribe that YouTube video. Ensure it is public and contains clear speech, or upload a file instead.",
            },
            { status: 422 },
          );
        }

        const report = await runEliteSpeak(
          google,
          modelUsed || preferredModel,
          transcript,
          [ytPart],
          true,
        );
        return Response.json(report);
      }

      // Pasted text path
      const transcript =
        typeof body.transcript === "string" ? body.transcript.trim() : "";
      if (!transcript) {
        return Response.json(
          { error: "Provide transcript text or youtubeUrl." },
          { status: 400 },
        );
      }
      if (transcript.length > MAX_TRANSCRIPT_CHARS) {
        return Response.json(
          { error: `Text too long (max ${MAX_TRANSCRIPT_CHARS.toLocaleString()} chars).` },
          { status: 400 },
        );
      }

      const report = await runEliteSpeak(
        google,
        preferredModel,
        transcript,
        [],
        false,
      );
      return Response.json(report);
    }

    // Multipart media
    const formData = await request.formData();
    const formApiKey = formData.get("apiKey");
    const formModel = formData.get("model");

    const apiKey = resolveApiKey(
      request,
      null,
      typeof formApiKey === "string" ? formApiKey : null,
    );
    if (!apiKey) {
      return Response.json(
        { error: "Missing API key. Configure server key or paste one in Settings." },
        { status: 401 },
      );
    }

    const preferredModel = resolvePreferredModel(
      request,
      null,
      typeof formModel === "string" ? formModel : null,
    );
    const google = createGoogle({ apiKey });

    const file =
      (formData.get("audio") instanceof File && formData.get("audio")) ||
      (formData.get("video") instanceof File && formData.get("video")) ||
      (formData.get("media") instanceof File && formData.get("media"));

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Provide audio/video upload, YouTube URL, or transcript text." },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return Response.json({ error: "Media file is empty." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { error: "File too large. Maximum size is 80 MB (we analyze up to 4 minutes)." },
        { status: 400 },
      );
    }

    const mediaType = normalizeMediaMime(file.type, file.name);
    const isVideo = isVideoMime(mediaType) || mediaType.startsWith("video/");
    const isAudio = isAudioMime(mediaType) || mediaType.startsWith("audio/");
    if (!isVideo && !isAudio) {
      return Response.json(
        { error: `Unsupported media type: ${mediaType}` },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const visualParts = await collectImageFrames(formData);
    const hasVisual = visualParts.length > 0 || isVideo;

    if (isVideo && visualParts.length === 0) {
      visualParts.push({ type: "file", data: bytes, mediaType });
    }

    const mediaForTranscribe: FilePart[] = [
      { type: "file", data: bytes, mediaType },
    ];

    const { transcript, modelUsed } = await transcribeMedia(
      google,
      preferredModel,
      mediaForTranscribe,
    );

    if (!transcript) {
      return Response.json(
        {
          error:
            "Could not transcribe speech. Ensure clear spoken audio in the first 4 minutes.",
        },
        { status: 422 },
      );
    }

    const analyzeParts: FilePart[] =
      visualParts.length > 0 ? visualParts : [];

    const report = await runEliteSpeak(
      google,
      modelUsed || preferredModel,
      transcript,
      analyzeParts,
      hasVisual,
    );
    return Response.json(report);
  } catch (err) {
    console.error("[analyze]", err);
    const message =
      err instanceof Error ? err.message : "Analysis failed unexpectedly.";
    const quota = isQuotaError(err);
    return Response.json(
      {
        error: quota
          ? `${message} Tip: switch to Flash-Lite in Settings, or retry later.`
          : message,
      },
      { status: quota ? 429 : 500 },
    );
  }
}
