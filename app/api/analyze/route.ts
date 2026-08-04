import { generateObject } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { diagnosisReportSchema, transcriptSchema } from "@/lib/schema";
import {
  DIAGNOSIS_PROMPT,
  TRANSCRIBE_PROMPT,
  isQuotaError,
  modelFallbackChain,
  resolveModelId,
} from "@/lib/gemini";
import { normalizeDiagnosis } from "@/lib/scoring";
import { isAudioMime, MAX_FILE_SIZE_BYTES } from "@/lib/validate-media";
import { API_KEY_HEADER, MODEL_HEADER } from "@/lib/api-key";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

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
      schema: diagnosisReportSchema,
      schemaName: "CommunicationDiagnosis",
      schemaDescription: "Hormozi-style communication diagnosis",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${DIAGNOSIS_PROMPT}\n\n---\nTRANSCRIPT:\n${transcript}`,
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
            "Could not transcribe speech. Use clear spoken audio up to 4 minutes.",
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
    return Response.json(report);
  } catch (err) {
    console.error("[analyze]", err);
    const message =
      err instanceof Error ? err.message : "Analysis failed unexpectedly.";
    const quota = isQuotaError(err);
    return Response.json(
      { error: message },
      { status: quota ? 429 : 500 },
    );
  }
}
