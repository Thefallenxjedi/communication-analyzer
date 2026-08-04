/** Default free-tier model */
export const DEFAULT_MODEL_ID = "gemini-2.5-flash";
export const MODEL_ID = DEFAULT_MODEL_ID;

export const MODEL_OPTIONS = [
  {
    id: "gemini-2.5-flash-lite",
    label: "2.5 Flash-Lite",
    hint: "Highest free daily limit",
  },
  {
    id: "gemini-2.5-flash",
    label: "2.5 Flash",
    hint: "Best balance (recommended)",
  },
  {
    id: "gemini-2.0-flash",
    label: "2.0 Flash",
    hint: "Often quota 0 — avoid if possible",
  },
  {
    id: "gemini-flash-latest",
    label: "Flash (latest)",
    hint: "Google’s latest Flash alias",
  },
] as const;

export type ModelId = (typeof MODEL_OPTIONS)[number]["id"];

const ALLOWED = new Set<string>(MODEL_OPTIONS.map((m) => m.id));

export function isAllowedModel(id: string): id is ModelId {
  return ALLOWED.has(id);
}

export function resolveModelId(candidate?: string | null): string {
  const trimmed = candidate?.trim();
  if (trimmed && isAllowedModel(trimmed)) return trimmed;
  return DEFAULT_MODEL_ID;
}

export function modelFallbackChain(preferred: string): string[] {
  const ordered = [
    preferred,
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-latest",
  ];
  return [...new Set(ordered.filter((id) => ALLOWED.has(id) || id === preferred))];
}

export function isQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /quota|rate.?limit|resource.?exhausted|429/i.test(message) ||
    /exceeded your current quota/i.test(message)
  );
}

export const TRANSCRIBE_PROMPT = `You are an expert speech transcription system.

Transcribe the provided audio accurately.
- Preserve natural sentence structure. Do not invent content.
- If unclear, use [unclear] rather than guessing.
- Prefer segments with startSec (seconds from start) and text.
- Also return the full concatenated transcript string.
- Only include speech from the primary Speaker.`;

export const DIAGNOSIS_PROMPT = `You are a direct communication diagnostician. Write like Alex Hormozi: clear, blunt, simple. No fluff. No therapy speak. No corporate coaching jargon.

Analyze the Speaker's AUDIO/transcript and return a structured DIAGNOSIS report.

RULES:
- Always refer to the person as "Speaker" in internal reasoning, but write summary text in second person ("you").
- Do NOT invent quotes. Base claims on the transcript.
- Higher scores (1–10) ALWAYS mean stronger performance.
- Pick ONE main challenge — the single biggest problem that, if fixed, moves the needle most.
- mainChallenge.summary must be about 5 sentences. Direct. Specific. Explain what they do, why it costs them, and how it sounds.
- mainChallenge.imageKey must be one of: rambling, fillers, pace, clarity, confidence, structure, energy, presence, generic
- minorChallenges: short paragraph on secondary low areas.
- stats: exactly these 10 ids with labels and scores 1–10:
  confidence (Confidence), clarity (Clarity), speakingPace (Speaking Pace), energy (Energy),
  structure (Structure), vocabulary (Vocabulary), conciseness (Conciseness),
  engagement (Engagement), fillerWords (Filler Words), presence (Presence)
- overallScore: 0–100 from average of stats × 10
- level: plain label like "Strong Communicator" or "Inconsistent Communicator"
- solutionsCopy: Hormozi tone. Tell them they're roughly 2–3 months of consistent work away. They need a practice routine, better thinking frameworks, and pressure-testing speech in real conversations. Keep it short (3–5 sentences).
- transcript: return the transcript you used

Produce the diagnosis JSON now.`;
