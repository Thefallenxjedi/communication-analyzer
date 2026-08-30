import { z } from "zod";

/** Part A — Main Challenges (15) — primary scorecard */
export const PART_A_IDS = [
  "selfMonitoring",
  "blanking",
  "rambling",
  "fillers",
  "clarity",
  "structure",
  "wordPrecision",
  "conciseness",
  "repetition",
  "energy",
  "pace",
  "pauseComfort",
  "upspeak",
  "hedging",
  "confidence",
] as const;

/** Part B — Supporting diagnostics (14) */
export const PART_B_IDS = [
  "complexLanguage",
  "mentalEffort",
  "talkingPastPoint",
  "bookendConsistency",
  "visualLanguage",
  "concisenessDetail",
  "steadiness",
  "visibleNervousness",
  "decisiveness",
  "assertiveness",
  "rambleTriggers",
  "impact",
  "memorability",
  "executivePresence",
] as const;

export const STAT_IDS = [...PART_A_IDS, ...PART_B_IDS] as const;

export type PartAId = (typeof PART_A_IDS)[number];
export type PartBId = (typeof PART_B_IDS)[number];
export type StatId = (typeof STAT_IDS)[number];

/** Short titles for circles / compact UI */
export const STAT_LABELS: Record<StatId, string> = {
  selfMonitoring: "Self-Monitoring",
  blanking: "Blanking",
  rambling: "Rambling",
  fillers: "Filler Words",
  clarity: "Clarity",
  structure: "Structure",
  wordPrecision: "Word Precision",
  conciseness: "Conciseness",
  repetition: "Repetition",
  energy: "Energy",
  pace: "Pace Control",
  pauseComfort: "Pause Comfort",
  upspeak: "Upspeak",
  hedging: "Hedging",
  confidence: "Vocal Confidence",
  complexLanguage: "Complex Language",
  mentalEffort: "Mental Effort",
  talkingPastPoint: "Talking Past the Point",
  bookendConsistency: "Beginning & End",
  visualLanguage: "Word Pictures",
  concisenessDetail: "Tight Wording",
  steadiness: "Steadiness",
  visibleNervousness: "Nervous Signals",
  decisiveness: "Decisiveness",
  assertiveness: "Assertiveness",
  rambleTriggers: "Ramble Triggers",
  impact: "Impact",
  memorability: "Memorability",
  executivePresence: "Executive Presence",
};

/** Micro-definitions shown under each marker (3–8 words). */
export const STAT_HINTS: Record<StatId, string> = {
  selfMonitoring: "how much you edit while speaking",
  blanking: "losing words under pressure",
  rambling: "talking without a clear destination",
  fillers: "ums and likes that break flow",
  clarity: "how easy your ideas are to follow",
  structure: "how logically your ideas are organized",
  wordPrecision: "exact words, not vague ones",
  conciseness: "how quickly you get to the point",
  repetition: "restating without adding new meaning",
  energy: "vocal dynamism versus flat delivery",
  pace: "whether you rush, stall, or stay even",
  pauseComfort: "how effectively you use silence",
  upspeak: "statements that rise like questions",
  hedging: "softening claims with maybe or sort of",
  confidence: "volume, projection, and vocal certainty",
  complexLanguage: "jargon that makes ideas harder",
  mentalEffort: "how hard your message is to follow",
  talkingPastPoint: "talking after the point already landed",
  bookendConsistency: "whether the close matches the open",
  visualLanguage: "how vividly you make ideas feel",
  concisenessDetail: "padding versus tight wording",
  steadiness: "composure when it gets hard",
  visibleNervousness: "rush or tension in the voice",
  decisiveness: "decisive language versus hesitant qualifiers",
  assertiveness: "how directly you state your ideas",
  rambleTriggers: "habit words that start tangents",
  impact: "whether the message lands with force",
  memorability: "how likely your ideas are remembered",
  executivePresence: "command, credibility, and composure",
};

