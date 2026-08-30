import { generateObject } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { after } from "next/server";
import { diagnosisLlmSchema, sanitizeDiagnosisLlm, transcriptSchema } from "@/lib/schema";
import { normalizeDiagnosis } from "@/lib/scoring";
import {
  insertAnalysis,
  insertFailedAnalysis,
  attachLeadToAnalysis,
  getScoreTopPercent,
} from "@/lib/analyses";
import { createSharedReport } from "@/lib/shared-reports";
import {
  isAudioMime,
  MAX_DURATION_SECONDS,
  MAX_YOUTUBE_DURATION_SECONDS,
  MAX_FILE_SIZE_BYTES,
  isUnusableSpeechTranscript,
} from "@/lib/validate-media";
import { API_KEY_HEADER, MODEL_HEADER } from "@/lib/api-key";
import { checkAnalyzeRateLimit, analyzeLimitErrorMessage, clientIp } from "@/lib/rate-limit";
import {
  isKartraConfigured,
  syncReportToKartra,
} from "@/lib/kartra";
import { isValidLeadEmail } from "@/lib/email";
import {
  normalizeCaptureMethod,
  type CaptureMethod,
} from "@/lib/capture-method";
import {
  DIAGNOSIS_PROMPT,
  TRANSCRIBE_PROMPT,
  adminAnalyzeFailureReason,
  isQuotaError,
  isTruncatedObjectError,
  isRetryableModelError,
  modelFallbackChain,
  resolveModelId,
  userFacingAnalyzeError,
} from "@/lib/gemini";
import { createSpendTracker } from "@/lib/llm-cost";
import {
  formatPromptAddOnsBlock,
  listEnabledPromptAddOns,
} from "@/lib/prompt-addons";
import { resolveDiagnosisCorePrompt } from "@/lib/diagnosis-core-prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const DIAGNOSIS_MAX_OUTPUT_TOKENS = 8192;
const DIAGNOSIS_RETRY_MAX_OUTPUT_TOKENS = 6144;

const SHORT_OUTPUT_REMINDER = `

---
CRITICAL SHORT OUTPUT MODE
The previous attempt was cut off. Return complete valid JSON only.
Every prose field: 1-2 short sentences max. No repetition. No padding.
whyItMatters, upside, mechanism, strengths, improvements, comesAcross, minorChallenges, solutionsCopy must stay brief so the JSON finishes.
`;

function diagnosisUserText(
  transcript: string,
  shortMode: boolean,
  promptQuestion?: string,
  hasAudio = true,
  adminContext = "",
  corePrompt = DIAGNOSIS_PROMPT,
): string {
  const promptBlock = promptQuestion
    ? `\n\n---\nPROMPT QUESTION THE SPEAKER WAS ASKED:\n"${promptQuestion}"\nJudge whether they actually answered this question: structure, completeness, and relevance. Score content against this prompt, not a generic topic.\n`
    : "";
  const audioBlock = hasAudio
    ? `\n\n---\nListen to the attached AUDIO for tone, pace, energy, confidence, pauses, and pitch variety. Score delivery from the audio; score wording from the transcript.`
    : `\n\n---\nTRANSCRIPT-ONLY MODE (YouTube captions — NO audio attached):
- Score ONLY these Part A ids in stats[]: rambling, clarity, structure, wordPrecision, conciseness, repetition, hedging.
- Score ONLY these Part B ids in stats[]: complexLanguage, mentalEffort, talkingPastPoint, bookendConsistency, visualLanguage, concisenessDetail, rambleTriggers, impact, memorability.
- Do NOT include audio-dependent markers (selfMonitoring, blanking, fillers, energy, pace, pauseComfort, upspeak, confidence, steadiness, visibleNervousness, decisiveness, assertiveness, executivePresence).
- overallScore = arithmetic mean of the 7 Part A text markers only.
- REPETITION: Pedagogical signposting ("again", "the key point", "let me repeat", "as I said") helps listeners — score 75–95. Only score low for empty redundancy that adds no new meaning.
- If the speaker is strong (mean Part A text markers ≥ 80), lead with strengths; do not invent a weakness for mainChallenge.`;
  const base = `${corePrompt}${adminContext}${promptBlock}\n\n---\nTRANSCRIPT:\n${transcript}${audioBlock}\nReminder: every marker score and overallScore must be integers 0–100 (never 1–10).`;
  return shortMode ? `${base}${SHORT_OUTPUT_REMINDER}` : base;
}

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

