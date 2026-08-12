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

/** Explanatory hints under each score */
export const STAT_HINTS: Record<StatId, string> = {
  selfMonitoring: "Editing yourself mid-sentence — “am I saying this right?”",
  blanking: "Losing your words under pressure; mind goes empty",
  rambling: "Talking without a clear destination or way back",
  fillers: "Um, like, so, basically — noise that breaks flow",
  clarity: "Can listeners catch your actual point quickly",
  structure: "Point, support, then close — in a clear order",
  wordPrecision: "Exact words, not vague “stuff / things / kind of”",
  conciseness: "Same idea in fewer words without losing meaning",
  repetition: "Saying the same thing again without adding new info",
  energy: "Vocal dynamism vs flat, monotone delivery",
  pace: "Too fast, too slow, or uneven under pressure",
  pauseComfort: "Using silence on purpose instead of filling gaps",
  upspeak: "Statements that rise and sound like questions",
  hedging: "“I think / maybe / sort of” softens claims",
  confidence: "Volume, projection, and certainty of tone",
  complexLanguage: "Jargon or formal words that confuse listeners",
  mentalEffort: "Hard for listeners to track dense, stacked ideas",
  talkingPastPoint: "Kept talking after the point already landed",
  bookendConsistency: "Whether the close matches and reinforces the open",
  visualLanguage: "Imagery, analogies, and concrete examples",
  concisenessDetail: "Efficiency of each point — padding vs tight wording",
  steadiness: "Composure in voice and pace when it gets hard",
  visibleNervousness: "Rush, tension, or fidgeting across multiple moments",
  decisiveness: "Decisive language vs hesitant qualifiers overall",
  assertiveness: "Direct claims without softening or tag questions",
  rambleTriggers: "Habit words that reliably start tangents",
  impact: "Whether the message really lands with force",
  memorability: "Sticky, quotable lines listeners can repeat",
  executivePresence: "Command, credibility, and composure overall",
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
    blurb: "How it sounds — energy, pace, pauses, and landing.",
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

/** @deprecated use PART_A_SECTIONS — kept for transitional imports */
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
  generic: "Communication Focus",
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
});

export const diagnosisReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  level: z.string(),
  mainChallenge: z.object({
    title: z.string(),
    summary: z.string().optional(),
    strengths: z.string().optional(),
    improvements: z.string().optional(),
    imageKey: z.string(),
  }),
  minorChallenges: z.string(),
  stats: z.array(diagnosisStatSchema).min(15).max(35),
  solutionsCopy: z.string(),
  transcript: z.string(),
});

export type DiagnosisReport = z.infer<typeof diagnosisReportSchema>;
export type DiagnosisStat = z.infer<typeof diagnosisStatSchema>;

export const transcriptSchema = z.object({
  transcript: z.string(),
  segments: z
    .array(
      z.object({
        startSec: z.number().optional(),
        endSec: z.number().optional(),
        text: z.string(),
      }),
    )
    .optional(),
});

/** @deprecated */
export const MARKER_IDS = STAT_IDS;
export type MarkerId = StatId;
export type EliteSpeakReport = DiagnosisReport;
export type CommunicationReport = DiagnosisReport;