/** Part A UI sections */
export const PART_A_SECTIONS = [
  {
    id: "aFluency",
    title: "Fluency & real-time processing",
    blurb: "How smoothly thoughts become speech under pressure.",
    ids: [
      "selfMonitoring",
      "blanking",
      "rambling",
      "fillers",
    ] as const satisfies readonly PartAId[],
  },
  {
    id: "aContent",
    title: "Content & message",
    blurb: "Clarity, structure, precision, and efficiency of what you say.",
    ids: [
      "clarity",
      "structure",
      "wordPrecision",
      "conciseness",
      "repetition",
    ] as const satisfies readonly PartAId[],
  },
  {
    id: "aVocal",
    title: "Vocal delivery",
    blurb: "How it sounds: energy, pace, pauses, and landing.",
    ids: [
      "energy",
      "pace",
      "pauseComfort",
      "upspeak",
    ] as const satisfies readonly PartAId[],
  },
  {
    id: "aCertainty",
    title: "Certainty & authority",
    blurb: "How sure and committed you sound.",
    ids: ["hedging", "confidence"] as const satisfies readonly PartAId[],
  },
] as const;

/** Part B UI sections */
export const PART_B_SECTIONS = [
  {
    id: "bContent",
    title: "Content depth",
    blurb: "Supporting signals about wording, density, and imagery.",
    ids: [
      "complexLanguage",
      "mentalEffort",
      "talkingPastPoint",
      "bookendConsistency",
      "visualLanguage",
      "concisenessDetail",
    ] as const satisfies readonly PartBId[],
  },
  {
    id: "bEmotional",
    title: "Emotional state",
    blurb: "Composure and nervous signals under pressure.",
    ids: [
      "steadiness",
      "visibleNervousness",
    ] as const satisfies readonly PartBId[],
  },
  {
    id: "bCertainty",
    title: "Certainty & presence",
    blurb: "Decisiveness, assertiveness, and trigger patterns.",
    ids: [
      "decisiveness",
      "assertiveness",
      "rambleTriggers",
    ] as const satisfies readonly PartBId[],
  },
  {
    id: "bImpression",
    title: "Overall impression",
    blurb: "Impact, memorability, and executive presence.",
    ids: [
      "impact",
      "memorability",
      "executivePresence",
    ] as const satisfies readonly PartBId[],
  },
] as const;

/** Scoreable from transcript/captions only — no audio (YouTube beta). */
export const TRANSCRIPT_PART_A_IDS = [
  "rambling",
  "clarity",
  "structure",
  "wordPrecision",
  "conciseness",
  "repetition",
  "hedging",
] as const satisfies readonly PartAId[];

export const TRANSCRIPT_PART_B_IDS = [
  "complexLanguage",
  "mentalEffort",
  "talkingPastPoint",
  "bookendConsistency",
  "visualLanguage",
  "concisenessDetail",
  "rambleTriggers",
  "impact",
  "memorability",
] as const satisfies readonly PartBId[];

/** Part A sections shown for transcript-only reports (no vocal delivery band). */
export const TRANSCRIPT_ONLY_PART_A_SECTIONS = [
  {
    id: "aFluency",
    title: "Fluency",
    blurb: "How smoothly ideas flow in what you say.",
    ids: ["rambling"] as const satisfies readonly PartAId[],
  },
  {
    id: "aContent",
    title: "Content & message",
    blurb: "Clarity, structure, precision, and efficiency of what you say.",
    ids: [
      "clarity",
      "structure",
      "wordPrecision",
      "conciseness",
      "repetition",
    ] as const satisfies readonly PartAId[],
  },
  {
    id: "aCertainty",
    title: "Certainty & authority",
    blurb: "How directly you state your ideas in the transcript.",
    ids: ["hedging"] as const satisfies readonly PartAId[],
  },
] as const;

