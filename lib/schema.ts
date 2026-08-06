import { z } from "zod";

/** Twenty communication markers for diagnosis */
export const STAT_IDS = [
  "verbalOrangeCones",
  "cognitiveLoad",
  "overexplaining",
  "selfMonitoring",
  "clarity",
  "fillerWordDensity",
  "bookendConsistency",
  "calm",
  "pauseQuality",
  "executivePresence",
  "memorability",
  "assertiveness",
  "certaintyRatio",
  "conciseness",
  "rambling",
  "rambleTriggerWords",
  "structure",
  "anxietyLevel",
  "impact",
  "visualLanguage",
] as const;

export type StatId = (typeof STAT_IDS)[number];

export const STAT_LABELS: Record<StatId, string> = {
  verbalOrangeCones: "Verbal Orange Cones",
  cognitiveLoad: "Cognitive Load",
  overexplaining: "Overexplaining",
  selfMonitoring: "Self-Monitoring",
  clarity: "Clarity",
  fillerWordDensity: "Filler Word Density",
  bookendConsistency: "Bookend Consistency",
  calm: "Calm",
  pauseQuality: "Pause Quality",
  executivePresence: "Executive Presence",
  memorability: "Memorability",
  assertiveness: "Assertiveness",
  certaintyRatio: "Certainty Ratio",
  conciseness: "Conciseness",
  rambling: "Rambling",
  rambleTriggerWords: "Ramble Trigger Words",
  structure: "Structure",
  anxietyLevel: "Anxiety Level",
  impact: "Impact",
  visualLanguage: "Visual Language",
};

/** Short readable blurbs for the report UI */
export const STAT_HINTS: Record<StatId, string> = {
  verbalOrangeCones: "Jargon or abstract words that create friction for listeners.",
  cognitiveLoad: "How hard your message is for someone to process in real time.",
  overexplaining: "Whether you keep talking after the point already landed.",
  selfMonitoring: "Audible self-editing — correcting yourself mid-sentence.",
  clarity: "How quickly every idea is understood without rewinding.",
  fillerWordDensity: "Um, uh, like, you know — noise that weakens authority.",
  bookendConsistency: "Whether your ending reinforces what you opened with.",
  calm: "Steady delivery vs tension that listeners can hear.",
  pauseQuality: "Deliberate silence that helps ideas land — not awkward gaps.",
  executivePresence: "Command, credibility, and composure in how you sound.",
  memorability: "Punchlines, analogies, or lines people could repeat later.",
  assertiveness: "Direct statements without unnecessary hedging.",
  certaintyRatio: "Decisive language vs constant qualifiers and soft edges.",
  conciseness: "Saying enough — and stopping when the point is made.",
  rambling: "Staying on track vs drifting into tangents.",
  rambleTriggerWords: "Habit phrases that pull you into long digressions.",
  structure: "Logical order so listeners can follow without effort.",
  anxietyLevel: "Nervous cues in the voice — higher score means more composure.",
  impact: "Whether ideas hit with force instead of fading out.",
  visualLanguage: "Stories, imagery, and concrete examples that stick.",
};

export const CHALLENGE_IMAGE_KEYS = [
  "rambling",
  "fillers",
  "pace",
  "clarity",
  "confidence",
  "structure",
  "energy",
  "presence",
  "generic",
] as const;

export type ChallengeImageKey = (typeof CHALLENGE_IMAGE_KEYS)[number];

/** Report UI groups for the 20 markers */
export const STAT_SECTIONS = [
  {
    id: "clarityThinking",
    title: "Clarity & thinking",
    blurb: "How clear and organized your ideas are.",
    ids: [
      "clarity",
      "structure",
      "cognitiveLoad",
      "conciseness",
      "bookendConsistency",
      "verbalOrangeCones",
    ] as const satisfies readonly StatId[],
  },
  {
    id: "focusFlow",
    title: "Focus & flow",
    blurb: "How well you stay on track without friction.",
    ids: [
      "rambling",
      "rambleTriggerWords",
      "overexplaining",
      "selfMonitoring",
      "fillerWordDensity",
    ] as const satisfies readonly StatId[],
  },
  {
    id: "deliveryPresence",
    title: "Delivery & presence",
    blurb: "How you sound — calm, paced, and credible.",
    ids: [
      "executivePresence",
      "calm",
      "pauseQuality",
      "anxietyLevel",
    ] as const satisfies readonly StatId[],
  },
  {
    id: "impactLanguage",
    title: "Impact & language",
    blurb: "How forcefully and memorably your words land.",
    ids: [
      "impact",
      "assertiveness",
      "certaintyRatio",
      "memorability",
      "visualLanguage",
    ] as const satisfies readonly StatId[],
  },
] as const;

export type StatSectionId = (typeof STAT_SECTIONS)[number]["id"];

export const diagnosisStatSchema = z.object({
  id: z.enum(STAT_IDS),
  label: z.string(),
  score: z.number().int().min(1).max(10),
});

export const diagnosisReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  level: z.string(),
  mainChallenge: z.object({
    title: z.string(),
    /** @deprecated prefer strengths + improvements */
    summary: z.string().optional(),
    strengths: z.string().optional(),
    improvements: z.string().optional(),
    imageKey: z.string(),
  }),
  minorChallenges: z.string(),
  stats: z.array(diagnosisStatSchema).min(15).max(25),
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

/** @deprecated — kept so old imports don't break during cleanup */
export const MARKER_IDS = STAT_IDS;
export type MarkerId = StatId;
export type EliteSpeakReport = DiagnosisReport;
export type CommunicationReport = DiagnosisReport;
