/**
 * Workout exercise catalog — Convex-backed Problem Bible + legacy fallback.
 */

import { PROBLEM_BIBLE_EXERCISES } from "@/lib/problem-bible-catalog";
import {
  getConvexHttpClient,
  workoutCatalogApi,
} from "@/lib/convex-server";

type ConvexClientLike = NonNullable<ReturnType<typeof getConvexHttpClient>>;

function resolveClient(provided?: ConvexClientLike | null) {
  return provided ?? getConvexHttpClient();
}

export type WorkoutExercise = {
  id: string;
  /** Stable catalog id used in AI picks / task exerciseId. */
  slug?: string;
  name: string;
  purpose: string;
  timing: string;
  instructions: string;
  whenToUse: string;
  tags: string[];
  problemItSolves?: string;
  timingMinutes?: number | null;
  problemNumber?: number | null;
  problemTitle?: string | null;
  exerciseIndex?: number | null;
  timelineSummary?: string | null;
  enabled?: boolean;
  sortOrder?: number;
};

/** Legacy starter drills — used only if Convex catalog is empty. */
export const WORKOUT_EXERCISES: WorkoutExercise[] = [
  {
    id: "campfire-beacon",
    name: "Daily Routine — Light the Campfire/Beacon",
    purpose:
      "Prevent rambling. Set your beacon before you speak. Say the compression campfire sentence up front.",
    timing: "4 minutes",
    whenToUse:
      "Default weekly rep for rambling, circling the point, or weak opens. Most sessions include this.",
    tags: ["rambling", "structure", "clarity", "compression"],
    instructions: `(2 mins) Light the Campfire/Beacon

1. Ask yourself: "If I had to communicate this in one sentence, what would I say?" Use a question from your last week at work.

2. Say the "campfire" in one sentence. No commas. Single breath. Examples:
→ "Leadership is about clarity not certainty."
→ "Risk is the rent you pay for growth."

3. This is your verbal home base. Speak freely for 60 seconds. When you lose your way, return to the campfire (repeat a word from your sentence).

Record that 60 seconds.`,
  },
  {
    id: "pre-speak-routine",
    name: "Pre-Speaking Routine",
    purpose:
      "Align mind, body, and intention before an important meeting or recording.",
    timing: "90 seconds",
    whenToUse:
      "Before podcasts, panels, exec reviews, or when the client hedges or rushes the open.",
    tags: ["preparation", "confidence", "hedging", "presence"],
    instructions: `(90 secs) Pre-Speaking Routine

Obviously Achievable Outcome (OAO) — 30 sec
Choose one simple, measurable thing you will accomplish. Example: "I will share the comparison quote."

Breathing — 60 sec
Choose one:
Box Breathing: Inhale (nose) 4 sec → hold 4 → exhale (mouth) 4 → hold 4.
OR Lion's Breathing: 2 sharp (nose) inhales → 1 long (mouth) exhale.

Write the OAO you will use this week, and which breath you chose.`,
  },
  {
    id: "one-sentence-stop",
    name: "The One-Sentence Stop",
    purpose:
      "Say a thought in one sentence, then sit in the silence and let the other person ask for more.",
    timing: "5 minutes",
    whenToUse:
      "When the client circles the point, over-explains, or cannot stop after the claim.",
    tags: ["rambling", "conciseness", "pause"],
    instructions: `Practice saying a single idea, then stopping and sitting in the silence.

1. Pick one work topic from this week.
2. Say it in one sentence — no qualifiers, no second clause.
3. Count to three in silence. Do not fill the pause.
4. Repeat with three different topics.

Write one sentence that felt hardest to stop after.`,
  },
  {
    id: "word-bank",
    name: "Word Bank Build",
    purpose:
      "Build a personal library of textured, high-impact language before you need it live.",
    timing: "10 minutes",
    whenToUse:
      "When the client reaches for the perfect word in the moment or vocabulary feels unorganized.",
    tags: ["wordPrecision", "vocabulary", "preparation"],
    instructions: `Build a personal library of textured language pulled from sources you admire.

1. Pick one article, podcast, or leader you respect.
2. Pull 5 phrases or single words that carry weight — not jargon, texture.
3. Write each with a one-line note on when you would use it.
4. Pick one and use it in a campfire sentence today.

Submit your list of 5 words/phrases.`,
  },
  {
    id: "length-check",
    name: "The Length Check",
    purpose:
      "Catch yourself mid-ramble and compress to the point in real time.",
    timing: "5 minutes",
    whenToUse:
      "When the client senses they are rambling but has no tool to fix it live.",
    tags: ["rambling", "selfMonitoring", "conciseness"],
    instructions: `A simple in-the-moment tool for catching yourself mid-ramble.

1. Record a 90-second answer to a work question.
2. On playback, mark the sentence where you had already made your point.
3. Re-record stopping at that sentence.
4. Note the phrase you will use to signal stop: "That's the point." or "I'll pause there."

Write your stop phrase and when you will use it this week.`,
  },
];