/** Part B sections for transcript-only reports. */
export const TRANSCRIPT_ONLY_PART_B_SECTIONS = [
  {
    id: "bContent",
    title: "Content depth",
    blurb: "Supporting signals about wording, density, and imagery.",
    ids: [
      "complexLanguage",
      "mentalEffort",
      "talkingPastPoint",
      "bookendConsistency",
      "visualLanguage",
      "concisenessDetail",
    ] as const satisfies readonly PartBId[],
  },
  {
    id: "bCertainty",
    title: "Language patterns",
    blurb: "Trigger words and phrasing habits visible in the transcript.",
    ids: ["rambleTriggers"] as const satisfies readonly PartBId[],
  },
  {
    id: "bImpression",
    title: "Overall impression",
    blurb: "Impact and memorability from the words alone.",
    ids: ["impact", "memorability"] as const satisfies readonly PartBId[],
  },
] as const;

/** Overall at or above this → strengths framing, no “main problem” callout. */
export const HIGH_PERFORMER_THRESHOLD = 80;

/** @deprecated use PART_A_SECTIONS. Kept for transitional imports. */
export const STAT_SECTIONS = PART_A_SECTIONS;

export type StatSectionId =
  | (typeof PART_A_SECTIONS)[number]["id"]
  | (typeof PART_B_SECTIONS)[number]["id"];

/** Main-focus illustrations (Part A ids + generic) */
export const CHALLENGE_IMAGE_KEYS = [
  ...PART_A_IDS,
  "generic",
] as const;

export type ChallengeImageKey = (typeof CHALLENGE_IMAGE_KEYS)[number];

export const CHALLENGE_LABELS: Record<ChallengeImageKey, string> = {
  selfMonitoring: "Self-Monitoring",
  blanking: "Blanking",
  rambling: "Rambling",
  fillers: "Filler Words",
  clarity: "Clarity",
  structure: "Structure",
  wordPrecision: "Word Precision",
  conciseness: "Conciseness",
  repetition: "Repetition",
  energy: "Energy",
  pace: "Pace Control",
  pauseComfort: "Pause Comfort",
  upspeak: "Upspeak",
  hedging: "Hedging",
  confidence: "Vocal Confidence",
  generic: "Strong overall communication",
};

export const CHALLENGE_BLURBS: Record<ChallengeImageKey, string> = {
  selfMonitoring: STAT_HINTS.selfMonitoring,
  blanking: STAT_HINTS.blanking,
  rambling: STAT_HINTS.rambling,
  fillers: STAT_HINTS.fillers,
  clarity: STAT_HINTS.clarity,
  structure: STAT_HINTS.structure,
  wordPrecision: STAT_HINTS.wordPrecision,
  conciseness: STAT_HINTS.conciseness,
  repetition: STAT_HINTS.repetition,
  energy: STAT_HINTS.energy,
  pace: STAT_HINTS.pace,
  pauseComfort: STAT_HINTS.pauseComfort,
  upspeak: STAT_HINTS.upspeak,
  hedging: STAT_HINTS.hedging,
  confidence: STAT_HINTS.confidence,
  generic: "A primary habit to tighten so listeners follow you with less effort.",
};

/** AI may emit string ids; normalizeStats remaps/fills to STAT_IDS. */
export const diagnosisStatSchema = z.object({
  id: z.string(),
  label: z.string(),
  score: z.number().min(0).max(100),
  example: z.string().optional(),
});

export const diagnosisReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  level: z.string(),
  comesAcross: z.string().optional(),
  mainChallenge: z.object({
    title: z.string(),
    summary: z.string().optional(),
    strengths: z.string().optional(),
    improvements: z.string().optional(),
    evidence: z.string().optional(),
    mechanism: z.string().optional(),
    whyItMatters: z.string().optional(),
    upside: z.string().optional(),
    imageKey: z.string(),
  }),
  minorChallenges: z.string(),
  stats: z.array(diagnosisStatSchema).min(15).max(35),
  solutionsCopy: z.string(),
  transcript: z.string().optional(),
  /** Top X% vs historical completed scores (client/server filled, not from Gemini). */
  scoreTopPercent: z.number().min(1).max(99).optional(),
  /** YouTube / pasted transcript — text markers only, no audio delivery. */
  transcriptOnly: z.boolean().optional(),
});

export type DiagnosisReport = z.infer<typeof diagnosisReportSchema>;
export type DiagnosisStat = z.infer<typeof diagnosisStatSchema>;

