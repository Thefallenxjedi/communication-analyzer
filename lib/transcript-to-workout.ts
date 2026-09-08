import { generateObject } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { z } from "zod";
import {
  isRetryableModelError,
  modelFallbackChain,
  resolveModelId,
} from "@/lib/gemini";
import { sessionLabel } from "@/lib/coaching-program";
import { retrieveExercisesWithRag } from "@/lib/exercise-rag";
import {
  exerciseById,
  expectedMinutesForExercise,
  clampTaskExpectedMinutes,
  formatExerciseCatalogCompact,
  formatTaskTitle,
  listCatalogExercises,
  type WorkoutExercise,
} from "@/lib/workout-exercises";
import { resolveTranscriptPromptBundle } from "@/lib/transcript-prompts";

export type TranscriptWorkoutMode = "recap" | "tasks" | "both";

function buildTaskSchema(exerciseIds: [string, ...string[]]) {
  return z.object({
    exerciseId: z.enum(exerciseIds),
    title: z.string().min(1).max(160),
    instructions: z.string().min(1).max(8000),
    example: z.string().min(1).max(400),
    /** Client practice time for this task — must be 5–10 minutes. */
    expectedMinutes: z.number().min(5).max(10).default(7),
    recordingRequired: z.boolean().default(false),
    reviewRequired: z.boolean().default(false),
  });
}

const recapSchema = z.object({
  sessionRecap: z.string().min(1).max(12_000),
});

export type GeneratedWorkoutTask = {
  exerciseId: string;
  title: string;
  instructions: string;
  example: string;
  expectedMinutes: number;
  recordingRequired: boolean;
  reviewRequired: boolean;
};

export type TranscriptWorkoutDraft = {
  sessionRecap: string;
  tasks: GeneratedWorkoutTask[];
  /** Slugs that were offered to the model (for admin visibility). */
  shortlistIds?: string[];
  retrievedAsks?: string[];
  retrieveMethod?: "embedding" | "lexical";
};

export type TranscriptWorkoutInput = {
  transcript: string;
  sourceSessionNumber: number;
  targetSessionNumber: number;
  clientName: string;
  currentFocus?: string;
  introSummary?: string;
  introChallenges?: string[];
  /** Client-supplied professional context. Never fetch or infer external content. */
  profileContext?: string;
  mode?: TranscriptWorkoutMode;
  /** Override retrieval size (default 12). */
  shortlistLimit?: number;
};

const SECTION_ALIASES = [
  { label: "This week", aliases: ["THIS WEEK"] },
  { label: "Why this drill", aliases: ["WHY THIS DRILL", "PROBLEM IT SOLVES", "PURPOSE"] },
  { label: "What to do", aliases: ["WHAT TO DO", "INSTRUCTIONS"] },
  { label: "Practice format", aliases: ["PRACTICE FORMAT"] },
  { label: "What to watch for", aliases: ["WHAT TO WATCH FOR"] },
  { label: "Success standard", aliases: ["SUCCESS STANDARD"] },
  { label: "Example", aliases: ["EXAMPLE"] },
] as const;

const SECTION_ALIAS_LOOKUP = new Map<string, string>(
  SECTION_ALIASES.flatMap((section) =>
    section.aliases.map((alias) => [alias, section.label] as const),
  ),
);

const INLINE_SECTION_PATTERN = new RegExp(
  SECTION_ALIASES.flatMap((section) => section.aliases)
    .sort((a, b) => b.length - a.length)
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "gi",
);

