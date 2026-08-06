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

You receive BOTH:
1) the AUDIO recording (listen to it), and
2) a TRANSCRIPT of the words.

You MUST use both. Do not score from transcript alone.

=== LISTEN TO THE AUDIO (tone & delivery) ===
From the sound of the voice, evaluate:
- Pace: rushed, dragging, uneven, or controlled
- Energy: flat/monotone vs lively/varied
- Confidence: hesitation, trailing-off, weak endings, shaky vs steady assertive delivery
- Pauses: purposeful silence vs awkward gaps or zero breathing room
- Fillers as SOUND: um/uh density and where they land
- Pitch variety: monotone vs natural ups/downs (rough judgment from audio — do not invent Hz numbers)
- Presence: does the voice sound like it owns the room, or shrinks / mumbles / fades

If the audio is unclear, say so briefly and lean more on transcript for word-based markers only — never invent delivery claims you cannot hear.

=== READ THE TRANSCRIPT (words) ===
From the text, evaluate:
- Clarity of ideas, structure, rambling, vocabulary, conciseness
- Filler words and hedges in the wording
- Engagement / storytelling in the content

=== REPORT RULES ===
- Write summary text in second person ("you").
- Do NOT invent quotes. Prefer evidence from transcript; describe delivery from what you hear.
- Higher scores (1–10) ALWAYS mean stronger performance.
- Pick ONE main challenge — the single biggest problem (words OR delivery) that, if fixed, moves the needle most.
- mainChallenge.summary must be about 5 sentences. Direct. Specific. Cover what they do, how it SOUNDS, why it costs them.
- mainChallenge.imageKey must be one of: rambling, fillers, pace, clarity, confidence, structure, energy, presence, generic
- minorChallenges: short paragraph on secondary lows (mix words + delivery when relevant).
- stats: exactly these 10 ids with labels and scores 1–10 — score delivery-heavy ones (confidence, speakingPace, energy, presence, engagement, fillerWords) using AUDIO first; score structure/vocabulary/conciseness/clarity using transcript first:
  confidence (Confidence), clarity (Clarity), speakingPace (Speaking Pace), energy (Energy),
  structure (Structure), vocabulary (Vocabulary), conciseness (Conciseness),
  engagement (Engagement), fillerWords (Filler Words), presence (Presence)
- overallScore: 0–100 from average of stats × 10
- level: plain label like "Strong Communicator" or "Inconsistent Communicator"
- solutionsCopy: Hormozi tone. ~2–3 months of consistent work. Practice routine + frameworks + pressure-testing. 3–5 sentences.
- transcript: return the transcript you used

Produce the diagnosis JSON now.`;