/** Soft caps used when sanitizing Gemini output (not hard schema rejects). */
export const LLM_EXAMPLE_MAX = 80;
export const LLM_TITLE_MAX = 80;
export const LLM_LEVEL_MAX = 80;
export const LLM_COACH_MAX = 450;
export const LLM_SHORT_MAX = 350;
export const LLM_PARAGRAPH_MAX = 600;

function clipLlm(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * LLM schema is intentionally permissive on string length.
 * Hard max() caused 500s when Gemini overshot; we clip in sanitizeDiagnosisLlm().
 */
const diagnosisStatLlmSchema = z.object({
  id: z.string(),
  label: z.string(),
  score: z.coerce.number().min(0).max(100),
  example: z.string().optional(),
});

/** Structured output for Gemini. Transcript filled from transcribe; no evidence dump. */
export const diagnosisLlmSchema = diagnosisReportSchema
  .omit({ transcript: true, scoreTopPercent: true })
  .extend({
  level: z.string(),
  comesAcross: z.string().optional(),
  stats: z.array(diagnosisStatLlmSchema).min(15).max(35),
  minorChallenges: z.string(),
  solutionsCopy: z.string(),
  mainChallenge: z.object({
    title: z.string(),
    summary: z.string().optional(),
    strengths: z.string().optional(),
    improvements: z.string().optional(),
    /** 1–3 verbatim transcript quotes, one per line (required for trust). */
    evidence: z.string().min(1),
    mechanism: z.string().optional(),
    whyItMatters: z.string().optional(),
    upside: z.string().optional(),
    imageKey: z.string().max(64),
  }),
});

/** Clip / coerce a parsed LLM object so normalizeDiagnosis always gets safe prose. */
export function sanitizeDiagnosisLlm(
  raw: z.infer<typeof diagnosisLlmSchema>,
): z.infer<typeof diagnosisLlmSchema> {
  const clipOpt = (v: string | undefined, max: number) =>
    v != null && v.trim() ? clipLlm(v, max) : undefined;

  return {
    ...raw,
    overallScore: Math.min(100, Math.max(0, Math.round(Number(raw.overallScore) || 0))),
    level: clipLlm(raw.level || "", LLM_LEVEL_MAX),
    comesAcross: clipOpt(raw.comesAcross, LLM_COACH_MAX),
    minorChallenges: clipLlm(raw.minorChallenges || "", LLM_PARAGRAPH_MAX),
    solutionsCopy: clipLlm(raw.solutionsCopy || "", LLM_PARAGRAPH_MAX),
    mainChallenge: {
      ...raw.mainChallenge,
      title: clipLlm(raw.mainChallenge.title || "", LLM_TITLE_MAX),
      summary: clipOpt(raw.mainChallenge.summary, LLM_COACH_MAX),
      strengths: clipOpt(raw.mainChallenge.strengths, LLM_COACH_MAX),
      improvements: clipOpt(raw.mainChallenge.improvements, LLM_COACH_MAX),
      evidence: clipLlm(raw.mainChallenge.evidence || "", LLM_SHORT_MAX) || "—",
      mechanism: clipOpt(raw.mainChallenge.mechanism, LLM_SHORT_MAX),
      whyItMatters: clipOpt(raw.mainChallenge.whyItMatters, LLM_SHORT_MAX),
      upside: clipOpt(raw.mainChallenge.upside, LLM_SHORT_MAX),
      imageKey: clipLlm(raw.mainChallenge.imageKey || "generic", 64),
    },
    stats: raw.stats.map((s) => ({
      ...s,
      id: String(s.id || ""),
      label: clipLlm(s.label || "", 80),
      score: Math.min(100, Math.max(0, Math.round(Number(s.score) || 0))),
      example: clipOpt(s.example, LLM_EXAMPLE_MAX),
    })),
  };
}

export const transcriptSchema = z.object({
  transcript: z.string(),
});

/** @deprecated */
export const MARKER_IDS = STAT_IDS;
export type MarkerId = StatId;
export type EliteSpeakReport = DiagnosisReport;
export type CommunicationReport = DiagnosisReport;