function parseInstructionSections(text: string) {
  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(INLINE_SECTION_PATTERN, (match, offset, source) => {
      const prev = typeof offset === "number" && offset > 0 ? source[offset - 1] : "";
      return prev && prev !== "\n" ? `\n${match}` : match;
    })
    .trim();

  const sections = new Map<string, string[]>();
  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  let currentLabel: string | null = null;

  for (const line of lines) {
    const colonMatch = line.match(/^([A-Za-z][A-Za-z !?'-]+):\s*(.*)$/);
    const bareKey = line.replace(/:$/, "").trim().toUpperCase();
    const colonKey = colonMatch?.[1]?.trim().toUpperCase() ?? "";
    const mappedLabel =
      SECTION_ALIAS_LOOKUP.get(colonKey) ?? SECTION_ALIAS_LOOKUP.get(bareKey) ?? null;

    if (mappedLabel) {
      currentLabel = mappedLabel;
      const body = colonMatch?.[2]?.trim() ?? "";
      if (body) {
        const existing = sections.get(mappedLabel) ?? [];
        sections.set(mappedLabel, [...existing, body]);
      } else if (!sections.has(mappedLabel)) {
        sections.set(mappedLabel, []);
      }
      continue;
    }

    if (!currentLabel) {
      currentLabel = "What to do";
      if (!sections.has(currentLabel)) sections.set(currentLabel, []);
    }

    sections.set(currentLabel, [...(sections.get(currentLabel) ?? []), line]);
  }

  return sections;
}

function pickSection(
  primary: Map<string, string[]>,
  fallback: Map<string, string[]>,
  label: string,
) {
  const primaryBody = (primary.get(label) ?? []).join("\n").trim();
  if (primaryBody) return primaryBody;
  return (fallback.get(label) ?? []).join("\n").trim();
}

function formatTaskInstructions(raw: string, fallback: string, explicitExample?: string): string {
  const source = raw.trim() || fallback.trim();
  const primarySections = parseInstructionSections(source);
  const fallbackSections = parseInstructionSections(fallback);
  const thisWeek = pickSection(primarySections, fallbackSections, "This week");
  const whyThisDrill = pickSection(primarySections, fallbackSections, "Why this drill");
  const whatToDo =
    pickSection(primarySections, fallbackSections, "What to do") ||
    pickSection(primarySections, fallbackSections, "Practice format");
  const example =
    explicitExample?.trim() || pickSection(primarySections, fallbackSections, "Example");

  const orderedSections = [
    ["This week", thisWeek],
    ["Why this drill", whyThisDrill],
    ["What to do", whatToDo],
    ["Example", example],
  ].filter(([, body]) => body);

  if (orderedSections.length === 0) {
    return source;
  }

  return orderedSections.map(([label, body]) => `${label}\n${body}`).join("\n\n");
}

function parseExplicitTaskCount(transcript: string): number | null {
  const text = transcript.toLowerCase();
  const numberWords: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
  };

  const totalPatterns = [
    /\b(\d+)\s+(?:very\s+specific\s+)?(?:tasks?|exercises?|drills?|things?)\b/g,
    /\b(one|two|three|four|five|six)\s+(?:very\s+specific\s+)?(?:tasks?|exercises?|drills?|things?)\b/g,
    /\bworking on\s+(\d+)\s+(?:very\s+specific\s+)?(?:tasks?|exercises?|drills?|things?)\b/g,
    /\bworking on\s+(one|two|three|four|five|six)\s+(?:very\s+specific\s+)?(?:tasks?|exercises?|drills?|things?)\b/g,
  ];

  const repeatedSingles =
    (text.match(/\b(?:one|1)\s+(?:exercise|task|drill|thing)\b/g) ?? []).length;
  if (repeatedSingles >= 2 && repeatedSingles <= 6) {
    return repeatedSingles;
  }

  for (const pattern of totalPatterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const raw = match[1];
    const count =
      raw in numberWords ? numberWords[raw] : Number.parseInt(raw, 10);
    if (Number.isFinite(count) && count >= 1 && count <= 6) {
      return count;
    }
  }

  return null;
}

function renderPromptTemplate(
  template: string,
  variables: Record<string, string>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return typeof value === "string" ? value : "";
  });
}