export type CatalogExerciseRow = {
  id: string;
  slug: string;
  name: string;
  purpose: string;
  problemItSolves: string;
  instructions: string;
  whenToUse: string;
  tags: string[];
  timing: string;
  timingMinutes: number | null;
  problemNumber: number | null;
  problemTitle: string | null;
  exerciseIndex: number | null;
  timelineSummary: string | null;
  source: string | null;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

function bibleAsWorkoutExercises(): WorkoutExercise[] {
  return PROBLEM_BIBLE_EXERCISES.map((ex) => ({
    id: ex.slug,
    slug: ex.slug,
    name: ex.name,
    purpose: ex.purpose,
    problemItSolves: ex.problemItSolves,
    instructions: ex.instructions,
    whenToUse: ex.whenToUse,
    tags: ex.tags,
    timing: ex.timing,
    timingMinutes: ex.timingMinutes,
    problemNumber: ex.problemNumber,
    problemTitle: ex.problemTitle,
    exerciseIndex: ex.exerciseIndex,
    timelineSummary: ex.timelineSummary,
    enabled: true,
    sortOrder: ex.sortOrder,
  }));
}

function rowToWorkout(row: CatalogExerciseRow): WorkoutExercise {
  return {
    id: row.slug,
    slug: row.slug,
    name: row.name,
    purpose: row.purpose,
    problemItSolves: row.problemItSolves,
    instructions: row.instructions,
    whenToUse: row.whenToUse,
    tags: row.tags,
    timing: row.timing,
    timingMinutes: row.timingMinutes,
    problemNumber: row.problemNumber,
    problemTitle: row.problemTitle,
    exerciseIndex: row.exerciseIndex,
    timelineSummary: row.timelineSummary,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
  };
}

/** Load enabled exercises from Convex; fall back to Problem Bible seed, then legacy. */
export async function listCatalogExercises(options?: {
  enabledOnly?: boolean;
  convex?: ConvexClientLike | null;
}): Promise<WorkoutExercise[]> {
  const enabledOnly = options?.enabledOnly !== false;
  const client = resolveClient(options?.convex);
  if (client) {
    try {
      const rows = (await client.query(workoutCatalogApi.list, {
        enabledOnly,
      })) as CatalogExerciseRow[];
      if (rows.length > 0) {
        return rows.map(rowToWorkout);
      }
    } catch (err) {
      console.error("[workout-catalog] list failed", err);
    }
  }
  return [...bibleAsWorkoutExercises(), ...WORKOUT_EXERCISES];
}

export async function listAdminCatalogExercises(
  convex?: ConvexClientLike | null,
): Promise<CatalogExerciseRow[]> {
  const client = resolveClient(convex);
  if (!client) return [];
  return (await client.query(workoutCatalogApi.list, {
    enabledOnly: false,
  })) as CatalogExerciseRow[];
}

export async function seedProblemBibleCatalog(options?: {
  insertOnlyMissing?: boolean;
  convex?: ConvexClientLike | null;
}): Promise<{ inserted: number; updated: number; skipped: number }> {
  const client = resolveClient(options?.convex);
  if (!client) throw new Error("Convex is not configured.");

  const exercises = PROBLEM_BIBLE_EXERCISES.map((ex) => ({
    slug: ex.slug,
    name: ex.name,
    purpose: ex.purpose,
    problemItSolves: ex.problemItSolves,
    instructions: ex.instructions,
    whenToUse: ex.whenToUse,
    tags: ex.tags,
    timing: ex.timing,
    timingMinutes: ex.timingMinutes,
    problemNumber: ex.problemNumber,
    problemTitle: ex.problemTitle,
    exerciseIndex: ex.exerciseIndex,
    timelineSummary: ex.timelineSummary,
    source: ex.source,
    sortOrder: ex.sortOrder,
    enabled: true,
  }));

  // Convex mutation arg size: seed in chunks of 15
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const chunkSize = 15;
  for (let i = 0; i < exercises.length; i += chunkSize) {
    const chunk = exercises.slice(i, i + chunkSize);
    const result = (await client.mutation(workoutCatalogApi.seedBatch, {
      exercises: chunk,
      insertOnlyMissing: options?.insertOnlyMissing === true,
    })) as { inserted: number; updated: number; skipped: number };
    inserted += result.inserted;
    updated += result.updated;
    skipped += result.skipped;
  }
  return { inserted, updated, skipped };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Keyword/tag retrieval: score catalog against transcript + focus hints.
 * Returns top N for the AI shortlist (RAG-lite, no embeddings required).
 */
export function retrieveRelevantExercises(
  catalog: WorkoutExercise[],
  query: {
    transcript: string;
    currentFocus?: string;
    introChallenges?: string[];
  },
  limit = 12,
): WorkoutExercise[] {
  const bag = [
    query.transcript,
    query.currentFocus ?? "",
    ...(query.introChallenges ?? []),
  ]
    .join("\n")
    .toLowerCase();
  const tokens = new Set(tokenize(bag));

  const scored = catalog.map((ex) => {
    let score = 0;
    for (const tag of ex.tags) {
      const t = tag.toLowerCase();
      if (bag.includes(t) || tokens.has(t)) score += 4;
      // split camelCase / kebab
      for (const part of t.split(/[-_\s]+/)) {
        if (part.length > 2 && (bag.includes(part) || tokens.has(part))) {
          score += 2;
        }
      }
    }
    const hay = `${ex.name} ${ex.purpose} ${ex.whenToUse} ${ex.problemItSolves ?? ""} ${ex.problemTitle ?? ""}`.toLowerCase();
    for (const token of tokens) {
      if (token.length < 4) continue;
      if (hay.includes(token)) score += 1;
    }
    // light boost for problem titles that appear in transcript
    if (ex.problemTitle) {
      const titleWords = tokenize(ex.problemTitle).filter((w) => w.length > 4);
      const hits = titleWords.filter((w) => bag.includes(w)).length;
      score += hits * 2;
    }
    return { ex, score };
  });

  scored.sort((a, b) => b.score - a.score || (a.ex.sortOrder ?? 0) - (b.ex.sortOrder ?? 0));

  const top = scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.ex);
  if (top.length >= Math.min(6, limit)) return top;

  // If scoring is weak, return a diverse default shortlist (first of each early problem)
  const fallback: WorkoutExercise[] = [];
  const seenProblems = new Set<number>();
  for (const ex of catalog) {
    const pn = ex.problemNumber ?? -1;
    if (pn > 0 && seenProblems.has(pn)) continue;
    if (pn > 0) seenProblems.add(pn);
    fallback.push(ex);
    if (fallback.length >= limit) break;
  }
  return fallback.length > 0 ? fallback : catalog.slice(0, limit);
}

export function formatExerciseCatalogCompact(
  exercises: WorkoutExercise[],
): string {
  return exercises
    .map((ex) => {
      const id = ex.slug || ex.id;
      const problem =
        ex.problemNumber && ex.problemTitle
          ? ` · Problem ${ex.problemNumber}: ${ex.problemTitle}`
          : "";
      return `- ${id}: ${ex.name}${problem}
  Purpose: ${ex.purpose}
  When to use: ${ex.whenToUse}
  Tags: ${ex.tags.join(", ")}`;
    })
    .join("\n");
}

export function formatExerciseCatalogForPrompt(
  exercises: WorkoutExercise[] = WORKOUT_EXERCISES,
): string {
  return exercises
    .map((ex) => {
      const id = ex.slug || ex.id;
      const problem =
        ex.problemNumber && ex.problemTitle
          ? `Problem ${ex.problemNumber}: ${ex.problemTitle}`
          : "";
      return `### ${id}: ${ex.name}
${problem ? `${problem}\n` : ""}Purpose: ${ex.purpose}
Timing: ${ex.timing}
When to use: ${ex.whenToUse}
Tags: ${ex.tags.join(", ")}

Instructions:
${ex.instructions.slice(0, 3500)}`;
    })
    .join("\n\n---\n\n");
}

export function exerciseById(
  id: string,
  catalog?: WorkoutExercise[],
): WorkoutExercise | undefined {
  const list = catalog ?? [...bibleAsWorkoutExercises(), ...WORKOUT_EXERCISES];
  return list.find((ex) => ex.id === id || ex.slug === id);
}

/** Parse catalog timing strings like "4 minutes" or "90 seconds" into minutes. */
export function parseTimingMinutes(timing: string): number | null {
  const range = timing.match(/(\d+)\s*[-–]\s*(\d+)\s*min/i);
  if (range) {
    return Math.max(1, Math.round((Number(range[1]) + Number(range[2])) / 2));
  }
  const minMatch = timing.match(/(\d+)\s*min/i);
  if (minMatch) return Math.max(1, Number(minMatch[1]));
  const secMatch = timing.match(/(\d+)\s*sec/i);
  if (secMatch) return Math.max(1, Math.ceil(Number(secMatch[1]) / 60));
  return null;
}

/** Clamp homework task time into the product band (5–10 min). */
export function clampTaskExpectedMinutes(
  value: number | null | undefined,
  fallback = 7,
): number {
  const n =
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? Math.round(value)
      : fallback;
  return Math.min(10, Math.max(5, n));
}

export function expectedMinutesForExercise(
  exerciseId: string,
  catalog?: WorkoutExercise[],
): number | null {
  const ex = exerciseById(exerciseId, catalog);
  if (!ex) return null;
  if (typeof ex.timingMinutes === "number" && ex.timingMinutes > 0) {
    return ex.timingMinutes;
  }
  return parseTimingMinutes(ex.timing);
}

/** Infer expected minutes from title match or instruction header when DB field is missing. */
export function inferTaskExpectedMinutes(task: {
  title: string;
  instructions: string;
  expectedMinutes?: number | null;
}): number | null {
  if (
    typeof task.expectedMinutes === "number" &&
    Number.isFinite(task.expectedMinutes) &&
    task.expectedMinutes > 0
  ) {
    return task.expectedMinutes;
  }
  const title = task.title.toLowerCase();
  const catalog = [...bibleAsWorkoutExercises(), ...WORKOUT_EXERCISES];
  for (const ex of catalog) {
    if (title.includes(ex.name.toLowerCase().slice(0, 12))) {
      return (
        (typeof ex.timingMinutes === "number" && ex.timingMinutes > 0
          ? ex.timingMinutes
          : null) ?? parseTimingMinutes(ex.timing)
      );
    }
  }
  const header = task.instructions.slice(0, 80);
  const inlineMin = header.match(/\((\d+)\s*min/i);
  if (inlineMin) return Math.max(1, Number(inlineMin[1]));
  const inlineSec = header.match(/\((\d+)\s*sec/i);
  if (inlineSec) return Math.max(1, Math.ceil(Number(inlineSec[1]) / 60));
  return null;
}

export function formatExpectedTime(minutes: number | null): string {
  if (!minutes || minutes <= 0) return "";
  if (minutes === 1) return "~1 min";
  return `~${minutes} min`;
}

/** Strip "for Name" personalization and ensure "(N min) Title" when minutes are known. */
export function formatTaskTitle(
  rawTitle: string,
  expectedMinutes?: number | null,
  clientName?: string,
): string {
  let title = rawTitle.replace(/\s+/g, " ").trim();
  if (!title) return title;

  if (clientName?.trim()) {
    const name = clientName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    title = title
      .replace(new RegExp(`\\s+for\\s+${name}\\s*$`, "i"), "")
      .trim();
  }
  title = title.replace(/\s+for\s+[A-Z][A-Za-z'’-]*(?:\s+[A-Z][A-Za-z'’-]*){0,3}\s*$/u, "").trim();

  const minutes =
    typeof expectedMinutes === "number" &&
    Number.isFinite(expectedMinutes) &&
    expectedMinutes > 0
      ? Math.max(1, Math.round(expectedMinutes))
      : null;

  const existing = title.match(/^\((\d+)\s*mins?\)\s*(.+)$/i);
  if (existing) {
    const body = existing[2].trim();
    const n = minutes ?? Number(existing[1]);
    return `(${n} min) ${body}`;
  }

  if (minutes) {
    return `(${minutes} min) ${title}`;
  }
  return title;
}
