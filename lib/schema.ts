import { z } from "zod";

/** EliteSpeak Video Rubric v2 — 20 marker ids */
export const MARKER_IDS = [
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

export type MarkerId = (typeof MARKER_IDS)[number];

export const markerIdSchema = z.enum(MARKER_IDS);

export const evidenceItemSchema = z.object({
  timestamp: z.string().optional(), // MM:SS when available
  quoteOrBehavior: z.string(),
  whyItMatters: z.string().optional(),
});

export const improvementSuggestionSchema = z.object({
  name: z.string(),
  howTo: z.string(),
  reps: z.string(),
  when: z.string(),
});

export const markerScoreSchema = z.union([
  z.number().int().min(1).max(10),
  z.literal("not_enough_evidence"),
]);

export const markerResultSchema = z.object({
  id: markerIdSchema,
  score: markerScoreSchema,
  notEnoughEvidenceReason: z.string().optional(),
  rootCauses: z.array(z.string()).max(3),
  didWell: z.array(evidenceItemSchema).max(4),
  fellShort: z.array(evidenceItemSchema).max(5),
  pattern: z.string(),
  coachNotes: z.string(),
  improvementSuggestion: improvementSuggestionSchema,
});

export const transcriptSegmentSchema = z.object({
  startSec: z.number().min(0),
  endSec: z.number().min(0).optional(),
  text: z.string(),
});

export const wordTagSchema = z.enum([
  "good",
  "filler",
  "needs_work",
  "neutral",
]);

export const taggedWordSchema = z.object({
  text: z.string(),
  tag: wordTagSchema,
});

/** One spoken sentence with score, suggestion, and word-level tags */
export const sentenceTimelineItemSchema = z.object({
  startSec: z.number().min(0).optional(),
  endSec: z.number().min(0).optional(),
  timestamp: z.string().optional(), // MM:SS or MM:SS–MM:SS
  text: z.string(),
  score: z.number().int().min(1).max(10),
  suggestion: z.string(),
  words: z.array(taggedWordSchema).min(1),
});

export const drillSchema = z.object({
  markerId: markerIdSchema,
  name: z.string(),
  steps: z.string(),
  schedule: z.string(),
});

export const eliteSpeakReportSchema = z.object({
  sessionOverview: z.string(),
  keyObservations: z.object({
    wentWell: z.string(),
    couldImprove: z.string(),
  }),
  // Allow a few extras from the model; normalizeReport trims to the 20 canonical markers
  markers: z.array(markerResultSchema).min(1).max(40),
  top3Drills: z.array(drillSchema).min(1).max(3),
  summary: z.object({
    strengths: z.array(z.string()).min(1).max(4),
    criticalGaps: z.array(z.string()).min(1).max(4),
    actionPlan24h: z.array(z.string()).min(1).max(4),
  }),
  transcript: z.string(),
  transcriptSegments: z.array(transcriptSegmentSchema).optional(),
  /** Sentence-by-sentence timeline with word tags */
  sentenceTimeline: z.array(sentenceTimelineItemSchema).max(80).optional(),
  hasVisualAnalysis: z.boolean(),
  /** Derived 0–100 for quick glance (avg of numeric marker scores × 10) */
  overallScore: z.number().min(0).max(100),
  band: z.enum(["Elite", "Strong", "Functional", "Inconsistent", "Blocking"]),
});

export type EliteSpeakReport = z.infer<typeof eliteSpeakReportSchema>;
export type MarkerResult = z.infer<typeof markerResultSchema>;
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type SentenceTimelineItem = z.infer<typeof sentenceTimelineItemSchema>;
export type TaggedWord = z.infer<typeof taggedWordSchema>;
export type WordTag = z.infer<typeof wordTagSchema>;
/** @deprecated alias during migration */
export type CommunicationReport = EliteSpeakReport;

export const transcriptSchema = z.object({
  transcript: z.string(),
  segments: z.array(transcriptSegmentSchema).optional(),
});