function buildPrompt(
  input: TranscriptWorkoutInput,
  catalog: WorkoutExercise[],
  prompts: {
    shared: string;
    summary: string;
    tasks: string;
  },
): string {
  const mode = input.mode ?? "both";
  const source = sessionLabel(input.sourceSessionNumber);
  const target = sessionLabel(input.targetSessionNumber);
  const focus = input.currentFocus?.trim() || "Not set";
  const intro = input.introSummary?.trim() || "";
  const challenges =
    input.introChallenges?.filter(Boolean).join("; ") || "None on file";
  const profileContext =
    input.profileContext?.trim().slice(0, 6_000) || "No profile context supplied.";
  const requiredTaskCount = parseExplicitTaskCount(input.transcript);
  const variables = {
    sourceSession: source,
    targetSession: target,
    clientName: input.clientName,
    currentFocus: focus,
    introSummary: intro || "—",
    introChallenges: challenges,
    requiredTaskCountText: requiredTaskCount
      ? `Return exactly ${requiredTaskCount} tasks`
      : "Return 1-3 lesson tasks",
  };

  const sharedPrompt = renderPromptTemplate(prompts.shared, variables).trim();
  const recapRules =
    mode === "tasks"
      ? ""
      : renderPromptTemplate(prompts.summary, variables).trim();
  const taskRules =
    mode === "recap"
      ? ""
      : `${renderPromptTemplate(prompts.tasks, variables).trim()}

HARD RULE — TIME: Every task must include expectedMinutes as an integer from 5 to 10 inclusive. Title format "(N min) Drill Name" using that same N. Never use times outside 5–10.`;

  const catalogBlock =
    mode === "recap"
      ? ""
      : `MATCHED EXERCISE CATALOG
These drills were retrieved from the live catalog against the tasks in this transcript.
Create every task from these catalog exercises only. Never invent drills or ids.
${formatExerciseCatalogCompact(catalog)}`;

  const outputHint =
    mode === "recap"
      ? "Return ONLY sessionRecap."
      : mode === "tasks"
        ? "Return ONLY tasks."
        : "Return sessionRecap and tasks.";

  return `${sharedPrompt}

${catalogBlock}

CLIENT PROFILE CONTEXT
Use only these supplied facts when personalizing prompts. A URL or handle does
not reveal the content behind it, so never invent posts, opinions, employers,
or interests that are not written here.
${profileContext}

RULES
${[recapRules, taskRules].filter(Boolean).join("\n")}
${outputHint}

TRANSCRIPT
${input.transcript.slice(0, 50_000)}`;
}

function normalizeTasks(
  tasks: GeneratedWorkoutTask[],
  catalog: WorkoutExercise[],
  clientName?: string,
): GeneratedWorkoutTask[] {
  return tasks.map((task) => {
    const entry = exerciseById(task.exerciseId, catalog);
    const fromAi =
      typeof task.expectedMinutes === "number" ? task.expectedMinutes : null;
    const fromCatalog = entry
      ? expectedMinutesForExercise(task.exerciseId, catalog)
      : null;
    const minutes = clampTaskExpectedMinutes(fromAi ?? fromCatalog, 7);
    if (!entry) {
      return {
        ...task,
        expectedMinutes: minutes,
        title: formatTaskTitle(task.title, minutes, clientName),
      };
    }
    return {
      ...task,
      expectedMinutes: minutes,
      title: formatTaskTitle(task.title.trim() || entry.name, minutes, clientName),
      instructions: formatTaskInstructions(
        task.instructions,
        entry.instructions,
        task.example,
      ),
      example: task.example.trim(),
    };
  });
}

