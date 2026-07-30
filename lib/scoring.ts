import type { EliteSpeakReport, MarkerId, MarkerResult } from "./schema";
import { MARKER_IDS } from "./schema";

export type MarkerMeta = {
  id: MarkerId;
  label: string;
  short: string;
  color: string;
  visualHeavy?: boolean;
};

export const MARKER_META: Record<MarkerId, MarkerMeta> = {
  verbalOrangeCones: {
    id: "verbalOrangeCones",
    label: "Verbal Orange Cones",
    short: "ORNG",
    color: "#B9770E",
  },
  cognitiveLoad: {
    id: "cognitiveLoad",
    label: "Cognitive Load",
    short: "LOAD",
    color: "#1A5276",
  },
  overexplaining: {
    id: "overexplaining",
    label: "Overexplaining",
    short: "OVER",
    color: "#922B21",
  },
  selfMonitoring: {
    id: "selfMonitoring",
    label: "Self-Monitoring",
    short: "SELF",
    color: "#6C3483",
    visualHeavy: true,
  },
  clarity: {
    id: "clarity",
    label: "Clarity",
    short: "CLAR",
    color: "#1B6B4A",
  },
  fillerWordDensity: {
    id: "fillerWordDensity",
    label: "Filler Word Density",
    short: "FILL",
    color: "#AF601A",
  },
  bookendConsistency: {
    id: "bookendConsistency",
    label: "Bookend Consistency",
    short: "BOOK",
    color: "#148F77",
  },
  calm: {
    id: "calm",
    label: "Calm",
    short: "CALM",
    color: "#1F618D",
    visualHeavy: true,
  },
  pauseQuality: {
    id: "pauseQuality",
    label: "Pause Quality",
    short: "PAUS",
    color: "#2471A3",
  },
  executivePresence: {
    id: "executivePresence",
    label: "Executive Presence",
    short: "EXEC",
    color: "#5B2C6F",
    visualHeavy: true,
  },
  memorability: {
    id: "memorability",
    label: "Memorability",
    short: "MEMO",
    color: "#7D3C98",
  },
  assertiveness: {
    id: "assertiveness",
    label: "Assertiveness",
    short: "ASRT",
    color: "#1D8348",
  },
  certaintyRatio: {
    id: "certaintyRatio",
    label: "Certainty Ratio",
    short: "CERT",
    color: "#117A65",
  },
  conciseness: {
    id: "conciseness",
    label: "Conciseness",
    short: "CONC",
    color: "#B03A2E",
  },
  rambling: {
    id: "rambling",
    label: "Rambling",
    short: "RAMB",
    color: "#A04000",
  },
  rambleTriggerWords: {
    id: "rambleTriggerWords",
    label: "Ramble Trigger Words",
    short: "TRIG",
    color: "#6E2C00",
  },
  structure: {
    id: "structure",
    label: "Structure",
    short: "STRC",
    color: "#1A5276",
  },
  anxietyLevel: {
    id: "anxietyLevel",
    label: "Anxiety Level",
    short: "ANX",
    color: "#943126",
    visualHeavy: true,
  },
  impact: {
    id: "impact",
    label: "Impact",
    short: "IMPA",
    color: "#4A235A",
  },
  visualLanguage: {
    id: "visualLanguage",
    label: "Visual Language",
    short: "VISL",
    color: "#0E6655",
  },
};

export function numericScore(score: MarkerResult["score"]): number | null {
  return typeof score === "number" ? score : null;
}

export function bandFromAverage(avg1to10: number): EliteSpeakReport["band"] {
  if (avg1to10 >= 9) return "Elite";
  if (avg1to10 >= 7) return "Strong";
  if (avg1to10 >= 5) return "Functional";
  if (avg1to10 >= 3) return "Inconsistent";
  return "Blocking";
}

export function deriveOverall(markers: MarkerResult[]): {
  overallScore: number;
  band: EliteSpeakReport["band"];
} {
  const nums = markers
    .map((m) => numericScore(m.score))
    .filter((n): n is number => n != null);
  if (nums.length === 0) return { overallScore: 0, band: "Blocking" };
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return {
    overallScore: Math.round(avg * 10),
    band: bandFromAverage(avg),
  };
}

export type RankedMarker = MarkerMeta & {
  score: MarkerResult["score"];
  numeric: number | null;
  result: MarkerResult;
};

export function getRankedMarkers(report: EliteSpeakReport): RankedMarker[] {
  const byId = new Map(report.markers.map((m) => [m.id, m]));
  const list: RankedMarker[] = [];

  for (const id of MARKER_IDS) {
    const result = byId.get(id);
    if (!result) continue;
    const meta = MARKER_META[id];
    list.push({
      ...meta,
      score: result.score,
      numeric: numericScore(result.score),
      result,
    });
  }

  return list.sort((a, b) => {
    if (a.numeric == null && b.numeric == null) return 0;
    if (a.numeric == null) return 1;
    if (b.numeric == null) return -1;
    return b.numeric - a.numeric;
  });
}

export function scoreLabel(score0to100: number): string {
  if (score0to100 >= 90) return "Elite";
  if (score0to100 >= 70) return "Strong";
  if (score0to100 >= 50) return "Functional";
  if (score0to100 >= 30) return "Inconsistent";
  return "Blocking";
}

export const RARITY_TIERS = [
  {
    id: "elite",
    title: "Elite (9–10)",
    description: "Broadcast-ready, highly consistent delivery.",
    minScore: 9,
    color: "#5B2C6F",
  },
  {
    id: "strong",
    title: "Strong (7–8)",
    description: "Confident and effective with occasional gaps.",
    minScore: 7,
    color: "#1A5276",
  },
  {
    id: "functional",
    title: "Functional (5–6)",
    description: "Gets the point across; noticeable inconsistency.",
    minScore: 5,
    color: "#1B6B4A",
  },
  {
    id: "inconsistent",
    title: "Inconsistent (3–4)",
    description: "Significant difficulty undermining communication.",
    minScore: 3,
    color: "#B9770E",
  },
  {
    id: "blocking",
    title: "Blocking (1–2)",
    description: "Severe patterns that derail the message.",
    minScore: 0,
    color: "#E8E8E8",
    textDark: true,
  },
] as const;
