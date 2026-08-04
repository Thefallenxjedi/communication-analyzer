import { z } from "zod";

/** Lean communication markers for diagnosis */
export const STAT_IDS = [
  "confidence",
  "clarity",
  "speakingPace",
  "energy",
  "structure",
  "vocabulary",
  "conciseness",
  "engagement",
  "fillerWords",
  "presence",
] as const;

export type StatId = (typeof STAT_IDS)[number];

export const STAT_LABELS: Record<StatId, string> = {
  confidence: "Confidence",
  clarity: "Clarity",
  speakingPace: "Speaking Pace",
  energy: "Energy",
  structure: "Structure",
  vocabulary: "Vocabulary",
  conciseness: "Conciseness",
  engagement: "Engagement",
  fillerWords: "Filler Words",
  presence: "Presence",
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
    summary: z.string(),
    imageKey: z.string(),
  }),
  minorChallenges: z.string(),
  stats: z.array(diagnosisStatSchema).min(8).max(15),
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