export async function generateWorkoutFromTranscript(
  input: TranscriptWorkoutInput,
): Promise<TranscriptWorkoutDraft> {
  const transcript = input.transcript.trim();
  if (transcript.length < 80) {
    throw new Error("Paste a longer transcript (at least a few lines).");
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }

  const mode = input.mode ?? "both";
  const requiredTaskCount = parseExplicitTaskCount(transcript);
  const fullCatalog = await listCatalogExercises({ enabledOnly: true });
  const prompts = await resolveTranscriptPromptBundle();

  let catalog: WorkoutExercise[] = [];
  let catalogIds: string[] = [];
  let retrievedAsks: string[] = [];
  let retrieveMethod: "embedding" | "lexical" | undefined;

  if (mode !== "recap") {
    if (fullCatalog.length === 0) {
      throw new Error("Exercise catalog is empty. Add exercises first.");
    }
    const rag = await retrieveExercisesWithRag({
      catalog: fullCatalog,
      transcript,
      currentFocus: input.currentFocus,
      introChallenges: input.introChallenges,
      apiKey,
      limit: input.shortlistLimit ?? 4,
    });
    catalog = rag.exercises;
    catalogIds = rag.ids;
    retrievedAsks = rag.asks.map((ask) => ask.ask);
    retrieveMethod = rag.method;
    if (catalog.length === 0) {
      throw new Error("No catalog exercises matched this transcript.");
    }
  }

  const exerciseIds = catalogIds as [string, ...string[]];
  const generatedTaskSchema = buildTaskSchema(
    exerciseIds.length > 0 ? exerciseIds : (["placeholder"] as [string, ...string[]]),
  );
  const taskMin = requiredTaskCount ?? 1;
  const taskMax = requiredTaskCount ?? 6;
  const tasksOnlySchema = z.object({
    tasks: z.array(generatedTaskSchema).min(taskMin).max(taskMax),
  });
  const transcriptWorkoutSchema = z.object({
    sessionRecap: z.string().min(1).max(12_000),
    tasks: z.array(generatedTaskSchema).min(taskMin).max(taskMax),
  });

  const google = createGoogle({ apiKey });
  const preferred = resolveModelId(process.env.GOOGLE_GENERATIVE_AI_MODEL);
  const prompt = buildPrompt(input, catalog, prompts);
  let lastError: unknown;

  for (const modelId of modelFallbackChain(preferred)) {
    try {
      if (mode === "recap") {
        const result = await generateObject({
          model: google(modelId),
          schema: recapSchema,
          schemaName: "SessionRecap",
          maxRetries: 0,
          temperature: 0.25,
          messages: [{ role: "user", content: prompt }],
        });
        const parsed = recapSchema.safeParse(result.object);
        if (!parsed.success) {
          throw new Error("Model returned an invalid recap shape.");
        }
        return {
          sessionRecap: parsed.data.sessionRecap.trim(),
          tasks: [],
          shortlistIds: catalogIds,
          retrievedAsks,
          retrieveMethod,
        };
      }

      if (mode === "tasks") {
        const result = await generateObject({
          model: google(modelId),
          schema: tasksOnlySchema,
          schemaName: "SessionTasks",
          maxRetries: 0,
          temperature: 0.25,
          messages: [{ role: "user", content: prompt }],
        });
        const parsed = tasksOnlySchema.safeParse(result.object);
        if (!parsed.success) {
          throw new Error("Model returned an invalid tasks shape.");
        }
        return {
          sessionRecap: "",
          tasks: normalizeTasks(parsed.data.tasks, catalog, input.clientName),
          shortlistIds: catalogIds,
          retrievedAsks,
          retrieveMethod,
        };
      }

      const result = await generateObject({
        model: google(modelId),
        schema: transcriptWorkoutSchema,
        schemaName: "TranscriptWorkout",
        maxRetries: 0,
        temperature: 0.25,
        messages: [{ role: "user", content: prompt }],
      });
      const parsed = transcriptWorkoutSchema.safeParse(result.object);
      if (!parsed.success) {
        throw new Error("Model returned an invalid workout shape.");
      }
      return {
        sessionRecap: parsed.data.sessionRecap.trim(),
        tasks: normalizeTasks(parsed.data.tasks, catalog, input.clientName),
        shortlistIds: catalogIds,
        retrievedAsks,
        retrieveMethod,
      };
    } catch (err) {
      lastError = err;
      if (!isRetryableModelError(err)) break;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "Generation failed.";
  throw new Error(message);
}
