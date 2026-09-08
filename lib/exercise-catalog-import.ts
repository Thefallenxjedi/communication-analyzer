/**
 * Bulk import for the exercise catalog.
 * 1) Split pasted docs into exercise-sized chunks (deterministic).
 * 2) Structure each chunk with Gemini into catalog fields.
 * 3) Coach edits drafts in admin, then seedBatch upserts.
 * Catalog fingerprint changes → RAG re-embeds on next retrieve (or warm now).
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
  getConvexHttpClient,
  workoutCatalogApi,
} from "@/lib/convex-server";
import {
  listCatalogExercises,
  type WorkoutExercise,
} from "@/lib/workout-exercises";
import {
  invalidateExerciseRagCache,
  warmCatalogEmbeddings,
} from "@/lib/exercise-rag";

type ConvexClientLike = NonNullable<ReturnType<typeof getConvexHttpClient>>;

const TEXT_MAX = 750_000;
const CHUNK_SOFT_MAX = 4_500;
const CHUNK_HARD_MAX = 8_000;
const MIN_CHUNK_CHARS = 80;
/** One exercise chunk per LLM call — combining chunks caused skipped drills. */
export const PARSE_BATCHES_PER_REQUEST = 4;

export type ImportExerciseDraft = {
  key: string;
  slug: string;
  name: string;
  purpose: string;
  problemItSolves: string;
  instructions: string;
  whenToUse: string;
  tags: string[];
  timing: string;
  timingMinutes?: number;
  problemNumber?: number;
  problemTitle?: string;
  exerciseIndex?: number;
  timelineSummary?: string;
  enabled: boolean;
  sourceChunk: number;
};

export type CatalogImportParseResult = {
  drafts: ImportExerciseDraft[];
  chunkCount: number;
  method: "json" | "llm" | "heuristic";
  batchIndex?: number;
  batchCount?: number;
  done?: boolean;
  nextBatchIndex?: number;
};

export const CATALOG_IMPORT_TEXT_MAX = TEXT_MAX;

const draftSchema = z.object({
  exercises: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        slug: z.string().max(80).optional(),
        purpose: z.string().max(2000),
        problemItSolves: z.string().max(2000).optional(),
        instructions: z.string().min(1).max(12_000),
        whenToUse: z.string().max(2000),
        tags: z.array(z.string().max(40)).max(24).optional(),
        timing: z.string().max(80).optional(),
        timingMinutes: z.number().min(1).max(180).optional(),
        problemNumber: z.number().min(1).max(99).optional(),
        problemTitle: z.string().max(160).optional(),
        exerciseIndex: z.number().min(1).max(40).optional(),
        timelineSummary: z.string().max(2000).optional(),
      }),
    )
    .min(1)
    .max(8),
});

export function slugifyExerciseName(
  name: string,
  problemNumber?: number,
  exerciseIndex?: number,
): string {
  const base = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const prefix =
    typeof problemNumber === "number" && typeof exerciseIndex === "number"
      ? `p${String(problemNumber).padStart(2, "0")}-e${exerciseIndex}-`
      : typeof problemNumber === "number"
        ? `p${String(problemNumber).padStart(2, "0")}-`
        : "";
  return `${prefix}${base || "exercise"}`.slice(0, 80);
}

