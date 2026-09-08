/**
 * Live-catalog RAG for transcript → workout.
 * Extracts assigned asks from a call, embeds them against the current
 * exercise catalog, and returns the closest drills. Catalog edits
 * change the fingerprint and trigger a fresh embed.
 */

import { generateObject } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { z } from "zod";
import {
  isRetryableModelError,
  modelFallbackChain,
  resolveModelId,
} from "@/lib/gemini";
import {
  retrieveRelevantExercises,
  type WorkoutExercise,
} from "@/lib/workout-exercises";

const EMBED_MODELS = ["gemini-embedding-001", "gemini-embedding-2", "text-embedding-004"];
const ASK_LIMIT = 6;
const HITS_PER_ASK = 3;
const DEFAULT_LIMIT = 4;
const RELATIVE_SCORE_FLOOR = 0.9;

export type TranscriptAsk = {
  ask: string;
  why?: string;
};

export type RagHit = {
  exercise: WorkoutExercise;
  score: number;
  matchedAsk: string;
};

export type ExerciseRagResult = {
  exercises: WorkoutExercise[];
  asks: TranscriptAsk[];
  ids: string[];
  method: "embedding" | "lexical";
};

type CachedVector = {
  id: string;
  vector: number[];
};

type CatalogEmbedCache = {
  fingerprint: string;
  items: CachedVector[];
};

let catalogEmbedCache: CatalogEmbedCache | null = null;

export function exerciseId(ex: WorkoutExercise): string {
  return ex.slug || ex.id;
}