function recoverDiagnosisObject(err: unknown): unknown | null {
  if (!err || typeof err !== "object") return null;
  const o = err as { text?: unknown; cause?: unknown; value?: unknown };
  if (typeof o.text === "string" && o.text.trim()) {
    try {
      return JSON.parse(o.text) as unknown;
    } catch {
      /* continue */
    }
  }
  if (o.value && typeof o.value === "object") return o.value;
  if (o.cause && typeof o.cause === "object") {
    const c = o.cause as { value?: unknown; text?: unknown };
    if (c.value && typeof c.value === "object") return c.value;
    if (typeof c.text === "string") {
      try {
        return JSON.parse(c.text) as unknown;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

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
      if (!isRetryableModelError(err)) throw err;
      console.warn(`[analyze] ${modelId} unavailable/quota, trying next…`);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All models exhausted");
}

async function transcribeMedia(
  google: GoogleClient,
  preferredModel: string,
  mediaParts: FilePart[],
  spend: ReturnType<typeof createSpendTracker>,
  durationSec: number | null,
) {
  return withModelFallback(google, preferredModel, async (modelId) => {
    try {
      const result = await generateObject({
        model: google(modelId),
        schema: transcriptSchema,
        schemaName: "Transcript",
        maxRetries: 0,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: TRANSCRIBE_PROMPT },
              ...mediaParts.map((p) => ({
                type: "file" as const,
                data: p.data,
                mediaType: p.mediaType,
              })),
            ],
          },
        ],
      });
      spend.recordOrEstimate(modelId, result, durationSec, "transcribe");
      const transcript = result.object.transcript?.trim() || "";
      return { transcript, modelUsed: modelId };
    } catch (err) {
      spend.recordOrEstimate(modelId, err, durationSec, "transcribe");
      throw err;
    }
  });
}

