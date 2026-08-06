import type { ChallengeImageKey, DiagnosisReport, DiagnosisStat, StatId } from "./schema";
import {
  CHALLENGE_IMAGE_KEYS,
  STAT_IDS,
  STAT_LABELS,
  STAT_SECTIONS,
} from "./schema";

export function scoreLabel(overall: number): string {
  if (overall >= 90) return "Elite Communicator";
  if (overall >= 78) return "Strong Communicator";
  if (overall >= 65) return "Effective Communicator";
  if (overall >= 52) return "Developing Communicator";
  if (overall >= 38) return "Inconsistent Communicator";
  return "Needs Significant Improvement";
}

export function deriveOverallFromStats(stats: DiagnosisStat[]): number {
  if (!stats.length) return 0;
  const avg = stats.reduce((s, x) => s + x.score, 0) / stats.length;
  return Math.round(avg * 10);
}

/** Section score 0–100 from average of that section's marker scores × 10 */
export function sectionScore(
  stats: DiagnosisStat[],
  ids: readonly StatId[],
): number {
  const byId = new Map(stats.map((s) => [s.id, s.score]));
  const scores = ids
    .map((id) => byId.get(id))
    .filter((n): n is number => typeof n === "number");
  if (!scores.length) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10);
}

export function buildStatSections(stats: DiagnosisStat[]) {
  return STAT_SECTIONS.map((section) => {
    const ids = section.ids as readonly StatId[];
    const sectionStats = ids
      .map((id) => stats.find((s) => s.id === id))
      .filter((s): s is DiagnosisStat => Boolean(s))
      .sort((a, b) => b.score - a.score);
    return {
      ...section,
      stats: sectionStats,
      score: sectionScore(stats, ids),
    };
  }).sort((a, b) => b.score - a.score);
}

function coerceImageKey(raw: string): ChallengeImageKey {
  const key = raw.trim().toLowerCase() as ChallengeImageKey;
  if ((CHALLENGE_IMAGE_KEYS as readonly string[]).includes(key)) return key;
  return "generic";
}

export function normalizeStats(raw: DiagnosisStat[]): DiagnosisStat[] {
  const byId = new Map(raw.map((s) => [s.id, s]));
  return STAT_IDS.map((id) => {
    const existing = byId.get(id);
    if (existing) {
      return {
        id,
        label: STAT_LABELS[id],
        score: Math.min(10, Math.max(1, Math.round(existing.score))),
      };
    }
    return { id, label: STAT_LABELS[id], score: 5 };
  });
}

export function normalizeDiagnosis(
  report: DiagnosisReport,
  transcriptFallback: string,
): DiagnosisReport {
  const stats = normalizeStats(report.stats);
  const overall =
    Number.isFinite(report.overallScore) && report.overallScore > 0
      ? Math.round(report.overallScore)
      : deriveOverallFromStats(stats);

  return {
    ...report,
    stats,
    overallScore: Math.min(100, Math.max(0, overall)),
    level: report.level?.trim() || scoreLabel(overall),
    transcript: report.transcript?.trim() || transcriptFallback,
    mainChallenge: {
      title: report.mainChallenge.title?.trim() || "Clarity opportunity",
      summary: report.mainChallenge.summary?.trim() || "",
      strengths:
        report.mainChallenge.strengths?.trim() ||
        "You showed up and shared a real sample — that gives us something concrete to work with.",
      improvements:
        report.mainChallenge.improvements?.trim() ||
        report.mainChallenge.summary?.trim() ||
        "Tighten one main habit so listeners grasp your point faster and with less effort.",
      imageKey: coerceImageKey(report.mainChallenge.imageKey || "generic"),
    },
    minorChallenges:
      report.minorChallenges?.trim() ||
      "What worked: a few moments were easier to follow. What to improve: secondary gaps in pacing and structure still steal clarity — tighten those next.",
    solutionsCopy:
      report.solutionsCopy?.trim() ||
      "Keep the habits that already land. Then run 2–3 months of deliberate drills on your three weakest markers: one-take recordings, shorter answers, and pause practice under light pressure.",
  };
}

export function lowestStats(stats: DiagnosisStat[], n = 3): DiagnosisStat[] {
  return [...stats].sort((a, b) => a.score - b.score).slice(0, n);
}

export type { StatId };