export function catalogDocument(ex: WorkoutExercise): string {
  return [
    `Exercise: ${ex.name}`,
    ex.problemNumber && ex.problemTitle
      ? `Problem ${ex.problemNumber}: ${ex.problemTitle}`
      : "",
    `Purpose: ${ex.purpose}`,
    ex.problemItSolves ? `Solves: ${ex.problemItSolves}` : "",
    `When to use: ${ex.whenToUse}`,
    ex.tags.length ? `Tags: ${ex.tags.join(", ")}` : "",
    ex.timelineSummary ? `Summary: ${ex.timelineSummary}` : "",
    ex.instructions ? `Instructions: ${ex.instructions.slice(0, 400)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function catalogFingerprint(catalog: WorkoutExercise[]): string {
  return catalog
    .map((ex) =>
      [
        exerciseId(ex),
        ex.name,
        ex.purpose,
        ex.whenToUse,
        ex.problemItSolves ?? "",
        ex.problemTitle ?? "",
        ex.tags.join(","),
        ex.instructions.slice(0, 80),
        ex.enabled === false ? "off" : "on",
      ].join("|"),
    )
    .sort()
    .join("\n");
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function mergeRagHits(hits: RagHit[], limit: number): RagHit[] {
  const best = new Map<string, RagHit>();
  for (const hit of hits) {
    const id = exerciseId(hit.exercise);
    const prev = best.get(id);
    if (!prev || hit.score > prev.score) best.set(id, hit);
  }
  return tightenRagHits([...best.values()], limit);
}

export function tightenRagHits(hits: RagHit[], limit: number): RagHit[] {
  const ranked = [...hits].sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return [];

  const top = ranked[0];
  const minScore = Math.max(0.42, top.score * RELATIVE_SCORE_FLOOR);
  const close = ranked.filter((hit) => hit.score >= minScore);
  const topProblem = top.exercise.problemNumber ?? top.exercise.problemTitle;
  const sameFamily = close.filter((hit) => {
    if (!topProblem) return true;
    const sameNumber =
      top.exercise.problemNumber != null &&
      hit.exercise.problemNumber === top.exercise.problemNumber;
    const sameTitle =
      Boolean(top.exercise.problemTitle) &&
      hit.exercise.problemTitle === top.exercise.problemTitle;
    const uncategorized = !hit.exercise.problemNumber && !hit.exercise.problemTitle;
    return sameNumber || sameTitle || uncategorized;
  });
  const preferred = sameFamily.length >= 2 ? sameFamily : close;
  return preferred.slice(0, Math.max(1, limit));
}

function resetCatalogEmbedCache() {
  catalogEmbedCache = null;
}

/** Drop cached catalog vectors after import/edit so the next retrieve re-embeds. */
export function invalidateExerciseRagCache() {
  resetCatalogEmbedCache();
}

export function _resetExerciseRagCacheForTests() {
  resetCatalogEmbedCache();
}

/** Force a fresh catalog embed (re-train the in-memory retrieval index). */
export async function warmCatalogEmbeddings(
  apiKey: string,
  catalog: WorkoutExercise[],
): Promise<{ count: number; fingerprint: string }> {
  resetCatalogEmbedCache();
  const items = await embedCatalog(apiKey, catalog);
  return {
    count: items.length,
    fingerprint: catalogFingerprint(catalog),
  };
}

async function embedTexts(
  apiKey: string,
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
): Promise<number[][]> {
  if (texts.length === 0) return [];

  let lastError: Error | null = null;
  for (const model of EMBED_MODELS) {
    try {
      return await embedTextsWithModel(apiKey, texts, taskType, model);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("Embedding request failed.");
}

async function embedTextsWithModel(
  apiKey: string,
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
  model: string,
): Promise<number[][]> {
  const vectors: number[][] = [];
  const chunkSize = 80;
  for (let i = 0; i < texts.length; i += chunkSize) {
    const chunk = texts.slice(i, i + chunkSize);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: chunk.map((text) => ({
            model: `models/${model}`,
            content: { parts: [{ text: text.slice(0, 8_000) }] },
            taskType,
          })),
        }),
      },
    );
    const data = (await res.json()) as {
      embeddings?: Array<{ values?: number[] }>;
      error?: { message?: string };
    };
    if (!res.ok || !data.embeddings?.length) {
      throw new Error(data.error?.message || `Embedding request failed for ${model}.`);
    }
    for (const row of data.embeddings) {
      if (!row.values?.length) {
        throw new Error("Embedding response was empty.");
      }
      vectors.push(row.values);
    }
  }
  return vectors;
}

async function embedCatalog(
  apiKey: string,
  catalog: WorkoutExercise[],
): Promise<CachedVector[]> {
  const fingerprint = catalogFingerprint(catalog);
  if (
    catalogEmbedCache &&
    catalogEmbedCache.fingerprint === fingerprint &&
    catalogEmbedCache.items.length === catalog.length
  ) {
    return catalogEmbedCache.items;
  }

  const vectors = await embedTexts(
    apiKey,
    catalog.map((ex) => catalogDocument(ex)),
    "RETRIEVAL_DOCUMENT",
  );
  const items = catalog.map((ex, index) => ({
    id: exerciseId(ex),
    vector: vectors[index] ?? [],
  }));
  catalogEmbedCache = { fingerprint, items };
  return items;
}

const asksSchema = z.object({
  asks: z
    .array(
      z.object({
        ask: z.string().min(1).max(240),
        why: z.string().max(240).optional(),
      }),
    )
    .min(1)
    .max(ASK_LIMIT),
});

export async function extractTranscriptAsks(input: {
  transcript: string;
  currentFocus?: string;
  introChallenges?: string[];
  apiKey: string;
}): Promise<TranscriptAsk[]> {
  const google = createGoogle({ apiKey: input.apiKey });
  const preferred = resolveModelId(process.env.GOOGLE_GENERATIVE_AI_MODEL);
  const challenges =
    input.introChallenges?.filter(Boolean).join("; ") || "None on file";
  const prompt = `Extract the practice tasks the coach assigned in this coaching call.

Return 1-${ASK_LIMIT} short asks that we can match to an exercise catalog.
Use the coach's assigned homework, drills, or next-week practice first.
If they did not name drills, infer 1-3 practice needs from what they coached.
Each ask should be one concrete skill or drill need, not a recap.

Client focus: ${input.currentFocus?.trim() || "Not set"}
Intro challenges: ${challenges}

TRANSCRIPT
${input.transcript.slice(0, 20_000)}`;

  let lastError: unknown;
  for (const modelId of modelFallbackChain(preferred)) {
    try {
      const result = await generateObject({
        model: google(modelId),
        schema: asksSchema,
        schemaName: "TranscriptAsks",
        maxRetries: 0,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }],
      });
      const parsed = asksSchema.safeParse(result.object);
      if (!parsed.success) {
        throw new Error("Model returned invalid asks.");
      }
      return parsed.data.asks.map((row) => ({
        ask: row.ask.trim(),
        why: row.why?.trim() || undefined,
      }));
    } catch (err) {
      lastError = err;
      if (!isRetryableModelError(err)) break;
    }
  }

  if (lastError) {
    console.error("[exercise-rag] extract asks failed", lastError);
  }
  return fallbackAsks(input);
}

function fallbackAsks(input: {
  transcript: string;
  currentFocus?: string;
  introChallenges?: string[];
}): TranscriptAsk[] {
  const asks: TranscriptAsk[] = [];
  if (input.currentFocus?.trim()) {
    asks.push({ ask: input.currentFocus.trim(), why: "Current focus" });
  }
  for (const challenge of input.introChallenges ?? []) {
    if (challenge.trim()) {
      asks.push({ ask: challenge.trim(), why: "Intro challenge" });
    }
  }
  if (asks.length === 0) {
    asks.push({
      ask: input.transcript.slice(0, 800),
      why: "Full transcript",
    });
  }
  return asks.slice(0, ASK_LIMIT);
}

function lexicalRetrieve(
  catalog: WorkoutExercise[],
  asks: TranscriptAsk[],
  input: {
    transcript: string;
    currentFocus?: string;
    introChallenges?: string[];
  },
  limit: number,
): ExerciseRagResult {
  const exercises = retrieveRelevantExercises(
    catalog,
    {
      transcript: [input.transcript, ...asks.map((ask) => ask.ask)].join("\n"),
      currentFocus: input.currentFocus,
      introChallenges: input.introChallenges,
    },
    limit,
  );
  return {
    exercises,
    asks,
    ids: exercises.map(exerciseId),
    method: "lexical",
  };
}

export async function retrieveExercisesWithRag(input: {
  catalog: WorkoutExercise[];
  transcript: string;
  currentFocus?: string;
  introChallenges?: string[];
  apiKey: string;
  limit?: number;
}): Promise<ExerciseRagResult> {
  const limit = input.limit ?? DEFAULT_LIMIT;
  if (input.catalog.length === 0) {
    return { exercises: [], asks: [], ids: [], method: "lexical" };
  }

  const asks = await extractTranscriptAsks({
    transcript: input.transcript,
    currentFocus: input.currentFocus,
    introChallenges: input.introChallenges,
    apiKey: input.apiKey,
  });

  try {
    const catalogVectors = await embedCatalog(input.apiKey, input.catalog);
    const queryVectors = await embedTexts(
      input.apiKey,
      asks.map((ask) => ask.ask),
      "RETRIEVAL_QUERY",
    );

    const hits: RagHit[] = [];
    asks.forEach((ask, askIndex) => {
      const query = queryVectors[askIndex];
      if (!query) return;
      const ranked = catalogVectors
        .map((item, catalogIndex) => ({
          exercise: input.catalog[catalogIndex],
          score: cosineSimilarity(query, item.vector),
          matchedAsk: ask.ask,
        }))
        .filter((row) => row.exercise && row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, HITS_PER_ASK);
      hits.push(...ranked);
    });

    const merged = mergeRagHits(hits, limit);
    if (merged.length === 0) {
      return lexicalRetrieve(input.catalog, asks, input, limit);
    }

    return {
      exercises: merged.map((hit) => hit.exercise),
      asks,
      ids: merged.map((hit) => exerciseId(hit.exercise)),
      method: "embedding",
    };
  } catch (err) {
    console.error("[exercise-rag] embedding retrieve failed", err);
    resetCatalogEmbedCache();
    return lexicalRetrieve(input.catalog, asks, input, limit);
  }
}
