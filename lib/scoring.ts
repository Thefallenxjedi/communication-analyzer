import type { ChallengeImageKey, DiagnosisReport, DiagnosisStat, StatId } from "./schema";
import { CHALLENGE_IMAGE_KEYS, STAT_IDS, STAT_LABELS } from "./schema";

export function scoreLabel(overall: number): string {
  if (overall >= 85) return "Elite Communicator";
  if (overall >= 70) return "Strong Communicator";
  if (overall >= 55) return "Functional Communicator";
  if (overall >= 40) return "Inconsistent Communicator";
  return "Blocking Patterns";
}

export function deriveOverallFromStats(stats: DiagnosisStat[]): number {
  if (!stats.length) return 0;
  const avg = stats.reduce((s, x) => s + x.score, 0) / stats.length;
  return Math.round(avg * 10);
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
      title: report.mainChallenge.title?.trim() || "Unclear delivery",
      summary:
        report.mainChallenge.summary?.trim() ||
        "Your main issue is that listeners struggle to follow and trust your delivery.",
      imageKey: coerceImageKey(report.mainChallenge.imageKey || "generic"),
    },
    minorChallenges:
      report.minorChallenges?.trim() ||
      "Secondary gaps showed up in pacing and structure.",
    solutionsCopy:
      report.solutionsCopy?.trim() ||
      "You're probably about 2–3 months of work away from solving these. You need a consistent practice routine, better frameworks for your thinking, and pressure-testing your speech until it holds in real conversations.",
  };
}

export function lowestStats(stats: DiagnosisStat[], n = 3): DiagnosisStat[] {
  return [...stats].sort((a, b) => a.score - b.score).slice(0, n);
}

export type { StatId };