async function runDiagnosis(
  google: GoogleClient,
  preferredModel: string,
  transcript: string,
  mediaParts: FilePart[],
  promptQuestion: string | undefined,
  spend: ReturnType<typeof createSpendTracker>,
  durationSec: number | null,
  adminContext = "",
  corePrompt = DIAGNOSIS_PROMPT,
) {
  return withModelFallback(google, preferredModel, async (modelId) => {
    const mediaContent = mediaParts.map((p) => ({
      type: "file" as const,
      data: p.data,
      mediaType: p.mediaType,
    }));

    const finish = (raw: unknown) => {
      const parsed = diagnosisLlmSchema.safeParse(raw);
      if (!parsed.success) {
        throw parsed.error;
      }
      return normalizeDiagnosis(sanitizeDiagnosisLlm(parsed.data), transcript, {
        transcriptOnly: mediaParts.length === 0,
      });
    };

    const generate = async (opts: {
      shortMode: boolean;
      temperature: number;
      maxOutputTokens: number;
    }) => {
      try {
        const result = await generateObject({
          model: google(modelId),
          schema: diagnosisLlmSchema,
          schemaName: "CommunicationDiagnosis",
          schemaDescription: "Concise communication diagnosis JSON",
          maxRetries: 0,
          temperature: opts.temperature,
          maxOutputTokens: opts.maxOutputTokens,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: diagnosisUserText(
                    transcript,
                    opts.shortMode,
                    promptQuestion,
                    mediaParts.length > 0,
                    adminContext,
                    corePrompt,
                  ),
                },
                ...mediaContent,
              ],
            },
          ],
        });
        spend.recordOrEstimate(modelId, result, durationSec, "diagnose");
        return finish(result.object);
      } catch (err) {
        spend.recordOrEstimate(modelId, err, durationSec, "diagnose");
        const recovered = recoverDiagnosisObject(err);
        if (recovered) {
          try {
            console.warn(
              `[analyze] recovering diagnosis JSON after validation error on ${modelId}`,
            );
            return finish(recovered);
          } catch {
            /* fall through */
          }
        }
        throw err;
      }
    };

    try {
      return await generate({
        shortMode: false,
        temperature: 0.2,
        maxOutputTokens: DIAGNOSIS_MAX_OUTPUT_TOKENS,
      });
    } catch (err) {
      if (isRetryableModelError(err)) throw err;
      if (!isTruncatedObjectError(err)) throw err;
      console.warn(
        `[analyze] truncated/unparseable diagnosis on ${modelId}; retrying short output once`,
      );
      return await generate({
        shortMode: true,
        temperature: 0.25,
        maxOutputTokens: DIAGNOSIS_RETRY_MAX_OUTPUT_TOKENS,
      });
    }
  });
}

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  const track = {
    anonymousId: "",
    durationSec: null as number | null,
    source: undefined as string | undefined,
    captureMethod: undefined as CaptureMethod | undefined,
    email: "",
    firstName: "",
    ready: false,
  };
  const spend = createSpendTracker();

  let pipelineStartedAt = requestStartedAt;
  const elapsedMs = () => Date.now() - pipelineStartedAt;

  const logFailure = (failureReason: string) => {
    if (!track.anonymousId) return;
    const bill = spend.snapshot();
    const payload = {
      anonymousId: track.anonymousId,
      durationSec: track.durationSec,
      source: track.source,
      captureMethod: track.captureMethod,
      firstName: track.firstName || undefined,
      email: track.email || undefined,
      failureReason,
      costUsd: bill.costUsd,
      inputTokens: bill.inputTokens,
      outputTokens: bill.outputTokens,
      analysisDurationMs: elapsedMs(),
    };
    after(async () => {
      try {
        const ok = await insertFailedAnalysis(payload);
        if (!ok) {
          console.error("[analyze] failed-attempt log returned false", payload);
        }
      } catch (logErr) {
        console.error("[analyze] failed-attempt log error", logErr);
      }
    });
  };

  try {
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
    const pipelineStartedRaw = Number(formData.get("pipelineStartedAt"));
    if (Number.isFinite(pipelineStartedRaw) && pipelineStartedRaw > 0) {
      pipelineStartedAt = pipelineStartedRaw;
    }
    const file =
      (formData.get("audio") instanceof File && formData.get("audio")) ||
      (formData.get("media") instanceof File && formData.get("media"));

    track.anonymousId =
      String(formData.get("anonymousId") || "").trim() ||
      `anon_server_${Date.now().toString(36)}`;
    const durationRaw = Number(formData.get("durationSec"));
    track.durationSec =
      Number.isFinite(durationRaw) && durationRaw > 0
        ? Math.round(durationRaw)
        : null;
    track.source = String(formData.get("source") || "").trim() || undefined;
    track.captureMethod =
      normalizeCaptureMethod(String(formData.get("captureMethod") || "")) ||
      (track.source === "youtube" ? "youtube" : undefined);
    const emailRaw = String(formData.get("email") || "").trim().toLowerCase();
    track.email = isValidLeadEmail(emailRaw) ? emailRaw : "";
    track.firstName = String(formData.get("firstName") || "")
      .trim()
      .split(/\s+/)[0]
      .slice(0, 80);
    const promptQuestion = String(formData.get("promptQuestion") || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    const pastedTranscript = String(formData.get("transcript") || "")
      .replace(/\s+/g, " ")
      .trim();

    const hasFile = file instanceof File && file.size > 0;
    if (!hasFile && pastedTranscript.length < 40) {
      return Response.json(
        { error: "Upload audio, record, or paste a YouTube link." },
        { status: 400 },
      );
    }

    const isYoutube =
      track.captureMethod === "youtube" ||
      track.source === "youtube" ||
      (!hasFile && pastedTranscript.length >= 40);
    const rateKind = isYoutube ? "youtube" : "audio";
    const ip = clientIp(request);
    const rate = checkAnalyzeRateLimit(ip, rateKind);
    if (!rate.ok) {
      return Response.json(
        { error: analyzeLimitErrorMessage(rateKind, rate.retryAfterSec) },
        { status: 429 },
      );
    }

    let parts: FilePart[] = [];
    let transcript = pastedTranscript;
    let modelUsed = preferredModel;

    if (hasFile && file instanceof File) {
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
      track.ready = true;
      if (!track.captureMethod) {
        track.captureMethod =
          track.source === "youtube" ? "youtube" : "upload";
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      parts = [{ type: "file", data: bytes, mediaType }];
      const usePastedTranscript = pastedTranscript.length >= 40;
      if (usePastedTranscript) {
        transcript = pastedTranscript;
      } else {
        const transcribed = await transcribeMedia(
          google,
          preferredModel,
          parts,
          spend,
          track.durationSec,
        );
        transcript = transcribed.transcript;
        modelUsed = transcribed.modelUsed;
      }
      if (!transcript) {
        logFailure("Could not transcribe speech");
        return Response.json(
          {
            error:
              "We could not hear clear speech in that clip. Please try again with clearer audio (up to 5 minutes).",
          },
          { status: 422 },
        );
      }
    } else {
      track.ready = true;
      track.captureMethod = "youtube";
      if (!track.source) track.source = "youtube";
      if (
        track.durationSec != null &&
        track.durationSec > MAX_YOUTUBE_DURATION_SECONDS
      ) {
        logFailure(
          `YouTube: longer than 20 min (${Math.floor(track.durationSec / 60)}m ${String(Math.round(track.durationSec % 60)).padStart(2, "0")}s)`,
        );
        return Response.json(
          {
            error:
              "That video is longer than 20 minutes. Please use a shorter public clip.",
          },
          { status: 400 },
        );
      }
    }

    if (isUnusableSpeechTranscript(transcript)) {
      logFailure("Transcript: not enough real speech");
      return Response.json(
        {
          error:
            "We couldn't hear a real answer in that clip. Please record again and answer the question in full sentences.",
        },
        { status: 422 },
      );
    }

    const enabledAddOns = await listEnabledPromptAddOns();
    const adminContext = formatPromptAddOnsBlock(enabledAddOns);
    const promptAddOnIds = enabledAddOns.map((a) => a.id);
    const corePrompt = await resolveDiagnosisCorePrompt();

    const report = await runDiagnosis(
      google,
      modelUsed || preferredModel,
      transcript,
      parts,
      promptQuestion || undefined,
      spend,
      track.durationSec,
      adminContext,
      corePrompt,
    );

    let scoreTopPercent: number | undefined;
    try {
      const top = await getScoreTopPercent(report.overallScore);
      if (top != null) scoreTopPercent = top;
    } catch (pctErr) {
      console.warn("[analyze] scoreTopPercent skipped", pctErr);
    }

    const reportWithRank = {
      ...report,
      ...(scoreTopPercent != null ? { scoreTopPercent } : {}),
    };

    const trackAnonymousId = track.anonymousId;
    const trackDurationSec = track.durationSec;
    const trackSource = track.source;
    const trackCaptureMethod = track.captureMethod;
    const trackEmail = track.email;
    const trackFirstName = track.firstName;
    const trackScore = Math.round(report.overallScore);
    const trackLevel = report.level || "";
    const trackFocus = report.mainChallenge?.title || "";
    const analysisDurationMs = elapsedMs();

    let shareSlug: string | undefined;
    try {
      const shared = await createSharedReport({
        report: reportWithRank,
        anonymousId: trackAnonymousId,
        firstName: trackFirstName || undefined,
        email: trackEmail || undefined,
        source: trackSource,
      });
      if (shared?.slug) {
        shareSlug = shared.slug;
      }
    } catch (shareErr) {
      console.error("[analyze] shared report create failed", shareErr);
    }

    after(async () => {
      try {
        const bill = spend.snapshot();
        const saved = await insertAnalysis({
          anonymousId: trackAnonymousId,
          overallScore: trackScore,
          durationSec: trackDurationSec,
          level: trackLevel,
          mainFocus: trackFocus,
          source: trackSource,
          captureMethod: trackCaptureMethod,
          firstName: trackFirstName || undefined,
          email: trackEmail || undefined,
          status: "success",
          reportSlug: shareSlug,
          costUsd: bill.costUsd,
          inputTokens: bill.inputTokens,
          outputTokens: bill.outputTokens,
          analysisDurationMs,
          promptAddOnIds,
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
        // Back-compat: if insert omitted lead fields, attach separately
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
    if (trackEmail && isKartraConfigured()) {
      const kartraEmail = trackEmail;
      const kartraName = trackFirstName || "Friend";
      after(async () => {
        try {
          const kartra = await syncReportToKartra({
            email: kartraEmail,
            firstName: kartraName,
            report: reportWithRank,
            shareSlug,
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
    } else if (!trackEmail) {
      console.warn("[analyze] Skipping Kartra — no email on request");
    }

    return Response.json({
      ...reportWithRank,
      ...(shareSlug
        ? {
            shareSlug,
            sharePath: `/r/${shareSlug}`,
          }
        : {}),
    });
  } catch (err) {
    console.error("[analyze]", err);
    logFailure(adminAnalyzeFailureReason(err));
    const message = userFacingAnalyzeError(err);
    const quota = isQuotaError(err);
    return Response.json(
      { error: message },
      { status: quota ? 429 : 500 },
    );
  }
}
