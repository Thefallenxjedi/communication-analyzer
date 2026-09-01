import { generateObject } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { z } from "zod";
import {
  isRetryableModelError,
  modelFallbackChain,
  resolveModelId,
} from "@/lib/gemini";
import { sessionLabel } from "@/lib/coaching-program";
import {
  exerciseById,
  formatExerciseCatalogForPrompt,
  WORKOUT_EXERCISES,
} from "@/lib/workout-exercises";

const exerciseIds = WORKOUT_EXERCISES.map((ex) => ex.id) as [string, ...string[]];

export type TranscriptWorkoutMode = "recap" | "tasks" | "both";

export const generatedTaskSchema = z.object({
  exerciseId: z.enum(exerciseIds),
  title: z.string().min(1).max(160),
  instructions: z.string().min(1).max(8000),
  recordingRequired: z.boolean().default(false),
  reviewRequired: z.boolean().default(false),
});

const recapSchema = z.object({
  sessionRecap: z.string().min(1).max(12_000),
});

const tasksOnlySchema = z.object({
  tasks: z.array(generatedTaskSchema).min(1).max(6),
});

export const transcriptWorkoutSchema = z.object({
  sessionRecap: z.string().min(1).max(12_000),
  tasks: z.array(generatedTaskSchema).min(1).max(6),
});

export type GeneratedWorkoutTask = z.infer<typeof generatedTaskSchema>;
export type TranscriptWorkoutDraft = {
  sessionRecap: string;
  tasks: GeneratedWorkoutTask[];
};

export type TranscriptWorkoutInput = {
  transcript: string;
  sourceSessionNumber: number;
  targetSessionNumber: number;
  clientName: string;
  currentFocus?: string;
  introSummary?: string;
  introChallenges?: string[];
  mode?: TranscriptWorkoutMode;
};

function buildPrompt(input: TranscriptWorkoutInput): string {
  const mode = input.mode ?? "both";
  const source = sessionLabel(input.sourceSessionNumber);
  const target = sessionLabel(input.targetSessionNumber);
  const focus = input.currentFocus?.trim() || "Not set";
  const intro = input.introSummary?.trim() || "";
  const challenges =
    input.introChallenges?.filter(Boolean).join("; ") || "None on file";

  const recapRules =
    mode === "tasks"
      ? ""
      : `1. sessionRecap: 2–4 short paragraphs summarizing what happened on ${source} — themes discussed, breakthroughs, patterns named. Write in second person ("You…"). Coach tone, direct and warm.`;

  const taskRules =
    mode === "recap"
      ? ""
      : `2. tasks: 1–3 lesson tasks for ${target}. Each task must use exerciseId from the catalog. Personalize instructions with specifics from the transcript (examples, OAOs, week notes).
3. Default recordingRequired: false and reviewRequired: false (written self-lessons the client marks complete).
4. Only set recordingRequired true if the transcript explicitly asks the client to record audio.
5. Titles should match catalog names with light personalization.
6. instructions must be the full workout copy (catalog base + personalized week note at top), not a one-liner.`;

  const catalogBlock =
    mode === "recap"
      ? ""
      : `MASTER EXERCISE CATALOG (pick ONLY from these ids — do not invent drills)
${formatExerciseCatalogForPrompt()}`;

  const outputHint =
    mode === "recap"
      ? "Return ONLY sessionRecap."
      : mode === "tasks"
        ? "Return ONLY tasks."
        : "Return sessionRecap and tasks.";

  return `You are an EliteSpeak coaching assistant. A coach pastes a Google Meet transcript from a call.

The call covered ${source} (what happened / what was reviewed) AND assigned work for ${target} (what the client should practice next).

CLIENT
Name: ${input.clientName}
Current focus: ${focus}
Intro summary: ${intro || "—"}
Intro challenges: ${challenges}

${catalogBlock}

RULES
${[recapRules, taskRules].filter(Boolean).join("\n")}
${outputHint}

TRANSCRIPT
${input.transcript.slice(0, 50_000)}`;
}

function normalizeTasks(
  tasks: GeneratedWorkoutTask[],
): GeneratedWorkoutTask[] {
  return tasks.map((task) => {
    const catalog = exerciseById(task.exerciseId);
    if (!catalog) return task;
    return {
      ...task,
      title: task.title.trim() || catalog.name,
      instructions: task.instructions.trim() || catalog.instructions,
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
  const google = createGoogle({ apiKey });
  const preferred = resolveModelId(process.env.GOOGLE_GENERATIVE_AI_MODEL);
  const prompt = buildPrompt(input);
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
          tasks: normalizeTasks(parsed.data.tasks),
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
        tasks: normalizeTasks(parsed.data.tasks),
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
