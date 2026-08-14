import { generateObject } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { after } from "next/server";
import { diagnosisLlmSchema, transcriptSchema } from "@/lib/schema";
import {
  DIAGNOSIS_PROMPT,
  TRANSCRIBE_PROMPT,
  isQuotaError,
  modelFallbackChain,
  resolveModelId,
  userFacingAnalyzeError,
} from "@/lib/gemini";
import { normalizeDiagnosis } from "@/lib/scoring";
import { insertAnalysis, attachLeadToAnalysis } from "@/lib/analyses";
import { isAudioMime, MAX_FILE_SIZE_BYTES } from "@/lib/validate-media";
import { API_KEY_HEADER, MODEL_HEADER } from "@/lib/api-key";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import {
  isKartraConfigured,
  syncReportToKartra,
} from "@/lib/kartra";
import { isValidLeadEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 300;

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
    aac: "audio/aac",
    ogg: "audio/ogg",
    flac: "audio/flac",
  };
  return (ext && map[ext]) || "application/octet-stream";
}

function resolveApiKey(request: Request): string {
  const candidates = [
    request.headers.get(API_KEY_HEADER),
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  ];
  for (const c of candidates) {
    const v = c?.trim();
    if (v) return v;
  }
  return "";
}

type GoogleClient = ReturnType<typeof createGoogle>;

type FilePart = {
  type: "file";
  data: Uint8Array;
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
    : new Error("All free-tier models hit quota. Retry later.");
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
      schemaName: "Transcript",
      maxRetries: 0,
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
      modelUsed: modelId,
    };
  });
}

async function runDiagnosis(
  google: GoogleClient,
  preferredModel: string,
  transcript: string,
  mediaParts: FilePart[],
) {
  return withModelFallback(google, preferredModel, async (modelId) => {
    const { object } = await generateObject({
      model: google(modelId),
      schema: diagnosisLlmSchema,
      schemaName: "CommunicationDiagnosis",
      schemaDescription: "World-class communication diagnosis",
      maxRetries: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${DIAGNOSIS_PROMPT}\n\n---\nTRANSCRIPT:\n${transcript}\n\n---\nListen to the attached AUDIO for tone, pace, energy, confidence, pauses, and pitch variety. Score delivery from the audio; score wording from the transcript. Reminder: every marker score and overallScore must be integers 0–100 (never 1–10).`,
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
    return normalizeDiagnosis(object, transcript);
  });
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const limit = Number(process.env.ANALYZE_DAILY_LIMIT || 20);
    const rate = checkRateLimit(ip, Number.isFinite(limit) ? limit : 20);
    if (!rate.ok) {
      return Response.json(
        {
          error: `Daily free analysis limit reached. Try again in ~${Math.ceil(rate.retryAfterSec / 3600)} hours.`,
        },
        { status: 429 },
      );
    }

    const apiKey = resolveApiKey(request);
    if (!apiKey) {
      return Response.json(
        { error: "Server API key is not configured." },
        { status: 401 },
      );
    }

    const preferredModel = resolveModelId(
      request.headers.get(MODEL_HEADER) ||
        process.env.GOOGLE_GENERATIVE_AI_MODEL,
    );
    const google = createGoogle({ apiKey });

    const formData = await request.formData();
    const file =
      (formData.get("audio") instanceof File && formData.get("audio")) ||
      (formData.get("media") instanceof File && formData.get("media"));

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Upload or record an audio file (MP3, WAV, M4A)." },
        { status: 400 },
      );
    }
    if (file.size === 0) {
      return Response.json({ error: "Audio file is empty." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { error: "File too large. Maximum size is 80 MB." },
        { status: 400 },
      );
    }

    const mediaType = normalizeMediaMime(file.type, file.name);
    if (!isAudioMime(mediaType) && !mediaType.startsWith("audio/")) {
      return Response.json(
        { error: `Unsupported type: ${mediaType}. Use MP3, WAV, or M4A.` },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const parts: FilePart[] = [{ type: "file", data: bytes, mediaType }];

    const { transcript, modelUsed } = await transcribeMedia(
      google,
      preferredModel,
      parts,
    );
    if (!transcript) {
      return Response.json(
        {
          error:
            "Could not transcribe speech. Use clear spoken audio up to 5 minutes.",
        },
        { status: 422 },
      );
    }

    const report = await runDiagnosis(
      google,
      modelUsed || preferredModel,
      transcript,
      parts,
    );

    const anonymousId =
      String(formData.get("anonymousId") || "").trim() ||
      `anon_server_${Date.now().toString(36)}`;
    const durationRaw = Number(formData.get("durationSec"));
    const durationSec =
      Number.isFinite(durationRaw) && durationRaw > 0
        ? Math.round(durationRaw)
        : null;
    const source = String(formData.get("source") || "").trim() || undefined;
    const emailRaw = String(formData.get("email") || "").trim().toLowerCase();
    const email = isValidLeadEmail(emailRaw) ? emailRaw : "";
    const firstName = String(formData.get("firstName") || "")
      .trim()
      .split(/\s+/)[0]
      .slice(0, 80);

    const trackAnonymousId = anonymousId;
    const trackDurationSec = durationSec;
    const trackSource = source;
    const trackEmail = email;
    const trackFirstName = firstName;
    const trackScore = Math.round(report.overallScore);
    const trackLevel = report.level || "";
    const trackFocus = report.mainChallenge?.title || "";

    after(async () => {
      try {
        const saved = await insertAnalysis({
          anonymousId: trackAnonymousId,
          overallScore: trackScore,
          durationSec: trackDurationSec,
          level: trackLevel,
          mainFocus: trackFocus,
          source: trackSource,
        });
        if (!saved) {
          console.error("[analyze] Convex insert returned false", {
            anonymousId: trackAnonymousId,
            convexConfigured: Boolean(
              process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL,
            ),
          });
          return;
        }
        if (trackEmail && trackFirstName) {
          const attached = await attachLeadToAnalysis({
            anonymousId: trackAnonymousId,
            firstName: trackFirstName,
            email: trackEmail,
          });
          if (!attached) {
            console.error("[analyze] attach lead after insert failed", {
              anonymousId: trackAnonymousId,
            });
          }
        }
      } catch (trackErr) {
        console.error("[analyze] Convex tracking failed", trackErr);
      }
    });

    // Kartra after the response (Vercel waitUntil). Client also POSTs /api/kartra-sync.
    if (email && isKartraConfigured()) {
      const kartraEmail = email;
      const kartraName = firstName || "Friend";
      after(async () => {
        try {
          const kartra = await syncReportToKartra({
            email: kartraEmail,
            firstName: kartraName,
            report,
          });
          if (!kartra.ok) {
            console.error(
              "[analyze] Kartra after() incomplete",
              kartra.message,
              kartra.raw,
            );
          } else {
            console.info("[analyze] Kartra after() ok", { email: kartraEmail });
          }
        } catch (kartraErr) {
          console.error("[analyze] Kartra after() failed", kartraErr);
        }
      });
    } else if (!email) {
      console.warn("[analyze] Skipping Kartra — no email on request");
    }

    return Response.json(report);
  } catch (err) {
    console.error("[analyze]", err);
    const message = userFacingAnalyzeError(err);
    const quota = isQuotaError(err);
    return Response.json(
      { error: message },
      { status: quota ? 429 : 500 },
    );
  }
}