function makeKey(index: number): string {
  return `imp-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Split a coach doc into exercise-sized chunks before LLM structuring. */
export function splitCatalogImportText(raw: string): string[] {
  const text = raw.replace(/\r\n/g, "\n").trim().slice(0, TEXT_MAX);
  if (!text) return [];

  let parts: string[] = [];
  /** When true, parts are already exercise boundaries — do not merge them. */
  let boundarySplit = false;

  if (/\n(?:---+|===+)\n/.test(`\n${text}\n`)) {
    parts = text.split(/\n(?:---+|===+)\n/).map((p) => p.trim());
    boundarySplit = true;
  } else {
    // Prefer Exercise/Drill boundaries (70 drills). Fall back to Problem (35×2).
    const exerciseHeading =
      /(?:^|\n)(?=(?:#{1,3}\s+)?(?:exercise|drill)\s*(?:#|no\.?|number)?\s*\d+\b|(?:#{1,3}\s+)?e\d{1,2}\b)/gi;
    const problemHeading =
      /(?:^|\n)(?=(?:#{1,3}\s+)?problem\s*(?:#|no\.?|number)?\s*\d+\b|(?:#{1,3}\s+)?p\d{1,2}\b)/gi;
    const numberedHeading =
      /(?:^|\n)(?=(?:#{1,3}\s+)?\d{1,2}[\.\)]\s+\S)/g;

    const collectMarks = (re: RegExp) =>
      [...text.matchAll(re)]
        .map((m) => m.index ?? 0)
        .filter((idx, i, arr) => i === 0 || idx !== arr[i - 1]);

    let marks = collectMarks(exerciseHeading);
    if (marks.length < 2) marks = collectMarks(problemHeading);
    if (marks.length < 2) marks = collectMarks(numberedHeading);

    if (marks.length >= 2 || (marks.length === 1 && marks[0]! > 0)) {
      const starts =
        marks[0] === 0 || marks[0] === undefined ? marks : [0, ...marks];
      for (let i = 0; i < starts.length; i += 1) {
        const start = starts[i]!;
        const end = starts[i + 1] ?? text.length;
        const slice = text.slice(start, end).replace(/^\n+/, "").trim();
        if (slice) parts.push(slice);
      }
      boundarySplit = parts.length > 1;
    } else {
      parts = text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
    }
  }

  let merged: string[];
  if (boundarySplit) {
    merged = parts.filter(Boolean);
  } else {
    merged = [];
    let buf = "";
    for (const part of parts) {
      if (!buf) {
        buf = part;
        continue;
      }
      if (buf.length < MIN_CHUNK_CHARS) {
        buf = `${buf}\n\n${part}`;
        continue;
      }
      if (buf.length + part.length + 2 <= CHUNK_SOFT_MAX) {
        buf = `${buf}\n\n${part}`;
        continue;
      }
      merged.push(buf);
      buf = part;
    }
    if (buf.trim()) merged.push(buf.trim());
  }

  const hardSplit: string[] = [];
  for (const chunk of merged) {
    if (chunk.length <= CHUNK_HARD_MAX) {
      hardSplit.push(chunk);
      continue;
    }
    // Prefer splitting oversized chunks on nested Exercise headings.
    const nested =
      /(?:^|\n)(?=(?:#{1,3}\s+)?(?:exercise|drill)\s*(?:#|no\.?|number)?\s*\d+\b)/gi;
    const nestedMarks = [...chunk.matchAll(nested)]
      .map((m) => m.index ?? 0)
      .filter((idx, i, arr) => i === 0 || idx !== arr[i - 1]);
    if (nestedMarks.length >= 2) {
      const starts =
        nestedMarks[0] === 0 ? nestedMarks : [0, ...nestedMarks];
      for (let i = 0; i < starts.length; i += 1) {
        const start = starts[i]!;
        const end = starts[i + 1] ?? chunk.length;
        const slice = chunk.slice(start, end).replace(/^\n+/, "").trim();
        if (slice.length >= 12) hardSplit.push(slice);
      }
      continue;
    }
    const paras = chunk.split(/\n{2,}/);
    let block = "";
    for (const para of paras) {
      if (!block) {
        block = para;
        continue;
      }
      if (block.length + para.length + 2 <= CHUNK_HARD_MAX) {
        block = `${block}\n\n${para}`;
      } else {
        hardSplit.push(block);
        block = para;
      }
    }
    if (block.trim()) hardSplit.push(block.trim());
  }

  return hardSplit.filter((c) => c.trim().length >= 12);
}

function heuristicDraftFromChunk(
  chunk: string,
  chunkIndex: number,
): ImportExerciseDraft {
  const lines = chunk
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const titleLine =
    lines.find((l) => l.length > 0 && l.length <= 120 && !l.endsWith(".")) ||
    lines[0] ||
    `Imported exercise ${chunkIndex + 1}`;
  const name = titleLine.replace(/^#+\s*/, "").replace(/^\d+[\.\)]\s*/, "").trim();
  const body = lines.slice(1).join("\n").trim() || chunk;
  return {
    key: makeKey(chunkIndex),
    slug: slugifyExerciseName(name),
    name: name.slice(0, 160),
    purpose: body.slice(0, 280),
    problemItSolves: "",
    instructions: body.slice(0, 12_000),
    whenToUse: "Use when this skill shows up in the client’s speaking.",
    tags: [],
    timing: "10-15 minutes daily",
    timingMinutes: 12,
    enabled: true,
    sourceChunk: chunkIndex,
  };
}

function normalizeDraft(
  raw: z.infer<typeof draftSchema>["exercises"][number],
  chunkIndex: number,
  draftIndex: number,
): ImportExerciseDraft {
  const problemNumber =
    typeof raw.problemNumber === "number"
      ? Math.round(raw.problemNumber)
      : undefined;
  const exerciseIndex =
    typeof raw.exerciseIndex === "number"
      ? Math.round(raw.exerciseIndex)
      : undefined;
  const timing = raw.timing?.trim() || "10-15 minutes daily";
  const range = /\b(\d+)\s*-\s*(\d+)\s*min/i.exec(timing);
  const timingMinutes =
    typeof raw.timingMinutes === "number" && raw.timingMinutes > 0
      ? Math.round(raw.timingMinutes)
      : range
        ? Math.round((Number(range[1]) + Number(range[2])) / 2)
        : 12;

  const cleanedSlug = (raw.slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return {
    key: makeKey(chunkIndex * 100 + draftIndex),
    slug:
      cleanedSlug ||
      slugifyExerciseName(raw.name, problemNumber, exerciseIndex),
    name: raw.name.replace(/\s+/g, " ").trim().slice(0, 160),
    purpose: (raw.purpose || "").trim().slice(0, 2000) || raw.name,
    problemItSolves: (raw.problemItSolves || "").trim().slice(0, 2000),
    instructions: raw.instructions.trim().slice(0, 12_000),
    whenToUse:
      (raw.whenToUse || "").trim().slice(0, 2000) ||
      "Use when this skill shows up in the client’s speaking.",
    tags: (raw.tags || [])
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 24),
    timing: timing.slice(0, 80),
    timingMinutes,
    problemNumber,
    problemTitle: raw.problemTitle?.trim().slice(0, 160) || undefined,
    exerciseIndex,
    timelineSummary: raw.timelineSummary?.trim().slice(0, 2000) || undefined,
    enabled: true,
    sourceChunk: chunkIndex,
  };
}

async function structureChunkWithLlm(input: {
  chunk: string;
  chunkIndex: number;
  apiKey: string;
}): Promise<ImportExerciseDraft[]> {
  const google = createGoogle({ apiKey: input.apiKey });
  const preferred = resolveModelId(process.env.GOOGLE_GENERATIVE_AI_MODEL);
  const prompt = `You structure EliteSpeak speaking drills for a retrieval catalog.

Extract EVERY distinct exercise/drill in the text below. Do not skip any.
If the text has Exercise 1 and Exercise 2, return both.
Return structured catalog rows. Rules:
- One drill = one exercise object
- name: short drill title
- purpose: what skill it trains (1-2 sentences)
- problemItSolves: the speaking failure it fixes
- instructions: full practice steps the client follows (keep concrete actions)
- whenToUse: when a coach should assign this
- tags: 3-8 lowercase skill tags
- timing: e.g. "10-15 minutes daily"
- timingMinutes: typical minutes as a number
- problemNumber / problemTitle / exerciseIndex if clearly present
- slug: optional stable id like p01-e1-short-name
- enabled is always implied true

TEXT
${input.chunk.slice(0, CHUNK_HARD_MAX)}`;

  let lastError: unknown;
  for (const modelId of modelFallbackChain(preferred)) {
    try {
      const result = await generateObject({
        model: google(modelId),
        schema: draftSchema,
        schemaName: "CatalogImportExercises",
        maxRetries: 0,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }],
      });
      const parsed = draftSchema.safeParse(result.object);
      if (!parsed.success) throw new Error("Invalid import schema.");
      return parsed.data.exercises.map((ex, i) =>
        normalizeDraft(ex, input.chunkIndex, i),
      );
    } catch (err) {
      lastError = err;
      if (!isRetryableModelError(err)) break;
    }
  }
  console.error("[catalog-import] LLM structure failed", lastError);
  return [heuristicDraftFromChunk(input.chunk, input.chunkIndex)];
}

function tryParseJsonCatalog(raw: string): ImportExerciseDraft[] | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const rows = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { exercises?: unknown }).exercises)
        ? ((parsed as { exercises: unknown[] }).exercises)
        : null;
    if (!rows?.length) return null;
    const drafts: ImportExerciseDraft[] = [];
    rows.forEach((row, i) => {
      if (!row || typeof row !== "object") return;
      const r = row as Record<string, unknown>;
      const name = String(r.name || "").trim();
      const instructions = String(r.instructions || r.instructionsBody || "").trim();
      if (!name || !instructions) return;
      drafts.push(
        normalizeDraft(
          {
            name,
            slug: typeof r.slug === "string" ? r.slug : undefined,
            purpose: String(r.purpose || name),
            problemItSolves: String(r.problemItSolves || ""),
            instructions,
            whenToUse: String(r.whenToUse || ""),
            tags: Array.isArray(r.tags)
              ? r.tags.map((t) => String(t))
              : undefined,
            timing: typeof r.timing === "string" ? r.timing : undefined,
            timingMinutes:
              typeof r.timingMinutes === "number" ? r.timingMinutes : undefined,
            problemNumber:
              typeof r.problemNumber === "number" ? r.problemNumber : undefined,
            problemTitle:
              typeof r.problemTitle === "string" ? r.problemTitle : undefined,
            exerciseIndex:
              typeof r.exerciseIndex === "number" ? r.exerciseIndex : undefined,
            timelineSummary:
              typeof r.timelineSummary === "string"
                ? r.timelineSummary
                : undefined,
          },
          0,
          i,
        ),
      );
    });
    return drafts.length ? drafts : null;
  } catch {
    return null;
  }
}

/** Batch consecutive chunks — keep each chunk alone so LLM calls don't drop drills. */
export function batchChunksForParse(chunks: string[]): string[][] {
  return chunks.map((chunk) => [chunk]);
}

export function ensureUniqueImportSlugs(
  drafts: ImportExerciseDraft[],
): ImportExerciseDraft[] {
  const seen = new Set<string>();
  return drafts.map((d) => {
    let slug = (d.slug || slugifyExerciseName(d.name)).slice(0, 80);
    if (!slug) slug = `exercise-${seen.size + 1}`;
    if (!seen.has(slug)) {
      seen.add(slug);
      return { ...d, slug, enabled: true };
    }
    let n = 2;
    let next = `${slug.slice(0, 76)}-${n}`;
    while (seen.has(next)) {
      n += 1;
      next = `${slug.slice(0, 76)}-${n}`;
    }
    seen.add(next);
    return { ...d, slug: next, enabled: true };
  });
}

export async function parseCatalogImportText(input: {
  text: string;
  apiKey?: string;
  /** Process this LLM batch index only (for large docs). Omit to process all. */
  batchIndex?: number;
  batchesPerRequest?: number;
}): Promise<CatalogImportParseResult> {
  const text = input.text.replace(/\r\n/g, "\n").trim().slice(0, TEXT_MAX);
  if (!text) {
    return { drafts: [], chunkCount: 0, method: "heuristic", done: true };
  }

  const fromJson = tryParseJsonCatalog(text);
  if (fromJson) {
    return {
      drafts: fromJson,
      chunkCount: 1,
      method: "json",
      batchIndex: 0,
      batchCount: 1,
      done: true,
      nextBatchIndex: 1,
    };
  }

  const chunks = splitCatalogImportText(text);
  if (chunks.length === 0) {
    return { drafts: [], chunkCount: 0, method: "heuristic", done: true };
  }

  const batches = batchChunksForParse(chunks);
  const batchCount = batches.length;
  const start =
    typeof input.batchIndex === "number" && Number.isFinite(input.batchIndex)
      ? Math.max(0, Math.round(input.batchIndex))
      : 0;
  const perReq = Math.max(
    1,
    Math.round(input.batchesPerRequest ?? PARSE_BATCHES_PER_REQUEST),
  );
  const processAll = input.batchIndex === undefined;
  const end = processAll ? batchCount : Math.min(batchCount, start + perReq);

  const apiKey = input.apiKey?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    const sliceChunks = processAll
      ? chunks
      : batches.slice(start, end).flat();
    const drafts = ensureUniqueImportSlugs(
      sliceChunks.map((chunk, i) =>
        heuristicDraftFromChunk(chunk, start + i),
      ),
    );
    return {
      drafts,
      chunkCount: chunks.length,
      method: "heuristic",
      batchIndex: start,
      batchCount,
      done: end >= batchCount,
      nextBatchIndex: end,
    };
  }

  const drafts: ImportExerciseDraft[] = [];
  let chunkOffset = batches
    .slice(0, start)
    .reduce((n, b) => n + b.length, 0);
  for (let bi = start; bi < end; bi += 1) {
    const batch = batches[bi]!;
    // One chunk per call — do not join multiple exercises into one prompt.
    for (const piece of batch) {
      const structured = await structureChunkWithLlm({
        chunk: piece,
        chunkIndex: chunkOffset,
        apiKey,
      });
      drafts.push(...structured);
      chunkOffset += 1;
    }
  }

  const unique = ensureUniqueImportSlugs(drafts);

  return {
    drafts: unique,
    chunkCount: chunks.length,
    method: "llm",
    batchIndex: start,
    batchCount,
    done: end >= batchCount,
    nextBatchIndex: end,
  };
}

export function dedupeImportDrafts(
  drafts: ImportExerciseDraft[],
): ImportExerciseDraft[] {
  const seen = new Set<string>();
  return drafts.filter((d) => {
    const slug = d.slug || slugifyExerciseName(d.name);
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

export async function confirmCatalogImport(input: {
  drafts: ImportExerciseDraft[];
  insertOnlyMissing?: boolean;
  warmRag?: boolean;
  convex?: ConvexClientLike | null;
  apiKey?: string;
}): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
  warmed: boolean;
  catalogCount: number;
}> {
  const client = input.convex ?? getConvexHttpClient();
  if (!client) throw new Error("Convex is not configured.");

  const exercises = input.drafts
    .map((d) => ({
      slug: d.slug || slugifyExerciseName(d.name, d.problemNumber, d.exerciseIndex),
      name: d.name,
      purpose: d.purpose,
      problemItSolves: d.problemItSolves || "",
      instructions: d.instructions,
      whenToUse: d.whenToUse,
      tags: d.tags || [],
      timing: d.timing || "10-15 minutes daily",
      timingMinutes: d.timingMinutes,
      problemNumber: d.problemNumber,
      problemTitle: d.problemTitle,
      exerciseIndex: d.exerciseIndex,
      timelineSummary: d.timelineSummary,
      source: "import",
      enabled: d.enabled !== false,
      sortOrder:
        typeof d.problemNumber === "number" && typeof d.exerciseIndex === "number"
          ? d.problemNumber * 10 + d.exerciseIndex
          : undefined,
    }))
    .filter((d) => d.slug && d.name && d.instructions);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const chunkSize = 15;
  for (let i = 0; i < exercises.length; i += chunkSize) {
    const chunk = exercises.slice(i, i + chunkSize);
    const result = (await client.mutation(workoutCatalogApi.seedBatch, {
      exercises: chunk,
      insertOnlyMissing: input.insertOnlyMissing === true,
    })) as { inserted: number; updated: number; skipped: number };
    inserted += result.inserted;
    updated += result.updated;
    skipped += result.skipped;
  }

  // Catalog changed — drop stale vectors so the next retrieve re-embeds.
  invalidateExerciseRagCache();

  let warmed = false;
  const catalog = await listCatalogExercises({
    enabledOnly: true,
    convex: client,
  });
  if (input.warmRag !== false) {
    const apiKey =
      input.apiKey?.trim() ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
      "";
    if (apiKey && catalog.length > 0) {
      await warmCatalogEmbeddings(apiKey, catalog);
      warmed = true;
    }
  }

  return {
    inserted,
    updated,
    skipped,
    warmed,
    catalogCount: catalog.length,
  };
}

export function draftToWorkout(d: ImportExerciseDraft): WorkoutExercise {
  return {
    id: d.slug,
    slug: d.slug,
    name: d.name,
    purpose: d.purpose,
    timing: d.timing,
    instructions: d.instructions,
    whenToUse: d.whenToUse,
    tags: d.tags,
    problemItSolves: d.problemItSolves,
    timingMinutes: d.timingMinutes,
    problemNumber: d.problemNumber,
    problemTitle: d.problemTitle,
    exerciseIndex: d.exerciseIndex,
    timelineSummary: d.timelineSummary,
    enabled: d.enabled,
  };
}
